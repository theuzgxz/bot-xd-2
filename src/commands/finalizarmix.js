const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { activeMixes } = require('../handlers/mixHandler');
const { pullAllToWaitingChannel } = require('../services/voiceManager');
const { fetchCustomMatchStats } = require('../services/valorantApi');
const database = require('../database');
const { COLORS } = require('../config');
const { hasMixPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('finalizarmix')
    .setDescription('Encerra a partida atual do MIX e puxa todos de volta para a call de espera.'),

  async execute(interaction) {
    return await finalizeMixSession(interaction);
  },
  finalizeMixSession
};

async function finalizeMixSession(interaction) {
  if (!hasMixPermission(interaction.member)) {
    return interaction.reply({
      content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode finalizar a partida!',
      ephemeral: true
    });
  }

  const guildId = interaction.guildId;
  const session = activeMixes.get(guildId);
  const guildConfig = database.getGuildConfig(guildId);

  if (!session) {
    return interaction.reply({
      content: '❌ Não há nenhuma partida de MIX ativa no momento para finalizar.',
      ephemeral: true
    });
  }

  // Coleta todos os jogadores da sessão
  let allPlayers = [];
  if (session.teams) {
    allPlayers = [
      ...session.teams.team1.players,
      ...session.teams.team2.players
    ];
  } else if (session.players) {
    allPlayers = session.players;
  }

  const playerIds = allPlayers.map(p => p.id);
  const matchStartedAt = session.matchStartedAt || (Date.now() - 90 * 60 * 1000); // fallback: 90 min atrás

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }
  activeMixes.delete(guildId);

  // Mover jogadores de volta para a call de espera
  let pullInfo = '';
  if (guildConfig.voiceWaitingId && playerIds.length > 0) {
    const pullResult = await pullAllToWaitingChannel(interaction.guild, playerIds, guildConfig.voiceWaitingId);
    pullInfo = `\n🔄 **${pullResult.moved.length}** jogadores foram movidos de volta para <#${guildConfig.voiceWaitingId}>.`;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('🏁 PARTIDA DE MIX FINALIZADA!')
    .setDescription(`A partida foi encerrada com sucesso!${pullInfo}\n\nObrigado a todos que participaram! Para abrir outro jogo, use \`/mix\`.`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // -------------------------------------------------------
  // 1) Salva participação IMEDIATA para todos os jogadores
  //    (com ou sem conta Riot vinculada) — garante que gamesPlayed
  //    sobe no /melhores mesmo que a API do Valorant falhe ou atrase
  // -------------------------------------------------------
  let participantsRegistered = 0;
  for (const player of allPlayers) {
    const dbUser = database.getUser(player.id);
    database.registerParticipation(player.id, {
      displayName: player.displayName || player.username || (dbUser ? dbUser.riotName : 'Jogador'),
      riotName:    dbUser ? dbUser.riotName : (player.riotName || null),
      riotTag:     dbUser ? dbUser.riotTag : (player.riotTag || null)
    });
    participantsRegistered++;
  }
  console.log(`[finalizarmix] ${participantsRegistered} participacoes registradas imediatamente.`);

  // -------------------------------------------------------
  // 2) Busca automática dos stats na API do Valorant (assíncrono)
  //    Tentará enriquecer os dados já salvos com kills e vitórias
  // -------------------------------------------------------
  setImmediate(() => {
    processMatchStats(allPlayers, matchStartedAt, interaction.channel).catch(err => {
      console.error('[finalizarmix] Erro ao processar stats da partida:', err);
    });
  });
}

/**
 * Busca a partida customizada na API e salva os stats de cada jogador.
 * Enviará uma mensagem no canal informando se conseguiu ou não processar.
 */
async function processMatchStats(allPlayers, matchStartedAt, channel) {
  // Procura o primeiro jogador com conta Riot vinculada para consultar a API
  const pivot = allPlayers.find(p => {
    const dbUser = database.getUser(p.id);
    return dbUser && dbUser.riotName && dbUser.riotTag;
  });

  if (!pivot) {
    console.log('[finalizarmix] Nenhum jogador com conta Riot vinculada para consultar a API.');
    try {
      await channel.send({
        content: `⚠️ **Participação registrada, mas sem kills/vitórias.** Nenhum jogador tem conta Riot vinculada. Use \`/vincular\` para ter kills e WR computados automaticamente.`
      });
    } catch (_) {}
    return;
  }

  const pivotDb = database.getUser(pivot.id);

  console.log(`[finalizarmix] Aguardando 30s para a API processar a partida... (pivot: ${pivotDb.riotName}#${pivotDb.riotTag})`);

  // Aguarda 30 segundos para a Riot API ter processado a partida
  await new Promise(resolve => setTimeout(resolve, 30_000));

  const matchData = await fetchCustomMatchStats(
    pivotDb.riotName,
    pivotDb.riotTag,
    'br',
    matchStartedAt
  );

  if (!matchData) {
    console.log('[finalizarmix] Partida customizada nao encontrada na API apos finalizar.');
    try {
      await channel.send({
        content:
          `⚠️ **Participação registrada! Kills e vitórias não foram encontrados na API do Valorant.**\n` +
          `Possíveis causas: a partida ainda não foi processada pela Riot, a API está indisponível, ` +
          `ou a partida não foi do tipo **Personalizada**.\n` +
          `O \`/melhores\` já mostra quem jogou — kills e WR serão atualizados nas próximas partidas.`
      });
    } catch (_) {}
    return;
  }

  // Cria um mapa riotName#tag -> stats da API
  const apiStatsMap = new Map();
  for (const p of matchData.players) {
    const key = `${p.name.toLowerCase()}#${p.tag.toLowerCase()}`;
    apiStatsMap.set(key, p);
  }

  let updated = 0;

  for (const player of allPlayers) {
    const dbUser = database.getUser(player.id);
    if (!dbUser || !dbUser.riotName || !dbUser.riotTag) continue;

    const key = `${dbUser.riotName.toLowerCase()}#${dbUser.riotTag.toLowerCase()}`;
    const apiPlayer = apiStatsMap.get(key);

    if (!apiPlayer) {
      console.log(`[finalizarmix] Jogador ${dbUser.riotName}#${dbUser.riotTag} nao encontrado na resposta da API.`);
      continue;
    }

    // Enriquece os stats já registrados com kills e vitória da API
    database.enrichPlayerStats(player.id, {
      kills: apiPlayer.kills,
      won:   apiPlayer.won
    });

    updated++;
  }

  if (updated > 0) {
    console.log(`[finalizarmix] Stats enriquecidos para ${updated} jogadores da partida.`);
    try {
      await channel.send({
        content: `📊 **Stats da partida atualizados!** ${updated} jogadores tiveram kills e vitórias computados automaticamente. Use \`/melhores\` para ver o ranking!`
      });
    } catch (_) {}
  } else {
    console.log('[finalizarmix] Partida encontrada mas nenhum jogador foi cruzado com a API.');
    try {
      await channel.send({
        content: `⚠️ **Partida encontrada na API, mas não foi possível cruzar os jogadores.**\nVerifique se os nomes vinculados com \`/vincular\` estão corretos (nome e tag exatos da conta Riot).`
      });
    } catch (_) {}
  }
}

