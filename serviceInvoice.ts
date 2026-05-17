export interface ServiceInvoiceLine {
  id: string;
  description: string;
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

export function createEmptyServiceLine(defaultCurrency = 'USD'): ServiceInvoiceLine {
  return {
    id: newServiceLineId(),
    description: '',
    qty: 1,
    unitPrice: 0,
    currency: defaultCurrency || 'USD',
  };
}

export function serviceLineTotal(line: ServiceInvoiceLine): number {
  const q = Math.max(0, Number(line.qty) || 0);
  const p = Math.max(0, Number(line.unitPrice) || 0);
  return q * p;
}

export function totalsByCurrency(lines: ServiceInvoiceLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    const ccy = (line.currency || 'USD').trim().toUpperCase() || 'USD';
    out[ccy] = (out[ccy] || 0) + serviceLineTotal(line);
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
      const description = String(r.description ?? '').slice(0, 2000);
      const qty = Math.max(0, Number(r.qty) || 0);
      const unitPrice = Math.max(0, Number(r.unitPrice) || 0);
      const currency = String(r.currency ?? 'USD')
        .trim()
        .toUpperCase()
        .slice(0, 8) || 'USD';
      const savedServiceId =
        typeof r.savedServiceId === 'string' && r.savedServiceId ? r.savedServiceId : undefined;
      return { id, description, qty, unitPrice, currency, savedServiceId };
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
  return {
    id: newServiceLineId(),
    description: svc.description?.trim() ? `${svc.name}\n${svc.description}` : svc.name,
    qty: 1,
    unitPrice: svc.defaultUnitPrice ?? 0,
    currency: svc.defaultCurrency || defaultCurrency || 'USD',
    savedServiceId: svc.id,
  };
}

export function savedServiceFromLine(line: ServiceInvoiceLine): SavedService | null {
  const name = line.description.split('\n')[0]?.trim() || line.description.trim();
  if (!name) return null;
  const rest = line.description.includes('\n')
    ? line.description.slice(line.description.indexOf('\n') + 1).trim()
    : '';
  return {
    id: newSavedServiceId(),
    name: name.slice(0, 200),
    description: rest || undefined,
    defaultUnitPrice: line.unitPrice,
    defaultCurrency: line.currency,
    updatedAt: Date.now(),
  };
}
