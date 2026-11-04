import { SaleEditor } from "../components/ItemTools";
import { useState } from "react";
import { useApp } from "../context";
import { ownsBranch } from "../domain/access";
import {
  remaining,
  committed,
  offerProgress,
  offerAvailability,
  offerEvents,
} from "../domain/offers";
import { Card, Button, Modal, Empty, Status, money } from "../components/UI";
export function Offers() {
  const { state, actor, run, busy } = useApp();
  const [tab, setTab] = useState("published");
  const [edit, setEdit] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const owned = state.sales.filter((x) =>
    ownsBranch(
      state,
      actor,
      state.items.find((i) => i.id === x.itemId)!.branchId,
    ),
  );
  const inTab = (x: (typeof owned)[number], key: string) =>
    key === "completed"
      ? x.status === "published" && offerAvailability(state, x) === "completed"
      : key === "published"
        ? x.status === "published" &&
          offerAvailability(state, x) !== "completed"
        : x.status === key;
  const list = owned.filter((x) => tab === "history" || inTab(x, tab));
  const x = owned.find((x) => x.id === edit),
    i = state.items.find((i) => i.id === x?.itemId);
  const log = history
    ? offerEvents(state, history)
    : state.events.filter((e) => owned.some((x) => x.id === e.reference));
  return (
    <>
      <div className="tabs mb-5">
        {[
          ["published", "العروض الحالية"],
          ["withdrawn", "الموقوفة"],
          ["completed", "المغلقة بعد التنفيذ"],
          ["pending", "بانتظار الاعتماد"],
          ["history", "سجل التغييرات"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {title} (
            {key === "history"
              ? owned.length
              : owned.filter((x) => inTab(x, key)).length}
            )
          </button>
        ))}
      </div>
      <Card>
        {tab === "history" ? (
          <>
            <h3>العروض السابقة والحالية</h3>
            <p>
              هذه سجلات تاريخية وليست كميات إضافية في المخزون. العمليات القديمة
              قبل التحديث قد لا تملك وقتًا مسجلًا.
            </p>
            {owned.map((x) => (
              <div key={x.id} className="task-row">
                <div>
                  <strong>
                    {state.items.find((i) => i.id === x.itemId)?.name}
                  </strong>
                  <small>
                    عرض {x.id.slice(-8)} · {x.quantity / (x.unitFactor || 1)}{" "}
                    {x.saleUnit ||
                      state.items.find((i) => i.id === x.itemId)?.unit}
                  </small>
                </div>
                <Status value={x.status} />
                <Button variant="ghost" onClick={() => setHistory(x.id)}>
                  سجل العرض
                </Button>
              </div>
            ))}
            {!owned.length && <Empty />}
          </>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الصنف والتشغيلة</th>
                    <th>متاح لطلبات جديدة</th>
                    <th>طلبات قائمة</th>
                    <th>سعر وحدة البيع</th>
                    <th>الحالة وآخر تحديث</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const i = state.items.find((i) => i.id === x.itemId)!;
                    const can =
                      actor.role !== "agency_branch" ||
                      x.status !== "published";
                    return (
                      <tr key={x.id}>
                        <td>
                          <strong>{i.name}</strong>
                          <small>
                            {i.batch} · عرض {x.id.slice(-8)}
                          </small>
                        </td>
                        <td>
                          {x.status === "published" ? remaining(state, x) : "—"}{" "}
                          {x.saleUnit || i.unit}
                          <small>
                            المباع المقبول:{" "}
                            {offerProgress(state, x).accepted /
                              (x.unitFactor || 1)}
                          </small>
                        </td>
                        <td>
                          {committed(state, x) / (x.unitFactor || 1)}{" "}
                          {x.saleUnit || i.unit}
                        </td>
                        <td>
                          {x.price ? money(x.price) : "لم يُسعّر"}
                          {x.price > 0 && (
                            <small className="text-teal-600 font-bold block mt-1">
                              خصم{" "}
                              {x.discountPercent !== undefined
                                ? x.discountPercent
                                : Math.max(
                                    0,
                                    Math.round(
                                      (1 -
                                        x.price /
                                          (i.price * (x.unitFactor || 1))) *
                                        100,
                                    ),
                                  )}
                              ٪
                            </small>
                          )}
                        </td>
                        <td>
                          <Status value={x.status} />
                          {offerAvailability(state, x) === "completed" && (
                            <small>اكتمل تنفيذ كمية العرض</small>
                          )}
                          <small>
                            {x.updatedAt
                              ? new Date(x.updatedAt).toLocaleString("ar-YE")
                              : "وقت سابق غير مسجل"}
                          </small>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={!can}
                              variant="secondary"
                              onClick={() => setEdit(x.id)}
                            >
                              {x.status === "withdrawn"
                                ? "مراجعة وإعادة النشر"
                                : x.status === "pending"
                                  ? actor.role === "agency_branch"
                                    ? "تعديل طلب الاعتماد"
                                    : "تسعير واعتماد النشر"
                                  : "تعديل العرض"}
                            </Button>
                            {x.status !== "withdrawn" && (
                              <Button
                                disabled={!can || busy}
                                variant="ghost"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "إيقاف استقبال طلبات جديدة؟ الطلبات القائمة تبقى محفوظة.",
                                    )
                                  )
                                    run({ type: "withdrawSale", id: x.id });
                                }}
                              >
                                {x.status === "pending"
                                  ? "إلغاء الطلب"
                                  : "إيقاف العرض"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              onClick={() => setHistory(x.id)}
                            >
                              سجل التغييرات
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!list.length && (
              <Empty
                title="لا توجد عروض في هذا القسم"
                description="العروض المنشورة والموقوفة منفصلة؛ لا يُحذف التاريخ."
              />
            )}
          </>
        )}
      </Card>
      {x && i && (
        <Modal
          title={
            x.status === "withdrawn"
              ? "مراجعة إعادة النشر"
              : "تعديل العرض للطلبات الجديدة"
          }
          onClose={() => {
            setEdit(null);
          }}
        >
          <SaleEditor key={x.id} item={i} saleId={x.id} />
          <div className="notice mt-4">
            <span>
              أُغلقت معالجة{" "}
              {offerProgress(state, x).closed / (x.unitFactor || 1)}{" "}
              {x.saleUnit || i.unit} من كمية العرض. هذا الرقم لا يعني أن جميعها
              بيعت.
            </span>
            <span>
              المباع المقبول:{" "}
              {offerProgress(state, x).accepted / (x.unitFactor || 1)} ·
              المرتجع: {offerProgress(state, x).returned / (x.unitFactor || 1)}{" "}
              · التالف:{" "}
              {offerProgress(state, x).writtenOff / (x.unitFactor || 1)} ·
              المفقود: {offerProgress(state, x).lost / (x.unitFactor || 1)}
            </span>
            {!!offerProgress(state, x).unresolvedHistory && (
              <span>
                كمية تاريخية مغلقة دون تفصيل كافٍ:{" "}
                {offerProgress(state, x).unresolvedHistory /
                  (x.unitFactor || 1)}
                . لم يُفترض أنها مبيعات.
              </span>
            )}
          </div>
        </Modal>
      )}
      {history && (
        <Modal title="سجل تغييرات العرض" onClose={() => setHistory(null)}>
          <p>معرف العرض: {history}</p>
          {log.length ? (
            log
              .slice()
              .reverse()
              .map((e) => (
                <div className="timeline-row" key={e.id}>
                  <strong>{e.action}</strong>
                  <p>{e.detail}</p>
                  <small>
                    {e.actor} · {new Date(e.at).toLocaleString("ar-YE")}
                  </small>
                </div>
              ))
          ) : (
            <p>
              هذا عرض من إصدار سابق لا يملك أحداثًا مرتبطة بمعرفه. لم يُنشأ له
              تاريخ افتراضي؛ الأحداث اللاحقة ستظهر هنا.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
