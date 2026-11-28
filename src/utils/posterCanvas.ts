import QRCode from 'qrcode';
import { formatArs, parseMoneyAr, quitarEmojis } from '../domain/dinero';
import { obtenerIniciales, type IdentidadComercio } from '../domain/identidad';
import {
  construirPayloadQrOffline,
  construirTextoWhatsappPlaca,
  construirUrlWhatsapp,
  getFormatSpec,
  getPaletteById,
  type DraftsPorPlantilla,
  type FormatId,
  type GondolaCard,
  type GondolaDraft,
  type HorariosDraft,
  type ListaDraft,
  type OfertaDraft,
  type PosterPalette,
  type QrDraft,
  type TemplateId,
} from '../domain/placas';

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadCachedImage(dataUrl: string): Promise<HTMLImageElement | null> {
  if (!dataUrl || typeof dataUrl !== 'string') return Promise.resolve(null);
  const existing = imageCache.get(dataUrl);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
  imageCache.set(dataUrl, promise);
  return promise;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string
): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  strokeStyle: string,
  lineWidth = 2
): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 16
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  const imgRatio = (img.width || 1) / (img.height || 1);
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let dx = x;
  let dy = y;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    dx = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    dy = y - (drawH - h) / 2;
  }
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = Math.min(w / (img.width || 1), h / (img.height || 1));
  const dw = (img.width || 1) * scale;
  const dh = (img.height || 1) * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(' ');
        let trimmed = rest;
        while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
          trimmed = trimmed.slice(0, -1).trimEnd();
        }
        lines.push(trimmed === rest ? rest : `${trimmed}...`);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
}

function formatPriceLabel(rawInput: string, fallback = '$ 0'): string {
  const parsed = parseMoneyAr(rawInput);
  if (parsed > 0) return formatArs(parsed);
  const raw = rawInput.trim();
  return raw ? `$ ${raw}` : fallback;
}

