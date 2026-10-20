const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { activeMixes } = require('../handlers/mixHandler');
const { pullAllToWaitingChannel } = require('../services/voiceManager');
const { fetchCustomMatchStats } = require('../services/valorantApi');
const { renderMvpImage, preloadPlayerAvatar } = require('../services/imageGenerator');
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
    .setDescription(`A partida foi encerrada com sucesso!${pullInfo}\n\nObrigado a todos que participaram! O bot está processando as estatísticas da partida e a revelação do **MVP**...`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // -------------------------------------------------------
  // 1) Salva participação IMEDIATA para todos os jogadores
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
  // 2) Busca automática dos stats na API e eleição do MVP da partida
  // -------------------------------------------------------
  setImmediate(() => {
    processMatchStats(allPlayers, matchStartedAt, interaction.channel, interaction.guild).catch(err => {
      console.error('[finalizarmix] Erro ao processar stats da partida:', err);
    });
  });
}

/**
 * Busca a partida customizada na API, enriquece os stats e elege o MVP da partida
 */
async function processMatchStats(allPlayers, matchStartedAt, channel, guild) {
  // Procura jogadores com conta Riot vinculada
  const linkedPlayers = allPlayers.filter(p => {
    const dbUser = database.getUser(p.id);
    return dbUser && dbUser.riotName && dbUser.riotTag;
  });

  if (linkedPlayers.length === 0) {
    console.log('[finalizarmix] Nenhum jogador com conta Riot vinculada para consultar a API.');
    try {
      await channel.send({
        content: `⚠️ **Participação registrada, mas sem MVP e kills automáticos.** Nenhum jogador tem conta Riot vinculada. Usem \`/vincular nick#tag\` para que o MVP da partida seja eleito automaticamente!`
      });
    } catch (_) {}
    return;
  }

  // Tentar encontrar a partida personalizada na API com até 3 tentativas
  let matchData = null;
  const attempts = 3;

  for (let a = 1; a <= attempts; a++) {
    console.log(`[finalizarmix] Tentativa ${a}/${attempts}: Aguardando dados da partida personalizada na Riot API...`);
    // Aguardar 15 segundos entre tentativas para a Riot consolidar os dados
    await new Promise(resolve => setTimeout(resolve, 15_000));

    for (const pivot of linkedPlayers) {
      const pivotDb = database.getUser(pivot.id);
      matchData = await fetchCustomMatchStats(
        pivotDb.riotName,
        pivotDb.riotTag,
        'br',
        matchStartedAt
      );
      if (matchData) break;
    }

    if (matchData) break;
  }

  if (!matchData) {
    console.log('[finalizarmix] Partida customizada nao encontrada na API apos tentativas.');
    try {
      await channel.send({
        content:
          `⚠️ **Partida de MIX registrada!** Os stats detalhados da Riot ainda não foram indexados pela API ou a partida não foi configurada no modo Personalizado.\n` +
          `O ranking do \`/melhores\` já computou a presença de todos os jogadores!`
      });
    } catch (_) {}
    return;
  }

  // -------------------------------------------------------
  // Atualiza stats de cada jogador que jogou
  // -------------------------------------------------------
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

    if (apiPlayer) {
      database.enrichPlayerStats(player.id, {
        kills: apiPlayer.kills,
        won:   apiPlayer.won
      });
      updated++;
    }
  }

  console.log(`[finalizarmix] Stats enriquecidos para ${updated} jogadores da partida.`);

  // -------------------------------------------------------
  // ELEIÇÃO DO MVP DA PARTIDA PERSONALIZADA
  // -------------------------------------------------------
  const sortedApiPlayers = matchData.players.slice().sort((a, b) => {
    // 1. Maior pontuação de combate (Score)
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    // 2. Maior número de kills
    if ((b.kills || 0) !== (a.kills || 0)) return (b.kills || 0) - (a.kills || 0);
    // 3. Melhor KDA
    const kdaB = ((b.kills || 0) + (b.assists || 0)) / Math.max(1, (b.deaths || 0));
    const kdaA = ((a.kills || 0) + (a.assists || 0)) / Math.max(1, (a.deaths || 0));
    return kdaB - kdaA;
  });

  if (sortedApiPlayers.length > 0) {
    const mvpApi = sortedApiPlayers[0];

    // Localizar jogador correspondente no Discord
    let mvpDiscord = allPlayers.find(p => {
      const dbUser = database.getUser(p.id);
      const rName = dbUser?.riotName || p.riotName;
      const rTag = dbUser?.riotTag || p.riotTag;
      return rName && rTag &&
        rName.toLowerCase() === mvpApi.name.toLowerCase() &&
        rTag.toLowerCase() === mvpApi.tag.toLowerCase();
    }) || allPlayers.find(p => {
      const dbUser = database.getUser(p.id);
      const rName = dbUser?.riotName || p.riotName;
      return rName && rName.toLowerCase() === mvpApi.name.toLowerCase();
    });

    // Se tiver jogador do Discord, carrega avatar atualizado
    let avatarBuffer = null;
    let discordMention = '';
    let discordDisplayName = mvpApi.name;

    if (mvpDiscord) {
      discordMention = `<@${mvpDiscord.id}>`;
      discordDisplayName = mvpDiscord.displayName || mvpDiscord.username;

      if (!mvpDiscord.avatarBuffer) {
        try {
          if (guild) {
            const member = await guild.members.fetch(mvpDiscord.id).catch(() => null);
            if (member) {
              mvpDiscord.avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            }
          }
          await preloadPlayerAvatar(mvpDiscord);
        } catch (_) {}
      }
      avatarBuffer = mvpDiscord.avatarBuffer;
    }

    try {
      const mvpImageBuf = await renderMvpImage({
        discordName: discordDisplayName,
        riotName: mvpApi.name,
        riotTag: mvpApi.tag,
        rankName: mvpDiscord?.rankName || 'Radiante',
        badge: mvpDiscord?.badge || '🔥',
        avatarBuffer: avatarBuffer,
        mapName: matchData.map || 'Valorant',
        kills: mvpApi.kills || 0,
        deaths: mvpApi.deaths || 0,
        assists: mvpApi.assists || 0,
        score: mvpApi.score || 0,
        won: mvpApi.won,
        character: mvpApi.character || null
      });

      const attachment = new AttachmentBuilder(mvpImageBuf, { name: `mvp-${Date.now()}.png` });

      const mentionText = discordMention
        ? `👑 **PARABÉNS ${discordMention}! VOCÊ FOI O MVP DA PARTIDA PERSONALIZADA!** 👑\n`
        : `👑 **PARABÉNS \`${mvpApi.name}#${mvpApi.tag}\`! VOCÊ FOI O MVP DA PARTIDA PERSONALIZADA!** 👑\n`;

      await channel.send({
        content:
          `${mentionText}` +
          `🔥 Abates: **${mvpApi.kills} Kills**  •  📊 KDA: **${mvpApi.kills}/${mvpApi.deaths}/${mvpApi.assists}**  •  🎯 Score: **${mvpApi.score || 0} pts**\n` +
          `*Estatísticas sincronizadas oficialmente da Riot Games da partida recém-finalizada.*`,
        files: [attachment]
      });
    } catch (mvpErr) {
      console.error('[finalizarmix] Erro ao renderizar ou enviar imagem do MVP:', mvpErr);
      await channel.send({
        content: `👑 **MVP DA PARTIDA:** ${discordMention || mvpApi.name} com **${mvpApi.kills} kills** e KDA **${mvpApi.kills}/${mvpApi.deaths}/${mvpApi.assists}**!`
      }).catch(() => {});
    }
  }
}


