import type { Command } from "../domain/engine";
import {
  committed,
  remaining,
  editableOffer,
  offerProgress,
  offerAvailability,
  offerEvents,
} from "../domain/offers";
import { useState } from "react";
import { Percent } from "lucide-react";
import type { Item } from "../domain/types";
import { useApp } from "../context";
import { available, eligible, eligibilityReasons } from "../domain/access";
import { Button, Field, Form, Badge, ConfirmModal, money } from "./UI";
export function SaleEditor({
  item: i,
  saleId,
  initialEdit = false,
  onDone,
}: {
  item: Item;
  saleId?: string;
  initialEdit?: boolean;
  onDone?: () => void;
}) {
  const { state, actor, run, busy } = useApp();
  const existing = saleId
    ? state.sales.find((x) => x.id === saleId && x.itemId === i.id)
    : editableOffer(state, i.id);
  const [edit, setEdit] = useState(initialEdit);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [preview, setPreview] = useState<Extract<
    Command,
    { type: "saveSale" }
  > | null>(null);
  const [factor, setFactor] = useState(
    existing?.unitFactor || i.unitsPerPackage || 1,
  );
  const unit = factor === 1 ? i.unit : i.packageUnit!;
  const independent = actor.role === "independent";

  const branch = state.branches.find((b) => b.id === i.branchId);
  const branchDefaultDiscount = branch?.defaultDiscount ?? 0;
  const itemCustomDiscount = i.discountPercent;
  const effectiveDefaultDiscount = itemCustomDiscount ?? branchDefaultDiscount;
  const fullPrice = i.price * factor;

  const [discountVal, setDiscountVal] = useState<number | "">(
    existing?.discountPercent ??
      (existing
        ? Math.max(0, Math.round((1 - existing.price / fullPrice) * 100))
        : effectiveDefaultDiscount),
  );
  const [priceVal, setPriceVal] = useState<number>(
    existing?.price ??
      Math.round(
        fullPrice *
          (1 -
            (typeof discountVal === "number"
              ? discountVal
              : effectiveDefaultDiscount) /
              100) *
          100,
      ) / 100,
  );
  const [saveException, setSaveException] = useState<boolean>(
    itemCustomDiscount !== undefined,
  );
  if (existing && !edit)
    return (
      <div className="form-grid">
        <h3>
          {existing.status === "published"
            ? offerAvailability(state, existing) === "completed"
              ? "اكتمل تنفيذ كمية العرض"
              : "لديك عرض منشور"
            : existing.status === "withdrawn"
              ? "لديك عرض موقوف"
              : "لديك طلب بيع نشط"}
        </h3>
        <dl className="details">
          <dt>رقم العرض</dt>
          <dd>{existing.id.slice(-8)}</dd>
          <dt>المتاح ضمن العرض</dt>
          <dd>
            {existing.status === "published" ? remaining(state, existing) : "—"}{" "}
            {existing.saleUnit || i.unit}
          </dd>
          <dt>المباع المقبول</dt>
          <dd>
            {offerProgress(state, existing).accepted /
              (existing.unitFactor || 1)}{" "}
            {existing.saleUnit || i.unit}
          </dd>
          <dt>طلبات قائمة</dt>
          <dd>
            {committed(state, existing) / (existing.unitFactor || 1)}{" "}
            {existing.saleUnit || i.unit}
          </dd>
          <dt>سعر وحدة البيع</dt>
          <dd>{existing.price ? money(existing.price) : "لم يحدد"}</dd>
          <dt>نسبة الخصم</dt>
          <dd>
            {existing.discountPercent !== undefined
              ? `${existing.discountPercent}٪`
              : existing.price
                ? `${Math.max(0, Math.round((1 - existing.price / (i.price * (existing.unitFactor || 1))) * 100))}٪`
                : "—"}
          </dd>
          <dt>قيمة المتاح بالعرض</dt>
          <dd>
            {existing.status === "published"
              ? money(remaining(state, existing) * existing.price)
              : "—"}
          </dd>
          <dt>آخر تحديث</dt>
          <dd>
            {existing.updatedAt
              ? new Date(existing.updatedAt).toLocaleString("ar-YE")
              : "وقت سابق غير مسجل"}
          </dd>
        </dl>
        <Button
          disabled={
            actor.role === "agency_branch" && existing.status === "published"
          }
          onClick={() => setEdit(true)}
        >
          {existing.status === "withdrawn"
            ? "مراجعة وإعادة النشر"
            : existing.status === "published"
              ? "تعديل العرض"
              : actor.role === "agency_branch"
                ? "تعديل طلب الاعتماد"
                : "إكمال السعر والنشر"}
        </Button>
        {existing.status !== "withdrawn" && (
          <Button
            variant="danger"
            disabled={
              busy ||
              (actor.role === "agency_branch" &&
                existing.status === "published")
            }
            onClick={() => setConfirmWithdraw(true)}
          >
            {existing.status === "published"
              ? "إيقاف العرض"
              : "إلغاء طلب الاعتماد"}
          </Button>
        )}
        {confirmWithdraw && (
          <ConfirmModal
            title="تأكيد إيقاف العرض"
            message="هل أنت متأكد من إيقاف استقبال طلبات جديدة لهذا العرض؟"
            description="تبقى الطلبات القائمة والمحجوزة مسبقاً محفوظة وتستمر معالجتها بشكل طبيعي، ويمكنك إعادة النشر لاحقاً."
            confirmText="إيقاف العرض"
            cancelText="تراجع"
            busy={busy}
            onClose={() => setConfirmWithdraw(false)}
            onConfirm={async () => {
              await run({ type: "withdrawSale", id: existing.id });
              setConfirmWithdraw(false);
              onDone?.();
            }}
          />
        )}
        <details>
          <summary>سجل تغييرات العرض</summary>
          {offerEvents(state, existing.id)
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.id} className="timeline-row">
                <strong>{e.action}</strong>
                <p>{e.detail}</p>
                <small>
                  {new Date(e.at).toLocaleString("ar-YE")} · {e.actor}
                </small>
              </div>
            ))}
        </details>
        <p>السحب لا يلغي الطلبات القائمة، ولا يحذف تاريخ العمليات.</p>
      </div>
    );
  if (preview)
    return (
      <div className="form-grid">
        <h3>معاينة العرض قبل التأكيد</h3>
        <p>
          {i.name} · {i.batch} · {i.expiry}
        </p>
        <p>
          للشراء الجديد: {preview.quantity / factor} {unit}
        </p>
        <p>
          سعر الوحدة: {money(preview.price)} · قيمة المعروض:{" "}
          {money((preview.price * preview.quantity) / factor)}
        </p>
        {preview.discountPercent !== undefined && (
          <p className="text-emerald-700 font-bold text-sm">
            خصم معتمد: {preview.discountPercent}٪
            {preview.saveItemDiscount
              ? " (سيتم حفظه كاستثناء دائم لهذا الدواء)"
              : " (وفق السياسة الافتراضية)"}
          </p>
        )}
        <p>لا يخصم النشر المخزون، والطلبات القائمة لا تتغير.</p>
        <Button
          disabled={busy}
          onClick={async () => {
            if (await run(preview)) {
              setPreview(null);
              setEdit(false);
              onDone?.();
            }
          }}
        >
          {actor.role === "agency_branch"
            ? "تأكيد الإرسال للإدارة"
            : existing?.status === "withdrawn"
              ? "تأكيد إعادة النشر"
              : existing
                ? "تأكيد حفظ التعديل"
                : "تأكيد النشر"}
        </Button>
        <Button variant="secondary" onClick={() => setPreview(null)}>
          رجوع للبيانات
        </Button>
      </div>
    );
  return (
    <Form
      onSubmit={(f) => {
        const computedDiscount =
          typeof discountVal === "number"
            ? discountVal
            : Math.max(0, Math.round((1 - priceVal / fullPrice) * 100));
        setPreview({
          type: "saveSale",
          itemId: i.id,
          id: existing?.id,
          resume: existing?.status === "withdrawn",
          quantity: Number(f.get("qty")) * factor,
          factor,
          price: priceVal,
          note: String(f.get("note") || ""),
          discountPercent: computedDiscount,
          saveItemDiscount: saveException,
        });
      }}
    >
      <h3>
        {existing
          ? existing.status === "withdrawn"
            ? "مراجعة وإعادة النشر"
            : "تعديل بيانات العرض"
          : independent
            ? "عرض للبيع مباشرة"
            : "إعداد عرض للبيع الخارجي"}
      </h3>
      <p>
        {existing
          ? "عدّل الكمية أو السعر ونسبة الخصم، ثم اضغط معاينة التعديل للتأكيد والحفظ."
          : independent
            ? "أنت صاحب القرار؛ حدد الكمية والسعر ثم انشر."
            : actor.role === "agency_master"
              ? "راجعي كمية الفرع وسعر وحدة البيع، ثم اعتمدي النشر للطلبات الجديدة."
              : "الفرع يرسل الكمية للإدارة؛ التسعير والنشر للإدارة."}
      </p>
      <label className="field">
        <span>وحدة البيع التي سيشتري بها العميل</span>
        <select
          value={factor}
          disabled={
            !!existing && state.orders.some((o) => o.saleId === existing.id)
          }
          onChange={(e) => {
            const nextFactor = Number(e.target.value);
            setFactor(nextFactor);
            const nextFullPrice = i.price * nextFactor;
            const currentDisc =
              typeof discountVal === "number"
                ? discountVal
                : effectiveDefaultDiscount;
            setPriceVal(
              Math.round(nextFullPrice * (1 - currentDisc / 100) * 100) / 100,
            );
          }}
        >
          {i.unitsPerPackage && (
            <option value={i.unitsPerPackage}>
              {i.packageUnit} كامل • {i.unitsPerPackage} {i.unit}
            </option>
          )}
          {(!i.unitsPerPackage || i.splitAllowed) && (
            <option value={1}>
              {i.unit}
              {i.unitsPerPackage ? " • بيع بالتجزئة" : ""}
            </option>
          )}
        </select>
      </label>
      <Field
        key={"q" + factor}
        name="qty"
        label={`الكمية المتاحة للطلبات الجديدة (${unit})`}
        type="number"
        min={1}
        max={Math.floor(available(state, i.id) / factor)}
        defaultValue={existing ? Math.max(1, remaining(state, existing)) : 1}
      />
      {actor.role === "agency_branch" ? (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-right">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Percent size={15} className="text-teal-600" />
              سياسة الخصم المعتمدة من إدارة السلسلة
            </span>
            <span className="text-xs text-slate-500">
              السعر المرجعي الرسمي: <strong>{money(fullPrice)}</strong>
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">نسبة الخصم الافتراضية للفرع:</span>
              <strong className="text-slate-800">{branchDefaultDiscount}٪{branchDefaultDiscount === 0 ? " (بدون خصم)" : ""}</strong>
            </div>
            {itemCustomDiscount !== undefined && (
              <div className="flex items-center justify-between text-xs mb-1 text-teal-700">
                <span>استثناء الصنف الحالي المعتمد:</span>
                <strong>{itemCustomDiscount}٪</strong>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-600">السعر التقديري المتوقع ({unit}):</span>
              <strong className="text-teal-700">
                {money(Math.round(fullPrice * (1 - effectiveDefaultDiscount / 100) * 100) / 100)}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed m-0">
            تنبيه للفرع: يُرسل هذا الطلب بالكمية إلى الإدارة المركزية للسلسلة لمراجعة المخزون واعتماد التسعير والخصم النهائيين قبل النشر في البورصة.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-right">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Percent size={15} className="text-teal-600" />
              تحديد الخصم والتسعير
            </span>
            <span className="text-xs text-slate-500">
              السعر المرجعي الرسمي: <strong>{money(fullPrice)}</strong>
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <label className="field m-0">
              <span>
                نسبة الخصم (٪)
                <small className="text-slate-400 block text-[11px] font-normal">
                  الافتراضي للصيدلية: {branchDefaultDiscount}٪{branchDefaultDiscount === 0 ? " (بدون خصم)" : ""}
                  {itemCustomDiscount !== undefined &&
                    ` · استثناء الصنف الحالي: ${itemCustomDiscount}٪`}
                </small>
              </span>
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={discountVal}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? "" : Number(e.target.value);
                  setDiscountVal(val);
                  if (typeof val === "number") {
                    const calculated =
                      Math.round(fullPrice * (1 - val / 100) * 100) / 100;
                    setPriceVal(calculated);
                  }
                }}
              />
            </label>

            <label className="field m-0">
              <span>سعر البيع النهائي ({unit}) بالريال</span>
              <input
                name="price"
                type="number"
                min={0.01}
                max={fullPrice}
                step="0.01"
                required
                value={priceVal}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriceVal(val);
                  if (fullPrice > 0) {
                    const calcDisc = Math.round((1 - val / fullPrice) * 100);
                    setDiscountVal(Math.max(0, calcDisc));
                  }
                }}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={saveException}
              onChange={(e) => setSaveException(e.target.checked)}
            />
            <span>
              تثبيت نسبة{" "}
              {typeof discountVal === "number" ? `${discountVal}٪` : ""}{" "}
              كاستثناء يدوي دائم لهذا الدواء عن افتراضي الصيدلية
            </span>
          </label>
        </div>
      )}
      <Field
        name="note"
        label="ملاحظة / سبب البيع (اختياري)"
        required={false}
        defaultValue={existing?.note || ""}
      />
      {!eligible(i, state.minExpiryDays ?? 30) && (
        <div className="notice">{eligibilityReasons(i, state.minExpiryDays ?? 30).join(" · ")}</div>
      )}
      <div className="flex gap-2.5 pt-2">
        <Button
          disabled={busy || !eligible(i, state.minExpiryDays ?? 30) || available(state, i.id) < factor}
          type="submit"
        >
          معاينة{" "}
          {existing?.status === "withdrawn"
            ? "إعادة النشر"
            : existing
              ? "التعديل"
              : "العرض"}
        </Button>
        {edit && (
          <Button
            variant="ghost"
            onClick={() => {
              if (initialEdit && onDone) {
                onDone();
              } else {
                setEdit(false);
              }
            }}
          >
            إلغاء التعديل
          </Button>
        )}
      </div>
    </Form>
  );
}
export function Packaging({ item: i }: { item: Item }) {
  const { run, busy } = useApp();
  const [proposal, setProposal] = useState<Extract<
    Command,
    { type: "packaging" }
  > | null>(null);
  return (
    <details className="mt-5">
      <summary>
        {i.unitsPerPackage
          ? "مراجعة / تصحيح تعريف العبوة"
          : "تعريف العبوة ووحدة المخزون"}
      </summary>
      <p>
        الكمية الأصلية المستوردة:{" "}
        {i.importSource
          ? `${i.importSource.quantity} ${i.importSource.unit}`
          : "لم تُسجل في الإصدار السابق؛ راجع المصدر"}
        . الرصيد الحالي: {i.quantity} {i.unit}.
      </p>
      {i.unitsPerPackage && (
        <p>
          كل {i.packageUnit} = {i.unitsPerPackage} {i.unit}.
        </p>
      )}
      {proposal ? (
        <div className="notice">
          <p>
            معاينة التحويل: {i.quantity} {i.unit} ←{" "}
            {(i.quantity / (i.unitsPerPackage || 1)) * proposal.size}{" "}
            {proposal.baseUnit}. السعر المرجعي للوحدة:{" "}
            {money((i.price * (i.unitsPerPackage || 1)) / proposal.size)}. تبقى
            قيمة الرصيد محفوظة. تأكد أن الرصيد السابق يمثل{" "}
            {i.unitsPerPackage ? "الوحدات الداخلية المعرفة" : "عبوات كاملة"}.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              if (await run(proposal)) setProposal(null);
            }}
          >
            تأكيد التحويل بعد المراجعة
          </Button>
          <Button variant="secondary" onClick={() => setProposal(null)}>
            رجوع دون تحويل
          </Button>
        </div>
      ) : (
        <Form
          onSubmit={(f) =>
            setProposal({
              type: "packaging",
              itemId: i.id,
              packageUnit: String(f.get("pack")),
              baseUnit: String(f.get("base")),
              size: Number(f.get("size")),
              split: f.get("split") === "on",
            })
          }
        >
          <Field
            name="pack"
            label="وحدة العبوة الخارجية"
            defaultValue={i.packageUnit || i.unit}
          />
          <Field
            name="base"
            label="وحدة المحتوى الداخلية"
            defaultValue={i.unitsPerPackage ? i.unit : ""}
          />
          <Field
            name="size"
            label="عدد الوحدات داخل العبوة"
            type="number"
            min={1}
            defaultValue={i.unitsPerPackage || ""}
          />
          <label>
            <input
              type="checkbox"
              name="split"
              defaultChecked={i.splitAllowed}
            />{" "}
            أؤكد ملاءمة الصنف للبيع بالوحدة المحددة مع حفظ التشغيلات
          </label>
          <p>
            يمنع التصحيح مع عروض نشطة أو تاريخ طلبات؛ لا يُعدل معامل التحويل على
            حركات قديمة.
          </p>
          <Button type="submit">معاينة أثر تعريف العبوة</Button>
        </Form>
      )}
    </details>
  );
}
export function SupplierForm({ item: i }: { item: Item }) {
  const { state, run, busy } = useApp();
  return (
    <Form
      onSubmit={(f) =>
        run({
          type: "setDeadline",
          itemId: i.id,
          supplier: String(f.get("supplier")),
          date: String(f.get("date")),
          days:
            String(f.get("days")) === "" ? undefined : Number(f.get("days")),
          status: String(f.get("status")) as "open",
        })
      }
    >
      <h3>مرتجعات المورد</h3>
      <Field
        name="supplier"
        label="اسم المورد"
        defaultValue={i.supplier || ""}
      />
      <Field
        name="date"
        required={false}
        label="آخر موعد إرجاع أو الموعد الجديد بعد التمديد"
        type="date"
        defaultValue={i.returnDeadline || ""}
      />
      <Field
        name="days"
        label={`نبّهني قبل (أيام)؛ الافتراضي ${state.branches.find((b) => b.id === i.branchId)?.alertDays ?? 10}`}
        type="number"
        min={0}
        max={365}
        required={false}
        defaultValue={i.alertDays ?? ""}
      />
      <label className="field">
        <span>حالة المتابعة</span>
        <select name="status" defaultValue={i.returnStatus || "open"}>
          <option value="open">متابعة مفتوحة / تمديد الموعد</option>
          <option value="returned">تم الإرجاع — إغلاق التذكير</option>
          <option value="refused">المورد رفض — إغلاق التذكير</option>
          <option value="not_returnable">غير قابل للإرجاع</option>
        </select>
      </label>
      <p>
        إغلاق التذكير لا يخصم المخزون. سجل خروج البضاعة الفعلي بتسوية موثقة؛ لا
        تؤكد الإرجاع لمجرد الاتفاق مع المورد.
      </p>
      <Button disabled={busy} type="submit">
        حفظ سياسة الإرجاع
      </Button>
    </Form>
  );
}

