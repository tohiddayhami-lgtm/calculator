/** Persian/Arabic digits → Western; strip grouping commas. */
export function normalizeDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .replace(/[۰٠]/g, '0')
    .replace(/[۱١]/g, '1')
    .replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3')
    .replace(/[۴٤]/g, '4')
    .replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6')
    .replace(/[۷٧]/g, '7')
    .replace(/[۸٨]/g, '8')
    .replace(/[۹٩]/g, '9');
}

export type MaxDecimalPlaces = 0 | 1 | 2 | 3;

export function parseMaxDecimalPlaces(raw: unknown, fallback: MaxDecimalPlaces = 2): MaxDecimalPlaces {
  const n = Number(raw);
  if (n === 0 || n === 1 || n === 2 || n === 3) return n;
  return fallback;
}

export function roundToDecimalPlaces(n: number, places: MaxDecimalPlaces): number {
  if (!Number.isFinite(n)) return 0;
  if (places === 0) return Math.round(n);
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function parseFormattedNumber(val: string): number {
  const clean = normalizeDigits(val).replace(/,/g, '').replace(/،/g, '').trim();
  const parsed = parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Full number with grouping (including 0). */
export function formatWithSeparators(n: number, maxDecimalPlaces?: MaxDecimalPlaces): string {
  if (!Number.isFinite(n)) return '';
  const rounded =
    maxDecimalPlaces !== undefined ? roundToDecimalPlaces(n, maxDecimalPlaces) : n;
  const neg = rounded < 0 || Object.is(rounded, -0);
  let str = Math.abs(rounded).toString();
  if (maxDecimalPlaces !== undefined && maxDecimalPlaces > 0) {
    str = Math.abs(rounded)
      .toFixed(maxDecimalPlaces)
      .replace(/\.?0+$/, '');
    if (str === '') str = '0';
  }
  const dot = str.indexOf('.');
  if (dot === -1) return (neg ? '-' : '') + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const intPart = str.slice(0, dot);
  const dec = str.slice(dot);
  return (neg ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + dec;
}

/** Group thousands while typing; optional integer-only or max fraction digits (0–3). */
export function formatThousandsWhileTyping(
  raw: string,
  options?: { maxDecimalPlaces?: MaxDecimalPlaces },
): string {
  const maxDec = options?.maxDecimalPlaces;
  const integerOnly = maxDec === 0;

  let s = normalizeDigits(raw).replace(/,/g, '').replace(/،/g, '').trim();
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

  let intRaw = s.slice(0, dotIdx);
  let fracRaw = s.slice(dotIdx + 1);
  if (maxDec !== undefined && maxDec > 0) fracRaw = fracRaw.slice(0, maxDec);
  else if (integerOnly) {
    const formatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + formatted;
  }

  const intFormatted = intRaw ? intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  const sign = neg ? '-' : '';
  if (intRaw === '') {
    if (fracRaw === '') return `${sign}.`;
    return `${sign}.${fracRaw}`;
  }
  if (fracRaw === '' && s.endsWith('.')) return `${sign}${intFormatted}.`;
  return `${sign}${intFormatted}.${fracRaw}`;
}

export function formatNumberForInput(n: number, maxDecimalPlaces: MaxDecimalPlaces): string {
  if (!Number.isFinite(n) || n === 0) return '';
  const rounded = roundToDecimalPlaces(n, maxDecimalPlaces);
  if (maxDecimalPlaces === 0) {
    return formatThousandsWhileTyping(String(Math.round(rounded)), { maxDecimalPlaces: 0 });
  }
  const str = rounded.toFixed(maxDecimalPlaces).replace(/\.?0+$/, '') || '0';
  return formatThousandsWhileTyping(str, { maxDecimalPlaces });
}
