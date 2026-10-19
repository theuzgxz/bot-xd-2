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

module.exports = {
  renderLobbyImage,
  preloadPlayerAvatar
};
