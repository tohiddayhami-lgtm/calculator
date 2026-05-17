import { useEffect, useState, type RefObject } from 'react';
import type { ContractDef } from './types';
import { CONTRACT_A4_HEIGHT_MM, getContractContentMarginsMm } from './contractLetterhead';

type Props = {
  contract: ContractDef;
  contentRef: RefObject<HTMLDivElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
};

/** Draw A4 page-break lines and margin guide on screen preview (not print). */
export function ContractPreviewPageGuides({ contract, contentRef, rootRef }: Props) {
  const [pageBreakYs, setPageBreakYs] = useState<number[]>([]);

  useEffect(() => {
    const content = contentRef.current;
    const root = rootRef.current;
    if (!content || !root) return;

    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const contentTop = contentRect.top - rootRect.top;
      const contentHeight = content.offsetHeight;
      const rootWidth = root.offsetWidth || 1;
      const pxPerMm = rootWidth / 210;
      const pagePx = CONTRACT_A4_HEIGHT_MM * pxPerMm;
      const pages = Math.max(1, Math.ceil(contentHeight / pagePx));
      const breaks: number[] = [];
      for (let i = 1; i < pages; i += 1) {
        breaks.push(contentTop + i * pagePx);
      }
      setPageBreakYs(breaks);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [contract, contentRef, rootRef]);

  const margins = getContractContentMarginsMm(contract);

  return (
    <div className="contract-preview-guides print:hidden pointer-events-none absolute inset-0 z-[2]" aria-hidden>
      <div
        className="absolute border border-dashed border-blue-400/60 rounded-sm"
        style={{
          top: `${margins.top}mm`,
          right: `${margins.right}mm`,
          bottom: `${margins.bottom}mm`,
          left: `${margins.left}mm`,
        }}
      />
      {pageBreakYs.map((y, i) => (
        <div key={`pb-${i}-${y}`} className="absolute left-0 right-0 flex items-center" style={{ top: y }}>
          <div className="flex-1 border-t-2 border-dashed border-slate-400/70" />
          <span className="mx-2 text-[9px] font-semibold text-slate-500 bg-white/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
            شکست صفحه {i + 1}
          </span>
          <div className="flex-1 border-t-2 border-dashed border-slate-400/70" />
        </div>
      ))}
    </div>
  );
}
