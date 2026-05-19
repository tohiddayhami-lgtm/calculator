import type { EducationCourse, EducationParticipant } from './types';
import { currencyShort, formatAmountDisplay, formatAmountWithCurrency } from './educationFormat';

export const EDUCATION_STORY_WIDTH = 1080;
export const EDUCATION_STORY_HEIGHT = 1920;

const FONT = 'Vazirmatn, Tahoma, sans-serif';
const SEAT_GREEN = '#34d399';
const SEAT_GREEN_BORDER = '#6ee7b7';
const SEAT_ORANGE = '#fb923c';
const SEAT_ORANGE_BORDER = '#fdba74';

let vazirReady: Promise<void> | null = null;

export function ensureVazirmatnLoaded(): Promise<void> {
  if (vazirReady) return vazirReady;
  vazirReady = (async () => {
    if (!document.getElementById('vazirmatn-education-font')) {
      const link = document.createElement('link');
      link.id = 'vazirmatn-education-font';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    await Promise.all([
      document.fonts.load('400 16px Vazirmatn'),
      document.fonts.load('500 16px Vazirmatn'),
      document.fonts.load('600 16px Vazirmatn'),
      document.fonts.load('700 16px Vazirmatn'),
    ]);
  })();
  return vazirReady;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
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

function drawRtlBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  xRight: number,
  yStart: number,
  lineHeight: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  lines.forEach((ln, i) => ctx.fillText(ln, xRight, yStart + i * lineHeight));
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
  const lines = wrapTextLines(ctx, text, maxWidth, maxLines);
  drawRtlBlock(ctx, lines, xRight, y, lineHeight, color);
  return y + lines.length * lineHeight;
}

async function loadBackgroundImage(url: string): Promise<HTMLImageElement | null> {
  if (!url?.trim()) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  opacity: number,
) {
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

function participantBySeat(course: EducationCourse, seatNum: number): EducationParticipant | undefined {
  return course.participants.find(p => p.seatNumber === seatNum);
}

/** Auto font size + line wrap for seat cell; returns lines and font size used. */
function fitSeatNameLines(
  ctx: CanvasRenderingContext2D,
  p: EducationParticipant,
  maxW: number,
  maxH: number,
): { lines: string[]; fontSize: number } {
  const first = (p.firstName || '').trim();
  const last = (p.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  const candidates: string[][] = [
    last && first ? [first, last] : [full],
    [full],
    last ? [last] : [first],
  ];

  for (let fontSize = 15; fontSize >= 9; fontSize--) {
    ctx.font = `600 ${fontSize}px ${FONT}`;
    const lh = fontSize + 2;
    for (const lines of candidates) {
      const filtered = lines.filter(Boolean);
      if (!filtered.length) continue;
      const tooWide = filtered.some(ln => ctx.measureText(ln).width > maxW);
      if (tooWide) continue;
      if (filtered.length * lh <= maxH) return { lines: filtered, fontSize };
    }
    const wrapped = wrapTextLines(ctx, full, maxW, 3);
    if (wrapped.length && wrapped.length * lh <= maxH) {
      return { lines: wrapped, fontSize };
    }
  }
  ctx.font = `600 9px ${FONT}`;
  return { lines: [full.slice(0, 8) + (full.length > 8 ? '…' : '')], fontSize: 9 };
}

function drawSeatName(
  ctx: CanvasRenderingContext2D,
  p: EducationParticipant,
  sx: number,
  sy: number,
  seatSize: number,
  numArea: number,
) {
  const pad = 4;
  const maxW = seatSize - pad * 2;
  const maxH = seatSize - numArea - pad;
  const { lines, fontSize } = fitSeatNameLines(ctx, p, maxW, maxH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const lh = fontSize + 2;
  const blockH = lines.length * lh;
  let ty = sy + numArea + (maxH - blockH) / 2 + fontSize;
  for (const ln of lines) {
    ctx.fillText(ln, sx + seatSize / 2, ty);
    ty += lh;
  }
}

/** Draw Instagram story (1080×1920); returns PNG blob. */
export async function renderEducationStoryPng(course: EducationCourse): Promise<Blob> {
  await ensureVazirmatnLoaded();

  const W = EDUCATION_STORY_WIDTH;
  const H = EDUCATION_STORY_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const filled = course.participants.length;
  const cap = Math.max(1, course.seatCapacity);
  const pct = Math.min(100, Math.round((filled / cap) * 100));
  const confirmed = course.participants.filter(p => p.registrationStatus === 'confirmed').length;
  const reserved = filled - confirmed;

  const bgImg = await loadBackgroundImage(course.storyBackgroundUrl || '');
  const imgOpacity = Math.min(100, Math.max(0, course.storyBackgroundOpacity ?? 40)) / 100;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (bgImg) drawCoverImage(ctx, bgImg, W, H, imgOpacity);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(0, 0, W, H);

  const pad = 64;
  const innerW = W - pad * 2;
  const cardX = 40;
  const cardY = 56;
  const cardW = W - 80;
  let contentY = cardY + 36;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, cardX, cardY, cardW, H - cardY - 48, 32);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, H - cardY - 48, 32);
  ctx.stroke();

  const textRight = W - pad - 24;

  ctx.font = `600 28px ${FONT}`;
  drawRtlWrapped(ctx, 'دوره آموزشی', textRight, contentY, innerW - 48, 36, 1, '#a5b4fc');
  contentY += 44;

  ctx.font = `700 48px ${FONT}`;
  contentY = drawRtlWrapped(ctx, course.title || 'بدون عنوان', textRight, contentY, innerW - 48, 56, 2, '#ffffff') + 8;

  if (course.instructorName) {
    ctx.font = `500 30px ${FONT}`;
    contentY = drawRtlWrapped(ctx, `استاد: ${course.instructorName}`, textRight, contentY, innerW - 48, 38, 1, '#e2e8f0') + 4;
  }

  if (course.courseFee?.trim()) {
    const feeFmt = formatAmountDisplay(course.courseFee);
    ctx.font = `600 32px ${FONT}`;
    contentY =
      drawRtlWrapped(
        ctx,
        `شهریه: ${feeFmt} ${currencyShort(course.courseFeeCurrency)}`,
        textRight,
        contentY,
        innerW - 48,
        40,
        1,
        '#fde68a',
      ) + 8;
  }

  const meta: string[] = [];
  const dateStr = [course.startDate, course.endDate && course.endDate !== course.startDate ? course.endDate : '']
    .filter(Boolean)
    .join(' — ');
  if (dateStr) meta.push(`تاریخ: ${dateStr}`);
  if (course.location) meta.push(`مکان: ${course.location}`);
  if (meta.length) {
    ctx.font = `400 26px ${FONT}`;
    for (const m of meta) {
      contentY = drawRtlWrapped(ctx, m, textRight, contentY, innerW - 48, 34, 1, '#94a3b8') + 4;
    }
  }

  if (course.instructorResume?.trim()) {
    contentY += 8;
    ctx.font = `600 26px ${FONT}`;
    drawRtlBlock(ctx, ['رزومه استاد'], textRight, contentY, 32, '#e2e8f0');
    contentY += 36;
    ctx.font = `400 22px ${FONT}`;
    contentY = drawRtlWrapped(ctx, course.instructorResume.trim(), textRight, contentY, innerW - 48, 30, 3, '#94a3b8') + 8;
  }

  const syllabus = course.syllabus.map(s => s.text).filter(Boolean).slice(0, 3);
  if (syllabus.length) {
    ctx.font = `600 26px ${FONT}`;
    drawRtlBlock(ctx, ['سرفصل‌ها'], textRight, contentY, 32, '#e2e8f0');
    contentY += 36;
    ctx.font = `400 22px ${FONT}`;
    for (const item of syllabus) {
      contentY = drawRtlWrapped(ctx, `• ${item}`, textRight, contentY, innerW - 48, 30, 2, '#94a3b8') + 4;
      if (contentY > 720) break;
    }
  }

  const gridTop = Math.max(contentY + 20, 680);
  const cols = cap <= 15 ? 5 : cap <= 35 ? 7 : cap <= 55 ? 9 : 10;
  const gap = 12;
  const seatSize = Math.min(
    cap <= 15 ? 128 : cap <= 35 ? 96 : 80,
    Math.floor((innerW - gap * (cols - 1)) / cols),
  );
  const rows = Math.ceil(cap / cols);
  const gridW = cols * seatSize + (cols - 1) * gap;
  const gridH = rows * seatSize + (rows - 1) * gap;
  const gridX = (W - gridW) / 2;
  const gridY = gridTop;

  for (let i = 0; i < cap; i++) {
    const seatNum = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = gridX + col * (seatSize + gap);
    const sy = gridY + row * (seatSize + gap);
    const p = participantBySeat(course, seatNum);
    const isReserved = p?.registrationStatus === 'reserved';

    if (p) {
      ctx.fillStyle = isReserved ? SEAT_ORANGE : SEAT_GREEN;
      roundRect(ctx, sx, sy, seatSize, seatSize, 12);
      ctx.fill();
      ctx.strokeStyle = isReserved ? SEAT_ORANGE_BORDER : SEAT_GREEN_BORDER;
      ctx.lineWidth = 2;
      roundRect(ctx, sx, sy, seatSize, seatSize, 12);
      ctx.stroke();

      const numSize = Math.max(13, Math.min(18, seatSize * 0.18));
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `700 ${numSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(String(seatNum), sx + seatSize / 2, sy + numSize + 6);
      drawSeatName(ctx, p, sx, sy, seatSize, numSize + 10);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, sx, sy, seatSize, seatSize, 12);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `600 ${Math.max(14, seatSize * 0.22)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(String(seatNum), sx + seatSize / 2, sy + seatSize / 2 + 6);
    }
  }

  const statsY = Math.min(gridY + gridH + 36, H - 200);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 56px ${FONT}`;
  ctx.fillText(`${filled} / ${cap}`, W / 2, statsY);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = pct >= 100 ? '#f87171' : '#c4b5fd';
  ctx.fillText(pct >= 100 ? 'ظرفیت تکمیل شد' : `${pct}% اشغال`, W / 2, statsY + 44);
  if (filled > 0) {
    ctx.font = `400 24px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`قطعی: ${confirmed}  ·  رزرو: ${reserved}`, W / 2, statsY + 76);
  }

  const barW = innerW - 100;
  const barY = statsY + 96;
  roundRect(ctx, (W - barW) / 2, barY, barW, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, (W - barW) / 2, barY, (barW * pct) / 100, 12, 6);
    ctx.fillStyle = pct >= 100 ? '#f87171' : SEAT_GREEN;
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.font = `400 22px ${FONT}`;
  const legY = H - 80;
  ctx.fillStyle = SEAT_GREEN;
  roundRect(ctx, textRight - 300, legY - 16, 20, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('سبز = ثبت‌نام قطعی', textRight - 272, legY);
  ctx.fillStyle = SEAT_ORANGE;
  roundRect(ctx, textRight - 300, legY + 14, 20, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('نارنجی = رزرو موقت — نام کامل روی صندلی', textRight - 272, legY + 30);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Export failed'))),
      'image/png',
      1,
    );
  });
}

export function downloadEducationStory(course: EducationCourse) {
  return renderEducationStoryPng(course).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (course.title || 'course').replace(/[^\w\u0600-\u06FF.-]+/g, '_').slice(0, 40);
    a.href = url;
    a.download = `education_story_${safe}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
