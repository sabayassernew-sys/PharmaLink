import type { Account, State, Item, Transfer, PharmacySubscription } from "./types";
export const roleNames = {
  guest: "زائر عام",
  pending: "حساب قيد المراجعة",
  agency_branch: "مسؤول فرع",
  agency_master: "إدارة سلسلة",
  independent: "صيدلية مستقلة",
  admin: "مدير المنصة",
};
export function parseDateSafe(dateStr: string | undefined | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!s) return null;

  // 1. If it already contains 'T', parse directly with new Date(s)
  if (s.includes("T")) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 2. Format YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // 3. Format DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // 4. Fallback direct parse
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function daysLeft(expiry: string | undefined | null): number {
  const targetDate = parseDateSafe(expiry);
  if (!targetDate) return -1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  targetDate.setHours(0, 0, 0, 0);
  const diff = Math.floor((targetDate.getTime() - today.getTime()) / 86400000);
  return Number.isNaN(diff) ? -1 : diff;
}
export function isLicenseExpired(a: Account): boolean {
  if (!a.licenseExpiry) return false;
  return daysLeft(a.licenseExpiry) < 0;
}
export function getEffectiveSubscription(
  s: State,
  a: Account,
): PharmacySubscription | undefined {
  if (a.role === "admin" || a.role === "guest") return undefined;
  if (!s.subscriptions || s.subscriptions.length === 0) return undefined;

  // For pharmacy chains (Chain Management or Branch Staff)
  if (a.role === "agency_master" || a.role === "agency_branch") {
    const chainId = a.chainId;
    if (!chainId) return undefined;
    // Find all branches belonging to this chain
    const chainBranchIds = s.branches
      .filter((b) => b.chainId === chainId)
      .map((b) => b.id);

    return s.subscriptions.find(
      (sub) =>
        sub.chainId === chainId ||
        (sub.branchId && chainBranchIds.includes(sub.branchId)),
    );
  }

  // For independent pharmacies
  if (a.role === "independent" && a.branchId) {
    return s.subscriptions.find((sub) => sub.branchId === a.branchId);
  }

  return undefined;
}
export function isAccountSuspended(a: Account): boolean {
  return !!a.suspended || isLicenseExpired(a);
}
export function member(a: Account) {
  return (
    a.verified &&
    !isAccountSuspended(a) &&
    ["agency_branch", "agency_master", "independent"].includes(a.role)
  );
}
export function ownsBranch(s: State, a: Account, id: string) {
  const b = s.branches.find((b) => b.id === id);
  return (
    member(a) &&
    !!b &&
    b.active &&
    (a.role === "agency_master" ? b.chainId === a.chainId : a.branchId === id)
  );
}
export function visibleItems(s: State, a: Account): Item[] {
  return s.items.filter((i) => !i.archived && ownsBranch(s, a, i.branchId));
}
export function visibleTransfers(s: State, a: Account): Transfer[] {
  return s.transfers.filter(
    (t) =>
      member(a) &&
      (a.role === "agency_master"
        ? t.chainId === a.chainId
        : t.from === a.branchId || t.to === a.branchId),
  );
}
export function available(s: State, id: string) {
  const i = s.items.find((i) => i.id === id);
  return i
    ? i.quantity -
    s.reservations
      .filter((r) => r.itemId === id && r.status === "active")
      .reduce((n, r) => n + r.quantity, 0)
    : 0;
}
export function eligibilityReasons(i: Item, minDaysOrState: number | State = 30) {
  const minDays =
    typeof minDaysOrState === "object" && minDaysOrState !== null
      ? (minDaysOrState.minExpiryDays ?? 30)
      : typeof minDaysOrState === "number"
        ? minDaysOrState
        : 30;
  const reasons: string[] = [];
  if (i.archived) reasons.push("بند مؤرشف");
  if (i.blocked) reasons.push("الصنف موقوف للمراجعة");
  if (i.cold) reasons.push("صنف مبرد؛ خارج نطاق تداول هذه النسخة");
  const days = daysLeft(i.expiry);
  if (!Number.isFinite(days)) reasons.push("تاريخ صلاحية غير صالح");
  else if (days < 0) reasons.push("انتهت صلاحية الصنف");
  else if (days < minDays)
    reasons.push(`الصلاحية المتبقية أقل من ${minDays} يومًا وفق سياسة المنصة المعتمدة`);
  return reasons;
}
export function eligible(i: Item, minDaysOrState: number | State = 30) {
  return eligibilityReasons(i, minDaysOrState).length === 0;
}
export function canNav(a: Account, key: string) {
  if (key === "home" || key === "brand") return true;
  if (isAccountSuspended(a)) return false;
  if (key === "settings") return member(a) || a.role === "admin";
  if (a.role === "guest" || a.role === "pending") return false;
  if (a.role === "admin")
    return [
      "verification",
      "audit",
      "disputes",
      "reports",
      "settings",
      "subscriptions",
    ].includes(key);
  if (!member(a)) return false;
  if (key === "subscriptions") {
    return ["independent", "agency_master"].includes(a.role);
  }
  if (
    [
      "dashboard",
      "inventory",
      "market",
      "orders",
      "sales",
      "radar",
      "reports",
      "import",
      "audit",
      "returns",
    ].includes(key)
  )
    return true;
  if (["board", "transfers"].includes(key))
    return ["agency_branch", "agency_master"].includes(a.role);
  if (key === "branches") return a.role === "agency_master";
  return false;
}

