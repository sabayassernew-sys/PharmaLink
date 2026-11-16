import { useEffect } from "react";
import type { ReactNode, FormEvent } from "react";
import type { Transfer } from "../domain/types";
import { X, ArrowUpLeft, PackageOpen, AlertTriangle } from "lucide-react";
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "blue";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Empty({
  title = "لا توجد بيانات هنا بعد",
  description = "ستظهر العمليات المرتبطة بهذا القسم عند إضافتها.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={36} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: () => void;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="text-link" onClick={action}>
          عرض الكل <ArrowUpLeft size={15} />
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  isConfirm = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  isConfirm?: boolean;
  className?: string;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [onClose]);

  return (
    <div
      className={`modal-overlay ${isConfirm ? "confirm-modal-overlay" : ""}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "modal-wide" : ""} ${isConfirm ? "confirm-modal-box" : ""} ${className}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="إغلاق" onClick={onClose} className="icon-btn">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title = "تأكيد الإجراء",
  message,
  description,
  confirmText = "تأكيد",
  cancelText = "تراجع",
  confirmVariant = "danger",
  busy = false,
  onConfirm,
  onClose,
}: {
  title?: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} isConfirm={true}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-sm">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <strong className="block text-slate-800 font-bold mb-1">{message}</strong>
            {description && (
              <p className="text-xs text-slate-600 leading-relaxed m-0 whitespace-pre-line">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export function Form({
  children,
  onSubmit,
  className = "",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => void;
  className?: string;
}) {
  return (
    <form
      className={`form-grid ${className}`.trim()}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {children}
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required = true,
  min,
  max,
  minLength,
  maxLength,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  step?: string | number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        step={step}
      />
    </label>
  );
}
export const money = (n: number) =>
  new Intl.NumberFormat("ar-YE", {
    numberingSystem: "latn",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0) + " ر.ي";
export const number = (n: number) =>
  new Intl.NumberFormat("ar-YE", { numberingSystem: "latn" }).format(
    Number.isFinite(n) ? n : 0,
  );
export const statusNames: Record<string, string> = {
  pending: "بانتظار الموافقات",
  management: "بانتظار الإدارة",
  ready: "جاهزة للإرسال",
  sent: "مرسلة • بانتظار الاستلام",
  dispute: "نزاع خارجي مفتوح",
  discrepancy: "اختلاف مفتوح",
  completed: "مكتملة",
  cancelled: "ملغاة",
  rejected: "مرفوضة",
  published: "منشور",
  withdrawn: "موقوف",
  approval: "بانتظار اعتماد الشراء",
  reserved: "محجوزة",
  open: "مفتوح",
  closed: "مغلق",
};
export function TransferStatusBadge({
  transfer,
  branchId,
  isMaster = false,
}: {
  transfer: Transfer;
  branchId?: string;
  isMaster?: boolean;
}) {
  const isSender = Boolean(branchId && branchId === transfer.from);
  const isReceiver = Boolean(branchId && branchId === transfer.to);

  let label = statusNames[transfer.status] || transfer.status;
  let tone: "success" | "warning" | "danger" | "neutral" = "neutral";

  switch (transfer.status) {
    case "ready":
      if (isSender) {
        label = "جاهز للإرسال";
        tone = "success";
      } else if (isReceiver) {
        label = "جاهز للاستلام";
        tone = "success";
      } else if (isMaster) {
        label = "معتمدة • بانتظار الشحن";
        tone = "success";
      } else {
        label = "معتمدة • جاهزة للإرسال";
        tone = "success";
      }
      break;

    case "pending":
      if (isSender) {
        label = !transfer.senderApproved
          ? "بانتظار موافقتك (إرسال)"
          : "مقبول من طرفك • بانتظار المستلم";
        tone = !transfer.senderApproved ? "warning" : "neutral";
      } else if (isReceiver) {
        label = !transfer.receiverApproved
          ? "بانتظار موافقتك (استلام)"
          : "طلبك قيد المراجعة • بانتظار المرسل";
        tone = !transfer.receiverApproved ? "warning" : "neutral";
      } else {
        label =
          !transfer.senderApproved && !transfer.receiverApproved
            ? "بانتظار موافقة الطرفين"
            : !transfer.senderApproved
              ? "بانتظار موافقة الفرع المرسل"
              : "بانتظار موافقة الفرع المستلم";
        tone = "warning";
      }
      break;

    case "sent":
      if (isSender) {
        label = "تم الإرسال • في الطريق";
        tone = "neutral";
      } else if (isReceiver) {
        label = "في الطريق إليك • بانتظار الاستلام";
        tone = "warning";
      } else {
        label = "في الطريق (قيد النقل)";
        tone = "neutral";
      }
      break;

    case "completed":
      label = "مكتملة (تم الاستلام)";
      tone = "success";
      break;

    case "discrepancy":
      label = isSender
        ? "سجل المستلم اختلافاً (معلق)"
        : isReceiver
          ? "سجلتَ فارقاً في الاستلام"
          : "اختلاف في الاستلام";
      tone = "danger";
      break;

    case "rejected":
      if (transfer.rejectedBy) {
        if (transfer.rejectedBy === transfer.from) {
          label = isSender ? "مرفوضة (من فرعك)" : "مرفوضة من المرسل";
        } else if (transfer.rejectedBy === transfer.to) {
          label = isReceiver ? "مرفوضة (من فرعك)" : "مرفوضة من المستلم";
        } else if (transfer.rejectedBy === "agency_master") {
          label = "مرفوضة من الإدارة";
        } else {
          label = "مرفوضة";
        }
      } else {
        label = "مرفوضة";
      }
      tone = "danger";
      break;

    case "cancelled":
      label = "ملغاة";
      tone = "neutral";
      break;

    default:
      label = statusNames[transfer.status] || transfer.status;
      tone = "neutral";
  }

  return <Badge tone={tone}>{label}</Badge>;
}

export function Status({
  value,
  transfer,
  branchId,
  isMaster,
}: {
  value?: string;
  transfer?: Transfer;
  branchId?: string;
  isMaster?: boolean;
}) {
  if (transfer) {
    return (
      <TransferStatusBadge
        transfer={transfer}
        branchId={branchId}
        isMaster={isMaster}
      />
    );
  }
  const v = value || "";
  return (
    <Badge
      tone={
        ["completed", "published", "ready"].includes(v)
          ? "success"
          : ["discrepancy", "dispute", "rejected"].includes(v)
            ? "danger"
            : ["pending", "management", "approval"].includes(v)
              ? "warning"
              : "neutral"
      }
    >
      {statusNames[v] || v}
    </Badge>
  );
}

