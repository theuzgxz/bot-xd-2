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

/**
 * Renderiza a imagem de votação de mapa.
 * Exibe todos os mapas como cards, com contagem de votos e avatares dos votantes.
 *
 * @param {Array}  maps        - Lista de mapas (id, name, image)
 * @param {Object} votes       - { userId: mapId }
 * @param {Object} playerMap   - { userId: { displayName, avatarBuffer } }
 * @param {number} timeLeft    - Segundos restantes
 */
async function renderMapVoteImage(maps, votes, playerMap, timeLeft) {
  const COLS = 5;
  const ROWS = Math.ceil(maps.length / COLS);
  const CARD_W = 200;
  const CARD_H = 155;
  const GAP = 10;
  const TOP_PAD = 90;
  const BOT_PAD = 50;
  const SIDE_PAD = 30;

  const width = COLS * CARD_W + (COLS - 1) * GAP + SIDE_PAD * 2;
  const height = TOP_PAD + ROWS * (CARD_H + GAP) - GAP + BOT_PAD;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fundo
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#04060A');
  bgGrad.addColorStop(1, '#070C16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Linhas geométricas de fundo
  ctx.save();
  ctx.strokeStyle = 'rgba(0,229,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = -100; i < width + 200; i += 70) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 150, height);
    ctx.stroke();
  }
  ctx.restore();

  // Faixas zebradas
  const stripeH = 18;
  drawHazardStripes(ctx, 0, 0, width, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, stripeH, width, 2);
  drawHazardStripes(ctx, 0, height - stripeH, width, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, height - stripeH - 2, width, 2);

  // Título
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,229,255,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText('🗺️  VOTAÇÃO DE MAPA  —  VALORANT MIX', width / 2, 38);
  ctx.shadowBlur = 0;

  const totalVoted = Object.keys(votes).length;
  ctx.font = 'bold 14px "SegoeUI", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText(`⏳ ${timeLeft}s restantes   •   📊 ${totalVoted}/10 votos`, width / 2, 68);

  // Pré-carregar imagens dos mapas
  const mapImages = {};
  await Promise.all(maps.map(async m => {
    try {
      const res = await require('axios').get(m.image, { responseType: 'arraybuffer', timeout: 5000 });
      mapImages[m.id] = await loadImage(Buffer.from(res.data));
    } catch (e) { mapImages[m.id] = null; }
  }));

  // Contagem de votos por mapa
  const countMap = {};
  maps.forEach(m => { countMap[m.id] = []; });
  Object.entries(votes).forEach(([uid, mid]) => {
    if (countMap[mid]) countMap[mid].push(uid);
  });

  const maxVotes = Math.max(1, ...maps.map(m => countMap[m.id].length));

  for (let idx = 0; idx < maps.length; idx++) {
    const m = maps[idx];
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = SIDE_PAD + col * (CARD_W + GAP);
    const y = TOP_PAD + row * (CARD_H + GAP);
    const voters = countMap[m.id];
    const voteCount = voters.length;
    const isWinning = voteCount === maxVotes && voteCount > 0;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.clip();

    // Imagem do mapa como fundo
    if (mapImages[m.id]) {
      ctx.drawImage(mapImages[m.id], x, y, CARD_W, CARD_H);
    } else {
      ctx.fillStyle = '#0A0F1A';
      ctx.fillRect(x, y, CARD_W, CARD_H);
    }

    // Overlay escuro gradiente de baixo
    const overlay = ctx.createLinearGradient(x, y, x, y + CARD_H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.15)');
    overlay.addColorStop(0.4, 'rgba(4,6,10,0.45)');
    overlay.addColorStop(1, 'rgba(4,6,10,0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(x, y, CARD_W, CARD_H);

    ctx.restore();

    // Borda: neon se líder, sutil se não
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.strokeStyle = isWinning ? '#00E5FF' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = isWinning ? 2.5 : 1;
    if (isWinning) {
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    // Nome do mapa
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 15px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(m.name.toUpperCase(), x + CARD_W / 2, y + CARD_H - 52);
    ctx.restore();

    // Barra de votos
    const barY = y + CARD_H - 44;
    const barW = CARD_W - 20;
    const barH = 7;
    const barX = x + 10;
    const fillW = voteCount > 0 ? (voteCount / maxVotes) * barW : 0;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
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

    // Contagem de votos
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = isWinning ? '#00E5FF' : '#94A3B8';
    ctx.fillText(`${voteCount} voto${voteCount !== 1 ? 's' : ''}`, x + CARD_W / 2, y + CARD_H - 26);
    ctx.restore();

    // Avatares dos votantes
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

      // Borda do avatar
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
  ctx.fillText('discord.gg/xd', width / 2, height - 30);

  return canvas.toBuffer('image/png');
}

/**
 * Renderiza a imagem final dos times com o mapa de fundo.
 *
 * @param {Object} team1      - { name, side, players: [{ displayName, rankName, mmr, badge, avatarBuffer }] }
 * @param {Object} team2      - { name, side, players: [...] }
 * @param {Object} winningMap - { name, image }
 */
async function renderTeamsImage(team1, team2, winningMap) {
  const W = 1000;
  const H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // --- Fundo: imagem do mapa ---
  let mapImgLoaded = false;
  try {
    const res = await require('axios').get(winningMap.image, { responseType: 'arraybuffer', timeout: 6000 });
    const mapImg = await loadImage(Buffer.from(res.data));
    ctx.drawImage(mapImg, 0, 0, W, H);
    mapImgLoaded = true;
  } catch (e) {}

  if (!mapImgLoaded) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#04060A');
    bg.addColorStop(1, '#0A1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // Overlay escuro sobre o mapa
  const overlayGrad = ctx.createLinearGradient(0, 0, W, 0);
  overlayGrad.addColorStop(0, 'rgba(0,40,120,0.82)');
  overlayGrad.addColorStop(0.45, 'rgba(4,6,12,0.70)');
  overlayGrad.addColorStop(0.55, 'rgba(4,6,12,0.70)');
  overlayGrad.addColorStop(1, 'rgba(120,40,0,0.82)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H);

  // Faixas zebradas topo e base
  const stripeH = 18;
  drawHazardStripes(ctx, 0, 0, W, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, stripeH, W, 2);
  drawHazardStripes(ctx, 0, H - stripeH, W, stripeH, 18, '#00E5FF', '#070A10');
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(0, H - stripeH - 2, W, 2);

  // Linha divisória vertical central
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(W / 2, stripeH + 4);
  ctx.lineTo(W / 2, H - stripeH - 4);
  ctx.stroke();
  ctx.restore();

  // Título central
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,229,255,0.8)';
  ctx.shadowBlur = 14;
  ctx.fillText(`⚔️  PARTIDA INICIADA  —  ${winningMap.name.toUpperCase()}`, W / 2, 50);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtítulo VS
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('VS', W / 2, H / 2 + 10);
  ctx.restore();

  // Helper para renderizar cada time
  async function drawTeam(team, side) {
    const isLeft = side === 'left';
    const teamColor = isLeft ? '#1E90FF' : '#FF6B00';
    const panelX = isLeft ? 30 : W / 2 + 14;
    const panelW = W / 2 - 44;

    // Cabeçalho do time
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "SegoeUIBold", "Arial", sans-serif';
    ctx.fillStyle = teamColor;
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 12;
    ctx.fillText(team.name.toUpperCase(), panelX + panelW / 2, 88);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px "SegoeUI", "Arial", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(team.side.replace(/[⚔️🛡️]/g, '').trim(), panelX + panelW / 2, 110);
    ctx.restore();

    // Linha separadora sob o cabeçalho
    ctx.save();
    const lineGrad = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.3, teamColor);
    lineGrad.addColorStop(0.7, teamColor);
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(panelX, 122);
    ctx.lineTo(panelX + panelW, 122);
    ctx.stroke();
    ctx.restore();

    // Jogadores
    const playerStartY = 138;
    const rowH = 68;

    for (let i = 0; i < team.players.length; i++) {
      const p = team.players[i];
      const rowY = playerStartY + i * rowH;

      // Card de fundo do jogador
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(panelX, rowY, panelW, rowH - 6, 6);
      const cardGrad = ctx.createLinearGradient(panelX, rowY, panelX + panelW, rowY);
      if (isLeft) {
        cardGrad.addColorStop(0, 'rgba(30,70,160,0.55)');
        cardGrad.addColorStop(1, 'rgba(5,15,40,0.55)');
      } else {
        cardGrad.addColorStop(0, 'rgba(5,15,40,0.55)');
        cardGrad.addColorStop(1, 'rgba(140,50,0,0.55)');
      }
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.strokeStyle = `${teamColor}44`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Avatar
      const AVT = 44;
      const avX = panelX + 10;
      const avY = rowY + (rowH - 6 - AVT) / 2;

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
        ag.addColorStop(0, isLeft ? '#1E3A8A' : '#7C2D12');
        ag.addColorStop(1, isLeft ? '#1D4ED8' : '#EA580C');
        ctx.fillStyle = ag;
        ctx.fillRect(avX, avY, AVT, AVT);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((p.displayName || 'P')[0].toUpperCase(), avX + AVT / 2, avY + AVT / 2);
      }
      ctx.restore();

      // Borda do avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + AVT / 2, avY + AVT / 2, AVT / 2, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = teamColor;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      // Textos do jogador
      const textX = avX + AVT + 12;
      const textMaxW = panelW - AVT - 24;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Nome
      ctx.font = 'bold 14px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;

      // Truncar nome se muito longo
      let name = p.displayName || p.username || 'Jogador';
      while (ctx.measureText(name).width > textMaxW && name.length > 4) {
        name = name.slice(0, -1);
      }
      if (name !== (p.displayName || p.username || 'Jogador')) name += '…';
      ctx.fillText(name, textX, rowY + 26);

      // Elo
      const rankColor = getRankColor(p.rankName || '');
      ctx.font = 'bold 11px "SegoeUIBold", "Arial", sans-serif';
      ctx.fillStyle = rankColor;
      ctx.shadowBlur = 0;
      const rankLabel = `${p.badge || ''} ${(p.rankName || 'Sem Ranque').toUpperCase()}`;
      ctx.fillText(rankLabel, textX, rowY + 46);
      ctx.restore();
    }
  }

  await drawTeam(team1, 'left');
  await drawTeam(team2, 'right');

  // Rodapé
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px "SegoeUIBold", "Arial", sans-serif';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('discord.gg/xd  •  Bom jogo a todos!', W / 2, H - 30);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderLobbyImage,
  renderMapVoteImage,
  renderTeamsImage,
  preloadPlayerAvatar
};
