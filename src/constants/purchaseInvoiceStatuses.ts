/**
 * Purchase Invoice Status System
 * 
 * Two independent status systems:
 * 1. DOCUMENT STATUS - Administrative state of the invoice
 * 2. PAYMENT STATUS - Financial state (only applies when document is APPROVED)
 * 
 * Rule: Invoice State ≠ Payment State
 * An invoice can be: Aprobada + Pendiente, Aprobada + Parcial, Aprobada + Pagada
 * An invoice not approved never enters payment processing
 */

// ============================================
// DOCUMENT STATUSES (Administrative)
// ============================================

export type PurchaseDocumentStatus = 
  | "SCANNED"           // PDF uploaded but not yet assigned to invoice
  | "DRAFT"             // Manual forecast/order, may not have PDF
  | "PENDING_VALIDATION"// Has supplier, lines, PDF but not approved
  | "APPROVED"          // Ready for payment processing
  | "BLOCKED";          // Error/dispute

export const PURCHASE_DOCUMENT_STATUSES = [
  {
    value: "SCANNED" as const,
    label: "Escaneado",
    description: "PDF subido, pendiente de asignar",
    className: "purchase-doc-scanned",
    priority: 0,
  },
  {
    value: "DRAFT" as const,
    label: "Borrador",
    description: "Previsión o pedido de compra",
    className: "purchase-doc-draft",
    priority: 1,
  },
  {
    value: "PENDING_VALIDATION" as const,
    label: "Pendiente",
    description: "Requiere validación",
    className: "purchase-doc-pending",
    priority: 2,
  },
  {
    value: "APPROVED" as const,
    label: "Aprobada",
    description: "Lista para pagos",
    className: "purchase-doc-approved",
    priority: 3,
  },
  {
    value: "BLOCKED" as const,
    label: "Bloqueada",
    description: "Error o disputa",
    className: "purchase-doc-blocked",
    priority: 4,
  },
];

// ============================================
// PAYMENT STATUSES (Financial)
// Only applies when document is APPROVED
// ============================================

export type PurchasePaymentStatus = 
  | "PENDING"   // 0€ paid, not overdue
  | "OVERDUE"   // 0€ paid, past due date
  | "PARTIAL"   // Partial payment
  | "PAID";     // 100% paid

export const PURCHASE_PAYMENT_STATUSES = [
  {
    value: "PENDING" as const,
    label: "Pendiente",
    description: "Dentro de plazo",
    className: "purchase-pay-pending",
    priority: 0,
  },
  {
    value: "OVERDUE" as const,
    label: "Vencido",
    description: "Fuera de plazo",
    className: "purchase-pay-overdue",
    priority: 1,
  },
  {
    value: "PARTIAL" as const,
    label: "Parcial",
    description: "Pago incompleto",
    className: "purchase-pay-partial",
    priority: 2,
  },
  {
    value: "PAID" as const,
    label: "Pagado",
    description: "100% pagado",
    className: "purchase-pay-paid",
    priority: 3,
  },
];

// ============================================
// LEGACY STATUS MAPPING
// Maps old DB statuses to new dual-status system
// ============================================

export const LEGACY_STATUS_TO_DOCUMENT: Record<string, PurchaseDocumentStatus> = {
  "PENDING": "PENDING_VALIDATION",
  "REGISTERED": "APPROVED",
  "DRAFT": "DRAFT",
  "PARTIAL": "APPROVED",
  "PAID": "APPROVED",
  "CANCELLED": "BLOCKED",
  "APPROVED": "APPROVED",
  "SCANNED": "SCANNED",
  "PENDING_VALIDATION": "PENDING_VALIDATION",
  "BLOCKED": "BLOCKED",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the document status info
 */
export const getDocumentStatusInfo = (status: string) => {
  const mapped = LEGACY_STATUS_TO_DOCUMENT[status] || "PENDING_VALIDATION";
  return PURCHASE_DOCUMENT_STATUSES.find(s => s.value === mapped) || PURCHASE_DOCUMENT_STATUSES[2];
};

/**
 * Calculate payment status based on financial data
 * @param paidAmount Amount already paid
 * @param totalAmount Total invoice amount
 * @param dueDate Due date of the invoice
 * @param documentStatus Current document status
 */
export const calculatePaymentStatus = (
  paidAmount: number,
  totalAmount: number,
  dueDate: string | null,
  documentStatus: string
): PurchasePaymentStatus | null => {
  // Only calculate payment status for approved invoices
  const docStatus = LEGACY_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "APPROVED") {
    return null;
  }

  // 100% paid
  if (paidAmount >= totalAmount) {
    return "PAID";
  }

  // Partial payment
  if (paidAmount > 0) {
    return "PARTIAL";
  }

  // Check if overdue
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    if (due < today) {
      return "OVERDUE";
    }
  }

  return "PENDING";
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
  "SCANNED",
  "DRAFT", 
  "PENDING_VALIDATION",
];

/**
 * Document statuses that are locked (no editing)
 */
export const LOCKED_DOCUMENT_STATUSES: PurchaseDocumentStatus[] = [
  "APPROVED",
  "BLOCKED",
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
