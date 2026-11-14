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
      if (!state.subscriptions || state.subscriptions.length === 0) {
        state.subscriptions = seed.subscriptions;
        modified = true;
      }
      if (!state.subscriptionInvoices || state.subscriptionInvoices.length === 0) {
        state.subscriptionInvoices = seed.subscriptionInvoices;
        modified = true;
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
