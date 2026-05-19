import type { EducationCourse, EducationParticipant } from './types';

export const EDUCATION_STORY_WIDTH = 1080;
export const EDUCATION_STORY_HEIGHT = 1920;

const SEAT_GREEN = '#34d399';
const SEAT_GREEN_BORDER = '#6ee7b7';
const SEAT_ORANGE = '#fb923c';
const SEAT_ORANGE_BORDER = '#fdba74';

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
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
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const last = shown[shown.length - 1];
    shown[shown.length - 1] = last.length > 3 ? `${last.slice(0, -3)}…` : '…';
  }
  shown.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
  return y + shown.length * lineHeight;
}

function participantBySeat(course: EducationCourse, seatNum: number): EducationParticipant | undefined {
  return course.participants.find(p => p.seatNumber === seatNum);
}

function seatDisplayName(p: EducationParticipant, maxLen: number): string {
  const full = `${p.firstName} ${p.lastName}`.trim();
  if (full.length <= maxLen) return full;
  const short = `${p.firstName}\n${p.lastName}`.trim();
  if (short.replace('\n', ' ').length <= maxLen + 2) {
    return `${p.firstName}\n${p.lastName}`;
  }
  return full.slice(0, maxLen - 1) + '…';
}

function drawSeatName(
  ctx: CanvasRenderingContext2D,
  p: EducationParticipant,
  cx: number,
  cy: number,
  maxW: number,
  fontSize: number,
) {
  const label = seatDisplayName(p, 12);
  const lines = label.split('\n');
  ctx.fillStyle = '#0f172a';
  ctx.font = `600 ${fontSize}px Vazirmatn, Tahoma, sans-serif`;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const lh = fontSize + 2;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    let t = ln;
    while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
    ctx.fillText(t, cx, startY + i * lh);
  });
}

/** Draw Instagram story (1080×1920) seat map + course info; returns PNG blob. */
export async function renderEducationStoryPng(course: EducationCourse): Promise<Blob> {
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

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.45, '#1e1b4b');
  bg.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, 48, 48, W - 96, H - 96, 40);
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  let y = 110;
  const pad = 72;
  const innerW = W - pad * 2;

  ctx.fillStyle = '#a5b4fc';
  ctx.font = '600 30px Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  ctx.fillText('دوره آموزشی', W - pad, y);
  y += 46;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  y = wrapText(ctx, course.title || 'بدون عنوان', W - pad, y, innerW, 58, 2) + 12;

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 32px Vazirmatn, Tahoma, sans-serif';
  if (course.instructorName) {
    ctx.fillText(`استاد: ${course.instructorName}`, W - pad, y);
    y += 42;
  }

  if (course.courseFee?.trim()) {
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 34px Vazirmatn, Tahoma, sans-serif';
    const feeLabel = `هزینه دوره: ${course.courseFee.trim()} ${course.courseFeeCurrency || 'OMR'}`;
    ctx.fillText(feeLabel, W - pad, y);
    y += 44;
  }

  const dateStr = [course.startDate, course.endDate && course.endDate !== course.startDate ? course.endDate : '']
    .filter(Boolean)
    .join(' — ');
  if (dateStr) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 28px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText(`تاریخ: ${dateStr}`, W - pad, y);
    y += 38;
  }
  if (course.location) {
    ctx.fillText(`مکان: ${course.location}`, W - pad, y);
    y += 38;
  }

  if (course.instructorResume?.trim()) {
    y += 8;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText('رزومه استاد', W - pad, y);
    y += 36;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 24px Vazirmatn, Tahoma, sans-serif';
    y = wrapText(ctx, course.instructorResume.trim(), W - pad, y, innerW, 32, 3) + 8;
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 28px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText('سرفصل‌ها', W - pad, y);
  y += 36;
  ctx.font = '400 24px Vazirmatn, Tahoma, sans-serif';
  ctx.fillStyle = '#94a3b8';
  const syllabus = course.syllabus.map(s => s.text).filter(Boolean).slice(0, 4);
  for (const item of syllabus) {
    y = wrapText(ctx, `• ${item}`, W - pad, y, innerW - 16, 32, 2) + 6;
    if (y > 680) break;
  }

  const gridTop = Math.max(y + 16, 700);
  const cols = cap <= 20 ? 5 : cap <= 40 ? 8 : cap <= 60 ? 10 : 12;
  const rows = Math.ceil(cap / cols);
  const gap = 10;
  const maxGridW = innerW;
  const seatSize = Math.min(cap <= 20 ? 120 : cap <= 40 ? 88 : 72, Math.floor((maxGridW - gap * (cols - 1)) / cols));
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
    const isTaken = Boolean(p);
    const isReserved = p?.registrationStatus === 'reserved';

    if (isTaken) {
      ctx.fillStyle = isReserved ? SEAT_ORANGE : SEAT_GREEN;
      roundRect(ctx, sx, sy, seatSize, seatSize, 10);
      ctx.fill();
      ctx.strokeStyle = isReserved ? SEAT_ORANGE_BORDER : SEAT_GREEN_BORDER;
      ctx.lineWidth = 2;
      roundRect(ctx, sx, sy, seatSize, seatSize, 10);
      ctx.stroke();

      const numSize = Math.max(14, Math.min(20, seatSize * 0.22));
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${numSize}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(String(seatNum), sx + seatSize / 2, sy + numSize + 4);

      const nameSize = Math.max(11, Math.min(16, seatSize * 0.16));
      drawSeatName(ctx, p!, sx + seatSize / 2, sy + seatSize / 2 + (seatSize > 80 ? 8 : 4), seatSize - 8, nameSize);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, sx, sy, seatSize, seatSize, 10);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${Math.max(16, seatSize * 0.28)}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(String(seatNum), sx + seatSize / 2, sy + seatSize / 2 + 6);
    }
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
  }

  const statsY = Math.min(gridY + gridH + 40, H - 220);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText(`${filled} / ${cap}`, W / 2, statsY);

  ctx.font = '500 30px Vazirmatn, Tahoma, sans-serif';
  ctx.fillStyle = pct >= 100 ? '#f87171' : '#a5b4fc';
  const statusLabel = pct >= 100 ? 'ظرفیت تکمیل شد' : `${pct}% اشغال`;
  ctx.fillText(statusLabel, W / 2, statsY + 46);

  if (filled > 0) {
    ctx.font = '400 26px Vazirmatn, Tahoma, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`قطعی: ${confirmed}  ·  رزرو: ${reserved}`, W / 2, statsY + 82);
  }

  const barW = innerW - 80;
  const barH = 14;
  const barX = (W - barW) / 2;
  const barY = statsY + 100;
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, barX, barY, (barW * pct) / 100, barH, 8);
    ctx.fillStyle = pct >= 100 ? '#f87171' : '#34d399';
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = 'rgba(148,163,184,0.95)';
  ctx.font = '400 24px Vazirmatn, Tahoma, sans-serif';
  const legendY = H - 88;
  ctx.fillStyle = SEAT_GREEN;
  roundRect(ctx, W - pad - 280, legendY - 18, 22, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('سبز = ثبت‌نام قطعی', W - pad - 248, legendY);

  ctx.fillStyle = SEAT_ORANGE;
  roundRect(ctx, W - pad - 280, legendY + 18, 22, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('نارنجی = رزرو موقت (نام روی صندلی)', W - pad - 248, legendY + 36);

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