export interface BranchDrugAvailability {
  branchId: string;
  branchName: string;
  city: string;
  drugName: string;
  unit: string;
  isAvailable: boolean; // متوفر / غير متوفر فقط
  itemId?: string; // معرف الصنف عند التوفر لتمكين إرسال الطلب
  dosageForm?: string;
  strength?: string;
}

/**
 * سياسة إظهار مخزون الفروع الشقيقة (Data-level privacy policy):
 * تحجب تفاصيل المخزون بالكامل (الكميات الفعلية والمتاحة والأسعار والتشغيلات وتواريخ الصلاحية)
 * وتعيد فقط: اسم الدواء، اسم الفرع، وحالة التوفر (متوفر / غير متوفر).
 */
export function querySisterBranchesAvailability(
  s: State,
  a: Account,
  query: string = "",
): { drugName: string; unit: string; branches: BranchDrugAvailability[] }[] {
  if (!member(a) || !a.chainId) return [];
  const q = query.trim().toLowerCase();

  const sisterBranches = s.branches.filter(
    (b) => b.chainId === a.chainId && b.id !== a.branchId && b.active,
  );
  if (!sisterBranches.length) return [];

  const drugMap = new Map<
    string,
    { drugName: string; unit: string; strength?: string; dosageForm?: string }
  >();

  for (const b of sisterBranches) {
    const items = s.items.filter(
      (i) => i.branchId === b.id && !i.archived && eligible(i, s),
    );
    for (const i of items) {
      const key = i.name.trim().toLowerCase();
      if (
        !q ||
        key.includes(q) ||
        (i.ingredient && i.ingredient.toLowerCase().includes(q))
      ) {
        if (!drugMap.has(key)) {
          drugMap.set(key, {
            drugName: i.name.trim(),
            unit: i.unit,
            strength: i.strength,
            dosageForm: i.dosageForm,
          });
        }
      }
    }
  }

  const results: {
    drugName: string;
    unit: string;
    branches: BranchDrugAvailability[];
  }[] = [];

  for (const [, drug] of drugMap) {
    const branchAvailabilityList: BranchDrugAvailability[] = [];

    for (const b of sisterBranches) {
      const matched = s.items.find(
        (i) =>
          i.branchId === b.id &&
          !i.archived &&
          eligible(i, s) &&
          i.name.trim().toLowerCase() === drug.drugName.toLowerCase(),
      );

      const hasStock = matched ? available(s, matched.id) > 0 : false;

      branchAvailabilityList.push({
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        drugName: drug.drugName,
        unit: drug.unit,
        isAvailable: hasStock,
        itemId: hasStock && matched ? matched.id : undefined,
        dosageForm: drug.dosageForm,
        strength: drug.strength,
      });
    }

    results.push({
      drugName: drug.drugName,
      unit: drug.unit,
      branches: branchAvailabilityList,
    });
  }

  return results;
}

export function calculateDeadlineFromExpiry(expiry: string, returnWindowDays: number): string {
  try {
    const d = new Date(expiry + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() - returnWindowDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

export function getEffectiveReturnDeadline(i: Item, s: State): string | undefined {
  const b = s.branches.find((b) => b.id === i.branchId);
  if (b?.returnWindowDays && i.expiry) {
    const calc = calculateDeadlineFromExpiry(i.expiry, b.returnWindowDays);
    if (calc) return calc;
  }
  if (i.returnDeadline) return i.returnDeadline;
  return undefined;
}

export function getEffectiveSupplier(i: Item, s: State): string {
  const b = s.branches.find((b) => b.id === i.branchId);
  if (b?.supplierName && b.supplierName.trim()) {
    return b.supplierName.trim();
  }
  if (b?.chainId) {
    return "شركة اليمامة للأدوية";
  }
  return "شركة الرعاية الحديثة للأدوية";
}

export function getEffectiveAlertDays(i: Item, s: State): number {
  if (i.alertDays !== undefined) return i.alertDays;
  const b = s.branches.find((b) => b.id === i.branchId);
  return b?.alertDays ?? 10;
}
