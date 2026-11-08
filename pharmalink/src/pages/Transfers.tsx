import { useState } from "react";
import {
  ArrowRightLeft,
  Printer,
  Eye,
  Check,
  Send,
  PackageCheck,
  Plus,
  X,
  Search,
} from "lucide-react";
import { useApp } from "../context";
import {
  visibleTransfers,
  available,
  eligible,
  querySisterBranchesAvailability,
} from "../domain/access";
import type { Transfer, Receipt, State } from "../domain/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  ConfirmModal,
  PageTitle,
  TransferStatusBadge,
} from "../components/UI";

function getRejectingParty(t: Transfer, state: State) {
  const closeEvent = state.events
    .filter(
      (e) =>
        e.reference === t.id &&
        (e.action.includes("إغلاق") ||
          e.action.includes("رفض") ||
          e.action.includes("إلغاء") ||
          e.detail === "rejected" ||
          e.detail === "cancelled"),
    )
    .slice(-1)[0];

  let branchId = t.rejectedBy;
  const actorName = closeEvent?.actor;
  const dateStr = closeEvent ? new Date(closeEvent.at).toLocaleString("ar-YE") : undefined;

  const fromBranch = state.branches.find((b) => b.id === t.from);
  const toBranch = state.branches.find((b) => b.id === t.to);

  if (branchId === "agency_master") {
    return {
      branchId: "agency_master",
      branchName: "إدارة السلسلة / الوكالة",
      roleType: "management" as const,
      roleLabel: "إدارة الوكالة (الإدارة العامة)",
      actorName,
      dateStr,
    };
  }

  if (!branchId && closeEvent) {
    const matchedAccount = state.accounts.find(
      (a) => a.name === closeEvent.actor || (closeEvent.actor && closeEvent.actor.includes(a.name)),
    );
    if (matchedAccount?.branchId) {
      branchId = matchedAccount.branchId;
    } else if (matchedAccount?.role === "agency_master") {
      return {
        branchId: "agency_master",
        branchName: "إدارة السلسلة / الوكالة",
        roleType: "management" as const,
        roleLabel: "إدارة الوكالة (الإدارة العامة)",
        actorName,
        dateStr,
      };
    } else if (toBranch && closeEvent.actor.includes(toBranch.name)) {
      branchId = t.to;
    } else if (fromBranch && closeEvent.actor.includes(fromBranch.name)) {
      branchId = t.from;
    } else if (closeEvent.actor.includes("السبعين")) {
      branchId = t.to;
    } else if (closeEvent.actor.includes("حدة")) {
      branchId = t.from;
    } else if (closeEvent.actor.includes("إدارة")) {
      return {
        branchId: "agency_master",
        branchName: "إدارة السلسلة / الوكالة",
        roleType: "management" as const,
        roleLabel: "إدارة الوكالة (الإدارة العامة)",
        actorName,
        dateStr,
      };
    }
  }

  if (!branchId) {
    if (t.senderApproved && !t.receiverApproved) {
      branchId = t.to;
    } else if (!t.senderApproved && t.receiverApproved) {
      branchId = t.from;
    }
  }

  if (branchId === t.to) {
    return {
      branchId: t.to,
      branchName: toBranch ? toBranch.name : "الفرع المستلم",
      roleType: "receiver" as const,
      roleLabel: "الفرع المستلم (الطالب)",
      actorName,
      dateStr,
    };
  }

  if (branchId === t.from) {
    return {
      branchId: t.from,
      branchName: fromBranch ? fromBranch.name : "الفرع المرسل",
      roleType: "sender" as const,
      roleLabel: "الفرع المرسل (المزوّد)",
      actorName,
      dateStr,
    };
  }

  return {
    branchId: undefined,
    branchName: "أحد أطراف المناقلة",
    roleType: "other" as const,
    roleLabel: "الفرع القائم بالإلغاء / الرفض",
    actorName,
    dateStr,
  };
}

