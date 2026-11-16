import { useState } from "react";
import { supplierAlerts } from "../domain/notifications";
import {
  ArrowUpLeft,
  ArrowRightLeft,
  Package,
  Clock3,
  FileCheck2,
  ShieldCheck,
  Activity,
  Plus,
  Upload,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useApp } from "../context";
import {
  visibleItems,
  visibleTransfers,
  daysLeft,
  ownsBranch,
} from "../domain/access";
import {
  Badge,
  Button,
  Card,
  Empty,
  PageTitle,
  SectionTitle,
  Status,
  TransferStatusBadge,
  number,
} from "../components/UI";
export function Dashboard({ navigate }: { navigate: (s: string) => void }) {
  const { state, actor } = useApp();
  const [showAllNotices, setShowAllNotices] = useState(false);
  const items = visibleItems(state, actor),
    transfers = visibleTransfers(state, actor);
  const pending = state.sales.filter(
    (s) => s.status === "pending" && items.some((i) => i.id === s.itemId),
  ).length;
  const action = transfers.filter(
    (t) =>
      (actor.role === "agency_master" && t.status === "discrepancy") ||
      (actor.branchId === t.from &&
        ((!t.senderApproved && t.status === "pending") || t.status === "ready")) ||
      (actor.branchId === t.to &&
        ((!t.receiverApproved && t.status === "pending") || t.status === "sent")),
  );
  const nearDays = state.nearExpiryAlertDays ?? 90;
  const near = items.filter(
      (i) => daysLeft(i.expiry) >= 0 && daysLeft(i.expiry) <= nearDays,
    ),
    expired = items.filter((i) => daysLeft(i.expiry) < 0),
    healthy = items.filter((i) => daysLeft(i.expiry) > nearDays);
  const stats = [
    {
      title: "بنود المخزون",
      value: items.length,
      note: "تشغيلات مستقلة",
      icon: Package,
      color: "navy",
      page: "inventory",
    },
    {
      title: "قريبة الانتهاء",
      value: near.length,
      note: `خلال ${nearDays} يومًا`,
      icon: Clock3,
      color: "amber",
      page: "inventory",
    },
    {
      title: "طلبات تتطلب إجراء",
      value: action.length,
      note: "موافقات وإرسال واستلام",
      icon: ArrowRightLeft,
      color: "teal",
      page: "transfers",
    },
    {
      title: "اعتماد بيع خارجي",
      value: pending,
      note: "بانتظار التسعير والموافقة",
      icon: FileCheck2,
      color: "blue",
      page: "sales",
    },
  ];
  const independent = actor.role === "independent";
  const orders = state.orders.filter(
    (o) =>
      ownsBranch(state, actor, o.buyer) || ownsBranch(state, actor, o.seller),
  );
  if (independent) {
    stats[2] = {
      ...stats[2],
      title: "طلبات شراء وبيع نشطة",
      value: orders.filter(
        (o) => !["completed", "cancelled"].includes(o.status),
      ).length,
      note: "طلبات صيدليتك الخارجية",
      page: "orders",
    };
    stats[3] = {
      ...stats[3],
      title: "عروضي المنشورة",
      value: state.sales.filter(
        (x) => x.status === "published" && items.some((i) => i.id === x.itemId),
      ).length,
      note: "عروض تديرها بنفسك",
      page: "sales",
    };
  }
  const notices = supplierAlerts(state, actor);
  return (
    <>
      <PageTitle
        eyebrow="نظرة شاملة على يوم عملك"
        title={`مرحبًا، ${actor.role === "agency_master" ? "إدارة الشفاء" : actor.name.split(" • ")[0]}`}
        description="كل ما يحتاج انتباهك، قبل أن يتحول المخزون إلى خسارة."
        actions={
          <Button variant="secondary" onClick={() => navigate("import")}>
            <Upload size={16} /> استيراد المخزون
          </Button>
        }
      />
      <div className="welcome-banner">
        <div>
          <Badge>شبكة منشآت موثقة • تجربة محلية</Badge>
          <h2>مخزون يتحرّك. وقيمة تبقى.</h2>
          <p>ابدأ من الأصناف الأقرب انتهاءً، وامنحها فرصة أفضل داخل شبكتك.</p>
          <Button
            onClick={() => navigate(actor.chainId ? "board" : "inventory")}
          >
            استكشف {actor.chainId ? "الفائض والاحتياج" : "المخزون"}{" "}
            <ArrowUpLeft size={17} />
          </Button>
        </div>
        <div className="banner-art">
          <img src="./brand/icon.svg" alt="رمز فارما لينك" />
          <span className="orbit orbit-1" />
          <span className="orbit orbit-2" />
          <div className="banner-chip">
            <ShieldCheck size={17} /> تبادل منظم داخل شبكتك
          </div>
        </div>
      </div>
      {notices.length > 0 && (
        <Card className="mb-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2 flex-wrap gap-2">
            <div>
              <h3 className="m-0 text-base font-bold text-slate-800">
                تنبيهات مرتجعات الموردين
              </h3>
              <p className="text-xs text-slate-500 m-0">
                حسب المواعيد المسجلة، وليست ضمانًا لقبول المورد
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge warning text-xs font-bold">
                {notices.length} تنبيه
              </span>
              {notices.length > 3 && (
                <button
                  type="button"
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/70 border border-teal-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  onClick={() => setShowAllNotices(!showAllNotices)}
                >
                  {showAllNotices ? (
                    <>
                      <ChevronUp size={14} />
                      <span>عرض أقل</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      <span>عرض الكل ({notices.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {(showAllNotices ? notices : notices.slice(0, 3)).map((n) => (
            <button
              className="task-row w-full text-right"
              key={n.item.id}
              onClick={() => {
                navigate("inventory");
                location.hash = "inventory?item=" + n.item.id;
              }}
            >
              <Clock3 size={18} />
              <div>
                <strong>{n.text}</strong>
                <p>
                  {n.item.name} · {n.item.batch} · {n.item.supplier}
                </p>
                <small>
                  {n.item.quantity} {n.item.unit} · الموعد{" "}
                  {n.item.returnDeadline}
                </small>
              </div>
            </button>
          ))}
          {notices.length > 3 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2 text-xs flex-wrap gap-2">
              <button
                type="button"
                className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors cursor-pointer"
                onClick={() => setShowAllNotices(!showAllNotices)}
              >
                {showAllNotices ? (
                  <>
                    <ChevronUp size={14} />
                    <span>عرض أول 3 تنبيهات فقط</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>عرض كافة التنبيهات المتبقية (+{notices.length - 3})</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                onClick={() => navigate("returns")}
              >
                <span>حاسبة وجدول مرتجعات الموردين</span>
                <ArrowUpLeft size={13} />
              </button>
            </div>
          )}
        </Card>
      )}
      <div className="stats-grid">
        {stats.map((s) => (
          <button
            className="stat-card"
            key={s.title}
            onClick={() => navigate(s.page)}
          >
            <div className="flex justify-between">
              <span>{s.title}</span>
              <div className={`stat-icon ${s.color}`}>
                <s.icon size={20} />
              </div>
            </div>
            <strong>{number(s.value)}</strong>
            <small>{s.note}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card>
          <SectionTitle
            title="أولوية اليوم"
            description="طلبات تحتاج قرارًا أو تأكيدًا منك"
            action={() => navigate(independent ? "orders" : "transfers")}
          />
          {independent ? (
            <>
              <p>طلبات صيدليتك فقط؛ لا توجد مناقلات فروع في حساب المستقل.</p>
              {orders
                .filter((o) => !["completed", "cancelled"].includes(o.status))
                .slice(0, 4)
                .map((o) => (
                  <button
                    className="task-row w-full"
                    key={o.id}
                    onClick={() => navigate("orders")}
                  >
                    <span>
                      {state.items.find((i) => i.id === o.itemId)?.name}
                    </span>
                    <Status value={o.status} />
                  </button>
                ))}
              {!orders.length && <p>لا توجد طلبات خارجية بعد.</p>}
            </>
          ) : action.length ? (
            action.slice(0, 4).map((t) => (
              <div key={t.id} className="task-row">
                <div className="task-icon">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <strong>{t.lines[0]?.name}</strong>
                  <small>{t.code}</small>
                </div>
                <TransferStatusBadge
                  transfer={t}
                  branchId={actor.branchId}
                  isMaster={actor.role === "agency_master"}
                />
                <button
                  aria-label="فتح المناقلات"
                  className="icon-btn"
                  onClick={() => navigate("transfers")}
                >
                  <ArrowUpLeft size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="all-clear">
              <CheckCircle2 size={32} />
              <strong>لا توجد مهام معلقة الآن</strong>
              <p>ستظهر هنا الموافقات وطلبات الاستلام المرتبطة بحسابك.</p>
            </div>
          )}
          <div className="quick-links">
            <Button variant="secondary" onClick={() => navigate("inventory")}>
              <Plus size={16} /> إدارة المخزون
            </Button>
            <Button variant="ghost" onClick={() => navigate("sales")}>
              طلبات البيع <ArrowUpLeft size={15} />
            </Button>
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="صحة المخزون"
            description="توزيع بنود المخزون حسب الصلاحية"
          />
          <div className="health-chart">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#00adb5 0 ${items.length ? (healthy.length / items.length) * 100 : 0}%, #f2b54a 0 ${items.length ? ((healthy.length + near.length) / items.length) * 100 : 0}%, #de6672 0)`,
              }}
            >
              <div>
                <strong>{items.length}</strong>
                <small>بند مخزون</small>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="bg-teal-500" /> أكثر من {nearDays} يومًا{" "}
                <b>{healthy.length}</b>
              </span>
              <span>
                <i className="bg-amber-400" /> خلال {nearDays} يومًا{" "}
                <b>{near.length}</b>
              </span>
              <span>
                <i className="bg-rose-400" /> منتهية <b>{expired.length}</b>
              </span>
            </div>
          </div>
        </Card>
      </div>
      <div className="dashboard-grid mt-5">
        <Card>
          <SectionTitle
            title="أقرب الأصناف انتهاءً"
            action={() => navigate("inventory")}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الدواء</th>
                  <th>التشغيلة</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((i) => daysLeft(i.expiry) >= 0)
                  .sort((a, b) => a.expiry.localeCompare(b.expiry))
                  .slice(0, 4)
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <small>
                          {i.quantity} {i.unit}
                        </small>
                      </td>
                      <td>
                        <code>{i.batch}</code>
                      </td>
                      <td>
                        <Badge
                          tone={daysLeft(i.expiry) < 30 ? "danger" : "warning"}
                        >
                          {daysLeft(i.expiry)} يومًا
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle title="آخر النشاطات" action={() => navigate("audit")} />
          {state.events
            .filter((e) => e.branchId && ownsBranch(state, actor, e.branchId))
            .slice(-4)
            .reverse()
            .map((e) => (
              <div className="task-row" key={e.id}>
                <Activity size={17} className="text-teal-600" />
                <div>
                  <strong>{e.action}</strong>
                  <small>
                    {e.actor} ·{" "}
                    {new Date(e.at).toLocaleTimeString("ar-YE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </div>
            ))}
          {!state.events.length && (
            <Empty
              title="سجل يومك يبدأ هنا"
              description="تُسجل العمليات تلقائيًا بعد حفظها."
            />
          )}
        </Card>
      </div>
    </>
  );
}
