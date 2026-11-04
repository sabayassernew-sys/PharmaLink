import { it, expect } from "vitest";
import { createSeed } from "../src/data/seed";
import { supplierAlerts } from "../src/domain/notifications";
import { transact } from "../src/domain/engine";
function date(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
it("يميز ما قبل فترة التنبيه وقرب المهلة واليوم وفواتها", () => {
  const s = createSeed(),
    a = s.accounts.find((a) => a.id === "branch-hadda")!,
    i = s.items.find((i) => i.branchId === a.branchId)!;
  i.supplier = "مورد تجريبي";
  i.returnStatus = "open";
  i.alertDays = 10;
  i.returnDeadline = date(11);
  expect(supplierAlerts(s, a)).toHaveLength(0);
  i.returnDeadline = date(10);
  expect(supplierAlerts(s, a)[0].text).toContain("تقترب");
  i.returnDeadline = date(0);
  expect(supplierAlerts(s, a)[0].text).toContain("اليوم");
  i.returnDeadline = date(-1);
  expect(supplierAlerts(s, a)[0].text).toContain("انتهت");
});
it("التخصيص يغلب الافتراضي والإغلاق يوقف التنبيه والتمديد يعيد الحساب", () => {
  let s = createSeed();
  const a = s.accounts.find((a) => a.id === "branch-hadda")!,
    i = s.items.find((i) => i.branchId === a.branchId)!;
  s = transact(s, a.id, {
    type: "alertDefault",
    branchId: a.branchId!,
    days: 10,
  });
  s = transact(s, a.id, {
    type: "setDeadline",
    itemId: i.id,
    supplier: "مورد",
    date: date(8),
    days: 5,
  });
  expect(supplierAlerts(s, a)).toHaveLength(0);
  s = transact(s, a.id, {
    type: "setDeadline",
    itemId: i.id,
    supplier: "مورد",
    date: date(1),
    status: "returned",
  });
  expect(supplierAlerts(s, a)).toHaveLength(0);
  s = transact(s, a.id, {
    type: "setDeadline",
    itemId: i.id,
    supplier: "مورد",
    date: date(20),
    status: "open",
  });
  expect(supplierAlerts(s, a)).toHaveLength(0);
  expect(s.items.find((x) => x.id === i.id)!.quantity).toBe(i.quantity);
});
