import React from 'react';
import { FileText, Plus, Save, Trash2 } from 'lucide-react';
import type { InvoiceAnnex, InvoiceAnnexPreset } from './types';
import { annexesForPrint, createEmptyAnnex } from './invoiceAnnex';
import { invoiceThemeStyle } from './invoiceTheme';

export type InvoiceAnnexEditorPanelProps = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  annexes: InvoiceAnnex[];
  onAnnexesChange: (next: InvoiceAnnex[]) => void;
  presets: InvoiceAnnexPreset[];
  onSavePreset: (annex: InvoiceAnnex) => void;
  onDeletePreset: (presetId: string) => void;
  invoiceRef: string;
};

const labelCls = 'text-xs font-semibold text-slate-500 uppercase block mb-1';

export function InvoiceAnnexEditorPanel({
  enabled,
  onEnabledChange,
  annexes,
  onAnnexesChange,
  presets,
  onSavePreset,
  onDeletePreset,
  invoiceRef,
}: InvoiceAnnexEditorPanelProps) {
  const updateAnnex = (id: string, patch: Partial<InvoiceAnnex>) => {
    onAnnexesChange(annexes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAnnex = (id: string) => {
    onAnnexesChange(annexes.filter((a) => a.id !== id));
  };

  const addAnnex = () => {
    onAnnexesChange([...annexes, createEmptyAnnex({ title: '\u0627\u0644\u062d\u0627\u0642\u06cc\u0647 / Annex' })]);
    onEnabledChange(true);
  };

  const applyPresetToNew = (presetId: string) => {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    onAnnexesChange([
      ...annexes,
      createEmptyAnnex({ title: p.title, body: p.body, includeInPrint: true }),
    ]);
    onEnabledChange(true);
  };

  return (
    <div className="p-3 rounded-lg border border-violet-200 bg-violet-50/60 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-violet-600" />
          {'\u0627\u0644\u062d\u0627\u0642\u06cc\u0647 (\u0635\u0641\u062d\u0627\u062a \u0628\u0639\u062f \u0627\u0632 \u0641\u0627\u06a9\u062a\u0648\u0631)'}
        </span>
      </label>

      <p className="text-[10px] text-slate-600 leading-snug">
        {'\u0645\u062a\u0646 \u0622\u0632\u0627\u062f (\u0645\u062b\u0644\u0627\u064b \u062a\u0641\u0627\u0647\u0645\u200c\u0646\u0627\u0645\u0647) \u0631\u0648\u06cc \u0635\u0641\u062d\u0647 \u062c\u062f\u0627 \u0686\u0627\u067e \u0645\u06cc\u200c\u0634\u0648\u062f \u0648 \u0628\u0647 \u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06a9\u062a\u0648\u0631 '}
        <span className="font-mono font-semibold">{invoiceRef || '\u2014'}</span>
        {' \u0627\u0631\u062c\u0627\u0639 \u062f\u0627\u0631\u062f.'}
      </p>

      {enabled && (
        <>
          <div className="space-y-3">
            {annexes.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                {'\u0647\u0646\u0648\u0632 \u0627\u0644\u062d\u0627\u0642\u06cc\u0647\u200c\u0627\u06cc \u0627\u0636\u0627\u0641\u0647 \u0646\u0634\u062f\u0647.'}
              </p>
            ) : (
              annexes.map((annex, idx) => (
                <div key={annex.id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-violet-700 uppercase">
                      {'\u0627\u0644\u062d\u0627\u0642\u06cc\u0647'} {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] text-slate-600">
                        <input
                          type="checkbox"
                          checked={annex.includeInPrint}
                          onChange={(e) => updateAnnex(annex.id, { includeInPrint: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        {'\u0686\u0627\u067e'}
                      </label>
                      <button
                        type="button"
                        onClick={() => onSavePreset(annex)}
                        className="text-[10px] text-violet-700 hover:text-violet-900 inline-flex items-center gap-0.5"
                        title={'\u0630\u062e\u06cc\u0631\u0647 \u0627\u0644\u06af\u0648'}
                      >
                        <Save className="w-3 h-3" /> {'\u0627\u0644\u06af\u0648'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnex(annex.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label={'\u062d\u0630\u0641'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{'\u0639\u0646\u0648\u0627\u0646'}</label>
                    <input
                      type="text"
                      value={annex.title}
                      onChange={(e) => updateAnnex(annex.id, { title: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                      placeholder={'\u0645\u062b\u0627\u0644: \u062a\u0641\u0627\u0647\u0645\u200c\u0646\u0627\u0645\u0647'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{'\u0645\u062a\u0646'}</label>
                    <textarea
                      rows={5}
                      value={annex.body}
                      onChange={(e) => updateAnnex(annex.id, { body: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 font-sans"
                      placeholder={'\u0645\u062a\u0646 \u0627\u0644\u062d\u0627\u0642\u06cc\u0647 \u0631\u0627 \u0627\u06cc\u0646\u062c\u0627 \u0628\u0646\u0648\u06cc\u0633\u06cc\u062f\u2026'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={addAnnex}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-dashed border-violet-300 text-violet-800 rounded-lg py-2 hover:bg-violet-100/50"
          >
            <Plus className="w-4 h-4" />
            {'\u0627\u0641\u0632\u0648\u062f\u0646 \u0627\u0644\u062d\u0627\u0642\u06cc\u0647'}
          </button>

          {presets.length > 0 && (
            <div>
              <label className={labelCls}>{'\u0627\u0644\u06af\u0648\u0647\u0627\u06cc \u0630\u062e\u06cc\u0631\u0647\u200c\u0634\u062f\u0647'}</label>
              <select
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) applyPresetToNew(id);
                  e.target.value = '';
                }}
              >
                <option value="">{'\u2014 \u0627\u0641\u0632\u0648\u062f\u0646 \u0627\u0632 \u0627\u0644\u06af\u0648 \u2014'}</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ul className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                {presets.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="truncate text-slate-700">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(p.id)}
                      className="text-slate-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type InvoiceAnnexPrintPagesProps = {
  enabled: boolean;
  annexes: InvoiceAnnex[];
  invoiceRef: string;
  invoiceTitle: string;
  invoiceIssueDateMs: number;
  invoiceAccentColor: string;
  billedFrom: string;
  billedFromDetails: string;
  invoiceLogo: string;
};

export function InvoiceAnnexPrintPages({
  enabled,
  annexes,
  invoiceRef,
  invoiceTitle,
  invoiceIssueDateMs,
  invoiceAccentColor,
  billedFrom,
  billedFromDetails,
  invoiceLogo,
}: InvoiceAnnexPrintPagesProps) {
  const pages = annexesForPrint(annexes, enabled);
  if (!pages.length) return null;

  const issueLabel = new Date(
    Number.isFinite(invoiceIssueDateMs) && invoiceIssueDateMs > 0 ? invoiceIssueDateMs : Date.now(),
  ).toLocaleString();

  return (
    <>
      {pages.map((annex, i) => (
        <div
          key={annex.id}
          className="invoice-doc invoice-doc--portrait invoice-annex-page shadow-md mx-auto print:shadow-none mt-6 print:mt-0"
          dir="ltr"
          style={{ display: 'flex', flexDirection: 'column', ...invoiceThemeStyle(invoiceAccentColor) }}
        >
          <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            <div className="invoice-header__seller seller-block" style={{ flex: '0 0 auto', maxWidth: 280 }}>
              {invoiceLogo ? (
                <img
                  src={invoiceLogo}
                  alt=""
                  style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain', display: 'block', marginBottom: 6 }}
                />
              ) : null}
              <div className="name">{billedFrom || '\u2014'}</div>
              {billedFromDetails ? (
                <div className="small" style={{ whiteSpace: 'pre-line' }}>
                  {billedFromDetails}
                </div>
              ) : null}
            </div>
            <div className="invoice-header__doc" style={{ textAlign: 'right', flex: 1 }}>
              <div className="small muted" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Annex / {'\u0627\u0644\u062d\u0627\u0642\u06cc\u0647'}
              </div>
              <h1 style={{ fontSize: '16pt', marginTop: 4 }}>{annex.title.trim() || 'Annex'}</h1>
              <div className="small" style={{ marginTop: 8, lineHeight: 1.5 }}>
                <div>
                  <b>Ref. Invoice #</b> {invoiceRef || '\u2014'}
                </div>
                <div>
                  <b>Main document</b> {invoiceTitle || 'Proforma Invoice'}
                </div>
                <div>
                  <b>Issue date</b> {issueLabel}
                </div>
                <div>
                  <b>Annex</b> {i + 1} of {pages.length}
                </div>
              </div>
            </div>
          </div>

          <div className="accent-bar" style={{ marginTop: 10, marginBottom: 14 }} />

          <div
            className="info-card annex-body"
            style={{
              flex: 1,
              minHeight: '180mm',
              whiteSpace: 'pre-wrap',
              fontSize: '10pt',
              lineHeight: 1.65,
              color: '#1e293b',
            }}
          >
            {annex.body.trim() || '\u2014'}
          </div>

          <div className="doc-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
            Annex {i + 1}/{pages.length} — refers to Invoice #{invoiceRef || '\u2014'} · {issueLabel}
          </div>
        </div>
      ))}
    </>
  );
}
