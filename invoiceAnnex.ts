import type { InvoiceAnnex, InvoiceAnnexImage, InvoiceAnnexPreset, Product } from './types';
import {
  annexHasParagraphText,
  annexParagraphsToBody,
  bodyToAnnexParagraphs,
  createEmptyAnnexParagraph,
  normalizeAnnexParagraph,
} from './invoiceAnnexParagraphs';

export const INVOICE_ANNEX_PRESETS_STORAGE_KEY = 'exportcalc_invoice_annex_presets_v1';
export const MAX_INVOICE_ANNEX_PRESETS = 30;
export const MAX_ANNEX_IMAGES_PER_ANNEX = 24;
export const MAX_ANNEX_IMAGE_BYTES = 8 * 1024 * 1024;

/** File input `accept` and validation for annex images. */
export const ANNEX_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
export const ANNEX_IMAGE_FORMATS_LABEL = 'JPEG, PNG, WebP, GIF';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

export function newAnnexId(): string {
  return `annex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newAnnexImageId(): string {
  return `aimg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyAnnex(overrides?: Partial<InvoiceAnnex>): InvoiceAnnex {
  const base = {
    id: newAnnexId(),
    title: '',
    includeInPrint: true,
    images: [] as InvoiceAnnexImage[],
    ...overrides,
  };
  const paragraphs =
    base.paragraphs && base.paragraphs.length > 0
      ? base.paragraphs.map(normalizeAnnexParagraph)
      : String(base.body ?? '').trim()
        ? bodyToAnnexParagraphs(base.body)
        : [createEmptyAnnexParagraph()];
  return {
    ...base,
    body: annexParagraphsToBody(paragraphs),
    paragraphs,
  };
}

export function normalizeInvoiceAnnexImage(raw: unknown): InvoiceAnnexImage | null {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const src = String(o.src ?? '').trim();
  if (!src) return null;
  return {
    id: String(o.id ?? newAnnexImageId()),
    src,
    name: o.name !== undefined && o.name !== null ? String(o.name) : undefined,
    caption: o.caption !== undefined && o.caption !== null ? String(o.caption) : undefined,
  };
}

export function normalizeInvoiceAnnex(raw: unknown): InvoiceAnnex {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const imagesRaw = o.images;
  const images = Array.isArray(imagesRaw)
    ? imagesRaw.map(normalizeInvoiceAnnexImage).filter((x): x is InvoiceAnnexImage => x !== null)
    : [];
  const body = String(o.body ?? '');
  const paragraphsRaw = o.paragraphs;
  const paragraphs = Array.isArray(paragraphsRaw)
    ? paragraphsRaw.map(normalizeAnnexParagraph)
    : body.trim()
      ? bodyToAnnexParagraphs(body)
      : [createEmptyAnnexParagraph()];
  return {
    id: String(o.id ?? newAnnexId()),
    title: String(o.title ?? ''),
    body: annexParagraphsToBody(paragraphs) || body,
    paragraphs,
    includeInPrint: o.includeInPrint !== false,
    images,
  };
}

export function parseInvoiceAnnexes(raw: unknown): InvoiceAnnex[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeInvoiceAnnex);
}

export function annexHasPrintableContent(annex: InvoiceAnnex): boolean {
  return !!(annex.title.trim() || annexHasParagraphText(annex) || (annex.images?.length ?? 0) > 0);
}

export function annexesForPrint(annexes: InvoiceAnnex[], enabled: boolean): InvoiceAnnex[] {
  if (!enabled) return [];
  return annexes.filter((a) => a.includeInPrint && annexHasPrintableContent(a));
}

export function isAllowedAnnexImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME.has(mime)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** Read image files from disk into annex image records (caller may compress `src`). */
export async function readAnnexImageFiles(
  files: FileList | File[],
  options?: { compress?: (dataUrl: string) => Promise<string> },
): Promise<InvoiceAnnexImage[]> {
  const list = Array.from(files);
  const out: InvoiceAnnexImage[] = [];
  for (const file of list) {
    if (!isAllowedAnnexImageFile(file)) continue;
    if (file.size > MAX_ANNEX_IMAGE_BYTES) continue;
    let src = await readFileAsDataUrl(file);
    if (options?.compress) {
      try {
        src = await options.compress(src);
      } catch {
        /* keep original */
      }
    }
    if (!src.startsWith('data:image/') && !/^https?:\/\//i.test(src)) continue;
    out.push({
      id: newAnnexImageId(),
      src,
      name: file.name,
    });
  }
  return out;
}

export type InvoiceAnnexProjectImageOption = {
  id: string;
  label: string;
  src: string;
};

/** Product main + gallery images for annex picker. */
export function collectProjectAnnexImageOptions(products: Product[]): InvoiceAnnexProjectImageOption[] {
  const out: InvoiceAnnexProjectImageOption[] = [];
  for (const p of products) {
    if (p.active === false) continue;
    const labelBase = [p.name, p.sku].filter(Boolean).join(' · ') || `Product ${p.id}`;
    const main = String(p.image ?? '').trim();
    if (main) {
      out.push({ id: `p${p.id}-main`, label: labelBase, src: main });
    }
    (p.gallery ?? []).forEach((src, gi) => {
      const s = String(src ?? '').trim();
      if (!s || s === main) return;
      out.push({ id: `p${p.id}-g${gi}`, label: `${labelBase} (${gi + 1})`, src: s });
    });
  }
  return out;
}

export function parseInvoiceAnnexPresetsFromStorage(raw: string | null): InvoiceAnnexPreset[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        if (!x || typeof x !== 'object') return null;
        const o = x as Record<string, unknown>;
        const name = String(o.name ?? '').trim();
        if (!name) return null;
        const body = String(o.body ?? '');
        const paragraphsRaw = o.paragraphs;
        const paragraphs = Array.isArray(paragraphsRaw)
          ? paragraphsRaw.map(normalizeAnnexParagraph)
          : body.trim()
            ? bodyToAnnexParagraphs(body)
            : undefined;
        return {
          id: String(o.id ?? `iap_${Date.now()}`),
          name,
          title: String(o.title ?? ''),
          body: paragraphs ? annexParagraphsToBody(paragraphs) : body,
          paragraphs,
          updatedAt: Number(o.updatedAt) || Date.now(),
        } satisfies InvoiceAnnexPreset;
      })
      .filter((x): x is InvoiceAnnexPreset => x !== null)
      .slice(0, MAX_INVOICE_ANNEX_PRESETS);
  } catch {
    return [];
  }
}
