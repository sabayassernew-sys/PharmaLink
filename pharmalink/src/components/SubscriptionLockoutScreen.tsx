import { useState } from "react";
import { Lock, Copy, Check, MessageSquare, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { PricingCards } from "./PricingCards";
import { Button, Modal } from "./UI";

export interface SubscriptionLockoutScreenProps {
  pharmacyName?: string;
  isBranch?: boolean;
  chainName?: string;
  isNewAccount?: boolean;
  onSelectPlan?: (planId: string, billingCycle: "monthly" | "annual") => void;
  onNavigateToSubscriptions?: () => void;
  onActivateTrial?: () => void;
}

export function SubscriptionLockoutScreen({
  pharmacyName = "المنشأة الصيدلانية",
  isBranch = false,
  chainName,
  isNewAccount = false,
  onSelectPlan,
  onNavigateToSubscriptions,
  onActivateTrial,
}: SubscriptionLockoutScreenProps) {
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<{
    planId: string;
    cycle: "monthly" | "annual";
  } | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(key);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 text-right max-w-6xl mx-auto animate-fade-in">
      {/* 1. Header Banner */}
      <div
        className={`w-full ${
          isNewAccount
            ? "bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-300"
            : "bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-300"
        } rounded-3xl p-6 sm:p-8 mb-8 shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div
            className={`w-16 h-16 rounded-2xl ${
              isNewAccount
                ? "bg-teal-700 shadow-teal-500/20"
                : "bg-red-600 shadow-red-500/20"
            } text-white flex items-center justify-center shrink-0 shadow-lg`}
          >
            {isNewAccount ? <Sparkles size={32} /> : <Lock size={32} />}
          </div>

          <div className="flex-1 text-center sm:text-right">
            <div
              className={`inline-flex items-center gap-2 ${
                isNewAccount
                  ? "bg-teal-100 text-teal-800"
                  : "bg-red-100 text-red-800"
              } text-xs font-black px-3 py-1 rounded-full mb-2`}
            >
              {isNewAccount ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>تم اعتماد وتوثيق المنشأة بنجاح 🎉</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} />
                  <span>
                    {isBranch
                      ? "فرع موقوف لانتهاء اشتراك السلسلة المركزية"
                      : "حساب موقوف لعدم سداد الاشتراك"}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 m-0 mb-2">
              {isNewAccount
                ? `مرحباً بك في فارما لينك! تم اعتماد حساب ${pharmacyName}`
                : isBranch
                  ? `تم إيقاف فرع ${pharmacyName} التابع لـ (${chainName || "إدارة السلسلة"})`
                  : `تم إيقاف حساب ${pharmacyName} بالكامل`}
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed max-w-3xl m-0">
              {isNewAccount ? (
                <>
                  يسر إدارة المنصة إبلاغكم بأنه قد تم قبول وتوثيق منشأتكم الصيدلانية رسمياً.{" "}
                  <strong className="text-teal-800">
                    لتفعيل مساحة العمل الخاصة بكم ومباشرة إدارة المخزون وبورصة التداول، يرجى اختيار باقة الاشتراك المناسبة لمنشأتكم أدناه (يمكنكم أيضاً البدء بالتجربة المجانية لمدة 14 يوماً).
                  </strong>
                </>
              ) : isBranch ? (
                <>
                  انتهت صلاحية باقة سلاسل الصيدليات المركزية للإدارة العامة ولم يتم تجديدها بعد. وفقاً لسياسة المنصة،{" "}
                  <strong className="text-red-700">
                    تم تجميد كافة عمليات الفرع والمناقلات الداخلية لحين قيام الإدارة المركزية للسلسلة بسداد وتجديد الاشتراك.
                  </strong>
                </>
              ) : (
                <>
                  انتهت فترة الاشتراك المحددة بالعداد التنازلي ولم يتم سداد رسوم التجديد الدوري. وفقاً لسياسة المنصة،{" "}
                  <strong className="text-red-700">
                    تم تجميد كافة العمليات التشغيلية (المناقلات الداخلية بين الفروع، البيع والشراء في البورصة، رادار الأدوية، وحركات المخزون).
                  </strong>
                </>
              )}
            </p>
            {isNewAccount && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {onActivateTrial && (
                  <Button
                    onClick={onActivateTrial}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                  >
                    <Sparkles size={18} />
                    <span>تفعيل التجربة المجانية الفورية (14 يوماً مجاناً)</span>
                  </Button>
                )}
                {onNavigateToSubscriptions && (
                  <Button
                    variant="secondary"
                    onClick={onNavigateToSubscriptions}
                    className="text-xs font-bold"
                  >
                    استعراض تفاصيل الباقات والاشتراكات
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Details & Payment Instructions */}
        <div
          className={`mt-6 pt-6 ${
            isNewAccount ? "border-t border-teal-200/80" : "border-t border-red-200/80"
          } grid grid-cols-1 md:grid-cols-2 gap-4`}
        >
          {/* Kuraimi Account */}
          <div
            className={`bg-white p-4 rounded-2xl border ${
              isNewAccount ? "border-teal-200" : "border-red-200"
            } flex items-center justify-between gap-3 shadow-xs`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">
                الحساب المعتمد (بنك الكريمي للتمويل الأصغر الإسلامي):
              </span>
              <strong className="text-base font-black text-slate-800 block mt-0.5">
                300-1928475
              </strong>
              <small className="text-[11px] text-teal-700 font-medium">
                باسم: منصة فارما لينك — شبكة التبادل الدوائي
              </small>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("3001928475", "kuraimi")}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer border border-slate-200"
              title="نسخ رقم الحساب"
            >
              {copiedBank === "kuraimi" ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {/* WhatsApp Direct Support */}
          <div
            className={`bg-white p-4 rounded-2xl border ${
              isNewAccount ? "border-teal-200" : "border-red-200"
            } flex items-center justify-between gap-3 shadow-xs`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">
                إرسال سند التحويل للتفعيل الفوري (واتساب الإدارة):
              </span>
              <strong className="text-base font-black text-emerald-700 block mt-0.5">
                +967 777 000 111
              </strong>
              <small className="text-[11px] text-slate-500 font-medium">
                تفعيل الحساب خلال 5 دقائق من استلام الإشعار
              </small>
            </div>
            <a
              href="https://wa.me/967777000111"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer border border-emerald-200"
              title="محادثة واتساب"
            >
              <MessageSquare size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Plan Choice Section */}
      {!isBranch ? (
        <div className="w-full">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 m-0">
              {isNewAccount
                ? "اختر باقة الاشتراك المناسبة لبدء العمل في المنصة"
                : "اختر باقتك لاستعادة وتفعيل الحساب فوراً"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isNewAccount
                ? "حدد الباقة المناسبة لصيدليتك لبدء التبادل الدوائي وإدارة المخزون، أو ابدأ بالتجربة المجانية."
                : "حدد الباقة المناسبة لصيدليتك وسيتم رفع الإيقاف واستئناف المناقلات والتداول بمجرد تأكيد السداد."}
            </p>
          </div>

          <PricingCards
            targetRole={isBranch ? "agency_branch" : chainName ? "agency_master" : "independent"}
            onSelectPlan={(planId, cycle) => {
              if (onSelectPlan) {
                onSelectPlan(planId, cycle);
              } else {
                setSelectedPlanDetail({ planId, cycle });
              }
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <h3 className="text-base font-bold text-amber-900 mb-2">
            تنبيه إداري لمسؤول الفرع
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed mb-4">
            سداد وتجديد الاشتراكات محصور بالإدارة العامة للسلسلة. تم إرسال إشعار آلي لمدير السلسلة، ويمكنك التواصل مع إدارة المجموعة هاتفياً أو عبر واتساب للاستفسار عن موعد التجديد.
          </p>
          <a
            href="https://wa.me/967777000111"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors"
          >
            <MessageSquare size={14} />
            <span>تواصل مع دعم المنصة عبر واتساب</span>
          </a>
        </div>
      )}

      {/* Selected Plan Details Modal */}
      {selectedPlanDetail && (
        <Modal
          title="تأكيد اختيار الباقة وإجراءات السداد"
          onClose={() => setSelectedPlanDetail(null)}
        >
          <div className="text-right space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              لقد اخترت سداد <strong>{selectedPlanDetail.planId === "plan_pro" ? "الباقة الاحترافية" : selectedPlanDetail.planId === "plan_chains" ? "باقة سلاسل الصيدليات" : "الباقة الأساسية"}</strong> بنظام السداد <strong>{selectedPlanDetail.cycle === "annual" ? "السنوي" : "الشهري"}</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
              <strong className="text-teal-900 block mb-1">
                خطوات إعادة التفعيل:
              </strong>
              <ol className="text-xs text-teal-800 space-y-1.5 list-decimal list-inside m-0">
                <li>قم بتحويل رسوم الباقة إلى رقم حساب الكريمي: <strong>300-1928475</strong></li>
                <li>أرسل صورة سند الإيداع عبر واتساب الإدارة: <strong>777 000 111</strong></li>
                <li>يقوم مدير المنصة بمطابقة السند وتفعيل حسابك فوراً ليبدأ العداد الجديد.</li>
              </ol>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setSelectedPlanDetail(null)}>
                إغلاق
              </Button>
              {onNavigateToSubscriptions && (
                <Button onClick={() => {
                  setSelectedPlanDetail(null);
                  onNavigateToSubscriptions();
                }}>
                  الانتقال لصفحة الاشتراكات
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
