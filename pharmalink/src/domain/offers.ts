import type { State, Sale, Account } from "./types";
import { available, eligible, member, daysLeft } from "./access";
export function committed(s: State, x: Sale) {
  return s.orders
    .filter(
      (o) =>
        o.saleId === x.id && ["reserved", "sent", "dispute"].includes(o.status),
    )
    .reduce((n, o) => n + o.quantity, 0);
}
export function remaining(s: State, x: Sale) {
  return Math.max(
    0,
    Math.floor(
      Math.min(
        available(s, x.itemId),
        x.quantity - x.fulfilled - committed(s, x),
      ) / (x.unitFactor || 1),
    ),
  );
}
function norm(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ةه]$/, "")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .trim();
}

function matchText(val?: string, filter?: string): boolean {
  if (!filter || !filter.trim()) return true;
  if (!val) return false;
  const nf = norm(filter);
  const nv = norm(val);
  if (!nf) return true;
  return (
    nv.includes(nf) ||
    nf.includes(nv) ||
    nv.startsWith(nf) ||
    nf.startsWith(nv)
  );
}

export function radarMatches(
  s: State,
  a: Account,
  query: string,
  filters?: {
    strength?: string;
    dosageForm?: string;
    minDiscount?: number;
    minExpiry?: number;
  },
) {
  if (!member(a)) return [];
  return s.sales.filter((x) => {
    const i = s.items.find((i) => i.id === x.itemId);
    const b = s.branches.find((b) => b.id === i?.branchId);
    if (
      !i ||
      !b?.active ||
      x.status !== "published" ||
      !eligible(i, s) ||
      remaining(s, x) <= 0 ||
      i.branchId === a.branchId ||
      (a.chainId && b.chainId === a.chainId)
    ) {
      return false;
    }

    const q = query.trim();
    const matchesQuery = matchText(i.name, q) || matchText(i.ingredient, q);
    if (!matchesQuery) return false;

    if (filters?.strength?.trim()) {
      const sFilter = filters.strength.trim();
      const hasField = matchText(i.strength, sFilter);
      const hasInName = matchText(i.name, sFilter);
      if (!hasField && !hasInName) return false;
    }

    if (filters?.dosageForm?.trim()) {
      const dFilter = filters.dosageForm.trim();
      const hasField = matchText(i.dosageForm, dFilter);
      const hasUnit = matchText(i.unit, dFilter);
      const hasPkgUnit = matchText(i.packageUnit, dFilter);
      const hasInName = matchText(i.name, dFilter);
      if (!hasField && !hasUnit && !hasPkgUnit && !hasInName) return false;
    }

    if (filters?.minDiscount !== undefined && filters.minDiscount > 0) {
      const discount =
        (1 - x.price / (i.price * (x.unitFactor || 1))) * 100 + 1e-8;
      if (discount < filters.minDiscount) return false;
    }

    if (filters?.minExpiry !== undefined && filters.minExpiry > 0) {
      if (daysLeft(i.expiry) < filters.minExpiry) return false;
    }

    return true;
  });
}

/** One offer per stock batch; paused offers resume with their original ID. */
export function editableOffer(s: State, itemId: string) {
  const active = s.sales.find(
    (x) => x.itemId === itemId && ["pending", "published"].includes(x.status),
  );
  return (
    active ||
    s.sales
      .filter((x) => x.itemId === itemId && x.status === "withdrawn")
      .at(-1)
  );
}
export function offerProgress(s: State, x: Sale) {
  const orders = s.orders.filter((o) => o.saleId === x.id);
  const completed = orders.filter((o) => o.status === "completed");
  const accepted = completed.reduce(
    (n, o) => n + (o.accepted ?? (o.disputeReason ? 0 : o.quantity)),
    0,
  );
  const returned = completed.reduce((n, o) => n + (o.returned || 0), 0);
  const writtenOff = completed.reduce((n, o) => n + (o.writtenOff || 0), 0);
  const lost = completed.reduce((n, o) => n + (o.lost || 0), 0);
  const unresolvedHistory = Math.max(
    0,
    x.fulfilled - accepted - returned - writtenOff - lost,
  );
  return {
    accepted,
    returned,
    writtenOff,
    lost,
    unresolvedHistory,
    closed: x.fulfilled,
  };
}
export function offerAvailability(s: State, x: Sale) {
  if (remaining(s, x) > 0) return "available";
  if (x.fulfilled >= x.quantity && committed(s, x) === 0) return "completed";
  const orders = s.orders.filter(
    (o) =>
      o.saleId === x.id && ["reserved", "sent", "dispute"].includes(o.status),
  );
  if (orders.length && orders.every((o) => o.status === "reserved"))
    return "reserved";
  return "unavailable";
}

export function offerEvents(s: State, saleId: string) {
  const references = new Set([
    saleId,
    ...s.orders.filter((o) => o.saleId === saleId).map((o) => o.id),
  ]);
  return s.events.filter((e) => references.has(e.reference));
}
