import { Sparkles, X, Gift, CheckCircle2 } from "lucide-react";
import { PricingCards } from "./PricingCards";
import { Button } from "./UI";

export interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string, billingCycle: "monthly" | "annual") => void;
  onActivateTrial?: () => void;
  pharmacyName?: string;
  targetRole?: string;
}

export function WelcomeOnboardingModal({
  isOpen,
  onClose,
  onSelectPlan,
  onActivateTrial,
  pharmacyName = "منشأتك الصيدلانية",
  targetRole,
}: WelcomeOnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/75 backdrop-blur-xs animate-fade-in text-right select-none">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* 1. Header (Ultra-compact ~65px) */}
        <div className="relative bg-gradient-to-r from-[#073B59] via-[#0b4d74] to-[#00ADB5] px-6 py-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black m-0 leading-tight">
                  أهلاً بك يا {pharmacyName} في فارما لينك
                </h2>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.2 rounded-full">
                  عضوية جديدة
                </span>
              </div>
              <p className="text-white/80 text-[11px] m-0 mt-0.5">
                المنصة الوطنية الأولى لتنظيم التبادل الدوائي وتدوير الفائض وتأمين النواقص.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Highlighted 14-Day Free Trial Spotlight Strip (~36px) */}
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-6 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <Gift size={16} className="text-emerald-600 shrink-0" />
            <span>
              عرض الانضمام: <strong>فترة تجريبية مجانية لمدة 14 يوماً</strong> بكامل ميزات الباقة الاحترافية دون أي دفع مسبق!
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-bold hidden sm:inline">
            14 يوماً تجربة كاملة الصلاحيات
          </span>
        </div>

        {/* 3. Cards Body (Compact, Fits 100% Without Any Scroll ~310px) */}
        <div className="px-6 py-4 bg-slate-50/60 overflow-hidden">
          <PricingCards
            compact={true}
            targetRole={targetRole}
            onSelectPlan={(planId, cycle) => {
              onSelectPlan(planId, cycle);
            }}
          />
        </div>

        {/* 4. Footer Actions (~50px) */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-teal-600" />
            <span>يمكنك تغيير باقتك أو السداد في أي وقت خلال أو بعد التجربة.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} className="text-xs py-1.5 px-3">
              تصفح المنصة الآن
            </Button>

            {onActivateTrial && (
              <button
                type="button"
                onClick={onActivateTrial}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Gift size={14} />
                <span>بدء التجربة المجانية (14 يوماً مجاناً)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
