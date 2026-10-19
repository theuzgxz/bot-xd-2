const { SlashCommandBuilder } = require('discord.js');
const { startNewMix } = require('../handlers/mixHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mix')
    .setDescription('Cria uma nova sala de espera e fila de Valorant MIX (5v5).'),
  async execute(interaction) {
    await startNewMix(interaction);
  }
};
