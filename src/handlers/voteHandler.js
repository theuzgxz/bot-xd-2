const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const { MAPS, MAP_VOTE_DURATION } = require('../config');
const { movePlayersToTeamChannels } = require('../services/voiceManager');
const database = require('../database');
const { renderMapVoteImage, renderTeamsImage, preloadPlayerAvatar } = require('../services/imageGenerator');

/**
 * Inicia a fase de votação de mapa após o balanceamento dos times.
 * Usa imagens geradas via canvas em vez de embeds de texto.
 */
async function startMapVote(interactionOrChannel, guild, team1, team2, guildConfig) {
  const channel = interactionOrChannel.channel || interactionOrChannel;
  const playerIds = new Set([...team1.players.map(p => p.id), ...team2.players.map(p => p.id)]);

  const votes = {};  // userId -> mapId
  let timeLeft = MAP_VOTE_DURATION;
  let finished = false;

  // Pré-carregar avatares de todos os jogadores para uso na imagem
  const allPlayers = [...team1.players, ...team2.players];
  const playerMap = {};
  for (const p of allPlayers) {
    await preloadPlayerAvatar(p);
    playerMap[p.id] = p;
  }

  // Menu de seleção de mapa (mantido para interação do Discord)
  const mapOptions = MAPS.map(m => ({
    label: m.name,
    value: m.id,
    description: `Votar no mapa ${m.name}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('map_vote_select')
    .setPlaceholder('Selecione o mapa em que deseja votar...')
    .addOptions(mapOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Helper: gera e retorna um AttachmentBuilder com a imagem atual da votação
  async function buildVoteAttachment() {
    const buf = await renderMapVoteImage(MAPS, votes, playerMap, timeLeft);
    const name = `mapvote-${Date.now()}.png`;
    return new AttachmentBuilder(buf, { name });
  }

  // Enviar mensagem inicial com a imagem
  const voteMessage = await channel.send({
    files: [await buildVoteAttachment()],
    components: [row]
  });

  // Helper: atualiza a mensagem editando a imagem
  async function updateVoteImage(keepComponents = true) {
    try {
      await voteMessage.edit({
        files: [await buildVoteAttachment()],
        components: keepComponents ? [row] : []
      });
    } catch (e) {
      // Ignora erros de edição (rate limit, mensagem deletada, etc.)
    }
  }

  // Coletor de interações do Select Menu
  const collector = voteMessage.createMessageComponentCollector({
    filter: i => i.customId === 'map_vote_select',
    time: MAP_VOTE_DURATION * 1000
  });

  // Atualização periódica do timer a cada 5 segundos
  const interval = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0 || finished) {
      clearInterval(interval);
      return;
    }
    await updateVoteImage(true);
  }, 5000);

  collector.on('collect', async i => {
    if (!playerIds.has(i.user.id)) {
      return i.reply({
        content: 'Apenas os jogadores confirmados neste MIX podem votar no mapa!',
        ephemeral: true
      });
    }

    const selectedMapId = i.values[0];
    votes[i.user.id] = selectedMapId;
    const selectedMap = MAPS.find(m => m.id === selectedMapId);

    await i.reply({
      content: `Você votou no mapa **${selectedMap ? selectedMap.name : selectedMapId}**!`,
      ephemeral: true
    });

    // Atualiza a imagem mostrando o novo voto (avatar do votante)
    await updateVoteImage(true);

    // Se todos os 10 jogadores já votaram, encerra mais cedo
    if (Object.keys(votes).length >= 10) {
      collector.stop('all_voted');
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

    // Atualiza a imagem de votação final (timeLeft = 0) e remove o menu
    timeLeft = 0;
    await updateVoteImage(false);

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

    // ─── Imagem final: Times A e B com o mapa vencedor de fundo ────────────
    const teamsImageBuf = await renderTeamsImage(team1, team2, winningMap);
    const teamsAttachment = new AttachmentBuilder(teamsImageBuf, { name: `teams-${Date.now()}.png` });

    // Texto sobre movimentação de voz
    let moveContent = '';
    if (moveResult.success) {
      moveContent = `**Time A** → <#${guildConfig.voiceTeamAId}>  •  **Time B** → <#${guildConfig.voiceTeamBId}>`;
      if (moveResult.results) {
        const notInVoice = [
          ...moveResult.results.teamA.notInVoice.map(n => `• **${n}** (Time A)`),
          ...moveResult.results.teamB.notInVoice.map(n => `• **${n}** (Time B)`)
        ];
        if (notInVoice.length > 0) {
          moveContent += `\n\n**Jogadores fora de chamada:**\n${notInVoice.join('\n')}\n*Por favor, conectem-se na chamada do seu time!*`;
        }
      }
    } else {
      moveContent = `*${moveResult.error || 'Canais de voz não configurados.'}*`;
    }

    // Botão para finalizar o MIX e puxar todos de volta
    const endRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_end_mix')
        .setLabel('Finalizar Partida e Puxar Todos')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: moveContent || null,
      files: [teamsAttachment],
      components: [endRow]
    });
  });
}

module.exports = {
  startMapVote
};

