const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const database = require('../database');
const { COLORS } = require('../config');

const { hasMixPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configmix')
    .setDescription('Configura os 3 canais de voz para a movimentação automática do MIX.')
    .addChannelOption(option =>
      option
        .setName('call_espera')
        .setDescription('Canal de voz da sala de espera do MIX')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('call_time_a')
        .setDescription('Canal de voz para o Time A')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('call_time_b')
        .setDescription('Canal de voz para o Time B')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasMixPermission(interaction.member)) {
      return interaction.reply({
        content: 'Apenas quem possui o cargo **mix** (ou Administrador) pode configurar as chamadas do MIX!',
        ephemeral: true
      });
    }

    const callEspera = interaction.options.getChannel('call_espera');
    const callTimeA = interaction.options.getChannel('call_time_a');
    const callTimeB = interaction.options.getChannel('call_time_b');

    // Validação para garantir que não escolheram canais duplicados
    if (callTimeA.id === callTimeB.id) {
      return interaction.reply({
        content: 'O canal do Time A e Time B não podem ser o mesmo!',
        ephemeral: true
      });
    }

    database.setGuildConfig(interaction.guildId, {
      voiceWaitingId: callEspera.id,
      voiceTeamAId: callTimeA.id,
      voiceTeamBId: callTimeB.id
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('CANAIS DE VOZ DO MIX CONFIGURADOS')
      .setDescription('Os canais de voz para o balanceamento automático foram salvos com sucesso:')
      .addFields(
        { name: 'Call de Espera (Geral)', value: `<#${callEspera.id}>`, inline: false },
        { name: 'Call Time A', value: `<#${callTimeA.id}>`, inline: true },
        { name: 'Call Time B', value: `<#${callTimeB.id}>`, inline: true }
      )
      .setFooter({ text: 'Após a votação do mapa, os jogadores serão movidos automaticamente.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
