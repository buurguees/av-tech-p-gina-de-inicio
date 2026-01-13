/**
 * Quote Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum quotes.quote_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: quotes.quote_status ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED')
 * 
 * Traffic Light System:
 * - Green (success): APPROVED
 * - Blue (info): SENT
 * - Red (error): REJECTED
 * - Orange (warning): EXPIRED
 * - Purple (special): INVOICED
 * - Gray (neutral): DRAFT
 */

export const QUOTE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    priority: 0
  },
  { 
    value: "SENT", 
    label: "Enviado", 
    color: "status-info",
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    priority: 1
  },
  { 
    value: "APPROVED", 
    label: "Aprobado", 
    color: "status-success",
    className: "bg-green-500/20 text-green-300 border border-green-500/30",
    priority: 2
  },
  { 
    value: "REJECTED", 
    label: "Rechazado", 
    color: "status-error",
    className: "bg-red-500/20 text-red-300 border border-red-500/30",
    priority: 3
  },
  { 
    value: "EXPIRED", 
    label: "Expirado", 
    color: "status-warning",
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    priority: 4
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "status-special",
    className: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    priority: 5
  },
] as const;

export const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

export type QuoteStatus = typeof QUOTE_STATUSES[number]["value"];
