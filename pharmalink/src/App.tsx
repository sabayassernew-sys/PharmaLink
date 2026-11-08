import { SupplierReturns } from "./pages/SupplierReturns";
import { supplierAlerts, licenseAlerts } from "./domain/notifications";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ShoppingBag,
  ClipboardList,
  Building2,
  ShieldCheck,
  History,
  BarChart3,
  ScanSearch,
  Upload,
  Settings,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  ChevronLeft,
  ChevronDown,
  Bell,
  HelpCircle,
  LogOut,
  Link2,
} from "lucide-react";
import { useApp } from "./context";
import { canNav, roleNames, visibleTransfers, isLicenseExpired } from "./domain/access";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Board } from "./pages/Board";
import { Transfers } from "./pages/Transfers";
import { Trading } from "./pages/Trading";
import { Management } from "./pages/Management";
import { Home } from "./pages/Home";
import { Modal } from "./components/UI";
const navigation = [
  {
    label: "مساحة العمل",
    items: [
      ["dashboard", "نظرة عامة", LayoutDashboard],
      ["inventory", "المخزون", Package],
      ["import", "الاستيراد", Upload],
    ],
  },
  {
    label: "التبادل والتداول",
    items: [
      ["board", "الفائض والاحتياج", ArrowRightLeft],
      ["transfers", "المناقلات الداخلية", ClipboardList],
      ["sales", "عروضي وطلبات البيع", ShoppingBag],
      ["market", "البورصة الدوائية", Link2],
      ["orders", "طلبات الشراء والبيع", ClipboardList],
      ["radar", "رادار الأدوية", ScanSearch],
      ["returns", "مرتجعات الموردين", ClipboardList],
    ],
  },
  {
    label: "الإدارة والمتابعة",
    items: [
      ["branches", "الفروع والتفويض", Building2],
      ["verification", "توثيق المنشآت", ShieldCheck],
      ["disputes", "النزاعات الخارجية", ShieldCheck],
      ["reports", "التقارير", BarChart3],
      ["audit", "سجل العمليات", History],
      ["brand", "الهوية البصرية", Palette],
      ["settings", "الإعدادات", Settings],
    ],
  },
];
const titles: Record<string, string> = {
  home: "الرئيسية",
  dashboard: "نظرة عامة",
  inventory: "المخزون",
  import: "استيراد المخزون",
  board: "الفائض والاحتياج",
  transfers: "المناقلات الداخلية",
  sales: "عروضي وطلبات البيع",
  market: "البورصة الدوائية",
  orders: "طلبات الشراء والبيع",
  radar: "رادار الأدوية",
  returns: "مرتجعات الموردين",
  branches: "إدارة الفروع",
  verification: "توثيق المنشآت",
  disputes: "النزاعات الخارجية",
  reports: "التقارير",
  audit: "سجل العمليات",
  brand: "الهوية البصرية",
  settings: "الإعدادات",
};
export default function App() {
  const { state, actor, setActor } = useApp();
  const start = () => {
    const p = location.hash.slice(1).split("?")[0];
    return p && canNav(actor, p)
      ? p
      : actor.role === "admin"
        ? "verification"
        : actor.role === "guest" || !actor.verified
          ? "home"
          : "dashboard";
  };
  const [page, setPage] = useState(start);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  function navigate(key: string) {
    if (!canNav(actor, key)) return;
    setPage(key);
    location.hash = key;
    setMobile(false);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (!canNav(actor, page)) {
      const next =
        actor.role === "admin"
          ? "verification"
          : actor.verified
            ? "dashboard"
            : "home";
      setPage(next);
      location.hash = next;
    }
  }, [actor, page]);
  useEffect(() => {
    const fn = () => {
      const key = location.hash.slice(1).split("?")[0];
      if (canNav(actor, key) && titles[key]) setPage(key);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, [actor]);

  useEffect(() => {
    const pageTitle = titles[page] || "المنصة";
    document.title = `${pageTitle} | فارما لينك - منصة التبادل الدوائي`;
  }, [page]);

  const branch = state.branches.find((b) => b.id === actor.branchId);
  const alerts = visibleTransfers(state, actor).filter((t) =>
    ["pending", "management", "ready", "sent", "discrepancy"].includes(
      t.status,
    ),
  ).length;
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const supplierNotices = supplierAlerts(state, actor);
  const licNotices = licenseAlerts(state, actor);
  const current = canNav(actor, page) ? page : "home";
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")}>
          <img src="./brand/icon.svg" alt="" />
          <div>
            <strong>فارما لينك</strong>
            <span>PHARMALINK</span>
          </div>
        </button>
        <div
          className="workspace-badge cursor-pointer hover:bg-white/10 transition-colors"
          title="الملف التعريفي وهوية المنشأة"
          onClick={() => {
            if (canNav(actor, "settings")) navigate("settings");
          }}
        >
          <div className="workspace-avatar overflow-hidden">
            {actor.avatarUrl ? (
              <img src={actor.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              actor.name.slice(0, 1)
            )}
          </div>
          <div>
            <strong>{branch?.name || actor.name}</strong>
            <small>{roleNames[actor.role]}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav aria-label="التنقل الرئيسي">
          {navigation.map((group) => {
            const items = group.items.filter(([key]) =>
              canNav(actor, String(key)),
            );
            if (!items.length) return null;
            const shut = groups.includes(group.label);
            return (
              <div className="nav-group" key={group.label}>
                <button
                  className="nav-group-label"
                  aria-expanded={!shut}
                  onClick={() =>
                    setGroups(
                      shut
                        ? groups.filter((x) => x !== group.label)
                        : [...groups, group.label],
                    )
                  }
                >
                  {group.label}
                  <ChevronDown size={13} />
                </button>
                {!shut &&
                  items.map(([key, label, Icon]) => {
                    const C = Icon as typeof Package;
                    return (
                      <button
                        key={String(key)}
                        title={String(label)}
                        className={`nav-item ${page === key ? "active" : ""}`}
                        onClick={() => navigate(String(key))}
                        aria-current={page === key ? "page" : undefined}
                      >
                        <C size={19} />
                        <span>{String(label)}</span>
                        {key === "transfers" && alerts > 0 && <b>{alerts}</b>}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => navigate("settings")}>
            <HelpCircle size={19} />
            <span>دليل ونسخة احتياطية</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setActor("guest");
              setPage("home");
              location.hash = "home";
            }}
          >
            <LogOut size={18} />
            <span>الخروج للواجهة العامة</span>
          </button>
          <small>PharmaLink · Local Edition 2.0</small>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="إغلاق القائمة"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn desktop-toggle"
              aria-label="طي القائمة الجانبية"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelRightOpen size={20} />
              ) : (
                <PanelRightClose size={20} />
              )}
            </button>
            <button
              className="icon-btn mobile-toggle"
              aria-label="فتح القائمة"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              مساحة العمل <ChevronLeft size={14} />
              <strong>{titles[current]}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="notification-btn"
              title="الإشعارات"
              aria-label="الإشعارات"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={20} />
              {alerts + supplierNotices.length + licNotices.length > 0 && <i />}
            </button>
            <div
              className="account-avatar overflow-hidden cursor-pointer"
              title="الملف التعريفي وهوية المنشأة"
              onClick={() => {
                if (canNav(actor, "settings")) navigate("settings");
              }}
            >
              {actor.avatarUrl ? (
                <img src={actor.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                actor.name.slice(0, 1)
              )}
            </div>
          </div>
        </header>
        <div className="demo-bar">
          <span>
            <span className="demo-dot" /> وضع التجربة المحلية — تبديل الحسابات
            لا يمثل تسجيل دخول آمنًا
          </span>
          <label>
            الحساب{" "}
            <select
              aria-label="تبديل الحساب التجريبي"
              value={actor.id}
              onChange={(e) => {
                setActor(e.target.value);
                setPage("home");
                location.hash = "home";
              }}
            >
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} • {roleNames[a.role]}
                  {a.suspended
                    ? " (مجمد لمخالفة)"
                    : isLicenseExpired(a)
                      ? " (ترخيص منتهي)"
                      : !a.verified && a.role !== "guest"
                        ? " (قيد المراجعة)"
                        : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {notificationsOpen && (
          <Modal title="الإشعارات وتنبيهات الامتثال" onClose={() => setNotificationsOpen(false)}>
            {!supplierNotices.length && !licNotices.length && !alerts && <p>لا توجد تنبيهات مستحقة.</p>}
            
            {licNotices.map((n, idx) => (
              <button
                className="task-row w-full text-right"
                key={"lic-" + idx}
                onClick={() => {
                  if (actor.role === "admin") navigate("verification");
                  setNotificationsOpen(false);
                }}
              >
                <div>
                  <strong className={n.tone === "danger" ? "text-red-600 font-bold" : "text-amber-600 font-bold"}>
                    {n.text}
                  </strong>
                  <p>
                    المنشأة: {n.account.name} · الترخيص: {n.account.license || "—"}
                  </p>
                  {n.account.licenseExpiry && (
                    <small>تاريخ الانتهاء: {n.account.licenseExpiry}</small>
                  )}
                </div>
              </button>
            ))}

            {supplierNotices.map((n) => (
              <button
                className="task-row w-full text-right"
                key={n.item.id}
                onClick={() => {
                  navigate("inventory");
                  location.hash = "inventory?item=" + n.item.id;
                  setNotificationsOpen(false);
                  window.dispatchEvent(new Event("pharmalink-open-item"));
                }}
              >
                <div>
                  <strong>{n.text}</strong>
                  <p>
                    {n.item.name} · {n.item.batch}
                  </p>
                  <small>
                    {n.item.supplier} · {n.item.quantity} {n.item.unit} ·{" "}
                    {n.item.returnDeadline}
                  </small>
                </div>
              </button>
            ))}
            {alerts > 0 && (
              <button
                className="text-link"
                onClick={() => {
                  navigate("transfers");
                  setNotificationsOpen(false);
                }}
              >
                المناقلات المفتوحة ({alerts})
              </button>
            )}
          </Modal>
        )}
        <main key={actor.id + "-" + current} className="page-content">
          {current === "home" ? (
            <Home navigate={navigate} />
          ) : current === "dashboard" ? (
            <Dashboard navigate={navigate} />
          ) : current === "inventory" || current === "import" ? (
            <Inventory initialImport={current === "import"} />
          ) : current === "returns" ? (
            <SupplierReturns />
          ) : current === "board" ? (
            <Board />
          ) : current === "transfers" ? (
            <Transfers />
          ) : ["market", "sales", "orders"].includes(current) ? (
            <Trading mode={current as "market"} />
          ) : (
            <Management mode={current as "settings"} />
          )}
        </main>
        <footer className="app-footer">
          <span>
            © {new Date().getFullYear()} فارما لينك — تبادل دوائي منظم بين
            المنشآت
          </span>
          <span>النسخة المحلية · لا توجد مدفوعات حقيقية</span>
        </footer>
      </div>
    </div>
  );
}
