import React, { useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  Plus,
  Trash2,
  Underline,
} from 'lucide-react';
import type { InvoiceAnnexParagraph, InvoiceAnnexParagraphAlign } from './types';
import {
  MAX_ANNEX_PARAGRAPHS,
  annexWithParagraphs,
  createEmptyAnnexParagraph,
  getAnnexParagraphs,
  renderAnnexMarkupToHtml,
  wrapTextareaSelection,
} from './invoiceAnnexParagraphs';
import type { InvoiceAnnex } from './types';

const labelCls = 'text-xs font-semibold text-slate-500 uppercase block mb-1';

const ALIGN_OPTIONS: { id: InvoiceAnnexParagraphAlign; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'right', label: '\u0631\u0627\u0633\u062a', Icon: AlignRight },
  { id: 'center', label: '\u0648\u0633\u0637', Icon: AlignCenter },
  { id: 'left', label: '\u0686\u067e', Icon: AlignLeft },
];

function ParagraphRow({
  paragraph,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  paragraph: InvoiceAnnexParagraph;
  index: number;
  total: number;
  onChange: (p: InvoiceAnnexParagraph) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const applyWrap = (before: string, after: string) => {
    const el = taRef.current;
    if (!el) return;
    const { value, selectionStart, selectionEnd } = wrapTextareaSelection(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      before,
      after,
    );
    onChange({ ...paragraph, text: value });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  return (
    <div className="rounded border border-slate-200 bg-slate-50/80 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold text-slate-500">
          {'\u067e\u0627\u0631\u0627\u06af\u0631\u0627\u0641'} {index + 1}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title={'\u0628\u0627\u0644\u0627'}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={() => onMove(1)}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title={'\u067e\u0627\u06cc\u06cc\u0646'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={total <= 1}
            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
            aria-label={'\u062d\u0630\u0641'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => applyWrap('**', '**')}
          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100"
          title="Bold (**)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyWrap('*', '*')}
          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100"
          title="Italic (*)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyWrap('__', '__')}
          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100"
          title="Underline (__)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-5 bg-slate-200 mx-0.5" />
        {ALIGN_OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange({ ...paragraph, align: id })}
            className={`p-1.5 rounded border text-[9px] font-semibold inline-flex items-center gap-0.5 ${
              paragraph.align === id
                ? 'border-violet-400 bg-violet-100 text-violet-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <textarea
        ref={taRef}
        rows={3}
        value={paragraph.text}
        onChange={(e) => onChange({ ...paragraph, text: e.target.value })}
        className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 font-sans"
        style={{ textAlign: paragraph.align, direction: paragraph.align === 'right' ? 'rtl' : 'ltr' }}
        placeholder={'\u0645\u062a\u0646 \u067e\u0627\u0631\u0627\u06af\u0631\u0627\u0641\u2026'}
      />

      {paragraph.text.trim() && (
        <div
          className="text-[10px] text-slate-600 border border-dashed border-slate-200 rounded px-2 py-1 bg-white"
          style={{ textAlign: paragraph.align, direction: paragraph.align === 'right' ? 'rtl' : 'ltr' }}
          dangerouslySetInnerHTML={{ __html: renderAnnexMarkupToHtml(paragraph.text) }}
        />
      )}
    </div>
  );
}

export function AnnexParagraphsEditor({
  annex,
  onAnnexChange,
}: {
  annex: InvoiceAnnex;
  onAnnexChange: (next: InvoiceAnnex) => void;
}) {
  const paragraphs = getAnnexParagraphs(annex);

  const setParagraphs = (next: InvoiceAnnexParagraph[]) => {
    onAnnexChange(annexWithParagraphs(annex, next));
  };

  const updateAt = (idx: number, p: InvoiceAnnexParagraph) => {
    setParagraphs(paragraphs.map((x, i) => (i === idx ? p : x)));
  };

  const removeAt = (idx: number) => {
    if (paragraphs.length <= 1) {
      setParagraphs([createEmptyAnnexParagraph()]);
      return;
    }
    setParagraphs(paragraphs.filter((_, i) => i !== idx));
  };

  const moveAt = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= paragraphs.length) return;
    const next = [...paragraphs];
    [next[idx], next[j]] = [next[j], next[idx]];
    setParagraphs(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className={labelCls}>{'\u067e\u0627\u0631\u0627\u06af\u0631\u0627\u0641\u200c\u0647\u0627'}</label>
        <span className="text-[9px] text-slate-400">**bold** *italic* __underline__</span>
      </div>

      {paragraphs.map((p, i) => (
        <ParagraphRow
          key={p.id}
          paragraph={p}
          index={i}
          total={paragraphs.length}
          onChange={(np) => updateAt(i, np)}
          onRemove={() => removeAt(i)}
          onMove={(dir) => moveAt(i, dir)}
        />
      ))}

      <button
        type="button"
        disabled={paragraphs.length >= MAX_ANNEX_PARAGRAPHS}
        onClick={() => setParagraphs([...paragraphs, createEmptyAnnexParagraph()])}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold border border-dashed border-slate-300 text-slate-700 rounded py-1.5 hover:bg-slate-50 disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        {'\u0627\u0641\u0632\u0648\u062f\u0646 \u067e\u0627\u0631\u0627\u06af\u0631\u0627\u0641'}
      </button>
    </div>
  );
}

export function AnnexParagraphsPrint({ annex }: { annex: InvoiceAnnex }) {
  const paragraphs = getAnnexParagraphs(annex).filter((p) => p.text.trim());
  if (!paragraphs.length) return null;
  return (
    <>
      {paragraphs.map((p) => (
        <div
          key={p.id}
          className="annex-paragraph"
          style={{
            textAlign: p.align,
            marginBottom: 10,
            fontSize: '10pt',
            lineHeight: 1.65,
            direction: p.align === 'right' ? 'rtl' : 'ltr',
          }}
          dangerouslySetInnerHTML={{ __html: renderAnnexMarkupToHtml(p.text) }}
        />
      ))}
    </>
  );
}
