/**
 * Invoice status constants
 * Defines all possible invoice statuses and their display properties
 */

export const INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    className: "bg-gray-500/20 text-gray-300 border-gray-500/30" 
  },
  { 
    value: "SENT", 
    label: "Enviada", 
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30" 
  },
  { 
    value: "PAID", 
    label: "Pagada", 
    className: "bg-green-500/20 text-green-300 border-green-500/30" 
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    className: "bg-red-500/20 text-red-300 border-red-500/30" 
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    className: "bg-orange-500/20 text-orange-300 border-orange-500/30" 
  },
];

/**
 * Invoice states that prevent editing
 * Once an invoice reaches these states, it cannot be modified
 */
export const LOCKED_INVOICE_STATES = ["PAID", "CANCELLED"];

export const getStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[0];
};
