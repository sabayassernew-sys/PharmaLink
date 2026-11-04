import { it, expect } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact } from "../src/domain/engine";
import { canNav } from "../src/domain/access";
import { exportScope, parseBackup } from "../src/domain/backups";
import { radarMatches } from "../src/domain/offers";
function setup() {
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
  s = transact(s, "independent-2", {
    type: "buy",
    saleId: s.sales[0].id,
    branchId: "pharm_03",
    quantity: 4,
  });
  return s;
}
it("يرفض إرسال الموقوف ويسمح للبائع بإلغاء الطلب ورد الرصيد", () => {
  let s = setup();
  const id = s.orders[0].id;
  s = transact(s, "independent", {
    type: "setBlock",
    itemId: s.orders[0].itemId,
    blocked: true,
    reason: "توقف للمراجعة",
  });
  expect(() => transact(s, "independent", { type: "sendOrder", id })).toThrow();
  s = transact(s, "independent", { type: "cancelOrder", id });
  expect(s.reservations[0].status).toBe("released");
  expect(s.wallets.find((w) => w.branchId === "pharm_03")!.held).toBe(0);
});
it("لا ينقل مورد البائع وموعده إلى المشتري", () => {
  let s = setup();
  const id = s.orders[0].id,
    i = s.items.find((i) => i.id === s.orders[0].itemId)!;
  i.supplier = "مورد البائع";
  i.returnDeadline = "2027-01-01";
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", { type: "receiveOrder", id });
  const d = s.items.find(
    (x) =>
      x.branchId === "pharm_03" && x.name === i.name && x.batch === i.batch,
  )!;
  expect(d.supplier).toBeUndefined();
  expect(d.returnDeadline).toBeUndefined();
});
it("يستكمل نفس الملف بعد تعليق صف دون تكرار المكتمل", () => {
  let s = setup();
  const i = s.items.find((i) => i.id === s.orders[0].itemId)!;
  const row = {
    name: i.name,
    ingredient: i.ingredient,
    batch: i.batch,
    expiry: i.expiry,
    unit: i.unit,
    quantity: 30,
    price: 100,
    cold: false,
  };
  const c = {
    type: "import" as const,
    branchId: "pharm_01",
    fingerprint: "retry",
    rows: [row, { ...row, name: "صنف جديد", batch: "NEW", quantity: 2 }],
    reconciled: true,
  };
  s = transact(s, "independent", c);
  expect(s.items.filter((x) => x.name === "صنف جديد")).toHaveLength(1);
  s = transact(s, "independent-2", { type: "cancelOrder", id: s.orders[0].id });
  s = transact(s, "independent", c);
  expect(s.items.filter((x) => x.name === "صنف جديد")).toHaveLength(1);
  expect(s.items.find((x) => x.id === i.id)!.quantity).toBe(30);
  expect(() => transact(s, "independent", c)).toThrow(
    "هذه الدفعة معتمدة سابقًا",
  );
});
it("مسار البيع القديم لا يسمح بوحدة داخلية لعبوة كاملة فقط", () => {
  let s = createSeed();
  const i = s.items.find((i) => i.branchId === "pharm_01")!;
  i.expiry = "2030-01-01";
  i.cold = false;
  s.sales = [];
  s = transact(s, "independent", {
    type: "packaging",
    itemId: i.id,
    packageUnit: "باكت",
    baseUnit: "شريط",
    size: 10,
    split: false,
  });
  expect(() =>
    transact(s, "independent", {
      type: "saleRequest",
      itemId: i.id,
      quantity: 1,
      note: "",
    }),
  ).toThrow();
});
it("الزائر لا يفتح الإعدادات ولا يصدر بيانات الحسابات", () => {
  const s = createSeed(),
    a = s.accounts.find((a) => a.id === "guest")!;
  expect(canNav(a, "settings")).toBe(false);
  expect(() => exportScope(s, a)).toThrow();
});
it("تقرير المستخدم لا يحتوي الحسابات والمحافظ الأخرى ولا يصلح لاستعادة كاملة", () => {
  const s = createSeed(),
    a = s.accounts.find((a) => a.id === "independent")!;
  const report = exportScope(s, a);
  expect("accounts" in report).toBe(false);
  expect(report.items.every((i) => i.branchId === a.branchId)).toBe(true);
  expect(() => parseBackup(JSON.stringify(report))).toThrow();
});
it("يتحقق من النسخة الكاملة ويرفض الحجز السالب", () => {
  const s = setup();
  expect(
    parseBackup(JSON.stringify({ kind: "pharmalink-full-backup", state: s }))
      .orders,
  ).toHaveLength(1);
  s.reservations[0].quantity = -1;
  expect(() =>
    parseBackup(JSON.stringify({ kind: "pharmalink-full-backup", state: s })),
  ).toThrow();
});
it("مرتجع خارجي يعود إلى عهدة البائع بعد الاستلام فقط", () => {
  let s = setup();
  const id = s.orders[0].id;
  const run = (
    actor: string,
    method: "return" | "returnSend" | "returnReceive",
  ) => {
    s = transact(s, actor, {
      type: "externalResolve",
      id,
      method,
      reason: "معالجة موثقة",
    });
  };
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", {
    type: "disputeOrder",
    id,
    accepted: 2,
    rejected: 2,
    missing: 0,
    reason: "علبتان غير مطابقتين",
  });
  expect(() =>
    transact(s, "admin", { type: "settleOrder", id, reason: "اتفاق الطرفين" }),
  ).toThrow();
  run("admin", "return");
  run("independent-2", "returnSend");
  expect(s.items.find((i) => i.id === s.orders[0].itemId)!.quarantine).toBe(0);
  run("independent", "returnReceive");
  expect(s.items.find((i) => i.id === s.orders[0].itemId)!.quarantine).toBe(2);
  s = transact(s, "admin", {
    type: "settleOrder",
    id,
    reason: "اتفاق الطرفين موثق",
  });
  expect(s.orders[0].status).toBe("completed");
});
it("يرفض إجراء عهدة غير معروف دون تغيير الرصيد", () => {
  const s = setup();
  expect(() =>
    transact(s, "admin", {
      type: "externalResolve",
      id: s.orders[0].id,
      method: "" as "lost",
      reason: "اختبار موثق",
    }),
  ).toThrow();
});
it("إعادة تقديم التسجيل المرفوض تمحو الرفض وتبقيه للمراجعة", () => {
  let s = createSeed();
  s = transact(s, "admin", { type: "verify", id: "pending", approve: false });
  s = transact(s, "pending", {
    type: "resubmit",
    name: "تصحيح المنشأة",
    email: "new@example.test",
    license: "REAL-01",
  });
  expect(s.accounts.find((a) => a.id === "pending")!.rejection).toBeUndefined();
  expect(s.accounts.find((a) => a.id === "pending")!.verified).toBe(false);
});
it("فلتر الرادار يستبعد التركيز المجهول ويطابق المعرف", () => {
  let s = setup();
  const i = s.items.find((i) => i.id === s.orders[0].itemId)!;
  const a = s.accounts.find((a) => a.id === "branch-hadda")!;
  expect(radarMatches(s, a, i.name, { strength: "10mg" })).toHaveLength(0);
  i.strength = "10mg";
  i.dosageForm = "قرص";
  expect(
    radarMatches(s, a, i.name, {
      strength: "10mg",
      dosageForm: "قرص",
      minDiscount: 20,
    }),
  ).toHaveLength(1);
});
it("يرفض تغيير رصيد مستورد دون تأكيد المطابقة بعد الجرد", () => {
  let s = createSeed();
  const i = s.items.find((i) => i.branchId === "pharm_01")!;
  const c = {
    type: "import" as const,
    branchId: "pharm_01",
    rows: [
      {
        name: i.name,
        ingredient: i.ingredient,
        batch: i.batch,
        expiry: i.expiry,
        unit: i.unit,
        quantity: i.quantity + 1,
        price: i.price,
        cold: i.cold,
      },
    ],
    fingerprint: "accounting-change",
  };
  expect(() => transact(s, "independent", c)).toThrow("مطابقة");
  s = transact(s, "independent", { ...c, reconciled: true });
  expect(s.items.find((x) => x.id === i.id)!.importSource?.quantity).toBe(
    i.quantity + 1,
  );
});
it("تصحيح العبوة بدون حركة يحافظ على قيمة الرصيد", () => {
  let s = createSeed();
  const i = s.items.find((i) => i.branchId === "pharm_01")!;
  s.sales = [];
  const value = i.quantity * i.price;
  s = transact(s, "independent", {
    type: "packaging",
    itemId: i.id,
    packageUnit: "باكت",
    baseUnit: "شريط",
    size: 10,
    split: true,
  });
  s = transact(s, "independent", {
    type: "packaging",
    itemId: i.id,
    packageUnit: "باكت",
    baseUnit: "شريط",
    size: 5,
    split: true,
  });
  const result = s.items.find((x) => x.id === i.id)!;
  expect(result.quantity).toBe(i.quantity * 5);
  expect(result.quantity * result.price).toBe(value);
});
it("يسجل فرق المحفظة المحجوزة دون فقد سجل الحركة", () => {
  let s = setup();
  expect(s.walletMovements?.length).toBe(1);
  const m = s.walletMovements![0];
  expect(m.heldAfter - m.heldBefore).toBe(s.orders[0].amount + s.orders[0].fee);
  s = transact(s, "independent-2", { type: "cancelOrder", id: s.orders[0].id });
  expect(s.walletMovements?.length).toBe(2);
});
it("الناقص الخارجي لا يستلم ولا يدفع قبل اعتماد التسوية", () => {
  let s = setup();
  const id = s.orders[0].id;
  s = transact(s, "independent", { type: "sendOrder", id });
  s = transact(s, "independent-2", {
    type: "disputeOrder",
    id,
    accepted: 2,
    rejected: 0,
    missing: 2,
    reason: "عجز في الاستلام",
  });
  expect(s.orders[0].missing).toBe(2);
  s = transact(s, "admin", {
    type: "externalResolve",
    id,
    method: "lost",
    reason: "عجز مثبت باتفاق الطرفين",
  });
  s = transact(s, "admin", {
    type: "settleOrder",
    id,
    reason: "رد قيمة العجز باتفاق الطرفين",
  });
  expect(s.orders[0].status).toBe("completed");
  expect(s.feeBalance).toBeGreaterThanOrEqual(0);
});
