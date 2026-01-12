/**
 * Finance Invoice status constants (Enterprise)
 * Defines all possible invoice statuses and their display properties
 */

export const FINANCE_INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    description: "Número preliminar, editable"
  },
  { 
    value: "ISSUED", 
    label: "Emitida", 
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description: "Número definitivo, bloqueada"
  },
  { 
    value: "PARTIAL", 
    label: "Cobro Parcial", 
    className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    description: "Pagos parciales recibidos"
  },
  { 
    value: "PAID", 
    label: "Cobrada", 
    className: "bg-green-500/20 text-green-300 border-green-500/30",
    description: "100% pagada"
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    className: "bg-red-500/20 text-red-300 border-red-500/30",
    description: "Fecha vencimiento superada"
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    className: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    description: "Anulada"
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
