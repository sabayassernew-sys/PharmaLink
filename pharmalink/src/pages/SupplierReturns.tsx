import { useState } from "react";
import { useApp } from "../context";
import {
  visibleItems,
  daysLeft,
  getEffectiveReturnDeadline,
  getEffectiveSupplier,
  getEffectiveAlertDays,
} from "../domain/access";
import { Card, PageTitle, Button, Modal, Empty, Badge, Field, Form } from "../components/UI";
import { SaleEditor } from "../components/ItemTools";
import { Tag, ArrowRightLeft } from "lucide-react";

export function SupplierReturns() {
  const { state, actor, run, busy } = useApp();
  const [filter, setFilter] = useState("all");
  const [saleItemId, setSaleItemId] = useState<string | null>(null);
  const [transferItemId, setTransferItemId] = useState<string | null>(null);

  const items = visibleItems(state, actor).filter(
    (i) => i.quantity > 0 && (i.returnDeadline || getEffectiveReturnDeadline(i, state)),
  );

  const classify = (i: (typeof items)[number]) => {
    const deadline = getEffectiveReturnDeadline(i, state);
    if (!deadline) return "later";
    const d = daysLeft(deadline);
    const branch = state.branches.find((b) => b.id === i.branchId);
    const alertWindow = branch?.alertDays ?? getEffectiveAlertDays(i, state);
    return d < 0
      ? "expired"
      : d === 0
        ? "today"
        : d <= alertWindow
          ? "due"
          : "later";
  };

  const tabs = [
    ["all", "جميع المتابعات"],
    ["due", "اقترب الموعد"],
    ["today", "آخر موعد اليوم"],
    ["later", "لم يحن التنبيه"],
    ["expired", "انتهت المهلة"],
  ];

  const saleItem = items.find((i) => i.id === saleItemId);
  const transferItem = items.find((i) => i.id === transferItemId);

  return (
    <>
      <PageTitle
        title="رادار مهل الموردين وتصريف الأدوية"
        description="رصد ذكي ومحسوب آلياً لمهل الموردين لتفادي الخسائر، مع إتاحة الطرح المباشر في البورصة أو طلب مناقلة فورية لحماية رأس المال الدوائي."
      />
      <div className="tabs mb-5">
        {tabs.map(([k, v]) => (
          <button
            key={k}
            className={filter === k ? "active" : ""}
            onClick={() => setFilter(k)}
          >
            {v} ({items.filter((i) => k === "all" || classify(i) === k).length})
          </button>
        ))}
      </div>
      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الصنف والتشغيلة</th>
                <th>المورد</th>
                <th>الكمية</th>
                <th>موعد الإرجاع</th>
                <th>التنبيه قبل</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => filter === "all" || classify(i) === filter)
                .map((i) => {
                  const deadline = getEffectiveReturnDeadline(i, state);
                  const supplierName = getEffectiveSupplier(i, state);
                  const branch = state.branches.find((b) => b.id === i.branchId);
                  const alertDays = branch?.alertDays ?? getEffectiveAlertDays(i, state);

                  return (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <small className="block text-slate-400">تشغيلة: {i.batch} · انتهاء: {i.expiry}</small>
                      </td>
                      <td>
                        <span className="font-medium text-slate-800">{supplierName}</span>
                      </td>
                      <td>
                        {i.quantity} {i.unit}
                      </td>
                      <td>
                        <span className="font-semibold text-slate-800">{deadline || "غير محدد"}</span>
                      </td>
                      <td>
                        {alertDays} أيام
                      </td>
                      <td>
                        <Badge
                          tone={classify(i) === "expired" ? "danger" : classify(i) === "today" ? "warning" : "neutral"}
                        >
                          {tabs.find(([k]) => k === classify(i))?.[1]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            variant="secondary"
                            onClick={() => setSaleItemId(i.id)}
                            className="text-xs py-1 px-2.5 text-teal-800 bg-teal-50/80 hover:bg-teal-100 border-teal-200"
                          >
                            <Tag size={13} className="text-teal-600" />
                            عرض في البورصة
                          </Button>
                          {actor.chainId && (
                            <Button
                              variant="secondary"
                              onClick={() => setTransferItemId(i.id)}
                              className="text-xs py-1 px-2.5 text-blue-800 bg-blue-50/80 hover:bg-blue-100 border-blue-200"
                            >
                              <ArrowRightLeft size={13} className="text-blue-600" />
                              طلب مناقلة
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <Empty
            title="لا توجد متابعات موردين حالياً"
            description="يتم احتساب المواعيد آلياً من سياسة مورد الفرع أو عند تحديد مهلة خاصة بالصنف."
          />
        )}
      </Card>

      {/* نافذة طرح الصنف في البورصة يدوياً */}
      {saleItem && (
        <Modal
          title={`طرح في البورصة الدوائية • ${saleItem.name}`}
          onClose={() => setSaleItemId(null)}
        >
          <SaleEditor
            item={saleItem}
            initialEdit={true}
            onDone={() => setSaleItemId(null)}
          />
        </Modal>
      )}

      {/* نافذة طلب مناقلة داخلية يدوياً */}
      {transferItem && (
        <Modal
          title={`طلب مناقلة داخلية • ${transferItem.name}`}
          onClose={() => setTransferItemId(null)}
        >
          {(() => {
            const sisterBranches = state.branches.filter(
              (b) =>
                b.chainId === actor.chainId &&
                b.id !== transferItem.branchId &&
                b.active,
            );
            if (!sisterBranches.length) {
              return (
                <Empty
                  title="لا توجد فروع شقيقة أخرى مفعلة"
                  description="يتطلب إجراء المناقلة وجود فرع آخر مفعل ضمن نفس السلسلة."
                />
              );
            }
            return (
              <Form
                onSubmit={(f) => {
                  run({
                    type: "transfer",
                    from: transferItem.branchId,
                    to: String(f.get("to")),
                    items: [
                      {
                        itemId: transferItem.id,
                        quantity: Number(f.get("quantity")),
                      },
                    ],
                    note: String(
                      f.get("note") || "مناقلة دواء قارب مهلة المورد لبيعه في فرع آخر",
                    ),
                  });
                  setTransferItemId(null);
                }}
              >
                <p className="text-xs text-slate-600 mb-3">
                  تحويل رصيد الصنف ({transferItem.quantity} {transferItem.unit}) إلى فرع شقيق داخل السلسلة لسرعة تصريفه قبل فوات الصلاحية.
                </p>
                <label className="field mb-3">
                  <span>الفرع المستلم</span>
                  <select name="to" required>
                    {sisterBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="quantity"
                  label={`الكمية المراد مناقلتها (المتاح: ${transferItem.quantity} ${transferItem.unit})`}
                  type="number"
                  min={1}
                  max={transferItem.quantity}
                  defaultValue={transferItem.quantity}
                  required
                />
                <Field
                  name="note"
                  label="ملاحظات المناقلة"
                  defaultValue="مناقلة دواء قارب مهلة المورد لبيعه في فرع شقيق"
                  required={false}
                />
                <Button type="submit" disabled={busy} className="w-full justify-center">
                  إرسال طلب المناقلة
                </Button>
              </Form>
            );
          })()}
        </Modal>
      )}
    </>
  );
}
