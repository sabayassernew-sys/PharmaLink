import { useState, useEffect } from "react";
import {
  LogIn,
  ArrowUpLeft,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  ScanSearch,
  Clock,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sparkles,
  Lock,
  Send,
  Headphones,
} from "lucide-react";
import { useApp } from "../context";
import { isAccountSuspended, isLicenseExpired } from "../domain/access";
import { Button, Field, Form, Modal } from "../components/UI";

export function Home({
  navigate,
  onOpenLogin,
}: {
  navigate: (s: string) => void;
  onOpenLogin?: () => void;
}) {
  const { state, actor, run, busy, notify } = useApp();
  const [register, setRegister] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [inquiryModal, setInquiryModal] = useState(false);
  const [facilityType, setFacilityType] = useState<
    "independent" | "agency_master" | "agency_branch"
  >(actor.facilityType || "independent");
  const [selectedChainId, setSelectedChainId] = useState<string>(
    actor.chainId || state.chains[0]?.id || "",
  );

  useEffect(() => {
    const fn = () => setRegister(true);
    window.addEventListener("pharmalink-open-register", fn);
    return () => window.removeEventListener("pharmalink-open-register", fn);
  }, []);

  const suspended = isAccountSuspended(actor);
  const licenseExpired = isLicenseExpired(actor);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const faqs = [
    {
      q: "هل يُسمح للأفراد أو المستهلكين العاديين بالشراء عبر فارما لينك؟",
      a: "غير مسموح نهائياً. فارما لينك هي منصة أعمال مغلقة B2B مصممة حصراً للمنشآت الصيدلانية المرخصة (الصيدليات المستقلة، سلاسل الصيدليات، ومستودعات التوزيع المعتمدة). لا يُتاح لأي فرد تسجيل حساب أو الشراء دون تقديم تراخيص مزاولة المهنة والسجل التجاري المعمول به.",
    },
    {
      q: "كيف تضمن المنصة سلامة وتراخيص الأدوية والتشغيلات المعروضة؟",
      a: "تخضع كل منشأة لتدقيق بشري وإداري إلزامي للوثائق والتراخيص (KYC). وتُلزم المنصة البائع بتسجيل أرقام التشغيلات (Batch Number) الموثقة وتواريخ الصلاحية وسعر البيع الرسمي، مع منع تداول أي مستحضر تقل صلاحيته عن 30 يوماً أو موقوف رقابياً.",
    },
    {
      q: "ما هي سياسة المنصة تجاه الأدوية المبردة (Cold-Chain) والمحظورة؟",
      a: "التزاماً بمعايير الجودة الصيدلانية وحماية المرضى، يُحظر تداول الأدوية المبردة (2-8 درجات مئوية) أو الأدوية الخاضعة للرقابة المخدرة والمؤثرات العقلية على المنصة، تفادياً لمخاطر انكسار سلسلة التبريد وسوء التخزين أثناء النقل والشحن العادي.",
    },
    {
      q: "كيف تخدم المنصة سلاسل الصيدليات ذات الفروع المتعددة؟",
      a: "توفر فارما لينك اشتراكاً مخصصاً للسلاسل (Agency Master) يمنح الإدارة المركزية صلاحية ربط جميع الفروع في منظومة واحدة، ومتابعة المخزون اللحظي لكل فرع، وإجراء مناقلات داخلية سلسة لسد النواقص ذاتياً بين الفروع دون تكبد نفقات شراء مزدوجة.",
    },
    {
      q: "كيف تحتسب المنصة مهل مرتجعات الموردين (Supplier Returns)؟",
      a: "تعتمد المنصة محركاً حسابياً ذكياً يربط كل تشغيلة دوائية بتاريخ الشراء وسياسة الإرجاع المعتمدة لدى المورد؛ مما يرسل تنبيهات مبكرة للصيدلي بانتهاء مهلة الإرجاع قبل فوات الأوان، لتسهيل استرداد كامل قيمة الدواء بدلاً من تكبده كخسارة راكدة.",
    },
  ];

  return (
    <div className="landing-wrapper">
      {/* Hero Section */}
      <section className="landing-hero-card">
        <div className="landing-hero-badge">
          <ShieldCheck size={16} />
          <span>شبكة B2B الموثقة والآمنة للمنشآت الصيدلانية</span>
        </div>

        <h1 className="landing-hero-title">
          قيمة دوائك،
          <br />
          <span>تستحق فرصة أخرى.</span>
        </h1>

        <p className="landing-hero-subtitle">
          المنظومة الصيدلانية الأولى لإدارة الرواكد والتبادل الدوائي الآمن؛ نجمع بين ضبط المخزون،
          ورصد مهل مرتجعات الموردين، وتبادل الفائض والنواقص بين المنشآت المعتمدة لتحويل المخزون الراكد
          إلى سيولة نقدية.
        </p>

        <div className="landing-hero-actions">
          {actor.role === "guest" ? (
            <>
              {onOpenLogin && (
                <Button onClick={onOpenLogin}>
                  <LogIn size={18} />
                  تسجيل الدخول
                </Button>
              )}
              <Button
                variant={onOpenLogin ? "secondary" : "primary"}
                onClick={() => setRegister(true)}
              >
                <ArrowUpLeft size={18} />
                طلب تسجيل منشأة (KYC)
              </Button>
            </>
          ) : (
            <Button
              disabled={suspended || actor.role === "pending"}
              onClick={() => navigate("dashboard")}
            >
              {actor.role === "pending"
                ? "الطلب قيد مراجعة وتدقيق الإدارة"
                : suspended
                  ? "الحساب موقوف حالياً"
                  : "الدخول لمساحة العمل"}
              <ArrowUpLeft size={18} />
            </Button>
          )}

          <Button variant="secondary" onClick={() => scrollTo("how-it-works")}>
            <Sparkles size={17} />
            كيف تعمل المنصة؟
          </Button>

          <Button variant="secondary" onClick={() => scrollTo("support")}>
            <Headphones size={17} />
            الدعم الفني والاستفسارات
          </Button>

          <Button variant="secondary" onClick={() => navigate("brand")}>
            هوية المنصة
          </Button>
        </div>

        {/* Visual Identity / Platform Showcase */}
        <div className="landing-logo">
          <img src="./brand/identity.png" alt="هوية فارما لينك الرسمية" />
        </div>

        {/* Trust Badges Strip */}
        <div className="landing-trust-strip">
          <div className="landing-trust-item">
            <div className="landing-trust-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>منشآت مرخصة 100%</strong>
              <small>تحقق رسمي إلزامي من التراخيص والسجل</small>
            </div>
          </div>

          <div className="landing-trust-item">
            <div className="landing-trust-icon">
              <ScanSearch size={20} />
            </div>
            <div>
              <strong>رادار النواقص اللحظي</strong>
              <small>تأمين أدوية المرضى من الصيدليات المجاورة</small>
            </div>
          </div>

          <div className="landing-trust-item">
            <div className="landing-trust-icon">
              <Clock size={20} />
            </div>
            <div>
              <strong>حاسبة مهل الموردين</strong>
              <small>تنبيهات استباقية قبل فوات مهلة الاسترجاع</small>
            </div>
          </div>

          <div className="landing-trust-item">
            <div className="landing-trust-icon">
              <Building2 size={20} />
            </div>
            <div>
              <strong>مناقلات السلاسل المركزية</strong>
              <small>إعادة توزيع الفائض وتفادي الشراء المزدوج</small>
            </div>
          </div>
        </div>
      </section>

      {/* Account Status Notices */}
      {actor.suspended && (
        <div className="notice danger mt-5">
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <strong>تم تجميد هذا الحساب لمخالفة مهنية:</strong>{" "}
            {actor.suspensionReason || "يرجى مراجعة إدارة المنصة لرفع التجميد."}
            <p className="text-xs text-red-600 mt-1">
              تم إيقاف صلاحيات التداول والمناقلات وإدارة المخزون وفق لوائح الامتثال.
            </p>
          </div>
        </div>
      )}

      {!actor.suspended && licenseExpired && (
        <div className="notice danger mt-5">
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <strong>انتهت صلاحية ترخيص المنشأة ({actor.license || "—"}):</strong>{" "}
            انتهت الصلاحية بتاريخ {actor.licenseExpiry}. تم إيقاف الحساب آلياً حتى تجديد الترخيص مع الإدارة.
          </div>
        </div>
      )}

      {actor.role === "pending" && !actor.rejection && (
        <div className="notice mt-5 bg-teal-50/70 border border-teal-200 p-4 rounded-2xl flex items-start gap-3">
          <ShieldCheck size={22} className="text-teal-700 shrink-0 mt-0.5" />
          <div className="text-right">
            <strong className="text-teal-900 block mb-0.5">
              طلب تسجيل المنشأة قيد المراجعة والتدقيق الإداري:
            </strong>
            <p className="text-xs text-teal-800 m-0 leading-relaxed">
              يجري حالياً فحص التراخيص والبيانات المرفقة من قبل إدارة المنصة قبل منح صلاحيات الدخول.
              فور اعتماد المنشأة وتوثيقها من الإدارة، سيُطلب منك اختيار باقة الاشتراك المناسبة أو تفعيل التجربة المجانية لتنشيط مساحة العمل ومباشرة التبادل الدوائي.
            </p>
          </div>
        </div>
      )}

      {actor.role === "pending" && actor.rejection && (
        <div className="notice danger mt-5 flex justify-between items-center">
          <div>
            <strong>لم يُعتمد طلب التسجيل:</strong> {actor.rejection}
          </div>
          <Button variant="secondary" onClick={() => setRegister(true)}>
            تصحيح بيانات المنشأة والتراخيص وإعادة التقديم
          </Button>
        </div>
      )}

      {/* Problem vs Solution Section */}
      <section className="landing-section" id="problem-solution">
        <div className="landing-section-header">
          <span className="landing-section-badge">لماذا فارما لينك؟ ولماذا الآن؟</span>
          <h2 className="landing-section-title">حل جذري لأكبر تحديات الصيدليات اليومية</h2>
          <p className="landing-section-desc">
            بين ركود الأدوية على الأرفف وصعوبة تأمين النواقص للمرضى، صُممت فارما لينك لتكون حلقة الوصل
            الذكية التي تحمي أرباح صيدليتك وتضمن استمرار دوران المخزون.
          </p>
        </div>

        <div className="landing-comparison-grid">
          <div className="landing-comparison-card problem">
            <div className="landing-comparison-title problem">
              <X size={22} />
              <span>الواقع التقليدي للصيدليات (المعاناة اليومية)</span>
            </div>
            <ul className="landing-comparison-list">
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-red-500">•</span>
                <span>
                  <strong>خسائر تواريخ الصلاحية:</strong> تكدس الأدوية بطيئة الحركة حتى تلفها، مما
                  يقتطع مباشرة من صافي أرباح الصيدلية ورأس مالها.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-red-500">•</span>
                <span>
                  <strong>فوات مهل مرتجعات الموردين:</strong> غياب نظام تنبيه آلي بمواعيد الإرجاع
                  المسموحة لدى كل شركة، مما يحرمك من استرداد قيمة الأدوية.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-red-500">•</span>
                <span>
                  <strong>فقدان مبيعات النواقص:</strong> اعتذار متكرر للمرضى عن أدوية غير متوفرة في
                  المستودع، رغم توفرها كفائض لدى صيدلية مجاورة.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-red-500">•</span>
                <span>
                  <strong>تشتت فروع السلسلة الواحدة:</strong> شراء صيدلية لفرع أصنافاً راكدة في فرع
                  آخر، مما يرفع تكلفة المخزون بلا مبرر.
                </span>
              </li>
            </ul>
          </div>

          <div className="landing-comparison-card solution">
            <div className="landing-comparison-title solution">
              <Check size={22} />
              <span>مع منظومة فارما لينك (الحلول الذكية)</span>
            </div>
            <ul className="landing-comparison-list">
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-teal-600">✓</span>
                <span>
                  <strong>تدوير فوري وسيولة سريعة:</strong> عرض الفائض في بورصة منظمة للمنشآت
                  الصيدلانية بخصومات عادلة قبل اقتراب موعد انتهاء الصلاحية.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-teal-600">✓</span>
                <span>
                  <strong>حاسبة استباقية لمرتجعات الموردين:</strong> تنبيهات مؤتمتة قبل انتهاء مهلة
                  الاسترجاع بوقت كافٍ لتجهيز وإرجاع الأصناف للمستودع.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-teal-600">✓</span>
                <span>
                  <strong>رادار النواقص الفوري:</strong> البحث الآلي وتأمين الدواء الناقص لمرضاك
                  خلال دقائق من الصيدليات المعتمدة في نفس المنطقة.
                </span>
              </li>
              <li className="landing-comparison-item">
                <span className="landing-comparison-icon text-teal-600">✓</span>
                <span>
                  <strong>مناقلات مركزية مؤتمتة:</strong> مسارات تحويل رقمية واضحة بين فروع السلسلة
                  مع سندات تسليم واستلام وتتبع دقيق للعهد.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section className="landing-section" id="features">
        <div className="landing-section-header">
          <span className="landing-section-badge">محاور النظام والحلول التقنية</span>
          <h2 className="landing-section-title">ركائز المنظومة الصيدلانية المتكاملة</h2>
          <p className="landing-section-desc">
            أدوات صُممت خصيصاً على يد صيادلة وخبراء في سلاسل الإمداد الطبي لتلبية احتياجات إدارة
            المخزون الدوائي والتداول المنظم.
          </p>
        </div>

        <div className="landing-pillars-grid">
          <div className="landing-pillar-card">
            <div className="landing-pillar-header">
              <div className="landing-pillar-icon">
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <h3>بورصة التبادل الدوائي B2B</h3>
                <small className="text-teal-700 font-semibold">تداول منظم بين الصيدليات المستقلة</small>
              </div>
            </div>
            <p>
              اعرض فائض صيدليتك مع تحديد الكميات والتشغيلات والخصم المقترح، أو تصفح عروض الصيدليات
              الأخرى لشراء احتياجاتك بأسعار تفضيلية تدعم ربحية منشأتك.
            </p>
            <div className="landing-pillar-tags">
              <span className="landing-pillar-tag">تسعير عادل</span>
              <span className="landing-pillar-tag">تأكيد حجز الصفقات</span>
              <span className="landing-pillar-tag">سندات تسليم رسمية</span>
            </div>
          </div>

          <div className="landing-pillar-card">
            <div className="landing-pillar-header">
              <div className="landing-pillar-icon">
                <ScanSearch size={24} />
              </div>
              <div>
                <h3>رادار الأدوية وتغطية النواقص</h3>
                <small className="text-teal-700 font-semibold">استجابة سريعة لطلبات المرضى</small>
              </div>
            </div>
            <p>
              ابحث فوراً بالاسم التجاري أو العلمي لأي دواء مفقود في السوق؛ حيث يبحث الرادار في مخزون
              الصيدليات المجاورة ليربطك مباشرة بالصيدلية التي تمتلك فائضاً منه.
            </p>
            <div className="landing-pillar-tags">
              <span className="landing-pillar-tag">مطابقة آلية</span>
              <span className="landing-pillar-tag">تنبيهات فورية</span>
              <span className="landing-pillar-tag">تغطية النواقص الحرجة</span>
            </div>
          </div>

          <div className="landing-pillar-card">
            <div className="landing-pillar-header">
              <div className="landing-pillar-icon">
                <Clock size={24} />
              </div>
              <div>
                <h3>حاسبة مهل مرتجعات الموردين</h3>
                <small className="text-teal-700 font-semibold">حماية استباقية لرأس المال</small>
              </div>
            </div>
            <p>
              تابع سياسات إرجاع كل مورد ومستودع بدقة؛ حيث يقوم النظام بجدولة تواريخ المهل القصوى
              لإرجاع الأدوية وتنبيه الصيدلي لاتخاذ قرار إرجاع الصنف قبل فوات الأوان.
            </p>
            <div className="landing-pillar-tags">
              <span className="landing-pillar-tag">تنبيهات المهل</span>
              <span className="landing-pillar-tag">ربط المورد بالتشغيلة</span>
              <span className="landing-pillar-tag">منع الهدر المالي</span>
            </div>
          </div>

          <div className="landing-pillar-card">
            <div className="landing-pillar-header">
              <div className="landing-pillar-icon">
                <Building2 size={24} />
              </div>
              <div>
                <h3>المناقلات الداخلية للسلاسل والفروع</h3>
                <small className="text-teal-700 font-semibold">إدارة مركزية موحدة للمجموعات</small>
              </div>
            </div>
            <p>
              لوحة تحكم للمجموعات وسلاسل الصيدليات؛ تمكن الإدارة من إدارة الصلاحيات ومناقلة الأدوية
              الراكدة بين الفروع بسلاسة مع تتبع حالات الشحن والاستلام ومطابقة الفروقات.
            </p>
            <div className="landing-pillar-tags">
              <span className="landing-pillar-tag">ربط متعدد الفروع</span>
              <span className="landing-pillar-tag">تفويض الصلاحيات</span>
              <span className="landing-pillar-tag">سجلات تدقيق كاملة</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (4 Steps) */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-header">
          <span className="landing-section-badge">بسيطة وسلسة وآمنة</span>
          <h2 className="landing-section-title">رحلة المنشأة الصيدلانية في 4 خطوات</h2>
          <p className="landing-section-desc">
            صممنا خطوات العمل لتكون سريعة ومنسجمة مع الروتين اليومي لإدارة الصيدلية دون تعقيد.
          </p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <div className="landing-step-number">1</div>
            <h4>التوثيق والاعتماد (KYC)</h4>
            <p>
              سجّل بيانات المنشأة والتراخيص الرسمية (ترخيص فتح الصيدلية، مزاولة المهنة، والسجل التجاري)
              للتحقق والتدقيق الإداري الفوري.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">2</div>
            <h4>مزامنة المخزون وتحديد المهل</h4>
            <p>
              استورد ملف مخزونك (Excel أو CSV) بنقرة واحدة؛ يقوم النظام بفحص التشغيلات وتواريخ الصلاحية
              وحساب مهل الموردين تلقائياً.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">3</div>
            <h4>نشر الفائض وتفعيل الرادار</h4>
            <p>
              حدد الأدوية الفائضة وحدد خصم البيع المقترح، أو أنشئ طلباً في رادار النواقص للبحث الآلي
              لدى الصيدليات الأخرى.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">4</div>
            <h4>التسليم والاستلام الآمن</h4>
            <p>
              أكّد الطلبات واستخرج سندات التسليم، وقم بمطابقة الشحنات المستلمة لتحديث الأرصدة
              والمخزون فوريّاً في النظام.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance and Regulatory Safety */}
      <div className="landing-compliance-box">
        <div className="landing-compliance-icon">
          <Lock size={32} />
        </div>
        <div className="landing-compliance-content">
          <h3>الامتثال الصيدلاني وحماية الممارسة المهنية</h3>
          <p>
            تلتزم فارما لينك بالأنظمة واللوائح الصحية الصيدلانية؛ لا يتم قبول أي تعاملات للأفراد أو لغير
            المرخصين، مع استبعاد كامل للأدوية المخدرة والمراقبة، واستبعاد الأدوية المبردة لحماية سلسلة
            التبريد وسلامة الدواء. جميع العمليات مسجلة بسجلات تدقيق إلكترونية واضحة (Audit Trail).
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ) */}
      <section className="landing-section" id="faq">
        <div className="landing-section-header">
          <span className="landing-section-badge">الأسئلة الأكثر تكراراً</span>
          <h2 className="landing-section-title">إجابات واضحة لكل ما يهم الصيدلي والمنشأة</h2>
          <p className="landing-section-desc">
            تعرف على تفاصيل التشغيل وسياسات التبادل والاشتراك في فارما لينك.
          </p>
        </div>

        <div className="landing-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`landing-faq-item ${isOpen ? "open" : ""}`}
              >
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-teal-600 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && <div className="landing-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Support & Care Section */}
      <section className="landing-section" id="support">
        <div className="landing-section-header">
          <span className="landing-section-badge">فريق المساعدة وخدمة العملاء</span>
          <h2 className="landing-section-title">دعم فني وصيدلاني متخصص في خدمتك</h2>
          <p className="landing-section-desc">
            فريقنا الصيدلاني والتقني متواجد لمساعدتك في ربط المخزون، توثيق الحساب، أو الإجابة على أي
            استفسار تشغيلي.
          </p>
        </div>

        <div className="landing-support-grid">
          <div className="landing-support-card">
            <div className="icon-wrap">
              <Phone size={24} />
            </div>
            <h4>الاتصال الهاتفي المباشر</h4>
            <p>متاح من السبت إلى الخميس (8 ص - 10 م)</p>
            <span className="contact-val">+966 11 400 9080</span>
          </div>

          <div className="landing-support-card">
            <div className="icon-wrap">
              <MessageSquare size={24} />
            </div>
            <h4>واتساب الدعم السريع</h4>
            <p>استفسارات التسجيل والربط الفوري</p>
            <span className="contact-val">+966 55 900 7060</span>
          </div>

          <div className="landing-support-card">
            <div className="icon-wrap">
              <Mail size={24} />
            </div>
            <h4>البريد الإلكتروني للتوثيق</h4>
            <p>مراجعة التراخيص والمراسلات الرسمية</p>
            <span className="contact-val">support@pharmalink.local</span>
          </div>
        </div>

        <div className="text-center mt-5">
          <Button variant="secondary" onClick={() => setInquiryModal(true)}>
            <Send size={16} />
            إرسال استفسار أو طلب مساعدة مباشرة
          </Button>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="landing-cta-banner">
        <h2>جاهز لتحويل الفائض الدوائي إلى سيولة وتأمين نواقص صيدليتك؟</h2>
        <p>
          انضم اليوم إلى شبكة الصيدليات المعتمدة وابدأ الاستفادة من حاسبة مهل الموردين وبورصة التبادل
          الدوائي مع فترة تجريبية مجانية متكاملة.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            disabled={suspended || actor.role === "pending"}
            onClick={() =>
              actor.role === "guest" ? setRegister(true) : navigate("dashboard")
            }
          >
            {actor.role === "guest" ? "ابدأ الآن وسجل منشأتك" : "الدخول لمساحة العمل"}
            <ArrowUpLeft size={18} />
          </Button>
          <Button
            variant="secondary"
            className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
            onClick={() => scrollTo("faq")}
          >
            استعراض الأسئلة الشائعة
          </Button>
        </div>
      </section>

      {/* Comprehensive Landing Page Footer */}
      <footer className="landing-rich-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <strong>فارما لينك · PharmaLink</strong>
            <small>منصة الأعمال والتبادل الدوائي الموثق</small>
            <p>
              المنظومة التقنية المتخصصة في تمكين الصيدليات وسلاسل الدواء من إدارة الرواكد وتدوير الفائض
              بأمان، وحساب مهل مرتجعات الموردين لحماية استدامة المنشآت الصيدلانية.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>روابط المنظومة</h4>
            <ul className="landing-footer-links">
              <li>
                <button type="button" onClick={() => scrollTo("problem-solution")}>
                  لماذا فارما لينك؟
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("features")}>
                  محاور المنصة وحلولها
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("how-it-works")}>
                  كيف تعمل المنصة؟
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("faq")}>
                  الأسئلة الشائعة
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("brand")}>
                  دليل الهوية البصرية
                </button>
              </li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>الامتثال والتوثيق</h4>
            <ul className="landing-footer-links">
              <li>
                <button type="button" onClick={() => setRegister(true)}>
                  تسجيل منشأة جديدة (KYC)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("support")}>
                  معايير التراخيص والاعتماد
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("support")}>
                  سياسة استبعاد الأدوية المبردة
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollTo("support")}>
                  حماية البيانات والسرية B2B
                </button>
              </li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>قنوات الدعم الفني</h4>
            <div className="landing-footer-contact-item">
              <Phone size={16} />
              <span dir="ltr">+966 11 400 9080</span>
            </div>
            <div className="landing-footer-contact-item">
              <MessageSquare size={16} />
              <span dir="ltr">+966 55 900 7060</span>
            </div>
            <div className="landing-footer-contact-item">
              <Mail size={16} />
              <span>support@pharmalink.local</span>
            </div>
            <div className="landing-footer-contact-item">
              <Clock size={16} />
              <span>السبت - الخميس (8:00 ص - 10:00 م)</span>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} فارما لينك (PharmaLink) — جميع الحقوق محفوظة للمنشآت
            الصيدلانية المعتمدة.
          </span>
          <span>النسخة المحلية 2.4.1 · بيئة تجريبية آمنة (B2B Closed Network)</span>
        </div>
      </footer>

      {/* Support Inquiry Modal */}
      {inquiryModal && (
        <Modal
          title="التواصل السريع مع فريق الدعم الفني والصيدلاني"
          onClose={() => setInquiryModal(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              notify("تم استلام استفسارك بنجاح! سيتواصل معك صيدلي الدعم الفني خلال لحظات.");
              setInquiryModal(false);
            }}
          >
            <div className="info-strip mb-4">
              <Headphones size={18} />
              <span>
                فريق الدعم الفني جاهز لمساعدتك في متطلبات التوثيق، استيراد ملف المخزون، أو أي استفسار
                عن المنظومة.
              </span>
            </div>

            <div className="grid gap-4">
              <Field name="senderName" label="اسم الصيدلي أو المنشأة" required defaultValue={actor.name} />
              <Field
                name="senderPhone"
                label="رقم الهاتف أو الواتساب للتواصل"
                placeholder="مثال: 05xxxxxxxx"
                required
              />
              <div className="field">
                <span>نوع الاستفسار أو الدعم المطلوب</span>
                <select name="topic" defaultValue="kyc">
                  <option value="kyc">استفسار عن توثيق المنشأة واعتماد التراخيص (KYC)</option>
                  <option value="import">مساعدة في استيراد ملف المخزون والتشغيلات</option>
                  <option value="returns">شرح حاسبة مهل مرتجعات الموردين</option>
                  <option value="chains">استفسار عن باقات واشتراكات سلاسل الصيدليات</option>
                  <option value="other">استفسار تشغيلي عام</option>
                </select>
              </div>
              <div className="field">
                <span>نص الاستفسار أو الملاحظة</span>
                <textarea
                  rows={4}
                  placeholder="اكتب استفسارك هنا وسيقوم الفريق بمراجعة التفاصيل والتواصل معك..."
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="secondary" onClick={() => setInquiryModal(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                <Send size={16} />
                إرسال الاستفسار
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Registration KYC Modal */}
      {register && (
        <Modal
          title={
            actor.rejection
              ? "تصحيح وإعادة تقديم طلب التسجيل"
              : "طلب تسجيل منشأة صيدلانية (KYC)"
          }
          onClose={() => setRegister(false)}
          wide
        >
          <Form
            onSubmit={async (f) => {
              const defaultExpiry = new Date();
              defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
              const expiryStr = String(
                f.get("licenseExpiry") || defaultExpiry.toISOString().slice(0, 10),
              );

              if (
                await run({
                  type: actor.rejection ? "resubmit" : "register",
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  password: String(f.get("password") || "123456"),
                  facilityType,
                  chainId: facilityType === "agency_branch" ? selectedChainId : undefined,
                  license: String(f.get("license")),
                  pharmacistName: String(f.get("pharmacistName") || ""),
                  practiceLicense: String(f.get("practiceLicense") || ""),
                  phone: String(f.get("phone") || ""),
                  city: String(f.get("city") || "صنعاء"),
                  address: String(f.get("address") || ""),
                  commercialRegister: String(f.get("commercialRegister") || ""),
                  taxNumber: String(f.get("taxNumber") || ""),
                  licenseExpiry: expiryStr,
                })
              ) {
                setRegister(false);
              }
            }}
          >
            <div className="info-strip mb-4">
              <ShieldCheck size={18} />
              <span>
                التحقق والامتثال: يخضع هذا الطلب لتدقيق مدير المنصة ومطابقة بيانات التراخيص الصيدلانية الرسمية قبل التفعيل.
              </span>
            </div>

            <div className="space-y-4">
              {/* القسم الأول: بيانات المنشأة وحساب الدخول */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2.5 pb-1 border-b border-slate-200">
                  1. بيانات المنشأة وحساب الدخول
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field
                    name="name"
                    label={facilityType === "agency_master" ? "اسم السلسلة / المجموعة الصيدلانية" : "اسم المنشأة / الصيدلية"}
                    defaultValue={actor.role === "pending" ? actor.name : ""}
                    required
                  />
                  <div className="field">
                    <span>نوع الكيان الصيدلاني</span>
                    <select
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value as any)}
                      required
                    >
                      <option value="independent">صيدلية مستقلة (منشأة فردية)</option>
                      <option value="agency_master">إدارة سلسلة صيدليات جديدة (مركز رئيسي)</option>
                      <option value="agency_branch">فرع تابع لسلسلة صيدليات معتمدة</option>
                    </select>
                  </div>

                  {facilityType === "agency_branch" && (
                    <div className="field md:col-span-2 bg-teal-50/70 p-3 rounded-xl border border-teal-200">
                      <span className="font-bold text-teal-900 block mb-1">
                        اختر السلسلة الصيدلانية التابع لها هذا الفرع:
                      </span>
                      <select
                        value={selectedChainId}
                        onChange={(e) => setSelectedChainId(e.target.value)}
                        required
                        className="w-full"
                      >
                        {state.chains.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (إدارة سلسلة معتمدة)
                          </option>
                        ))}
                      </select>
                      <small className="text-teal-700 text-xs block mt-1">
                        سيقوم مدير المنصة بمطابقة بيانات الفرع واعتماده تحت إدارة السلسلة المحددة.
                      </small>
                    </div>
                  )}

                  <Field
                    name="email"
                    type="email"
                    label="البريد الإلكتروني الرسمي (لتسجيل الدخول)"
                    placeholder="name@pharmacy.local"
                    defaultValue={actor.email || ""}
                    required
                  />
                  <Field
                    name="password"
                    type="password"
                    label="كلمة المرور لمساحة العمل"
                    placeholder="أدخل كلمة مرور قوية (6 خانات على الأقل)"
                    defaultValue={actor.password || ""}
                    required
                  />
                </div>
              </div>

              {/* القسم الثاني: بيانات الصيدلي والاتصال والموقع */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2.5 pb-1 border-b border-slate-200">
                  2. بيانات الصيدلي المسؤول والموقع الجغرافي
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field
                    name="pharmacistName"
                    label="اسم الصيدلي المسؤول / المدير الفني"
                    placeholder="د. ..."
                    defaultValue={actor.pharmacistName || ""}
                    required
                  />
                  <Field
                    name="phone"
                    type="tel"
                    label="رقم الهاتف والواتساب للتواصل"
                    placeholder="770000000"
                    defaultValue={actor.phone || ""}
                    required
                  />
                  <Field
                    name="city"
                    label="المدينة / المحافظة"
                    placeholder="مثال: صنعاء، عدن، تعز..."
                    defaultValue={actor.city || "صنعاء"}
                    required
                  />
                  <Field
                    name="address"
                    label="العنوان والشارع (أقرب معلم)"
                    placeholder="مثال: شارع الستين، جوار مستشفى..."
                    defaultValue={actor.address || ""}
                    required
                  />
                </div>
              </div>

              {/* القسم الثالث: التراخيص والبيانات الرقابية الرسمية */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2.5 pb-1 border-b border-slate-200">
                  3. التراخيص والبيانات الرقابية الرسمية
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field
                    name="license"
                    label={facilityType === "agency_master" ? "رقم ترخيص السلسلة والمجموعة" : "رقم ترخيص فتح المنشأة الصيدلانية"}
                    placeholder="مثال: LIC-SAN-2026"
                    defaultValue={actor.license || ""}
                    required
                  />
                  <Field
                    name="practiceLicense"
                    label="رقم ترخيص مزاولة المهنة للصيدلي"
                    placeholder="مثال: PRAC-9921"
                    defaultValue={actor.practiceLicense || ""}
                    required
                  />
                  <Field
                    name="licenseExpiry"
                    type="date"
                    label="تاريخ انتهاء سريان ترخيص المنشأة"
                    defaultValue={actor.licenseExpiry || ""}
                    required
                  />
                  <Field
                    name="commercialRegister"
                    label="رقم السجل التجاري"
                    placeholder="مثال: CR-44821"
                    defaultValue={actor.commercialRegister || ""}
                    required
                  />
                  <Field
                    name="taxNumber"
                    label="الرقم الضريبي"
                    placeholder="مثال: TAX-99120"
                    defaultValue={actor.taxNumber || ""}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => setRegister(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                إرسال الطلب للمراجعة والتدقيق
              </Button>
            </div>
          </Form>
        </Modal>
      )}
    </div>
  );
}
