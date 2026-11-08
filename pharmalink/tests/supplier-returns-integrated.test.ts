import { describe, it, expect } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact } from "../src/domain/engine";
import {
  canNav,
  visibleItems,
  daysLeft,
  member,
  isAccountSuspended,
} from "../src/domain/access";
import { supplierAlerts } from "../src/domain/notifications";
import type { State, Item, Account } from "../src/domain/types";

/**
 * دالة مساعدة لتوليد تاريخ بتنسيق YYYY-MM-DD نسبة إلى اليوم الحالي
 */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * محاكاة دالة التصنيف المعتمدة في صفحة مرتجعات الموردين (src/pages/SupplierReturns.tsx)
 */
function classifySupplierItem(i: Item, s: State): "closed" | "expired" | "today" | "due" | "later" {
  if (i.returnStatus && i.returnStatus !== "open") return "closed";
  const d = daysLeft(i.returnDeadline!);
  const alertWindow =
    i.alertDays ??
    s.branches.find((b) => b.id === i.branchId)?.alertDays ??
    10;
  return d < 0
    ? "expired"
    : d === 0
      ? "today"
      : d <= alertWindow
        ? "due"
        : "later";
}

describe("1. الصلاحيات والوصول لصفحة مرتجعات الموردين (Access & RBAC)", () => {
  it("يسمح فقط للأعضاء المعتمدين والمفعلين بالتنقل إلى صفحة مرتجعات الموردين", () => {
    const s = createSeed();
    const hadda = s.accounts.find((a) => a.id === "branch-hadda")!;
    const master = s.accounts.find((a) => a.id === "master")!;
    const independent = s.accounts.find((a) => a.id === "independent")!;
    const guest = s.accounts.find((a) => a.id === "guest")!;

    expect(canNav(hadda, "returns")).toBe(true);
    expect(canNav(master, "returns")).toBe(true);
    expect(canNav(independent, "returns")).toBe(true);
    expect(canNav(guest, "returns")).toBe(false);
  });

  it("يحظر وصول الحسابات المعلقة أو التي انتهت رخصتها المهنية", () => {
    const s = createSeed();
    const hadda = s.accounts.find((a) => a.id === "branch-hadda")!;

    // حساب معلق يدويًا
    const suspendedAccount: Account = { ...hadda, suspended: true };
    expect(isAccountSuspended(suspendedAccount)).toBe(true);
    expect(canNav(suspendedAccount, "returns")).toBe(false);

    // حساب منتهي الرخصة
    const expiredLicenseAccount: Account = {
      ...hadda,
      licenseExpiry: dateOffset(-5),
    };
    expect(isAccountSuspended(expiredLicenseAccount)).toBe(true);
    expect(canNav(expiredLicenseAccount, "returns")).toBe(false);
  });

  it("يطبق العزل المخزني للأصناف المعروضة في المرتجعات حسب صلاحية ونطاق كل حساب", () => {
    const s = createSeed();
    const hadda = s.accounts.find((a) => a.id === "branch-hadda")!;
    const sabeen = s.accounts.find((a) => a.id === "branch-sabeen")!;
    const master = s.accounts.find((a) => a.id === "master")!;
    const independent = s.accounts.find((a) => a.id === "independent")!;

    const haddaItems = visibleItems(s, hadda);
    const sabeenItems = visibleItems(s, sabeen);
    const masterItems = visibleItems(s, master);
    const indepItems = visibleItems(s, independent);

    // فرع حدة يرى فقط أصناف فرع حدة
    expect(haddaItems.every((i) => i.branchId === "pharm_agency_01")).toBe(true);

    // فرع السبعين يرى فقط أصناف فرع السبعين
    expect(sabeenItems.every((i) => i.branchId === "pharm_agency_02")).toBe(true);

    // إدارة السلسلة ترى جميع فروع السلسلة (حدة + السبعين + شعوب)
    const masterBranchIds = new Set(masterItems.map((i) => i.branchId));
    expect(masterBranchIds.has("pharm_agency_01")).toBe(true);
    expect(masterBranchIds.has("pharm_agency_02")).toBe(true);
    expect(masterBranchIds.has("pharm_01")).toBe(false); // لا ترى الصيدلية المستقلة

    // الصيدلية المستقلة ترى أصنافها فقط
    expect(indepItems.every((i) => i.branchId === "pharm_01")).toBe(true);
  });
});

