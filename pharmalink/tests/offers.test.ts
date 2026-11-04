import { it, expect } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact } from "../src/domain/engine";
import { radarMatches, remaining } from "../src/domain/offers";
function sample() {
  let s = createSeed();
  const i = s.items.find((i) => i.branchId === "pharm_01")!;
  i.expiry = "2030-01-01";
  i.cold = false;
  i.quantity = 20;
  i.price = 100;
  s.sales = [];
  s = transact(s, "independent", {
    type: "saveSale",
    itemId: i.id,
    quantity: 10,
    factor: 1,
    price: 70,
    note: "",
  });
  return s;
}
it("يسجل وقت إنشاء وتعديل العرض ومعرفه الصحيح", () => {
  const s = sample(),
    x = s.sales[0];
  expect(x.createdAt).toBeTruthy();
  expect(x.updatedAt).toBeTruthy();
  expect(s.events.at(-1)!.reference).toBe(x.id);
});
it("إيقاف ثم إعادة النشر يحافظ على نفس معرف العرض", () => {
  let s = sample();
  const id = s.sales[0].id;
  s = transact(s, "independent", { type: "withdrawSale", id });
  s = transact(s, "independent", {
    type: "saveSale",
    id,
    itemId: s.sales[0].itemId,
    quantity: 5,
    factor: 1,
    price: 65,
    note: "",
    resume: true,
  });
  expect(s.sales.length).toBe(1);
  expect(s.sales[0].id).toBe(id);
  expect(s.sales[0].status).toBe("published");
  expect(s.events.at(-1)!.action).toBe("إعادة نشر عرض");
});
it("يمنع إنشاء عرض جديد بدل استئناف العرض الموقوف", () => {
  let s = sample();
  const old = s.sales[0];
  s = transact(s, "independent", { type: "withdrawSale", id: old.id });
  expect(() =>
    transact(s, "independent", {
      type: "saveSale",
      itemId: old.itemId,
      quantity: 1,
      factor: 1,
      price: 70,
      note: "",
    }),
  ).toThrow("عرض موقوف");
  expect(s.sales).toHaveLength(1);
});
it("يرفض إعادة النشر بكمية غير متاحة", () => {
  let s = sample();
  const x = s.sales[0];
  s = transact(s, "independent", { type: "withdrawSale", id: x.id });
  expect(() =>
    transact(s, "independent", {
      type: "saveSale",
      id: x.id,
      itemId: x.itemId,
      quantity: 99,
      factor: 1,
      price: 70,
      note: "",
      resume: true,
    }),
  ).toThrow();
});
it("الرادار يعرض المتاح ويستبعد عرض المستخدم والمنتهي والموقوف", () => {
  let s = sample();
  const a = s.accounts.find((a) => a.id === "independent-2")!,
    x = s.sales[0],
    i = s.items.find((i) => i.id === x.itemId)!;
  expect(radarMatches(s, a, i.name)).toHaveLength(1);
  expect(
    radarMatches(
      s,
      s.accounts.find((a) => a.id === "independent")!,
      i.name,
    ),
  ).toHaveLength(0);
  i.expiry = "2020-01-01";
  expect(radarMatches(s, a, i.name)).toHaveLength(0);
  i.expiry = "2030-01-01";
  s = transact(s, "independent", { type: "withdrawSale", id: x.id });
  expect(radarMatches(s, a, i.name)).toHaveLength(0);
});
it("البحث بالرادار لا يخلق طلبًا أو حجزًا ويستبعد العرض النافد", () => {
  const s = sample(),
    a = s.accounts.find((a) => a.id === "independent-2")!,
    x = s.sales[0];
  const before = JSON.stringify(s);
  radarMatches(s, a, "");
  expect(JSON.stringify(s)).toBe(before);
  x.fulfilled = x.quantity;
  expect(remaining(s, x)).toBe(0);
  expect(radarMatches(s, a, "")).toHaveLength(0);
});
