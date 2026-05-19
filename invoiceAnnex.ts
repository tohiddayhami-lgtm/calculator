import type { InvoiceAnnex, InvoiceAnnexPreset } from './types';

export const INVOICE_ANNEX_PRESETS_STORAGE_KEY = 'exportcalc_invoice_annex_presets_v1';
export const MAX_INVOICE_ANNEX_PRESETS = 30;

export function newAnnexId(): string {
  return `annex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyAnnex(overrides?: Partial<InvoiceAnnex>): InvoiceAnnex {
  return {
    id: newAnnexId(),
    title: '',
    body: '',
    includeInPrint: true,
    ...overrides,
  };
}

export function normalizeInvoiceAnnex(raw: unknown): InvoiceAnnex {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? newAnnexId()),
    title: String(o.title ?? ''),
    body: String(o.body ?? ''),
    includeInPrint: o.includeInPrint !== false,
  };
}

export function parseInvoiceAnnexes(raw: unknown): InvoiceAnnex[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeInvoiceAnnex);
}

export function annexesForPrint(annexes: InvoiceAnnex[], enabled: boolean): InvoiceAnnex[] {
  if (!enabled) return [];
  return annexes.filter((a) => a.includeInPrint && (a.title.trim() || a.body.trim()));
}

export function parseInvoiceAnnexPresetsFromStorage(raw: string | null): InvoiceAnnexPreset[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        if (!x || typeof x !== 'object') return null;
        const o = x as Record<string, unknown>;
        const name = String(o.name ?? '').trim();
        if (!name) return null;
        return {
          id: String(o.id ?? `iap_${Date.now()}`),
          name,
          title: String(o.title ?? ''),
          body: String(o.body ?? ''),
          updatedAt: Number(o.updatedAt) || Date.now(),
        } satisfies InvoiceAnnexPreset;
      })
      .filter((x): x is InvoiceAnnexPreset => x !== null)
      .slice(0, MAX_INVOICE_ANNEX_PRESETS);
  } catch {
    return [];
  }
}
