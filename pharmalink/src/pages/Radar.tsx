import { useState } from "react";
import { useApp } from "../context";
import { ownsBranch } from "../domain/access";
import { radarMatches, remaining } from "../domain/offers";
import {
  Card,
  Button,
  Modal,
  Form,
  Field,
  Empty,
  money,
} from "../components/UI";
import { Checkout } from "../components/ItemTools";
export function Radar() {
  const { state, actor, run, busy } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [buy, setBuy] = useState(false);
  const x = state.sales.find((x) => x.id === selected),
    i = state.items.find((i) => i.id === x?.itemId);
  return (
    <>
      <Card>
        <Form
          onSubmit={(f) =>
            run({
              type: "radar",
              branchId:
                actor.branchId ||
                state.branches.find((b) => ownsBranch(state, actor, b.id))!.id,
              query: String(f.get("query")),
              strength: String(f.get("strength") || ""),
              dosageForm: String(f.get("form") || ""),
              minDiscount:
                String(f.get("discount")) === ""
                  ? undefined
                  : Number(f.get("discount")),
              minExpiry:
                String(f.get("expiry")) === ""
                  ? undefined
                  : Number(f.get("expiry")),
            })
          }
        >
          <Field name="query" label="اسم الدواء الذي تريد متابعة توفره" />
          <div className="grid md:grid-cols-2 gap-3">
            <Field
              name="strength"
              label="التركيز المطابق (اختياري)"
              required={false}
            />
            <Field
              name="form"
              label="الشكل الدوائي المطابق (اختياري)"
              required={false}
            />
            <Field
              name="discount"
              label="أقل خصم ٪ (اختياري)"
              type="number"
              min={0}
              max={100}
              required={false}
            />
            <Field
              name="expiry"
              label="أقل أيام صلاحية متبقية (اختياري)"
              type="number"
              min={0}
              required={false}
            />
          </div>
          <p>
            المطابقة بحسب الحقول المعرفة. الصنف مجهول التركيز أو الشكل لا يطابق
            فلترًا محددًا لهما. راجع بيانات الدواء قبل الشراء. لا شراء أو حجز
            تلقائي.
          </p>
          <Button type="submit" disabled={busy}>
            إضافة متابعة
          </Button>
        </Form>
      </Card>
      {state.radar
        .filter((r) => ownsBranch(state, actor, r.branchId))
        .map((r) => {
          const matches = radarMatches(state, actor, r.query, r);
          return (
            <Card key={r.id} className="mt-5">
              <div className="section-title">
                <h3>
                  {r.query} — {matches.length} عرض قابل للطلب
                </h3>
                <Button
                  disabled={busy}
                  variant="ghost"
                  onClick={() => run({ type: "removeRadar", id: r.id })}
                >
                  إلغاء المتابعة
                </Button>
              </div>
              {!matches.length ? (
                <Empty
                  title="لا توجد عروض مطابقة متاحة الآن"
                  description="العروض الموقوفة والمنتهية وغير المتاحة لا تُعرض. لا توجد إشعارات خلفية."
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>الدواء والبائع</th>
                        <th>التشغيلة والصلاحية</th>
                        <th>المتاح</th>
                        <th>السعر لكل وحدة بيع</th>
                        <th>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((x) => {
                        const i = state.items.find((i) => i.id === x.itemId)!;
                        return (
                          <tr key={x.id}>
                            <td>
                              <strong>{i.name}</strong>
                              <small>
                                {
                                  state.branches.find(
                                    (b) => b.id === i.branchId,
                                  )?.name
                                }{" "}
                                · {i.ingredient}
                              </small>
                            </td>
                            <td>
                              {i.batch}
                              <small>{i.expiry}</small>
                            </td>
                            <td>
                              {remaining(state, x)} {x.saleUnit || i.unit}
                            </td>
                            <td>{money(x.price)}</td>
                            <td>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setSelected(x.id);
                                  setBuy(false);
                                }}
                              >
                                عرض التفاصيل
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      {x && i && (
        <Modal
          title="تفاصيل العرض المطابق"
          onClose={() => {
            setSelected(null);
            setBuy(false);
          }}
        >
          {buy ? (
            <Checkout
              saleId={x.id}
              onDone={() => {
                setSelected(null);
                setBuy(false);
              }}
            />
          ) : (
            <div className="form-grid">
              <h3>{i.name}</h3>
              <p>{i.ingredient}</p>
              <p>
                البائع: {state.branches.find((b) => b.id === i.branchId)?.name}
              </p>
              <p>
                التشغيلة {i.batch} · الصلاحية {i.expiry}
              </p>
              <p>
                متاح {remaining(state, x)} {x.saleUnit || i.unit} · سعر الوحدة{" "}
                {money(x.price)}
              </p>
              {i.unitsPerPackage && (
                <p>
                  كل {i.packageUnit} يحتوي {i.unitsPerPackage} {i.unit}
                </p>
              )}
              <p>فتح التفاصيل لا ينشئ أي طلب.</p>
              {actor.role !== "agency_master" ? (
                <Button
                  disabled={x.status !== "published" || remaining(state, x) < 1}
                  onClick={() => setBuy(true)}
                >
                  متابعة إلى مراجعة طلب الشراء
                </Button>
              ) : (
                <p>يُنشئ الفرع طلب الشراء، وتعتمده الإدارة من الطلبات.</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
