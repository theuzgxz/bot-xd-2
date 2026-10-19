/**
 * Gerenciador de movimentação de voz no Discord para os times do MIX
 */

async function movePlayersToTeamChannels(guild, team1, team2, guildConfig) {
  const { voiceTeamAId, voiceTeamBId } = guildConfig;

  const results = {
    teamA: { moved: [], notInVoice: [], failed: [] },
    teamB: { moved: [], notInVoice: [], failed: [] }
  };

  if (!voiceTeamAId || !voiceTeamBId) {
    return {
      success: false,
      error: 'Canais de voz de Time A e/ou Time B não foram configurados! Use `/configmix`.'
    };
  }

  // Mover Time A
  for (const player of team1.players) {
    try {
      const member = await guild.members.fetch(player.id).catch(() => null);
      if (!member) {
        results.teamA.failed.push(player.displayName || player.id);
        continue;
      }

      if (!member.voice || !member.voice.channelId) {
        results.teamA.notInVoice.push(member.displayName);
        continue;
      }

      await member.voice.setChannel(voiceTeamAId, 'Movimentação automática Valorant MIX - Time A');
      results.teamA.moved.push(member.displayName);
    } catch (err) {
      console.error(`Falha ao mover jogador ${player.id} para Time A:`, err.message);
      results.teamA.failed.push(player.displayName || player.id);
    }
  }

  // Mover Time B
  for (const player of team2.players) {
    try {
      const member = await guild.members.fetch(player.id).catch(() => null);
      if (!member) {
        results.teamB.failed.push(player.displayName || player.id);
        continue;
      }

      if (!member.voice || !member.voice.channelId) {
        results.teamB.notInVoice.push(member.displayName);
        continue;
      }

      await member.voice.setChannel(voiceTeamBId, 'Movimentação automática Valorant MIX - Time B');
      results.teamB.moved.push(member.displayName);
    } catch (err) {
      console.error(`Falha ao mover jogador ${player.id} para Time B:`, err.message);
      results.teamB.failed.push(player.displayName || player.id);
    }
  }

  return {
    success: true,
    results
  };
}

async function pullAllToWaitingChannel(guild, playerIds, waitingChannelId) {
  if (!waitingChannelId) {
    return { success: false, error: 'Canal de espera não configurado.' };
  }

  const moved = [];
  const notInVoice = [];

  for (const id of playerIds) {
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.voice && member.voice.channelId) {
        await member.voice.setChannel(waitingChannelId, 'Retorno para a Call de Espera do MIX');
        moved.push(member.displayName);
      } else {
        notInVoice.push(id);
      }
    } catch (err) {
      console.error(`Falha ao puxar jogador ${id}:`, err.message);
    }
  }

  return { success: true, moved, notInVoice };
}

module.exports = {
  movePlayersToTeamChannels,
  pullAllToWaitingChannel
};
