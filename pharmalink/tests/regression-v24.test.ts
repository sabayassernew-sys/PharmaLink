import { it, expect, vi, afterEach } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact } from "../src/domain/engine";
import { parseBackup } from "../src/domain/backups";
import { parseFile } from "../src/data/importer";
import { LocalRepository } from "../src/data/repository";
import {
  remaining,
  committed,
  offerAvailability,
  offerProgress,
  editableOffer,
} from "../src/domain/offers";
function setup() {
  let s = createSeed();
  const i = s.items.find((i) => i.branchId === "pharm_01")!;
  Object.assign(i, {
    expiry: "2030-01-01",
    cold: false,
    quantity: 100,
    price: 100,
  });
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
function buy(s: ReturnType<typeof setup>, quantity = 4) {
  return transact(s, "independent-2", {
    type: "buy",
    saleId: s.sales[0].id,
    branchId: "pharm_03",
    quantity,
  });
}
function backup(s: ReturnType<typeof setup>) {
  return parseBackup(
    JSON.stringify({ kind: "pharmalink-full-backup", state: s }),
  );
}
it("الاختلاف يبقى التزامًا ويمنع اعتماد شراء يتجاوز الباقي", () => {
  let s = setup();
  s = transact(s, "branch-hadda", {
    type: "buy",
    saleId: s.sales[0].id,
    branchId: "pharm_agency_01",
    quantity: 10,
  });
  const pending = s.orders[0].id;
  s = buy(s);
  const id = s.orders[1].id;
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", {
    type: "disputeOrder",
    id,
    accepted: 0,
    rejected: 0,
    missing: 4,
    reason: "اختلاف قيد التحقيق",
  });
  expect(remaining(s, s.sales[0])).toBe(6);
  expect(committed(s, s.sales[0])).toBe(4);
  expect(() =>
    transact(s, "master", { type: "approveOrder", id: pending }),
  ).toThrow("نفدت");
  expect(() =>
    transact(s, "independent-2", {
      type: "buy",
      saleId: s.sales[0].id,
      branchId: "pharm_03",
      quantity: 7,
    }),
  ).toThrow("غير متاحة");
});
it("دورة المتاح الجزئي والمحجوز والإلغاء والمكتمل لا تحذف التاريخ", () => {
  let s = buy(setup(), 3);
  const id = s.orders[0].id;
  expect(remaining(s, s.sales[0])).toBe(7);
  expect(offerAvailability(s, s.sales[0])).toBe("available");
  s = transact(s, "independent-2", { type: "cancelOrder", id });
  expect(remaining(s, s.sales[0])).toBe(10);
  s = buy(s, 10);
  const next = s.orders[1].id;
  expect(offerAvailability(s, s.sales[0])).toBe("reserved");
  s = transact(s, "independent", { type: "sendOrder", id: next });
  expect(offerAvailability(s, s.sales[0])).toBe("unavailable");
  s = transact(s, "independent-2", { type: "receiveOrder", id: next });
  expect(offerAvailability(s, s.sales[0])).toBe("completed");
  expect(s.sales).toHaveLength(1);
  expect(offerProgress(s, s.sales[0]).accepted).toBe(10);
});
it("طلب الفرع المعلق لا يحجز كمية أو مالًا", () => {
  let s = setup();
  s = transact(s, "branch-hadda", {
    type: "buy",
    saleId: s.sales[0].id,
    branchId: "pharm_agency_01",
    quantity: 10,
  });
  expect(remaining(s, s.sales[0])).toBe(10);
  expect(s.reservations).toHaveLength(0);
  expect(s.wallets.find((w) => w.branchId === "pharm_agency_01")!.held).toBe(0);
});
it.each(["", "  "])(
  "يرفض كمية CSV فارغة (%s) بدل تصفير المخزون",
  async (value) => {
    await expect(
      parseFile(
        new File(
          [
            `name,batch,expiry,unit,quantity,price\nDrug,B01,2030-01-01,box,${value},100`,
          ],
          "blank.csv",
        ),
      ),
    ).rejects.toThrow("الكمية مطلوب");
  },
);
it("يرفض سعر CSV فارغًا ويسمح بالصفر الصريح", async () => {
  await expect(
    parseFile(
      new File(
        ["name,batch,expiry,unit,quantity,price\nDrug,B01,2030-01-01,box,1,"],
        "blank.csv",
      ),
    ),
  ).rejects.toThrow("السعر مطلوب");
  const result = await parseFile(
    new File(
      ["name,batch,expiry,unit,quantity,price\nDrug,B01,2030-01-01,box,0,0"],
      "zero.csv",
    ),
  );
  expect(result.rows[0].quantity).toBe(0);
});
it("يرفض خلية كمية XLSX مفقودة", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Stock");
  sheet.addRow(["name", "batch", "expiry", "unit", "quantity", "price"]);
  sheet.addRow(["Drug", "B01", "2030-01-01", "box", null, 100]);
  const bytes = new Uint8Array(
    (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer,
  );
  await expect(parseFile(new File([bytes], "blank.xlsx"))).rejects.toThrow(
    "الكمية مطلوب",
  );
});
it("يرفض نسخة فيها طلب محجوز دون المال الموافق", () => {
  const s = buy(setup());
  s.wallets.find((w) => w.branchId === "pharm_03")!.held = 0;
  expect(() => backup(s)).toThrow("المبلغ المحجوز");
});
it("يرفض نسخة فيها حجز لا يطابق الطلب", () => {
  const s = buy(setup());
  s.reservations[0].quantity = 2;
  expect(() => backup(s)).toThrow("حجز الطلب");
});
it("يرفض تغيير بائع الطلب أو حالته في ملف النسخة", () => {
  const s = buy(setup());
  s.orders[0].seller = "pharm_agency_01";
  expect(() => backup(s)).toThrow("ترابط البائع");
  const other = buy(setup());
  other.orders[0].status = "unknown" as "reserved";
  expect(() => backup(other)).toThrow("حالة طلب");
});
it("يرفض نسخة تتجاوز التزاماتها كمية العرض", () => {
  const s = buy(setup());
  s.sales[0].quantity = 3;
  expect(() => backup(s)).toThrow("التزامات العرض");
});
it("يفصل المرتجع المسترد بالكامل عن المبيعات ويغلق الكمية السابقة", () => {
  let s = buy(setup());
  const id = s.orders[0].id;
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", {
    type: "disputeOrder",
    id,
    accepted: 0,
    rejected: 4,
    missing: 0,
    reason: "كامل البضاعة مرفوضة",
  });
  for (const [actor, method] of [
    ["admin", "return"],
    ["independent-2", "returnSend"],
    ["independent", "returnReceive"],
  ] as const)
    s = transact(s, actor, {
      type: "externalResolve",
      id,
      method,
      reason: "إرجاع موثق للكمية",
    });
  s = transact(s, "admin", {
    type: "settleOrder",
    id,
    reason: "رد كامل المبلغ للمشتري",
  });
  expect(offerProgress(s, s.sales[0])).toMatchObject({
    accepted: 0,
    returned: 4,
    closed: 4,
    unresolvedHistory: 0,
  });
  expect(remaining(s, s.sales[0])).toBe(6);
  expect(s.items.find((i) => i.id === s.sales[0].itemId)!.quarantine).toBe(4);
  expect(() => backup(s)).not.toThrow();
});
it("يحفظ أرقام التالف والمفقود دون تحويلها إلى مبيعات", () => {
  let s = buy(setup());
  const id = s.orders[0].id;
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", {
    type: "disputeOrder",
    id,
    accepted: 1,
    rejected: 1,
    missing: 2,
    reason: "تلف ونقص موثقان",
  });
  s = transact(s, "admin", {
    type: "externalResolve",
    id,
    method: "writeoff",
    reason: "تلف مثبت بالاتفاق",
  });
  s = transact(s, "admin", {
    type: "externalResolve",
    id,
    method: "lost",
    reason: "عجز مثبت بالاتفاق",
  });
  s = transact(s, "admin", {
    type: "settleOrder",
    id,
    reason: "تسوية الطرفين بعد الفحص",
  });
  expect(offerProgress(s, s.sales[0])).toMatchObject({
    accepted: 1,
    writtenOff: 1,
    lost: 2,
    closed: 4,
    unresolvedHistory: 0,
  });
});
it("مدخل المخزون يسترجع العرض الموقوف نفسه", () => {
  let s = setup();
  const x = s.sales[0];
  s = transact(s, "independent", { type: "withdrawSale", id: x.id });
  expect(editableOffer(s, x.itemId)?.id).toBe(x.id);
  s = transact(s, "independent", {
    type: "saveSale",
    id: x.id,
    itemId: x.itemId,
    quantity: 3,
    factor: 1,
    price: 65,
    note: "",
    resume: true,
  });
  expect(s.sales).toHaveLength(1);
  expect(s.sales[0].id).toBe(x.id);
});
afterEach(() => vi.unstubAllGlobals());
it("الاستعادة تستخدم نفس القفل وترفض بيانات تغيرت أثناء المعاينة", async () => {
  const initial = setup();
  let raw = JSON.stringify(initial);
  const lock = vi.fn(async (_name: string, fn: () => void) => fn());
  vi.stubGlobal("navigator", { locks: { request: lock } });
  vi.stubGlobal("localStorage", {
    getItem: () => raw,
    setItem: (_k: string, v: string) => (raw = v),
  });
  const repo = new LocalRepository();
  const saved = raw;
  raw = JSON.stringify({ ...initial, revision: initial.revision + 1 });
  await expect(repo.replace("admin", initial, saved, () => {})).rejects.toThrow(
    "تغيرت البيانات",
  );
  expect(lock).toHaveBeenCalledWith(
    "pharmalink-local-state",
    expect.any(Function),
  );
});
it("الاستعادة للمدير فقط وتحتفظ بالنسخة السابقة قبل الاستبدال", async () => {
  const initial = setup();
  let raw = JSON.stringify(initial);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("localStorage", {
    getItem: () => raw,
    setItem: (_k: string, v: string) => (raw = v),
  });
  const repo = new LocalRepository();
  const before = vi.fn();
  await expect(
    repo.replace("independent", initial, raw, before),
  ).rejects.toThrow("لمدير");
  expect(before).not.toHaveBeenCalled();
  await repo.replace("admin", initial, raw, before);
  expect(before).toHaveBeenCalledTimes(1);
  expect(JSON.parse(raw).revision).toBeGreaterThan(initial.revision);
});
