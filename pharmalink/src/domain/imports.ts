import type { State, ImportRow } from "./types";
export function importKey(row: ImportRow) {
  return JSON.stringify([row.name, row.batch, row.unit]);
}
export function importBlocked(s: State, itemId: string) {
  const i = s.items.find((i) => i.id === itemId);
  if (!i) return false;
  return (
    s.reservations.some((r) => r.itemId === itemId && r.status === "active") ||
    s.transfers.some(
      (t) =>
        ["pending", "management", "ready", "sent", "discrepancy"].includes(
          t.status,
        ) &&
        t.lines.some((l) => l.itemId === itemId || l.destinationId === itemId),
    ) ||
    s.orders.some(
      (o) =>
        ["approval", "reserved", "sent", "dispute"].includes(o.status) &&
        (o.itemId === itemId ||
          o.destinationId === itemId ||
          (o.buyer === i.branchId &&
            s.items.some(
              (src) =>
                src.id === o.itemId &&
                src.name === i.name &&
                src.batch === i.batch &&
                src.unit === i.unit,
            ))),
    )
  );
}
