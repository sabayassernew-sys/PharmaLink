import type { State } from "../domain/types";
import { transact, validateState } from "../domain/engine";
import type { Command } from "../domain/engine";
import { createSeed } from "./seed";
export const STORAGE_KEY = "pharmalink-local-v2";
export interface Repository {
  read(): State;
  execute(
    actorId: string,
    command: Command,
    operationId?: string,
  ): Promise<State>;
}
export class LocalRepository implements Repository {
  async replace(
    actorId: string,
    next: State,
    expectedRaw: string | null,
    beforeReplace: (raw: string | null) => void,
  ): Promise<void> {
    const commit = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== expectedRaw)
        throw new Error(
          "تغيرت البيانات أثناء المراجعة؛ أعد معاينة النسخة قبل الاستبدال",
        );
      let current: State;
      try {
        current = raw ? JSON.parse(raw) : createSeed();
      } catch {
        current = createSeed();
      }
      if (
        !current.accounts?.some(
          (a) => a.id === actorId && a.role === "admin" && a.verified,
        )
      )
        throw new Error("استبدال البيانات لمدير المنصة الموثق فقط");
      validateState(next);
      const restored = structuredClone(next);
      restored.revision =
        Math.max(current.revision || 0, restored.revision) + 1;
      beforeReplace(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    };
    if (navigator.locks)
      await navigator.locks.request("pharmalink-local-state", commit);
    else commit();
  }

  read(): State {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    try {
      const state = JSON.parse(raw) as State;
      if (
        state.version !== 2 ||
        !Array.isArray(state.items) ||
        !Array.isArray(state.accounts)
      )
        throw new Error();
      validateState(state);

      // Auto-migration for KYC & seed updates
      const seed = createSeed();
      let modified = false;
      const seedPending = seed.accounts.find((a) => a.id === "pending");
      const currentPending = state.accounts.find((a) => a.id === "pending");
      if (
        currentPending &&
        (!currentPending.documents || currentPending.documents.length === 0) &&
        seedPending?.documents
      ) {
        currentPending.documents = seedPending.documents;
        currentPending.pharmacistName = currentPending.pharmacistName || seedPending.pharmacistName;
        currentPending.practiceLicense = currentPending.practiceLicense || seedPending.practiceLicense;
        currentPending.commercialRegister = currentPending.commercialRegister || seedPending.commercialRegister;
        currentPending.taxNumber = currentPending.taxNumber || seedPending.taxNumber;
        currentPending.licenseExpiry = currentPending.licenseExpiry || seedPending.licenseExpiry;
        modified = true;
      }
      for (const sa of seed.accounts) {
        const ca = state.accounts.find((a) => a.id === sa.id);
        if (ca) {
          if (sa.licenseExpiry && !ca.licenseExpiry) {
            ca.licenseExpiry = sa.licenseExpiry;
            modified = true;
          }
          if (sa.avatarUrl && !ca.avatarUrl) {
            ca.avatarUrl = sa.avatarUrl;
            modified = true;
          }
          if (sa.phone && !ca.phone) {
            ca.phone = sa.phone;
            modified = true;
          }
          if (sa.city && !ca.city) {
            ca.city = sa.city;
            modified = true;
          }
          if (sa.address && !ca.address) {
            ca.address = sa.address;
            modified = true;
          }
          if (sa.operatingHours && !ca.operatingHours) {
            ca.operatingHours = sa.operatingHours;
            modified = true;
          }
          if (sa.pharmacistName && !ca.pharmacistName) {
            ca.pharmacistName = sa.pharmacistName;
            modified = true;
          }
          if (sa.practiceLicense && !ca.practiceLicense) {
            ca.practiceLicense = sa.practiceLicense;
            modified = true;
          }
          if (sa.email && !ca.email) {
            ca.email = sa.email;
            modified = true;
          }
          if (sa.password && !ca.password) {
            ca.password = sa.password;
            modified = true;
          }
          if (sa.facilityType && !ca.facilityType) {
            ca.facilityType = sa.facilityType;
            modified = true;
          }
        }
      }
      for (const b of state.branches) {
        if (b.defaultDiscount === undefined || b.defaultDiscount === 20) {
          b.defaultDiscount = 0;
          modified = true;
        }
      }
      if (!state.subscriptionPlans || state.subscriptionPlans.length === 0) {
        state.subscriptionPlans = seed.subscriptionPlans;
        modified = true;
      }
      state.subscriptions = state.subscriptions && state.subscriptions.length > 0 ? state.subscriptions : (seed.subscriptions || []);
      const subs = state.subscriptions;
      // Ensure every verified pharmacy/branch has an active subscription
      for (const branch of state.branches) {
        const hasSub = subs.some(
          (s) => s.branchId === branch.id || (branch.chainId && s.chainId === branch.chainId),
        );
        if (!hasSub) {
          const renewalDate = new Date(Date.now() + 14 * 86400000).toISOString();
          subs.push({
            id: "sub-" + branch.id,
            branchId: branch.id,
            chainId: branch.chainId,
            planId: branch.chainId ? "plan_chains" : "plan_pro",
            billingCycle: "monthly",
            status: "trial",
            amount: 0,
            startDate: new Date().toISOString(),
            renewalDate,
            autoRenew: true,
            paymentMethod: "free_trial",
            notes: "فترة تجريبية مجانية 14 يوماً معتمدة للمنشأة",
          });
          modified = true;
        }
      }
      if (!state.subscriptionInvoices || state.subscriptionInvoices.length === 0) {
        state.subscriptionInvoices = seed.subscriptionInvoices;
        modified = true;
      } else {
        const initialCount = state.subscriptionInvoices.length;
        // 1. Filter out random test entries generated during previous manual trials
        state.subscriptionInvoices = state.subscriptionInvoices.filter((inv) => {
          const ref = String(inv.reference || "");
          if (
            ref.includes("اعتماد_تجريبي") ||
            ref.includes("سلطة_النظام") ||
            ref.includes("dummy") ||
            ref.includes("TEST")
          ) {
            return false;
          }
          return true;
        });

        // 2. Remove duplicate invoices on the exact same date for the same branch
        const seen = new Set<string>();
        state.subscriptionInvoices = state.subscriptionInvoices.filter((inv) => {
          const datePart = inv.paidAt ? inv.paidAt.slice(0, 10) : "";
          const target = inv.branchId || inv.chainId || "";
          const key = `${target}_${datePart}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        // 3. Ensure clean initial trial invoice exists for pharm_01
        const hasAmalTrial = state.subscriptionInvoices.some(
          (inv) =>
            inv.branchId === "pharm_01" &&
            (inv.amount === 0 || inv.paymentMethod === "free_trial"),
        );
        if (!hasAmalTrial) {
          const trialInv = (seed.subscriptionInvoices || []).find(
            (inv) => inv.id === "inv-sub-trial-amal",
          );
          if (trialInv) {
            state.subscriptionInvoices.unshift(trialInv);
            modified = true;
          }
        }

        // 4. Ensure valid active annual subscription invoice exists for pharm_01
        const hasAmalPaid = state.subscriptionInvoices.some(
          (inv) => inv.branchId === "pharm_01" && inv.amount > 0,
        );
        if (!hasAmalPaid) {
          const paidInv = (seed.subscriptionInvoices || []).find(
            (inv) => inv.id === "inv-sub-02",
          );
          if (paidInv) {
            state.subscriptionInvoices.push(paidInv);
            modified = true;
          }
        }

        if (state.subscriptionInvoices.length !== initialCount) {
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      return state;
    } catch {
      throw new Error(
        "تعذر قراءة البيانات المحلية. اختر مدير المنصة التجريبي ثم افتح الإعدادات لاستعادة نسخة احتياطية بعد حفظ ملف البيانات.",
      );
    }
  }
  async execute(
    actorId: string,
    command: Command,
    operationId = crypto.randomUUID(),
  ): Promise<State> {
    const commit = () => {
      const old = this.read();
      const next = transact(old, actorId, command, operationId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    };
    if (navigator.locks)
      return navigator.locks.request("pharmalink-local-state", commit);
    return commit();
  }
}
export const repository = new LocalRepository();
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
