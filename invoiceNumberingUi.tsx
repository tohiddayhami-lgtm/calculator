import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { InvoiceNumberKind, InvoiceNumberingSettings } from './invoiceNumbering';
import {
  formatInvoiceNumber,
  laneForKind,
  loadInvoiceNumberingSettings,
  peekNextInvoiceNumber,
  updateInvoiceNumberingSettings,
} from './invoiceNumbering';

export type InvoiceNumberingPanelProps = {
  kind: InvoiceNumberKind;
  settings: InvoiceNumberingSettings;
  onSettingsChange: (s: InvoiceNumberingSettings) => void;
  onAssignNew: () => void;
};

const labelCls = 'text-xs font-semibold text-slate-500 uppercase block mb-1';

export function InvoiceNumberingPanel({
  kind,
  settings,
  onSettingsChange,
  onAssignNew,
}: InvoiceNumberingPanelProps) {
  const lane = laneForKind(settings, kind);
  const otherKind: InvoiceNumberKind = kind === 'services' ? 'export' : 'services';
  const otherLane = laneForKind(settings, otherKind);

  const patchLane = (k: InvoiceNumberKind, patch: Partial<typeof lane>) => {
    const key = k === 'services' ? 'services' : 'export';
    onSettingsChange(
      updateInvoiceNumberingSettings({
        [key]: { ...laneForKind(settings, k), ...patch },
      }),
    );
  };

  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/90 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.autoEnabled}
          onChange={(e) =>
            onSettingsChange(updateInvoiceNumberingSettings({ autoEnabled: e.target.checked }))
          }
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-semibold text-slate-700">شماره‌گذاری خودکار (ترتیبی)</span>
      </label>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-slate-500 block mb-0.5">صادرات — شماره بعدی</span>
          <span className="font-mono text-slate-800">{peekNextInvoiceNumber('export', settings)}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">خدمات — شماره بعدی</span>
          <span className="font-mono text-slate-800">{peekNextInvoiceNumber('services', settings)}</span>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-2 space-y-2">
        <p className="text-[10px] text-slate-500 leading-snug">
          {kind === 'services' ? 'فاکتور خدمات' : 'فاکتور صادرات / کالا'} — پیشوند و شروع شماره (مثلاً ۱۰۰ یا ۲۰۰). فیلد
          Invoice # و تاریخ همچنان قابل ویرایش دستی است.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>پیشوند</label>
            <input
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 font-mono uppercase"
              value={lane.prefix}
              onChange={(e) => patchLane(kind, { prefix: e.target.value })}
              maxLength={12}
            />
          </div>
          <div>
            <label className={labelCls}>شروع / شماره بعدی</label>
            <input
              type="number"
              min={1}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 font-mono"
              value={lane.nextNumber}
              onChange={(e) =>
                patchLane(kind, { nextNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 font-mono">
          نمونه: {formatInvoiceNumber(kind, lane.nextNumber, settings)}
        </p>
      </div>

      <button
        type="button"
        onClick={onAssignNew}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-900"
      >
        <RefreshCw className="w-4 h-4" />
        شماره و زمان صدور جدید
      </button>

      <p className="text-[10px] text-slate-400">
        پس از آرشیو «صادر شده»، در صورت فعال بودن خودکار، شماره بعدی برای فاکتور جدید تنظیم می‌شود. (
        {otherKind === 'services' ? 'خدمات' : 'صادرات'}: {otherLane.nextNumber})
      </p>
    </div>
  );
}

export function useInvoiceNumberingState(): [InvoiceNumberingSettings, (s: InvoiceNumberingSettings) => void] {
  const [settings, setSettings] = React.useState(loadInvoiceNumberingSettings);
  const apply = React.useCallback((s: InvoiceNumberingSettings) => {
    setSettings(s);
  }, []);
  return [settings, apply];
}
