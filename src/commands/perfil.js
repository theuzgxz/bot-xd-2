const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { COLORS, DEFAULT_RANK, DEFAULT_MMR, RANKS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Exibe o perfil e elo cadastrado no sistema do MIX.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para consultar o perfil (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const userData = database.getUser(target.id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`PERFIL DE VALORANT - ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (userData) {
      embed.addFields(
        {
          name: 'Conta Riot',
          value: userData.riotName ? `${userData.riotName}#${userData.riotTag}` : '*Não vinculada*',
          inline: true
        },
        {
          name: 'Elo Registrado',
          value: `**${userData.rank || DEFAULT_RANK}**`,
          inline: true
        },
        {
          name: 'MMR Base',
          value: `\`${userData.mmr || DEFAULT_MMR} pts\``,
          inline: true
        }
      );
    } else {
      embed.setDescription(
        `<@${target.id}> ainda não tem elo registrado no sistema.\n\n` +
        `Use \`/vincular nick#tag\` (ex: \`/vincular Aspas#BR1\`) para puxar seu elo oficial da Riot Games!`
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
