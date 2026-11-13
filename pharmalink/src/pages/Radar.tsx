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
          const ownSales = state.sales.filter((x) => {
            if (x.status !== "published") return false;
            const item = state.items.find((i) => i.id === x.itemId);
            if (!item) return false;
            const isOwn =
              item.branchId === actor.branchId ||
              (actor.chainId &&
                state.branches.find((b) => b.id === item.branchId)?.chainId ===
                  actor.chainId);
            if (!isOwn) return false;
            const q = r.query.trim().toLowerCase();
            return (
              item.name.toLowerCase().includes(q) ||
              (item.ingredient || "").toLowerCase().includes(q)
            );
          });
          const filterExcludedSales =
            !matches.length && !ownSales.length
              ? state.sales.filter((x) => {
                  if (x.status !== "published") return false;
                  const item = state.items.find((i) => i.id === x.itemId);
                  if (!item || item.branchId === actor.branchId) return false;
                  const q = r.query.trim().toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    (item.ingredient || "").toLowerCase().includes(q)
                  );
                })
              : [];
          return (
            <Card key={r.id} className="mt-5">
              <div className="section-title">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {r.query} — {matches.length} عرض قابل للطلب
                  </h3>
                  {(r.dosageForm ||
                    r.strength ||
                    r.minDiscount !== undefined ||
                    r.minExpiry !== undefined) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <span className="text-slate-400">الفلاتر المطبقة:</span>
                      {r.dosageForm && (
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          الشكل: {r.dosageForm}
                        </span>
                      )}
                      {r.strength && (
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          التركيز: {r.strength}
                        </span>
                      )}
                      {r.minDiscount !== undefined && (
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          خصم أدنى: {r.minDiscount}٪
                        </span>
                      )}
                      {r.minExpiry !== undefined && (
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          صلاحية أدنى: {r.minExpiry} يوم
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  disabled={busy}
                  variant="ghost"
                  onClick={() => run({ type: "removeRadar", id: r.id })}
                >
                  إلغاء المتابعة
                </Button>
              </div>
              {!matches.length ? (
                <>
                  <Empty
                    title="لا توجد عروض مطابقة متاحة الآن"
                    description="العروض الموقوفة والمنتهية وعروض صيدليتك لا تُعرض هنا."
                  />
                  {ownSales.length > 0 && (
                    <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                      <span className="text-lg leading-none">💡</span>
                      <div>
                        <p className="font-bold text-amber-900 mb-1">
                          توضيح: يتوفر هذا الدواء مطروحاً في البورصة من صيدليتك الحالية!
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          رادار الأدوية مصمم لمتابعة ونواقص الشراء من <strong>الصيدليات الأخرى</strong> فقط، ويستبعد عروض صيدليتك تلقائياً منعاً لشراء الصيدلية من نفسها.
                        </p>
                        <p className="text-amber-700 mt-1.5 font-medium">
                          👉 لتجربة طلب الدواء عبر الرادار: بدّل الحساب من القائمة العلوية إلى صيدلية ثانية (مثل «صيدلية مستقلة ثانية - د. كمال») وستجد العرض متاحاً للشراء هناك فوراً.
                        </p>
                      </div>
                    </div>
                  )}
                  {filterExcludedSales.length > 0 && (
                    <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                      <span className="text-lg leading-none">🔍</span>
                      <div>
                        <p className="font-bold text-blue-900 mb-1">
                          تم العثور على عروض لهذا الدواء في البورصة ولكنها استُبعدت بسبب الشروط الاختيارية
                        </p>
                        <p className="text-blue-800 leading-relaxed">
                          قد يكون تم استبعادها بسبب شرط الشكل الدوائي ({r.dosageForm || "—"}) أو الصلاحية ({r.minExpiry ? `${r.minExpiry} يوم` : "—"}).
                        </p>
                        <p className="text-blue-700 mt-1 font-medium">
                          💡 يمكنك الضغط على «إلغاء المتابعة» بالأعلى وإعادة إضافة الدواء باسمه فقط بدون ملء الخانات الاختيارية.
                        </p>
                      </div>
                    </div>
                  )}
                </>
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
                                {i.strength && ` · ${i.strength}`}
                                {i.dosageForm && ` · ${i.dosageForm}`}
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
