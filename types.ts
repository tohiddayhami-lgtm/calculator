
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
  image?: string; // Base64 data string for product image
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

export interface Logistics {
  inland: LogisticsItem;
  port: LogisticsItem;
  freight: LogisticsItem;
  insurance: LogisticsItem; // Added: Cargo Insurance
  destination: LogisticsItem;
  dutyPercent: number;
  exwExtras: ExtraCost[]; // New field for EXW specific extra costs
  extras: ExtraCost[]; // Existing field for DDP/Global extras
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

  // Back Cover background image + overlay
  backCoverImage?: string;
  backCoverOverlayOpacity?: number; // 0-100

  // QR Code on back cover
  showQrCode?: boolean;
  qrCodeValue?: string;
  qrCodeLabel?: string;
  showCustomization?: boolean;
  customizationText?: string;
  showPartners?: boolean;
  partnerLogos?: string[]; // List of Base64 strings
  showCompanyPhotos?: boolean;
  companyPhotos?: string[]; // List of Base64 strings
  
  // Dynamic Sections
  sections?: CatalogSection[]; // New: Unlimited custom sections
}

// New Interface for Price List Design
export interface PriceListConfig {
  title: string;
  subtitle: string;
  footerText: string;
  showImages: boolean;
  priceBasis: 'unit' | 'pack' | 'both';
  terms: string[];
  showTargetPrice?: boolean; // New: Optional - show buyer Target Price column
  targetPriceLabel?: string; // New: Custom label for Target Price column
  showTargetProfit?: boolean; // New: Optional - show profit % vs Target Price
  targetProfitLabel?: string; // New: Custom label for the profit-from-deal message
}

export interface SupplierAttachment {
  id: string;
  name: string;
  type: string; // MIME Type e.g. 'application/pdf' or 'video/mp4'
  data: string; // Base64 Data URL
  size: number; // in bytes
}

// New Interface for Suppliers
export interface Supplier {
  id: number;
  name: string;
  contactInfo: string;
  address: string;
  notes: string;
  images: string[]; // List of Base64 strings for photos
  attachments?: SupplierAttachment[]; // New: List of PDF/Video files
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
    paymentTerms?: string;
    showImages?: boolean; // Preference to show images on invoice
    showPackInfo?: boolean; // New: Preference to show pack info in dashboard
    invoiceBasis?: 'unit' | 'pack' | 'both'; // New: Choice for invoice columns
    invoiceTitle?: string; // e.g. "Proforma Invoice" or "Tax Invoice"
    bankDetails?: string; // Editable bank details block
    // Catalog Settings
    catalogConfig?: CatalogConfig;
    // Price List Settings
    priceListConfig?: PriceListConfig;
    // Suppliers Data
    suppliers?: Supplier[];
  };
}
