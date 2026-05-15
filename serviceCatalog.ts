import type {
  CatalogConfig,
  CatalogSection,
  CustomPage,
  ServiceCatalogDef,
  ServiceCatalogItem,
} from './types';

export const SERVICE_CATALOG_SCHEMA_VERSION = '1.0';

export function newServiceCatalogItemId(): string {
  return `sci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultServiceCatalogConfig(): CatalogConfig {
  const y = new Date().getFullYear();
  return {
    title: 'SERVICES & PRODUCTS',
    subtitle: 'Professional catalog — import or edit in the builder',
    coverImage: '',
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    textColor: '#334155',
    headingColor: '#0f172a',
    coverColor: '#0f172a',
    layoutMode: 'grid',
    showPrices: true,
    priceBasis: 'unit',
    showMOQ: true,
    moqLabel: 'MOQ',
    showGroupCovers: true,
    showTargetPrice: false,
    priceTerms: ['FOB', 'CIF'],
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    socialLinks: [],
    website: '',
    languages: ['en', 'fa'],
    collectionText: `${y} CATALOG`,
    footerText: '',
    itemsPerPage: 4,
    includedProductIds: [],
    coverHeaderText: '',
    coverYearText: String(y),
    showCoverLines: true,
    coverLineColor: '#ffffff',
    showCoverContact: true,
    coverContactTitle: 'Contact',
    baseUnit: 'unit',
    coverOverlayOpacity: 55,
    showAboutUs: false,
    aboutUsText: '',
    aboutUsImages: [],
    aboutUsImageLayout: 'side-right',
    logoImage: '',
    logoSize: 'md',
    logoPosition: 'top-left',
    logoStyle: 'plain',
    coverTextColor: '#ffffff',
    coverTitleFontSizePx: 52,
    backCoverImage: '',
    backCoverOverlayOpacity: 55,
    showQrCode: true,
    qrCodeValue: '',
    qrCodeLabel: 'Scan catalog',
    googleFormUrl: '',
    googleFormButtonText: 'Send order request',
    googleFormHelperText: '',
    cartEnabled: true,
    orderEmail: '',
    orderIncoterms: ['EXW', 'FOB', 'CIF', 'DDP'],
    orderPorts: ['Bandar Abbas', 'Jebel Ali', 'Hamburg', 'Rotterdam'],
    cartButtonText: 'Add to inquiry',
    cartTitle: 'Your inquiry cart',
    orderThankYouText: 'Thank you — we will contact you shortly.',
    showCompanyPhotos: false,
    companyPhotos: [],
    sections: [],
    customPages: [],
  };
}

export function createBlankServiceCatalogDef(): ServiceCatalogDef {
  const now = Date.now();
  return {
    id: '',
    name: 'New catalog',
    description: '',
    catalogConfig: createDefaultServiceCatalogConfig(),
    items: [],
    createdAt: now,
    updatedAt: now,
    isPublished: false,
  };
}

function parseCatalogSection(raw: unknown): CatalogSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? '').trim();
  if (!title) return null;
  return {
    id: typeof o.id === 'number' ? o.id : Date.now() + Math.floor(Math.random() * 1000),
    title,
    content: String(o.content ?? ''),
    alignment: (['left', 'center', 'right', 'justify'].includes(String(o.alignment))
      ? o.alignment
      : 'left') as CatalogSection['alignment'],
    image: typeof o.image === 'string' ? o.image : undefined,
    images: Array.isArray(o.images) ? o.images.filter((x) => typeof x === 'string') : undefined,
    imageLayout: (['single', 'two-column', 'three-column', 'grid'].includes(String(o.imageLayout))
      ? o.imageLayout
      : 'grid') as CatalogSection['imageLayout'],
    position: o.position === 'before' ? 'before' : 'after',
  };
}

function parseCustomPage(raw: unknown): CustomPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? '').trim();
  if (!title) return null;
  const itemsIn = Array.isArray(o.items) ? o.items : [];
  return {
    id: String(o.id || `cp_${Date.now()}`),
    type: typeof o.type === 'string' ? o.type : undefined,
    title,
    description: typeof o.description === 'string' ? o.description : undefined,
    active: o.active !== false,
    items: itemsIn
      .filter((x) => x && typeof x === 'object')
      .map((x, i) => {
        const it = x as Record<string, unknown>;
        return {
          id: it.id ?? i + 1,
          name: String(it.name ?? 'Item'),
          description: typeof it.description === 'string' ? it.description : undefined,
          image: typeof it.image === 'string' ? it.image : undefined,
          active: it.active !== false,
        };
      }),
  };
}

function parseServiceCatalogItem(raw: unknown, index: number): ServiceCatalogItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? o.title ?? '').trim();
  if (!name) return null;
  const prices: Record<string, number> = {};
  if (o.prices && typeof o.prices === 'object' && !Array.isArray(o.prices)) {
    for (const [k, v] of Object.entries(o.prices as Record<string, unknown>)) {
      const n = Number(v);
      if (!Number.isNaN(n)) prices[String(k).toUpperCase()] = n;
    }
  }
  const images = Array.isArray(o.images)
    ? o.images.filter((x): x is string => typeof x === 'string')
    : Array.isArray(o.gallery)
      ? o.gallery.filter((x): x is string => typeof x === 'string')
      : undefined;
  return {
    id: String(o.id || newServiceCatalogItemId()),
    name,
    catalogName: typeof o.catalogName === 'string' ? o.catalogName : undefined,
    group: String(o.group ?? o.category ?? '').trim() || undefined,
    category: typeof o.category === 'string' ? o.category : undefined,
    description: String(o.description ?? o.catalogDescription ?? '').trim() || undefined,
    catalogDescription: typeof o.catalogDescription === 'string' ? o.catalogDescription : undefined,
    sku: typeof o.sku === 'string' ? o.sku : undefined,
    image: typeof o.image === 'string' ? o.image : images?.[0],
    images,
    gallery: images,
    videos: Array.isArray(o.videos)
      ? o.videos.filter((x): x is string => typeof x === 'string')
      : Array.isArray(o.galleryVideos)
        ? o.galleryVideos.filter((x): x is string => typeof x === 'string')
        : undefined,
    unitPrice: Number(o.unitPrice ?? o.price) || undefined,
    price: Number(o.price) || undefined,
    currency: typeof o.currency === 'string' ? o.currency : undefined,
    prices: Object.keys(prices).length ? prices : undefined,
    moq: typeof o.moq === 'string' ? o.moq : undefined,
    unit: typeof o.unit === 'string' ? o.unit : undefined,
    itemsPerPack: Number(o.itemsPerPack) || undefined,
    targetPrice: Number(o.targetPrice) || undefined,
    targetPriceCurrency: typeof o.targetPriceCurrency === 'string' ? o.targetPriceCurrency : undefined,
    active: o.active !== false,
  };
}

export function normalizeCatalogConfigFromJson(
  partial: unknown,
  fallback?: CatalogConfig
): CatalogConfig {
  const base = { ...(fallback || createDefaultServiceCatalogConfig()) };
  if (!partial || typeof partial !== 'object') return base;
  const o = partial as Record<string, unknown>;
  const merged = { ...base, ...(partial as CatalogConfig) };
  if (typeof o.title === 'string') merged.title = o.title;
  if (typeof o.subtitle === 'string') merged.subtitle = o.subtitle;
  if (Array.isArray(o.priceTerms)) merged.priceTerms = o.priceTerms.map(String).filter(Boolean);
  if (Array.isArray(o.languages)) merged.languages = o.languages as CatalogConfig['languages'];
  if (Array.isArray(o.orderIncoterms)) merged.orderIncoterms = o.orderIncoterms.map(String);
  if (Array.isArray(o.orderPorts)) merged.orderPorts = o.orderPorts.map(String);
  if (Array.isArray(o.sections)) {
    merged.sections = o.sections.map(parseCatalogSection).filter((x): x is CatalogSection => !!x);
  }
  if (Array.isArray(o.customPages)) {
    merged.customPages = o.customPages.map(parseCustomPage).filter((x): x is CustomPage => !!x);
  }
  return merged;
}

/** Parse imported JSON into a draft catalog (no id — caller assigns on save). */
export function parseServiceCatalogJson(parsed: unknown): ServiceCatalogDef | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  const catalogRoot =
    root.catalog && typeof root.catalog === 'object' ? (root.catalog as Record<string, unknown>) : root;

  const name = String(catalogRoot.name ?? root.name ?? 'Imported catalog').trim();
  const configIn = catalogRoot.catalogConfig ?? catalogRoot.config ?? root.catalogConfig;
  const catalogConfig = normalizeCatalogConfigFromJson(configIn);

  const itemsRaw = catalogRoot.items ?? root.items ?? catalogRoot.products ?? root.products;
  const items: ServiceCatalogItem[] = [];
  if (Array.isArray(itemsRaw)) {
    itemsRaw.forEach((raw, i) => {
      const it = parseServiceCatalogItem(raw, i);
      if (it) items.push(it);
    });
  }

  const sectionsRaw = catalogRoot.sections ?? root.sections;
  if (Array.isArray(sectionsRaw) && !catalogConfig.sections?.length) {
    catalogConfig.sections = sectionsRaw.map(parseCatalogSection).filter((x): x is CatalogSection => !!x);
  }
  const pagesRaw = catalogRoot.customPages ?? root.customPages;
  if (Array.isArray(pagesRaw) && !catalogConfig.customPages?.length) {
    catalogConfig.customPages = pagesRaw.map(parseCustomPage).filter((x): x is CustomPage => !!x);
  }

  const now = Date.now();
  return {
    id: '',
    name,
    description: String(catalogRoot.description ?? root.description ?? '').trim() || undefined,
    catalogConfig,
    items,
    createdAt: now,
    updatedAt: now,
    isPublished: false,
  };
}

/** Convert builder items to product-shaped rows for buildCatalogHtml. */
export function serviceCatalogItemsToProducts(
  items: ServiceCatalogItem[],
  opts: { outputCurrency: string; priceTerms: string[] }
): Record<string, unknown>[] {
  const terms = opts.priceTerms.length ? opts.priceTerms : ['FOB'];
  return items
    .filter((it) => it.active !== false)
    .map((it, idx) => {
      const termPrices: Record<string, number> = { ...(it.prices || {}) };
      const defaultPrice = Number(it.unitPrice ?? it.price) || 0;
      for (const term of terms) {
        const key = term.toUpperCase();
        if (termPrices[key] === undefined && defaultPrice > 0) termPrices[key] = defaultPrice;
      }
      const scenarioPrices: Record<string, number> = {};
      const scenarioPackPrices: Record<string, number> = {};
      for (const term of terms) {
        const key = term.toUpperCase();
        scenarioPrices[term] = termPrices[key] ?? 0;
        scenarioPackPrices[term] = termPrices[key] ?? 0;
      }
      const gallery = it.images?.length ? it.images : it.gallery?.length ? it.gallery : it.image ? [it.image] : [];
      return {
        id: idx + 1,
        name: it.name,
        catalogName: it.catalogName || it.name,
        catalogDescription: it.description || it.catalogDescription || '',
        catalogMOQ: it.moq || '',
        sku: it.sku || `CAT-${String(idx + 1).padStart(3, '0')}`,
        group: it.group || it.category || '',
        image: it.image || gallery[0] || '',
        gallery,
        galleryVideos: it.videos || it.galleryVideos || [],
        qty: 1,
        unitPrice: defaultPrice,
        currency: it.currency || opts.outputCurrency,
        itemsPerPack: it.itemsPerPack || 0,
        measurementUnit: it.unit || 'unit',
        active: true,
        scenarioPrices,
        scenarioPackPrices,
        targetPrice: it.targetPrice,
        targetPriceCurrency: it.targetPriceCurrency,
      };
    });
}

export const SAMPLE_SERVICE_CATALOG_JSON = {
  _schema_version: SERVICE_CATALOG_SCHEMA_VERSION,
  _about:
    'CloudExport Pro — Service/Product Catalog Builder JSON. Import in Forms → Catalog Builder. Reuses the same HTML engine as Catalog Gen (cover, sections, product cards, cart, online inquiry).',
  _root_keys: 'name, description, catalogConfig (or config), items[], sections[], customPages[]',
  _catalogConfig_hint:
    'catalogConfig: title, subtitle, coverImage, logoImage, primaryColor, coverColor, priceTerms[], cartEnabled, orderEmail, contactEmail, contactPhone, languages[], sections[], customPages[], showAboutUs, aboutUsText, googleFormUrl, …',
  _item_fields:
    'id, name, catalogName, group, description, sku, image, images[], videos[], unitPrice, currency, prices: { FOB: 10, CIF: 12 }, moq, unit, active',
  name: 'Sample — Export services & products',
  description: 'Demonstrates multi-page catalog: cover, about section, service groups, cart.',
  catalogConfig: {
    title: 'EXPORT SERVICES 2026',
    subtitle: 'Logistics · Sourcing · Quality control',
    collectionText: '2026 CATALOG',
    primaryColor: '#0f172a',
    coverColor: '#1e3a5f',
    coverTextColor: '#ffffff',
    showPrices: true,
    priceTerms: ['EXW', 'FOB', 'CIF'],
    priceBasis: 'unit',
    cartEnabled: true,
    cartButtonText: 'Add to inquiry',
    orderEmail: 'sales@example.com',
    contactEmail: 'sales@example.com',
    contactPhone: '+98 21 0000 0000',
    website: 'www.example.com',
    languages: ['en', 'fa'],
    showAboutUs: true,
    aboutUsText: 'We help international buyers source from Iran with full export documentation.',
    showGroupCovers: true,
    itemsPerPage: 4,
    sections: [
      {
        id: 1,
        title: 'How we work',
        content: '1. Send inquiry via cart\n2. We quote within 48h\n3. Contract & shipment',
        alignment: 'left',
        position: 'before',
      },
    ],
    customPages: [
      {
        id: 'partners',
        title: 'Certifications & partners',
        description: 'Optional trust page',
        items: [
          { id: 1, name: 'ISO 9001', description: 'Quality management', image: 'https://picsum.photos/seed/iso/400/240' },
          { id: 2, name: 'Partner network', description: 'GCC · EU · Asia', image: 'https://picsum.photos/seed/partner/400/240' },
        ],
      },
    ],
  },
  items: [
    {
      id: 'svc_inspection',
      name: 'Pre-shipment inspection',
      group: 'Quality',
      description: 'On-site QC report with photos before loading.',
      image: 'https://picsum.photos/seed/inspect/800/500',
      unitPrice: 450,
      currency: 'USD',
      prices: { EXW: 450, FOB: 480 },
      moq: '1 visit',
      unit: 'visit',
    },
    {
      id: 'svc_freight',
      name: 'Ocean freight booking',
      group: 'Logistics',
      description: 'FCL/LCL from Bandar Abbas to major ports.',
      image: 'https://picsum.photos/seed/freight/800/500',
      unitPrice: 1200,
      currency: 'USD',
      prices: { FOB: 1200, CIF: 1450 },
      moq: '1×20ft',
      unit: 'container',
    },
    {
      id: 'prod_sample',
      name: 'Premium saffron — grade A',
      group: 'Products',
      catalogName: 'Saffron Grade A',
      description: 'Negin cut, lab-tested, export packing.',
      image: 'https://picsum.photos/seed/saffron/800/500',
      images: [
        'https://picsum.photos/seed/saffron/800/500',
        'https://picsum.photos/seed/saffron2/800/500',
      ],
      unitPrice: 38,
      currency: 'USD',
      prices: { FOB: 38, CIF: 42 },
      moq: '100 kg',
      unit: 'kg',
      sku: 'SAF-A1',
    },
  ],
};
