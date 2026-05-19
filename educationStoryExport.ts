import type { EducationCourse, EducationParticipant } from './types';
import { feeCurrencyDisplay, formatAmountDisplay } from './educationFormat';
import { normalizeEducationCourse } from './educationNormalize';
import { resolveStoryTypography, storyLineHeight } from './educationStoryTypography';

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
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load('400 16px Vazirmatn').catch(() => undefined),
        document.fonts.load('500 16px Vazirmatn').catch(() => undefined),
        document.fonts.load('600 16px Vazirmatn').catch(() => undefined),
        document.fonts.load('700 16px Vazirmatn').catch(() => undefined),
      ]);
    }
  })();
  return vazirReady;
}

/** Legend rows to the left of the seat grid — one connected RTL line per status. */
function drawSeatLegendBesideGrid(
  ctx: CanvasRenderingContext2D,
  gridX: number,
  gridY: number,
  gridH: number,
  legendFontSize: number,
) {
  const textSize = Math.max(14, legendFontSize - 1);
  const sw = 16;
  const swatchTextGap = 10;
  const rowStep = Math.max(44, textSize + sw + 14);
  const gapFromGrid = 64;

  const items: { label: string; color: string }[] = [
    { label: 'ثبت‌نام قطعی', color: SEAT_GREEN },
    { label: 'رزرو موقت', color: SEAT_ORANGE },
  ];

  ctx.save();
  ctx.font = `500 ${textSize}px ${FONT}`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const maxLabelW = Math.max(
    ...items.map(it => ctx.measureText(it.label).width),
    textSize * 4,
  );
  const legendRight = gridX - gapFromGrid;
  const legendLeft = Math.max(28, legendRight - maxLabelW - sw - swatchTextGap);
  const blockH = (items.length - 1) * rowStep;
  let rowY = gridY + (gridH - blockH) / 2;

  for (const item of items) {
    const swatchX = legendRight - sw;
    const swatchY = rowY - sw / 2;
    ctx.fillStyle = item.color;
    roundRect(ctx, swatchX, swatchY, sw, sw, 4);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(item.label, swatchX - swatchTextGap, rowY);
    rowY += rowStep;
  }

  ctx.restore();
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

/** Split resume/bio by line breaks; each line drawn separately (linear). */
function splitLinearLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}

function drawRtlLinearLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  xRight: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
): number {
  const rawLines = splitLinearLines(text);
  const lines: string[] = [];
  for (const raw of rawLines) {
    const wrapped = wrapTextLines(ctx, raw, maxWidth, 4);
    lines.push(...wrapped);
  }
  if (!lines.length) return y;
  drawRtlBlock(ctx, lines, xRight, y, lineHeight, color);
  return y + lines.length * lineHeight;
}

