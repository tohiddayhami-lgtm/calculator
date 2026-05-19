import type { InvoiceAnnex, InvoiceAnnexParagraph, InvoiceAnnexParagraphAlign } from './types';

export const MAX_ANNEX_PARAGRAPHS = 40;

const ALIGN_SET = new Set<InvoiceAnnexParagraphAlign>(['left', 'center', 'right', 'justify']);

export function newAnnexParagraphId(): string {
  return `ap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyAnnexParagraph(
  overrides?: Partial<InvoiceAnnexParagraph>,
): InvoiceAnnexParagraph {
  return {
    id: newAnnexParagraphId(),
    text: '',
    align: 'right',
    ...overrides,
  };
}

export function normalizeAnnexParagraphAlign(raw: unknown): InvoiceAnnexParagraphAlign {
  const a = String(raw ?? '').trim() as InvoiceAnnexParagraphAlign;
  return ALIGN_SET.has(a) ? a : 'right';
}

export function normalizeAnnexParagraph(raw: unknown): InvoiceAnnexParagraph {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? newAnnexParagraphId()),
    text: String(o.text ?? ''),
    align: normalizeAnnexParagraphAlign(o.align),
  };
}

/** Split legacy `body` into paragraphs (blank line = new paragraph). */
export function bodyToAnnexParagraphs(body: string): InvoiceAnnexParagraph[] {
  const chunks = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chunks.length) {
    return [createEmptyAnnexParagraph()];
  }
  return chunks.map((text) => createEmptyAnnexParagraph({ text, align: 'right' }));
}

export function annexParagraphsToBody(paragraphs: InvoiceAnnexParagraph[]): string {
  return paragraphs
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function getAnnexParagraphs(annex: Pick<InvoiceAnnex, 'body' | 'paragraphs'>): InvoiceAnnexParagraph[] {
  if (Array.isArray(annex.paragraphs) && annex.paragraphs.length > 0) {
    return annex.paragraphs.map(normalizeAnnexParagraph);
  }
  if (String(annex.body ?? '').trim()) {
    return bodyToAnnexParagraphs(annex.body);
  }
  return [createEmptyAnnexParagraph()];
}

export function annexWithParagraphs(
  annex: InvoiceAnnex,
  paragraphs: InvoiceAnnexParagraph[],
): InvoiceAnnex {
  const trimmed = paragraphs.slice(0, MAX_ANNEX_PARAGRAPHS).map(normalizeAnnexParagraph);
  return {
    ...annex,
    paragraphs: trimmed,
    body: annexParagraphsToBody(trimmed),
  };
}

export function annexHasParagraphText(annex: Pick<InvoiceAnnex, 'body' | 'paragraphs'>): boolean {
  return getAnnexParagraphs(annex).some((p) => p.text.trim().length > 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** **bold** *italic* __underline__ and line breaks → safe HTML for print. */
export function renderAnnexMarkupToHtml(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<u>$1</u>');
  s = s.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/\n/g, '<br/>');
  return s;
}

export function wrapTextareaSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  return { value: next, selectionStart: cursorStart, selectionEnd: cursorEnd };
}
