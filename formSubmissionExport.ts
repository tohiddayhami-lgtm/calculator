import type { CustomFormDef, FormField, FormSubmission } from './types';

export type FormSubmissionExportContext = {
  folderName: string;
  formDef?: CustomFormDef;
  submission: FormSubmission;
};

function formFieldDisplayLabel(f: FormField): string {
  const ltr = String(f.labelLtr ?? f.label ?? '').trim();
  const rtl = String(f.labelRtl ?? '').trim();
  if (ltr && rtl) return `${ltr} / ${rtl}`;
  return ltr || rtl || f.label || f.id;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSubmissionFieldValue(val: unknown, field?: FormField): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.map((x) => String(x)).join('، ');
  if (typeof val === 'boolean') return val ? 'بله' : 'خیر';
  if (typeof val === 'number' && field?.type === 'rating') return `${val} / ${field.maxRating || 5}`;
  return String(val);
}

function isImageUrl(url: string, field?: FormField): boolean {
  return (
    field?.type === 'image_upload' ||
    /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(url) ||
    url.includes('firebasestorage.googleapis.com')
  );
}

function isVideoUrl(url: string, field?: FormField): boolean {
  return field?.type === 'video_upload' || /\.(mp4|mov|avi|webm)(\?|$)/i.test(url);
}

