import { committed, editableOffer } from "./offers";
import { importKey, importBlocked } from "./imports";
import type { State, Account, Line, Receipt, ImportRow, KYCDocument, SubscriptionPlan } from "./types";
import { available, ownsBranch, member, eligible, eligibilityReasons } from "./access";

const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_basic",
    name: "الباقة الأساسية",
    badge: "للانطلاق والتجربة",
    description: "حل مثالي للصيدليات الفردية والمستقلة الصغيرة لتصريف الفائض المحلي ومتابعة الصلاحيات.",
    monthlyFee: 10000,
    annualFee: 100000,
    features: [
      "عرض حتى 50 صنفاً دوائياً في البورصة",
      "تنبيهات الصلاحيات الأساسية للمخزون",
      "إدارة المخزون المحلي وسجل المعاملات",
    ],
    maxRadarItems: 5,
    unlimitedMarket: true,
    prioritySupport: false,
    targetType: "independent",
  },
  {
    id: "plan_pro",
    name: "الباقة الاحترافية المتقدمة",
    badge: "⭐ الأكثر طلباً وموصى بها",
    highlighted: true,
    description: "الخيار الأقوى للصيدليات النشطة وتجار التجزئة الراغبين في حركة بيع وشراء يومية متسارعة.",
    monthlyFee: 20000,
    annualFee: 200000,
    features: [
      "أصناف غير محدودة في البورصة",
      "رادار الأدوية الشامل والنواقص اللحظية",
      "تنبيهات الصلاحية المبكرة والمهل الذكية",
    ],
    maxRadarItems: 50,
    unlimitedMarket: true,
    prioritySupport: true,
    targetType: "independent",
  },
  {
    id: "plan_chains",
    name: "باقة سلاسل الصيدليات الكبرى",
    badge: "للمجموعات والشركات",
    description: "بنية تحتية رقمية متكاملة لإدارة سلاسل الصيدليات والفروع والمستودعات المركزية.",
    monthlyFee: 45000,
    annualFee: 450000,
    features: [
      "ربط فروع غير محدود تحت إدارة موحدة",
      "المناقلات الداخلية الفورية بين الفروع",
      "تقارير محاسبية ومخزنية موحدة للسلسلة",
    ],
    maxRadarItems: 999,
    unlimitedMarket: true,
    prioritySupport: true,
    targetType: "agency",
  },
];
export type Command =
  | { type: "addItem"; branchId: string; row: ImportRow }
  | { type: "setBlock"; itemId: string; blocked: boolean; reason: string }
  | { type: "adjust"; itemId: string; quantity: number; reason: string }
  | {
      type: "setDeadline";
      itemId: string;
      supplier?: string;
      date?: string;
      days?: number;
      status?: "open" | "closed" | "returned" | "refused" | "not_returnable";
      settleQuantity?: boolean;
    }
  | {
      type: "setBranchSupplierPolicy";
      branchId: string;
      supplierName: string;
      returnWindowDays: number;
      alertDays?: number;
    }
  | { type: "alertDefault"; branchId: string; days: number }
  | { type: "discountDefault"; branchId: string; discount: number }
  | { type: "setItemDiscount"; itemId: string; discount?: number }
  | {
      type: "packaging";
      itemId: string;
      packageUnit: string;
      baseUnit: string;
      size: number;
      split: boolean;
    }
  | {
      type: "saveSale";
      itemId: string;
      quantity: number;
      factor: number;
      price: number;
      note: string;
      id?: string;
      resume?: boolean;
      discountPercent?: number;
      saveItemDiscount?: boolean;
    }
  | { type: "archive"; itemId: string }
  | {
      type: "post";
      kind: "surplus" | "need";
      itemId?: string;
      branchId: string;
      name: string;
      quantity: number;
      unit: string;
      notes: string;
    }
  | { type: "closePost"; id: string }
  | {
      type: "transfer";
      from: string;
      to: string;
      items: { itemId: string; quantity: number }[];
      postId?: string;
      note: string;
    }
  | {
      type:
        | "approveTransfer"
        | "sendTransfer"
        | "cancelTransfer"
        | "rejectTransfer";
      id: string;
    }
  | { type: "receiveTransfer"; id: string; lines: Receipt[] }
  | {
      type: "resolve";
      id: string;
      itemId: string;
      method:
        | "accept"
        | "writeoff"
        | "return"
        | "found"
        | "lost"
        | "returnSend"
        | "returnReceive";
      reason: string;
    }
  | { type: "saleRequest"; itemId: string; quantity: number; note: string }
  | { type: "approveSale"; id: string; price: number }
  | { type: "withdrawSale" | "rejectSale"; id: string }
  | { type: "buy"; saleId: string; branchId: string; quantity: number }
  | {
      type: "approveOrder" | "sendOrder" | "receiveOrder";
      id: string;
    }
  | {
      type: "cancelOrder";
      id: string;
      reason?: string;
    }
  | {
      type: "disputeOrder";
      id: string;
      accepted: number;
      rejected?: number;
      missing?: number;
      reason: string;
    }
  | {
      type: "externalResolve";
      id: string;
      method:
        | "return"
        | "returnSend"
        | "returnReceive"
        | "accept"
        | "writeoff"
        | "found"
        | "lost";
      reason: string;
    }
  | {
      type: "resubmit";
      name: string;
      email: string;
      password?: string;
      license: string;
      pharmacistName?: string;
      practiceLicense?: string;
      commercialRegister?: string;
      taxNumber?: string;
      licenseExpiry?: string;
      documents?: KYCDocument[];
      phone?: string;
      city?: string;
      address?: string;
      facilityType?: "independent" | "agency_branch" | "agency_master";
      chainId?: string;
    }
  | {
      type: "identify";
      itemId: string;
      catalogId: string;
      strength: string;
      dosageForm: string;
    }
  | { type: "settleOrder"; id: string; reason: string }
  | {
      type: "verify";
      id: string;
      approve: boolean;
      reason?: string;
      licenseExpiry?: string;
    }
  | { type: "suspendAccount"; id: string; reason: string }
  | { type: "unsuspendAccount"; id: string }
  | { type: "updateLicenseExpiry"; id: string; expiry: string }
  | {
      type: "updateProfile";
      name?: string;
      pharmacistName?: string;
      phone?: string;
      city?: string;
      address?: string;
      operatingHours?: string;
      bio?: string;
      avatarUrl?: string;
    }
  | { type: "addBranch"; name: string; city: string; license: string }
  | { type: "policy"; policy: "centralized" | "delegated" }
  | {
      type: "radar";
      branchId: string;
      query: string;
      strength?: string;
      dosageForm?: string;
      minDiscount?: number;
      minExpiry?: number;
    }
  | { type: "removeRadar"; id: string }
  | {
      type: "import";
      branchId: string;
      rows: ImportRow[];
      fingerprint: string;
      reconciled?: boolean;
    }
  | {
      type: "register";
      name: string;
      email: string;
      password?: string;
      license: string;
      pharmacistName?: string;
      practiceLicense?: string;
      commercialRegister?: string;
      taxNumber?: string;
      licenseExpiry?: string;
      documents?: KYCDocument[];
      phone?: string;
      city?: string;
      address?: string;
      facilityType?: "independent" | "agency_branch" | "agency_master";
      chainId?: string;
    }
  | {
      type: "setPlatformSettings";
      feePercent?: number;
      minExpiryDays?: number;
      nearExpiryAlertDays?: number;
    }
  | {
      type: "updateSubscriptionPlan";
      planId: string;
      monthlyFee: number;
      annualFee: number;
      name?: string;
    }
  | {
      type: "assignSubscription";
      branchId: string;
      planId: string;
      billingCycle: "monthly" | "annual";
      paymentMethod: "wallet" | "bank_transfer" | "cash" | "free_trial";
      reference?: string;
      notes?: string;
    }
  | {
      type: "renewSubscription";
      subscriptionId: string;
      paymentMethod?: "wallet" | "bank_transfer" | "cash";
      reference?: string;
    }
  | {
      type: "setSubscriptionStatus";
      subscriptionId: string;
      status: "active" | "trial" | "grace_period" | "expired";
      notes?: string;
    };
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function whole(n: number, zero = false) {
  check(
    Number.isSafeInteger(n) && n >= (zero ? 0 : 1),
    "الكمية يجب أن تكون عددًا صحيحًا " + (zero ? "غير سالب" : "أكبر من صفر"),
  );
}
const uid = (p: string) => p + "-" + crypto.randomUUID();
const now = () => new Date().toISOString();
export function transact(
  original: State,
  actorId: string,
  command: Command,
  operationId: string = crypto.randomUUID(),
): State {
  if (original.operations.includes(operationId)) return original;
  const s = structuredClone(original);
  const actor = s.accounts.find((a) => a.id === actorId);
  check(actor, "الحساب غير موجود");
  const actorBranch = (id: string) =>
    check(
      actor.role !== "agency_master" && ownsBranch(s, actor, id),
      "هذا الإجراء لمسؤول الفرع المعني فقط",
    );
  const manage = (chainId: string) =>
    check(
      member(actor) &&
        actor.role === "agency_master" &&
        actor.chainId === chainId,
      "الاعتماد لإدارة السلسلة التابعة فقط",
    );
  const own = (id: string) =>
    check(ownsBranch(s, actor, id), "لا تملك صلاحية على هذا الفرع");
  const item = (id: string) => {
    const i = s.items.find((i) => i.id === id);
    check(i, "بند المخزون غير موجود");
    return i;
  };
  const transfer = (id: string) => {
    const t = s.transfers.find((t) => t.id === id);
    check(t, "المناقلة غير موجودة");
    return t;
  };
  const sale = (id: string) => {
    const x = s.sales.find((x) => x.id === id);
    check(x, "العرض غير موجود");
    return x;
  };
  const order = (id: string) => {
    const x = s.orders.find((x) => x.id === id);
    check(x, "الطلب غير موجود");
    return x;
  };
  const log = (
    action: string,
    reference: string,
    detail: string,
    branchId?: string,
  ) =>
    s.events.push({
      id: uid("evt"),
      at: now(),
      actor: actor.name,
      action,
      reference,
      detail,
      branchId,
    });
  const wallet = (id: string) => {
    const w = s.wallets.find((w) => w.branchId === id);
    check(w, "المحفظة التجريبية غير موجودة");
    return w;
  };
  const reserve = (
    itemId: string,
    quantity: number,
    reference: string,
    kind: "transfer" | "order",
  ) => {
    whole(quantity);
    check(available(s, itemId) >= quantity, "الكمية المتاحة غير كافية");
    s.reservations.push({
      id: uid("res"),
      itemId,
      quantity,
      reference,
      kind,
      status: "active",
    });
  };
  const active = (id: string) =>
    s.reservations.filter((r) => r.reference === id && r.status === "active");
  const release = (id: string) => {
    active(id).forEach((r) => {
      r.status = "released";
    });
    const t = s.transfers.find((t) => t.id === id);
    if (t?.postId && t.senderApproved) {
      const p = s.posts.find((p) => p.id === t.postId);
      if (p)
        p.allocated = Math.max(
          0,
          p.allocated - t.lines.reduce((n, l) => n + l.quantity, 0),
        );
    }
  };
  const consume = (id: string) => {
    const rs = active(id);
    check(rs.length > 0, "لا يوجد حجز نشط للإرسال");
    for (const r of rs) {
      const i = item(r.itemId);
      check(i.quantity >= r.quantity, "تعارض في الرصيد الفعلي");
      i.quantity -= r.quantity;
      r.status = "consumed";
    }
  };
  const addRow = (branchId: string, row: ImportRow) => {
    validateRow(row);
    check(
      !s.items.some(
        (i) =>
          i.branchId === branchId &&
          i.name === row.name &&
          i.batch === row.batch &&
          i.unit === row.unit,
      ),
      "هذا البند موجود؛ استخدم الاستيراد أو التسوية",
    );
    s.items.push({
      id: uid("inv"),
      branchId,
      ...row,
      catalogId: row.catalogId || uid("drug"),
      importSource: {
        quantity: row.quantity,
        unit: row.unit,
        price: row.price,
        at: now(),
      },
      quarantine: 0,
      blocked: false,
      archived: false,
    });
  };
  const dest = (branchId: string, l: Line) => {
    let i = s.items.find(
      (i) =>
        i.branchId === branchId &&
        i.name === l.name &&
        i.batch === l.batch &&
        i.unit === l.unit &&
        i.expiry === l.expiry &&
        (!i.catalogId ||
          !item(l.itemId).catalogId ||
          i.catalogId === item(l.itemId).catalogId),
    );
    if (!i) {
      const source = item(l.itemId);
      i = {
        ...source,
        supplier: undefined,
        returnDeadline: undefined,
        returnStatus: undefined,
        alertDays: undefined,
        importSource: undefined,
        id: uid("inv"),
        branchId,
        quantity: 0,
        quarantine: 0,
        archived: false,
      };
      s.items.push(i);
    }
    return i;
  };
  switch (command.type) {
    case "identify": {
      const i = item(command.itemId);
      own(i.branchId);
      check(
        command.catalogId.trim() &&
          command.strength.trim() &&
          command.dosageForm.trim(),
        "أكمل معرف الصنف والتركيز والشكل",
      );
      check(
        !s.orders.some((o) => o.itemId === i.id) &&
          !s.transfers.some((t) => t.lines.some((l) => l.itemId === i.id)),
        "لا تغيير هوية صنف له حركات؛ يلزم مراجعة مستقلة",
      );
      check(
        !s.items.some(
          (other) =>
            other.id !== i.id &&
            other.catalogId === command.catalogId.trim() &&
            ((other.strength && other.strength !== command.strength.trim()) ||
              (other.dosageForm &&
                other.dosageForm !== command.dosageForm.trim())),
        ),
        "معرف الصنف مستخدم بتركيز أو شكل مختلف",
      );
      i.catalogId = command.catalogId.trim();
      i.strength = command.strength.trim();
      i.dosageForm = command.dosageForm.trim();
      log(
        "توثيق تعريف صنف",
        i.id,
        `${i.catalogId} ${i.strength} ${i.dosageForm}`,
        i.branchId,
      );
      break;
    }
    case "resubmit": {
      check(
        ["pending", "agency_branch"].includes(actor.role) &&
          !actor.verified &&
          actor.rejection,
        "إعادة التقديم للطلب المرفوض",
      );
      check(
        command.name.trim() &&
          /^\S+@\S+\.\S+$/.test(command.email) &&
          command.license.trim(),
        "أكمل البيانات",
      );
      check(
        !s.accounts.some((a) => a.id !== actor.id && a.email === command.email),
        "البريد مستخدم",
      );
      Object.assign(actor, {
        name: command.name,
        email: command.email,
        ...(command.password && command.password.trim() ? { password: command.password.trim() } : {}),
        license: command.license,
        pharmacistName: command.pharmacistName,
        practiceLicense: command.practiceLicense,
        phone: command.phone,
        city: command.city,
        address: command.address,
        facilityType: command.facilityType || actor.facilityType || "independent",
        chainId: command.chainId !== undefined ? command.chainId : actor.chainId,
        commercialRegister: command.commercialRegister,
        taxNumber: command.taxNumber,
        licenseExpiry: command.licenseExpiry,
        documents: command.documents && command.documents.length ? command.documents : actor.documents,
        rejection: undefined,
      });
      log("إعادة تقديم التسجيل", actor.id, actor.name);
      break;
    }
    case "register": {
      check(actor.role === "guest", "التسجيل من حساب الزائر");
      check(
        command.name.trim() &&
          /^\S+@\S+\.\S+$/.test(command.email) &&
          command.license.trim(),
        "أكمل الاسم والبريد ورقم الترخيص",
      );
      check(!s.accounts.some((a) => a.email === command.email), "البريد مسجل");
      const a: Account = {
        id: uid("account"),
        name: command.name.trim(),
        email: command.email,
        password: command.password?.trim() || "123456",
        license: command.license,
        pharmacistName: command.pharmacistName?.trim(),
        practiceLicense: command.practiceLicense?.trim(),
        phone: command.phone?.trim(),
        city: command.city?.trim() || "صنعاء",
        address: command.address?.trim(),
        facilityType: command.facilityType || "independent",
        chainId: command.chainId,
        commercialRegister: command.commercialRegister?.trim(),
        taxNumber: command.taxNumber?.trim(),
        licenseExpiry: command.licenseExpiry,
        documents: command.documents || [],
        role: "pending",
        verified: false,
      };
      s.accounts.push(a);
      log("طلب تسجيل", a.id, `طلب تسجيل: ${a.name}`);
      break;
    }
    case "addItem":
      own(command.branchId);
      addRow(command.branchId, command.row);
      log(
        "إضافة مخزون",
        s.items.at(-1)!.id,
        `${command.row.name}: ${command.row.quantity}`,
        command.branchId,
      );
      break;
    case "setBlock": {
      const i = item(command.itemId);
      own(i.branchId);
      check(command.reason.trim().length >= 4, "اكتب سبب الإيقاف أو التفعيل");
      i.blocked = command.blocked;
      log(
        command.blocked ? "إيقاف أهلية الصنف" : "تفعيل أهلية الصنف",
        i.id,
        command.reason,
        i.branchId,
      );
      break;
    }
    case "adjust": {
      const i = item(command.itemId);
      own(i.branchId);
      whole(command.quantity, true);
      check(command.reason.trim().length >= 4, "اكتب سببًا واضحًا للتسوية");
      check(
        command.quantity >=
          s.reservations
            .filter((r) => r.itemId === i.id && r.status === "active")
            .reduce((n, r) => n + r.quantity, 0),
        "التسوية أقل من الكمية المحجوزة",
      );
      const before = i.quantity;
      i.quantity = command.quantity;
      log(
        "تسوية مخزون",
        i.id,
        `${before} ← ${i.quantity}؛ ${command.reason}`,
        i.branchId,
      );
      break;
    }
    case "alertDefault": {
      own(command.branchId);
      whole(command.days, true);
      check(command.days <= 365, "الحد 365 يومًا");
      s.branches.find((b) => b.id === command.branchId)!.alertDays =
        command.days;
      log(
        "إعداد التنبيه",
        command.branchId,
        `${command.days} أيام`,
        command.branchId,
      );
      break;
    }
    case "setBranchSupplierPolicy": {
      const b = s.branches.find((br) => br.id === command.branchId);
      check(b, "الفرع غير موجود");
      own(command.branchId);
      check(
        actor.role !== "agency_branch",
        "تحديد وتعديل سياسة المورد من صلاحية إدارة السلسلة أو الصيدلية المستقلة فقط",
      );
      check(
        command.supplierName && command.supplierName.trim().length > 0,
        "أدخل اسم المورد المعتمد للفرع",
      );
      whole(command.returnWindowDays, false);
      check(command.returnWindowDays <= 365, "شرط المهلة لا يتجاوز 365 يوماً");
      if (command.alertDays !== undefined) {
        whole(command.alertDays, true);
        check(command.alertDays <= 365, "الحد 365 يومًا");
      }
      b.supplierName = command.supplierName.trim();
      b.returnWindowDays = command.returnWindowDays;
      if (command.alertDays !== undefined) {
        b.alertDays = command.alertDays;
      }
      log(
        "تحديث سياسة مورد الفرع",
        b.id,
        `${b.supplierName} (مهلة: قبل ${b.returnWindowDays} يوماً، تنبيه: ${b.alertDays ?? 10} أيام)`,
        b.id,
      );
      break;
    }
    case "discountDefault": {
      own(command.branchId);
      check(
        actor.role !== "agency_branch",
        "تحديد الخصم الافتراضي من صلاحية إدارة السلسلة أو الصيدلية المستقلة فقط",
      );
      check(
        Number.isFinite(command.discount) &&
          command.discount >= 0 &&
          command.discount <= 99,
        "نسبة الخصم بين 0 و 99٪",
      );
      s.branches.find((b) => b.id === command.branchId)!.defaultDiscount =
        command.discount;
      log(
        "إعداد الخصم الافتراضي",
        command.branchId,
        `${command.discount}٪`,
        command.branchId,
      );
      break;
    }
    case "setItemDiscount": {
      const i = item(command.itemId);
      own(i.branchId);
      check(
        actor.role !== "agency_branch",
        "تحديد خصم الصنف من صلاحية إدارة السلسلة أو الصيدلية المستقلة",
      );
      if (command.discount !== undefined) {
        check(
          Number.isFinite(command.discount) &&
            command.discount >= 0 &&
            command.discount <= 99,
          "نسبة الخصم بين 0 و 99٪",
        );
      }
      i.discountPercent = command.discount;
      log(
        "تعديل خصم الصنف",
        i.id,
        command.discount !== undefined ? `${command.discount}٪` : "إلغاء الاستثناء والعودة للافتراضي",
        i.branchId,
      );
      break;
    }
    case "packaging": {
      const i = item(command.itemId);
      own(i.branchId);
      whole(command.size);
      check(
        command.size <= 10000 &&
          command.packageUnit.trim() &&
          command.baseUnit.trim() &&
          command.packageUnit !== command.baseUnit,
        "حدد وحدتين مختلفتين ومعاملًا صحيحًا",
      );
      const oldSize = i.unitsPerPackage || 1;
      check(
        i.quantity % oldSize === 0 && i.quarantine % oldSize === 0,
        "لا تصحيح لعبوة برصيد مفتوح؛ يلزم جرد وتسوية موثقة أولًا",
      );
      check(
        !s.sales.some(
          (x) =>
            x.itemId === i.id && ["pending", "published"].includes(x.status),
        ) &&
          !s.orders.some((o) => o.itemId === i.id) &&
          !s.transfers.some((t) => t.lines.some((l) => l.itemId === i.id)) &&
          !s.posts.some((p) => p.itemId === i.id && p.status === "open"),
        "لا تحويل مع عروض أو إعلانات نشطة أو تاريخ طلبات",
      );
      i.packageUnit = command.packageUnit;
      i.unitsPerPackage = command.size;
      i.splitAllowed = command.split;
      i.unit = command.baseUnit;
      i.quantity = (i.quantity / oldSize) * command.size;
      i.quarantine = (i.quarantine / oldSize) * command.size;
      i.price = (i.price * oldSize) / command.size;
      log(
        "تعريف العبوة",
        i.id,
        `كل ${i.packageUnit} = ${command.size} ${i.unit}`,
        i.branchId,
      );
      break;
    }
    case "saveSale": {
      const i = item(command.itemId);
      own(i.branchId);
      const priorOffer = editableOffer(s, i.id);
      if (!command.id && priorOffer?.status === "withdrawn")
        throw new Error(
          "لديك عرض موقوف؛ افتح مراجعته وإعادة نشره للحفاظ على سجل العرض",
        );
      whole(command.quantity);
      whole(command.factor);
      const factor = command.factor;
      check(
        factor === 1 || factor === (i.unitsPerPackage || 1),
        "وحدة بيع غير صحيحة",
      );
      check(
        !i.unitsPerPackage || i.splitAllowed || factor === i.unitsPerPackage,
        "البيع بالعبوة الكاملة فقط",
      );
      check(
        eligible(i, s) &&
          command.quantity <= available(s, i.id) &&
          command.quantity % factor === 0,
        "كمية غير متاحة أو ليست مضاعف وحدة البيع",
      );
      check(
        actor.role === "agency_branch" ||
          (Number.isFinite(command.price) &&
            command.price > 0 &&
            command.price <= i.price * factor),
        "أدخل سعر وحدة البيع ضمن السعر المرجعي",
      );
      let x = command.id
        ? s.sales.find((x) => x.id === command.id && x.itemId === i.id)
        : undefined;
      const before = x
        ? `السابق: ${x.quantity / (x.unitFactor || 1)} ${x.saleUnit || i.unit}؛ السعر ${x.price}. `
        : "";
      if (command.id)
        check(
          x &&
            (["pending", "published"].includes(x.status) ||
              (command.resume && x.status === "withdrawn")),
          "العرض مغلق",
        );
      check(
        !s.sales.some(
          (x) =>
            x.itemId === i.id &&
            ["pending", "published"].includes(x.status) &&
            x.id !== command.id,
        ),
        "لديك عرض نشط؛ افتح إدارته",
      );
      if (x) {
        const prior = s.orders.filter((o) => o.saleId === x!.id);
        check(
          !prior.length || factor === (x.unitFactor || 1),
          "لا تغيير لوحدة عرض له طلبات؛ يمكن تعديل المتبقي والسعر فقط",
        );
        const allocated = committed(s, x);
        check(
          actor.role !== "agency_branch" ||
            ["pending", "withdrawn"].includes(x.status),
          "تعديل المنشور للإدارة",
        );
        const computedDiscount =
          command.discountPercent !== undefined
            ? command.discountPercent
            : Math.max(
                0,
                Math.round((1 - command.price / (i.price * factor)) * 100),
              );
        if (command.saveItemDiscount && command.discountPercent !== undefined) {
          i.discountPercent = command.discountPercent;
        }
        Object.assign(x, {
          quantity: command.quantity + x.fulfilled + allocated,
          updatedAt: now(),
          unitFactor: factor,
          saleUnit: factor === 1 ? i.unit : i.packageUnit,
          price: actor.role === "agency_branch" ? 0 : command.price,
          note: command.note,
          status: actor.role === "agency_branch" ? "pending" : "published",
          discountPercent: computedDiscount,
        });
      } else {
        const computedDiscount =
          command.discountPercent !== undefined
            ? command.discountPercent
            : Math.max(
                0,
                Math.round((1 - command.price / (i.price * factor)) * 100),
              );
        if (command.saveItemDiscount && command.discountPercent !== undefined) {
          i.discountPercent = command.discountPercent;
        }
        s.sales.push({
          id: uid("sale"),
          createdAt: now(),
          updatedAt: now(),
          itemId: i.id,
          quantity: command.quantity,
          fulfilled: 0,
          unitFactor: factor,
          saleUnit: factor === 1 ? i.unit : i.packageUnit,
          status: actor.role === "agency_branch" ? "pending" : "published",
          price: actor.role === "agency_branch" ? 0 : command.price,
          note: command.note,
          discountPercent: computedDiscount,
        });
      }
      log(
        command.resume
          ? "إعادة نشر عرض"
          : command.id
            ? "تعديل المتبقي للعرض"
            : actor.role === "agency_branch"
              ? "طلب اعتماد بيع"
              : "نشر عرض",
        x?.id || s.sales.at(-1)!.id,
        `${before}المتاح للطلبات الجديدة: ${command.quantity / factor} ${factor === 1 ? i.unit : i.packageUnit}؛ السعر ${command.price}. الطلبات السابقة محفوظة.`,
        i.branchId,
      );
      break;
    }
    case "setDeadline": {
      const i = item(command.itemId);
      own(i.branchId);
      if (command.status) {
        i.returnStatus = command.status;
      }
      if (command.supplier !== undefined || command.date !== undefined) {
        check(
          command.supplier &&
            command.supplier.trim() &&
            (command.status === "not_returnable" ||
              (/^\d{4}-\d{2}-\d{2}$/.test(command.date || "") &&
                !isNaN(new Date(command.date!).getTime()) &&
                new Date(command.date!).toISOString().slice(0, 10) ===
                  command.date)),
          "أدخل المورد وتاريخ المهلة",
        );
        i.supplier = command.supplier.trim();
        i.returnDeadline = command.date;
        i.alertDays = command.days;
        if (command.days !== undefined) {
          whole(command.days, true);
          check(command.days <= 365, "الحد 365 يومًا");
        }
        log("تحديث مهلة المورد", i.id, command.date || "", i.branchId);
      } else {
        log(
          "تحديث مهلة المورد",
          i.id,
          `حالة المتابعة: ${i.returnStatus === "closed" ? "مغلقة (تم التصريف)" : i.returnStatus === "returned" ? "تم الإرجاع" : i.returnStatus === "refused" ? "تم الاستبعاد" : i.returnStatus === "not_returnable" ? "غير قابل للإرجاع" : "مفتوحة"}`,
          i.branchId,
        );
      }
      if (command.settleQuantity && (i.returnStatus === "returned") && i.quantity > 0) {
        const beforeQty = i.quantity;
        i.quantity = 0;
        log(
          "تسوية مخزون",
          i.id,
          `${beforeQty} ← 0؛ تسوية خروج مرتجع مورد معتمد: ${command.supplier || i.supplier || "المورد المعتمد"}`,
          i.branchId,
        );
      }
      break;
    }
    case "archive": {
      const i = item(command.itemId);
      own(i.branchId);
      check(
        i.quantity === 0 &&
          i.quarantine === 0 &&
          !active(i.id).length &&
          available(s, i.id) === 0,
        "لا يمكن أرشفة بند له رصيد أو حجز",
      );
      check(
        !s.sales.some(
          (x) =>
            x.itemId === i.id && ["pending", "published"].includes(x.status),
        ) && !s.posts.some((p) => p.itemId === i.id && p.status === "open"),
        "أغلق الإعلانات والطلبات أولًا",
      );
      i.archived = true;
      log("أرشفة بند", i.id, i.name, i.branchId);
      break;
    }
    case "post": {
      actorBranch(command.branchId);
      check(actor.chainId, "الساحة الداخلية لفروع السلاسل فقط");
      whole(command.quantity);
      let p = s.posts.find(
        (p) =>
          p.kind === command.kind &&
          p.branchId === command.branchId &&
          p.itemId === command.itemId &&
          p.status === "open" &&
          p.kind === "surplus",
      );
      if (command.kind === "surplus") {
        check(command.itemId, "اختر بندًا");
        const i = item(command.itemId);
        check(
          i.branchId === command.branchId && eligible(i, s),
          "الصنف غير مؤهل: راجع الملكية أو التخزين أو الصلاحية",
        );
        check(command.quantity <= available(s, i.id), "الفائض يتجاوز المتاح");
        check(
          !p || command.quantity >= p.allocated,
          "لا يمكن خفض الإعلان دون الكمية المخصصة",
        );
      } else
        check(
          command.name.trim() && command.unit.trim(),
          "أكمل الدواء والوحدة",
        );
      if (p) {
        p.quantity = command.quantity;
        p.notes = command.notes;
        p.expires = new Date(Date.now() + 48 * 3600000).toISOString();
      } else {
        s.posts.push({
          id: uid("post"),
          branchId: command.branchId,
          itemId: command.itemId,
          kind: command.kind,
          name:
            command.kind === "surplus"
              ? item(command.itemId!).name
              : command.name,
          quantity: command.quantity,
          allocated: 0,
          unit: command.unit,
          expires: new Date(Date.now() + 48 * 3600000).toISOString(),
          status: "open",
          notes: command.notes,
        });
      }
      log(
        "نشر داخلي",
        command.itemId || command.name,
        command.kind,
        command.branchId,
      );
      break;
    }
    case "closePost": {
      const p = s.posts.find((p) => p.id === command.id);
      check(p, "الإعلان غير موجود");
      own(p.branchId);
      p.status = "closed";
      log("إغلاق إعلان", p.id, p.name, p.branchId);
      break;
    }
    case "transfer": {
      const from = s.branches.find((b) => b.id === command.from && b.active),
        to = s.branches.find((b) => b.id === command.to && b.active);
      check(
        from &&
          to &&
          from.id !== to.id &&
          from.chainId &&
          from.chainId === to.chainId,
        "اختر فرعين مختلفين من السلسلة نفسها",
      );
      check(
        member(actor) &&
          (actor.role === "agency_master"
            ? actor.chainId === from.chainId
            : actor.branchId === from.id || actor.branchId === to.id),
        "ليس لك صلاحية إنشاء هذه المناقلة",
      );
      check(command.items.length > 0, "أضف بندًا");
      check(
        new Set(command.items.map((l) => l.itemId)).size ===
          command.items.length,
        "لا تكرر التشغيلة في الطلب",
      );
      const chain = s.chains.find((c) => c.id === from.chainId)!;
      const lines = command.items.map((l) => {
        whole(l.quantity);
        const i = item(l.itemId);
        check(i.branchId === from.id, "البند لا ينتمي للفرع المصدر");
        const reasons = eligibilityReasons(i, s);
        check(reasons.length === 0, `بند غير مؤهل للمناقلة: ${reasons.join(" · ")}`);
        check(l.quantity <= available(s, i.id), "الكمية تتجاوز المتاح");
        return {
          itemId: i.id,
          quantity: l.quantity,
          name: i.name,
          batch: i.batch,
          expiry: i.expiry,
          unit: i.unit,
        };
      });
      if (command.postId) {
        const p = s.posts.find((p) => p.id === command.postId);
        check(
          p && p.status === "open" && new Date(p.expires) > new Date(),
          "الإعلان مغلق أو منتهٍ",
        );
        check(
          p.kind === "surplus"
            ? p.branchId === from.id &&
                lines.every((l) => l.itemId === p.itemId)
            : p.branchId === to.id &&
                lines.every(
                  (l) => l.name.trim() === p.name.trim() && l.unit === p.unit,
                ),
          "الإعلان لا يطابق الدواء أو الوحدة",
        );
        check(
          lines.reduce((n, l) => n + l.quantity, 0) <= p.quantity - p.allocated,
          "الكمية تتجاوز المتبقي من الإعلان",
        );
      }
      const id = uid("trf");
      s.transfers.push({
        id,
        code: "PL-" + id.slice(-8).toUpperCase(),
        chainId: from.chainId,
        from: from.id,
        to: to.id,
        creator: actor.id,
        policy: chain.policy,
        senderApproved: false,
        receiverApproved: false,
        managementApproved: true,
        status: "pending",
        lines,
        postId: command.postId,
        note: command.note,
        created: now(),
      });
      log("إنشاء طلب مناقلة", id, `${from.name} ← ${to.name}`, from.id);
      break;
    }
    case "approveTransfer": {
      const t = transfer(command.id);
      check(
        ["pending", "ready"].includes(t.status),
        "الحالة لا تقبل الاعتماد",
      );
      if (actor.role === "agency_master") {
        manage(t.chainId);
        t.managementApproved = true;
      } else if (actor.branchId === t.from) {
        check(!t.senderApproved, "موافقة الفرع المرسل مسجلة سابقًا");
        for (const l of t.lines) {
          check(eligible(item(l.itemId), s), "الصنف لم يعد مؤهلًا");
          reserve(l.itemId, l.quantity, t.id, "transfer");
        }
        if (t.postId) {
          const p = s.posts.find((p) => p.id === t.postId)!;
          check(
            p.status === "open" &&
              new Date(p.expires) > new Date() &&
              p.allocated + t.lines.reduce((n, l) => n + l.quantity, 0) <=
                p.quantity,
            "انتهى الإعلان أو تغيرت كميته",
          );
          p.allocated += t.lines.reduce((n, l) => n + l.quantity, 0);
        }
        t.senderApproved = true;
      } else if (actor.branchId === t.to) {
        check(!t.receiverApproved, "موافقة الفرع المستلم مسجلة سابقًا");
        t.receiverApproved = true;
      } else {
        throw new Error("الموافقة مقتصرة على طرفي المناقلة (الفرع المرسل أو المستلم)");
      }
      t.status =
        t.senderApproved && t.receiverApproved
          ? "ready"
          : "pending";
      log("موافقة مناقلة", t.id, t.status, t.from);
      break;
    }
    case "sendTransfer": {
      const t = transfer(command.id);
      actorBranch(t.from);
      check(
        t.lines.every((l) => eligible(item(l.itemId), s)),
        "راجع أهلية البنود قبل الإرسال",
      );
      check(t.status === "ready", "المناقلة غير جاهزة للإرسال");
      consume(t.id);
      t.status = "sent";
      t.sentAt = now();
      log(
        "تأكيد إرسال",
        t.id,
        t.lines.map((l) => `${l.name}: ${l.quantity}`).join("، "),
        t.from,
      );
      break;
    }
    case "cancelTransfer":
    case "rejectTransfer": {
      const t = transfer(command.id);
      check(
        ["pending", "management", "ready"].includes(t.status),
        "لا يمكن الإلغاء بعد الإرسال أو الإغلاق",
      );
      if (actor.role === "agency_master") manage(t.chainId);
      else
        check(
          member(actor) &&
            (actor.id === t.creator ||
              [t.from, t.to].includes(actor.branchId || "")),
          "غير مصرح",
        );
      release(t.id);
      t.status = command.type === "cancelTransfer" ? "cancelled" : "rejected";
      t.rejectedBy = actor.branchId || (actor.role === "agency_master" ? "agency_master" : actor.id);
      log("إغلاق طلب مناقلة", t.id, t.status, actor.branchId || t.from);
      break;
    }
    case "receiveTransfer": {
      const t = transfer(command.id);
      actorBranch(t.to);
      check(t.status === "sent", "الاستلام متاح للمناقلة المرسلة فقط");
      check(
        command.lines.length === t.lines.length &&
          new Set(command.lines.map((l) => l.itemId)).size === t.lines.length,
        "يجب فحص جميع البنود مرة واحدة",
      );
      for (const r of command.lines) {
        const l = t.lines.find((l) => l.itemId === r.itemId);
        check(l, "بند غير تابع للمناقلة");
        whole(r.accepted, true);
        whole(r.rejected, true);
        whole(r.missing, true);
        check(
          r.accepted + r.rejected + r.missing === l.quantity,
          "مجموع الفحص لا يساوي المرسل",
        );
        l.accepted = r.accepted;
        l.rejected = r.rejected;
        l.missing = r.missing;
        const i = dest(t.to, l);
        i.quantity += r.accepted;
        i.quarantine += r.rejected;
        l.destinationId = i.id;
      }
      t.status = t.lines.some((l) => l.rejected || l.missing)
        ? "discrepancy"
        : "completed";
      t.receivedAt = now();
      log("تأكيد استلام", t.id, t.status, t.to);
      break;
    }
    case "resolve": {
      const t = transfer(command.id);
      const l = t.lines.find((l) => l.itemId === command.itemId);
      check(t.status === "discrepancy" && l, "لا يوجد اختلاف مفتوح");
      check(command.reason.trim().length >= 4, "اكتب سبب المعالجة");
      const i = item(l.destinationId!);
      const rej = l.rejected || 0,
        mis = l.missing || 0;
      if (command.method === "returnSend") {
        actorBranch(t.to);
        check(l.returnStatus === "approved" && rej > 0, "المرتجع غير معتمد");
        check(i.quarantine >= rej, "رصيد العهدة غير كافٍ");
        i.quarantine -= rej;
        l.returnStatus = "sent";
      } else if (command.method === "returnReceive") {
        actorBranch(t.from);
        check(l.returnStatus === "sent", "المرتجع لم يُرسل");
        item(l.itemId).quarantine += rej;
        l.rejected = 0;
        l.returnStatus = "received";
      } else {
        manage(t.chainId);
        if (command.method === "return") {
          check(
            rej > 0 && !l.returnStatus,
            "لا توجد كمية مرتجع قابلة للاعتماد",
          );
          l.returnStatus = "approved";
        } else if (
          command.method === "accept" ||
          command.method === "writeoff"
        ) {
          check(rej > 0 && !l.returnStatus, "الكمية غير قابلة لهذه المعالجة");
          check(i.quarantine >= rej, "رصيد العهدة غير كافٍ");
          i.quarantine -= rej;
          if (command.method === "accept") i.quantity += rej;
          l.rejected = 0;
        } else {
          check(mis > 0, "لا توجد كمية ناقصة");
          if (command.method === "found") i.quantity += mis;
          l.missing = 0;
        }
      }
      if (t.lines.every((l) => !l.rejected && !l.missing))
        t.status = "completed";
      log(
        "معالجة اختلاف",
        t.id,
        `${{ return: "اعتماد مرتجع", returnSend: "إرسال مرتجع", returnReceive: "استلام مرتجع في العهدة", accept: "قبول المعزول", writeoff: "تسوية تلف", found: "استلام الناقص بعد العثور عليه", lost: "تسوية فقد" }[command.method]}: ${command.reason}`,
        t.to,
      );
      break;
    }
    case "saleRequest": {
      const i = item(command.itemId);
      const factor =
        i.unitsPerPackage && !i.splitAllowed ? i.unitsPerPackage : 1;
      const next = transact(
        original,
        actorId,
        {
          type: "saveSale",
          itemId: i.id,
          quantity: command.quantity,
          factor,
          price: i.price * factor * 0.7,
          note: command.note,
        },
        operationId,
      );
      return next;
    }
    case "approveSale": {
      const x = sale(command.id),
        i = item(x.itemId);
      own(i.branchId);
      check(actor.role !== "agency_branch", "التسعير والاعتماد للإدارة");
      check(x.status === "pending" && eligible(i, s), "الطلب غير قابل للاعتماد");
      check(
        (!i.unitsPerPackage ||
          i.splitAllowed ||
          (x.unitFactor || 1) === i.unitsPerPackage) &&
          x.quantity % (x.unitFactor || 1) === 0,
        "وحدة الطلب القديم غير متوافقة؛ ألغ الطلب وأعد إنشاؤه",
      );
      check(
        Number.isFinite(command.price) &&
          command.price > 0 &&
          command.price <= i.price * (x.unitFactor || 1),
        "السعر يجب أن يكون موجبًا ولا يتجاوز السعر المرجعي",
      );
      check(
        x.quantity <= available(s, i.id),
        "تغير الرصيد؛ عدل الطلب قبل اعتماده",
      );
      x.price = command.price;
      x.status = "published";
      x.updatedAt = now();
      log("اعتماد عرض", x.id, `${x.price} ر.ي`, i.branchId);
      break;
    }
    case "withdrawSale":
    case "rejectSale": {
      const x = sale(command.id),
        i = item(x.itemId);
      own(i.branchId);
      check(["pending", "published"].includes(x.status), "العرض مغلق");
      if (x.status === "published" || command.type === "rejectSale")
        check(actor.role !== "agency_branch", "إيقاف العرض المنشور للإدارة");
      x.status = command.type === "rejectSale" ? "rejected" : "withdrawn";
      x.updatedAt = now();
      log("إغلاق عرض", x.id, x.status, i.branchId);
      break;
    }
    case "buy": {
      actorBranch(command.branchId);
      const x = sale(command.saleId),
        i = item(x.itemId);
      whole(command.quantity);
      check(
        command.quantity % (x.unitFactor || 1) === 0,
        "اختر عددًا صحيحًا من وحدة البيع",
      );
      const seller = s.branches.find((b) => b.id === i.branchId)!,
        buyer = s.branches.find((b) => b.id === command.branchId)!;
      check(
        x.status === "published" &&
          eligible(i, s) &&
          buyer.id !== seller.id &&
          (!buyer.chainId || buyer.chainId !== seller.chainId),
        "استخدم المناقلة الداخلية لفروع السلسلة، أو اختر عرضًا مؤهلًا",
      );
      const outstanding = committed(s, x);
      check(
        command.quantity <= x.quantity - x.fulfilled - outstanding &&
          command.quantity <= available(s, i.id),
        "الكمية المعروضة غير متاحة",
      );
      const id = uid("order"),
        amount =
          Math.round(
            ((x.price * command.quantity) / (x.unitFactor || 1)) * 100,
          ) / 100,
        feeRate = (s.platformFeePercent ?? 1.5) / 100,
        fee = Math.round(amount * feeRate);
      const central = actor.role === "agency_branch";
      if (!central) {
        const w = wallet(buyer.id);
        check(w.available >= amount + fee, "الرصيد التجريبي غير كافٍ");
        w.available -= amount + fee;
        w.held += amount + fee;
        reserve(i.id, command.quantity, id, "order");
      }
      s.orders.push({
        id,
        saleId: x.id,
        itemId: i.id,
        seller: i.branchId,
        buyer: buyer.id,
        quantity: command.quantity,
        amount,
        fee,
        status: central ? "approval" : "reserved",
        created: now(),
      });
      log("طلب شراء", id, central ? "بانتظار الإدارة" : "حجز تجريبي", buyer.id);
      break;
    }
    case "approveOrder": {
      const o = order(command.id);
      own(o.buyer);
      check(
        actor.role === "agency_master" && o.status === "approval",
        "اعتماد الشراء لإدارة سلسلة المشتري",
      );
      const x = sale(o.saleId);
      const i = item(o.itemId);
      check(x.status === "published" && eligible(i, s), "العرض لم يعد متاحًا");
      const outstanding = committed(s, x);
      check(
        o.quantity <= x.quantity - x.fulfilled - outstanding,
        "نفدت كمية العرض",
      );
      const w = wallet(o.buyer);
      check(w.available >= o.amount + o.fee, "الرصيد التجريبي غير كافٍ");
      reserve(o.itemId, o.quantity, o.id, "order");
      w.available -= o.amount + o.fee;
      w.held += o.amount + o.fee;
      o.status = "reserved";
      log("اعتماد شراء", o.id, "حجز كمية ورصيد تجريبي", o.buyer);
      break;
    }
    case "sendOrder": {
      const o = order(command.id);
      actorBranch(o.seller);
      check(o.status === "reserved", "الطلب غير جاهز للإرسال");
      check(
        eligible(item(o.itemId), s),
        "الصنف غير مؤهل للإرسال؛ يمكن إلغاء الطلب وفك الحجز قبل الإرسال",
      );
      consume(o.id);
      o.status = "sent";
      log("إرسال طلب خارجي", o.id, `${o.quantity}`, o.seller);
      break;
    }
    case "receiveOrder": {
      const o = order(command.id);
      actorBranch(o.buyer);
      check(o.status === "sent", "الطلب غير مرسل");
      const i = item(o.itemId);
      dest(o.buyer, {
        itemId: i.id,
        name: i.name,
        batch: i.batch,
        expiry: i.expiry,
        unit: i.unit,
        quantity: o.quantity,
      }).quantity += o.quantity;
      const w = wallet(o.buyer);
      check(w.held >= o.amount + o.fee, "تعارض في الرصيد المحجوز");
      w.held -= o.amount + o.fee;
      wallet(o.seller).available += o.amount;
      s.feeBalance = (s.feeBalance || 0) + o.fee;
      if (!s.feeLedger) s.feeLedger = [];
      s.feeLedger.push({
        id: uid("fee"),
        orderId: o.id,
        amount: o.amount,
        fee: o.fee,
        feePercent: s.platformFeePercent ?? 1.5,
        sellerBranchId: o.seller,
        buyerBranchId: o.buyer,
        at: now(),
      });
      sale(o.saleId).fulfilled += o.quantity;
      o.accepted = o.quantity;
      o.status = "completed";
      log(
        "استلام طلب خارجي",
        o.id,
        "تسوية رصيد تجريبية بعد استلام مطابق",
        o.buyer,
      );
      break;
    }
    case "cancelOrder": {
      const o = order(command.id);
      const isBuyer = ownsBranch(s, actor, o.buyer);
      const isSeller = ownsBranch(s, actor, o.seller);
      check(
        isBuyer || isSeller,
        "إلغاء الطلب لأحد طرفيه فقط",
      );
      check(
        ["approval", "reserved"].includes(o.status),
        "لا إلغاء بعد الإرسال",
      );
      if (o.status === "reserved") {
        active(o.id).forEach((r) => (r.status = "released"));
        const w = wallet(o.buyer);
        w.held -= o.amount + o.fee;
        w.available += o.amount + o.fee;
      }
      o.status = "cancelled";
      o.cancelledBy = isBuyer ? "buyer" : "seller";
      o.cancelReason =
        command.reason?.trim() ||
        (isBuyer ? "تراجع المشتري عن الطلب" : "اعتذار البائع عن تلبية الطلب");
      log(
        "إلغاء شراء",
        o.id,
        `${isBuyer ? "من قِبل المشتري" : "من قِبل البائع"}؛ ${o.cancelReason}`,
        isBuyer ? o.buyer : o.seller,
      );
      break;
    }
    case "externalResolve": {
      check(
        [
          "return",
          "returnSend",
          "returnReceive",
          "accept",
          "writeoff",
          "found",
          "lost",
        ].includes(command.method),
        "إجراء غير صالح",
      );
      const o = order(command.id);
      check(o.status === "dispute", "المعالجة لطلب اختلاف مفتوح فقط");
      check(command.reason.trim().length >= 4, "اكتب سبب المعالجة");
      const stock = o.destinationId ? item(o.destinationId) : undefined;
      const rejected = o.rejected || 0,
        missing = o.missing || 0;
      if (command.method === "returnSend") {
        actorBranch(o.buyer);
        check(
          o.returnStatus === "approved" &&
            stock &&
            stock.quarantine >= rejected &&
            rejected > 0,
          "المرتجع غير جاهز",
        );
        stock.quarantine -= rejected;
        o.returnStatus = "sent";
      } else if (command.method === "returnReceive") {
        actorBranch(o.seller);
        check(o.returnStatus === "sent" && rejected > 0, "المرتجع لم يرسل");
        item(o.itemId).quarantine += rejected;
        o.returned = (o.returned || 0) + rejected;
        o.rejected = 0;
        o.returnStatus = "received";
      } else {
        check(actor.role === "admin", "المعالجة باعتماد مدير المنصة");
        check(o.status === "dispute", "الطلب مغلق");
        if (command.method === "return") {
          check(rejected > 0 && !o.returnStatus, "لا مرتجع قابل للاعتماد");
          o.returnStatus = "approved";
        } else if (
          command.method === "accept" ||
          command.method === "writeoff"
        ) {
          check(
            rejected > 0 &&
              stock &&
              !o.returnStatus &&
              stock.quarantine >= rejected,
            "عهدة غير متاحة للمعالجة",
          );
          stock.quarantine -= rejected;
          if (command.method === "accept") {
            stock.quantity += rejected;
            o.accepted = (o.accepted || 0) + rejected;
          } else o.writtenOff = (o.writtenOff || 0) + rejected;
          o.rejected = 0;
        } else {
          check(missing > 0, "لا كمية ناقصة");
          if (command.method === "found") {
            const src = item(o.itemId);
            const d = dest(o.buyer, {
              itemId: src.id,
              name: src.name,
              batch: src.batch,
              expiry: src.expiry,
              unit: src.unit,
              quantity: missing,
            });
            d.quantity += missing;
            o.destinationId = d.id;
            o.accepted = (o.accepted || 0) + missing;
          } else o.lost = (o.lost || 0) + missing;
          o.missing = 0;
        }
      }
      log(
        "معالجة عهدة طلب خارجي",
        o.id,
        `${{ return: "اعتماد مرتجع", returnSend: "إرسال مرتجع", returnReceive: "استلام مرتجع في العهدة", accept: "قبول المعزول", writeoff: "تسوية تلف", found: "استلام الناقص بعد العثور عليه", lost: "تسوية فقد" }[command.method]}: ${command.reason}`,
        o.buyer,
      );
      break;
    }
    case "disputeOrder": {
      const o = order(command.id);
      actorBranch(o.buyer);
      check(o.status === "sent", "النزاع للطلب المرسل فقط");
      whole(command.accepted, true);
      const rejected = command.rejected ?? 0,
        missing = command.missing ?? o.quantity - command.accepted - rejected;
      whole(rejected, true);
      whole(missing, true);
      check(
        command.accepted + rejected + missing === o.quantity,
        "المقبول والمرفوض والناقص يجب أن يساووا المرسل",
      );
      check(command.accepted <= o.quantity, "المقبول يتجاوز المرسل");
      check(command.reason.trim().length >= 4, "اكتب تفاصيل الاختلاف");
      const i = item(o.itemId);
      const d = dest(o.buyer, {
        itemId: i.id,
        name: i.name,
        batch: i.batch,
        expiry: i.expiry,
        unit: i.unit,
        quantity: o.quantity,
      });
      d.quantity += command.accepted;
      d.quarantine += rejected;
      o.destinationId = d.id;
      o.rejected = rejected;
      o.missing = missing;
      o.accepted = command.accepted;
      o.disputeReason = command.reason;
      o.status = "dispute";
      log(
        "فتح نزاع خارجي",
        o.id,
        `مقبول ${o.accepted} من ${o.quantity}: ${command.reason}`,
        o.buyer,
      );
      break;
    }
    case "settleOrder": {
      check(actor.role === "admin", "تسوية النزاع لمدير المنصة");
      const o = order(command.id);
      check(o.status === "dispute", "لا يوجد نزاع مفتوح");
      check(
        !o.rejected && !o.missing,
        "أكمل معالجة العهدة والناقص قبل التسوية المالية",
      );
      check(command.reason.trim().length >= 4, "اكتب مرجع اتفاق الطرفين");
      const accepted = o.accepted || 0;
      const paid = Math.round(((o.amount * accepted) / o.quantity) * 100) / 100,
        fee = Math.round((o.fee * accepted) / o.quantity),
        w = wallet(o.buyer);
      check(w.held >= o.amount + o.fee, "تعارض الرصيد المحجوز");
      w.held -= o.amount + o.fee;
      w.available += o.amount + o.fee - paid - fee;
      wallet(o.seller).available += paid;
      s.feeBalance = (s.feeBalance || 0) + fee;
      sale(o.saleId).fulfilled += o.quantity;
      o.status = "completed";
      o.settlement = command.reason;
      log(
        "تسوية نزاع خارجي",
        o.id,
        `تسوية تجريبية للمقبول ${accepted}؛ المبلغ للبائع ${paid}؛ الباقي رد للمشتري. ${command.reason}. لا إعادة تلقائية لمخزون غير مستلم.`,
        o.buyer,
      );
      break;
    }
    case "verify": {
      check(actor.role === "admin", "التوثيق لمدير المنصة");
      const a = s.accounts.find(
        (a) =>
          a.id === command.id &&
          !a.verified &&
          ["pending", "agency_branch"].includes(a.role),
      );
      check(a, "لا يوجد طلب معلق");
      if (command.approve && a.branchId) {
        a.verified = true;
        a.rejection = undefined;
        if (command.licenseExpiry) a.licenseExpiry = command.licenseExpiry;
      } else if (command.approve) {
        if (a.facilityType === "agency_master") {
          const chainId = uid("chain");
          s.chains.push({
            id: chainId,
            name: a.name,
            policy: "centralized",
          });
          a.chainId = chainId;
          a.role = "agency_master";
          a.verified = true;
          a.rejection = undefined;
        } else if (a.facilityType === "agency_branch" && a.chainId) {
          const id = uid("branch");
          s.branches.push({ id, name: a.name, city: a.city || "صنعاء", chainId: a.chainId, active: true });
          s.wallets.push({ branchId: id, available: 0, held: 0 });
          a.branchId = id;
          a.role = "agency_branch";
          a.verified = true;
          a.rejection = undefined;
        } else {
          const id = uid("branch");
          s.branches.push({ id, name: a.name, city: a.city || "صنعاء", active: true });
          s.wallets.push({ branchId: id, available: 0, held: 0 });
          a.branchId = id;
          a.role = "independent";
          a.verified = true;
          a.rejection = undefined;
        }
        if (command.licenseExpiry) a.licenseExpiry = command.licenseExpiry;
      } else {
        a.rejection = command.reason || "لم يعتمد طلب التوثيق؛ يرجى مراجعة إدارة المنصة";
      }
      log(command.approve ? "قبول وتوثيق منشأة" : "رفض توثيق منشأة", a.id, a.name);
      break;
    }
    case "suspendAccount": {
      check(actor.role === "admin", "تجميد الحسابات لمدير المنصة فقط");
      const a = s.accounts.find((a) => a.id === command.id);
      check(a, "الحساب غير موجود");
      check(command.reason.trim().length >= 3, "يرجى كتابة سبب التجميد أو المخالفة");
      a.suspended = true;
      a.suspensionReason = command.reason.trim();
      a.suspendedAt = now();
      log("تجميد حساب لمخالفة مهنية", a.id, `${a.name}: ${command.reason}`);
      break;
    }
    case "unsuspendAccount": {
      check(actor.role === "admin", "فك التجميد لمدير المنصة فقط");
      const a = s.accounts.find((a) => a.id === command.id);
      check(a, "الحساب غير موجود");
      a.suspended = false;
      a.suspensionReason = undefined;
      a.suspendedAt = undefined;
      log("فك تجميد حساب", a.id, a.name);
      break;
    }
    case "updateLicenseExpiry": {
      check(actor.role === "admin", "تحديث صلاحية الترخيص لمدير المنصة");
      const a = s.accounts.find((a) => a.id === command.id);
      check(a, "الحساب غير موجود");
      check(/^\d{4}-\d{2}-\d{2}$/.test(command.expiry), "صيغة التاريخ غير صالحة YYYY-MM-DD");
      a.licenseExpiry = command.expiry;
      log("تحديث سريان ترخيص", a.id, `${a.name} حتى ${command.expiry}`);
      break;
    }
    case "updateProfile": {
      check(actor.role !== "guest", "تعديل الملف التعريفي للمستخدمين المسجلين فقط");
      if (command.name && command.name.trim()) {
        actor.name = command.name.trim();
        if (actor.branchId) {
          const b = s.branches.find((b) => b.id === actor.branchId);
          if (b) b.name = actor.name;
        }
      }
      if (command.pharmacistName !== undefined) actor.pharmacistName = command.pharmacistName.trim();
      if (command.phone !== undefined) actor.phone = command.phone.trim();
      if (command.city !== undefined) {
        actor.city = command.city.trim();
        if (actor.branchId && command.city.trim()) {
          const b = s.branches.find((b) => b.id === actor.branchId);
          if (b) b.city = command.city.trim();
        }
      }
      if (command.address !== undefined) actor.address = command.address.trim();
      if (command.operatingHours !== undefined) actor.operatingHours = command.operatingHours.trim();
      if (command.bio !== undefined) actor.bio = command.bio.trim();
      if (command.avatarUrl !== undefined) actor.avatarUrl = command.avatarUrl;
      log("تحديث الملف التعريفي", actor.id, actor.name, actor.branchId);
      break;
    }
    case "addBranch": {
      check(
        member(actor) && actor.role === "agency_master" && actor.chainId,
        "إضافة الفروع للإدارة",
      );
      check(
        command.name.trim() && command.city.trim() && command.license.trim(),
        "أكمل بيانات الفرع والترخيص",
      );
      const id = uid("branch");
      s.branches.push({
        id,
        name: command.name,
        city: command.city,
        chainId: actor.chainId,
        active: true,
      });
      s.wallets.push({ branchId: id, available: 0, held: 0 });
      s.accounts.push({
        id: uid("user"),
        name: "مسؤول " + command.name,
        branchId: id,
        chainId: actor.chainId,
        role: "agency_branch",
        verified: false,
        license: command.license,
        email: "branch-" + id.slice(-8) + "@example.test",
      });
      log("إضافة فرع للمراجعة", id, command.name, id);
      break;
    }
    case "policy": {
      check(actor.chainId, "السلسلة غير محددة");
      manage(actor.chainId);
      s.chains.find((c) => c.id === actor.chainId)!.policy = command.policy;
      log("تعديل التفويض", actor.chainId, command.policy);
      break;
    }
    case "radar": {
      own(command.branchId);
      check(command.query.trim().length >= 2, "أدخل اسم الدواء");
      if (command.minDiscount !== undefined)
        check(
          Number.isFinite(command.minDiscount) &&
            command.minDiscount >= 0 &&
            command.minDiscount <= 100,
          "الخصم بين صفر و100",
        );
      if (command.minExpiry !== undefined) whole(command.minExpiry, true);
      s.radar.push({
        id: uid("radar"),
        branchId: command.branchId,
        query: command.query.trim(),
        strength: command.strength?.trim(),
        dosageForm: command.dosageForm?.trim(),
        minDiscount: command.minDiscount,
        minExpiry: command.minExpiry,
      });
      log("إضافة للرادار", command.query, "", command.branchId);
      break;
    }
    case "removeRadar": {
      const r = s.radar.find((r) => r.id === command.id);
      check(r, "غير موجود");
      own(r.branchId);
      s.radar = s.radar.filter((entry) => entry.id !== command.id);
      break;
    }
    case "import": {
      own(command.branchId);
      check(command.rows.length > 0, "الملف فارغ");
      check(
        !s.imports.includes(command.branchId + ":" + command.fingerprint),
        "هذه الدفعة معتمدة سابقًا",
      );
      const batchKey = command.branchId + ":" + command.fingerprint;
      s.importProgress ??= {};
      const progress = s.importProgress[batchKey] ?? {
        applied: [],
        suspended: [],
      };
      progress.suspended = [];
      const seen = new Set<string>();
      let suspended = 0,
        added = 0,
        updated = 0;
      for (const row of command.rows) {
        validateRow(row);
        check(
          !s.items.some(
            (i) =>
              i.branchId === command.branchId &&
              i.name === row.name &&
              i.batch === row.batch &&
              i.unitsPerPackage &&
              i.unit !== row.unit,
          ),
          "هذا البند معرف بوحدة داخلية؛ حوّل ملف الاستيراد إلى نفس الوحدة والسعر المرجعي لها قبل الاعتماد",
        );
        const key = importKey(row);
        check(!seen.has(key), "يوجد بند مكرر داخل الملف");
        seen.add(key);
        if (progress.applied.includes(key)) continue;
        const i = s.items.find(
          (i) =>
            i.branchId === command.branchId &&
            i.name === row.name &&
            i.batch === row.batch &&
            i.unit === row.unit,
        );
        if (!i) {
          addRow(command.branchId, row);
          log(
            "استيراد بند جديد",
            s.items.at(-1)!.id,
            `${row.quantity} ${row.unit}؛ ملف ${command.fingerprint}`,
            command.branchId,
          );
          added++;
          progress.applied.push(key);
          continue;
        }
        const open = importBlocked(s, i.id);
        if (open) {
          suspended++;
          progress.suspended.push(key);
          continue;
        }
        check(
          command.reconciled || row.quantity === i.quantity,
          "أكد مراجعة مطابقة رصيد المحاسبة قبل تغيير رصيد بند موجود",
        );
        check(
          !row.catalogId || !i.catalogId || row.catalogId === i.catalogId,
          "معرف الصنف في الملف مختلف؛ راجع الهوية قبل الاعتماد",
        );
        log(
          "مطابقة رصيد مستورد",
          i.id,
          `السابق ${i.quantity}؛ الجديد ${row.quantity} ${row.unit}؛ مراجعة ${!!command.reconciled}؛ ملف ${command.fingerprint}`,
          command.branchId,
        );
        i.catalogId ??= row.catalogId;
        i.strength ??= row.strength;
        i.dosageForm ??= row.dosageForm;
        i.importSource = {
          quantity: row.quantity,
          unit: row.unit,
          price: row.price,
          at: now(),
        };
        i.quantity = row.quantity;
        i.price = row.price;
        i.ingredient = row.ingredient;
        i.expiry = row.expiry;
        i.cold = row.cold;
        i.archived = false;
        updated++;
        progress.applied.push(key);
      }
      s.importProgress[batchKey] = progress;
      if (progress.suspended.length === 0) s.imports.push(batchKey);
      log(
        "استيراد مخزون",
        command.fingerprint,
        `إضافة ${added}؛ تحديث ${updated}؛ معلق ${suspended}`,
        command.branchId,
      );
      break;
    }
    case "setPlatformSettings": {
      check(
        actor.role === "admin",
        "تعديل إعدادات وسياسات المنصة مقتصر على مدير المنصة",
      );
      if (command.feePercent !== undefined) {
        check(
          Number.isFinite(command.feePercent) &&
            command.feePercent >= 0 &&
            command.feePercent <= 20,
          "نسبة العمولة يجب أن تكون بين 0٪ و 20٪",
        );
        s.platformFeePercent = command.feePercent;
      }
      if (command.minExpiryDays !== undefined) {
        check(
          Number.isFinite(command.minExpiryDays) &&
            command.minExpiryDays >= 0 &&
            command.minExpiryDays <= 365,
          "أيام الصلاحية يجب أن تكون بين 0 و 365 يوماً",
        );
        s.minExpiryDays = command.minExpiryDays;
      }
      if (command.nearExpiryAlertDays !== undefined) {
        check(
          Number.isFinite(command.nearExpiryAlertDays) &&
            command.nearExpiryAlertDays >= 1 &&
            command.nearExpiryAlertDays <= 365,
          "نافذة الإنذار المبكر يجب أن تكون بين 1 و 365 يوماً",
        );
        s.nearExpiryAlertDays = command.nearExpiryAlertDays;
      }
      log(
        "تعديل سياسات المنصة",
        actor.id,
        `العمولة: ${s.platformFeePercent ?? 1.5}٪، أدنى صلاحية: ${s.minExpiryDays ?? 30} يوم، إنذار المخزون: ${s.nearExpiryAlertDays ?? 90} يوم`,
      );
      break;
    }
    case "updateSubscriptionPlan": {
      check(actor.role === "admin", "تعديل الباقات متاح لإدارة المنصة فقط");
      s.subscriptionPlans ??= [];
      const plan = s.subscriptionPlans.find((p) => p.id === command.planId);
      check(plan, "الباقة غير موجودة");
      check(
        Number.isFinite(command.monthlyFee) && command.monthlyFee >= 0,
        "الرسوم الشهرية يجب أن تكون عدداً موجباً",
      );
      check(
        Number.isFinite(command.annualFee) && command.annualFee >= 0,
        "الرسوم السنوية يجب أن تكون عدداً موجباً",
      );
      plan.monthlyFee = command.monthlyFee;
      plan.annualFee = command.annualFee;
      if (command.name) plan.name = command.name;
      log("تعديل باقة اشتراك", plan.id, `شهري: ${command.monthlyFee} ر.ي، سنوي: ${command.annualFee} ر.ي`);
      break;
    }
    case "assignSubscription": {
      check(
        actor.role !== "agency_branch",
        "إدارة وسداد باقات الاشتراكات محصورة بإدارة السلسلة المركزية أو الصيدلية المستقلة",
      );
      const isOwnerOrAdmin = actor.role === "admin" || ownsBranch(s, actor, command.branchId);
      check(isOwnerOrAdmin, "غير مصرح بتعيين هذا الاشتراك");
      s.subscriptions ??= [];
      s.subscriptionInvoices ??= [];
      if (!s.subscriptionPlans || s.subscriptionPlans.length === 0) {
        s.subscriptionPlans = structuredClone(DEFAULT_SUBSCRIPTION_PLANS);
      }

      const plan = s.subscriptionPlans.find((p) => p.id === command.planId) || DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === command.planId);
      check(plan, "الباقة المختارة غير موجودة");

      const isTrial = command.paymentMethod === "free_trial";
      const fee = isTrial ? 0 : command.billingCycle === "annual" ? plan.annualFee : plan.monthlyFee;
      const branch = s.branches.find((b) => b.id === command.branchId);
      check(branch, "المنشأة غير موجودة");

      const startDate = now();
      const renewalDays = isTrial ? 14 : command.billingCycle === "annual" ? 365 : 30;
      const renewalDate = new Date(Date.now() + renewalDays * 86400000).toISOString();

      let sub = s.subscriptions.find((x) =>
        (branch.chainId && x.chainId === branch.chainId) || x.branchId === command.branchId,
      );
      if (
        actor.role !== "admin" &&
        sub &&
        (sub.status === "active" || sub.status === "trial") &&
        sub.planId !== command.planId &&
        new Date(sub.renewalDate).getTime() > Date.now()
      ) {
        check(false, "لا يمكن الاشتراك في باقة أخرى أثناء سريان اشتراكك الحالي. يمكنك التبديل عند موعد التجديد القادم.");
      }
      const subId = sub?.id || uid("sub");
      if (sub) {
        sub.planId = plan.id;
        sub.billingCycle = command.billingCycle;
        sub.status = isTrial ? "trial" : "active";
        sub.amount = fee;
        sub.startDate = startDate;
        sub.renewalDate = renewalDate;
        sub.paymentMethod = command.paymentMethod;
        sub.reference = command.reference;
        sub.notes = isTrial ? "فترة تجريبية مجانية 14 يوماً" : command.notes;
        if (branch.chainId) sub.chainId = branch.chainId;
      } else {
        sub = {
          id: subId,
          branchId: command.branchId,
          chainId: branch.chainId,
          planId: plan.id,
          billingCycle: command.billingCycle,
          status: isTrial ? "trial" : "active",
          amount: fee,
          startDate,
          renewalDate,
          autoRenew: true,
          paymentMethod: command.paymentMethod,
          reference: command.reference,
          notes: isTrial ? "فترة تجريبية مجانية 14 يوماً" : command.notes,
        };
        s.subscriptions.push(sub);
      }

      // Add Invoice
      const invId = uid("inv_sub");
      s.subscriptionInvoices.push({
        id: invId,
        subscriptionId: subId,
        branchId: command.branchId,
        chainId: branch.chainId,
        planId: plan.id,
        amount: fee,
        billingCycle: command.billingCycle,
        paidAt: now(),
        periodStart: startDate,
        periodEnd: renewalDate,
        paymentMethod: isTrial ? "فترة تجريبية مجانية (14 يوماً)" : command.paymentMethod,
        reference: command.reference || invId,
        status: "paid",
      });

      log(
        "تفعيل اشتراك",
        subId,
        `${branch.name} • ${plan.name} (${command.billingCycle === "annual" ? "سنوي" : "شهري"}: ${fee} ر.ي)`,
        command.branchId,
      );
      break;
    }
    case "renewSubscription": {
      s.subscriptions ??= [];
      s.subscriptionPlans ??= [];
      s.subscriptionInvoices ??= [];

      const sub = s.subscriptions.find((x) => x.id === command.subscriptionId);
      check(sub, "الاشتراك غير موجود");
      const isOwnerOrAdmin =
        actor.role === "admin" ||
        (sub.chainId ? (actor.role === "agency_master" && actor.chainId === sub.chainId) : false) ||
        (sub.branchId ? ownsBranch(s, actor, sub.branchId) : false);
      check(isOwnerOrAdmin, "غير مصرح بتجديد هذا الاشتراك");

      if (!s.subscriptionPlans || s.subscriptionPlans.length === 0) {
        s.subscriptionPlans = structuredClone(DEFAULT_SUBSCRIPTION_PLANS);
      }
      const plan = s.subscriptionPlans.find((p) => p.id === sub.planId) || DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
      check(plan, "باقة الاشتراك غير صالحة");

      const fee = sub.billingCycle === "annual" ? plan.annualFee : plan.monthlyFee;
      const currentRenewal = new Date(sub.renewalDate).getTime();
      const baseTime = currentRenewal > Date.now() ? currentRenewal : Date.now();
      const renewalDays = sub.billingCycle === "annual" ? 365 : 30;
      const nextRenewal = new Date(baseTime + renewalDays * 86400000).toISOString();

      sub.status = "active";
      sub.renewalDate = nextRenewal;
      if (command.paymentMethod) sub.paymentMethod = command.paymentMethod;
      if (command.reference) sub.reference = command.reference;

      const invId = uid("inv_sub");
      s.subscriptionInvoices.push({
        id: invId,
        subscriptionId: sub.id,
        branchId: sub.branchId,
        chainId: sub.chainId,
        planId: plan.id,
        amount: fee,
        billingCycle: sub.billingCycle,
        paidAt: now(),
        periodStart: new Date(baseTime).toISOString(),
        periodEnd: nextRenewal,
        paymentMethod: command.paymentMethod || sub.paymentMethod || "wallet",
        reference: command.reference || invId,
        status: "paid",
      });

      const branchName = sub.chainId
        ? (s.chains.find((c) => c.id === sub.chainId)?.name || "سلسلة صيدليات")
        : (sub.branchId ? (s.branches.find((b) => b.id === sub.branchId)?.name || sub.branchId) : "صيدلية");
      log(
        "تجديد اشتراك",
        sub.id,
        `${branchName} • تم التجديد حتى ${nextRenewal.slice(0, 10)} (${fee} ر.ي)`,
        sub.branchId,
      );
      break;
    }
    case "setSubscriptionStatus": {
      check(actor.role === "admin", "تعديل حالة الاشتراكات متاح للإدارة فقط");
      s.subscriptions ??= [];
      const sub = s.subscriptions.find((x) => x.id === command.subscriptionId);
      check(sub, "الاشتراك غير موجود");
      sub.status = command.status;
      if (command.notes) sub.notes = command.notes;
      log("تغيير حالة اشتراك", sub.id, `الحالة الجديدة: ${command.status}`);
      break;
    }
  }
  s.walletMovements ??= [];
  for (const w of s.wallets) {
    const before = original.wallets.find((x) => x.branchId === w.branchId);
    if (before && (before.available !== w.available || before.held !== w.held))
      s.walletMovements.push({
        id: uid("wallet-event"),
        at: now(),
        actor: actor.id,
        branchId: w.branchId,
        availableBefore: before.available,
        availableAfter: w.available,
        heldBefore: before.held,
        heldAfter: w.held,
        reference: ("id" in command ? command.id : undefined) || operationId,
      });
  }
  s.operations.push(operationId);
  s.revision++;
  validateState(s);
  return s;
}
export function validateRow(r: ImportRow) {
  check(
    r.name.trim() && r.batch.trim() && r.unit.trim(),
    "الاسم والتشغيلة والوحدة إلزامية",
  );
  whole(r.quantity, true);
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(r.expiry) &&
      !isNaN(new Date(r.expiry).getTime()) &&
      new Date(r.expiry).toISOString().slice(0, 10) === r.expiry,
    "تاريخ غير صالح؛ استخدم YYYY-MM-DD",
  );
  check(Number.isFinite(r.price) && r.price >= 0, "السعر غير صالح");
}
export function validateState(s: State) {
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
  ] as const)
    check(Array.isArray(s[key]), "بيانات ناقصة: " + key);
  for (const records of [
    s.accounts,
    s.chains,
    s.branches,
    s.items,
    s.posts,
    s.transfers,
    s.reservations,
    s.sales,
    s.orders,
    s.events,
    s.radar,
  ]) {
    const ids = records.map((r) => r.id);
    check(
      ids.every((id) => typeof id === "string" && id.length > 0) &&
        new Set(ids).size === ids.length,
      "معرفات مفقودة أو مكررة",
    );
  }
  check(
    Number.isSafeInteger(s.revision) && s.revision >= 0,
    "إصدار بيانات غير صالح",
  );
  for (const a of s.accounts) {
    check(
      [
        "guest",
        "pending",
        "agency_branch",
        "agency_master",
        "independent",
        "admin",
      ].includes(a.role) && typeof a.verified === "boolean",
      "حساب غير صالح",
    );
    if (a.branchId)
      check(
        s.branches.some((b) => b.id === a.branchId),
        "فرع الحساب غير موجود",
      );
    if (a.chainId)
      check(
        s.chains.some((c) => c.id === a.chainId),
        "سلسلة الحساب غير موجودة",
      );
    if (a.role === "agency_branch")
      check(
        s.branches.some(
          (b) => b.id === a.branchId && b.chainId === a.chainId && !!b.chainId,
        ),
        "حساب الفرع لا يطابق سلسلته",
      );
    if (a.role === "agency_master") check(!!a.chainId, "إدارة دون سلسلة");
    if (a.role === "independent")
      check(
        s.branches.some((b) => b.id === a.branchId && !b.chainId),
        "صيدلية مستقلة دون فرع مستقل",
      );
  }
  for (const c of s.chains)
    check(
      ["centralized", "delegated"].includes(c.policy),
      "سياسة سلسلة غير صالحة",
    );
  for (const b of s.branches) {
    check(
      typeof b.active === "boolean" &&
        (!b.chainId || s.chains.some((c) => c.id === b.chainId)),
      "فرع غير صالح",
    );
    check(
      s.wallets.filter((w) => w.branchId === b.id).length === 1,
      "يلزم رصيد محفظة واحد لكل منشأة",
    );
  }
  for (const i of s.items) {
    check(
      s.branches.some((b) => b.id === i.branchId),
      "مخزون دون منشأة",
    );
    check(
      typeof i.name === "string" &&
        !!i.name.trim() &&
        typeof i.unit === "string" &&
        !!i.unit.trim() &&
        typeof i.batch === "string" &&
        !!i.batch.trim(),
      "هوية مخزون ناقصة",
    );
    check(
      Number.isFinite(i.price) &&
        i.price >= 0 &&
        [i.cold, i.blocked, i.archived].every((v) => typeof v === "boolean"),
      "خصائص مخزون غير صالحة",
    );
    if (i.unitsPerPackage !== undefined) whole(i.unitsPerPackage);
  }
  for (const t of s.transfers) {
    check(
      [
        "pending",
        "management",
        "ready",
        "sent",
        "discrepancy",
        "completed",
        "cancelled",
        "rejected",
      ].includes(t.status),
      "حالة مناقلة غير صالحة",
    );
    check(
      s.branches.some((b) => b.id === t.from && b.chainId === t.chainId) &&
        s.branches.some((b) => b.id === t.to && b.chainId === t.chainId),
      "مناقلة خارج السلسلة",
    );
    check(
      new Set(t.lines.map((l) => l.itemId)).size === t.lines.length,
      "بنود مناقلة مكررة",
    );
    for (const l of t.lines) {
      check(
        s.items.some((i) => i.id === l.itemId && i.branchId === t.from),
        "مصدر بند المناقلة غير مطابق",
      );
      const reserved = s.reservations
        .filter(
          (r) =>
            r.reference === t.id &&
            r.kind === "transfer" &&
            r.itemId === l.itemId &&
            r.status === "active",
        )
        .reduce((n, r) => n + r.quantity, 0);
      const expected =
        t.senderApproved &&
        ["pending", "management", "ready"].includes(t.status)
          ? l.quantity
          : 0;
      check(reserved === expected, "حجز المناقلة لا يطابق حالة بنودها");
    }
  }
  for (const x of s.sales) {
    check(
      ["pending", "published", "rejected", "withdrawn"].includes(x.status),
      "حالة عرض غير صالحة",
    );
    check(
      x.quantity % (x.unitFactor || 1) === 0 &&
        x.fulfilled + committed(s, x) <= x.quantity,
      "التزامات العرض تتجاوز كميته",
    );
    const closed = s.orders
      .filter((o) => o.saleId === x.id && o.status === "completed")
      .reduce((n, o) => n + o.quantity, 0);
    check(
      closed === x.fulfilled,
      "الكمية المغلقة للعرض لا تطابق طلباته المكتملة",
    );
  }
  for (const o of s.orders) {
    check(
      [
        "approval",
        "reserved",
        "sent",
        "completed",
        "cancelled",
        "dispute",
      ].includes(o.status),
      "حالة طلب غير صالحة",
    );
    const x = s.sales.find((x) => x.id === o.saleId),
      i = s.items.find((i) => i.id === o.itemId);
    check(
      x &&
        i &&
        x.itemId === o.itemId &&
        i.branchId === o.seller &&
        o.buyer !== o.seller,
      "ترابط البائع والصنف والعرض غير صحيح",
    );
    check(
      o.quantity % (x.unitFactor || 1) === 0,
      "كمية الطلب لا تطابق وحدة العرض",
    );
    const active = s.reservations.filter(
      (r) =>
        r.reference === o.id && r.kind === "order" && r.status === "active",
    );
    check(
      active.every((r) => r.itemId === o.itemId) &&
        active.reduce((n, r) => n + r.quantity, 0) ===
          (o.status === "reserved" ? o.quantity : 0),
      "حجز الطلب لا يطابق كميته وحالته",
    );
    for (const n of [
      o.accepted,
      o.rejected,
      o.missing,
      o.returned,
      o.writtenOff,
      o.lost,
    ])
      if (n !== undefined) whole(n, true);
    const resolved =
      (o.accepted || 0) +
      (o.rejected || 0) +
      (o.missing || 0) +
      (o.returned || 0) +
      (o.writtenOff || 0) +
      (o.lost || 0);
    check(resolved <= o.quantity, "تفاصيل معالجة الطلب تتجاوز كميته");
  }
  for (const r of s.reservations) {
    check(["order", "transfer"].includes(r.kind), "نوع حجز غير صالح");
    check(
      r.kind === "order"
        ? s.orders.some((o) => o.id === r.reference && o.itemId === r.itemId)
        : s.transfers.some(
            (t) =>
              t.id === r.reference &&
              t.lines.some((l) => l.itemId === r.itemId),
          ),
      "حجز دون عملية مرتبطة",
    );
  }
  for (const w of s.wallets) {
    check(
      s.branches.some((b) => b.id === w.branchId) && Number.isFinite(w.held),
      "محفظة غير صالحة",
    );
    const held = s.orders
      .filter(
        (o) =>
          o.buyer === w.branchId &&
          ["reserved", "sent", "dispute"].includes(o.status),
      )
      .reduce((n, o) => n + o.amount + o.fee, 0);
    check(
      Math.abs(w.held - held) < 0.005,
      "المبلغ المحجوز لا يطابق الطلبات القائمة",
    );
  }
  check(
    s.feeBalance === undefined ||
      (Number.isFinite(s.feeBalance) && s.feeBalance >= 0),
    "رصيد عمولات غير صالح",
  );

  for (const t of s.transfers) {
    check(
      s.branches.some((b) => b.id === t.from) &&
        s.branches.some((b) => b.id === t.to) &&
        t.from !== t.to,
      "مناقلة غير مترابطة",
    );
    check(Array.isArray(t.lines) && t.lines.length > 0, "بنود مناقلة ناقصة");
    for (const l of t.lines) {
      whole(l.quantity);
      check(
        s.items.some((i) => i.id === l.itemId),
        "بند مناقلة غير موجود",
      );
    }
  }
  for (const x of s.sales) {
    whole(x.quantity);
    whole(x.fulfilled, true);
    check(
      x.fulfilled <= x.quantity &&
        Number.isFinite(x.price) &&
        x.price >= 0 &&
        s.items.some((i) => i.id === x.itemId),
      "عرض غير صالح",
    );
    whole(x.unitFactor || 1);
  }
  for (const o of s.orders) {
    whole(o.quantity);
    check(
      Number.isFinite(o.amount) &&
        o.amount >= 0 &&
        Number.isFinite(o.fee) &&
        o.fee >= 0 &&
        s.sales.some((x) => x.id === o.saleId) &&
        s.items.some((i) => i.id === o.itemId) &&
        s.branches.some((b) => b.id === o.seller) &&
        s.branches.some((b) => b.id === o.buyer),
      "طلب شراء غير مترابط",
    );
  }
  for (const r of s.reservations) {
    whole(r.quantity);
    check(
      s.items.some((i) => i.id === r.itemId) &&
        ["active", "consumed", "released"].includes(r.status),
      "حجز غير صالح",
    );
  }
  for (const i of s.items) {
    whole(i.quantity, true);
    whole(i.quarantine, true);
    check(available(s, i.id) >= 0, "تعارض: المحجوز يتجاوز الموجود");
  }
  for (const w of s.wallets)
    check(
      Number.isFinite(w.available) && w.available >= 0 && w.held >= 0,
      "تعارض رصيد تجريبي",
    );
}
