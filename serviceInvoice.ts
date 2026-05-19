export interface ServiceInvoiceLine {
  id: string;
  /** Service title (shown as main line on invoice). */
  description: string;
  /** Optional extra details; shown below title when present. */
  detailNotes?: string;
  /** Sidebar UI: expanded notes editor. */
  detailsOpen?: boolean;
  qty: number;
  unitPrice: number;
  currency: string;
  savedServiceId?: string;
}

export interface SavedService {
  id: string;
  name: string;
  description?: string;
  defaultUnitPrice?: number;
  defaultCurrency?: string;
  updatedAt: number;
}

import {
  formatWithSeparators,
  parseMaxDecimalPlaces,
  roundToDecimalPlaces,
  type MaxDecimalPlaces,
} from './numericInputFormat';

export type ServiceInvoiceDecimalPlaces = MaxDecimalPlaces;

export const DEFAULT_SERVICE_INVOICE_DECIMAL_PLACES: ServiceInvoiceDecimalPlaces = 2;

export function parseServiceInvoiceDecimalPlaces(raw: unknown): ServiceInvoiceDecimalPlaces {
  return parseMaxDecimalPlaces(raw, DEFAULT_SERVICE_INVOICE_DECIMAL_PLACES);
}

export function roundServiceLineAmount(n: number, places: ServiceInvoiceDecimalPlaces): number {
  return roundToDecimalPlaces(Math.max(0, n), places);
}

/** Invoice / print amounts — respects user decimal setting (0–3), not currency defaults. */
export function formatServiceInvoiceMoney(
  amount: number,
  currency: string,
  decimalPlaces: ServiceInvoiceDecimalPlaces,
): string {
  const ccy = (currency || 'USD').trim().toUpperCase() || 'USD';
  const n = roundServiceLineAmount(amount, decimalPlaces);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: ccy,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(n);
  } catch {
    return `${ccy} ${formatWithSeparators(n, decimalPlaces)}`;
  }
}

export function formatServiceInvoiceQty(qty: number, decimalPlaces: ServiceInvoiceDecimalPlaces): string {
  return formatWithSeparators(roundServiceLineAmount(qty, decimalPlaces), decimalPlaces);
}

export const SERVICE_INVOICE_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'OMR',
  'IRR',
  'CNY',
  'TRY',
  'INR',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
] as const;

export function newServiceLineId(): string {
  return `sv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newSavedServiceId(): string {
  return `svc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function splitLegacyServiceDescription(raw: string): { title: string; detailNotes: string } {
  const text = String(raw ?? '').trim();
  if (!text) return { title: '', detailNotes: '' };
  const nl = text.indexOf('\n');
  if (nl < 0) return { title: text, detailNotes: '' };
  return {
    title: text.slice(0, nl).trim(),
    detailNotes: text.slice(nl + 1).trim(),
  };
}

export function normalizeServiceLine(
  line: ServiceInvoiceLine,
  options?: { trimText?: boolean },
): ServiceInvoiceLine {
  const trimText = options?.trimText !== false;
  const rawDesc = String(line.description ?? '');
  const rawNotes =
    line.detailNotes !== undefined && line.detailNotes !== null ? String(line.detailNotes) : '';

  if (line.detailNotes !== undefined || !rawDesc.includes('\n')) {
    return {
      ...line,
      description: trimText ? rawDesc.trim() : rawDesc,
      detailNotes: trimText ? rawNotes.trim() : rawNotes,
      detailsOpen: !!line.detailsOpen,
    };
  }
  const split = splitLegacyServiceDescription(rawDesc);
  return {
    ...line,
    description: split.title,
    detailNotes: split.detailNotes,
    detailsOpen: !!line.detailsOpen || !!split.detailNotes,
  };
}

/** Text shown in invoice table (title + optional notes). */
export function serviceLineInvoiceDescription(line: ServiceInvoiceLine): string {
  const n = normalizeServiceLine(line);
  const title = n.description.trim();
  const notes = String(n.detailNotes ?? '').trim();
  if (title && notes) return `${title}\n${notes}`;
  return title || notes;
}

export function serviceLineHasDetailNotes(line: ServiceInvoiceLine): boolean {
  return !!String(normalizeServiceLine(line).detailNotes ?? '').trim();
}

export function createEmptyServiceLine(defaultCurrency = 'USD'): ServiceInvoiceLine {
  return {
    id: newServiceLineId(),
    description: '',
    detailNotes: '',
    detailsOpen: false,
    qty: 1,
    unitPrice: 0,
    currency: defaultCurrency || 'USD',
  };
}

export function serviceLineTotal(
  line: ServiceInvoiceLine,
  decimalPlaces: ServiceInvoiceDecimalPlaces = DEFAULT_SERVICE_INVOICE_DECIMAL_PLACES,
): number {
  const q = roundServiceLineAmount(Number(line.qty) || 0, decimalPlaces);
  const p = roundServiceLineAmount(Number(line.unitPrice) || 0, decimalPlaces);
  return roundServiceLineAmount(q * p, decimalPlaces);
}

export function totalsByCurrency(
  lines: ServiceInvoiceLine[],
  decimalPlaces: ServiceInvoiceDecimalPlaces = DEFAULT_SERVICE_INVOICE_DECIMAL_PLACES,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    const ccy = (line.currency || 'USD').trim().toUpperCase() || 'USD';
    out[ccy] = roundServiceLineAmount(
      (out[ccy] || 0) + serviceLineTotal(line, decimalPlaces),
      decimalPlaces,
    );
  }
  return out;
}

