const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

function createInstructionEmbed() {
  return new EmbedBuilder()
    .setColor(0x00E5FF)
    .setTitle('Como iniciar um Mix de Valorant?')
    .setDescription(
      `Para abrir uma nova sala personalizada, envie o comando abaixo neste canal:\n\n` +
      `\`/mix\`\n\n` +
      `O bot abrirá a fila e atualizará a imagem dos jogadores em tempo real.\n\n` +
      `✨ **Novo por aqui?**\n` +
      `Antes de entrar na sua primeira mix, cadastre seu Riot ID no bot:\n\n` +
      `\`/vincular nome#tag\`\n\n` +
      `**Exemplo:** \`/vincular Aspas#BR1\`\n` +
      `Você só precisa fazer isso uma vez — seu cadastro ficará salvo para as próximas partidas.`
    )
    .setFooter({ text: 'Mix VALORANT • discord.gg/xd' });
}

function createInstructionButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_start_mix_from_instructions')
      .setLabel('Iniciar MIX Agora')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎮'),
    new ButtonBuilder()
      .setCustomId('btn_my_rank')
      .setLabel('Meu Elo')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🏅'),
    new ButtonBuilder()
      .setCustomId('btn_info_help')
      .setLabel('Como Funciona?')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❓')
  );

  return [row];
}

async function sendInstructionMessage(channel) {
  const embed = createInstructionEmbed();
  const components = createInstructionButtons();

  return await channel.send({
    embeds: [embed],
    components
  });
}

module.exports = {
  createInstructionEmbed,
  createInstructionButtons,
  sendInstructionMessage
};
