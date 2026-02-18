/**
 * Sales Invoice Status System
 * 
 * Three independent concepts:
 * 1. DOCUMENT STATUS (doc_status) - Administrative state: DRAFT, ISSUED, CANCELLED
 * 2. PAYMENT STATUS (payment_status) - Calculated from payments: PENDING, PARTIAL, PAID
 * 3. OVERDUE CONDITION (is_overdue) - Calculated: ISSUED + not PAID + past due_date
 * 
 * Rules:
 * - payment_status is NEVER manually set — always derived from registered payments
 * - is_overdue is NEVER stored — always derived from doc_status + payment_status + due_date
 * - Sales invoices do NOT have categories
 */

// ============================================
// DOCUMENT STATUSES (Administrative)
// ============================================

export type SalesDocumentStatus = 
  | "DRAFT"       // Proforma, preliminary number, editable
  | "ISSUED"      // Final number assigned, locked, accounting entry generated
  | "CANCELLED";  // Voided, kept for audit trail

export const SALES_DOCUMENT_STATUSES = [
  {
    value: "DRAFT" as const,
    label: "Borrador",
    description: "Número preliminar, editable",
    className: "status-neutral",
    priority: 0,
  },
  {
    value: "ISSUED" as const,
    label: "Emitida",
    description: "Número definitivo, bloqueada",
    className: "status-info",
    priority: 1,
  },
  {
    value: "CANCELLED" as const,
    label: "Anulada",
    description: "Factura anulada, no cobrar",
    className: "status-error",
    priority: 2,
  },
];

// ============================================
// PAYMENT STATUSES (Financial — calculated)
// Only applies when document is ISSUED
// ============================================

export type SalesPaymentStatus = 
  | "PENDING"    // 0€ collected
  | "PARTIAL"    // Partial collection
  | "PAID";      // 100% collected

export const SALES_PAYMENT_STATUSES = [
  {
    value: "PENDING" as const,
    label: "Pendiente",
    description: "Sin cobros registrados",
    className: "status-warning",
    priority: 0,
  },
  {
    value: "PARTIAL" as const,
    label: "Parcial",
    description: "Cobro incompleto",
    className: "status-warning",
    priority: 1,
  },
  {
    value: "PAID" as const,
    label: "Cobrada",
    description: "100% cobrado",
    className: "status-success",
    priority: 2,
  },
];

// ============================================
// LEGACY STATUS MAPPING
// Maps old DB statuses to new system
// ============================================

export const LEGACY_SALES_STATUS_TO_DOCUMENT: Record<string, SalesDocumentStatus> = {
  "DRAFT": "DRAFT",
  "PENDING_ISSUE": "DRAFT",
  "ISSUED": "ISSUED",
  "PARTIAL": "ISSUED",
  "PAID": "ISSUED",
  "OVERDUE": "ISSUED",
  "CANCELLED": "CANCELLED",
  "RECTIFIED": "CANCELLED",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the document status info
 */
export const getSalesDocumentStatusInfo = (status: string) => {
  const mapped = LEGACY_SALES_STATUS_TO_DOCUMENT[status] || "DRAFT";
  return SALES_DOCUMENT_STATUSES.find(s => s.value === mapped) || SALES_DOCUMENT_STATUSES[0];
};

/**
 * Calculate payment status from financial data (NEVER manually set)
 */
export const calculatePaymentStatus = (
  paidAmount: number,
  totalAmount: number,
  documentStatus: string
): SalesPaymentStatus | null => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "ISSUED") return null;

  if (totalAmount > 0 && paidAmount >= totalAmount) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "PENDING";
};

/**
 * Calculate overdue condition (NEVER stored — always derived)
 */
export const isOverdue = (
  documentStatus: string,
  paymentStatus: SalesPaymentStatus | null,
  dueDate: string | null
): boolean => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "ISSUED") return false;
  if (paymentStatus === "PAID") return false;
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
};

/**
 * Get payment status info
 */
export const getPaymentStatusInfo = (status: SalesPaymentStatus | null) => {
  if (!status) return null;
  return SALES_PAYMENT_STATUSES.find(s => s.value === status) || null;
};

// ============================================
// INVOICE NUMBER DISPLAY HELPER
// ============================================

/**
 * Returns the display-ready invoice number.
 * - DRAFT / no definitive number → "BORRADOR"
 * - Has definitive number → the number as-is
 * - Preliminary only (F-BORR-XXXX) → shows preliminary with "(borrador)" suffix
 */
export const displayInvoiceNumber = (
  invoiceNumber: string | null | undefined,
  preliminaryNumber: string | null | undefined,
  status: string
): string => {
  if (status === "DRAFT") {
    return preliminaryNumber || "BORRADOR";
  }
  if (invoiceNumber && !invoiceNumber.includes("BORR")) {
    return invoiceNumber;
  }
  if (preliminaryNumber) {
    return `${preliminaryNumber} (borrador)`;
  }
  return "Sin número";
};

// ============================================
// Backward-compatible aliases
// ============================================

/** @deprecated Use SalesPaymentStatus */
export type SalesCollectionStatus = SalesPaymentStatus;

/** @deprecated Use SALES_PAYMENT_STATUSES */
export const SALES_COLLECTION_STATUSES = SALES_PAYMENT_STATUSES;

/** @deprecated Use calculatePaymentStatus */
export const calculateCollectionStatus = (
  paidAmount: number,
  totalAmount: number,
  dueDate: string | null,
  documentStatus: string
): SalesPaymentStatus | null => {
  return calculatePaymentStatus(paidAmount, totalAmount, documentStatus);
};

/** @deprecated Use getPaymentStatusInfo */
export const getCollectionStatusInfo = getPaymentStatusInfo;

/**
 * Document statuses that allow editing
 */
export const EDITABLE_SALES_STATUSES: SalesDocumentStatus[] = ["DRAFT"];

/**
 * Document statuses that are locked
 */
export const LOCKED_SALES_STATUSES: SalesDocumentStatus[] = ["ISSUED", "CANCELLED"];

/**
 * Check if document is editable
 */
export const isSalesDocumentEditable = (status: string): boolean => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[status];
  return EDITABLE_SALES_STATUSES.includes(docStatus);
};

/**
 * Check if payments tab should be enabled
 */
export const isCollectionEnabled = (status: string): boolean => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[status];
  return docStatus === "ISSUED";
};
