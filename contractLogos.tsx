import React, { type CSSProperties, type ReactNode } from 'react';
import type { ContractDef } from './types';

export type ContractHeaderLogoLayout =
  | 'title-left'
  | 'title-right'
  | 'banner-top'
  | 'corners'
  | 'corners-mirror';

export type ContractLogoAlign = 'left' | 'center' | 'right';
export type ContractLogoSide = ContractLogoAlign;
export type ContractLogoSize = 'sm' | 'md' | 'lg';
export type ContractLogoSpread = 'compact' | 'wide';

export const CONTRACT_LOGO_LAYOUT_OPTIONS: {
  value: ContractHeaderLogoLayout;
  labelEn: string;
  labelFa: string;
}[] = [
  { value: 'title-left', labelEn: 'Logos on the left', labelFa: 'لوگوها سمت چپ عنوان' },
  { value: 'title-right', labelEn: 'Logos on the right', labelFa: 'لوگوها سمت راست عنوان' },
  { value: 'banner-top', labelEn: 'Logos above title', labelFa: 'لوگوها بالای عنوان' },
  { value: 'corners', labelEn: 'Logo 1 left, Logo 2 right', labelFa: 'لوگو ۱ چپ — لوگو ۲ راست' },
  {
    value: 'corners-mirror',
    labelEn: 'Logo 1 right, Logo 2 left',
    labelFa: 'لوگو ۱ راست — لوگو ۲ چپ',
  },
];

export const CONTRACT_LOGO_ALIGN_OPTIONS: { value: ContractLogoAlign; labelEn: string; labelFa: string }[] = [
  { value: 'left', labelEn: 'Left', labelFa: 'چپ' },
  { value: 'center', labelEn: 'Center', labelFa: 'وسط' },
  { value: 'right', labelEn: 'Right', labelFa: 'راست' },
];

export const CONTRACT_LOGO_SPREAD_OPTIONS: { value: ContractLogoSpread; labelEn: string; labelFa: string }[] = [
  { value: 'compact', labelEn: 'Close together', labelFa: 'نزدیک به هم' },
  { value: 'wide', labelEn: 'Opposite edges', labelFa: 'دو گوشه صفحه' },
];

export const CONTRACT_LOGO_SIZE_OPTIONS: { value: ContractLogoSize; labelEn: string; heightPx: number }[] = [
  { value: 'sm', labelEn: 'Small', heightPx: 40 },
  { value: 'md', labelEn: 'Medium', heightPx: 52 },
  { value: 'lg', labelEn: 'Large', heightPx: 68 },
];

export const CONTRACT_LOGO_LAYOUT_DEFAULT: ContractHeaderLogoLayout = 'title-left';
export const CONTRACT_LOGO_ALIGN_DEFAULT: ContractLogoAlign = 'center';
export const CONTRACT_LOGO_SIZE_DEFAULT: ContractLogoSize = 'md';
export const CONTRACT_LOGO_SPREAD_DEFAULT: ContractLogoSpread = 'wide';
export const CONTRACT_LOGO_GAP_DEFAULT = 32;
export const CONTRACT_LOGO_INSET_DEFAULT = 0;
export const CONTRACT_LOGO_GAP_MIN = 0;
export const CONTRACT_LOGO_GAP_MAX = 200;
export const CONTRACT_LOGO_INSET_MAX = 80;

