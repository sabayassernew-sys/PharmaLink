import { describe, it, expect } from "vitest";
import { createSeed } from "../src/data/seed";
import { transact, validateState } from "../src/domain/engine";
import type { Command } from "../src/domain/engine";
import {
  available,
  visibleItems,
  canNav,
  eligible,
} from "../src/domain/access";
import type { State } from "../src/domain/types";
const A = "pharm_agency_01",
  B = "pharm_agency_02";
function fixture() {
  const s = createSeed();
  s.items = s.items.filter((i) => i.branchId !== A);
  s.items.push({
    id: "test",
    branchId: A,
    name: "Test drug",
    ingredient: "Active 10mg",
    batch: "B1",
    expiry: "2030-01-01",
    unit: "box",
    quantity: 25,
    quarantine: 0,
    price: 1000,
    cold: false,
    blocked: false,
    archived: false,
  });
  s.posts = [];
  s.sales = [];
  return s;
}
function go(s: State, c: Command, actor = "branch-hadda") {
  return transact(s, actor, c);
}
function request(s: State) {
  return go(s, {
    type: "transfer",
    from: A,
    to: B,
    items: [{ itemId: "test", quantity: 10 }],
    note: "test",
  });
}
function ready() {
  let s = request(fixture());
  const id = s.transfers[0].id;
  s = go(s, { type: "approveTransfer", id });
  s = go(s, { type: "approveTransfer", id }, "branch-sabeen");
  s = go(s, { type: "approveTransfer", id }, "master");
  return s;
}
function sent() {
  const s = ready();
  return go(s, { type: "sendTransfer", id: s.transfers[0].id });
}
describe("صلاحيات ونطاق البيانات", () => {
  it("لا يعرض مخزون فرع آخر", () => {
    const s = fixture();
    expect(
      visibleItems(
        s,
        s.accounts.find((a) => a.id === "branch-hadda")!,
      ).every((i) => i.branchId === A),
    ).toBe(true);
  });
  it("الزائر والحساب المعلق لا يصلان للتداول", () => {
    const s = fixture();
    for (const a of s.accounts.filter((a) =>
      ["guest", "pending"].includes(a.role),
    )) {
      expect(canNav(a, "market")).toBe(false);
      expect(visibleItems(s, a)).toHaveLength(0);
    }
  });
  it("يرفض تزييف سياق غير موجود", () =>
    expect(() =>
      transact(fixture(), "fake", {
        type: "adjust",
        itemId: "test",
        quantity: 1,
        reason: "اختبار",
      }),
    ).toThrow());
  it("يمنع المستقل من اعتماد مخزون الفرع", () => {
    const s = request(fixture());
    expect(() =>
      go(s, { type: "approveTransfer", id: s.transfers[0].id }, "independent"),
    ).toThrow();
  });
  it("الإدارة لا تؤكد الإرسال الفعلي", () => {
    const s = ready();
    expect(() =>
      go(s, { type: "sendTransfer", id: s.transfers[0].id }, "master"),
    ).toThrow();
  });
  it("الفرع لا يعتمد سعر البيع", () => {
    const s = go(fixture(), {
      type: "saleRequest",
      itemId: "test",
      quantity: 5,
      note: "",
    });
    expect(() =>
      go(s, { type: "approveSale", id: s.sales[0].id, price: 700 }),
    ).toThrow();
  });
  it("يمنع تعديل مخزون لا يملكه الحساب", () =>
    expect(() =>
      go(
        fixture(),
        { type: "adjust", itemId: "test", quantity: 1, reason: "اختبار" },
        "branch-sabeen",
      ),
    ).toThrow());
});
describe("دورة المناقلة والحجز", () => {
  it("لا يخصم عند الطلب", () => {
    const s = request(fixture());
    expect(available(s, "test")).toBe(25);
    expect(s.reservations).toHaveLength(0);
  });
  it("يشترط موافقة الطرفين والإدارة", () => {
    let s = request(fixture());
    const id = s.transfers[0].id;
    s = go(s, { type: "approveTransfer", id });
    expect(s.transfers[0].status).toBe("pending");
    s = go(s, { type: "approveTransfer", id }, "branch-sabeen");
    expect(s.transfers[0].status).toBe("management");
    s = go(s, { type: "approveTransfer", id }, "master");
    expect(s.transfers[0].status).toBe("ready");
  });
  it("يفوض الفروع مع حفظ سياسة العملية", () => {
    let s = fixture();
    s.chains[0].policy = "delegated";
    s = request(s);
    s.chains[0].policy = "centralized";
    const id = s.transfers[0].id;
    s = go(s, { type: "approveTransfer", id });
    s = go(s, { type: "approveTransfer", id }, "branch-sabeen");
    expect(s.transfers[0].status).toBe("ready");
  });
  it("يمنع تكرار البند في الطلب", () =>
    expect(() =>
      go(fixture(), {
        type: "transfer",
        from: A,
        to: B,
        items: [
          { itemId: "test", quantity: 15 },
          { itemId: "test", quantity: 15 },
        ],
        note: "",
      }),
    ).toThrow());
  it("يحجز دون خصم ثم يستهلك الحجز عند الإرسال", () => {
    let s = ready();
    expect(s.items.find((i) => i.id === "test")!.quantity).toBe(25);
    expect(available(s, "test")).toBe(15);
    s = go(s, { type: "sendTransfer", id: s.transfers[0].id });
    expect(s.items.find((i) => i.id === "test")!.quantity).toBe(15);
    expect(available(s, "test")).toBe(15);
    expect(s.reservations[0].status).toBe("consumed");
  });
  it("يمنع تجاوز الرصيد بطلبين", () => {
    let s = request(fixture());
    s = go(s, {
      type: "transfer",
      from: A,
      to: B,
      items: [{ itemId: "test", quantity: 20 }],
      note: "",
    });
    s = go(s, { type: "approveTransfer", id: s.transfers[0].id });
    expect(() =>
      go(s, { type: "approveTransfer", id: s.transfers[1].id }),
    ).toThrow();
  });
  it("يفك الحجز عند الإلغاء دون حذف التاريخ", () => {
    const s = ready(),
      id = s.transfers[0].id;
    const n = go(s, { type: "cancelTransfer", id });
    expect(available(n, "test")).toBe(25);
    expect(n.reservations[0].status).toBe("released");
    expect(n.events.length).toBeGreaterThan(s.events.length);
  });
  it("يرفض الإلغاء بعد الإرسال", () => {
    const s = sent();
    expect(() =>
      go(s, { type: "cancelTransfer", id: s.transfers[0].id }),
    ).toThrow();
  });
  it("يرفض مناقلة الفرع لنفسه وخارج السلسلة", () => {
    for (const to of [A, "pharm_01"])
      expect(() =>
        go(fixture(), {
          type: "transfer",
          from: A,
          to,
          items: [{ itemId: "test", quantity: 1 }],
          note: "",
        }),
      ).toThrow();
  });
  it("يحفظ الحالة الأصلية بالكامل عند فشل العملية", () => {
    const s = ready(),
      before = JSON.stringify(s);
    s.items.find((i) => i.id === "test")!.quantity = 1;
    const copy = JSON.stringify(s);
    expect(() =>
      go(s, { type: "sendTransfer", id: s.transfers[0].id }),
    ).toThrow();
    expect(JSON.stringify(s)).toBe(copy);
    expect(copy).not.toBe(before);
  });
  it("مفتاح منع التكرار لا ينفذ العملية مرتين", () => {
    let s = ready();
    const c: Command = { type: "sendTransfer", id: s.transfers[0].id };
    s = transact(s, "branch-hadda", c, "same");
    const n = transact(s, "branch-hadda", c, "same");
    expect(n).toBe(s);
    expect(n.items.find((i) => i.id === "test")!.quantity).toBe(15);
  });
});
describe("فحص الاستلام والاختلافات", () => {
  it("يرفض قائمة استلام فارغة", () => {
    const s = sent();
    expect(() =>
      go(
        s,
        { type: "receiveTransfer", id: s.transfers[0].id, lines: [] },
        "branch-sabeen",
      ),
    ).toThrow();
  });
  it("يرفض تكرار البند", () => {
    const s = sent();
    const line = { itemId: "test", accepted: 10, rejected: 0, missing: 0 };
    expect(() =>
      go(
        s,
        { type: "receiveTransfer", id: s.transfers[0].id, lines: [line, line] },
        "branch-sabeen",
      ),
    ).toThrow();
  });
  it("يرفض القيم السالبة والكسور وغير الرقمية", () => {
    for (const n of [-1, 1.5, NaN]) {
      const s = sent();
      expect(() =>
        go(
          s,
          {
            type: "receiveTransfer",
            id: s.transfers[0].id,
            lines: [
              { itemId: "test", accepted: 10 - n, rejected: n, missing: 0 },
            ],
          },
          "branch-sabeen",
        ),
      ).toThrow();
    }
  });
  it("يطبق سيناريو 8 مقبول و1 مرفوض و1 ناقص", () => {
    let s = sent();
    s = go(
      s,
      {
        type: "receiveTransfer",
        id: s.transfers[0].id,
        lines: [{ itemId: "test", accepted: 8, rejected: 1, missing: 1 }],
      },
      "branch-sabeen",
    );
    const i = s.items.find((i) => i.branchId === B && i.batch === "B1")!;
    expect(i.quantity).toBe(8);
    expect(i.quarantine).toBe(1);
    expect(s.transfers[0].status).toBe("discrepancy");
    validateState(s);
  });
  it("لا يسمح باستلام ثان", () => {
    let s = sent();
    const c: Command = {
      type: "receiveTransfer",
      id: s.transfers[0].id,
      lines: [{ itemId: "test", accepted: 10, rejected: 0, missing: 0 }],
    };
    s = go(s, c, "branch-sabeen");
    expect(() => go(s, c, "branch-sabeen")).toThrow();
  });
  it("المرتجع لا يعود للمرسل قبل الاستلام الفعلي ويبقى معزولًا", () => {
    let s = sent();
    const id = s.transfers[0].id;
    s = go(
      s,
      {
        type: "receiveTransfer",
        id,
        lines: [{ itemId: "test", accepted: 8, rejected: 2, missing: 0 }],
      },
      "branch-sabeen",
    );
    s = go(
      s,
      {
        type: "resolve",
        id,
        itemId: "test",
        method: "return",
        reason: "عدم مطابقة موثق",
      },
      "master",
    );
    s = go(
      s,
      {
        type: "resolve",
        id,
        itemId: "test",
        method: "returnSend",
        reason: "تأكيد إعادة الكمية",
      },
      "branch-sabeen",
    );
    expect(s.items.find((i) => i.id === "test")!.quarantine).toBe(0);
    s = go(s, {
      type: "resolve",
      id,
      itemId: "test",
      method: "returnReceive",
      reason: "تم الاستلام الفعلي",
    });
    expect(s.items.find((i) => i.id === "test")!.quarantine).toBe(2);
    expect(s.transfers[0].status).toBe("completed");
  });
});
describe("الإعلانات والاستيراد والتسويات", () => {
  it("نشر الفائض لا يحجز ويحدث الإعلان بدل تكراره", () => {
    let s = fixture();
    const c: Command = {
      type: "post",
      kind: "surplus",
      itemId: "test",
      branchId: A,
      name: "Test drug",
      quantity: 10,
      unit: "box",
      notes: "",
    };
    s = go(s, c);
    s = go(s, { ...c, quantity: 12 });
    expect(s.posts.length).toBe(1);
    expect(s.posts[0].quantity).toBe(12);
    expect(available(s, "test")).toBe(25);
  });
  it("طلب الاحتياج لا يخلق بند مخزون", () => {
    const s = fixture();
    const n = go(s, {
      type: "post",
      kind: "need",
      branchId: A,
      name: "Other",
      quantity: 5,
      unit: "box",
      notes: "",
    });
    expect(n.items.length).toBe(s.items.length);
  });
  it("لا يُلغى الطلب عند إغلاق الإعلان", () => {
    let s = fixture();
    s = go(s, {
      type: "post",
      kind: "surplus",
      itemId: "test",
      branchId: A,
      name: "Test drug",
      quantity: 10,
      unit: "box",
      notes: "",
    });
    s = go(s, {
      type: "transfer",
      from: A,
      to: B,
      items: [{ itemId: "test", quantity: 4 }],
      postId: s.posts[0].id,
      note: "",
    });
    s = go(s, { type: "approveTransfer", id: s.transfers[0].id });
    s = go(s, { type: "closePost", id: s.posts[0].id });
    expect(available(s, "test")).toBe(21);
    expect(s.reservations[0].status).toBe("active");
  });
  it("يرفض الأرشفة لبند ذي رصيد", () =>
    expect(() => go(fixture(), { type: "archive", itemId: "test" })).toThrow());
  it("يرفض التسوية تحت المحجوز", () =>
    expect(() =>
      go(ready(), {
        type: "adjust",
        itemId: "test",
        quantity: 5,
        reason: "جرد فعلي",
      }),
    ).toThrow());
  it("الاستيراد يعلق المفتوح ويحدث المستقر دون تكرار", () => {
    let s = ready();
    const r = {
      name: "Test drug",
      ingredient: "A",
      batch: "B1",
      expiry: "2030-01-01",
      unit: "box",
      quantity: 35,
      price: 1000,
      cold: false,
    };
    s = go(s, { type: "import", branchId: A, rows: [r], fingerprint: "f1" });
    expect(s.items.find((i) => i.id === "test")!.quantity).toBe(25);
    s = go(s, { type: "cancelTransfer", id: s.transfers[0].id });
    s = go(s, {
      type: "import",
      branchId: A,
      rows: [r],
      fingerprint: "f2",
      reconciled: true,
    });
    expect(s.items.filter((i) => i.id === "test").length).toBe(1);
    expect(s.items.find((i) => i.id === "test")!.quantity).toBe(35);
    expect(() =>
      go(s, {
        type: "import",
        branchId: A,
        rows: [r],
        fingerprint: "f2",
        reconciled: true,
      }),
    ).toThrow();
  });
  it("يرفض بيانات استيراد غير صالحة", () =>
    expect(() =>
      go(fixture(), {
        type: "import",
        branchId: A,
        rows: [
          {
            name: "X",
            ingredient: "",
            batch: "b",
            expiry: "2030-02-30",
            unit: "box",
            quantity: 1,
            price: 2,
            cold: false,
          },
        ],
        fingerprint: "bad",
      }),
    ).toThrow());
  it("الأدوية المنتهية والمبردة غير مؤهلة", () => {
    const s = fixture();
    s.items.find((i) => i.id === "test")!.cold = true;
    expect(eligible(s.items.find((i) => i.id === "test")!)).toBe(false);
    expect(() => request(s)).toThrow();
  });
});
describe("الشراء والمحفظة التجريبية", () => {
  function listed() {
    let s = fixture();
    s = go(s, { type: "saleRequest", itemId: "test", quantity: 10, note: "" });
    s = go(s, { type: "approveSale", id: s.sales[0].id, price: 700 }, "master");
    return s;
  }
  it("يرفض نقص الرصيد ولا يخلق طلبًا", () => {
    const s = listed();
    s.wallets.find((w) => w.branchId === "pharm_01")!.available = 0;
    expect(() =>
      go(
        s,
        {
          type: "buy",
          saleId: s.sales[0].id,
          branchId: "pharm_01",
          quantity: 1,
        },
        "independent",
      ),
    ).toThrow();
    expect(s.orders).toHaveLength(0);
  });
  it("الشراء يحجز من مصدر المناقلات نفسه", () => {
    let s = listed();
    s = go(
      s,
      {
        type: "buy",
        saleId: s.sales[0].id,
        branchId: "pharm_01",
        quantity: 10,
      },
      "independent",
    );
    expect(available(s, "test")).toBe(15);
    expect(s.wallets.find((w) => w.branchId === "pharm_01")!.held).toBe(7105);
  });
  it("تكتمل الدورة ويُفرج عن الرصيد مرة واحدة", () => {
    let s = listed();
    s = go(
      s,
      {
        type: "buy",
        saleId: s.sales[0].id,
        branchId: "pharm_01",
        quantity: 10,
      },
      "independent",
    );
    const id = s.orders[0].id;
    s = go(s, { type: "sendOrder", id });
    s = go(s, { type: "receiveOrder", id }, "independent");
    expect(s.orders[0].status).toBe("completed");
    expect(s.wallets.find((w) => w.branchId === "pharm_01")!.held).toBe(0);
    expect(() => go(s, { type: "receiveOrder", id }, "independent")).toThrow();
  });
  it("الفرع يرفع طلب شراء للإدارة دون حجز مسبق", () => {
    const s = createSeed();
    const x = s.sales[0];
    if (!x) throw new Error("seed missing");
    const n = go(s, { type: "buy", saleId: x.id, branchId: A, quantity: 1 });
    expect(n.orders[0].status).toBe("approval");
    expect(n.reservations.length).toBe(0);
  });
});

