import React from 'react';
import type { ArchivedInvoice } from './types';
import {
  archivedInvoiceKindLabel,
  archivedInvoicesForCustomer,
  isLegacyMisarchivedServiceInvoice,
  normalizeArchivedInvoiceKind,
  serviceLineDescriptionDisplay,
  summarizeCustomerBalances,
} from './invoiceArchive';

type Props = {
  selected: ArchivedInvoice;
  allInvoices: ArchivedInvoice[];
  formatNumber: (n: number | string) => string;
  formatMoney: (amount: number, currency: string) => string;
  /** When set, used for service line amounts (respects decimal places). */
  formatServiceMoney?: (amount: number, currency: string) => string;
};

export function ArchiveLegacyMisarchiveBanner({ selected }: { selected: ArchivedInvoice }) {
  if (!isLegacyMisarchivedServiceInvoice(selected)) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      این فاکتور با نسخهٔ قدیمی اشتباه آرشیو شده (اقلام صادرات به‌جای خدمات). مانده و جمع ممکن است نادرست باشد —
      فاکتور را حذف کنید و دوباره از بخش خدمات آرشیو کنید.
    </div>
  );
}

export function ArchiveCustomerBalanceSummary({ selected, allInvoices, formatMoney }: Props) {
  const selKind = normalizeArchivedInvoiceKind(selected.invoiceKind);
  const related = archivedInvoicesForCustomer(allInvoices, selected.customerName || '', selKind);
  const segBalances = summarizeCustomerBalances(related, selKind);
  if (!segBalances.length) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-[10px] uppercase font-semibold text-slate-600 mb-2">
        مانده مشتری (فقط {archivedInvoiceKindLabel(selKind)}) — {related.length} فاکتور
      </p>
      <div className="flex flex-wrap gap-2">
        {segBalances.map((b) => (
          <span key={b.currency} className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1">
            {b.currency}: بدهی {formatMoney(b.totalDue, b.currency)} · پرداخت {formatMoney(b.paid, b.currency)} ·{' '}
            <strong className={b.balance > 0.005 ? 'text-amber-700' : 'text-emerald-700'}>
              مانده {formatMoney(b.balance, b.currency)}
            </strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ArchiveSelectedItemsTable({
  selected,
  formatNumber,
  formatMoney,
  formatServiceMoney,
}: Props) {
  const kind = normalizeArchivedInvoiceKind(selected.invoiceKind);
  const isServices = kind === 'services';
  const money = (amt: number, ccy: string) =>
    isServices && formatServiceMoney ? formatServiceMoney(amt, ccy) : formatMoney(amt, ccy);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
          {isServices
            ? `ردیف‌های خدمات (${(selected.serviceLines || []).length})`
            : `اقلام کالا (${selected.items.length})`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            {isServices ? (
              <tr>
                <th className="text-left px-3 py-1.5 font-semibold">خدمت</th>
                <th className="text-right px-3 py-1.5 font-semibold">تعداد</th>
                <th className="text-right px-3 py-1.5 font-semibold">فی</th>
                <th className="text-right px-3 py-1.5 font-semibold">مبلغ</th>
              </tr>
            ) : (
              <tr>
                <th className="text-left px-3 py-1.5 font-semibold">Item</th>
                <th className="text-right px-3 py-1.5 font-semibold">Qty</th>
                <th className="text-right px-3 py-1.5 font-semibold">Unit ({selected.selectedTerm})</th>
                <th className="text-right px-3 py-1.5 font-semibold">Disc</th>
                <th className="text-right px-3 py-1.5 font-semibold">Line total</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isServices
              ? (selected.serviceLines || []).map((it) => (
                  <tr key={it.lineId}>
                    <td className="px-3 py-1.5 whitespace-pre-line">{serviceLineDescriptionDisplay(it)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(it.qty)}</td>
                    <td className="px-3 py-1.5 text-right">{money(it.unitPrice, it.currency)}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{money(it.lineTotal, it.currency)}</td>
                  </tr>
                ))
              : selected.items.map((it) => {
                  const unit = it.unitPrices[selected.selectedTerm] || 0;
                  const gross = unit * it.qty;
                  const pct = Math.min(100, Math.max(0, it.discountPercent || 0));
                  const flat = Math.max(0, it.discountAmount || 0);
                  let net = gross * (1 - pct / 100);
                  if (selected.selectedTerm === selected.invoiceDiscountBaseTerm) net -= flat;
                  net = Math.max(0, net);
                  return (
                    <tr key={it.productId}>
                      <td className="px-3 py-1.5">
                        <p className="font-medium text-slate-800">{it.name}</p>
                        {it.sku && <p className="text-[10px] text-slate-500">SKU {it.sku}</p>}
                      </td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(it.qty)}</td>
                      <td className="px-3 py-1.5 text-right">{formatMoney(unit, selected.outputCurrency)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-500">
                        {pct > 0 ? `${pct}%` : ''}
                        {pct > 0 && flat > 0 ? ' + ' : ''}
                        {flat > 0 && selected.selectedTerm === selected.invoiceDiscountBaseTerm
                          ? formatMoney(flat, selected.outputCurrency)
                          : ''}
                        {pct === 0 && (flat === 0 || selected.selectedTerm !== selected.invoiceDiscountBaseTerm)
                          ? '—'
                          : ''}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {formatMoney(net, selected.outputCurrency)}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {isServices &&
        Object.keys(selected.serviceGrandByCurrency || selected.grandByTerm || {}).length > 1 && (
          <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-600 space-y-0.5">
            {Object.entries(selected.serviceGrandByCurrency || selected.grandByTerm || {}).map(([ccy, amt]) => (
              <div key={ccy} className="flex justify-between">
                <span>جمع ({ccy})</span>
                <span className="font-semibold">{money(amt, ccy)}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