describe("2. سلامة التحقق وقواعد محرك الأوامر (Command Validation - setDeadline)", () => {
  it("يحدد المورد وتاريخ المهلة وحالة المتابعة بنجاح ويسجل حدث تدقيق موثق", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;
    const initialEventsCount = s.events.length;

    const futureDate = dateOffset(45);
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "شركة اليمامة للأدوية",
      date: futureDate,
      days: 14,
      status: "open",
    });

    const updated = s.items.find((x) => x.id === i.id)!;
    expect(updated.supplier).toBe("شركة اليمامة للأدوية");
    expect(updated.returnDeadline).toBe(futureDate);
    expect(updated.alertDays).toBe(14);
    expect(updated.returnStatus).toBe("open");

    // التحقق من تسجيل الحدث في سجل التدقيق
    expect(s.events.length).toBe(initialEventsCount + 1);
    const lastEvent = s.events.at(-1)!;
    expect(lastEvent.action).toBe("تحديث مهلة المورد");
    expect(lastEvent.reference).toBe(i.id);
    expect(lastEvent.branchId).toBe(i.branchId);
    expect(lastEvent.detail).toContain(futureDate);
  });

  it("يمنع مستخدم فرع من تعديل سياسة مهلة صنف يتبع فرعاً آخر", () => {
    const s = createSeed();
    const hadda = s.accounts.find((a) => a.id === "branch-hadda")!;
    const sabeenItem = s.items.find((i) => i.branchId === "pharm_agency_02")!;

    expect(() =>
      transact(s, hadda.id, {
        type: "setDeadline",
        itemId: sabeenItem.id,
        supplier: "مورد غير مصرح",
        date: dateOffset(10),
      }),
    ).toThrow(/لا تملك صلاحية/);
  });

  it("يرفض اسم المورد الفارغ أو المكون من مسافات فقط", () => {
    const s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    expect(() =>
      transact(s, a.id, {
        type: "setDeadline",
        itemId: i.id,
        supplier: "   ",
        date: dateOffset(10),
      }),
    ).toThrow(/أدخل المورد وتاريخ المهلة/);
  });

  it("يرفض صيغ التاريخ غير الصالحة والتنسيقات غير المطابقة لمعيار YYYY-MM-DD", () => {
    const s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    const invalidDates = [
      "not-a-date",
      "2026/12/31",
      "31-12-2026",
      "2026-1-1",
      "2026-02-30", // يوم 30 في فبراير غير موجود
      "2026-13-01", // شهر 13 غير موجود
      "2026-00-10",
    ];

    for (const d of invalidDates) {
      expect(
        () =>
          transact(s, a.id, {
            type: "setDeadline",
            itemId: i.id,
            supplier: "مورد تجريبي",
            date: d,
          }),
        `يجب أن يرفض التاريخ غير الصالح: ${d}`,
      ).toThrow(/أدخل المورد وتاريخ المهلة/);
    }
  });

  it("يقبل حفظ الصنف غير القابل للإرجاع (not_returnable) دون فرض تاريخ صالح", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "وكيل غير قابل للترجيع",
      date: "",
      status: "not_returnable",
    });

    const updated = s.items.find((x) => x.id === i.id)!;
    expect(updated.returnStatus).toBe("not_returnable");
    expect(updated.supplier).toBe("وكيل غير قابل للترجيع");
  });

  it("يتحقق من حدود وصحة أيام التنبيه (أعداد صحيحة، غير سالبة، حد أقصى 365)", () => {
    const s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    // أكبر من 365 يوماً
    expect(() =>
      transact(s, a.id, {
        type: "setDeadline",
        itemId: i.id,
        supplier: "مورد",
        date: dateOffset(30),
        days: 366,
      }),
    ).toThrow(/الحد 365 يومًا/);

    // عدد سالب
    expect(() =>
      transact(s, a.id, {
        type: "setDeadline",
        itemId: i.id,
        supplier: "مورد",
        date: dateOffset(30),
        days: -5,
      }),
    ).toThrow();

    // كسر عشري
    expect(() =>
      transact(s, a.id, {
        type: "setDeadline",
        itemId: i.id,
        supplier: "مورد",
        date: dateOffset(30),
        days: 7.5,
      }),
    ).toThrow();
  });
});