export function ItemDiscountForm({ item: i }: { item: Item }) {
  const { state, actor, run, busy } = useApp();
  const branch = state.branches.find((b) => b.id === i.branchId);
  const defaultDiscount = branch?.defaultDiscount ?? 0;

  if (actor.role === "agency_branch") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-right mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-teal-600" />
            <h3 className="m-0 text-sm font-bold text-slate-800">
              سياسة خصم الصنف في البورصة
            </h3>
          </div>
          <span className="bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded text-xs border border-teal-200">
            {i.discountPercent !== undefined
              ? `استثناء الصنف: ${i.discountPercent}٪`
              : `افتراضي الإدارة: ${defaultDiscount}٪${defaultDiscount === 0 ? " (بدون خصم)" : ""}`}
          </span>
        </div>
        <p className="text-xs text-slate-600 m-0">
          {i.discountPercent !== undefined ? (
            <>اعتمدت إدارة السلسلة استثناءً خاصاً لهذا الصنف بنسبة خصم <strong>{i.discountPercent}٪</strong> بدلاً من النسبة الافتراضية للفرع ({defaultDiscount}٪).</>
          ) : (
            <>يتبع هذا الصنف نسبة الخصم الافتراضية المعتمدة لفرعكم من قِبل الإدارة المركزية للسلسلة وهي <strong>{defaultDiscount}٪</strong>{defaultDiscount === 0 ? " (السعر المرجعي كاملاً)" : ""}.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <Form
      onSubmit={async (f) => {
        const raw = f.get("discount");
        const discount =
          raw === "" || raw === null || raw === undefined
            ? undefined
            : Number(raw);
        await run({
          type: "setItemDiscount",
          itemId: i.id,
          discount,
        });
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Percent size={16} className="text-teal-600" />
        <h3 className="m-0">استثناء نسبة الخصم للصنف</h3>
      </div>
      <p className="text-xs text-slate-500 mb-2">
        حدد نسبة خصم مخصصة لهذا الصنف عند طرحه في البورصة؛ اتركه فارغاً ليعتمد تلقائياً على النسبة الافتراضية المحددة في إعدادات الصيدلية ({defaultDiscount}٪).
      </p>
      <Field
        name="discount"
        label={`نسبة الخصم الخاصة بالصنف (٪)؛ الافتراضي ${defaultDiscount}٪${defaultDiscount === 0 ? " (بدون خصم)" : ""}`}
        type="number"
        min={0}
        max={99}
        required={false}
        defaultValue={i.discountPercent ?? ""}
      />
      <div className="flex items-center gap-2">
        <Button disabled={busy} type="submit">
          حفظ نسبة خصم الصنف
        </Button>
        {i.discountPercent !== undefined && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run({
                type: "setItemDiscount",
                itemId: i.id,
                discount: undefined,
              })
            }
          >
            إلغاء الاستثناء والعودة للافتراضي ({defaultDiscount}٪)
          </Button>
        )}
      </div>
    </Form>
  );
}
export function Checkout({
  saleId,
  onDone,
}: {
  saleId: string;
  onDone: () => void;
}) {
  const { state, actor, run, busy } = useApp();
  const x = state.sales.find((x) => x.id === saleId)!;
  const i = state.items.find((i) => i.id === x.itemId)!;
  const factor = x.unitFactor || 1,
    unit = x.saleUnit || i.unit;
  const max = remaining(state, x);
  const [qty, setQty] = useState(1);
  const effectiveQty = max === 1 ? 1 : qty;
  const subtotal = Math.round(x.price * effectiveQty * 100) / 100;
  return (
    <Form
      onSubmit={async () => {
        if (
          await run({
            type: "buy",
            saleId: x.id,
            branchId: actor.branchId!,
            quantity: (max === 1 ? 1 : qty) * factor,
          })
        )
          onDone();
      }}
    >
      <h3>{i.name}</h3>
      <p>
        التشغيلة {i.batch} · الصلاحية {i.expiry}
      </p>
      {i.unitsPerPackage && (
        <p>
          محتوى كل {i.packageUnit}: {i.unitsPerPackage} {i.unit}
        </p>
      )}
      <Badge>
        {factor > 1 || !i.splitAllowed
          ? "البيع بوحدة العرض الكاملة فقط"
          : "بيع بالتجزئة بوحدة محددة"}
      </Badge>
      <p>
        المتاح للطلب: {max} {unit}
      </p>
      {max === 1 ? (
        <div className="notice">
          الكمية: 1 {unit} كامل <input type="hidden" name="qty" value="1" />
        </div>
      ) : (
        <label className="field">
          <span>عدد وحدات البيع المطلوبة ({unit})</span>
          <input
            aria-label="كمية الشراء"
            type="number"
            min={1}
            max={max}
            step={1}
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </label>
      )}
      <dl className="details">
        <dt>سعر {unit}</dt>
        <dd>{money(x.price)}</dd>
        <dt>القيمة</dt>
        <dd>{money(max === 1 ? x.price : subtotal)}</dd>
        <dt>عمولة المنصة ({state.platformFeePercent !== undefined ? state.platformFeePercent : 1.5}٪)</dt>
        <dd>
          {money(
            Math.round(
              (max === 1 ? x.price : subtotal) *
                ((state.platformFeePercent !== undefined
                  ? state.platformFeePercent
                  : 1.5) /
                  100),
            ),
          )}
        </dd>
        <dt>الإجمالي</dt>
        <dd>
          {money(
            (max === 1 ? x.price : subtotal) +
              Math.round(
                (max === 1 ? x.price : subtotal) *
                  ((state.platformFeePercent !== undefined
                    ? state.platformFeePercent
                    : 1.5) /
                    100),
              ),
          )}
        </dd>
      </dl>
      <p>
        {actor.role === "agency_branch"
          ? "طلب الشراء يحتاج اعتماد إدارتك؛ لا تحجز الكمية إلا بعد الموافقة، ويعاد التحقق من توفرها حينها."
          : "حجز كمية ورصيد تجريبي فقط."}
      </p>
      <Button
        disabled={
          busy ||
          max < 1 ||
          !Number.isSafeInteger(effectiveQty) ||
          effectiveQty < 1 ||
          effectiveQty > max
        }
        type="submit"
      >
        {actor.role === "agency_branch"
          ? "إرسال طلب الشراء لإدارتي"
          : max === 1
            ? `تأكيد حجز ${unit} واحد`
            : "تأكيد الشراء وحجز الكمية"}
      </Button>
    </Form>
  );
}
