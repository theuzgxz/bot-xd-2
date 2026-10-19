/**
 * Módulo de sorteio de times 5v5 para Valorant MIX.
 * Suporta sorteio inteligente balanceado por MMR (otimização exata das 252 combinações)
 * e sorteio 100% aleatório.
 */

function getCombinations(arr, k) {
  const result = [];

  function helper(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }

  helper(0, []);
  return result;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Sorteio com balanceamento exato por MMR
function balanceTeams(players) {
  if (players.length !== 10) {
    throw new Error('O balanceador precisa de exatamente 10 jogadores.');
  }

  const totalMmr = players.reduce((sum, p) => sum + (p.mmr || 1000), 0);
  const allCombos = getCombinations(players, 5);

  let bestDiff = Infinity;
  let candidatePairs = [];

  for (const teamA of allCombos) {
    const teamAIds = new Set(teamA.map(p => p.id));
    const teamB = players.filter(p => !teamAIds.has(p.id));

    const sumA = teamA.reduce((sum, p) => sum + (p.mmr || 1000), 0);
    const sumB = teamB.reduce((sum, p) => sum + (p.mmr || 1000), 0);
    const diff = Math.abs(sumA - sumB);

    if (diff < bestDiff) {
      bestDiff = diff;
      candidatePairs = [{ teamA, teamB, sumA, sumB, diff }];
    } else if (diff === bestDiff) {
      candidatePairs.push({ teamA, teamB, sumA, sumB, diff });
    }
  }

  const selected = candidatePairs[Math.floor(Math.random() * candidatePairs.length)];
  const isTeamAAttack = Math.random() < 0.5;

  const team1 = {
    name: 'Time A',
    side: isTeamAAttack ? 'Ataque ⚔️' : 'Defesa 🛡️',
    sideRaw: isTeamAAttack ? 'attack' : 'defense',
    players: selected.teamA.sort((a, b) => (b.mmr || 0) - (a.mmr || 0)),
    totalMmr: selected.sumA,
    avgMmr: Math.round(selected.sumA / 5)
  };

  const team2 = {
    name: 'Time B',
    side: isTeamAAttack ? 'Defesa 🛡️' : 'Ataque ⚔️',
    sideRaw: isTeamAAttack ? 'defense' : 'attack',
    players: selected.teamB.sort((a, b) => (b.mmr || 0) - (a.mmr || 0)),
    totalMmr: selected.sumB,
    avgMmr: Math.round(selected.sumB / 5)
  };

  return {
    mode: 'balanced',
    modeLabel: '⚖️ Sorteio Balanceado (por MMR)',
    team1,
    team2,
    mmrDifference: selected.diff,
    totalMmr
  };
}

// Sorteio 100% Aleatório (Sem balanceamento)
function randomTeams(players) {
  if (players.length !== 10) {
    throw new Error('O sorteio precisa de exatamente 10 jogadores.');
  }

  const shuffled = shuffle(players);
  const teamAPlayers = shuffled.slice(0, 5);
  const teamBPlayers = shuffled.slice(5, 10);

  const sumA = teamAPlayers.reduce((sum, p) => sum + (p.mmr || 1000), 0);
  const sumB = teamBPlayers.reduce((sum, p) => sum + (p.mmr || 1000), 0);
  const diff = Math.abs(sumA - sumB);

  const isTeamAAttack = Math.random() < 0.5;

  const team1 = {
    name: 'Time A',
    side: isTeamAAttack ? 'Ataque ⚔️' : 'Defesa 🛡️',
    sideRaw: isTeamAAttack ? 'attack' : 'defense',
    players: teamAPlayers.sort((a, b) => (b.mmr || 0) - (a.mmr || 0)),
    totalMmr: sumA,
    avgMmr: Math.round(sumA / 5)
  };

  const team2 = {
    name: 'Time B',
    side: isTeamAAttack ? 'Defesa 🛡️' : 'Ataque ⚔️',
    sideRaw: isTeamAAttack ? 'defense' : 'attack',
    players: teamBPlayers.sort((a, b) => (b.mmr || 0) - (a.mmr || 0)),
    totalMmr: sumB,
    avgMmr: Math.round(sumB / 5)
  };

  return {
    mode: 'random',
    modeLabel: '🎲 Sorteio Aleatório (Sem Balancear)',
    team1,
    team2,
    mmrDifference: diff,
    totalMmr: sumA + sumB
  };
}

module.exports = {
  balanceTeams,
  randomTeams
};