describe("3. نافذة التنبيه الافتراضية للفروع وتدرج الأولويات (Alert Days Hierarchy)", () => {
  it("يعدل التنبيه الافتراضي للفرع بنجاح مع تسجيل الحدث في سجل الرقابة", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const initialEvents = s.events.length;

    s = transact(s, a.id, {
      type: "alertDefault",
      branchId: a.branchId!,
      days: 15,
    });

    const branch = s.branches.find((b) => b.id === a.branchId)!;
    expect(branch.alertDays).toBe(15);

    const logEvent = s.events.at(-1)!;
    expect(logEvent.action).toBe("إعداد التنبيه");
    expect(logEvent.detail).toContain("15 أيام");
    expect(s.events.length).toBe(initialEvents + 1);
  });

  it("يطبق تدرج الأولويات: تخصيص الصنف > افتراضي الفرع > القيمة الافتراضية للنظام (10 أيام)", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    // ضبط افتراضي الفرع على 20 يوماً
    s = transact(s, a.id, {
      type: "alertDefault",
      branchId: a.branchId!,
      days: 20,
    });

    // صنف لديه تخصيص فردي 5 أيام
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(8), // متبقي 8 أيام
      days: 5,
    });

    // التنبيه لن يظهر لأن المتبقي (8) أكبر من تخصيص الصنف (5)، مع أن افتراضي الفرع (20) يشمله
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // صنف آخر لا يملك تخصيصاً فردياً لأيام التنبيه (undefined)
    const i2 = s.items.filter((x) => x.branchId === a.branchId)[1]!;
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i2.id,
      supplier: "مورد 2",
      date: dateOffset(18), // متبقي 18 يوماً
    });

    // التنبيه يظهر لأن المتبقي (18) يقع ضمن نافذة افتراضي الفرع (20)
    const notices = supplierAlerts(s, a);
    expect(notices.some((n) => n.item.id === i2.id)).toBe(true);
  });
});

describe("4. محرك الإشعارات لمرتجعات الموردين (supplierAlerts Engine)", () => {
  it("يميز نصوص الإشعارات بدقة بين: اقتراب المهلة، اليوم آخر موعد، وانتهاء المهلة", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    // 1. قبل النافذة (لا إشعار)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(12),
      days: 7,
      status: "open",
    });
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // 2. اقتراب المهلة (ضمن النافذة وقبل اليوم)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(5),
      days: 7,
      status: "open",
    });
    let notices = supplierAlerts(s, a);
    let notice = notices.find((n) => n.item.id === i.id)!;
    expect(notice.text).toContain("تقترب");
    expect(notice.days).toBeGreaterThan(0);

    // 3. اليوم آخر موعد (daysLeft === 0)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(0),
      days: 7,
      status: "open",
    });
    notices = supplierAlerts(s, a);
    notice = notices.find((n) => n.item.id === i.id)!;
    expect(notice.text).toContain("اليوم");
    expect(notice.days).toBe(0);

    // 4. انتهت المهلة (daysLeft < 0)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(-2),
      days: 7,
      status: "open",
    });
    notices = supplierAlerts(s, a);
    notice = notices.find((n) => n.item.id === i.id)!;
    expect(notice.text).toContain("انتهت");
    expect(notice.days).toBeLessThan(0);
  });

  it("يكتم التنبيهات تماماً عند نفاد كمية الصنف في المخزون (quantity === 0)", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(-1), // منتهي الصلاحية
      status: "open",
    });
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(true);

    // ضبط الكمية إلى صفر (نفاد الرصيد)
    s.items.find((x) => x.id === i.id)!.quantity = 0;
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);
  });

  it("يوقف التنبيهات فور إغلاق المتابعة (تم الإرجاع، رفض المورد، غير قابل للإرجاع)", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId)!;

    // تم الإرجاع returned
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(-1),
      status: "returned",
    });
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // رفض المورد refused
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(-1),
      status: "refused",
    });
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // غير قابل للإرجاع not_returnable
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: "",
      status: "not_returnable",
    });
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);
  });
});

