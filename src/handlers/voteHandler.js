const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { MAPS, COLORS, MAP_VOTE_DURATION } = require('../config');
const { movePlayersToTeamChannels } = require('../services/voiceManager');
const database = require('../database');

/**
 * Inicia a fase de votação de mapa após o balanceamento dos times
 */
async function startMapVote(interactionOrChannel, guild, team1, team2, guildConfig) {
  const channel = interactionOrChannel.channel || interactionOrChannel;
  const playerIds = new Set([...team1.players.map(p => p.id), ...team2.players.map(p => p.id)]);

  const votes = {}; // userId -> mapId
  let timeLeft = MAP_VOTE_DURATION;
  let finished = false;

  // Lista dos mapas disponíveis para votar
  const mapOptions = MAPS.map(m => ({
    label: m.name,
    value: m.id,
    description: `Votar no mapa ${m.name}`,
    emoji: '🗺️'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('map_vote_select')
    .setPlaceholder('🗳️ Selecione o mapa em que deseja votar...')
    .addOptions(mapOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  function createVoteEmbed() {
    // Contagem de votos por mapa
    const countMap = {};
    MAPS.forEach(m => { countMap[m.id] = 0; });
    Object.values(votes).forEach(mapId => {
      countMap[mapId] = (countMap[mapId] || 0) + 1;
    });

    const totalVoted = Object.keys(votes).length;

    const mapListText = MAPS.map(m => {
      const voteCount = countMap[m.id] || 0;
      const bar = '█'.repeat(voteCount) + '░'.repeat(Math.max(0, 10 - voteCount));
      return `**${m.name}**: ${voteCount} voto(s) \`[${bar}]\``;
    }).join('\n');

    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('🗺️ VOTAÇÃO DE MAPA - VALORANT MIX')
      .setDescription(
        `Apenas os **10 jogadores do MIX** podem votar no mapa da partida!\n` +
        `⏳ Tempo restante: **${timeLeft}s**\n` +
        `📊 Votos computados: **${totalVoted}/10**\n\n` +
        `**Placar de Votação:**\n${mapListText}`
      )
      .setFooter({ text: 'Selecione sua escolha no menu abaixo. Apenas 1 voto por jogador.' })
      .setTimestamp();
  }

  const voteMessage = await channel.send({
    embeds: [createVoteEmbed()],
    components: [row]
  });

  // Coletor de interações do Select Menu
  const collector = voteMessage.createMessageComponentCollector({
    filter: i => i.customId === 'map_vote_select',
    time: MAP_VOTE_DURATION * 1000
  });

  // Atualização periódica do timer no embed a cada 5 segundos
  const interval = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0 || finished) {
      clearInterval(interval);
      return;
    }
    try {
      await voteMessage.edit({
        embeds: [createVoteEmbed()],
        components: [row]
      });
    } catch (e) {
      clearInterval(interval);
    }
  }, 5000);

  collector.on('collect', async i => {
    if (!playerIds.has(i.user.id)) {
      return i.reply({
        content: '❌ Apenas os jogadores confirmados neste MIX podem votar no mapa!',
        ephemeral: true
      });
    }

    const selectedMapId = i.values[0];
    votes[i.user.id] = selectedMapId;
    const selectedMap = MAPS.find(m => m.id === selectedMapId);

    await i.reply({
      content: `✅ Você votou no mapa **${selectedMap ? selectedMap.name : selectedMapId}**!`,
      ephemeral: true
    });

    // Se todos os 10 jogadores já votaram, encerra mais cedo
    if (Object.keys(votes).length >= 10) {
      collector.stop('all_voted');
    } else {
      await voteMessage.edit({
        embeds: [createVoteEmbed()],
        components: [row]
      }).catch(() => {});
    }
  });

  collector.on('end', async (collected, reason) => {
    finished = true;
    clearInterval(interval);

    // Contagem final dos votos
    const countMap = {};
    MAPS.forEach(m => { countMap[m.id] = 0; });
    Object.values(votes).forEach(mapId => {
      countMap[mapId] = (countMap[mapId] || 0) + 1;
    });

    let highestVotes = -1;
    let candidates = [];

    MAPS.forEach(m => {
      const c = countMap[m.id] || 0;
      if (c > highestVotes) {
        highestVotes = c;
        candidates = [m];
      } else if (c === highestVotes) {
        candidates.push(m);
      }
    });

    // Se ninguém votou ou houve empate, sorteia entre os mais votados
    const winningMap = candidates[Math.floor(Math.random() * candidates.length)] || MAPS[0];

    // Desabilitar o menu de votação
    await voteMessage.edit({
      embeds: [
        createVoteEmbed().setDescription(
          `🏁 **VOTAÇÃO ENCERRADA!**\n` +
          `O mapa escolhido pela votação foi **${winningMap.name}** com **${highestVotes} voto(s)**!`
        )
      ],
      components: []
    }).catch(() => {});

    // Mover os jogadores para os canais de voz
    const moveResult = await movePlayersToTeamChannels(guild, team1, team2, guildConfig);

    // Salvar partida no histórico
    database.saveMatch({
      guildId: guild.id,
      map: winningMap.name,
      team1: {
        side: team1.side,
        players: team1.players.map(p => ({ id: p.id, name: p.displayName, rank: p.rankName }))
      },
      team2: {
        side: team2.side,
        players: team2.players.map(p => ({ id: p.id, name: p.displayName, rank: p.rankName }))
      }
    });

    // Criar Embed de Início de Partida com a arte oficial do mapa
    const matchStartEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`⚔️ PARTIDA INICIADA - MAPA: ${winningMap.name.toUpperCase()}`)
      .setDescription(
        `O mapa **${winningMap.name}** venceu a votação com **${highestVotes} voto(s)**!\n\n` +
        `**Status da Movimentação de Voz:**\n` +
        (moveResult.success
          ? `🔊 **Time A** movido para <#${guildConfig.voiceTeamAId}>\n` +
            `🔊 **Time B** movido para <#${guildConfig.voiceTeamBId}>\n`
          : `⚠️ *${moveResult.error}*`)
      )
      .setImage(winningMap.image)
      .setFooter({ text: 'Bom jogo a todos! Ao finalizar, use /finalizarmix para retornar à call principal.' })
      .setTimestamp();

    // Notificação se alguém não estava conectado no voice
    let warnings = '';
    if (moveResult.success && moveResult.results) {
      const notInVoice = [
        ...moveResult.results.teamA.notInVoice.map(n => `• **${n}** (Time A)`),
        ...moveResult.results.teamB.notInVoice.map(n => `• **${n}** (Time B)`)
      ];
      if (notInVoice.length > 0) {
        warnings = `\n\n⚠️ **Jogadores fora de chamada:**\n${notInVoice.join('\n')}\n*Por favor, conectem-se na chamada do seu time!*`;
      }
    }

    if (warnings) {
      matchStartEmbed.setDescription(matchStartEmbed.data.description + warnings);
    }

    // Botão para finalizar o MIX e puxar todos de volta
    const endRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_end_mix')
        .setLabel('Finalizar Partida & Puxar Todos')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await channel.send({
      embeds: [matchStartEmbed],
      components: [endRow]
    });
  });
}

module.exports = {
  startMapVote
};
