const { SlashCommandBuilder } = require('discord.js');
const { sendInstructionMessage } = require('../handlers/instructionHandler');
const { hasMixPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('instrucoes')
    .setDescription('Envia o guia de instruções compacto e oficial do MIX neste canal.'),

  async execute(interaction) {
    if (!hasMixPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode enviar as instruções oficiais!',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await sendInstructionMessage(interaction.channel);
      await interaction.editReply({
        content: '✅ O guia de instruções compacto do MIX foi enviado com sucesso no canal!'
      });
    } catch (err) {
      console.error('Erro ao enviar instruções:', err);
      await interaction.editReply({
        content: `❌ Ocorreu um erro ao enviar as instruções: ${err.message}`
      });
    }
  }
};
