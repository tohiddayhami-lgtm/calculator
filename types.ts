
export interface RateMap {
  [key: string]: number;
}

export interface Product {
  id: number;
  name: string;
  qty: number;
  unitPrice: number;
  currency: string;
  itemsPerPack: number;
  packPrice: number; // Kept for legacy compatibility or specific overrides if needed
  active: boolean;
  hsCode?: string; // HS Code for customs
  sku?: string; // Auto-generated unique product code (used in catalog/HTML export)
  image?: string; // Base64 data string for product image (main thumbnail)
  gallery?: string[]; // Additional images (different angles) shown in catalog/HTML export
  /** HTTPS URLs to product videos for catalog HTML carousel (YouTube/Vimeo page links or direct .mp4/.webm). */
  galleryVideos?: string[];
  priceInputMode?: 'unit' | 'pack'; // New: Defines if unitPrice input is per unit or per pack
  customProfit?: number; // New: Optional override for profit percentage
  measurementUnit?: string; // New: e.g. "kg", "m", "box" (replaces default "pcs")
  // Catalog specific overrides
  catalogName?: string; // Editable name just for catalog
  catalogMOQ?: string; // Editable MOQ string just for catalog
  catalogDescription?: string; // New: Detailed features/description for catalog
  // New: Logistics Info for Catalog
  logisticsDetails?: {
      qtyPerBox?: number;
      qtyPerPallet?: number;
      qty20ft?: number;
      qty40ft?: number;
  };
  group?: string; // New: Group/Category name
  supplierId?: number; // New: Link to a specific supplier
  // Optional: Target price (per unit) requested by buyer / target market
  targetPrice?: number;
  targetPriceCurrency?: string;

  /** Packing list — cartons & pallets (weights in kg unless app packing doc states otherwise) */
  packingQtyCartons?: number;
  packingCartonNetWeightKg?: number;
  packingCartonGrossWeightKg?: number;
  packingCartonLengthCm?: number;
  packingCartonWidthCm?: number;
  packingCartonHeightCm?: number;
  packingPalletCount?: number;
  packingPalletNetWeightKg?: number;
  packingPalletGrossWeightKg?: number;
  /** Marks & numbers / package numbering (e.g. 1–48, PKG-A001–A048) */
  packingPackageNumbers?: string;

  // Computed fields (optional as they are added during calculation)
  isActive?: boolean;
  unitCostOutput?: number;
  lineCost?: number;
  unitProfit?: number;
  totalProfit?: number;
  unitSellPrice?: number;
  totalSellPrice?: number;
  fullPackCost?: number;
  fullPackSell?: number;
  totalPacks?: number; // New: Calculated number of packs (qty / itemsPerPack)
  scenarioPrices?: { [key: string]: number };
  scenarioPackPrices?: { [key: string]: number }; // New: Pack prices for each scenario
}

export interface ExtraCost {
  id: number;
  name: string;
  val: number;
  curr: string;
}

export interface LogisticsItem {
  val: number;
  curr: string;
}

/** Shipment-level costs; engine stacks EXW → FCA → FOB → CIF → DDP then spreads per active unit. */
export interface Logistics {
  /** Pre-carriage — FCA band in app pricing */
  inland: LogisticsItem;
  /** Origin THC / stuffing — FOB band */
  port: LogisticsItem;
  /** Main carriage — CIF band */
  freight: LogisticsItem;
  /** Seller insurance — CIF band */
  insurance: LogisticsItem;
  /** DTHC / brokerage / delivery — DDP band (with duty % and extras after CIF stack) */
  destination: LogisticsItem;
  /** Import duty & taxes as % of CIF-style landed value (aggregate), then per-unit */
  dutyPercent: number;
  /** Named origin charges — EXW layer with product cost */
  exwExtras: ExtraCost[];
  /** Fixed landed lines — DDP band with destination + duty */
  extras: ExtraCost[];
}

/** Saved full logistics ladder (EXW…DDP); persisted in browser localStorage, not per Firestore project. */
export interface LogisticsPreset {
  id: string;
  name: string;
  updatedAt: number;
  logistics: Logistics;
}

