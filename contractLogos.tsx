import React, { type CSSProperties, type ReactNode } from 'react';
import type { ContractDef } from './types';

export type ContractHeaderLogoLayout = 'title-left' | 'title-right' | 'banner-top' | 'corners';
export type ContractLogoAlign = 'left' | 'center' | 'right';
export type ContractLogoSize = 'sm' | 'md' | 'lg';

export const CONTRACT_LOGO_LAYOUT_OPTIONS: {
  value: ContractHeaderLogoLayout;
  labelEn: string;
  labelFa: string;
}[] = [
  { value: 'title-left', labelEn: 'Logos on the left', labelFa: 'لوگوها سمت چپ عنوان' },
  { value: 'title-right', labelEn: 'Logos on the right', labelFa: 'لوگوها سمت راست عنوان' },
  { value: 'banner-top', labelEn: 'Logos above title', labelFa: 'لوگوها بالای عنوان' },
  { value: 'corners', labelEn: 'Logo 1 left, Logo 2 right', labelFa: 'لوگو ۱ چپ — لوگو ۲ راست' },
];

export const CONTRACT_LOGO_ALIGN_OPTIONS: { value: ContractLogoAlign; labelEn: string; labelFa: string }[] = [
  { value: 'left', labelEn: 'Left', labelFa: 'چپ' },
  { value: 'center', labelEn: 'Center', labelFa: 'وسط' },
  { value: 'right', labelEn: 'Right', labelFa: 'راست' },
];

export const CONTRACT_LOGO_SIZE_OPTIONS: { value: ContractLogoSize; labelEn: string; heightPx: number }[] = [
  { value: 'sm', labelEn: 'Small', heightPx: 36 },
  { value: 'md', labelEn: 'Medium', heightPx: 48 },
  { value: 'lg', labelEn: 'Large', heightPx: 64 },
];

export const CONTRACT_LOGO_LAYOUT_DEFAULT: ContractHeaderLogoLayout = 'title-left';
export const CONTRACT_LOGO_ALIGN_DEFAULT: ContractLogoAlign = 'center';
export const CONTRACT_LOGO_SIZE_DEFAULT: ContractLogoSize = 'md';

export type NormalizedContractLogos = {
  logo1Url: string;
  logo2Url: string;
  layout: ContractHeaderLogoLayout;
  align: ContractLogoAlign;
  size: ContractLogoSize;
  logoHeightPx: number;
};

export function normalizeContractLogoFields(
  c: Pick<ContractDef, 'logoUrl' | 'logo2Url' | 'contractLogoLayout' | 'contractLogoAlign' | 'contractLogoSize'>,
): NormalizedContractLogos {
  const logo1Url = typeof c.logoUrl === 'string' ? c.logoUrl.trim() : '';
  const logo2Url = typeof c.logo2Url === 'string' ? c.logo2Url.trim() : '';
  const layoutRaw = c.contractLogoLayout;
  const layout: ContractHeaderLogoLayout =
    layoutRaw === 'title-right' || layoutRaw === 'banner-top' || layoutRaw === 'corners'
      ? layoutRaw
      : CONTRACT_LOGO_LAYOUT_DEFAULT;
  const alignRaw = c.contractLogoAlign;
  const align: ContractLogoAlign =
    alignRaw === 'left' || alignRaw === 'right' ? alignRaw : CONTRACT_LOGO_ALIGN_DEFAULT;
  const sizeRaw = c.contractLogoSize;
  const size: ContractLogoSize = sizeRaw === 'sm' || sizeRaw === 'lg' ? sizeRaw : CONTRACT_LOGO_SIZE_DEFAULT;
  const logoHeightPx =
    CONTRACT_LOGO_SIZE_OPTIONS.find((o) => o.value === size)?.heightPx ??
    CONTRACT_LOGO_SIZE_OPTIONS.find((o) => o.value === CONTRACT_LOGO_SIZE_DEFAULT)!.heightPx;

  return { logo1Url, logo2Url, layout, align, size, logoHeightPx };
}

function flexJustify(align: ContractLogoAlign): string {
  if (align === 'left') return 'flex-start';
  if (align === 'right') return 'flex-end';
  return 'center';
}

