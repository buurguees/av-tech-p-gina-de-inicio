/**
 * Finance Invoice status constants (Enterprise)
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-neutral: DRAFT
 * - status-info: ISSUED
 * - status-success: PAID
 * - status-warning: PARTIAL, OVERDUE
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
    value: "PARTIAL", 
    label: "Parcial", 
    color: "status-warning",
    className: "status-warning",
    description: "Pago parcial recibido",
    priority: 2
  },
  { 
    value: "PAID", 
    label: "Cobrada", 
    color: "status-success",
    className: "status-success",
    description: "Totalmente cobrada",
    priority: 3
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    color: "status-warning",
    className: "status-warning",
    description: "Fecha de vencimiento superada",
    priority: 4
  },
  { 
    value: "CANCELLED", 
    label: "Anulada", 
    color: "status-error",
    className: "status-error",
    description: "Anulada",
    priority: 5
  },
];

/**
 * Invoice states that prevent editing
 */
export const LOCKED_FINANCE_INVOICE_STATES = ["ISSUED", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];

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