/** Reusable snippets for Proforma: notes, payment terms line, or bank block (browser localStorage). */
export type InvoiceTextPresetKind = 'note' | 'paymentTerms' | 'bankDetails' | 'paymentLogNote';

export interface InvoiceTextPreset {
  id: string;
  name: string;
  kind: InvoiceTextPresetKind;
  body: string;
  updatedAt: number;
}

/** Line on a service proforma (multi-currency). */
export interface ServiceInvoiceLine {
  id: string;
  description: string;
  detailNotes?: string;
  detailsOpen?: boolean;
  qty: number;
  unitPrice: number;
  currency: string;
  savedServiceId?: string;
}

/** Reusable service catalog entry for service proforma invoices. */
export interface SavedService {
  id: string;
  name: string;
  description?: string;
  defaultUnitPrice?: number;
  defaultCurrency?: string;
  updatedAt: number;
}

export interface ProfitFlags {
  [key: string]: boolean;
  exw: boolean;
  fob: boolean;
  cif: boolean;
  ddp: boolean;
}

export interface AppConfig {
  outputCurrency: string;
  profitType: 'markup' | 'margin';
  profitPercent: number;
  profitFlags: ProfitFlags;
  // New: Advanced Profit Configuration
  enableTermSpecificProfit?: boolean;
  termProfits?: {
      exw: number;
      fob: number;
      cif: number;
      ddp: number;
  };
  // New: Pricing Strategy
  pricingMethod?: 'cost_plus' | 'fixed_unit_markup';
  termMultipliers?: {
      exw: number;
      fob: number;
      cif: number;
      ddp: number;
  };
}

// New Interface for Social Media
export interface SocialLink {
  id: number;
  platform: 'instagram' | 'linkedin' | 'whatsapp' | 'telegram' | 'facebook' | 'youtube' | 'twitter' | 'website';
  handle: string;
}

export interface CustomPageItem {
  id: number | string;
  name: string;
  description?: string;
  image?: string;
  active?: boolean;
}

export interface CustomPage {
  id: string;
  type?: string;
  title: string;
  description?: string;
  active?: boolean;
  items?: CustomPageItem[];
}

// New Interface for Custom Catalog Sections
export interface CatalogSection {
  id: number;
  title: string;
  content: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
  image?: string; // Base64 string (Legacy single image)
  images?: string[]; // New: Multiple images
  imageLayout?: 'single' | 'two-column' | 'three-column' | 'grid'; // New: Layout mode
  position: 'before' | 'after'; // Position relative to product list
}

// New Interface for Catalog Design
export interface CatalogConfig {
  title: string;
  subtitle: string;
  coverImage?: string; // Base64
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  headingColor?: string;
  layoutMode: 'grid' | 'list' | 'modern';
  showPrices: boolean;
  priceBasis: 'unit' | 'pack' | 'both'; // New: Control price display in catalog
  showMOQ: boolean; // Show Qty as MOQ
  moqLabel?: string; // New: Custom label for MOQ
  showLogisticsDetails?: boolean; // New: Toggle to show box/pallet/container capacities
  showGroupCovers?: boolean; // New: Option to show separate covers for groups
  showTargetPrice?: boolean; // New: Optional - show buyer Target Price in catalog
  targetPriceLabel?: string; // New: Custom label for Target Price (default: "Target")
  showTargetProfit?: boolean; // New: Optional - show profit % vs Target Price
  targetProfitLabel?: string; // New: Custom label for the profit-from-deal message
  priceTerms: string[]; // Changed: Array of strings instead of single string
  contactEmail: string;
  contactPhone: string;
  contactAddress?: string; // New: Physical address
  socialLinks?: SocialLink[]; // New: List of social media links
  website: string;
  languages: ('en' | 'fa' | 'ar')[]; // Changed from single language to array
  collectionText?: string; // New: Editable text for "2025 COLLECTION"
  footerText?: string; // New: Editable footer company name
  // NEW FIELDS
  itemsPerPage?: number; // 2, 4, 6
  includedProductIds?: number[]; // Specific filtering for catalog
  coverColor?: string; // New: Customizable cover background color
  coverHeaderText?: string; // New: Editable header text on cover
  coverYearText?: string; // New: Editable year on cover
  showCoverLines?: boolean; // New: Toggle lines on cover
  coverLineColor?: string; // New: Custom color for lines on cover
  showCoverContact?: boolean; // New: Toggle contact section on cover
  coverContactTitle?: string; // New: Editable "Contact Us" title on cover
  baseUnit?: string; // New: Global default unit (e.g. "kg")
  coverOverlayOpacity?: number; // New: Opacity of the cover overlay (0-100)
  
