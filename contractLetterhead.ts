import type { CSSProperties } from 'react';
import type { ContractDef } from './types';

export const CONTRACT_LETTERHEAD_OPACITY_MIN = 3;
export const CONTRACT_LETTERHEAD_OPACITY_MAX = 45;
export const CONTRACT_LETTERHEAD_OPACITY_DEFAULT = 12;

export const CONTRACT_LETTERHEAD_MARGIN_MIN = 8;
export const CONTRACT_LETTERHEAD_MARGIN_MAX = 30;
export const CONTRACT_LETTERHEAD_MARGIN_DEFAULT = 15;

export const CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_MIN = 0;
export const CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_MAX = 55;
export const CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_DEFAULT = 0;

export const CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_MIN = 0;
export const CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_MAX = 55;
export const CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_DEFAULT = 0;

export type ContractLetterheadFitMode = 'fill' | 'cover' | 'contain';

export const CONTRACT_LETTERHEAD_FIT_MODES: { value: ContractLetterheadFitMode; labelEn: string; labelFa: string }[] = [
  { value: 'fill', labelEn: 'Full page (stretch to A4)', labelFa: 'تمام صفحه A4 (کشیده)' },
  { value: 'cover', labelEn: 'Cover (crop edges if needed)', labelFa: 'پوشش کامل (برش لبه)' },
  { value: 'contain', labelEn: 'Fit inside (keep proportions)', labelFa: 'جا شدن در صفحه (بدون برش)' },
];

export const CONTRACT_LETTERHEAD_FIT_DEFAULT: ContractLetterheadFitMode = 'fill';

export const CONTRACT_LETTERHEAD_SCALE_MIN = 85;
export const CONTRACT_LETTERHEAD_SCALE_MAX = 120;
export const CONTRACT_LETTERHEAD_SCALE_DEFAULT = 100;

export type ContractContentMarginsMm = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeContractLetterheadFields(
  c: Pick<
    ContractDef,
    | 'letterheadEnabled'
    | 'letterheadUrl'
    | 'letterheadOpacity'
    | 'letterheadContentMarginMm'
    | 'letterheadContentMarginTopExtraMm'
    | 'letterheadContentMarginBottomExtraMm'
    | 'letterheadFitMode'
    | 'letterheadScalePercent'
  >
): Pick<
  ContractDef,
  | 'letterheadEnabled'
  | 'letterheadUrl'
  | 'letterheadOpacity'
  | 'letterheadContentMarginMm'
  | 'letterheadContentMarginTopExtraMm'
  | 'letterheadContentMarginBottomExtraMm'
  | 'letterheadFitMode'
  | 'letterheadScalePercent'
> {
  const opacityRaw = Number(c.letterheadOpacity);
  const letterheadOpacity = Number.isFinite(opacityRaw)
    ? clamp(opacityRaw, CONTRACT_LETTERHEAD_OPACITY_MIN, CONTRACT_LETTERHEAD_OPACITY_MAX)
    : CONTRACT_LETTERHEAD_OPACITY_DEFAULT;

  const marginRaw = Number(c.letterheadContentMarginMm);
  const letterheadContentMarginMm = Number.isFinite(marginRaw)
    ? clamp(marginRaw, CONTRACT_LETTERHEAD_MARGIN_MIN, CONTRACT_LETTERHEAD_MARGIN_MAX)
    : CONTRACT_LETTERHEAD_MARGIN_DEFAULT;

  const topExtraRaw = Number(c.letterheadContentMarginTopExtraMm);
  const letterheadContentMarginTopExtraMm = Number.isFinite(topExtraRaw)
    ? clamp(topExtraRaw, CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_MIN, CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_MAX)
    : CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_DEFAULT;

  const bottomExtraRaw = Number(c.letterheadContentMarginBottomExtraMm);
  const letterheadContentMarginBottomExtraMm = Number.isFinite(bottomExtraRaw)
    ? clamp(bottomExtraRaw, CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_MIN, CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_MAX)
    : CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_DEFAULT;

  const fitRaw = c.letterheadFitMode;
  const letterheadFitMode: ContractLetterheadFitMode =
    fitRaw === 'cover' || fitRaw === 'contain' ? fitRaw : CONTRACT_LETTERHEAD_FIT_DEFAULT;

  const scaleRaw = Number(c.letterheadScalePercent);
  const letterheadScalePercent = Number.isFinite(scaleRaw)
    ? clamp(scaleRaw, CONTRACT_LETTERHEAD_SCALE_MIN, CONTRACT_LETTERHEAD_SCALE_MAX)
    : CONTRACT_LETTERHEAD_SCALE_DEFAULT;

  return {
    letterheadEnabled: !!c.letterheadEnabled,
    letterheadUrl: typeof c.letterheadUrl === 'string' ? c.letterheadUrl : '',
    letterheadOpacity,
    letterheadContentMarginMm,
    letterheadContentMarginTopExtraMm,
    letterheadContentMarginBottomExtraMm,
    letterheadFitMode,
    letterheadScalePercent,
  };
}

