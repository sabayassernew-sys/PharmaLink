import type { State, Account } from "./types";
import { visibleItems, daysLeft } from "./access";
export function supplierAlerts(s: State, a: Account) {
  return visibleItems(s, a)
    .filter(
      (i) =>
        i.quantity > 0 &&
        i.returnDeadline &&
        (!i.returnStatus || i.returnStatus === "open") &&
        daysLeft(i.returnDeadline) <=
          (i.alertDays ??
            s.branches.find((b) => b.id === i.branchId)?.alertDays ??
            10),
    )
    .map((i) => ({
      item: i,
      days: daysLeft(i.returnDeadline!),
      text:
        daysLeft(i.returnDeadline!) < 0
          ? "انتهت مهلة الإرجاع المسجلة"
          : daysLeft(i.returnDeadline!) === 0
            ? "اليوم آخر موعد إرجاع مسجل"
            : "مهلة إرجاع المورد تقترب",
    }));
}
export interface LicenseNotice {
  account: Account;
  type: "expired" | "critical_15" | "warning_30" | "suspended";
  days?: number;
  tone: "danger" | "warning" | "neutral";
  text: string;
}
export function licenseAlerts(s: State, a: Account): LicenseNotice[] {
  const notices: LicenseNotice[] = [];
  const targetAccounts = a.role === "admin" 
    ? s.accounts.filter((acc) => acc.role !== "guest" && acc.role !== "admin")
    : [a];

  for (const acc of targetAccounts) {
    if (acc.suspended) {
      notices.push({
        account: acc,
        type: "suspended",
        tone: "danger",
        text: a.role === "admin"
          ? `حساب مجمد: ${acc.name} (${acc.suspensionReason || "مخالفة مهنية"})`
          : `تم تجميد حسابك لمخالفة مهنية: ${acc.suspensionReason || "يرجى مراجعة إدارة المنصة"}`
      });
      continue;
    }

    if (acc.licenseExpiry) {
      const d = daysLeft(acc.licenseExpiry);
      if (d < 0) {
        notices.push({
          account: acc,
          type: "expired",
          days: d,
          tone: "danger",
          text: a.role === "admin"
            ? `انتهى ترخيص ${acc.name} (${acc.license || "—"}) — الحساب موقف آلياً`
            : `انتهت صلاحية ترخيص المنشأة بتاريخ ${acc.licenseExpiry} — تم إيقاف الحساب آلياً حتى التجديد`
        });
      } else if (d <= 15) {
        notices.push({
          account: acc,
          type: "critical_15",
          days: d,
          tone: "danger",
          text: a.role === "admin"
            ? `تنبيه حرج (15 يوماً): تبقى ${d} يوماً على انتهاء ترخيص ${acc.name}`
            : `تنبيه حرج: تبقى ${d} يوماً فقط على انتهاء ترخيص صيدليتك! سارع بتجديده لتفادي الإيقاف الآلي`
        });
      } else if (d <= 30) {
        notices.push({
          account: acc,
          type: "warning_30",
          days: d,
          tone: "warning",
          text: a.role === "admin"
            ? `تنبيه مبكر (30 يوماً): تبقى ${d} يوماً على انتهاء ترخيص ${acc.name}`
            : `تنبيه: تبقى ${d} يوماً على انتهاء صلاحية ترخيص المنشأة، يرجى الاستعداد للتجديد`
        });
      }
    }
  }

  return notices;
}
