/** Pure number/money/date formatting utilities extracted from App.tsx */

export const normalizeDigits = (str: string | number): string => {
  if (str === null || str === undefined) return '';
  return str.toString()
    .replace(/[۰٠]/g, '0').replace(/[۱١]/g, '1').replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3').replace(/[۴٤]/g, '4').replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6').replace(/[۷٧]/g, '7').replace(/[۸٨]/g, '8').replace(/[۹٩]/g, '9');
};

export const formatNumber = (num: number | string): string => {
  if (num === '' || num === null || isNaN(Number(num)) || num === 0) return '';
  const n = Number(num);
  const str = n.toString();
  const dot = str.indexOf('.');
  if (dot === -1) return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return str.slice(0, dot).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + str.slice(dot);
};

export const parseInput = (val: string): number => {
  const clean = normalizeDigits(val).replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/** Full number with grouping (including 0); used for blur/display sync in numeric inputs. */
export const formatWithSeparators = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  const neg = n < 0 || Object.is(n, -0);
  const str = Math.abs(n).toString();
  const dot = str.indexOf('.');
  if (dot === -1) return (neg ? '-' : '') + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const intPart = str.slice(0, dot);
  const dec = str.slice(dot);
  return (neg ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + dec;
};

/** Formats raw keystrokes with comma grouping while preserving an in-progress decimal point. */
export const formatThousandsWhileTyping = (raw: string, integerOnly?: boolean): string => {
  let s = normalizeDigits(raw).replace(/,/g, '').trim();
  if (s === '') return '';

  let neg = false;
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  }

  const buf: string[] = [];
  let dotSeen = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') buf.push(ch);
    else if (!integerOnly && ch === '.' && !dotSeen) {
      buf.push('.');
      dotSeen = true;
    }
  }
  s = buf.join('');
  if (s === '') return neg ? '-' : '';
  if (s === '.') return neg ? '-.' : '.';

  const dotIdx = s.indexOf('.');
  if (dotIdx === -1) {
    const formatted = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + formatted;
  }

  const intRaw = s.slice(0, dotIdx);
  const fracRaw = s.slice(dotIdx + 1);
  const intFormatted = intRaw ? intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  const sign = neg ? '-' : '';
  if (intRaw === '') {
    if (fracRaw === '') return `${sign}.`;
    return `${sign}.${fracRaw}`;
  }
  if (fracRaw === '' && s.endsWith('.')) return `${sign}${intFormatted}.`;
  return `${sign}${intFormatted}.${fracRaw}`;
};

export const formatMoney = (amount: number, currency: string): string => {
  const decimals = currency === 'OMR' ? 3 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const toDateInputValue = (ms?: number | null): string => {
  if (!ms) return '';
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const dateInputToEndOfDayMs = (dateValue: string): number | null => {
  if (!dateValue) return null;
  const t = new Date(`${dateValue}T23:59:59`).getTime();
  return Number.isFinite(t) ? t : null;
};

export const addDays = (baseMs: number, days: number): number =>
  baseMs + Math.max(0, days) * 24 * 60 * 60 * 1000;

export const stripUndefinedDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep);
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) cleaned[key] = stripUndefinedDeep(val);
    }
    return cleaned;
  }
  return value;
};