  // Extra Company Pages
  showAboutUs?: boolean;
  aboutUsText?: string;
  aboutUsImages?: string[];
  aboutUsImageLayout?: 'top' | 'bottom' | 'side-right' | 'side-left' | 'grid';

  // Brand Logo (cover)
  logoImage?: string;
  logoSize?: 'sm' | 'md' | 'lg';
  logoPosition?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  logoStyle?: 'plain' | 'badge' | 'circle';

  // Cover typography color (text on the cover)
  coverTextColor?: string;
  /** Main cover title (h1) max font size in px; HTML uses clamp() down to ~45% for small viewports */
  coverTitleFontSizePx?: number;

  // Back Cover background image + overlay
  backCoverImage?: string;
  backCoverOverlayOpacity?: number; // 0-100

  // QR Code on back cover
  showQrCode?: boolean;
  qrCodeValue?: string;
  qrCodeLabel?: string;

  // Google Form / Order Form CTA on HTML export & back page
  googleFormUrl?: string;
  googleFormButtonText?: string;
  googleFormHelperText?: string;

  // Shopping cart on HTML export
  cartEnabled?: boolean;
  orderEmail?: string;
  orderIncoterms?: string[]; // e.g. ['EXW', 'FOB', 'CIF', 'DDP']
  orderPorts?: string[]; // suggestion list of common destination ports
  cartButtonText?: string;
  cartTitle?: string;
  orderThankYouText?: string;
  showCustomization?: boolean;
  customizationText?: string;
  showPartners?: boolean;
  partnerLogos?: string[]; // List of Base64 strings
  showCompanyPhotos?: boolean;
  companyPhotos?: string[]; // List of Base64 strings
  
  // Dynamic Sections
  sections?: CatalogSection[]; // New: Unlimited custom sections
  customPages?: CustomPage[]; // AI-editable structured pages (partners, certifications, etc.)
}

/** Formal packing list document (replaces legacy price list). */
export interface PackingListConfig {
  title: string;
  subtitle: string;
  footerText: string;
  showImages: boolean;
  showHsCode?: boolean;
  /** Shown in table headers, e.g. kg */
  weightUnitLabel?: string;
  shipperNotes?: string;
  consigneeNotes?: string;
}

export interface SupplierAttachment {
  id: string;
  name: string;
  type: string; // MIME Type e.g. 'application/pdf' or 'video/mp4'
  data: string; // Base64 Data URL
  size: number; // in bytes
}

/** Export (goods) vs service-invoice customers — shown in buyers spreadsheet & exports. */
export type BuyerCustomerKind = 'export' | 'services';

// New Interface for Buyers (saved customers for repeat orders)
export interface Buyer {
  id: number;
  /** Export proforma vs service invoice customer (default export for legacy saves). */
  customerKind?: BuyerCustomerKind;
  /** Legacy / display — synced from firstName + lastName when set */
  name: string;
  firstName?: string;
  lastName?: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  destinationPort: string;
  incoterm: string; // e.g. EXW / FOB / CIF / DDP
  paymentTerms: string;
  address: string; // Full billing address (multi-line)
  notes: string;
  vatId?: string; // Tax / VAT / EORI / Importer code
  lastOrderAt?: number; // unix ms — last time used in an invoice
}

// New Interface for Suppliers
export interface Supplier {
  id: number;
  /** Display label for product picker / legacy: company, or first+last, or old single name */
  name: string;
  /** Optional grouping (e.g. raw materials, packaging) — shown as spreadsheet column */
  category?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactInfo: string;
  address: string;
  notes: string;
  images: string[]; // List of Base64 strings for photos
  attachments?: SupplierAttachment[]; // New: List of PDF/Video files
}

