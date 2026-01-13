/**
 * Finance Invoice status constants (Enterprise)
 * Defines all possible invoice statuses and their display properties
 * 
 * Traffic Light System:
 * - Green (success): PAID
 * - Blue (info): ISSUED
 * - Amber (warning): PARTIAL
 * - Red (error): OVERDUE
 * - Orange (warning): CANCELLED
 * - Gray (neutral): DRAFT
 */

export const FINANCE_INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    description: "Número preliminar, editable",
    priority: 0
  },
  { 
    value: "ISSUED", 
    label: "Emitida", 
    color: "status-info",
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    description: "Número definitivo, bloqueada",
    priority: 1
  },
  { 
    value: "PARTIAL", 
    label: "Cobro Parcial", 
    color: "status-warning",
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    description: "Pagos parciales recibidos",
    priority: 2
  },
  { 
    value: "PAID", 
    label: "Cobrada", 
    color: "status-success",
    className: "bg-green-500/20 text-green-300 border border-green-500/30",
    description: "100% pagada",
    priority: 3
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    color: "status-error",
    className: "bg-red-500/20 text-red-300 border border-red-500/30",
    description: "Fecha vencimiento superada",
    priority: 4
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    color: "status-warning",
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
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
  { value: "OTHER", label: "Otro" },
];

export const getFinanceStatusInfo = (status: string) => {
  return FINANCE_INVOICE_STATUSES.find(s => s.value === status) || FINANCE_INVOICE_STATUSES[0];
};

export const getPaymentMethodLabel = (method: string) => {
  return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
};
