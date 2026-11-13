import { remaining, offerAvailability } from "../domain/offers";
import { ExternalProcessing } from "../components/ExternalProcessing";
import { Offers } from "./Offers";
import { Checkout } from "../components/ItemTools";
import { useState } from "react";
import {
  Search,
  ShoppingBag,
  ArrowUpLeft,
  Tag,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
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
  ConfirmModal,
  PageTitle,
  Status,
  money,
} from "../components/UI";
export function Trading({ mode }: { mode: "market" | "sales" | "orders" }) {
  const { state, actor, run, busy } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [dispute, setDispute] = useState<string | null>(null);
  const [confirmReceive, setConfirmReceive] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<
    (typeof state.orders)[number] | null
  >(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [orderTab, setOrderTab] = useState<
    "action" | "active" | "completed" | "cancelled" | "all"
  >("action");
  const [viewDetailsOrder, setViewDetailsOrder] = useState<
    (typeof state.orders)[number] | null
  >(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const market = state.sales.filter(
    (x) =>
      x.status === "published" &&
      offerAvailability(state, x) !== "completed" &&
      eligible(state.items.find((i) => i.id === x.itemId)!, state) &&
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
                    {i.strength && <span>التركيز: {i.strength}</span>}
                    {i.dosageForm && <span>الشكل: {i.dosageForm}</span>}
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
          {(() => {
            const isActionNeeded = (o: (typeof state.orders)[number]) => {
              if (side === "buy") {
                if (o.status === "approval" && actor.role === "agency_master")
                  return true;
                if (o.status === "sent" && actor.branchId === o.buyer)
                  return true;
              } else {
                if (o.status === "reserved" && actor.branchId === o.seller)
                  return true;
              }
              return false;
            };

            const allSideOrders = state.orders.filter((o) =>
              ownsBranch(state, actor, side === "buy" ? o.buyer : o.seller),
            );

            const actionOrdersCount = allSideOrders.filter(isActionNeeded).length;
            const activeOrdersCount = allSideOrders.filter((o) =>
              ["approval", "reserved", "sent", "dispute"].includes(o.status),
            ).length;
            const completedOrdersCount = allSideOrders.filter(
              (o) => o.status === "completed",
            ).length;
            const cancelledOrdersCount = allSideOrders.filter(
              (o) => o.status === "cancelled",
            ).length;

            const displayedOrders = allSideOrders.filter((o) => {
              if (orderTab === "action" && !isActionNeeded(o)) return false;
              if (
                orderTab === "active" &&
                !["approval", "reserved", "sent", "dispute"].includes(o.status)
              )
                return false;
              if (orderTab === "completed" && o.status !== "completed")
                return false;
              if (orderTab === "cancelled" && o.status !== "cancelled")
                return false;

              if (orderSearchQuery.trim()) {
                const q = orderSearchQuery.toLowerCase();
                const drug = state.items.find((i) => i.id === o.itemId);
                const seller = state.branches.find((b) => b.id === o.seller);
                const buyer = state.branches.find((b) => b.id === o.buyer);
                const matches =
                  o.id.toLowerCase().includes(q) ||
                  (drug &&
                    (drug.name.toLowerCase().includes(q) ||
                      drug.ingredient.toLowerCase().includes(q))) ||
                  (seller && seller.name.toLowerCase().includes(q)) ||
                  (buyer && buyer.name.toLowerCase().includes(q));
                if (!matches) return false;
              }
              return true;
            });

            return (
              <>
                {/* 1. Main Tabs (مشترياتي / مبيعاتي) with counts */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        side === "buy"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                      onClick={() => setSide("buy")}
                    >
                      <ShoppingBag size={17} />
                      مشترياتي
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          side === "buy"
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {
                          state.orders.filter((o) =>
                            ownsBranch(state, actor, o.buyer),
                          ).length
                        }
                      </span>
                    </button>
                    <button
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        side === "sell"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                      onClick={() => setSide("sell")}
                    >
                      <Tag size={17} />
                      مبيعاتي
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          side === "sell"
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {
                          state.orders.filter((o) =>
                            ownsBranch(state, actor, o.seller),
                          ).length
                        }
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Status Sub-Tabs */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {[
                      {
                        key: "action" as const,
                        label: "بحاجة لإجراء",
                        count: actionOrdersCount,
                        highlight: actionOrdersCount > 0,
                        icon: Sparkles,
                      },
                      {
                        key: "active" as const,
                        label: "جارية ونشطة",
                        count: activeOrdersCount,
                        icon: Layers,
                      },
                      {
                        key: "completed" as const,
                        label: "مكتملة ومستلمة",
                        count: completedOrdersCount,
                        icon: CheckCircle2,
                      },
                      {
                        key: "cancelled" as const,
                        label: "ملغاة ومستردة",
                        count: cancelledOrdersCount,
                        icon: XCircle,
                      },
                      {
                        key: "all" as const,
                        label: "كافة السجلات",
                        count: allSideOrders.length,
                        icon: Clock,
                      },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = orderTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setOrderTab(tab.key)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${
                            isActive
                              ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                              : tab.highlight
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Icon size={14} />
                          <span>{tab.label}</span>
                          <span
                            className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                              isActive
                                ? "bg-white/20 text-white"
                                : tab.highlight
                                  ? "bg-rose-200 text-rose-800 font-bold"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="search flex-1 min-w-[260px] m-0">
                      <Search size={18} />
                      <input
                        placeholder="ابحث باسم الدواء، الصيدلية، أو رقم الطلب..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOrderSearchQuery("")}
                          className="text-xs text-slate-400 hover:text-slate-600 px-1"
                        >
                          مسح
                        </button>
                      )}
                    </label>
                    <span className="text-xs text-slate-500 font-medium">
                      عرض {displayedOrders.length} من أصل {allSideOrders.length}{" "}
                      طلب
                    </span>
                  </div>
                </div>

                {/* 3. Display Orders (Simplified Table) */}
                {displayedOrders.length === 0 ? (
                  <Empty
                    title={
                      orderTab === "action"
                        ? "لا توجد طلبات تتطلب إجراءً حالياً"
                        : "لا توجد طلبات في هذا التبويب"
                    }
                  />
                ) : (
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
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedOrders.map((o) => {
                            const drug = state.items.find(
                              (i) => i.id === o.itemId,
                            );
                            const sellerBranch = state.branches.find(
                              (b) => b.id === o.seller,
                            );
                            const buyerBranch = state.branches.find(
                              (b) => b.id === o.buyer,
                            );
                            const saleItem = state.sales.find(
                              (x) => x.id === o.saleId,
                            );

                            return (
                              <tr key={o.id}>
                                <td>
                                  <div className="flex items-center gap-1.5">
                                    <code>#{o.id.slice(-8)}</code>
                                    {isActionNeeded(o) && (
                                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                                        ⚡ مطلوب إجراء
                                      </span>
                                    )}
                                  </div>
                                  <strong className="block text-slate-900 mt-1">
                                    {drug?.name}
                                  </strong>
                                  <small className="text-slate-400 block">
                                    {drug?.ingredient}{" "}
                                    {drug?.batch && `· تشغيلة ${drug.batch}`}
                                  </small>
                                </td>
                                <td>
                                  <div className="text-xs">
                                    <span className="text-slate-400">
                                      من:{" "}
                                    </span>
                                    <strong>{sellerBranch?.name}</strong>{" "}
                                    {o.seller === actor.branchId && (
                                      <span className="text-teal-700 text-[11px] font-semibold">
                                        (أنتم)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs mt-0.5">
                                    <span className="text-slate-400">
                                      إلى:{" "}
                                    </span>
                                    <strong>{buyerBranch?.name}</strong>{" "}
                                    {o.buyer === actor.branchId && (
                                      <span className="text-teal-700 text-[11px] font-semibold">
                                        (أنتم)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <strong className="text-slate-800">
                                    {o.quantity / (saleItem?.unitFactor || 1)}{" "}
                                    {saleItem?.saleUnit || drug?.unit}
                                  </strong>
                                </td>
                                <td>
                                  <strong className="text-teal-700">
                                    {money(o.amount)}
                                  </strong>
                                  <small className="block text-slate-400 text-[11px]">
                                    عمولة: {money(o.fee)}
                                  </small>
                                </td>
                                <td>
                                  <Status value={o.status} />
                                  {o.status === "cancelled" && (
                                    <div className="text-rose-700 text-[11px] mt-1 font-semibold leading-tight">
                                      <span>
                                        {o.cancelledBy === "buyer"
                                          ? side === "buy"
                                            ? "ملغى من طرفكم"
                                            : "ملغى من المشتري"
                                          : side === "buy"
                                            ? "اعتذر البائع"
                                            : "ملغى من طرفكم"}
                                      </span>
                                      {o.cancelReason && (
                                        <div
                                          className="text-[10px] text-rose-600 font-normal truncate max-w-[150px] mt-0.5"
                                          title={o.cancelReason}
                                        >
                                          ({o.cancelReason})
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {side === "buy" &&
                                      actor.role === "agency_master" &&
                                      o.status === "approval" && (
                                        <Button
                                          disabled={busy}
                                          onClick={() =>
                                            run({
                                              type: "approveOrder",
                                              id: o.id,
                                            })
                                          }
                                        >
                                          اعتماد
                                        </Button>
                                      )}
                                    {actor.branchId === o.seller &&
                                      o.status === "reserved" && (
                                        <Button
                                          disabled={busy}
                                          onClick={() =>
                                            run({
                                              type: "sendOrder",
                                              id: o.id,
                                            })
                                          }
                                        >
                                          إرسال
                                        </Button>
                                      )}
                                    {actor.branchId === o.buyer &&
                                      o.status === "sent" && (
                                        <>
                                          <Button
                                            disabled={busy}
                                            onClick={() =>
                                              setConfirmReceive(o.id)
                                            }
                                          >
                                            استلام
                                          </Button>
                                          <Button
                                            variant="danger"
                                            disabled={busy}
                                            onClick={() => setDispute(o.id)}
                                          >
                                            اختلاف
                                          </Button>
                                        </>
                                      )}
                                    {["approval", "reserved"].includes(
                                      o.status,
                                    ) && (
                                      <Button
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() => {
                                          setCancellingOrder(o);
                                          setCancelReasonText("");
                                        }}
                                      >
                                        إلغاء
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      onClick={() => setViewDetailsOrder(o)}
                                    >
                                      تفاصيل
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            );
          })()}
        </>
      )}
      {mode === "orders" &&
        orders
          .filter((o) => o.rejected || o.missing)
          .map((o) => <ExternalProcessing id={o.id} key={o.id} />)}
      {confirmReceive && (
        <ConfirmModal
          title="تأكيد الاستلام المطابق"
          message="هل فُحصت البضاعة وتأكدت من استلام الكمية كاملة ومطابقة للمواصفات؟"
          description="تنبيه: لا تؤكد الاستلام في حال وجود أي نقص أو اختلاف، بل استخدم خيار «تسجيل اختلاف» لضمان حقوقك وحجز الرصيد للتسوية."
          confirmText="نعم، استلام مطابق"
          cancelText="تراجع"
          confirmVariant="primary"
          busy={busy}
          onClose={() => setConfirmReceive(null)}
          onConfirm={async () => {
            await run({ type: "receiveOrder", id: confirmReceive });
            setConfirmReceive(null);
          }}
        />
      )}
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
      {cancellingOrder && (
        <Modal
          title="إلغاء الطلب وفك الحجز المالي"
          onClose={() => setCancellingOrder(null)}
        >
          {(() => {
            const isBuyer = ownsBranch(state, actor, cancellingOrder.buyer);
            const drug = state.items.find((i) => i.id === cancellingOrder.itemId);
            return (
              <div className="space-y-4 text-right">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>طلب رقم: <code>{cancellingOrder.id.slice(-8)}</code></span>
                    <span>{drug?.name || "صنف دوائي"}</span>
                  </div>
                  <p className="text-slate-500 m-0">
                    الكمية: {cancellingOrder.quantity} {drug?.unit || "وحدة"} · القيمة: {money(cancellingOrder.amount + cancellingOrder.fee)}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 text-xs leading-relaxed">
                  {isBuyer ? (
                    <>
                      <strong>أثر الإلغاء للمشتري:</strong> سيتم فوراً فك حجز المبلغ وإعادته بالكامل إلى رصيد محفظتكم المتاح، وفك حجز الدواء لدى البائع.
                    </>
                  ) : (
                    <>
                      <strong>أثر الإلغاء للبائع:</strong> اعتذاركم عن تلبية الطلب سيؤدي لفك حجز المبلغ فوراً وإعادته للمشتري، وعودة الدواء إلى مخزونكم المتاح للبيع بالبورصة.
                    </>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-2">
                    أسباب الإلغاء الشائعة (انقر للاختيار السريع):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(isBuyer
                      ? [
                          "تراجع عن الشراء",
                          "تعديل في الكمية المطلوبة",
                          "تم التوفير من مصدر بديل",
                          "طلب تجريبي / تم بالخطأ",
                        ]
                      : [
                          "نفاد الكمية الفعلية على الرف",
                          "تلف بالعبوة أثناء التجهيز",
                          "خطأ في تسعير العرض",
                          "تعذر النقل والتوصيل حالياً",
                        ]
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="text-[11px] py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                        onClick={() => setCancelReasonText(preset)}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <Form
                  onSubmit={async () => {
                    const ok = await run({
                      type: "cancelOrder",
                      id: cancellingOrder.id,
                      reason: cancelReasonText.trim() || undefined,
                    });
                    if (ok) {
                      setCancellingOrder(null);
                    }
                  }}
                >
                  <label className="field m-0">
                    <span>سبب الإلغاء (اختياري / يُوثق في سجل الطلب):</span>
                    <textarea
                      rows={2}
                      value={cancelReasonText}
                      onChange={(e) => setCancelReasonText(e.target.value)}
                      placeholder="اكتب سبب الإلغاء أو اختر من الأسباب السريعة أعلاه..."
                      className="w-full text-xs"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-3">
                    <Button variant="secondary" onClick={() => setCancellingOrder(null)}>
                      تراجع
                    </Button>
                    <Button variant="danger" type="submit" disabled={busy}>
                      تأكيد الإلغاء وفك الحجز
                    </Button>
                  </div>
                </Form>
              </div>
            );
          })()}
        </Modal>
      )}
      {viewDetailsOrder && (
        <Modal
          title={`تفاصيل الطلب والمسار الرقابي #${viewDetailsOrder.id.slice(-8)}`}
          onClose={() => setViewDetailsOrder(null)}
        >
          {(() => {
            const drug = state.items.find((i) => i.id === viewDetailsOrder.itemId);
            const seller = state.branches.find((b) => b.id === viewDetailsOrder.seller);
            const buyer = state.branches.find((b) => b.id === viewDetailsOrder.buyer);
            const saleItem = state.sales.find((x) => x.id === viewDetailsOrder.saleId);
            const events = state.events.filter((e) => e.reference === viewDetailsOrder.id);

            return (
              <div className="space-y-4 text-right">
                <div className="flex items-center justify-between bg-slate-50 border p-3 rounded-xl flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100/60 text-teal-800 flex items-center justify-center shrink-0">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 m-0">{drug?.name}</h4>
                      <p className="text-xs text-slate-500 m-0">
                        {drug?.ingredient} · تشغيلة {drug?.batch} · صلاحية {drug?.expiry}
                      </p>
                    </div>
                  </div>
                  <Status value={viewDetailsOrder.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border p-3 rounded-xl bg-slate-50/50">
                    <span className="text-slate-400 block mb-1">الطرف البائع:</span>
                    <strong className="text-slate-800 text-sm block">{seller?.name}</strong>
                    <span className="text-slate-500">{seller?.city}</span>
                  </div>
                  <div className="border p-3 rounded-xl bg-slate-50/50">
                    <span className="text-slate-400 block mb-1">الطرف المشتري:</span>
                    <strong className="text-slate-800 text-sm block">{buyer?.name}</strong>
                    <span className="text-slate-500">{buyer?.city}</span>
                  </div>
                </div>

                <div className="border p-3 rounded-xl bg-slate-50/50 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">الكمية المسجلة:</span>
                    <strong className="text-slate-800 font-bold">
                      {viewDetailsOrder.quantity / (saleItem?.unitFactor || 1)}{" "}
                      {saleItem?.saleUnit || drug?.unit || "وحدة"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">القيمة الإجمالية:</span>
                    <strong className="text-teal-700 font-bold text-sm">{money(viewDetailsOrder.amount)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">عمولة المنصة الضامنة:</span>
                    <span className="text-slate-700 font-medium">{money(viewDetailsOrder.fee)}</span>
                  </div>
                </div>

                {viewDetailsOrder.status === "cancelled" && (
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 text-xs">
                    <strong className="text-rose-900 block mb-1 font-bold">بيانات الإلغاء وفك الحجز:</strong>
                    <div className="text-rose-800">
                      الجهة التي قامت بالإلغاء: <strong>{viewDetailsOrder.cancelledBy === "buyer" ? "الطرف المشتري" : "الطرف البائع"}</strong>
                    </div>
                    {viewDetailsOrder.cancelReason && (
                      <div className="text-rose-700 mt-1">السبب المسجل: {viewDetailsOrder.cancelReason}</div>
                    )}
                  </div>
                )}

                <div>
                  <h5 className="font-bold text-xs text-slate-700 mb-2">سجل حركات وعمليات الطلب (Audit Log):</h5>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {events.length > 0 ? (
                      events.map((e) => (
                        <div key={e.id} className="text-[11px] p-2 rounded-lg border bg-white flex justify-between items-center">
                          <div>
                            <strong>{e.action}</strong>
                            <span className="text-slate-500 mx-1.5">بواسطة: {e.actor}</span>
                            {e.detail && <span className="text-slate-400">({e.detail})</span>}
                          </div>
                          <span className="text-slate-400 text-[10px] shrink-0 font-mono">
                            {new Date(e.at).toLocaleTimeString("ar-YE")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 m-0">لا توجد حركات مسجلة إضافية لهذا الطلب.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button variant="secondary" onClick={() => setViewDetailsOrder(null)}>
                    إغلاق النافذة
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </>
  );
}