// Reusable seller / business identity used to pre-fill new proforma invoices.
export interface SellerProfile {
  id: string;
  name: string; // friendly label (e.g. "Tohid Dayhami Co. — Export Dept")
  billedFrom: string;
  billedFromDetails: string;
  invoiceLogo?: string;
  invoiceSellerEmail?: string;
  invoiceSellerPhone?: string;
  invoiceSellerWebsite?: string;
  invoiceSellerTaxId?: string;
  bankDetails?: string;
  paymentTerms?: string;
  createdAt?: number; // ms epoch (set client-side)
  updatedAt?: number;
}

export interface InvoicePayment {
  id: string;
  date: number; // ms epoch
  amount: number;
  currency: string;
  method: string; // T/T, Cash, Cheque, Online, Other
  reference?: string; // bank ref / cheque number
  notes?: string;
}

export type ArchivedInvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

/** Optional invoice lines (shipping, insurance, …) — fixed amount or % of net (service invoices). */
export interface InvoiceExtraCharge {
  id: string;
  label: string;
  /** Numeric value: currency amount or percent (0–100) when `valueMode` is `percent`. */
  amount: number;
  enabled: boolean;
  valueMode?: 'amount' | 'percent';
  /** Target currency for amount / percent base (service invoices; product uses invoice output currency). */
  currency?: string;
}

/** Editable titles / column headers on the customs-style proforma (layout key `welte`). */
export interface InvoiceCustomsStyleLabels {
  docTitle: string;
  sellerCaption: string;
  invoiceNoLabel: string;
  invoiceDateLabel: string;
  invoiceValidityLabel: string;
  buyersCardLabel: string;
  sellersRefLabel: string;
  buyerLabel: string;
  freightForwarderLabel: string;
  countryBeneficiaryLabel: string;
  transportModeLabel: string;
  portLoadingLabel: string;
  countryOriginLabel: string;
  destinationLabel: string;
  portDischargeLabel: string;
  placeDeliveryLabel: string;
  termsDeliveryLabel: string;
  transactionCurrencyLabel: string;
  termsPaymentLabel: string;
  shippingMarksLabel: string;
  packagesDescLabel: string;
  commodityLabel: string;
  totalGrossWtLabel: string;
  totalVolumeLabel: string;
  packageKindsLabel: string;
  colItem: string;
  colDescription: string;
  colOrigin: string;
  colCommodityCode: string;
  colNetWt: string;
  colQuantity: string;
  colUnitPrice: string;
  colAmount: string;
  discountLabel: string;
  vatLabel: string;
  totalAmountLabel: string;
  noteLabel: string;
  paymentBankTitleLabel: string;
  signatoryLabel: string;
  placeDateIssueLabel: string;
  totalKgLabel: string;
  totalPiecesLabel: string;
}

/** Trade / shipping fields for the customs-style proforma (classic bordered export layout). */
export interface InvoiceWelteTradeBlock {
  /** Overrides for fixed English (or any) wording on the customs-style sheet. */
  customsLabels?: Partial<InvoiceCustomsStyleLabels>;
  buyersCommercialCardNo?: string;
  sellersReference?: string;
  freightForwarder?: string;
  countryOfBeneficiary?: string;
  transportMode?: string;
  portOfLoading?: string;
  countryOfOriginDefault?: string;
  destination?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  termsOfDelivery?: string;
  shippingMarksLine?: string;
  packagesDescription?: string;
  commoditySummary?: string;
  totalGrossWeightKg?: string;
  totalVolumeM3?: string;
  packageKindsStd?: string;
  certificationNote?: string;
  signatoryName?: string;
  issuePlace?: string;
}

