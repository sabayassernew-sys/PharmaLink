import type { Account, State, Item, Transfer } from "./types";
export const roleNames = {
  guest: "زائر عام",
  pending: "حساب قيد المراجعة",
  agency_branch: "مسؤول فرع",
  agency_master: "إدارة سلسلة",
  independent: "صيدلية مستقلة",
  admin: "مدير المنصة",
};
export function daysLeft(expiry: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor(
    (new Date(expiry + "T00:00:00").getTime() - today.getTime()) / 86400000,
  );
}
export function isLicenseExpired(a: Account): boolean {
  if (!a.licenseExpiry) return false;
  return daysLeft(a.licenseExpiry) < 0;
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
export function eligibilityReasons(i: Item) {
  const reasons: string[] = [];
  if (i.archived) reasons.push("بند مؤرشف");
  if (i.blocked) reasons.push("الصنف موقوف للمراجعة");
  if (i.cold) reasons.push("صنف مبرد؛ خارج نطاق تداول هذه النسخة");
  const days = daysLeft(i.expiry);
  if (!Number.isFinite(days)) reasons.push("تاريخ صلاحية غير صالح");
  else if (days < 0) reasons.push("انتهت صلاحية الصنف");
  else if (days < 30)
    reasons.push("الصلاحية المتبقية أقل من 30 يومًا وفق سياسة النسخة");
  return reasons;
}
export function eligible(i: Item) {
  return eligibilityReasons(i).length === 0;
}
export function canNav(a: Account, key: string) {
  if (key === "home" || key === "brand") return true;
  if (isAccountSuspended(a)) return false;
  if (key === "settings") return member(a) || a.role === "admin";
  if (a.role === "guest" || a.role === "pending") return false;
  if (a.role === "admin")
    return ["verification", "audit", "disputes"].includes(key);
  if (!member(a)) return false;
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