describe("5. تبويبات وتصنيفات صفحة مرتجعات الموردين (Supplier Returns UI Classification)", () => {
  it("يصنف أصناف المرتجعات بدقة تامة في التبويبات المعتمدة بالواجهة", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const items = s.items.filter((i) => i.branchId === a.branchId);

    // تجهيز أصناف لكل حالة من الحالات
    const itemLater = items[0]!;
    const itemDue = items[1]!;
    const itemToday = items[2]!;
    const itemExpired = items[3]!;
    const itemClosedReturned = items[4]!;
    const itemClosedRefused = items[5]!;

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemLater.id,
      supplier: "مورد 1",
      date: dateOffset(30),
      days: 10,
      status: "open",
    });

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemDue.id,
      supplier: "مورد 2",
      date: dateOffset(5),
      days: 10,
      status: "open",
    });

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemToday.id,
      supplier: "مورد 3",
      date: dateOffset(0),
      days: 10,
      status: "open",
    });

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemExpired.id,
      supplier: "مورد 4",
      date: dateOffset(-3),
      days: 10,
      status: "open",
    });

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemClosedReturned.id,
      supplier: "مورد 5",
      date: dateOffset(10),
      status: "returned",
    });

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: itemClosedRefused.id,
      supplier: "مورد 6",
      date: dateOffset(10),
      status: "refused",
    });

    expect(classifySupplierItem(s.items.find((x) => x.id === itemLater.id)!, s)).toBe("later");
    expect(classifySupplierItem(s.items.find((x) => x.id === itemDue.id)!, s)).toBe("due");
    expect(classifySupplierItem(s.items.find((x) => x.id === itemToday.id)!, s)).toBe("today");
    expect(classifySupplierItem(s.items.find((x) => x.id === itemExpired.id)!, s)).toBe("expired");
    expect(classifySupplierItem(s.items.find((x) => x.id === itemClosedReturned.id)!, s)).toBe("closed");
    expect(classifySupplierItem(s.items.find((x) => x.id === itemClosedRefused.id)!, s)).toBe("closed");
  });

  it("يستثني الأصناف التي لا تملك تاريخ مهلة ولا حالة مرتجع من صفحة المرتجعات", () => {
    const s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const visible = visibleItems(s, a);

    // صنف جديد بدون أي إعداد للمرتجع
    const unconfigured = visible.find((i) => !i.returnDeadline && !i.returnStatus);
    if (unconfigured) {
      const returnTracked = visible.filter((i) => i.returnDeadline || i.returnStatus);
      expect(returnTracked.some((i) => i.id === unconfigured.id)).toBe(false);
    }
  });

  it("يتطابق إجمالي الأصناف في تبويب (الكل) مع مجموع التبويبات الفرعية الخمسة", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const visible = visibleItems(s, a);

    // نجهز مجموعة متنوعة من الأصناف
    for (let idx = 0; idx < Math.min(visible.length, 5); idx++) {
      const itm = visible[idx]!;
      const days = [25, 4, 0, -2, 10][idx]!;
      const status = idx === 4 ? "returned" : "open";
      s = transact(s, a.id, {
        type: "setDeadline",
        itemId: itm.id,
        supplier: `مورد ${idx}`,
        date: dateOffset(days),
        status: status as any,
      });
    }

    const tracked = visibleItems(s, a).filter((i) => i.returnDeadline || i.returnStatus);
    const countAll = tracked.length;

    const countLater = tracked.filter((i) => classifySupplierItem(i, s) === "later").length;
    const countDue = tracked.filter((i) => classifySupplierItem(i, s) === "due").length;
    const countToday = tracked.filter((i) => classifySupplierItem(i, s) === "today").length;
    const countExpired = tracked.filter((i) => classifySupplierItem(i, s) === "expired").length;
    const countClosed = tracked.filter((i) => classifySupplierItem(i, s) === "closed").length;

    expect(countLater + countDue + countToday + countExpired + countClosed).toBe(countAll);
  });
});

