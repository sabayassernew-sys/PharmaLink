import { useState } from "react";
import { useApp } from "../context";
import { visibleItems, daysLeft } from "../domain/access";
import { Card, PageTitle, Button, Modal, Empty, Badge } from "../components/UI";
import { SupplierForm } from "../components/ItemTools";
export function SupplierReturns() {
  const { state, actor } = useApp();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const items = visibleItems(state, actor).filter(
    (i) => i.returnDeadline || i.returnStatus,
  );
  const classify = (i: (typeof items)[number]) => {
    if (i.returnStatus && i.returnStatus !== "open") return "closed";
    const d = daysLeft(i.returnDeadline!);
    return d < 0
      ? "expired"
      : d === 0
        ? "today"
        : d <=
            (i.alertDays ??
              state.branches.find((b) => b.id === i.branchId)?.alertDays ??
              10)
          ? "due"
          : "later";
  };
  const tabs = [
    ["all", "جميع المتابعات"],
    ["later", "لم يحن التنبيه"],
    ["due", "اقترب الموعد"],
    ["today", "آخر موعد اليوم"],
    ["expired", "انتهت المهلة"],
    ["closed", "المتابعة المغلقة"],
  ];
  const current = items.find((i) => i.id === selected);
  return (
    <>
      <PageTitle
        title="مرتجعات الموردين"
        description="متابعة مستقلة عن رادار الشراء. هذه المواعيد والشروط مدخلة من المنشأة، ولا تضمن قبول المورد."
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
                .map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.name}
                      <small>{i.batch}</small>
                    </td>
                    <td>{i.supplier}</td>
                    <td>
                      {i.quantity} {i.unit}
                    </td>
                    <td>{i.returnDeadline || "غير محدد"}</td>
                    <td>
                      {i.alertDays ??
                        state.branches.find((b) => b.id === i.branchId)
                          ?.alertDays ??
                        10}{" "}
                      أيام
                    </td>
                    <td>
                      <Badge
                        tone={classify(i) === "expired" ? "danger" : "neutral"}
                      >
                        {classify(i) === "closed"
                          ? {
                              returned: "تم الإرجاع",
                              refused: "رفض المورد",
                              not_returnable: "غير قابل للإرجاع",
                            }[i.returnStatus as "returned"]
                          : tabs.find(([k]) => k === classify(i))?.[1]}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => setSelected(i.id)}
                      >
                        تحديث المتابعة / تمديد الموعد
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <Empty
            title="لا توجد متابعات موردين"
            description="أضف المورد والموعد من تفاصيل الصنف في المخزون."
          />
        )}
      </Card>
      {current && (
        <Modal
          title={current.name + " • " + current.batch}
          onClose={() => setSelected(null)}
        >
          <SupplierForm item={current} />
        </Modal>
      )}
    </>
  );
}
