/**
 * Invoice status constants
 * Defines all possible invoice statuses and their display properties
 * 
 * Traffic Light System:
 * - Green (success): PAID
 * - Blue (info): SENT
 * - Red (error): OVERDUE
 * - Orange (warning): CANCELLED
 * - Gray (neutral): DRAFT
 */

export const INVOICE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    priority: 0
  },
  { 
    value: "SENT", 
    label: "Enviada", 
    color: "status-info",
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    priority: 1
  },
  { 
    value: "PAID", 
    label: "Pagada", 
    color: "status-success",
    className: "bg-green-500/20 text-green-300 border border-green-500/30",
    priority: 2
  },
  { 
    value: "OVERDUE", 
    label: "Vencida", 
    color: "status-error",
    className: "bg-red-500/20 text-red-300 border border-red-500/30",
    priority: 3
  },
  { 
    value: "CANCELLED", 
    label: "Cancelada", 
    color: "status-warning",
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    priority: 4
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
