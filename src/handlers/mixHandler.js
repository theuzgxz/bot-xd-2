const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const { COLORS } = require('../config');
const database = require('../database');
const { balanceTeams, randomTeams } = require('../services/matchmaker');
const { startMapVote } = require('./voteHandler');
const { pullAllToWaitingChannel } = require('../services/voiceManager');
const { hasMixPermission } = require('../utils/permissions');
const { renderLobbyImage, preloadPlayerAvatar } = require('../services/imageGenerator');

// Armazena as sessões ativas de MIX em memória por servidor: guildId -> MixSession
const activeMixes = new Map();

function createLobbyEmbed(session, imageName = 'lobby.png') {
  const count = session.players.length;
  const isFull = count >= 10;

  const embed = new EmbedBuilder()
    .setColor(isFull ? COLORS.SUCCESS : 0x00E5FF)
    .setTitle('🎮 VALORANT MIX - FILA COMPETITIVA (5v5)')
    .setDescription(
      `Entre na fila para montar um MIX balanceado de Valorant!\n` +
      `Assim que **10 jogadores** entrarem, um organizador com o cargo **\`mix\`** escolherá o formato do sorteio dos times!\n\n` +
      `📌 *Use \`/vincular nick#tag\` para sincronizar seu elo oficial Riot Games.*`
    )
    .setImage(`attachment://${imageName}`)
    .setFooter({ text: 'discord.gg/xd • Mix criado por ' + session.creatorName })
    .setTimestamp();

  return embed;
}

function createLobbyButtons(disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_join_mix')
      .setLabel('Entrar no MIX')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎮')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('btn_leave_mix')
      .setLabel('Sair da Fila')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🚪')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('btn_my_rank')
      .setLabel('Meu Elo')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🏅'),
    new ButtonBuilder()
      .setCustomId('btn_cancel_mix')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
      .setDisabled(disabled)
  );

  return [row];
}

