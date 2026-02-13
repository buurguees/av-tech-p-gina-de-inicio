/**
 * Purchase Invoice Status System
 * 
 * Three independent concepts:
 * 1. DOCUMENT STATUS (doc_status) - Administrative: PENDING_VALIDATION, APPROVED, CANCELLED
 * 2. PAYMENT STATUS (payment_status) - Calculated from payments: PENDING, PARTIAL, PAID
 * 3. OVERDUE CONDITION (is_overdue) - Calculated: APPROVED + not PAID + past due_date
 * 
 * Rules:
 * - payment_status is NEVER manually set — always derived from registered payments
 * - is_overdue is NEVER stored — always derived
 * - Category is MANDATORY for purchases and tickets (determines accounting account)
 */

// ============================================
// DOCUMENT STATUSES (Administrative)
// ============================================

export type PurchaseDocumentStatus = 
  | "PENDING_VALIDATION"  // Has supplier, lines, PDF but not approved
  | "APPROVED"            // Validated, accounting entry generated, locked
  | "CANCELLED";          // Voided

export const PURCHASE_DOCUMENT_STATUSES = [
  {
    value: "PENDING_VALIDATION" as const,
    label: "Pendiente",
    description: "Pendiente de aprobación",
    className: "purchase-doc-pending",
    priority: 0,
  },
  {
    value: "APPROVED" as const,
    label: "Aprobada",
    description: "Validada y contabilizada",
    className: "purchase-doc-approved",
    priority: 1,
  },
  {
    value: "CANCELLED" as const,
    label: "Anulada",
    description: "Factura anulada",
    className: "status-error",
    priority: 2,
  },
];

// ============================================
// PAYMENT STATUSES (Financial — calculated)
// Only applies when document is APPROVED
// ============================================

export type PurchasePaymentStatus = 
  | "PENDING"    // 0€ paid
  | "PARTIAL"    // Partial payment (installments, external credit, etc.)
  | "PAID";      // 100% paid

export const PURCHASE_PAYMENT_STATUSES = [
  {
    value: "PENDING" as const,
    label: "Pendiente",
    description: "Sin pagos registrados",
    className: "purchase-pay-pending",
    priority: 0,
  },
  {
    value: "PARTIAL" as const,
    label: "Parcial",
    description: "Pago incompleto (fraccionado, crédito, etc.)",
    className: "purchase-pay-partial",
    priority: 1,
  },
  {
    value: "PAID" as const,
    label: "Pagado",
    description: "100% pagado",
    className: "purchase-pay-paid",
    priority: 2,
  },
];

// ============================================
// LEGACY STATUS MAPPING
// Maps old DB statuses to new system
// ============================================

export const LEGACY_STATUS_TO_DOCUMENT: Record<string, PurchaseDocumentStatus> = {
  "PENDING": "PENDING_VALIDATION",
  "REGISTERED": "APPROVED",
  "DRAFT": "PENDING_VALIDATION",
  "PARTIAL": "APPROVED",
  "PAID": "APPROVED",
  "CANCELLED": "CANCELLED",
  "APPROVED": "APPROVED",
  "SCANNED": "PENDING_VALIDATION",
  "PENDING_VALIDATION": "PENDING_VALIDATION",
  "BLOCKED": "CANCELLED",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the document status info
 */
export const getDocumentStatusInfo = (status: string) => {
  const mapped = LEGACY_STATUS_TO_DOCUMENT[status] || "PENDING_VALIDATION";
  return PURCHASE_DOCUMENT_STATUSES.find(s => s.value === mapped) || PURCHASE_DOCUMENT_STATUSES[0];
};

/**
 * Calculate payment status from financial data (NEVER manually set)
 */
export const calculatePaymentStatus = (
  paidAmount: number,
  totalAmount: number,
  dueDate: string | null,
  documentStatus: string
): PurchasePaymentStatus | null => {
  const docStatus = LEGACY_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "APPROVED") return null;

  if (totalAmount > 0 && paidAmount >= totalAmount) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "PENDING";
};

/**
 * Calculate overdue condition (NEVER stored — always derived)
 */
export const isPurchaseOverdue = (
  documentStatus: string,
  paymentStatus: PurchasePaymentStatus | null,
  dueDate: string | null
): boolean => {
  const docStatus = LEGACY_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "APPROVED") return false;
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
export const getPaymentStatusInfo = (status: PurchasePaymentStatus | null) => {
  if (!status) return null;
  return PURCHASE_PAYMENT_STATUSES.find(s => s.value === status) || null;
};

/**
 * Document statuses that allow editing
 */
export const EDITABLE_DOCUMENT_STATUSES: PurchaseDocumentStatus[] = [
  "PENDING_VALIDATION",
];

/**
 * Document statuses that are locked (no editing)
 */
export const LOCKED_DOCUMENT_STATUSES: PurchaseDocumentStatus[] = [
  "APPROVED",
  "CANCELLED",
];

/**
 * Check if document is editable based on status
 */
export const isDocumentEditable = (status: string): boolean => {
  const docStatus = LEGACY_STATUS_TO_DOCUMENT[status];
  return EDITABLE_DOCUMENT_STATUSES.includes(docStatus);
};

/**
 * Check if payments tab should be enabled
 */
export const isPaymentsEnabled = (status: string): boolean => {
  const docStatus = LEGACY_STATUS_TO_DOCUMENT[status];
  return docStatus === "APPROVED";
};
