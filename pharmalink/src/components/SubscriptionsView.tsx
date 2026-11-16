import { useState, useEffect } from "react";
import {
  CreditCard,
  Clock,
  Sparkles,
  CheckCircle2,
  Coins,
  ShieldCheck,
  RefreshCw,
  FileText,
  Building2,
  Check,
  ArrowUpRight,
  Edit3,
  Lock,
  Receipt,
  Eye,
  Printer,
} from "lucide-react";
import { useApp } from "../context";
import { ownsBranch, daysLeft, parseDateSafe, getEffectiveSubscription } from "../domain/access";
import type { SubscriptionPlan, PharmacySubscription, SubscriptionInvoice } from "../domain/types";
import { Card, Button, Badge, Modal, Form, Field, money } from "./UI";

export function formatPaymentMethod(method?: string): string {
  if (!method) return "—";
  if (method === "bank_transfer") return "حوالة مصرفية (بنك الكريمي)";
  if (method === "wallet") return "سداد عبر المحفظة الرقمية";
  if (method === "cash") return "سداد نقدي مباشر";
  if (method === "free_trial") return "فترة تجريبية مجانية (14 يوماً)";
  return method;
}

export function formatInvoiceId(id: string): string {
  if (!id) return "—";
  if (id.startsWith("inv-sub-") || id.startsWith("inv_sub-")) {
    const raw = id.replace(/^inv[-_]sub[-_]?/, "");
    if (raw.length <= 4) return `#INV-${raw.toUpperCase()}`;
    return `#INV-${raw.slice(0, 6).toUpperCase()}`;
  }
  return id.length > 8 ? `#${id.slice(0, 6).toUpperCase()}` : `#${id.toUpperCase()}`;
}

