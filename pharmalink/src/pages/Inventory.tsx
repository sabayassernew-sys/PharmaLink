import { importBlocked, importKey } from "../domain/imports";
import {
  SaleEditor,
  Packaging,
  SupplierForm,
  ItemDiscountForm,
} from "../components/ItemTools";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Package,
  ArrowRightLeft,
  FileText,
  History,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../context";
import {
  visibleItems,
  available,
  daysLeft,
  eligible,
  eligibilityReasons,
  ownsBranch,
} from "../domain/access";
import type { ImportRow, Item } from "../domain/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageTitle,
  money,
  number,
} from "../components/UI";
import { parseFile } from "../data/importer";
import { saveBlob } from "../data/repository";
export function Inventory({
  initialImport = false,
}: {
  initialImport?: boolean;
}) {
  const { state, actor, run, busy, notify } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("available");
  const [branch, setBranch] = useState("all");
  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.hash.split("?")[1] || "").get("item"),
  );
  const [action, setAction] = useState("details");
  const [add, setAdd] = useState(false);
  const [blockModalItem, setBlockModalItem] = useState<Item | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockModalError, setBlockModalError] = useState("");
  const [importing, setImport] = useState(initialImport);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fingerprint, setFingerprint] = useState("");
  const [importError, setImportError] = useState("");
  const [reconciled, setReconciled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(
    actor.branchId ||
      state.branches.find((b) => ownsBranch(state, actor, b.id))?.id ||
      "",
  );
  const all = visibleItems(state, actor);
  const nearDays = state.nearExpiryAlertDays ?? 90;
  const minExpiryDays = state.minExpiryDays ?? 30;
  const filtered = useMemo(
    () =>
      all.filter((i) => {
        if (branch !== "all" && i.branchId !== branch) return false;
        const matchesQuery = [i.name, i.ingredient, i.batch]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
        if (!matchesQuery) return false;

        const days = daysLeft(i.expiry);
        const free = available(state, i.id);

        switch (filter) {
          case "available":
            return i.quantity > 0;
          case "allocatable":
            return free > 0 && eligible(i, state);
          case "near":
            return i.quantity > 0 && days >= 0 && days <= nearDays;
          case "expired":
            return days < 0;
          case "blocked":
            return !!i.blocked;
          case "depleted":
            return i.quantity === 0;
          case "all":
          default:
            return true;
        }
      }),
    [all, branch, query, filter, state],
  );
  const current = all.find((i) => i.id === selected);
  useEffect(() => {
    const open = () => {
      const id = new URLSearchParams(location.hash.split("?")[1] || "").get(
        "item",
      );
      if (id) {
        setSelected(id);
        setAction("details");
      }
    };
    window.addEventListener("pharmalink-open-item", open);
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("pharmalink-open-item", open);
      window.removeEventListener("hashchange", open);
    };
  }, []);
  const rowFrom = (f: FormData): ImportRow => ({
    name: String(f.get("name")),
    ingredient: String(f.get("ingredient") || ""),
    batch: String(f.get("batch")),
    expiry: String(f.get("expiry")),
    unit: String(f.get("unit")),
    quantity: Number(f.get("quantity")),
    price: Number(f.get("price")),
    cold: f.get("cold") === "on",
  });
  const done = async (c: Parameters<typeof run>[0]) => {
    if (await run(c)) {
      setSelected(null);
      setAdd(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="مساحة عمل الفرع"
        title={initialImport ? "استيراد المخزون" : "مخزون الأدوية"}
        description="أرصدة واضحة، تشغيلات مستقلة، وإجراءات في مكان واحد."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImport(true)}>
              <Upload size={16} /> استيراد ملف
            </Button>
            <Button onClick={() => setAdd(true)}>
              <Plus size={16} /> إضافة بند
            </Button>
          </>
        }
      />
      <div className="info-strip">
        <Package size={18} />
        <span>
          ملف المخزون يحتوي بيانات الأصناف فقط. تُنشأ طلبات التداول والمناقلات
          داخل المنصة.
        </span>
        <Badge>{all.length} بند مخزون</Badge>
      </div>
      <Card>
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="بحث في المخزون"
              placeholder="ابحث بالدواء، المادة الفعالة، أو التشغيلة..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="تصفية المخزون والصلاحية"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="available">المخزون المتوفر</option>
            <option value="allocatable">المتاح للبيع بالبورصة</option>
            <option value="near">تنبيهات الصلاحية ({nearDays} يوم)</option>
            <option value="expired">الأدوية المنتهية</option>
            <option value="blocked">أصناف موقوفة للمراجعة</option>
            <option value="depleted">أدوية تم تصريفها بالكامل</option>
            <option value="all">السجل الشامل</option>
          </select>
          {actor.role === "agency_master" && (
            <select
              aria-label="تصفية الفرع"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="all">جميع فروع السلسلة</option>
              {state.branches
                .filter((b) => ownsBranch(state, actor, b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          )}
          <button
            className="icon-btn"
            title="مسح الفلاتر"
            onClick={() => {
              setQuery("");
              setFilter("available");
              setBranch("all");
            }}
          >
            <Filter size={18} />
          </button>
          <Button
            variant="ghost"
            onClick={() => {
              const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
              const text = [
                "الاسم,التشغيلة,الصلاحية,الوحدة,الموجود,المحجوز,المتاح",
                ...filtered.map((i) =>
                  [
                    quote(/^[=+@-]/.test(i.name) ? "'" + i.name : i.name),
                    quote(i.batch),
                    i.expiry,
                    quote(i.unit),
                    i.quantity,
                    i.quantity - available(state, i.id),
                    available(state, i.id),
                  ].join(","),
                ),
              ].join("\n");
              saveBlob(
                new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }),
                "pharmalink-inventory.csv",
              );
            }}
          >
            <Download size={16} /> تصدير
          </Button>
        </div>
        <div className="table-caption">
          <span>
            عرض {filtered.length} من {all.length} بند
            {filter === "available" && all.some((i) => i.quantity === 0) && (
              <span className="text-slate-500 font-normal">
                {" "}
                (يتم إخفاء {all.filter((i) => i.quantity === 0).length} صنف تم تصريفه)
              </span>
            )}
          </span>
          <span>
            آخر عملية:{" "}
            {state.events.length
              ? new Date(state.events.at(-1)!.at).toLocaleString("ar-YE")
              : "بيانات تجريبية أولية"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الدواء / المادة الفعالة</th>
                {actor.role === "agency_master" && <th>الفرع</th>}
                <th>التشغيلة</th>
                <th>الصلاحية</th>
                <th>الوحدة</th>
                <th>الموجود</th>
                <th>المحجوز</th>
                <th>المتاح</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const days = daysLeft(i.expiry),
                  free = available(state, i.id),
                  isDepleted = i.quantity === 0;
                return (
                  <tr
                    key={i.id}
                    className={isDepleted ? "opacity-75 bg-slate-50/60" : ""}
                  >
                    <td>
                      <button
                        className="drug-name"
                        onClick={() => {
                          setSelected(i.id);
                          setAction(isDepleted ? "ledger" : "details");
                        }}
                      >
                        {i.name}
                      </button>
                      <small>{i.ingredient}</small>
                      {i.blocked && (
                        <Badge tone="danger">⛔ موقوف للمراجعة</Badge>
                      )}
                      {i.cold && (
                        <Badge tone="warning">❄️ مبرد</Badge>
                      )}
                    </td>
                    {actor.role === "agency_master" && (
                      <td>
                        {state.branches.find((b) => b.id === i.branchId)?.name}
                      </td>
                    )}
                    <td>
                      <code>{i.batch}</code>
                    </td>
                    <td>
                      <span className="date">{i.expiry}</span>
                      <small
                        className={
                          days < 0
                            ? "text-red-600 font-bold"
                            : days < minExpiryDays
                              ? "text-rose-600 font-semibold"
                              : days <= nearDays
                                ? "text-amber-600 font-medium"
                                : "text-slate-500"
                        }
                      >
                        {days < 0 ? "منتهي" : `${number(days)} يومًا`}
                      </small>
                    </td>
                    <td>{i.unit}</td>
                    <td className="numeric">
                      {number(i.quantity)}
                      {i.unitsPerPackage && i.quantity > 0 && (
                        <small>
                          {Math.floor(i.quantity / i.unitsPerPackage)}{" "}
                          {i.packageUnit} و{i.quantity % i.unitsPerPackage}{" "}
                          {i.unit}
                        </small>
                      )}
                    </td>
                    <td className="numeric text-amber-600">
                      {number(i.quantity - free)}
                    </td>
                    <td
                      className={`numeric font-bold ${free > 0 ? "text-teal-700" : "text-slate-400"}`}
                    >
                      {number(free)}
                    </td>
                    <td>
                      {!isDepleted ? (
                        <button
                          className="row-action"
                          onClick={() => {
                            setSelected(i.id);
                            setAction("details");
                          }}
                        >
                          إجراءات <MoreHorizontal size={17} />
                        </button>
                      ) : (
                        <button
                          className="row-action text-slate-600 hover:text-teal-700"
                          title="عرض سجل حركة وخروج الصنف"
                          onClick={() => {
                            setSelected(i.id);
                            setAction("ledger");
                          }}
                        >
                          سجل الحركة <History size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="لا توجد أصناف مطابقة"
            description={
              filter === "available" &&
              all.some(
                (i) =>
                  i.quantity === 0 &&
                  [i.name, i.ingredient, i.batch]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
                ? "هذا الصنف موجود في السجلات ولكن تم تصريف كميته بالكامل (الرصيد 0)."
                : "غيّر البحث أو أضف بندًا أو استورد ملف المخزون."
            }
            action={
              filter === "available" &&
              all.some(
                (i) =>
                  i.quantity === 0 &&
                  [i.name, i.ingredient, i.batch]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              ) ? (
                <Button
                  variant="secondary"
                  onClick={() => setFilter("depleted")}
                >
                  عرض الأدوية التي تم تصريفها بالكامل
                </Button>
              ) : undefined
            }
          />
        )}
      </Card>
      {current && (
        <Modal
          title={
            current.quantity === 0
              ? "سجل وبيانات دواء تم تصريفه"
              : "تفاصيل وإجراءات الصنف"
          }
          onClose={() => setSelected(null)}
          wide
        >
          {current.quantity === 0 && (
            <div className="info-strip flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 text-slate-700">
              <Package size={18} className="text-slate-400" />
              <span>
                هذا الدواء تم تصريفه بالكامل (الرصيد 0). تم توثيق تفاصيل خروجه في
                سجل العمليات.
              </span>
            </div>
          )}
          <div className="item-summary">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.batch} · {current.expiry} · {current.unit}
              </p>
            </div>
            <div className="flex gap-3">
              {current.quantity === 0 ? (
                <Badge tone="neutral">الرصيد نافد (0)</Badge>
              ) : (
                <>
                  <Badge>الموجود {current.quantity}</Badge>
                  <Badge tone="warning">
                    المحجوز {current.quantity - available(state, current.id)}
                  </Badge>
                  <Badge tone="success">
                    المتاح {available(state, current.id)}
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="action-layout">
            <nav className="action-nav">
              {[
                ["details", "نظرة عامة", FileText],
                ["surplus", "فائض داخلي", Package],
                ["transfer", "طلب مناقلة", ArrowRightLeft],
                [
                  "sale",
                  actor.role === "agency_branch"
                    ? "طلب اعتماد بيع / متابعة"
                    : "عرض للبيع / إدارة العرض",
                  ExternalLink,
                ],
                ["ledger", "سجل الحركة", History],
                ["adjust", "تسوية الرصيد", SlidersHorizontal],
              ]
                .filter(
                  ([key]) =>
                    (!["surplus", "transfer"].includes(String(key)) ||
                      actor.role === "agency_branch") &&
                    (current.quantity > 0 ||
                      !["surplus", "transfer", "sale"].includes(String(key))),
                )
                .map(([key, label, Icon]) => {
                  const C = Icon as typeof FileText;
                  return (
                    <button
                      key={String(key)}
                      onClick={() => setAction(String(key))}
                      className={action === key ? "active" : ""}
                    >
                      <C size={17} />
                      {String(key) === "sale" && actor.role === "independent"
                        ? "عرض للبيع / إدارة العرض"
                        : String(label)}
                    </button>
                  );
                })}
            </nav>
            <div className="action-panel">
              {action === "details" && (
                <>
                  <h3>بيانات البند</h3>
                  <dl className="details">
                    <dt>السعر المرجعي</dt>
                    <dd>{money(current.price)}</dd>
                    <dt>كمية معزولة للمراجعة</dt>
                    <dd>
                      {current.quarantine} {current.unit}
                    </dd>
                    <dt>إمكانية البيع / المناقلة</dt>
                    <dd>
                      {eligible(current, state)
                        ? "مؤهل وفق سياسة النسخة"
                        : eligibilityReasons(current, state).join(" · ")}
                    </dd>
                    <dt>الفائض الداخلي</dt>
                    <dd>
                      {state.posts
                        .filter(
                          (p) => p.itemId === current.id && p.status === "open",
                        )
                        .map(
                          (p) =>
                            `متبقي ${Math.min(p.quantity - p.allocated, available(state, current.id))} ${p.unit}`,
                        )
                        .join("، ") || "لا يوجد إعلان نشط"}
                    </dd>
                    <dt>العرض الخارجي</dt>
                    <dd>
                      {state.sales.some(
                        (x) =>
                          x.itemId === current.id && x.status === "published",
                      )
                        ? "منشور بسعر معتمد"
                        : state.sales.some(
                              (x) =>
                                x.itemId === current.id &&
                                x.status === "pending",
                            )
                          ? "بانتظار الاعتماد"
                          : "غير منشور"}
                    </dd>
                  </dl>
                  <details>
                    <summary>تعريف هوية الصنف</summary>
                    <Form
                      onSubmit={(f) =>
                        run({
                          type: "identify",
                          itemId: current.id,
                          catalogId: String(f.get("code")),
                          strength: String(f.get("strength")),
                          dosageForm: String(f.get("form")),
                        })
                      }
                    >
                      <p>
                        معرف محلي يراجعه المستخدم، وليس رمزًا رسميًا مفترضًا من
                        يمن سوفت.
                      </p>
                      <Field
                        name="code"
                        label="معرف الصنف"
                        defaultValue={current.catalogId || current.id}
                      />
                      <Field
                        name="strength"
                        label="التركيز"
                        defaultValue={current.strength || ""}
                      />
                      <Field
                        name="form"
                        label="الشكل الدوائي"
                        defaultValue={current.dosageForm || ""}
                      />
                      <Button type="submit">حفظ تعريف الصنف</Button>
                    </Form>
                  </details>
                  <Button
                    variant={current.blocked ? "secondary" : "danger"}
                    onClick={() => {
                      setBlockModalItem(current);
                      setBlockReason("");
                      setBlockModalError("");
                    }}
                  >
                    {current.blocked
                      ? "إعادة تفعيل أهلية الصنف"
                      : "إيقاف الصنف للمراجعة"}
                  </Button>
                  <Packaging item={current} />
                  <ItemDiscountForm item={current} />
                  <SupplierForm item={current} />
                </>
              )}
              {action === "surplus" && (
                <Form
                  onSubmit={(f) =>
                    done({
                      type: "post",
                      kind: "surplus",
                      branchId: current.branchId,
                      itemId: current.id,
                      name: current.name,
                      quantity: Number(f.get("qty")),
                      unit: current.unit,
                      notes: String(f.get("notes") || ""),
                    })
                  }
                >
                  <h3>نشر أو تحديث الفائض الداخلي</h3>
                  <p>الإعلان صالح 48 ساعة. النشر لا يحجز المخزون.</p>
                  <Field
                    label={`كمية الإعلان (${current.unit})`}
                    name="qty"
                    type="number"
                    min={1}
                    max={available(state, current.id)}
                    defaultValue={1}
                  />
                  <Field label="ملاحظة للفروع" name="notes" required={false} />
                  <Button type="submit" disabled={busy || !eligible(current, state)}>
                    حفظ إعلان الفائض
                  </Button>
                </Form>
              )}
              {action === "transfer" && (
                <Form
                  onSubmit={(f) =>
                    done({
                      type: "transfer",
                      from: current.branchId,
                      to: String(f.get("to")),
                      items: [
                        { itemId: current.id, quantity: Number(f.get("qty")) },
                      ],
                      note: String(f.get("note") || ""),
                    })
                  }
                >
                  <h3>طلب مناقلة إلى فرع شقيق</h3>
                  <label className="field">
                    <span>الفرع المستلم</span>
                    <select name="to" required>
                      {state.branches
                        .filter(
                          (b) =>
                            b.chainId === actor.chainId &&
                            b.id !== current.branchId &&
                            b.active,
                        )
                        .map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    label="الكمية"
                    name="qty"
                    type="number"
                    min={1}
                    max={available(state, current.id)}
                    defaultValue={1}
                  />
                  <Field label="ملاحظة" name="note" required={false} />
                  <p>لا تخصم الكمية بمجرد الطلب. يلزم إكمال الموافقات.</p>
                  <Button type="submit" disabled={busy || !eligible(current, state)}>
                    إرسال طلب المناقلة
                  </Button>
                </Form>
              )}
              {action === "sale" && (
                <SaleEditor
                  item={current}
                  onDone={() => {
                    setSelected(null);
                    notify("تم حفظ ونشر العرض في البورصة الدوائية بنجاح ✅");
                  }}
                />
              )}
              {action === "ledger" && (
                <>
                  <h3>سجل العمليات المرتبطة</h3>
                  {state.events
                    .filter(
                      (e) =>
                        e.reference === current.id ||
                        state.sales.some(
                          (x) =>
                            x.id === e.reference && x.itemId === current.id,
                        ) ||
                        state.orders.some(
                          (o) =>
                            o.id === e.reference && o.itemId === current.id,
                        ) ||
                        state.transfers.some(
                          (t) =>
                            t.id === e.reference &&
                            t.lines.some((l) => l.itemId === current.id),
                        ),
                    )
                    .reverse()
                    .map((e) => (
                      <div className="timeline-row" key={e.id}>
                        <strong>{e.action}</strong>
                        <p>{e.detail}</p>
                        <small>
                          {e.actor} · {new Date(e.at).toLocaleString("ar-YE")}
                        </small>
                      </div>
                    ))}
                  <p>
                    يُحفظ السجل محليًا ويمكن تصدير النسخة الاحتياطية من
                    الإعدادات.
                  </p>
                </>
              )}
              {action === "adjust" && (
                <Form
                  onSubmit={(f) =>
                    done({
                      type: "adjust",
                      itemId: current.id,
                      quantity: Number(f.get("quantity")),
                      reason: String(f.get("reason")),
                    })
                  }
                >
                  <h3>تسوية الرصيد الفعلي</h3>
                  <p>تسوية مباشرة موثقة بسبب؛ لا تسمح بالنزول تحت المحجوز.</p>
                  <Field
                    label="الرصيد الصحيح بعد الجرد"
                    name="quantity"
                    type="number"
                    min={current.quantity - available(state, current.id)}
                    defaultValue={current.quantity}
                  />
                  <Field label="سبب التسوية" name="reason" />
                  <Button disabled={busy} type="submit">
                    تأكيد التسوية
                  </Button>
                </Form>
              )}
            </div>
          </div>
        </Modal>
      )}
      {blockModalItem && (
        <Modal
          title={
            blockModalItem.blocked
              ? "إعادة تفعيل أهلية الصنف للتداول"
              : "إيقاف الصنف للمراجعة والتحري الرقابي"
          }
          onClose={() => setBlockModalItem(null)}
        >
          <div className="space-y-4 text-right">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-base text-slate-900 font-bold">{blockModalItem.name}</strong>
                <Badge tone={blockModalItem.blocked ? "danger" : "success"}>
                  {blockModalItem.blocked ? "موقوف حالياً" : "نشط ومؤهل"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 m-0">
                تشغيلة: <code>{blockModalItem.batch}</code> · الصلاحية: {blockModalItem.expiry} · الرصيد: {blockModalItem.quantity} {blockModalItem.unit}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                blockModalItem.blocked
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              {blockModalItem.blocked ? (
                <>
                  <strong>أثر إعادة التفعيل:</strong> سيتم رفع التجميد عن الصنف فوراً، ويعود مؤهلاً للظهور في قائمة «المتاح للبيع بالبورصة» والمناقلات بين الفروع وفق شروط الصلاحية المعمول بها.
                </>
              ) : (
                <>
                  <strong>أثر الإيقاف الاحترازي:</strong> سيتم فوراً حظر نشر الصنف في البورصة ومنع مناقلته أو شرائه من أي صيدلية أخرى، مع بقاء رصيده محفوظاً في مخزونكم الداخلي لحين اكتمال التحري.
                </>
              )}
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-2">
                {blockModalItem.blocked
                  ? "أسباب التفعيل الشائعة (انقر للاختيار السريع):"
                  : "أسباب الإيقاف الشائعة (انقر للاختيار السريع):"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(blockModalItem.blocked
                  ? [
                      "انتهاء فحص التشغيلة وتأكيد سلامتها ومطابقتها",
                      "اكتمال المطابقة والتسوية المخزنية بنجاح",
                      "تصحيح خطأ التسعير / البيانات واستيفاء المراجعة",
                      "إلغاء تعميم الاشتباه والتصريح بصرف التشغيلة",
                    ]
                  : [
                      "تعميم رقابي / سحب تشغيلة (Batch Recall)",
                      "اشتباه في سلامة التخزين أو تلف العبوات",
                      "إيقاف مؤقت لأغراض الجرد وتدقيق الرصيد الفعلي",
                      "مراجعة تسعير الصنف أو تصحيح بيانات التشغيلة",
                    ]
                ).map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="text-[11px] py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors text-right"
                    onClick={() => {
                      setBlockReason(quick);
                      setBlockModalError("");
                    }}
                  >
                    + {quick}
                  </button>
                ))}
              </div>
            </div>

            {blockModalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {blockModalError}
              </div>
            )}

            <Form
              onSubmit={async (f) => {
                const reason = String(f.get("reason") || "").trim();
                if (reason.length < 4) {
                  setBlockModalError("يرجى كتابة سبب واضح وموثق (4 أحرف على الأقل)");
                  return;
                }
                setBlockModalError("");
                const ok = await run({
                  type: "setBlock",
                  itemId: blockModalItem.id,
                  blocked: !blockModalItem.blocked,
                  reason,
                });
                if (ok) {
                  notify(
                    blockModalItem.blocked
                      ? "تمت إعادة تفعيل الصنف بنجاح"
                      : "تم إيقاف الصنف للمراجعة وتجميد أهليته",
                  );
                  setBlockModalItem(null);
                }
              }}
            >
              <label className="field m-0">
                <span>
                  {blockModalItem.blocked ? "سبب أو مستند إعادة التفعيل *" : "سبب الإيقاف والتحري الرقابي *"}
                  <small className="text-slate-400 font-normal"> (يُسجل في سجل العمليات والرقابة)</small>
                </span>
                <textarea
                  name="reason"
                  rows={2}
                  required
                  value={blockReason}
                  onChange={(e) => {
                    setBlockReason(e.target.value);
                    if (blockModalError) setBlockModalError("");
                  }}
                  placeholder={
                    blockModalItem.blocked
                      ? "اكتب تفاصيل التفعيل أو مرجع انتهاء الفحص..."
                      : "اكتب سبب الإيقاف أو مرجع التعميم أو سبب المراجعة..."
                  }
                  className="w-full text-xs"
                />
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-3">
                <Button variant="secondary" onClick={() => setBlockModalItem(null)}>
                  إلغاء وتراجع
                </Button>
                <Button
                  variant={blockModalItem.blocked ? "primary" : "danger"}
                  type="submit"
                  disabled={busy || blockReason.trim().length < 4}
                >
                  {blockModalItem.blocked ? "تأكيد إعادة التفعيل" : "تأكيد إيقاف الصنف"}
                </Button>
              </div>
            </Form>
          </div>
        </Modal>
      )}
      {add && (
        <Modal title="إضافة بند مخزون" onClose={() => setAdd(false)}>
          <Form
            onSubmit={(f) =>
              done({ type: "addItem", branchId: target, row: rowFrom(f) })
            }
          >
            {actor.role === "agency_master" && (
              <BranchField target={target} setTarget={setTarget} />
            )}
            <Field label="الاسم التجاري والتركيز" name="name" />
            <Field label="المادة الفعالة" name="ingredient" required={false} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="رقم التشغيلة" name="batch" />
              <Field label="تاريخ الانتهاء" name="expiry" type="date" />
              <Field
                label="الوحدة وحجم العبوة"
                name="unit"
                defaultValue="علبة"
              />
              <Field label="الكمية" name="quantity" type="number" min={0} />
              <Field
                label="السعر المرجعي"
                name="price"
                type="number"
                min={0}
                step="0.01"
              />
            </div>
            <label className="flex gap-2">
              <input type="checkbox" name="cold" /> يتطلب تبريدًا (للمتابعة فقط)
            </label>
            <Button type="submit" disabled={busy}>
              حفظ البند
            </Button>
          </Form>
        </Modal>
      )}
      {importing && (
        <Modal
          title="استيراد ومراجعة المخزون"
          onClose={() => setImport(false)}
          wide
        >
          <div className="form-grid">
            <p>
              اختر ملف XLSX أو CSV. راجع الرصيد وتاريخ التقرير قبل الاعتماد؛
              الملف ليس مزامنة تلقائية مع النظام المحاسبي.
            </p>
            <BranchField target={target} setTarget={setTarget} />
            <a className="text-link" href="./sample-inventory.csv" download>
              تنزيل نموذج فارغ لتعبئة المخزون (CSV)
            </a>
            <input
              aria-label="ملف المخزون"
              type="file"
              accept=".csv,.xlsx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLoading(true);
                setRows([]);
                setImportError("");
                try {
                  const parsed = await parseFile(file);
                  setRows(parsed.rows);
                  setReconciled(false);
                  setFingerprint(parsed.fingerprint);
                } catch (err) {
                  setImportError((err as Error).message);
                } finally {
                  setLoading(false);
                }
              }}
            />
            {loading && <p>جارٍ قراءة الملف...</p>}
            {importError && (
              <p role="alert" className="text-red-600">
                {importError}
              </p>
            )}
            {rows.length > 0 && (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>الدواء</th>
                        <th>التشغيلة</th>
                        <th>الحالي</th>
                        <th>الملف</th>
                        <th>المعالجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, n) => {
                        const i = state.items.find(
                          (i) =>
                            i.branchId === target &&
                            i.name === r.name &&
                            i.batch === r.batch &&
                            i.unit === r.unit,
                        );
                        const locked = i && importBlocked(state, i.id);
                        const already = state.importProgress?.[
                          target + ":" + fingerprint
                        ]?.applied.includes(importKey(r));
                        return (
                          <tr key={n}>
                            <td>{r.name}</td>
                            <td>{r.batch}</td>
                            <td>{i?.quantity ?? "جديد"}</td>
                            <td>{r.quantity}</td>
                            <td>
                              <Badge tone={locked ? "warning" : "success"}>
                                {already
                                  ? "سبق اعتماد هذا الصف"
                                  : locked
                                    ? "معلق للمراجعة"
                                    : i
                                      ? "تحديث بعد الاعتماد"
                                      : "إضافة"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p>
                  الاعتماد يحفظ البنود السليمة ويعلق المرتبطة بعمليات مفتوحة.
                  يمكن معرفة الأعداد من سجل الاستيراد.
                </p>
                <label className="notice">
                  <input
                    type="checkbox"
                    checked={reconciled}
                    onChange={(e) => setReconciled(e.target.checked)}
                  />{" "}
                  راجعت تاريخ كشف المحاسبة وأؤكد أن الأرصدة المقترحة تتضمن
                  الحركات المنفذة في المنصة، أو سوّيت الفروق يدويًا. لا يُعتبر
                  الملف مزامنة تلقائية.
                </label>
                <Button
                  disabled={busy || loading}
                  onClick={async () => {
                    if (
                      await run({
                        type: "import",
                        branchId: target,
                        rows,
                        fingerprint,
                        reconciled,
                      })
                    ) {
                      setImport(false);
                      setRows([]);
                      notify(
                        "تم اعتماد الدفعة؛ راجع سجل العمليات للأعداد والتعليقات",
                      );
                    }
                  }}
                >
                  اعتماد {rows.length} بند بعد المراجعة
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
export function BranchField({
  target,
  setTarget,
}: {
  target: string;
  setTarget: (s: string) => void;
}) {
  const { state, actor } = useApp();
  return (
    <label className="field">
      <span>الفرع</span>
      <select value={target} onChange={(e) => setTarget(e.target.value)}>
        {state.branches
          .filter((b) => ownsBranch(state, actor, b.id))
          .map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
      </select>
    </label>
  );
}
