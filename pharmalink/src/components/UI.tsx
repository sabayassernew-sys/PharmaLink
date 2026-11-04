import { useEffect, useRef } from "react";
import type { ReactNode, FormEvent } from "react";
import { X, ArrowUpLeft, PackageOpen } from "lucide-react";
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement as HTMLElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button aria-label="إغلاق" onClick={onClose} className="icon-btn">
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
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
        placeholder={placeholder}
        step={step}
      />
    </label>
  );
}
export const money = (n: number) =>
  new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 2 }).format(n) +
  " ر.ي";
export const number = (n: number) => new Intl.NumberFormat("ar-YE").format(n);
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
export function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ["completed", "published", "ready"].includes(value)
          ? "success"
          : ["discrepancy", "dispute", "rejected"].includes(value)
            ? "danger"
            : ["pending", "management", "approval"].includes(value)
              ? "warning"
              : "neutral"
      }
    >
      {statusNames[value] || value}
    </Badge>
  );
}