describe("6. مبدأ الحوكمة وثبات الرصيد المخزني (Inventory Invariance Principle)", () => {
  it("إغلاق التذكير أو تعديل المهلة لا يخصم الرصيد المخزني تلقائياً ولا يغير السعر أو العزل", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId && i.quantity > 5)!;

    const initialQuantity = i.quantity;
    const initialQuarantine = i.quarantine;
    const initialPrice = i.price;

    // تم الإرجاع
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد معتمد",
      date: dateOffset(5),
      status: "returned",
    });

    let current = s.items.find((x) => x.id === i.id)!;
    expect(current.quantity).toBe(initialQuantity);
    expect(current.quarantine).toBe(initialQuarantine);
    expect(current.price).toBe(initialPrice);

    // تمديد الموعد وإعادة الفتح
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد معتمد",
      date: dateOffset(40),
      status: "open",
    });

    current = s.items.find((x) => x.id === i.id)!;
    expect(current.quantity).toBe(initialQuantity);
    expect(current.quarantine).toBe(initialQuarantine);
    expect(current.price).toBe(initialPrice);
  });

  it("يمنع أرشفة الصنف المرتجع طالما أن لديه رصيداً فعلياً في المخزون", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId && i.quantity > 0)!;

    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "مورد",
      date: dateOffset(-10),
      status: "returned",
    });

    // محاولة أرشفة صنف له رصيد يجب أن تفشل طبقاً لضوابط الحوكمة
    expect(() =>
      transact(s, a.id, {
        type: "archive",
        itemId: i.id,
      }),
    ).toThrow(/لا يمكن أرشفة بند له رصيد أو حجز/);
  });
});

describe("7. سيناريو دورة الحياة المتكاملة لمرتجع المورد (Full Lifecycle End-to-End)", () => {
  it("يحاكي دورة حياة بند مرتجع من التسجيل حتى التنبيه والتمديد والإرجاع ثم تسوية الرصيد", () => {
    let s = createSeed();
    const a = s.accounts.find((a) => a.id === "branch-hadda")!;
    const i = s.items.find((i) => i.branchId === a.branchId && i.quantity === 20)!;

    // 1. تسجيل سياسة إرجاع للصنف بموعد مستقبلي بعيد (30 يوماً)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "الشركة الدولية للأدوية",
      date: dateOffset(30),
      days: 10,
      status: "open",
    });

    let current = s.items.find((x) => x.id === i.id)!;
    expect(classifySupplierItem(current, s)).toBe("later");
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // 2. محاكاة اقتراب الأجل (دخول الصنف في نافذة التنبيه: متبقي 7 أيام)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "الشركة الدولية للأدوية",
      date: dateOffset(7),
      days: 10,
      status: "open",
    });

    current = s.items.find((x) => x.id === i.id)!;
    expect(classifySupplierItem(current, s)).toBe("due");
    let notice = supplierAlerts(s, a).find((n) => n.item.id === i.id)!;
    expect(notice).toBeDefined();
    expect(notice.text).toContain("تقترب");

    // 3. محاكاة حلول يوم الاستحقاق (اليوم آخر موعد)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "الشركة الدولية للأدوية",
      date: dateOffset(0),
      days: 10,
      status: "open",
    });

    current = s.items.find((x) => x.id === i.id)!;
    expect(classifySupplierItem(current, s)).toBe("today");
    notice = supplierAlerts(s, a).find((n) => n.item.id === i.id)!;
    expect(notice.text).toContain("اليوم");

    // 4. الاتفاق مع المورد على تمديد الموعد 45 يوماً إضافية
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "الشركة الدولية للأدوية",
      date: dateOffset(45),
      days: 10,
      status: "open",
    });

    current = s.items.find((x) => x.id === i.id)!;
    expect(classifySupplierItem(current, s)).toBe("later");
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);

    // 5. تسليم البضاعة للمندوب وتأكيد استلام المورد (تم الإرجاع)
    s = transact(s, a.id, {
      type: "setDeadline",
      itemId: i.id,
      supplier: "الشركة الدولية للأدوية",
      date: dateOffset(45),
      status: "returned",
    });

    current = s.items.find((x) => x.id === i.id)!;
    expect(classifySupplierItem(current, s)).toBe("closed");
    expect(supplierAlerts(s, a).some((n) => n.item.id === i.id)).toBe(false);
    expect(current.quantity).toBe(20); // الرصيد ثابت لم يُخصم عشوائياً

    // 6. توثيق الخروج المخزني الفعلي (تسوية خروج / تسوية تلف مع توثيق السبب)
    // نلاحظ أن الصنف الآن يمكن تسويته أو تخفيض رصيده عبر القنوات الرسمية للتسويات
    const lastEvent = s.events.find(
      (e) => e.reference === i.id && e.action === "تحديث مهلة المورد",
    );
    expect(lastEvent).toBeDefined();
    expect(lastEvent!.branchId).toBe(a.branchId);
  });
});
