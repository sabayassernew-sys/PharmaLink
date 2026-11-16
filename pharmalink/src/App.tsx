import { SupplierReturns } from "./pages/SupplierReturns";
import { supplierAlerts, licenseAlerts, branchPolicyAlerts } from "./domain/notifications";
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
  CreditCard,
  Headphones,
  Phone,
  MessageSquare,
  Mail,
  LogIn,
  Users,
} from "lucide-react";
import { useApp } from "./context";
import { canNav, roleNames, visibleTransfers, ownsBranch, daysLeft, getEffectiveSubscription } from "./domain/access";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Board } from "./pages/Board";
import { Transfers } from "./pages/Transfers";
import { Trading } from "./pages/Trading";
import { Management } from "./pages/Management";
import { Home } from "./pages/Home";
import { Modal } from "./components/UI";
import { WelcomeOnboardingModal } from "./components/WelcomeOnboardingModal";
import { SubscriptionCountdownBanner } from "./components/SubscriptionCountdownBanner";
import { SubscriptionLockoutScreen } from "./components/SubscriptionLockoutScreen";
import { LoginModal } from "./components/LoginModal";
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
      ["subscriptions", "الاشتراكات والباقات", CreditCard],
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
  subscriptions: "الاشتراكات والباقات",
  reports: "التقارير",
  audit: "سجل العمليات",
  brand: "الهوية البصرية",
  settings: "الإعدادات",
};
export default function App() {
  const { state, actor, setActor, run, notify } = useApp();
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

  // Subscription state calculation using chain/branch inheritance
  const myBranch = state.branches.find((b) => ownsBranch(state, actor, b.id));
  const mySub = getEffectiveSubscription(state, actor);
  const subDays = mySub ? daysLeft(mySub.renewalDate) : -1;
  const isPendingApproval =
    actor.role === "pending" ||
    (!actor.verified && actor.role !== "admin" && actor.role !== "guest");
  const isSubExpired =
    !isPendingApproval &&
    actor.role !== "admin" &&
    actor.role !== "guest" &&
    (!mySub || mySub.status === "expired" || subDays < 0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Auto-open welcome modal for first-time session visit ONLY on accounts that actually manage billing (independent or agency_master)
  useEffect(() => {
    if (
      !isPendingApproval &&
      actor.verified &&
      (actor.role === "independent" || actor.role === "agency_master")
    ) {
      const seen = sessionStorage.getItem("pharmalink_welcome_seen_" + actor.id);
      if (!seen) {
        setWelcomeOpen(true);
        sessionStorage.setItem("pharmalink_welcome_seen_" + actor.id, "true");
      }
    }
  }, [actor.id, actor.role, actor.verified, isPendingApproval]);

  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const supplierNotices = supplierAlerts(state, actor);
  const licNotices = licenseAlerts(state, actor);
  const policyNotices = branchPolicyAlerts(state, actor);
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
            <small className={actor.rejection ? "text-red-400 font-bold" : ""}>
              {actor.rejection ? "طلب مرفوض من الإدارة" : roleNames[actor.role]}
            </small>
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
          {actor.role === "guest" ? (
            <button
              className="nav-item !text-teal-400 font-bold hover:!bg-white/10"
              onClick={() => setLoginOpen(true)}
            >
              <LogIn size={19} />
              <span>تسجيل الدخول للمنصة</span>
            </button>
          ) : (
            <>
              <button className="nav-item" onClick={() => setSupportOpen(true)}>
                <Headphones size={19} />
                <span>الدعم الفني والمساعدة</span>
              </button>
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
                  notify("تم تسجيل الخروج من مساحة العمل.");
                }}
              >
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </>
          )}
          <small>PharmaLink · Local Edition 2.4.1</small>
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
            {actor.role === "guest" ? (
              <button
                className="button primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                onClick={() => setLoginOpen(true)}
              >
                <LogIn size={15} />
                <span>تسجيل الدخول</span>
              </button>
            ) : (
              <>
                <button
                  className="button ghost text-xs flex items-center gap-1.5 text-slate-600 hover:text-teal-700"
                  onClick={() => setLoginOpen(true)}
                  title="تبديل الحساب أو تسجيل دخول آخر"
                >
                  <Users size={15} />
                  <span className="hidden sm:inline">تبديل الحساب</span>
                </button>
                {actor.role !== "admin" && (
                  <button
                    className="icon-btn text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200"
                    title={
                      actor.role === "agency_branch"
                        ? "اشتراك السلسلة (مغطى مركزياً)"
                        : "عرض باقات واشتراكات المنصة"
                    }
                    aria-label="عرض باقات واشتراكات المنصة"
                    onClick={() => {
                      if (actor.role === "agency_branch") {
                        notify("هذا الفرع مغطى ومفعل مركزياً تحت باقة إدارة السلسلة");
                      } else {
                        setWelcomeOpen(true);
                      }
                    }}
                  >
                    <CreditCard size={18} />
                  </button>
                )}
                <button
                  className="notification-btn"
                  title="الإشعارات"
                  aria-label="الإشعارات"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell size={20} />
                  {alerts + supplierNotices.length + licNotices.length + policyNotices.length > 0 && <i />}
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
                <button
                  className="icon-btn text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                  title="تسجيل الخروج والعودة للواجهة العامة"
                  aria-label="تسجيل الخروج"
                  onClick={() => {
                    setActor("guest");
                    setPage("home");
                    location.hash = "home";
                    notify("تم تسجيل الخروج بنجاح.");
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            )}
          </div>
        </header>
        {!isPendingApproval && actor.role !== "admin" && actor.role !== "guest" && mySub && (
          <SubscriptionCountdownBanner
            daysLeft={subDays}
            planName={state.subscriptionPlans?.find((p) => p.id === mySub?.planId)?.name}
            isTrial={Boolean(mySub?.notes?.includes("تجريب"))}
            isBranch={actor.role === "agency_branch"}
            chainName={state.chains.find((c) => c.id === actor.chainId)?.name}
            onOpenPlans={() => {
              if (actor.role === "agency_branch") {
                notify("إدارة وسداد باقات السلسلة محصورة بالإدارة المركزية للمجموعة");
              } else {
                setWelcomeOpen(true);
              }
            }}
          />
        )}
        {notificationsOpen && (
          <Modal title="الإشعارات وتنبيهات الامتثال" onClose={() => setNotificationsOpen(false)}>
            {!supplierNotices.length && !licNotices.length && !policyNotices.length && !alerts && <p>لا توجد تنبيهات مستحقة.</p>}
            
            {policyNotices.map((n, idx) => (
              <button
                className="task-row w-full text-right bg-teal-50/70 border border-teal-200"
                key={"pol-" + idx}
                onClick={() => {
                  navigate("returns");
                  setNotificationsOpen(false);
                }}
              >
                <div>
                  <strong className="text-teal-800 font-bold block mb-1">
                    {n.text}
                  </strong>
                  <p className="text-xs text-teal-700 m-0">
                    انقر هنا للانتقال إلى شاشة مرتجعات الموردين ومتابعة المهل المحسوبة.
                  </p>
                </div>
              </button>
            ))}

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
          {isSubExpired && current !== "subscriptions" ? (
            <SubscriptionLockoutScreen
              pharmacyName={branch?.name || actor.name}
              isBranch={actor.role === "agency_branch"}
              chainName={state.chains.find((c) => c.id === actor.chainId)?.name}
              isNewAccount={!mySub}
              onNavigateToSubscriptions={() => navigate("subscriptions")}
              onActivateTrial={async () => {
                const targetBranch = myBranch || branch || state.branches.find((b) => b.id === actor.branchId);
                if (targetBranch) {
                  const trialPlanId = actor.role === "agency_master" ? "plan_chains" : "plan_pro";
                  const ok = await run({
                    type: "assignSubscription",
                    branchId: targetBranch.id,
                    planId: trialPlanId,
                    billingCycle: "monthly",
                    paymentMethod: "free_trial",
                    notes: "فترة تجريبية مجانية 14 يوماً",
                  });
                  if (ok) {
                    notify("تم تفعيل فترتك التجريبية المجانية (14 يوماً) بنجاح!");
                  }
                } else {
                  notify("تم اعتماد الفترة التجريبية المجانية (14 يوماً) لحسابك");
                }
              }}
              onSelectPlan={async (planId, cycle) => {
                const targetBranch = myBranch || branch || state.branches.find((b) => b.id === actor.branchId);
                if (targetBranch) {
                  const ok = await run({
                    type: "assignSubscription",
                    branchId: targetBranch.id,
                    planId,
                    billingCycle: cycle,
                    paymentMethod: "bank_transfer",
                    notes: `اشتراك في باقة ${cycle === "annual" ? "سنوية" : "شهرية"}`,
                  });
                  if (ok) {
                    notify("تم تفعيل وتثبيت باقة الاشتراك بنجاح 🎉");
                  }
                } else {
                  navigate("subscriptions");
                }
              }}
            />
          ) : current === "home" ? (
            <Home navigate={navigate} onOpenLogin={() => setLoginOpen(true)} />
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
        {current !== "home" && (
          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} فارما لينك — تبادل دوائي منظم بين
              المنشآت
            </span>
            <span>النسخة المحلية · لا توجد مدفوعات حقيقية</span>
          </footer>
        )}

        {supportOpen && (
          <Modal
            title="مركز الدعم الفني والصيدلاني"
            onClose={() => setSupportOpen(false)}
          >
            <div className="info-strip mb-4">
              <Headphones size={18} />
              <span>
                فريق الدعم الفني متواجد لمساندتك في العمليات التشغيلية، الربط السحابي، والمناقلات الدوائية.
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                <Phone size={20} className="mx-auto text-teal-600 mb-1" />
                <strong className="block text-xs text-slate-800">الهاتف الموحد</strong>
                <span className="text-xs font-mono font-bold text-teal-700 block mt-1" dir="ltr">
                  +966 11 400 9080
                </span>
                <small className="text-[11px] text-slate-500 block mt-1">السبت - الخميس (8 ص - 10 م)</small>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                <MessageSquare size={20} className="mx-auto text-teal-600 mb-1" />
                <strong className="block text-xs text-slate-800">واتساب الدعم</strong>
                <span className="text-xs font-mono font-bold text-teal-700 block mt-1" dir="ltr">
                  +966 55 900 7060
                </span>
                <small className="text-[11px] text-slate-500 block mt-1">رد فوري واستفسارات</small>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                <Mail size={20} className="mx-auto text-teal-600 mb-1" />
                <strong className="block text-xs text-slate-800">البريد المعتمد</strong>
                <span className="text-xs font-mono font-bold text-teal-700 block mt-1">
                  support@pharmalink.local
                </span>
                <small className="text-[11px] text-slate-500 block mt-1">المراسلات الرسمية والامتثال</small>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                notify("تم إرسال تذكرة الدعم بنجاح! سيتابع معك فريقنا الصيدلاني فوراً.");
                setSupportOpen(false);
              }}
            >
              <div className="field mb-3">
                <span>موضوع التذكرة / الاستفسار</span>
                <input
                  type="text"
                  placeholder="مثال: استفسار حول مناقلة رقم #TR-xxx أو مهلة مرتجع"
                  required
                />
              </div>
              <div className="field mb-4">
                <span>تفاصيل المشكلة أو الملاحظة</span>
                <textarea
                  rows={3}
                  placeholder="يرجى كتابة تفاصيل المشكلة وسيقوم فريق الدعم بالتحقق منها..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="button ghost text-sm"
                  onClick={() => setSupportOpen(false)}
                >
                  إغلاق
                </button>
                <button type="submit" className="button primary text-sm">
                  إرسال تذكرة الدعم
                </button>
              </div>
            </form>
          </Modal>
        )}

        <WelcomeOnboardingModal
          isOpen={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
          pharmacyName={branch?.name || actor.name}
          targetRole={actor.role}
          onActivateTrial={async () => {
            const targetBranch = myBranch || branch;
            if (targetBranch) {
              const trialPlanId = actor.role === "agency_master" ? "plan_chains" : "plan_pro";
              const ok = await run({
                type: "assignSubscription",
                branchId: targetBranch.id,
                planId: trialPlanId,
                billingCycle: "monthly",
                paymentMethod: "free_trial",
                notes: "فترة تجريبية مجانية 14 يوماً",
              });
              if (ok) {
                notify("تم تفعيل فترتك التجريبية المجانية (14 يوماً) بنجاح!");
                setWelcomeOpen(false);
              }
            } else {
              notify("تم اعتماد الفترة التجريبية المجانية (14 يوماً) لحسابك");
              setWelcomeOpen(false);
            }
          }}
          onSelectPlan={async (planId, cycle) => {
            setWelcomeOpen(false);
            const targetBranch = myBranch || branch || state.branches.find((b) => b.id === actor.branchId);
            if (targetBranch) {
              const ok = await run({
                type: "assignSubscription",
                branchId: targetBranch.id,
                planId,
                billingCycle: cycle,
                paymentMethod: "bank_transfer",
                notes: `اشتراك في باقة ${cycle === "annual" ? "سنوية" : "شهرية"}`,
              });
              if (ok) {
                notify("تم تفعيل وتثبيت باقة الاشتراك بنجاح 🎉");
              }
            } else {
              navigate("subscriptions");
            }
          }}
        />

        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={(role) => {
            const next =
              role === "admin"
                ? "verification"
                : role === "guest" || role === "pending"
                  ? "home"
                  : "dashboard";
            navigate(next);
          }}
          onOpenRegister={() => {
            navigate("home");
            window.dispatchEvent(new CustomEvent("pharmalink-open-register"));
          }}
        />
      </div>
    </div>
  );
}
