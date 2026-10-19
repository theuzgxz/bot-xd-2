# 🎯 Valorant MIX Discord Bot (5v5)

Bot completo para criação, balanceamento por elo, votação de mapas e movimentação automática de chamadas de voz para partidas customizadas (**MIX**) de **Valorant** no Discord!

---

## 🚀 Funcionalidades Principais

1. **🎮 Fila Interativa (10 Jogadores):**
   - Cria uma mensagem estilizada com botões para os jogadores entrarem ou saírem da fila (`/mix`).
   - Mostra o elo e status de cada jogador em tempo real.

2. **⚖️ Controle Exclusivo do Cargo `@mix` & Modos de Sorteio:**
   - Apenas quem possui o cargo **`mix`** (ou Administrador) pode configurar e sortear os times.
   - **Opção 1 - Sortear com Balanceamento (MMR):** Algoritmo exato que testa as 252 combinações de 5v5 para encontrar a formação matematicamente mais equilibrada.
   - **Opção 2 - Sortear Aleatório (Sem Balancear):** Mistura os 10 jogadores aleatoriamente.
   - **Opção de Sortear Novamente:** O organizador pode clicar em "Sortear Novamente (Balanceado)" ou "Sortear Novamente (Aleatório)" quantas vezes quiser antes de confirmar os times.
   - Sorteia quem começa no **Ataque ⚔️** e na **Defesa 🛡️**.

3. **🗺️ Votação Interativa de Mapa:**
   - Abre uma votação com timer regressivo contendo os mapas oficiais do Valorant (*Ascent, Bind, Haven, Split, Icebox, Breeze, Fracture, Lotus, Sunset, Abyss*).
   - Apenas os 10 jogadores do MIX podem votar.
   - Exibe o mapa vencedor com banner oficial em alta definição.

4. **🔊 Movimentação Automática de Voz (3 Calls):**
   - **Call de Espera (Geral)**: onde os jogadores aguardam o início.
   - **Call Time A**: para onde o Time A é movido automaticamente após a votação.
   - **Call Time B**: para onde o Time B é movido automaticamente após a votação.
   - Trata jogadores que não estavam em chamada e avisa no chat.
   - Botão e comando `/finalizarmix` para puxar todos de volta para a call de espera ao final da partida!

5. **🏅 Sistema de Elos e Contas:**
   - `/vincular nick#tag`: vincula seu Riot ID e busca seu elo oficial do Valorant diretamente da Riot Games de forma 100% automática e justa.
   - `/perfil`: visualiza o elo, MMR base e conta vinculada.

---

## 🛠️ Passo a Passo para Configurar e Rodar

### 1. Criar o Bot no Portal de Desenvolvedores do Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Clique em **"New Application"** e dê um nome ao bot (ex: `Valorant MIX Bot`).
3. Vá na aba lateral **"Bot"**:
   - Clique em **"Reset Token"** e copie o seu **Token**.
   - Na seção **Privileged Gateway Intents**, ative:
     - ✅ **Server Members Intent**
4. Vá na aba lateral **"OAuth2"** > **"URL Generator"**:
   - Em **Scopes**, marque:
     - `bot`
     - `applications.commands`
   - Em **Bot Permissions**, marque:
     - `Manage Channels`
     - `View Channels`
     - `Send Messages`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
     - `Connect`
     - `Speak`
     - `Move Members` *(Essencial para mover os jogadores entre as calls!)*
5. Copie a URL gerada no final da página, abra no navegador e adicione o bot ao seu servidor do Discord.
6. Na aba **"General Information"**, copie o **Application ID** (este é o seu `CLIENT_ID`).

---

### 2. Configurar o arquivo `.env`

Abra o arquivo `.env` na raiz da pasta do projeto e preencha:

```env
# Token do Bot copiado na aba Bot
DISCORD_TOKEN=seu_token_aqui

# Application ID copiado na aba General Information
CLIENT_ID=seu_client_id_aqui

# (Opcional, mas recomendado) ID do seu Servidor para os comandos / aparecerem na hora
GUILD_ID=seu_server_id_aqui

# (Opcional) Chave de API da HenrikDev se desejar puxar elos automáticos da Riot
HENRIKDEV_API_KEY=
```

> **Dica para pegar o ID do Servidor (GUILD_ID):** No Discord, vá em *Configurações do Usuário > Avançado > Ativar Modo Desenvolvedor*. Depois, clique com o botão direito no ícone do seu servidor e selecione *"Copiar ID do servidor"*.

---

### 3. Iniciar o Bot

No terminal (dentro da pasta do projeto):

```bash
npm start
```

---

## 📋 Lista de Comandos (/ Slash Commands)

| Comando | Descrição | Permissão |
| :--- | :--- | :--- |
| `/mix` | Inicia o lobby e a fila de 10 jogadores para o MIX | Todos |
| `/configmix` | Define os canais de voz: `call_espera`, `call_time_a` e `call_time_b` | Gerenciar Servidor |
| `/limparmix` | **Limpa todo o chat do mix** e restaura o banner oficial e o guia no topo | Gerenciar Mensagens |
| `/instrucoes` | Envia o banner oficial e o guia de instruções no canal atual | Gerenciar Mensagens |
| `/vincular nick#tag` | Vincula conta Riot e puxa elo da API automaticamente | Todos |
| `/perfil` | Consulta seu elo e conta cadastrada | Todos |
| `/finalizarmix` | Encerra a partida e puxa todos de volta para a call de espera | Moderadores / Mover Membros |

---

## 🎮 Fluxo de uma Partida

1. O organizador ou moderador usa `/configmix` uma única vez para indicar as 3 calls de voz.
2. Qualquer membro digita `/mix` no canal de texto.
3. Os jogadores clicam em **"Entrar no MIX"**.
4. Ao atingir **10/10 jogadores**, o bot:
   - Balanceia os times perfeitamente pelo elo/MMR.
   - Sorteia quem começa no Ataque e na Defesa.
   - Inicia uma votação de mapas de 45 segundos.
5. Quando o mapa é votado (ou todos votam):
   - O bot exibe o mapa vencedor com imagem em destaque.
   - Move os 5 jogadores do **Time A** para a chamada do Time A.
   - Move os 5 jogadores do **Time B** para a chamada do Time B.
6. Ao término da partida, basta clicar no botão **"Finalizar Partida & Puxar Todos"** ou usar `/finalizarmix` para reunir todos na call geral de volta!
