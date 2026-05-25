import type {
  ExhibitionBoothCategory,
  ExhibitionEvent,
  ExhibitionReservation,
  ExhibitionTopViewMarker,
  ExhibitionTopViewStructure,
} from './types';
import { feeCurrencyDisplay, formatAmountDisplay, formatAmountDisplayFa, toPersianDigits } from './educationFormat';
import { boothCode, normalizeExhibitionEvent } from './exhibitionNormalize';
import { ensureVazirmatnLoaded } from './educationStoryExport';

export const EXHIBITION_STORY_WIDTH = 1080;
export const EXHIBITION_STORY_HEIGHT = 1920;
export const EXHIBITION_STORY_EXPORT_SCALE = 4;
export const EXHIBITION_STORY_EXPORT_WIDTH = EXHIBITION_STORY_WIDTH * EXHIBITION_STORY_EXPORT_SCALE;
export const EXHIBITION_STORY_EXPORT_HEIGHT = EXHIBITION_STORY_HEIGHT * EXHIBITION_STORY_EXPORT_SCALE;

export type ExhibitionStoryRenderOptions = {
  scale?: number;
};

const FONT = 'Vazirmatn, Tahoma, sans-serif';
const RESERVED = '#fb923c';
const CONFIRMED = '#34d399';
const EMPTY = 'rgba(255,255,255,0.12)';
const RTL_TEXT_RE = /[\u0600-\u06FF]/;
const LATIN_TEXT_RE = /[A-Za-z]/;

function exhibitionUsesPersianDigits(event: ExhibitionEvent): boolean {
  const primaryText = [
    event.title,
    event.subtitle,
    event.organizerName,
    event.location,
    ...event.categories.flatMap(category => [category.name, category.description]),
  ].join(' ');
  if (RTL_TEXT_RE.test(primaryText)) return true;
  if (LATIN_TEXT_RE.test(primaryText)) return false;
  return RTL_TEXT_RE.test([event.boothFeeLabel, event.storyHeaderText, event.storyFootNote].join(' '));
}

function eventDigits(event: ExhibitionEvent, value: unknown): string {
  return exhibitionUsesPersianDigits(event) ? toPersianDigits(value) : String(value ?? '');
}

function eventAmountDisplay(event: ExhibitionEvent, value: string): string {
  return exhibitionUsesPersianDigits(event) ? formatAmountDisplayFa(value) : formatAmountDisplay(value);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    const last = trimmed[trimmed.length - 1];
    trimmed[trimmed.length - 1] = last.length > 2 ? `${last.slice(0, -1)}…` : '…';
    return trimmed;
  }
  return lines;
}

function drawRtlWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  xRight: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  color: string,
): number {
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  const lines = wrapTextLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, i) => ctx.fillText(line, xRight, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function reservationByBooth(event: ExhibitionEvent, categoryId: string, boothNumber: number): ExhibitionReservation | undefined {
  return event.reservations.find(r => r.categoryId === categoryId && r.boothNumber === boothNumber);
}

async function loadBackgroundImage(url: string): Promise<HTMLImageElement | null> {
  if (!url?.trim()) return null;
  return new Promise(resolve => {
    const img = new Image();
    const src = url.trim();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, opacity: number) {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawStatCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: string, color: string) {
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  roundRect(ctx, x, y, w, 120, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(value, x + w / 2, y + 50);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(label, x + w / 2, y + 88);
}

function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const items = [
    { label: 'قطعی', color: CONFIRMED },
    { label: 'رزرو موقت', color: RESERVED },
    { label: 'خالی / قابل رزرو', color: EMPTY },
  ];
  ctx.font = `500 20px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  items.forEach((item, i) => {
    const rowY = y + i * 34;
    ctx.fillStyle = item.color;
    roundRect(ctx, x - 18, rowY - 9, 18, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(item.label, x - 30, rowY);
  });
  ctx.textBaseline = 'alphabetic';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex: string, opacity: number): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#38bdf8';
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp(opacity, 0, 100) / 100})`;
}

function topViewFloorCols(boothCount: number): number {
  const count = Math.max(1, Math.round(boothCount || 1));
  const minCols = count <= 20 ? 4 : count <= 48 ? 5 : 8;
  const maxCols = Math.min(16, count);
  const ideal = Math.sqrt(count);
  let bestCols = Math.min(maxCols, Math.max(minCols, Math.round(ideal)));
  let bestScore = Number.POSITIVE_INFINITY;
  for (let cols = minCols; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const emptySlots = rows * cols - count;
    const aspectPenalty = Math.abs(cols / rows - 1.35);
    const score = emptySlots * 12 + aspectPenalty * 3 + Math.abs(cols - ideal) * 0.2;
    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }
  return bestCols;
}

function previewMapHeight(rows: number): number {
  return Math.max(260, rows * 24 + 68);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(part => part[0]).join('') || 'EX').toUpperCase();
}

function markerKindLabel(kind: ExhibitionTopViewMarker['kind']): string {
  if (kind === 'entrance') return 'Entrance';
  if (kind === 'conference') return 'Conference';
  if (kind === 'exit') return 'Exit';
  if (kind === 'guide') return 'Guide';
  return 'Ad Board';
}

function markerIcon(kind: ExhibitionTopViewMarker['kind']): string {
  if (kind === 'entrance') return 'IN';
  if (kind === 'conference') return 'CONF';
  if (kind === 'exit') return 'OUT';
  if (kind === 'guide') return 'INFO';
  return 'AD';
}

function structureKindLabel(kind: ExhibitionTopViewStructure['kind']): string {
  if (kind === 'divider') return 'Boundary';
  if (kind === 'pavilion') return 'Pavilion';
  return 'Column';
}

function storyTopViewMapHeight(cat: ExhibitionBoothCategory, w: number, preferredCell: number, gap: number): number {
  const cols = topViewFloorCols(cat.boothCount);
  const cell = Math.max(preferredCell, Math.floor((w - 96 - (cols - 1) * gap) / cols));
  const rows = Math.ceil(cat.boothCount / cols);
  return 112 + rows * (cell + gap) - gap + 56;
}

function drawTopViewStructure(
  ctx: CanvasRenderingContext2D,
  structure: ExhibitionTopViewStructure,
  floorX: number,
  floorY: number,
  floorW: number,
  floorH: number,
) {
  const width = clamp(structure.width, 1, 100) * floorW / 100;
  const height = clamp(structure.height, 1, 100) * floorH / 100;
  const cx = floorX + clamp(structure.x, 0, 100) * floorW / 100;
  const cy = floorY + clamp(structure.y, 0, 100) * floorH / 100;
  const x = cx - width / 2;
  const y = cy - height / 2;
  ctx.fillStyle = hexToRgba(structure.color || '#38bdf8', structure.opacity);
  ctx.strokeStyle = structure.color || '#38bdf8';
  ctx.lineWidth = structure.kind === 'pavilion' ? 2 : 1.5;
  roundRect(ctx, x, y, width, height, structure.kind === 'divider' ? Math.min(width, height) / 2 : 18);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.font = `800 ${Math.max(9, Math.min(17, height * 0.22))}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(structure.title || structureKindLabel(structure.kind), cx, cy + 4);
  ctx.restore();
}

function drawTopViewMarker(
  ctx: CanvasRenderingContext2D,
  marker: ExhibitionTopViewMarker,
  floorX: number,
  floorY: number,
  floorW: number,
  floorH: number,
) {
  const cx = floorX + clamp(marker.x, 0, 100) * floorW / 100;
  const cy = floorY + clamp(marker.y, 0, 100) * floorH / 100;
  const color = marker.color || '#22d3ee';
  const markerBg = hexToRgba(color, typeof marker.opacity === 'number' ? marker.opacity : 88);
  const w = marker.kind === 'ad' ? 148 : 126;
  const h = 46;
  const x = clamp(cx - w / 2, floorX + 6, floorX + floorW - w - 6);
  const y = clamp(cy - h / 2, floorY + 6, floorY + floorH - h - 6);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, markerBg);
  grad.addColorStop(1, 'rgba(15,23,42,0.68)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = markerBg;
  roundRect(ctx, cx - 7, y + h + 4, 14, 14, 7);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.font = `900 10px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(markerIcon(marker.kind), x + 10, y + 18);
  ctx.font = `800 11px ${FONT}`;
  ctx.fillText(marker.title || markerKindLabel(marker.kind), x + 10, y + 34);
}

function drawStoryTopViewMap(
  ctx: CanvasRenderingContext2D,
  event: ExhibitionEvent,
  cat: ExhibitionBoothCategory,
  x: number,
  y: number,
  w: number,
  preferredCell: number,
  gap: number,
  logoImages: Map<string, HTMLImageElement>,
): number {
  const cols = topViewFloorCols(cat.boothCount);
  const cell = Math.max(preferredCell, Math.floor((w - 96 - (cols - 1) * gap) / cols));
  const rows = Math.ceil(cat.boothCount / cols);
  const floorX = x + 24;
  const floorY = y + 92;
  const floorW = w - 48;
  const floorH = rows * (cell + gap) - gap + 48;
  const h = 112 + rows * (cell + gap) - gap + 56;
  const previewH = previewMapHeight(rows);
  const previewInset = 20;
  const floorPadding = 24;
  const projectY = (value: number) => {
    const normalized = ((clamp(value, 0, 100) / 100) * previewH - previewInset) / Math.max(1, previewH - previewInset * 2);
    return clamp(((floorPadding + normalized * (floorH - floorPadding * 2)) / floorH) * 100, 0, 100);
  };
  const projectHeight = (value: number) =>
    clamp(((clamp(value, 1, 100) / 100) * previewH / floorH) * 100, 1, 100);
  const reservations = event.reservations.filter(r => r.categoryId === cat.id);
  const confirmed = reservations.filter(r => r.reservationStatus === 'confirmed').length;
  const reserved = reservations.length - confirmed;
  const markers = (event.topViewMarkers ?? []).filter(marker => marker.categoryId === cat.id);
  const structures = (event.topViewStructures ?? []).filter(structure => structure.categoryId === cat.id);

  const panelGrad = ctx.createLinearGradient(x, y, x, y + h);
  panelGrad.addColorStop(0, 'rgba(255,255,255,0.105)');
  panelGrad.addColorStop(1, 'rgba(255,255,255,0.045)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, x, y, w, h, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = cat.color;
  roundRect(ctx, x + w - 32, y + 22, 14, 14, 5);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.font = `800 25px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(cat.name, x + w - 48, y + 36);
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${reservations.length}/${cat.boothCount} غرفه · قطعی ${confirmed} · رزرو ${reserved}`, x + w - 48, y + 60);
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.font = `800 12px ${FONT}`;
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('TOP VIEW HALL', x + 28, y + 36);

  ctx.fillStyle = 'rgba(147,197,253,0.82)';
  ctx.textAlign = 'center';
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('MAIN AISLE', x + w / 2, floorY - 13);

  const floorGrad = ctx.createLinearGradient(floorX, floorY, floorX + floorW, floorY + floorH);
  floorGrad.addColorStop(0, 'rgba(15,23,42,0.96)');
  floorGrad.addColorStop(1, 'rgba(30,41,59,0.72)');
  ctx.fillStyle = floorGrad;
  roundRect(ctx, floorX, floorY, floorW, floorH, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let gx = floorX + 24; gx < floorX + floorW; gx += 34) {
    ctx.beginPath();
    ctx.moveTo(gx, floorY);
    ctx.lineTo(gx, floorY + floorH);
    ctx.stroke();
  }
  for (let gy = floorY + 24; gy < floorY + floorH; gy += 34) {
    ctx.beginPath();
    ctx.moveTo(floorX, gy);
    ctx.lineTo(floorX + floorW, gy);
    ctx.stroke();
  }

  structures
    .filter(structure => structure.kind === 'pavilion')
    .forEach(structure => drawTopViewStructure(ctx, {
      ...structure,
      y: projectY(structure.y),
      height: projectHeight(structure.height),
    }, floorX, floorY, floorW, floorH));

  const gridX = floorX + 24;
  const gridY = floorY + 24;
  for (let i = 0; i < cat.boothCount; i++) {
    const n = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = gridX + col * (cell + gap);
    const by = gridY + row * (cell + gap);
    const reservation = reservationByBooth(event, cat.id, n);
    const radius = Math.max(5, Math.floor(cell * 0.22));
    if (!reservation) {
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      roundRect(ctx, bx, by, cell, cell, radius);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = `800 ${Math.max(8, cell * 0.22)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(boothCode(cat, n), bx + cell / 2, by + cell / 2 + 3);
      continue;
    }

    const boothGrad = ctx.createLinearGradient(bx, by, bx + cell, by + cell);
    boothGrad.addColorStop(0, reservation.reservationStatus === 'reserved' ? RESERVED : cat.color);
    boothGrad.addColorStop(1, 'rgba(15,23,42,0.75)');
    ctx.fillStyle = boothGrad;
    ctx.strokeStyle = reservation.reservationStatus === 'reserved' ? 'rgba(251,146,60,0.78)' : 'rgba(52,211,153,0.58)';
    ctx.lineWidth = 1.6;
    roundRect(ctx, bx, by, cell, cell, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    const roof = Math.max(14, Math.min(38, cell * 0.52));
    roundRect(ctx, bx + (cell - roof) / 2, by + Math.max(5, cell * 0.18), roof, roof, Math.max(6, roof * 0.22));
    ctx.fill();
    const logo = logoImages.get(reservation.id);
    if (logo) {
      ctx.save();
      roundRect(ctx, bx + (cell - roof) / 2, by + Math.max(5, cell * 0.18), roof, roof, Math.max(6, roof * 0.22));
      ctx.clip();
      ctx.drawImage(logo, bx + (cell - roof) / 2, by + Math.max(5, cell * 0.18), roof, roof);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `900 ${Math.max(8, roof * 0.32)}px ${FONT}`;
      ctx.fillText(initials(reservation.companyName), bx + cell / 2, by + Math.max(5, cell * 0.18) + roof / 2 + 4);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `900 ${Math.max(7, cell * 0.17)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(boothCode(cat, n), bx + 5, by + 12);
    if (cell >= 34) {
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.font = `800 ${Math.max(8, cell * 0.18)}px ${FONT}`;
      const lines = wrapTextLines(ctx, reservation.companyName, cell - 8, 2);
      lines.forEach((line, idx) => ctx.fillText(line, bx + cell / 2, by + cell - 13 + idx * 11));
    }
  }

  structures
    .filter(structure => structure.kind !== 'pavilion')
    .forEach(structure => drawTopViewStructure(ctx, {
      ...structure,
      y: projectY(structure.y),
      height: projectHeight(structure.height),
    }, floorX, floorY, floorW, floorH));
  markers.forEach(marker => drawTopViewMarker(ctx, { ...marker, y: projectY(marker.y) }, floorX, floorY, floorW, floorH));

  ctx.fillStyle = 'rgba(147,197,253,0.7)';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('VISITOR FLOW', x + w / 2, floorY + floorH + 27);

  return y + h;
}

function categoryMapHeight(cat: ExhibitionBoothCategory, cols: number, cell: number, gap: number): number {
  return 54 + Math.ceil(cat.boothCount / cols) * (cell + gap) + 10;
}

function drawCategoryMap(
  ctx: CanvasRenderingContext2D,
  event: ExhibitionEvent,
  cat: ExhibitionBoothCategory,
  x: number,
  y: number,
  w: number,
  cell: number,
  gap: number,
): number {
  const cols = Math.max(6, Math.min(14, Math.floor((w - 40) / (cell + gap))));
  const categoryReservations = event.reservations.filter(r => r.categoryId === cat.id);
  const confirmed = categoryReservations.filter(r => r.reservationStatus === 'confirmed').length;
  const reserved = categoryReservations.length - confirmed;

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, x, y, w, categoryMapHeight(cat, cols, cell, gap), 24);
  ctx.fill();

  ctx.fillStyle = cat.color;
  roundRect(ctx, x + w - 30, y + 20, 14, 14, 4);
  ctx.fill();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `700 25px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(cat.name, x + w - 44, y + 34);
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${categoryReservations.length}/${cat.boothCount} غرفه · قطعی ${confirmed} · رزرو ${reserved}`, x + w - 44, y + 58);

  const startX = x + 20;
  let cy = y + 78;
  for (let i = 0; i < cat.boothCount; i++) {
    const n = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = startX + col * (cell + gap);
    const by = cy + row * (cell + gap);
    const reservation = reservationByBooth(event, cat.id, n);
    const fill = reservation
      ? reservation.reservationStatus === 'reserved'
        ? RESERVED
        : CONFIRMED
      : EMPTY;
    ctx.fillStyle = fill;
    roundRect(ctx, bx, by, cell, cell, Math.max(6, Math.floor(cell * 0.22)));
    ctx.fill();
    if (reservation) {
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, bx, by, cell, cell, Math.max(6, Math.floor(cell * 0.22)));
      ctx.stroke();
    }
    if (cell >= 28) {
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `700 ${Math.max(10, Math.floor(cell * 0.34))}px ${FONT}`;
      ctx.fillStyle = reservation ? '#ffffff' : '#94a3b8';
      ctx.fillText(String(n), bx + cell / 2, by + cell / 2 + Math.floor(cell * 0.13));
    }
  }
  cy += Math.ceil(cat.boothCount / cols) * (cell + gap) + 12;
  return cy;
}

export async function renderExhibitionStoryPng(
  rawEvent: ExhibitionEvent,
  options?: ExhibitionStoryRenderOptions,
): Promise<Blob> {
  const scale = Math.max(1, Math.min(4, options?.scale ?? EXHIBITION_STORY_EXPORT_SCALE));
  await ensureVazirmatnLoaded(scale);
  const event = normalizeExhibitionEvent(rawEvent);
  const W = EXHIBITION_STORY_WIDTH;
  const H = EXHIBITION_STORY_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(scale, scale);

  const bgImg = await loadBackgroundImage(event.storyBackgroundUrl || '');
  const logoImages = new Map<string, HTMLImageElement>();
  await Promise.all(
    event.reservations
      .filter(reservation => !!reservation.logoUrl?.trim())
      .slice(0, 100)
      .map(async reservation => {
        const logo = await loadBackgroundImage(reservation.logoUrl || '');
        if (logo) logoImages.set(reservation.id, logo);
      }),
  );
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.42, '#312e81');
  grad.addColorStop(1, '#0f766e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (bgImg) drawCoverImage(ctx, bgImg, W, H, Math.min(100, Math.max(0, event.storyBackgroundOpacity ?? 35)) / 100);

  const headerText = event.storyHeaderText?.trim() || '';
  const frameTop = headerText ? 100 : 72;
  const frameX = 38;
  const frameBottom = 48;
  const frameW = W - frameX * 2;
  const frameH = H - frameTop - frameBottom;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, frameX, frameTop, frameW, frameH, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  const pad = 76;
  const innerW = W - pad * 2;
  const textRight = W - pad;
  let y = headerText ? frameTop + 58 : frameTop + 54;
  const headerTitleGap = clamp(event.storyHeaderTitleGapPx ?? 12, 0, 80);
  const titleMetaGap = clamp(event.storyTitleMetaGapPx ?? 8, 0, 80);

  ctx.font = `700 30px ${FONT}`;
  if (headerText) {
    y = drawRtlWrapped(ctx, headerText, textRight, y, innerW, 40, 1, '#a5b4fc') + headerTitleGap;
  }

  ctx.font = `800 54px ${FONT}`;
  y = drawRtlWrapped(ctx, event.title || 'عنوان نمایشگاه', textRight, y, innerW, 68, 3, '#ffffff') + titleMetaGap;

  if (event.subtitle?.trim()) {
    ctx.font = `500 26px ${FONT}`;
    y = drawRtlWrapped(ctx, event.subtitle.trim(), textRight, y, innerW, 36, 2, '#c4b5fd') + titleMetaGap;
  }

  const meta: string[] = [];
  const dateStr = [event.startDate, event.endDate && event.endDate !== event.startDate ? event.endDate : '']
    .filter(Boolean)
    .map(value => eventDigits(event, value))
    .join(' — ');
  if (dateStr) meta.push(`تاریخ: ${dateStr}`);
  if (event.location) meta.push(`مکان: ${event.location}`);
  if (event.organizerName) meta.push(`برگزارکننده: ${event.organizerName}`);
  ctx.font = `400 24px ${FONT}`;
  for (const item of meta.slice(0, 3)) {
    y = drawRtlWrapped(ctx, item, textRight, y, innerW, 34, 1, '#cbd5e1') + 2;
  }

  if (event.boothFee?.trim()) {
    ctx.font = `700 28px ${FONT}`;
    y = drawRtlWrapped(
      ctx,
      `${event.boothFeeLabel || 'هزینه غرفه'}: ${eventAmountDisplay(event, event.boothFee)} ${feeCurrencyDisplay({
        courseFeeCurrency: event.boothFeeCurrency,
        courseFeeCurrencyLabel: event.boothFeeCurrencyLabel,
      })}`,
      textRight,
      y + 8,
      innerW,
      38,
      1,
      '#fde68a',
    ) + 6;
  }

  const totalBooths = event.categories.reduce((sum, c) => sum + c.boothCount, 0);
  const filled = event.reservations.length;
  const confirmed = event.reservations.filter(r => r.reservationStatus === 'confirmed').length;
  const reserved = filled - confirmed;
  const pct = totalBooths ? Math.round((filled / totalBooths) * 100) : 0;

  y += 16;
  const statGap = 14;
  const statW = (innerW - statGap * 2) / 3;
  drawStatCard(ctx, pad, y, statW, 'کل غرفه‌ها', String(totalBooths), '#ffffff');
  drawStatCard(ctx, pad + statW + statGap, y, statW, 'رزروشده', String(filled), '#fef3c7');
  drawStatCard(ctx, pad + (statW + statGap) * 2, y, statW, 'درصد تکمیل', `${pct}%`, pct >= 100 ? '#f87171' : '#67e8f9');
  y += 146;

  const barW = innerW;
  roundRect(ctx, pad, y, barW, 14, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, pad, y, (barW * Math.min(100, pct)) / 100, 14, 7);
    ctx.fillStyle = pct >= 100 ? '#f87171' : '#34d399';
    ctx.fill();
  }
  y += 44;

  drawLegend(ctx, textRight, y + 20);
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`قطعی ${confirmed} · رزرو موقت ${reserved}`, pad, y + 54);
  y += 122;

  const availableHeight = H - y - 210;
  let cell = 48;
  let gap = 8;
  let estimated = event.categories.reduce((sum, c) => sum + storyTopViewMapHeight(c, innerW, cell, gap) + 14, 0);
  if (estimated > availableHeight) {
    cell = 36;
    gap = 6;
    estimated = event.categories.reduce((sum, c) => sum + storyTopViewMapHeight(c, innerW, cell, gap) + 14, 0);
  }
  if (estimated > availableHeight) {
    cell = 26;
    gap = 5;
  }

  for (const cat of event.categories) {
    const nextY = drawStoryTopViewMap(ctx, event, cat, pad, y, innerW, cell, gap, logoImages) + 14;
    if (nextY > H - 180) break;
    y = nextY;
  }

  const footRaw = event.storyFootNote?.trim() || 'برای انتخاب و رزرو غرفه، شماره غرفه موردنظر را اعلام کنید.';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  roundRect(ctx, 56, H - 142, W - 112, 76, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
  ctx.stroke();
  ctx.font = `700 24px ${FONT}`;
  drawRtlWrapped(ctx, footRaw, W - 82, H - 96, W - 164, 32, 2, '#fef9c3');

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Export failed'))), 'image/png', 1);
  });
}

export function downloadExhibitionStory(event: ExhibitionEvent) {
  return renderExhibitionStoryPng(event).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (event.title || 'exhibition').replace(/[^\w\u0600-\u06FF.-]+/g, '_').slice(0, 40);
    a.href = url;
    a.download = `exhibition_story_8k_${safe}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
