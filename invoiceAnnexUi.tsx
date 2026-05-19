import React, { useRef, useState } from 'react';
import { FileText, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import type { InvoiceAnnex, InvoiceAnnexImage, InvoiceAnnexPreset } from './types';
import {
  ANNEX_IMAGE_ACCEPT,
  ANNEX_IMAGE_FORMATS_LABEL,
  MAX_ANNEX_IMAGES_PER_ANNEX,
  annexesForPrint,
  createEmptyAnnex,
  newAnnexImageId,
  readAnnexImageFiles,
  type InvoiceAnnexProjectImageOption,
} from './invoiceAnnex';
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
  projectImages?: InvoiceAnnexProjectImageOption[];
  compressImageSrc?: (dataUrl: string) => Promise<string>;
};

const labelCls = 'text-xs font-semibold text-slate-500 uppercase block mb-1';

function AnnexImageEditor({
  annex,
  onChange,
  projectImages,
  compressImageSrc,
}: {
  annex: InvoiceAnnex;
  onChange: (patch: Partial<InvoiceAnnex>) => void;
  projectImages: InvoiceAnnexProjectImageOption[];
  compressImageSrc?: (dataUrl: string) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const images = annex.images ?? [];
  const atLimit = images.length >= MAX_ANNEX_IMAGES_PER_ANNEX;

  const setImages = (next: InvoiceAnnexImage[]) => {
    onChange({ images: next });
  };

  const addImages = (incoming: InvoiceAnnexImage[]) => {
    if (!incoming.length) return;
    const room = MAX_ANNEX_IMAGES_PER_ANNEX - images.length;
    if (room <= 0) return;
    setImages([...images, ...incoming.slice(0, room)]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || atLimit) return;
    setBusy(true);
    try {
      const read = await readAnnexImageFiles(files, { compress: compressImageSrc });
      addImages(read);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addFromProject = (opt: InvoiceAnnexProjectImageOption) => {
    if (atLimit) return;
    if (images.some((im) => im.src === opt.src)) return;
    addImages([{ id: newAnnexImageId(), src: opt.src, name: opt.label, caption: '' }]);
  };

  return (
    <div className="space-y-2 border-t border-slate-100 pt-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1">
          <ImagePlus className="w-3 h-3" />
          {'\u062a\u0635\u0627\u0648\u06cc\u0631'} ({images.length}/{MAX_ANNEX_IMAGES_PER_ANNEX})
        </label>
        <span className="text-[9px] text-slate-400">{ANNEX_IMAGE_FORMATS_LABEL}</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ANNEX_IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={atLimit || busy}
          onClick={() => fileRef.current?.click()}
          className="text-[10px] font-semibold px-2 py-1 rounded border border-violet-200 text-violet-800 bg-white hover:bg-violet-50 disabled:opacity-50"
        >
          {busy ? '...' : '\u0627\u0641\u0632\u0648\u062f\u0646 \u0641\u0627\u06cc\u0644'}
        </button>
        {projectImages.length > 0 && (
          <button
            type="button"
            disabled={atLimit}
            onClick={() => setShowProjectPicker((v) => !v)}
            className="text-[10px] font-semibold px-2 py-1 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {'\u0627\u0632 \u067e\u0631\u0648\u0698\u0647'}
          </button>
        )}
      </div>

      {showProjectPicker && projectImages.length > 0 && (
        <div className="max-h-36 overflow-y-auto grid grid-cols-3 gap-1.5 p-1.5 bg-slate-50 rounded border border-slate-200">
          {projectImages.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              onClick={() => addFromProject(opt)}
              className="relative aspect-square rounded overflow-hidden border border-slate-200 hover:ring-2 hover:ring-violet-400"
            >
              <img src={opt.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((img) => (
            <div key={img.id} className="flex gap-2 p-1.5 rounded border border-slate-200 bg-slate-50/80">
              <img
                src={img.src}
                alt=""
                className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[9px] text-slate-500 truncate">{img.name || '\u2014'}</p>
                <input
                  type="text"
                  value={img.caption ?? ''}
                  onChange={(e) =>
                    setImages(
                      images.map((x) => (x.id === img.id ? { ...x, caption: e.target.value } : x)),
                    )
                  }
                  className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5"
                  placeholder={'\u0639\u0646\u0648\u0627\u0646 \u062a\u0635\u0648\u06cc\u0631 (\u0627\u062e\u062a\u06cc\u0627\u0631\u06cc)'}
                />
              </div>
              <button
                type="button"
                onClick={() => setImages(images.filter((x) => x.id !== img.id))}
                className="text-slate-400 hover:text-red-600 shrink-0 self-start"
                aria-label={'\u062d\u0630\u0641'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InvoiceAnnexEditorPanel({
  enabled,
  onEnabledChange,
  annexes,
  onAnnexesChange,
  presets,
  onSavePreset,
  onDeletePreset,
  invoiceRef,
  projectImages = [],
  compressImageSrc,
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
        {'\u0645\u062a\u0646 \u0648 \u062a\u0635\u0627\u0648\u06cc\u0631 \u067e\u0631\u0648\u0698\u0647 ('}
        {ANNEX_IMAGE_FORMATS_LABEL}
        {') \u0631\u0648\u06cc \u0635\u0641\u062d\u0647 \u062c\u062f\u0627 \u0686\u0627\u067e \u0645\u06cc\u200c\u0634\u0648\u062f. \u0627\u0631\u062c\u0627\u0639: '}
        <span className="font-mono font-semibold">{invoiceRef || '\u2014'}</span>
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
                        title={'\u0630\u062e\u06cc\u0631\u0647 \u0627\u0644\u06af\u0648 (\u0641\u0642\u0637 \u0645\u062a\u0646)'}
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
                      placeholder={'\u0645\u062b\u0627\u0644: \u062a\u0635\u0627\u0648\u06cc\u0631 \u067e\u0631\u0648\u0698\u0647'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{'\u0645\u062a\u0646'}</label>
                    <textarea
                      rows={4}
                      value={annex.body}
                      onChange={(e) => updateAnnex(annex.id, { body: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 font-sans"
                      placeholder={'\u062a\u0648\u0636\u06cc\u062d\u0627\u062a \u0645\u062a\u0646\u06cc\u2026'}
                    />
                  </div>
                  <AnnexImageEditor
                    annex={annex}
                    onChange={(patch) => updateAnnex(annex.id, patch)}
                    projectImages={projectImages}
                    compressImageSrc={compressImageSrc}
                  />
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

function AnnexPrintImageGrid({ images, afterBody }: { images: InvoiceAnnexImage[]; afterBody?: boolean }) {
  if (!images.length) return null;
  const cols = images.length === 1 ? 1 : images.length === 2 ? 2 : 3;
  return (
    <div
      className="annex-images-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 10,
        marginTop: afterBody ? 12 : 0,
      }}
    >
      {images.map((img) => (
        <figure
          key={img.id}
          className="annex-image-cell"
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid', margin: 0 }}
        >
          <img
            src={img.src}
            alt={img.caption || img.name || ''}
            style={{
              width: '100%',
              maxHeight: cols === 1 ? '200mm' : '85mm',
              objectFit: 'contain',
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              background: '#fff',
            }}
          />
          {(img.caption || img.name) && (
            <figcaption
              style={{
                fontSize: '8pt',
                color: '#64748b',
                marginTop: 4,
                textAlign: 'center',
                lineHeight: 1.35,
              }}
            >
              {img.caption?.trim() || img.name}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

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
      {pages.map((annex, i) => {
        const imgs = annex.images ?? [];
        const hasBody = !!annex.body.trim();
        return (
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
                minHeight: imgs.length && !hasBody ? 'auto' : hasBody ? '40mm' : '180mm',
                whiteSpace: 'pre-wrap',
                fontSize: '10pt',
                lineHeight: 1.65,
                color: '#1e293b',
              }}
            >
              {hasBody ? annex.body.trim() : imgs.length ? null : '\u2014'}
              <AnnexPrintImageGrid images={imgs} afterBody={hasBody} />
            </div>

            <div className="doc-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              Annex {i + 1}/{pages.length} — refers to Invoice #{invoiceRef || '\u2014'} · {issueLabel}
            </div>
          </div>
        );
      })}
    </>
  );
}
