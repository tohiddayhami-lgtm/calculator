/** Normalize Google Form / Sheets URLs for view + iframe embed. */

export type GoogleLinkPair = { viewUrl: string; embedUrl: string };

const FORM_VIEW_RE =
  /^https:\/\/docs\.google\.com\/forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+)\/(viewform|edit)(?:\?.*)?$/i;
const FORM_SHORT_RE = /^https:\/\/forms\.gle\/([a-zA-Z0-9_-]+)/i;

const SHEET_EDIT_RE =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/edit.*)?$/i;
const SHEET_PUB_RE =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)\/pubhtml/i;

export function normalizeGoogleFormUrl(raw: string): GoogleLinkPair | null {
  const url = (raw || '').trim();
  if (!url) return null;
  let viewUrl = url;
  if (FORM_SHORT_RE.test(url)) {
    return { viewUrl: url, embedUrl: url };
  }
  const m = url.match(FORM_VIEW_RE);
  if (m) {
    const id = m[1];
    const isEdit = m[2].toLowerCase() === 'edit';
    viewUrl = isEdit
      ? `https://docs.google.com/forms/d/e/${id}/viewform`
      : url.split('?')[0];
    if (!viewUrl.includes('/e/')) {
      viewUrl = `https://docs.google.com/forms/d/${id}/viewform`;
    }
    const embedBase = viewUrl.includes('/e/')
      ? viewUrl
      : `https://docs.google.com/forms/d/e/${id}/viewform`;
    return {
      viewUrl,
      embedUrl: `${embedBase.split('?')[0]}?embedded=true`,
    };
  }
  if (url.includes('docs.google.com/forms')) {
    const base = url.split('?')[0].replace(/\/edit$/, '/viewform');
    return {
      viewUrl: base,
      embedUrl: `${base}?embedded=true`,
    };
  }
  return null;
}

export function normalizeGoogleSheetsUrl(raw: string): GoogleLinkPair | null {
  const url = (raw || '').trim();
  if (!url) return null;
  const pub = url.match(SHEET_PUB_RE);
  if (pub) {
    const embedUrl = url.includes('widget=true')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}widget=true&headers=false`;
    return { viewUrl: url, embedUrl };
  }
  const m = url.match(SHEET_EDIT_RE);
  if (m) {
    const id = m[1];
    const viewUrl = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    return {
      viewUrl,
      embedUrl: `https://docs.google.com/spreadsheets/d/${id}/edit?rm=minimal`,
    };
  }
  if (url.includes('docs.google.com/spreadsheets')) {
    return { viewUrl: url, embedUrl: `${url.split('#')[0]}?rm=minimal` };
  }
  return null;
}

export function isValidGoogleFormUrl(raw: string): boolean {
  return !!normalizeGoogleFormUrl(raw);
}

export function isValidGoogleSheetsUrl(raw: string): boolean {
  return !!normalizeGoogleSheetsUrl(raw);
}
