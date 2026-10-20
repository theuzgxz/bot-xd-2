const axios = require('axios');
const { RANKS, DEFAULT_RANK, DEFAULT_MMR } = require('../config');

// Mapeamento de nomes em português/inglês para o padrão
const RANK_ALIASES = {
  'sem rank': 'Unranked',
  'unranked': 'Unranked',
  'ferro 1': 'Iron 1',
  'ferro 2': 'Iron 2',
  'ferro 3': 'Iron 3',
  'iron 1': 'Iron 1',
  'iron 2': 'Iron 2',
  'iron 3': 'Iron 3',
  'bronze 1': 'Bronze 1',
  'bronze 2': 'Bronze 2',
  'bronze 3': 'Bronze 3',
  'prata 1': 'Silver 1',
  'prata 2': 'Silver 2',
  'prata 3': 'Silver 3',
  'silver 1': 'Silver 1',
  'silver 2': 'Silver 2',
  'silver 3': 'Silver 3',
  'ouro 1': 'Gold 1',
  'ouro 2': 'Gold 2',
  'ouro 3': 'Gold 3',
  'gold 1': 'Gold 1',
  'gold 2': 'Gold 2',
  'gold 3': 'Gold 3',
  'platina 1': 'Platinum 1',
  'platina 2': 'Platinum 2',
  'platina 3': 'Platinum 3',
  'platinum 1': 'Platinum 1',
  'platinum 2': 'Platinum 2',
  'platinum 3': 'Platinum 3',
  'diamante 1': 'Diamond 1',
  'diamante 2': 'Diamond 2',
  'diamante 3': 'Diamond 3',
  'diamond 1': 'Diamond 1',
  'diamond 2': 'Diamond 2',
  'diamond 3': 'Diamond 3',
  'ascendente 1': 'Ascendant 1',
  'ascendente 2': 'Ascendant 2',
  'ascendente 3': 'Ascendant 3',
  'ascendant 1': 'Ascendant 1',
  'ascendant 2': 'Ascendant 2',
  'ascendant 3': 'Ascendant 3',
  'imortal 1': 'Immortal 1',
  'imortal 2': 'Immortal 2',
  'imortal 3': 'Immortal 3',
  'immortal 1': 'Immortal 1',
  'immortal 2': 'Immortal 2',
  'immortal 3': 'Immortal 3',
  'radiante': 'Radiant',
  'radiant': 'Radiant'
};

function normalizeRank(input) {
  if (!input) return DEFAULT_RANK;
  const clean = String(input).trim().toLowerCase();
  const matched = RANK_ALIASES[clean];
  if (matched && RANKS[matched]) {
    return matched;
  }
  for (const [key, value] of Object.entries(RANKS)) {
    if (key.toLowerCase() === clean || value.name.toLowerCase() === clean) {
      return key;
    }
  }
  return DEFAULT_RANK;
}

function getRankData(rankKey) {
  const norm = normalizeRank(rankKey);
  const info = RANKS[norm] || RANKS[DEFAULT_RANK];
  return {
    key: norm,
    name: info.name,
    mmr: info.mmr,
    tier: info.tier,
    badge: info.badge
  };
}

/**
 * Consulta o rank oficial e MMR da conta do Valorant
 * Suporta as versões v1, v2 e v3 da API da HenrikDev com tratamento de autorização
 */
