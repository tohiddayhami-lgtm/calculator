import React from 'react';
import type { ContractDef } from './types';

export const CONTRACT_DRAFT_WATERMARK_DEFAULT_TEXT = 'DRAFT';
export const CONTRACT_DRAFT_WATERMARK_MAX_LEN = 24;

export type NormalizedContractDraftWatermark = {
  enabled: boolean;
  text: string;
};

export function normalizeContractDraftWatermark(
  c: Pick<ContractDef, 'contractDraftWatermark' | 'contractDraftWatermarkText'>,
): NormalizedContractDraftWatermark {
  const raw = typeof c.contractDraftWatermarkText === 'string' ? c.contractDraftWatermarkText.trim() : '';
  const text = (raw || CONTRACT_DRAFT_WATERMARK_DEFAULT_TEXT).slice(0, CONTRACT_DRAFT_WATERMARK_MAX_LEN);
  return {
    enabled: Boolean(c.contractDraftWatermark),
    text,
  };
}

export function contractDraftWatermarkPrintCss(): string {
  return `
    .contract-draft-watermark-layer {
      pointer-events: none;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }
  `;
}

/** Fixed on print so the mark repeats on every page; absolute on screen within the preview root. */
export function ContractDraftWatermark({ text }: { text: string }) {
  const label = text.toUpperCase();
  return (
    <div className="contract-draft-watermark-layer absolute inset-0 print:fixed" aria-hidden>
      <span
        className="select-none font-extrabold uppercase tracking-[0.28em] text-slate-400/35 whitespace-nowrap"
        style={{
          transform: 'rotate(-42deg)',
          fontSize: 'clamp(3rem, 14vw, 5.5rem)',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function contractDraftWatermarkBodyHtml(text: string): string {
  const label = text
    .toUpperCase()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div style="position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0">
  <div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-42deg);font-size:96pt;font-weight:800;letter-spacing:0.22em;color:#94a3b8;opacity:0.28;text-transform:uppercase;white-space:nowrap;font-family:Georgia,'Times New Roman',serif">${label}</div>
</div>`;
}

export type ContractDraftWatermarkEditorProps = {
  c: ContractDef;
  onChange: (patch: Partial<ContractDef>) => void;
  inputCls: string;
  labelCls: string;
};

export function ContractDraftWatermarkEditor({
  c,
  onChange,
  inputCls,
  labelCls,
}: ContractDraftWatermarkEditorProps) {
  const wm = normalizeContractDraftWatermark(c);

  return (
    <div className="col-span-2 p-4 rounded-xl border border-amber-100 bg-amber-50/50 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={wm.enabled}
          onChange={(e) => onChange({ contractDraftWatermark: e.target.checked })}
          className="mt-1 rounded border-slate-300 text-amber-600 focus:ring-amber-400"
        />
        <span>
          <span className="text-sm font-semibold text-amber-950 block" dir="rtl">
            واترمارک پیش‌نویس (برای ارسال جهت مطالعه)
          </span>
          <span className="text-[11px] text-amber-900/80 leading-snug block mt-0.5" dir="rtl">
            متن «DRAFT» به صورت مورب وسط هر صفحه در پیش‌نمایش، چاپ/PDF و فایل Word نمایش داده می‌شود.
          </span>
        </span>
      </label>
      {wm.enabled ? (
        <div className="max-w-xs">
          <label className={labelCls}>Watermark text</label>
          <input
            value={c.contractDraftWatermarkText ?? CONTRACT_DRAFT_WATERMARK_DEFAULT_TEXT}
            onChange={(e) => onChange({ contractDraftWatermarkText: e.target.value })}
            className={inputCls}
            placeholder={CONTRACT_DRAFT_WATERMARK_DEFAULT_TEXT}
            maxLength={CONTRACT_DRAFT_WATERMARK_MAX_LEN}
          />
        </div>
      ) : null}
    </div>
  );
}
