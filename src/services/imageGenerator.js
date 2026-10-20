const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// Registrar fontes do sistema se disponíveis
if (fs.existsSync('C:/Windows/Fonts/segoeuib.ttf')) {
  GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'SegoeUIBold');
}
if (fs.existsSync('C:/Windows/Fonts/segoeui.ttf')) {
  GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf', 'SegoeUI');
}

// Cores dos Ranks
const RANK_COLORS = {
  'Sem Ranque': '#94A3B8',
  'Ferro': '#A1A1AA',
  'Bronze': '#CD7F32',
  'Prata': '#CBD5E1',
  'Ouro': '#FBBF24',
  'Platina': '#38BDF8',
  'Diamante': '#818CF8',
  'Ascendente': '#34D399',
  'Imortal': '#F43F5E',
  'Radiante': '#FDE047'
};

function getRankColor(rankName = '') {
  for (const [key, color] of Object.entries(RANK_COLORS)) {
    if (rankName.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return '#00E5FF';
}

function drawHazardStripes(ctx, x, y, width, height, stripeWidth = 22, color1 = '#00E5FF', color2 = '#070A10') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.fillStyle = color2;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = color1;
  const diag = width + height * 2;
  for (let offset = -height * 2; offset < diag; offset += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(offset, y + height);
    ctx.lineTo(offset + stripeWidth, y + height);
    ctx.lineTo(offset + stripeWidth + height * 1.3, y);
    ctx.lineTo(offset + height * 1.3, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renderiza a imagem oficial da sala de espera (Lobby) com 10 slots
 */
async function renderLobbyImage(players = []) {
  const width = 1000;
  const height = 660;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Fundo Gradiente Preto / Azul Escuro
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#04060A');
  bgGrad.addColorStop(0.5, '#070C16');
  bgGrad.addColorStop(1, '#030508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Linhas geométricas de fundo
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let i = -100; i < width + 200; i += 70) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 150, height);
    ctx.stroke();
  }
  ctx.restore();

  // Glow radial no topo atrás do título
  const glow = ctx.createRadialGradient(width / 2, 70, 20, width / 2, 70, 320);
  glow.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 180);

  // 2. Faixa zebrada superior (Hazard Tape - Azul Neon e Preto)
  const stripeH = 22;
  drawHazardStripes(ctx, 0, 0, width, stripeH, 20, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, stripeH, width, 2);

  // 3. Faixa zebrada inferior
  drawHazardStripes(ctx, 0, height - stripeH, width, stripeH, 20, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, height - stripeH - 2, width, 2);

  // 4. Cabeçalho
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Título: PERSONALIZADA DE VALORANT
  ctx.font = 'bold 30px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText('PERSONALIZADA DE VALORANT', width / 2, 60);
  ctx.shadowBlur = 0;

  // Subtítulo: FILA DE JOGADORES • X/10
  ctx.font = 'bold 15px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText(`FILA DE JOGADORES  •  ${players.length}/10`, width / 2, 95);

  // 5. 10 Slots de Jogadores
  const slotCount = 10;
  const slotW = 880;
  const slotH = 41;
  const gap = 8;
  const startX = (width - slotW) / 2;
  const startY = 126;
  const radius = 6;

  for (let i = 0; i < slotCount; i++) {
    const p = players[i];
    const y = startY + i * (slotH + gap);
    const isOccupied = !!p;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, y, slotW, slotH, radius);

    if (isOccupied) {
      // Card Ocupado: Fundo escuro azulado
      const cardGrad = ctx.createLinearGradient(startX, y, startX + slotW, y);
      cardGrad.addColorStop(0, '#0E1626');
      cardGrad.addColorStop(1, '#090E1A');
      ctx.fillStyle = cardGrad;
      ctx.fill();

      // Borda sutil neon
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Indicador azul neon no canto esquerdo
      ctx.beginPath();
      ctx.roundRect(startX, y, 6, slotH, [radius, 0, 0, radius]);
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Avatar circular do jogador
      const avatarSize = 28;
      const avatarX = startX + 20;
      const avatarY = y + (slotH - avatarSize) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();

      let avatarLoaded = false;
      if (p.avatarBuffer) {
        try {
          const img = await loadImage(p.avatarBuffer);
          ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
          avatarLoaded = true;
        } catch (e) {}
      }

      if (!avatarLoaded) {
        // Fallback de avatar com gradiente
        const avGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
        avGrad.addColorStop(0, '#00D2FF');
        avGrad.addColorStop(1, '#0055FF');
        ctx.fillStyle = avGrad;
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px "SegoeUIBold", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (p.displayName || p.username || 'P')[0].toUpperCase();
        ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      }
      ctx.restore();

      // Borda circular do avatar
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Textos
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Número
      ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      const numText = `${i + 1}. `;
      const numX = startX + 60;
      ctx.fillText(numText, numX, y + slotH / 2);

      const numWidth = ctx.measureText(numText).width;

      // Nome do jogador (Ex: "LOUD pali to - annajulias2")
      const primaryName = p.riotName || p.displayName || p.username;
      const secondaryName = (p.riotName && p.displayName && p.displayName.toLowerCase() !== p.riotName.toLowerCase())
        ? ` - ${p.displayName}`
        : '';

      ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(primaryName, numX + numWidth, y + slotH / 2);

      const primWidth = ctx.measureText(primaryName).width;

      if (secondaryName) {
        ctx.font = '14px "SegoeUI", "Arial", sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(secondaryName, numX + numWidth + primWidth, y + slotH / 2);
      }

      // Elo / Ranque no canto direito com cor do rank e diamante vetorial
      if (p.rankName) {
        const rankColor = getRankColor(p.rankName);
        const rankText = p.rankName.toUpperCase();
        ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
        const textWidth = ctx.measureText(rankText).width;
        const textX = startX + slotW - 18;
        const iconX = textX - textWidth - 10;
        const iconY = y + slotH / 2;

        // Desenha diamante vetorial
        ctx.save();
        ctx.fillStyle = rankColor;
        ctx.shadowColor = rankColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const dSize = 4.5;
        ctx.moveTo(iconX, iconY - dSize);
        ctx.lineTo(iconX + dSize, iconY);
        ctx.lineTo(iconX, iconY + dSize);
        ctx.lineTo(iconX - dSize, iconY);
        ctx.closePath();
        ctx.fill();

        // Texto do rank
        ctx.textAlign = 'right';
        ctx.fillText(rankText, textX, iconY);
        ctx.restore();
      }

    } else {
      // Slot Vazio (Aguardando Jogador)
      ctx.fillStyle = '#080C14';
      ctx.fill();

      ctx.strokeStyle = '#141C2B';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Círculo com "?"
      const avatarSize = 28;
      const avatarX = startX + 20;
      const avatarY = y + (slotH - avatarSize) / 2;

      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#101622';
      ctx.fill();
      ctx.strokeStyle = '#1D273B';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('?', avatarX + avatarSize / 2, avatarY + avatarSize / 2);

      // Texto "X. Aguardando jogador"
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`${i + 1}. Aguardando jogador`, startX + 60, y + slotH / 2);
    }

    ctx.restore();
  }

  // 6. Rodapé: discord.gg/xd
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('discord.gg/xd', width / 2, height - 35);

  return canvas.toBuffer('image/png');
}