/** Per-line overrides on the Proforma (persisted on the project). */
export interface InvoiceLineOverride {
  qty?: number;
  unitPrices?: Record<string, number>;
  packPrices?: Record<string, number>;
  /** Line discount: if discountPercent > 0 it applies to all scenario columns; else discountAmount applies only to `invoiceDiscountBaseTerm` column. */
  discountPercent?: number;
  discountAmount?: number;
  /** Customs-style layout: origin country column */
  origin?: string;
  /** Customs-style layout: line net weight (kg) */
  netWeightKg?: number;
}

export interface ArchivedInvoiceLineSnapshot {
  productId: number;
  name: string;
  sku?: string;
  hsCode?: string;
  image?: string;
  qty: number;
  itemsPerPack: number;
  unitPrices: Record<string, number>; // per Incoterm
  packPrices: Record<string, number>;
  discountPercent?: number;
  discountAmount?: number;
}

export interface ArchivedInvoice {
  id: string; // Firestore doc id
  invoiceRef: string;
  invoiceTitle: string;
  issueDate: number; // ms epoch
  dueDate?: number;
  status: ArchivedInvoiceStatus;
  customerName: string;
  customerAddress: string;
  selectedTerm: string; // primary Incoterm used for "totalDue"
  invoiceTerms: string[];
  invoiceBasis: 'unit' | 'pack' | 'both';
  showImages: boolean;
  outputCurrency: string;

  // seller identity at the time of issue
  billedFrom: string;
  billedFromDetails: string;
  invoiceLogo?: string;
  invoiceSellerEmail?: string;
  invoiceSellerPhone?: string;
  invoiceSellerWebsite?: string;
  invoiceSellerTaxId?: string;
  paymentTerms?: string;
  bankDetails?: string;
  notes?: string;

  // computed / discount info for re-render
  invoiceDiscountBaseTerm: string;
  invoiceGlobalDiscountMode: 'none' | 'percent' | 'amount';
  invoiceGlobalDiscountValue: number;
  invoiceVatEnabled: boolean;
  invoiceVatPercent: number;
  invoiceVatMode?: 'exclusive' | 'inclusive';
  /** Fixed extras (shipping, etc.) — same amount added to every scenario column total. */
  invoiceExtraCharges?: InvoiceExtraCharge[];
  extrasTotal?: number;

  items: ArchivedInvoiceLineSnapshot[];
  subtotalByTerm: Record<string, number>;
  netAfterGlobalByTerm: Record<string, number>;
  vatByTerm: Record<string, number>;
  grandByTerm: Record<string, number>;

  // money tracking
  totalDue: number; // grandByTerm[selectedTerm]
  payments: InvoicePayment[];

  projectId?: string; // origin project, for breadcrumbs
  createdAt?: any;
  updatedAt?: any;
}

/** File linked to a dashboard research line (binary in Firebase Storage, metadata in project). */
export interface DashboardResearchAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadURL: string;
  uploadedAtMs: number;
}

/** One linear research / report note on the dashboard with optional attachments. */
export interface DashboardResearchEntry {
  id: string;
  title: string;
  body: string;
  createdAtMs: number;
  attachments: DashboardResearchAttachment[];
  /** When true, entry is shown as a compact row; click to expand and read/edit. */
  collapsed?: boolean;
}

/** Compact linear task on the dashboard (start / end window + optional one file). */
export interface DashboardTodoItem {
  id: string;
  label: string;
  /** Optional task window start. */
  startAtMs?: number;
  /** Deadline (end) — drives “days left” / overdue. */
  dueAtMs: number;
  done?: boolean;
  /** Optional single attachment (same Storage metadata shape as research). */
  attachment?: DashboardResearchAttachment;
}