export function Transfers() {
  const { state, actor, run, busy } = useApp();
  const [tab, setTab] = useState("all");
  const [create, setCreate] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [transferMode, setTransferMode] = useState<"request" | "supply">("request");
  const [searchDrug, setSearchDrug] = useState("");
  const [selectedSisterItem, setSelectedSisterItem] = useState<{
    itemId: string;
    drugName: string;
    branchId: string;
    branchName: string;
    unit: string;
  } | null>(null);
  const [source, setSource] = useState(
    actor.branchId ||
      state.branches.find((b) => b.chainId === actor.chainId)?.id ||
      "",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt[] | null>(null);
  const [resolution, setResolution] = useState<{
    id: string;
    itemId: string;
  } | null>(null);

  const openCreateModal = () => {
    setSearchDrug("");
    setSelectedSisterItem(null);
    if (actor.role === "agency_branch") {
      setTransferMode("request");
      const other = state.branches.find(
        (b) => b.chainId === actor.chainId && b.id !== actor.branchId,
      )?.id;
      setSource(other || actor.branchId || "");
    } else {
      setSource(
        state.branches.find((b) => b.chainId === actor.chainId)?.id || "",
      );
    }
    setCreate(true);
  };
  const transfers = visibleTransfers(state, actor);
  const branch = (id: string) =>
    state.branches.find((b) => b.id === id)?.name || id;
  const visible = transfers.filter((t) =>
    tab === "all" || tab === "incoming"
      ? tab === "all" || t.to === actor.branchId
      : tab === "outgoing"
        ? t.from === actor.branchId
        : tab === "closed"
          ? ["completed", "cancelled", "rejected"].includes(t.status)
          : t.status === tab,
  );
  const current = transfers.find((t) => t.id === selected);
  const canApproveOrReject = (t: Transfer) => {
    if (
      [
        "cancelled",
        "rejected",
        "completed",
        "sent",
        "discrepancy",
        "ready",
      ].includes(t.status)
    )
      return false;
    if (actor.branchId === t.from) return !t.senderApproved;
    if (actor.branchId === t.to) return !t.receiverApproved;
    return false;
  };
  return (
    <>
      <PageTitle
        eyebrow="حركة مخزون موثقة"
        title="المناقلات الداخلية"
        description="إدارة وتتبع حركة مناقلات الأدوية بين فروع السلسلة من الطلب والاعتماد حتى الفحص والاستلام."
        actions={
          actor.role === "agency_branch" ? (
            <Button onClick={openCreateModal}>
              <Plus size={16} /> طلب مناقلة جديدة
            </Button>
          ) : undefined
        }
      />

      <div className="tabs mb-5">
        {[
          ["all", "جميع المناقلات"],
          ["incoming", "واردة"],
          ["outgoing", "صادرة"],
          ["sent", "بانتظار الاستلام"],
          ["discrepancy", "الاختلافات"],
          ["closed", "المغلقة"],
        ]
          .filter(
            ([k]) =>
              actor.role !== "agency_master" ||
              !["incoming", "outgoing"].includes(k),
          )
          .map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={key === tab ? "active" : ""}
            >
              {label}
            </button>
          ))}
      </div>
      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم المناقلة</th>
                <th>من / إلى</th>
                <th>الأصناف</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.code}</code>
                  </td>
                  <td>
                    <strong>{branch(t.from)}</strong>
                    <small>إلى {branch(t.to)}</small>
                  </td>
                  <td>
                    {t.lines.map((l) => l.name).join("، ")}
                    <small>
                      {t.lines.reduce((n, l) => n + l.quantity, 0)} وحدة •{" "}
                      {t.lines.length} بند
                    </small>
                  </td>
                  <td>{new Date(t.created).toLocaleDateString("ar-YE")}</td>
                  <td>
                    <TransferStatusBadge
                      transfer={t}
                      branchId={actor.branchId}
                      isMaster={actor.role === "agency_master"}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={canApproveOrReject(t) ? "primary" : "ghost"}
                        onClick={() => setSelected(t.id)}
                        className={canApproveOrReject(t) ? "!px-3 !py-1 text-xs font-bold" : ""}
                      >
                        <Eye size={16} /> {canApproveOrReject(t) ? "مراجعة واتخاذ قرار" : "التفاصيل"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <Empty
            title={
              tab === "sent"
                ? "لا توجد شحنات بانتظار الاستلام"
                : tab === "discrepancy"
                  ? "لا توجد أي اختلافات مسجلة"
                  : tab === "incoming"
                    ? "لا توجد طلبات مناقلة واردة"
                    : tab === "outgoing"
                      ? "لا توجد طلبات مناقلة صادرة"
                      : tab === "closed"
                        ? "لا توجد مناقلات مغلقة أو ملغاة"
                        : "لا توجد مناقلات في هذا القسم"
            }
            description={
              tab === "sent"
                ? "سجل الشحنات الواردة محدّث بالكامل، ولا توجد أي أدوية مشحونة في الطريق لفرعك حالياً."
                : tab === "discrepancy"
                  ? "كافة عمليات الاستلام تمت بمطابقة تامة وسليمة 100% دون وجود فوارق أو عجز."
                  : tab === "incoming"
                    ? "لم يتلقَ فرعك أي طلبات استجرار من الفروع الشقيقة في الوقت الحالي."
                    : tab === "outgoing"
                      ? "لم يقم فرعك بإنشاء أي طلبات مناقلة صادرة مفتوحة حالياً."
                      : tab === "closed"
                        ? "سجل الأرشيف نظيف، ولا توجد أي طلبات مناقلة مرفوضة أو مغلقة."
                        : "لا توجد حركة مناقلات مسجلة في هذا القسم حتى الآن."
            }
          />
        )}
      </Card>
      {current && (
        <Modal
          title={`مناقلة ${current.code}`}
          wide
          onClose={() => {
            setSelected(null);
            setReceipt(null);
          }}
        >
          <div className="print-voucher">
            <div className="voucher-title">
              <div>
                <h3>
                  {["ready", "sent", "completed"].includes(current.status)
                    ? "سند مناقلة داخلية — PharmaLink"
                    : "تفاصيل طلب مناقلة داخلية"}
                </h3>
                <p>{current.code} · عمولة المنصة: 0 ر.ي (مجانية بين الفروع)</p>
              </div>
              <TransferStatusBadge
                transfer={current}
                branchId={actor.branchId}
                isMaster={actor.role === "agency_master"}
              />
            </div>
            <div className="transfer-route">
              <div>
                <small className="text-slate-500 text-xs block mb-1">الفرع المرسل (المزوّد)</small>
                <h3 className="text-base font-bold text-slate-900 m-0">{branch(current.from)}</h3>
                <div className="mt-2">
                  {(() => {
                    if (["rejected", "cancelled"].includes(current.status)) {
                      const party = getRejectingParty(current, state);
                      if (party.roleType === "sender") {
                        return <Badge tone="danger">✗ تم الرفض من هذا الفرع (المرسل)</Badge>;
                      }
                      if (party.roleType === "receiver") {
                        return <Badge tone="neutral">لم تكتمل (مرفوضة من المستلم)</Badge>;
                      }
                      if (party.roleType === "management") {
                        return <Badge tone="danger">✗ أُلغي بقرار من إدارة الوكالة</Badge>;
                      }
                      return <Badge tone="danger">مرفوضة</Badge>;
                    }
                    if (current.status === "discrepancy") {
                      return <Badge tone="success">✓ تم الشحن والإرسال الفعلي</Badge>;
                    }
                    if (current.status === "completed") {
                      return <Badge tone="success">✓ تم الإرسال والشحن</Badge>;
                    }
                    if (current.status === "ready") {
                      return <Badge tone="success">✓ وافق المرسل (جاهز للإرسال)</Badge>;
                    }
                    if (current.status === "sent") {
                      return <Badge tone="success">✓ تم الشحن والإرسال</Badge>;
                    }
                    return (
                      <Badge tone={current.senderApproved ? "success" : "warning"}>
                        {current.senderApproved ? "✓ موافقة المرسل معتمدة" : "بانتظار موافقة المرسل"}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              <ArrowRightLeft size={24} className="text-teal-600 shrink-0" />
              <div>
                <small className="text-slate-500 text-xs block mb-1">الفرع المستلم (الطالب)</small>
                <h3 className="text-base font-bold text-slate-900 m-0">{branch(current.to)}</h3>
                <div className="mt-2">
                  {(() => {
                    if (["rejected", "cancelled"].includes(current.status)) {
                      const party = getRejectingParty(current, state);
                      if (party.roleType === "receiver") {
                        return <Badge tone="danger">✗ تم الرفض من هذا الفرع (المستلم)</Badge>;
                      }
                      if (party.roleType === "sender") {
                        return <Badge tone="neutral">لم تكتمل (مرفوضة من المرسل)</Badge>;
                      }
                      if (party.roleType === "management") {
                        return <Badge tone="danger">✗ أُلغي بقرار من إدارة الوكالة</Badge>;
                      }
                      return <Badge tone="danger">مرفوضة</Badge>;
                    }
                    if (current.status === "discrepancy") {
                      return <Badge tone="danger">سجّل فارقاً أثناء الفحص والاستلام</Badge>;
                    }
                    if (current.status === "completed") {
                      return <Badge tone="success">✓ تم الاستلام والمطابقة 100%</Badge>;
                    }
                    if (current.status === "ready") {
                      return <Badge tone="success">✓ وافق المستلم (بانتظار الشحن)</Badge>;
                    }
                    if (current.status === "sent") {
                      return <Badge tone="warning">📦 الشحنة في الطريق (بانتظار الفحص)</Badge>;
                    }
                    return (
                      <Badge tone={current.receiverApproved ? "success" : "warning"}>
                        {current.receiverApproved ? "✓ موافقة المستلم معتمدة" : "بانتظار موافقة المستلم"}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>
            {current.status === "ready" && (
              <div
                className={`p-3 my-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  actor.branchId === current.from
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : actor.branchId === current.to
                      ? "bg-blue-50 border-blue-200 text-blue-950"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                {actor.branchId === current.from ? (
                  <>
                    <Send size={18} className="text-emerald-700 shrink-0" />
                    <div>
                      <strong>جاهز للإرسال (الصادر):</strong> تمت موافقة الطرفين واكتمل حجز الكمية. يرجى تجهيز الطرد وشحنه، ثم الضغط على <strong>تأكيد الإرسال الفعلي</strong> أدناه.
                    </div>
                  </>
                ) : actor.branchId === current.to ? (
                  <>
                    <PackageCheck size={18} className="text-blue-700 shrink-0" />
                    <div>
                      <strong>جاهز للاستلام (الوارد):</strong> تمت الموافقة المشتركة بنجاح. شحنتك معتمدة وبانتظار قيام صيدلية <strong>({branch(current.from)})</strong> بتأكيد الإرسال الفعلي.
                    </div>
                  </>
                ) : (
                  <div>
                    <strong>حالة المناقلة:</strong> وافق الفرعان بالتراضي؛ المناقلة جاهزة للشحن من {branch(current.from)} إلى {branch(current.to)}.
                  </div>
                )}
              </div>
            )}
            {current.status === "sent" && (
              <div
                className={`p-3 my-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  actor.branchId === current.to
                    ? "bg-amber-50 border-amber-200 text-amber-950"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                {actor.branchId === current.to ? (
                  <>
                    <PackageCheck size={18} className="text-amber-700 shrink-0" />
                    <div>
                      <strong>الشحنة في الطريق إليك:</strong> تم شحن الأدوية من فرع <strong>{branch(current.from)}</strong>. يرجى مطابقة الطرد والضغط على <strong>فحص وتأكيد الاستلام</strong> أدناه لإضافتها لمخزونك.
                    </div>
                  </>
                ) : (
                  <div>
                    <strong>تم الإرسال:</strong> الشحنة حالياً في طريقها إلى فرع <strong>{branch(current.to)}</strong> بانتظار فحصها وتأكيد استلامها.
                  </div>
                )}
              </div>
            )}
            <div className="table-wrap my-3">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>الصنف الدوائي</th>
                    <th>التشغيلة</th>
                    <th>الصلاحية</th>
                    <th>الوحدة</th>
                    <th style={{ textAlign: "center" }}>الكمية المطلوبة</th>
                    {current.status === "discrepancy" && (
                      <th style={{ textAlign: "center" }}>نتيجة فحص المستلم</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {current.lines.map((l, idx) => (
                    <tr key={l.itemId}>
                      <td className="text-slate-500 text-xs">{idx + 1}</td>
                      <td>
                        <strong className="text-slate-900 font-bold block">{l.name}</strong>
                      </td>
                      <td>
                        <code>{l.batch}</code>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 font-mono">{l.expiry}</span>
                      </td>
                      <td>
                        <Badge tone="neutral">{l.unit}</Badge>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900 font-bold text-sm">
                          {l.quantity} {l.unit}
                        </span>
                      </td>
                      {current.status === "discrepancy" && (
                        <td style={{ textAlign: "center" }}>
                          <span className="inline-flex items-center justify-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <span>سليم: <strong>{l.accepted || 0}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>معزول: <strong>{l.rejected || 0}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>ناقص: <strong>{l.missing || 0}</strong></span>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 my-3 bg-slate-50 border border-slate-200/90 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                سبب المناقلة وملاحظات الطلب:
              </span>
              <p className="text-sm font-semibold text-slate-800 m-0">
                {current.note ? current.note : "لم تُسجل ملاحظات إضافية لهذا الطلب."}
              </p>
            </div>

            {state.events.filter((e) => e.reference === current.id).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200/80">
                <span className="text-xs font-bold text-slate-600 block mb-2">
                  سجل تتبع ومراحل المناقلة:
                </span>
                <div className="timeline">
                  {state.events
                    .filter((e) => e.reference === current.id)
                    .map((e) => (
                      <div className="timeline-row" key={e.id}>
                        <strong>{e.action}</strong>
                        <p>{e.detail}</p>
                        <small>
                          {e.actor} • {new Date(e.at).toLocaleString("ar-YE")}
                        </small>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200/80 no-print">
            <div className="flex flex-wrap items-center gap-2">
              {canApproveOrReject(current) && (
                <>
                  <Button
                    disabled={busy}
                    variant="primary"
                    onClick={() => run({ type: "approveTransfer", id: current.id })}
                  >
                    <Check size={17} />{" "}
                    {actor.branchId === current.from
                      ? "قبول المناقلة وحجز الكمية"
                      : "قبول استلام المناقلة"}
                  </Button>
                  <Button
                    disabled={busy}
                    variant="danger"
                    onClick={() => setConfirmReject(true)}
                  >
                    <X size={17} /> رفض المناقلة
                  </Button>
                </>
              )}
              {actor.branchId === current.from && current.status === "ready" && (
                <Button
                  disabled={busy}
                  variant="primary"
                  onClick={() => run({ type: "sendTransfer", id: current.id })}
                >
                  <Send size={16} /> تأكيد الإرسال الفعلي
                </Button>
              )}
              {actor.branchId === current.to && current.status === "sent" && (
                <Button
                  disabled={busy}
                  variant="primary"
                  onClick={() =>
                    setReceipt(
                      current.lines.map((l) => ({
                        itemId: l.itemId,
                        accepted: l.quantity,
                        rejected: 0,
                        missing: 0,
                      })),
                    )
                  }
                >
                  <PackageCheck size={17} /> فحص وتأكيد الاستلام
                </Button>
              )}
              {["ready", "sent", "completed"].includes(current.status) && (
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer size={16} /> طباعة السند
                </Button>
              )}
            </div>
            {["pending", "ready"].includes(current.status) &&
              (actor.id === current.creator || actor.role === "agency_master") && (
                <div className="flex items-center gap-2">
                  <Button
                    disabled={busy}
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    onClick={() => setConfirmCancel(true)}
                  >
                    إلغاء الطلب
                  </Button>
                </div>
              )}
          </div>
          {confirmCancel && (
            <ConfirmModal
              title="تأكيد إلغاء المناقلة"
              message="هل أنت متأكد من إلغاء هذا الطلب وفك أي حجز للكميات؟"
              description="سيتم إرجاع الأصناف المحجوزة للمخزون المتاح وإلغاء المناقلة فوراً."
              confirmText="إلغاء الطلب"
              cancelText="تراجع"
              confirmVariant="danger"
              busy={busy}
              onClose={() => setConfirmCancel(false)}
              onConfirm={async () => {
                await run({ type: "cancelTransfer", id: current.id });
                setConfirmCancel(false);
              }}
            />
          )}
          {confirmReject && (
            <ConfirmModal
              title="تأكيد رفض المناقلة"
              message="هل أنت متأكد من رفض طلب المناقلة هذا؟"
              description="سيتم إغلاق المناقلة كطلب مرفوض وإلغاء أي حجز للأصناف فوراً."
              confirmText="تأكيد الرفض"
              cancelText="تراجع"
              confirmVariant="danger"
              busy={busy}
              onClose={() => setConfirmReject(false)}
              onConfirm={async () => {
                await run({ type: "rejectTransfer", id: current.id });
                setConfirmReject(false);
              }}
            />
          )}
          {receipt && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">فحص وتأكيد الكميات المستلمة</h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0">
                    طابق الطرد المستلم فعلياً وحدد حالة كل باكت/علبة بدقة.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-xs !py-1 text-slate-500 hover:text-slate-700"
                  onClick={() => setReceipt(null)}
                >
                  إلغاء الفحص
                </Button>
              </div>

              <Form
                onSubmit={async () => {
                  const allValid = receipt.every(
                    (r, idx) =>
                      (r.accepted || 0) + (r.rejected || 0) + (r.missing || 0) ===
                      current.lines[idx].quantity,
                  );
                  if (!allValid) return;

                  if (
                    await run({
                      type: "receiveTransfer",
                      id: current.id,
                      lines: receipt,
                    })
                  )
                    setReceipt(null);
                }}
              >
                {receipt.map((r, n) => {
                  const expected = current.lines[n].quantity;
                  const unit = current.lines[n].unit;
                  const total = (r.accepted || 0) + (r.rejected || 0) + (r.missing || 0);
                  const isMatching = total === expected;

                  return (
                    <div
                      className="p-3.5 mb-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                      key={r.itemId}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div>
                          <strong className="text-sm font-bold text-slate-900 block">
                            {current.lines[n].name}
                          </strong>
                          <span className="text-xs text-slate-500">
                            الكمية المشحونة وفق السند: <strong>{expected} {unit}</strong>
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1 !px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                          onClick={() => {
                            setReceipt(
                              receipt.map((l, m) =>
                                m === n
                                  ? { ...l, accepted: expected, rejected: 0, missing: 0 }
                                  : l,
                              ),
                            );
                          }}
                        >
                          ✓ استلام مطابق بالكامل ({expected} {unit} سليم)
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="field">
                          <span className="flex items-center justify-between text-xs font-bold text-emerald-900">
                            <span>مقبول (سليم)</span>
                            <span className="text-[10px] text-emerald-700 font-normal">يدخل للمخزون</span>
                          </span>
                          <input
                            aria-label={`accepted-${n}`}
                            type="number"
                            min={0}
                            max={expected}
                            required
                            value={r.accepted}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(expected, Number(e.target.value) || 0));
                              setReceipt(
                                receipt.map((l, m) =>
                                  m === n
                                    ? {
                                        ...l,
                                        accepted: val,
                                        rejected: Math.min(l.rejected, expected - val),
                                        missing: Math.max(0, expected - val - Math.min(l.rejected, expected - val)),
                                      }
                                    : l,
                                ),
                              );
                            }}
                          />
                        </label>

                        <label className="field">
                          <span className="flex items-center justify-between text-xs font-bold text-red-900">
                            <span>مرفوض / معزول</span>
                            <span className="text-[10px] text-red-600 font-normal">تالف (للحجر)</span>
                          </span>
                          <input
                            aria-label={`rejected-${n}`}
                            type="number"
                            min={0}
                            max={expected}
                            required
                            value={r.rejected}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(expected, Number(e.target.value) || 0));
                              const remaining = Math.max(0, expected - val);
                              setReceipt(
                                receipt.map((l, m) =>
                                  m === n
                                    ? {
                                        ...l,
                                        rejected: val,
                                        accepted: Math.min(l.accepted, remaining),
                                        missing: Math.max(0, remaining - Math.min(l.accepted, remaining)),
                                      }
                                    : l,
                                ),
                              );
                            }}
                          />
                        </label>

                        <label className="field">
                          <span className="flex items-center justify-between text-xs font-bold text-amber-900">
                            <span>ناقص (مفقود)</span>
                            <span className="text-[10px] text-amber-700 font-normal">عجز شحن</span>
                          </span>
                          <input
                            aria-label={`missing-${n}`}
                            type="number"
                            min={0}
                            max={expected}
                            required
                            value={r.missing}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(expected, Number(e.target.value) || 0));
                              const remaining = Math.max(0, expected - val);
                              setReceipt(
                                receipt.map((l, m) =>
                                  m === n
                                    ? {
                                        ...l,
                                        missing: val,
                                        accepted: Math.min(l.accepted, remaining),
                                        rejected: Math.max(0, remaining - Math.min(l.accepted, remaining)),
                                      }
                                    : l,
                                ),
                              );
                            }}
                          />
                        </label>
                      </div>

                      <div className="mt-3">
                        {isMatching ? (
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center justify-between">
                            <span>✓ مجموع الفحص مطابق تماماً للكمية المشحونة:</span>
                            <span>{total} من أصل {expected} {unit}</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 font-bold flex items-center justify-between">
                            <span>
                              ⚠️ المجموع غير مطابق (الحالي: {total} {unit}) — يجب أن يساوي بالضبط {expected} {unit}
                            </span>
                            <Button
                              type="button"
                              variant="secondary"
                              className="!py-0.5 !px-2 text-xs"
                              onClick={() => {
                                setReceipt(
                                  receipt.map((l, m) =>
                                    m === n
                                      ? {
                                          ...l,
                                          accepted: Math.max(0, expected - (l.rejected || 0) - (l.missing || 0)),
                                        }
                                      : l,
                                  ),
                                );
                              }}
                            >
                              موازنة تلقائية
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center gap-3 mt-4">
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      !receipt.every(
                        (r, idx) =>
                          (r.accepted || 0) + (r.rejected || 0) + (r.missing || 0) ===
                          current.lines[idx].quantity,
                      )
                    }
                  >
                    حفظ الاستلام الفعلي
                  </Button>
                </div>
              </Form>
            </div>
          )}
          {current.status === "discrepancy" &&
            current.lines
              .filter((l) => l.rejected || l.missing)
              .map((l) => (
                <div
                  className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3"
                  key={l.itemId}
                >
                  <div className="text-xs">
                    <strong className="text-slate-900 block text-sm font-bold mb-0.5">{l.name}</strong>
                    <p className="text-slate-600 m-0">
                      فارق مسجل بواسطة <strong>{branch(current.to)}</strong> (الفرع المستلم): استلم {l.accepted || 0} · معزول {l.rejected || 0} · ناقص {l.missing || 0}{" "}
                      {l.returnStatus && `· حالة المرتجع: ${l.returnStatus}`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() =>
                      setResolution({ id: current.id, itemId: l.itemId })
                    }
                  >
                    معالجة الاختلاف / المرتجع
                  </Button>
                </div>
              ))}
        </Modal>
      )}
      {create && (
        <Modal
          title={
            actor.role === "agency_branch"
              ? transferMode === "request"
                ? "طلب استجرار أدوية من فرع شقيق"
                : "إرسال مناقلة فائض إلى فرع شقيق"
              : "طلب مناقلة داخلية بين الفروع"
          }
          onClose={() => setCreate(false)}
        >
          {actor.role === "agency_branch" && (
            <div className="grid grid-cols-2 gap-2 mb-4 p-1.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTransferMode("request");
                  const other = state.branches.find(
                    (b) => b.chainId === actor.chainId && b.id !== actor.branchId,
                  )?.id;
                  if (other) setSource(other);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  transferMode === "request"
                    ? "bg-white text-teal-800 shadow-sm border border-teal-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📥 طلب استجرار (سحب من فرع شقيق)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransferMode("supply");
                  if (actor.branchId) setSource(actor.branchId);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  transferMode === "supply"
                    ? "bg-white text-teal-800 shadow-sm border border-teal-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📤 إرسال فائض (تحويل لفرع شقيق)
              </button>
            </div>
          )}

          {actor.role === "agency_branch" && transferMode === "request" && !selectedSisterItem ? (
            <div className="space-y-3">
              <label className="field">
                <span>البحث عن دواء لدى الفروع الشقيقة</span>
                <div className="relative">
                  <input
                    type="text"
                    value={searchDrug}
                    onChange={(e) => setSearchDrug(e.target.value)}
                    placeholder="اكتب اسم الدواء (مثال: Augmentin)..."
                    className="w-full pl-9"
                    autoFocus
                  />
                  <Search
                    size={16}
                    className="absolute left-3 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <span>🔒 سياسة خصوصية مخزون الفروع:</span>
                </div>
                <p className="m-0 text-[11px] text-slate-500 leading-relaxed">
                  يُظهر النظام حالة التوفر فقط (متوفر / غير متوفر) لدى كل فرع، بينما تظل أرقام الكميات الفعلية وتفاصيل المخزون محجوبة للحفاظ على خصوصية كل صيدلية.
                </p>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {querySisterBranchesAvailability(state, actor, searchDrug).length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
                    {searchDrug.trim()
                      ? "لا يوجد صنف مطابق في الفروع الشقيقة حالياً"
                      : "اكتب اسم الدواء أعلاه للبحث عن توفره في الفروع"}
                  </div>
                ) : (
                  querySisterBranchesAvailability(state, actor, searchDrug).map((drugRes) => (
                    <div
                      key={drugRes.drugName}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <strong className="text-sm font-bold text-slate-800">
                          {drugRes.drugName}
                        </strong>
                        <span className="text-xs text-slate-400">({drugRes.unit})</span>
                      </div>
                      <div className="space-y-1.5">
                        {drugRes.branches.map((b) => (
                          <div
                            key={b.branchId}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">
                                {b.branchName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({b.city})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={b.isAvailable ? "success" : "neutral"}>
                                {b.isAvailable ? "متوفر" : "غير متوفر"}
                              </Badge>
                              {b.isAvailable && b.itemId && (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    setSelectedSisterItem({
                                      itemId: b.itemId!,
                                      drugName: drugRes.drugName,
                                      branchId: b.branchId,
                                      branchName: b.branchName,
                                      unit: drugRes.unit,
                                    })
                                  }
                                  className="!px-2.5 !py-1 text-xs"
                                >
                                  طلب مناقلة
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <Form
              onSubmit={async (f) => {
                const fromBranch =
                  actor.role === "agency_branch"
                    ? transferMode === "request"
                      ? selectedSisterItem?.branchId || source
                      : (actor.branchId || source)
                    : source;
                const toBranch =
                  actor.role === "agency_branch"
                    ? transferMode === "request"
                      ? (actor.branchId || String(f.get("to")))
                      : String(f.get("to"))
                    : String(f.get("to"));
                const itemId =
                  actor.role === "agency_branch" && transferMode === "request"
                    ? selectedSisterItem?.itemId || String(f.get("item"))
                    : String(f.get("item"));

                if (
                  await run({
                    type: "transfer",
                    from: fromBranch,
                    to: toBranch,
                    items: [
                      {
                        itemId,
                        quantity: Number(f.get("qty")),
                      },
                    ],
                    note: String(f.get("note") || ""),
                  })
                ) {
                  setCreate(false);
                  setSelectedSisterItem(null);
                  setSearchDrug("");
                }
              }}
            >
              {actor.role === "agency_branch" && transferMode === "request" && selectedSisterItem ? (
                <>
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <strong className="text-sm font-bold text-teal-950">
                        {selectedSisterItem.drugName}
                      </strong>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedSisterItem(null)}
                        className="!py-0.5 !px-2 text-xs text-teal-800"
                      >
                        تغيير الصنف
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-teal-800">
                      <span>الفرع المطلوب منه: <strong>{selectedSisterItem.branchName}</strong></span>
                      <span>•</span>
                      <span>حالة التوفر: <Badge tone="success">متوفر</Badge></span>
                      <span>•</span>
                      <span>المستلم: <strong>{branch(actor.branchId || "")}</strong></span>
                    </div>
                  </div>

                  <Field
                    label={`الكمية المطلوبة من صيدليتك (${selectedSisterItem.unit})`}
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                  <Field label="سبب المناقلة" name="note" required={false} />
                  <p className="text-xs text-slate-500">
                    الفرع المرسل سيراجع طلبه ويملك حق القبول أو الرفض وفق مخزونه الفعلي.
                  </p>
                  <Button type="submit" disabled={busy}>
                    إرسال طلب المناقلة
                  </Button>
                </>
              ) : actor.role === "agency_branch" && transferMode === "supply" ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 mb-2">
                    <strong>الفرع المرسل (صاحب المخزون):</strong> {branch(actor.branchId || "")}
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      سيتم حجز وإخراج الدواء من رصيد صيدليتك.
                    </span>
                  </div>
                  <label className="field">
                    <span>الفرع المستلم المحول إليه</span>
                    <select name="to">
                      {state.branches
                        .filter((b) => b.chainId === actor.chainId && b.id !== actor.branchId)
                        .map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>الدواء الفائض من مخزون صيدليتك ({branch(actor.branchId || "")})</span>
                    <select name="item" required>
                      {state.items.filter(
                        (i) =>
                          i.branchId === actor.branchId &&
                          eligible(i, state) &&
                          available(state, i.id) > 0,
                      ).length === 0 ? (
                        <option value="" disabled>
                          لا توجد أدوية متاحة للتحويل في مخزونك
                        </option>
                      ) : (
                        state.items
                          .filter(
                            (i) =>
                              i.branchId === actor.branchId &&
                              eligible(i, state) &&
                              available(state, i.id) > 0,
                          )
                          .map((i) => (
                            <option value={i.id} key={i.id}>
                              {i.name} · تشغيلة {i.batch} · متاح {available(state, i.id)} {i.unit}
                            </option>
                          ))
                      )}
                    </select>
                  </label>
                  <Field
                    label="الكمية"
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                  <Field label="سبب المناقلة" name="note" required={false} />
                  <p className="text-xs text-slate-500">
                    تتم المناقلة بتوافق وموافقة الفرعين (المرسل والمستلم) مباشرة بالقبول أو الرفض دون الحاجة لتدخل الإدارة.
                  </p>
                  <Button type="submit" disabled={busy}>
                    إرسال طلب المناقلة
                  </Button>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>الفرع المرسل (صاحب المخزون)</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    >
                      {state.branches
                        .filter((b) => b.chainId === actor.chainId)
                        .map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>الفرع المستلم</span>
                    <select name="to">
                      {state.branches
                        .filter((b) => b.chainId === actor.chainId && b.id !== source)
                        .map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>بند المخزون المتاح لدى {branch(source)}</span>
                    <select name="item" required>
                      {state.items
                        .filter(
                          (i) =>
                            i.branchId === source &&
                            eligible(i, state) &&
                            available(state, i.id) > 0,
                        )
                        .map((i) => (
                          <option value={i.id} key={i.id}>
                            {i.name} · {i.batch} · متاح {available(state, i.id)} {i.unit}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    label="الكمية"
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                  <Field label="سبب المناقلة" name="note" required={false} />
                  <p className="text-xs text-slate-500">
                    تتم المناقلة بتوافق وموافقة الفرعين (المرسل والمستلم) مباشرة بالقبول أو الرفض دون الحاجة لتدخل الإدارة.
                  </p>
                  <Button type="submit" disabled={busy}>
                    إرسال طلب المناقلة
                  </Button>
                </>
              )}
            </Form>
          )}
        </Modal>
      )}
      {resolution && (
        <Modal title="معالجة اختلاف موثقة" onClose={() => setResolution(null)}>
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "resolve",
                  id: resolution.id,
                  itemId: resolution.itemId,
                  method: String(f.get("method")) as "accept",
                  reason: String(f.get("reason")),
                })
              )
                setResolution(null);
            }}
          >
            <p>
              الإدارة تعتمد المعالجة؛ الفرع يؤكد إرسال المرتجع واستلامه. المرتجع
              يُستلم في عهدة معزولة لدى الفرع الأصلي.
            </p>
            <label className="field">
              <span>نوع المعالجة</span>
              <select name="method">
                {actor.role === "agency_master" ? (
                  <>
                    <option value="accept">قبول المرفوض بعد التحقق</option>
                    <option value="writeoff">تسوية تلف موثقة</option>
                    <option value="return">اعتماد إرجاع المرفوض</option>
                    <option value="found">
                      تأكيد العثور على الناقص واستلامه
                    </option>
                    <option value="lost">تسوية فقد الناقص</option>
                  </>
                ) : (
                  <>
                    <option value="returnSend">
                      تأكيد إرسال المرتجع من المستلم
                    </option>
                    <option value="returnReceive">
                      تأكيد استلام المرتجع بالفرع الأصلي
                    </option>
                  </>
                )}
              </select>
            </label>
            <Field label="سبب المعالجة والأدلة المرجعية" name="reason" />
            <Button type="submit" disabled={busy}>
              تأكيد الإجراء
            </Button>
          </Form>
        </Modal>
      )}
    </>
  );
}
