import type { BusinessKind } from './types';

/** نسخهٔ اسکیمای JSON — در خروجی AI و نمونه‌ها درج می‌شود */
export const BUSINESS_JSON_SCHEMA_VERSION = '1.0';

/**
 * راهنمای فیلدها (فارسی) — برای نمایش در UI و دادن به AI
 */
export function getBusinessJsonFieldGuideFa(): string {
  return `فرمت JSON مدیریت کسب‌وکار (نسخه ${BUSINESS_JSON_SCHEMA_VERSION})

═══ ساختار اصلی ═══
{
  "_schema": "cloudexport-business-v1",
  "business": { ... },      // پروفایل کسب‌وکار
  "items": [ ... ],           // اقلام (محصول، منو، ملک، خدمت)
  "scenarios": [ ... ],       // سناریو فروش/اجاره و سود
  "catalog": { ... }          // تنظیمات چاپ کاتالوگ
}

═══ business ═══
name (الزامی) | kind: restaurant | real_estate | retail | services | export | custom
description | defaultCurrency (IRR, USD, EUR, ...)
contactPhone | contactEmail | address | website | logoUrl

═══ items[] — هر آیتم ═══
name (الزامی) | sku | itemType: product | service | menu_item | property | rental_unit | package
category | unit | unitPrice | costPrice | currency | pricingModel
imageUrl (آدرس https تصویر) | notes | active (true/false)
customFields: { "کلید": "مقدار" }  — متراژ، اتاق، مواد حساسیت، ...

نام‌های جایگزین قیمت: price, salePrice, rent, amount
نام‌های جایگزین هزینه: cost, purchasePrice
لیست‌های جایگزین در ریشه: products, services, menu, properties

═══ scenarios[] ═══
name | globalDiscountPercent (0-100) | fixedCosts (هزینه ثابت ماهانه/دوره)
notes | lines[]:
  itemSku یا itemName (ارجاع به آیتم — بعد از import وصل می‌شود)
  qty | unitPriceOverride | discountPercent (0-100)

═══ catalog ═══
title | subtitle | showImages | showCostColumn | hidePrices | footerText | tagline

═══ نکات برای AI ═══
• همه قیمت‌ها عددی (بدون جداکننده یا با عدد خالص)
• imageUrl باید URL عمومی https باشد
• برای هر آیتم costPrice بگذارید تا سود در سناریو درست شود
• سناریوها را با itemSku هم‌نام با sku اقلام بنویسید
• دسته‌بندی category را برای کاتالوگ چاپی مرتب کنید`;
}

/** دستورالعمل آماده برای چت‌بات / AI */
export function buildBusinessAiPrompt(kind: BusinessKind, businessName?: string): string {
  const nameHint = businessName?.trim()
    ? `نام کسب‌وکار: «${businessName.trim()}»`
    : 'نام کسب‌وکار را خودت انتخاب کن (واقع‌گرایانه و فارسی).';
  const kindFa: Record<BusinessKind, string> = {
    restaurant: 'رستوران / کافه (منو، نوشیدنی، مواد، سناریوی فروش روزانه و ماهانه)',
    real_estate: 'املاک (فروش، اجاره، ملک با متراژ و عکس)',
    retail: 'خرده‌فروشی (کالا با SKU، موجودی، حاشیه سود)',
    services: 'خدمات (پکیج و تعرفه)',
    export: 'صادرات / عمده‌فروشی',
    custom: 'کسب‌وکار سفارشی',
  };

  return `تو یک دستیار تولید داده برای اپلیکیشن «مدیریت کسب‌وکار» هستی.
${nameHint}
نوع کسب‌وکار: ${kindFa[kind]}

فقط یک آبجکت JSON معتبر برگردان (بدون markdown و بدون توضیح اضافه) با این ساختار:

{
  "_schema": "cloudexport-business-v1",
  "_schemaVersion": "${BUSINESS_JSON_SCHEMA_VERSION}",
  "business": {
    "name": "...",
    "kind": "${kind}",
    "description": "...",
    "defaultCurrency": "IRR",
    "contactPhone": "",
    "contactEmail": "",
    "address": "",
    "website": "",
    "logoUrl": "https://..."
  },
  "items": [
    {
      "name": "...",
      "sku": "UNIQUE-001",
      "itemType": "...",
      "category": "...",
      "unit": "عدد",
      "unitPrice": 0,
      "costPrice": 0,
      "currency": "IRR",
      "pricingModel": "per_unit",
      "imageUrl": "https://...",
      "notes": "",
      "customFields": { "area_sqm": "120" }
    }
  ],
  "scenarios": [
    {
      "name": "سناریو خوش‌بینانه — ماه اول",
      "globalDiscountPercent": 0,
      "fixedCosts": 0,
      "notes": "هزینه‌های ثابت: اجاره، حقوق، ...",
      "lines": [
        { "itemSku": "UNIQUE-001", "qty": 100, "discountPercent": 5 }
      ]
    }
  ],
  "catalog": {
    "title": "کاتالوگ ...",
    "subtitle": "...",
    "showImages": true,
    "showCostColumn": false,
    "hidePrices": false,
    "footerText": "..."
  }
}

الزامات:
1) حداقل 8 آیتم متنوع در items با sku یکتا و imageUrl واقعی (Unsplash/Pexels یا URL نمونه https).
2) حداقل 2 سناریو با lines که itemSku دقیقاً با sku اقلام یکی باشد؛ qty و fixedCosts منطقی.
3) unitPrice و costPrice برای همه آیتم‌ها — حاشیه سود قابل فهم.
4) دسته‌بندی category منظم برای چاپ کاتالوگ.
5) فیلدهای اختصاصی نوع کسب‌وکار در customFields (مثلاً متراژ برای املاک، زمان آماده‌سازی برای منو).
6) متن‌ها فارسی و حرفه‌ای.

${getBusinessJsonFieldGuideFa()}`;
}

