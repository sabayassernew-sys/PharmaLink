import { ExternalProcessing } from "../components/ExternalProcessing";
import { BackupTools } from "../components/BackupTools";
import { Radar } from "./Radar";
import { SubscriptionsView } from "../components/SubscriptionsView";
import { useState, useEffect } from "react";
import {
  Plus,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Ban,
  RotateCcw,
  Clock,
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
  roleNames,
} from "../domain/access";
import type { Account } from "../domain/types";

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
  const currentNearDays =
    state.nearExpiryAlertDays !== undefined ? state.nearExpiryAlertDays : 90;

  const [fee, setFee] = useState<number | "">(currentFee);
  const [minDays, setMinDays] = useState<number | "">(currentMinDays);
  const [nearAlertDays, setNearAlertDays] = useState<number | "">(currentNearDays);

  useEffect(() => {
    setFee(
      state.platformFeePercent !== undefined ? state.platformFeePercent : 1.5,
    );
    setMinDays(state.minExpiryDays !== undefined ? state.minExpiryDays : 30);
    setNearAlertDays(
      state.nearExpiryAlertDays !== undefined ? state.nearExpiryAlertDays : 90,
    );
  }, [state.platformFeePercent, state.minExpiryDays, state.nearExpiryAlertDays]);

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
            تحكم مركزي مباشر في نسبة عمولة المنصة، وضابط الحد الأدنى لصلاحية التداول، وفترة الإنذار المبكر للمخزون.
          </p>
        </div>
      </div>

      <Form
        onSubmit={async (f) => {
          const rawFee = f.get("fee");
          const rawDays = f.get("minDays");
          const rawNearDays = f.get("nearDays");
          const feePercent =
            rawFee === "" || rawFee === null ? undefined : Number(rawFee);
          const minExpiryDays =
            rawDays === "" || rawDays === null ? undefined : Number(rawDays);
          const nearExpiryAlertDays =
            rawNearDays === "" || rawNearDays === null ? undefined : Number(rawNearDays);

          if (
            await run({
              type: "setPlatformSettings",
              feePercent,
              minExpiryDays,
              nearExpiryAlertDays,
            })
          ) {
            notify("تم حفظ وتطبيق سياسات المنصة بنجاح");
          }
        }}
      >
        <div className="grid md:grid-cols-3 gap-4 mb-4">
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

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock size={16} className="text-teal-600" />
                نافذة الإنذار المبكر للصلاحية
              </span>
              <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded text-xs border border-teal-200">
                الحالي: {currentNearDays} يوم
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              فترة الأيام التي يعتبر النظام خلالها الدواء مقارباً على الانتهاء لتنبيه الصيدليات في المخزون والداشبورد.
            </p>
            <label className="field m-0">
              <span>أيام الإنذار المبكر (يوم)</span>
              <input
                name="nearDays"
                type="number"
                min={1}
                max={365}
                step={1}
                required
                value={nearAlertDays}
                onChange={(e) =>
                  setNearAlertDays(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 m-0">
            * تسري هذه السياسات فوراً على كافة عمليات النشر والشراء وتنبيهات المخزون في النظام.
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
    | "disputes"
    | "subscriptions";
}) {
  const { state, actor, run, busy } = useApp();
  const [add, setAdd] = useState(false);
  const [verifyTab, setVerifyTab] = useState<"pending" | "active" | "suspended">("pending");
  const [inspectAccount, setInspectAccount] = useState<Account | null>(null);
  const [suspendModal, setSuspendModal] = useState<Account | null>(null);
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
    subscriptions: "الاشتراكات والباقات",
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
          mode === "subscriptions"
            ? actor.role === "admin"
              ? "إدارة باقات اشتراك الصيدليات، متابعة التجديدات والفواتير، والتحكم بأسعار وخصائص كل باقة."
              : "إدارة ومتابعة خطة اشتراك منشأتك الصيدلانية، تاريخ الصلاحية، والتجديد المالي."
            : mode === "reports" && actor.role === "admin"
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
      {mode === "subscriptions" && <SubscriptionsView />}
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

        return (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              <Card className="wallet-summary">
                <ShieldCheck className="text-teal-600" />
                <div>
                  <p>طلبات بانتظار الاعتماد</p>
                  <strong className="text-xl text-teal-700">{pendingAccounts.length}</strong>
                  <small className="block text-slate-400">تحتاج موافقة الإدارة</small>
                </div>
              </Card>
              <Card className="wallet-summary">
                <CheckCircle2 className="text-emerald-600" />
                <div>
                  <p>منشآت معتمدة ونشطة</p>
                  <strong className="text-xl text-emerald-700">{verifiedAccounts.length}</strong>
                  <small className="block text-slate-400">حسابات مؤهلة للتداول</small>
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
                ["pending", `طلبات التسجيل الجديدة (${pendingAccounts.length})`],
                ["active", `المنشآت المعتمدة (${verifiedAccounts.length})`],
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
                  <span>طلبات التسجيل الجديدة بانتظار اعتماد وموافقة إدارة المنصة</span>
                </div>
                {!pendingAccounts.length ? (
                  <Empty title="لا توجد طلبات تسجيل معلقة حالياً" description="جميع طلبات المنشآت تمت مراجعتها والبت فيها." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>المنشأة والمسؤول</th>
                          <th>نوع المنشأة</th>
                          <th>بيانات التواصل</th>
                          <th>الموقع الجغرافي</th>
                          <th>التراخيص الصيدلانية</th>
                          <th>الحالة</th>
                          <th>الإجراء والاعتماد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAccounts.map((a) => {
                          const chain = a.chainId ? state.chains.find((c) => c.id === a.chainId) : null;
                          return (
                            <tr key={a.id}>
                              <td>
                                <strong>{a.name}</strong>
                                <small className="block text-slate-500">
                                  {a.pharmacistName ? `الصيدلي: ${a.pharmacistName}` : "—"}
                                </small>
                              </td>
                              <td>
                                {a.facilityType === "agency_master" || a.role === "agency_master" ? (
                                  <Badge tone="blue">إدارة سلسلة مركزية</Badge>
                                ) : chain || a.facilityType === "agency_branch" ? (
                                  <Badge tone="blue">فرع لسلسلة ({chain?.name || "سلسلة"})</Badge>
                                ) : (
                                  <Badge tone="neutral">صيدلية مستقلة</Badge>
                                )}
                              </td>
                              <td>
                                <span className="font-mono text-xs font-bold text-slate-800 block">{a.phone || "—"}</span>
                                <small className="font-mono text-xs text-slate-500 block">{a.email}</small>
                              </td>
                              <td>
                                <strong className="text-xs block text-slate-800">{a.city || "صنعاء"}</strong>
                                {a.address && <small className="block text-slate-500 text-xs">{a.address}</small>}
                              </td>
                              <td>
                                <div>
                                  <span className="text-[11px] text-slate-400 block">ترخيص المنشأة:</span>
                                  <code className="text-teal-700 font-bold">{a.license || "—"}</code>
                                </div>
                                {a.practiceLicense && (
                                  <div className="mt-1">
                                    <span className="text-[11px] text-slate-400 block">مزاولة المهنة:</span>
                                    <span className="font-mono text-xs text-slate-700">{a.practiceLicense}</span>
                                  </div>
                                )}
                              </td>
                              <td>
                                <Badge tone={a.rejection ? "danger" : "warning"}>
                                  {a.rejection ? "مرفوض سابقاً" : "بانتظار الاعتماد"}
                                </Badge>
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setInspectAccount(a)}
                                  >
                                    <ShieldCheck size={15} /> مراجعة والاعتماد
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
                  <span>قائمة المنشآت الصيدلانية المعتمدة وصلاحياتها في المنصة</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>المنشأة</th>
                        <th>الصيدلي والترخيص</th>
                        <th>حالة الحساب</th>
                        <th>الإجراءات الرقابية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedAccounts.map((a) => {
                        const chain = a.chainId ? state.chains.find((c) => c.id === a.chainId) : null;
                        return (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.name}</strong>
                              <small className="block text-slate-500">
                                {a.facilityType === "agency_master" || a.role === "agency_master"
                                  ? "إدارة سلسلة مركزية"
                                  : chain || a.facilityType === "agency_branch" || a.role === "agency_branch"
                                  ? `فرع لسلسلة (${chain?.name || "سلسلة"})`
                                  : "صيدلية مستقلة"}
                              </small>
                            </td>
                          <td>
                            <span>{a.pharmacistName || "—"}</span>
                            <code className="block text-xs text-slate-500">{a.license || "—"}</code>
                          </td>
                          <td>
                            <Badge tone={a.suspended ? "danger" : "success"}>
                              {a.suspended ? "مجمد لمخالفة" : "معتمد ونشط"}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="ghost"
                                onClick={() => setInspectAccount(a)}
                              >
                                <Building2 size={15} /> بيانات المنشأة
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

            {/* Modal: Review & Approve Account */}
            {inspectAccount && (
              <Modal
                title={`مراجعة واعتماد: ${inspectAccount.name}`}
                onClose={() => setInspectAccount(null)}
              >
                {(() => {
                  const chain = inspectAccount.chainId
                    ? state.chains.find((c) => c.id === inspectAccount.chainId)
                    : null;
                  return (
                    <div className="space-y-4 text-right">
                      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-800 m-0">
                            {inspectAccount.name}
                          </h3>
                          <p className="text-xs text-slate-600 m-0 mt-0.5">
                            {inspectAccount.facilityType === "agency_master"
                              ? "إدارة سلسلة مركزية (مقر رئيسي)"
                              : chain
                                ? `فرع تابع لسلسلة: ${chain.name}`
                                : "صيدلية مستقلة"}
                          </p>
                        </div>
                        <Badge tone={inspectAccount.verified ? "success" : "warning"}>
                          {inspectAccount.verified ? "منشأة معتمدة" : "طلب بانتظار الاعتماد"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-500 font-bold block">نوع المنشأة:</span>
                          <strong className="text-teal-800">
                            {inspectAccount.facilityType === "agency_master"
                              ? "إدارة سلسلة مركزية"
                              : chain
                                ? `فرع لسلسلة (${chain.name})`
                                : "صيدلية مستقلة"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">الصيدلي المسؤول:</span>
                          <strong className="text-slate-800">{inspectAccount.pharmacistName || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">رقم الهاتف والواتساب:</span>
                          <strong className="text-slate-800 font-mono">{inspectAccount.phone || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">البريد الإلكتروني الرسمي:</span>
                          <strong className="text-slate-800 font-mono">{inspectAccount.email || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">المدينة والمحافظة:</span>
                          <strong className="text-slate-800">{inspectAccount.city || "صنعاء"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">العنوان والشارع (أقرب معلم):</span>
                          <strong className="text-slate-800">{inspectAccount.address || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">رقم ترخيص فتح المنشأة الصيدلانية:</span>
                          <strong className="text-teal-700 font-mono">{inspectAccount.license || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">ترخيص مزاولة المهنة للصيدلي:</span>
                          <strong className="text-slate-700 font-mono">{inspectAccount.practiceLicense || "لم يُسجل (اختياري)"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">تاريخ انتهاء سريان ترخيص المنشأة:</span>
                          <strong className="text-slate-700 font-mono">{inspectAccount.licenseExpiry || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">رقم السجل التجاري:</span>
                          <strong className="text-slate-700 font-mono">{inspectAccount.commercialRegister || "—"}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-bold block">الرقم الضريبي:</span>
                          <strong className="text-slate-700 font-mono">{inspectAccount.taxNumber || "—"}</strong>
                        </div>
                      </div>

                      {!inspectAccount.verified && (
                        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 mt-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              disabled={busy}
                              onClick={async () => {
                                if (
                                  await run({
                                    type: "verify",
                                    id: inspectAccount.id,
                                    approve: true,
                                  })
                                ) {
                                  setInspectAccount(null);
                                }
                              }}
                            >
                              <ShieldCheck size={16} /> اعتماد وتفعيل المنشأة فوراً ✅
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
                            إلغاء
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  ? state.feeLedger
                      .map((e) => {
                        const calculatedFee =
                          e.fee && e.fee > 0
                            ? e.fee
                            : Math.round(
                                (e.amount * (e.feePercent || activeFee)) / 100,
                              ) ||
                              (totalEarnings > 0 && state.feeLedger!.length === 1
                                ? totalEarnings
                                : 0);
                        return {
                          ...e,
                          fee: calculatedFee,
                        };
                      })
                      .slice()
                      .reverse()
                  : completedOrders
                      .map((o) => ({
                        id: o.id,
                        orderId: o.id,
                        amount: o.amount,
                        fee:
                          o.fee && o.fee > 0
                            ? o.fee
                            : Math.round((o.amount * activeFee) / 100),
                        feePercent: activeFee,
                        sellerBranchId: o.seller,
                        buyerBranchId: o.buyer,
                        at: o.created,
                      }))
                      .reverse();

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
                {branches.length > 1 ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 first:border-t-0 first:pt-0">
                    <Building2 size={16} className="text-[#073B59]" />
                    <h3 className="text-base font-bold text-slate-800 m-0">
                      إعدادات وسياسات: {b.name}
                    </h3>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <Sliders size={18} className="text-teal-700" />
                    <div>
                      <h3 className="text-base font-bold text-slate-800 m-0">
                        {actor.role === "independent"
                          ? "السياسات العامة الموحدة للصيدلية (الموردين ونسبة الخصم)"
                          : "السياسات التشغيلية المعتمدة"}
                      </h3>
                      <p className="text-xs text-slate-500 m-0">
                        {actor.role === "independent"
                          ? "تُحدد هذه السياسات حصراً هنا في الإعدادات وتُطبق تلقائياً على كافة أدوية ومبيعات الصيدلية دون الحاجة لتحديدها لكل بند على حدة."
                          : "السياسات المعتمدة للمورد وفترات السماح ونسب الخصم."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-5 items-stretch">
                  {/* Card 1: Supplier & Return Policy */}
                  <Card className="flex flex-col justify-between p-5 border border-slate-200 hover:border-amber-300 transition-colors shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                          <Clock size={18} />
                        </div>
                        <div>
                          <h3 className="m-0 text-base font-bold text-slate-800">
                            {actor.role === "agency_branch"
                              ? "سياسة المورد ومهلة الإرجاع المعتمدة من الإدارة"
                              : actor.role === "independent"
                                ? "المورد المعتمد وسياسة مهل الإرجاع"
                                : "سياسة المورد ومهلة الإرجاع"}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {actor.role === "independent" ? "تسري آلياً على كافة أدوية الصيدلية" : b.name}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        {actor.role === "agency_branch"
                          ? `سياسة المورد وفترات مهل الإرجاع تخضع للإدارة المركزية للسلسلة. تم اعتماد ${b.supplierName || "شركة اليمامة للأدوية"} بمهلة إرجاع قبل انتهاء الصلاحية بـ (${b.returnWindowDays ?? 90} يوماً). تُحسب مواعيد كافة أدوية الفرع آلياً.`
                          : actor.role === "independent"
                            ? "تحديد المورد المعتمد لصيدليتكم مع شرط مهلة الإرجاع قبل انتهاء الصلاحية؛ لحساب مواعيد وتنبيهات كافة أدوية الصيدلية آلياً في رادار المرتجعات دون حاجة لتحديدها في كل بند."
                            : "تحديد المورد المعتمد للفرع مع شرط مهلة الإرجاع قبل انتهاء الصلاحية، لحساب مهل كافة أدوية الفرع آلياً والتنبيه قبل فواتها."}
                      </p>
                    </div>

                    {actor.role === "agency_branch" ? (
                      <div className="text-[11px] text-amber-950 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-2 mt-auto">
                        <div className="flex items-center gap-2 font-bold text-amber-800">
                          <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                          <span>سياسة مورد الفرع معتمدة مركزياً من إدارة السلسلة</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-amber-200/60">
                          <div>
                            <span className="text-slate-500">المورد المعتمد:</span>{" "}
                            <strong className="text-slate-800">{b.supplierName || "شركة اليمامة للأدوية"}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">شرط الإرجاع:</span>{" "}
                            <strong className="text-slate-800">قبل {b.returnWindowDays ?? 90} يوماً</strong>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">التنبيه المسبق:</span>{" "}
                            <strong className="text-slate-800">{b.alertDays ?? 10} أيام قبل حلول المهلة</strong>
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-700 m-0">
                          تعديل سياسة المورد وفترات السماح محصور بصلاحيات الإدارة المركزية للسلسلة وتُطبق آلياً على أدويتكم.
                        </p>
                      </div>
                    ) : (
                      <Form
                        onSubmit={(f) =>
                          run({
                            type: "setBranchSupplierPolicy",
                            branchId: b.id,
                            supplierName: String(f.get("supplierName") || ""),
                            returnWindowDays: Number(f.get("returnWindowDays") || 90),
                            alertDays: Number(f.get("days") || 10),
                          })
                        }
                        className="mt-auto flex flex-col gap-3"
                      >
                        <Field
                          name="supplierName"
                          label={actor.role === "independent" ? "المورد المعتمد للصيدلية" : "المورد المعتمد للفرع"}
                          defaultValue={b.supplierName ?? (actor.role === "independent" ? "شركة الرعاية الحديثة للأدوية" : "شركة اليمامة للأدوية")}
                          placeholder={actor.role === "independent" ? "مثال: شركة الرعاية الحديثة للأدوية" : "مثال: شركة اليمامة للأدوية"}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Field
                            name="returnWindowDays"
                            label="شرط الإرجاع (قبل الصلاحية بـ أيام)"
                            type="number"
                            min={1}
                            max={365}
                            defaultValue={b.returnWindowDays ?? 90}
                          />
                          <Field
                            name="days"
                            label="التنبيه المسبق (أيام قبل المهلة)"
                            type="number"
                            min={0}
                            max={365}
                            defaultValue={b.alertDays ?? 10}
                          />
                        </div>
                        <Button type="submit" disabled={busy} className="w-full justify-center mt-2">
                          {actor.role === "independent" ? "اعتماد سياسة مورد الصيدلية" : "اعتماد سياسة مورد الفرع"}
                        </Button>
                      </Form>
                    )}
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
                                : actor.role === "independent"
                                  ? "نسبة الخصم العامة لمبيعات البورصة"
                                  : "نسبة الخصم الافتراضية للمبيعات"}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {actor.role === "independent" ? "تسري تلقائياً وموحّدة على كافة مبيعات الصيدلية" : b.name}
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
                          : actor.role === "independent"
                            ? "النسبة العامة المعتمدة لخصم أدوية الصيدلية عند طرحها في البورصة الدوائية؛ تسري تلقائياً على كافة مبيعات الصيدلية لتوفير الوقت دون الحاجة لتحديد خصم لكل بند على حدة."
                            : "النسبة الافتراضية المعتمدة لخصم أصناف الصيدلية في البورصة؛ تسري كسياسة افتراضية لكافة مبيعات الفرع."}
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
                          label={actor.role === "independent" ? "نسبة الخصم العامة للصيدلية (٪)" : "نسبة الخصم الافتراضية للفرع (٪)"}
                          type="number"
                          min={0}
                          max={99}
                          step={1}
                          defaultValue={b.defaultDiscount ?? 0}
                        />
                        <Button type="submit" disabled={busy} className="w-full justify-center">
                          {actor.role === "independent" ? "اعتماد وتطبيق نسبة الخصم العامة" : "حفظ نسبة الخصم الافتراضية"}
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
