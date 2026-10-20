const { SlashCommandBuilder } = require('discord.js');
const { activeMixes } = require('../handlers/mixHandler');
const { balanceTeams, randomTeams } = require('../services/matchmaker');
const { hasMixPermission } = require('../utils/permissions');
const {
  createTeamsEmbed,
  createDraftControlButtons
} = require('../handlers/mixHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sortear')
    .setDescription('Sorteia os times do MIX ativo com ou sem balanceamento de MMR.')
    .addStringOption(option =>
      option
        .setName('modo')
        .setDescription('Formato do sorteio dos times')
        .setRequired(false)
        .addChoices(
          { name: '⚖️ Balanceado por Elo/MMR (Recomendado)', value: 'balanced' },
          { name: '🎲 Aleatório (Sem balanceamento)', value: 'random' }
        )
    ),

  async execute(interaction) {
    const session = activeMixes.get(interaction.guildId);

    if (!session) {
      return interaction.reply({
        content: '❌ Não há nenhuma fila de MIX ativa neste servidor! Inicie uma com `/mix`.',
        ephemeral: true
      });
    }

    const canManage = hasMixPermission(interaction.member) || session.creatorId === interaction.user.id;
    if (!canManage) {
      return interaction.reply({
        content: '❌ Apenas quem possui o cargo **mix** (ou Administrador, ou quem iniciou o MIX) pode sortear os times!',
        ephemeral: true
      });
    }

    if (session.players.length < 2) {
      return interaction.reply({
        content: '⚠️ É necessário que pelo menos 2 jogadores estejam na fila para sortear os times!',
        ephemeral: true
      });
    }

    const mode = interaction.options.getString('modo') || 'balanced';
    const teams = (mode === 'random')
      ? randomTeams(session.players)
      : balanceTeams(session.players);

    session.teams = teams;

    const { createTeamsEmbed, createDraftControlButtons } = require('../handlers/mixHandler');

    await interaction.reply({
      embeds: [createTeamsEmbed(teams)],
      components: createDraftControlButtons()
    });
  }
};
