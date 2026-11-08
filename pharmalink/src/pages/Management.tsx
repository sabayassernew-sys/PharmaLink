import { ExternalProcessing } from "../components/ExternalProcessing";
import { BackupTools } from "../components/BackupTools";
import { Radar } from "./Radar";
import { useState, useEffect } from "react";
import {
  Plus,
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  Ban,
  RotateCcw,
  Eye,
  Calendar,
  Clock,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Camera,
  Sparkles,
  Trash2,
  Percent,
  ShieldAlert,
  Coins,
  Sliders,
  TrendingUp,
  CalendarDays,
  Receipt,
} from "lucide-react";
import { compressAvatar, PRESET_AVATARS } from "../domain/avatars";
import { useApp } from "../context";
import {
  ownsBranch,
  visibleItems,
  visibleTransfers,
  available,
  daysLeft,
  isLicenseExpired,
  roleNames,
} from "../domain/access";
import { licenseAlerts } from "../domain/notifications";
import type { Account, KYCDocument } from "../domain/types";

import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageTitle,
  money,
} from "../components/UI";

export function PlatformSettingsControl() {
  const { state, actor, run, busy, notify } = useApp();
  const currentFee =
    state.platformFeePercent !== undefined ? state.platformFeePercent : 1.5;
  const currentMinDays =
    state.minExpiryDays !== undefined ? state.minExpiryDays : 30;

  const [fee, setFee] = useState<number | "">(currentFee);
  const [minDays, setMinDays] = useState<number | "">(currentMinDays);

  useEffect(() => {
    setFee(
      state.platformFeePercent !== undefined ? state.platformFeePercent : 1.5,
    );
    setMinDays(state.minExpiryDays !== undefined ? state.minExpiryDays : 30);
  }, [state.platformFeePercent, state.minExpiryDays]);

  if (actor.role !== "admin") return null;

  return (
    <Card className="p-6 border border-teal-200/80 bg-gradient-to-br from-white to-slate-50 shadow-sm mb-6">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 mb-4">
        <Sliders className="text-teal-600" size={22} />
        <div>
          <h3 className="m-0 text-base font-bold text-slate-800">
            السياسات العامة وإعدادات المنصة (خاص بالإدارة)
          </h3>
          <p className="text-xs text-slate-500 m-0">
            تحكم مركزي مباشر في نسبة عمولة المنصة على التداولات، وضابط الحد الأدنى لصلاحية الأدوية المسموح بنشرها.
          </p>
        </div>
      </div>

      <Form
        onSubmit={async (f) => {
          const rawFee = f.get("fee");
          const rawDays = f.get("minDays");
          const feePercent =
            rawFee === "" || rawFee === null ? undefined : Number(rawFee);
          const minExpiryDays =
            rawDays === "" || rawDays === null ? undefined : Number(rawDays);

          if (
            await run({
              type: "setPlatformSettings",
              feePercent,
              minExpiryDays,
            })
          ) {
            notify("تم حفظ وتطبيق سياسات المنصة بنجاح");
          }
        }}
      >
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Percent size={16} className="text-teal-600" />
                نسبة عمولة المنصة على الصفقات
              </span>
              <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded text-xs border border-teal-200">
                الحالي: {currentFee}٪
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              تُحسب هذه النسبة تلقائياً على كل طلب شراء مكتمل في البورصة وتُودع في رصيد أرباح المنصة.
            </p>
            <label className="field m-0">
              <span>نسبة العمولة (٪)</span>
              <input
                name="fee"
                type="number"
                min={0}
                max={20}
                step={0.1}
                required
                value={fee}
                onChange={(e) =>
                  setFee(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </label>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarDays size={16} className="text-teal-600" />
                الحد الأدنى لصلاحية الأدوية للنشر
              </span>
              <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-xs border border-amber-200">
                الحالي: {currentMinDays} يوم
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              يمنع النظام الصيدليات تلقائياً من نشر أي دواء في البورصة إذا كانت صلاحيته المتبقية أقل من هذا الحد.
            </p>
            <label className="field m-0">
              <span>الحد الأدنى للأيام المتبقية (يوم)</span>
              <input
                name="minDays"
                type="number"
                min={1}
                max={365}
                step={1}
                required
                value={minDays}
                onChange={(e) =>
                  setMinDays(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 m-0">
            * تسري هذه السياسات فوراً على كافة عمليات النشر والشراء اللاحقة في النظام.
          </p>
          <Button disabled={busy} type="submit">
            تحديث وحفظ سياسات المنصة
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export function Management({
  mode,
}: {
  mode:
    | "branches"
    | "verification"
    | "audit"
    | "reports"
    | "settings"
    | "brand"
    | "radar"
    | "disputes";
}) {
  const { state, actor, run, busy } = useApp();
  const [add, setAdd] = useState(false);
  const [verifyTab, setVerifyTab] = useState<"pending" | "active" | "alerts" | "suspended">("pending");
  const [inspectAccount, setInspectAccount] = useState<Account | null>(null);
  const [singleDoc, setSingleDoc] = useState<KYCDocument | null>(null);
  const [galleryDoc, setGalleryDoc] = useState<KYCDocument | null>(null);
  const [docZoom, setDocZoom] = useState<number>(1);
  const [suspendModal, setSuspendModal] = useState<Account | null>(null);
  const [renewModal, setRenewModal] = useState<Account | null>(null);
  const [rejectModal, setRejectModal] = useState<Account | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(actor.avatarUrl);
  const [presetModal, setPresetModal] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setProfileAvatar(actor.avatarUrl);
    setProfileSaved(false);
  }, [actor.id, actor.avatarUrl]);
  const branches = state.branches.filter((b) => ownsBranch(state, actor, b.id));
  const events = state.events.filter(
    (e) =>
      actor.role === "admin" ||
      (e.branchId && ownsBranch(state, actor, e.branchId)) ||
      state.transfers.some(
        (t) =>
          t.id === e.reference &&
          (t.to === actor.branchId ||
            t.from === actor.branchId ||
            t.chainId === actor.chainId),
      ),
  );
  const titles = {
    branches: "إدارة الفروع",
    verification: "طلبات التوثيق",
    audit: "سجل العمليات",
    reports: "التقارير التشغيلية",
    settings: "إعدادات المنشأة والملف التعريفي",
    brand: "الهوية البصرية",
    radar: "رادار الأدوية",
    disputes: "النزاعات الخارجية",
  };
  return (
    <>
      <PageTitle
        eyebrow="فارما لينك"
        title={
          mode === "reports" && actor.role === "admin"
            ? "التقارير المالية وأرباح المنصة"
            : titles[mode]
        }
        description={
          mode === "reports" && actor.role === "admin"
            ? "متابعة إيرادات وعمولات المنصة المحصلة من التداولات، وحجم الصفقات المنفذة، وسجل محاسبي تفصيلي."
            : mode === "settings"
              ? "إدارة وتحديث بيانات المنشأة الصيدلانية، الشعار المعتمد، وسياسات التشغيل والخصم."
              : mode === "verification"
                ? "مراجعة تسجيل المنشآت؛ الموافقة هنا تجريبية وليست تحققًا رسميًا من الترخيص."
                : mode === "brand"
                  ? "الكحلي للثقة، والفيروزي للتواصل وتدوير المخزون."
                  : "معلومات وإجراءات وفق نطاق صلاحية الحساب."
        }
        actions={
          mode === "branches" ? (
            <Button onClick={() => setAdd(true)}>
              <Plus size={17} /> إضافة فرع
            </Button>
          ) : undefined
        }
      />
      {mode === "branches" && (
        <>
          <Card className="mb-5">
            <h3>سياسة اعتماد المناقلات الجديدة</h3>
            <p>العمليات القائمة تحتفظ بالسياسة المسجلة عند إنشائها.</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant={
                  state.chains.find((c) => c.id === actor.chainId)?.policy ===
                  "centralized"
                    ? "primary"
                    : "secondary"
                }
                disabled={busy}
                onClick={() => run({ type: "policy", policy: "centralized" })}
              >
                اعتماد مركزي
              </Button>
              <Button
                variant={
                  state.chains.find((c) => c.id === actor.chainId)?.policy ===
                  "delegated"
                    ? "primary"
                    : "secondary"
                }
                disabled={busy}
                onClick={() => run({ type: "policy", policy: "delegated" })}
              >
                تفويض الفروع
              </Button>
            </div>
          </Card>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {branches.map((b) => (
              <Card key={b.id}>
                <div className="exchange-icon">
                  <Building2 />
                </div>
                <h3>{b.name}</h3>
                <p>{b.city}</p>
                <Badge tone="success">
                  {
                    state.items.filter(
                      (i) => i.branchId === b.id && !i.archived,
                    ).length
                  }{" "}
                  بند مخزون
                </Badge>
                <p className="mt-3">
                  {state.accounts.find((a) => a.branchId === b.id)?.name}
                </p>
                <small>
                  الاعتماد:{" "}
                  {state.accounts.find((a) => a.branchId === b.id)?.verified
                    ? "موثق تجريبيًا"
                    : "بانتظار التوثيق"}
                </small>
              </Card>
            ))}
          </div>
        </>
      )}
      {mode === "verification" && (() => {
        const pendingAccounts = state.accounts.filter(
          (a) => a.role === "pending" || (!a.verified && a.role === "agency_branch"),
        );
        const verifiedAccounts = state.accounts.filter(
          (a) => a.verified && ["agency_branch", "agency_master", "independent"].includes(a.role),
        );
        const suspendedAccounts = state.accounts.filter((a) => a.suspended);
        const allLicAlerts = licenseAlerts(state, actor);

        return (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-5">
              <Card className="wallet-summary">
                <ShieldCheck className="text-teal-600" />
                <div>
                  <p>طلبات بانتظار الفحص</p>
                  <strong className="text-xl text-teal-700">{pendingAccounts.length}</strong>
                  <small className="block text-slate-400">تحتاج تدقيق الوثائق</small>
                </div>
              </Card>
              <Card className="wallet-summary">
                <CheckCircle2 className="text-emerald-600" />
                <div>
                  <p>منشآت معتمدة سارية</p>
                  <strong className="text-xl text-emerald-700">{verifiedAccounts.length}</strong>
                  <small className="block text-slate-400">تراخيص موثقة</small>
                </div>
              </Card>
              <Card className="wallet-summary">
                <Clock className="text-amber-600" />
                <div>
                  <p>تنبيهات انتهاء التراخيص</p>
                  <strong className="text-xl text-amber-700">{allLicAlerts.length}</strong>
                  <small className="block text-slate-400">خلال 30 و15 يوماً</small>
                </div>
              </Card>
              <Card className="wallet-summary">
                <Ban className="text-red-600" />
                <div>
                  <p>منشآت مجمدة</p>
                  <strong className="text-xl text-red-700">{suspendedAccounts.length}</strong>
                  <small className="block text-slate-400">مخالفات مهنية</small>
                </div>
              </Card>
            </div>

            <div className="tabs mb-5">
              {[
                ["pending", `طلبات التوثيق الجديدة (${pendingAccounts.length})`],
                ["active", `المنشآت المعتمدة وتتبع التراخيص (${verifiedAccounts.length})`],
                ["alerts", `تنبيهات التراخيص (${allLicAlerts.length})`],
                ["suspended", `المنشآت المجمدة والمخالفات (${suspendedAccounts.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={verifyTab === key ? "active" : ""}
                  onClick={() => setVerifyTab(key as typeof verifyTab)}
                >
                  {label}
                </button>
              ))}
            </div>

            {verifyTab === "pending" && (
              <Card>
                <div className="table-caption mb-3">
                  <span>طلبات التسجيل الجديدة بانتظار فحص التراخيص والوثائق الرسمية</span>
                </div>
                {!pendingAccounts.length ? (
                  <Empty title="لا توجد طلبات توثيق معلقة حالياً" description="جميع طلبات المنشآت تمت مراجعتها والبت فيها." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>المنشأة والصيدلي المسؤول</th>
                          <th>بيانات الاتصال</th>
                          <th>ترخيص الصيدلية</th>
                          <th>الوثائق المرفقة</th>
                          <th>الحالة</th>
                          <th>الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAccounts.map((a) => {
                          const docCount = a.documents?.length || 0;
                          return (
                            <tr key={a.id}>
                              <td>
                                <strong>{a.name}</strong>
                                <small className="block text-slate-500">
                                  {a.pharmacistName ? `الصيدلي: ${a.pharmacistName}` : "لم يُحدد اسم الصيدلي"}
                                </small>
                              </td>
                              <td>
                                <span>{a.email || "—"}</span>
                              </td>
                              <td>
                                <code>{a.license || "—"}</code>
                                {a.licenseExpiry && (
                                  <small className="block text-slate-500">ينتهي: {a.licenseExpiry}</small>
                                )}
                              </td>
                              <td>
                                <Badge tone={docCount > 0 ? "success" : "warning"}>
                                  <FileText size={13} className="inline ml-1" />
                                  {docCount} وثائق رسمية
                                </Badge>
                              </td>
                              <td>
                                <Badge tone={a.rejection ? "danger" : "warning"}>
                                  {a.rejection ? "مرفوض سابقاً" : "قيد المراجعة"}
                                </Badge>
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setInspectAccount(a)}
                                  >
                                    <Eye size={15} /> فحص الوثائق والبت
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {verifyTab === "active" && (
              <Card>
                <div className="table-caption mb-3">
                  <span>متابعة التراخيص السارية للمنشآت المعتمدة ورصد تواريخ الانتهاء</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>المنشأة</th>
                        <th>الصيدلي والترخيص</th>
                        <th>السجل التجاري والضريبي</th>
                        <th>تاريخ انتهاء الترخيص</th>
                        <th>حالة السريان</th>
                        <th>الإجراءات الرقابية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedAccounts.map((a) => {
                        const expired = isLicenseExpired(a);
                        const days = a.licenseExpiry ? daysLeft(a.licenseExpiry) : null;
                        const tone = a.suspended
                          ? "danger"
                          : expired
                            ? "danger"
                            : days !== null && days <= 15
                              ? "danger"
                              : days !== null && days <= 30
                                ? "warning"
                                : "success";

                        return (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.name}</strong>
                              <small className="block text-slate-500">
                                {a.role === "independent" ? "صيدلية مستقلة" : "فرع سلسلة"}
                              </small>
                            </td>
                            <td>
                              <span>{a.pharmacistName || "—"}</span>
                              <code className="block text-xs text-slate-500">{a.license || "—"}</code>
                            </td>
                            <td>
                              <span className="text-xs block">سجل: {a.commercialRegister || "—"}</span>
                              <span className="text-xs text-slate-400 block">ضريبي: {a.taxNumber || "—"}</span>
                            </td>
                            <td>
                              <span className="date">{a.licenseExpiry || "غير مسجل"}</span>
                              {days !== null && (
                                <small
                                  className={
                                    days < 0
                                      ? "text-red-600 font-bold block"
                                      : days <= 15
                                        ? "text-red-600 block"
                                        : days <= 30
                                          ? "text-amber-600 block"
                                          : "text-slate-500 block"
                                  }
                                >
                                  {days < 0 ? "منتهي الصلاحية" : `متبقي ${days} يوماً`}
                                </small>
                              )}
                            </td>
                            <td>
                              <Badge tone={tone}>
                                {a.suspended
                                  ? "مجمد لمخالفة"
                                  : expired
                                    ? "موقف آلياً (منتهي)"
                                    : days !== null && days <= 15
                                      ? "حرج (أقل من 15 يوماً)"
                                      : days !== null && days <= 30
                                        ? "يقترب الانتهاء (30 يوماً)"
                                        : "ساري ومعتمد"}
                              </Badge>
                            </td>
                            <td>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="ghost"
                                  onClick={() => setInspectAccount(a)}
                                >
                                  <FileText size={15} /> الوثائق
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => setRenewModal(a)}
                                >
                                  <Calendar size={15} /> تمديد
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => setSuspendModal(a)}
                                >
                                  <Ban size={15} /> تجميد
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {verifyTab === "alerts" && (
              <Card>
                <div className="table-caption mb-3">
                  <span>تنبيهات التراخيص التي أوشكت على الانتهاء (قبل 30 يوماً و15 يوماً) أو انتهت فعلياً</span>
                </div>
                {!allLicAlerts.length ? (
                  <Empty title="لا توجد تنبيهات تراخيص مستحقة" description="جميع تراخيص المنشآت سارية لأكثر من 30 يوماً." />
                ) : (
                  <div className="grid gap-3">
                    {allLicAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-4 flex justify-between items-center ${
                          alert.tone === "danger"
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <div>
                          <strong className={alert.tone === "danger" ? "text-red-800" : "text-amber-800"}>
                            {alert.text}
                          </strong>
                          <p className="text-sm text-slate-600 mt-1">
                            المنشأة: {alert.account.name} · الصيدلي المسؤول: {alert.account.pharmacistName || "—"} · الترخيص: {alert.account.license}
                          </p>
                          {alert.account.licenseExpiry && (
                            <small className="text-slate-500">
                              تاريخ الانتهاء المسجل: {alert.account.licenseExpiry}
                            </small>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setRenewModal(alert.account)}
                          >
                            تحديث التجديد
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {verifyTab === "suspended" && (
              <Card>
                <div className="table-caption mb-3">
                  <span>سجل المنشآت المجمدة والموقوفة بسبب مخالفات مهنية أو تنظيمية</span>
                </div>
                {!suspendedAccounts.length ? (
                  <Empty title="لا توجد منشآت مجمدة حالياً" description="سجل المنشآت نظيف من قرارات الإيقاف التجميدي." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>المنشأة</th>
                          <th>سبب التجميد والمخالفة</th>
                          <th>تاريخ القرار</th>
                          <th>الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspendedAccounts.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.name}</strong>
                              <code className="block text-xs text-slate-500">{a.license}</code>
                            </td>
                            <td>
                              <span className="text-red-700 font-semibold">{a.suspensionReason || "مخالفة مهنية"}</span>
                            </td>
                            <td>
                              <span>{a.suspendedAt ? new Date(a.suspendedAt).toLocaleDateString("ar-YE") : "—"}</span>
                            </td>
                            <td>
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => run({ type: "unsuspendAccount", id: a.id })}
                              >
                                <RotateCcw size={15} /> رفع التجميد وإعادة التفعيل
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

            {/* Modal 1: Inspect Account & Documents (KYC Inspector) */}
            {inspectAccount && (
              <Modal
                title={`فحص ملف وتراخيص: ${inspectAccount.name}`}
                onClose={() => setInspectAccount(null)}
                wide
              >
                <div className="item-summary mb-4">
                  <div>
                    <h3>{inspectAccount.name}</h3>
                    <p>
                      البريد: {inspectAccount.email || "—"} · الحالة:{" "}
                      {inspectAccount.verified ? "موثق" : "قيد المراجعة والاعتماد"}
                    </p>
                  </div>
                  <div>
                    <Badge tone={inspectAccount.verified ? "success" : "warning"}>
                      {inspectAccount.verified ? "منشأة معتمدة" : "طلب معلق"}
                    </Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-5 border-b pb-4">
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">اسم الصيدلي المسؤول</label>
                    <span className="font-semibold">{inspectAccount.pharmacistName || "—"}</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">رقم ترخيص مزاولة المهنة</label>
                    <code>{inspectAccount.practiceLicense || "—"}</code>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">رقم ترخيص فتح الصيدلية</label>
                    <code>{inspectAccount.license || "—"}</code>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">تاريخ انتهاء سريان الترخيص</label>
                    <span className="font-semibold text-teal-700">{inspectAccount.licenseExpiry || "غير مسجل"}</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">رقم السجل التجاري</label>
                    <code>{inspectAccount.commercialRegister || "—"}</code>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block">الرقم الضريبي</label>
                    <code>{inspectAccount.taxNumber || "—"}</code>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 m-0">
                    <FileText size={18} /> الوثائق الرسمية المرفوعة ({inspectAccount.documents?.length || 0}):
                  </h4>
                  {inspectAccount.documents && inspectAccount.documents.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setGalleryDoc(inspectAccount.documents![0]);
                        setDocZoom(1);
                      }}
                    >
                      <Eye size={15} /> فتح عارض المستندات التفاعلي الشامل
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-5">
                  {[
                    { type: "pharmacy_license", label: "ترخيص فتح الصيدلية" },
                    { type: "practice_license", label: "ترخيص مزاولة المهنة" },
                    { type: "commercial_register", label: "السجل التجاري" },
                    { type: "tax_card", label: "البطاقة الضريبية" },
                  ].map((docType) => {
                    const doc = inspectAccount.documents?.find((d) => d.type === docType.type);
                    return (
                      <Card key={docType.type} className="p-3 border border-slate-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong className="block text-sm">{docType.label}</strong>
                            <small className="text-slate-500">
                              {doc ? doc.fileName : "لم يتم رفع هذا المستند بعد"}
                            </small>
                          </div>
                          {doc ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSingleDoc(doc);
                                setDocZoom(1);
                              }}
                            >
                              <Eye size={15} /> معاينة الوثيقة
                            </Button>
                          ) : (
                            <Badge tone="neutral">غير مرفق</Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {!inspectAccount.verified && (
                  <div className="flex flex-wrap items-center justify-between border-t pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await run({
                              type: "verify",
                              id: inspectAccount.id,
                              approve: true,
                              licenseExpiry: inspectAccount.licenseExpiry,
                            })
                          ) {
                            setInspectAccount(null);
                          }
                        }}
                      >
                        <ShieldCheck size={16} /> اعتماد وتوثيق المنشأة رسمياً
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => setRejectModal(inspectAccount)}
                      >
                        رفض الطلب مع ذكر السبب
                      </Button>
                    </div>
                    <Button variant="secondary" onClick={() => setInspectAccount(null)}>
                      إغلاق الملف
                    </Button>
                  </div>
                )}
              </Modal>
            )}

            {/* Modal 2A: Single Document Preview Lightbox (معاينة وثيقة محددة وسريعة) */}
            {singleDoc && (
              <Modal
                title={`معاينة المستند: ${singleDoc.title}`}
                onClose={() => setSingleDoc(null)}
                wide
              >
                {/* 1. Simple Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg mb-3 border border-slate-200">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                    <button
                      type="button"
                      title="تصغير"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                      onClick={() => setDocZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="px-2 text-xs font-bold min-w-12 text-center text-slate-700">
                      {Math.round(docZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      title="تكبير"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                      onClick={() => setDocZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      title="إعادة ضبط الحجم الأصلي 100%"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border-r border-slate-200"
                      onClick={() => setDocZoom(1)}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {singleDoc.dataUrl && (
                      <a
                        href={singleDoc.dataUrl}
                        download={singleDoc.fileName}
                        className="button secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                      >
                        <Download size={14} /> تنزيل المستند
                      </a>
                    )}
                    {singleDoc.dataUrl && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const win = window.open("");
                          if (win) {
                            win.document.write(
                              `<!DOCTYPE html><html><head><title>${singleDoc.title}</title></head><body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${singleDoc.dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
                            );
                          }
                        }}
                      >
                        <ExternalLink size={14} /> ملء الشاشة
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2. Document Canvas */}
                <div className="overflow-auto max-h-[500px] min-h-[360px] p-4 bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center">
                  <div
                    style={{
                      transform: `scale(${docZoom})`,
                      transformOrigin: "top center",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    {singleDoc.dataUrl ? (
                      singleDoc.fileType === "pdf" && !singleDoc.dataUrl.startsWith("data:image") ? (
                        <iframe
                          src={singleDoc.dataUrl}
                          title={singleDoc.title}
                          className="w-[720px] h-[460px] border rounded bg-white shadow"
                        />
                      ) : (
                        <img
                          src={singleDoc.dataUrl}
                          alt={singleDoc.title}
                          className="max-h-[460px] max-w-full rounded shadow-md border bg-white"
                        />
                      )
                    ) : (
                      <p className="text-slate-500 py-10">معاينة الوثيقة غير متاحة محلياً.</p>
                    )}
                  </div>
                </div>

                {/* 3. Bottom Footer (Only Document Details and Close) */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                  <div>
                    <span>الملف: <strong>{singleDoc.fileName}</strong></span>
                    <span className="mx-2">·</span>
                    <span>تاريخ الرفع: {new Date(singleDoc.uploadedAt).toLocaleString("ar-YE")}</span>
                  </div>
                  <Button variant="secondary" onClick={() => setSingleDoc(null)}>
                    إغلاق المعاينة
                  </Button>
                </div>
              </Modal>
            )}

            {/* Modal 2B: Full Interactive KYC Gallery Studio (استوديو فحص الوثائق التفاعلي الشامل) */}
            {galleryDoc && inspectAccount && (
              <Modal
                title={`استوديو فحص الوثائق: ${inspectAccount.name}`}
                onClose={() => setGalleryDoc(null)}
                wide
              >
                {/* 1. Document Switcher Tabs */}
                {inspectAccount.documents && inspectAccount.documents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 ml-2">تنقل بين الوثائق:</span>
                    {[
                      { type: "pharmacy_license", label: "ترخيص المنشأة" },
                      { type: "practice_license", label: "ترخيص المزاولة" },
                      { type: "commercial_register", label: "السجل التجاري" },
                      { type: "tax_card", label: "البطاقة الضريبية" },
                    ].map((slot) => {
                      const docItem = inspectAccount.documents?.find((d) => d.type === slot.type);
                      const isCurrent = galleryDoc.type === slot.type;
                      return (
                        <button
                          key={slot.type}
                          type="button"
                          disabled={!docItem}
                          onClick={() => {
                            if (docItem) {
                              setGalleryDoc(docItem);
                              setDocZoom(1);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isCurrent
                              ? "bg-[#073B59] text-white border-[#073B59] shadow-sm"
                              : docItem
                              ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
                              : "bg-slate-50 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span>{slot.label}</span>
                          {docItem ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1"></span>
                          ) : (
                            <span className="text-[10px] text-slate-400">(غير مرفق)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Interactive Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg mb-3 border border-slate-200">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                    <button
                      type="button"
                      title="تصغير"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                      onClick={() => setDocZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="px-2 text-xs font-bold min-w-12 text-center text-slate-700">
                      {Math.round(docZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      title="تكبير"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                      onClick={() => setDocZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      title="إعادة ضبط الحجم الأصلي 100%"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border-r border-slate-200"
                      onClick={() => setDocZoom(1)}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {galleryDoc.dataUrl && (
                      <a
                        href={galleryDoc.dataUrl}
                        download={galleryDoc.fileName}
                        className="button secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                      >
                        <Download size={14} /> تنزيل المستند
                      </a>
                    )}
                    {galleryDoc.dataUrl && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const win = window.open("");
                          if (win) {
                            win.document.write(
                              `<!DOCTYPE html><html><head><title>${galleryDoc.title}</title></head><body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${galleryDoc.dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
                            );
                          }
                        }}
                      >
                        <ExternalLink size={14} /> ملء الشاشة
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. Document Viewport Canvas */}
                <div className="overflow-auto max-h-[500px] min-h-[360px] p-4 bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center">
                  <div
                    style={{
                      transform: `scale(${docZoom})`,
                      transformOrigin: "top center",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    {galleryDoc.dataUrl ? (
                      galleryDoc.fileType === "pdf" && !galleryDoc.dataUrl.startsWith("data:image") ? (
                        <iframe
                          src={galleryDoc.dataUrl}
                          title={galleryDoc.title}
                          className="w-[720px] h-[460px] border rounded bg-white shadow"
                        />
                      ) : (
                        <img
                          src={galleryDoc.dataUrl}
                          alt={galleryDoc.title}
                          className="max-h-[460px] max-w-full rounded shadow-md border bg-white"
                        />
                      )
                    ) : (
                      <p className="text-slate-500 py-10">معاينة الوثيقة غير متاحة محلياً.</p>
                    )}
                  </div>
                </div>

                {/* 4. Document Metadata & Bottom Actions - UNIFIED LAYOUT */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                  <div>
                    <span>الملف: <strong>{galleryDoc.fileName}</strong></span>
                    <span className="mx-2">·</span>
                    <span>تاريخ الرفع: {new Date(galleryDoc.uploadedAt).toLocaleString("ar-YE")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!inspectAccount.verified && (
                      <>
                        <Button
                          disabled={busy}
                          onClick={async () => {
                            if (
                              await run({
                                type: "verify",
                                id: inspectAccount.id,
                                approve: true,
                                licenseExpiry: inspectAccount.licenseExpiry,
                              })
                            ) {
                              setGalleryDoc(null);
                              setInspectAccount(null);
                            }
                          }}
                        >
                          <ShieldCheck size={16} /> اعتماد وتوثيق المنشأة رسمياً
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => {
                            setGalleryDoc(null);
                            setRejectModal(inspectAccount);
                          }}
                        >
                          رفض الطلب مع ذكر السبب
                        </Button>
                      </>
                    )}
                    <Button variant="secondary" onClick={() => setGalleryDoc(null)}>
                      إغلاق الاستوديو
                    </Button>
                  </div>
                </div>
              </Modal>
            )}

            {/* Modal 3: Suspend Account for Violations */}
            {suspendModal && (
              <Modal
                title={`تجميد حساب المنشأة: ${suspendModal.name}`}
                onClose={() => setSuspendModal(null)}
              >
                <Form
                  onSubmit={async (f) => {
                    const reason = String(f.get("reason"));
                    if (
                      await run({
                        type: "suspendAccount",
                        id: suspendModal.id,
                        reason,
                      })
                    ) {
                      setSuspendModal(null);
                    }
                  }}
                >
                  <p className="text-sm text-red-600 mb-3">
                    تنبيه: تجميد الحساب سيوقف فورياً قدرة المنشأة على عرض الأدوية أو الشراء أو إجراء المناقلات.
                  </p>
                  <Field
                    name="reason"
                    label="سبب التجميد أو وصف المخالفة المهنية"
                    defaultValue="مخالفة شروط تداول الأدوية المنصوص عليها"
                    required
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <Button type="button" variant="secondary" onClick={() => setSuspendModal(null)}>
                      إلغاء
                    </Button>
                    <Button type="submit" variant="danger" disabled={busy}>
                      تأكيد قرار التجميد
                    </Button>
                  </div>
                </Form>
              </Modal>
            )}

            {/* Modal 4: Renew License Date */}
            {renewModal && (
              <Modal
                title={`تمديد / تجديد ترخيص: ${renewModal.name}`}
                onClose={() => setRenewModal(null)}
              >
                <Form
                  onSubmit={async (f) => {
                    const expiry = String(f.get("expiry"));
                    if (
                      await run({
                        type: "updateLicenseExpiry",
                        id: renewModal.id,
                        expiry,
                      })
                    ) {
                      setRenewModal(null);
                    }
                  }}
                >
                  <p className="text-sm text-slate-600 mb-3">
                    أدخل تاريخ الانتهاء الجديد المعتمد وفق سند التجديد الرسمي الصادر من وزارة الصحة.
                  </p>
                  <Field
                    name="expiry"
                    type="date"
                    label="تاريخ الانتهاء الجديد للترخيص"
                    defaultValue={renewModal.licenseExpiry || ""}
                    required
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <Button type="button" variant="secondary" onClick={() => setRenewModal(null)}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={busy}>
                      حفظ وتحديث الترخيص
                    </Button>
                  </div>
                </Form>
              </Modal>
            )}

            {/* Modal 5: Reject Account Registration with Reason */}
            {rejectModal && (
              <Modal
                title={`رفض طلب تسجيل: ${rejectModal.name}`}
                onClose={() => setRejectModal(null)}
              >
                <Form
                  onSubmit={async (f) => {
                    const reason = String(f.get("reason"));
                    if (
                      await run({
                        type: "verify",
                        id: rejectModal.id,
                        approve: false,
                        reason,
                      })
                    ) {
                      setRejectModal(null);
                      setInspectAccount(null);
                    }
                  }}
                >
                  <Field
                    name="reason"
                    label="سبب عدم الاعتماد وملاحظات التدقيق"
                    defaultValue="المستندات غير واضحة أو رقم الترخيص غير مطابق لسجلات النقابة"
                    required
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <Button type="button" variant="secondary" onClick={() => setRejectModal(null)}>
                      إلغاء
                    </Button>
                    <Button type="submit" variant="danger" disabled={busy}>
                      تأكيد الرفض وإشعار المنشأة
                    </Button>
                  </div>
                </Form>
              </Modal>
            )}
          </>
        );
      })()}
      {mode === "disputes" && (
        <Card>
          <h3>نزاعات الطلبات الخارجية</h3>
          <p>
            تسوية محلية وفق الكمية التي أكد المشتري قبولها، بعد تسجيل مرجع اتفاق
            الطرفين. لا تُرجع كميات غير مستلمة إلى مخزون البائع.
          </p>
          {state.orders
            .filter((o) => o.status === "dispute")
            .map((o) => (
              <div className="receipt-line mt-5" key={o.id}>
                <h3>{state.items.find((i) => i.id === o.itemId)?.name}</h3>
                <p>
                  المقبول {o.accepted || 0} من {o.quantity} · المبلغ المحجوز{" "}
                  {money(o.amount + o.fee)}
                </p>
                <p>{o.disputeReason}</p>
                <ExternalProcessing id={o.id} />
                <Form
                  onSubmit={(f) =>
                    run({
                      type: "settleOrder",
                      id: o.id,
                      reason: String(f.get("reason")),
                    })
                  }
                >
                  <Field
                    label="مرجع اتفاق الطرفين وسبب التسوية"
                    name="reason"
                  />
                  <Button type="submit" disabled={busy}>
                    تسوية قيمة المقبول ورد الباقي
                  </Button>
                </Form>
              </div>
            ))}
          {!state.orders.some((o) => o.status === "dispute") && (
            <Empty title="لا توجد نزاعات مفتوحة" />
          )}
        </Card>
      )}
      {mode === "audit" && (
        <Card>
          {!events.length ? (
            <Empty title="لم تُسجّل عمليات بعد" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>المستخدم</th>
                    <th>العملية</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .slice()
                    .reverse()
                    .map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.at).toLocaleString("ar-YE")}</td>
                        <td>{e.actor}</td>
                        <td>{e.action}</td>
                        <td>
                          {e.detail}
                          <small>{e.reference.slice(-12)}</small>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {mode === "reports" && (
        actor.role === "admin" ? (
          <div className="space-y-6">
            <PlatformSettingsControl />

            {/* Platform Financial Statistics */}
            {(() => {
              const completedOrders = state.orders.filter((o) =>
                ["completed", "received", "settled"].includes(o.status as any),
              );
              const totalVolume = completedOrders.reduce(
                (sum, o) => sum + (o.amount || 0),
                0,
              );
              const ledgerTotal = (state.feeLedger || []).reduce(
                (sum, e) => sum + e.fee,
                0,
              );
              const totalEarnings =
                state.feeBalance !== undefined && state.feeBalance > 0
                  ? state.feeBalance
                  : ledgerTotal > 0
                    ? ledgerTotal
                    : completedOrders.reduce((sum, o) => sum + (o.fee || 0), 0);
              const activeFee =
                state.platformFeePercent !== undefined
                  ? state.platformFeePercent
                  : 1.5;
              const minDays =
                state.minExpiryDays !== undefined
                  ? state.minExpiryDays
                  : 30;

              const getBranchName = (bId: string) =>
                state.branches.find((b) => b.id === bId)?.name || bId;

              const ledgerEntries =
                state.feeLedger && state.feeLedger.length > 0
                  ? state.feeLedger.slice().reverse()
                  : completedOrders.map((o) => ({
                      id: o.id,
                      orderId: o.id,
                      amount: o.amount,
                      fee: o.fee || (o.amount * activeFee) / 100,
                      feePercent: activeFee,
                      sellerBranchId: o.seller,
                      buyerBranchId: o.buyer,
                      at: o.created,
                    })).reverse();

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          إجمالي أرباح وعمولات المنصة
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-700">
                          <Coins size={18} />
                        </div>
                      </div>
                      <strong className="text-2xl font-black text-emerald-700 block">
                        {money(totalEarnings)}
                      </strong>
                      <small className="text-[11px] text-slate-400 mt-1 block">
                        محصلة من التداولات المنفذة
                      </small>
                    </Card>

                    <Card className="p-4 border-teal-100 bg-gradient-to-br from-white to-teal-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          إجمالي حجم التداولات المنفذة
                        </span>
                        <div className="p-2 rounded-xl bg-teal-100/70 text-teal-700">
                          <TrendingUp size={18} />
                        </div>
                      </div>
                      <strong className="text-2xl font-black text-[#073B59] block">
                        {money(totalVolume)}
                      </strong>
                      <small className="text-[11px] text-slate-400 mt-1 block">
                        إجمالي قيمة صفقات البورصة المكتملة
                      </small>
                    </Card>

                    <Card className="p-4 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          نسبة العمولة المعتمدة
                        </span>
                        <div className="p-2 rounded-xl bg-blue-100/70 text-blue-700">
                          <Percent size={18} />
                        </div>
                      </div>
                      <strong className="text-2xl font-black text-blue-700 block">
                        {activeFee}٪
                      </strong>
                      <small className="text-[11px] text-slate-400 mt-1 block">
                        محددة من قبل المدير في النظام
                      </small>
                    </Card>

                    <Card className="p-4 border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          الحد الأدنى لصلاحية النشر
                        </span>
                        <div className="p-2 rounded-xl bg-amber-100/70 text-amber-700">
                          <CalendarDays size={18} />
                        </div>
                      </div>
                      <strong className="text-2xl font-black text-amber-700 block">
                        {minDays} يومًا
                      </strong>
                      <small className="text-[11px] text-slate-400 mt-1 block">
                        يمنع نشر ما يقل عن هذا الحد
                      </small>
                    </Card>
                  </div>

                  {/* Fee Ledger Card */}
                  <Card className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 mb-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="text-teal-600" size={20} />
                        <div>
                          <h3 className="m-0 text-base font-bold text-slate-800">
                            سجل عمولات وأرباح المنصة (Fee Ledger)
                          </h3>
                          <p className="text-xs text-slate-500 m-0">
                            سجل مالي مفصل لكل عملية بيع وشراء مكتملة مع احتساب عمولة المنصة وحالة التحصيل.
                          </p>
                        </div>
                      </div>
                      <Badge tone="blue">
                        عدد العمليات: {ledgerEntries.length}
                      </Badge>
                    </div>

                    {ledgerEntries.length === 0 ? (
                      <Empty
                        title="لا توجد عمليات عمولة مسجلة بعد"
                        description="عند استلام وتأكيد أي صفقة شراء في البورصة، ستُقيد العمولة فوراً في هذا السجل."
                      />
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>التاريخ والوقت</th>
                              <th>رقم العملية</th>
                              <th>الصيدلية البائعة</th>
                              <th>الصيدلية المشترية</th>
                              <th>قيمة الصفقة</th>
                              <th>نسبة العمولة</th>
                              <th>عمولة المنصة</th>
                              <th>الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerEntries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="text-xs whitespace-nowrap">
                                  {new Date(entry.at).toLocaleString("ar-YE")}
                                </td>
                                <td>
                                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                    {entry.orderId.slice(-8)}
                                  </span>
                                </td>
                                <td className="font-semibold text-slate-800">
                                  {getBranchName(entry.sellerBranchId)}
                                </td>
                                <td className="text-slate-700">
                                  {getBranchName(entry.buyerBranchId)}
                                </td>
                                <td className="font-semibold">
                                  {money(entry.amount)}
                                </td>
                                <td>
                                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                                    {entry.feePercent}٪
                                  </span>
                                </td>
                                <td className="font-bold text-emerald-700">
                                  {money(entry.fee)}
                                </td>
                                <td>
                                  <Badge tone="success">
                                    محققة ومودعة
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              );
            })()}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              <Card>
                <p>قيمة المخزون بالتكلفة المرجعية</p>
                <strong className="stat-number">
                  {money(
                    visibleItems(state, actor).reduce(
                      (n, i) => n + i.quantity * i.price,
                      0,
                    ),
                  )}
                </strong>
                <small>ليست أرباحًا أو قيمة أموال منقذة</small>
              </Card>
              <Card>
                <p>مناقلات مكتملة</p>
                <strong className="stat-number">
                  {
                    visibleTransfers(state, actor).filter(
                      (t) => t.status === "completed",
                    ).length
                  }
                </strong>
              </Card>
              <Card>
                <p>اختلافات مفتوحة</p>
                <strong className="stat-number">
                  {
                    visibleTransfers(state, actor).filter(
                      (t) => t.status === "discrepancy",
                    ).length
                  }
                </strong>
              </Card>
            </div>
            <Card>
              <h3>ملخص المخزون بحسب الفرع</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الفرع</th>
                      <th>بنود المخزون</th>
                      <th>بنود بها حجز</th>
                      <th>قيمة مرجعية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => {
                      const items = visibleItems(state, actor).filter(
                        (i) => i.branchId === b.id,
                      );
                      return (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td>{items.length}</td>
                          <td>
                            {
                              items.filter(
                                (i) => available(state, i.id) < i.quantity,
                              ).length
                            }
                          </td>
                          <td>
                            {money(
                              items.reduce((n, i) => n + i.quantity * i.price, 0),
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      )}
      {mode === "settings" && (
        <div className="space-y-6">
          {/* 1. Main Profile & Organization Identity Card */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 mb-5">
              <div className="flex items-center gap-4">
                {/* Avatar Preview with Camera overlay button */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-2 border-teal-500/30 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {profileAvatar ? (
                      <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-3xl font-bold text-teal-700 bg-teal-50 w-full h-full flex items-center justify-center">
                        {actor.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <label
                    title="تغيير الشعار من الجهاز"
                    className="absolute -bottom-2 -left-2 bg-[#073B59] hover:bg-teal-600 text-white p-2 rounded-xl shadow-lg cursor-pointer transition-all border-2 border-white"
                  >
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressAvatar(file);
                            setProfileAvatar(compressed);
                          } catch (err: any) {
                            alert(err?.message || "تعذر معالجة الصورة");
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-800 m-0">{actor.name}</h2>
                    <Badge tone={actor.verified ? "success" : "warning"}>
                      {actor.verified ? "منشأة معتمدة" : "قيد التوثيق"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 m-0">
                    الدور في المنصة: <strong>{roleNames[actor.role]}</strong> ·{" "}
                    {actor.license ? `رقم الترخيص: ${actor.license}` : "رقم الترخيص غير مسجل"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <label className="button secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer">
                      <Camera size={14} /> تغيير الشعار من الجهاز
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressAvatar(file);
                              setProfileAvatar(compressed);
                            } catch (err: any) {
                              alert(err?.message || "تعذر معالجة الصورة");
                            }
                          }
                        }}
                      />
                    </label>
                    <Button
                      variant="secondary"
                      onClick={() => setPresetModal(true)}
                    >
                      <Sparkles size={14} /> اختيار رمز صيدلاني جاهز
                    </Button>
                    {profileAvatar && (
                      <Button
                        variant="ghost"
                        onClick={() => setProfileAvatar(undefined)}
                      >
                        <Trash2 size={14} /> إزالة الشعار
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {profileSaved && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>تم حفظ وتحديث الملف التعريفي بنجاح!</span>
                </div>
              )}
            </div>

            {/* Profile Fields Form */}
            <Form
              onSubmit={async (f) => {
                const name = String(f.get("name") || "").trim();
                const pharmacistName = String(f.get("pharmacistName") || "").trim();
                const phone = String(f.get("phone") || "").trim();
                const city = String(f.get("city") || "").trim();
                const address = String(f.get("address") || "").trim();
                const operatingHours = String(f.get("operatingHours") || "").trim();
                const bio = String(f.get("bio") || "").trim();

                const ok = await run({
                  type: "updateProfile",
                  name,
                  pharmacistName,
                  phone,
                  city,
                  address,
                  operatingHours,
                  bio,
                  avatarUrl: profileAvatar,
                });
                if (ok) {
                  setProfileSaved(true);
                  setTimeout(() => setProfileSaved(false), 4000);
                }
              }}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field
                  name="name"
                  label="اسم المنشأة الصيدلانية / الفرع"
                  defaultValue={actor.name}
                  required
                />
                <Field
                  name="pharmacistName"
                  label="اسم الصيدلي المسؤول"
                  defaultValue={actor.pharmacistName || ""}
                  placeholder="د. اسم الصيدلي القانوني"
                />
                <Field
                  name="phone"
                  label="رقم هاتف التواصل واللوجستيات"
                  defaultValue={actor.phone || ""}
                  placeholder="مثال: 771234567"
                />
                <Field
                  name="city"
                  label="المحافظة / المدينة"
                  defaultValue={actor.city || (branches[0]?.city || "صنعاء")}
                  placeholder="صنعاء، عدن، تعز..."
                />
                <Field
                  name="address"
                  label="العنوان التفصيلي والشارع"
                  defaultValue={actor.address || ""}
                  placeholder="الشارع، الحي، بجوار معلم معروف..."
                />
                <Field
                  name="operatingHours"
                  label="أوقات العمل والدوام"
                  defaultValue={actor.operatingHours || "على مدار 24 ساعة"}
                  placeholder="مثال: 8:00 ص - 12:00 م"
                />
              </div>

              <div className="mt-4">
                <label className="field">
                  <span>نبذة تعريفية أو تخصص المنشأة الصيدلانية</span>
                  <textarea
                    name="bio"
                    rows={2}
                    defaultValue={actor.bio || ""}
                    placeholder="نبذة مختصرة عن الأصناف المتوفرة، الخدمات، أو أي ملاحظات للتعامل مع الصيدليات الأخرى..."
                    className="w-full"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-200">
                <Button type="submit" disabled={busy}>
                  <CheckCircle2 size={16} /> حفظ تحديثات الملف التعريفي
                </Button>
              </div>
            </Form>
          </Card>

          {/* 2. Branch Alerts & Sales Discount Policies (Two Distinct Cards) */}
          {branches.length > 0 &&
            branches.map((b) => (
              <div key={b.id} className="space-y-4">
                {branches.length > 1 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 first:border-t-0 first:pt-0">
                    <Building2 size={16} className="text-[#073B59]" />
                    <h3 className="text-base font-bold text-slate-800 m-0">
                      إعدادات وسياسات: {b.name}
                    </h3>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-5 items-stretch">
                  {/* Card 1: Supplier Return Alerts */}
                  <Card className="flex flex-col justify-between p-5 border border-slate-200 hover:border-amber-300 transition-colors shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                          <Clock size={18} />
                        </div>
                        <div>
                          <h3 className="m-0 text-base font-bold text-slate-800">
                            تنبيهات مرتجعات الموردين
                          </h3>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {b.name}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        المدة الافتراضية بالأيام لتنبيه الصيدلية قبل انتهاء مهلة إرجاع المورد لجميع الأصناف، ما لم يُحدد استثناء خاص بالدواء من شاشة المخزون.
                      </p>
                    </div>

                    <Form
                      onSubmit={(f) =>
                        run({
                          type: "alertDefault",
                          branchId: b.id,
                          days: Number(f.get("days")),
                        })
                      }
                      className="mt-auto"
                    >
                      <Field
                        name="days"
                        label="مدة التنبيه الافتراضية بالأيام"
                        type="number"
                        min={0}
                        max={365}
                        defaultValue={b.alertDays ?? 10}
                      />
                      <Button type="submit" disabled={busy} className="w-full justify-center">
                        حفظ مدة التنبيه
                      </Button>
                    </Form>
                  </Card>

                  {/* Card 2: Sales Discount Policy */}
                  <Card className="flex flex-col justify-between p-5 border border-slate-200 hover:border-teal-300 transition-colors shadow-sm">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0 shadow-xs">
                            <Percent size={18} />
                          </div>
                          <div>
                            <h3 className="m-0 text-base font-bold text-slate-800">
                              {actor.role === "agency_branch"
                                ? "خصم المبيعات المعتمد من الإدارة"
                                : "نسبة الخصم الافتراضية للمبيعات"}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {b.name}
                            </span>
                          </div>
                        </div>
                        <span className="bg-teal-50 text-teal-700 font-bold px-2.5 py-1 rounded-md text-xs border border-teal-200">
                          {b.defaultDiscount ? `${b.defaultDiscount}٪` : "0٪ (بدون خصم)"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        {actor.role === "agency_branch"
                          ? `سياسة التسعير والخصم في البورصة تخضع للإدارة المركزية للسلسلة. تم اعتماد نسبة ${b.defaultDiscount ? `${b.defaultDiscount}٪` : "0٪ (السعر المرجعي كاملاً)"} كافتراضي لمبيعات هذا الفرع.`
                          : `النسبة الافتراضية المعتمدة لخصم أصناف الصيدلية في البورصة؛ يمكن تحديد أي نسبة بحرية تامة (من 0٪ حتى 99٪)، مع إمكانية استثناء أي صنف يدوياً عند عرضه.`}
                      </p>
                    </div>

                    {actor.role === "agency_branch" ? (
                      <div className="text-[11px] text-teal-800 bg-teal-50/80 p-3 rounded-xl border border-teal-200 flex items-center gap-2 mt-auto">
                        <ShieldAlert size={16} className="text-teal-600 shrink-0" />
                        <span>تعديل سياسة الخصم والاعتماد المالي محصور بصلاحيات الإدارة المركزية للسلسلة.</span>
                      </div>
                    ) : (
                      <Form
                        onSubmit={(f) =>
                          run({
                            type: "discountDefault",
                            branchId: b.id,
                            discount: Number(f.get("discount")),
                          })
                        }
                        className="mt-auto"
                      >
                        <Field
                          name="discount"
                          label="نسبة الخصم الافتراضية للصيدلية (٪)"
                          type="number"
                          min={0}
                          max={99}
                          step={1}
                          defaultValue={b.defaultDiscount ?? 0}
                        />
                        <Button type="submit" disabled={busy} className="w-full justify-center">
                          حفظ نسبة الخصم الافتراضية
                        </Button>
                      </Form>
                    )}
                  </Card>
                </div>
              </div>
            ))}

            {actor.role === "admin" && (
              <>
                <PlatformSettingsControl />
                <BackupTools />
              </>
            )}

          {/* 3. Preset Avatar Picker Modal */}
          {presetModal && (
            <Modal
              title="اختيار رمز صيدلاني معتمد للمنشأة"
              onClose={() => setPresetModal(false)}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setProfileAvatar(preset.dataUrl);
                      setPresetModal(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform bg-white">
                      <img src={preset.dataUrl} alt={preset.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4 pt-3 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setPresetModal(false)}>
                  إغلاق
                </Button>
              </div>
            </Modal>
          )}
        </div>
      )}
      {mode === "brand" && (
        <>
          <Card>
            <img
              className="identity-board"
              src="./brand/identity.png"
              alt="هوية فارما لينك الأصلية المرفقة: شعار كحلي وفيروزي وتبادل دوائي موثوق بين الصيدليات"
            />
          </Card>
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              ["#073B59", "الكحلي"],
              ["#00ADB5", "الفيروزي"],
              ["#F4F7FA", "خلفية العمل"],
            ].map(([c, n]) => (
              <Card key={c}>
                <div
                  style={{
                    background: c,
                    height: 70,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                />
                <strong>{n}</strong>
                <code className="block">{c}</code>
              </Card>
            ))}
          </div>
        </>
      )}
      {mode === "radar" && <Radar />}
      {add && (
        <Modal title="إضافة فرع للسلسلة" onClose={() => setAdd(false)}>
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "addBranch",
                  name: String(f.get("name")),
                  city: String(f.get("city")),
                  license: String(f.get("license")),
                })
              )
                setAdd(false);
            }}
          >
            <Field label="اسم الفرع" name="name" />
            <Field label="المدينة" name="city" />
            <Field label="رقم الترخيص الحقيقي المُدخل" name="license" />
            <p>
              ينشأ حساب تجريبي غير موثق للفرع؛ يعتمد مدير المنصة التوثيق قبل
              تفعيل عملياته.
            </p>
            <Button type="submit" disabled={busy}>
              إضافة وإرسال للمراجعة
            </Button>
          </Form>
        </Modal>
      )}
    </>
  );
}
