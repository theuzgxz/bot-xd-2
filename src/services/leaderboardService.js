const { EmbedBuilder } = require('discord.js');
const database = require('../database');

function getTop5Embed() {
  const leaderboard = database.getLeaderboard(5);

  if (!leaderboard || leaderboard.length === 0) {
    return {
      content: '**Ainda não há dados suficientes para exibir o ranking.**\nFinalize pelo menos **1 partida** de MIX para os primeiros jogadores entrarem no Top 5!',
      embed: null
    };
  }

  const lines = leaderboard.map((player, index) => {
    const pos = `${index + 1}.`;
    const name = player.riotName
      ? `**${player.riotName}**`
      : `**${player.displayName || 'Jogador'}**`;
    const wins = player.wins || 0;
    const losses = player.losses || 0;
    const kills = player.kills || 0;
    const games = player.gamesPlayed || (wins + losses) || 1;
    const wr = Math.round((wins / games) * 100);

    if (index === 0) {
      return (
        `${pos} **REI DA XD** — ${name}\n` +
        `• Vitórias: \`${wins}\` | Kills: \`${kills}\` | WR: \`${wr}%\` | Partidas: \`${games}\``
      );
    }

    return (
      `${pos} ${name}\n` +
      `• Vitórias: \`${wins}\` | Kills: \`${kills}\` | WR: \`${wr}%\` | Partidas: \`${games}\``
    );
  });

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setTitle('RANKING — TOP 5 MELHORES DA XD')
    .setDescription(
      `Os melhores jogadores das partidas personalizadas do servidor.\n` +
      `Estatísticas computadas automaticamente ao final de cada MIX.\n\n` +
      lines.join('\n\n')
    )
    .setFooter({ text: 'discord.gg/xd • Estatísticas atualizadas após cada partida' })
    .setTimestamp();

  return { content: null, embed };
}

module.exports = {
  getTop5Embed
};
