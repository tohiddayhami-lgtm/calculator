
import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';

// Icons
import { 
  Settings, Plus, Trash2, Package, Truck, Anchor, Ship, MapPin, 
  FileText, Globe, PieChart, CheckCircle, Circle, BarChart3, Save, 
  FolderOpen, X, Clock, Loader2, LayoutDashboard, Printer, 
  FileCheck, Image as ImageIcon, Upload, List, Download, FileUp, Folder, 
  LayoutTemplate, Palette, Type, Smartphone, Globe2, Languages, Edit3, 
  Sparkles, Instagram, Linkedin, Facebook, Twitter, Youtube, MessageCircle, 
  Send, Layers, LayoutGrid, CheckSquare, Users, DollarSign, Paperclip, 
  Video, File as FileIcon, Ruler, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, ArrowLeft, Pencil
} from 'lucide-react';

// Types
import { 
  Product, 
  Logistics, 
  AppConfig, 
  RateMap, 
  SavedProject,
  CatalogConfig,
  SocialLink,
  PriceListConfig,
  Supplier,
  SupplierAttachment,
  CatalogSection
} from './types';

// --- GLOBAL DECLARATIONS ---
declare global {
  interface Window {
    __firebase_config: string;
    __app_id: string;
    __initial_auth_token: string;
  }
}

// --- FIREBASE INITIALIZATION ---
let app: any;
let auth: any;
let db: any;
let appId = 'export-pro-default';
let firebaseConfig: any = {};

try {
  const configStr = window.__firebase_config;
  if (configStr) {
    firebaseConfig = JSON.parse(configStr);
    const hasMissingEnv = Object.values(firebaseConfig).some(
      (value) => typeof value === 'string' && value.includes('%VITE_')
    );

    if (!hasMissingEnv) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      if (window.__app_id) {
        appId = window.__app_id;
      }
    } else {
      console.warn('Firebase env vars are missing. Running in local mode.');
    }
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// --- CONSTANTS & CONFIG ---
const DEMO_USER_ID = 'demo-user-123';
const DB_NAME = 'CloudExportProDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY_LEGACY = 'cloud_export_pro_projects';

// --- UTILITY FUNCTIONS ---
const normalizeDigits = (str: string | number): string => {
  if (str === null || str === undefined) return '';
  return str.toString()
    .replace(/[۰٠]/g, '0').replace(/[۱١]/g, '1').replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3').replace(/[۴٤]/g, '4').replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6').replace(/[۷٧]/g, '7').replace(/[۸٨]/g, '8').replace(/[۹٩]/g, '9');
};

const formatNumber = (num: number | string): string => {
  if (num === '' || num === null || isNaN(Number(num)) || num === 0) return '';
  return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseInput = (val: string): number => {
  const clean = normalizeDigits(val).replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const formatMoney = (amount: number, currency: string): string => {
  const decimals = currency === 'OMR' ? 3 : 2;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: currency || 'USD',
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  }).format(amount);
};

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep);
  }

  if (value && typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefinedDeep(val);
      }
    }
    return cleaned;
  }

  return value;
};

const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

