const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');

// Medalhas para top 5
const MEDALS = ['👑', '🥈', '🥉', '4️⃣', '5️⃣'];

// Títulos especiais para o #1
const REI_TITLE = '**👑 REI DA XD**';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('melhores')
    .setDescription('Exibe o ranking Top 5 dos melhores jogadores das partidas Mix do servidor.'),

  async execute(interaction) {
    const leaderboard = database.getLeaderboard(5);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.reply({
        content: '📊 Ainda não há dados suficientes para exibir o ranking. Finalize pelo menos uma partida de MIX para os stats serem computados!',
        ephemeral: true
      });
    }

    // ----- Monta o texto do ranking -----
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

      // Linha especial para o primeiro lugar
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
      .setTitle('🏆 RANKING — TOP 5 MIX XD')
      .setDescription(
        `Os melhores guerreiros das partidas personalizadas do servidor!\n` +
        `Stats computados automaticamente ao final de cada MIX.\n\n` +
        lines.join('\n\n')
      )
      .setFooter({ text: `discord.gg/xd  •  Stats atualizados automaticamente após cada partida` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