export type NormalizedContractLogos = {
  logo1Url: string;
  logo2Url: string;
  layout: ContractHeaderLogoLayout;
  align: ContractLogoAlign;
  size: ContractLogoSize;
  logoHeightPx: number;
  spread: ContractLogoSpread;
  gapPx: number;
  insetPx: number;
  logo1Side: ContractLogoSide;
  logo2Side: ContractLogoSide;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeSide(raw: unknown, fallback: ContractLogoSide): ContractLogoSide {
  return raw === 'left' || raw === 'center' || raw === 'right' ? raw : fallback;
}

export function normalizeContractLogoFields(
  c: Pick<
    ContractDef,
    | 'logoUrl'
    | 'logo2Url'
    | 'contractLogoLayout'
    | 'contractLogoAlign'
    | 'contractLogoSize'
    | 'contractLogoSpread'
    | 'contractLogoGapPx'
    | 'contractLogoInsetPx'
    | 'contractLogo1Side'
    | 'contractLogo2Side'
  >,
): NormalizedContractLogos {
  const logo1Url = typeof c.logoUrl === 'string' ? c.logoUrl.trim() : '';
  const logo2Url = typeof c.logo2Url === 'string' ? c.logo2Url.trim() : '';
  const layoutRaw = c.contractLogoLayout;
  const layout: ContractHeaderLogoLayout =
    layoutRaw === 'title-right' ||
    layoutRaw === 'banner-top' ||
    layoutRaw === 'corners' ||
    layoutRaw === 'corners-mirror'
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
  const spread: ContractLogoSpread =
    c.contractLogoSpread === 'compact' ? 'compact' : CONTRACT_LOGO_SPREAD_DEFAULT;
  const gapPx = clamp(
    typeof c.contractLogoGapPx === 'number' && Number.isFinite(c.contractLogoGapPx)
      ? Math.round(c.contractLogoGapPx)
      : CONTRACT_LOGO_GAP_DEFAULT,
    CONTRACT_LOGO_GAP_MIN,
    CONTRACT_LOGO_GAP_MAX,
  );
  const insetPx = clamp(
    typeof c.contractLogoInsetPx === 'number' && Number.isFinite(c.contractLogoInsetPx)
      ? Math.round(c.contractLogoInsetPx)
      : CONTRACT_LOGO_INSET_DEFAULT,
    0,
    CONTRACT_LOGO_INSET_MAX,
  );
  const logo1Side = normalizeSide(c.contractLogo1Side, 'left');
  const logo2Side = normalizeSide(c.contractLogo2Side, 'right');

  return { logo1Url, logo2Url, layout, align, size, logoHeightPx, spread, gapPx, insetPx, logo1Side, logo2Side };
}

function flexJustify(align: ContractLogoAlign): string {
  if (align === 'left') return 'flex-start';
  if (align === 'right') return 'flex-end';
  return 'center';
}

function sideToFlex(side: ContractLogoSide): string {
  return flexJustify(side);
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

function logosDualRowHtml(
  logo1: string,
  logo2: string,
  heightPx: number,
  n: NormalizedContractLogos,
): string {
  const urls = [logo1, logo2].filter(Boolean);
  if (!urls.length) return '';
  const h = heightPx;
  const inset = n.insetPx;
  const gap = n.gapPx;

  if (n.spread === 'wide' && logo1 && logo2) {
    const l1 = logoImgHtml(logo1, h);
    const l2 = logoImgHtml(logo2, h);
    return `<div style="position:relative;width:100%;min-height:${h}px;margin-bottom:8px;padding:0 ${inset}px;box-sizing:border-box">
      <div style="position:absolute;top:0;left:${inset}px">${l1}</div>
      <div style="position:absolute;top:0;right:${inset}px">${l2}</div>
    </div>`;
  }

  if (logo1 && logo2) {
    const justify =
      n.logo1Side === n.logo2Side
        ? sideToFlex(n.logo1Side)
        : 'space-between';
    return `<div style="display:flex;flex-direction:row;align-items:center;justify-content:${justify};flex-wrap:wrap;gap:${gap}px;width:100%;margin-bottom:8px;padding:0 ${inset}px;box-sizing:border-box">
      ${logoImgHtml(logo1, h)}
      ${logoImgHtml(logo2, h)}
    </div>`;
  }

  const single = logo1 || logo2;
  const side = logo1 ? n.logo1Side : n.logo2Side;
  return `<div style="display:flex;justify-content:${sideToFlex(side)};width:100%;margin-bottom:8px;padding:0 ${inset}px;box-sizing:border-box">${logoImgHtml(single!, h)}</div>`;
}

function buildContractTitleBlockHtml(c: ContractDef, opts?: { fontTitlePt?: number; fontSubPt?: number }): string {
  const titlePt = opts?.fontTitlePt ?? 12;
  const subPt = opts?.fontSubPt ?? 9;
  const eff = c.effectiveDate
    ? new Date(c.effectiveDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return `<div style="text-align:center;min-width:0">
    <div style="font-size:${titlePt}pt;font-weight:bold">${escapeHtmlContract(c.titleEn)}</div>
    ${c.titleRtl ? `<div style="font-size:${titlePt - 1}pt;font-weight:600;color:#334155" dir="rtl">${escapeHtmlContract(c.titleRtl)}</div>` : ''}
    ${c.subtitleEn ? `<div style="font-size:${subPt}pt;font-style:italic;color:#64748b;margin-top:4px">${escapeHtmlContract(c.subtitleEn)}</div>` : ''}
    ${c.subtitleRtl ? `<div style="font-size:${subPt}pt;font-style:italic;color:#64748b" dir="rtl">${escapeHtmlContract(c.subtitleRtl)}</div>` : ''}
    <div style="font-size:9pt;color:#64748b;margin-top:6px">
      ${c.refNo ? `Ref. ${escapeHtmlContract(c.refNo)}` : ''}${c.refNo && eff ? ' | ' : ''}${eff ? `Date: ${escapeHtmlContract(eff)}` : ''}
    </div>
  </div>`;
}

function cornersHeaderHtml(c: ContractDef, mirror: boolean): string {
  const n = normalizeContractLogoFields(c);
  const h = n.logoHeightPx;
  const title = buildContractTitleBlockHtml(c);
  const border = 'border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:8px';
  const leftUrl = mirror ? n.logo2Url : n.logo1Url;
  const rightUrl = mirror ? n.logo1Url : n.logo2Url;
  const left = leftUrl ? logoImgHtml(leftUrl, h) : '&nbsp;';
  const right = rightUrl ? logoImgHtml(rightUrl, h) : '&nbsp;';
  const pad = n.insetPx;

  return `<div style="${border}">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>
      <td style="width:30%;min-width:96px;vertical-align:middle;text-align:left;padding-left:${pad}px;padding-right:8px">${left}</td>
      <td style="width:40%;vertical-align:middle;text-align:center;padding:0 6px">${title}</td>
      <td style="width:30%;min-width:96px;vertical-align:middle;text-align:right;padding-right:${pad}px;padding-left:8px">${right}</td>
    </tr></table>
  </div>`;
}

/** Header block HTML for Word export and print. */
export function buildContractHeaderHtml(c: ContractDef, _rtlFont: string): string {
  const n = normalizeContractLogoFields(c);
  const urls = [n.logo1Url, n.logo2Url].filter(Boolean);
  const h = n.logoHeightPx;
  const title = buildContractTitleBlockHtml(c);
  const border = 'border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:8px';

  if (!urls.length) {
    return `<div style="text-align:center;${border}">${title}</div>`;
  }

  if (n.layout === 'banner-top') {
    const row = logosDualRowHtml(n.logo1Url, n.logo2Url, h, n);
    return `<div style="${border}">${row}${title}</div>`;
  }

  if (n.layout === 'corners') {
    return cornersHeaderHtml(c, false);
  }

  if (n.layout === 'corners-mirror') {
    return cornersHeaderHtml(c, true);
  }

  const logos = logosColumnHtml(urls, h, n.gapPx);
  const rowDir = n.layout === 'title-right' ? 'row-reverse' : 'row';

  return `<div style="${border}">
    <div style="display:flex;flex-direction:${rowDir};align-items:flex-start;gap:12px">
      ${logos}
      <div style="flex:1;min-width:0">${title}</div>
    </div>
  </div>`;
}

export function contractHeaderBorderClass(): string {
  return 'border-b-2 border-slate-800 pb-3 mb-2';
}

export function contractHeaderPaddingClass(): string {
  return 'px-5 py-3';
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
      className="object-contain w-auto shrink-0"
      style={{ maxHeight: heightPx, height: heightPx }}
    />
  );
}

function TitleBlock({ c, rtlFont, className = '' }: HeaderBlockProps & { className?: string }) {
  return (
    <div className={`text-center min-w-0 ${className}`.trim()}>
      <div className="text-[11pt] font-bold tracking-wide mb-0.5 leading-snug">{c.titleEn}</div>
      {c.titleRtl && (
        <div className="text-[10.5pt] font-semibold text-slate-700 leading-snug" dir="rtl" style={{ fontFamily: rtlFont }}>
          {c.titleRtl}
        </div>
      )}
      {c.subtitleEn && <div className="text-[9pt] italic text-slate-500 mt-0.5">{c.subtitleEn}</div>}
      {c.subtitleRtl && (
        <div className="text-[9pt] italic text-slate-500" dir="rtl" style={{ fontFamily: rtlFont }}>
          {c.subtitleRtl}
        </div>
      )}
      <div className="text-center text-[8.5pt] text-slate-500 mt-2 space-x-2">
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

function DualLogoRow({ n }: { n: NormalizedContractLogos }) {
  const h = n.logoHeightPx;
  const { logo1Url, logo2Url } = n;

  if (!logo1Url && !logo2Url) return null;

  if (n.spread === 'wide' && logo1Url && logo2Url) {
    return (
      <div
        className="relative w-full mb-2"
        style={{ minHeight: h, paddingLeft: n.insetPx, paddingRight: n.insetPx }}
      >
        <div className="absolute top-0 left-0" style={{ left: n.insetPx }}>
          <LogoImg url={logo1Url} heightPx={h} />
        </div>
        <div className="absolute top-0" style={{ right: n.insetPx }}>
          <LogoImg url={logo2Url} heightPx={h} />
        </div>
      </div>
    );
  }

  if (logo1Url && logo2Url) {
    const justify: CSSProperties['justifyContent'] =
      n.logo1Side === n.logo2Side
        ? n.logo1Side === 'left'
          ? 'flex-start'
          : n.logo1Side === 'right'
            ? 'flex-end'
            : 'center'
        : 'space-between';
    return (
      <div
        className="flex flex-row flex-wrap items-center w-full mb-2"
        style={{ gap: n.gapPx, justifyContent: justify, paddingLeft: n.insetPx, paddingRight: n.insetPx }}
      >
        <LogoImg url={logo1Url} heightPx={h} />
        <LogoImg url={logo2Url} heightPx={h} />
      </div>
    );
  }

  const url = logo1Url || logo2Url!;
  const side = logo1Url ? n.logo1Side : n.logo2Side;
  const justify: CSSProperties['justifyContent'] =
    side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'center';

  return (
    <div className="flex w-full mb-2" style={{ justifyContent: justify, paddingLeft: n.insetPx, paddingRight: n.insetPx }}>
      <LogoImg url={url} heightPx={h} />
    </div>
  );
}

function LogoSlot({ url, heightPx, side, insetPx }: { url: string; heightPx: number; side: 'left' | 'right'; insetPx: number }) {
  return (
    <div
      className={`flex shrink-0 min-w-[88px] max-w-[36%] ${side === 'left' ? 'justify-start' : 'justify-end'}`}
      style={side === 'left' ? { paddingLeft: insetPx } : { paddingRight: insetPx }}
    >
      {url ? (
        <LogoImg url={url} heightPx={heightPx} />
      ) : (
        <div style={{ height: heightPx, width: 1 }} className="opacity-0" aria-hidden />
      )}
    </div>
  );
}

function CornersHeader({ c, rtlFont, mirror }: HeaderBlockProps & { mirror?: boolean }) {
  const n = normalizeContractLogoFields(c);
  const wrapCls = `${contractHeaderBorderClass()} ${contractHeaderPaddingClass()}`;
  const leftUrl = mirror ? n.logo2Url : n.logo1Url;
  const rightUrl = mirror ? n.logo1Url : n.logo2Url;

  return (
    <div className={wrapCls}>
      <div className="flex items-center justify-between gap-3 w-full">
        <LogoSlot url={leftUrl} heightPx={n.logoHeightPx} side="left" insetPx={n.insetPx} />
        <TitleBlock c={c} rtlFont={rtlFont} className="flex-1 px-2" />
        <LogoSlot url={rightUrl} heightPx={n.logoHeightPx} side="right" insetPx={n.insetPx} />
      </div>
    </div>
  );
}

function LogosColumn({ urls, heightPx, gapPx }: { urls: string[]; heightPx: number; gapPx: number }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-col items-center shrink-0 min-w-[72px]" style={{ gap: gapPx }}>
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
        <DualLogoRow n={n} />
        <TitleBlock c={c} rtlFont={rtlFont} />
      </div>
    );
  }

  if (n.layout === 'corners') {
    return <CornersHeader c={c} rtlFont={rtlFont} />;
  }

  if (n.layout === 'corners-mirror') {
    return <CornersHeader c={c} rtlFont={rtlFont} mirror />;
  }

  const logos = <LogosColumn urls={urls} heightPx={n.logoHeightPx} gapPx={n.gapPx} />;
  const flexDir = n.layout === 'title-right' ? 'flex-row-reverse' : 'flex-row';

  return (
    <div className={wrapCls}>
      <div className={`flex ${flexDir} items-start gap-3`}>
        {logos}
        <TitleBlock c={c} rtlFont={rtlFont} className="flex-1" />
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

function contractLayoutSelectValue(c: ContractDef): ContractHeaderLogoLayout {
  const raw = c.contractLogoLayout;
  if (raw && CONTRACT_LOGO_LAYOUT_OPTIONS.some((o) => o.value === raw)) {
    return raw;
  }
  return normalizeContractLogoFields(c).layout;
}

/** Contract editor: two logo URLs + placement on the printed header. */
export function ContractLogosEditor({ c, onChange, inputCls, labelCls }: ContractLogosEditorProps) {
  const n = normalizeContractLogoFields(c);
  const layoutValue = contractLayoutSelectValue(c);
  const showRowAlign = layoutValue === 'banner-top';
  const showSpacingPanel =
    (layoutValue === 'banner-top' || layoutValue === 'corners' || layoutValue === 'corners-mirror') &&
    Boolean(n.logo1Url || n.logo2Url);
  const hasTwoLogos = Boolean(n.logo1Url && n.logo2Url);

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
            value={layoutValue}
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
        {showRowAlign ? (
          <div>
            <label className={labelCls} dir="rtl">
              تراز ردیف (تک‌لوگو)
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

      {showSpacingPanel ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-white/80 border border-indigo-100">
          <div>
            <label className={labelCls} dir="rtl">
              پخش لوگوها
            </label>
            <select
              value={n.spread}
              onChange={(e) => onChange({ contractLogoSpread: e.target.value as ContractLogoSpread })}
              className={inputCls}
            >
              {CONTRACT_LOGO_SPREAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelFa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} dir="rtl">
              فاصله از لبه (px): {n.insetPx}
            </label>
            <input
              type="range"
              min={0}
              max={CONTRACT_LOGO_INSET_MAX}
              step={4}
              value={n.insetPx}
              onChange={(e) => onChange({ contractLogoInsetPx: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>
          {hasTwoLogos && n.spread === 'compact' ? (
            <>
              <div>
                <label className={labelCls} dir="rtl">
                  فاصله بین لوگوها (px): {n.gapPx}
                </label>
                <input
                  type="range"
                  min={CONTRACT_LOGO_GAP_MIN}
                  max={CONTRACT_LOGO_GAP_MAX}
                  step={4}
                  value={n.gapPx}
                  onChange={(e) => onChange({ contractLogoGapPx: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} dir="rtl">
                    لوگو ۱
                  </label>
                  <select
                    value={n.logo1Side}
                    onChange={(e) => onChange({ contractLogo1Side: e.target.value as ContractLogoSide })}
                    className={inputCls}
                  >
                    {CONTRACT_LOGO_ALIGN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.labelFa}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} dir="rtl">
                    لوگو ۲
                  </label>
                  <select
                    value={n.logo2Side}
                    onChange={(e) => onChange({ contractLogo2Side: e.target.value as ContractLogoSide })}
                    className={inputCls}
                  >
                    {CONTRACT_LOGO_ALIGN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.labelFa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : hasTwoLogos ? (
            <p className="sm:col-span-2 text-[10px] text-slate-600 self-center" dir="rtl">
              در حالت «دو گوشه صفحه» لوگو ۱ چپ و لوگو ۲ راست قرار می‌گیرند؛ فاصله از لبه را با اسلایدر تنظیم کنید.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-3 overflow-visible">
        <p className="text-[10px] text-slate-500 mb-2" dir="rtl">
          پیش‌نمایش سربرگ
        </p>
        <ContractHeaderBlock c={c} rtlFont="Tahoma, Arial, sans-serif" />
      </div>
    </div>
  );
}
