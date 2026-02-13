/**
 * Finance Invoice status constants (Enterprise)
 * 
 * Simplified: Only 3 document statuses.
 * Payment status and overdue are calculated, not stored.
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-neutral: DRAFT
 * - status-info: ISSUED
 * - status-error: CANCELLED
 */

export const FINANCE_INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "status-neutral",
    description: "Número preliminar, editable",
    priority: 0
  },
  { 
    value: "ISSUED", 
    label: "Emitida", 
    color: "status-info",
    className: "status-info",
    description: "Número definitivo, bloqueada",
    priority: 1
  },
  { 
    value: "CANCELLED", 
    label: "Anulada", 
    color: "status-error",
    className: "status-error",
    description: "Anulada",
    priority: 2
  },
];

/**
 * Invoice states that prevent editing
 */
export const LOCKED_FINANCE_INVOICE_STATES = ["ISSUED", "CANCELLED"];

/**
 * Payment methods
 */
export const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Transferencia bancaria" },
  { value: "CARD", label: "Tarjeta" },
  { value: "CASH", label: "Efectivo" },
  { value: "DIRECT_DEBIT", label: "Domiciliación" },
  { value: "CHECK", label: "Cheque" },
  { value: "PERSONAL", label: "Pagado por socio (personal)" },
  { value: "EXTERNAL_CREDIT", label: "Financiación externa (Aplazame)" },
  { value: "OTHER", label: "Otro" },
];

export const getFinanceStatusInfo = (status: string) => {
  return FINANCE_INVOICE_STATUSES.find(s => s.value === status) || FINANCE_INVOICE_STATUSES[0];
};

export const getPaymentMethodLabel = (method: string) => {
  return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
};
