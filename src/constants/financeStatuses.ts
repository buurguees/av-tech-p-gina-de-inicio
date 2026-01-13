/**
 * Finance Invoice status constants (Enterprise)
 * Defines all possible invoice statuses and their display properties
 */

export const FINANCE_INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    className: "bg-gray-100 text-gray-700 border-gray-300",
    description: "Número preliminar, editable"
  },
  { 
    value: "ISSUED", 
    label: "Emitida", 
    className: "bg-blue-100 text-blue-700 border-blue-300",
    description: "Número definitivo, bloqueada"
  },
  { 
    value: "PARTIAL", 
    label: "Cobro Parcial", 
    className: "bg-amber-100 text-amber-700 border-amber-300",
    description: "Pagos parciales recibidos"
  },
  { 
    value: "PAID", 
    label: "Cobrada", 
    className: "bg-green-100 text-green-700 border-green-300",
    description: "100% pagada"
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    className: "bg-red-100 text-red-700 border-red-300",
    description: "Fecha vencimiento superada"
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    className: "bg-orange-100 text-orange-700 border-orange-300",
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
