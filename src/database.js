const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Garante que o diretório e o arquivo existam
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  users: {},        // discordId -> { riotName, riotTag, rank, mmr, tier, updatedAt }
  guilds: {},       // guildId   -> { voiceWaitingId, voiceTeamAId, voiceTeamBId }
  mixHistory: [],   // Registro de mixes finalizados
  playerStats: {}   // discordId -> { wins, losses, kills, gamesPlayed, displayName, riotName, riotTag }
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cache = Object.assign({}, defaultData, JSON.parse(raw));
    } else {
      cache = Object.assign({}, defaultData);
      save();
    }
  } catch (err) {
    console.error('Erro ao ler banco de dados JSON:', err);
    cache = Object.assign({}, defaultData);
  }
  return cache;
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados JSON:', err);
  }
}

module.exports = {
  getUser(discordId) {
    const data = load();
    return data.users[discordId] || null;
  },

  setUser(discordId, userData) {
    const data = load();
    data.users[discordId] = {
      ...(data.users[discordId] || {}),
      ...userData,
      updatedAt: new Date().toISOString()
    };
    save();
    return data.users[discordId];
  },

  getGuildConfig(guildId) {
    const data = load();
    return data.guilds[guildId] || {
      voiceWaitingId: null,
      voiceTeamAId: null,
      voiceTeamBId: null
    };
  },

  setGuildConfig(guildId, config) {
    const data = load();
    data.guilds[guildId] = {
      ...(data.guilds[guildId] || {}),
      ...config
    };
    save();
    return data.guilds[guildId];
  },

  saveMatch(matchData) {
    const data = load();
    data.mixHistory.push({
      ...matchData,
      finishedAt: new Date().toISOString()
    });
    // Manter apenas os últimos 100 jogos para não inflar
    if (data.mixHistory.length > 100) {
      data.mixHistory.shift();
    }
    save();
  },

  // -----------------------------------------------------------
  // Stats de jogadores (kills, vitórias, partidas jogadas)
  // -----------------------------------------------------------

  getPlayerStats(discordId) {
    const data = load();
    if (!data.playerStats) data.playerStats = {};
    return data.playerStats[discordId] || null;
  },

  /**
   * Atualiza os stats de um jogador.
   * @param {string} discordId
   * @param {{ displayName, riotName, riotTag, kills, won }} update
   */
  updatePlayerStats(discordId, { displayName, riotName, riotTag, kills = 0, won = false }) {
    const data = load();
    if (!data.playerStats) data.playerStats = {};

    const current = data.playerStats[discordId] || {
      wins: 0,
      losses: 0,
      kills: 0,
      gamesPlayed: 0,
      displayName: '',
      riotName: '',
      riotTag: ''
    };

    data.playerStats[discordId] = {
      wins:        current.wins + (won ? 1 : 0),
      losses:      current.losses + (won ? 0 : 1),
      kills:       current.kills + kills,
      gamesPlayed: current.gamesPlayed + 1,
      displayName: displayName || current.displayName,
      riotName:    riotName    || current.riotName,
      riotTag:     riotTag     || current.riotTag,
      updatedAt:   new Date().toISOString()
    };

    save();
    return data.playerStats[discordId];
  },

  /**
   * Registra a participação de um jogador em uma partida imediatamente,
   * sem depender da API do Valorant (kills=0, won=false por padrão).
   * Deve ser chamado logo após o /finalizarmix para garantir que gamesPlayed
   * suba mesmo quando a API falhar.
   * @param {string} discordId
   * @param {{ displayName, riotName, riotTag }} info
   */
  registerParticipation(discordId, { displayName, riotName, riotTag }) {
    const data = load();
    if (!data.playerStats) data.playerStats = {};

    const current = data.playerStats[discordId] || {
      wins: 0,
      losses: 0,
      kills: 0,
      gamesPlayed: 0,
      displayName: '',
      riotName: '',
      riotTag: ''
    };

    data.playerStats[discordId] = {
      ...current,
      gamesPlayed: current.gamesPlayed + 1,
      displayName: displayName || current.displayName,
      riotName:    riotName    || current.riotName,
      riotTag:     riotTag     || current.riotTag,
      updatedAt:   new Date().toISOString()
    };

    save();
    return data.playerStats[discordId];
  },

  /**
   * Enriquece os stats de um jogador com kills e vitória obtidos da API.
   * Deve ser chamado após registerParticipation, quando a API responder.
   * @param {string} discordId
   * @param {{ kills, won }} update
   */
  enrichPlayerStats(discordId, { kills = 0, won = false }) {
    const data = load();
    if (!data.playerStats) data.playerStats = {};

    const current = data.playerStats[discordId];
    if (!current) return null; // segurança: só enriquece se já foi registrado

    data.playerStats[discordId] = {
      ...current,
      kills:  current.kills  + kills,
      wins:   current.wins   + (won ? 1 : 0),
      losses: current.losses + (won ? 0 : 1),
      updatedAt: new Date().toISOString()
    };

    save();
    return data.playerStats[discordId];
  },

  /**
   * Retorna o top N jogadores ordenados por vitórias (depois kills como desempate)
   */
  getLeaderboard(limit = 10) {
    const data = load();
    if (!data.playerStats) return [];

    return Object.entries(data.playerStats)
      .map(([discordId, stats]) => ({ discordId, ...stats }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
      })
      .slice(0, limit);
  }
};
