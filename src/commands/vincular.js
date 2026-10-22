const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchRiotAccountRank } = require('../services/valorantApi');
const database = require('../database');
const { COLORS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Vincula sua conta Riot (Valorant) e puxa seu elo oficial e MMR automaticamente.')
    .addStringOption(option =>
      option
        .setName('riot_id')
        .setDescription('Seu Riot ID no formato Nome#Tag (Ex: Aspas#LOUD ou Player#1234)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('regiao')
        .setDescription('Sua região no Valorant (Padrão: Brasil - br)')
        .setRequired(false)
        .addChoices(
          { name: 'Brasil (br)', value: 'br' },
          { name: 'América do Norte (na)', value: 'na' },
          { name: 'Europa (eu)', value: 'eu' },
          { name: 'América Latina (latam)', value: 'latam' }
        )
    ),

  async execute(interaction) {
    const rawRiotId = interaction.options.getString('riot_id').trim();
    const region = interaction.options.getString('regiao') || 'br';

    if (!rawRiotId.includes('#')) {
      return interaction.reply({
        content: '**Formato inválido!** Você precisa informar o seu Riot ID com a hashtag `#`. Exemplo: `/vincular Aspas#BR1`',
        ephemeral: true
      });
    }

    const [name, tag] = rawRiotId.split('#');

    await interaction.deferReply({ ephemeral: true });

    const apiResult = await fetchRiotAccountRank(name, tag, region);

    if (apiResult.success) {
      database.setUser(interaction.user.id, {
        riotName: apiResult.riotName,
        riotTag: apiResult.riotTag,
        rank: apiResult.rankName,
        mmr: apiResult.mmr,
        tier: apiResult.tier,
        badge: apiResult.badge,
        rankingInTier: apiResult.rankingInTier || 0
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('CONTA RIOT IDENTIFICADA E VINCULADA')
        .setDescription(
          `Sua conta oficial de Valorant foi identificada e seu elo foi sincronizado com sucesso no sistema do MIX!`
        )
        .addFields(
          {
            name: 'Conta Riot',
            value: `**${apiResult.riotName}#${apiResult.riotTag}**`,
            inline: true
          },
          {
            name: 'Ranque Oficial',
            value: `**${apiResult.rankName}** (${apiResult.rankingInTier || 0} RR)`,
            inline: true
          },
          {
            name: 'MMR Calculado',
            value: `\`${apiResult.mmr} pts\``,
            inline: true
          }
        )
        .setFooter({ text: 'Agora você já pode entrar na fila do MIX! Seus times serão balanceados automaticamente.' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // Caso a chave da API esteja faltando ou inválida no .env
    if (apiResult.missingKey || apiResult.invalidKey) {
      return interaction.editReply({
        content:
          `**Aviso aos Administradores do Servidor:**\n` +
          `Para ativar a consulta automática de elos diretamente da Riot Games, é necessário configurar a chave gratuita da API no arquivo \`.env\` (\`HENRIKDEV_API_KEY\`).\n\n` +
          `**Como obter a chave gratuita em 30 segundos:**\n` +
          `1. Acesse o portal: https://api.henrikdev.xyz/dashboard (ou no Discord discord.gg/X3GaVkX2YN)\n` +
          `2. Faça login com seu Discord e clique em **"Create Key"** (Basic Key Gratuita).\n` +
          `3. Cole a chave gerada no arquivo \`.env\` e reinicie o bot!`
      });
    }

    // Caso a conta não exista ou não tenha jogos ranqueados
    return interaction.editReply({
      content:
        `**Não foi possível sincronizar o elo da conta:**\n` +
        `• ${apiResult.error}\n\n` +
        `**Dicas para resolver:**\n` +
        `1. Abra seu jogo do Valorant e confira a grafia exata do seu **Nome#TAG**.\n` +
        `2. Verifique se a região selecionada foi correta (Padrão: Brasil - \`br\`).\n` +
        `3. Contas sem partidas competitivas jogadas nos últimos episódios podem aparecer como Sem Ranque (Unranked).`
    });
  }
};
