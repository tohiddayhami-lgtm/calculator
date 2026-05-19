export type InvoiceNumberKind = 'export' | 'services';

export type InvoiceNumberLaneSettings = {
  prefix: string;
  /** Next sequential number to assign (user may set start e.g. 100 or 200). */
  nextNumber: number;
  pad: number;
};

export type InvoiceNumberingSettings = {
  autoEnabled: boolean;
  export: InvoiceNumberLaneSettings;
  services: InvoiceNumberLaneSettings;
};

const STORAGE_KEY = 'exportcalc_invoice_numbering_v1';

const DEFAULTS: InvoiceNumberingSettings = {
  autoEnabled: true,
  export: { prefix: 'EXP', nextNumber: 1, pad: 5 },
  services: { prefix: 'SVC', nextNumber: 1, pad: 5 },
};

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? ''), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function normLane(raw: unknown, fallback: InvoiceNumberLaneSettings): InvoiceNumberLaneSettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefix = String(o.prefix ?? fallback.prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 12);
  return {
    prefix: prefix || fallback.prefix,
    nextNumber: clampInt(o.nextNumber, 1, 999999999, fallback.nextNumber),
    pad: clampInt(o.pad, 3, 8, fallback.pad),
  };
}

export function loadInvoiceNumberingSettings(): InvoiceNumberingSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS, export: { ...DEFAULTS.export }, services: { ...DEFAULTS.services } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, export: { ...DEFAULTS.export }, services: { ...DEFAULTS.services } };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      autoEnabled: p.autoEnabled !== false,
      export: normLane(p.export, DEFAULTS.export),
      services: normLane(p.services, DEFAULTS.services),
    };
  } catch {
    return { ...DEFAULTS, export: { ...DEFAULTS.export }, services: { ...DEFAULTS.services } };
  }
}

export function saveInvoiceNumberingSettings(settings: InvoiceNumberingSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}

export function laneForKind(settings: InvoiceNumberingSettings, kind: InvoiceNumberKind): InvoiceNumberLaneSettings {
  return kind === 'services' ? settings.services : settings.export;
}

function padSeq(n: number, pad: number): string {
  return String(Math.max(1, Math.round(n))).padStart(pad, '0');
}

function dateParts(ms: number): { y: string; md: string } {
  const d = new Date(Number.isFinite(ms) && ms > 0 ? ms : Date.now());
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { y, md: `${m}${day}` };
}

/** e.g. EXP-2026-0519-00142 */
export function formatInvoiceNumber(
  kind: InvoiceNumberKind,
  seq: number,
  settings: InvoiceNumberingSettings,
  issueMs?: number,
): string {
  const lane = laneForKind(settings, kind);
  const { y, md } = dateParts(issueMs ?? Date.now());
  return `${lane.prefix}-${y}-${md}-${padSeq(seq, lane.pad)}`;
}

export function peekNextInvoiceNumber(
  kind: InvoiceNumberKind,
  settings: InvoiceNumberingSettings,
  issueMs?: number,
): string {
  const lane = laneForKind(settings, kind);
  return formatInvoiceNumber(kind, lane.nextNumber, settings, issueMs);
}

export type AllocatedInvoiceNumber = {
  ref: string;
  issueDateMs: number;
  settings: InvoiceNumberingSettings;
};

/** Take next sequential number (increments counter in storage). */
export function allocateInvoiceNumber(
  kind: InvoiceNumberKind,
  settings?: InvoiceNumberingSettings,
  issueMs?: number,
): AllocatedInvoiceNumber {
  const base = settings ? { ...settings, export: { ...settings.export }, services: { ...settings.services } } : loadInvoiceNumberingSettings();
  const lane = laneForKind(base, kind);
  const issueDateMs = Number.isFinite(issueMs) && issueMs > 0 ? issueMs : Date.now();
  const ref = formatInvoiceNumber(kind, lane.nextNumber, base, issueDateMs);
  lane.nextNumber = lane.nextNumber + 1;
  saveInvoiceNumberingSettings(base);
  return { ref, issueDateMs, settings: base };
}

/** After archive: if manual ref ends with digits, bump counter so sequence stays ahead. */
export function syncCounterFromRef(
  kind: InvoiceNumberKind,
  ref: string,
  settings?: InvoiceNumberingSettings,
): InvoiceNumberingSettings {
  const base = settings ? { ...settings, export: { ...settings.export }, services: { ...settings.services } } : loadInvoiceNumberingSettings();
  const lane = laneForKind(base, kind);
  const m = String(ref ?? '').trim().match(/(\d+)\s*$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= lane.nextNumber) {
      lane.nextNumber = n + 1;
      saveInvoiceNumberingSettings(base);
    }
  }
  return base;
}

export function updateInvoiceNumberingSettings(
  patch: Partial<InvoiceNumberingSettings> & {
    export?: Partial<InvoiceNumberLaneSettings>;
    services?: Partial<InvoiceNumberLaneSettings>;
  },
): InvoiceNumberingSettings {
  const cur = loadInvoiceNumberingSettings();
  const next: InvoiceNumberingSettings = {
    autoEnabled: patch.autoEnabled !== undefined ? !!patch.autoEnabled : cur.autoEnabled,
    export: { ...cur.export, ...(patch.export ?? {}) },
    services: { ...cur.services, ...(patch.services ?? {}) },
  };
  next.export = normLane(next.export, DEFAULTS.export);
  next.services = normLane(next.services, DEFAULTS.services);
  saveInvoiceNumberingSettings(next);
  return next;
}