describe("تحديث العبوات والعروض", () => {
  function packed(split = true) {
    return go(fixture(), {
      type: "packaging",
      itemId: "test",
      packageUnit: "باكت",
      baseUnit: "شريط",
      size: 10,
      split,
    });
  }
  it("يحول 25 باكت إلى 250 شريط مع الحفاظ على القيمة المرجعية", () => {
    const s = packed();
    const i = s.items.find((i) => i.id === "test")!;
    expect(i.quantity).toBe(250);
    expect(i.price).toBe(100);
    expect(i.unit).toBe("شريط");
  });
  it("شراء 4 شرائط من عرض 30 يترك 26 شريطًا في العرض", () => {
    let s = packed();
    s = go(
      s,
      {
        type: "saveSale",
        itemId: "test",
        quantity: 30,
        factor: 1,
        price: 70,
        note: "",
      },
      "master",
    );
    s = go(
      s,
      { type: "buy", saleId: s.sales[0].id, branchId: "pharm_01", quantity: 4 },
      "independent",
    );
    expect(s.orders[0].amount).toBe(280);
    expect(s.sales[0].quantity - s.reservations[0].quantity).toBe(26);
    expect(available(s, "test")).toBe(246);
  });
  it("العبوة الكاملة لا تقبل طلب كسر عبوة", () => {
    let s = packed(false);
    s = go(
      s,
      {
        type: "saveSale",
        itemId: "test",
        quantity: 30,
        factor: 10,
        price: 700,
        note: "",
      },
      "master",
    );
    expect(() =>
      go(
        s,
        {
          type: "buy",
          saleId: s.sales[0].id,
          branchId: "pharm_01",
          quantity: 4,
        },
        "independent",
      ),
    ).toThrow();
    s = go(
      s,
      {
        type: "buy",
        saleId: s.sales[0].id,
        branchId: "pharm_01",
        quantity: 10,
      },
      "independent",
    );
    expect(s.orders[0].amount).toBe(700);
  });
  it("لا يسمح بنشر تجزئة عندما لم يسمح البائع بها", () =>
    expect(() =>
      go(
        packed(false),
        {
          type: "saveSale",
          itemId: "test",
          quantity: 5,
          factor: 1,
          price: 70,
          note: "",
        },
        "master",
      ),
    ).toThrow());
  it("المستقل ينشر مباشرة ويعدل العرض دون تكرار", () => {
    let s = fixture();
    s.items.find((i) => i.id === "test")!.branchId = "pharm_01";
    s = go(
      s,
      {
        type: "saveSale",
        itemId: "test",
        quantity: 1,
        factor: 1,
        price: 700,
        note: "",
      },
      "independent",
    );
    expect(s.sales[0].status).toBe("published");
    s = go(
      s,
      {
        type: "saveSale",
        id: s.sales[0].id,
        itemId: "test",
        quantity: 3,
        factor: 1,
        price: 650,
        note: "",
      },
      "independent",
    );
    expect(s.sales).toHaveLength(1);
    expect(s.sales[0].quantity).toBe(3);
    s = go(s, { type: "withdrawSale", id: s.sales[0].id }, "independent");
    expect(s.sales[0].status).toBe("withdrawn");
  });
  it("يعدل المتبقي دون تغيير الطلب القائم", () => {
    let s = packed();
    s = go(
      s,
      {
        type: "saveSale",
        itemId: "test",
        quantity: 30,
        factor: 1,
        price: 70,
        note: "",
      },
      "master",
    );
    s = go(
      s,
      { type: "buy", saleId: s.sales[0].id, branchId: "pharm_01", quantity: 4 },
      "independent",
    );
    const oldAmount = s.orders[0].amount;
    s = go(
      s,
      {
        type: "saveSale",
        id: s.sales[0].id,
        itemId: "test",
        quantity: 20,
        factor: 1,
        price: 65,
        note: "",
      },
      "master",
    );
    expect(s.orders[0].amount).toBe(oldAmount);
    expect(s.orders[0].quantity).toBe(4);
    expect(s.sales[0].quantity).toBe(24);
    expect(s.sales[0].price).toBe(65);
  });
  it("يسحب العرض دون إلغاء حجز قائم", () => {
    let s = packed();
    s = go(
      s,
      {
        type: "saveSale",
        itemId: "test",
        quantity: 30,
        factor: 1,
        price: 70,
        note: "",
      },
      "master",
    );
    s = go(
      s,
      { type: "buy", saleId: s.sales[0].id, branchId: "pharm_01", quantity: 4 },
      "independent",
    );
    s = go(s, { type: "withdrawSale", id: s.sales[0].id }, "master");
    expect(s.orders[0].status).toBe("reserved");
    expect(available(s, "test")).toBe(246);
  });
});
