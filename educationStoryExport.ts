import type { EducationCourse } from './types';

export const EDUCATION_STORY_WIDTH = 1080;
export const EDUCATION_STORY_HEIGHT = 1920;

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

  let y = 120;
  const pad = 80;
  const innerW = W - pad * 2;

  ctx.fillStyle = '#a5b4fc';
  ctx.font = '600 32px Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  ctx.fillText('دوره آموزشی', W - pad, y);
  y += 52;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  y = wrapText(ctx, course.title || 'بدون عنوان', W - pad, y, innerW, 64, 3) + 16;

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 36px Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  const instructor = course.instructorName ? `استاد: ${course.instructorName}` : '';
  if (instructor) {
    ctx.fillText(instructor, W - pad, y);
    y += 48;
  }

  const dateStr = [course.startDate, course.endDate && course.endDate !== course.startDate ? course.endDate : '']
    .filter(Boolean)
    .join(' — ');
  if (dateStr) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 32px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText(`تاریخ: ${dateStr}`, W - pad, y);
    y += 44;
  }
  if (course.location) {
    ctx.fillText(`مکان: ${course.location}`, W - pad, y);
    y += 44;
  }

  y += 12;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 34px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText('سرفصل‌ها', W - pad, y);
  y += 44;
  ctx.font = '400 28px Vazirmatn, Tahoma, sans-serif';
  ctx.fillStyle = '#94a3b8';
  const syllabus = course.syllabus.map(s => s.text).filter(Boolean).slice(0, 5);
  for (const item of syllabus) {
    y = wrapText(ctx, `• ${item}`, W - pad, y, innerW - 20, 38, 2) + 8;
    if (y > 720) break;
  }

  const gridTop = Math.max(y + 24, 780);
  const cols = cap <= 30 ? 6 : cap <= 60 ? 8 : 10;
  const rows = Math.ceil(cap / cols);
  const gap = 14;
  const maxGridW = innerW;
  const seatSize = Math.min(72, Math.floor((maxGridW - gap * (cols - 1)) / cols));
  const gridW = cols * seatSize + (cols - 1) * gap;
  const gridH = rows * seatSize + (rows - 1) * gap;
  const gridX = (W - gridW) / 2;
  const gridY = gridTop;

  const taken = new Set(course.participants.map(p => p.seatNumber));

  for (let i = 0; i < cap; i++) {
    const seatNum = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = gridX + col * (seatSize + gap);
    const sy = gridY + row * (seatSize + gap);
    const isTaken = taken.has(seatNum);
    ctx.fillStyle = isTaken ? '#34d399' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, sx, sy, seatSize, seatSize, 10);
    ctx.fill();
    if (isTaken) {
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 2;
      roundRect(ctx, sx, sy, seatSize, seatSize, 10);
      ctx.stroke();
    }
    ctx.fillStyle = isTaken ? '#064e3b' : '#64748b';
    ctx.font = `bold ${Math.max(18, seatSize * 0.38)}px Vazirmatn, Tahoma, sans-serif`;
    ctx.textAlign = 'center';
    ctx.direction = 'ltr';
    ctx.fillText(String(seatNum), sx + seatSize / 2, sy + seatSize / 2 + 8);
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
  }

  const statsY = gridY + gridH + 48;
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText(`${filled} / ${cap}`, W / 2, statsY);

  ctx.font = '500 36px Vazirmatn, Tahoma, sans-serif';
  ctx.fillStyle = pct >= 100 ? '#f87171' : '#a5b4fc';
  const statusLabel = pct >= 100 ? 'ظرفیت تکمیل شد' : `${pct}% ثبت‌نام`;
  ctx.fillText(statusLabel, W / 2, statsY + 52);

  const barW = innerW - 120;
  const barH = 16;
  const barX = (W - barW) / 2;
  const barY = statsY + 88;
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
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.font = '400 26px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText('صندلی‌های سبز = ثبت‌نام قطعی', W - pad, H - 72);

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
