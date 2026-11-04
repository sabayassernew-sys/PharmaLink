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
  Archive,
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
import type { ImportRow } from "../domain/types";
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
  const [expiry, setExpiry] = useState("all");
  const [branch, setBranch] = useState("all");
  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.hash.split("?")[1] || "").get("item"),
  );
  const [action, setAction] = useState("details");
  const [add, setAdd] = useState(false);
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
  const filtered = useMemo(
    () =>
      all.filter(
        (i) =>
          (branch === "all" || i.branchId === branch) &&
          [i.name, i.ingredient, i.batch]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (expiry === "all" ||
            (expiry === "near"
              ? daysLeft(i.expiry) >= 0 && daysLeft(i.expiry) <= 90
              : expiry === "expired"
                ? daysLeft(i.expiry) < 0
                : available(state, i.id) > 0)),
      ),
    [all, branch, query, expiry, state],
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
            aria-label="تصفية الصلاحية"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="all">جميع الأصناف</option>
            <option value="near">قريبة الانتهاء • 90 يومًا</option>
            <option value="expired">منتهية الصلاحية</option>
            <option value="available">متاح للتخصيص</option>
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
              setExpiry("all");
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
                  free = available(state, i.id);
                return (
                  <tr key={i.id}>
                    <td>
                      <button
                        className="drug-name"
                        onClick={() => {
                          setSelected(i.id);
                          setAction("details");
                        }}
                      >
                        {i.name}
                      </button>
                      <small>{i.ingredient}</small>
                      {!eligible(i) && (
                        <Badge tone="warning">
                          {i.cold
                            ? "تبريد • خارج نطاق التداول"
                            : days < 30
                              ? "صلاحية غير مؤهلة"
                              : "موقوف"}
                        </Badge>
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
                          days < 30
                            ? "text-red-600"
                            : days <= 90
                              ? "text-amber-600"
                              : "text-slate-500"
                        }
                      >
                        {days < 0 ? "منتهي" : `${number(days)} يومًا`}
                      </small>
                    </td>
                    <td>{i.unit}</td>
                    <td className="numeric">
                      {number(i.quantity)}
                      {i.unitsPerPackage && (
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
                    <td className="numeric text-teal-700 font-bold">
                      {number(free)}
                    </td>
                    <td>
                      <button
                        className="row-action"
                        onClick={() => {
                          setSelected(i.id);
                          setAction("details");
                        }}
                      >
                        إجراءات <MoreHorizontal size={17} />
                      </button>
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
            description="غيّر البحث أو أضف بندًا أو استورد ملف المخزون."
          />
        )}
      </Card>
      {current && (
        <Modal
          title="تفاصيل وإجراءات الصنف"
          onClose={() => setSelected(null)}
          wide
        >
          <div className="item-summary">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.batch} · {current.expiry} · {current.unit}
              </p>
            </div>
            <div className="flex gap-3">
              <Badge>الموجود {current.quantity}</Badge>
              <Badge tone="warning">
                المحجوز {current.quantity - available(state, current.id)}
              </Badge>
              <Badge tone="success">
                المتاح {available(state, current.id)}
              </Badge>
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
                    !["surplus", "transfer"].includes(String(key)) ||
                    actor.role === "agency_branch",
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
                      {eligible(current)
                        ? "مؤهل وفق سياسة النسخة"
                        : eligibilityReasons(current).join(" · ")}
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
                      const reason = prompt(
                        "سبب " +
                          (current.blocked
                            ? "إعادة التفعيل"
                            : "إيقاف الصنف للمراجعة"),
                      );
                      if (reason)
                        run({
                          type: "setBlock",
                          itemId: current.id,
                          blocked: !current.blocked,
                          reason,
                        });
                    }}
                  >
                    {current.blocked
                      ? "إعادة تفعيل أهلية الصنف"
                      : "إيقاف الصنف للمراجعة"}
                  </Button>
                  <Packaging item={current} />
                  <ItemDiscountForm item={current} />
                  <SupplierForm item={current} />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      done({ type: "archive", itemId: current.id })
                    }
                  >
                    <Archive size={16} /> أرشفة البند الخالي من الرصيد
                  </Button>
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
                  <Button type="submit" disabled={busy || !eligible(current)}>
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
                  <Button type="submit" disabled={busy || !eligible(current)}>
                    إرسال طلب المناقلة
                  </Button>
                </Form>
              )}
              {action === "sale" && <SaleEditor item={current} />}
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