function drawStoreFooter(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    palette: PosterPalette;
    identidad: IdentidadComercio;
    logoImg: HTMLImageElement | null;
    showLogo: boolean;
    showWhatsapp: boolean;
  }
): void {
  const { x, y, width, height, palette, identidad, logoImg, showLogo, showWhatsapp } = params;
  fillRoundRect(ctx, x, y, width, height, 20, palette.softBg);
  strokeRoundRect(ctx, x, y, width, height, 20, palette.border, 2);

  const pad = 16;
  let textX = x + pad + 10;

  if (showLogo) {
    const boxSize = height - pad * 2;
    const bx = x + pad;
    const by = y + pad;
    if (logoImg) {
      // Logo transparente sin recuadro blanco artificial
      drawContainImage(ctx, logoImg, bx, by, boxSize, boxSize);
    } else {
      fillRoundRect(ctx, bx, by, boxSize, boxSize, 14, palette.accent);
      ctx.fillStyle = palette.badgeText;
      ctx.font = `800 ${Math.round(boxSize * 0.42)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obtenerIniciales(identidad.nombre), bx + boxSize / 2, by + boxSize / 2 + 1);
    }
    textX = bx + boxSize + 22;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const centerY = y + height / 2;
  const waText = identidad.whatsapp.trim();
  const hasWa = showWhatsapp && Boolean(waText);

  ctx.fillStyle = palette.cardInk;
  ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
  const storeName = identidad.nombre.trim() || 'Mi Comercio';
  const maxTextW = width - (textX - x) - pad;

  if (hasWa) {
    ctx.fillText(storeName, textX, centerY - 18, maxTextW);
    ctx.fillStyle = palette.cardMuted;
    ctx.font = '600 25px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(`WhatsApp ${waText}`, textX, centerY + 20, maxTextW);
  } else {
    ctx.fillText(storeName, textX, centerY, maxTextW);
  }
}

async function generateQrOffscreenCanvas(payload: string, size = 500): Promise<HTMLCanvasElement> {
  const offscreen = document.createElement('canvas');
  await QRCode.toCanvas(offscreen, payload || 'PLACAFACIL', {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1F2118',
      light: '#FFFFFF',
    },
  });
  return offscreen;
}

function renderOfertaTemplate(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    data: OfertaDraft;
    identidad: IdentidadComercio;
    palette: PosterPalette;
    logoImg: HTMLImageElement | null;
    photoImg: HTMLImageElement | null;
  }
): void {
  const { width, height, data, identidad, palette, logoImg, photoImg } = params;
  const isTall = height / width > 1.5;
  const pad = Math.round(width * 0.068);
  const innerW = width - pad * 2;
  const hasVisibleLogo = Boolean(logoImg && data.showLogo);

  ctx.fillStyle = '#F1E9D8';
  ctx.fillRect(0, 0, width, height);

  const topBannerH = Math.round(height * (hasVisibleLogo ? 0.095 : 0.082));
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, width, topBannerH);

  let brandTextX = pad;
  if (hasVisibleLogo && logoImg) {
    const topLogoSize = Math.round(topBannerH * 0.72);
    const lby = Math.round((topBannerH - topLogoSize) / 2);
    drawContainImage(ctx, logoImg, pad, lby, topLogoSize, topLogoSize);
    brandTextX = pad + topLogoSize + 18;
  }

  ctx.fillStyle = palette.badgeText;
  ctx.font = `800 ${Math.round(width * 0.036)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    (identidad.nombre || 'MI COMERCIO').toUpperCase(),
    brandTextX,
    topBannerH / 2,
    innerW * 0.62
  );

  ctx.font = `600 ${Math.round(width * 0.023)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(isTall ? 'PROMO VIGENTE' : 'OFERTA', width - pad, topBannerH / 2);

  const cardTop = topBannerH + Math.round(height * 0.03);
  const footerH = Math.round(height * (isTall ? 0.118 : 0.128));
  const footerY = height - pad - footerH;
  const cardH = footerY - cardTop - Math.round(height * 0.024);

  fillRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.cardBg);
  strokeRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.border, 3);

  const contentX = pad + 44;
  const contentW = innerW - 88;
  let cursorY = cardTop + 40;

  const badgeText = (data.badge || 'OFERTA DEL DÍA').toUpperCase();
  ctx.font = `800 ${Math.round(width * 0.028)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  const badgeW = Math.min(contentW, ctx.measureText(badgeText).width + 52);
  const badgeH = 52;
  fillRoundRect(ctx, contentX, cursorY, badgeW, badgeH, 10, palette.accent);
  ctx.fillStyle = palette.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, contentX + badgeW / 2, cursorY + badgeH / 2 + 1, badgeW - 24);
  cursorY += badgeH + (isTall ? 30 : 20);

  const bottomLimit = cardTop + cardH - 40;
  const validityText = data.validity.trim();
  const validityH = validityText ? 48 : 0;

  const oldPriceVal = parseMoneyAr(data.oldPriceInput);
  const hasOldPrice = oldPriceVal > 0;
  const mainPriceText = formatPriceLabel(data.priceInput, '$ 0');

  let priceFontSize = Math.round(width * 0.135);
  ctx.font = `800 ${priceFontSize}px "JetBrains Mono", ui-monospace, monospace`;
  while (ctx.measureText(mainPriceText).width > contentW - 52 && priceFontSize > 64) {
    priceFontSize -= 6;
    ctx.font = `800 ${priceFontSize}px "JetBrains Mono", ui-monospace, monospace`;
  }

  const priceBlockH = (hasOldPrice ? 58 : 0) + priceFontSize + 40;
  const priceBoxY = bottomLimit - validityH - (validityH ? 20 : 0) - priceBlockH;
  const maxUpperBottom = priceBoxY - 22;
  const availUpperH = Math.max(120, maxUpperBottom - cursorY);

  const unitRaw = data.unitNote.trim();
  const unitFontSize = Math.round(width * 0.031);
  const unitLineH = Math.round(width * 0.041);
  let unitLines: string[] = [];
  if (unitRaw) {
    ctx.font = `500 ${unitFontSize}px "Inter", system-ui, sans-serif`;
    unitLines = wrapLines(ctx, unitRaw, contentW, 2);
  }
  const unitBlockH = unitLines.length ? 14 + unitLines.length * unitLineH : 0;

  let titleFontSize = photoImg ? Math.round(width * 0.066) : Math.round(width * 0.082);
  const minTitleSize = Math.round(width * 0.044);
  const minPhotoH = photoImg ? Math.round(cardH * (isTall ? 0.26 : 0.22)) : 0;
  const gapAfterPhoto = photoImg ? (isTall ? 30 : 20) : 0;

  let titleLines: string[] = [];
  let lineH = 0;
  let titleBlockH = 0;

  while (true) {
    ctx.font = `800 ${titleFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    titleLines = wrapLines(ctx, data.title || 'Producto en Oferta', contentW, photoImg ? 2 : 3);
    lineH = Math.round(titleFontSize * 1.15);
    titleBlockH = titleLines.length * lineH;
    const needed = titleBlockH + unitBlockH + (photoImg ? minPhotoH + gapAfterPhoto : 0);
    if (needed <= availUpperH || titleFontSize <= minTitleSize) {
      break;
    }
    titleFontSize -= 4;
  }

  if (photoImg) {
    const idealPhotoH = Math.round(cardH * (isTall ? 0.39 : 0.34));
    const maxAllowedPhotoH = Math.max(80, availUpperH - titleBlockH - unitBlockH - gapAfterPhoto);
    const photoH = Math.min(idealPhotoH, maxAllowedPhotoH);
    drawCoverImage(ctx, photoImg, contentX, cursorY, contentW, photoH, 20);
    strokeRoundRect(ctx, contentX, cursorY, contentW, photoH, 20, palette.border, 2);
    cursorY += photoH + gapAfterPhoto;
  } else {
    const extraPad = Math.max(0, Math.min(isTall ? 42 : 20, availUpperH - titleBlockH - unitBlockH));
    cursorY += extraPad;
  }

  ctx.fillStyle = palette.cardInk;
  ctx.font = `800 ${titleFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const line of titleLines) {
    ctx.fillText(line, contentX, cursorY);
    cursorY += lineH;
  }

  if (unitLines.length) {
    cursorY += 14;
    ctx.fillStyle = palette.cardMuted;
    ctx.font = `500 ${unitFontSize}px "Inter", system-ui, sans-serif`;
    for (const line of unitLines) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += unitLineH;
    }
  }

  if (!photoImg && maxUpperBottom - cursorY >= 48) {
    cursorY += 28;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(contentX, cursorY);
    ctx.lineTo(contentX + Math.min(180, contentW * 0.28), cursorY);
    ctx.stroke();
  }

  fillRoundRect(ctx, contentX, priceBoxY, contentW, priceBlockH, 20, palette.softBg);
  strokeRoundRect(ctx, contentX, priceBoxY, contentW, priceBlockH, 20, palette.border, 2);

  let py = priceBoxY + 24;
  if (hasOldPrice) {
    const oldLabel = `ANTES ${formatArs(oldPriceVal)}`;
    ctx.fillStyle = palette.cardMuted;
    ctx.font = '600 32px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(oldLabel, contentX + 28, py, contentW - 56);
    const oldW = Math.min(contentW - 56, ctx.measureText(oldLabel).width);
    ctx.strokeStyle = palette.cardMuted;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(contentX + 26, py + 17);
    ctx.lineTo(contentX + 30 + oldW, py + 17);
    ctx.stroke();
    py += 52;
  }

  ctx.fillStyle = palette.accent;
  ctx.font = `800 ${priceFontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(mainPriceText, contentX + 26, py, contentW - 52);

  if (validityText) {
    ctx.fillStyle = palette.cardMuted;
    ctx.font = `600 ${Math.round(width * 0.028)}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(validityText, contentX, bottomLimit - validityH / 2, contentW);
  }

  drawStoreFooter(ctx, {
    x: pad,
    y: footerY,
    width: innerW,
    height: footerH,
    palette,
    identidad,
    logoImg,
    showLogo: data.showLogo,
    showWhatsapp: data.showWhatsapp,
  });
}

function renderListaTemplate(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    data: ListaDraft;
    identidad: IdentidadComercio;
    palette: PosterPalette;
    logoImg: HTMLImageElement | null;
  }
): void {
  const { width, height, data, identidad, palette, logoImg } = params;
  const isTall = height / width > 1.5;
  const pad = Math.round(width * 0.062);
  const innerW = width - pad * 2;

  ctx.fillStyle = '#F1E9D8';
  ctx.fillRect(0, 0, width, height);

  const headerH = Math.round(height * (isTall ? 0.145 : 0.17));
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, width, headerH);

  ctx.fillStyle = palette.badgeText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${Math.round(width * 0.024)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText((data.badge || 'LISTA DE PRECIOS').toUpperCase(), pad, 42);

  ctx.font = `800 ${Math.round(width * 0.058)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(data.title || 'Lista de Precios', pad, 86, innerW);

  if (data.subtitle.trim()) {
    ctx.font = `500 ${Math.round(width * 0.026)}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(250, 246, 238, 0.9)';
    ctx.fillText(data.subtitle, pad, 162, innerW);
  }

  const footerH = Math.round(height * (isTall ? 0.115 : 0.125));
  const footerY = height - pad - footerH;
  const listTop = headerH + 34;
  const listH = footerY - listTop - 28;

  fillRoundRect(ctx, pad, listTop, innerW, listH, 24, palette.cardBg);
  strokeRoundRect(ctx, pad, listTop, innerW, listH, 24, palette.border, 2.5);

  const items = data.items.slice(0, 10);
  const noteHeight = data.footerNote.trim() ? 66 : 16;
  const rowsAreaH = listH - 40 - noteHeight;
  const rowCount = Math.max(items.length, 1);
  const rowH = Math.min(126, Math.floor(rowsAreaH / rowCount));

  items.forEach((item, idx) => {
    const ry = listTop + 24 + idx * rowH;
    if (idx % 2 === 1) {
      fillRoundRect(ctx, pad + 20, ry + 4, innerW - 40, rowH - 8, 12, palette.softBg);
    }

    const priceText = formatPriceLabel(item.priceInput, '$ 0');
    ctx.font = `800 ${Math.round(Math.min(40, rowH * 0.38))}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const priceMaxW = innerW * 0.34;
    ctx.fillText(priceText, pad + innerW - 40, ry + rowH / 2, priceMaxW);

    const nameMaxW = innerW - 96 - Math.min(priceMaxW, ctx.measureText(priceText).width + 24);
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.cardInk;
    ctx.font = `700 ${Math.round(Math.min(34, rowH * 0.33))}px "Plus Jakarta Sans", system-ui, sans-serif`;

    if (item.detail.trim()) {
      ctx.fillText(item.name || 'Producto', pad + 40, ry + rowH * 0.36, nameMaxW);
      ctx.fillStyle = palette.cardMuted;
      ctx.font = `500 ${Math.round(Math.min(24, rowH * 0.24))}px "Inter", system-ui, sans-serif`;
      ctx.fillText(item.detail, pad + 40, ry + rowH * 0.69, nameMaxW);
    } else {
      ctx.fillText(item.name || 'Producto', pad + 40, ry + rowH / 2, nameMaxW);
    }
  });

  if (data.footerNote.trim()) {
    ctx.fillStyle = palette.cardMuted;
    ctx.font = '600 26px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.footerNote, width / 2, listTop + listH - 36, innerW - 64);
  }

  drawStoreFooter(ctx, {
    x: pad,
    y: footerY,
    width: innerW,
    height: footerH,
    palette,
    identidad,
    logoImg,
    showLogo: data.showLogo,
    showWhatsapp: data.showWhatsapp,
  });
}

function renderQrTemplate(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    data: QrDraft;
    identidad: IdentidadComercio;
    palette: PosterPalette;
    logoImg: HTMLImageElement | null;
    qrCanvas: HTMLCanvasElement | null;
  }
): void {
  const { width, height, data, identidad, palette, logoImg, qrCanvas } = params;
  const isTall = height / width > 1.5;
  const pad = Math.round(width * 0.065);
  const innerW = width - pad * 2;

  ctx.fillStyle = '#F1E9D8';
  ctx.fillRect(0, 0, width, height);

  const footerH = Math.round(height * (isTall ? 0.115 : 0.125));
  const footerY = height - pad - footerH;
  const cardTop = pad;
  const cardH = footerY - cardTop - 28;

  fillRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.cardBg);
  strokeRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.border, 3);

  const headH = Math.round(cardH * 0.21);
  ctx.save();
  roundRectPath(ctx, pad, cardTop, innerW, cardH, 28);
  ctx.clip();
  ctx.fillStyle = palette.accent;
  ctx.fillRect(pad, cardTop, innerW, headH);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(250, 246, 238, 0.85)';
  ctx.font = `700 ${Math.round(width * 0.025)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText((data.badge || 'COBRO INMEDIATO').toUpperCase(), width / 2, cardTop + headH * 0.28);

  ctx.fillStyle = palette.badgeText;
  ctx.font = `800 ${Math.round(width * 0.052)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(
    data.title || 'PAGÁ CON TRANSFERENCIA',
    width / 2,
    cardTop + headH * 0.56,
    innerW - 64
  );

  ctx.fillStyle = 'rgba(250, 246, 238, 0.9)';
  ctx.font = `500 ${Math.round(width * 0.026)}px "Inter", system-ui, sans-serif`;
  ctx.fillText(identidad.nombre || 'Comercio', width / 2, cardTop + headH * 0.81, innerW - 64);

  const qrBoxSize = Math.round(Math.min(innerW * 0.62, cardH * (isTall ? 0.36 : 0.39)));
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = cardTop + headH + Math.round(cardH * 0.055);

  fillRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, '#FFFFFF');
  ctx.save();
  ctx.setLineDash([12, 10]);
  strokeRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, palette.border, 3);
  ctx.restore();

  if (qrCanvas) {
    const inset = 22;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      qrCanvas,
      qrBoxX + inset,
      qrBoxY + inset,
      qrBoxSize - inset * 2,
      qrBoxSize - inset * 2
    );
    ctx.restore();
  }

  const aliasBoxW = innerW - 88;
  const aliasBoxX = pad + 44;
  const aliasBoxY = qrBoxY + qrBoxSize + Math.round(cardH * 0.045);
  const aliasBoxH = Math.round(cardH * 0.2);

  fillRoundRect(ctx, aliasBoxX, aliasBoxY, aliasBoxW, aliasBoxH, 20, '#1F2118');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#B3AD9E';
  ctx.font = `700 ${Math.round(width * 0.022)}px "Inter", system-ui, sans-serif`;
  ctx.fillText('ALIAS PARA TRANSFERIR', width / 2, aliasBoxY + aliasBoxH * 0.25);

  ctx.fillStyle = '#F1E9D8';
  ctx.font = `800 ${Math.round(width * 0.052)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(
    (identidad.aliasOCbu || 'SIN.ALIAS.CONFIGURADO').toUpperCase(),
    width / 2,
    aliasBoxY + aliasBoxH * 0.56,
    aliasBoxW - 48
  );

  const amountVal = parseMoneyAr(data.amountInput);
  const extraParts = [
    identidad.banco.trim(),
    identidad.cvu.trim() ? `CVU/CBU: ${identidad.cvu.trim()}` : '',
    amountVal > 0 ? `Importe: ${formatArs(amountVal)}` : '',
  ].filter(Boolean);

  if (extraParts.length > 0) {
    ctx.fillStyle = '#D9CFBA';
    ctx.font = `500 ${Math.round(width * 0.022)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(extraParts.join(' · '), width / 2, aliasBoxY + aliasBoxH * 0.83, aliasBoxW - 40);
  }

  const noteY = (aliasBoxY + aliasBoxH + (cardTop + cardH)) / 2;
  ctx.fillStyle = palette.cardMuted;
  ctx.font = `600 ${Math.round(width * 0.025)}px "Inter", system-ui, sans-serif`;
  ctx.fillText(
    data.footerNote || 'Sin recargo · Enviá tu comprobante por WhatsApp',
    width / 2,
    noteY,
    innerW - 64
  );

  drawStoreFooter(ctx, {
    x: pad,
    y: footerY,
    width: innerW,
    height: footerH,
    palette,
    identidad,
    logoImg,
    showLogo: data.showLogo,
    showWhatsapp: data.showWhatsapp,
  });
}

function renderHorariosTemplate(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    data: HorariosDraft;
    identidad: IdentidadComercio;
    palette: PosterPalette;
    logoImg: HTMLImageElement | null;
  }
): void {
  const { width, height, data, identidad, palette, logoImg } = params;
  const isTall = height / width > 1.5;
  const pad = Math.round(width * 0.068);
  const innerW = width - pad * 2;

  ctx.fillStyle = '#F1E9D8';
  ctx.fillRect(0, 0, width, height);

  const footerH = Math.round(height * (isTall ? 0.115 : 0.125));
  const footerY = height - pad - footerH;
  const cardTop = pad;
  const cardH = footerY - cardTop - 28;

  fillRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.cardBg);
  strokeRoundRect(ctx, pad, cardTop, innerW, cardH, 28, palette.border, 3);

  let y = cardTop + 52;
  const cx = pad + 48;
  const cw = innerW - 96;

  const statusText = (data.statusTag || 'HORARIO DE ATENCIÓN').toUpperCase();
  ctx.font = `800 ${Math.round(width * 0.026)}px "JetBrains Mono", ui-monospace, monospace`;
  const bw = Math.min(cw, ctx.measureText(statusText).width + 52);
  fillRoundRect(ctx, cx, y, bw, 52, 10, palette.accent);
  ctx.fillStyle = palette.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusText, cx + bw / 2, y + 26, bw - 24);
  y += 84;

  ctx.fillStyle = palette.cardInk;
  const titleSize = Math.round(width * 0.07);
  ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const titleLines = wrapLines(ctx, data.title || 'HORARIOS DE ATENCIÓN', cw, 3);
  const titleStep = Math.round(titleSize * 1.15);
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += titleStep;
  }
  y += 22;

  const hasAddress = data.showAddress && Boolean(identidad.direccion.trim());
  const noteRaw = data.note.trim();
  let noteLines: string[] = [];
  if (noteRaw) {
    ctx.font = '500 26px "Inter", system-ui, sans-serif';
    noteLines = wrapLines(ctx, noteRaw, cw, 2);
  }
  const bottomY = cardTop + cardH - 40;
  const addressH = hasAddress ? 38 : 0;
  const noteH = noteLines.length ? noteLines.length * 34 + (hasAddress ? 12 : 0) : 0;
  const reservedBottomH = addressH + noteH + (addressH || noteH ? 28 : 12);

  const lines = data.scheduleLines.slice(0, 4);
  const availableBlocksH = Math.max(100, cardTop + cardH - 40 - reservedBottomH - y);
  const gapY = lines.length > 2 ? 14 : 20;
  const rawBlockH = Math.floor(
    (availableBlocksH - gapY * Math.max(0, lines.length - 1)) / Math.max(lines.length, 1)
  );
  const blockH = Math.max(48, Math.min(180, rawBlockH));
  const labelFontSize = Math.round(Math.min(width * 0.034, blockH * 0.25));
  const hoursFontSize = Math.round(Math.min(width * 0.036, blockH * 0.27));

  for (const item of lines) {
    fillRoundRect(ctx, cx, y, cw, blockH, 18, palette.softBg);
    strokeRoundRect(ctx, cx, y, cw, blockH, 18, palette.border, 2);

    ctx.fillStyle = palette.cardInk;
    ctx.font = `700 ${labelFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label || 'Días', cx + 28, y + blockH * 0.34, cw - 56);

    ctx.fillStyle = palette.accent;
    ctx.font = `700 ${hoursFontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(item.hours || '08:30 a 20:00', cx + 28, y + blockH * 0.7, cw - 56);
    y += blockH + gapY;
  }

  if (hasAddress) {
    ctx.fillStyle = palette.cardInk;
    ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(identidad.direccion.trim(), cx, bottomY, cw);
  }
  if (noteLines.length > 0) {
    ctx.fillStyle = palette.cardMuted;
    ctx.font = '500 26px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const noteBaseY = bottomY - (hasAddress ? 42 : 0);
    for (let i = noteLines.length - 1; i >= 0; i -= 1) {
      const offsetFromBottom = (noteLines.length - 1 - i) * 34;
      ctx.fillText(noteLines[i], cx, noteBaseY - offsetFromBottom, cw);
    }
  }

  drawStoreFooter(ctx, {
    x: pad,
    y: footerY,
    width: innerW,
    height: footerH,
    palette,
    identidad,
    logoImg,
    showLogo: data.showLogo,
    showWhatsapp: data.showWhatsapp,
  });
}

function drawSingleGondolaTag(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    w: number;
    h: number;
    card: GondolaCard;
    identidad: IdentidadComercio;
    palette: PosterPalette;
    logoImg: HTMLImageElement | null;
  }
): void {
  const { x, y, w, h, card, identidad, palette, logoImg } = params;
  fillRoundRect(ctx, x, y, w, h, 8, '#FFFFFF');

  const refDim = Math.min(w, h * 0.72);
  const pad = Math.round(refDim * 0.068);
  const innerW = w - pad * 2;

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(x + pad + 8, y + pad + 8, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.font = `800 ${Math.round(refDim * 0.036)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    (card.badge || 'OFERTA').toUpperCase(),
    x + pad + 24,
    y + pad + 8,
    innerW * 0.56
  );

  if (logoImg) {
    const logoSize = Math.round(refDim * 0.095);
    const lx = x + w - pad - logoSize;
    const ly = y + pad - Math.round(logoSize * 0.3);
    drawContainImage(ctx, logoImg, lx, ly, logoSize, logoSize);
  } else {
    ctx.fillStyle = palette.cardMuted;
    ctx.font = `700 ${Math.round(refDim * 0.032)}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(
      (identidad.nombre || 'COMERCIO').toUpperCase(),
      x + w - pad,
      y + pad + 8,
      innerW * 0.38
    );
  }

  const headerBottom = y + pad + Math.max(36, Math.round(refDim * 0.095));
  const hasDetail = Boolean(card.detail.trim());
  const chipH = Math.round(h * 0.11);
  const chipY = y + h - pad - Math.round(h * 0.13);
  const maxPriceBottom = hasDetail ? chipY - 18 : y + h - pad;

  const titleSize = Math.round(refDim * 0.072);
  const titleLineStep = Math.round(titleSize * 1.18);
  ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  const lines = wrapLines(ctx, (card.title || 'PRODUCTO').toUpperCase(), innerW, 2);
  const titleBlockH = lines.length * titleLineStep;

  const oldVal = parseMoneyAr(card.oldPriceInput);
  const hasOld = oldVal > 0;
  const oldFontSize = Math.round(refDim * 0.04);
  const gapTitleToOld = 16;
  const oldBlockH = hasOld ? gapTitleToOld + Math.round(oldFontSize * 1.35) : 0;
  const gapToPrice = hasOld ? 12 : 20;

  const availableMiddleH = Math.max(80, maxPriceBottom - headerBottom);
  const maxByHeight = Math.max(36, availableMiddleH - titleBlockH - oldBlockH - gapToPrice - 8);
  const priceText = formatPriceLabel(card.priceInput, '$ 0');
  let pSize = Math.min(Math.round(refDim * 0.175), maxByHeight);
  ctx.font = `800 ${pSize}px "JetBrains Mono", ui-monospace, monospace`;
  while (ctx.measureText(priceText).width > innerW && pSize > 36) {
    pSize -= 4;
    ctx.font = `800 ${pSize}px "JetBrains Mono", ui-monospace, monospace`;
  }

  const totalGroupH = titleBlockH + oldBlockH + gapToPrice + pSize;
  let cy = headerBottom + Math.max(8, Math.round((availableMiddleH - totalGroupH) * 0.45));

  ctx.fillStyle = '#1F2118';
  ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const line of lines) {
    ctx.fillText(line, x + w / 2, cy);
    cy += titleLineStep;
  }

  if (hasOld) {
    const oldTxt = `Antes ${formatArs(oldVal)}`;
    ctx.fillStyle = '#5A5D4D';
    ctx.font = `600 ${oldFontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const oldY = cy + gapTitleToOld;
    ctx.fillText(oldTxt, x + w / 2, oldY);
    const ow = ctx.measureText(oldTxt).width;
    ctx.strokeStyle = '#5A5D4D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - ow / 2 - 4, oldY + Math.round(oldFontSize * 0.56));
    ctx.lineTo(x + w / 2 + ow / 2 + 4, oldY + Math.round(oldFontSize * 0.56));
    ctx.stroke();
    cy = oldY + Math.round(oldFontSize * 1.35);
  }

  ctx.fillStyle = '#1F2118';
  ctx.font = `800 ${pSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(priceText, x + w / 2, cy + gapToPrice, innerW);

  if (hasDetail) {
    fillRoundRect(ctx, x + pad + 24, chipY, innerW - 48, chipH, 8, palette.softBg);
    strokeRoundRect(ctx, x + pad + 24, chipY, innerW - 48, chipH, 8, palette.border, 1.5);
    ctx.fillStyle = palette.accent;
    ctx.font = `700 ${Math.round(refDim * 0.036)}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.detail.trim(), x + w / 2, chipY + chipH / 2, innerW - 72);
  }
}

function renderGondolaSheetToCanvas(params: {
  canvas: HTMLCanvasElement;
  gondolaData: GondolaDraft;
  identidad: IdentidadComercio;
  logoImg: HTMLImageElement | null;
}): void {
  const { canvas, gondolaData, identidad, logoImg } = params;
  const width = 1240;
  const height = 1754;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const palette = getPaletteById(gondolaData.paletteId);
  const isTwoUp = gondolaData.layout === '2x';
  const cards = gondolaData.cards;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const margin = 44;
  const usableW = width - margin * 2;
  const usableH = height - margin * 2;

  if (isTwoUp) {
    const tagH = usableH / 2;
    for (let i = 0; i < 2; i += 1) {
      const card = cards[i] ?? cards[0];
      if (!card) continue;
      drawSingleGondolaTag(ctx, {
        x: margin,
        y: margin + i * tagH,
        w: usableW,
        h: tagH,
        card,
        identidad,
        palette,
        logoImg,
      });
    }
    ctx.save();
    ctx.strokeStyle = '#9C988C';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(margin, margin, usableW, usableH);
    ctx.beginPath();
    ctx.moveTo(margin, margin + tagH);
    ctx.lineTo(margin + usableW, margin + tagH);
    ctx.stroke();
    ctx.restore();
  } else {
    const tagW = usableW / 2;
    const tagH = usableH / 2;
    for (let idx = 0; idx < 4; idx += 1) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const card = cards[idx] ?? cards[0];
      if (!card) continue;
      drawSingleGondolaTag(ctx, {
        x: margin + col * tagW,
        y: margin + row * tagH,
        w: tagW,
        h: tagH,
        card,
        identidad,
        palette,
        logoImg,
      });
    }
    ctx.save();
    ctx.strokeStyle = '#9C988C';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(margin, margin, usableW, usableH);
    ctx.beginPath();
    ctx.moveTo(margin + tagW, margin);
    ctx.lineTo(margin + tagW, margin + usableH);
    ctx.moveTo(margin, margin + tagH);
    ctx.lineTo(margin + usableW, margin + tagH);
    ctx.stroke();
    ctx.restore();
  }
}

export async function renderPosterToCanvas(params: {
  canvas: HTMLCanvasElement | null;
  templateId: TemplateId;
  formatId: FormatId;
  drafts: DraftsPorPlantilla;
  identidad: IdentidadComercio;
  isCancelled?: () => boolean;
}): Promise<void> {
  const { canvas, templateId, formatId, drafts, identidad, isCancelled = () => false } = params;
  if (!canvas) return;

  const logoImg = await loadCachedImage(identidad.logoBase64);
  if (isCancelled()) return;

  if (templateId === 'gondola') {
    renderGondolaSheetToCanvas({
      canvas,
      gondolaData: drafts.gondola,
      identidad,
      logoImg,
    });
    return;
  }

  const spec = getFormatSpec(formatId);
  if (canvas.width !== spec.width) canvas.width = spec.width;
  if (canvas.height !== spec.height) canvas.height = spec.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (templateId === 'oferta') {
    const data = drafts.oferta;
    const photoImg = await loadCachedImage(data.photoDataUrl);
    if (isCancelled()) return;
    renderOfertaTemplate(ctx, {
      width: spec.width,
      height: spec.height,
      data,
      identidad,
      palette: getPaletteById(data.paletteId),
      logoImg,
      photoImg,
    });
    return;
  }

  if (templateId === 'lista') {
    const data = drafts.lista;
    renderListaTemplate(ctx, {
      width: spec.width,
      height: spec.height,
      data,
      identidad,
      palette: getPaletteById(data.paletteId),
      logoImg,
    });
    return;
  }

  if (templateId === 'qr') {
    const data = drafts.qr;
    const payload = construirPayloadQrOffline(identidad, data.amountInput);
    const qrCanvas = await generateQrOffscreenCanvas(payload, 520);
    if (isCancelled()) return;
    renderQrTemplate(ctx, {
      width: spec.width,
      height: spec.height,
      data,
      identidad,
      palette: getPaletteById(data.paletteId),
      logoImg,
      qrCanvas,
    });
    return;
  }

  const data = drafts.horarios;
  renderHorariosTemplate(ctx, {
    width: spec.width,
    height: spec.height,
    data,
    identidad,
    palette: getPaletteById(data.paletteId),
    logoImg,
  });
}

export function exportCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportCanvasAsPdf(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const imgData = canvas.toDataURL('image/png');
  const pageW = 210;
  const pageH = 297;
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const drawW = canvas.width * ratio;
  const drawH = canvas.height * ratio;
  const offsetX = (pageW - drawW) / 2;
  const offsetY = (pageH - drawH) / 2;
  doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
  doc.save(filename);
}

export async function sharePosterViaWhatsApp(params: {
  canvas: HTMLCanvasElement;
  filename: string;
  identidad: IdentidadComercio;
  templateId: TemplateId;
  draft: DraftsPorPlantilla[TemplateId];
}): Promise<'native-share' | 'download-and-wa' | 'download-popup-blocked'> {
  const { canvas, filename, identidad, templateId, draft } = params;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  const shareText = construirTextoWhatsappPlaca({ templateId, draft, identidad });

  if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: quitarEmojis(identidad.nombre || 'PlacaFácil') || 'PlacaFácil',
          text: shareText,
        });
        return 'native-share';
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
      }
    }
  }

  exportCanvasAsPng(canvas, filename);
  const waUrl = construirUrlWhatsapp(shareText);
  const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
  return opened ? 'download-and-wa' : 'download-popup-blocked';
}