function sampleItemsRestaurant(): object[] {
  return [
    {
      name: 'پیتزا مارگاریتا — یک نفره',
      sku: 'MENU-PIZZA-01',
      itemType: 'menu_item',
      category: 'غذای اصلی',
      unit: 'پرس',
      unitPrice: 485000,
      costPrice: 195000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
      notes: 'خمیر دست‌ساز، پنیر موزارلا',
      customFields: { prep_minutes: '18', spicy: 'خیر', calories: '820' },
    },
    {
      name: 'چلوکباب کوبیده',
      sku: 'MENU-KB-02',
      itemType: 'menu_item',
      category: 'غذای اصلی',
      unit: 'پرس',
      unitPrice: 620000,
      costPrice: 268000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600',
      customFields: { prep_minutes: '25' },
    },
    {
      name: 'سالاد سزار',
      sku: 'MENU-SAL-03',
      itemType: 'menu_item',
      category: 'پیش‌غذا',
      unit: 'پرس',
      unitPrice: 285000,
      costPrice: 95000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600',
    },
    {
      name: 'نوشابه قوطی',
      sku: 'MENU-DR-04',
      itemType: 'menu_item',
      category: 'نوشیدنی',
      unit: 'عدد',
      unitPrice: 45000,
      costPrice: 18000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600',
    },
    {
      name: 'قهوه اسپرسو',
      sku: 'MENU-CF-05',
      itemType: 'menu_item',
      category: 'نوشیدنی',
      unit: 'فنجان',
      unitPrice: 75000,
      costPrice: 22000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    },
    {
      name: 'کیک شکلاتی',
      sku: 'MENU-DS-06',
      itemType: 'menu_item',
      category: 'دسر',
      unit: 'برش',
      unitPrice: 165000,
      costPrice: 58000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
    },
    {
      name: 'پکیج پذیرایی جلسه (۱۰ نفر)',
      sku: 'SVC-CAT-07',
      itemType: 'package',
      category: 'خدمات',
      unit: 'پکیج',
      unitPrice: 4500000,
      costPrice: 2800000,
      currency: 'IRR',
      pricingModel: 'fixed',
      imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600',
      notes: 'شامل نوشیدنی و شیرینی',
    },
    {
      name: 'مواد اولیه پنیر (کیلو)',
      sku: 'INV-RM-08',
      itemType: 'product',
      category: 'مواد اولیه',
      unit: 'کیلو',
      unitPrice: 0,
      costPrice: 385000,
      currency: 'IRR',
      pricingModel: 'per_unit',
      notes: 'فقط برای محاسبه هزینه — فروش مستقیم ندارد',
      active: false,
    },
  ];
}

