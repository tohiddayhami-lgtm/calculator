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
  >
): Pick<
  ContractDef,
  | 'letterheadEnabled'
  | 'letterheadUrl'
  | 'letterheadOpacity'
  | 'letterheadContentMarginMm'
  | 'letterheadContentMarginTopExtraMm'
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

  return {
    letterheadEnabled: !!c.letterheadEnabled,
    letterheadUrl: typeof c.letterheadUrl === 'string' ? c.letterheadUrl : '',
    letterheadOpacity,
    letterheadContentMarginMm,
    letterheadContentMarginTopExtraMm,
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
  return {
    top: side + topExtra,
    right: side,
    bottom: side,
    left: side,
  };
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

/** Screen preview: letterhead tiles every A4 page height behind growing content. */
export function contractLetterheadLayerStyle(c: ContractDef): CSSProperties | undefined {
  if (!contractLetterheadActive(c)) return undefined;
  const url = c.letterheadUrl?.trim();
  if (!url) return undefined;
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    minHeight: '297mm',
    pointerEvents: 'none',
    zIndex: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: '210mm 297mm',
    backgroundRepeat: 'repeat-y',
    backgroundPosition: 'top center',
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
  return `<div aria-hidden="true" style="position:fixed;left:0;top:0;right:0;bottom:0;width:100%;height:100%;z-index:0;pointer-events:none;background:url('${src}') center center no-repeat;background-size:100% 100%;opacity:${op}"></div>`;
}
