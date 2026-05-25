import type {
  ExhibitionBoothCategory,
  ExhibitionEvent,
  ExhibitionReservation,
  ExhibitionTopViewMarker,
  ExhibitionTopViewStructure,
} from './types';
import { toPersianDigits } from './educationFormat';
import { boothCode, normalizeExhibitionEvent } from './exhibitionNormalize';

type PublicReservationEndpoint = {
  firebaseConfig: any;
  appId: string;
  ownerId: string;
  eventId: string;
  eventTitle: string;
  publicKey: string;
};

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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function normalizeUrl(raw: string | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(p => p[0]).join('') || 'EX').toUpperCase();
}

function searchText(r: ExhibitionReservation, c?: ExhibitionBoothCategory): string {
  return [r.companyName, r.contactName, r.city, r.products, r.phone, c?.name].join(' ');
}

function boothData(r: ExhibitionReservation, c: ExhibitionBoothCategory) {
  return {
    id: r.id,
    boothCode: boothCode(c, r.boothNumber),
    companyName: r.companyName,
    contactName: r.contactName,
    phone: r.phone,
    city: r.city,
    products: r.products,
    logoUrl: r.logoUrl || '',
    storeUrl: normalizeUrl(r.storeUrl),
    hallName: c.name,
    hallDescription: c.description,
    hallColor: c.color,
    status: r.reservationStatus === 'reserved' ? 'Reserved' : 'Confirmed',
  };
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

function hexToRgba(hex: string, opacity: number): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#38bdf8';
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.min(100, Math.max(0, opacity)) / 100})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function linkBoothHeight(boothSize: number): number {
  return clamp(boothSize * 1.45, 88, 112);
}

function previewMapHeight(rows: number): number {
  return Math.max(260, rows * 24 + 68);
}

function projectPreviewYPercent(yPercent: number, rows: number, boothHeight: number, gap: number): number {
  const previewH = previewMapHeight(rows);
  const previewInset = 20;
  const linkPadding = 24;
  const linkH = rows * boothHeight + Math.max(0, rows - 1) * gap + linkPadding * 2;
  const normalized = ((clamp(yPercent, 0, 100) / 100) * previewH - previewInset) / Math.max(1, previewH - previewInset * 2);
  return clamp(((linkPadding + normalized * (linkH - linkPadding * 2)) / linkH) * 100, 0, 100);
}

function projectPreviewHeightPercent(heightPercent: number, rows: number, boothHeight: number, gap: number): number {
  const previewH = previewMapHeight(rows);
  const linkPadding = 24;
  const linkH = rows * boothHeight + Math.max(0, rows - 1) * gap + linkPadding * 2;
  return clamp(((clamp(heightPercent, 1, 100) / 100) * previewH / linkH) * 100, 1, 100);
}

