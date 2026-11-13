import { useState } from "react";
import { Check, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import { money } from "./UI";

export interface PricingCardsProps {
  currentPlanId?: string;
  onSelectPlan?: (planId: string, billingCycle: "monthly" | "annual") => void;
  compact?: boolean;
  targetRole?: "independent" | "agency_master" | "agency_branch" | "admin" | string;
}

export function PricingCards({
  currentPlanId,
  onSelectPlan,
  compact = false,
  targetRole,
}: PricingCardsProps) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");

  const plans = [
    {
      id: "plan_basic",
      name: "باقة الصيدلية المستقلة - الأساسية",
      englishName: "Basic Starter",
      badge: "الأساسية",
      monthlyPrice: 10000,
      annualPrice: 100000,
      description: "مخصصة للصيدليات الفردية الراغبة في تسييل الركود ومتابعة النواقص.",
      features: [
        "تداول غير محدود في البورصة الدوائية",
        "رادار الأدوية الذكي حتى 5 أصناف متزامنة",
        "إدارة المخزون والتنبيهات المبكرة للصلاحية",
        "إشعارات تلقائية عبر النظام",
        "دعم فني قياسي خلال ساعات العمل",
      ],
      highlighted: false,
      accentColor: "border-slate-200 hover:border-slate-300",
      btnVariant: "secondary" as const,
    },
    {
      id: "plan_pro",
      name: "الباقة الاحترافية الشاملة",
      englishName: "Professional Pro",
      badge: "⭐ الأكثر طلباً",
      monthlyPrice: 20000,
      annualPrice: 200000,
      description: "الحل المتكامل للصيدليات النشطة: رادار متقدم، وأولوية ظهور، وتقارير احترافية.",
      features: [
        "كل مميزات الباقة الأساسية",
        "رادار أدوية متقدم وغير محدود",
        "شارة «صيدلية نموذجية موثقة» في البورصة",
        "أولوية ظهور العروض في محرك البحث",
        "إدارة كاملة لمرتجعات الموردين والمهل القانونية",
        "دعم فني واستشاري ذو أولوية",
      ],
      highlighted: true,
      accentColor: "border-teal-500 ring-2 ring-teal-500/20 shadow-lg",
      btnVariant: "primary" as const,
    },
    {
      id: "plan_chains",
      name: "باقة السلاسل والمجموعات الطبية",
      englishName: "Chains & Enterprise",
      badge: "للمجموعات",
      monthlyPrice: 45000,
      annualPrice: 450000,
      description: "مصممة للشركات وسلاسل الصيدليات المتعددة الفروع مع ربط مركزي متقدم.",
      features: [
        "إدارة مركزية غير محدودة للفروع والتفويض",
        "المناقلات الداخلية الفورية بين الفروع الشقيقة",
        "لوحة مؤشرات مالية ورقابية موحدة للإدارة",
        "ربط وتوحيد المخازن المركزية",
        "مدير حساب مالي مخصص ودعم هاتفي مباشر",
      ],
      highlighted: false,
      accentColor: "border-blue-300 hover:border-blue-400",
      btnVariant: "secondary" as const,
    },
  ];

  const visiblePlans = plans.filter((p) => {
    if (targetRole === "independent") {
      return p.id !== "plan_chains";
    }
    if (targetRole === "agency_master") {
      return p.id === "plan_chains";
    }
    return true;
  });

  return (
    <div className="w-full text-right">
      {/* 1. Billing Cycle Toggle */}
      <div className={`flex items-center justify-center ${compact ? "mb-3" : "mb-8"}`}>
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              cycle === "monthly"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            سداد شهري
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              cycle === "annual"
                ? "bg-[#073B59] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>سداد سنوي</span>
            <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
              وفر شهرين 🎁
            </span>
          </button>
        </div>
      </div>

      {/* 2. Cards Grid */}
      <div
        className={`grid grid-cols-1 ${
          visiblePlans.length === 1
            ? "max-w-md mx-auto"
            : visiblePlans.length === 2
            ? "md:grid-cols-2 max-w-3xl mx-auto"
            : "md:grid-cols-3"
        } ${compact ? "gap-3" : "gap-6"} items-stretch`}
      >
        {visiblePlans.map((p) => {
          const isCurrent = currentPlanId === p.id;
          const price = cycle === "annual" ? p.annualPrice : p.monthlyPrice;
          const periodText = cycle === "annual" ? "سنوياً" : "شهرياً";
          const featuresToShow = compact ? p.features.slice(0, 3) : p.features;

          return (
            <div
              key={p.id}
              className={`relative bg-white rounded-2xl flex flex-col justify-between border transition-all duration-200 ${
                compact ? "p-3.5" : "p-6 hover:-translate-y-1"
              } ${p.accentColor} ${p.highlighted ? "bg-gradient-to-b from-white to-teal-50/20" : ""}`}
            >
              {/* Highlighted Ribbon */}
              {p.highlighted && (
                <div
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black rounded-full shadow-sm flex items-center gap-1 ${
                    compact ? "text-[10px] px-2.5 py-0.5" : "text-xs px-4 py-1"
                  }`}
                >
                  <Sparkles size={compact ? 11 : 13} />
                  <span>{p.badge}</span>
                </div>
              )}

              <div>
                {/* Header info */}
                <div className={compact ? "mb-2" : "mb-4"}>
                  {!p.highlighted && (
                    <span
                      className={`inline-block bg-slate-100 text-slate-600 font-bold rounded-md ${
                        compact ? "text-[10px] px-1.5 py-0.5 mb-1" : "text-[11px] px-2.5 py-1 mb-2"
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                  <h3 className={`${compact ? "text-sm" : "text-xl"} font-black text-slate-800 m-0`}>
                    {p.name}
                  </h3>
                  <p className={`text-slate-500 line-clamp-1 leading-snug m-0 ${compact ? "text-[11px] mt-0.5" : "text-xs mt-2"}`}>
                    {p.description}
                  </p>
                </div>

                {/* Price */}
                <div
                  className={`rounded-xl bg-slate-50/90 border border-slate-100 text-center ${
                    compact ? "py-1.5 px-2 my-2" : "my-6 p-4"
                  }`}
                >
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`${compact ? "text-lg" : "text-3xl"} font-black text-[#073B59]`}>
                      {money(price)}
                    </span>
                    <span className={`font-bold text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>
                      / {periodText}
                    </span>
                  </div>
                  {cycle === "annual" && (
                    <small
                      className={`text-emerald-600 font-bold block ${
                        compact ? "text-[9px]" : "text-[11px] mt-1"
                      }`}
                    >
                      ما يعادل {money(Math.round(p.annualPrice / 12))} شهرياً
                    </small>
                  )}
                </div>

                {/* Features list */}
                <div className={`${compact ? "space-y-1 mb-3" : "space-y-3 mb-6"}`}>
                  {featuresToShow.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-1.5 text-slate-700 leading-snug ${
                        compact ? "text-[11px]" : "text-xs"
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5 border border-teal-200">
                        <Check size={9} strokeWidth={3} />
                      </div>
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className={`border-t border-slate-100 ${compact ? "pt-2" : "pt-4"}`}>
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className={`w-full rounded-xl font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default flex items-center justify-center gap-1 ${
                      compact ? "py-1.5 px-2 text-[11px]" : "py-3 px-4 text-xs"
                    }`}
                  >
                    <ShieldCheck size={14} />
                    <span>باقتك الحالية</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectPlan && onSelectPlan(p.id, cycle)}
                    className={`w-full rounded-xl font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      compact ? "py-1.5 px-2 text-[11px]" : "py-3 px-4 text-xs"
                    } ${
                      p.highlighted
                        ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        : "bg-[#073B59] hover:bg-[#062f47] text-white"
                    }`}
                  >
                    <span>اختيار الباقة</span>
                    <ArrowLeft size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
