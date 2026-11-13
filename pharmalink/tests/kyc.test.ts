import { it, expect, describe } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact } from "../src/domain/engine";
import { canNav, isLicenseExpired, isAccountSuspended } from "../src/domain/access";
import { licenseAlerts } from "../src/domain/notifications";

describe("بوابة الامتثال والتراخيص والتحقق الصيدلاني (KYC)", () => {
  it("يسجل صيدلية جديدة بالوثائق الرسمية وتكون معلقة غير معتمدة", () => {
    let s = createSeed();
    s = transact(s, "guest", {
      type: "register",
      name: "صيدلية المستقبل الحديثة",
      email: "future@pharmalink.ye",
      license: "LIC-FUT-2026",
      pharmacistName: "د. هاني أحمد",
      practiceLicense: "PRAC-8899",
      commercialRegister: "CR-77665",
      taxNumber: "TAX-1122",
      licenseExpiry: "2027-12-31",
      documents: [
        {
          id: "doc-1",
          type: "pharmacy_license",
          title: "ترخيص المنشأة",
          fileName: "lic.pdf",
          fileType: "pdf",
          dataUrl: "data:application/pdf;base64,JVBERi0x...",
          uploadedAt: "2026-11-02",
        },
      ],
    });

    const pendingAcc = s.accounts.find((a) => a.email === "future@pharmalink.ye");
    expect(pendingAcc).toBeDefined();
    expect(pendingAcc?.role).toBe("pending");
    expect(pendingAcc?.verified).toBe(false);
    expect(pendingAcc?.documents?.length).toBe(1);
    expect(pendingAcc?.pharmacistName).toBe("د. هاني أحمد");

    // الحساب المعلق لا يمكنه تصفح صفحات العمليات المحمية
    expect(canNav(pendingAcc!, "market")).toBe(false);
    expect(canNav(pendingAcc!, "inventory")).toBe(false);
  });

  it("يقبل مدير المنصة الحساب المعلق بعد مراجعة الوثائق", () => {
    let s = createSeed();
    const pending = s.accounts.find((a) => a.id === "pending")!;
    expect(pending.verified).toBe(false);
    expect(pending.role).toBe("pending");

    s = transact(s, "admin", {
      type: "verify",
      id: "pending",
      approve: true,
      licenseExpiry: "2028-05-15",
    });

    const verified = s.accounts.find((a) => a.id === "pending")!;
    expect(verified.verified).toBe(true);
    expect(verified.role).toBe("independent");
    expect(verified.licenseExpiry).toBe("2028-05-15");
    expect(canNav(verified, "market")).toBe(true);
  });

  it("يرفض مدير المنصة الحساب غير المستوفي للشروط مع ذكر السبب", () => {
    let s = createSeed();
    s = transact(s, "admin", {
      type: "verify",
      id: "pending",
      approve: false,
      reason: "مستند ترخيص مزاولة المهنة غير واضح ويحتاج إعادة رفع",
    });

    const rejected = s.accounts.find((a) => a.id === "pending")!;
    expect(rejected.verified).toBe(false);
    expect(rejected.rejection).toBe("مستند ترخيص مزاولة المهنة غير واضح ويحتاج إعادة رفع");
  });

  it("يتحقق من حساب الأيام المتبقية وتوليد تنبيهات انتهاء الترخيص (30 و 15 يوماً)", () => {
    const s = createSeed();
    // صيدلية الشفاء المتميزة تنتهي بعد 22 يوماً -> تنبيه 30 يوماً
    const acc30 = s.accounts.find((a) => a.id === "independent-2")!;
    const alerts30 = licenseAlerts(s, acc30);
    expect(alerts30.some((x) => x.type === "warning_30")).toBe(true);

    // فرع شعوب ينتهي بعد 12 يوماً -> تنبيه حرج 15 يوماً
    const acc15 = s.accounts.find((a) => a.id === "branch-shoob")!;
    const alerts15 = licenseAlerts(s, acc15);
    expect(alerts15.some((x) => x.type === "critical_15")).toBe(true);

    // المدير يتلقى جميع التنبيهات
    const adminAcc = s.accounts.find((a) => a.role === "admin")!;
    const adminAlerts = licenseAlerts(s, adminAcc);
    expect(adminAlerts.length).toBeGreaterThanOrEqual(2);
  });

  it("يعطل الحساب ويمنع العمليات تلقائياً عند انتهاء صلاحية الترخيص", () => {
    let s = createSeed();
    const acc = s.accounts.find((a) => a.id === "independent")!;
    acc.licenseExpiry = "2024-01-01"; // تاريخ ماضٍ

    expect(isLicenseExpired(acc)).toBe(true);
    expect(canNav(acc, "market")).toBe(false);
    expect(canNav(acc, "inventory")).toBe(false);

    // مدير المنصة يحدث تاريخ انتهاء الترخيص بعد التجديد
    s = transact(s, "admin", {
      type: "updateLicenseExpiry",
      id: "independent",
      expiry: "2027-12-31",
    });

    const updated = s.accounts.find((a) => a.id === "independent")!;
    expect(isLicenseExpired(updated)).toBe(false);
    expect(canNav(updated, "market")).toBe(true);
  });

  it("يمكن لمدير المنصة تجميد الحساب لمخالفة مهنية مع تسجيل السبب، وفك التجميد لاحقاً", () => {
    let s = createSeed();
    const acc = s.accounts.find((a) => a.id === "independent")!;
    expect(isAccountSuspended(acc)).toBe(false);

    // تجميد الحساب
    s = transact(s, "admin", {
      type: "suspendAccount",
      id: "independent",
      reason: "تداول أدوية غير مطابقة للمواصفات الرقابية",
    });

    const suspended = s.accounts.find((a) => a.id === "independent")!;
    expect(suspended.suspended).toBe(true);
    expect(suspended.suspensionReason).toBe("تداول أدوية غير مطابقة للمواصفات الرقابية");
    expect(isAccountSuspended(suspended)).toBe(true);
    expect(canNav(suspended, "market")).toBe(false);

    // فك التجميد
    s = transact(s, "admin", {
      type: "unsuspendAccount",
      id: "independent",
    });

    const unsuspended = s.accounts.find((a) => a.id === "independent")!;
    expect(unsuspended.suspended).toBe(false);
    expect(isAccountSuspended(unsuspended)).toBe(false);
    expect(canNav(unsuspended, "market")).toBe(true);
  });

  it("يسمح للمستخدم بتحديث ملفه التعريفي وشعاره وبيانات التواصل بنجاح", () => {
    let s = createSeed();
    s = transact(s, "independent", {
      type: "updateProfile",
      name: "صيدلية الأمل المتطورة",
      pharmacistName: "د. نجيب عبدالله غالب الأصبحي",
      phone: "777000111",
      city: "صنعاء",
      address: "شارع حدة - تقاطع الرويشان",
      operatingHours: "على مدار 24 ساعة",
      bio: "صيدلية نموذجية متخصصة في الأدوية الحديثة",
      avatarUrl: "data:image/svg+xml;utf8,<svg>logo</svg>",
    });

    const updated = s.accounts.find((a) => a.id === "independent")!;
    expect(updated.name).toBe("صيدلية الأمل المتطورة");
    expect(updated.pharmacistName).toBe("د. نجيب عبدالله غالب الأصبحي");
    expect(updated.phone).toBe("777000111");
    expect(updated.city).toBe("صنعاء");
    expect(updated.address).toBe("شارع حدة - تقاطع الرويشان");
    expect(updated.avatarUrl).toBe("data:image/svg+xml;utf8,<svg>logo</svg>");

    // التحقق من تزامن اسم الفرع المرتبط
    const branch = s.branches.find((b) => b.id === updated.branchId)!;
    expect(branch.name).toBe("صيدلية الأمل المتطورة");
  });

  it("يسمح للصيدلية المستقلة بضبط الخصم الافتراضي من الإعدادات وتخصيص استثناء لكل صنف", () => {
    let s = createSeed();
    const indAcc = s.accounts.find((a) => a.id === "independent")!;
    const branchId = indAcc.branchId!;

    // 1. تحديد نسبة الخصم الافتراضية للفرع في الإعدادات إلى 25%
    s = transact(s, "independent", {
      type: "discountDefault",
      branchId,
      discount: 25,
    });
    expect(s.branches.find((b) => b.id === branchId)?.defaultDiscount).toBe(25);

    // 2. فحص صنف ينشر عرض بيع مع حفظ استثناء خاص به بنسبة 40%
    const item = s.items.find((i) => i.branchId === branchId && !i.cold)!;
    item.expiry = "2028-01-01";
    const factor = 1;
    const discountedPrice = Math.round(item.price * factor * 0.6 * 100) / 100; // 40% discount

    s = transact(s, "independent", {
      type: "saveSale",
      itemId: item.id,
      quantity: 5,
      factor,
      price: discountedPrice,
      note: "عرض خاص بخصم استثنائي",
      discountPercent: 40,
      saveItemDiscount: true,
    });

    const sale = s.sales.find((x) => x.itemId === item.id)!;
    expect(sale.discountPercent).toBe(40);
    expect(sale.price).toBe(discountedPrice);

    // التحقق من تثبيت الاستثناء على مستوى الصنف في المخزون
    const updatedItem = s.items.find((i) => i.id === item.id)!;
    expect(updatedItem.discountPercent).toBe(40);
  });

  it("يسمح لإدارة السلسلة بضبط خصم الفروع ويمنع الفرع من تعديل الخصم بنفسه", () => {
    let s = createSeed();
    const branchHadda = s.accounts.find((a) => a.id === "branch-hadda")!;
    const branchId = branchHadda.branchId!;

    // 1. إدارة السلسلة تحدد خصم 15% لفرع حدة
    s = transact(s, "master", {
      type: "discountDefault",
      branchId,
      discount: 15,
    });
    expect(s.branches.find((b) => b.id === branchId)?.defaultDiscount).toBe(15);

    // 2. محاولة فرع حدة تعديل الخصم الافتراضي تُرفض
    expect(() =>
      transact(s, "branch-hadda", {
        type: "discountDefault",
        branchId,
        discount: 30,
      }),
    ).toThrow("تحديد الخصم الافتراضي من صلاحية إدارة السلسلة أو الصيدلية المستقلة فقط");

    // 3. محاولة الفرع تعديل خصم صنف تُرفض
    const item = s.items.find((i) => i.branchId === branchId)!;
    expect(() =>
      transact(s, "branch-hadda", {
        type: "setItemDiscount",
        itemId: item.id,
        discount: 20,
      }),
    ).toThrow("تحديد خصم الصنف من صلاحية إدارة السلسلة أو الصيدلية المستقلة");
  });
});
