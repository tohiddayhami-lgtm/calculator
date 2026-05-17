import type { InvoiceExtraCharge } from './types';
import { totalsByCurrency, type ServiceInvoiceLine } from './serviceInvoice';

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
  net: number;
  vat: number;
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
  extraCharges: InvoiceExtraCharge[];
}): ServiceCurrencyAdjustment[] {
  const subtotals = totalsByCurrency(params.lines);
  const currencies = Object.keys(subtotals).sort();
  const discCcy = (params.discountCurrency || 'USD').trim().toUpperCase() || 'USD';
  const vatRate = params.vatEnabled ? Math.max(0, Number(params.vatPercent) || 0) : 0;

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

    const vat = vatRate > 0 ? net * (vatRate / 100) : 0;
    const extras: { id: string; label: string; amount: number }[] = [];
    let extrasSum = 0;
    for (const ch of params.extraCharges) {
      const amt = resolveExtraChargeForCurrency(ch, currency, net);
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
      vat,
      extras,
      grand: net + vat + extrasSum,
    };
  });
}
