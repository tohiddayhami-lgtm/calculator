import type { InvoiceExtraCharge } from './types';
import { totalsByCurrency, type ServiceInvoiceLine } from './serviceInvoice';

export type InvoiceVatMode = 'exclusive' | 'inclusive';

export function normalizeInvoiceVatMode(raw: unknown): InvoiceVatMode {
  return raw === 'inclusive' ? 'inclusive' : 'exclusive';
}

/** Split net-after-discount into ex-VAT base, VAT amount, and total including VAT. */
export function computeVatFromNet(
  netAfterDiscount: number,
  ratePercent: number,
  mode: InvoiceVatMode
): { netExclVat: number; vat: number; totalInclVat: number } {
  const net = Math.max(0, netAfterDiscount);
  const rate = Math.max(0, Number(ratePercent) || 0);
  if (rate <= 0) {
    return { netExclVat: net, vat: 0, totalInclVat: net };
  }
  if (mode === 'inclusive') {
    const vat = net * (rate / (100 + rate));
    const netExclVat = net - vat;
    return { netExclVat, vat, totalInclVat: net };
  }
  const vat = net * (rate / 100);
  return { netExclVat: net, vat, totalInclVat: net + vat };
}

export function normalizeInvoiceExtraCharges(raw: unknown): InvoiceExtraCharge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x, i) => ({
      id: String(x.id ?? `ec-${i}-${Date.now()}`),
      label: typeof x.label === 'string' ? x.label : '',
      amount: Math.max(0, Number(x.amount) || 0),
      enabled: Boolean(x.enabled),
      valueMode: x.valueMode === 'percent' ? 'percent' : 'amount',
      currency:
        typeof x.currency === 'string' && x.currency.trim()
          ? x.currency.trim().toUpperCase().slice(0, 8)
          : undefined,
    }));
}

/** Sum of enabled fixed-amount extras (product invoice — output currency). */
export function sumEnabledInvoiceExtras(charges: InvoiceExtraCharge[]): number {
  return charges
    .filter(
      (c) =>
        c.enabled &&
        (c.valueMode ?? 'amount') !== 'percent' &&
        (c.label || '').trim() &&
        (Number(c.amount) || 0) > 0
    )
    .reduce((s, c) => s + Math.max(0, Number(c.amount) || 0), 0);
}

export function resolveExtraChargeForCurrency(
  charge: InvoiceExtraCharge,
  currency: string,
  netBeforeVat: number
): number {
  if (!charge.enabled) return 0;
  const label = (charge.label || '').trim();
  if (!label) return 0;
  const ccy = (charge.currency || currency).trim().toUpperCase() || currency;
  if (ccy !== currency) return 0;
  const val = Math.max(0, Number(charge.amount) || 0);
  if (val <= 0) return 0;
  if (charge.valueMode === 'percent') {
    return netBeforeVat * (Math.min(100, val) / 100);
  }
  return val;
}

export type ServiceCurrencyAdjustment = {
  currency: string;
  subtotal: number;
  discount: number;
  /** Net after discount (excl. VAT if exclusive; incl. VAT if inclusive). */
  net: number;
  netExclVat: number;
  vat: number;
  totalInclVat: number;
  extras: { id: string; label: string; amount: number }[];
  grand: number;
};

export function computeServiceInvoiceByCurrency(params: {
  lines: ServiceInvoiceLine[];
  globalDiscountMode: 'none' | 'percent' | 'amount';
  globalDiscountValue: number;
  discountCurrency: string;
  vatEnabled: boolean;
  vatPercent: number;
  vatMode: InvoiceVatMode;
  extraCharges: InvoiceExtraCharge[];
}): ServiceCurrencyAdjustment[] {
  const subtotals = totalsByCurrency(params.lines);
  const currencies = Object.keys(subtotals).sort();
  const discCcy = (params.discountCurrency || 'USD').trim().toUpperCase() || 'USD';
  const vatRate = params.vatEnabled ? Math.max(0, Number(params.vatPercent) || 0) : 0;
  const vatMode = normalizeInvoiceVatMode(params.vatMode);

  return currencies.map((currency) => {
    const subtotal = subtotals[currency] || 0;
    let discount = 0;
    let net = subtotal;

    if (params.globalDiscountMode === 'percent' && params.globalDiscountValue > 0) {
      const pct = Math.min(100, Math.max(0, params.globalDiscountValue));
      net = subtotal * (1 - pct / 100);
      discount = subtotal - net;
    } else if (
      params.globalDiscountMode === 'amount' &&
      params.globalDiscountValue > 0 &&
      currency === discCcy
    ) {
      discount = Math.min(subtotal, params.globalDiscountValue);
      net = Math.max(0, subtotal - discount);
    }

    const vatBreakdown =
      vatRate > 0 ? computeVatFromNet(net, vatRate, vatMode) : { netExclVat: net, vat: 0, totalInclVat: net };
    const extras: { id: string; label: string; amount: number }[] = [];
    let extrasSum = 0;
    for (const ch of params.extraCharges) {
      const amt = resolveExtraChargeForCurrency(ch, currency, vatBreakdown.netExclVat);
      if (amt > 0) {
        extras.push({ id: ch.id, label: (ch.label || '').trim(), amount: amt });
        extrasSum += amt;
      }
    }

    return {
      currency,
      subtotal,
      discount,
      net,
      netExclVat: vatBreakdown.netExclVat,
      vat: vatBreakdown.vat,
      totalInclVat: vatBreakdown.totalInclVat,
      extras,
      grand: vatBreakdown.totalInclVat + extrasSum,
    };
  });
}
