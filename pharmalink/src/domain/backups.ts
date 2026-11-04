import type { State, Account } from "./types";
import { member, ownsBranch, visibleItems, visibleTransfers } from "./access";
import { validateState } from "./engine";
export function exportScope(s: State, a: Account) {
  if (!member(a) && a.role !== "admin")
    throw new Error("التصدير غير متاح لهذا الحساب");
  return {
    kind: "pharmalink-scoped-report",
    at: new Date().toISOString(),
    owner: a.id,
    items: visibleItems(s, a),
    wallets: s.wallets.filter((w) => ownsBranch(s, a, w.branchId)),
    walletMovements: s.walletMovements?.filter((w) =>
      ownsBranch(s, a, w.branchId),
    ),
    sales: s.sales.filter((x) =>
      ownsBranch(s, a, s.items.find((i) => i.id === x.itemId)!.branchId),
    ),
    transfers: visibleTransfers(s, a),
    orders: s.orders.filter(
      (o) => ownsBranch(s, a, o.seller) || ownsBranch(s, a, o.buyer),
    ),
    events: s.events.filter((e) => e.branchId && ownsBranch(s, a, e.branchId)),
  };
}
export function parseBackup(text: string): State {
  const data = JSON.parse(text);
  if (
    data.kind !== "pharmalink-full-backup" ||
    !data.state ||
    data.state.version !== 2
  )
    throw new Error("اختر نسخة كاملة بصيغة النسخ الاحتياطي، وليس تقرير مستخدم");
  const s = data.state as State;
  for (const key of [
    "accounts",
    "chains",
    "branches",
    "items",
    "posts",
    "transfers",
    "reservations",
    "sales",
    "orders",
    "wallets",
    "events",
    "operations",
    "imports",
    "radar",
  ] as const) {
    if (!Array.isArray(s[key])) throw new Error("نسخة غير مكتملة: " + key);
  }
  if (
    !s.accounts.some((a) => a.role === "guest") ||
    s.accounts.some(
      (a) =>
        !a.id ||
        typeof a.verified !== "boolean" ||
        ![
          "guest",
          "pending",
          "agency_branch",
          "agency_master",
          "independent",
          "admin",
        ].includes(a.role),
    )
  )
    throw new Error("حسابات النسخة غير صالحة");
  for (const records of [
    s.accounts,
    s.branches,
    s.items,
    s.transfers,
    s.sales,
    s.orders,
  ]) {
    const ids = records.map((r) => r.id);
    if (new Set(ids).size !== ids.length) throw new Error("معرفات مكررة");
  }
  if (!s.accounts.some((a) => a.role === "admin" && a.verified))
    throw new Error("النسخة لا تحتوي مديرًا موثقًا");
  for (const i of s.items)
    if (!s.branches.some((b) => b.id === i.branchId))
      throw new Error("بند يتبع فرعًا غير موجود");
  for (const x of s.sales)
    if (!s.items.some((i) => i.id === x.itemId))
      throw new Error("عرض دون مخزون");
  for (const o of s.orders)
    if (
      !s.sales.some((x) => x.id === o.saleId) ||
      !s.branches.some((b) => b.id === o.buyer)
    )
      throw new Error("طلب غير مترابط");
  for (const r of s.reservations)
    if (
      !Number.isSafeInteger(r.quantity) ||
      r.quantity <= 0 ||
      !s.items.some((i) => i.id === r.itemId)
    )
      throw new Error("حجز غير صالح");
  validateState(s);
  return s;
}