function sampleItemsRealEstate(): object[] {
  return [
    {
      name: 'آپارتمان ۱۲۰ متری — ونک (فروش)',
      sku: 'PROP-SALE-01',
      itemType: 'property',
      category: 'فروش مسکونی',
      unit: 'واحد',
      unitPrice: 12500000000,
      costPrice: 11000000000,
      currency: 'IRR',
      pricingModel: 'fixed',
      imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
      customFields: {
        area_sqm: '120',
        bedrooms: '2',
        floor: '5',
        parking: '1',
        year_built: '1398',
      },
    },
    {
      name: 'واحد اداری ۸۵ متری — اجاره ماهانه',
      sku: 'PROP-RENT-02',
      itemType: 'rental_unit',
      category: 'اجاره تجاری',
      unit: 'ماه',
      unitPrice: 95000000,
      costPrice: 12000000,
      currency: 'IRR',
      pricingModel: 'per_month',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
      customFields: { area_sqm: '85', deposit_months: '2' },
    },
    {
      name: 'ویلا ۳۰۰ متری — شمال',
      sku: 'PROP-SALE-03',
      itemType: 'property',
      category: 'فروش ویلایی',
      unit: 'واحد',
      unitPrice: 28000000000,
      costPrice: 24500000000,
      currency: 'IRR',
      pricingModel: 'fixed',
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600',
      customFields: { area_sqm: '300', land_sqm: '500', bedrooms: '4' },
    },
    {
      name: 'پارکینگ اختصاصی',
      sku: 'PROP-PARK-04',
      itemType: 'rental_unit',
      category: 'اجاره',
      unit: 'ماه',
      unitPrice: 3500000,
      costPrice: 200000,
      currency: 'IRR',
      pricingModel: 'per_month',
      imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e8542b6?w=600',
    },
  ];
}

function sampleItemsGeneric(kind: BusinessKind): object[] {
  return [
    {
      name: 'محصول نمونه A',
      sku: 'PRD-001',
      itemType: 'product',
      category: 'خط اصلی',
      unit: 'عدد',
      unitPrice: 120,
      costPrice: 72,
      currency: 'USD',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
      customFields: { moq: '100', lead_time_days: '14' },
    },
    {
      name: 'خدمت مشاوره (ساعتی)',
      sku: 'SRV-002',
      itemType: 'service',
      category: 'خدمات',
      unit: 'ساعت',
      unitPrice: 85,
      costPrice: 35,
      currency: 'USD',
      pricingModel: 'per_unit',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
    },
    {
      name: 'پکیج طلایی',
      sku: 'PKG-003',
      itemType: 'package',
      category: 'پکیج',
      unit: 'ست',
      unitPrice: 2500,
      costPrice: 1400,
      currency: 'USD',
      pricingModel: 'fixed',
      imageUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600',
    },
  ];
}

function scenariosForSkus(
  skus: { sku: string; qty: number; discount?: number }[],
  name: string,
  fixedCosts: number,
  globalDiscount = 0,
): object {
  return {
    name,
    globalDiscountPercent: globalDiscount,
    fixedCosts,
    notes: 'هزینه ثابت شامل اجاره، حقوق، آب‌وهوا و بازاریابی',
    lines: skus.map((s) => ({
      itemSku: s.sku,
      qty: s.qty,
      discountPercent: s.discount ?? 0,
    })),
  };
}

