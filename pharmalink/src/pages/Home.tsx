import { useState } from "react";
import {
  ArrowUpLeft,
  Package,
  ArrowRightLeft,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../context";
import { isAccountSuspended, isLicenseExpired } from "../domain/access";
import type { KYCDocument } from "../domain/types";
import { Badge, Button, Card, Field, Form, Modal } from "../components/UI";

export function Home({ navigate }: { navigate: (s: string) => void }) {
  const { actor, run, busy } = useApp();
  const [register, setRegister] = useState(false);
  const [docs, setDocs] = useState<KYCDocument[]>(actor.documents || []);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: KYCDocument["type"],
    title: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const newDoc: KYCDocument = {
        id: "doc-" + Math.random().toString(36).slice(2, 9),
        type,
        title,
        fileName: file.name,
        fileType: isPdf ? "pdf" : "image",
        dataUrl: String(reader.result),
        uploadedAt: new Date().toISOString(),
      };
      setDocs((prev) => [...prev.filter((d) => d.type !== type), newDoc]);
    };
    reader.readAsDataURL(file);
  };

  const suspended = isAccountSuspended(actor);
  const licenseExpired = isLicenseExpired(actor);

  return (
    <>
      <section className="landing-hero">
        <Badge tone="success">منصة أعمال للمنشآت الصيدلانية</Badge>
        <h1>
          قيمة دوائك،
          <br />
          <span>تستحق فرصة أخرى.</span>
        </h1>
        <p>
          فارما لينك تجمع إدارة المخزون وتبادل الفائض في مساحة واحدة، لتساعد
          الصيدليات على اتخاذ القرار في الوقت المناسب.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            disabled={suspended || actor.role === "pending"}
            onClick={() =>
              actor.role === "guest" ? setRegister(true) : navigate("dashboard")
            }
          >
            {actor.role === "guest"
              ? "طلب تسجيل منشأة"
              : actor.role === "pending"
                ? "الطلب قيد مراجعة وتدقيق الإدارة"
                : suspended
                  ? "الحساب موقوف حالياً"
                  : "الدخول لمساحة العمل"}
            <ArrowUpLeft size={18} />
          </Button>
          <Button variant="secondary" onClick={() => navigate("brand")}>
            اكتشف هويتنا
          </Button>
        </div>
        <div className="landing-logo">
          <img src="./brand/identity.png" alt="هوية فارما لينك" />
        </div>
      </section>

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
            تصحيح البيانات والوثائق وإعادة التقديم
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5 mt-5">
        {[
          [
            Package,
            "مخزون أوضح",
            "راجع التشغيلات والصلاحيات والكميات، واستورد ملف مخزونك بعد معاينته.",
          ],
          [
            ArrowRightLeft,
            "تبادل داخلي منظم",
            "اعرض الفائض أو الاحتياج وتابع الموافقات والإرسال والاستلام.",
          ],
          [
            ShieldCheck,
            "تداول للمنشآت الموثقة",
            "عروض وأسعار خاصة بالمنشآت المعتمدة، مع التحقق الإلزامي من التراخيص الرسمية.",
          ],
        ].map(([Icon, title, text]) => {
          const C = Icon as typeof Package;
          return (
            <Card key={String(title)}>
              <div className="exchange-icon">
                <C />
              </div>
              <h3>{String(title)}</h3>
              <p>{String(text)}</p>
            </Card>
          );
        })}
      </div>

      {register && (
        <Modal
          title={actor.rejection ? "تصحيح وإعادة تقديم طلب التسجيل" : "طلب تسجيل منشأة صيدلانية (KYC)"}
          onClose={() => setRegister(false)}
          wide
        >
          <Form
            onSubmit={async (f) => {
              const defaultExpiry = new Date();
              defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
              const expiryStr = String(f.get("licenseExpiry") || defaultExpiry.toISOString().slice(0, 10));

              if (
                await run({
                  type: actor.rejection ? "resubmit" : "register",
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  license: String(f.get("license")),
                  pharmacistName: String(f.get("pharmacistName") || ""),
                  practiceLicense: String(f.get("practiceLicense") || ""),
                  commercialRegister: String(f.get("commercialRegister") || ""),
                  taxNumber: String(f.get("taxNumber") || ""),
                  licenseExpiry: expiryStr,
                  documents: docs,
                })
              ) {
                setRegister(false);
              }
            }}
          >
            <div className="info-strip mb-4">
              <ShieldCheck size={18} />
              <span>
                التحقق والامتثال: يخضع هذا الطلب لتدقيق مدير المنصة ومطابقة الوثائق الرسمية قبل منح صلاحيات الدخول.
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field
                name="name"
                label="اسم المنشأة / الصيدلية"
                defaultValue={actor.role === "pending" ? actor.name : ""}
                required
              />
              <Field
                name="email"
                type="email"
                label="البريد الإلكتروني الرسمي"
                defaultValue={actor.email || ""}
                required
              />
              <Field
                name="pharmacistName"
                label="اسم الصيدلي المسؤول"
                defaultValue={actor.pharmacistName || ""}
                required
              />
              <Field
                name="practiceLicense"
                label="رقم ترخيص مزاولة المهنة للصيدلي"
                defaultValue={actor.practiceLicense || ""}
                required
              />
              <Field
                name="license"
                label="رقم ترخيص فتح المنشأة الصيدلانية"
                defaultValue={actor.license || ""}
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
                defaultValue={actor.commercialRegister || ""}
                required
              />
              <Field
                name="taxNumber"
                label="الرقم الضريبي"
                defaultValue={actor.taxNumber || ""}
                required
              />
            </div>

            <h4 className="mt-4 mb-2 font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} /> إرفاق الوثائق الرسمية (PDF أو صور عالية الدقة):
            </h4>

            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {[
                { type: "pharmacy_license" as const, title: "ترخيص فتح الصيدلية" },
                { type: "practice_license" as const, title: "ترخيص مزاولة المهنة" },
                { type: "commercial_register" as const, title: "السجل التجاري" },
                { type: "tax_card" as const, title: "البطاقة الضريبية" },
              ].map((docItem) => {
                const attached = docs.find((d) => d.type === docItem.type);
                return (
                  <div key={docItem.type} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">{docItem.title}</span>
                      {attached ? (
                        <Badge tone="success">
                          <CheckCircle2 size={12} className="inline ml-1" />
                          مرفق ({attached.fileName.slice(-15)})
                        </Badge>
                      ) : (
                        <Badge tone="neutral">مطلوب</Badge>
                      )}
                    </div>
                    <label className="button ghost w-full text-center cursor-pointer block mt-2 text-xs py-1 border border-dashed border-teal-500 rounded">
                      <Upload size={14} className="inline ml-1" />
                      {attached ? "تغيير الملف المرفق" : "اختر ملف الوثيقة (PDF / صورة)"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, docItem.type, docItem.title)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-4">
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
    </>
  );
}