export function parseServiceInvoiceLines(raw: unknown): ServiceInvoiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' && r.id ? r.id : newServiceLineId();
      const legacyDesc = String(r.description ?? '').slice(0, 2000);
      const explicitNotes =
        r.detailNotes !== undefined && r.detailNotes !== null
          ? String(r.detailNotes).slice(0, 2000)
          : undefined;
      const qty = Math.max(0, Number(r.qty) || 0);
      const unitPrice = Math.max(0, Number(r.unitPrice) || 0);
      const currency = String(r.currency ?? 'USD')
        .trim()
        .toUpperCase()
        .slice(0, 8) || 'USD';
      const savedServiceId =
        typeof r.savedServiceId === 'string' && r.savedServiceId ? r.savedServiceId : undefined;
      const base: ServiceInvoiceLine = {
        id,
        description: legacyDesc,
        detailNotes: explicitNotes,
        detailsOpen: r.detailsOpen === true,
        qty,
        unitPrice,
        currency,
        savedServiceId,
      };
      return normalizeServiceLine(base);
    })
    .filter((x): x is ServiceInvoiceLine => !!x);
}

export function parseSavedServices(raw: unknown): SavedService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? '').trim();
      if (!name) return null;
      return {
        id: typeof r.id === 'string' && r.id ? r.id : newSavedServiceId(),
        name: name.slice(0, 200),
        description: r.description ? String(r.description).slice(0, 2000) : undefined,
        defaultUnitPrice:
          r.defaultUnitPrice !== undefined && r.defaultUnitPrice !== null
            ? Math.max(0, Number(r.defaultUnitPrice) || 0)
            : undefined,
        defaultCurrency: r.defaultCurrency
          ? String(r.defaultCurrency).trim().toUpperCase().slice(0, 8)
          : undefined,
        updatedAt: Number(r.updatedAt) || Date.now(),
      };
    })
    .filter((x): x is SavedService => !!x);
}

export function lineFromSavedService(svc: SavedService, defaultCurrency: string): ServiceInvoiceLine {
  const catalogNotes = String(svc.description ?? '').trim();
  return {
    id: newServiceLineId(),
    description: svc.name,
    detailNotes: catalogNotes,
    detailsOpen: !!catalogNotes,
    qty: 1,
    unitPrice: svc.defaultUnitPrice ?? 0,
    currency: svc.defaultCurrency || defaultCurrency || 'USD',
    savedServiceId: svc.id,
  };
}

export function savedServiceFromLine(line: ServiceInvoiceLine): SavedService | null {
  const n = normalizeServiceLine(line);
  const name = n.description.trim();
  if (!name) return null;
  const notes = String(n.detailNotes ?? '').trim();
  return {
    id: newSavedServiceId(),
    name: name.slice(0, 200),
    description: notes || undefined,
    defaultUnitPrice: line.unitPrice,
    defaultCurrency: line.currency,
    updatedAt: Date.now(),
  };
}
