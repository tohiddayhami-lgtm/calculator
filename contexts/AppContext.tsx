/**
 * AppContext — مرکز مدیریت state برنامه
 *
 * این context تمام state و handler هایی که render functions به آن‌ها
 * نیاز دارند را در اختیار page components قرار می‌دهد.
 * بدین ترتیب page components می‌توانند به عنوان React.lazy modules
 * بارگذاری شوند (code splitting) بدون اینکه prop drilling رخ دهد.
 *
 * نحوه استفاده:
 *   1. AppInner همچنان state را نگه می‌دارد اما مقدار context
 *      را می‌سازد و از طریق <AppContext.Provider> ارائه می‌دهد.
 *   2. هر page component از useAppContext() استفاده می‌کند.
 */

import React, { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type {
  Product, Logistics, LogisticsPreset, InvoiceTextPreset,
  InvoiceAnnex, InvoiceAnnexPreset, AppConfig, RateMap,
  SavedProject, CatalogConfig, PackingListConfig,
  Supplier, Buyer, SellerProfile, ArchivedInvoice,
  ArchivedInvoiceStatus, InvoicePayment, InvoiceExtraCharge,
  DashboardResearchEntry, DashboardTodoItem,
  InvoiceWelteTradeBlock, InvoiceLineOverride,
  CustomFormDef, FormSubmission, IsoDocumentDef, IsoExecutionRecord,
  ServiceInvoiceLine, SavedService,
  ContractDef, ProposalDef, EducationCourse,
  AppPermissionKey, ManagedUserProfile,
  WarehouseLocation, WarehouseMovement, WarehouseProductSettings,
} from '../types';
import type { InvoiceDocKind } from '../serviceInvoiceUi';
import type { InvoiceNumberingSettings } from '../invoiceNumbering';
import type { ServiceInvoiceDecimalPlaces } from '../serviceInvoice';
import type { InvoiceVatMode } from '../invoiceAdjustments';

// ─── Derived / local types ────────────────────────────────────────────────────

export type AppView =
  | 'dashboard' | 'invoice' | 'forms' | 'catalog'
  | 'suppliers' | 'buyers' | 'community' | 'admin';

export type ScenarioTerm = 'EXW' | 'FCA' | 'FOB' | 'CIF' | 'DDP';

export type InvoiceLayout = 'standard' | 'welte';
export type InvoiceOrientation = 'portrait' | 'landscape';
export type InvoiceGlobalDiscountMode = 'none' | 'percent' | 'fixed';

export type ProductTableColumnKey =
  | 'status' | 'group' | 'supplier' | 'item' | 'sku' | 'hsCode' | 'image'
  | 'qty' | 'itemsPerPack' | 'totalPacks' | 'packPrice' | 'costInput'
  | 'unitCost' | 'totalCost' | 'actions';

export type ProductTableColumnSettings = {
  order: ProductTableColumnKey[];
  hidden: ProductTableColumnKey[];
  labels: Partial<Record<ProductTableColumnKey, string>>;
};

export type ManagedUserDraft = {
  email: string;
  password: string;
  displayName: string;
  subscriptionDays: number;
  permissions: Record<AppPermissionKey, boolean>;
};

// ─── Calculation result types (returned by calculations useMemo) ──────────────

export type ProcessedProduct = Product & {
  isActive: boolean;
  unitCostOutput: number;
  lineCost: number;
  unitProfit: number;
  totalProfit: number;
  unitSellPrice: number;
  totalSellPrice: number;
  totalPacks: number;
  packPrice: number;
  scenarioPrices: Record<ScenarioTerm, number>;
  scenarioPackPrices: Record<ScenarioTerm, number>;
  manualSellPriceOutput: number | undefined;
  packagingMode: 'standard' | 'luxury';
  unitCostBeforePackagingOutput: number;
  packagingUnitExtraOutput: number | undefined;
};

export type BreakdownItem = {
  term: string;
  totalCost: number;
  totalSell: number;
  totalProfit: number;
  profitMargin: number;
  markupPercent: number;
  unitSell: number;
  unitCost: number;
  unitProfit: number;
  valueAdd: number;
};

export type Calculations = {
  processedProducts: ProcessedProduct[];
  breakdown: BreakdownItem[];
  costs: {
    exw: number;
    fob_inc: number;
    cif_inc: number;
    ddp_inc: number;
  };
  totalLogisticsCost: number;
  totalExwCost: number;
  productScenarioBreakdown: any[];
  paginatedGroups?: any;
  [key: string]: any;
};

// ─── Full context type ────────────────────────────────────────────────────────

export type AppContextValue = {
  // Firebase instances
  db: any;
  storage: any;
  auth: any;

  // Auth
  user: User | null;
  authLoading: boolean;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  authError: string; setAuthError: (v: string) => void;
  isDemoMode: boolean; setIsDemoMode: (v: boolean) => void;
  currentUserProfile: ManagedUserProfile | null;
  managedUsers: ManagedUserProfile[];
  managedUserDrafts: Record<string, ManagedUserDraft>;
  setManagedUserDrafts: React.Dispatch<React.SetStateAction<Record<string, ManagedUserDraft>>>;
  managedUsersLoading: boolean;
  managedAuthSyncing: boolean;
  managedAuthSyncedOnce: boolean;
  adminWorkspaceUid: string; setAdminWorkspaceUid: (v: string) => void;
  lastCreatedCredentials: { email: string; password: string } | null;
  isCreatingUser: boolean;
  masterActionMessage: string; setMasterActionMessage: (v: string) => void;
  dataAppId: string;
  isMasterUser: boolean;
  activeOwnerUid: string;
  activeOwnerProfile: ManagedUserProfile | null;
  currentPermissions: Record<AppPermissionKey, boolean>;
  currentUserAccessBlocked: boolean;
  canUseWarehouse: boolean;
  canUseIso: boolean;
  canAccessView: (v: AppView) => boolean;
  visibleNavItems: { id: AppView; label: string; shortLabel?: string; icon: any; masterOnly?: boolean }[];
  newUserEmail: string; setNewUserEmail: (v: string) => void;
  newUserPassword: string; setNewUserPassword: (v: string) => void;
  newUserDisplayName: string; setNewUserDisplayName: (v: string) => void;
  newUserSubscriptionDays: number; setNewUserSubscriptionDays: (v: number) => void;
  newUserPermissions: Record<AppPermissionKey, boolean>;
  setNewUserPermissions: React.Dispatch<React.SetStateAction<Record<AppPermissionKey, boolean>>>;

  // Auth handlers
  handleEmailAuth: () => void;
  handleLogout: () => void;

  // View / Navigation
  view: AppView; setView: (v: AppView) => void;
  dashboardSubView: 'workspace' | 'warehouse'; setDashboardSubView: (v: 'workspace' | 'warehouse') => void;
  showRateSettings: boolean; setShowRateSettings: (v: boolean) => void;

  // Project / Save / Load
  projectName: string; setProjectName: (v: string) => void;
  folderName: string; setFolderName: (v: string) => void;
  loadedProjectId: string | null;
  savedProjects: SavedProject[];
  isSaving: boolean;
  isDeleting: boolean;
  uploadProgress: { current: number; total: number } | null;
  cloudLoadError: string;
  showSaveModal: boolean; setShowSaveModal: (v: boolean) => void;
  showLoadModal: boolean; setShowLoadModal: (v: boolean) => void;
  showImportProductsModal: boolean; setShowImportProductsModal: (v: boolean) => void;
  importCandidateProject: SavedProject | null;
  setImportCandidateProject: React.Dispatch<React.SetStateAction<SavedProject | null>>;
  importSelectedProductIds: number[];
  setImportSelectedProductIds: React.Dispatch<React.SetStateAction<number[]>>;
  deleteConfirmId: string | null; setDeleteConfirmId: (v: string | null) => void;
  handleSaveProject: () => Promise<void>;
  handleStartNewProject: () => void;

  // Core Data
  products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  logistics: Logistics; setLogistics: React.Dispatch<React.SetStateAction<Logistics>>;
  rates: RateMap; setRates: React.Dispatch<React.SetStateAction<RateMap>>;
  config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  suppliers: Supplier[]; setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  buyers: Buyer[]; setBuyers: React.Dispatch<React.SetStateAction<Buyer[]>>;
  buyersReady: boolean;
  selectedBuyerId: number | ''; setSelectedBuyerId: React.Dispatch<React.SetStateAction<number | ''>>;

  // Calculations (memoized in AppInner)
  calculations: Calculations;

  // Currency helpers (depend on rates/config, defined in AppInner)
  toBase: (amount: number, currency: string) => number;
  toOutput: (amountInIRR: number) => number;
  convert: (amount: number, curr: string) => number;

  // Logistics presets
  logisticsPresets: LogisticsPreset[];
  setLogisticsPresets: React.Dispatch<React.SetStateAction<LogisticsPreset[]>>;
  logisticsPresetPickerKey: number;

  // Dashboard / Tasks
  dashboardTodos: DashboardTodoItem[];
  setDashboardTodos: React.Dispatch<React.SetStateAction<DashboardTodoItem[]>>;
  dashboardTodoDraft: { label: string; start: string; due: string };
  setDashboardTodoDraft: React.Dispatch<React.SetStateAction<{ label: string; start: string; due: string }>>;
  dashboardTodoUploadingId: string | null;
  expandedTodoId: string | null; setExpandedTodoId: (v: string | null) => void;
  addDashboardTodo: () => void;
  updateDashboardTodo: (id: string, patch: Partial<DashboardTodoItem>) => void;
  deleteDashboardTodo: (id: string) => void;
  researchEntries: DashboardResearchEntry[];
  setResearchEntries: React.Dispatch<React.SetStateAction<DashboardResearchEntry[]>>;
  researchUploadingKey: string | null;
  canCloudResearchUpload: boolean;

  // Document settings
  selectedTerms: string[]; setSelectedTerms: React.Dispatch<React.SetStateAction<string[]>>;
  visibleScenarioTerms: string[]; setVisibleScenarioTerms: React.Dispatch<React.SetStateAction<string[]>>;
  bulkExportProfitTerms: ScenarioTerm[];
  setBulkExportProfitTerms: React.Dispatch<React.SetStateAction<ScenarioTerm[]>>;
  bulkExportProfitMode: 'percent' | 'fixed';
  setBulkExportProfitMode: React.Dispatch<React.SetStateAction<'percent' | 'fixed'>>;
  bulkExportProfitPercent: number | undefined;
  setBulkExportProfitPercent: React.Dispatch<React.SetStateAction<number | undefined>>;
  bulkExportProfitType: 'markup' | 'margin';
  setBulkExportProfitType: React.Dispatch<React.SetStateAction<'markup' | 'margin'>>;
  bulkExportFixedProfit: number | undefined;
  setBulkExportFixedProfit: React.Dispatch<React.SetStateAction<number | undefined>>;
  bulkExportFixedCurrency: string; setBulkExportFixedCurrency: (v: string) => void;
  invoiceTerms: string[]; setInvoiceTerms: React.Dispatch<React.SetStateAction<string[]>>;
  showImages: boolean; setShowImages: (v: boolean) => void;
  showPackInfo: boolean; setShowPackInfo: (v: boolean) => void;
  showProductColumnSettings: boolean; setShowProductColumnSettings: (v: boolean) => void;
  productColumnSettings: ProductTableColumnSettings;
  setProductColumnSettings: React.Dispatch<React.SetStateAction<ProductTableColumnSettings>>;
  basis: 'unit' | 'pack' | 'both'; setBasis: (v: 'unit' | 'pack' | 'both') => void;
  notes: string; setNotes: (v: string) => void;
  containerCapacity: number; setContainerCapacity: (v: number) => void;
  containerType: '20ft' | '40ft'; setContainerType: (v: '20ft' | '40ft') => void;
  loadUnitType: 'container' | 'pallet'; setLoadUnitType: (v: 'container' | 'pallet') => void;
  palletTypeLabel: string; setPalletTypeLabel: (v: string) => void;
  profitLossReportTerm: '' | ScenarioTerm; setProfitLossReportTerm: (v: '' | ScenarioTerm) => void;
  buyerProfitPercent: number; setBuyerProfitPercent: (v: number) => void;
  buyerProfitType: 'markup' | 'margin'; setBuyerProfitType: (v: 'markup' | 'margin') => void;
  buyerManualResaleValue: number | undefined; setBuyerManualResaleValue: (v: number | undefined) => void;
  buyerManualResaleCurrency: string; setBuyerManualResaleCurrency: (v: string) => void;

  // Invoice
  invoiceDocKind: InvoiceDocKind; setInvoiceDocKind: (v: InvoiceDocKind) => void;
  handleInvoiceDocKindChange: (v: InvoiceDocKind) => void;
  invoiceBasis: 'unit' | 'pack' | 'both'; setInvoiceBasis: (v: 'unit' | 'pack' | 'both') => void;
  customerName: string; setCustomerName: (v: string) => void;
  customerFirstName: string; setCustomerFirstName: (v: string) => void;
  customerLastName: string; setCustomerLastName: (v: string) => void;
  customerCompany: string; setCustomerCompany: (v: string) => void;
  customerEmail: string; setCustomerEmail: (v: string) => void;
  customerPhone: string; setCustomerPhone: (v: string) => void;
  customerAddress: string; setCustomerAddress: (v: string) => void;
  invoiceAccentColor: string; setInvoiceAccentColor: (v: string) => void;
  billedFrom: string; setBilledFrom: (v: string) => void;
  billedFromDetails: string; setBilledFromDetails: (v: string) => void;
  invoiceLogo: string; setInvoiceLogo: (v: string) => void;
  invoiceSellerEmail: string; setInvoiceSellerEmail: (v: string) => void;
  invoiceSellerPhone: string; setInvoiceSellerPhone: (v: string) => void;
  invoiceSellerWebsite: string; setInvoiceSellerWebsite: (v: string) => void;
  invoiceSellerTaxId: string; setInvoiceSellerTaxId: (v: string) => void;
  paymentTerms: string; setPaymentTerms: (v: string) => void;
  invoiceRef: string; setInvoiceRef: React.Dispatch<React.SetStateAction<string>>;
  invoiceNumbering: InvoiceNumberingSettings; setInvoiceNumbering: React.Dispatch<React.SetStateAction<InvoiceNumberingSettings>>;
  invoiceAnnexesEnabled: boolean; setInvoiceAnnexesEnabled: (v: boolean) => void;
  invoiceAnnexes: InvoiceAnnex[]; setInvoiceAnnexes: React.Dispatch<React.SetStateAction<InvoiceAnnex[]>>;
  invoiceAnnexPresets: InvoiceAnnexPreset[];
  invoiceTitle: string; setInvoiceTitle: (v: string) => void;
  invoiceIssueDateMs: number; setInvoiceIssueDateMs: React.Dispatch<React.SetStateAction<number>>;
  invoiceDueDateMs: number | undefined; setInvoiceDueDateMs: React.Dispatch<React.SetStateAction<number | undefined>>;
  editingArchiveInvoiceId: string | null; setEditingArchiveInvoiceId: (v: string | null) => void;
  isInvoiceEditable: boolean; setIsInvoiceEditable: (v: boolean) => void;
  invoiceOverrides: Record<number, InvoiceLineOverride>;
  setInvoiceOverrides: React.Dispatch<React.SetStateAction<Record<number, InvoiceLineOverride>>>;
  invoiceIncludedIds: number[] | null;
  setInvoiceIncludedIds: React.Dispatch<React.SetStateAction<number[] | null>>;
  invoiceGlobalDiscountMode: InvoiceGlobalDiscountMode;
  setInvoiceGlobalDiscountMode: React.Dispatch<React.SetStateAction<InvoiceGlobalDiscountMode>>;
  invoiceGlobalDiscountValue: number; setInvoiceGlobalDiscountValue: (v: number) => void;
  invoiceDiscountBaseTerm: string; setInvoiceDiscountBaseTerm: (v: string) => void;
  invoiceVatEnabled: boolean; setInvoiceVatEnabled: (v: boolean) => void;
  invoiceVatPercent: number; setInvoiceVatPercent: (v: number) => void;
  invoiceVatMode: InvoiceVatMode; setInvoiceVatMode: React.Dispatch<React.SetStateAction<InvoiceVatMode>>;
  invoiceExtraCharges: InvoiceExtraCharge[];
  setInvoiceExtraCharges: React.Dispatch<React.SetStateAction<InvoiceExtraCharge[]>>;
  invoiceOrientation: InvoiceOrientation; setInvoiceOrientation: (v: InvoiceOrientation) => void;
  invoiceLayout: InvoiceLayout; setInvoiceLayout: (v: InvoiceLayout) => void;
  invoiceWelteTrade: InvoiceWelteTradeBlock;
  setInvoiceWelteTrade: React.Dispatch<React.SetStateAction<InvoiceWelteTradeBlock>>;

  // Invoice text presets
  invoiceTextPresets: InvoiceTextPreset[];
  setInvoiceTextPresets: React.Dispatch<React.SetStateAction<InvoiceTextPreset[]>>;
  invoiceTextPresetPickerKey: number;
  applyInvoiceTextPresetById: (id: string) => void;
  saveInvoiceTextPresetOfKind: (kind: any) => void;
  deleteInvoiceTextPresetById: (id: string) => void;

  // Invoice archive
  archivedInvoices: ArchivedInvoice[];
  showArchiveModal: boolean; setShowArchiveModal: (v: boolean) => void;
  selectedArchiveId: string | null; setSelectedArchiveId: (v: string | null) => void;
  archiveStatusFilter: 'all' | ArchivedInvoiceStatus; setArchiveStatusFilter: React.Dispatch<React.SetStateAction<'all' | ArchivedInvoiceStatus>>;
  archiveKindFilter: 'all' | 'products' | 'services'; setArchiveKindFilter: React.Dispatch<React.SetStateAction<'all' | 'products' | 'services'>>;
  archiveSearch: string; setArchiveSearch: (v: string) => void;
  paymentDraft: InvoicePayment & { method: string; notes: string };
  setPaymentDraft: React.Dispatch<React.SetStateAction<any>>;
  showPaymentForm: boolean; setShowPaymentForm: (v: boolean) => void;
  handleUpdateArchiveStatus: (id: string, status: ArchivedInvoiceStatus) => void;
  handleDeleteArchivedInvoice: (id: string) => void;
  recallArchivedInvoiceForEditing: (inv: ArchivedInvoice) => void;
  handleArchiveCurrentInvoice: () => void;

  // Service invoice
  serviceInvoiceLines: ServiceInvoiceLine[];
  setServiceInvoiceLines: React.Dispatch<React.SetStateAction<ServiceInvoiceLine[]>>;
  serviceInvoiceDiscountCurrency: string; setServiceInvoiceDiscountCurrency: (v: string) => void;
  serviceInvoiceDecimalPlaces: ServiceInvoiceDecimalPlaces;
  setServiceInvoiceDecimalPlaces: React.Dispatch<React.SetStateAction<ServiceInvoiceDecimalPlaces>>;
  savedServices: SavedService[]; setSavedServices: React.Dispatch<React.SetStateAction<SavedService[]>>;
  savedServicesReady: boolean;

  // Seller profiles
  sellerProfiles: SellerProfile[]; setSellerProfiles: React.Dispatch<React.SetStateAction<SellerProfile[]>>;
  showSellerProfilesModal: boolean; setShowSellerProfilesModal: (v: boolean) => void;
  editingSellerProfile: SellerProfile | null; setEditingSellerProfile: (v: SellerProfile | null) => void;
  bankDetails: string; setBankDetails: (v: string) => void;

  // Catalog
  catalogConfig: CatalogConfig; setCatalogConfig: React.Dispatch<React.SetStateAction<CatalogConfig>>;
  editingCatalogDetailsId: number | null; setEditingCatalogDetailsId: (v: number | null) => void;
  editingSection: any; setEditingSection: (v: any) => void;
  qrDataUrl: string; setQrDataUrl: (v: string) => void;
  shareLinkInfo: any; setShareLinkInfo: (v: any) => void;
  savedCatalogLinks: any[]; setSavedCatalogLinks: React.Dispatch<React.SetStateAction<any[]>>;

  // Packing list
  packingListConfig: PackingListConfig; setPackingListConfig: React.Dispatch<React.SetStateAction<PackingListConfig>>;

  // Warehouse
  warehouseLocations: WarehouseLocation[]; setWarehouseLocations: React.Dispatch<React.SetStateAction<WarehouseLocation[]>>;
  warehouseMovements: WarehouseMovement[]; setWarehouseMovements: React.Dispatch<React.SetStateAction<WarehouseMovement[]>>;
  warehouseProductSettings: WarehouseProductSettings[];
  setWarehouseProductSettings: React.Dispatch<React.SetStateAction<WarehouseProductSettings[]>>;

  // Forms
  customForms: CustomFormDef[]; setCustomForms: React.Dispatch<React.SetStateAction<CustomFormDef[]>>;
  formSubmissions: FormSubmission[]; setFormSubmissions: React.Dispatch<React.SetStateAction<FormSubmission[]>>;
  isoDocuments: IsoDocumentDef[]; setIsoDocuments: React.Dispatch<React.SetStateAction<IsoDocumentDef[]>>;
  isoRecords: IsoExecutionRecord[]; setIsoRecords: React.Dispatch<React.SetStateAction<IsoExecutionRecord[]>>;
  formsSubView: string; setFormsSubView: React.Dispatch<React.SetStateAction<any>>;
  formArchiveOpenId: string | null; setFormArchiveOpenId: (v: string | null) => void;
  showFormBuilder: boolean; setShowFormBuilder: (v: boolean) => void;
  isoDraft: IsoDocumentDef | null; setIsoDraft: React.Dispatch<React.SetStateAction<IsoDocumentDef | null>>;
  isoSaving: boolean;
  isoPublishing: string | null;
  editingForm: CustomFormDef | null; setEditingForm: (v: CustomFormDef | null) => void;
  showFormSubmissions: boolean; setShowFormSubmissions: (v: boolean) => void;
  selectedFormSubmission: FormSubmission | null; setSelectedFormSubmission: (v: FormSubmission | null) => void;
  formBuilderDraft: CustomFormDef | null; setFormBuilderDraft: React.Dispatch<React.SetStateAction<CustomFormDef | null>>;
  formBuilderSaving: boolean;
  formPublishing: string | null;
  formHeaderPresets: any[]; setFormHeaderPresets: React.Dispatch<React.SetStateAction<any[]>>;
  selectedHeaderPresetId: string; setSelectedHeaderPresetId: (v: string) => void;
  headerPresetSaveName: string; setHeaderPresetSaveName: (v: string) => void;
  handleDeleteFormSubmission: (id: string) => void;

  // Contracts
  contracts: ContractDef[]; setContracts: React.Dispatch<React.SetStateAction<ContractDef[]>>;
  contractsSubView: 'list' | 'editor' | 'preview'; setContractsSubView: React.Dispatch<React.SetStateAction<'list' | 'editor' | 'preview'>>;
  editingContract: ContractDef | null; setEditingContract: React.Dispatch<React.SetStateAction<ContractDef | null>>;
  contractEditorTab: string; setContractEditorTab: React.Dispatch<React.SetStateAction<any>>;

  // Proposals
  proposals: ProposalDef[]; setProposals: React.Dispatch<React.SetStateAction<ProposalDef[]>>;
  proposalsSubView: 'list' | 'editor' | 'preview'; setProposalsSubView: React.Dispatch<React.SetStateAction<'list' | 'editor' | 'preview'>>;
  editingProposal: ProposalDef | null; setEditingProposal: React.Dispatch<React.SetStateAction<ProposalDef | null>>;
  proposalEditorTab: string; setProposalEditorTab: React.Dispatch<React.SetStateAction<any>>;

  // Education
  educationCourses: EducationCourse[]; setEducationCourses: React.Dispatch<React.SetStateAction<EducationCourse[]>>;

  // Community
  communityPosts: any[]; setCommunityPosts: React.Dispatch<React.SetStateAction<any[]>>;
  communityFilter: string; setCommunityFilter: React.Dispatch<React.SetStateAction<any>>;
  communitySearch: string; setCommunitySearch: (v: string) => void;
  showNewPostModal: boolean; setShowNewPostModal: (v: boolean) => void;
  newPostTitle: string; setNewPostTitle: (v: string) => void;
  newPostBody: string; setNewPostBody: (v: string) => void;
  newPostCategory: string; setNewPostCategory: React.Dispatch<React.SetStateAction<any>>;
  newPostFiles: File[]; setNewPostFiles: React.Dispatch<React.SetStateAction<File[]>>;
  communityUploading: boolean;
  communityError: string;
  expandedPost: string | null; setExpandedPost: (v: string | null) => void;
  editingPost: any; setEditingPost: (v: any) => void;
  editPostTitle: string; setEditPostTitle: (v: string) => void;
  editPostBody: string; setEditPostBody: (v: string) => void;
  editPostCategory: string; setEditPostCategory: React.Dispatch<React.SetStateAction<any>>;
  editPostExistingAttachments: any[];
  setEditPostExistingAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  editPostNewFiles: File[]; setEditPostNewFiles: React.Dispatch<React.SetStateAction<File[]>>;
  editPostUploading: boolean;
  editPostError: string;
  newPostColor: string; setNewPostColor: (v: string) => void;
  editPostColor: string; setEditPostColor: (v: string) => void;
  communityPage: number; setCommunityPage: (v: number) => void;
  handleSaveNewCommunityPost: () => void;
  handleSaveEditCommunityPost: () => void;
  handleDeleteCommunityPost: (id: string) => void;

  // Inquiries
  inquiries: any[]; setInquiries: React.Dispatch<React.SetStateAction<any[]>>;
  showInquiries: boolean; setShowInquiries: (v: boolean) => void;
  selectedInquiry: any; setSelectedInquiry: (v: any) => void;
  inquiriesLoading: boolean;
  inquiryNewCount: number;

  // Shared utility functions (defined in AppInner, provided via context)
  assignFreshInvoiceNumber: (kind?: any) => void;
  compressImage: (base64Str: string, maxWidth?: number, quality?: number) => Promise<string>;
  triggerPrint: () => void;
  formatMoney: (amount: number, currency: string) => string;
  formatNumber: (num: number | string) => string;
  summarizePayments: (inv: ArchivedInvoice) => { paid: number; balance: number };
};

// ─── Context creation ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export default AppContext;

/**
 * مصرف context در page components.
 * اگر خارج از AppContext.Provider استفاده شود خطا می‌دهد.
 */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside <AppContext.Provider>');
  }
  return ctx;
}
