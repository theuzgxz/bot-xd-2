const { SlashCommandBuilder } = require('discord.js');
const { sendInstructionMessage } = require('../handlers/instructionHandler');
const { hasMixPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limparmix')
    .setDescription('Limpa o chat do MIX e restabelece o banner e as instruções oficiais no topo.'),

  async execute(interaction) {
    if (!hasMixPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador) pode limpar o chat do MIX!',
        ephemeral: true
      });
    }

    const channel = interaction.channel;

    await interaction.deferReply({ ephemeral: true });

    try {
      // Loop para apagar todas as mensagens do canal (mensagens com menos de 14 dias)
      let deletedCount = 0;
      let fetched;

      do {
        fetched = await channel.messages.fetch({ limit: 100 });
        if (fetched.size === 0) break;

        const deleted = await channel.bulkDelete(fetched, true);
        deletedCount += deleted.size;

        // Se o bulkDelete apagou menos do que fetched, as restantes têm mais de 14 dias
        if (deleted.size < fetched.size) {
          const oldMessages = fetched.filter(m => !deleted.has(m.id));
          for (const oldMsg of oldMessages.values()) {
            await oldMsg.delete().catch(() => {});
            deletedCount++;
          }
          break;
        }
      } while (fetched.size >= 2);

      // Envia imediatamente a imagem oficial de banner com as instruções completas
      await sendInstructionMessage(channel);

      await interaction.editReply({
        content: `🧹 **Chat do MIX limpo com sucesso!**\nForam removidas **${deletedCount}** mensagens e o guia oficial do MIX foi restaurado no topo do canal!`
      });
    } catch (error) {
      console.error('Erro ao limpar chat do mix:', error);
      await interaction.editReply({
        content: `⚠️ Ocorreu um erro ao limpar as mensagens do canal: ${error.message}`
      });
    }
  }
};