async function startNewMix(interaction) {
  const guildId = interaction.guildId;

  if (activeMixes.has(guildId)) {
    return interaction.reply({
      content: '⚠️ Já existe uma sessão de MIX ativa neste servidor! Finalize-a ou cancele antes de abrir uma nova.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const guildConfig = database.getGuildConfig(guildId);
  const voiceNotice = (!guildConfig.voiceTeamAId || !guildConfig.voiceTeamBId)
    ? '⚠️ *Aviso: Os canais de voz ainda não foram configurados. Quem possui o cargo `mix` pode usar `/configmix` para habilitar a troca automática de chamadas.*\n'
    : '';

  const session = {
    guildId,
    channelId: interaction.channelId,
    creatorId: interaction.user.id,
    creatorName: interaction.user.displayName || interaction.user.username,
    players: [],
    messageId: null,
    draftMessageId: null,
    teams: null
  };

  const imageName = `lobby-${Date.now()}.png`;
  const imageBuffer = await renderLobbyImage(session.players);
  const attachment = new AttachmentBuilder(imageBuffer, { name: imageName });

  const reply = await interaction.editReply({
    content: voiceNotice || null,
    embeds: [createLobbyEmbed(session, imageName)],
    files: [attachment],
    components: createLobbyButtons(false)
  });

  session.messageId = reply.id;
  activeMixes.set(guildId, session);
}

function createTeamsEmbed(teams) {
  const team1List = teams.team1.players
    .map((p, i) => `${i + 1}. <@${p.id}> ${p.badge} **${p.rankName}** *(MMR: ${p.mmr})*`)
    .join('\n');

  const team2List = teams.team2.players
    .map((p, i) => `${i + 1}. <@${p.id}> ${p.badge} **${p.rankName}** *(MMR: ${p.mmr})*`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(`⚖️ TIMES SORTEADOS - ${teams.modeLabel.toUpperCase()}`)
    .setDescription(
      teams.mode === 'balanced'
        ? `Os times foram equilibrados matematicamente pelo MMR da Riot Games!\n` +
          `📊 **Diferença de MMR:** \`${teams.mmrDifference} pts\` *(Equilíbrio Máximo)*\n\n` +
          `👑 *Aguardando confirmação de um membro com o cargo \`mix\`.*`
        : `Os times foram sorteados de forma 100% aleatória sem considerar o elo!\n` +
          `📊 **Diferença de MMR:** \`${teams.mmrDifference} pts\`\n\n` +
          `👑 *Aguardando confirmação de um membro com o cargo \`mix\`.*`
    )
    .addFields(
      {
        name: `🔵 ${teams.team1.name} — ${teams.team1.side}`,
        value: `${team1List}\n**MMR Médio:** \`${teams.team1.avgMmr}\``,
        inline: true
      },
      {
        name: `🟠 ${teams.team2.name} — ${teams.team2.side}`,
        value: `${team2List}\n**MMR Médio:** \`${teams.team2.avgMmr}\``,
        inline: true
      }
    )
    .setFooter({ text: 'Apenas quem possui o cargo "mix" pode confirmar ou sortear novamente.' })
    .setTimestamp();
}

function createDraftControlButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_confirm_teams')
      .setLabel('Confirmar & Votar Mapa')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('btn_reroll_balanced')
      .setLabel('Sortear Novamente (Balanceado)')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('btn_reroll_random')
      .setLabel('Sortear Novamente (Aleatório)')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎲'),
    new ButtonBuilder()
      .setCustomId('btn_cancel_mix')
      .setLabel('Cancelar MIX')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  return [row];
}

async function promptDraftMode(channel, session) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('🎮 FILA CHEIA (10/10) - ESCOLHA O FORMATO DO SORTEIO')
    .setDescription(
      `Os **10 jogadores** confirmaram presença na fila!\n\n` +
      `👑 **Apenas quem possui o cargo \`mix\` (ou Administrador)** pode escolher o formato do sorteio abaixo:\n\n` +
      `• ⚖️ **Sortear com Balanceamento:** O bot analisa o elo e MMR de cada jogador da Riot para montar os times mais justos possíveis.\n` +
      `• 🎲 **Sortear Aleatório:** O bot mistura os 10 jogadores aleatoriamente sem considerar o elo.`
    )
    .setFooter({ text: 'Selecione uma opção abaixo para sortear os times.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_draft_balanced')
      .setLabel('Sortear com Balanceamento (MMR)')
      .setStyle(ButtonStyle.Success)
      .setEmoji('⚖️'),
    new ButtonBuilder()
      .setCustomId('btn_draft_random')
      .setLabel('Sortear Aleatório (Sem Balancear)')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎲'),
    new ButtonBuilder()
      .setCustomId('btn_cancel_mix')
      .setLabel('Cancelar MIX')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const draftMsg = await channel.send({
    embeds: [embed],
    components: [row]
  });

  session.draftMessageId = draftMsg.id;
}

async function handleButtonInteraction(interaction) {
  const { customId, guild, user, member } = interaction;
  const guildId = guild.id;

  // Iniciar MIX diretamente pelo botão da mensagem de instruções
  if (customId === 'btn_start_mix_from_instructions') {
    return await startNewMix(interaction);
  }

  // Ajuda / Como Funciona
  if (customId === 'btn_info_help') {
    return interaction.reply({
      content:
        `📖 **Como Funciona o Valorant MIX:**\n\n` +
        `1. Um jogador inicia a fila com \`/mix\` ou no botão verde.\n` +
        `2. 10 jogadores entram na fila (todos com conta vinculada via \`/vincular\`).\n` +
        `3. Quem possui o cargo **\`mix\`** escolhe sortear com ou sem balanceamento.\n` +
        `4. O organizador pode sortear novamente até aprovar a formação.\n` +
        `5. Após confirmar os times, inicia-se a votação de mapa de 45s.\n` +
        `6. O bot move os times para as calls de voz e puxa todos de volta ao final!`,
      ephemeral: true
    });
  }

  // Verificar meu elo (funciona a qualquer momento)
  if (customId === 'btn_my_rank') {
    const userData = database.getUser(user.id);
    if (!userData) {
      return interaction.reply({
        content: `ℹ️ Você ainda não vinculou sua conta! Digite \`/vincular nick#tag\` (ex: \`/vincular Aspas#LOUD\`) para puxar seu elo oficial do Valorant.`,
        ephemeral: true
      });
    }
    return interaction.reply({
      content: `🏅 **Seu Perfil de Valorant:**\n• Conta: **${userData.riotName || user.username}#${userData.riotTag || 'BR1'}**\n• Elo Oficial: ${userData.badge || '⭐'} **${userData.rank}** (${userData.rankingInTier || 0} RR)\n• MMR Base: \`${userData.mmr} pts\``,
      ephemeral: true
    });
  }

  // Finalizar partida e puxar todos
  if (customId === 'btn_end_mix') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode finalizar a partida!',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const session = activeMixes.get(guildId);
    const guildConfig = database.getGuildConfig(guildId);

    let playerIds = [];
    if (session && session.teams) {
      playerIds = [
        ...session.teams.team1.players.map(p => p.id),
        ...session.teams.team2.players.map(p => p.id)
      ];
    }

    activeMixes.delete(guildId);

    if (guildConfig.voiceWaitingId && playerIds.length > 0) {
      await pullAllToWaitingChannel(guild, playerIds, guildConfig.voiceWaitingId);
      return interaction.editReply({
        content: `✅ O MIX foi finalizado por <@${user.id}> e os jogadores foram movidos de volta para a call de espera <#${guildConfig.voiceWaitingId}>!`
      });
    }

    return interaction.editReply({
      content: `✅ O MIX foi finalizado por <@${user.id}>! Obrigado pelo jogo.`
    });
  }

  // Verificação de sessão ativa para os demais botões da fila
  const session = activeMixes.get(guildId);
  if (!session) {
    return interaction.reply({
      content: '❌ Não há nenhuma fila de MIX ativa no momento.',
      ephemeral: true
    });
  }

  // Cancelar MIX (apenas quem criou ou quem tem cargo "mix")
  if (customId === 'btn_cancel_mix') {
    const isMixHost = hasMixPermission(member);
    if (session.creatorId !== user.id && !isMixHost) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou quem iniciou o MIX) pode cancelá-lo.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    activeMixes.delete(guildId);

    try {
      if (session.messageId) {
        const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
        if (msg) {
          await msg.edit({
            content: '❌ **Este MIX foi cancelado.**',
            components: []
          });
        }
      }
      if (session.draftMessageId) {
        const dMsg = await interaction.channel.messages.fetch(session.draftMessageId).catch(() => null);
        if (dMsg) {
          await dMsg.delete().catch(() => {});
        }
      }
    } catch (e) {}

    return interaction.editReply({
      content: `🛑 O MIX foi cancelado por <@${user.id}>.`
    });
  }

  // Entrar no MIX
  if (customId === 'btn_join_mix') {
    if (session.players.some(p => p.id === user.id)) {
      return interaction.reply({
        content: '⚠️ Você já está na fila deste MIX!',
        ephemeral: true
      });
    }

    if (session.players.length >= 10) {
      return interaction.reply({
        content: '⚠️ A fila já atingiu o limite de 10 jogadores!',
        ephemeral: true
      });
    }

    // Carregar informações de elo do jogador
    const dbUser = database.getUser(user.id);
    if (!dbUser || !dbUser.rank) {
      return interaction.reply({
        content:
          `⚠️ **Você precisa vincular sua conta Riot antes de entrar na fila!**\n\n` +
          `Para que os times fiquem 100% equilibrados e justos, o bot precisa analisar seu elo oficial do Valorant.\n` +
          `👉 Digite no chat: \`/vincular nick#tag\` (Ex: \`/vincular Aspas#BR1\`)`,
        ephemeral: true
      });
    }

    const rankInfo = {
      rankName: dbUser.rank,
      mmr: dbUser.mmr,
      badge: dbUser.badge
    };

    const newPlayer = {
      id: user.id,
      username: user.username,
      displayName: member.displayName || user.username,
      avatarUrl: user.displayAvatarURL({ extension: 'png', size: 128 }),
      rankName: rankInfo.rankName,
      mmr: rankInfo.mmr,
      badge: rankInfo.badge,
      riotName: dbUser.riotName,
      riotTag: dbUser.riotTag,
      avatarBuffer: null
    };

    await preloadPlayerAvatar(newPlayer);
    session.players.push(newPlayer);

    const imageName = `lobby-${Date.now()}.png`;
    const imageBuffer = await renderLobbyImage(session.players);
    const attachment = new AttachmentBuilder(imageBuffer, { name: imageName });
    const embed = createLobbyEmbed(session, imageName);

    // Atualiza a mensagem do lobby
    if (interaction.message && interaction.message.id === session.messageId) {
      await interaction.update({
        embeds: [embed],
        files: [attachment],
        components: createLobbyButtons(session.players.length >= 10)
      });
    } else {
      await interaction.deferUpdate().catch(() => {});
      const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
      if (msg) {
        await msg.edit({
          embeds: [embed],
          files: [attachment],
          components: createLobbyButtons(session.players.length >= 10)
        });
      }
    }

    // Se atingiu 10 jogadores, pede para o organizador com cargo mix escolher o sorteio!
    if (session.players.length === 10) {
      await promptDraftMode(interaction.channel, session);
    }
    return;
  }

  // Sair do MIX
  if (customId === 'btn_leave_mix') {
    const index = session.players.findIndex(p => p.id === user.id);
    if (index === -1) {
      return interaction.reply({
        content: '⚠️ Você não está na fila.',
        ephemeral: true
      });
    }

    session.players.splice(index, 1);

    const imageName = `lobby-${Date.now()}.png`;
    const imageBuffer = await renderLobbyImage(session.players);
    const attachment = new AttachmentBuilder(imageBuffer, { name: imageName });
    const embed = createLobbyEmbed(session, imageName);

    if (interaction.message && interaction.message.id === session.messageId) {
      await interaction.update({
        embeds: [embed],
        files: [attachment],
        components: createLobbyButtons(false)
      });
    } else {
      await interaction.deferUpdate().catch(() => {});
      const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
      if (msg) {
        await msg.edit({
          embeds: [embed],
          files: [attachment],
          components: createLobbyButtons(false)
        });
      }
    }
    return;
  }

  // Escolha inicial: Sorteio Balanceado
  if (customId === 'btn_draft_balanced') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode configurar e sortear os times!',
        ephemeral: true
      });
    }

    const teams = balanceTeams(session.players);
    session.teams = teams;

    await interaction.update({
      embeds: [createTeamsEmbed(teams)],
      components: createDraftControlButtons()
    });
    return;
  }

  // Escolha inicial: Sorteio Aleatório
  if (customId === 'btn_draft_random') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode configurar e sortear os times!',
        ephemeral: true
      });
    }

    const teams = randomTeams(session.players);
    session.teams = teams;

    await interaction.update({
      embeds: [createTeamsEmbed(teams)],
      components: createDraftControlButtons()
    });
    return;
  }

  // Re-sortear Balanceado
  if (customId === 'btn_reroll_balanced') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode re-sortear os times!',
        ephemeral: true
      });
    }

    const teams = balanceTeams(session.players);
    session.teams = teams;

    await interaction.update({
      embeds: [createTeamsEmbed(teams)],
      components: createDraftControlButtons()
    });
    return;
  }

  // Re-sortear Aleatório
  if (customId === 'btn_reroll_random') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode re-sortear os times!',
        ephemeral: true
      });
    }

    const teams = randomTeams(session.players);
    session.teams = teams;

    await interaction.update({
      embeds: [createTeamsEmbed(teams)],
      components: createDraftControlButtons()
    });
    return;
  }

  // Confirmar Times e Iniciar Votação de Mapas
  if (customId === 'btn_confirm_teams') {
    if (!hasMixPermission(member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode confirmar os times e iniciar a votação de mapas!',
        ephemeral: true
      });
    }

    // Trava os botões de sorteio
    await interaction.update({
      content: `✅ **Times confirmados por <@${user.id}>! Iniciando votação de mapas...**`,
      components: []
    });

    // Marca o horário de início da partida para busca posterior na API
    session.matchStartedAt = Date.now();

    const guildConfig = database.getGuildConfig(guild.id);
    await startMapVote(interaction.channel, guild, session.teams.team1, session.teams.team2, guildConfig);
    return;
  }
}

module.exports = {
  startNewMix,
  handleButtonInteraction,
  activeMixes
};
