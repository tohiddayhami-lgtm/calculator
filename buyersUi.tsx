import React from 'react';
import { ChevronLeft, ChevronRight, Download, FileCheck, Mail, Plus, Trash2, Users } from 'lucide-react';
import {
  buyerDisplayLabel,
  buyerKindLabel,
  buyerKindShort,
  normalizeBuyerKind,
  normalizeBuyerRecord,
} from './invoiceCustomer';
import type { Buyer, BuyerCustomerKind } from './types';

export const BUYERS_PAGE_SIZE = 10;

export type BuyersKindFilter = 'all' | BuyerCustomerKind;

export function filterBuyersByKind(buyers: Buyer[], filter: BuyersKindFilter): Buyer[] {
  if (filter === 'all') return buyers;
  return buyers.filter((b) => normalizeBuyerRecord(b).customerKind === filter);
}

function escapeCsvCell(v: string): string {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadBuyersSpreadsheet(buyers: Buyer[], filter: BuyersKindFilter = 'all'): void {
  const rows = filterBuyersByKind(buyers.map(normalizeBuyerRecord), filter);
  const headers = [
    'Type',
    'First name',
    'Last name',
    'Company',
    'Email',
    'Phone',
    'Country',
    'Destination port',
    'Incoterm',
    'Payment terms',
    'Tax/VAT/EORI',
    'Address',
    'Notes',
    'Last used',
  ];
  const body = rows.map((b) => {
    const n = normalizeBuyerRecord(b);
    return [
      buyerKindLabel(n.customerKind),
      n.firstName || '',
      n.lastName || '',
      n.company || '',
      n.email || '',
      n.phone || '',
      n.country || '',
      n.destinationPort || '',
      n.incoterm || '',
      n.paymentTerms || '',
      n.vatId || '',
      (n.address || '').replace(/\n/g, ' '),
      (n.notes || '').replace(/\n/g, ' '),
      n.lastOrderAt ? new Date(n.lastOrderAt).toLocaleString() : '',
    ]
      .map(escapeCsvCell)
      .join(',');
  });
  const csv = [headers.join(','), ...body].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = filter === 'all' ? 'all' : filter;
  a.download = `buyers_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const cellInput =
  'w-full min-h-[34px] px-2 py-1 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400';

export type BuyersPanelProps = {
  buyers: Buyer[];
  setBuyers: React.Dispatch<React.SetStateAction<Buyer[]>>;
  selectedBuyerId: number | '';
  setSelectedBuyerId: (id: number | '') => void;
  onApplyToInvoice: (buyer: Buyer) => void;
  onOpenInvoice: () => void;
  defaultKindForNewRow?: BuyerCustomerKind;
};

function newBlankBuyer(kind: BuyerCustomerKind): Buyer {
  return normalizeBuyerRecord({
    id: Date.now() + Math.floor(Math.random() * 1000),
    customerKind: kind,
    name: '',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    country: '',
    destinationPort: '',
    incoterm: '',
    paymentTerms: '',
    address: '',
    notes: '',
    vatId: '',
    lastOrderAt: undefined,
  });
}

export function BuyersPanel({
  buyers,
  setBuyers,
  selectedBuyerId,
  setSelectedBuyerId,
  onApplyToInvoice,
  onOpenInvoice,
  defaultKindForNewRow = 'export',
}: BuyersPanelProps) {
  const [kindFilter, setKindFilter] = React.useState<BuyersKindFilter>('all');
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(
    () => filterBuyersByKind(buyers.map(normalizeBuyerRecord), kindFilter),
    [buyers, kindFilter]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / BUYERS_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  React.useEffect(() => {
    setPage(0);
  }, [kindFilter]);

  const pageRows = filtered.slice(safePage * BUYERS_PAGE_SIZE, safePage * BUYERS_PAGE_SIZE + BUYERS_PAGE_SIZE);

  const exportCount = buyers.filter((b) => normalizeBuyerRecord(b).customerKind === 'export').length;
  const servicesCount = buyers.filter((b) => normalizeBuyerRecord(b).customerKind === 'services').length;

  const updateBuyer = (id: number, patch: Partial<Buyer>) => {
    setBuyers((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        if (patch.firstName !== undefined || patch.lastName !== undefined) {
          const fn = patch.firstName !== undefined ? patch.firstName : b.firstName ?? '';
          const ln = patch.lastName !== undefined ? patch.lastName : b.lastName ?? '';
          next.name = `${fn} ${ln}`.trim();
        }
        return normalizeBuyerRecord(next);
      })
    );
  };

  const removeBuyer = (id: number) => {
    if (!window.confirm('Delete this buyer permanently?')) return;
    setBuyers((prev) => prev.filter((b) => b.id !== id));
    if (selectedBuyerId === id) setSelectedBuyerId('');
  };

  const addRow = () => {
    const kind: BuyerCustomerKind =
      kindFilter === 'services' ? 'services' : kindFilter === 'export' ? 'export' : defaultKindForNewRow;
    setBuyers((prev) => [newBlankBuyer(kind), ...prev]);
    setPage(0);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Buyers / Customers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5" dir="rtl">
            پایگاه مشتری مثل اکسل — {BUYERS_PAGE_SIZE} ردیف در هر صفحه؛ نوع «صادرات» و «خدمات» جدا است.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadBuyersSpreadsheet(buyers, kindFilter)}
            className="text-xs font-semibold border border-slate-200 bg-white text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel (CSV)
          </button>
          <button
            type="button"
            onClick={addRow}
            className="text-sm bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add row
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
          {(
            [
              ['all', `همه (${buyers.length})`],
              ['export', `صادرات (${exportCount})`],
              ['services', `خدمات (${servicesCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setKindFilter(key)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                kindFilter === key ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="tabular-nums min-w-[120px] text-center">
            Page {safePage + 1} of {pageCount}
            <span className="text-slate-400 block text-[10px]">
              Rows {filtered.length === 0 ? 0 : safePage * BUYERS_PAGE_SIZE + 1}–
              {Math.min((safePage + 1) * BUYERS_PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              <th className="border border-slate-300 px-1 py-2 w-8 text-center">#</th>
              <th className="border border-slate-300 px-2 py-2 w-8" />
              <th className="border border-slate-300 px-2 py-2 min-w-[100px] bg-amber-50/80">Type</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[88px]">First name</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[88px]">Last name</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[120px]">Company</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[130px]">Email</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[110px]">Phone</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[80px]">Country</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[90px]">Port</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[72px]">Incoterm</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[90px]">Payment</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[100px]">Tax/VAT</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[140px]">Address</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[100px]">Notes</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[108px]">Last used</th>
              <th className="border border-slate-300 px-2 py-2 min-w-[88px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={16} className="border border-slate-300 px-6 py-14 text-center text-slate-400 italic bg-slate-50/50">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No buyers in this view.</p>
                  <p className="text-xs text-slate-500 mt-1">Add a row or save a customer from the invoice tab.</p>
                </td>
              </tr>
            ) : (
              pageRows.map((b, idx) => {
                const row = normalizeBuyerRecord(b);
                const isServices = row.customerKind === 'services';
                const rowNum = safePage * BUYERS_PAGE_SIZE + idx + 1;
                return (
                  <tr
                    key={row.id}
                    className={`align-top ${isServices ? 'bg-indigo-50/40' : 'bg-white'} hover:bg-emerald-50/50`}
                  >
                    <td className="border border-slate-300 px-1 py-1 text-center text-[10px] text-slate-500 tabular-nums">
                      {rowNum}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeBuyer(row.id)}
                        className="text-slate-300 hover:text-red-500 p-0.5"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className={`border border-slate-300 p-0 ${isServices ? 'bg-indigo-50/60' : 'bg-amber-50/30'}`}>
                      <select
                        value={row.customerKind}
                        onChange={(e) =>
                          updateBuyer(row.id, { customerKind: e.target.value as BuyerCustomerKind })
                        }
                        className={`w-full min-h-[34px] px-1 py-1 text-[11px] font-semibold border-0 outline-none focus:ring-2 focus:ring-inset ${
                          isServices ? 'text-indigo-800' : 'text-emerald-800'
                        }`}
                      >
                        <option value="export">صادرات</option>
                        <option value="services">خدمات</option>
                      </select>
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.firstName ?? ''}
                        onChange={(e) => updateBuyer(row.id, { firstName: e.target.value })}
                        className={cellInput}
                        placeholder="First"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.lastName ?? ''}
                        onChange={(e) => updateBuyer(row.id, { lastName: e.target.value })}
                        className={cellInput}
                        placeholder="Last"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.company}
                        onChange={(e) => updateBuyer(row.id, { company: e.target.value })}
                        className={cellInput}
                        placeholder="Company"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateBuyer(row.id, { email: e.target.value })}
                        className={cellInput}
                        placeholder="email"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.phone}
                        onChange={(e) => updateBuyer(row.id, { phone: e.target.value })}
                        className={cellInput}
                        placeholder="Phone"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.country}
                        onChange={(e) => updateBuyer(row.id, { country: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.destinationPort}
                        onChange={(e) => updateBuyer(row.id, { destinationPort: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <select
                        value={row.incoterm}
                        onChange={(e) => updateBuyer(row.id, { incoterm: e.target.value })}
                        className={`${cellInput} text-xs`}
                      >
                        <option value="">—</option>
                        {['EXW', 'FCA', 'FOB', 'CIF', 'DDP'].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.paymentTerms}
                        onChange={(e) => updateBuyer(row.id, { paymentTerms: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.vatId || ''}
                        onChange={(e) => updateBuyer(row.id, { vatId: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.address}
                        onChange={(e) => updateBuyer(row.id, { address: e.target.value })}
                        className={cellInput}
                        placeholder="Address"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        value={row.notes}
                        onChange={(e) => updateBuyer(row.id, { notes: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-[10px] text-slate-500 whitespace-nowrap">
                      {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyToInvoice(row);
                            onOpenInvoice();
                          }}
                          disabled={!row.name && !row.company}
                          className="text-[10px] font-bold px-1.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-0.5"
                          title="Use in invoice"
                        >
                          <FileCheck className="w-3 h-3" /> Invoice
                        </button>
                        {row.email ? (
                          <a
                            href={`mailto:${row.email}`}
                            className="text-[10px] px-1.5 py-0.5 text-emerald-700 border border-emerald-200 rounded flex items-center justify-center gap-0.5 hover:bg-emerald-50"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <p className="text-[10px] text-slate-400 mt-2" dir="rtl">
          ردیف‌های خدمات با پس‌زمینه بنفش روشن؛ صادرات سفید/سبز. خروجی CSV ستون Type دارد (
          {buyerKindShort('export')} / {buyerKindShort('services')}).
        </p>
      </div>
    </div>
  );
}
