/**
 * Document Immutability Rules
 * 
 * CRITICAL BUSINESS RULE:
 * Once a document (invoice, payroll, etc.) is marked as "PAID" or "COLLECTED",
 * ALL values become PERMANENTLY IMMUTABLE and cannot be modified.
 * 
 * This includes (100% locked - no exceptions):
 * - Subtotal / Base amounts
 * - Tax amounts (IVA, IRPF)
 * - Total amounts
 * - Unit prices and quantities on line items
 * - Discount percentages
 * - Any other financial field
 * 
 * RATIONALE:
 * 1. Fiscal compliance - paid documents represent completed financial transactions
 * 2. Audit trail integrity - prevents retroactive modification of financial records
 * 3. Accounting accuracy - prevents journal entry mismatches
 * 4. Legal requirements - Spanish tax law requires immutable invoice records
 * 
 * IMPLEMENTATION (Database Level):
 * - Triggers prevent ANY modification to financial fields when is_locked=true or status='PAID'
 * - Auto-lock: When status changes to 'PAID', is_locked is automatically set to true
 * - Line items: Cannot be added, modified, or deleted when parent document is locked
 * 
 * AFFECTED TABLES:
 * - sales.invoices (trigger: trg_prevent_locked_invoice_modification)
 * - sales.invoice_lines (trigger: trg_prevent_locked_invoice_line_modification)
 * - sales.purchase_invoices (trigger: trg_prevent_locked_purchase_invoice_modification)
 * - sales.purchase_invoice_lines (trigger: trg_prevent_locked_purchase_line_modification)
 * - accounting.partner_compensation_runs (trigger: trg_prevent_locked_compensation_modification)
 */

// ============================================
// LOCKED DOCUMENT STATUSES
// ============================================

/**
 * Sales Invoice statuses that lock the document
 * Once in any of these states, ALL financial values are PERMANENTLY IMMUTABLE
 */
export const LOCKED_SALES_INVOICE_STATUSES = [
  "ISSUED",      // Official number assigned, sent to client
  "PARTIAL",     // Partial payment received - amounts frozen
  "PAID",        // 100% collected - fully locked forever
  "OVERDUE",     // Past due date but still represents a debt
  "CANCELLED",   // Voided but preserved for audit
  "RECTIFIED",   // Corrected via rectifying invoice
] as const;

/**
 * Purchase Invoice statuses that lock the document
 */
export const LOCKED_PURCHASE_INVOICE_STATUSES = [
  "APPROVED",    // Validated and ready for payment - amounts frozen
  "PARTIAL",     // Partial payment made - amounts frozen
  "PAID",        // 100% paid - fully locked forever
  "BLOCKED",     // Error/dispute but preserved
] as const;

/**
 * Partner Compensation (Payroll) statuses that lock the document
 */
export const LOCKED_PAYROLL_STATUSES = [
  "POSTED",      // Accounting entry generated - amounts frozen
  "PARTIAL",     // Partial payment made
  "PAID",        // 100% paid - fully locked forever
] as const;

/**
 * Quote statuses that lock the document
 */
export const LOCKED_QUOTE_STATUSES = [
  "ACCEPTED",    // Client accepted - becomes basis for invoice
  "INVOICED",    // Converted to invoice
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export const isSalesInvoiceLocked = (status: string): boolean => {
  return (LOCKED_SALES_INVOICE_STATUSES as readonly string[]).includes(status);
};

export const isPurchaseInvoiceLocked = (status: string): boolean => {
  return (LOCKED_PURCHASE_INVOICE_STATUSES as readonly string[]).includes(status);
};

export const isPayrollLocked = (status: string): boolean => {
  return (LOCKED_PAYROLL_STATUSES as readonly string[]).includes(status);
};

export const isQuoteLocked = (status: string): boolean => {
  return (LOCKED_QUOTE_STATUSES as readonly string[]).includes(status);
};

/**
 * Check if any document is financially locked based on its type and status
 * When true, NO financial values can be modified - enforced at database level
 */
export const isDocumentFinanciallyLocked = (
  documentType: 'SALES_INVOICE' | 'PURCHASE_INVOICE' | 'PAYROLL' | 'QUOTE',
  status: string
): boolean => {
  switch (documentType) {
    case 'SALES_INVOICE':
      return isSalesInvoiceLocked(status);
    case 'PURCHASE_INVOICE':
      return isPurchaseInvoiceLocked(status);
    case 'PAYROLL':
      return isPayrollLocked(status);
    case 'QUOTE':
      return isQuoteLocked(status);
    default:
      return false;
  }
};