// --- INDEXED DB HELPERS ---
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const dbSaveProject = async (project: SavedProject): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const dbGetAllProjects = async (): Promise<SavedProject[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

const dbDeleteProject = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- COMPONENTS ---

// Helper Input Component
const FormattedNumberInput = ({ 
  value, 
  onChange, 
  className, 
  style,
  placeholder,
  disabled
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string; 
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value === 0 ? '' : formatNumber(value));
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    onChange(parseInput(raw));
  };

  const handleBlur = () => {
    setIsEditing(false);
    setLocalValue(value === 0 ? '' : formatNumber(value));
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  
  // -- STATE: VIEW & UI --
  const [view, setView] = useState<'dashboard' | 'invoice' | 'pricelist' | 'catalog' | 'suppliers'>('dashboard');
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // -- STATE: AUTH & PERSISTENCE --
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [masterActionMessage, setMasterActionMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const masterEmail = ((import.meta as any).env?.VITE_MASTER_EMAIL || '').toLowerCase().trim();
  const isMasterUser = !!user?.email && user.email.toLowerCase() === masterEmail;
  
  // -- STATE: MODALS --
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showImportProductsModal, setShowImportProductsModal] = useState(false); 
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingCatalogDetailsId, setEditingCatalogDetailsId] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<CatalogSection | null>(null); 
  
  // -- STATE: PROJECT IMPORT/EXPORT --
  const [importCandidateProject, setImportCandidateProject] = useState<SavedProject | null>(null);
  const [importSelectedProductIds, setImportSelectedProductIds] = useState<number[]>([]);
  const [projectName, setProjectName] = useState('');
  const [folderName, setFolderName] = useState(''); 
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null); 
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  // -- STATE: APP CONFIGURATION --
  const [config, setConfig] = useState<AppConfig>({
    outputCurrency: 'OMR', 
    profitType: 'markup', 
    profitPercent: 20,
    profitFlags: { exw: true, fob: true, cif: true, ddp: true },
    pricingMethod: 'cost_plus',
    termMultipliers: { exw: 20, fob: 20, cif: 20, ddp: 20 },
    enableTermSpecificProfit: false,
    termProfits: { exw: 20, fob: 20, cif: 20, ddp: 20 }
  });

  // -- STATE: DATA (PRODUCTS, RATES, LOGISTICS, SUPPLIERS) --
  const [rates, setRates] = useState<RateMap>({
    IRR: 1, USD: 650000, EUR: 710000, AED: 179000, CNY: 90000, OMR: 1690000
  });

  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: '', qty: 0, unitPrice: 0, currency: 'IRR', itemsPerPack: 0, packPrice: 0, active: true, priceInputMode: 'unit', group: '', measurementUnit: '' }
  ]);

  const [logistics, setLogistics] = useState<Logistics>({
    inland: { val: 0, curr: 'IRR' },
    port: { val: 0, curr: 'IRR' },
    freight: { val: 0, curr: 'USD' },
    insurance: { val: 0, curr: 'USD' },
    destination: { val: 0, curr: 'OMR' },
    dutyPercent: 0,
    exwExtras: [], 
    extras: []     
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // -- STATE: DOCUMENT SETTINGS (INVOICE/CATALOG/PRICELIST) --
  const [selectedTerms, setSelectedTerms] = useState<string[]>(['FOB', 'DDP']); 
  const [visibleScenarioTerms, setVisibleScenarioTerms] = useState<string[]>(['EXW', 'FCA', 'FOB', 'CIF', 'DDP']);
  const [invoiceTerms, setInvoiceTerms] = useState<string[]>(['FOB', 'DDP']);
  const [showImages, setShowImages] = useState(false);
  const [showPackInfo, setShowPackInfo] = useState(true); 
  const [basis, setBasis] = useState<'unit' | 'pack'>('unit'); 
  const [notes, setNotes] = useState('');
  const [containerCapacity, setContainerCapacity] = useState<number>(1000);
  const [containerType, setContainerType] = useState<'20ft' | '40ft'>('20ft');

  // Invoice Specific
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billedFrom, setBilledFrom] = useState('');
  const [billedFromDetails, setBilledFromDetails] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('T/T 50% Advance');
  const [invoiceRef, setInvoiceRef] = useState(String(Math.floor(Math.random() * 10000)));
  const [invoiceTitle, setInvoiceTitle] = useState('Proforma Invoice');
  const [invoiceBasis, setInvoiceBasis] = useState<'unit' | 'pack' | 'both'>('both');
  const [bankDetails, setBankDetails] = useState('Bank Name: Example Bank Ltd\nSWIFT: EXBKUS33\nAccount: 1234567890');
  const [isInvoiceEditable, setIsInvoiceEditable] = useState(false);
  const [invoiceOverrides, setInvoiceOverrides] = useState<Record<number, { qty?: number, unitPrices?: Record<string, number>, packPrices?: Record<string, number> }>>({});
  
  // Price List Config
  const [priceListConfig, setPriceListConfig] = useState<PriceListConfig>({
      title: 'EXPORT PRICE LIST',
      subtitle: `${new Date().getFullYear()} COLLECTION`,
      footerText: 'Prices are subject to change without prior notice.\nPayment Terms: T/T 50% Advance.\nValidity: 30 Days.',
      showImages: false,
      priceBasis: 'unit',
      terms: ['FOB']
  });

  // Catalog Config
  const [catalogConfig, setCatalogConfig] = useState<CatalogConfig>({
      title: 'EXPORT COLLECTION',
      subtitle: 'Premium Quality Products',
      coverImage: '',
      primaryColor: '#0f172a',
      backgroundColor: '#ffffff',
      textColor: '#334155',
      coverColor: '#0f172a',
      layoutMode: 'grid',
      showPrices: true,
      priceBasis: 'both',
      showMOQ: true,
      moqLabel: '',
      showGroupCovers: false,
      priceTerms: ['FOB'],
      contactEmail: 'sales@example.com',
      contactPhone: '+1 234 567 890',
      contactAddress: '',
      socialLinks: [],
      website: 'www.example.com',
      languages: ['en'],
      collectionText: `${new Date().getFullYear()} COLLECTION`,
      footerText: 'EXPORT COLLECTION | All Rights Reserved',
      itemsPerPage: 4,
      includedProductIds: [],
      coverHeaderText: 'EXPORT COLLECTION',
      coverYearText: new Date().getFullYear().toString(),
      showCoverLines: true,
      coverLineColor: '#ffffff',
      showCoverContact: true,
      coverContactTitle: '',
      baseUnit: '',
      coverOverlayOpacity: 60,
      showAboutUs: false,
      aboutUsText: '',
      showCompanyPhotos: false,
      companyPhotos: [],
      sections: []
  });

  // --- EFFECTS ---

  // Auth Initialization
  useEffect(() => {
    const isMockKey = firebaseConfig?.apiKey === 'demo-api-key';
    
    if (!auth) {
        setAuthLoading(false);
        return;
    }

    const initAuth = async () => {
      try {
        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        }
      } catch (err) {
        console.error("Auth failed", err);
      }
    };
    
    if (!isMockKey) {
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsDemoMode(false);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    } else {
        setAuthLoading(false);
    }
  }, []);

  // Project Loading (Cloud vs Local)
  useEffect(() => {
    if (authLoading) return;

    const isRealCloudUser = user && db && !isDemoMode && user.uid !== DEMO_USER_ID;

    if (isRealCloudUser) {
        const projectsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'projects');
        const unsubscribe = onSnapshot(projectsRef, (snapshot: any) => {
            const loadedProjects = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as SavedProject[];
            loadedProjects.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setSavedProjects(loadedProjects);
        });
        return () => unsubscribe();
    } else {
        loadLocalProjects();
    }
  }, [user, authLoading, isDemoMode]);

  const loadLocalProjects = async () => {
      let mergedProjects: SavedProject[] = [];

      // 1. Try Loading from IndexedDB (Preferred)
      try {
          const dbProjects = await dbGetAllProjects();
          if (dbProjects && Array.isArray(dbProjects)) {
              mergedProjects = [...dbProjects];
          }
      } catch (e) {
          console.error("Local DB load error", e);
      }

      // 2. Try Loading from LocalStorage (Fallback / Legacy Migration)
      try {
          const legacyData = localStorage.getItem(LOCAL_STORAGE_KEY_LEGACY);
          if (legacyData) {
              const parsed = JSON.parse(legacyData);
              if (Array.isArray(parsed)) {
                  const existingIds = new Set(mergedProjects.map(p => p.id));
                  for (const proj of parsed) {
                      if (!existingIds.has(proj.id)) {
                          mergedProjects.push(proj);
                          await dbSaveProject(proj);
                      }
                  }
              }
          }
      } catch (e) {
          console.error("LocalStorage load error", e);
      }

      mergedProjects.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSavedProjects(mergedProjects);
  };

  const uniqueFolders = useMemo(() => {
    const folders = new Set(savedProjects.map(p => p.folder).filter(Boolean));
    return Array.from(folders).sort();
  }, [savedProjects]);

  const groupedProjects = useMemo(() => {
    const groups: { [key: string]: SavedProject[] } = {};
    const uncategorized: SavedProject[] = [];

    savedProjects.forEach(p => {
        if (p.folder && p.folder.trim() !== '') {
            if (!groups[p.folder]) groups[p.folder] = [];
            groups[p.folder].push(p);
        } else {
            uncategorized.push(p);
        }
    });

    return { groups, uncategorized };
  }, [savedProjects]);

  // --- AUTH HANDLERS ---
  const handleLogout = async () => {
      setAuthError('');
      if (isDemoMode) {
          setUser(null);
          setIsDemoMode(false);
          loadLocalProjects();
          return;
      }

      if (!auth) return;
      try {
          await signOut(auth);
      } catch (error) {
          console.error("Logout failed", error);
      }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm text-center shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-700">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900">CloudExport Pro</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in with your email and password</p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEmailAuth();
              }}
              placeholder="Password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleEmailAuth}
              disabled={authLoading || !auth}
              className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Sign In
            </button>
          </div>

          {!auth && (
            <p className="text-xs text-amber-700 mt-3">
              Firebase is not configured. Add Firebase env values in `.env.local`.
            </p>
          )}
          {authError && <p className="text-xs text-red-600 mt-3">{authError}</p>}
        </div>
      </div>
    );
  }

  const handleEmailAuth = async () => {
      setAuthError('');
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
          setAuthError('Please enter both email and password.');
          return;
      }

      if (!auth) {
          setAuthError('Firebase is not configured yet. Add env values first.');
          return;
      }

      try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
          setPassword('');
      } catch (error: any) {
          const message = error?.message || 'Authentication failed.';
          setAuthError(message);
      }
  };

  const handleMasterCreateUser = async () => {
      setMasterActionMessage('');
      const emailToCreate = newUserEmail.trim();
      if (!emailToCreate || !newUserPassword) {
          setMasterActionMessage('Enter new user email and password.');
          return;
      }

      if (!firebaseConfig || !firebaseConfig.apiKey || !isMasterUser) {
          setMasterActionMessage('Only master account can create users.');
          return;
      }

      let secondaryApp: any = null;
      try {
          setIsCreatingUser(true);
          secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
          const secondaryAuth = getAuth(secondaryApp);
          await createUserWithEmailAndPassword(secondaryAuth, emailToCreate, newUserPassword);
          await signOut(secondaryAuth);
          setNewUserEmail('');
          setNewUserPassword('');
          setMasterActionMessage('User created successfully.');
      } catch (error: any) {
          setMasterActionMessage(error?.message || 'Failed to create user.');
      } finally {
          if (secondaryApp) {
              try {
                  await deleteApp(secondaryApp);
              } catch (_) {
                  // Ignore cleanup errors.
              }
          }
          setIsCreatingUser(false);
      }
  };

  // --- PROJECT CRUD HANDLERS ---
  const handleSaveProject = async (mode: 'new' | 'update' = 'new') => {
    if (!projectName.trim()) return;
    setIsSaving(true);
    
    const projectDataPayloadRaw = {
        config, rates, products, logistics, selectedTerms, notes, visibleScenarioTerms, invoiceTerms,
        customerName, customerAddress, invoiceRef, billedFrom, billedFromDetails, paymentTerms, showImages, showPackInfo,
        invoiceTitle, bankDetails, catalogConfig, invoiceBasis, priceListConfig, suppliers, isInvoiceEditable, invoiceOverrides,
        containerCapacity, containerType
    };
    const projectDataPayload = stripUndefinedDeep(projectDataPayloadRaw);

    const isRealCloudUser = user && db && !isDemoMode && user.uid !== DEMO_USER_ID;
    const finalFolder = folderName.trim();

    try {
      let savedId = loadedProjectId;

      if (mode === 'update' && loadedProjectId) {
         // Update
         if (isRealCloudUser) {
             await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', loadedProjectId), {
                name: projectName,
                folder: finalFolder,
                data: projectDataPayload
             });
         } else {
             // Local Update
             const updatedProject: SavedProject = {
                 id: loadedProjectId,
                 name: projectName,
                 folder: finalFolder,
                 createdAt: { seconds: Math.floor(Date.now() / 1000) },
                 data: projectDataPayload
             };
             
             const existing = savedProjects.find(p => p.id === loadedProjectId);
             if (existing) updatedProject.createdAt = existing.createdAt;

             await dbSaveProject(updatedProject);
             await loadLocalProjects();
         }
      } else {
         // New
         if (isRealCloudUser) {
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'projects'), {
              name: projectName,
              folder: finalFolder,
              createdAt: serverTimestamp(),
              data: projectDataPayload
            });
            savedId = docRef.id;
         } else {
            // Local New
            const newId = `local_${Date.now()}`;
            savedId = newId;
            const newProject: SavedProject = {
                id: newId,
                name: projectName,
                folder: finalFolder,
                createdAt: { seconds: Math.floor(Date.now() / 1000) },
                data: projectDataPayload
             };
            await dbSaveProject(newProject);
            await loadLocalProjects();
         }
      }
      
      if (savedId) setLoadedProjectId(savedId);
      
      // Backup to LocalStorage
      if (!isRealCloudUser) {
          try {
              const allProjects = await dbGetAllProjects();
              localStorage.setItem(LOCAL_STORAGE_KEY_LEGACY, JSON.stringify(allProjects));
          } catch(e) {
              console.warn("Backup to LocalStorage failed", e);
          }
      }

      setShowSaveModal(false);
    } catch (error: any) { 
        console.error("Save Error:", error);
        
        // Emergency Backup Download
        alert(`Save Failed: ${error.message}\n\nDon't worry! Your data is safe. The project file will now be downloaded to your computer as a backup.`);
        const backupProject: SavedProject = {
            id: `backup_${Date.now()}`,
            name: projectName || 'Untitled Backup',
            folder: finalFolder,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            data: projectDataPayload
        };
        handleExportProject(backupProject, { stopPropagation: () => {} } as any);
        
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleLoadProject = (project: SavedProject) => {
    if (!project.data) return;
    
    setLoadedProjectId(project.id);
    setProjectName(project.name);
    setFolderName(project.folder || '');

    const loadedConfig = project.data.config || config;
    if (!loadedConfig.profitFlags) loadedConfig.profitFlags = { exw: true, fob: true, cif: true, ddp: true };
    if (!loadedConfig.pricingMethod) loadedConfig.pricingMethod = 'cost_plus';
    if (!loadedConfig.termMultipliers) loadedConfig.termMultipliers = { exw: 0, fob: 0, cif: 0, ddp: 0 };
    setConfig(loadedConfig);
    
    setRates(project.data.rates || rates);
    const loadedProducts = (project.data.products || []).map(p => ({ 
        ...p, 
        active: p.active !== undefined ? p.active : true,
        priceInputMode: p.priceInputMode || 'unit',
        catalogName: p.catalogName,
        catalogMOQ: p.catalogMOQ,
        catalogDescription: p.catalogDescription,
        customProfit: p.customProfit,
        group: p.group || '',
        supplierId: p.supplierId,
        measurementUnit: p.measurementUnit
    }));
    setProducts(loadedProducts);
    setLogistics({ 
        ...logistics, 
        ...project.data.logistics, 
        insurance: project.data.logistics.insurance || { val: 0, curr: 'USD' }, 
        extras: project.data.logistics.extras || [],
        exwExtras: project.data.logistics.exwExtras || [], 
        dutyPercent: project.data.logistics.dutyPercent || 0 
    });
    setVisibleScenarioTerms(project.data.visibleScenarioTerms || ['EXW', 'FCA', 'FOB', 'CIF', 'DDP']);
    setInvoiceTerms(project.data.invoiceTerms || ['FOB', 'DDP']);
    setNotes(project.data.notes || '');
    
    setCustomerName(project.data.customerName || '');
    setCustomerAddress(project.data.customerAddress || '');
    setBilledFrom(project.data.billedFrom || '');
    setBilledFromDetails(project.data.billedFromDetails || '');
    setPaymentTerms(project.data.paymentTerms || 'T/T 50% Advance');
    setInvoiceRef(project.data.invoiceRef || String(Math.floor(Math.random() * 10000)));
    setShowImages(project.data.showImages || false);
    setShowPackInfo(project.data.showPackInfo !== undefined ? project.data.showPackInfo : true);
    setInvoiceTitle(project.data.invoiceTitle || 'Proforma Invoice');
    setInvoiceBasis(project.data.invoiceBasis || 'both');
    setBankDetails(project.data.bankDetails || 'Bank Name: Example Bank Ltd\nSWIFT: EXBKUS33\nAccount: 1234567890');
    setIsInvoiceEditable((project.data as any).isInvoiceEditable || false);
    setInvoiceOverrides((project.data as any).invoiceOverrides || {});
    if ((project.data as any).containerCapacity) setContainerCapacity((project.data as any).containerCapacity);
    if ((project.data as any).containerType) setContainerType((project.data as any).containerType);

    setSuppliers(project.data.suppliers || []);

    if (project.data.priceListConfig) {
        setPriceListConfig(project.data.priceListConfig);
    } else {
        setPriceListConfig({
             title: 'EXPORT PRICE LIST',
             subtitle: `${new Date().getFullYear()} COLLECTION`,
             footerText: 'Prices are subject to change without prior notice.\nPayment Terms: T/T 50% Advance.\nValidity: 30 Days.',
             showImages: false,
             priceBasis: 'unit',
             terms: ['FOB']
        });
    }

    if (project.data.catalogConfig) {
        const loadedLang = project.data.catalogConfig.languages || 
                          (project.data.catalogConfig['language'] ? [project.data.catalogConfig['language']] : ['en']);
        const loadedConfigAny = project.data.catalogConfig as any;
        const loadedPriceTerms = loadedConfigAny.priceTerms || (loadedConfigAny.priceTerm ? [loadedConfigAny.priceTerm] : ['FOB']);

        setCatalogConfig({ 
            ...project.data.catalogConfig, 
            languages: loadedLang, 
            priceTerms: loadedPriceTerms,
            collectionText: project.data.catalogConfig.collectionText || `${new Date().getFullYear()} COLLECTION`,
            footerText: project.data.catalogConfig.footerText || 'EXPORT COLLECTION | All Rights Reserved',
            contactAddress: project.data.catalogConfig.contactAddress || '',
            socialLinks: project.data.catalogConfig.socialLinks || [],
            showGroupCovers: project.data.catalogConfig.showGroupCovers || false,
            itemsPerPage: project.data.catalogConfig.itemsPerPage || 4,
            includedProductIds: project.data.catalogConfig.includedProductIds || [],
            priceBasis: project.data.catalogConfig.priceBasis || 'both',
            coverColor: project.data.catalogConfig.coverColor || '#0f172a',
            coverHeaderText: project.data.catalogConfig.coverHeaderText !== undefined ? project.data.catalogConfig.coverHeaderText : 'EXPORT COLLECTION',
            coverYearText: project.data.catalogConfig.coverYearText !== undefined ? project.data.catalogConfig.coverYearText : new Date().getFullYear().toString(),
            showCoverLines: project.data.catalogConfig.showCoverLines !== undefined ? project.data.catalogConfig.showCoverLines : true,
            coverLineColor: project.data.catalogConfig.coverLineColor || '#ffffff',
            showCoverContact: project.data.catalogConfig.showCoverContact !== undefined ? project.data.catalogConfig.showCoverContact : true,
            coverContactTitle: project.data.catalogConfig.coverContactTitle || '',
            baseUnit: project.data.catalogConfig.baseUnit || '',
            coverOverlayOpacity: project.data.catalogConfig.coverOverlayOpacity !== undefined ? project.data.catalogConfig.coverOverlayOpacity : 60,
            moqLabel: project.data.catalogConfig.moqLabel || '',
            showAboutUs: project.data.catalogConfig.showAboutUs || false,
            aboutUsText: project.data.catalogConfig.aboutUsText || '',
            showCompanyPhotos: project.data.catalogConfig.showCompanyPhotos || false,
            companyPhotos: project.data.catalogConfig.companyPhotos || [],
            website: project.data.catalogConfig.website || '',
            sections: project.data.catalogConfig.sections || []
        });
    }

    setShowLoadModal(false);
  };
  
  const requestDelete = (docId: string, e: React.MouseEvent) => { 
      e.stopPropagation(); 
      setDeleteConfirmId(docId); 
  };
  
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    const isRealCloudUser = user && db && !isDemoMode && user.uid !== DEMO_USER_ID;

    try { 
        if (isRealCloudUser) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', deleteConfirmId)); 
        } else {
            // Local Delete
            await dbDeleteProject(deleteConfirmId);
            
            // Sync LocalStorage
            try {
               let stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_LEGACY) || '[]');
               stored = stored.filter((p: SavedProject) => p.id !== deleteConfirmId);
               localStorage.setItem(LOCAL_STORAGE_KEY_LEGACY, JSON.stringify(stored));
            } catch(e) {}
            
            await loadLocalProjects();
        }
        
        if (deleteConfirmId === loadedProjectId) {
            setLoadedProjectId(null);
        }
        
        setDeleteConfirmId(null); 
    } catch (error) { 
        console.error(error); 
    } finally { 
        setIsDeleting(false); 
    }
  };

  // --- IMPORT / EXPORT LOGIC ---
  const handleExportProject = (project: SavedProject, e: React.MouseEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (err) {
        console.error("Export failed", err);
        alert("Could not export project.");
    }
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const content = event.target?.result as string;
              const importedProject = JSON.parse(content) as SavedProject;
              
              if (!importedProject.data || !importedProject.name) {
                  throw new Error("Invalid project file format");
              }

              const newProject: SavedProject = {
                  ...importedProject,
                  id: `imported_${Date.now()}`,
                  name: `${importedProject.name} (Imported)`,
                  createdAt: { seconds: Math.floor(Date.now() / 1000) }
              };

              await dbSaveProject(newProject);
              await loadLocalProjects();
              
              e.target.value = '';
              alert("Project imported successfully!");

          } catch (err) {
              console.error("Import error", err);
              alert("Failed to import project. Please check the file.");
          }
      };
      reader.readAsText(file);
  };
  
  // -- GRANULAR IMPORT LOGIC --
  const handleOpenImportSelection = (project: SavedProject) => {
      setImportCandidateProject(project);
      if (project.data?.products) {
          setImportSelectedProductIds(project.data.products.map(p => p.id));
      } else {
          setImportSelectedProductIds([]);
      }
  };

  const handleFinalizeImport = () => {
      if (!importCandidateProject || !importCandidateProject.data?.products) return;

      const productsToImport = importCandidateProject.data.products.filter(p => 
          importSelectedProductIds.includes(p.id)
      );

      const newProducts = productsToImport.map((p, idx) => ({
          ...p,
          id: Date.now() + Math.random() + idx, 
          active: true
      }));

      setProducts(prev => [...prev, ...newProducts]);
      
      setImportCandidateProject(null);
      setImportSelectedProductIds([]);
      setShowImportProductsModal(false);
  };

  // --- IMAGE & FILE HANDLERS ---
  const handleCatalogCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = reader.result as string;
            const compressed = await compressImage(raw, 1200, 0.7); 
            setCatalogConfig({ ...catalogConfig, coverImage: compressed });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCompanyPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        Array.from(files).forEach((file: any) => {
             const reader = new FileReader();
             reader.onloadend = async () => {
                 const raw = reader.result as string;
                 const compressed = await compressImage(raw, 800, 0.7); 
                 setCatalogConfig(prev => ({
                     ...prev,
                     companyPhotos: [...(prev.companyPhotos || []), compressed]
                 }));
             };
             reader.readAsDataURL(file);
        });
    }
  };

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = reader.result as string;
            const compressed = await compressImage(raw, 800, 0.7); 
            updateProduct(id, 'image', compressed);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSupplierImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = reader.result as string;
            const compressed = await compressImage(raw, 800, 0.7); 
            setSuppliers(prev => prev.map(s => {
                if (s.id === id) {
                    return { ...s, images: [...(s.images || []), compressed] };
                }
                return s;
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSupplierAttachmentUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 50 * 1024 * 1024) { 
              alert("File is too large. Max size is 50MB.");
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              const raw = reader.result as string;
              setSuppliers(prev => prev.map(s => {
                  if (s.id === id) {
                      const newAttachment: SupplierAttachment = {
                          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          name: file.name,
                          type: file.type,
                          data: raw,
                          size: file.size
                      };
                      return { ...s, attachments: [...(s.attachments || []), newAttachment] };
                  }
                  return s;
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteAttachment = (supplierId: number, attachmentId: string) => {
      setSuppliers(prev => prev.map(s => {
          if (s.id === supplierId) {
              return { ...s, attachments: (s.attachments || []).filter(a => a.id !== attachmentId) };
          }
          return s;
      }));
  };

  // --- CATALOG SECTION HANDLERS ---
  const handleAddSection = () => {
    const newSection: CatalogSection = {
      id: Date.now(),
      title: 'New Page',
      content: '',
      alignment: 'left',
      position: 'after',
      images: [],
      imageLayout: 'single'
    };
    setCatalogConfig(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
    setEditingSection(newSection);
  };

  const handleUpdateSection = (updatedSection: CatalogSection) => {
    setCatalogConfig(prev => ({
      ...prev,
      sections: (prev.sections || []).map(s => s.id === updatedSection.id ? updatedSection : s)
    }));
  };

  const handleDeleteSection = (id: number) => {
    setCatalogConfig(prev => ({
      ...prev,
      sections: (prev.sections || []).filter(s => s.id !== id)
    }));
  };

  const handleSectionMultiImageUpload = (e: React.ChangeEvent<HTMLInputElement>, section: CatalogSection) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        Array.from(files).forEach((file: any) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const raw = reader.result as string;
                const compressed = await compressImage(raw, 800, 0.7);
                setEditingSection(prev => {
                    if (!prev) return null;
                    const existingImages = prev.images || (prev.image ? [prev.image] : []);
                    return { ...prev, images: [...existingImages, compressed], image: undefined }; 
                });
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const handleRemoveSectionImage = (indexToRemove: number) => {
     setEditingSection(prev => {
         if (!prev) return null;
         const currentImages = prev.images || (prev.image ? [prev.image] : []);
         const newImages = currentImages.filter((_, idx) => idx !== indexToRemove);
         return { ...prev, images: newImages, image: undefined };
     });
  };

  // --- DATA UPDATE HELPERS ---
  const toBase = (amount: number, currency: string) => (amount * (rates[currency] || 1));
  const toOutput = (amountInIRR: number) => (amountInIRR / (rates[config.outputCurrency] || 1));
  const convert = (amount: number, curr: string) => toOutput(toBase(amount, curr));

  const updateProduct = (id: number, field: keyof Product, val: any) => { 
      setProducts(products.map(p => p.id === id ? { ...p, [field]: val } : p)); 
  };
  
  const toggleProductActive = (id: number) => { 
      setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p)); 
  };
  
  const updateLogisticsMain = (key: 'inland' | 'port' | 'freight' | 'insurance' | 'destination', field: 'val' | 'curr', val: any) => { 
      setLogistics(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } })); 
  };
  
  const addExwExtraCost = () => setLogistics(prev => ({ ...prev, exwExtras: [...(prev.exwExtras || []), { id: Date.now(), name: '', val: 0, curr: 'IRR' }] }));
  const removeExwExtraCost = (id: number) => setLogistics(prev => ({ ...prev, exwExtras: (prev.exwExtras || []).filter(e => e.id !== id) }));
  const updateExwExtraCost = (id: number, field: keyof import('./types').ExtraCost, val: any) => setLogistics(prev => ({ ...prev, exwExtras: (prev.exwExtras || []).map(e => e.id === id ? { ...e, [field]: val } : e) }));

  const addExtraCost = () => setLogistics(prev => ({ ...prev, extras: [...(prev.extras || []), { id: Date.now(), name: '', val: 0, curr: 'OMR' }] }));
  const removeExtraCost = (id: number) => setLogistics(prev => ({ ...prev, extras: (prev.extras || []).filter(e => e.id !== id) }));
  const updateExtraCost = (id: number, field: keyof import('./types').ExtraCost, val: any) => setLogistics(prev => ({ ...prev, extras: (prev.extras || []).map(e => e.id === id ? { ...e, [field]: val } : e) }));
  
  const toggleProfitFlag = (key: string) => { 
      setConfig(prev => ({ ...prev, profitFlags: { ...prev.profitFlags, [key]: !prev.profitFlags[key] } })); 
  };
  
  const toggleScenarioTerm = (term: string) => { 
      if (visibleScenarioTerms.includes(term)) { 
          if(visibleScenarioTerms.length > 1) setVisibleScenarioTerms(visibleScenarioTerms.filter(t => t !== term)); 
      } else { 
          const order = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP']; 
          const newTerms = [...visibleScenarioTerms, term].sort((a,b) => order.indexOf(a) - order.indexOf(b)); 
          setVisibleScenarioTerms(newTerms); 
      } 
  };
  
  const toggleInvoiceTerm = (term: string) => { 
      if (invoiceTerms.includes(term)) { 
          if(invoiceTerms.length > 0) setInvoiceTerms(invoiceTerms.filter(t => t !== term)); 
      } else { 
          const order = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP']; 
          const newTerms = [...invoiceTerms, term].sort((a,b) => order.indexOf(a) - order.indexOf(b)); 
          setInvoiceTerms(newTerms); 
      } 
  };

  const togglePriceListTerm = (term: string) => {
      const current = priceListConfig.terms;
      let newTerms = [];
      if (current.includes(term)) {
           newTerms = current.filter(t => t !== term);
      } else {
           const order = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP'];
           newTerms = [...current, term].sort((a,b) => order.indexOf(a) - order.indexOf(b));
      }
      setPriceListConfig({ ...priceListConfig, terms: newTerms });
  };

  const toggleCatalogTerm = (term: string) => {
      const current = catalogConfig.priceTerms;
      let newTerms = [];
      if (current.includes(term)) {
           newTerms = current.filter(t => t !== term);
      } else {
           const order = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP'];
           newTerms = [...current, term].sort((a,b) => order.indexOf(a) - order.indexOf(b));
      }
      setCatalogConfig({ ...catalogConfig, priceTerms: newTerms });
  };

  const addSocial = () => {
      setCatalogConfig(prev => ({
          ...prev,
          socialLinks: [...(prev.socialLinks || []), { id: Date.now(), platform: 'instagram', handle: '' }]
      }));
  };
  
  const removeSocial = (id: number) => {
      setCatalogConfig(prev => ({
          ...prev,
          socialLinks: (prev.socialLinks || []).filter(s => s.id !== id)
      }));
  };

  const updateSocial = (id: number, field: keyof SocialLink, val: any) => {
      setCatalogConfig(prev => ({
          ...prev,
          socialLinks: (prev.socialLinks || []).map(s => s.id === id ? { ...s, [field]: val } : s)
      }));
  };

  const getSocialIcon = (platform: string, className = "w-4 h-4") => {
      switch(platform) {
          case 'instagram': return <Instagram className={className} />;
          case 'linkedin': return <Linkedin className={className} />;
          case 'facebook': return <Facebook className={className} />;
          case 'twitter': return <Twitter className={className} />;
          case 'youtube': return <Youtube className={className} />;
          case 'whatsapp': return <MessageCircle className={className} />;
          case 'telegram': return <Send className={className} />;
          default: return <Globe className={className} />;
      }
  };

  // --- CORE CALCULATION ENGINE ---
  const calculations = useMemo(() => {
    const applyProfit = (cost: number, flag: boolean, percent: number) => {
        if (!flag) return cost;
        if (config.profitType === 'markup') return cost * (1 + percent / 100);
        const marginFactor = 1 - (percent / 100);
        return marginFactor > 0 ? cost / marginFactor : cost;
    };

    const activeProducts = products.filter(p => p.active !== false);
    const totalQty = activeProducts.reduce((sum, p) => sum + p.qty, 0);

    const costExwExtras = (logistics.exwExtras || []).reduce((acc, curr) => acc + convert(curr.val, curr.curr), 0);
    const costInland = convert(logistics.inland.val, logistics.inland.curr);
    const costPort = convert(logistics.port.val, logistics.port.curr);
    const costFreight = convert(logistics.freight.val, logistics.freight.curr);
    const costInsurance = convert(logistics.insurance.val, logistics.insurance.curr);
    const costDest = convert(logistics.destination.val, logistics.destination.curr);
    const costExtras = (logistics.extras || []).reduce((acc, curr) => acc + convert(curr.val, curr.curr), 0);

    const uExwExtra = totalQty > 0 ? costExwExtras / totalQty : 0;
    const uInland = totalQty > 0 ? costInland / totalQty : 0;
    const uPort = totalQty > 0 ? costPort / totalQty : 0;
    const uFreight = totalQty > 0 ? costFreight / totalQty : 0;
    const uInsurance = totalQty > 0 ? costInsurance / totalQty : 0;
    const uDest = totalQty > 0 ? costDest / totalQty : 0;
    const uExtras = totalQty > 0 ? costExtras / totalQty : 0;

    let totalExwCost = 0;
    let accSell_EXW = 0;
    let accSell_FCA = 0;
    let accSell_FOB = 0;
    let accSell_CIF = 0;
    let accSell_DDP = 0;
    
    const processedProducts = products.map(p => {
        const isActive = p.active !== false; 
        
        const inputMode = p.priceInputMode || 'unit';
        let effectiveBaseUnitPrice = p.unitPrice;
        
        if (inputMode === 'pack') {
            effectiveBaseUnitPrice = (p.itemsPerPack && p.itemsPerPack > 0) ? p.unitPrice / p.itemsPerPack : 0;
        }

        const productCostOut = toOutput(toBase(effectiveBaseUnitPrice, p.currency));
        const unitCostOutput = productCostOut; 
        
        const lineCost = isActive ? unitCostOutput * p.qty : 0;
        
        // Use custom profit if defined, else global config
        const effectiveProfitPercent = (p.customProfit !== undefined && p.customProfit !== null) ? p.customProfit : config.profitPercent;

        // Apply Profit per Product (including its share of logistics)
        const productSell = applyProfit(productCostOut, config.profitFlags.exw, effectiveProfitPercent);
        const exwExtraSell = applyProfit(uExwExtra, config.profitFlags.exw, effectiveProfitPercent);
        
        const hasBasePrice = productCostOut > 0;

        let unitSellPrice = 0;
        let unitProfit = 0;
        let exwSell = 0;
        let fcaSell = 0;
        let fobSell = 0;
        let cifSell = 0;
        let ddpSell = 0;

        if (hasBasePrice) {
            // DUAL PRICING LOGIC
            if (config.pricingMethod === 'fixed_unit_markup') {
                // FIXED MARKUP MODE
                const multipliers = config.termMultipliers || { exw: 0, fob: 0, cif: 0, ddp: 0 };
                
                // Base Costs for each term
                const baseCost_EXW = unitCostOutput + uExwExtra;
                const baseCost_FOB = baseCost_EXW + uInland + uPort;
                const baseCost_CIF = baseCost_FOB + uFreight + uInsurance;
                
                const dutyVal = baseCost_CIF * (logistics.dutyPercent / 100);
                const baseCost_DDP = baseCost_CIF + uDest + dutyVal + uExtras;

                // Apply Multiplier (Cost * (1 + Markup%))
                exwSell = baseCost_EXW * (1 + ((multipliers.exw || 0) / 100));
                fcaSell = (baseCost_EXW + uInland) * (1 + ((multipliers.fob || 0) / 100));
                fobSell = baseCost_FOB * (1 + ((multipliers.fob || 0) / 100));
                cifSell = baseCost_CIF * (1 + ((multipliers.cif || 0) / 100));
                ddpSell = baseCost_DDP * (1 + ((multipliers.ddp || 0) / 100));

                unitSellPrice = exwSell;
                unitProfit = unitSellPrice - baseCost_EXW;
            } else {
                // COST PLUS (ACCUMULATED) MODE
                unitSellPrice = productSell + exwExtraSell; 
                unitProfit = unitSellPrice - (unitCostOutput + uExwExtra); 

                exwSell = unitSellPrice;
                fcaSell = exwSell + applyProfit(uInland, config.profitFlags.fob, effectiveProfitPercent);
                fobSell = fcaSell + applyProfit(uPort, config.profitFlags.fob, effectiveProfitPercent);
                cifSell = fobSell + applyProfit(uFreight + uInsurance, config.profitFlags.cif, effectiveProfitPercent); 
                
                const unitCifCost = unitCostOutput + uExwExtra + uInland + uPort + uFreight + uInsurance;
                const uDuty = unitCifCost * (logistics.dutyPercent / 100);
                
                ddpSell = cifSell + applyProfit(uDest + uDuty + uExtras, config.profitFlags.ddp, effectiveProfitPercent);
            }
        }
        
        const totalProfit = isActive ? unitProfit * p.qty : 0;
        const totalSellPrice = isActive ? unitSellPrice * p.qty : 0;

        const totalPacks = (p.itemsPerPack && p.itemsPerPack > 0) ? p.qty / p.itemsPerPack : 0;
        
        const scenarioPackPrices = {
            EXW: exwSell * (p.itemsPerPack || 1),
            FCA: fcaSell * (p.itemsPerPack || 1),
            FOB: fobSell * (p.itemsPerPack || 1),
            CIF: cifSell * (p.itemsPerPack || 1),
            DDP: ddpSell * (p.itemsPerPack || 1),
        };

        const packPrice = unitSellPrice * (p.itemsPerPack || 0);

        if (isActive) {
            totalExwCost += lineCost;
            accSell_EXW += exwSell * p.qty;
            accSell_FCA += fcaSell * p.qty;
            accSell_FOB += fobSell * p.qty;
            accSell_CIF += cifSell * p.qty;
            accSell_DDP += ddpSell * p.qty;
        }

        return { 
            ...p, 
            isActive, 
            unitCostOutput, 
            lineCost, 
            unitProfit, 
            totalProfit, 
            unitSellPrice, 
            totalSellPrice, 
            totalPacks,
            packPrice,
            scenarioPrices: { EXW: exwSell, FCA: fcaSell, FOB: fobSell, CIF: cifSell, DDP: ddpSell },
            scenarioPackPrices
        };
    });

    const costCIF_Base = totalExwCost + costExwExtras + costInland + costPort + costFreight + costInsurance;
    const costDuty = costCIF_Base * (logistics.dutyPercent / 100);
    
    const costs = {
        exw: totalExwCost + costExwExtras,
        fob_inc: costInland + costPort,
        cif_inc: costFreight + costInsurance, // Include Freight and Insurance
        ddp_inc: costDest + costDuty + costExtras
    };

    const totalLogisticsCost = costs.fob_inc + costs.cif_inc + costs.ddp_inc;

    const terms = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP'];
    
    // We used accumulated Sells from products to respect individual product margins
    const scenarioData: Record<string, {cost: number, sell: number}> = {
        EXW: { cost: costs.exw, sell: accSell_EXW },
        FCA: { cost: costs.exw + costInland, sell: accSell_FCA },
        FOB: { cost: costs.exw + costs.fob_inc, sell: accSell_FOB },
        CIF: { cost: costs.exw + costs.fob_inc + costs.cif_inc, sell: accSell_CIF }, // FIXED: Added costs.cif_inc
        DDP: { cost: costs.exw + costs.fob_inc + costs.cif_inc + costs.ddp_inc, sell: accSell_DDP }
    };

    let previousUnitSell = 0;
    const breakdown = terms.map((term, index) => {
        const data = scenarioData[term];
        const totalCost = data.cost;
        const totalSell = data.sell;
        const totalProfit = totalSell - totalCost;
        
        const unitSell = totalQty > 0 ? totalSell / totalQty : 0;
        const unitCost = totalQty > 0 ? totalCost / totalQty : 0;
        const unitProfit = totalQty > 0 ? totalProfit / totalQty : 0;
        
        const markupPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

        const valueAdd = index === 0 ? unitSell : unitSell - previousUnitSell;
        previousUnitSell = unitSell;
        
        return {
            term,
            totalCost,
            totalSell,
            totalProfit,
            profitMargin: totalSell > 0 ? (totalProfit / totalSell) * 100 : 0,
            markupPercent,
            unitSell,
            unitCost,
            unitProfit,
            valueAdd
        };
    });

    return { 
        processedProducts, 
        costs, 
        totalLogisticsCost, 
        breakdown, 
        scenarioData, 
        totalQty
    };
  }, [products, logistics, config, rates]);

  // --- CATALOG PAGINATION HELPERS ---
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const paginatedGroups = useMemo(() => {
    const itemsPerPage = catalogConfig.itemsPerPage || 4;
    const includedIds = catalogConfig.includedProductIds || [];
    
    // 1. Filter active products that are selected for catalog
    const filteredProducts = calculations.processedProducts.filter(p => {
        const isActive = p.isActive;
        const isSelected = includedIds.length === 0 || includedIds.includes(p.id);
        return isActive && isSelected;
    });

    // 2. Group them
    const groups: { name: string; pages: Product[][] }[] = [];
    
    // Preliminary grouping
    const tempGroups: { name: string; items: Product[] }[] = [];
    filteredProducts.forEach(p => {
        const gName = p.group || '';
        if (tempGroups.length === 0) {
            tempGroups.push({ name: gName, items: [p] });
        } else {
            const last = tempGroups[tempGroups.length - 1];
            if (last.name === gName) {
                last.items.push(p);
            } else {
                tempGroups.push({ name: gName, items: [p] });
            }
        }
    });

    // 3. Chunk into pages
    tempGroups.forEach(g => {
        groups.push({
            name: g.name,
            pages: chunkArray(g.items, itemsPerPage)
        });
    });
    
    return groups;
  }, [calculations.processedProducts, catalogConfig.itemsPerPage, catalogConfig.includedProductIds]);


  // --- RENDER FUNCTIONS ---
  // (Note: Kept inside component to access state closure)
  
  const renderDashboard = () => (
    <div className="space-y-6">
      
      {/* 1. CONFIG BAR */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        {/* ... (existing dashboard code) ... */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Output Currency</label>
                    <select 
                        value={config.outputCurrency}
                        onChange={(e) => setConfig({...config, outputCurrency: e.target.value})}
                        className="w-full md:w-32 text-sm bg-slate-50 border border-slate-300 rounded px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                
                {/* --- TARGET PROFIT INPUT (DISABLED IN FIXED MARKUP MODE) --- */}
                <div className={`${config.pricingMethod === 'fixed_unit_markup' ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        Target Profit
                        {config.pricingMethod === 'fixed_unit_markup' && <span className="text-[9px] text-red-500">(Off)</span>}
                    </label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={config.profitPercent}
                            onChange={(e) => setConfig({...config, profitPercent: parseFloat(e.target.value) || 0})}
                            className="w-20 text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={config.pricingMethod === 'fixed_unit_markup'}
                        />
                        <span className="text-slate-400 font-medium">%</span>
                        <select 
                            value={config.profitType}
                            onChange={(e) => setConfig({...config, profitType: e.target.value as any})}
                            className="text-sm bg-slate-50 border border-slate-300 rounded px-2 py-2"
                            disabled={config.pricingMethod === 'fixed_unit_markup'}
                        >
                            <option value="markup">Markup</option>
                            <option value="margin">Margin</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto items-end">
                 
                 <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                    <button 
                        onClick={() => setBasis('unit')} 
                        className={`px-3 py-2 text-sm font-medium transition-colors ${basis === 'unit' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Unit
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button 
                        onClick={() => setBasis('pack')} 
                        className={`px-3 py-2 text-sm font-medium transition-colors ${basis === 'pack' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Pack
                    </button>
                 </div>

                 <button 
                    onClick={() => setShowPackInfo(!showPackInfo)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors w-full md:w-auto ${showPackInfo ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    <Package className="w-4 h-4" />
                    Pack Info
                </button>
                 <button 
                    onClick={() => setShowRateSettings(!showRateSettings)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors w-full md:w-auto ${showRateSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    <Settings className="w-4 h-4" />
                    Rates
                </button>
            </div>
        </div>
        
        {showRateSettings && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-2">
                {Object.entries(rates).map(([curr, rate]) => (
                    <div key={curr} className="relative group">
                        <label className="block text-xs font-medium text-slate-500 mb-1">{curr} Rate</label>
                        <FormattedNumberInput 
                            value={rate as number}
                            onChange={(val) => setRates({...rates, [curr]: val})}
                            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* 2. PRODUCT INPUT */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* ... existing product table ... */}
        {/* I will reuse existing rendering logic here to avoid code duplication */}
        {/* Just assume the table is rendered here as before */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Products
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowImportProductsModal(true)} 
                    className="text-sm bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm"
                >
                    <FolderOpen className="w-4 h-4" /> Import from Project
                </button>
                <button 
                    onClick={() => setProducts([...products, { id: Date.now(), name: '', qty: 0, unitPrice: 0, currency: 'IRR', itemsPerPack: 0, packPrice: 0, active: true, priceInputMode: 'unit', group: '', measurementUnit: '' }])} 
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </div>
        </div>
        <div className="overflow-auto max-h-[65vh]">
            <table className="w-max text-sm text-left border-collapse">
                <thead className="text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-2 w-10 bg-slate-50"></th>
                        <th className="px-4 py-2 bg-slate-50 w-24">Group</th>
                        <th className="px-4 py-2 bg-slate-50 w-32">Supplier</th>
                        <th className="px-4 py-2 bg-slate-50">Item</th>
                        <th className="px-4 py-2 w-24 bg-slate-50">HS Code</th>
                        <th className="px-4 py-2 w-12 text-center bg-slate-50">Img</th>
                        <th className="px-4 py-2 w-24 bg-slate-50">Qty</th>
                        
                        <th className="px-4 py-2 w-28 bg-slate-50">Items/Pack</th>
                        {showPackInfo && <th className="px-4 py-2 w-20 bg-indigo-50 text-indigo-700">Total Packs</th>}
                        {showPackInfo && <th className="px-4 py-2 w-28 bg-indigo-50 text-indigo-700 text-right">Pack Price</th>}

                        <th className="px-4 py-2 w-48 min-w-[200px] bg-slate-50">Cost Input</th>
                        
                        <th className="px-4 py-2 w-28 min-w-[120px] text-right text-slate-500 bg-slate-50">
                            {basis === 'unit' ? 'Unit' : 'Pack'} Cost ({config.outputCurrency})
                        </th>
                        <th className="px-4 py-2 w-28 min-w-[120px] text-right text-slate-500 bg-slate-50">Total Cost</th>
                        
                        <th className="px-4 py-2 w-20 bg-slate-50 text-right">Profit %</th>

                        <th className="px-4 py-2 w-28 min-w-[120px] text-right text-emerald-600 bg-slate-50">
                             {basis === 'unit' ? 'Unit' : 'Pack'} Profit
                        </th>
                        <th className="px-4 py-2 w-28 min-w-[120px] text-right text-emerald-600 bg-slate-50">Total Profit</th>

                        <th className="px-4 py-2 w-32 min-w-[120px] bg-blue-50 text-blue-700">
                            {basis === 'unit' ? 'Unit' : 'Pack'} Sell ({config.outputCurrency})
                        </th>
                        <th className="px-4 py-2 w-32 min-w-[120px] bg-green-50 text-green-700">Total Sell ({config.outputCurrency})</th>
                        <th className="px-4 py-2 w-10 bg-slate-50"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {calculations.processedProducts.map((p, idx) => {
                        const viewMult = basis === 'pack' ? (p.itemsPerPack || 0) : 1;

                        return (
                            <tr key={p.id} className={`group hover:bg-slate-50 transition-colors ${!p.active ? 'opacity-50 bg-slate-50' : ''}`}>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => toggleProductActive(p.id)} className={`text-slate-400 hover:text-blue-600 transition-colors`}>
                                        {p.active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                                    </button>
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        placeholder="Group"
                                        value={p.group || ''}
                                        onChange={(e) => updateProduct(p.id, 'group', e.target.value)}
                                        className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-slate-500 font-medium w-full outline-none"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        value={p.supplierId || ''}
                                        onChange={(e) => updateProduct(p.id, 'supplierId', e.target.value ? Number(e.target.value) : undefined)}
                                        className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-slate-500 font-medium w-full outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="text" 
                                            placeholder="Item Name"
                                            value={p.name}
                                            onChange={(e) => updateProduct(p.id, 'name', e.target.value)}
                                            className="bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-800 placeholder-slate-300 w-full"
                                            style={{ minWidth: '80px' }}
                                        />
                                        <button 
                                            onClick={() => setEditingCatalogDetailsId(p.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600"
                                            title="Edit Catalog Details (Description, etc)"
                                        >
                                            <FileText className="w-3 h-3" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        placeholder="HS"
                                        value={p.hsCode || ''}
                                        onChange={(e) => updateProduct(p.id, 'hsCode', e.target.value)}
                                        className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-slate-600 w-20 outline-none"
                                    />
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <label className="cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(p.id, e)} />
                                        {p.image ? <ImageIcon className="w-4 h-4 text-blue-600" /> : <Upload className="w-4 h-4" />}
                                    </label>
                                </td>
                                <td className="px-4 py-2">
                                    <FormattedNumberInput 
                                        value={p.qty}
                                        onChange={(val) => updateProduct(p.id, 'qty', val)}
                                        className="bg-transparent border-none p-0 focus:ring-0 text-slate-600"
                                        style={{ minWidth: '100%', width: `${Math.max(formatNumber(p.qty).length, 3) + 2}ch` }}
                                    />
                                </td>

                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-1">
                                        <FormattedNumberInput 
                                            value={p.itemsPerPack}
                                            onChange={(val) => updateProduct(p.id, 'itemsPerPack', val)}
                                            className="bg-slate-50 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-1 text-slate-600 w-14 text-center text-xs"
                                            placeholder="0"
                                        />
                                        <input 
                                            type="text"
                                            value={p.measurementUnit || ''}
                                            onChange={(e) => updateProduct(p.id, 'measurementUnit', e.target.value)}
                                            className="w-10 bg-transparent border-b border-slate-200 text-[10px] text-center focus:border-blue-500 outline-none text-slate-500 placeholder-slate-300"
                                            placeholder="Pcs"
                                        />
                                    </div>
                                </td>
                                
                                {showPackInfo && (
                                    <td className="px-4 py-2 bg-indigo-50/30">
                                        <FormattedNumberInput
                                            value={p.totalPacks || 0}
                                            onChange={(val) => {
                                                const newQty = val * (p.itemsPerPack || 0);
                                                updateProduct(p.id, 'qty', newQty);
                                            }}
                                            className="bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded px-1 py-1 text-indigo-700 font-medium text-center w-full outline-none"
                                            placeholder="0"
                                        />
                                    </td>
                                )}
                                {showPackInfo && (
                                    <td className="px-4 py-2 bg-indigo-50/30 text-indigo-700 font-medium text-right">
                                        {formatMoney(p.packPrice || 0, config.outputCurrency)}
                                    </td>
                                )}

                                <td className="px-4 py-2">
                                    <div className="flex gap-2 items-center">
                                        <FormattedNumberInput 
                                            value={p.unitPrice}
                                            onChange={(val) => updateProduct(p.id, 'unitPrice', val)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-slate-600"
                                            style={{ minWidth: '60px', width: `${Math.max(formatNumber(p.unitPrice).length, 6) + 2}ch` }}
                                        />
                                        <div className="flex flex-col gap-1">
                                            <select 
                                                value={p.currency}
                                                onChange={(e) => updateProduct(p.id, 'currency', e.target.value)}
                                                className="bg-slate-100 rounded px-1 text-xs border-none focus:ring-0 text-slate-500"
                                            >
                                                {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select 
                                                value={p.priceInputMode || 'unit'}
                                                onChange={(e) => updateProduct(p.id, 'priceInputMode', e.target.value)}
                                                className="bg-transparent text-[10px] text-slate-400 border-none p-0 focus:ring-0 cursor-pointer hover:text-blue-600"
                                            >
                                                <option value="unit">/ Unit</option>
                                                <option value="pack">/ Pack</option>
                                            </select>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-4 py-2 text-right text-slate-500">
                                    {formatMoney((p.unitCostOutput || 0) * viewMult, config.outputCurrency)}
                                </td>
                                <td className="px-4 py-2 text-right text-slate-600">{formatMoney(p.lineCost || 0, config.outputCurrency)}</td>
                                
                                <td className="px-4 py-2 text-right">
                                    {/* DISABLE PER-PRODUCT PROFIT IN FIXED MODE */}
                                    <input 
                                        type="text"
                                        value={p.customProfit !== undefined ? p.customProfit : ''}
                                        placeholder={config.profitPercent.toString()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.trim() === '') {
                                                updateProduct(p.id, 'customProfit', undefined);
                                            } else {
                                                updateProduct(p.id, 'customProfit', parseInput(val));
                                            }
                                        }}
                                        disabled={config.pricingMethod === 'fixed_unit_markup'}
                                        className={`w-14 text-right bg-transparent border-b ${p.customProfit !== undefined ? 'border-purple-300 text-purple-700 font-medium' : 'border-slate-200 text-slate-400'} focus:border-purple-500 outline-none text-xs px-1 ${config.pricingMethod === 'fixed_unit_markup' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    />
                                </td>

                                <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                                    {formatMoney((p.unitProfit || 0) * viewMult, config.outputCurrency)}
                                </td>
                                <td className="px-4 py-2 text-right text-emerald-600 font-medium">{formatMoney(p.totalProfit || 0, config.outputCurrency)}</td>

                                <td className="px-4 py-2 bg-blue-50/30 text-right font-medium text-blue-700">
                                    {formatMoney((p.unitSellPrice || 0) * viewMult, config.outputCurrency)}
                                </td>
                                <td className="px-4 py-2 bg-green-50/30 text-right font-medium text-green-700">
                                    {formatMoney(p.totalSellPrice || 0, config.outputCurrency)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {products.length === 0 && (
                        <tr>
                            <td colSpan={showPackInfo ? 19 : 17} className="px-4 py-8 text-center text-slate-400 italic">No products added. Click "Add Product" to start.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 3. LOGISTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ... existing logistics components ... */}
          {/* Just inserting them here to maintain file structure, assume they are correct */}
           <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-amber-500" />
                  Logistics & Transport
              </h2>
              <div className="space-y-4">
                 <div className="pb-3 border-b border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            EXW Specific Costs
                        </label>
                        <button onClick={addExwExtraCost} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                     </div>
                     <p className="text-[10px] text-slate-400 mb-2">Costs before transport (e.g. Health Cert, Translation, Inspection) - Included in EXW Price.</p>
                     <div className="space-y-2">
                        {(logistics.exwExtras || []).map(ex => (
                            <div key={ex.id} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Description" 
                                    value={ex.name} 
                                    onChange={(e) => updateExwExtraCost(ex.id, 'name', e.target.value)} 
                                    className="w-full text-xs border-b border-slate-200 focus:border-blue-500 outline-none"
                                />
                                <FormattedNumberInput 
                                    value={ex.val} 
                                    onChange={(val) => updateExwExtraCost(ex.id, 'val', val)} 
                                    className="w-20 text-xs text-right border border-slate-200 rounded px-1 py-1"
                                />
                                <select 
                                    value={ex.curr} 
                                    onChange={(e) => updateExwExtraCost(ex.id, 'curr', e.target.value)} 
                                    className="text-xs bg-slate-50 border-none"
                                >
                                    {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={() => removeExwExtraCost(ex.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                     </div>
                 </div>

                 {[
                     { id: 'inland', label: 'Inland Transport', icon: MapPin },
                     { id: 'port', label: 'Port & Handling', icon: Anchor },
                     { id: 'freight', label: 'Sea/Air Freight', icon: Ship },
                     { id: 'insurance', label: 'Cargo Insurance', icon: CheckSquare }, // Added Insurance
                     { id: 'destination', label: 'Destination Clearance', icon: CheckCircle }
                 ].map((item) => (
                     <div key={item.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-sm text-slate-600">
                             <item.icon className="w-4 h-4 text-slate-400" />
                             {item.label}
                         </div>
                         <div className="flex items-center gap-2">
                             <FormattedNumberInput 
                                 value={(logistics as any)[item.id].val}
                                 onChange={(val) => updateLogisticsMain(item.id as any, 'val', val)}
                                 className="w-24 text-sm text-right border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                             />
                             <select 
                                 value={(logistics as any)[item.id].curr}
                                 onChange={(e) => updateLogisticsMain(item.id as any, 'curr', e.target.value)}
                                 className="text-xs bg-slate-50 border border-slate-200 rounded px-1 py-1"
                             >
                                 {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                         </div>
                     </div>
                 ))}
                 
                 <div className="pt-3 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">DDP Extra Costs / Duties</label>
                        <button onClick={addExtraCost} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Duty % (on CIF)</span>
                            <input 
                                type="number" 
                                value={logistics.dutyPercent}
                                onChange={(e) => setLogistics({...logistics, dutyPercent: parseFloat(e.target.value) || 0})}
                                className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {(logistics.extras || []).map(ex => (
                            <div key={ex.id} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Desc" 
                                    value={ex.name} 
                                    onChange={(e) => updateExtraCost(ex.id, 'name', e.target.value)} 
                                    className="w-full text-xs border-b border-slate-200 focus:border-blue-500 outline-none"
                                />
                                <FormattedNumberInput 
                                    value={ex.val} 
                                    onChange={(val) => updateExtraCost(ex.id, 'val', val)} 
                                    className="w-20 text-xs text-right border border-slate-200 rounded px-1 py-1"
                                />
                                <select 
                                    value={ex.curr} 
                                    onChange={(e) => updateExtraCost(ex.id, 'curr', e.target.value)} 
                                    className="text-xs bg-slate-50 border-none"
                                >
                                    {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={() => removeExtraCost(ex.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                     </div>
                 </div>
              </div>
          </div>

          {/* --- REBUILT PROFIT CONFIGURATION CARD --- */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                  <PieChart className="w-4 h-4 text-purple-500" />
                  Profit Configuration
              </h2>
              
              {/* Method Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                  <button
                      onClick={() => setConfig({...config, pricingMethod: 'cost_plus'})}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.pricingMethod === 'cost_plus' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Accumulated (Cost Plus)
                  </button>
                  <button
                      onClick={() => setConfig({...config, pricingMethod: 'fixed_unit_markup'})}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.pricingMethod === 'fixed_unit_markup' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Fixed % on Unit Price
                  </button>
              </div>

              <div className="space-y-4">
                  
                  {/* MODE A: COST PLUS */}
                  {config.pricingMethod === 'cost_plus' && (
                      <div className="animate-in fade-in slide-in-from-top-1">
                          <p className="text-xs text-slate-500 mb-2">Select which stages include profit margin (Accumulates on top of cost):</p>
                          <div className="grid grid-cols-2 gap-3">
                              {[
                                  { id: 'exw', label: 'Goods (EXW)', desc: 'Profit on raw product cost' },
                                  { id: 'fob', label: 'Inland/Port (FOB)', desc: 'Profit on transport to ship' },
                                  { id: 'cif', label: 'Freight (CIF)', desc: 'Profit on sea/air freight' },
                                  { id: 'ddp', label: 'Dest/Duty (DDP)', desc: 'Profit on clearance & duty' }
                              ].map(item => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => toggleProfitFlag(item.id)}
                                    className={`cursor-pointer border rounded-lg p-3 transition-all ${config.profitFlags[item.id] ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                                  >
                                      <div className="flex items-center justify-between mb-1">
                                          <span className={`text-sm font-semibold ${config.profitFlags[item.id] ? 'text-purple-700' : 'text-slate-600'}`}>{item.label}</span>
                                          {config.profitFlags[item.id] ? <CheckCircle className="w-4 h-4 text-purple-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                                      </div>
                                      <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* MODE B: FIXED MARKUP */}
                  {config.pricingMethod === 'fixed_unit_markup' && (
                       <div className="animate-in fade-in slide-in-from-top-1">
                          <p className="text-xs text-slate-500 mb-2">Set fixed markup percentage for each Term (Calculated on Total Cost at that stage):</p>
                          <div className="grid grid-cols-2 gap-3">
                              {[
                                  { id: 'exw', label: 'EXW Markup' },
                                  { id: 'fob', label: 'FOB Markup' },
                                  { id: 'cif', label: 'CIF Markup' },
                                  { id: 'ddp', label: 'DDP Markup' }
                              ].map(item => (
                                  <div key={item.id} className="border border-purple-200 bg-purple-50/50 rounded-lg p-3">
                                      <label className="text-xs font-semibold text-purple-800 block mb-1">{item.label}</label>
                                      <div className="flex items-center gap-2 bg-white rounded border border-purple-200 px-2">
                                          <input 
                                              type="number"
                                              value={(config.termMultipliers as any)?.[item.id] || 0}
                                              onChange={(e) => setConfig({
                                                  ...config, 
                                                  termMultipliers: {
                                                      ...config.termMultipliers, 
                                                      [item.id]: parseFloat(e.target.value) || 0
                                                  } as any
                                              })}
                                              className="w-full py-1.5 text-sm outline-none font-bold text-slate-700"
                                          />
                                          <span className="text-xs font-bold text-purple-400">%</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <div className="mt-3 text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-200">
                               <span className="font-bold">Formula:</span> Sell Price = Total Cost * (1 + Markup%)
                          </div>
                       </div>
                  )}

              </div>
          </div>
      </div>

      {/* 4. SCENARIO ANALYSIS TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Scenario Analysis (Aggregate)
              </h2>
              <div className="flex gap-1">
                   {['EXW', 'FCA', 'FOB', 'CIF', 'DDP'].map(term => (
                       <button 
                        key={term} 
                        onClick={() => toggleScenarioTerm(term)}
                        className={`text-xs px-2 py-1 rounded border ${visibleScenarioTerms.includes(term) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}
                       >
                           {term}
                       </button>
                   ))}
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[1000px]">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-2">Incoterm</th>
                          <th className="px-4 py-2 text-right">Unit Cost</th>
                          <th className="px-4 py-2 text-right text-green-600">Unit Profit</th>
                          <th className="px-4 py-2 text-right bg-slate-100/50">Unit Price</th>
                          <th className="px-4 py-2 text-right">Markup %</th>
                          <th className="px-4 py-2 text-right">Margin %</th>
                          <th className="px-4 py-2 text-right text-slate-400">Total Profit</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {calculations.breakdown.filter(b => visibleScenarioTerms.includes(b.term)).map((row) => {
                          const mColor = row.profitMargin >= 20 ? 'text-emerald-600' : row.profitMargin >= 10 ? 'text-amber-600' : 'text-red-500';
                          const mBorder = row.profitMargin >= 20 ? 'border-l-emerald-400' : row.profitMargin >= 10 ? 'border-l-amber-400' : 'border-l-red-400';
                          const termBadge: Record<string, string> = { EXW: 'bg-slate-100 text-slate-700', FCA: 'bg-blue-50 text-blue-700', FOB: 'bg-indigo-50 text-indigo-700', CIF: 'bg-violet-50 text-violet-700', DDP: 'bg-emerald-50 text-emerald-700' };
                          return (
                          <tr key={row.term} className={`hover:bg-slate-50/80 border-l-4 ${mBorder} transition-colors`}>
                              <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${termBadge[row.term] || 'bg-slate-100 text-slate-700'}`}>{row.term}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 font-mono text-sm">{formatMoney(row.unitCost, config.outputCurrency)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-600 font-mono text-sm">{formatMoney(row.unitProfit, config.outputCurrency)}</td>
                              <td className="px-4 py-3 text-right font-bold text-blue-600 bg-blue-50/30 font-mono">{formatMoney(row.unitSell, config.outputCurrency)}</td>
                              <td className="px-4 py-3 text-right text-slate-600 text-sm">{row.markupPercent.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(row.profitMargin * 3, 100)}%`, background: row.profitMargin >= 20 ? '#10b981' : row.profitMargin >= 10 ? '#f59e0b' : '#ef4444' }} />
                                      </div>
                                      <span className={`text-sm font-semibold w-10 text-right ${mColor}`}>{row.profitMargin.toFixed(1)}%</span>
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-600 font-bold font-mono">{formatMoney(row.totalProfit, config.outputCurrency)}</td>
                          </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* ===== 5. VISUAL ANALYTICS ===== */}
      {(() => {
        const segColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
        const exwRow = calculations.breakdown.find(b => b.term === 'EXW');
        const fobRow = calculations.breakdown.find(b => b.term === 'FOB');
        const ddpRow = calculations.breakdown.find(b => b.term === 'DDP');
        const grandCost = exwRow?.totalCost || 0;
        const grandRevenue = ddpRow?.totalSell || fobRow?.totalSell || 0;
        const grandProfit = fobRow?.totalProfit || 0;
        const margin = fobRow?.profitMargin || 0;
        const costs = calculations.costs;
        const grandTotalCost = costs.exw + costs.fob_inc + costs.cif_inc + costs.ddp_inc;
        const costSegments = [
          { label: 'Product Cost', value: costs.exw, color: '#3b82f6' },
          { label: 'Inland & Port', value: costs.fob_inc, color: '#f59e0b' },
          { label: 'Freight & Ins.', value: costs.cif_inc, color: '#8b5cf6' },
          { label: 'Dest. & Duty', value: costs.ddp_inc, color: '#ef4444' },
        ].filter(s => s.value > 0);
        const activeProducts = calculations.processedProducts.filter(p => p.isActive && p.qty > 0);
        const totalFillPct = containerCapacity > 0 ? Math.min((calculations.totalQty / containerCapacity) * 100, 100) : 0;
        const containersNeeded = containerCapacity > 0 ? Math.ceil(calculations.totalQty / containerCapacity) : 0;
        const lastContainerFill = containerCapacity > 0 && calculations.totalQty > 0
          ? (calculations.totalQty % containerCapacity !== 0
              ? (calculations.totalQty % containerCapacity) / containerCapacity * 100
              : 100)
          : 0;
        const remainingInLast = containerCapacity > 0 && calculations.totalQty > 0 && calculations.totalQty % containerCapacity !== 0
          ? containerCapacity - (calculations.totalQty % containerCapacity)
          : 0;
        let cumFill = 0;
        const productFills = activeProducts.map((p, i) => {
          const share = calculations.totalQty > 0 ? p.qty / calculations.totalQty : 0;
          const pct = share * totalFillPct;
          const r = { id: p.id, name: p.name || `Item ${i + 1}`, qty: p.qty, pct, color: segColors[i % segColors.length] };
          cumFill += pct;
          return r;
        });
        return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Cost (EXW)', value: formatMoney(grandCost, config.outputCurrency), sub: 'Products only', color: 'bg-gradient-to-br from-slate-600 to-slate-800', icon: <DollarSign className="w-5 h-5 opacity-80" /> },
                { label: 'Revenue (DDP)', value: formatMoney(grandRevenue, config.outputCurrency), sub: 'Best-case sell', color: 'bg-gradient-to-br from-blue-500 to-blue-700', icon: <BarChart3 className="w-5 h-5 opacity-80" /> },
                { label: 'Profit (FOB)', value: formatMoney(grandProfit, config.outputCurrency), sub: `${margin.toFixed(1)}% margin`, color: margin >= 20 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : margin >= 10 ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-red-500 to-red-700', icon: <PieChart className="w-5 h-5 opacity-80" /> },
                { label: 'Total Units', value: calculations.totalQty.toLocaleString(), sub: `${activeProducts.length} active products`, color: 'bg-gradient-to-br from-violet-500 to-violet-700', icon: <Package className="w-5 h-5 opacity-80" /> },
              ].map((card, i) => (
                <div key={i} className={`${card.color} rounded-xl p-4 text-white shadow-lg`}>
                  <div className="mb-2">{card.icon}</div>
                  <div className="text-xl font-bold truncate">{card.value}</div>
                  <div className="text-sm font-medium mt-1 opacity-90">{card.label}</div>
                  <div className="text-xs mt-0.5 opacity-60">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Cost Breakdown + Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Cost Structure Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                  <PieChart className="w-4 h-4 text-purple-500" />
                  Cost Structure (Full DDP)
                </h2>
                {grandTotalCost > 0 ? (
                  <div className="space-y-4">
                    <div className="relative h-9 rounded-lg overflow-hidden flex bg-slate-100 shadow-inner">
                      {costSegments.map((seg, i) => {
                        const pct = (seg.value / grandTotalCost) * 100;
                        return (
                          <div key={i} style={{ width: `${pct}%`, background: seg.color }} className="relative h-full" title={`${seg.label}: ${formatMoney(seg.value, config.outputCurrency)}`}>
                            {pct > 8 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-2.5">
                      {costSegments.map((seg, i) => {
                        const pct = (seg.value / grandTotalCost) * 100;
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                              <span className="text-sm text-slate-600">{seg.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: seg.color }} />
                              </div>
                              <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                              <span className="text-sm font-semibold text-slate-700 w-28 text-right font-mono">{formatMoney(seg.value, config.outputCurrency)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between">
                      <span className="text-sm text-slate-500 font-medium">Total DDP Cost</span>
                      <span className="font-bold text-slate-800 font-mono">{formatMoney(grandTotalCost, config.outputCurrency)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm italic">Add products to see cost structure</div>
                )}
              </div>

              {/* Shipping Container Visualization */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-cyan-500" />
                    Container Load Calculator
                  </h2>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(['20ft', '40ft'] as const).map(ct => (
                      <button key={ct} onClick={() => setContainerType(ct)} className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${containerType === ct ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{ct}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-xs text-slate-500 whitespace-nowrap font-medium">Units per {containerType}:</label>
                  <input
                    type="number"
                    value={containerCapacity}
                    onChange={(e) => setContainerCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none font-mono"
                  />
                  <span className="text-xs text-slate-400">/ {calculations.totalQty.toLocaleString()} total</span>
                </div>
                {/* Container Box */}
                <div className="relative w-full h-28 rounded-lg overflow-hidden border-[3px] border-slate-500 bg-slate-100" style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)' }}>
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-slate-300/40" style={{ left: `${(i + 1) * 10}%` }} />
                  ))}
                  <div className="absolute bottom-0 left-0 top-0 flex">
                    {productFills.map((pf) => (
                      <div key={pf.id} style={{ width: `${pf.pct}%`, background: pf.color, opacity: 0.82, minWidth: pf.pct > 0 ? '2px' : 0 }} title={`${pf.name}: ${pf.qty.toLocaleString()} units`} className="h-full transition-all duration-500" />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/85 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center shadow-md">
                      <div className="text-lg font-bold text-slate-800">{lastContainerFill.toFixed(0)}%</div>
                      <div className="text-[10px] text-slate-500">{containersNeeded > 1 ? `last of ${containersNeeded} containers` : `fill of ${containerType}`}</div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 bottom-0 w-5 border-l-2 border-slate-400 bg-slate-200/60 flex flex-col justify-between items-center py-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <div className="w-1 h-6 bg-slate-400 rounded-full" />
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2">
                    <div className="text-lg font-bold text-cyan-700">{containersNeeded || 0}</div>
                    <div className="text-[10px] text-cyan-500 font-medium">Containers</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                    <div className="text-lg font-bold text-slate-700">{containerCapacity.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Cap / unit</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                    <div className="text-lg font-bold text-slate-700">{remainingInLast.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Space left</div>
                  </div>
                </div>
                {productFills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {productFills.map(pf => (
                      <div key={pf.id} className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pf.color }} />
                        <span className="text-[10px] text-slate-600 truncate max-w-[80px]">{pf.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{pf.qty.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderCatalog = () => {
    // --- DICTIONARY FOR TRANSLATIONS ---
    const dict = {
        en: {
            productList: "Product List",
            collection: "Selected Collection",
            price: "Price",
            moq: "MOQ",
            pack: "Pack",
            contact: "Contact Us",
            priceUnit: "Unit Price",
            pricePack: "Pack Price",
            pcs: "pcs",
            phone: "Phone",
            email: "Email",
            website: "Website",
            rights: "All Rights Reserved.",
            clickToReplace: "Click to replace",
            uploadCover: "Upload Cover Photo",
            highQuality: "High Quality Recommended"
        },
        fa: {
            productList: "لیست محصولات",
            collection: "مجموعه منتخب",
            price: "قیمت",
            moq: "حداقل سفارش",
            pack: "بسته",
            contact: "تماس با ما",
            priceUnit: "قیمت واحد",
            pricePack: "قیمت بسته",
            pcs: "عدد",
            phone: "تلفن",
            email: "ایمیل",
            website: "وبسایت",
            rights: "تمامی حقوق محفوظ است.",
            clickToReplace: "کلیک برای تغییر",
            uploadCover: "آپلود تصویر کاور",
            highQuality: "کیفیت بالا توصیه می شود"
        },
        ar: {
            productList: "قائمة المنتجات",
            collection: "المجموعة المختارة",
            price: "السعر",
            moq: "الحد الأدنى للطلب",
            pack: "عبوة",
            contact: "اتصل بنا",
            priceUnit: "سعر الوحدة",
            pricePack: "سعر العبوة",
            pcs: "قطعة",
            phone: "هاتف",
            email: "بريد إلكتروني",
            website: "موقع الكتروني",
            rights: "جميع الحقوق محفوظة.",
            clickToReplace: "انقر للاستبدال",
            uploadCover: "تحميل صورة الغلاف",
            highQuality: "يوصى بجودة عالية"
        }
    };

    // Helper to join languages
    const tCombined = (key: keyof typeof dict['en']) => {
        return catalogConfig.languages.map(lang => dict[lang][key]).join(' / ');
    };

    // Toggle Language Helper
    const toggleLanguage = (lang: 'en' | 'fa' | 'ar') => {
        const current = catalogConfig.languages;
        if (current.includes(lang)) {
            // Don't allow removing the last language
            if (current.length > 1) {
                setCatalogConfig({ 
                    ...catalogConfig, 
                    languages: current.filter(l => l !== lang) 
                });
            }
        } else {
            // Add language (sort en first, then others if needed, or just append)
            const order = ['en', 'fa', 'ar'];
            const newLangs = [...current, lang].sort((a,b) => order.indexOf(a) - order.indexOf(b));
            setCatalogConfig({ ...catalogConfig, languages: newLangs as any });
        }
    };

    // Toggle Product Inclusion Helper
    const toggleProductInclusion = (productId: number) => {
        const current = catalogConfig.includedProductIds || [];
        // If empty, it means "All Included". So if we toggle one, we must initialize the array with everything EXCEPT that one.
        if (current.length === 0) {
            // Initialize with all other active products
            const allActiveIds = calculations.processedProducts.filter(p => p.isActive && p.id !== productId).map(p => p.id);
            setCatalogConfig({ ...catalogConfig, includedProductIds: allActiveIds });
        } else {
            if (current.includes(productId)) {
                setCatalogConfig({ ...catalogConfig, includedProductIds: current.filter(id => id !== productId) });
            } else {
                setCatalogConfig({ ...catalogConfig, includedProductIds: [...current, productId] });
            }
        }
    };
    
    // Check if product is selected
    const isProductIncluded = (id: number) => {
        return !catalogConfig.includedProductIds || catalogConfig.includedProductIds.length === 0 || catalogConfig.includedProductIds.includes(id);
    };

    const selectAllProducts = () => {
         setCatalogConfig({ ...catalogConfig, includedProductIds: [] });
    };

    // Grid CSS class generator based on density
    const getGridClass = () => {
        const n = catalogConfig.itemsPerPage || 4;
        // Strict grid rows for equal height distribution
        if (n <= 2) return "grid-cols-1 grid-rows-2";
        if (n <= 4) return "grid-cols-2 grid-rows-2";
        return "grid-cols-2 grid-rows-3";
    };

    return (
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)]">
          {/* SIDEBAR CONTROLS (Hide in Print) */}
          <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-4 flex-shrink-0 print:hidden space-y-6">
              <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <LayoutTemplate className="w-4 h-4 text-blue-600" />
                      Catalog Design
                  </h3>
                  
                  <div className="space-y-4">
                      {/* Labels & Units */}
                       <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <Ruler className="w-3 h-3" /> Labels & Units
                          </label>
                          <div className="space-y-2">
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Global Unit (replaces 'pcs')</label>
                                   <input 
                                      type="text" 
                                      value={catalogConfig.baseUnit || ''} 
                                      onChange={(e) => setCatalogConfig({...catalogConfig, baseUnit: e.target.value})} 
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" 
                                      placeholder="e.g. kg, box, m" 
                                   />
                              </div>
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">MOQ Label</label>
                                   <input 
                                      type="text" 
                                      value={catalogConfig.moqLabel || ''} 
                                      onChange={(e) => setCatalogConfig({...catalogConfig, moqLabel: e.target.value})} 
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" 
                                      placeholder={`Default: ${tCombined('moq')}`}
                                   />
                              </div>
                          </div>
                      </div>

                      {/* Language Selector */}
                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <Languages className="w-3 h-3" /> Languages
                          </label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                              {[
                                  { code: 'en', label: 'English' },
                                  { code: 'fa', label: 'فارسی' },
                                  { code: 'ar', label: 'العربية' }
                              ].map(lang => (
                                  <button
                                      key={lang.code}
                                      onClick={() => toggleLanguage(lang.code as any)}
                                      className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${catalogConfig.languages.includes(lang.code as any) ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {lang.label}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* Cover Text Inputs in Sidebar */}
                      <div className="pt-2 pb-2 border-b border-slate-100">
                          <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                              <Type className="w-3 h-3" /> Cover Text
                          </h3>
                          <div className="space-y-3">
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Header Brand</label>
                                   <input type="text" value={catalogConfig.coverHeaderText} onChange={(e) => setCatalogConfig({...catalogConfig, coverHeaderText: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Empty to remove" />
                              </div>
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Header Year</label>
                                   <input type="text" value={catalogConfig.coverYearText} onChange={(e) => setCatalogConfig({...catalogConfig, coverYearText: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Empty to remove" />
                              </div>
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Collection Tag</label>
                                   <input type="text" value={catalogConfig.collectionText} onChange={(e) => setCatalogConfig({...catalogConfig, collectionText: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="e.g. 2025 COLLECTION" />
                              </div>
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Title</label>
                                   <input type="text" value={catalogConfig.title} onChange={(e) => setCatalogConfig({...catalogConfig, title: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Main Title"/>
                              </div>
                              <div className="space-y-1">
                                   <label className="text-[10px] text-slate-400 font-medium">Subtitle</label>
                                   <input type="text" value={catalogConfig.subtitle} onChange={(e) => setCatalogConfig({...catalogConfig, subtitle: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Subtitle" />
                              </div>
                          </div>
                      </div>
                      
                      {/* Cover Style */}
                       <div className="pt-2 pb-2 border-b border-slate-100">
                          <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                              <Sparkles className="w-3 h-3" /> Cover Style
                          </h3>
                          <div className="space-y-3">
                              <div className="space-y-1">
                                 <div className="flex justify-between">
                                    <label className="text-[10px] text-slate-400 font-medium">Overlay Opacity</label>
                                    <span className="text-[10px] text-slate-600">{catalogConfig.coverOverlayOpacity ?? 60}%</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={catalogConfig.coverOverlayOpacity ?? 60} 
                                    onChange={(e) => setCatalogConfig({...catalogConfig, coverOverlayOpacity: parseInt(e.target.value)})}
                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                 />
                              </div>

                              <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={catalogConfig.showCoverLines !== false} 
                                          onChange={(e) => setCatalogConfig({...catalogConfig, showCoverLines: e.target.checked})}
                                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-xs font-medium text-slate-700">Show Lines</span>
                                  </label>
                                  <div className="flex items-center gap-1">
                                      <label className="text-[10px] text-slate-400">Line Color</label>
                                      <input 
                                         type="color" 
                                         value={catalogConfig.coverLineColor || '#ffffff'}
                                         onChange={(e) => setCatalogConfig({...catalogConfig, coverLineColor: e.target.value})}
                                         className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                      />
                                  </div>
                              </div>
                              
                              {/* Cover Contact Toggle */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                              type="checkbox" 
                                              checked={catalogConfig.showCoverContact !== false} 
                                              onChange={(e) => setCatalogConfig({...catalogConfig, showCoverContact: e.target.checked})}
                                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span className="text-xs font-medium text-slate-700">Show Contact Info</span>
                                      </label>
                                  </div>
                                  {catalogConfig.showCoverContact !== false && (
                                     <div className="space-y-1 pl-5">
                                         <label className="text-[10px] text-slate-400 font-medium">Contact Title</label>
                                         <input 
                                            type="text" 
                                            value={catalogConfig.coverContactTitle || ''}
                                            onChange={(e) => setCatalogConfig({...catalogConfig, coverContactTitle: e.target.value})} 
                                            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" 
                                            placeholder={`Default: ${tCombined('contact')}`} 
                                          />
                                     </div>
                                  )}
                              </div>
                          </div>
                      </div>


                      {/* Layout Options */}
                      <div>
                           <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <LayoutGrid className="w-3 h-3" /> Grid Density (Items/Page)
                          </label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                              {[2, 4, 6].map(n => (
                                  <button
                                      key={n}
                                      onClick={() => setCatalogConfig({...catalogConfig, itemsPerPage: n})}
                                      className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${catalogConfig.itemsPerPage === n ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {n} Items
                                  </button>
                              ))}
                          </div>
                          
                          <div className="mt-3 space-y-2">
                               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-md border border-slate-200">
                                  <input 
                                      type="checkbox" 
                                      checked={catalogConfig.showGroupCovers || false} 
                                      onChange={(e) => setCatalogConfig({...catalogConfig, showGroupCovers: e.target.checked})}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-medium text-slate-700">Show Group Covers</span>
                               </label>
                          </div>
                      </div>

                      {/* Price Settings */}
                      <div>
                           <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Price Display
                          </label>
                          
                          <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                              {['unit', 'pack', 'both'].map(m => (
                                  <button
                                      key={m}
                                      onClick={() => setCatalogConfig({...catalogConfig, priceBasis: m as any})}
                                      className={`flex-1 py-1 text-[10px] uppercase font-medium rounded-md transition-all ${catalogConfig.priceBasis === m ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {m}
                                  </button>
                              ))}
                          </div>

                          <div className="flex flex-wrap gap-1">
                              {['EXW', 'FCA', 'FOB', 'CIF', 'DDP'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => toggleCatalogTerm(t)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border ${catalogConfig.priceTerms.includes(t) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* Product Selector */}
                      <div>
                           <div className="flex justify-between items-center mb-2">
                               <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3" /> Select Products
                                </label>
                                <button onClick={selectAllProducts} className="text-[10px] text-blue-600 hover:underline">Select All</button>
                           </div>
                           <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                               {calculations.processedProducts.filter(p => p.isActive).map(p => (
                                   <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                       <input 
                                          type="checkbox" 
                                          checked={isProductIncluded(p.id)}
                                          onChange={() => toggleProductInclusion(p.id)}
                                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                       />
                                       <span className="text-xs text-slate-700 truncate">{p.name}</span>
                                   </label>
                               ))}
                           </div>
                      </div>

                      {/* Colors */}
                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <Palette className="w-3 h-3" /> Colors
                          </label>
                          <div className="flex gap-2">
                             <div className="flex-1">
                                 <label className="text-[10px] text-slate-400 mb-1 block">Cover Bg</label>
                                 <input 
                                     type="color" 
                                     value={catalogConfig.coverColor || '#0f172a'}
                                     onChange={(e) => setCatalogConfig({...catalogConfig, coverColor: e.target.value})}
                                     className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                 />
                             </div>
                             <div className="flex-1">
                                 <label className="text-[10px] text-slate-400 mb-1 block">Primary</label>
                                 <input 
                                     type="color" 
                                     value={catalogConfig.primaryColor}
                                     onChange={(e) => setCatalogConfig({...catalogConfig, primaryColor: e.target.value})}
                                     className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                 />
                             </div>
                             <div className="flex-1">
                                 <label className="text-[10px] text-slate-400 mb-1 block">Pages</label>
                                 <input 
                                     type="color" 
                                     value={catalogConfig.backgroundColor}
                                     onChange={(e) => setCatalogConfig({...catalogConfig, backgroundColor: e.target.value})}
                                     className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                 />
                             </div>
                          </div>
                      </div>

                      {/* Cover Image Upload */}
                      <div>
                           <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Cover Image
                          </label>
                          {catalogConfig.coverImage ? (
                               <div className="relative border border-slate-200 rounded-lg overflow-hidden group">
                                   <img src={catalogConfig.coverImage} className="w-full h-32 object-cover opacity-90" alt="Cover Preview" />
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button 
                                          onClick={() => setCatalogConfig({...catalogConfig, coverImage: ''})} 
                                          className="text-white bg-red-600 p-2 rounded-full hover:bg-red-700 shadow-lg"
                                          title="Remove Cover Image"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                               </div>
                          ) : (
                              <div className="group relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleCatalogCoverUpload} 
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <p className="text-xs font-medium text-slate-600 flex flex-col items-center justify-center gap-2">
                                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors"/> 
                                      <span>{tCombined('uploadCover')}</span>
                                  </p>
                              </div>
                          )}
                      </div>
                      
                      {/* --- EXTRA PAGES SECTION --- */}
                      <div className="pt-6 border-t border-slate-200">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                              <Layers className="w-4 h-4 text-blue-600" />
                              Extra Content
                          </h3>
                          
                          <div className="space-y-4">
                              {/* About Us */}
                              <div className="space-y-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={catalogConfig.showAboutUs || false} onChange={(e) => setCatalogConfig({...catalogConfig, showAboutUs: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500"/>
                                      <span className="text-xs font-semibold text-slate-700">About Us Page</span>
                                  </label>
                                  {catalogConfig.showAboutUs && (
                                      <textarea 
                                          rows={4} 
                                          value={catalogConfig.aboutUsText || ''} 
                                          onChange={(e) => setCatalogConfig({...catalogConfig, aboutUsText: e.target.value})} 
                                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none focus:border-blue-500 outline-none" 
                                          placeholder="Company history, mission, vision..."
                                      />
                                  )}
                              </div>

                              {/* Company Photos */}
                              <div className="space-y-2">
                                   <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={catalogConfig.showCompanyPhotos || false} onChange={(e) => setCatalogConfig({...catalogConfig, showCompanyPhotos: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500"/>
                                      <span className="text-xs font-semibold text-slate-700">Company Gallery</span>
                                  </label>
                                  {catalogConfig.showCompanyPhotos && (
                                      <div>
                                          <div className="flex flex-wrap gap-2 mb-2">
                                              {(catalogConfig.companyPhotos || []).map((img, i) => (
                                                  <div key={i} className="w-12 h-12 relative group/del">
                                                      <img src={img} className="w-full h-full object-cover rounded border" alt=""/>
                                                      <button 
                                                        onClick={() => setCatalogConfig({...catalogConfig, companyPhotos: (catalogConfig.companyPhotos || []).filter((_, idx) => idx !== i)})}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/del:opacity-100 transition-opacity"
                                                      ><X className="w-2 h-2"/></button>
                                                  </div>
                                              ))}
                                          </div>
                                          <label className="cursor-pointer text-blue-600 hover:underline text-xs flex items-center gap-1">
                                              <Plus className="w-3 h-3"/> Add Photos
                                              <input type="file" multiple accept="image/*" className="hidden" onChange={handleCompanyPhotosUpload} />
                                          </label>
                                      </div>
                                  )}
                              </div>

                              {/* CUSTOM PAGES BUILDER */}
                              <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center justify-between">
                                    <span>Custom Pages</span>
                                    <button onClick={handleAddSection} className="text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/> Add</button>
                                </label>
                                <div className="space-y-2">
                                    {(catalogConfig.sections || []).map((section, idx) => (
                                        <div key={section.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                                            <span className="font-medium truncate flex-1">{section.title}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingSection(section)} className="p-1 text-slate-400 hover:text-blue-600" title="Edit"><Edit3 className="w-3 h-3"/></button>
                                                <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3"/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(catalogConfig.sections || []).length === 0 && (
                                        <p className="text-[10px] text-slate-400 italic">No custom pages added.</p>
                                    )}
                                </div>
                              </div>
                          </div>
                      </div>

                  </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      Contact Info
                  </h3>
                  <div className="space-y-3">
                      <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Phone</label>
                          <input type="text" value={catalogConfig.contactPhone} onChange={(e) => setCatalogConfig({...catalogConfig, contactPhone: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Email</label>
                          <input type="text" value={catalogConfig.contactEmail} onChange={(e) => setCatalogConfig({...catalogConfig, contactEmail: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Website</label>
                          <input type="text" value={catalogConfig.website || ''} onChange={(e) => setCatalogConfig({...catalogConfig, website: e.target.value})} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Address (Back Cover)</label>
                          <textarea 
                              rows={2}
                              value={catalogConfig.contactAddress || ''} 
                              onChange={(e) => setCatalogConfig({...catalogConfig, contactAddress: e.target.value})} 
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none focus:border-blue-500 outline-none" 
                              placeholder="Full Address..."
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Footer Text (Copyright)</label>
                          <input 
                              type="text" 
                              value={catalogConfig.footerText || ''} 
                              onChange={(e) => setCatalogConfig({...catalogConfig, footerText: e.target.value})} 
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                              placeholder="e.g. Company Name © 2025" 
                          />
                      </div>
                      
                      {/* Social Links */}
                      <div className="pt-2">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] text-slate-500 font-medium">Social Media</label>
                              <button onClick={addSocial} className="text-[10px] text-blue-600 hover:underline">+ Add</button>
                          </div>
                          <div className="space-y-2">
                              {(catalogConfig.socialLinks || []).map(link => (
                                  <div key={link.id} className="flex gap-1 items-center">
                                      <select 
                                          value={link.platform}
                                          onChange={(e) => updateSocial(link.id, 'platform', e.target.value)}
                                          className="text-[10px] w-20 bg-slate-50 border border-slate-200 rounded px-1 py-1"
                                      >
                                          <option value="instagram">Instagram</option>
                                          <option value="whatsapp">WhatsApp</option>
                                          <option value="linkedin">LinkedIn</option>
                                          <option value="facebook">Facebook</option>
                                          <option value="youtube">YouTube</option>
                                          <option value="twitter">X (Twitter)</option>
                                          <option value="telegram">Telegram</option>
                                          <option value="website">Website</option>
                                      </select>
                                      <input 
                                          type="text" 
                                          placeholder="Handle/URL"
                                          value={link.handle}
                                          onChange={(e) => updateSocial(link.id, 'handle', e.target.value)}
                                          className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1"
                                      />
                                      <button onClick={() => removeSocial(link.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-slate-200 print:hidden">
                  <button 
                      onClick={() => window.print()} 
                      className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                      <Printer className="w-4 h-4" />
                      Print / Save as PDF
                  </button>
              </div>
          </div>

          {/* MAIN PREVIEW AREA */}
          <div className="flex-1 bg-slate-100 overflow-y-auto p-3 md:p-8 print:p-0" id="catalog-preview">
              <div 
                  className="max-w-[210mm] mx-auto bg-white shadow-lg min-h-[297mm] print:shadow-none print:w-full print:h-full print:max-w-none"
                  style={{ backgroundColor: catalogConfig.backgroundColor, color: catalogConfig.textColor }}
              >
                  {/* --- PAGE 1: COVER --- */}
                  <div className="w-full h-[297mm] relative flex flex-col print-page overflow-hidden">
                      {catalogConfig.coverImage ? (
                          <div className="absolute inset-0 z-0">
                              <img src={catalogConfig.coverImage} className="w-full h-full object-cover" alt="Cover" />
                              <div 
                                className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" 
                                style={{ opacity: (catalogConfig.coverOverlayOpacity !== undefined ? catalogConfig.coverOverlayOpacity : 60) / 100 }}
                              ></div>
                          </div>
                      ) : (
                          <div 
                              className="absolute inset-0 z-0" 
                              style={{ backgroundColor: catalogConfig.coverColor || '#0f172a' }}
                          >
                              <div 
                                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"
                                style={{ opacity: (catalogConfig.coverOverlayOpacity !== undefined ? catalogConfig.coverOverlayOpacity : 10) / 100 }}
                              ></div>
                          </div>
                      )}
                      
                      <div className="relative z-10 h-full flex flex-col justify-between p-16 text-white">
                           {/* Top Brand Mark */}
                           <div className="flex justify-between items-start pt-8" style={{ 
                               borderTopWidth: catalogConfig.showCoverLines !== false ? '4px' : '0',
                               borderColor: catalogConfig.coverLineColor || catalogConfig.primaryColor 
                           }}>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold tracking-[0.3em] uppercase opacity-80 min-h-[1.25rem]">
                                        {catalogConfig.coverHeaderText}
                                    </h3>
                                    {catalogConfig.showCoverLines !== false && (
                                        <div className="w-12 h-1 opacity-50" style={{ backgroundColor: catalogConfig.coverLineColor || 'white' }}></div>
                                    )}
                                </div>
                                <div className="text-right opacity-60 font-mono text-xs">
                                     {catalogConfig.coverYearText}
                                </div>
                           </div>

                          {/* Main Title Block */}
                          <div className="space-y-6 max-w-3xl">
                               <input 
                                  value={catalogConfig.collectionText || ''}
                                  onChange={(e) => setCatalogConfig({...catalogConfig, collectionText: e.target.value})}
                                  className="bg-transparent text-2xl md:text-3xl tracking-[0.2em] font-light uppercase w-full outline-none placeholder-white/40 border-b border-transparent focus:border-white/30 transition-colors pb-2"
                                  placeholder="COLLECTION NAME"
                              />
                               <textarea 
                                  value={catalogConfig.title}
                                  onChange={(e) => setCatalogConfig({...catalogConfig, title: e.target.value})}
                                  rows={2}
                                  className="bg-transparent text-6xl md:text-8xl font-black tracking-tight w-full outline-none placeholder-white/40 leading-[0.9] resize-none overflow-hidden"
                                  placeholder="TITLE"
                              />
                              <input 
                                  value={catalogConfig.subtitle}
                                  onChange={(e) => setCatalogConfig({...catalogConfig, subtitle: e.target.value})}
                                  className="bg-transparent text-xl md:text-2xl font-light w-full outline-none placeholder-white/40 opacity-90"
                                  placeholder="Subtitle text goes here"
                              />
                          </div>

                          {/* Footer Contact */}
                          {catalogConfig.showCoverContact !== false && (
                            <div className="flex flex-col items-end pb-8" style={{ 
                                    borderBottomWidth: catalogConfig.showCoverLines !== false ? '4px' : '0', 
                                    borderColor: catalogConfig.coverLineColor || catalogConfig.primaryColor 
                            }}>
                                <div className="text-right space-y-1">
                                    <h3 className="text-lg font-bold mb-2 tracking-wide uppercase">
                                        {catalogConfig.coverContactTitle || tCombined('contact')}
                                    </h3>
                                    <p className="text-sm font-light tracking-wide opacity-90">{catalogConfig.contactEmail}</p>
                                    <p className="text-sm font-light tracking-wide opacity-90">{catalogConfig.website}</p>
                                </div>
                            </div>
                          )}
                      </div>
                  </div>
                  
                  {/* --- EXTRA PAGE: ABOUT US --- */}
                  {catalogConfig.showAboutUs && (
                      <div className="w-full h-[297mm] print-page p-16 flex flex-col relative overflow-hidden bg-white text-slate-800">
                           <h2 className="text-4xl font-bold uppercase tracking-wider mb-8" style={{ color: catalogConfig.primaryColor }}>About Us</h2>
                           <div className="text-lg leading-relaxed whitespace-pre-line text-slate-600">
                               {catalogConfig.aboutUsText || "Company description goes here..."}
                           </div>
                           {/* Decoration */}
                           <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10" style={{ backgroundColor: catalogConfig.primaryColor, borderRadius: '100% 0 0 0' }}></div>
                      </div>
                  )}

                  {/* --- CUSTOM SECTIONS (BEFORE PRODUCTS) --- */}
                  {(catalogConfig.sections || []).filter(s => s.position === 'before').map((section) => (
                       <div key={section.id} className="w-full h-[297mm] print-page p-16 flex flex-col relative overflow-hidden bg-white text-slate-800">
                           <h2 className="text-4xl font-bold uppercase tracking-wider mb-8" style={{ color: catalogConfig.primaryColor }}>{section.title}</h2>
                           
                           <div style={{ textAlign: section.alignment, whiteSpace: 'pre-wrap' }} className="text-lg leading-relaxed text-slate-600">
                               {section.content}
                           </div>
                           
                           {/* Render Images based on Layout */}
                           {(section.images && section.images.length > 0) || section.image ? (
                               <div className={`mt-8 grid gap-4 ${
                                   section.imageLayout === 'two-column' ? 'grid-cols-2' : 
                                   section.imageLayout === 'three-column' ? 'grid-cols-3' : 
                                   section.imageLayout === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 
                                   'grid-cols-1'
                               }`}>
                                   {/* Backward Compatibility: render 'image' if 'images' is empty */}
                                   {(section.images || [section.image!]).map((img, idx) => (
                                       <div key={idx} className="flex justify-center">
                                            <img src={img} className="w-full object-contain rounded-lg shadow-sm max-h-[40vh]" alt="" />
                                       </div>
                                   ))}
                               </div>
                           ) : null}

                           <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10" style={{ backgroundColor: catalogConfig.primaryColor, borderRadius: '100% 0 0 0' }}></div>
                       </div>
                  ))}


                  {/* --- PRODUCTS LOOP --- */}
                  {paginatedGroups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                        {/* GROUP COVER PAGE (Only if enabled and group has name) */}
                        {catalogConfig.showGroupCovers && group.name && (
                             <div 
                                className="w-full h-[297mm] relative flex flex-col items-center justify-center print-page"
                                style={{ backgroundColor: catalogConfig.primaryColor }}
                             >
                                 <div className="text-center p-12 border-y-2 border-white/20 w-full max-w-2xl">
                                     <h2 className="text-6xl font-bold text-white uppercase tracking-widest mb-4 drop-shadow-md">
                                         {group.name}
                                     </h2>
                                     <p className="text-white/70 text-lg uppercase tracking-wider">{catalogConfig.collectionText}</p>
                                 </div>
                             </div>
                        )}

                        {/* PRODUCT PAGES FOR THIS GROUP */}
                        {group.pages.map((pageItems, pageIdx) => (
                            <div key={`${gIdx}-${pageIdx}`} className="w-full h-[297mm] print:h-[297mm] p-6 print:p-6 flex flex-col relative overflow-hidden print-page">
                                
                                {/* Header for Group on Product Pages (if not covered by Group Cover, or for every page) */}
                                {group.name && (
                                    <div className="flex-shrink-0 mb-3 pb-2 border-b-2 flex justify-between items-end" style={{ borderColor: catalogConfig.primaryColor }}>
                                        <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: catalogConfig.primaryColor }}>
                                            {group.name}
                                        </h2>
                                        <span className="text-[10px] font-bold text-slate-400">PAGE {pageIdx + 1}</span>
                                    </div>
                                )}
                                
                                {/* Grid Content - Fills Height */}
                                <div className={`flex-1 min-h-0 grid gap-3 ${getGridClass()}`}>
                                    {pageItems.map((p) => {
                                        // Use global base unit if defined, otherwise product override, otherwise translation default
                                        const displayUnit = p.measurementUnit || catalogConfig.baseUnit || tCombined('pcs');

                                        return (
                                        <div 
                                            key={p.id} 
                                            className="flex flex-col h-full min-h-0 overflow-hidden break-inside-avoid shadow-sm rounded-xl bg-white border border-slate-100"
                                        >
                                            <div className="flex-1 min-h-0 w-full bg-slate-50 overflow-hidden border-b border-slate-100 relative group/img-wrapper">
                                                {p.image ? (
                                                    <img src={p.image} className="w-full h-full object-contain mix-blend-multiply p-6" alt={p.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <ImageIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                                {p.group && !catalogConfig.showGroupCovers && !group.name && (
                                                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                                                        {p.group}
                                                    </span>
                                                )}
                                                
                                                {/* QUICK EDIT OVERLAY ON IMAGE HOVER */}
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img-wrapper:opacity-100 transition-opacity flex items-center justify-center print:hidden pointer-events-none">
                                                    <span className="bg-white/90 text-slate-700 text-xs px-2 py-1 rounded shadow-sm backdrop-blur-sm pointer-events-auto cursor-pointer flex items-center gap-1" onClick={() => setEditingCatalogDetailsId(p.id)}>
                                                        <Edit3 className="w-3 h-3" /> Edit Details
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 p-3 relative group/card-info">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="w-full pr-6">
                                                        <h3 className={`font-bold leading-tight ${catalogConfig.itemsPerPage === 6 ? 'text-xs md:text-sm' : 'text-sm md:text-lg'}`} style={{ color: catalogConfig.primaryColor }}>{p.catalogName || p.name}</h3>
                                                        {p.hsCode && <p className="text-[10px] opacity-60 font-mono mt-1 text-slate-500">HS: {p.hsCode}</p>}
                                                    </div>
                                                    {/* Quick Edit Icon */}
                                                    <button 
                                                        onClick={() => setEditingCatalogDetailsId(p.id)}
                                                        className="absolute top-3 right-3 p-1 text-slate-300 hover:text-blue-600 print:hidden opacity-0 group-hover/card-info:opacity-100 transition-opacity"
                                                        title="Edit Details"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-2 mt-2 text-sm opacity-80">
                                                    {p.catalogDescription && (catalogConfig.itemsPerPage || 4) <= 4 && (
                                                        <div className="max-h-[3.5em] overflow-hidden">
                                                            <p className="whitespace-pre-line leading-tight text-[10px] text-slate-600 line-clamp-3">{p.catalogDescription}</p>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                        {(p.itemsPerPack && p.itemsPerPack > 0) ? (
                                                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                <span className="text-slate-500">{tCombined('pack')}:</span>
                                                                <span className="font-bold text-slate-700">{p.itemsPerPack} {displayUnit}</span>
                                                            </div>
                                                        ) : null}
                                                        {catalogConfig.showMOQ && (
                                                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                <span className="text-slate-500">{catalogConfig.moqLabel || tCombined('moq')}:</span>
                                                                <span className="font-bold text-slate-700">{p.catalogMOQ || `${formatNumber(p.qty)}`}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {catalogConfig.showPrices && (
                                                        <div className="mt-2 pt-2 border-t-2 border-slate-100 space-y-1">
                                                            {catalogConfig.priceTerms.map(term => {
                                                                const prices = p.scenarioPrices; 
                                                                const packPrices = p.scenarioPackPrices;
                                                                if (!prices) return null;
                                                                
                                                                const uPrice = formatMoney(prices[term] || 0, config.outputCurrency);
                                                                const pPrice = formatMoney(packPrices?.[term] || 0, config.outputCurrency);
                                                                
                                                                return (
                                                                    <div key={term} className="flex justify-between items-end py-0.5">
                                                                        <span className="font-bold text-[10px] px-2 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: catalogConfig.primaryColor }}>{term}</span>
                                                                        <div className="text-right">
                                                                            {(catalogConfig.priceBasis === 'unit' || catalogConfig.priceBasis === 'both') && (
                                                                                <span className="font-bold block text-xs md:text-sm text-slate-800">{uPrice} <span className="text-[9px] font-normal text-slate-400 uppercase">/{displayUnit}</span></span>
                                                                            )}
                                                                            {(catalogConfig.priceBasis === 'pack' || catalogConfig.priceBasis === 'both') && (
                                                                                <span className="font-bold block text-xs md:text-sm text-slate-800 mt-0.5">{pPrice} <span className="text-[9px] font-normal text-slate-400 uppercase">/pack</span></span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </React.Fragment>
                  ))}
                  
                  {/* --- CUSTOM SECTIONS (AFTER PRODUCTS) --- */}
                  {(catalogConfig.sections || []).filter(s => s.position === 'after').map((section) => (
                       <div key={section.id} className="w-full h-[297mm] print-page p-16 flex flex-col relative overflow-hidden bg-white text-slate-800">
                           <h2 className="text-4xl font-bold uppercase tracking-wider mb-8" style={{ color: catalogConfig.primaryColor }}>{section.title}</h2>
                           
                           <div style={{ textAlign: section.alignment, whiteSpace: 'pre-wrap' }} className="text-lg leading-relaxed text-slate-600">
                               {section.content}
                           </div>
                           
                           {/* Render Images based on Layout */}
                           {(section.images && section.images.length > 0) || section.image ? (
                               <div className={`mt-8 grid gap-4 ${
                                   section.imageLayout === 'two-column' ? 'grid-cols-2' : 
                                   section.imageLayout === 'three-column' ? 'grid-cols-3' : 
                                   section.imageLayout === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 
                                   'grid-cols-1'
                               }`}>
                                   {/* Backward Compatibility: render 'image' if 'images' is empty */}
                                   {(section.images || [section.image!]).map((img, idx) => (
                                       <div key={idx} className="flex justify-center">
                                            <img src={img} className="w-full object-contain rounded-lg shadow-sm max-h-[40vh]" alt="" />
                                       </div>
                                   ))}
                               </div>
                           ) : null}

                           <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10" style={{ backgroundColor: catalogConfig.primaryColor, borderRadius: '100% 0 0 0' }}></div>
                       </div>
                  ))}

                  {/* --- EXTRA PAGE: GALLERY --- */}
                  {catalogConfig.showCompanyPhotos && (catalogConfig.companyPhotos || []).length > 0 && (
                      <div className="w-full h-[297mm] print-page p-8 flex flex-col relative overflow-hidden bg-white">
                           <h2 className="text-2xl font-bold uppercase tracking-wider mb-6 pb-4 border-b" style={{ borderColor: catalogConfig.primaryColor, color: catalogConfig.primaryColor }}>Gallery</h2>
                           <div className="grid grid-cols-2 gap-4 auto-rows-fr h-full">
                               {(catalogConfig.companyPhotos || []).slice(0, 4).map((img, i) => (
                                   <div key={i} className="rounded-xl overflow-hidden shadow-sm border border-slate-100">
                                       <img src={img} className="w-full h-full object-cover" alt="" />
                                   </div>
                               ))}
                           </div>
                      </div>
                  )}

                  {/* --- BACK COVER --- */}
                  <div 
                      className="w-full h-[297mm] relative flex flex-col justify-center items-center text-center p-16 print-page text-white overflow-hidden"
                      style={{ backgroundColor: catalogConfig.primaryColor }}
                  >
                      {/* ... (existing back cover content) ... */}
                      <h2 className="text-4xl font-bold mb-8">{tCombined('contact')}</h2>
                      
                      <div className="space-y-6 text-lg">
                           <div>
                               <p className="opacity-60 text-sm uppercase tracking-widest mb-1">{tCombined('phone')}</p>
                               <p className="font-semibold">{catalogConfig.contactPhone}</p>
                           </div>
                           <div>
                               <p className="opacity-60 text-sm uppercase tracking-widest mb-1">{tCombined('email')}</p>
                               <p className="font-semibold">{catalogConfig.contactEmail}</p>
                           </div>
                           <div>
                               <p className="opacity-60 text-sm uppercase tracking-widest mb-1">{tCombined('website')}</p>
                               <p className="font-semibold">{catalogConfig.website}</p>
                           </div>
                           {catalogConfig.contactAddress && (
                               <div>
                                   <p className="opacity-60 text-sm uppercase tracking-widest mb-1">Address</p>
                                   <p className="font-semibold whitespace-pre-line">{catalogConfig.contactAddress}</p>
                               </div>
                           )}
                      </div>

                      <div className="flex gap-4 mt-12">
                          {(catalogConfig.socialLinks || []).map(link => (
                               link.handle && (
                                   <div key={link.id} className="flex flex-col items-center gap-2">
                                       <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                           {getSocialIcon(link.platform, "w-5 h-5")}
                                       </div>
                                       <span className="text-xs opacity-70">{link.handle}</span>
                                   </div>
                               )
                          ))}
                      </div>

                      <div className="absolute bottom-12 text-xs opacity-40">
                          {catalogConfig.footerText}
                      </div>
                  </div>
              </div>
          </div>

          {/* CATALOG DETAILS EDIT MODAL */}
          {editingCatalogDetailsId !== null && (
              <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">Edit Catalog Details</h3>
                          <button onClick={() => setEditingCatalogDetailsId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="p-4 space-y-4">
                          {(() => {
                              const p = products.find(prod => prod.id === editingCatalogDetailsId);
                              if (!p) return null;
                              return (
                                  <>
                                      <div>
                                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Catalog Display Name (Optional)</label>
                                          <input 
                                              type="text" 
                                              value={p.catalogName || p.name} 
                                              onChange={(e) => updateProduct(p.id, 'catalogName', e.target.value)} 
                                              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                              placeholder="Overrides standard name"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Key Features / Description</label>
                                          <textarea 
                                              rows={4} 
                                              value={p.catalogDescription || ''} 
                                              onChange={(e) => updateProduct(p.id, 'catalogDescription', e.target.value)} 
                                              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 resize-none"
                                              placeholder="Enter key features, material details, etc."
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Custom MOQ Value</label>
                                          <input 
                                              type="text" 
                                              value={p.catalogMOQ || ''} 
                                              onChange={(e) => updateProduct(p.id, 'catalogMOQ', e.target.value)} 
                                              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                              placeholder={`Default: ${formatNumber(p.qty)}`}
                                          />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                           <div>
                                              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Override Unit</label>
                                              <input 
                                                  type="text" 
                                                  value={p.measurementUnit || ''} 
                                                  onChange={(e) => updateProduct(p.id, 'measurementUnit', e.target.value)} 
                                                  className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                                  placeholder="e.g. kg (overrides global)"
                                              />
                                          </div>
                                      </div>

                                      <div className="pt-2 flex justify-end">
                                          <button onClick={() => setEditingCatalogDetailsId(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Done</button>
                                      </div>
                                  </>
                              );
                          })()}
                      </div>
                  </div>
              </div>
          )}

          {/* CUSTOM SECTION EDITOR MODAL */}
          {editingSection !== null && (
            <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                      <h3 className="font-bold text-slate-800">Edit Custom Page</h3>
                      <button onClick={() => setEditingSection(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Page Title</label>
                              <input 
                                type="text" 
                                value={editingSection.title} 
                                onChange={(e) => setEditingSection({...editingSection, title: e.target.value})} 
                                className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Position</label>
                              <div className="flex bg-slate-100 p-1 rounded-md">
                                  <button onClick={() => setEditingSection({...editingSection, position: 'before'})} className={`flex-1 py-1.5 text-xs font-medium rounded ${editingSection.position === 'before' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Before Products</button>
                                  <button onClick={() => setEditingSection({...editingSection, position: 'after'})} className={`flex-1 py-1.5 text-xs font-medium rounded ${editingSection.position === 'after' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>After Products</button>
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Content Alignment</label>
                          <div className="flex gap-2">
                              {[
                                  { id: 'left', icon: AlignLeft },
                                  { id: 'center', icon: AlignCenter },
                                  { id: 'right', icon: AlignRight },
                                  { id: 'justify', icon: AlignJustify }
                              ].map(align => (
                                  <button 
                                    key={align.id}
                                    onClick={() => setEditingSection({...editingSection, alignment: align.id as any})}
                                    className={`p-2 rounded border ${editingSection.alignment === align.id ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                  >
                                      <align.icon className="w-4 h-4" />
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Body Text</label>
                          <textarea 
                              rows={8} 
                              value={editingSection.content} 
                              onChange={(e) => setEditingSection({...editingSection, content: e.target.value})} 
                              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 resize-none"
                              placeholder="Enter your content here..."
                          />
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-2">
                               <label className="text-xs font-semibold text-slate-500 uppercase">Photos & Layout</label>
                               <select 
                                  value={editingSection.imageLayout || 'single'} 
                                  onChange={(e) => setEditingSection({...editingSection, imageLayout: e.target.value as any})}
                                  className="text-xs border border-slate-300 rounded px-2 py-1 outline-none"
                               >
                                   <option value="single">Single Column (Stacked)</option>
                                   <option value="two-column">2 Columns</option>
                                   <option value="three-column">3 Columns</option>
                                   <option value="grid">Grid (Auto)</option>
                               </select>
                          </div>
                          
                          {/* Image Gallery */}
                          <div className="grid grid-cols-4 gap-2 mb-2">
                              {(editingSection.images || (editingSection.image ? [editingSection.image] : [])).map((img, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                      <img src={img} className="w-full h-full object-cover" alt="" />
                                      <button 
                                        onClick={() => handleRemoveSectionImage(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <X className="w-3 h-3" />
                                      </button>
                                  </div>
                              ))}
                              
                              <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                                  <span className="text-[10px] text-slate-500 text-center">Add Photos</span>
                                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleSectionMultiImageUpload(e, editingSection)} />
                              </label>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">* Images are reordered automatically based on selection.</p>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setEditingSection(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button 
                        onClick={() => { handleUpdateSection(editingSection); setEditingSection(null); }} 
                        className="px-6 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm"
                      >
                          Save Changes
                      </button>
                  </div>
               </div>
            </div>
          )}

          {/* NEW: IMPORT PRODUCTS MODAL (GRANULAR SELECTION) */}
          {showImportProductsModal && (
              <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[80vh]">
                      
                      {/* HEADER */}
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
                          <div className="flex items-center gap-2">
                              {importCandidateProject ? (
                                  <button 
                                      onClick={() => setImportCandidateProject(null)} 
                                      className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                  >
                                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                                  </button>
                              ) : null}
                              <h3 className="font-bold text-slate-800">
                                  {importCandidateProject ? `Select from ${importCandidateProject.name}` : 'Import Products'}
                              </h3>
                          </div>
                          <button onClick={() => { setShowImportProductsModal(false); setImportCandidateProject(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 overflow-y-auto p-4">
                          {!importCandidateProject ? (
                              /* VIEW 1: PROJECT LIST */
                              savedProjects.length === 0 ? (
                                  <p className="text-center text-slate-400 italic py-8">No saved projects found.</p>
                              ) : (
                                  <div className="space-y-2">
                                      {savedProjects.map(proj => (
                                          <div 
                                            key={proj.id} 
                                            onClick={() => handleOpenImportSelection(proj)}
                                            className="border border-slate-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                                          >
                                              <div className="flex justify-between items-center">
                                                  <div>
                                                      <h4 className="font-semibold text-slate-800 group-hover:text-blue-700">{proj.name}</h4>
                                                      <p className="text-xs text-slate-500">
                                                          {proj.data?.products?.length || 0} Products • {new Date((proj.createdAt?.seconds || 0) * 1000).toLocaleDateString()}
                                                      </p>
                                                  </div>
                                                  <Plus className="w-5 h-5 text-slate-300 group-hover:text-blue-600"/>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )
                          ) : (
                              /* VIEW 2: PRODUCT SELECTION */
                              <div className="space-y-3">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                          <input 
                                              type="checkbox"
                                              checked={importSelectedProductIds.length === (importCandidateProject.data.products?.length || 0)}
                                              onChange={(e) => {
                                                  if (e.target.checked) {
                                                      setImportSelectedProductIds((importCandidateProject.data.products || []).map(p => p.id));
                                                  } else {
                                                      setImportSelectedProductIds([]);
                                                  }
                                              }}
                                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          Select All
                                      </label>
                                      <span className="text-xs text-slate-500">{importSelectedProductIds.length} selected</span>
                                  </div>
                                  {(importCandidateProject.data.products || []).map(p => (
                                      <label key={p.id} className="flex items-center gap-3 p-2 border border-slate-100 rounded hover:bg-slate-50 cursor-pointer">
                                          <input 
                                              type="checkbox"
                                              checked={importSelectedProductIds.includes(p.id)}
                                              onChange={() => {
                                                  setImportSelectedProductIds(prev => 
                                                      prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                  );
                                              }}
                                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          {p.image ? <img src={p.image} className="w-8 h-8 object-cover rounded" alt="" /> : <div className="w-8 h-8 bg-slate-100 rounded" />}
                                          <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                              <p className="text-xs text-slate-500">{formatNumber(p.qty)} x {formatMoney(p.unitPrice, p.currency)}</p>
                                          </div>
                                      </label>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* FOOTER (Only for View 2) */}
                      {importCandidateProject && (
                          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 flex-shrink-0">
                              <button 
                                  onClick={() => setImportCandidateProject(null)} 
                                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
                              >
                                  Back
                              </button>
                              <button 
                                  onClick={handleFinalizeImport} 
                                  disabled={importSelectedProductIds.length === 0}
                                  className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                  Import {importSelectedProductIds.length} Items
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    );
  };

  const renderInvoice = () => (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
          {/* Controls */}
          <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto print:hidden">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/> Invoice Settings</h3>
               
               <div className="space-y-4">
                   <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input 
                               type="checkbox" 
                               checked={isInvoiceEditable} 
                               onChange={(e) => setIsInvoiceEditable(e.target.checked)}
                               className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                           />
                           <span className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">
                               <Pencil className="w-3 h-3" /> Manual Edit Mode
                           </span>
                       </label>
                       <p className="text-[10px] text-blue-600 leading-tight">Enable this to manually override quantities and prices directly in the invoice preview. Uncheck to revert to calculated values.</p>
                   </div>

                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Document Title</label>
                       <input type="text" value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5" />
                   </div>
                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>
                       <input type="text" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5" />
                   </div>
                   
                   <hr className="border-slate-100"/>

                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Seller Name (Billed From)</label>
                       <input type="text" value={billedFrom} onChange={(e) => setBilledFrom(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5" placeholder="Your Company Name" />
                   </div>
                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Seller Address/Country</label>
                       <textarea rows={3} value={billedFromDetails} onChange={(e) => setBilledFromDetails(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 resize-none" placeholder="Address, City, Country..." />
                   </div>
                   
                   <hr className="border-slate-100"/>

                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Buyer (Billed To)</label>
                       <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 mb-2" />
                       <textarea rows={3} placeholder="Address..." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 resize-none" />
                   </div>

                   <hr className="border-slate-100"/>

                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Terms to Show</label>
                       <div className="flex flex-wrap gap-1">
                           {['EXW', 'FCA', 'FOB', 'CIF', 'DDP'].map(t => (
                               <button 
                                key={t} 
                                onClick={() => toggleInvoiceTerm(t)}
                                className={`px-2 py-1 text-xs rounded border ${invoiceTerms.includes(t) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                               >
                                   {t}
                               </button>
                           ))}
                       </div>
                   </div>

                   <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Pricing Column Basis</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['unit', 'pack', 'both'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setInvoiceBasis(m as any)}
                                    className={`flex-1 py-1 text-xs capitalize font-medium rounded-md transition-all ${invoiceBasis === m ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                   </div>

                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Payment Terms</label>
                       <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5" />
                   </div>
                   
                   <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Payment / Bank Details</label>
                        <textarea rows={4} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none" placeholder="Bank Name..." />
                   </div>

                   <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Notes / Terms</label>
                        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none" placeholder="Additional Notes..." />
                   </div>

                   <div className="flex items-center gap-2 pt-2">
                       <input type="checkbox" checked={showImages} onChange={(e) => setShowImages(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                       <span className="text-sm text-slate-600">Show Product Images</span>
                   </div>

                   <button 
                      onClick={() => window.print()} 
                      className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                      <Printer className="w-4 h-4" /> Print Invoice
                  </button>
               </div>
          </div>

          {/* Invoice Preview */}
          <div className="flex-1 bg-gray-50 overflow-y-auto p-8 rounded-lg border border-slate-200 print:p-0 print:border-0 print:bg-white print:overflow-visible" id="invoice-preview">
               <div className="max-w-[210mm] mx-auto bg-white p-12 shadow-sm min-h-[297mm] print:shadow-none print:w-full print:max-w-none">
                   
                   {/* Header */}
                   <div className="flex justify-between items-start mb-12">
                       <div>
                           <h1 className="text-4xl font-bold text-slate-900 mb-2">{invoiceTitle}</h1>
                           <p className="text-slate-500 text-sm">#{invoiceRef}</p>
                           <p className="text-slate-500 text-sm">Date: {new Date().toLocaleDateString()}</p>
                       </div>
                       <div className="text-right">
                           <h2 className="text-lg font-bold text-slate-800">{billedFrom || 'Your Company Name'}</h2>
                           <div className="text-sm text-slate-600 whitespace-pre-line font-medium">{billedFromDetails || 'Address Line 1\nCountry'}</div>
                       </div>
                   </div>

                   {/* Bill To */}
                   <div className="mb-12 p-6 bg-slate-50 rounded-lg border border-slate-100 print:border print:bg-transparent">
                       <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</h3>
                       <h2 className="text-xl font-bold text-slate-800">{customerName || 'Customer Name'}</h2>
                       <p className="text-slate-600 whitespace-pre-line mt-1">{customerAddress || 'Customer Address...'}</p>
                   </div>

                   {/* Table */}
                   <table className="w-full mb-8">
                       <thead>
                           <tr className="border-b-2 border-slate-800">
                               <th className="py-3 text-left font-bold text-slate-800">Item</th>
                               {showImages && <th className="py-3 text-center font-bold text-slate-800 w-16">Image</th>}
                               
                               {/* QTY & PACKS based on Basis */}
                               <th className="py-3 text-center font-bold text-slate-800 w-16">Qty</th>
                               {(invoiceBasis === 'pack' || invoiceBasis === 'both') && (
                                   <th className="py-3 text-center font-bold text-slate-800 w-16">Packs</th>
                               )}

                               {/* PRICING TERMS */}
                               {invoiceTerms.map(term => (
                                   <React.Fragment key={term}>
                                       {/* Optional Unit Price Column */}
                                       {(invoiceBasis === 'unit' || invoiceBasis === 'both') && (
                                           <th className="py-3 text-right font-bold text-slate-800 w-24 hidden md:table-cell">{term} Unit</th>
                                       )}
                                       {/* Optional Pack Price Column */}
                                       {(invoiceBasis === 'pack' || invoiceBasis === 'both') && (
                                           <th className="py-3 text-right font-bold text-slate-800 w-24 hidden md:table-cell">{term} Pack</th>
                                       )}
                                       {/* Total Column */}
                                       <th className="py-3 text-right font-bold text-slate-800 w-32">{term} Total</th>
                                   </React.Fragment>
                               ))}
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                           {calculations.processedProducts.filter(p => p.isActive).map(p => {
                               const override = invoiceOverrides[p.id] || {};
                               const displayQty = isInvoiceEditable ? (override.qty ?? p.qty) : p.qty;
                               const displayPacks = (p.itemsPerPack && p.itemsPerPack > 0) ? displayQty / p.itemsPerPack : 0;

                               return (
                               <tr key={p.id}>
                                   <td className="py-4">
                                       <p className="font-bold text-slate-800">{p.name}</p>
                                       {p.hsCode && <p className="text-xs text-slate-500">HS: {p.hsCode}</p>}
                                   </td>
                                   {showImages && (
                                       <td className="py-4 text-center">
                                           {p.image ? <img src={p.image} className="w-10 h-10 object-cover rounded mx-auto" alt="" /> : <div className="w-10 h-10 bg-slate-100 rounded mx-auto" />}
                                       </td>
                                   )}
                                   
                                   <td className="py-4 text-center font-medium">
                                       {isInvoiceEditable ? (
                                           <input 
                                              type="number" 
                                              value={displayQty} 
                                              onChange={(e) => setInvoiceOverrides(prev => ({
                                                  ...prev, 
                                                  [p.id]: { ...prev[p.id], qty: parseFloat(e.target.value) || 0 }
                                              }))}
                                              className="w-16 text-center border border-blue-200 bg-blue-50/30 rounded py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                           />
                                       ) : formatNumber(p.qty)}
                                   </td>
                                   {(invoiceBasis === 'pack' || invoiceBasis === 'both') && (
                                       <td className="py-4 text-center text-slate-600">
                                           {isInvoiceEditable && p.itemsPerPack > 0 ? (
                                               <input 
                                                  type="number" 
                                                  value={displayPacks} 
                                                  onChange={(e) => {
                                                      const newPacks = parseFloat(e.target.value) || 0;
                                                      setInvoiceOverrides(prev => ({
                                                          ...prev, 
                                                          [p.id]: { ...prev[p.id], qty: newPacks * p.itemsPerPack }
                                                      }))
                                                  }}
                                                  className="w-16 text-center border border-blue-200 bg-blue-50/30 rounded py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                               />
                                           ) : formatNumber(displayPacks)}
                                       </td>
                                   )}
                                   
                                   {invoiceTerms.map(term => {
                                       const baseUnitPrice = p.scenarioPrices?.[term] || 0;
                                       const basePackPrice = p.scenarioPackPrices?.[term] || 0;
                                       
                                       const displayUnitPrice = isInvoiceEditable ? (override.unitPrices?.[term] ?? baseUnitPrice) : baseUnitPrice;
                                       const displayPackPrice = isInvoiceEditable ? (override.packPrices?.[term] ?? basePackPrice) : basePackPrice;
                                       const total = displayUnitPrice * displayQty;

                                       return (
                                           <React.Fragment key={term}>
                                               {(invoiceBasis === 'unit' || invoiceBasis === 'both') && (
                                                   <td className="py-4 text-right text-slate-600 hidden md:table-cell">
                                                       {isInvoiceEditable ? (
                                                           <input 
                                                              type="number" 
                                                              value={displayUnitPrice}
                                                              step="0.01"
                                                              onChange={(e) => setInvoiceOverrides(prev => {
                                                                  const curr = prev[p.id] || {};
                                                                  const prices = curr.unitPrices || {};
                                                                  return {
                                                                      ...prev,
                                                                      [p.id]: { ...curr, unitPrices: { ...prices, [term]: parseFloat(e.target.value) || 0 } }
                                                                  };
                                                              })}
                                                              className="w-20 text-right border border-blue-200 bg-blue-50/30 rounded py-1 px-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                           />
                                                       ) : formatMoney(displayUnitPrice, config.outputCurrency)}
                                                   </td>
                                               )}
                                               {(invoiceBasis === 'pack' || invoiceBasis === 'both') && (
                                                   <td className="py-4 text-right text-slate-600 hidden md:table-cell">
                                                       {isInvoiceEditable ? (
                                                           <input 
                                                              type="number" 
                                                              value={displayPackPrice}
                                                              step="0.01"
                                                              onChange={(e) => setInvoiceOverrides(prev => {
                                                                  const curr = prev[p.id] || {};
                                                                  const prices = curr.packPrices || {};
                                                                  return {
                                                                      ...prev,
                                                                      [p.id]: { ...curr, packPrices: { ...prices, [term]: parseFloat(e.target.value) || 0 } }
                                                                  };
                                                              })}
                                                              className="w-20 text-right border border-blue-200 bg-blue-50/30 rounded py-1 px-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                           />
                                                       ) : formatMoney(displayPackPrice, config.outputCurrency)}
                                                   </td>
                                               )}
                                               <td className="py-4 text-right font-medium">
                                                   {formatMoney(total, config.outputCurrency)}
                                               </td>
                                           </React.Fragment>
                                       );
                                   })}
                               </tr>
                               );
                           })}
                       </tbody>
                       <tfoot>
                           <tr className="border-t-2 border-slate-800">
                               <td className="pt-4 font-bold text-right" colSpan={
                                   1 // Item col
                                   + (showImages ? 1 : 0)
                                   + 1 // Qty col
                                   + ((invoiceBasis === 'pack' || invoiceBasis === 'both') ? 1 : 0) // Packs col
                                   + (invoiceTerms.length * ((invoiceBasis === 'both' ? 2 : 1))) // Pricing cols 
                                   - 1 // Adjust to align with last column
                               }>TOTALS:</td>
                               
                               {invoiceTerms.map(term => {
                                   const totalForTerm = calculations.processedProducts.filter(p => p.isActive).reduce((sum, p) => {
                                       const override = invoiceOverrides[p.id] || {};
                                       const qty = isInvoiceEditable ? (override.qty ?? p.qty) : p.qty;
                                       const price = isInvoiceEditable ? (override.unitPrices?.[term] ?? (p.scenarioPrices?.[term] || 0)) : (p.scenarioPrices?.[term] || 0);
                                       return sum + (price * qty);
                                   }, 0);

                                   return (
                                   <td key={term} className="pt-4 text-right font-bold text-lg" colSpan={invoiceBasis === 'both' ? 3 : 2}>
                                       {formatMoney(totalForTerm, config.outputCurrency)}
                                   </td>
                                   );
                               })}
                           </tr>
                       </tfoot>
                   </table>

                   <div className="grid grid-cols-2 gap-12 mt-12 page-break-inside-avoid">
                       <div>
                           <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Payment Details</h4>
                           <p className="text-sm text-slate-600 whitespace-pre-line">{bankDetails}</p>
                           <p className="text-sm text-slate-600 mt-2"><span className="font-semibold">Terms:</span> {paymentTerms}</p>
                       </div>
                       <div>
                           <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Notes</h4>
                           <p className="text-sm text-slate-600 whitespace-pre-line">{notes}</p>
                       </div>
                   </div>

                   <div className="mt-24 pt-8 border-t border-slate-200 flex justify-between items-end page-break-inside-avoid">
                       <div className="text-center w-48">
                           <div className="border-b border-slate-300 h-12 mb-2"></div>
                           <p className="text-xs text-slate-500 uppercase">Authorized Signature</p>
                       </div>
                       <p className="text-xs text-slate-400">Generated by CloudExport Pro</p>
                   </div>
               </div>
          </div>
      </div>
  );

  const renderPriceList = () => (
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)]">
          {/* PRICE LIST SETTINGS SIDEBAR */}
          <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-4 flex-shrink-0 print:hidden space-y-6">
              <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <List className="w-4 h-4 text-blue-600" />
                      Price List Settings
                  </h3>
                  
                  <div className="space-y-4">
                      {/* ... (price list sidebar content) ... */}
                      <div>
                           <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Titles</label>
                           <input 
                              type="text" 
                              value={priceListConfig.title} 
                              onChange={(e) => setPriceListConfig({...priceListConfig, title: e.target.value})} 
                              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 mb-2"
                              placeholder="Main Title"
                           />
                           <input 
                              type="text" 
                              value={priceListConfig.subtitle} 
                              onChange={(e) => setPriceListConfig({...priceListConfig, subtitle: e.target.value})} 
                              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
                              placeholder="Subtitle"
                           />
                      </div>

                      <hr className="border-slate-100"/>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Price Basis</label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['unit', 'pack', 'both'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setPriceListConfig({...priceListConfig, priceBasis: m as any})}
                                    className={`flex-1 py-1 text-xs capitalize font-medium rounded-md transition-all ${priceListConfig.priceBasis === m ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                          </div>
                      </div>

                      <div className="flex items-center gap-2">
                           <input 
                              type="checkbox" 
                              checked={priceListConfig.showImages} 
                              onChange={(e) => setPriceListConfig({...priceListConfig, showImages: e.target.checked})}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                           />
                           <span className="text-sm text-slate-600">Show Images</span>
                      </div>

                      <hr className="border-slate-100"/>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Terms to Show</label>
                          <div className="flex flex-wrap gap-1">
                              {['EXW', 'FCA', 'FOB', 'CIF', 'DDP'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => togglePriceListTerm(t)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border ${priceListConfig.terms.includes(t) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Footer / Terms</label>
                          <textarea 
                              rows={6} 
                              value={priceListConfig.footerText} 
                              onChange={(e) => setPriceListConfig({...priceListConfig, footerText: e.target.value})} 
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none"
                              placeholder="Terms and Conditions..."
                          />
                      </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-slate-200 print:hidden">
                  <button 
                      onClick={() => window.print()} 
                      className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                      <Printer className="w-4 h-4" />
                      Print
                  </button>
              </div>
          </div>
          
          {/* MAIN PREVIEW AREA */}
          <div className="flex-1 bg-white overflow-y-auto p-3 md:p-8 print:p-0 print:overflow-visible">
              <div className="max-w-[297mm] mx-auto print:w-full">
                  <div className="text-center mb-8">
                      <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider mb-2">{priceListConfig.title}</h1>
                      <h2 className="text-xl text-slate-500 font-light">{priceListConfig.subtitle}</h2>
                      <p className="text-sm text-slate-400 mt-2">Currency: {config.outputCurrency}</p>
                  </div>

                  <table className="w-full text-sm border-collapse border border-slate-200">
                      <thead className="bg-slate-100 print:bg-slate-100">
                          <tr>
                              <th className="border border-slate-300 px-4 py-2 text-left w-12">#</th>
                              {priceListConfig.showImages && <th className="border border-slate-300 px-4 py-2 text-center w-16">Img</th>}
                              <th className="border border-slate-300 px-4 py-2 text-left">Product</th>
                              <th className="border border-slate-300 px-4 py-2 text-left w-24">HS Code</th>
                              <th className="border border-slate-300 px-4 py-2 text-center w-24">Pack Qty</th>
                              {priceListConfig.terms.map(term => (
                                  <th key={term} className="border border-slate-300 px-4 py-2 text-right w-32 bg-slate-50">
                                      {term} 
                                      {priceListConfig.priceBasis === 'both' && <span className="block text-[9px] font-normal text-slate-500">(Unit / Pack)</span>}
                                      {priceListConfig.priceBasis === 'unit' && <span className="block text-[9px] font-normal text-slate-500">(Unit)</span>}
                                      {priceListConfig.priceBasis === 'pack' && <span className="block text-[9px] font-normal text-slate-500">(Pack)</span>}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody>
                          {calculations.processedProducts.filter(p => p.isActive).map((p, idx) => (
                              <tr key={p.id} className="even:bg-slate-50">
                                  <td className="border border-slate-200 px-4 py-2 text-slate-500">{idx + 1}</td>
                                  {priceListConfig.showImages && (
                                      <td className="border border-slate-200 px-2 py-2 text-center">
                                          {p.image ? <img src={p.image} className="w-8 h-8 object-cover mx-auto rounded" alt="" /> : <div className="w-8 h-8 bg-slate-100 rounded mx-auto" />}
                                      </td>
                                  )}
                                  <td className="border border-slate-200 px-4 py-2 font-medium">{p.name}</td>
                                  <td className="border border-slate-200 px-4 py-2 text-slate-500">{p.hsCode}</td>
                                  <td className="border border-slate-200 px-4 py-2 text-center">{p.itemsPerPack || '-'}</td>
                                  {priceListConfig.terms.map(term => {
                                      const uPrice = formatMoney(p.scenarioPrices?.[term] || 0, config.outputCurrency);
                                      const pPrice = formatMoney(p.scenarioPackPrices?.[term] || 0, config.outputCurrency);
                                      
                                      return (
                                          <td key={term} className="border border-slate-200 px-4 py-2 text-right font-mono font-medium">
                                              {priceListConfig.priceBasis === 'unit' && uPrice}
                                              {priceListConfig.priceBasis === 'pack' && pPrice}
                                              {priceListConfig.priceBasis === 'both' && (
                                                  <div className="flex flex-col">
                                                      <span>{uPrice}</span>
                                                      <span className="text-[10px] text-slate-400">{pPrice}</span>
                                                  </div>
                                              )}
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  
                  <div className="mt-8 text-xs text-slate-500 border-t border-slate-200 pt-4 whitespace-pre-line leading-relaxed">
                      <p className="font-bold mb-1">Terms & Conditions:</p>
                      {priceListConfig.footerText}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderSuppliers = () => (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {/* ... (existing suppliers content) ... */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Supplier Management
            </h2>
            <button onClick={() => setSuppliers([...suppliers, { id: Date.now(), name: 'New Supplier', contactInfo: '', address: '', notes: '', images: [], attachments: [] }])} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add Supplier
            </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(s => (
                <div key={s.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all group bg-white">
                    <div className="flex justify-between items-start mb-3">
                        <input 
                            value={s.name}
                            onChange={(e) => setSuppliers(suppliers.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                            className="font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full mr-2"
                            placeholder="Supplier Name"
                        />
                         <button onClick={() => setSuppliers(suppliers.filter(x => x.id !== s.id))} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Info</label>
                             <textarea 
                                value={s.contactInfo}
                                onChange={(e) => setSuppliers(suppliers.map(x => x.id === s.id ? { ...x, contactInfo: e.target.value } : x))}
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                                rows={2}
                                placeholder="Phone, Email, etc."
                             />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</label>
                             <textarea 
                                value={s.address}
                                onChange={(e) => setSuppliers(suppliers.map(x => x.id === s.id ? { ...x, address: e.target.value } : x))}
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                                rows={2}
                                placeholder="Full Address"
                             />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes</label>
                             <textarea 
                                value={s.notes}
                                onChange={(e) => setSuppliers(suppliers.map(x => x.id === s.id ? { ...x, notes: e.target.value } : x))}
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                                rows={3}
                                placeholder="Bank details, terms, etc."
                             />
                        </div>
                        
                         {/* Image Upload for Supplier */}
                        <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex justify-between">
                                <span>Photos</span>
                                <label className="cursor-pointer text-blue-600 hover:underline flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSupplierImageUpload(s.id, e)} />
                                </label>
                             </label>
                             <div className="flex gap-2 overflow-x-auto py-1">
                                 {(s.images && s.images.length > 0) ? (
                                     s.images.map((img, idx) => (
                                         <div key={idx} className="relative w-12 h-12 flex-shrink-0 group/img">
                                             <img src={img} className="w-full h-full object-cover rounded border border-slate-200" alt="" />
                                             <button 
                                                onClick={() => setSuppliers(suppliers.map(x => x.id === s.id ? { ...x, images: (x.images || []).filter((_, i) => i !== idx) } : x))}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                             >
                                                 <X className="w-2 h-2" />
                                             </button>
                                         </div>
                                     ))
                                 ) : (
                                     <span className="text-xs text-slate-400 italic">No photos</span>
                                 )}
                             </div>
                        </div>

                         {/* Documents / Attachments Upload */}
                        <div className="pt-2 border-t border-slate-50">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex justify-between">
                                <span>Attachments (PDF/Video)</span>
                                <label className="cursor-pointer text-blue-600 hover:underline flex items-center gap-1" title="Max 50MB">
                                    <Paperclip className="w-3 h-3" /> Add
                                    <input type="file" accept="application/pdf,video/*" className="hidden" onChange={(e) => handleSupplierAttachmentUpload(s.id, e)} />
                                </label>
                             </label>
                             <div className="space-y-1">
                                 {(s.attachments && s.attachments.length > 0) ? (
                                     s.attachments.map((att) => (
                                         <div key={att.id} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100 group/att">
                                             <a href={att.data} download={att.name} className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600 truncate flex-1" target="_blank" rel="noreferrer">
                                                 {att.type.startsWith('video') ? <Video className="w-3 h-3 text-purple-500 flex-shrink-0" /> : <FileIcon className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                                 <span className="truncate max-w-[140px]">{att.name}</span>
                                                 <span className="text-[9px] text-slate-400">({(att.size / (1024*1024)).toFixed(1)}MB)</span>
                                             </a>
                                             <button 
                                                onClick={() => deleteAttachment(s.id, att.id)}
                                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover/att:opacity-100 transition-opacity p-0.5"
                                             >
                                                 <X className="w-3 h-3" />
                                             </button>
                                         </div>
                                     ))
                                 ) : (
                                     <span className="text-xs text-slate-400 italic">No files (Max 50MB)</span>
                                 )}
                             </div>
                        </div>

                    </div>
                </div>
            ))}
            
            {suppliers.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No suppliers added yet.</p>
                </div>
            )}
        </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <style>{`
        @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            /* RESET MAIN CONTAINERS FOR PRINT */
            header, nav, aside, .print\\:hidden { display: none !important; }
            
            html, body, #root, main, .min-h-screen {
                height: auto !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                background: white !important;
            }
            
            /* Break flex/scroll layouts */
            div[class*="h-[calc(100vh-8rem)]"] {
                height: auto !important;
                display: block !important;
            }
            
            #catalog-preview, #invoice-preview, div.overflow-y-auto {
                height: auto !important;
                overflow: visible !important;
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }
            
            /* Catalog Page Control */
            .print-page {
                width: 210mm !important;
                height: 297mm !important; /* Enforce fixed height for A4 */
                margin: 0 !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important; 
                position: relative !important;
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
            }

            .break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            /* Hide placeholders and input borders in print */
            input::placeholder, textarea::placeholder {
                color: transparent !important;
            }
            input, textarea {
                border: none !important;
                box-shadow: none !important;
            }
        }
      `}</style>
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/20">
                        <Globe2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900">CloudExport Pro</h1>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Global Trade Calculator</p>
                    </div>
                </div>

                <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'invoice', label: 'Proforma Invoice', icon: FileText },
                        { id: 'pricelist', label: 'Price List', icon: List },
                        { id: 'catalog', label: 'Catalog Gen', icon: LayoutTemplate },
                        { id: 'suppliers', label: 'Suppliers', icon: Users },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === item.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                     <FolderOpen className="w-4 h-4 text-slate-400" />
                     {loadedProjectId ? (
                         <span className="text-sm font-medium text-slate-700">{projectName}</span>
                     ) : (
                         <span className="text-sm text-slate-400 italic">Unsaved Project</span>
                     )}
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <button onClick={() => setShowLoadModal(true)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Open Project">
                    <FolderOpen className="w-5 h-5" />
                </button>
                
                <button onClick={() => { setProjectName(projectName || 'New Project'); setShowSaveModal(true); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Save Project">
                    <Save className="w-5 h-5" />
                </button>

                <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Print / Save as PDF">
                    <Printer className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
                    {user.photoURL ? (
                        <img src={user.photoURL} className="w-8 h-8 rounded-full border border-slate-200" alt="User" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-200">
                            {user.email?.[0].toUpperCase() || 'U'}
                        </div>
                    )}
                    <button onClick={handleLogout} className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">Sign Out</button>
                </div>
            </div>
        </div>

        {user && isMasterUser && (
            <div className="px-4 pb-3">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-700">Master User Manager</span>
                    <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="New user email"
                        className="w-52 px-2.5 py-1.5 text-xs border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Temporary password"
                        className="w-44 px-2.5 py-1.5 text-xs border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleMasterCreateUser}
                        disabled={isCreatingUser}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                    >
                        {isCreatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Create User
                    </button>
                    {masterActionMessage && <span className="text-xs text-indigo-700">{masterActionMessage}</span>}
                </div>
            </div>
        )}

        <div className="md:hidden px-3 pb-3 space-y-2">
            <nav className="flex gap-2 overflow-x-auto">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'invoice', label: 'Invoice', icon: FileText },
                    { id: 'pricelist', label: 'Price List', icon: List },
                    { id: 'catalog', label: 'Catalog', icon: LayoutTemplate },
                    { id: 'suppliers', label: 'Suppliers', icon: Users },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id as any)}
                        className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${view === item.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setShowLoadModal(true)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium">
                    <FolderOpen className="w-4 h-4" />
                    Open
                </button>
                <button onClick={() => { setProjectName(projectName || 'New Project'); setShowSaveModal(true); }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
                    <Save className="w-4 h-4" />
                    Save
                </button>
                <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
                    <Printer className="w-4 h-4" />
                    Print
                </button>
            </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 print:p-0 print:max-w-none">
          {view === 'dashboard' && renderDashboard()}
          {view === 'invoice' && renderInvoice()}
          {view === 'pricelist' && renderPriceList()}
          {view === 'catalog' && renderCatalog()}
          {view === 'suppliers' && renderSuppliers()}
      </main>

      {/* --- MODALS --- */}
      
      {/* Save Modal */}
      {showSaveModal && (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Save Project</h3>
                      <p className="text-sm text-slate-500 mb-4">Save your calculation to access it later.</p>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Project Name</label>
                              <input 
                                  type="text" 
                                  value={projectName} 
                                  onChange={(e) => setProjectName(e.target.value)} 
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="e.g. Q1 Export Plan"
                                  autoFocus
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Folder (Optional)</label>
                              <div className="relative">
                                <input 
                                    type="text" 
                                    value={folderName} 
                                    onChange={(e) => setFolderName(e.target.value)} 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pl-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Dairy Products"
                                    list="folder-suggestions"
                                />
                                <Folder className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <datalist id="folder-suggestions">
                                    {uniqueFolders.map(f => <option key={f} value={f} />)}
                                </datalist>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 flex gap-3">
                          <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                          
                          {loadedProjectId && (
                              <button 
                                  onClick={() => handleSaveProject('update')} 
                                  disabled={isSaving}
                                  className="flex-1 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                              >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                                  Update
                              </button>
                          )}
                          
                          <button 
                              onClick={() => handleSaveProject('new')} 
                              disabled={isSaving}
                              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                          >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save New
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                      <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-800">Open Project</h3>
                          <div className="flex bg-white border border-slate-200 rounded-md p-0.5">
                               <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <FileUp className="w-4 h-4 text-blue-600" />
                                   <span className="text-xs font-medium text-slate-600">Import JSON</span>
                                   <input type="file" accept=".json" onChange={handleImportProject} className="hidden" />
                               </label>
                          </div>
                      </div>
                      <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                      {savedProjects.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                              <p>No saved projects found.</p>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              {/* Uncategorized */}
                              {groupedProjects.uncategorized.length > 0 && (
                                  <div>
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Uncategorized</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {groupedProjects.uncategorized.map(project => (
                                              <div key={project.id} onClick={() => handleLoadProject(project)} className="group bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:ring-1 hover:ring-blue-400 rounded-xl p-4 cursor-pointer transition-all relative">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div className="flex items-center gap-2">
                                                          <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                              <FileText className="w-5 h-5" />
                                                          </div>
                                                          <div>
                                                              <h4 className="font-semibold text-slate-800 line-clamp-1">{project.name}</h4>
                                                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {project.createdAt?.seconds ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                                       <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{project.data.config?.outputCurrency || 'USD'}</span>
                                                       <div className="flex gap-2">
                                                           <button onClick={(e) => handleExportProject(project, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Export JSON">
                                                               <Download className="w-4 h-4" />
                                                           </button>
                                                           <button onClick={(e) => requestDelete(project.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                               <Trash2 className="w-4 h-4" />
                                                           </button>
                                                       </div>
                                                  </div>
                                                  
                                                  {deleteConfirmId === project.id && (
                                                      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 z-10 animate-in fade-in zoom-in-95">
                                                          <p className="text-sm font-semibold text-red-600 mb-3">Delete this project?</p>
                                                          <div className="flex gap-2 w-full">
                                                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200">Cancel</button>
                                                              <button onClick={(e) => { e.stopPropagation(); confirmDelete(); }} className="flex-1 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 flex items-center justify-center gap-1">
                                                                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Confirm'}
                                                              </button>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Folders */}
                              {Object.entries(groupedProjects.groups).map(([folder, projects]) => (
                                  <div key={folder}>
                                      <div className="flex items-center gap-2 mb-3 px-1">
                                          <Folder className="w-4 h-4 text-slate-400" />
                                          <h4 className="text-sm font-bold text-slate-700">{folder}</h4>
                                          <span className="text-xs bg-slate-200 text-slate-600 px-1.5 rounded-full">{(projects as SavedProject[]).length}</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4 border-l-2 border-slate-200">
                                          {(projects as SavedProject[]).map(project => (
                                              <div key={project.id} onClick={() => handleLoadProject(project)} className="group bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:ring-1 hover:ring-blue-400 rounded-xl p-4 cursor-pointer transition-all relative">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div className="flex items-center gap-2">
                                                          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                              <FileText className="w-5 h-5" />
                                                          </div>
                                                          <div>
                                                              <h4 className="font-semibold text-slate-800 line-clamp-1">{project.name}</h4>
                                                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {project.createdAt?.seconds ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                                   <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                                       <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{project.data.config?.outputCurrency || 'USD'}</span>
                                                       <div className="flex gap-2">
                                                           <button onClick={(e) => handleExportProject(project, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Export JSON">
                                                               <Download className="w-4 h-4" />
                                                           </button>
                                                           <button onClick={(e) => requestDelete(project.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                               <Trash2 className="w-4 h-4" />
                                                           </button>
                                                       </div>
                                                  </div>

                                                  {deleteConfirmId === project.id && (
                                                      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 z-10 animate-in fade-in zoom-in-95">
                                                          <p className="text-sm font-semibold text-red-600 mb-3">Delete this project?</p>
                                                          <div className="flex gap-2 w-full">
                                                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200">Cancel</button>
                                                              <button onClick={(e) => { e.stopPropagation(); confirmDelete(); }} className="flex-1 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 flex items-center justify-center gap-1">
                                                                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Confirm'}
                                                              </button>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
