import type { CSSProperties } from 'react';

export const INVOICE_ACCENT_PRESETS: { id: string; label: string; color: string }[] = [
  { id: 'slate', label: 'Slate', color: '#0f172a' },
  { id: 'blue', label: 'Blue', color: '#1d4ed8' },
  { id: 'indigo', label: 'Indigo', color: '#4338ca' },
  { id: 'emerald', label: 'Emerald', color: '#047857' },
  { id: 'teal', label: 'Teal', color: '#0f766e' },
  { id: 'amber', label: 'Amber', color: '#b45309' },
  { id: 'rose', label: 'Rose', color: '#be123c' },
  { id: 'violet', label: 'Violet', color: '#6d28d9' },
];

export function normalizeInvoiceAccentColor(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s.length === 4 ? expandHex3(s) : s;
  return INVOICE_ACCENT_PRESETS[0].color;
}

function expandHex3(hex: string): string {
  const h = hex.slice(1);
  return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = normalizeInvoiceAccentColor(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function invoiceThemeStyle(accent: string): CSSProperties {
  const a = normalizeInvoiceAccentColor(accent);
  return {
    ['--invoice-accent' as string]: a,
    ['--invoice-accent-mid' as string]: hexToRgba(a, 0.65),
    ['--invoice-accent-soft' as string]: hexToRgba(a, 0.1),
    ['--invoice-accent-softer' as string]: hexToRgba(a, 0.05),
  };
}

export function InvoiceAccentColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const v = normalizeInvoiceAccentColor(value);
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">
        Invoice accent color
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {INVOICE_ACCENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() => onChange(p.color)}
            className={`w-7 h-7 rounded-md border-2 shadow-sm transition-transform hover:scale-105 ${
              v === p.color ? 'border-slate-900 ring-2 ring-offset-1 ring-slate-400' : 'border-white'
            }`}
            style={{ background: p.color }}
          />
        ))}
        <input
          type="color"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-slate-200 p-0.5 bg-white"
          title="Custom color"
        />
      </div>
    </div>
  );
}