async function loadBackgroundImage(url: string): Promise<HTMLImageElement | null> {
  if (!url?.trim()) return null;
  return new Promise(resolve => {
    const img = new Image();
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img);
      else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = trimmed;
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

/** Circular crop portrait (instructor) */
function drawCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  r: number,
) {
  if (!img.width || !img.height || !Number.isFinite(r) || r <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const scale = (2 * r) / Math.min(img.width, img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = cx - dw / 2;
  const dy = cy - dh / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
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
export async function renderEducationStoryPng(rawCourse: EducationCourse): Promise<Blob> {
  await ensureVazirmatnLoaded();

  const course = normalizeEducationCourse({
    ...rawCourse,
    syllabus: rawCourse.syllabus ?? [],
    participants: rawCourse.participants ?? [],
  });

  const W = EDUCATION_STORY_WIDTH;
  const H = EDUCATION_STORY_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const typo = resolveStoryTypography(course);

  const filled = course.participants.length;
  const cap = Math.max(1, course.seatCapacity);
  const pct = Math.min(100, Math.round((filled / cap) * 100));
  const confirmed = course.participants.filter(p => p.registrationStatus === 'confirmed').length;
  const reserved = filled - confirmed;

  const [bgImg, instructorFace] = await Promise.all([
    loadBackgroundImage(course.storyBackgroundUrl || ''),
    loadBackgroundImage(course.instructorPhotoUrl || ''),
  ]);
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

  ctx.font = `600 ${typo.badge}px ${FONT}`;
  drawRtlWrapped(
    ctx,
    'دوره آموزشی',
    textRight,
    contentY,
    innerW - 48,
    storyLineHeight(typo.badge),
    1,
    '#a5b4fc',
  );
  contentY += storyLineHeight(typo.badge) + 8;

  ctx.font = `700 ${typo.title}px ${FONT}`;
  contentY =
    drawRtlWrapped(
      ctx,
      course.title || 'بدون عنوان',
      textRight,
      contentY,
      innerW - 48,
      storyLineHeight(typo.title),
      typo.titleMaxLines,
      '#ffffff',
    ) + 8;

  /** When instructor photo exists, fee/meta use this column so text does not run under the portrait */
  let bodyTextRight = textRight;
  let bodyMaxW = innerW - 48;

  if (course.instructorName?.trim() || instructorFace) {
    const photoR = 44;
    const photoGap = 20;
    const photoColW = photoR * 2 + photoGap;
    const baseY = contentY;

    if (instructorFace) {
      bodyTextRight = textRight - photoColW;
      bodyMaxW = innerW - 48 - photoColW;
    }

    const label =
      course.instructorName?.trim() ? `استاد: ${course.instructorName.trim()}` : instructorFace ? 'استاد' : '';

    if (instructorFace) {
      const rowH = photoR * 2 + 12;
      const cx = textRight - photoR;
      const cy = baseY + photoR + 4;
      drawCircleImage(ctx, instructorFace, cx, cy, photoR);

      if (label) {
        ctx.font = `500 ${typo.instructor}px ${FONT}`;
        const lines = wrapTextLines(ctx, label, bodyMaxW, 3);
        const lnH = storyLineHeight(typo.instructor);
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'right';
        ctx.direction = 'rtl';
        const textBlockH = lines.length * lnH;
        let textY = baseY + Math.max(28, (rowH - textBlockH) / 2 + 22);
        for (const ln of lines) {
          ctx.fillText(ln, bodyTextRight, textY);
          textY += lnH;
        }
      }

      // Full row height + gap; fee baseline must clear photo (glyphs extend above baseline)
      contentY = baseY + rowH + 28;
    } else if (label) {
      ctx.font = `500 ${typo.instructor}px ${FONT}`;
      contentY =
        drawRtlWrapped(
          ctx,
          label,
          textRight,
          baseY + 8,
          innerW - 48,
          storyLineHeight(typo.instructor),
          2,
          '#e2e8f0',
        ) + 12;
    }
  }

  if (course.courseFee?.trim()) {
    const feeFmt = formatAmountDisplay(course.courseFee);
    ctx.font = `600 ${typo.fee}px ${FONT}`;
    contentY =
      drawRtlWrapped(
        ctx,
        `شهریه: ${feeFmt} ${feeCurrencyDisplay(course)}`,
        bodyTextRight,
        contentY,
        bodyMaxW,
        storyLineHeight(typo.fee),
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
    ctx.font = `400 ${typo.meta}px ${FONT}`;
    for (const m of meta) {
      contentY =
        drawRtlWrapped(ctx, m, bodyTextRight, contentY, bodyMaxW, storyLineHeight(typo.meta), 1, '#94a3b8') + 4;
    }
  }

  if (course.instructorResume?.trim()) {
    contentY += 8;
    ctx.font = `600 ${typo.sectionHeading}px ${FONT}`;
    drawRtlBlock(ctx, ['رزومه استاد'], textRight, contentY, storyLineHeight(typo.sectionHeading), '#e2e8f0');
    contentY += storyLineHeight(typo.sectionHeading) + 8;
    ctx.font = `400 ${typo.body}px ${FONT}`;
    contentY =
      drawRtlLinearLines(
        ctx,
        course.instructorResume.trim(),
        textRight,
        contentY,
        innerW - 48,
        storyLineHeight(typo.body),
        '#94a3b8',
      ) + 8;
  }

  const vips = (course.vipGuests ?? []).filter(g => g.fullName?.trim());
  if (vips.length) {
    contentY += 6;
    ctx.font = `600 ${typo.vipHeading}px ${FONT}`;
    drawRtlBlock(ctx, ['مهمانان VIP'], textRight, contentY, storyLineHeight(typo.vipHeading), '#fcd34d');
    contentY += storyLineHeight(typo.vipHeading) + 8;
    for (const g of vips) {
      ctx.font = `600 ${typo.vipName}px ${FONT}`;
      contentY =
        drawRtlWrapped(
          ctx,
          g.fullName.trim(),
          textRight,
          contentY,
          innerW - 48,
          storyLineHeight(typo.vipName),
          2,
          '#fef9c3',
        ) + 4;
      if (g.resume?.trim()) {
        ctx.font = `400 ${typo.vipBody}px ${FONT}`;
        contentY =
          drawRtlLinearLines(
            ctx,
            g.resume.trim(),
            textRight,
            contentY,
            innerW - 52,
            storyLineHeight(typo.vipBody),
            '#cbd5e1',
          ) + 8;
      }
      contentY += 4;
    }
  }

  const syllabus = course.syllabus.map(s => s.text.trim()).filter(Boolean);
  const syllabusFont = syllabus.length > 8 ? Math.max(16, typo.syllabusItem - 2) : typo.syllabusItem;
  const syllabusLh = storyLineHeight(syllabusFont);
  if (syllabus.length) {
    contentY += 4;
    ctx.font = `600 ${typo.syllabusHeading}px ${FONT}`;
    drawRtlBlock(ctx, ['سرفصل‌ها'], textRight, contentY, storyLineHeight(typo.syllabusHeading), '#e2e8f0');
    contentY += storyLineHeight(typo.syllabusHeading) + 8;
    ctx.font = `400 ${syllabusFont}px ${FONT}`;
    for (const item of syllabus) {
      contentY =
        drawRtlWrapped(ctx, `• ${item}`, textRight, contentY, innerW - 48, syllabusLh, 2, '#94a3b8') + 4;
    }
  }

  const footerReserve = 220;
  const cols = cap <= 15 ? 5 : cap <= 35 ? 7 : cap <= 55 ? 9 : 10;
  const gap = 12;
  let seatSize = Math.min(
    cap <= 15 ? 128 : cap <= 35 ? 96 : 80,
    Math.floor((innerW - gap * (cols - 1)) / cols),
  );
  const rows = Math.ceil(cap / cols);
  let gridH = rows * seatSize + (rows - 1) * gap;
  let gridTop = contentY + 20;
  const maxGridTop = H - footerReserve - gridH;
  if (gridTop > maxGridTop) gridTop = Math.max(contentY + 12, maxGridTop);
  if (gridTop + gridH > H - footerReserve) {
    const maxH = H - footerReserve - gridTop;
    seatSize = Math.max(48, Math.floor((maxH - (rows - 1) * gap) / rows));
    gridH = rows * seatSize + (rows - 1) * gap;
  }
  const gridW = cols * seatSize + (cols - 1) * gap;
  const legendColW = 168;
  const gridX = pad + legendColW + Math.max(16, (innerW - legendColW - gridW) / 2);
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

  drawSeatLegendBesideGrid(ctx, gridX, gridY, gridH, typo.legend);

  const statsY = Math.min(gridY + gridH + 36, H - 200);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${typo.statsMain}px ${FONT}`;
  ctx.fillText(`${filled} / ${cap}`, W / 2, statsY);
  ctx.font = `500 ${typo.statsSub}px ${FONT}`;
  ctx.fillStyle = pct >= 100 ? '#f87171' : '#c4b5fd';
  ctx.fillText(pct >= 100 ? 'ظرفیت تکمیل شد' : `${pct}% اشغال`, W / 2, statsY + storyLineHeight(typo.statsSub));
  if (filled > 0) {
    ctx.font = `400 ${typo.statsDetail}px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      `قطعی: ${confirmed}  ·  رزرو: ${reserved}`,
      W / 2,
      statsY + storyLineHeight(typo.statsSub) + storyLineHeight(typo.statsDetail),
    );
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

  const legY = H - 80;
  const footRaw = course.storyFootNote?.trim() ?? '';
  if (footRaw) {
    const align = course.storyFootNoteAlign ?? 'center';
    const fontSize = typo.footNote;
    const boxW = W - 72;
    const padX = 20;
    const padY = 16;
    const boxX = 36;
    const textMaxW = boxW - padX * 2;
    ctx.font = `700 ${fontSize}px ${FONT}`;
    const footLines = wrapTextLines(ctx, footRaw, textMaxW, 6);
    const lineH = Math.round(fontSize * 1.35);
    const boxH = padY * 2 + footLines.length * lineH;
    const boxY = Math.max(barY + 16, Math.min(barY + 28, legY - boxH - 32));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 2;
    roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.stroke();

    ctx.fillStyle = '#fef9c3';
    ctx.direction = 'rtl';
    const textX =
      align === 'left' ? boxX + padX : align === 'center' ? boxX + boxW / 2 : boxX + boxW - padX;
    ctx.textAlign = align === 'left' ? 'left' : align === 'center' ? 'center' : 'right';
    let footTextY = boxY + padY + fontSize;
    for (const ln of footLines) {
      ctx.fillText(ln, textX, footTextY);
      footTextY += lineH;
    }
  }

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
