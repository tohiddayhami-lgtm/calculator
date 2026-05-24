import type { ExhibitionBoothCategory, ExhibitionEvent, ExhibitionReservation, ExhibitionTopViewMarker } from './types';
import { boothCode, normalizeExhibitionEvent } from './exhibitionNormalize';

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

function topViewFloorCols(boothCount: number): number {
  if (boothCount <= 20) return 5;
  if (boothCount <= 48) return 8;
  return Math.min(16, Math.max(10, Math.ceil(Math.sqrt(boothCount * 1.35))));
}

export function buildExhibitionTopViewHtml(rawEvent: ExhibitionEvent): string {
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

  const hallButtons = event.categories.map(c => {
    const count = event.reservations.filter(r => r.categoryId === c.id).length;
    return `<button class="hall-filter" data-filter="${escapeAttr(c.id)}" style="--hall:${escapeAttr(c.color)}"><span>${escapeHtml(c.name)}</span><b>${count}/${c.boothCount}</b></button>`;
  }).join('');

  const hallMaps = event.categories.map(category => {
    const cols = topViewFloorCols(category.boothCount);
    const boothSize = category.boothCount > 100 ? 58 : 72;
    const floorMinWidth = cols * boothSize + (cols - 1) * 12 + 48;
    const markers = (event.topViewMarkers ?? []).filter(marker => marker.categoryId === category.id);
    const markerHtml = markers.map(marker => {
      const content = `<span class="marker-icon">${escapeHtml(markerIcon(marker.kind))}</span><span><b>${escapeHtml(marker.title || markerKindLabel(marker.kind))}</b>${marker.description ? `<small>${escapeHtml(marker.description)}</small>` : ''}</span>`;
      const style = `left:${Math.min(100, Math.max(0, marker.x))}%;top:${Math.min(100, Math.max(0, marker.y))}%;--marker:${escapeAttr(marker.color || '#22d3ee')}`;
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
        return `<button class="top-booth empty" data-hall="${escapeAttr(category.id)}" disabled><span class="booth-num">${escapeHtml(code)}</span></button>`;
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
      <div class="floor-scroll"><div class="top-floor" style="--floor-cols:${cols};--booth-size:${boothSize}px;--floor-min:${floorMinWidth}px">${boothCells}${markerHtml}</div></div>
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
.floor-scroll{position:relative;overflow:auto;padding-bottom:4px}.top-floor{position:relative;display:grid;grid-template-columns:repeat(var(--floor-cols,8),minmax(var(--booth-size,72px),1fr));gap:12px;min-width:var(--floor-min,100%);padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:30px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,41,59,.66)),repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 34px),repeating-linear-gradient(0deg,rgba(255,255,255,.028) 0 1px,transparent 1px 34px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.045)}.top-floor:before,.top-floor:after{content:"";position:absolute;pointer-events:none;background:rgba(34,211,238,.12);border:1px dashed rgba(125,211,252,.22);border-radius:999px}.top-floor:before{left:18px;right:18px;top:50%;height:18px;transform:translateY(-50%)}.top-floor:after{top:18px;bottom:18px;left:50%;width:18px;transform:translateX(-50%)}
.map-marker{position:absolute;z-index:9;display:inline-flex;align-items:center;gap:8px;max-width:190px;min-width:112px;transform:translate(-50%,-50%);text-decoration:none;color:#fff;border:1px solid rgba(255,255,255,.34);background:linear-gradient(135deg,var(--marker),rgba(15,23,42,.86));border-radius:18px;padding:9px 11px;box-shadow:0 16px 40px rgba(0,0,0,.34),0 0 0 6px rgba(255,255,255,.045);backdrop-filter:blur(10px)}.map-marker:after{content:"";position:absolute;left:50%;bottom:-10px;width:16px;height:16px;background:var(--marker);border:2px solid rgba(255,255,255,.72);border-radius:999px;transform:translateX(-50%)}.map-marker .marker-icon{display:grid;place-items:center;min-width:38px;height:28px;border-radius:11px;background:rgba(255,255,255,.22);font-size:10px;font-weight:900;letter-spacing:.06em}.map-marker b{display:block;font-size:12px;line-height:1.15}.map-marker small{display:block;margin-top:3px;color:rgba(255,255,255,.76);font-size:10px;line-height:1.25}.map-marker.ad{min-width:150px;border-radius:12px;text-transform:uppercase}.map-marker.conference{border-style:dashed}.map-marker.exit{background:linear-gradient(135deg,var(--marker),rgba(5,46,22,.88))}
.top-booth{position:relative;min-height:clamp(88px,calc(var(--booth-size,72px) * 1.45),112px);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:8px;background:rgba(255,255,255,.055);color:#64748b;overflow:hidden;transform:perspective(800px) rotateX(7deg);transition:.2s ease}.top-booth.occupied{background:linear-gradient(145deg,var(--hall),rgba(15,23,42,.72));color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 18px 44px rgba(0,0,0,.25)}.top-booth.confirmed{outline:1px solid rgba(52,211,153,.36)}.top-booth.reserved{outline:1px solid rgba(251,146,60,.55)}.top-booth.occupied:hover{transform:perspective(800px) rotateX(0deg) translateY(-4px);box-shadow:0 24px 55px rgba(0,0,0,.3)}.booth-num{position:absolute;top:8px;left:8px;font-size:10px;font-weight:900;color:rgba(255,255,255,.85);font-family:ui-monospace,Menlo,monospace}.brand-roof{position:absolute;top:26px;left:50%;width:min(64px,calc(100% - 24px));aspect-ratio:1/1;transform:translateX(-50%);border-radius:16px;background:rgba(255,255,255,.93);display:flex;align-items:center;justify-content:center;color:#0f172a;font-weight:900;font-size:20px;box-shadow:inset 0 0 0 1px rgba(15,23,42,.08);overflow:hidden}.brand-roof img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.brand-name{position:absolute;left:8px;right:8px;bottom:10px;font-size:10px;font-weight:800;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.brand-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.brand-card{position:relative;display:grid;grid-template-columns:78px 1fr;gap:14px;align-items:center;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.052));border-radius:28px;padding:16px;overflow:hidden}.brand-card:before{content:"";position:absolute;inset:-60% auto auto -20%;width:220px;height:220px;background:var(--hall);opacity:.18;filter:blur(70px)}.brand-logo{position:relative;width:78px;height:78px;border-radius:22px;background:#fff;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:22px;font-weight:900;overflow:hidden}.brand-logo img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.brand-copy{position:relative;min-width:0}.brand-copy span{display:block;color:#c4b5fd;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.brand-copy h3{margin:5px 0 4px;font-size:20px;line-height:1.25}.brand-copy p{margin:0;color:#cbd5e1;font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.note-btn{position:relative;grid-column:1/-1;border:0;border-radius:16px;background:linear-gradient(135deg,var(--hall),#22d3ee);color:#fff;padding:11px 13px;font-weight:900}.hidden{display:none!important}.empty-state{border:1px dashed rgba(255,255,255,.22);border-radius:26px;padding:40px;text-align:center;color:#94a3b8;background:rgba(255,255,255,.035)}
.modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.74);backdrop-filter:blur(14px)}.modal.open{display:flex}.note{position:relative;width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(15,23,42,.9));border-radius:34px;padding:22px;box-shadow:0 35px 120px rgba(0,0,0,.45);overflow:hidden}.note:before{content:"";position:absolute;inset:-35% auto auto -18%;width:260px;height:260px;background:var(--noteHall,#22d3ee);opacity:.22;filter:blur(80px)}.note-head{position:relative;display:grid;grid-template-columns:86px 1fr auto;gap:14px;align-items:center}.note-logo{width:86px;height:86px;border-radius:24px;background:#fff;color:#0f172a;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;overflow:hidden}.note-logo img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.note h3{margin:0;font-size:27px;line-height:1.15}.note .note-sub{margin:6px 0 0;color:#c4b5fd;font-size:13px;font-weight:800}.close{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:14px;width:38px;height:38px}.note-body{position:relative;margin-top:18px}.note-body p{color:#dbeafe;line-height:1.75}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.chips span{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:999px;padding:7px 10px;color:#cbd5e1;font-size:12px}.enter-store{display:flex;justify-content:center;text-decoration:none;border-radius:18px;background:linear-gradient(135deg,var(--noteHall,#22d3ee),#8b5cf6);padding:14px 16px;font-weight:900;margin-top:18px}.disabled-store{display:block;text-align:center;border-radius:18px;background:rgba(255,255,255,.07);color:#94a3b8;padding:14px 16px;font-weight:800;margin-top:18px}.footer{padding:28px 18px 46px;text-align:center;color:#64748b;font-size:12px}
@media(max-width:980px){.hero-grid{grid-template-columns:1fr}.controls-inner{grid-template-columns:1fr}.brand-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}.section-title{display:block}.top-floor{gap:10px;padding:14px}.top-booth{min-height:92px}.brand-grid{grid-template-columns:1fr}.note-head{grid-template-columns:70px 1fr auto}.note-logo{width:70px;height:70px}.hero h1{font-size:42px}}
</style>
</head>
<body>
<main>
  <header class="hero"><div class="wrap"><span class="badge">Interactive Top-View Exhibition</span><div class="hero-grid"><div><h1>${escapeHtml(event.title || 'Online Exhibition Hall')}</h1><p class="lead">${event.subtitle ? escapeHtml(event.subtitle) : 'Explore the exhibition from above, discover reserved booths, and enter each exhibitor store or catalog.'}</p><div class="meta">${event.location ? `<span>Location: ${escapeHtml(event.location)}</span>` : ''}${event.startDate ? `<span>Date: ${escapeHtml(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` - ${escapeHtml(event.endDate)}` : ''}</span>` : ''}${event.organizerName ? `<span>Organizer: ${escapeHtml(event.organizerName)}</span>` : ''}</div></div><aside class="stats-panel"><div class="stats"><div class="stat"><b>${totalBooths}</b><span>Total booths</span></div><div class="stat"><b>${event.reservations.length}</b><span>Reserved booths</span></div><div class="stat"><b>${confirmed}</b><span>Confirmed</span></div><div class="stat"><b>${openBooths}</b><span>Open spaces</span></div></div><div class="capacity"><i></i></div></aside></div></div></header>
  <nav class="controls"><div class="controls-inner"><input id="search" class="search" type="search" placeholder="Search companies, products, halls, city, contact..." /><div class="hall-filters"><button class="hall-filter active" data-filter="all" style="--hall:#22d3ee"><span>All halls</span><b>${event.reservations.length}</b></button>${hallButtons}</div></div></nav>
  <section class="section"><div class="section-title"><div><h2>Top-View Exhibition Floor</h2><p>Click any branded booth to open a smart exhibitor note. Logos are placed on booth roofs so foreign visitors can scan the hall like a real exhibition map.</p></div><div class="legend"><span><i class="dot" style="--dot:#34d399"></i>Confirmed</span><span><i class="dot" style="--dot:#fb923c"></i>Reserved</span><span><i class="dot" style="--dot:#64748b"></i>Open</span></div></div>${hallMaps}</section>
  <section class="section"><div class="section-title"><div><h2>Exhibitor Notes</h2><p>Each note gives buyers a quick overview of the exhibitor, products, booth location, and direct store link.</p></div></div><div id="brandGrid" class="brand-grid">${cards || '<div class="empty-state">No reserved exhibitors yet.</div>'}</div><div id="empty" class="empty-state hidden">No exhibitors match your filter.</div></section>
  <footer class="footer">Generated by Tohid Dayhami Export+ Exhibition</footer>
</main>
<div id="modal" class="modal" aria-hidden="true"><article id="note" class="note"><div class="note-head"><div id="noteLogo" class="note-logo"></div><div><h3 id="noteCompany"></h3><p id="noteSub" class="note-sub"></p></div><button id="closeModal" class="close" type="button" aria-label="Close">x</button></div><div class="note-body"><p id="noteProducts"></p><div id="noteChips" class="chips"></div><div id="noteAction"></div></div></article></div>
<script>
window.__EXHIBITION_BOOTHS__=${dataJson};
(function(){var booths=window.__EXHIBITION_BOOTHS__||[];var byId={};booths.forEach(function(b){byId[b.id]=b;});var filter='all';var search='';var pills=[].slice.call(document.querySelectorAll('.hall-filter'));var boothEls=[].slice.call(document.querySelectorAll('.top-booth.occupied'));var cards=[].slice.call(document.querySelectorAll('.brand-card'));var halls=[].slice.call(document.querySelectorAll('.hall-scene'));var empty=document.getElementById('empty');var modal=document.getElementById('modal');var note=document.getElementById('note');function initials(name){return String(name||'EX').trim().split(/\\s+/).slice(0,2).map(function(p){return p[0]||'';}).join('').toUpperCase()||'EX';}function apply(){var visible=0;function show(el){var hallOk=filter==='all'||el.getAttribute('data-hall')===filter;var text=(el.getAttribute('data-search')||'').toLowerCase();return hallOk&&(!search||text.indexOf(search)>-1);}boothEls.forEach(function(el){el.classList.toggle('hidden',!show(el));});cards.forEach(function(el){var s=show(el);el.classList.toggle('hidden',!s);if(s)visible++;});halls.forEach(function(h){h.classList.toggle('hidden',!(filter==='all'||h.getAttribute('data-hall')===filter));});if(empty)empty.classList.toggle('hidden',visible!==0);}function openNote(id){var b=byId[id];if(!b||!modal||!note)return;note.style.setProperty('--noteHall',b.hallColor||'#22d3ee');document.getElementById('noteCompany').textContent=b.companyName||'Exhibitor';document.getElementById('noteSub').textContent=(b.boothCode||'')+' · '+(b.hallName||'Exhibition Hall')+' · '+(b.status||'Reserved');document.getElementById('noteProducts').textContent=b.products||'Product details will be announced soon.';var logo=document.getElementById('noteLogo');logo.innerHTML=b.logoUrl?'<img src="'+String(b.logoUrl).replace(/"/g,'&quot;')+'" alt="Logo" />':'<span>'+initials(b.companyName)+'</span>';var chips=document.getElementById('noteChips');chips.innerHTML='';[b.city?'Origin: '+b.city:'',b.contactName?'Contact: '+b.contactName:'',b.phone?'Phone: '+b.phone:'',b.hallDescription?b.hallDescription:''].filter(Boolean).forEach(function(x){var span=document.createElement('span');span.textContent=x;chips.appendChild(span);});var action=document.getElementById('noteAction');action.innerHTML=b.storeUrl?'<a class="enter-store" target="_blank" rel="noopener noreferrer" href="'+String(b.storeUrl).replace(/"/g,'&quot;')+'">Enter Store / Catalog</a>':'<span class="disabled-store">Store link coming soon</span>';modal.classList.add('open');modal.setAttribute('aria-hidden','false');}pills.forEach(function(btn){btn.addEventListener('click',function(){filter=btn.getAttribute('data-filter')||'all';pills.forEach(function(x){x.classList.toggle('active',x===btn);});apply();});});var searchInput=document.getElementById('search');if(searchInput)searchInput.addEventListener('input',function(){search=(searchInput.value||'').trim().toLowerCase();apply();});document.addEventListener('click',function(e){var target=e.target;var trigger=target.closest&&target.closest('[data-booth-id]');if(trigger){openNote(trigger.getAttribute('data-booth-id'));return;}if(target===modal||target.id==='closeModal'){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal)modal.classList.remove('open');});})();
</script>
</body>
</html>`;
}
