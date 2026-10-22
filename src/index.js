require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================================
// Servidor HTTP keep-alive (necessário para Render + UptimeRobot)
// O Render exige que a aplicação escute uma porta HTTP.
// O UptimeRobot faz ping nesta URL a cada 5 min para evitar hibernação.
// ============================================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('mix xd Bot esta online e funcionando!\n');
}).listen(PORT, () => {
  console.log(`Servidor keep-alive rodando na porta ${PORT}`);
});

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  ActivityType,
  Events
} = require('discord.js');
const { handleButtonInteraction } = require('./handlers/mixHandler');

// Inicialização do cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const commands = [];

// Carregar comandos dinamicamente da pasta src/commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
  }
}

// Registrar Slash Commands
async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.warn('[AVISO] DISCORD_TOKEN ou CLIENT_ID não configurados no arquivo .env!');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`Iniciando registro de ${commands.length} comandos de barra (/)...`);

    if (guildId) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
        console.log(`Comandos registrados com sucesso no servidor (${guildId})!`);
        return;
      } catch (guildErr) {
        if (guildErr.code === 50001) {
          console.warn(`[AVISO] O bot ainda não está no servidor ID ${guildId} ou falta a permissão applications.commands.`);
          console.log(`Adicione o bot ao servidor usando o link abaixo:`);
          console.log(`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=20048896&scope=bot%20applications.commands\n`);
        } else {
          console.error('Erro no registro do servidor:', guildErr.message);
        }
      }
    }

    // Registro global como padrão ou fallback
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('Comandos registrados globalmente com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos globais:', error);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`===============================================`);
  console.log(`Bot Valorant MIX online como: ${client.user.tag}`);
  console.log(`Servidores conectados: ${client.guilds.cache.size}`);
  if (client.guilds.cache.size === 0) {
    console.log(`\n[AVISO] O bot ainda não foi adicionado a nenhum servidor!`);
    console.log(`Use este link para adicioná-lo:`);
    console.log(`https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=20048896&scope=bot%20applications.commands\n`);
  }
  console.log(`===============================================`);

  // Definir status do Bot
  client.user.setPresence({
    activities: [{ name: 'Valorant MIX | /mix', type: ActivityType.Competing }],
    status: 'online'
  });

  // Registrar comandos no Discord
  await registerSlashCommands();
});

// Manipulador de interações
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Comando não encontrado.', ephemeral: true }).catch(() => {});
        }
        return;
      }

      await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      // Se a interação não for tratada por um coletor ativo, responde antes de estourar os 3s
      setTimeout(async () => {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Esta votação já expirou ou foi encerrada.',
            ephemeral: true
          }).catch(() => {});
        }
      }, 2000);
    }
  } catch (error) {
    console.error(`Erro ao processar interação:`, error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'Ocorreu um erro ao executar esta ação.',
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: 'Ocorreu um erro ao executar esta ação.',
          ephemeral: true
        }).catch(() => {});
      }
    } catch (e) {}
  }
});

// Tratamento de erros globais para evitar queda do bot
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

// Login do Bot
const token = process.env.DISCORD_TOKEN;
if (!token || token.includes('SEU_') || token === 'SEU_DISCORD_BOT_TOKEN_AQUI') {
  console.log('\n-----------------------------------------------------------');
  console.log('AVISO: Configure o DISCORD_TOKEN no seu arquivo .env');
  console.log('   Abra o arquivo .env e cole o Token do seu Bot do Discord.');
  console.log('-----------------------------------------------------------\n');
} else {
  client.login(token);
}
