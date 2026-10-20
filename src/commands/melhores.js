const { SlashCommandBuilder } = require('discord.js');
const { getTop5Embed } = require('../services/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('melhores')
    .setDescription('Exibe o ranking Top 5 dos melhores jogadores das partidas Mix do servidor.'),

  async execute(interaction) {
    const result = getTop5Embed();
    if (result.embed) {
      await interaction.reply({ embeds: [result.embed] });
    } else {
      await interaction.reply({ content: result.content, ephemeral: true });
    }
  }
};