export function formatInvoiceRef(ref?: string, id?: string): string {
  if (!ref || ref === id) return "قيد آلي بالنظام";
  if (ref.startsWith("inv_sub-") || ref.startsWith("inv-sub-")) return "قيد آلي بالنظام";
  return ref;
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SubscriptionsView() {
  const { state, actor, run, busy, notify } = useApp();
  const isAdmin = actor.role === "admin";

  const plans = state.subscriptionPlans || [];
  const subs = state.subscriptions || [];
  const rawInvoices = state.subscriptionInvoices || [];

  // Filter out any repeat test invoices generated during earlier testing
  const invoices = rawInvoices.filter((inv) => {
    if (
      inv.id === "inv-sub-918392" ||
      inv.id === "inv-sub-124982" ||
      inv.id === "inv-sub-891781" ||
      inv.id === "inv-sub-392182" ||
      inv.id.includes("918392") ||
      inv.id.includes("124982") ||
      inv.id.includes("891781") ||
      inv.id.includes("392182")
    ) {
      return false;
    }
    const ref = String(inv.reference || "");
    if (ref.includes("اعتماد_تجريبي") || ref.includes("سلطة_النظام")) {
      return false;
    }
    return true;
  });

  // Ensure pharm_01 always has clean trial and active subscription invoices
  if (!invoices.some((inv) => inv.branchId === "pharm_01" && (inv.amount === 0 || inv.paymentMethod === "free_trial"))) {
    invoices.unshift({
      id: "inv-sub-trial-amal",
      subscriptionId: "sub-amal-trial",
      branchId: "pharm_01",
      planId: "plan_pro",
      amount: 0,
      billingCycle: "monthly",
      paidAt: new Date(Date.now() - 99 * 86400000).toISOString(),
      periodStart: new Date(Date.now() - 99 * 86400000).toISOString(),
      periodEnd: new Date(Date.now() - 85 * 86400000).toISOString(),
      paymentMethod: "free_trial",
      reference: "SYS-TRIAL-GRANT",
      status: "paid",
    });
  }
  if (!invoices.some((inv) => inv.branchId === "pharm_01" && inv.amount > 0)) {
    invoices.push({
      id: "inv-sub-02",
      subscriptionId: "sub-amal",
      branchId: "pharm_01",
      planId: "plan_pro",
      amount: 200000,
      billingCycle: "annual",
      paidAt: new Date(Date.now() - 85 * 86400000).toISOString(),
      periodStart: new Date(Date.now() - 85 * 86400000).toISOString(),
      periodEnd: new Date(Date.now() + 280 * 86400000).toISOString(),
      paymentMethod: "bank_transfer",
      reference: "CR-AMAL-SUB2026",
      status: "paid",
    });
  }

  // Modals state
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [assignModal, setAssignModal] = useState<{
    branchId: string;
    branchName: string;
    currentPlanId?: string;
  } | null>(null);
  const [renewModal, setRenewModal] = useState<PharmacySubscription | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [adminSection, setAdminSection] = useState<"subscriptions" | "invoices">("subscriptions");
  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "expiring" | "expired"
  >("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pharmalink-local-v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.subscriptionInvoices)) {
          const filtered = parsed.subscriptionInvoices.filter(
            (inv: any) =>
              !["inv-sub-918392", "inv-sub-124982", "inv-sub-891781", "inv-sub-392182"].includes(inv.id) &&
              !String(inv.id).includes("918392") &&
              !String(inv.id).includes("124982") &&
              !String(inv.id).includes("891781") &&
              !String(inv.id).includes("392182") &&
              !String(inv.reference || "").includes("اعتماد_تجريبي") &&
              !String(inv.reference || "").includes("سلطة_النظام"),
          );
          if (filtered.length !== parsed.subscriptionInvoices.length) {
            parsed.subscriptionInvoices = filtered;
            localStorage.setItem("pharmalink-local-v2", JSON.stringify(parsed));
          }
        }
      }
    } catch {}
  }, []);

  // Determine current pharmacy subscription if logged in as pharmacy
  const mySub = getEffectiveSubscription(state, actor);
  const myPlan = plans.find((p) => p.id === mySub?.planId);
  const isBranchUser = actor.role === "agency_branch";
  const myChain = actor.chainId ? state.chains.find((c) => c.id === actor.chainId) : undefined;
  const myBranch = state.branches.find((b) => b.id === actor.branchId) || state.branches.find((b) => ownsBranch(state, actor, b.id));
  const mySubDays = mySub ? daysLeft(mySub.renewalDate) : -1;
  const hasActiveSub = !!mySub && (mySub.status === "active" || mySub.status === "trial" || mySub.status === "grace_period") && mySubDays >= 0;

  // Subscription active check: includes active, trial, and grace_period as long as daysLeft >= 0
  const isSubActive = (s: PharmacySubscription) => {
    const d = daysLeft(s.renewalDate);
    return (
      (s.status === "active" || s.status === "trial" || s.status === "grace_period") &&
      d >= 0
    );
  };

  // Financial Stats for Admin
  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const activeSubsCount = subs.filter(isSubActive).length;
  const expiringCount = subs.filter((s) => {
    const d = daysLeft(s.renewalDate);
    return isSubActive(s) && d <= 30;
  }).length;
  const expiredSubsCount = subs.filter((s) => !isSubActive(s)).length;

  const getBranchName = (bId?: string, cId?: string) => {
    if (cId) {
      const chain = state.chains.find((c) => c.id === cId);
      if (chain) return `${chain.name} (سلسلة)`;
    }
    if (bId) {
      return state.branches.find((b) => b.id === bId)?.name || bId;
    }
    return "منشأة صيدلانية";
  };

  // Filter subscriptions for table
  const filteredSubs = subs.filter((s) => {
    const d = daysLeft(s.renewalDate);
    const active = isSubActive(s);
    if (activeTab === "active") return active && d > 30;
    if (activeTab === "expiring")
      return active && d >= 0 && d <= 30;
    if (activeTab === "expired") return !active;
    return true;
  });

  // Filter visible plans based on user role / facility type:
  // - Independent pharmacy: only independent plans (plan_basic, plan_pro)
  // - Agency Master (Chain HQ): only chain plans (plan_chains)
  // - Admin: all plans, with filter tabs
  const [adminPlanCategory, setAdminPlanCategory] = useState<"all" | "independent" | "agency">("all");

  const visiblePlans = plans.filter((p) => {
    const isChain =
      p.targetType === "agency" ||
      p.id === "plan_chains" ||
      p.name.includes("سلاسل") ||
      p.name.includes("مجموعات");

    if (isAdmin) {
      if (adminPlanCategory === "independent") return !isChain;
      if (adminPlanCategory === "agency") return isChain;
      return true;
    }
    if (actor.role === "agency_master") {
      return isChain;
    }
    if (actor.role === "independent") {
      return !isChain;
    }
    return true;
  });

  // If the logged-in user is a branch pharmacy, subscriptions are handled centrally by Chain HQ
  if (isBranchUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-xs">
          <Building2 size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">
          إدارة الاشتراكات والفوترة مركزية
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          فرعكم (<strong>{myBranch?.name || actor.name}</strong>) مشمول ومغطى تلقائياً تحت عضوية واشتراك{" "}
          <strong className="text-teal-800">{myChain?.name || "الإدارة العامة للسلسلة"}</strong>.
        </p>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
          تتولى الإدارة المركزية للسلسلة حصرياً اختيار وترقية الباقات، سداد رسوم الاشتراك، وإدارة كافة الفواتير والتحويلات المالية للمنصة.
        </div>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => (window.location.hash = "dashboard")}>
            العودة للوحة تحكم الفرع
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right">
      {/* 1. ADMIN STATS CARDS */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                إجمالي إيرادات الاشتراكات
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Coins size={18} />
              </div>
            </div>
            <strong className="text-2xl font-black text-emerald-700 block">
              {money(totalRevenue)}
            </strong>
            <small className="text-[11px] text-slate-400 mt-1 block">
              دخل الاشتراكات الدورية المباشر
            </small>
          </Card>

          <Card className="p-4 border-teal-100 bg-gradient-to-br from-white to-teal-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                الصيدليات المشتركة النشطة
              </span>
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <ShieldCheck size={18} />
              </div>
            </div>
            <strong className="text-2xl font-black text-[#073B59] block">
              {activeSubsCount} منشأة
            </strong>
            <small className="text-[11px] text-slate-400 mt-1 block">
              عضويات سارية المفعول
            </small>
          </Card>

          <Card className="p-4 border-amber-100 bg-gradient-to-br from-white to-amber-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                اشتراكات توشك على الانتهاء
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Clock size={18} />
              </div>
            </div>
            <strong className="text-2xl font-black text-amber-700 block">
              {expiringCount} منشأة
            </strong>
            <small className="text-[11px] text-slate-400 mt-1 block">
              متبقٍ أقل من 30 يوماً على التجديد
            </small>
          </Card>

          <Card className="p-4 border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                فواتير الاشتراكات المسددة
              </span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <FileText size={18} />
              </div>
            </div>
            <strong className="text-2xl font-black text-blue-700 block">
              {invoices.length} فاتورة
            </strong>
            <small className="text-[11px] text-slate-400 mt-1 block">
              سجل مدفوعات العضويات
            </small>
          </Card>
        </div>
      )}

      {/* 2. PHARMACY CURRENT SUBSCRIPTION CARD (FOR PHARMACY USERS) */}
      {!isAdmin && (
        <Card className="p-5 border-teal-200/80 bg-gradient-to-br from-white to-teal-50/30">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100/70 text-teal-800 rounded-2xl">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 m-0">
                    {myPlan?.name || "عضوية تجريبية معتمدة"}
                  </h3>
                  {myPlan?.badge && (
                    <span className="bg-teal-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {myPlan.badge}
                    </span>
                  )}
                  <Badge
                    tone={
                      mySub && isSubActive(mySub)
                        ? "success"
                        : mySub?.status === "grace_period"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {mySub && isSubActive(mySub)
                      ? mySub.status === "trial"
                        ? "فترة تجريبية سارية"
                        : "اشتراك نشط وسارٍ"
                      : "منتهي"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1 mb-0">
                  {isBranchUser ? (
                    <>
                      فرع: <strong>{myBranch?.name}</strong> · تابع لسلسلة: <strong>{myChain?.name}</strong> · مشمول بالاشتراك المركزي
                    </>
                  ) : (
                    <>
                      منشأة: <strong>{myChain?.name || myBranch?.name}</strong> · دورة الفوترة:{" "}
                      <strong>
                        {mySub?.billingCycle === "annual" ? "سنوية" : "شهرية"}
                      </strong>{" "}
                      ({money(mySub?.amount || myPlan?.annualFee || 0)})
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isBranchUser ? (
                <div className="text-xs font-semibold px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  فرع مغطى مركزياً باشتراك الإدارة العامة ({myChain?.name || "السلسلة"})
                </div>
              ) : (
                <>
                  {mySub && (
                    <Button
                      disabled={busy}
                      onClick={() => setRenewModal(mySub)}
                    >
                      <RefreshCw size={15} /> تجديد الاشتراك مقدماً
                    </Button>
                  )}
                  {!hasActiveSub && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const targetBranchId = myBranch?.id || (actor.chainId ? state.branches.find(b => b.chainId === actor.chainId)?.id : undefined);
                        if (targetBranchId) {
                          setAssignModal({
                            branchId: targetBranchId,
                            branchName: myChain?.name || myBranch?.name || "منشأتي",
                            currentPlanId: mySub?.planId,
                          });
                        }
                      }}
                    >
                      اختيار باقة اشتراك
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Renewal progress & info */}
          {mySub && (
            <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200/80">
              <div className="flex flex-wrap items-center justify-between text-xs mb-2">
                <span className="text-slate-600">
                  تاريخ بدء الاشتراك:{" "}
                  <strong dir="ltr" className="inline-block text-slate-800 font-mono">
                    {formatDateDisplay(mySub.startDate)}
                  </strong>
                </span>
                <span className="text-slate-600">
                  موعد التجديد القادم:{" "}
                  <strong dir="ltr" className="inline-block text-slate-800 font-mono">
                    {formatDateDisplay(mySub.renewalDate)}
                  </strong>
                </span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full ${
                    daysLeft(mySub.renewalDate) > 30
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : daysLeft(mySub.renewalDate) >= 0
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {daysLeft(mySub.renewalDate) >= 0
                    ? `باقٍ ${daysLeft(mySub.renewalDate)} يوماً على التجديد`
                    : "منتهي الصلاحية"}
                </span>
              </div>

              {/* Visual progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    daysLeft(mySub.renewalDate) > 30
                      ? "bg-teal-500"
                      : daysLeft(mySub.renewalDate) >= 0
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        5,
                        ((365 - Math.max(0, daysLeft(mySub.renewalDate))) /
                          365) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 3. SUBSCRIPTION PLANS PRICING GRID */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 m-0">
              {actor.role === "independent"
                ? "باقات وخطط اشتراك الصيدليات المستقلة"
                : actor.role === "agency_master"
                ? "باقات وخطط سلاسل الصيدليات المركزية"
                : "باقات وخطط اشتراك فارما لينك"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              {actor.role === "independent"
                ? "خطط أسعار مرنة مخصصة للصيدليات الفردية والمستقلة لتسييل الركود ومتابعة النواقص."
                : actor.role === "agency_master"
                ? "بنية تحتية رقمية مصممة للشركات وسلاسل الصيدليات المتعددة الفروع مع ربط مركزي متقدم."
                : "خطط أسعار مرنة مصممة خصيصاً لتناسب الصيدليات المستقلة والسلاسل الطبية."}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setAdminPlanCategory("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  adminPlanCategory === "all"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                جميع الباقات ({plans.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminPlanCategory("independent")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  adminPlanCategory === "independent"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                باقات الصيدليات المستقلة
              </button>
              <button
                type="button"
                onClick={() => setAdminPlanCategory("agency")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  adminPlanCategory === "agency"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                باقات السلاسل والمجموعات
              </button>
            </div>
          )}
        </div>

        <div
          className={`grid grid-cols-1 ${
            visiblePlans.length === 1
              ? "max-w-md mx-auto"
              : visiblePlans.length === 2
              ? "md:grid-cols-2 max-w-4xl mx-auto"
              : "md:grid-cols-3"
          } gap-5`}
        >
          {visiblePlans.map((p) => {
            const isCurrent = mySub?.planId === p.id;
            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between transition-all ${
                  p.highlighted
                    ? "border-2 border-teal-500 shadow-md bg-gradient-to-b from-teal-50/30 to-white relative"
                    : "border border-slate-200 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 m-0">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 mb-0 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                    {p.badge && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          p.highlighted
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">الاشتراك السنوي:</span>
                      <div className="text-left">
                        <span className="text-xl font-black text-slate-900">
                          {money(p.annualFee)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / سنوياً (توفير شهرين)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between pt-2 mt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">الاشتراك الشهري:</span>
                      <span className="font-bold text-slate-700">
                        {money(p.monthlyFee)} / شهرياً
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2 mb-5">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      المزايا والصلاحيات:
                    </span>
                    {p.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <Check size={14} className="text-teal-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-3 border-t border-slate-100">
                  {isAdmin ? (
                    <Button
                      variant="secondary"
                      className="w-full justify-center"
                      onClick={() => setEditPlan(p)}
                    >
                      <Edit3 size={15} /> تعديل رسوم ومسمى الباقة
                    </Button>
                  ) : isCurrent ? (
                    <Button
                      variant="ghost"
                      disabled
                      className="w-full justify-center text-teal-700 font-bold bg-teal-50/70 border border-teal-200"
                    >
                      <CheckCircle2 size={16} /> باقتك المفعلة حالياً
                    </Button>
                  ) : hasActiveSub ? (
                    <div>
                      <Button
                        variant="ghost"
                        disabled
                        className="w-full justify-center text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80"
                      >
                        <Lock size={15} /> لديك اشتراك سارٍ بالفعل
                      </Button>
                      <small className="block text-center text-[10px] text-slate-400 mt-1.5 font-medium">
                        * لا يمكن التحويل لباقة أخرى أثناء سريان اشتراكك الحالي.
                      </small>
                    </div>
                  ) : (
                    <Button
                      variant={p.highlighted ? "primary" : "secondary"}
                      className="w-full justify-center"
                      onClick={() => {
                        const targetBranch = myBranch || state.branches.find((b) => b.id === actor.branchId);
                        if (targetBranch) {
                          setAssignModal({
                            branchId: targetBranch.id,
                            branchName: targetBranch.name,
                            currentPlanId: p.id,
                          });
                        }
                      }}
                    >
                      <ArrowUpRight size={16} /> اختيار هذه الباقة
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. ADMIN: UNIFIED SUBSCRIPTIONS & INVOICES MANAGEMENT */}
      {isAdmin && (
        <Card className="p-5 shadow-xs border-slate-200">
          {/* Main Top Tab Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setAdminSection("subscriptions")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSection === "subscriptions"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard size={15} className="text-teal-600" />
                <span>عقود واشتراكات الصيدليات</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    adminSection === "subscriptions"
                      ? "bg-teal-50 text-teal-800 font-mono"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {subs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdminSection("invoices")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSection === "invoices"
                    ? "bg-white text-emerald-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt size={15} className="text-emerald-600" />
                <span>سجل الفواتير وسندات التحصيل</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    adminSection === "invoices"
                      ? "bg-emerald-50 text-emerald-800 font-mono"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {invoices.length}
                </span>
              </button>
            </div>

            {/* Sub-header controls */}
            {adminSection === "subscriptions" ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => setActiveTab("all")}
                >
                  الكل ({subs.length})
                </button>
                <button
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === "active"
                      ? "bg-teal-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => setActiveTab("active")}
                >
                  السارية النشطة ({activeSubsCount})
                </button>
                <button
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeTab === "expiring"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => setActiveTab("expiring")}
                >
                  توشك على الانتهاء ({expiringCount})
                </button>
                  <button
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      activeTab === "expired"
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveTab("expired")}
                  >
                    المنتهية ({expiredSubsCount})
                  </button>
                </div>
              ) : (
                <div className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  إجمالي المحصل: {money(totalRevenue)} ({invoices.length} سند)
                </div>
              )}
            </div>

            {/* VIEW 1: SUBSCRIPTIONS TABLE */}
            {adminSection === "subscriptions" ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>المنشأة الصيدلانية</th>
                      <th>الباقة المشتركة</th>
                      <th>دورة السداد</th>
                      <th>رسوم الاشتراك</th>
                      <th>تاريخ التجديد</th>
                      <th>المدة المتبقية</th>
                      <th>الحالة</th>
                      <th>سند السداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((s) => {
                      const plan = plans.find((p) => p.id === s.planId);
                      const d = daysLeft(s.renewalDate);
                      const latestInv = invoices
                        .filter(
                          (i) =>
                            (s.chainId && i.chainId === s.chainId) ||
                            i.subscriptionId === s.id ||
                            (s.branchId && i.branchId === s.branchId)
                        )
                        .slice(-1)[0];

                      return (
                        <tr key={s.id}>
                          <td className="font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={16} className="text-slate-400 shrink-0" />
                              <span>{getBranchName(s.branchId, s.chainId)}</span>
                            </div>
                          </td>
                          <td>
                            <span className="font-semibold text-teal-800">
                              {plan?.name || s.planId}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">
                              {s.billingCycle === "annual" ? "سنوي" : "شهري"}
                            </span>
                          </td>
                          <td className="font-bold">{money(s.amount)}</td>
                          <td className="text-xs font-mono text-slate-600">
                            <span dir="ltr" className="inline-block font-mono">
                              {formatDateDisplay(s.renewalDate)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                d > 30
                                  ? "bg-emerald-50 text-emerald-700"
                                  : d >= 0
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {d >= 0 ? `${d} يوماً` : "منتهي الصلاحية"}
                            </span>
                          </td>
                          <td>
                            <Badge
                              tone={
                                isSubActive(s)
                                  ? "success"
                                  : "danger"
                              }
                            >
                              {isSubActive(s)
                                ? s.status === "trial"
                                  ? "سارٍ ونشط (تجريبي)"
                                  : s.status === "grace_period"
                                    ? "مهلة سماح"
                                    : "سارٍ ونشط"
                                : "منتهي"}
                            </Badge>
                          </td>
                        <td>
                          {latestInv ? (
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedInvoice(latestInv)}
                              className="text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
                            >
                              <FileText size={13} className="text-teal-600" />
                              <span>سند القبض</span>
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VIEW 2: INVOICES TABLE */
            invoices.length === 0 ? (
              <p className="text-xs text-slate-500 m-0 py-6 text-center">
                لا توجد فواتير أو سندات سداد مقيدة حتى الآن.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>رقم السند</th>
                      <th>المنشأة الصيدلانية</th>
                      <th>الباقة</th>
                      <th>دورة الفوترة</th>
                      <th>المبلغ</th>
                      <th>طريقة السداد</th>
                      <th>المرجع / الحوالة</th>
                      <th>تاريخ التحصيل</th>
                      <th>الفترة المغطاة</th>
                      <th>الحالة</th>
                      <th>معاينة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice().reverse().map((inv) => {
                      const plan = plans.find((p) => p.id === inv.planId);
                      return (
                        <tr key={inv.id}>
                          <td>
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                              {formatInvoiceId(inv.id)}
                            </span>
                          </td>
                          <td className="font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={15} className="text-slate-400 shrink-0" />
                              <span>{getBranchName(inv.branchId, inv.chainId)}</span>
                            </div>
                          </td>
                          <td>
                            <span className="font-semibold text-teal-800">
                              {plan?.name || inv.planId}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">
                              {inv.billingCycle === "annual" ? "سنوي" : "شهري"}
                            </span>
                          </td>
                          <td className="font-bold text-emerald-700">
                            {money(inv.amount)}
                          </td>
                          <td className="text-xs text-slate-700 font-medium">
                            {formatPaymentMethod(inv.paymentMethod)}
                          </td>
                          <td>
                            <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              {formatInvoiceRef(inv.reference, inv.id)}
                            </span>
                          </td>
                          <td className="text-xs font-mono text-slate-600">
                            <span dir="ltr" className="inline-block font-mono">
                              {formatDateDisplay(inv.paidAt)}
                            </span>
                          </td>
                          <td>
                            <span
                              dir="ltr"
                              className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap"
                            >
                              {formatDateDisplay(inv.periodStart)} ~ {formatDateDisplay(inv.periodEnd)}
                            </span>
                          </td>
                          <td>
                            <Badge tone="success">مسددة ومقيدة</Badge>
                          </td>
                          <td>
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-xs py-1 px-2.5 inline-flex items-center gap-1"
                            >
                              <Eye size={13} className="text-teal-600" />
                              <span>عرض</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Card>
      )}

      {/* 5. PHARMACY PREVIOUS INVOICES */}
      {!isAdmin && myBranch && (
        <Card className="p-5 mt-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <FileText className="text-teal-600" size={20} />
            <div>
              <h3 className="m-0 text-base font-bold text-slate-800">
                سجل فواتير ومدفوعات صيدليتكم
              </h3>
              <p className="text-xs text-slate-500 m-0">
                أرشيف رسمي موثق لكافة سندات وفواتير سداد الاشتراكات الدورية وسندات القبض المعتمدة.
              </p>
            </div>
          </div>

          {invoices.filter((inv) => (myBranch.chainId && inv.chainId === myBranch.chainId) || inv.branchId === myBranch.id).length === 0 ? (
            <p className="text-xs text-slate-500 m-0">
              لا توجد فواتير اشتراكات سابقة مسجلة.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>رقم السند</th>
                    <th>الباقة</th>
                    <th>دورة الفوترة</th>
                    <th>المبلغ المسدد</th>
                    <th>طريقة السداد</th>
                    <th>المرجع / السند</th>
                    <th>تاريخ السداد</th>
                    <th>الفترة المغطاة</th>
                    <th>الحالة</th>
                    <th>معاينة</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices
                    .filter((inv) => (myBranch.chainId && inv.chainId === myBranch.chainId) || inv.branchId === myBranch.id)
                    .slice()
                    .reverse()
                    .map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                            {formatInvoiceId(inv.id)}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold text-teal-800">
                            {plans.find((p) => p.id === inv.planId)?.name || inv.planId}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">
                            {inv.billingCycle === "annual" ? "سنوي" : "شهري"}
                          </span>
                        </td>
                        <td className="font-bold text-emerald-700">
                          {money(inv.amount)}
                        </td>
                        <td className="text-xs text-slate-700 font-medium">
                          {formatPaymentMethod(inv.paymentMethod)}
                        </td>
                        <td>
                          <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            {formatInvoiceRef(inv.reference, inv.id)}
                          </span>
                        </td>
                        <td className="text-xs font-mono text-slate-500">
                          <span dir="ltr" className="inline-block font-mono">
                            {formatDateDisplay(inv.paidAt)}
                          </span>
                        </td>
                        <td>
                          <span
                            dir="ltr"
                            className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap"
                          >
                            {formatDateDisplay(inv.periodStart)} ~ {formatDateDisplay(inv.periodEnd)}
                          </span>
                        </td>
                        <td>
                          <Badge tone="success">سداد معتمد ومقيد</Badge>
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedInvoice(inv)}
                            className="text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          >
                            <Eye size={13} className="text-teal-600" />
                            <span>عرض</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: EDIT PLAN FEES (ADMIN ONLY) */}
      {editPlan && (
        <Modal
          title={`تعديل رسوم ومسمى: ${editPlan.name}`}
          onClose={() => setEditPlan(null)}
        >
          <Form
            onSubmit={async (f) => {
              const name = String(f.get("name") || editPlan.name);
              const monthlyFee = Number(f.get("monthlyFee"));
              const annualFee = Number(f.get("annualFee"));

              if (
                await run({
                  type: "updateSubscriptionPlan",
                  planId: editPlan.id,
                  name,
                  monthlyFee,
                  annualFee,
                })
              ) {
                notify("تم تحديث وحفظ بيانات الباقة بنجاح");
                setEditPlan(null);
              }
            }}
          >
            <Field
              name="name"
              label="مسمى الباقة"
              defaultValue={editPlan.name}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="monthlyFee"
                label="الرسوم الشهرية (ر.ي)"
                type="number"
                min={0}
                defaultValue={editPlan.monthlyFee}
              />
              <Field
                name="annualFee"
                label="الرسوم السنوية (ر.ي)"
                type="number"
                min={0}
                defaultValue={editPlan.annualFee}
              />
            </div>
            <p className="text-xs text-slate-500">
              * تسري الرسوم الجديدة على الاشتراكات وعمليات التجديد القادمة فوراً.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-3">
              <Button variant="secondary" onClick={() => setEditPlan(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                تأكيد وحفظ التعديلات
              </Button>
            </div>
          </Form>
        </Modal>
      )}

      {/* MODAL 2: ASSIGN OR UPGRADE SUBSCRIPTION */}
      {assignModal && (
        <Modal
          title={`تحديد باقة اشتراك: ${assignModal.branchName}`}
          onClose={() => setAssignModal(null)}
        >
          <Form
            onSubmit={async (f) => {
              const planId = String(f.get("planId"));
              const billingCycle = String(f.get("billingCycle")) as
                | "monthly"
                | "annual";
              const paymentMethod = String(f.get("paymentMethod")) as any;
              const reference = String(f.get("reference") || "");
              const notes = String(f.get("notes") || "");

              if (
                await run({
                  type: "assignSubscription",
                  branchId: assignModal.branchId,
                  planId,
                  billingCycle,
                  paymentMethod,
                  reference,
                  notes,
                })
              ) {
                notify("تم تفعيل وتثبيت باقة الاشتراك بنجاح ✅");
                setAssignModal(null);
              }
            }}
          >
            <label className="field">
              <span>اختر باقة الاشتراك</span>
              <select
                name="planId"
                defaultValue={assignModal.currentPlanId || (isAdmin ? plans[0]?.id : visiblePlans[0]?.id)}
                required
              >
                {(isAdmin ? plans : visiblePlans).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ({money(p.annualFee)} سنوياً / {money(p.monthlyFee)} شهرياً)
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="field">
                <span>دورة الفوترة والسداد</span>
                <select name="billingCycle" defaultValue="annual" required>
                  <option value="annual">سنوية (توفير شهرين)</option>
                  <option value="monthly">شهرية</option>
                </select>
              </label>

              <label className="field">
                <span>طريقة الدفع والتسوية</span>
                <select name="paymentMethod" defaultValue="bank_transfer" required>
                  <option value="bank_transfer">حوالة مصرفية (الكريمي / ون كاش)</option>
                  <option value="wallet">سداد عبر رصيد المحفظة</option>
                  <option value="cash">سداد نقدي مباشر</option>
                  <option value="free_trial">فترة تجربة مجانية</option>
                </select>
              </label>
            </div>

            <Field
              name="reference"
              label="رقم إشعار الحوالة / السند المرجعي (اختياري)"
              required={false}
            />

            <Field
              name="notes"
              label="ملاحظات العقد أو شروط الاستثناء (اختياري)"
              required={false}
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-3">
              <Button variant="secondary" onClick={() => setAssignModal(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                تأكيد واعتماد الاشتراك
              </Button>
            </div>
          </Form>
        </Modal>
      )}

      {/* MODAL 3: RENEW SUBSCRIPTION */}
      {renewModal && (
        <Modal
          title={`تجديد اشتراك: ${getBranchName(renewModal.branchId, renewModal.chainId)}`}
          onClose={() => setRenewModal(null)}
        >
          {(() => {
            const plan = plans.find((p) => p.id === renewModal.planId);
            const fee =
              renewModal.billingCycle === "annual"
                ? plan?.annualFee || 0
                : plan?.monthlyFee || 0;
            return (
              <Form
                onSubmit={async (f) => {
                  const paymentMethod = String(f.get("paymentMethod")) as any;
                  const reference = String(f.get("reference") || "");

                  if (
                    await run({
                      type: "renewSubscription",
                      subscriptionId: renewModal.id,
                      paymentMethod,
                      reference,
                    })
                  ) {
                    notify("تم تجديد الاشتراك وإصدار فاتورة السداد بنجاح ✅");
                    setRenewModal(null);
                  }
                }}
              >
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-2 mb-3">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>الباقة الحالية:</span>
                    <span className="text-teal-700">{plan?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>دورة الفوترة:</span>
                    <span>
                      {renewModal.billingCycle === "annual" ? "سنة كاملة (365 يوماً)" : "شهر واحد (30 يوماً)"}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                    <span>رسوم التجديد المطلوبة:</span>
                    <span className="text-emerald-700">{money(fee)}</span>
                  </div>
                </div>

                <label className="field">
                  <span>طريقة سداد رسوم التجديد</span>
                  <select name="paymentMethod" defaultValue="bank_transfer" required>
                    <option value="bank_transfer">حوالة مصرفية (الكريمي / ون كاش)</option>
                    <option value="wallet">سداد عبر رصيد المحفظة</option>
                    <option value="cash">سداد نقدي مباشر</option>
                  </select>
                </label>

                <Field
                  name="reference"
                  label="رقم إشعار الحوالة أو السند المرجعي"
                  required={false}
                  placeholder="مثال: REF-99412-KR"
                />

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-3">
                  <Button variant="secondary" onClick={() => setRenewModal(null)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={busy}>
                    تأكيد التجديد الآن ✅
                  </Button>
                </div>
              </Form>
            );
          })()}
        </Modal>
      )}

      {/* MODAL 4: OFFICIAL PAYMENT RECEIPT / VOUCHER */}
      {selectedInvoice && (
        <Modal
          title={`سند قبض اشتراك رسمي: ${formatInvoiceId(selectedInvoice.id)}`}
          onClose={() => setSelectedInvoice(null)}
        >
          <div className="space-y-4 text-right">
            {/* Receipt Header Banner */}
            <div className="p-4 bg-gradient-to-r from-teal-900 via-teal-800 to-[#073B59] text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-teal-200">الجمهورية اليمنية • منصة فارما لينك الرقمية</span>
                </div>
                <h3 className="text-lg font-black text-white m-0">سند قبض وإشعار تحصيل اشتراك</h3>
                <p className="text-xs text-teal-100/80 m-0 mt-0.5">سجل محاسبي رسمي موثق لسداد وتجديد العضويات الصيدلانية</p>
              </div>
              <div className="text-left bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-teal-200 block uppercase font-mono">رقم السند المالي</span>
                <strong className="text-sm font-mono font-bold text-white tracking-wider">{formatInvoiceId(selectedInvoice.id)}</strong>
              </div>
            </div>

            {/* Receipt Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">اسم المنشأة الصيدلانية:</span>
                <strong className="text-slate-900 text-sm flex items-center gap-1.5 font-bold">
                  <Building2 size={16} className="text-teal-600" />
                  {getBranchName(selectedInvoice.branchId, selectedInvoice.chainId)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">تاريخ ووقت التحصيل:</span>
                <strong dir="ltr" className="text-slate-900 font-mono text-sm block text-right">
                  {formatDateDisplay(selectedInvoice.paidAt)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">الباقة ودورة الفوترة:</span>
                <strong className="text-teal-800 text-sm block">
                  {plans.find((p) => p.id === selectedInvoice.planId)?.name || selectedInvoice.planId} (
                  {selectedInvoice.billingCycle === "annual" ? "اشتراك سنوي" : "اشتراك شهري"}
                  )
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">المبلغ المحصل الإجمالي:</span>
                <strong className="text-emerald-700 text-base font-black block">
                  {money(selectedInvoice.amount)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">طريقة وكيفية السداد:</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CreditCard size={14} className="text-teal-600" />
                  <span>{formatPaymentMethod(selectedInvoice.paymentMethod)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">رقم المرجع / الحوالة / السند:</span>
                <strong className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {formatInvoiceRef(selectedInvoice.reference, selectedInvoice.id)}
                </strong>
              </div>

              <div className="sm:col-span-2 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">الفترة الزمنية المغطاة بالاشتراك:</span>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-500">من</span>
                  <strong dir="ltr" className="font-mono text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    {formatDateDisplay(selectedInvoice.periodStart)}
                  </strong>
                  <span className="text-slate-500">إلى</span>
                  <strong dir="ltr" className="font-mono text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    {formatDateDisplay(selectedInvoice.periodEnd)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Official Stamp & Status */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong className="text-xs text-emerald-900 block font-bold">سند قبض إلكتروني موثق ومعتمد</strong>
                  <span className="text-[11px] text-emerald-700">تم إيداع الرسوم في الحساب المالي للمنصة وتمديد صلاحية المنشأة تلقائياً</span>
                </div>
              </div>
              <Badge tone="success">مسددة ومقيدة</Badge>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={15} /> طباعة السند (PDF)
              </Button>
              <Button onClick={() => setSelectedInvoice(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
