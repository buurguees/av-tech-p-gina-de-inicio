/**
 * Sales Invoice Status System
 * 
 * Two independent status systems:
 * 1. DOCUMENT STATUS - Administrative/commercial state of the invoice
 * 2. COLLECTION STATUS - Financial state (only applies when document is ISSUED)
 * 
 * Rule: Invoice State ≠ Collection State
 * An invoice can be: Emitida + Pendiente, Emitida + Parcial, Emitida + Cobrada
 * Non-issued invoices never enter collection processing
 */

// ============================================
// DOCUMENT STATUSES (Administrative/Commercial)
// ============================================

export type SalesDocumentStatus = 
  | "DRAFT"             // Proforma, forecast, not sent to client
  | "PENDING_ISSUE"     // Complete but not officially issued
  | "ISSUED"            // Officially numbered and sent to client
  | "CANCELLED"         // Error, should not be collected
  | "RECTIFIED";        // Original corrected, linked to rectifying invoice

export const SALES_DOCUMENT_STATUSES = [
  {
    value: "DRAFT" as const,
    label: "Borrador",
    description: "Proforma o previsión, editable",
    className: "sales-doc-draft",
    priority: 0,
  },
  {
    value: "PENDING_ISSUE" as const,
    label: "Pendiente",
    description: "Requiere emisión",
    className: "sales-doc-pending",
    priority: 1,
  },
  {
    value: "ISSUED" as const,
    label: "Emitida",
    description: "Numerada oficialmente, activa",
    className: "sales-doc-issued",
    priority: 2,
  },
  {
    value: "CANCELLED" as const,
    label: "Anulada",
    description: "Error, no cobrar",
    className: "sales-doc-cancelled",
    priority: 3,
  },
  {
    value: "RECTIFIED" as const,
    label: "Rectificada",
    description: "Corregida con rectificativa",
    className: "sales-doc-rectified",
    priority: 4,
  },
];

// ============================================
// COLLECTION STATUSES (Financial)
// Only applies when document is ISSUED
// ============================================

export type SalesCollectionStatus = 
  | "PENDING"   // 0€ collected, not overdue
  | "OVERDUE"   // 0€ collected, past due date
  | "PARTIAL"   // Partial collection
  | "COLLECTED"; // 100% collected

export const SALES_COLLECTION_STATUSES = [
  {
    value: "PENDING" as const,
    label: "Pendiente",
    description: "Dentro de plazo",
    className: "sales-collect-pending",
    priority: 0,
  },
  {
    value: "OVERDUE" as const,
    label: "Vencida",
    description: "Fuera de plazo",
    className: "sales-collect-overdue",
    priority: 1,
  },
  {
    value: "PARTIAL" as const,
    label: "Parcial",
    description: "Cobro incompleto",
    className: "sales-collect-partial",
    priority: 2,
  },
  {
    value: "COLLECTED" as const,
    label: "Cobrada",
    description: "100% cobrado",
    className: "sales-collect-collected",
    priority: 3,
  },
];

// ============================================
// LEGACY STATUS MAPPING
// Maps old DB statuses to new dual-status system
// ============================================

export const LEGACY_SALES_STATUS_TO_DOCUMENT: Record<string, SalesDocumentStatus> = {
  "DRAFT": "DRAFT",
  "PENDING_ISSUE": "PENDING_ISSUE",
  "ISSUED": "ISSUED",
  "PARTIAL": "ISSUED",
  "PAID": "ISSUED",
  "OVERDUE": "ISSUED",
  "CANCELLED": "CANCELLED",
  "RECTIFIED": "RECTIFIED",
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
 * Calculate collection status based on financial data
 * @param paidAmount Amount already collected
 * @param totalAmount Total invoice amount
 * @param dueDate Due date of the invoice
 * @param documentStatus Current document status
 */
export const calculateCollectionStatus = (
  paidAmount: number,
  totalAmount: number,
  dueDate: string | null,
  documentStatus: string
): SalesCollectionStatus | null => {
  // Only calculate collection status for issued invoices
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[documentStatus];
  if (docStatus !== "ISSUED") {
    return null;
  }

  // 100% collected
  if (paidAmount >= totalAmount) {
    return "COLLECTED";
  }

  // Partial collection
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
 * Get collection status info
 */
export const getCollectionStatusInfo = (status: SalesCollectionStatus | null) => {
  if (!status) return null;
  return SALES_COLLECTION_STATUSES.find(s => s.value === status) || null;
};

/**
 * Document statuses that allow editing
 */
export const EDITABLE_SALES_STATUSES: SalesDocumentStatus[] = [
  "DRAFT", 
  "PENDING_ISSUE",
];

/**
 * Document statuses that are locked (no editing)
 */
export const LOCKED_SALES_STATUSES: SalesDocumentStatus[] = [
  "ISSUED",
  "CANCELLED",
  "RECTIFIED",
];

/**
 * Check if document is editable based on status
 */
export const isSalesDocumentEditable = (status: string): boolean => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[status];
  return EDITABLE_SALES_STATUSES.includes(docStatus);
};

/**
 * Check if collection (payments) tab should be enabled
 */
export const isCollectionEnabled = (status: string): boolean => {
  const docStatus = LEGACY_SALES_STATUS_TO_DOCUMENT[status];
  return docStatus === "ISSUED";
};
