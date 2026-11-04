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
    return (
      i &&
      b?.active &&
      x.status === "published" &&
      eligible(i) &&
      remaining(s, x) > 0 &&
      i.branchId !== a.branchId &&
      (!a.chainId || b.chainId !== a.chainId) &&
      i.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
      (!filters?.strength ||
        i.strength?.toLowerCase() === filters.strength.toLowerCase()) &&
      (!filters?.dosageForm ||
        i.dosageForm?.toLowerCase() === filters.dosageForm.toLowerCase()) &&
      (filters?.minDiscount === undefined ||
        (1 - x.price / (i.price * (x.unitFactor || 1))) * 100 + 1e-8 >=
          filters.minDiscount) &&
      (filters?.minExpiry === undefined ||
        daysLeft(i.expiry) >= filters.minExpiry)
    );
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
