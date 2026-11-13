export type Role =
  | "guest"
  | "pending"
  | "agency_branch"
  | "agency_master"
  | "independent"
  | "admin";
export interface KYCDocument {
  id: string;
  type: "pharmacy_license" | "practice_license" | "commercial_register" | "tax_card";
  title: string;
  fileName: string;
  fileType: "pdf" | "image";
  dataUrl?: string;
  uploadedAt: string;
}
export interface Account {
  id: string;
  name: string;
  role: Role;
  branchId?: string;
  chainId?: string;
  verified: boolean;
  rejection?: string;
  email?: string;
  license?: string;
  pharmacistName?: string;
  practiceLicense?: string;
  commercialRegister?: string;
  taxNumber?: string;
  licenseExpiry?: string;
  suspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  documents?: KYCDocument[];
  avatarUrl?: string;
  phone?: string;
  city?: string;
  address?: string;
  operatingHours?: string;
  bio?: string;
  facilityType?: "independent" | "agency_branch" | "agency_master";
}
export interface Chain {
  id: string;
  name: string;
  policy: "centralized" | "delegated";
}
export interface Branch {
  id: string;
  name: string;
  city: string;
  chainId?: string;
  active: boolean;
  alertDays?: number;
  supplierName?: string;
  returnWindowDays?: number;
  defaultDiscount?: number;
}
export interface Item {
  catalogId?: string;
  strength?: string;
  dosageForm?: string;
  importSource?: { quantity: number; unit: string; price: number; at: string };
  id: string;
  branchId: string;
  name: string;
  ingredient: string;
  batch: string;
  expiry: string;
  unit: string;
  quantity: number;
  quarantine: number;
  price: number;
  cold: boolean;
  blocked: boolean;
  archived: boolean;
  supplier?: string;
  returnDeadline?: string;
  alertDays?: number;
  returnStatus?: "open" | "closed" | "returned" | "refused" | "not_returnable";
  packageUnit?: string;
  unitsPerPackage?: number;
  splitAllowed?: boolean;
  discountPercent?: number;
}
export interface Post {
  id: string;
  branchId: string;
  itemId?: string;
  kind: "surplus" | "need";
  name: string;
  quantity: number;
  allocated: number;
  unit: string;
  expires: string;
  status: "open" | "closed";
  notes: string;
}
export interface Line {
  itemId: string;
  quantity: number;
  name: string;
  batch: string;
  expiry: string;
  unit: string;
  accepted?: number;
  rejected?: number;
  missing?: number;
  destinationId?: string;
  returnStatus?: "approved" | "sent" | "received";
}
export type TransferStatus =
  | "pending"
  | "management"
  | "ready"
  | "sent"
  | "discrepancy"
  | "completed"
  | "cancelled"
  | "rejected";
export interface Transfer {
  id: string;
  code: string;
  chainId: string;
  from: string;
  to: string;
  creator: string;
  policy: "centralized" | "delegated";
  senderApproved: boolean;
  receiverApproved: boolean;
  managementApproved: boolean;
  status: TransferStatus;
  lines: Line[];
  postId?: string;
  note: string;
  created: string;
  sentAt?: string;
  receivedAt?: string;
  rejectedBy?: string;
}
export interface Reservation {
  id: string;
  itemId: string;
  quantity: number;
  kind: "transfer" | "order";
  reference: string;
  status: "active" | "consumed" | "released";
}
export interface Sale {
  createdAt?: string;
  updatedAt?: string;
  unitFactor?: number;
  saleUnit?: string;
  id: string;
  itemId: string;
  quantity: number;
  fulfilled: number;
  status: "pending" | "published" | "rejected" | "withdrawn";
  price: number;
  note: string;
  discountPercent?: number;
}
export interface Order {
  id: string;
  saleId: string;
  itemId: string;
  seller: string;
  buyer: string;
  quantity: number;
  amount: number;
  fee: number;
  status:
  "approval" | "reserved" | "sent" | "completed" | "cancelled" | "dispute";
  created: string;
  accepted?: number;
  rejected?: number;
  missing?: number;
  returned?: number;
  writtenOff?: number;
  lost?: number;
  destinationId?: string;
  returnStatus?: "approved" | "sent" | "received";
  disputeReason?: string;
  settlement?: string;
  cancelledBy?: "buyer" | "seller";
  cancelReason?: string;
}
export interface Wallet {
  branchId: string;
  available: number;
  held: number;
}
export interface Event {
  id: string;
  at: string;
  actor: string;
  action: string;
  branchId?: string;
  reference: string;
  detail: string;
}
export interface ImportRow {
  catalogId?: string;
  strength?: string;
  dosageForm?: string;
  name: string;
  ingredient: string;
  batch: string;
  expiry: string;
  unit: string;
  quantity: number;
  price: number;
  cold: boolean;
}
export interface ImportResult {
  added: number;
  updated: number;
  suspended: number;
}
export interface FeeEntry {
  id: string;
  orderId: string;
  amount: number;
  fee: number;
  feePercent: number;
  sellerBranchId: string;
  buyerBranchId: string;
  at: string;
}
export interface SubscriptionPlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyFee: number;
  annualFee: number;
  features: string[];
  maxRadarItems: number;
  unlimitedMarket: boolean;
  prioritySupport: boolean;
  highlighted?: boolean;
  targetType?: "independent" | "agency" | "all";
}

export interface PharmacySubscription {
  id: string;
  branchId?: string;
  chainId?: string;
  planId: string;
  billingCycle: "monthly" | "annual";
  status: "active" | "trial" | "grace_period" | "expired";
  amount: number;
  startDate: string;
  renewalDate: string;
  autoRenew: boolean;
  paymentMethod: "wallet" | "bank_transfer" | "cash" | "free_trial";
  reference?: string;
  notes?: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  branchId?: string;
  chainId?: string;
  planId: string;
  amount: number;
  billingCycle: "monthly" | "annual";
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string;
  reference: string;
  status: "paid" | "pending";
}

export interface State {
  version: 2;
  revision: number;
  accounts: Account[];
  chains: Chain[];
  branches: Branch[];
  items: Item[];
  posts: Post[];
  transfers: Transfer[];
  reservations: Reservation[];
  sales: Sale[];
  orders: Order[];
  wallets: Wallet[];
  platformFeePercent?: number;
  minExpiryDays?: number;
  nearExpiryAlertDays?: number;
  feeBalance?: number;
  feeLedger?: FeeEntry[];
  walletMovements?: {
    id: string;
    at: string;
    actor: string;
    branchId: string;
    availableBefore: number;
    availableAfter: number;
    heldBefore: number;
    heldAfter: number;
    reference: string;
  }[];
  events: Event[];
  operations: string[];
  imports: string[];
  importProgress?: Record<string, { applied: string[]; suspended: string[] }>;
  radar: {
    id: string;
    branchId: string;
    query: string;
    strength?: string;
    dosageForm?: string;
    minDiscount?: number;
    minExpiry?: number;
  }[];
  subscriptionPlans?: SubscriptionPlan[];
  subscriptions?: PharmacySubscription[];
  subscriptionInvoices?: SubscriptionInvoice[];
}
export interface Receipt {
  itemId: string;
  accepted: number;
  rejected: number;
  missing: number;
}

