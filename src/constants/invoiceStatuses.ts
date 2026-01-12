/**
 * Invoice Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir con los definidos en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Estados: DRAFT, SENT, PAID, OVERDUE, CANCELLED
 */

export const INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    className: "bg-gray-500/20 text-gray-300 border-gray-500/30" 
  },
  { 
    value: "SENT", 
    label: "Enviada", 
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30" 
  },
  { 
    value: "PAID", 
    label: "Pagada", 
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    className: "bg-green-500/20 text-green-300 border-green-500/30" 
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    className: "bg-red-500/20 text-red-300 border-red-500/30" 
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    className: "bg-orange-500/20 text-orange-300 border-orange-500/30" 
  },
] as const;

export const getInvoiceStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[0];
};

export type InvoiceStatus = typeof INVOICE_STATUSES[number]["value"];

// Estados bloqueados que no permiten edición
export const LOCKED_INVOICE_STATES = ["PAID", "CANCELLED"];

// Transiciones de estado válidas
export const getAvailableInvoiceStatusTransitions = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case "DRAFT":
      return ["SENT", "CANCELLED"];
    case "SENT":
      return ["PAID", "OVERDUE", "CANCELLED"];
    case "OVERDUE":
      return ["PAID", "CANCELLED"];
    case "PAID":
      return []; // No transitions from PAID
    case "CANCELLED":
      return []; // No transitions from CANCELLED
    default:
      return [];
  }
};