/**
 * Função utilitária para garantir que cada jogador tenha seu buffer de avatar em cache
 */
async function preloadPlayerAvatar(player) {
  if (player.avatarBuffer || !player.avatarUrl) return;
  try {
    const res = await axios.get(player.avatarUrl, {
      responseType: 'arraybuffer',
      timeout: 3000
    });
    player.avatarBuffer = Buffer.from(res.data);
  } catch (err) {
    player.avatarBuffer = null;
  }
}

// Cache em memória para imagens de mapas (evita re-downloads e rate limits)
const mapImageCache = new Map();

/**
 * Obtém o objeto Image do mapa com prioridade para arquivo local em assets/maps/
 */
async function getMapImage(mapId, mapUrl) {
  if (!mapId) return null;
  const cleanId = String(mapId).toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');

  if (mapImageCache.has(cleanId)) {
    return mapImageCache.get(cleanId);
  }

  // 1. Tentar ler do diretório local assets/maps/<cleanId>.png
  const localPath = path.join(__dirname, '..', '..', 'assets', 'maps', `${cleanId}.png`);
  if (fs.existsSync(localPath)) {
    try {
      const img = await loadImage(localPath);
      mapImageCache.set(cleanId, img);
      return img;
    } catch (e) {
      console.error(`[imageGenerator] Erro ao carregar mapa local ${cleanId}:`, e.message);
    }
  }

  // 2. Fallback por download via axios se não houver localmente
  if (mapUrl) {
    try {
      const res = await axios.get(mapUrl, {
        responseType: 'arraybuffer',
        timeout: 7000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const img = await loadImage(Buffer.from(res.data));
      mapImageCache.set(cleanId, img);
      // Salva localmente para próximas vezes
      try {
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localPath, Buffer.from(res.data));
      } catch (_) {}
      return img;
    } catch (e) {
      console.error(`[imageGenerator] Erro ao baixar imagem do mapa ${cleanId}:`, e.message);
    }
  }

  return null;
}

/**
 * Renderiza a imagem de votação de mapa.
 * Exibe todos os mapas como cards com imagem oficial, votos e avatares dos votantes.
 *
 * @param {Array}  maps        - Lista de mapas (id, name, image)
 * @param {Object} votes       - { userId: mapId }
 * @param {Object} playerMap   - { userId: { displayName, avatarBuffer } }
 * @param {number} timeLeft    - Segundos restantes
 */
async function renderMapVoteImage(maps, votes, playerMap, timeLeft) {
  const COLS = 4;
  const ROWS = Math.ceil(maps.length / COLS);
  const CARD_W = 220;
  const CARD_H = 155;
  const GAP = 12;
  const TOP_PAD = 95;
  const BOT_PAD = 50;
  const SIDE_PAD = 25;

  const width = COLS * CARD_W + (COLS - 1) * GAP + SIDE_PAD * 2;
  const height = TOP_PAD + ROWS * (CARD_H + GAP) - GAP + BOT_PAD;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fundo com gradiente cibernético
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#04060A');
  bgGrad.addColorStop(0.5, '#070C16');
  bgGrad.addColorStop(1, '#030508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Linhas geométricas de fundo
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let i = -100; i < width + 200; i += 70) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 150, height);
    ctx.stroke();
  }
  ctx.restore();

  // Faixas zebradas superior e inferior
  const stripeH = 18;
  drawHazardStripes(ctx, 0, 0, width, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, stripeH, width, 2);
  drawHazardStripes(ctx, 0, height - stripeH, width, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, height - stripeH - 2, width, 2);

  // Cabeçalho / Título
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText('🗺️  VOTAÇÃO DE MAPA  —  VALORANT MIX', width / 2, 40);
  ctx.shadowBlur = 0;

  const totalVoted = Object.keys(votes).length;
  ctx.font = 'bold 14px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText(`⏳ ${timeLeft}s restantes   •   📊 ${totalVoted}/10 votos computados`, width / 2, 70);

  // Contagem de votos por mapa
  const countMap = {};
  maps.forEach(m => { countMap[m.id] = []; });
  Object.entries(votes).forEach(([uid, mid]) => {
    if (countMap[mid]) countMap[mid].push(uid);
  });

  const maxVotes = Math.max(1, ...maps.map(m => (countMap[m.id] || []).length));

  for (let idx = 0; idx < maps.length; idx++) {
    const m = maps[idx];
    const row = Math.floor(idx / COLS);
    const colInRow = idx % COLS;

    // Se for a última linha e tiver menos mapas que COLS, centraliza
    const isLastRow = row === ROWS - 1;
    const remainder = maps.length % COLS;
    const mapsInThisRow = (isLastRow && remainder !== 0) ? remainder : COLS;
    const rowWidth = mapsInThisRow * CARD_W + (mapsInThisRow - 1) * GAP;
    const rowStartX = (width - rowWidth) / 2;

    const x = rowStartX + colInRow * (CARD_W + GAP);
    const y = TOP_PAD + row * (CARD_H + GAP);

    const voters = countMap[m.id] || [];
    const voteCount = voters.length;
    const isWinning = voteCount === maxVotes && voteCount > 0;

    // Carregar imagem do mapa (local ou remota via cache)
    const mapImg = await getMapImage(m.id, m.image);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.clip();

    // 1. Imagem do mapa
    if (mapImg) {
      ctx.drawImage(mapImg, x, y, CARD_W, CARD_H);
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x, y, CARD_W, CARD_H);
    }

    // 2. Overlay escurecido degradê para garantir máxima leitura dos textos
    const overlay = ctx.createLinearGradient(x, y, x, y + CARD_H);
    overlay.addColorStop(0, 'rgba(0, 0, 0, 0.20)');
    overlay.addColorStop(0.45, 'rgba(4, 6, 12, 0.50)');
    overlay.addColorStop(1, 'rgba(4, 6, 12, 0.95)');
    ctx.fillStyle = overlay;
    ctx.fillRect(x, y, CARD_W, CARD_H);

    ctx.restore();

    // 3. Moldura com borda neon se líder de votos
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.strokeStyle = isWinning ? '#00E5FF' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = isWinning ? 2.5 : 1;
    if (isWinning) {
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    // 4. Nome do mapa
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 5;
    ctx.fillText(m.name.toUpperCase(), x + CARD_W / 2, y + CARD_H - 52);
    ctx.restore();

    // 5. Barra de progresso dos votos
    const barY = y + CARD_H - 44;
    const barW = CARD_W - 20;
    const barH = 6;
    const barX = x + 10;
    const fillW = voteCount > 0 ? (voteCount / maxVotes) * barW : 0;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    if (fillW > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      if (isWinning) {
        barGrad.addColorStop(0, '#00D2FF');
        barGrad.addColorStop(1, '#00FFF0');
      } else {
        barGrad.addColorStop(0, '#0066CC');
        barGrad.addColorStop(1, '#00A8FF');
      }
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 3);
      ctx.fillStyle = barGrad;
      ctx.fill();
    }
    ctx.restore();

    // 6. Texto de contagem de votos
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = isWinning ? '#00E5FF' : '#94A3B8';
    ctx.fillText(`${voteCount} voto${voteCount !== 1 ? 's' : ''}`, x + CARD_W / 2, y + CARD_H - 26);
    ctx.restore();

    // 7. Avatares dos votantes
    const AVT = 20;
    const AVT_GAP = 4;
    const maxShow = Math.min(voters.length, 5);
    const rowW = maxShow * AVT + (maxShow - 1) * AVT_GAP;
    let avX = x + (CARD_W - rowW) / 2;
    const avY = y + CARD_H - 14;

    for (let vi = 0; vi < maxShow; vi++) {
      const uid = voters[vi];
      const pData = playerMap[uid];
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + AVT / 2, avY, AVT / 2, 0, Math.PI * 2);
      ctx.clip();

      let drawn = false;
      if (pData && pData.avatarBuffer) {
        try {
          const img = await loadImage(pData.avatarBuffer);
          ctx.drawImage(img, avX, avY - AVT / 2, AVT, AVT);
          drawn = true;
        } catch (e) {}
      }
      if (!drawn) {
        ctx.fillStyle = '#1D4ED8';
        ctx.fillRect(avX, avY - AVT / 2, AVT, AVT);
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initials = pData ? (pData.displayName || 'P')[0].toUpperCase() : '?';
        ctx.fillText(initials, avX + AVT / 2, avY);
      }
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + AVT / 2, avY, AVT / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      avX += AVT + AVT_GAP;
    }
  }

  // Rodapé
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('discord.gg/xd', width / 2, height - 28);

  return canvas.toBuffer('image/png');
}