export interface SavedProject {
  id: string;
  name: string;
  folder?: string; // New: Category/Folder for organization
  createdAt: any; // Firebase Timestamp
  data: {
    config: AppConfig;
    rates: RateMap;
    products: Product[];
    logistics: Logistics;
    selectedTerms: string[];
    notes: string;
    visibleScenarioTerms: string[];
    invoiceTerms: string[];
    // New Invoice Specific Fields
    customerName?: string;
    customerAddress?: string;
    invoiceRef?: string;
    billedFrom?: string; // Company Name
    billedFromDetails?: string; // Address/Country
    /** Logo image (data URL or cloud URL after save) — shown on proforma header */
    invoiceLogo?: string;
    invoiceSellerEmail?: string;
    invoiceSellerPhone?: string;
    invoiceSellerWebsite?: string;
    /** VAT / tax / company registration ID */
    invoiceSellerTaxId?: string;
    paymentTerms?: string;
    showImages?: boolean; // Preference to show images on invoice
    showPackInfo?: boolean; // New: Preference to show pack info in dashboard
    invoiceBasis?: 'unit' | 'pack' | 'both'; // New: Choice for invoice columns
    invoiceTitle?: string; // e.g. "Proforma Invoice" or "Tax Invoice"
    bankDetails?: string; // Editable bank details block
    // Catalog Settings
    catalogConfig?: CatalogConfig;
    /** Packing list document settings (legacy key `priceListConfig` may exist on old saves). */
    packingListConfig?: PackingListConfig;
    // Suppliers Data
    suppliers?: Supplier[];
    // Saved buyers / customers (repeat clients)
    buyers?: Buyer[];
    isInvoiceEditable?: boolean;
    invoiceOverrides?: Record<number, InvoiceLineOverride>;
    /** Whole-invoice discount (after line discounts). */
    invoiceGlobalDiscountMode?: 'none' | 'percent' | 'amount';
    invoiceGlobalDiscountValue?: number;
    /** Flat line/global discounts apply to this Incoterm column. */
    invoiceDiscountBaseTerm?: string;
    invoiceVatEnabled?: boolean;
    invoiceVatPercent?: number;
    invoiceVatMode?: 'exclusive' | 'inclusive';
    /** Optional fixed costs (shipping, insurance, …) added after VAT in invoice currency. */
    invoiceExtraCharges?: InvoiceExtraCharge[];
    /** Page orientation for the printed proforma invoice. */
    invoiceOrientation?: 'portrait' | 'landscape';
    /** Proforma document layout: default app layout vs. customs-style trade table (`welte` key). */
    invoiceLayout?: 'standard' | 'welte';
    /** Trade / logistics + label overrides when `invoiceLayout` is `welte` (Customs style). */
    invoiceWelteTrade?: InvoiceWelteTradeBlock;
    containerCapacity?: number;
    containerType?: string;
    /** Issue date on proforma + archive (ms epoch). */
    invoiceIssueDateMs?: number;
    /** Optional due / validity date (ms epoch). */
    invoiceDueDateMs?: number;
    /** When set, editor can overwrite this `invoiceArchive` document. */
    editingArchiveInvoiceId?: string | null;
    /** Dashboard: linear research / report lines with optional files (Storage URLs). */
    researchEntries?: DashboardResearchEntry[];
    /** Dashboard: compact linear todo list (tasks with dates + optional file). */
    dashboardTodos?: DashboardTodoItem[];
    /** Proforma sub-mode: goods (default) vs service invoice editor. */
    invoiceDocKind?: 'products' | 'services';
    serviceInvoiceLines?: ServiceInvoiceLine[];
    /** Fixed invoice discount for service proforma applies in this currency. */
    serviceInvoiceDiscountCurrency?: string;
    savedServices?: SavedService[];
    invoiceAccentColor?: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerCompany?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export type FormFieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select'
  | 'multiselect' | 'checkbox' | 'rating'
  | 'image_upload' | 'video_upload' | 'file_upload'
  | 'display_image' | 'section_title';

export interface FormField {
  id: string;
  type: FormFieldType;
  /** Primary label (LTR / English). If `labelRtl` is set, shown as the left column; else used alone. */
  label: string;
  /** RTL column (Persian, Arabic, …) when paired with `label` or `labelLtr`. */
  labelRtl?: string;
  /** Optional explicit LTR title; defaults to `label` when bilingual. */
  labelLtr?: string;
  placeholder?: string;
  /** Bilingual helper lines (e.g. under section titles or inside upload zones). */
  placeholderLtr?: string;
  placeholderRtl?: string;
  /** Short “click to upload” line inside file fields (LTR). */
  uploadHintLtr?: string;
  /** Short “click to upload” line inside file fields (RTL). */
  uploadHintRtl?: string;
  required?: boolean;
  options?: string[];      // select / multiselect choices
  accept?: string;         // file input accept attr, e.g. "image/*" or ".pdf,.docx"
  maxSizeMb?: number;      // max upload size in MB (per file)
  /** image_upload only: max number of images (default 5). */
  maxFiles?: number;
  imageUrl?: string;       // for display_image type
  maxRating?: number;      // for rating type (default 5)
}

/** Saved letterhead (logo, company, colors) for reuse when building new forms — stored locally in the browser. */
export interface FormHeaderPreset {
  id: string;
  name: string;
  companyName?: string;
  logoUrl?: string;
  headerSubtitle?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  createdAt: number;
}

export type FormAccessLevel = 'public' | 'internal';

/** One step in the compact process guide (flowchart) below the form header. */
export interface FormWorkflowStep {
  label: string;
  labelRtl?: string;
}

export interface CustomFormDef {
  id: string;
  name: string;
  /** Optional reference shown on the published A4 form (e.g. RFQ-2026-014). */
  formNumber?: string;
  /** public = anyone with link (embeddable). internal = must sign in to Firebase first. */
  accessLevel?: FormAccessLevel;
  description?: string;
  logoUrl?: string;
  companyName?: string;
  headerSubtitle?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  /** Compact step guide below header on the public form (reassures customers). */
  showWorkflowGuide?: boolean;
  workflowGuideTitle?: string;
  workflowGuideTitleRtl?: string;
  workflowSteps?: FormWorkflowStep[];
  fields: FormField[];
  createdAt: number;
  updatedAt: number;
  publishedKey?: string;
  isPublished: boolean;
}

export interface FormSubmission {
  id: string;
  formKey: string;
  formName: string;
  /** Copied from the form definition when submitted (if set). */
  formNumber?: string;
  submittedAt: number;
  data: Record<string, string | number | boolean | string[]>;
  isRead: boolean;
}

// ---- CONTRACTS ----

export interface ContractClause {
  id: string;
  /** e.g. "RECITALS", "1", "1.1", "ARTICLE 2" */
  articleNum: string;
  titleEn: string;
  titleRtl: string;
  contentEn: string;
  contentRtl: string;
}

export interface ContractParty {
  id: string;
  labelEn: string;
  labelRtl: string;
  companyEn: string;
  companyRtl: string;
  regNo: string;
  country: string;
  repNameEn: string;
  repNameRtl: string;
  repTitleEn: string;
  repTitleRtl: string;
  aliasEn: string;
  aliasRtl: string;
}

export interface ContractScheduleRow {
  id: string;
  tierEn: string;
  tierRtl: string;
  buildFee: string;
  annualFee: string;
  interpretation: string;
  selected: boolean;
}

export interface ContractAddOn {
  id: string;
  nameEn: string;
  nameRtl: string;
  descEn: string;
  descRtl: string;
  price: string;
  selected: boolean;
}

export type ContractStatus = 'draft' | 'final' | 'signed';
export type ContractRtlLang = 'fa' | 'ar';

export interface ContractDef {
  id: string;
  refNo: string;
  titleEn: string;
  titleRtl: string;
  subtitleEn: string;
  subtitleRtl: string;
  effectiveDate: string;
  logoUrl?: string;
  companyName?: string;
  /** Optional full-page A4 letterhead image behind contract pages (print / preview). */
  letterheadEnabled?: boolean;
  letterheadUrl?: string;
  /** Watermark strength: image opacity % (3–45). Lower = more transparent background. */
  letterheadOpacity?: number;
  /** Text inset from page edges (mm) when letterhead is on — sides and bottom. */
  letterheadContentMarginMm?: number;
  /** Extra top inset (mm) below letterhead header area. */
  letterheadContentMarginTopExtraMm?: number;
  parties: ContractParty[];
  clauses: ContractClause[];
  scheduleRows: ContractScheduleRow[];
  addOns: ContractAddOn[];
  rtlLanguage: ContractRtlLang;
  status: ContractStatus;
  createdAt: number;
  updatedAt: number;
}