async function fetchRiotAccountRank(name, tag, region = 'br') {
  const apiKey = (process.env.HENRIKDEV_API_KEY || '').trim();

  if (!apiKey) {
    return {
      success: false,
      missingKey: true,
      error: 'A chave da API da HenrikDev não está configurada no arquivo .env (HENRIKDEV_API_KEY). É necessário configurá-la para consultar elos automaticamente da Riot.'
    };
  }

  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#/, '');
  const encodedName = encodeURIComponent(cleanName);
  const encodedTag = encodeURIComponent(cleanTag);
  const validRegion = region.toLowerCase();

  const headers = {
    'Authorization': apiKey,
    'User-Agent': 'ValorantMixBot/1.0'
  };

  // Tentativa 1: Endpoint v1
  try {
    const urlV1 = `https://api.henrikdev.xyz/valorant/v1/mmr/${validRegion}/${encodedName}/${encodedTag}`;
    const res = await axios.get(urlV1, { headers, timeout: 9000 });

    if (res.data && res.data.status === 200 && res.data.data) {
      const data = res.data.data;
      const currentTier = data.currenttierpatched || 'Unranked';
      const elo = data.elo;
      const rankingInTier = data.ranking_in_tier ?? 0;
      const rankInfo = getRankData(currentTier);

      // MMR preciso: elo retornado pela Riot ou cálculo pelo tier + RR
      const computedMmr = (elo && elo > 0) ? elo : (rankInfo.mmr + rankingInTier);

      return {
        success: true,
        riotName: data.name || cleanName,
        riotTag: data.tag || cleanTag,
        rankName: rankInfo.name,
        rankKey: rankInfo.key,
        mmr: computedMmr,
        rankingInTier,
        tier: rankInfo.tier,
        badge: rankInfo.badge
      };
    }
  } catch (errV1) {
    if (errV1.response && errV1.response.data && Array.isArray(errV1.response.data.errors)) {
      const errObj = errV1.response.data.errors[0];
      if (errObj && errObj.code === 24) {
        return {
          success: false,
          error: `A conta **${cleanName}#${cleanTag}** foi localizada, mas precisa ter jogado pelo menos uma partida recente para sincronizar o elo. Jogue uma partida competitiva para atualizar!`
        };
      }
    }
    if (errV1.response && errV1.response.status === 401) {
      return {
        success: false,
        invalidKey: true,
        error: 'A chave da API informada no .env (HENRIKDEV_API_KEY) é inválida ou expirou.'
      };
    }
    if (errV1.response && errV1.response.status === 404) {
      return {
        success: false,
        error: `A conta **${cleanName}#${cleanTag}** não foi encontrada na região \`${validRegion.toUpperCase()}\`. Verifique se o nome e a tag estão corretos.`
      };
    }
  }

  // Tentativa 2: Endpoint v3 de fallback
  try {
    const urlV3 = `https://api.henrikdev.xyz/valorant/v3/mmr/${validRegion}/pc/${encodedName}/${encodedTag}`;
    const resV3 = await axios.get(urlV3, { headers, timeout: 9000 });

    if (resV3.data && resV3.data.status === 200 && resV3.data.data) {
      const data = resV3.data.data;
      const current = data.current || {};
      const currentTierName = (current.tier && current.tier.name) ? current.tier.name : 'Unranked';
      const elo = current.elo;
      const rr = current.rr || 0;
      const rankInfo = getRankData(currentTierName);

      const computedMmr = (elo && elo > 0) ? elo : (rankInfo.mmr + rr);

      return {
        success: true,
        riotName: data.account?.name || cleanName,
        riotTag: data.account?.tag || cleanTag,
        rankName: rankInfo.name,
        rankKey: rankInfo.key,
        mmr: computedMmr,
        rankingInTier: rr,
        tier: rankInfo.tier,
        badge: rankInfo.badge
      };
    }
  } catch (errV3) {
    // Se falhar em ambas, monta mensagem amigável
    if (errV3.response && errV3.response.status === 404) {
      return {
        success: false,
        error: `Conta **${cleanName}#${cleanTag}** não encontrada na região \`${validRegion.toUpperCase()}\`.`
      };
    }
  }

  return {
    success: false,
    error: `Não foi possível obter dados competitivos da conta **${cleanName}#${cleanTag}**. Certifique-se de que a conta jogou partidas ranqueadas recentemente.`
  };
}

/**
 * Busca os stats da partida customizada mais recente de um jogador na API HenrikDev.
 * @param {string} name   - Riot Name
 * @param {string} tag    - Riot Tag
 * @param {string} region - Região (ex: 'br')
 * @param {number} afterTimestamp - Timestamp (ms) mínimo do início da partida
 * @returns {{ matchId, players: [{name, tag, team, kills, won}], startedAt } | null}
 */
async function fetchCustomMatchStats(name, tag, region = 'br', afterTimestamp = 0) {
  const apiKey = (process.env.HENRIKDEV_API_KEY || '').trim();
  if (!apiKey) return null;

  const cleanName = encodeURIComponent(name.trim());
  const cleanTag  = encodeURIComponent(tag.trim().replace(/^#/, ''));
  const headers   = { Authorization: apiKey, 'User-Agent': 'ValorantMixBot/1.0' };

  try {
    // Busca as últimas 10 partidas filtradas por modo "custom"
    const url = `https://api.henrikdev.xyz/valorant/v3/matches/${region.toLowerCase()}/pc/${cleanName}/${cleanTag}?mode=custom&size=5`;
    const res = await axios.get(url, { headers, timeout: 10000 });

    if (!res.data || res.data.status !== 200 || !Array.isArray(res.data.data)) return null;

    // Encontra a partida mais recente que começou depois do timestamp informado
    const afterSec = Math.floor(afterTimestamp / 1000);
    const match = res.data.data.find(m => {
      const startedAt = m?.metadata?.started_at
        ? Math.floor(new Date(m.metadata.started_at).getTime() / 1000)
        : 0;
      return startedAt >= afterSec;
    });

    if (!match) return null;

    const teams   = match.teams   || {};
    const redWon  = teams.red?.has_won  === true;
    const blueWon = teams.blue?.has_won === true;

    const allPlayers = match.players?.all_players || [];

    return {
      matchId:   match.metadata?.match_id || null,
      map:       match.metadata?.map || null,
      startedAt: match.metadata?.started_at || null,
      players: allPlayers.map(p => ({
        name:      p.name,
        tag:       p.tag,
        team:      (p.team || '').toLowerCase(), // 'red' or 'blue'
        kills:     p.stats?.kills || 0,
        deaths:    p.stats?.deaths || 0,
        assists:   p.stats?.assists || 0,
        score:     p.stats?.score || 0,
        character: p.character || null,
        won:       (p.team || '').toLowerCase() === 'red' ? redWon : blueWon
      }))
    };
  } catch (err) {
    console.error('[fetchCustomMatchStats] Erro ao buscar partida customizada:', err.message);
    return null;
  }
}

module.exports = {
  fetchRiotAccountRank,
  fetchCustomMatchStats,
  normalizeRank,
  getRankData,
  RANK_ALIASES
};