/**
 * Renderiza a imagem final da partida:
 * TIME B na ESQUERDA, IMAGEM DO MAPA NO CENTRO, TIME A na DIREITA.
 *
 * @param {Object} team1      - Time A { name, side, avgMmr, players: [...] }
 * @param {Object} team2      - Time B { name, side, avgMmr, players: [...] }
 * @param {Object} winningMap - Mapa { id, name, image }
 */
async function renderTeamsImage(team1, team2, winningMap) {
  const W = 1260;
  const H = 660;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Carregar imagem do mapa vencedor
  const mapImg = await getMapImage(winningMap.id, winningMap.image);

  // 1. Fundo com a foto do mapa com blur e overlay cinematográfico escuro
  if (mapImg) {
    ctx.save();
    ctx.drawImage(mapImg, 0, 0, W, H);
    // Overlay gradiente escuro profissional
    const bgOverlay = ctx.createLinearGradient(0, 0, 0, H);
    bgOverlay.addColorStop(0, 'rgba(4, 7, 14, 0.82)');
    bgOverlay.addColorStop(0.5, 'rgba(6, 10, 20, 0.88)');
    bgOverlay.addColorStop(1, 'rgba(3, 5, 10, 0.94)');
    ctx.fillStyle = bgOverlay;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#04060A');
    bg.addColorStop(0.5, '#070C18');
    bg.addColorStop(1, '#030508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // Linhas cibernéticas de fundo sutis
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -100; i < W + 200; i += 80) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 180, H);
    ctx.stroke();
  }
  ctx.restore();

  // Faixas zebradas superior e inferior
  const stripeH = 18;
  drawHazardStripes(ctx, 0, 0, W, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, stripeH, W, 2);
  drawHazardStripes(ctx, 0, H - stripeH, W, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, H - stripeH - 2, W, 2);

  // Cabeçalho Central
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
  ctx.shadowBlur = 12;
  ctx.fillText('⚔️  VALORANT MIX  —  PARTIDA INICIADA', W / 2, 44);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 13px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('MODO COMPETITIVO (5v5)  •  EQUILIBRADO POR MMR', W / 2, 70);
  ctx.restore();

  // Dimensões do layout das 3 colunas:
  // Esquerda: Time B (415px) | Centro: Mapa (380px) | Direita: Time A (415px)
  const padSide = 25;
  const colY = 96;
  const teamColW = 410;
  const mapColW = 360;

  const leftTeamX = padSide;                                     // 25..435
  const centerMapX = (W - mapColW) / 2;                          // 450..810
  const rightTeamX = W - padSide - teamColW;                     // 825..1235

  // Helper para desenhar a coluna de um time
  async function drawTeamColumn(team, startX, colW, isTeamA) {
    const teamColor = isTeamA ? '#00E5FF' : '#FF6B00';
    const accentGradStart = isTeamA ? 'rgba(0, 160, 255, 0.40)' : 'rgba(255, 80, 0, 0.40)';
    const accentGradEnd = isTeamA ? 'rgba(0, 60, 140, 0.15)' : 'rgba(160, 40, 0, 0.15)';
    const teamTitle = isTeamA ? '🔵 TIME A' : '🟠 TIME B';

    // 1. Cabeçalho do Time
    const headerH = 54;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, colY, colW, headerH, 8);
    const hGrad = ctx.createLinearGradient(startX, colY, startX + colW, colY);
    hGrad.addColorStop(0, accentGradStart);
    hGrad.addColorStop(1, accentGradEnd);
    ctx.fillStyle = hGrad;
    ctx.fill();

    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Título do Time
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = teamColor;
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 10;
    ctx.fillText(teamTitle, startX + colW / 2, colY + 18);
    ctx.shadowBlur = 0;

    // Subtítulo do Time (Lado + MMR Médio)
    const sideClean = (team.side || '').replace(/[⚔️🛡️]/g, '').trim().toUpperCase();
    ctx.font = 'bold 11px "SegoeUI", "Arial", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`${sideClean || 'COMPETITIVO'}  •  MMR MÉDIO: ${team.avgMmr || 1000}`, startX + colW / 2, colY + 38);
    ctx.restore();

    // 2. Lista de Jogadores (5 cards)
    const playerStartY = colY + headerH + 10;
    const playerCardH = 74;
    const cardGap = 8;

    for (let i = 0; i < team.players.length; i++) {
      const p = team.players[i];
      const cardY = playerStartY + i * (playerCardH + cardGap);

      // Card de fundo
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(startX, cardY, colW, playerCardH, 6);
      const cGrad = ctx.createLinearGradient(startX, cardY, startX + colW, cardY);
      cGrad.addColorStop(0, 'rgba(15, 23, 42, 0.75)');
      cGrad.addColorStop(1, 'rgba(8, 12, 22, 0.75)');
      ctx.fillStyle = cGrad;
      ctx.fill();

      // Borda do card
      ctx.strokeStyle = isTeamA ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 107, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Marcador colorido lateral esquerdo
      ctx.beginPath();
      ctx.roundRect(startX, cardY, 4, playerCardH, [6, 0, 0, 6]);
      ctx.fillStyle = teamColor;
      ctx.fill();

      // Avatar circular
      const AVT = 48;
      const avX = startX + 14;
      const avY = cardY + (playerCardH - AVT) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + AVT / 2, avY + AVT / 2, AVT / 2, 0, Math.PI * 2);
      ctx.clip();

      let drawn = false;
      if (p.avatarBuffer) {
        try {
          const img = await loadImage(p.avatarBuffer);
          ctx.drawImage(img, avX, avY, AVT, AVT);
          drawn = true;
        } catch (e) {}
      }
      if (!drawn) {
        const ag = ctx.createLinearGradient(avX, avY, avX + AVT, avY + AVT);
        ag.addColorStop(0, isTeamA ? '#0284C7' : '#C2410C');
        ag.addColorStop(1, isTeamA ? '#0369A1' : '#9A3412');
        ctx.fillStyle = ag;
        ctx.fillRect(avX, avY, AVT, AVT);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((p.displayName || 'P')[0].toUpperCase(), avX + AVT / 2, avY + AVT / 2);
      }
      ctx.restore();

      // Borda do Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + AVT / 2, avY + AVT / 2, AVT / 2, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Textos do Jogador
      const textX = avX + AVT + 12;
      const maxTextW = colW - (AVT + 30);

      // Nome do Jogador
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;

      let name = p.riotName || p.displayName || p.username || 'Jogador';
      while (ctx.measureText(name).width > maxTextW && name.length > 3) {
        name = name.slice(0, -1);
      }
      if (name !== (p.riotName || p.displayName || p.username || 'Jogador')) name += '…';
      ctx.fillText(name, textX, cardY + 30);

      // Elo / Ranque
      const rankColor = getRankColor(p.rankName || '');
      ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = rankColor;
      ctx.shadowBlur = 0;
      const rankText = `${p.badge || '⭐'} ${(p.rankName || 'Sem Ranque').toUpperCase()}`;
      ctx.fillText(rankText, textX, cardY + 52);
      ctx.restore();

      ctx.restore();
    }
  }

  // 2. Coluna Esquerda: TIME B
  await drawTeamColumn(team2, leftTeamX, teamColW, false);

  // 3. Coluna Direita: TIME A
  await drawTeamColumn(team1, rightTeamX, teamColW, true);

  // 4. Coluna Central: MAPA VENCEDOR EM DESTAQUE
  const mapCardH = 500;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(centerMapX, colY, mapColW, mapCardH, 10);
  const mapCardGrad = ctx.createLinearGradient(centerMapX, colY, centerMapX, colY + mapCardH);
  mapCardGrad.addColorStop(0, 'rgba(8, 14, 26, 0.88)');
  mapCardGrad.addColorStop(0.5, 'rgba(6, 10, 20, 0.92)');
  mapCardGrad.addColorStop(1, 'rgba(4, 7, 14, 0.96)');
  ctx.fillStyle = mapCardGrad;
  ctx.fill();

  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tag Superior do Card do Mapa
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText('📍 MAPA ESCOLHIDO', centerMapX + mapColW / 2, colY + 24);
  ctx.shadowBlur = 0;

  // Imagem do Mapa Vencedor
  const mapImgPad = 14;
  const mapImgX = centerMapX + mapImgPad;
  const mapImgY = colY + 44;
  const mapImgW = mapColW - mapImgPad * 2;
  const mapImgH = 205;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapImgX, mapImgY, mapImgW, mapImgH, 8);
  ctx.clip();

  if (mapImg) {
    ctx.drawImage(mapImg, mapImgX, mapImgY, mapImgW, mapImgH);
  } else {
    ctx.fillStyle = '#0B1322';
    ctx.fillRect(mapImgX, mapImgY, mapImgW, mapImgH);
  }

  // Gradiente sutil sobre a foto do mapa
  const photoOverlay = ctx.createLinearGradient(mapImgX, mapImgY, mapImgX, mapImgY + mapImgH);
  photoOverlay.addColorStop(0, 'rgba(0, 0, 0, 0.10)');
  photoOverlay.addColorStop(0.7, 'rgba(0, 0, 0, 0.30)');
  photoOverlay.addColorStop(1, 'rgba(4, 7, 14, 0.85)');
  ctx.fillStyle = photoOverlay;
  ctx.fillRect(mapImgX, mapImgY, mapImgW, mapImgH);
  ctx.restore();

  // Borda da foto do mapa
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapImgX, mapImgY, mapImgW, mapImgH, 8);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Nome do Mapa Vencedor
  const mapNameText = (winningMap.name || 'VALORANT').toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
  ctx.shadowBlur = 14;
  ctx.fillText(mapNameText, centerMapX + mapColW / 2, colY + 280);
  ctx.shadowBlur = 0;

  // Linha separadora abaixo do nome
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerMapX + 40, colY + 305);
  ctx.lineTo(centerMapX + mapColW - 40, colY + 305);
  ctx.stroke();

  // Emblema "VS" Estilizado Neon
  ctx.font = 'bold 50px "SegoeUIBold", "Arial", sans-serif';
  const vsGrad = ctx.createLinearGradient(centerMapX + mapColW / 2 - 30, 0, centerMapX + mapColW / 2 + 30, 0);
  vsGrad.addColorStop(0, '#FF7700');
  vsGrad.addColorStop(0.5, '#FFFFFF');
  vsGrad.addColorStop(1, '#00E5FF');
  ctx.fillStyle = vsGrad;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('VS', centerMapX + mapColW / 2, colY + 365);
  ctx.shadowBlur = 0;

  // Caixa de Informações da Partida
  const infoY = colY + 418;
  const infoH = 62;
  const infoW = mapColW - 28;
  const infoX = centerMapX + 14;

  ctx.beginPath();
  ctx.roundRect(infoX, infoY, infoW, infoH, 6);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText('⚔️ 5v5 COMPETITIVO • MMR BALANCED', centerMapX + mapColW / 2, infoY + 20);

  ctx.font = '11px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Partida oficial gravada no histórico do MIX', centerMapX + mapColW / 2, infoY + 42);

  ctx.restore();

  // Rodapé Oficial
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('discord.gg/xd  •  Bom jogo a todos os competidores!', W / 2, H - 28);

  return canvas.toBuffer('image/png');
}