function escapeHtmlContract(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logoImgHtml(url: string, heightPx: number): string {
  const src = url.replace(/"/g, '&quot;');
  return `<img src="${src}" alt="" style="max-height:${heightPx}px;height:${heightPx}px;width:auto;object-fit:contain;display:block" />`;
}

function logosColumnHtml(urls: string[], heightPx: number, gapPx: number): string {
  if (!urls.length) return '';
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:${gapPx}px;flex-shrink:0">${urls
    .map((u) => logoImgHtml(u, heightPx))
    .join('')}</div>`;
}

function logosRowHtml(urls: string[], heightPx: number, gapPx: number, align: ContractLogoAlign): string {
  if (!urls.length) return '';
  return `<div style="display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:${flexJustify(align)};gap:${gapPx}px;width:100%;margin-bottom:10px">${urls
    .map((u) => logoImgHtml(u, heightPx))
    .join('')}</div>`;
}

function buildContractTitleBlockHtml(c: ContractDef, opts?: { fontTitlePt?: number; fontSubPt?: number }): string {
  const titlePt = opts?.fontTitlePt ?? 13;
  const subPt = opts?.fontSubPt ?? 10;
  const eff = c.effectiveDate
    ? new Date(c.effectiveDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return `<div style="flex:1;text-align:center;min-width:0">
    <div style="font-size:${titlePt}pt;font-weight:bold">${escapeHtmlContract(c.titleEn)}</div>
    ${c.titleRtl ? `<div style="font-size:${titlePt - 1}pt;font-weight:600;color:#334155" dir="rtl">${escapeHtmlContract(c.titleRtl)}</div>` : ''}
    ${c.subtitleEn ? `<div style="font-size:${subPt}pt;font-style:italic;color:#64748b;margin-top:4px">${escapeHtmlContract(c.subtitleEn)}</div>` : ''}
    ${c.subtitleRtl ? `<div style="font-size:${subPt}pt;font-style:italic;color:#64748b" dir="rtl">${escapeHtmlContract(c.subtitleRtl)}</div>` : ''}
    <div style="font-size:9pt;color:#64748b;margin-top:8px">
      ${c.refNo ? `Ref. ${escapeHtmlContract(c.refNo)}` : ''}${c.refNo && eff ? ' | ' : ''}${eff ? `Date: ${escapeHtmlContract(eff)}` : ''}
    </div>
  </div>`;
}

/** Header block HTML for Word export and print. */
export function buildContractHeaderHtml(c: ContractDef, _rtlFont: string): string {
  const n = normalizeContractLogoFields(c);
  const urls = [n.logo1Url, n.logo2Url].filter(Boolean);
  const h = n.logoHeightPx;
  const gap = 8;
  const title = buildContractTitleBlockHtml(c);
  const border = 'border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:12px';

  if (!urls.length) {
    return `<div style="text-align:center;${border}">${title.replace('flex:1;text-align:center', 'text-align:center')}</div>`;
  }

  if (n.layout === 'banner-top') {
    return `<div style="${border}">
      ${logosRowHtml(urls, h, gap, n.align)}
      ${title.replace('flex:1;text-align:center', 'text-align:center;width:100%')}
    </div>`;
  }

  if (n.layout === 'corners') {
    const left = n.logo1Url ? logoImgHtml(n.logo1Url, h) : '';
    const right = n.logo2Url ? logoImgHtml(n.logo2Url, h) : '';
    return `<div style="${border}">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="width:28%;vertical-align:middle;text-align:left">${left}</td>
        <td style="width:44%;vertical-align:middle">${title.replace('flex:1;', '')}</td>
        <td style="width:28%;vertical-align:middle;text-align:right">${right}</td>
      </tr></table>
    </div>`;
  }

  const logos = logosColumnHtml(urls, h, gap);
  const rowDir = n.layout === 'title-right' ? 'row-reverse' : 'row';

  return `<div style="${border}">
    <div style="display:flex;flex-direction:${rowDir};align-items:flex-start;gap:16px">
      ${logos}
      ${title}
    </div>
  </div>`;
}

export function contractHeaderBorderClass(): string {
  return 'border-b-2 border-slate-800 pb-4';
}

export function contractHeaderPaddingClass(): string {
  return 'p-6';
}

type HeaderBlockProps = {
  c: ContractDef;
  rtlFont: string;
};

function LogoImg({ url, heightPx }: { url: string; heightPx: number }) {
  return (
    <img
      src={url}
      alt=""
      className="object-contain w-auto flex-shrink-0"
      style={{ maxHeight: heightPx, height: heightPx }}
    />
  );
}

function TitleBlock({ c, rtlFont }: HeaderBlockProps) {
  return (
    <div className="flex-1 text-center min-w-0">
      <div className="text-[11pt] font-bold tracking-wide mb-0.5">{c.titleEn}</div>
      {c.titleRtl && (
        <div className="text-[10.5pt] font-semibold text-slate-700" dir="rtl" style={{ fontFamily: rtlFont }}>
          {c.titleRtl}
        </div>
      )}
      {c.subtitleEn && <div className="text-[9pt] italic text-slate-500 mt-1">{c.subtitleEn}</div>}
      {c.subtitleRtl && (
        <div className="text-[9pt] italic text-slate-500" dir="rtl" style={{ fontFamily: rtlFont }}>
          {c.subtitleRtl}
        </div>
      )}
      <div className="text-center text-[8.5pt] text-slate-500 mt-3 space-x-2">
        {c.refNo && <span>Ref. No. {c.refNo}</span>}
        {c.refNo && c.effectiveDate && <span>|</span>}
        {c.effectiveDate && (
          <span>
            Date:{' '}
            {new Date(c.effectiveDate + 'T00:00:00').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

function LogosColumn({ urls, heightPx }: { urls: string[]; heightPx: number }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {urls.map((url, i) => (
        <LogoImg key={`${url.slice(0, 24)}-${i}`} url={url} heightPx={heightPx} />
      ))}
    </div>
  );
}

function LogosRow({ urls, heightPx, align }: { urls: string[]; heightPx: number; align: ContractLogoAlign }) {
  if (!urls.length) return null;
  const justify: CSSProperties['justifyContent'] =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  return (
    <div className="flex flex-row flex-wrap items-center gap-2 w-full mb-3" style={{ justifyContent: justify }}>
      {urls.map((url, i) => (
        <LogoImg key={`${url.slice(0, 24)}-${i}`} url={url} heightPx={heightPx} />
      ))}
    </div>
  );
}

/** React header for contract preview. */
export function ContractHeaderBlock({ c, rtlFont }: HeaderBlockProps): ReactNode {
  const n = normalizeContractLogoFields(c);
  const urls = [n.logo1Url, n.logo2Url].filter(Boolean);
  const wrapCls = `${contractHeaderBorderClass()} ${contractHeaderPaddingClass()}`;

  if (!urls.length) {
    return (
      <div className={wrapCls}>
        <TitleBlock c={c} rtlFont={rtlFont} />
      </div>
    );
  }

  if (n.layout === 'banner-top') {
    return (
      <div className={wrapCls}>
        <LogosRow urls={urls} heightPx={n.logoHeightPx} align={n.align} />
        <TitleBlock c={c} rtlFont={rtlFont} />
      </div>
    );
  }

  if (n.layout === 'corners') {
    return (
      <div className={wrapCls}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 w-full">
          <div className="flex justify-start">
            {n.logo1Url ? <LogoImg url={n.logo1Url} heightPx={n.logoHeightPx} /> : null}
          </div>
          <div className="min-w-0">
            <TitleBlock c={c} rtlFont={rtlFont} />
          </div>
          <div className="flex justify-end">
            {n.logo2Url ? <LogoImg url={n.logo2Url} heightPx={n.logoHeightPx} /> : null}
          </div>
        </div>
      </div>
    );
  }

  const logos = <LogosColumn urls={urls} heightPx={n.logoHeightPx} />;
  const title = <TitleBlock c={c} rtlFont={rtlFont} />;
  const flexDir = n.layout === 'title-right' ? 'flex-row-reverse' : 'flex-row';

  return (
    <div className={wrapCls}>
      <div className={`flex ${flexDir} items-start gap-4`}>
        {logos}
        {title}
      </div>
    </div>
  );
}

export type ContractLogosEditorProps = {
  c: ContractDef;
  onChange: (patch: Partial<ContractDef>) => void;
  inputCls: string;
  labelCls: string;
};

/** Contract editor: two logo URLs + placement on the printed header. */
export function ContractLogosEditor({ c, onChange, inputCls, labelCls }: ContractLogosEditorProps) {
  const n = normalizeContractLogoFields(c);
  const showAlign = n.layout === 'banner-top';

  return (
    <div className="col-span-2 space-y-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
      <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide" dir="rtl">
        لوگوهای قرارداد (حداکثر ۲ لینک)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Logo 1 URL</label>
          <input
            type="url"
            value={c.logoUrl || ''}
            onChange={(e) => onChange({ logoUrl: e.target.value })}
            className={inputCls}
            placeholder="https://…"
          />
          {n.logo1Url ? (
            <img src={n.logo1Url} alt="" className="mt-2 h-10 object-contain max-w-[160px] border border-slate-200 rounded bg-white p-1" />
          ) : null}
        </div>
        <div>
          <label className={labelCls}>Logo 2 URL</label>
          <input
            type="url"
            value={c.logo2Url || ''}
            onChange={(e) => onChange({ logo2Url: e.target.value })}
            className={inputCls}
            placeholder="https://… (optional)"
          />
          {n.logo2Url ? (
            <img src={n.logo2Url} alt="" className="mt-2 h-10 object-contain max-w-[160px] border border-slate-200 rounded bg-white p-1" />
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls} dir="rtl">
            جایگاه لوگو
          </label>
          <select
            value={n.layout}
            onChange={(e) => onChange({ contractLogoLayout: e.target.value as ContractHeaderLogoLayout })}
            className={inputCls}
          >
            {CONTRACT_LOGO_LAYOUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.labelFa}
              </option>
            ))}
          </select>
        </div>
        {showAlign ? (
          <div>
            <label className={labelCls} dir="rtl">
              تراز ردیف لوگو
            </label>
            <select
              value={n.align}
              onChange={(e) => onChange({ contractLogoAlign: e.target.value as ContractLogoAlign })}
              className={inputCls}
            >
              {CONTRACT_LOGO_ALIGN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelFa}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div>
          <label className={labelCls}>Logo size</label>
          <select
            value={n.size}
            onChange={(e) => onChange({ contractLogoSize: e.target.value as ContractLogoSize })}
            className={inputCls}
          >
            {CONTRACT_LOGO_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.labelEn} ({o.heightPx}px)
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[10px] text-slate-600 leading-snug" dir="rtl">
        در حالت «لوگو ۱ چپ — لوگو ۲ راست» هر لوگو در گوشه‌ی سربرگ قرار می‌گیرد. پیش‌نمایش و چاپ/Word از همین تنظیمات پیروی می‌کنند.
      </p>
    </div>
  );
}