export function extractImageUrlsFromValue(val: unknown, field?: FormField): string[] {
  if (Array.isArray(val)) {
    return val.filter((v): v is string => typeof v === 'string' && /^https?:\/\//.test(v) && isImageUrl(v, field));
  }
  if (typeof val === 'string' && /^https?:\/\//.test(val) && isImageUrl(val, field)) {
    return [val];
  }
  return [];
}

export function extractFileUrlsFromValue(val: unknown, field?: FormField): string[] {
  if (typeof val === 'string' && /^https?:\/\//.test(val) && !isImageUrl(val, field) && !isVideoUrl(val, field)) {
    return [val];
  }
  if (Array.isArray(val)) {
    return val.filter(
      (v): v is string =>
        typeof v === 'string' &&
        /^https?:\/\//.test(v) &&
        !isImageUrl(v, field) &&
        !isVideoUrl(v, field)
    );
  }
  return [];
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type OrderedFieldRow = {
  key: string;
  field?: FormField;
  val: unknown;
};

function getOrderedFieldRows(ctx: FormSubmissionExportContext): OrderedFieldRow[] {
  const { formDef, submission } = ctx;
  const data = submission.data || {};
  const rows: OrderedFieldRow[] = [];
  const seen = new Set<string>();

  for (const field of formDef?.fields || []) {
    if (field.type === 'display_image') continue;
    if (field.type === 'section_title') {
      rows.push({ key: field.id, field, val: field.placeholder || field.label });
      seen.add(field.id);
      continue;
    }
    if (data[field.id] !== undefined && data[field.id] !== '') {
      rows.push({ key: field.id, field, val: data[field.id] });
      seen.add(field.id);
    }
  }

  for (const [key, val] of Object.entries(data)) {
    if (!seen.has(key) && val !== undefined && val !== '') {
      rows.push({ key, field: formDef?.fields.find((f) => f.id === key), val });
    }
  }
  return rows;
}

export function buildFormSubmissionWhatsAppText(ctx: FormSubmissionExportContext): string {
  const { folderName, formDef, submission } = ctx;
  const lines: string[] = [];
  lines.push(`📋 ${folderName}`);
  const formNo = submission.formNumber || formDef?.formNumber;
  if (formNo) lines.push(`شماره فرم: ${formNo}`);
  lines.push(`🕐 ${new Date(submission.submittedAt).toLocaleString('fa-IR')}`);
  lines.push('');
  lines.push('—— جزئیات ——');

  for (const { field, val } of getOrderedFieldRows(ctx)) {
    if (field?.type === 'section_title') {
      lines.push('');
      lines.push(`▸ ${formFieldDisplayLabel(field)}`);
      continue;
    }
    const label = field ? formFieldDisplayLabel(field) : '—';
    const imageUrls = extractImageUrlsFromValue(val, field);
    const fileUrls = extractFileUrlsFromValue(val, field);
    if (imageUrls.length) {
      lines.push(`${label}: ${imageUrls.length} تصویر (در فایل پیوست)`);
      imageUrls.forEach((u, i) => lines.push(`  🖼 ${i + 1}: ${u}`));
    } else if (fileUrls.length) {
      lines.push(`${label}:`);
      fileUrls.forEach((u) => lines.push(`  📎 ${u}`));
    } else if (field?.type === 'video_upload' && typeof val === 'string' && /^https?:\/\//.test(val)) {
      lines.push(`${label}: 🎬 ${val}`);
    } else {
      const text = formatSubmissionFieldValue(val, field);
      if (text) lines.push(`${label}: ${text}`);
    }
  }

  lines.push('');
  lines.push('📎 گزارش کامل با تصاویر: فایل HTML دانلودشده را در واتساپ پیوست کنید.');
  return lines.join('\n');
}

export async function buildFormSubmissionReportHtml(
  ctx: FormSubmissionExportContext,
  embedImages = true
): Promise<string> {
  const { folderName, formDef, submission } = ctx;
  const submitted = new Date(submission.submittedAt).toLocaleString('fa-IR');
  const formNo = submission.formNumber || formDef?.formNumber || '';

  const fieldBlocks: string[] = [];
  let embedCount = 0;
  const maxEmbed = 12;

  for (const { field, val } of getOrderedFieldRows(ctx)) {
    if (field?.type === 'section_title') {
      fieldBlocks.push(
        `<section class="section-head"><h2>${escapeHtml(formFieldDisplayLabel(field))}</h2>${
          field.placeholder ? `<p class="muted">${escapeHtml(field.placeholder)}</p>` : ''
        }</section>`
      );
      continue;
    }

    const label = field ? formFieldDisplayLabel(field) : '—';
    const imageUrls = extractImageUrlsFromValue(val, field);
    const fileUrls = extractFileUrlsFromValue(val, field);

    let body = '';
    if (imageUrls.length) {
      const imgs: string[] = [];
      for (const url of imageUrls) {
        let src = url;
        if (embedImages && embedCount < maxEmbed) {
          const dataUrl = await fetchImageAsDataUrl(url);
          if (dataUrl) {
            src = dataUrl;
            embedCount++;
          }
        }
        imgs.push(
          `<figure class="img-wrap"><a href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(src)}" alt="" loading="lazy"/></a></figure>`
        );
      }
      body = `<div class="gallery">${imgs.join('')}</div>`;
    } else if (fileUrls.length) {
      body = fileUrls
        .map(
          (u) =>
            `<p class="file-link"><a href="${escapeHtml(u)}" target="_blank" rel="noopener">📎 دانلود فایل</a></p>`
        )
        .join('');
    } else if (field?.type === 'video_upload' && typeof val === 'string' && /^https?:\/\//.test(val)) {
      body = `<p class="file-link"><a href="${escapeHtml(val)}" target="_blank" rel="noopener">🎬 مشاهده ویدیو</a></p>`;
    } else if (field?.type === 'rating') {
      const n = Number(val) || 0;
      const max = field.maxRating || 5;
      body = `<p class="stars">${'★'.repeat(n)}${'☆'.repeat(Math.max(0, max - n))} <span class="muted">(${n}/${max})</span></p>`;
    } else {
      body = `<p class="value">${escapeHtml(formatSubmissionFieldValue(val, field) || '—')}</p>`;
    }

    fieldBlocks.push(
      `<div class="field"><div class="label">${escapeHtml(label)}</div>${body}</div>`
    );
  }

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(folderName)} — ${escapeHtml(submitted)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    margin: 0;
    padding: 16px;
    line-height: 1.6;
  }
  .doc {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(15,23,42,0.08);
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #334155 100%);
    color: #fff;
    padding: 20px 22px;
  }
  .header h1 { margin: 0 0 6px; font-size: 1.25rem; }
  .header .meta { font-size: 0.85rem; opacity: 0.9; }
  .body { padding: 18px 20px 24px; }
  .section-head {
    margin: 18px 0 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e2e8f0;
  }
  .section-head h2 { margin: 0; font-size: 1rem; color: #1e40af; }
  .field {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 10px;
    background: #fafafa;
  }
  .label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    margin-bottom: 6px;
  }
  .value { margin: 0; white-space: pre-wrap; font-size: 0.95rem; }
  .muted { color: #64748b; font-size: 0.85rem; }
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
  }
  .img-wrap {
    margin: 0;
    flex: 1 1 140px;
    max-width: 100%;
  }
  .img-wrap img {
    width: 100%;
    max-height: 220px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #fff;
  }
  .file-link a { color: #2563eb; word-break: break-all; }
  .stars { font-size: 1.25rem; color: #eab308; letter-spacing: 2px; }
  .footer {
    text-align: center;
    font-size: 0.75rem;
    color: #94a3b8;
    padding: 12px;
    border-top: 1px solid #e2e8f0;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .doc { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
  <div class="doc">
    <header class="header">
      <h1>${escapeHtml(folderName)}</h1>
      <div class="meta">
        ${formNo ? `<div>شماره فرم: ${escapeHtml(formNo)}</div>` : ''}
        <div>تاریخ ثبت: ${escapeHtml(submitted)}</div>
        <div style="font-size:0.75rem;margin-top:4px;opacity:0.75">ID: ${escapeHtml(submission.id)}</div>
      </div>
    </header>
    <div class="body">
      ${fieldBlocks.join('\n') || '<p class="muted">بدون داده</p>'}
    </div>
    <footer class="footer">CloudExport Pro — گزارش فرم برای اشتراک‌گذاری</footer>
  </div>
</body>
</html>`;
}

function buildExportFileName(ctx: FormSubmissionExportContext): string {
  const safe = ctx.folderName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').slice(0, 40);
  const d = new Date(ctx.submission.submittedAt);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  return `FormReport_${safe}_${stamp}.html`;
}

export type WhatsAppExportResult = {
  fileName: string;
  sharedNative: boolean;
};

/** Build HTML report, download or native-share, then open WhatsApp with summary text. */
export async function exportFormSubmissionForWhatsApp(
  ctx: FormSubmissionExportContext
): Promise<WhatsAppExportResult> {
  const html = await buildFormSubmissionReportHtml(ctx, true);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const fileName = buildExportFileName(ctx);
  const file =
    typeof File !== 'undefined'
      ? new File([blob], fileName, { type: 'text/html;charset=utf-8' })
      : null;

  const summary = buildFormSubmissionWhatsAppText(ctx);
  let sharedNative = false;

  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  if (file && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files: [file], text: summary.slice(0, 500) })) {
        await nav.share({
          files: [file],
          title: ctx.folderName,
          text: summary.slice(0, 800),
        });
        sharedNative = true;
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
        return { fileName, sharedNative: true };
      }
    }
  }

  if (!sharedNative) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    const waText = summary.length > 3500 ? `${summary.slice(0, 3400)}\n…` : summary;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  return { fileName, sharedNative };
}