/**
 * Desenha uma mini coroa dourada estilizada em cima da bolinha do perfil
 */
function drawCrown(ctx, x, y, width, height) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, '#FFF3A8');
  grad.addColorStop(0.3, '#FFD700');
  grad.addColorStop(0.7, '#E5A100');
  grad.addColorStop(1, '#996500');

  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
  ctx.shadowBlur = 12;

  // Base e 5 pontas da coroa
  ctx.beginPath();
  const left = x - width / 2;
  const right = x + width / 2;
  const bottom = y + height;

  ctx.moveTo(left, bottom);
  ctx.lineTo(left, y + height * 0.2);
  ctx.lineTo(left + width * 0.22, y + height * 0.55);
  ctx.lineTo(left + width * 0.35, y + height * 0.1);
  ctx.lineTo(x, y + height * 0.5);
  ctx.lineTo(x, y); // ponta central mais alta
  ctx.lineTo(x, y + height * 0.5);
  ctx.lineTo(right - width * 0.35, y + height * 0.1);
  ctx.lineTo(right - width * 0.22, y + height * 0.55);
  ctx.lineTo(right, y + height * 0.2);
  ctx.lineTo(right, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Esferas no topo das pontas
  const tips = [
    { px: left, py: y + height * 0.2, r: 3 },
    { px: left + width * 0.35, py: y + height * 0.1, r: 3.5 },
    { px: x, py: y, r: 4.5 },
    { px: right - width * 0.35, py: y + height * 0.1, r: 3.5 },
    { px: right, py: y + height * 0.2, r: 3 }
  ];

  ctx.fillStyle = '#FFFFFF';
  for (const tip of tips) {
    ctx.beginPath();
    ctx.arc(tip.px, tip.py, tip.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rubi central
  ctx.beginPath();
  ctx.arc(x, bottom - height * 0.3, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FF1744';
  ctx.shadowColor = '#FF1744';
  ctx.shadowBlur = 6;
  ctx.fill();

  ctx.restore();
}

/**
 * Renderiza a imagem oficial de MVP da Partida Personalizada
 * Exibe o avatar do Discord com a mini coroa em cima da bolinha,
 * nicks do Discord e do jogo, KDA da partida e kills em destaque.
 */
async function renderMvpImage(data) {
  const W = 960;
  const H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fundo escuro com gradiente
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#06080F');
  bgGrad.addColorStop(0.5, '#0B1220');
  bgGrad.addColorStop(1, '#05070C');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Linhas cibernéticas sutis
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
  ctx.lineWidth = 1;
  for (let i = -100; i < W + 200; i += 70) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 140, H);
    ctx.stroke();
  }
  ctx.restore();

  // Glow dourado no topo
  const glow = ctx.createRadialGradient(W / 2, 70, 20, W / 2, 70, 360);
  glow.addColorStop(0, 'rgba(255, 215, 0, 0.14)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 220);

  // Faixa zebrada superior dourada
  const stripeH = 18;
  const diag = W + stripeH * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, stripeH);
  ctx.clip();
  ctx.fillStyle = '#070A10';
  ctx.fillRect(0, 0, W, stripeH);
  ctx.fillStyle = '#FFD700';
  for (let offset = -stripeH * 2; offset < diag; offset += 36) {
    ctx.beginPath();
    ctx.moveTo(offset, stripeH);
    ctx.lineTo(offset + 18, stripeH);
    ctx.lineTo(offset + 18 + stripeH * 1.3, 0);
    ctx.lineTo(offset + stripeH * 1.3, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, stripeH, W, 2);

  // Faixa zebrada inferior
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, H - stripeH, W, stripeH);
  ctx.clip();
  ctx.fillStyle = '#070A10';
  ctx.fillRect(0, H - stripeH, W, stripeH);
  ctx.fillStyle = '#FFD700';
  for (let offset = -stripeH * 2; offset < diag; offset += 36) {
    ctx.beginPath();
    ctx.moveTo(offset, H);
    ctx.lineTo(offset + 18, H);
    ctx.lineTo(offset + 18 + stripeH * 1.3, H - stripeH);
    ctx.lineTo(offset + stripeH * 1.3, H - stripeH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, H - stripeH - 2, W, 2);

  // Cabeçalho
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Título: MVP DA PARTIDA
  ctx.font = 'bold 30px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
  ctx.shadowBlur = 14;
  ctx.fillText('👑  MVP DA PARTIDA  —  VALORANT MIX', W / 2, 48);
  ctx.shadowBlur = 0;

  // Subtítulo
  ctx.font = 'bold 13px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#FFD700';
  const mapLabel = data.mapName ? data.mapName.toUpperCase() : 'PERSONALIZADA';
  ctx.fillText(`DESTAQUE ABSOLUTO DA DISPUTA  •  MAPA: ${mapLabel}`, W / 2, 78);

  // Card Principal do MVP
  const cardX = 40;
  const cardY = 104;
  const cardW = W - 80;
  const cardH = 390;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 12);
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
  cardGrad.addColorStop(0.5, 'rgba(10, 16, 30, 0.90)');
  cardGrad.addColorStop(1, 'rgba(6, 10, 18, 0.95)');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // 1. Painel Esquerdo: Avatar do Jogador com a Mini Coroa
  const avSize = 130;
  const avX = cardX + 50;
  const avY = cardY + 55;

  // Avatar circular
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.clip();

  if (data.avatarBuffer) {
    try {
      const img = await loadImage(data.avatarBuffer);
      ctx.drawImage(img, avX, avY, avSize, avSize);
    } catch (_) {}
  } else {
    const ag = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
    ag.addColorStop(0, '#FFD700');
    ag.addColorStop(1, '#FF8C00');
    ctx.fillStyle = ag;
    ctx.fillRect(avX, avY, avSize, avSize);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((data.discordName || 'M')[0].toUpperCase(), avX + avSize / 2, avY + avSize / 2);
  }
  ctx.restore();

  // Borda dupla luminosa do Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  // A MINI COROA EM CIMA DA BOLINHA DO PERFIL!
  drawCrown(ctx, avX + avSize / 2, avY - 24, 46, 30);

  // Informações de Nome do Jogador (Abaixo do Avatar)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Nick do Discord
  ctx.font = 'bold 20px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(data.discordName || 'Jogador', avX + avSize / 2, avY + avSize + 30);

  // Nick da Riot (Jogo)
  ctx.font = 'bold 14px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  const riotText = data.riotName ? `${data.riotName}#${data.riotTag || 'BR1'}` : 'Conta Riot Vinculada';
  ctx.fillText(`🎮 ${riotText}`, avX + avSize / 2, avY + avSize + 56);

  // Elo / Ranque
  ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FBBF24';
  const rankText = `${data.badge || '⭐'} ${(data.rankName || 'Radiante').toUpperCase()}`;
  ctx.fillText(rankText, avX + avSize / 2, avY + avSize + 80);
  ctx.restore();

  // Linha divisória vertical
  const sepX = cardX + 270;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(sepX, cardY + 25);
  ctx.lineTo(sepX, cardY + cardH - 25);
  ctx.stroke();
  ctx.restore();

  // 2. Painel Direito: Estatísticas da Partida Personalizada
  const statsX = sepX + 40;
  const statsW = cardW - 330;

  // Badge "PERFORMANCE INDIVIDUAL"
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('⚡ ESTATÍSTICAS DA PARTIDA PERSONALIZADA', statsX, cardY + 45);

  // Box 1: KILLS EM DESTAQUE (Grande e Impactante)
  const killBoxY = cardY + 70;
  const killBoxW = (statsW - 20) / 2;
  const killBoxH = 110;

  ctx.beginPath();
  ctx.roundRect(statsX, killBoxY, killBoxW, killBoxH, 8);
  const killGrad = ctx.createLinearGradient(statsX, killBoxY, statsX, killBoxY + killBoxH);
  killGrad.addColorStop(0, 'rgba(255, 70, 85, 0.35)');
  killGrad.addColorStop(1, 'rgba(180, 20, 40, 0.15)');
  ctx.fillStyle = killGrad;
  ctx.fill();
  ctx.strokeStyle = '#FF4655';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FF4655';
  ctx.fillText('ABATES NA PARTIDA', statsX + killBoxW / 2, killBoxY + 28);

  ctx.font = 'bold 44px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FF4655';
  ctx.shadowBlur = 12;
  ctx.fillText(`${data.kills || 0}`, statsX + killBoxW / 2, killBoxY + 72);
  ctx.shadowBlur = 0;

  // Box 2: KDA COMPLETO
  const kdaBoxX = statsX + killBoxW + 20;
  ctx.beginPath();
  ctx.roundRect(kdaBoxX, killBoxY, killBoxW, killBoxH, 8);
  const kdaGrad = ctx.createLinearGradient(kdaBoxX, killBoxY, kdaBoxX, killBoxY + killBoxH);
  kdaGrad.addColorStop(0, 'rgba(0, 229, 255, 0.30)');
  kdaGrad.addColorStop(1, 'rgba(0, 100, 200, 0.12)');
  ctx.fillStyle = kdaGrad;
  ctx.fill();
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('K / D / A', kdaBoxX + killBoxW / 2, killBoxY + 28);

  ctx.font = 'bold 36px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 10;
  const kdaString = `${data.kills || 0} / ${data.deaths || 0} / ${data.assists || 0}`;
  ctx.fillText(kdaString, kdaBoxX + killBoxW / 2, killBoxY + 72);
  ctx.shadowBlur = 0;

  // Linhas de Detalhes Adicionais
  const detailsY = killBoxY + killBoxH + 25;

  // Combat Score
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`🎯 Pontuação de Combate (Score):`, statsX, detailsY);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${data.score || 0} pts`, statsX + 270, detailsY);

  // K/D Ratio
  const kd = ((data.kills || 0) / Math.max(1, data.deaths || 1)).toFixed(2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`📈 K/D Ratio:`, statsX, detailsY + 32);
  ctx.fillStyle = '#00FFA3';
  ctx.fillText(`${kd}`, statsX + 270, detailsY + 32);

  // Resultado do time
  const outcomeText = data.won ? '🏆 VITÓRIA DO TIME' : '⚔️ DISPUTA ACIRRADA';
  const outcomeColor = data.won ? '#00FFA3' : '#FF9900';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`🚩 Resultado:`, statsX, detailsY + 64);
  ctx.fillStyle = outcomeColor;
  ctx.fillText(outcomeText, statsX + 270, detailsY + 64);

  // Agente
  if (data.character) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`👤 Agente:`, statsX, detailsY + 96);
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`${data.character.toUpperCase()}`, statsX + 270, detailsY + 96);
  }

  ctx.restore();

  // Rodapé Oficial
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('discord.gg/xd  •  Partida Oficial do MIX  •  Parabéns ao MVP!', W / 2, H - 28);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderLobbyImage,
  renderMapVoteImage,
  renderTeamsImage,
  renderMvpImage,
  preloadPlayerAvatar,
  getMapImage
};

