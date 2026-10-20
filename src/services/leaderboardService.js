const { EmbedBuilder } = require('discord.js');
const database = require('../database');

const MEDALS = ['👑', '🥈', '🥉', '4️⃣', '5️⃣'];
const REI_TITLE = '**👑 REI DA XD**';

function getTop5Embed() {
  const leaderboard = database.getLeaderboard(5);

  if (!leaderboard || leaderboard.length === 0) {
    return {
      content: '📊 **Ainda não há dados suficientes para exibir o ranking.**\nFinalize pelo menos **1 partida** de MIX para os primeiros jogadores entrarem no Top 5!',
      embed: null
    };
  }

  const lines = leaderboard.map((player, index) => {
    const medal  = MEDALS[index] || `${index + 1}.`;
    const name   = player.riotName
      ? `**${player.riotName}**`
      : `**${player.displayName || 'Jogador'}**`;
    const wins   = player.wins   || 0;
    const losses = player.losses || 0;
    const kills  = player.kills  || 0;
    const games  = player.gamesPlayed || (wins + losses) || 1;
    const wr     = Math.round((wins / games) * 100);

    if (index === 0) {
      return (
        `${medal} ${REI_TITLE} — ${name}\n` +
        `┣ 🏆 Vitórias: \`${wins}\`  💀 Kills: \`${kills}\`  📉 WR: \`${wr}%\`\n` +
        `┗ 🎮 Partidas: \`${games}\``
      );
    }

    return (
      `${medal} ${name}\n` +
      `┣ 🏆 \`${wins}V\`  💀 \`${kills}K\`  📉 \`${wr}%\` WR\n` +
      `┗ 🎮 \`${games}\` partidas`
    );
  });

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setTitle('🏆 RANKING — TOP 5 MELHORES DA XD')
    .setDescription(
      `Os melhores guerreiros das partidas personalizadas do servidor!\n` +
      `Stats computados automaticamente ao final de cada MIX.\n\n` +
      lines.join('\n\n')
    )
    .setFooter({ text: 'discord.gg/xd  •  Stats atualizados automaticamente após cada partida' })
    .setTimestamp();

  return { content: null, embed };
}

module.exports = {
  getTop5Embed
};