export function buildExhibitionTopViewHtml(rawEvent: ExhibitionEvent, publicReservationEndpoint?: PublicReservationEndpoint | null): string {
  const event = normalizeExhibitionEvent(rawEvent);
  const totalBooths = event.categories.reduce((sum, c) => sum + c.boothCount, 0);
  const confirmed = event.reservations.filter(r => r.reservationStatus === 'confirmed').length;
  const openBooths = Math.max(0, totalBooths - event.reservations.length);
  const pct = totalBooths ? Math.round((event.reservations.length / totalBooths) * 100) : 0;
  const background = event.storyBackgroundUrl?.trim()
    ? `background-image:linear-gradient(135deg,rgba(2,6,23,.92),rgba(30,27,75,.78),rgba(12,74,110,.78)),url('${escapeAttr(event.storyBackgroundUrl)}');`
    : '';

  const byBooth = new Map<string, ExhibitionReservation>();
  event.reservations.forEach(r => byBooth.set(`${r.categoryId}:${r.boothNumber}`, r));

  const payloads = event.reservations
    .map(r => {
      const category = event.categories.find(c => c.id === r.categoryId);
      return category ? boothData(r, category) : null;
    })
    .filter(Boolean);
  const dataJson = JSON.stringify(payloads)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  const reserveConfigJson = publicReservationEndpoint
    ? JSON.stringify(publicReservationEndpoint).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    : 'null';

  const hallButtons = event.categories.map(c => {
    const count = event.reservations.filter(r => r.categoryId === c.id).length;
    return `<button class="hall-filter" data-filter="${escapeAttr(c.id)}" style="--hall:${escapeAttr(c.color)}"><span>${escapeHtml(c.name)}</span><b>${count}/${c.boothCount}</b></button>`;
  }).join('');

  const hallMaps = event.categories.map(category => {
    const cols = topViewFloorCols(category.boothCount);
    const boothSize = category.boothCount > 100 ? 58 : 72;
    const gridGap = 12;
    const rows = Math.ceil(category.boothCount / cols);
    const boothHeight = linkBoothHeight(boothSize);
    const floorMinWidth = cols * boothSize + (cols - 1) * gridGap + 48;
    const markers = (event.topViewMarkers ?? []).filter(marker => marker.categoryId === category.id);
    const structures = (event.topViewStructures ?? []).filter(structure => structure.categoryId === category.id);
    const structureHtml = structures.map(structure => {
      const style = [
        `left:${Math.min(100, Math.max(0, structure.x))}%`,
        `top:${projectPreviewYPercent(structure.y, rows, boothHeight, gridGap)}%`,
        `width:${Math.min(300, Math.max(1, structure.width))}%`,
        `height:${Math.min(300, Math.max(1, structure.height))}%`,
        `--structure:${escapeAttr(structure.color || '#38bdf8')}`,
        `--structure-bg:${escapeAttr(hexToRgba(structure.color || '#38bdf8', structure.opacity))}`,
      ].join(';');
      return `<span class="map-structure ${escapeAttr(structure.kind)}" style="${style}" title="${escapeAttr(structure.description || structure.title)}">
        <b>${escapeHtml(structure.title || structureKindLabel(structure.kind))}</b>
        ${structure.kind === 'pavilion' && structure.description ? `<small>${escapeHtml(structure.description)}</small>` : ''}
      </span>`;
    }).join('');
    const markerHtml = markers.map(marker => {
      const content = `<span class="marker-icon">${escapeHtml(markerIcon(marker.kind))}</span><span><b>${escapeHtml(marker.title || markerKindLabel(marker.kind))}</b>${marker.description ? `<small>${escapeHtml(marker.description)}</small>` : ''}</span>`;
      const markerColor = marker.color || '#22d3ee';
      const markerOpacity = typeof marker.opacity === 'number' ? marker.opacity : 88;
      const style = `left:${Math.min(100, Math.max(0, marker.x))}%;top:${projectPreviewYPercent(marker.y, rows, boothHeight, gridGap)}%;--marker:${escapeAttr(markerColor)};--marker-bg:${escapeAttr(hexToRgba(markerColor, markerOpacity))}`;
      const href = marker.url ? normalizeUrl(marker.url) : '';
      return href
        ? `<a class="map-marker ${escapeAttr(marker.kind)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" style="${style}">${content}</a>`
        : `<span class="map-marker ${escapeAttr(marker.kind)}" style="${style}">${content}</span>`;
    }).join('');
    const boothCells = Array.from({ length: category.boothCount }, (_, i) => {
      const num = i + 1;
      const reservation = byBooth.get(`${category.id}:${num}`);
      const code = boothCode(category, num);
      if (!reservation) {
        return `<button
          class="top-booth empty reservable"
          data-hall="${escapeAttr(category.id)}"
          data-category-id="${escapeAttr(category.id)}"
          data-category-name="${escapeAttr(category.name)}"
          data-booth-number="${num}"
          data-booth-code="${escapeAttr(code)}"
          style="--hall:${escapeAttr(category.color)}"
          title="${escapeAttr(`${code} - available for temporary reservation`)}"
        ><span class="booth-num">${escapeHtml(code)}</span><span class="reserve-hint">Reserve</span></button>`;
      }
      const data = boothData(reservation, category);
      const logo = data.logoUrl
        ? `<img src="${escapeAttr(data.logoUrl)}" alt="${escapeAttr(data.companyName)} logo" loading="lazy" />`
        : `<span class="initials">${escapeHtml(initials(data.companyName))}</span>`;
      return `<button
        class="top-booth occupied ${reservation.reservationStatus === 'reserved' ? 'reserved' : 'confirmed'}"
        data-booth-id="${escapeAttr(reservation.id)}"
        data-hall="${escapeAttr(category.id)}"
        data-search="${escapeAttr(searchText(reservation, category).toLowerCase())}"
        style="--hall:${escapeAttr(category.color)}"
        title="${escapeAttr(`${code} - ${reservation.companyName}`)}"
      >
        <span class="booth-num">${escapeHtml(code)}</span>
        <span class="brand-roof">${logo}</span>
        <span class="brand-name">${escapeHtml(reservation.companyName)}</span>
      </button>`;
    }).join('');
    return `<section class="hall-scene" data-hall="${escapeAttr(category.id)}" style="--hall:${escapeAttr(category.color)}">
      <div class="hall-title">
        <div>
          <p>Exhibition Hall</p>
          <h2>${escapeHtml(category.name)}</h2>
          <span>${escapeHtml(category.description || 'Interactive top-view booth plan')}</span>
        </div>
        <strong>${event.reservations.filter(r => r.categoryId === category.id).length}/${category.boothCount}</strong>
      </div>
      <div class="aisle-label">MAIN AISLE</div>
      <div class="floor-scroll"><div class="top-floor" style="--floor-cols:${cols};--booth-size:${boothSize}px;--booth-height:${boothHeight}px;--floor-min:${floorMinWidth}px">${structureHtml}${boothCells}${markerHtml}</div></div>
      <div class="aisle-label bottom">VISITOR FLOW</div>
    </section>`;
  }).join('');

  const cards = event.reservations.map(r => {
    const category = event.categories.find(c => c.id === r.categoryId);
    if (!category) return '';
    const data = boothData(r, category);
    const logo = data.logoUrl
      ? `<img src="${escapeAttr(data.logoUrl)}" alt="${escapeAttr(data.companyName)} logo" loading="lazy" />`
      : `<span>${escapeHtml(initials(data.companyName))}</span>`;
    return `<article class="brand-card" data-hall="${escapeAttr(category.id)}" data-search="${escapeAttr(searchText(r, category).toLowerCase())}" style="--hall:${escapeAttr(category.color)}">
      <div class="brand-logo">${logo}</div>
      <div class="brand-copy">
        <span>${escapeHtml(data.boothCode)} · ${escapeHtml(category.name)}</span>
        <h3>${escapeHtml(r.companyName)}</h3>
        <p>${r.products ? escapeHtml(r.products) : 'Product information will be announced soon.'}</p>
      </div>
      <button class="note-btn" data-booth-id="${escapeAttr(r.id)}">Open note</button>
    </article>`;
  }).join('');

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(event.title || 'Online Exhibition Hall')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--line:rgba(255,255,255,.14);--muted:#94a3b8;--text:#f8fafc;--cyan:#22d3ee;--violet:#8b5cf6;--green:#34d399;--orange:#fb923c}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at 12% 0,rgba(34,211,238,.18),transparent 32%),radial-gradient(circle at 88% 4%,rgba(139,92,246,.28),transparent 34%),linear-gradient(135deg,#020617,#0f172a 52%,#111827);color:var(--text)}button,input{font:inherit}button{cursor:pointer}a{color:inherit}.hero{position:relative;padding:42px 18px 36px;background-size:cover;background-position:center;${background}}.hero:before{content:"";position:absolute;inset:auto -12% -34% -12%;height:300px;background:linear-gradient(90deg,rgba(34,211,238,.28),rgba(139,92,246,.28),rgba(52,211,153,.17));filter:blur(50px)}.wrap{position:relative;width:min(1240px,100%);margin:0 auto}.badge{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(196,181,253,.35);background:rgba(88,28,135,.33);color:#ddd6fe;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(16px)}
.hero-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:28px;align-items:end;margin-top:30px}.hero h1{margin:0;font-size:clamp(38px,7vw,86px);line-height:.96;letter-spacing:-.075em;font-weight:900}.hero .lead{max-width:780px;color:#dbeafe;font-size:clamp(16px,2.1vw,22px);line-height:1.65;margin:18px 0 0}.meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.meta span{border:1px solid var(--line);background:rgba(15,23,42,.58);border-radius:16px;padding:10px 13px;color:#e2e8f0;font-size:13px}.stats-panel{border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.055));border-radius:34px;padding:20px;box-shadow:0 28px 90px rgba(0,0,0,.24);backdrop-filter:blur(22px)}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.stat{border:1px solid rgba(255,255,255,.11);background:rgba(2,6,23,.28);border-radius:24px;padding:18px}.stat b{display:block;font-size:36px;line-height:1}.stat span{display:block;color:#cbd5e1;font-size:12px;margin-top:8px;text-transform:uppercase;letter-spacing:.08em}.capacity{margin-top:14px;height:12px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.capacity i{display:block;height:100%;width:${Math.min(100, pct)}%;background:linear-gradient(90deg,var(--green),var(--cyan),var(--violet));border-radius:inherit}
.controls{position:sticky;top:0;z-index:30;border-block:1px solid var(--line);background:rgba(2,6,23,.78);backdrop-filter:blur(20px)}.controls-inner{width:min(1240px,100%);margin:0 auto;padding:14px 18px;display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:12px;align-items:center}.search{width:100%;border:1px solid var(--line);background:rgba(15,23,42,.72);color:#fff;border-radius:18px;padding:13px 16px;outline:none}.hall-filters{display:flex;gap:8px;overflow:auto;padding-bottom:2px}.hall-filter{white-space:nowrap;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#cbd5e1;border-radius:999px;padding:10px 13px;font-weight:800}.hall-filter b{margin-left:8px;color:var(--hall)}.hall-filter.active{background:linear-gradient(135deg,var(--hall),rgba(255,255,255,.15));color:#fff;border-color:rgba(255,255,255,.32)}
.section{width:min(1240px,100%);margin:0 auto;padding:30px 18px}.section-title{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}.section-title h2{margin:0;font-size:30px;letter-spacing:-.035em}.section-title p{margin:7px 0 0;color:var(--muted);font-size:14px;line-height:1.65}.legend{display:flex;gap:10px;flex-wrap:wrap;color:#cbd5e1;font-size:12px}.legend span{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);border-radius:999px;padding:7px 10px}.dot{width:10px;height:10px;border-radius:999px;background:var(--dot)}
.hall-scene{position:relative;margin-bottom:24px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.045));border-radius:36px;padding:18px 18px 24px;box-shadow:0 34px 110px rgba(0,0,0,.25);overflow:hidden}.hall-scene:before{content:"";position:absolute;inset:-25% auto auto -15%;width:320px;height:320px;background:var(--hall);opacity:.18;filter:blur(90px)}.hall-title{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 2px 14px}.hall-title p{margin:0;color:var(--hall);font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.hall-title h2{margin:4px 0 0;font-size:26px}.hall-title span{display:block;color:var(--muted);font-size:13px;margin-top:5px}.hall-title strong{font-size:30px}.aisle-label{text-align:center;color:#93c5fd;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;opacity:.8;margin-bottom:10px}.aisle-label.bottom{margin:12px 0 0}
.floor-scroll{position:relative;overflow:auto;padding-bottom:4px}.top-floor{position:relative;display:grid;grid-template-columns:repeat(var(--floor-cols,8),minmax(var(--booth-size,72px),1fr));gap:12px;min-width:var(--floor-min,100%);padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:30px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,41,59,.66)),repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 34px),repeating-linear-gradient(0deg,rgba(255,255,255,.028) 0 1px,transparent 1px 34px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.045)}
.map-structure{position:absolute;left:50%;top:50%;z-index:3;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;transform:translate(-50%,-50%);border:1px solid var(--structure);background:var(--structure-bg);color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.55);pointer-events:none}.map-structure b{font-size:11px;line-height:1.15;letter-spacing:.02em}.map-structure small{display:block;margin-top:5px;font-size:9px;color:rgba(255,255,255,.82);line-height:1.25}.map-structure.pavilion{z-index:1;border-style:dashed;border-width:2px;border-radius:24px;padding:10px;text-transform:uppercase}.map-structure.divider{z-index:5;border-radius:999px;box-shadow:0 0 0 5px rgba(255,255,255,.04),0 12px 30px rgba(0,0,0,.24)}.map-structure.column{z-index:5;border-radius:18px;min-width:28px;min-height:28px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.14),0 14px 36px rgba(0,0,0,.28)}
.map-marker{position:absolute;z-index:9;display:inline-flex;align-items:center;gap:8px;max-width:190px;min-width:112px;transform:translate(-50%,-50%);text-decoration:none;color:#fff;border:1px solid rgba(255,255,255,.34);background:linear-gradient(135deg,var(--marker-bg,var(--marker)),rgba(15,23,42,.64));border-radius:18px;padding:9px 11px;box-shadow:0 16px 40px rgba(0,0,0,.24),0 0 0 6px rgba(255,255,255,.035);backdrop-filter:blur(8px)}.map-marker:after{content:"";position:absolute;left:50%;bottom:-10px;width:16px;height:16px;background:var(--marker-bg,var(--marker));border:2px solid rgba(255,255,255,.72);border-radius:999px;transform:translateX(-50%)}.map-marker .marker-icon{display:grid;place-items:center;min-width:38px;height:28px;border-radius:11px;background:rgba(255,255,255,.22);font-size:10px;font-weight:900;letter-spacing:.06em}.map-marker b{display:block;font-size:12px;line-height:1.15}.map-marker small{display:block;margin-top:3px;color:rgba(255,255,255,.76);font-size:10px;line-height:1.25}.map-marker.ad{min-width:150px;border-radius:12px;text-transform:uppercase}.map-marker.conference{border-style:dashed}.map-marker.exit{background:linear-gradient(135deg,var(--marker-bg,var(--marker)),rgba(5,46,22,.62))}
.top-booth{position:relative;z-index:2;min-height:var(--booth-height,clamp(88px,calc(var(--booth-size,72px) * 1.45),112px));border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:8px;background:rgba(255,255,255,.055);color:#64748b;overflow:hidden;transform:perspective(800px) rotateX(7deg);transition:.2s ease}.top-booth.empty{cursor:pointer}.top-booth.empty:hover{z-index:5;color:#e0f2fe;border-color:rgba(34,211,238,.42);background:rgba(34,211,238,.08);transform:perspective(800px) rotateX(0deg) translateY(-3px)}.reserve-hint{position:absolute;left:8px;right:8px;bottom:10px;font-size:10px;font-weight:900;color:#93c5fd;text-transform:uppercase;letter-spacing:.08em}.top-booth.occupied{background:linear-gradient(145deg,var(--hall),rgba(15,23,42,.72));color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 18px 44px rgba(0,0,0,.25)}.top-booth.confirmed{outline:1px solid rgba(52,211,153,.36)}.top-booth.reserved{outline:1px solid rgba(251,146,60,.55)}.top-booth.public-pending{background:linear-gradient(145deg,#f97316,rgba(15,23,42,.72));color:#fff;outline:1px solid rgba(251,146,60,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 18px 44px rgba(0,0,0,.25)}.top-booth.occupied:hover{z-index:6;transform:perspective(800px) rotateX(0deg) translateY(-4px);box-shadow:0 24px 55px rgba(0,0,0,.3)}.booth-num{position:absolute;top:8px;left:8px;font-size:10px;font-weight:900;color:rgba(255,255,255,.85);font-family:ui-monospace,Menlo,monospace}.brand-roof{position:absolute;top:24px;left:50%;width:min(48px,calc(100% - 34px));aspect-ratio:1/1;transform:translateX(-50%);border-radius:14px;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;color:#0f172a;font-weight:900;font-size:16px;box-shadow:inset 0 0 0 1px rgba(15,23,42,.08);overflow:hidden}.brand-roof img{width:100%;height:100%;object-fit:contain;border-radius:inherit;padding:3px}.brand-name{position:absolute;left:6px;right:6px;bottom:7px;font-size:11px;font-weight:900;line-height:1.12;text-align:center;background:rgba(15,23,42,.48);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:3px 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 1px 8px rgba(0,0,0,.45)}.top-booth.public-pending .brand-name{bottom:25px}
.brand-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.brand-card{position:relative;display:grid;grid-template-columns:78px 1fr;gap:14px;align-items:center;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.052));border-radius:28px;padding:16px;overflow:hidden}.brand-card:before{content:"";position:absolute;inset:-60% auto auto -20%;width:220px;height:220px;background:var(--hall);opacity:.18;filter:blur(70px)}.brand-logo{position:relative;width:78px;height:78px;border-radius:22px;background:#fff;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:22px;font-weight:900;overflow:hidden}.brand-logo img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.brand-copy{position:relative;min-width:0}.brand-copy span{display:block;color:#c4b5fd;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.brand-copy h3{margin:5px 0 4px;font-size:20px;line-height:1.25}.brand-copy p{margin:0;color:#cbd5e1;font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.note-btn{position:relative;grid-column:1/-1;border:0;border-radius:16px;background:linear-gradient(135deg,var(--hall),#22d3ee);color:#fff;padding:11px 13px;font-weight:900}.hidden{display:none!important}.empty-state{border:1px dashed rgba(255,255,255,.22);border-radius:26px;padding:40px;text-align:center;color:#94a3b8;background:rgba(255,255,255,.035)}
.modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.74);backdrop-filter:blur(14px)}.modal.open{display:flex}.note,.reserve-card{position:relative;width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(15,23,42,.9));border-radius:34px;padding:22px;box-shadow:0 35px 120px rgba(0,0,0,.45);overflow:hidden}.reserve-card{width:min(760px,100%);max-height:calc(100vh - 36px);overflow-y:auto;scrollbar-width:thin}.note:before,.reserve-card:before{content:"";position:absolute;inset:-35% auto auto -18%;width:260px;height:260px;background:var(--noteHall,#22d3ee);opacity:.22;filter:blur(80px)}.note-head{position:relative;display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:center}.note-logo{width:72px;height:72px;border-radius:20px;background:#fff;color:#0f172a;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;overflow:hidden}.note-logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit;padding:4px}.note h3,.reserve-card h3{margin:0;font-size:24px;line-height:1.15}.note .note-sub,.reserve-card .note-sub{margin:6px 0 0;color:#c4b5fd;font-size:12px;font-weight:800;line-height:1.55}.close{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:14px;width:38px;height:38px;flex:0 0 auto}.note-body{position:relative;margin-top:18px}.note-body p{color:#dbeafe;line-height:1.75}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.chips span{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:999px;padding:7px 10px;color:#cbd5e1;font-size:12px}.enter-store{display:flex;justify-content:center;text-decoration:none;border-radius:18px;background:linear-gradient(135deg,var(--noteHall,#22d3ee),#8b5cf6);padding:14px 16px;font-weight:900;margin-top:18px}.disabled-store{display:block;text-align:center;border-radius:18px;background:rgba(255,255,255,.07);color:#94a3b8;padding:14px 16px;font-weight:800;margin-top:18px}.reserve-head{position:sticky;top:-22px;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:-22px -22px 0;padding:18px 22px 12px;background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(15,23,42,.88));backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.08)}.reserve-form{position:relative;margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 10px}.reserve-form label{display:grid;gap:5px;color:#cbd5e1;font-size:10px;font-weight:900;text-transform:none;letter-spacing:.03em}.reserve-form label.wide,.reserve-status,.reserve-actions{grid-column:1/-1}.reserve-form input,.reserve-form textarea{width:100%;border:1px solid rgba(255,255,255,.16);background:rgba(2,6,23,.48);color:#fff;border-radius:13px;padding:9px 11px;outline:none;font-size:13px}.reserve-form textarea{min-height:58px;resize:vertical}.reserve-form input:focus,.reserve-form textarea:focus{border-color:#22d3ee;box-shadow:0 0 0 4px rgba(34,211,238,.1)}.reserve-actions{display:flex;gap:10px;margin-top:2px}.reserve-submit{flex:1;border:0;border-radius:15px;background:linear-gradient(135deg,#f97316,#22d3ee);color:#fff;padding:12px 14px;font-weight:900}.reserve-submit:disabled{opacity:.55;cursor:not-allowed}.reserve-status{color:#bfdbfe;font-size:12px;line-height:1.6;min-height:18px;margin:0}.footer{padding:28px 18px 46px;text-align:center;color:#64748b;font-size:12px}
@media(max-width:980px){.hero-grid{grid-template-columns:1fr}.controls-inner{grid-template-columns:1fr}.brand-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.modal{align-items:flex-end;padding:10px}.reserve-card{max-height:88vh;border-radius:24px 24px 18px 18px;padding:16px}.reserve-head{top:-16px;margin:-16px -16px 0;padding:14px 16px 10px}.reserve-form{grid-template-columns:1fr}.reserve-form input,.reserve-form textarea{font-size:12px;padding:8px 10px}.reserve-form textarea{min-height:52px}.reserve-card h3{font-size:19px}.stats{grid-template-columns:repeat(2,1fr)}.section-title{display:block}.top-floor{gap:10px;padding:14px}.top-booth{min-height:92px}.brand-grid{grid-template-columns:1fr}.note-head{grid-template-columns:58px 1fr auto;gap:10px}.note-logo{width:58px;height:58px;border-radius:16px}.note h3{font-size:21px}.hero h1{font-size:42px}}
</style>
</head>
<body>
<main>
  <header class="hero"><div class="wrap"><span class="badge">Interactive Top-View Exhibition</span><div class="hero-grid"><div><h1>${escapeHtml(event.title || 'Online Exhibition Hall')}</h1><p class="lead">${event.subtitle ? escapeHtml(event.subtitle) : 'Explore the exhibition from above, discover reserved booths, and enter each exhibitor store or catalog.'}</p><div class="meta">${event.location ? `<span>Location: ${escapeHtml(event.location)}</span>` : ''}${event.startDate ? `<span>Date: ${escapeHtml(eventDigits(event, event.startDate))}${event.endDate && event.endDate !== event.startDate ? ` - ${escapeHtml(eventDigits(event, event.endDate))}` : ''}</span>` : ''}${event.organizerName ? `<span>Organizer: ${escapeHtml(event.organizerName)}</span>` : ''}</div></div><aside class="stats-panel"><div class="stats"><div class="stat"><b>${totalBooths}</b><span>Total booths</span></div><div class="stat"><b>${event.reservations.length}</b><span>Reserved booths</span></div><div class="stat"><b>${confirmed}</b><span>Confirmed</span></div><div class="stat"><b>${openBooths}</b><span>Open spaces</span></div></div><div class="capacity"><i></i></div></aside></div></div></header>
  <nav class="controls"><div class="controls-inner"><input id="search" class="search" type="search" placeholder="Search companies, products, halls, city, contact..." /><div class="hall-filters"><button class="hall-filter active" data-filter="all" style="--hall:#22d3ee"><span>All halls</span><b>${event.reservations.length}</b></button>${hallButtons}</div></div></nav>
  <section class="section"><div class="section-title"><div><h2>Top-View Exhibition Floor</h2><p>Click any branded booth to open a smart exhibitor note. Logos are placed on booth roofs so foreign visitors can scan the hall like a real exhibition map.</p></div><div class="legend"><span><i class="dot" style="--dot:#34d399"></i>Confirmed</span><span><i class="dot" style="--dot:#fb923c"></i>Reserved</span><span><i class="dot" style="--dot:#64748b"></i>Open</span></div></div>${hallMaps}</section>
  <section class="section"><div class="section-title"><div><h2>Exhibitor Notes</h2><p>Each note gives buyers a quick overview of the exhibitor, products, booth location, and direct store link.</p></div></div><div id="brandGrid" class="brand-grid">${cards || '<div class="empty-state">No reserved exhibitors yet.</div>'}</div><div id="empty" class="empty-state hidden">No exhibitors match your filter.</div></section>
  <footer class="footer">Generated by Tohid Dayhami Export+ Exhibition</footer>
</main>
<div id="modal" class="modal" aria-hidden="true"><article id="note" class="note"><div class="note-head"><div id="noteLogo" class="note-logo"></div><div><h3 id="noteCompany"></h3><p id="noteSub" class="note-sub"></p></div><button id="closeModal" class="close" type="button" aria-label="Close">x</button></div><div class="note-body"><p id="noteProducts"></p><div id="noteChips" class="chips"></div><div id="noteAction"></div></div></article></div>
<div id="reserveModal" class="modal" aria-hidden="true"><article class="reserve-card" dir="rtl"><div class="reserve-head"><div><h3>رزرو موقت غرفه / Temporary Booth Reservation</h3><p id="reserveSub" class="note-sub">غرفه را انتخاب کنید و اطلاعات را برای بررسی ارسال کنید. / Choose a booth and send details for review.</p></div><button id="closeReserve" class="close" type="button" aria-label="Close">x</button></div><form id="reserveForm" class="reserve-form"><label>نام کسب‌وکار / Business name *<input name="companyName" required maxlength="120" placeholder="نام شرکت یا برند / Company or brand" /></label><label>نام مسئول / Contact person *<input name="contactName" required maxlength="120" placeholder="نام و نام خانوادگی / Full name" /></label><label>تلفن یا واتساپ / Phone or WhatsApp *<input name="phone" required maxlength="80" dir="ltr" placeholder="+968..." /></label><label>ایمیل / Email<input name="email" maxlength="140" dir="ltr" placeholder="name@example.com" /></label><label>شهر / کشور - City / Country<input name="city" maxlength="120" placeholder="Muscat, Oman / مسقط، عمان" /></label><label>نوع فعالیت / Activity type *<input name="activityType" required maxlength="160" placeholder="مواد غذایی، ماشین‌آلات... / Food, machinery..." /></label><label>وب‌سایت یا کاتالوگ / Website or catalog<input name="website" maxlength="300" dir="ltr" placeholder="https://..." /></label><label class="wide">محصولات و توضیح درخواست / Products and request details *<textarea name="products" required maxlength="1000" placeholder="چه محصول یا خدماتی را می‌خواهید ارائه کنید؟ / What do you want to exhibit?"></textarea></label><label class="wide">توضیحات اضافه / Extra notes<textarea name="notes" maxlength="1000" placeholder="نیازهای غرفه، زمان‌بندی، توضیح بیشتر... / Booth needs, timing, more details..."></textarea></label><p id="reserveStatus" class="reserve-status"></p><div class="reserve-actions"><button id="reserveSubmit" class="reserve-submit" type="submit">ارسال رزرو موقت / Send Temporary Reservation</button></div></form></article></div>
<script>
window.__EXHIBITION_BOOTHS__=${dataJson};
window.__EXHIBITION_RESERVE__=${reserveConfigJson};
(function(){var booths=window.__EXHIBITION_BOOTHS__||[];var byId={};booths.forEach(function(b){byId[b.id]=b;});var currentReserve=null;var filter='all';var search='';var pills=[].slice.call(document.querySelectorAll('.hall-filter'));var boothEls=[].slice.call(document.querySelectorAll('.top-booth.occupied'));var cards=[].slice.call(document.querySelectorAll('.brand-card'));var halls=[].slice.call(document.querySelectorAll('.hall-scene'));var empty=document.getElementById('empty');var modal=document.getElementById('modal');var note=document.getElementById('note');var reserveModal=document.getElementById('reserveModal');var reserveForm=document.getElementById('reserveForm');var reserveStatus=document.getElementById('reserveStatus');function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c;});}function initials(name){return String(name||'EX').trim().split(/\\s+/).slice(0,2).map(function(p){return p[0]||'';}).join('').toUpperCase()||'EX';}function refreshBooths(){boothEls=[].slice.call(document.querySelectorAll('.top-booth.occupied,.top-booth.public-pending'));}function apply(){var visible=0;function show(el){var hallOk=filter==='all'||el.getAttribute('data-hall')===filter;var text=(el.getAttribute('data-search')||'').toLowerCase();return hallOk&&(!search||text.indexOf(search)>-1);}refreshBooths();boothEls.forEach(function(el){el.classList.toggle('hidden',!show(el));});cards.forEach(function(el){var s=show(el);el.classList.toggle('hidden',!s);if(s)visible++;});halls.forEach(function(h){h.classList.toggle('hidden',!(filter==='all'||h.getAttribute('data-hall')===filter));});if(empty)empty.classList.toggle('hidden',visible!==0);}function markPending(pub){var selector='.top-booth.empty[data-category-id="'+String(pub.categoryId||'').replace(/"/g,'\\\\"')+'"][data-booth-number="'+String(pub.boothNumber||'').replace(/"/g,'\\\\"')+'"]';var el=document.querySelector(selector);if(!el||el.classList.contains('occupied'))return;el.classList.remove('empty','reservable');el.classList.add('public-pending');el.setAttribute('data-search',String([pub.companyName,pub.boothCode,'temporary reserved'].join(' ')).toLowerCase());el.innerHTML='<span class="booth-num">'+esc(pub.boothCode||el.getAttribute('data-booth-code')||'')+'</span><span class="brand-name">'+esc(pub.companyName||'Temporary reservation')+'</span><span class="reserve-hint">Temporary</span>';refreshBooths();}window.__applyPublicReservations=function(items){(items||[]).forEach(markPending);apply();};function openReserve(el){if(!window.__EXHIBITION_RESERVE__){alert('رزرو آنلاین برای این لینک فعال نیست. / Online reservation is not enabled for this link.');return;}currentReserve={categoryId:el.getAttribute('data-category-id')||'',categoryName:el.getAttribute('data-category-name')||'',boothNumber:Number(el.getAttribute('data-booth-number')||0),boothCode:el.getAttribute('data-booth-code')||''};document.getElementById('reserveSub').textContent='غرفه / Booth '+currentReserve.boothCode+' · '+currentReserve.categoryName+' · درخواست رزرو موقت / Temporary request';if(reserveStatus)reserveStatus.textContent='';if(reserveForm)reserveForm.reset();reserveModal.classList.add('open');reserveModal.setAttribute('aria-hidden','false');}function openNote(id){var b=byId[id];if(!b||!modal||!note)return;note.style.setProperty('--noteHall',b.hallColor||'#22d3ee');document.getElementById('noteCompany').textContent=b.companyName||'Exhibitor';document.getElementById('noteSub').textContent=(b.boothCode||'')+' · '+(b.hallName||'Exhibition Hall')+' · '+(b.status||'Reserved');document.getElementById('noteProducts').textContent=b.products||'Product details will be announced soon.';var logo=document.getElementById('noteLogo');logo.innerHTML=b.logoUrl?'<img src="'+String(b.logoUrl).replace(/"/g,'&quot;')+'" alt="Logo" />':'<span>'+initials(b.companyName)+'</span>';var chips=document.getElementById('noteChips');chips.innerHTML='';[b.city?'Origin: '+b.city:'',b.contactName?'Contact: '+b.contactName:'',b.phone?'Phone: '+b.phone:'',b.hallDescription?b.hallDescription:''].filter(Boolean).forEach(function(x){var span=document.createElement('span');span.textContent=x;chips.appendChild(span);});var action=document.getElementById('noteAction');action.innerHTML=b.storeUrl?'<a class="enter-store" target="_blank" rel="noopener noreferrer" href="'+String(b.storeUrl).replace(/"/g,'&quot;')+'">Enter Store / Catalog</a>':'<span class="disabled-store">Store link coming soon</span>';modal.classList.add('open');modal.setAttribute('aria-hidden','false');}pills.forEach(function(btn){btn.addEventListener('click',function(){filter=btn.getAttribute('data-filter')||'all';pills.forEach(function(x){x.classList.toggle('active',x===btn);});apply();});});var searchInput=document.getElementById('search');if(searchInput)searchInput.addEventListener('input',function(){search=(searchInput.value||'').trim().toLowerCase();apply();});document.addEventListener('click',function(e){var target=e.target;var trigger=target.closest&&target.closest('[data-booth-id]');if(trigger){openNote(trigger.getAttribute('data-booth-id'));return;}var reserveTrigger=target.closest&&target.closest('[data-booth-code].reservable');if(reserveTrigger){openReserve(reserveTrigger);return;}if(target===modal||target.id==='closeModal'){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}if(target===reserveModal||target.id==='closeReserve'){reserveModal.classList.remove('open');reserveModal.setAttribute('aria-hidden','true');}});document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(modal)modal.classList.remove('open');if(reserveModal)reserveModal.classList.remove('open');}});if(reserveForm)reserveForm.addEventListener('submit',async function(e){e.preventDefault();if(!currentReserve||!window.__submitPublicReservation)return;var fd=new FormData(reserveForm);var payload={categoryId:currentReserve.categoryId,categoryName:currentReserve.categoryName,boothNumber:currentReserve.boothNumber,boothCode:currentReserve.boothCode,companyName:String(fd.get('companyName')||'').trim(),contactName:String(fd.get('contactName')||'').trim(),phone:String(fd.get('phone')||'').trim(),email:String(fd.get('email')||'').trim(),city:String(fd.get('city')||'').trim(),activityType:String(fd.get('activityType')||'').trim(),products:String(fd.get('products')||'').trim(),website:String(fd.get('website')||'').trim(),notes:String(fd.get('notes')||'').trim()};if(!payload.companyName||!payload.contactName||!payload.phone||!payload.activityType||!payload.products){reserveStatus.textContent='لطفاً فیلدهای ضروری را کامل کنید. / Please complete the required fields.';return;}var submit=document.getElementById('reserveSubmit');submit.disabled=true;reserveStatus.textContent='در حال ارسال درخواست... / Sending request...';try{await window.__submitPublicReservation(payload);markPending(payload);reserveStatus.textContent='رزرو موقت ارسال شد. برگزارکننده برای تأیید با شما تماس می‌گیرد. / Request sent. The organizer will contact you to confirm.';setTimeout(function(){reserveModal.classList.remove('open');},1600);}catch(err){console.error(err);reserveStatus.textContent='ارسال انجام نشد. دوباره تلاش کنید یا با برگزارکننده تماس بگیرید. / Could not submit. Please try again.';}finally{submit.disabled=false;}});apply();})();
</script>
${publicReservationEndpoint ? `<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
const cfg = window.__EXHIBITION_RESERVE__;
try {
  const app = initializeApp(cfg.firebaseConfig, 'exhibition-reserve-' + Date.now());
  const db = getFirestore(app);
  const publicCol = collection(db, 'publicExhibitionReservations', cfg.publicKey, 'items');
  onSnapshot(publicCol, snap => {
    const items = [];
    snap.forEach(doc => {
      const data = doc.data() || {};
      if (data.status === 'reserved') items.push(data);
    });
    if (window.__applyPublicReservations) window.__applyPublicReservations(items);
  });
  window.__submitPublicReservation = async function(payload) {
    const pub = {
      eventId: cfg.eventId,
      appId: cfg.appId,
      ownerUserId: cfg.ownerId,
      categoryId: payload.categoryId,
      boothNumber: Number(payload.boothNumber) || 0,
      boothCode: String(payload.boothCode || '').slice(0, 40),
      companyName: String(payload.companyName || '').slice(0, 120),
      status: 'reserved',
      createdAt: serverTimestamp()
    };
    const pubRef = await addDoc(publicCol, pub);
    await addDoc(collection(db, 'artifacts', cfg.appId, 'users', cfg.ownerId, 'exhibitionReservationRequests'), {
      ...payload,
      eventId: cfg.eventId,
      eventTitle: cfg.eventTitle || '',
      publicKey: cfg.publicKey,
      publicReservationId: pubRef.id,
      reviewStatus: 'new',
      createdAt: serverTimestamp()
    });
  };
} catch (err) {
  console.error('Reservation module failed:', err);
}
</script>` : ''}
</body>
</html>`;
}
