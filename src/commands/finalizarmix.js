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

    await interaction.deferReply();
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
    // Busca automática dos stats na API do Valorant (assíncrono)
    // Não bloqueia a resposta — roda em background após finalizar
    // -------------------------------------------------------
    setImmediate(() => {
      processMatchStats(allPlayers, matchStartedAt, interaction.channel).catch(err => {
        console.error('[finalizarmix] Erro ao processar stats da partida:', err);
      });
    });
  }
};

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
    return;
  }

  const pivotDb = database.getUser(pivot.id);

  // Aguarda 30 segundos para a Riot API ter processado a partida
  await new Promise(resolve => setTimeout(resolve, 30_000));

  const matchData = await fetchCustomMatchStats(
    pivotDb.riotName,
    pivotDb.riotTag,
    'br',
    matchStartedAt
  );

  if (!matchData) {
    console.log('[finalizarmix] Partida customizada não encontrada na API após finalizar.');
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

    if (!apiPlayer) continue;

    database.updatePlayerStats(player.id, {
      displayName: player.displayName || player.username || dbUser.riotName,
      riotName:    dbUser.riotName,
      riotTag:     dbUser.riotTag,
      kills:       apiPlayer.kills,
      won:         apiPlayer.won
    });

    updated++;
  }

  if (updated > 0) {
    console.log(`[finalizarmix] Stats atualizados para ${updated} jogadores da partida.`);
    try {
      await channel.send({
        content: `📊 **Stats da partida atualizados!** ${updated} jogadores tiveram kills e vitórias computados automaticamente. Use \`/melhores\` para ver o ranking!`
      });
    } catch (_) {}
  } else {
    console.log('[finalizarmix] Partida encontrada mas nenhum jogador foi cruzado com a API.');
  }
}
