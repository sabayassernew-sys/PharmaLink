import { remaining, offerAvailability } from "../domain/offers";
import { ExternalProcessing } from "../components/ExternalProcessing";
import { Offers } from "./Offers";
import { Checkout } from "../components/ItemTools";
import { useState } from "react";
import { Search, ShoppingBag, ArrowUpLeft, Tag, Wallet } from "lucide-react";
import { useApp } from "../context";
import { eligible, ownsBranch } from "../domain/access";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageTitle,
  Status,
  money,
} from "../components/UI";
export function Trading({ mode }: { mode: "market" | "sales" | "orders" }) {
  const { state, actor, run, busy } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [side, setSide] = useState("buy");
  const [dispute, setDispute] = useState<string | null>(null);
  const market = state.sales.filter(
    (x) =>
      x.status === "published" &&
      offerAvailability(state, x) !== "completed" &&
      eligible(state.items.find((i) => i.id === x.itemId)!) &&
      state.items
        .find((i) => i.id === x.itemId)!
        .name.toLowerCase()
        .includes(query.toLowerCase()),
  );
  const orders = state.orders.filter((o) =>
    ownsBranch(state, actor, side === "buy" ? o.buyer : o.seller),
  );
  const sale = state.sales.find((x) => x.id === selected);
  const bank = state.wallets.filter((w) =>
    ownsBranch(state, actor, w.branchId),
  );
  return (
    <>
      <PageTitle
        eyebrow="تداول المنشآت المعتمدة"
        title={
          mode === "market"
            ? "البورصة الدوائية"
            : mode === "sales"
              ? "عروضي وطلبات البيع"
              : "طلبات الشراء والبيع"
        }
        description={
          mode === "market"
            ? "عروض خارج السلسلة بأسعار معتمدة، مع التحقق من توفر الكمية عند الطلب."
            : mode === "sales"
              ? actor.role === "independent"
                ? "إدارة عروض صيدليتك: نشر وتعديل وإيقاف، مع حفظ سجل التغييرات."
                : "الفرع يقترح الكمية، والإدارة تعتمد السعر والنشر."
              : "تابع الموافقة والحجز والإرسال والاستلام المطابق."
        }
      />
      <div className="notice mb-5">
        <Wallet size={18} />
        <span>
          محاكاة مالية محلية فقط. لا توجد أموال حقيقية أو بوابة دفع أو خدمة ضمان
          مالي مفعلة.
        </span>
      </div>
      {mode === "market" && (
        <>
          <div className="toolbar mb-5">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="بحث البورصة"
                placeholder="ابحث عن دواء في العروض..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span className="text-sm text-slate-500">
              {market.length} عرض — منها{" "}
              {market.filter((x) => remaining(state, x) > 0).length} متاح للشراء
            </span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {market.map((x) => {
              const i = state.items.find((i) => i.id === x.itemId)!,
                branch = state.branches.find((b) => b.id === i.branchId)!,
                qty = remaining(state, x),
                availability = offerAvailability(state, x);
              const own = ownsBranch(state, actor, i.branchId),
                same = !!actor.chainId && branch.chainId === actor.chainId;
              return (
                <Card className="market-card" key={x.id}>
                  <div className="flex justify-between">
                    <Badge tone="success">
                      خصم{" "}
                      {Math.round(
                        (1 - x.price / (i.price * (x.unitFactor || 1))) * 100,
                      )}
                      ٪
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {branch.city}
                    </span>
                  </div>
                  <div className="medicine-art">
                    <ShoppingBag size={42} />
                    <div className="medicine-line" />
                  </div>
                  <h3>{i.name}</h3>
                  <p>{i.ingredient}</p>
                  <div className="market-meta">
                    <span>تشغيلة {i.batch}</span>
                    <span>{i.expiry}</span>
                  </div>
                  <p className="text-sm">{branch.name}</p>
                  <div className="price">
                    <strong>{money(x.price)}</strong>
                    <del>{money(i.price * (x.unitFactor || 1))}</del>
                  </div>
                  {qty === 0 && (
                    <div className="availability-note">
                      {availability === "reserved"
                        ? "جميع الكمية محجوزة لطلبات قائمة؛ قد تتاح عند الإلغاء."
                        : "الكمية مرتبطة بطلبات قيد التنفيذ أو غير متاحة حاليًا."}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4 gap-3 flex-wrap">
                    <span className="text-sm text-slate-500">
                      متاح {qty} {x.saleUnit || i.unit}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={
                        qty === 0 ||
                        own ||
                        same ||
                        actor.role === "agency_master"
                      }
                      onClick={() => setSelected(x.id)}
                    >
                      {own
                        ? "عرضي"
                        : same
                          ? "داخل السلسلة"
                          : actor.role === "agency_master"
                            ? "الشراء من حساب الفرع"
                            : qty === 0
                              ? availability === "reserved"
                                ? "محجوز بالكامل مؤقتًا"
                                : "لا توجد كمية متاحة"
                              : "طلب شراء"}
                      <ArrowUpLeft size={16} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {!market.length && <Empty title="لا توجد عروض مطابقة" />}
        </>
      )}
      {mode === "sales" && <Offers />}
      {mode === "orders" && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <Card className="wallet-summary">
              <Wallet />
              <div>
                <p>الرصيد التجريبي المتاح</p>
                <strong>
                  {money(bank.reduce((n, w) => n + w.available, 0))}
                </strong>
              </div>
            </Card>
            <Card className="wallet-summary">
              <Tag />
              <div>
                <p>الرصيد التجريبي المحجوز</p>
                <strong>{money(bank.reduce((n, w) => n + w.held, 0))}</strong>
              </div>
            </Card>
          </div>
          <div className="tabs mb-5">
            <button
              className={side === "buy" ? "active" : ""}
              onClick={() => setSide("buy")}
            >
              مشترياتي
            </button>
            <button
              className={side === "sell" ? "active" : ""}
              onClick={() => setSide("sell")}
            >
              مبيعاتي
            </button>
          </div>
          <Card>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الطلب / الصنف</th>
                    <th>البائع / المشتري</th>
                    <th>الكمية</th>
                    <th>القيمة والعمولة</th>
                    <th>الحالة</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <code>{o.id.slice(-8)}</code>
                        <small>
                          {state.items.find((i) => i.id === o.itemId)?.name}
                        </small>
                      </td>
                      <td>
                        {state.branches.find((b) => b.id === o.seller)?.name}
                        <small>
                          إلى{" "}
                          {state.branches.find((b) => b.id === o.buyer)?.name}
                        </small>
                      </td>
                      <td>
                        {o.quantity /
                          (state.sales.find((x) => x.id === o.saleId)
                            ?.unitFactor || 1)}{" "}
                        {state.sales.find((x) => x.id === o.saleId)?.saleUnit ||
                          state.items.find((i) => i.id === o.itemId)?.unit}
                      </td>
                      <td>
                        {money(o.amount)}
                        <small>عمولة محاكاة: {money(o.fee)}</small>
                      </td>
                      <td>
                        <Status value={o.status} />
                        {o.status === "approval" && (
                          <small>
                            لم تُحجز الكمية بعد؛ يعتمد الشراء على المتاح وقت
                            الموافقة
                          </small>
                        )}
                        {o.status === "completed" && o.disputeReason && (
                          <small>
                            تسوية اختلاف؛ المقبول {o.accepted || 0} من{" "}
                            {o.quantity}{" "}
                            {state.items.find((i) => i.id === o.itemId)?.unit}
                          </small>
                        )}
                        {o.status === "completed" &&
                          o.returned !== undefined && (
                            <small>
                              مرتجع {o.returned} · تالف {o.writtenOff || 0} ·
                              مفقود {o.lost || 0} بوحدة المخزون
                            </small>
                          )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {side === "buy" &&
                            actor.role === "agency_master" &&
                            o.status === "approval" && (
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  run({ type: "approveOrder", id: o.id })
                                }
                              >
                                اعتماد الشراء
                              </Button>
                            )}
                          {actor.branchId === o.seller &&
                            o.status === "reserved" && (
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  run({ type: "sendOrder", id: o.id })
                                }
                              >
                                تأكيد الإرسال
                              </Button>
                            )}
                          {actor.branchId === o.buyer &&
                            o.status === "sent" && (
                              <Button
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "هل فُحصت البضاعة واستُلمت الكمية كاملة ومطابقة؟ لا تؤكد عند وجود اختلاف.",
                                    )
                                  )
                                    run({ type: "receiveOrder", id: o.id });
                                }}
                              >
                                استلام مطابق
                              </Button>
                            )}
                          {actor.branchId === o.buyer &&
                            o.status === "sent" && (
                              <Button
                                variant="danger"
                                onClick={() => setDispute(o.id)}
                              >
                                تسجيل اختلاف
                              </Button>
                            )}
                          {["approval", "reserved"].includes(o.status) && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                run({ type: "cancelOrder", id: o.id })
                              }
                            >
                              إلغاء الطلب وفك الحجز
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!orders.length && <Empty title="لا توجد طلبات بعد" />}
            <p className="table-caption">
              للكمية غير المطابقة استخدم تسجيل اختلاف، فيبقى الرصيد محجوزًا حتى
              التسوية التجريبية لدى مدير المنصة.
            </p>
          </Card>
        </>
      )}
      {mode === "orders" &&
        orders
          .filter((o) => o.rejected || o.missing)
          .map((o) => <ExternalProcessing id={o.id} key={o.id} />)}
      {sale && (
        <Modal title="مراجعة طلب الشراء" onClose={() => setSelected(null)}>
          <Checkout saleId={sale.id} onDone={() => setSelected(null)} />
        </Modal>
      )}
      {dispute && (
        <Modal
          title="تسجيل اختلاف في طلب خارجي"
          onClose={() => setDispute(null)}
        >
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "disputeOrder",
                  id: dispute,
                  accepted: Number(f.get("accepted")),
                  rejected: Number(f.get("rejected")),
                  missing: Number(f.get("missing")),
                  reason: String(f.get("reason")),
                })
              )
                setDispute(null);
            }}
          >
            <p>
              المقبول فقط يُضاف للمخزون. تبقى الكمية الأخرى خارج المتاح وتحتاج
              معالجة واقعية بين الطرفين. لا يُفرج عن الرصيد تلقائيًا.
            </p>
            <Field
              label="الكمية المقبولة فعليًا"
              name="accepted"
              type="number"
              min={0}
              defaultValue={0}
            />
            <Field
              name="rejected"
              label="كمية مرفوضة موجودة فعليًا في عهدة المستلم"
              type="number"
              min={0}
              defaultValue={0}
            />
            <Field
              name="missing"
              label="كمية ناقصة لم تصل"
              type="number"
              min={0}
              defaultValue={0}
            />
            <Field label="تفاصيل الاختلاف" name="reason" />
            <Button type="submit" disabled={busy}>
              حفظ الاختلاف
            </Button>
          </Form>
        </Modal>
      )}
    </>
  );
}
