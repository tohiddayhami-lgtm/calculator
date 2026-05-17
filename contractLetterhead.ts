import type { ContractDef } from './types';

export const CONTRACT_LETTERHEAD_OPACITY_MIN = 3;
export const CONTRACT_LETTERHEAD_OPACITY_MAX = 45;
export const CONTRACT_LETTERHEAD_OPACITY_DEFAULT = 12;

export function normalizeContractLetterheadFields(
  c: Pick<ContractDef, 'letterheadEnabled' | 'letterheadUrl' | 'letterheadOpacity'>
): Pick<ContractDef, 'letterheadEnabled' | 'letterheadUrl' | 'letterheadOpacity'> {
  const opacityRaw = Number(c.letterheadOpacity);
  const letterheadOpacity = Number.isFinite(opacityRaw)
    ? Math.min(CONTRACT_LETTERHEAD_OPACITY_MAX, Math.max(CONTRACT_LETTERHEAD_OPACITY_MIN, opacityRaw))
    : CONTRACT_LETTERHEAD_OPACITY_DEFAULT;
  return {
    letterheadEnabled: !!c.letterheadEnabled,
    letterheadUrl: typeof c.letterheadUrl === 'string' ? c.letterheadUrl : '',
    letterheadOpacity,
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

/** Inline HTML for Word / static export watermark behind document body. */
export function contractLetterheadWordHtml(c: ContractDef): string {
  if (!contractLetterheadActive(c)) return '';
  const src = (c.letterheadUrl || '').replace(/"/g, '&quot;');
  const op = contractLetterheadOpacityCss(c);
  return `<div aria-hidden="true" style="position:fixed;left:0;top:0;width:100%;height:100%;z-index:0;pointer-events:none;overflow:hidden">
  <img src="${src}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;object-position:center center;opacity:${op}"/>
</div>`;
}