/** نمونهٔ کامل برای وارد کردن یا دادن به AI */
export function buildFullBusinessSampleJson(kind: BusinessKind): string {
  const businessNames: Record<BusinessKind, string> = {
    restaurant: 'رستوران نمونه — برگر و پیتزا',
    real_estate: 'املاک نمونه — تهران',
    retail: 'فروشگاه نمونه',
    services: 'شرکت خدمات نمونه',
    export: 'صادرات نمونه',
    custom: 'کسب‌وکار نمونه',
  };

  let items: object[];
  let scenarios: object[];
  let catalog: object;

  if (kind === 'restaurant') {
    items = sampleItemsRestaurant();
    scenarios = [
      scenariosForSkus(
        [
          { sku: 'MENU-PIZZA-01', qty: 420, discount: 5 },
          { sku: 'MENU-KB-02', qty: 280 },
          { sku: 'MENU-SAL-03', qty: 150 },
          { sku: 'MENU-DR-04', qty: 900 },
          { sku: 'MENU-CF-05', qty: 600 },
          { sku: 'MENU-DS-06', qty: 120 },
          { sku: 'SVC-CAT-07', qty: 8 },
        ],
        'سناریو ماهانه — شلوغ',
        185000000,
        3,
      ),
      scenariosForSkus(
        [
          { sku: 'MENU-PIZZA-01', qty: 220 },
          { sku: 'MENU-KB-02', qty: 140 },
          { sku: 'MENU-DR-04', qty: 400 },
          { sku: 'MENU-CF-05', qty: 350 },
        ],
        'سناریو محافظه‌کارانه',
        185000000,
        0,
      ),
    ];
    catalog = {
      title: 'منوی رستوران نمونه',
      subtitle: 'غذای تازه · پذیرایی · دسر',
      showImages: true,
      showCostColumn: false,
      hidePrices: false,
      footerText: 'قیمت‌ها به تومان (IRR) — قابل تغییر بدون اطلاع قبلی',
      tagline: 'سفارش آنلاین و حضوری',
    };
  } else if (kind === 'real_estate') {
    items = sampleItemsRealEstate();
    scenarios = [
      scenariosForSkus(
        [{ sku: 'PROP-RENT-02', qty: 12 }, { sku: 'PROP-PARK-04', qty: 12 }],
        'درآمد اجاره سالانه (۱۲ ماه)',
        45000000,
      ),
      scenariosForSkus([{ sku: 'PROP-SALE-01', qty: 1 }], 'فروش یک واحد مسکونی', 85000000),
    ];
    catalog = {
      title: 'کاتالوگ املاک',
      subtitle: 'فروش و اجاره',
      showImages: true,
      showCostColumn: false,
      footerText: 'تماس برای بازدید — اطلاعات تقریبی',
    };
  } else {
    items = sampleItemsGeneric(kind);
    scenarios = [
      scenariosForSkus(
        [
          { sku: 'PRD-001', qty: 500, discount: 8 },
          { sku: 'SRV-002', qty: 40 },
          { sku: 'PKG-003', qty: 25 },
        ],
        'سناریو فروش فصلی',
        12000,
        5,
      ),
    ];
    catalog = {
      title: `کاتالوگ — ${businessNames[kind]}`,
      showImages: true,
      footerText: 'Export Collection',
    };
  }

  const payload = {
    _schema: 'cloudexport-business-v1',
    _schemaVersion: BUSINESS_JSON_SCHEMA_VERSION,
    _comment:
      'این فایل نمونه است. می‌توانید آن را به AI بدهید و بگویید: «برای کسب‌وکار X همین فرمت را پر کن».',
    business: {
      name: businessNames[kind],
      kind,
      description: 'توضیح کوتاه کسب‌وکار، مخاطب هدف و موقعیت',
      defaultCurrency: kind === 'export' ? 'USD' : kind === 'real_estate' || kind === 'restaurant' ? 'IRR' : 'USD',
      contactPhone: '+98-21-00000000',
      contactEmail: 'info@example.com',
      address: 'تهران، ایران',
      website: 'https://example.com',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200',
    },
    items,
    scenarios,
    catalog,
  };

  return JSON.stringify(payload, null, 2);
}

/** نمونهٔ کوتاه (همان قبلی) */
export function buildMinimalBusinessSampleJson(kind: BusinessKind): string {
  if (kind === 'restaurant') {
    return JSON.stringify(
      {
        business: { name: 'رستوران نمونه', kind: 'restaurant', defaultCurrency: 'IRR' },
        items: [
          {
            name: 'پیتزا مارگاریتا',
            sku: 'PIZZA-01',
            itemType: 'menu_item',
            category: 'غذا',
            unitPrice: 450000,
            costPrice: 180000,
            currency: 'IRR',
            imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
          },
        ],
      },
      null,
      2,
    );
  }
  if (kind === 'real_estate') {
    return JSON.stringify(
      {
        business: { name: 'املاک نمونه', kind: 'real_estate', defaultCurrency: 'IRR' },
        items: [
          {
            name: 'آپارتمان ۱۲۰ متری',
            sku: 'APT-01',
            itemType: 'property',
            unitPrice: 12500000000,
            costPrice: 11000000000,
            currency: 'IRR',
            pricingModel: 'fixed',
            customFields: { area_sqm: '120' },
          },
        ],
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      business: { name: 'کسب‌وکار نمونه', kind, defaultCurrency: 'USD' },
      items: [
        {
          name: 'محصول نمونه',
          sku: 'SKU-01',
          itemType: 'product',
          unitPrice: 100,
          costPrice: 60,
          currency: 'USD',
        },
      ],
    },
    null,
    2,
  );
}
