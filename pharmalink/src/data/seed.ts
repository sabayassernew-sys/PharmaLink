import legacy from "./legacy.json";
import type { State, Item, Account } from "../domain/types";
import { PRESET_AVATARS } from "../domain/avatars";
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mockCertSvg(title: string, sub: string, num: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
    <rect width="600" height="420" fill="#f8fafc" rx="12" stroke="#073B59" stroke-width="4"/>
    <rect x="20" y="20" width="560" height="380" fill="#ffffff" rx="8" stroke="#00ADB5" stroke-dasharray="8 4" stroke-width="2"/>
    <circle cx="300" cy="80" r="32" fill="#073B59"/>
    <path d="M288 80l8 8 16-16" stroke="#00ADB5" stroke-width="4" fill="none" stroke-linecap="round"/>
    <text x="300" y="145" font-family="sans-serif" font-size="20" font-weight="bold" fill="#073B59" text-anchor="middle">وزارة الصحة العامة والسكان — قطاع الصيدلة</text>
    <text x="300" y="180" font-family="sans-serif" font-size="18" font-weight="bold" fill="#00ADB5" text-anchor="middle">${title}</text>
    <line x1="100" y1="205" x2="500" y2="205" stroke="#cbd5e1" stroke-width="2"/>
    <text x="300" y="245" font-family="sans-serif" font-size="16" fill="#334155" text-anchor="middle">${sub}</text>
    <text x="300" y="280" font-family="sans-serif" font-size="15" font-weight="bold" fill="#073B59" text-anchor="middle">رقم الوثيقة: ${num}</text>
    <rect x="180" y="320" width="240" height="40" rx="8" fill="#f1f5f9" stroke="#94a3b8"/>
    <text x="300" y="345" font-family="sans-serif" font-size="13" fill="#64748b" text-anchor="middle">وثيقة رسمية معتمدة ومطابقة للفحص</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function createSeed(): State {
  const branches = legacy.pharmacies.map((p) => ({
    id: p.id,
    name: p.name,
    city: p.city,
    chainId: p.agency_id || undefined,
    active: true,
    alertDays: 10,
    defaultDiscount: 0,
  }));
  const accounts: Account[] = [
    { id: "guest", name: "تصفح المنصة", role: "guest", verified: false },
    {
      id: "branch-hadda",
      name: "د. أحمد • فرع حدة",
      role: "agency_branch",
      branchId: "pharm_agency_01",
      chainId: "agency_shifa",
      verified: true,
      license: "LIC-SAN-0192",
      licenseExpiry: dateOffset(320),
      pharmacistName: "د. أحمد يحيى المرتضى",
      practiceLicense: "PRAC-SAN-4819",
    },
    {
      id: "branch-sabeen",
      name: "د. عبدالكريم • فرع السبعين",
      role: "agency_branch",
      branchId: "pharm_agency_02",
      chainId: "agency_shifa",
      verified: true,
      license: "LIC-SAN-0193",
      licenseExpiry: dateOffset(210),
      pharmacistName: "د. عبدالكريم محمد الضلعي",
      practiceLicense: "PRAC-SAN-5102",
    },
    {
      id: "branch-shoob",
      name: "د. سارة • فرع شعوب",
      role: "agency_branch",
      branchId: "pharm_agency_03",
      chainId: "agency_shifa",
      verified: true,
      license: "LIC-SAN-0194",
      licenseExpiry: dateOffset(12), // 12 days left -> critical alert (< 15 days)
      pharmacistName: "د. سارة عبده الشامي",
      practiceLicense: "PRAC-SAN-6031",
      avatarUrl: PRESET_AVATARS[5].dataUrl,
      phone: "733456789",
      city: "صنعاء",
      address: "شارع مأرب - أمام مستشفى الثورة",
      operatingHours: "8:00 ص - 11:00 م",
    },
    {
      id: "master",
      name: "إدارة مجموعة الشفاء",
      role: "agency_master",
      chainId: "agency_shifa",
      verified: true,
      license: "CHAIN-HQ-881",
      commercialRegister: "CR-90412",
      taxNumber: "TAX-7721-00",
      avatarUrl: PRESET_AVATARS[6].dataUrl,
      phone: "01-223344",
      city: "صنعاء",
      address: "حدة - مركز الشفاء الطبي الرئيسي",
    },
    {
      id: "independent",
      name: "صيدلية الأمل الحديثة",
      role: "independent",
      branchId: "pharm_01",
      verified: true,
      license: "LIC-SAN-0914",
      licenseExpiry: dateOffset(190),
      pharmacistName: "د. نجيب عبدالله غالب",
      practiceLicense: "PRAC-SAN-3109",
      commercialRegister: "CR-88194",
      taxNumber: "TAX-4412-09",
      avatarUrl: PRESET_AVATARS[0].dataUrl,
      phone: "771234567",
      city: "صنعاء",
      address: "شارع تعز - جولة 45",
      operatingHours: "على مدار 24 ساعة",
      bio: "صيدلية عامة نموذجية معتمدة توفر كافة الأصناف المزمنة وحليب الأطفال والمستلزمات الطبية.",
    },
    {
      id: "independent-2",
      name: "صيدلية مستقلة ثانية",
      role: "independent",
      branchId: "pharm_03",
      verified: true,
      license: "LIC-SAN-0988",
      licenseExpiry: dateOffset(22), // 22 days left -> early warning (< 30 days)
      pharmacistName: "د. كمال يحيى الوجيه",
      practiceLicense: "PRAC-SAN-7741",
      avatarUrl: PRESET_AVATARS[2].dataUrl,
      phone: "777890123",
      city: "عدن",
      address: "المعلا - الشارع الرئيسي",
      operatingHours: "8:00 ص - 12:00 م",
    },
    {
      id: "admin",
      name: "إدارة فارما لينك",
      role: "admin",
      verified: true,
      avatarUrl: PRESET_AVATARS[1].dataUrl,
      phone: "01-445566",
      city: "صنعاء",
      address: "الإدارة العامة لمنصة فارما لينك - حدة",
    },
    {
      id: "pending",
      name: "صيدلية النور النموذجية",
      role: "pending",
      verified: false,
      email: "alnoor.pharmacy@example.test",
      license: "LIC-SAN-2024-991",
      pharmacistName: "د. وليد القدسي",
      practiceLicense: "PRAC-8921-YE",
      commercialRegister: "CR-104928-SAN",
      taxNumber: "TAX-99214-01",
      licenseExpiry: dateOffset(365),
      avatarUrl: PRESET_AVATARS[3].dataUrl,
      phone: "770112233",
      city: "صنعاء",
      address: "الأصبحي - شارع المقالح",
      operatingHours: "9:00 ص - 11:30 م",
      documents: [
        {
          id: "doc-1",
          type: "pharmacy_license",
          title: "ترخيص فتح منشأة صيدلانية",
          fileName: "pharmacy_license_alnoor.pdf",
          fileType: "pdf",
          dataUrl: mockCertSvg("ترخيص فتح صيدلية عامة", "صيدلية النور النموذجية - صنعاء", "LIC-SAN-2024-991"),
          uploadedAt: new Date().toISOString(),
        },
        {
          id: "doc-2",
          type: "practice_license",
          title: "ترخيص مزاولة مهنة الصيدلة",
          fileName: "pharmacist_practice_license.pdf",
          fileType: "pdf",
          dataUrl: mockCertSvg("ترخيص مزاولة مهنة صيدلي قانوني", "الصيدلي المسؤول: د. وليد القدسي", "PRAC-8921-YE"),
          uploadedAt: new Date().toISOString(),
        },
        {
          id: "doc-3",
          type: "commercial_register",
          title: "السجل التجاري للمنشأة",
          fileName: "commercial_register.png",
          fileType: "image",
          dataUrl: mockCertSvg("شهادة القيد في السجل التجاري", "وزارة الصناعة والتجارة - صيدلية النور", "CR-104928-SAN"),
          uploadedAt: new Date().toISOString(),
        },
        {
          id: "doc-4",
          type: "tax_card",
          title: "البطاقة الضريبية سارية المفعول",
          fileName: "tax_card.png",
          fileType: "image",
          dataUrl: mockCertSvg("البطاقة الضريبية للمكلف", "مصلحة الضرائب - الرقم الضريبي", "TAX-99214-01"),
          uploadedAt: new Date().toISOString(),
        },
      ],
    },
  ];
  const items: Item[] = legacy.listings.map((i) => ({
    id: i.id,
    branchId: i.pharmacy_id,
    name: i.brand_name,
    ingredient: i.active_ingredient,
    batch: i.batch_number,
    expiry: i.expiry_date,
    unit: "باكت",
    quantity: i.quantity,
    quarantine: 0,
    price: i.original_price,
    cold: /insulin|lantus|أنسولين|انسولين/i.test(
      i.brand_name + " " + i.active_ingredient,
    ),
    blocked: false,
    archived: false,
  }));
  const sample = items.find(
    (i) => i.branchId === "pharm_agency_01" && !i.cold,
  )!;
  const sales = items
    .filter((i) => i.branchId === "pharm_03" && !i.cold)
    .slice(0, 5)
    .map((i, n) => ({
      id: "sale-demo-" + n,
      itemId: i.id,
      quantity: Math.min(i.quantity, 12),
      fulfilled: 0,
      status: "published" as const,
      price: Math.round(i.price * 0.7),
      note: "عرض تجريبي معتمد",
    }));
  return {
    version: 2,
    revision: 0,
    accounts,
    chains: [
      {
        id: "agency_shifa",
        name: "مجموعة صيدليات الشفاء",
        policy: "centralized",
      },
    ],
    branches,
    items,
    posts: [
      {
        id: "post-demo",
        branchId: sample.branchId,
        itemId: sample.id,
        kind: "surplus",
        name: sample.name,
        quantity: 10,
        allocated: 0,
        unit: sample.unit,
        expires: new Date(Date.now() + 48 * 3600000).toISOString(),
        status: "open",
        notes: "فائض متاح للفروع الشقيقة",
      },
    ],
    transfers: [],
    reservations: [],
    sales,
    orders: [],
    wallets: branches.map((b) => ({
      branchId: b.id,
      available: 1000000,
      held: 0,
    })),
    events: [],
    operations: [],
    imports: [],
    radar: [],
  };
}
