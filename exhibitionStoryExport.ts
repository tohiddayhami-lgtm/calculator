import type { ExhibitionBoothCategory, ExhibitionEvent, ExhibitionReservation } from './types';
import { feeCurrencyDisplay, formatAmountDisplay } from './educationFormat';
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
    { label: 'خالی', color: EMPTY },
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
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.42, '#312e81');
  grad.addColorStop(1, '#0f766e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (bgImg) drawCoverImage(ctx, bgImg, W, H, Math.min(100, Math.max(0, event.storyBackgroundOpacity ?? 35)) / 100);

  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 38, 100, W - 76, H - 148, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  const pad = 76;
  const innerW = W - pad * 2;
  const textRight = W - pad;
  let y = 158;

  ctx.font = `700 30px ${FONT}`;
  y = drawRtlWrapped(ctx, 'رزرو غرفه‌های نمایشگاهی', textRight, y, innerW, 40, 1, '#a5b4fc') + 12;

  ctx.font = `800 54px ${FONT}`;
  y = drawRtlWrapped(ctx, event.title || 'عنوان نمایشگاه', textRight, y, innerW, 68, 3, '#ffffff') + 8;

  if (event.subtitle?.trim()) {
    ctx.font = `500 26px ${FONT}`;
    y = drawRtlWrapped(ctx, event.subtitle.trim(), textRight, y, innerW, 36, 2, '#c4b5fd') + 10;
  }

  const meta: string[] = [];
  const dateStr = [event.startDate, event.endDate && event.endDate !== event.startDate ? event.endDate : '']
    .filter(Boolean)
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
      `${event.boothFeeLabel || 'هزینه غرفه'}: ${formatAmountDisplay(event.boothFee)} ${feeCurrencyDisplay({
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
  let cell = 34;
  let gap = 7;
  const estimated = event.categories.reduce((sum, c) => {
    const cols = Math.max(6, Math.min(14, Math.floor((innerW - 40) / (cell + gap))));
    return sum + categoryMapHeight(c, cols, cell, gap) + 14;
  }, 0);
  if (estimated > availableHeight) {
    cell = 26;
    gap = 5;
  }

  for (const cat of event.categories) {
    const nextY = drawCategoryMap(ctx, event, cat, pad, y, innerW, cell, gap) + 14;
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
