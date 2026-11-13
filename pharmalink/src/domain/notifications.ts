import type { State, Account } from "./types";
import {
  visibleItems,
  daysLeft,
  getEffectiveReturnDeadline,
  getEffectiveAlertDays,
} from "./access";
export function supplierAlerts(s: State, a: Account) {
  return visibleItems(s, a)
    .filter((i) => {
      if (i.quantity <= 0) return false;
      if (i.returnStatus && i.returnStatus !== "open") return false;
      const deadline = getEffectiveReturnDeadline(i, s);
      if (!deadline) return false;
      const alertWindow = getEffectiveAlertDays(i, s);
      return daysLeft(deadline) <= alertWindow;
    })
    .map((i) => {
      const deadline = getEffectiveReturnDeadline(i, s)!;
      const days = daysLeft(deadline);
      return {
        item: i,
        days,
        text:
          days < 0
            ? "انتهت مهلة الإرجاع المسجلة"
            : days === 0
              ? "اليوم آخر موعد إرجاع مسجل"
              : "مهلة إرجاع المورد تقترب",
      };
    });
}

export interface PolicyNotice {
  branchId: string;
  supplierName: string;
  returnWindowDays: number;
  alertDays: number;
  text: string;
}

export function branchPolicyAlerts(s: State, a: Account): PolicyNotice[] {
  if (a.role !== "agency_branch" || !a.branchId) return [];
  const b = s.branches.find((br) => br.id === a.branchId);
  if (!b || !b.supplierName || !b.returnWindowDays) return [];

  const policyEvent = s.events.find(
    (e) => e.reference === b.id && e.action === "تحديث سياسة مورد الفرع",
  );
  if (!policyEvent) return [];

  return [
    {
      branchId: b.id,
      supplierName: b.supplierName,
      returnWindowDays: b.returnWindowDays,
      alertDays: b.alertDays ?? 10,
      text: `إشعار إداري: تم اعتماد سياسة مورد الفرع (${b.supplierName}) — مهلة الإرجاع: قبل ${b.returnWindowDays} يوماً من الصلاحية، والتنبيه قبل ${b.alertDays ?? 10} أيام.`,
    },
  ];
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