export function contractLetterheadActive(c: ContractDef): boolean {
  const n = normalizeContractLetterheadFields(c);
  return n.letterheadEnabled && !!n.letterheadUrl?.trim();
}

export function contractLetterheadOpacityCss(c: ContractDef): number {
  const n = normalizeContractLetterheadFields(c);
  return (n.letterheadOpacity ?? CONTRACT_LETTERHEAD_OPACITY_DEFAULT) / 100;
}

export function getContractContentMarginsMm(c: ContractDef): ContractContentMarginsMm {
  const n = normalizeContractLetterheadFields(c);
  const side = n.letterheadContentMarginMm ?? CONTRACT_LETTERHEAD_MARGIN_DEFAULT;
  const topExtra = n.letterheadContentMarginTopExtraMm ?? CONTRACT_LETTERHEAD_MARGIN_TOP_EXTRA_DEFAULT;
  const bottomExtra =
    n.letterheadContentMarginBottomExtraMm ?? CONTRACT_LETTERHEAD_MARGIN_BOTTOM_EXTRA_DEFAULT;
  return {
    top: side + topExtra,
    right: side,
    bottom: side + bottomExtra,
    left: side,
  };
}

function letterheadScaleFactor(c: ContractDef): number {
  return (normalizeContractLetterheadFields(c).letterheadScalePercent ?? CONTRACT_LETTERHEAD_SCALE_DEFAULT) / 100;
}

function letterheadFitMode(c: ContractDef): ContractLetterheadFitMode {
  return normalizeContractLetterheadFields(c).letterheadFitMode ?? CONTRACT_LETTERHEAD_FIT_DEFAULT;
}

/** background-size for screen preview (mm tiles per A4 page). */
export function contractLetterheadScreenBackgroundSize(c: ContractDef): string {
  const scale = letterheadScaleFactor(c);
  const mode = letterheadFitMode(c);
  if (mode === 'fill') {
    return `${210 * scale}mm ${297 * scale}mm`;
  }
  if (mode === 'cover') {
    return scale === 1 ? 'cover' : `${scale * 100}%`;
  }
  return scale === 1 ? 'contain' : `${scale * 100}% auto`;
}

/** background-size for print / Word (viewport = one printed page). */
export function contractLetterheadPrintBackgroundSize(c: ContractDef): string {
  const scale = letterheadScaleFactor(c);
  const mode = letterheadFitMode(c);
  if (mode === 'fill') {
    return scale === 1 ? '100% 100%' : `${scale * 100}% ${scale * 100}%`;
  }
  if (mode === 'cover') {
    return scale === 1 ? 'cover' : `${scale * 100}%`;
  }
  return scale === 1 ? 'contain' : `${scale * 100}% auto`;
}

function letterheadBackgroundRepeat(c: ContractDef): string {
  return letterheadFitMode(c) === 'fill' ? 'repeat-y' : 'no-repeat';
}

export function contractLetterheadBackgroundPosition(c: ContractDef): string {
  return letterheadFitMode(c) === 'fill' ? 'top center' : 'center center';
}

export function contractDocumentBodyPaddingStyle(c: ContractDef): CSSProperties | undefined {
  if (!contractLetterheadActive(c)) return undefined;
  const m = getContractContentMarginsMm(c);
  return {
    position: 'relative',
    zIndex: 1,
    boxSizing: 'border-box',
    padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
  };
}

/** Screen preview: letterhead behind content; tiles vertically in fill mode. */
export function contractLetterheadLayerStyle(c: ContractDef): CSSProperties | undefined {
  if (!contractLetterheadActive(c)) return undefined;
  const url = c.letterheadUrl?.trim();
  if (!url) return undefined;
  const mode = letterheadFitMode(c);
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '210mm',
    maxWidth: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    minHeight: '297mm',
    pointerEvents: 'none',
    zIndex: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: contractLetterheadScreenBackgroundSize(c),
    backgroundRepeat: letterheadBackgroundRepeat(c),
    backgroundPosition: mode === 'fill' ? 'top center' : 'center center',
    opacity: contractLetterheadOpacityCss(c),
  };
}

export function contractLetterheadContentPaddingCss(c: ContractDef): string {
  if (!contractLetterheadActive(c)) return 'position:relative;z-index:1';
  const m = getContractContentMarginsMm(c);
  return `position:relative;z-index:1;box-sizing:border-box;padding:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`;
}

/** Full-page fixed layer for print / Word — sits behind padded text. */
export function contractLetterheadWordHtml(c: ContractDef): string {
  if (!contractLetterheadActive(c)) return '';
  const src = (c.letterheadUrl || '').replace(/"/g, '&quot;');
  const op = contractLetterheadOpacityCss(c);
  const bgSize = contractLetterheadPrintBackgroundSize(c);
  const mode = letterheadFitMode(c);
  const repeat = letterheadBackgroundRepeat(c);
  const pos = mode === 'fill' ? 'top center' : 'center center';
  return `<div aria-hidden="true" style="position:fixed;left:0;top:0;right:0;bottom:0;width:100%;height:100%;z-index:0;pointer-events:none;background:url('${src}') ${pos} ${repeat};background-size:${bgSize};opacity:${op}"></div>`;
}
