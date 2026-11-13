import { Clock, AlertTriangle, Lock, ArrowLeft, Sparkles, Building2 } from "lucide-react";

export interface SubscriptionCountdownBannerProps {
  daysLeft: number;
  planName?: string;
  isTrial?: boolean;
  isBranch?: boolean;
  chainName?: string;
  onOpenPlans: () => void;
}

export function SubscriptionCountdownBanner({
  daysLeft,
  planName = "باقة سلاسل الصيدليات",
  isTrial = false,
  isBranch = false,
  chainName,
  onOpenPlans,
}: SubscriptionCountdownBannerProps) {
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 5;

  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-right">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <strong className="text-xs sm:text-sm font-black block">
              🔒 عفواً، تم إيقاف العمليات لانتهاء اشتراك {isBranch ? `إدارة السلسلة (${chainName || "المركز الرئيسي"})` : "المنشأة"}
            </strong>
            <span className="text-[11px] text-white/90">
              {isBranch
                ? "تم تجميد المناقلات والعمليات للفرع حتى تقوم الإدارة المركزية للسلسلة بسداد وتجديد الباقة."
                : "تم تجميد كافة العمليات التشغيلية والمناقلات الداخلية والتداول لعدم السداد في الموعد المحدد."}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPlans}
          className="bg-white text-red-700 hover:bg-red-50 text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{isBranch ? "بيانات تواصل الإدارة والسداد" : "سداد وتفعيل الحساب فوراً"}</span>
          <ArrowLeft size={13} />
        </button>
      </div>
    );
  }

  if (isUrgent) {
    return (
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-right animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <div>
            <strong className="text-xs sm:text-sm font-black block">
              ⚠️ تنبيه أمني عاجل: متبقي {daysLeft === 0 ? "أقل من 24 ساعة" : `${daysLeft} أيام`} فقط على انتهاء اشتراك {isBranch ? "السلسلة" : "المنشأة"}!
            </strong>
            <span className="text-[11px] text-white/90">
              {isBranch
                ? "يُرجى إشعار الإدارة المركزية بالسداد لتفادي توقف المناقلات بين الفروع."
                : "لتفادي الإيقاف الفوري لكافة المناقلات الداخلية والعمليات، يُرجى تجديد اشتراكك الآن."}
            </span>
          </div>
        </div>

        {!isBranch && (
          <button
            type="button"
            onClick={onOpenPlans}
            className="bg-white text-amber-800 hover:bg-amber-50 text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>تجديد الاشتراك مقدماً</span>
            <ArrowLeft size={13} />
          </button>
        )}
      </div>
    );
  }

  // Normal active state
  return (
    <div className="bg-gradient-to-r from-[#073B59] via-[#0b4d74] to-[#00ADB5] text-white px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-3 text-right">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          {isBranch ? <Building2 size={14} className="text-teal-300" /> : <Clock size={14} className="text-teal-300" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white/90">
            {isBranch ? `فرع تابع لـ (${chainName || "السلسلة"}) • ${planName}` : isTrial ? "الفترة التجريبية المجانية" : planName}:
          </span>
          <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles size={11} className="text-amber-300" />
            متبقي {daysLeft} يوماً {isBranch ? "(مغطى مركزياً من الإدارة)" : "على التجديد"}
          </span>
          <span className="text-[11px] text-white/70 hidden sm:inline">
            {/* • المناقلات الداخلية والعمليات مفعلة بالكامل */}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPlans}
        className="text-[11px] font-bold text-teal-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
      >
        <span>{isBranch ? "معلومات اشتراك السلسلة" : "عرض الباقات وإدارة الاشتراك"}</span>
        <ArrowLeft size={12} />
      </button>
    </div>
  );
}
