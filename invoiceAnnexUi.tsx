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
import { AnnexParagraphsEditor, AnnexParagraphsPrint } from './invoiceAnnexParagraphsUi';
import { annexHasParagraphText } from './invoiceAnnexParagraphs';

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

type ImageGridLayout = '4' | '6' | '9';
const GRID_CONFIG: Record<ImageGridLayout, { cols: number; perPage: number; label: string }> = {
  '4': { cols: 2, perPage: 4,  label: '2 × 2' },
  '6': { cols: 3, perPage: 6,  label: '3 × 2' },
  '9': { cols: 3, perPage: 9,  label: '3 × 3' },
};

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

  const activeLayout = (annex.imageGridLayout || '9') as ImageGridLayout;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1">
          <ImagePlus className="w-3 h-3" />
          {'تصاویر'} ({images.length}/{MAX_ANNEX_IMAGES_PER_ANNEX})
        </label>
        <span className="text-[9px] text-slate-400">{ANNEX_IMAGE_FORMATS_LABEL}</span>
      </div>

      {/* Grid layout selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] text-slate-500 font-semibold shrink-0">{'چیدمان:'}</span>
        {(['4', '6', '9'] as ImageGridLayout[]).map((lay) => {
          const cfg = GRID_CONFIG[lay];
          const active = activeLayout === lay;
          return (
            <button
              key={lay}
              type="button"
              onClick={() => onChange({ imageGridLayout: lay })}
              title={`${cfg.label} — ${cfg.perPage} عکس در صفحه`}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
        <span className="text-[9px] text-slate-400">{GRID_CONFIG[activeLayout].perPage}{'عکس/صفحه'}</span>
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
          {busy ? '...' : 'افزودن فایل'}
        </button>
        {projectImages.length > 0 && (
          <button
            type="button"
            disabled={atLimit}
            onClick={() => setShowProjectPicker((v) => !v)}
            className="text-[10px] font-semibold px-2 py-1 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {'از پروژه'}
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
          {/* Thumbnail preview grid matching selected layout */}
          <div
            className="grid gap-1 p-1.5 bg-slate-50 rounded border border-slate-100"
            style={{ gridTemplateColumns: `repeat(${GRID_CONFIG[activeLayout].cols}, minmax(0, 1fr))` }}
          >
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group"
                style={{ paddingBottom: '100%', position: 'relative', overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0' }}
              >
                <img
                  src={img.src}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((x) => x.id !== img.id))}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={'حذف'}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Caption editor */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {images.map((img, i) => (
              <div key={img.id} className="flex gap-1.5 items-center">
                <span className="text-[9px] text-slate-400 shrink-0 w-4 text-right">{i + 1}</span>
                <input
                  type="text"
                  value={img.caption ?? ''}
                  onChange={(e) =>
                    setImages(images.map((x) => (x.id === img.id ? { ...x, caption: e.target.value } : x)))
                  }
                  className="flex-1 text-[10px] border border-slate-200 rounded px-1.5 py-0.5"
                  placeholder={'عنوان تصویر (اختیاری)'}
                />
              </div>
            ))}
          </div>
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
    onAnnexesChange([...annexes, createEmptyAnnex({ title: 'الحاقیه / Annex' })]);
    onEnabledChange(true);
  };

  const applyPresetToNew = (presetId: string) => {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    onAnnexesChange([
      ...annexes,
      createEmptyAnnex({
        title: p.title,
        body: p.body,
        paragraphs: p.paragraphs,
        includeInPrint: true,
      }),
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
          {'الحاقیه (صفحات بعد از فاکتور)'}
        </span>
      </label>

      <p className="text-[10px] text-slate-600 leading-snug">
        {'متن و تصاویر پروژه ('}
        {ANNEX_IMAGE_FORMATS_LABEL}
        {') روی صفحه جدا چاپ می‌شود. ارجاع: '}
        <span className="font-mono font-semibold">{invoiceRef || '—'}</span>
      </p>

      {enabled && (
        <>
          <div className="space-y-3">
            {annexes.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                {'هنوز الحاقیه‌ای اضافه نشده.'}
              </p>
            ) : (
              annexes.map((annex, idx) => (
                <div key={annex.id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-violet-700 uppercase">
                      {'الحاقیه'} {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] text-slate-600">
                        <input
                          type="checkbox"
                          checked={annex.includeInPrint}
                          onChange={(e) => updateAnnex(annex.id, { includeInPrint: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        {'چاپ'}
                      </label>
                      <button
                        type="button"
                        onClick={() => onSavePreset(annex)}
                        className="text-[10px] text-violet-700 hover:text-violet-900 inline-flex items-center gap-0.5"
                        title={'ذخیره الگو (فقط متن)'}
                      >
                        <Save className="w-3 h-3" /> {'الگو'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnex(annex.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label={'حذف'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{'عنوان'}</label>
                    <input
                      type="text"
                      value={annex.title}
                      onChange={(e) => updateAnnex(annex.id, { title: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                      placeholder={'مثال: تصاویر پروژه'}
                    />
                  </div>
                  <AnnexParagraphsEditor
                    annex={annex}
                    onAnnexChange={(next) => onAnnexesChange(annexes.map((a) => (a.id === annex.id ? next : a)))}
                  />
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
            {'افزودن الحاقیه'}
          </button>

          {presets.length > 0 && (
            <div>
              <label className={labelCls}>{'الگوهای ذخیره‌شده'}</label>
              <select
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) applyPresetToNew(id);
                  e.target.value = '';
                }}
              >
                <option value="">{'— افزودن از الگو —'}</option>
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

function AnnexPrintImageGrid({
  images,
  cols,
  afterBody,
}: {
  images: InvoiceAnnexImage[];
  cols: number;
  afterBody?: boolean;
}) {
  if (!images.length) return null;
  return (
    <div
      className="annex-images-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 8,
        marginTop: afterBody ? 14 : 0,
      }}
    >
      {images.map((img) => (
        <figure
          key={img.id}
          className="annex-image-cell"
          style={{ margin: 0, breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          {/* Square wrapper using padding-bottom trick */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '100%',
              overflow: 'hidden',
              borderRadius: 5,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <img
              src={img.src}
              alt={img.caption || img.name || ''}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
          {(img.caption?.trim() || img.name) && (
            <figcaption
              style={{
                fontSize: '7.5pt',
                color: '#64748b',
                marginTop: 3,
                textAlign: 'center',
                lineHeight: 1.3,
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
  const printAnnexes = annexesForPrint(annexes, enabled);
  if (!printAnnexes.length) return null;

  const issueLabel = new Date(
    Number.isFinite(invoiceIssueDateMs) && invoiceIssueDateMs > 0 ? invoiceIssueDateMs : Date.now(),
  ).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  type PageEntry = {
    annex: InvoiceAnnex;
    imgs: InvoiceAnnexImage[];
    showBody: boolean;
    chunkIdx: number;
    totalChunks: number;
    cols: number;
  };

  const allPages: PageEntry[] = [];
  printAnnexes.forEach((annex) => {
    const layout = (annex.imageGridLayout || '9') as ImageGridLayout;
    const { cols, perPage } = GRID_CONFIG[layout];
    const imgs = annex.images ?? [];
    const hasBody = annexHasParagraphText(annex);

    if (imgs.length === 0) {
      allPages.push({ annex, imgs: [], showBody: hasBody, chunkIdx: 0, totalChunks: 1, cols });
      return;
    }
    const chunkCount = Math.ceil(imgs.length / perPage);
    for (let ci = 0; ci < chunkCount; ci++) {
      allPages.push({
        annex,
        imgs: imgs.slice(ci * perPage, (ci + 1) * perPage),
        showBody: ci === 0 && hasBody,
        chunkIdx: ci,
        totalChunks: chunkCount,
        cols,
      });
    }
  });

  return (
    <>
      {allPages.map((entry, pageIdx) => {
        const { annex, imgs, showBody, chunkIdx, totalChunks, cols } = entry;
        const titleSuffix = totalChunks > 1 ? ` (${chunkIdx + 1}/${totalChunks})` : '';
        return (
          <div
            key={`${annex.id}-${chunkIdx}`}
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
                <div className="name">{billedFrom || '—'}</div>
                {billedFromDetails ? (
                  <div className="small" style={{ whiteSpace: 'pre-line' }}>{billedFromDetails}</div>
                ) : null}
              </div>
              <div className="invoice-header__doc" style={{ textAlign: 'right', flex: 1 }}>
                <div className="small muted" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  Annex / {'الحاقیه'}
                </div>
                <h1 style={{ fontSize: '16pt', marginTop: 4 }}>{(annex.title.trim() || 'Annex') + titleSuffix}</h1>
                <div className="small" style={{ marginTop: 8, lineHeight: 1.5 }}>
                  <div><b>Ref. #</b> {invoiceRef || '—'}</div>
                  <div><b>Document</b> {invoiceTitle || 'Proforma Invoice'}</div>
                  <div><b>Date</b> {issueLabel}</div>
                  <div><b>Page</b> {pageIdx + 1} of {allPages.length}</div>
                </div>
              </div>
            </div>

            <div className="accent-bar" style={{ marginTop: 10, marginBottom: 14 }} />

            <div
              className="info-card annex-body"
              style={{ flex: 1, fontSize: '10pt', lineHeight: 1.65, color: '#1e293b' }}
            >
              {showBody ? <AnnexParagraphsPrint annex={annex} /> : null}
              {imgs.length > 0
                ? <AnnexPrintImageGrid images={imgs} cols={cols} afterBody={showBody} />
                : (!showBody ? <span style={{ color: '#94a3b8' }}>{'—'}</span> : null)}
            </div>

            <div className="doc-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              Page {pageIdx + 1}/{allPages.length} — Annex ref. #{invoiceRef || '—'} · {issueLabel}
            </div>
          </div>
        );
      })}
    </>
  );
}
