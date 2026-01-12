/**
 * Quote Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum quotes.quote_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: quotes.quote_status ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED')
 */

export const QUOTE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    className: "bg-gray-500/20 text-gray-300 border-gray-500/30" 
  },
  { 
    value: "SENT", 
    label: "Enviado", 
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30" 
  },
  { 
    value: "APPROVED", 
    label: "Aprobado", 
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    className: "bg-green-500/20 text-green-300 border-green-500/30" 
  },
  { 
    value: "REJECTED", 
    label: "Rechazado", 
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    className: "bg-red-500/20 text-red-300 border-red-500/30" 
  },
  { 
    value: "EXPIRED", 
    label: "Expirado", 
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    className: "bg-orange-500/20 text-orange-300 border-orange-500/30" 
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    className: "bg-purple-500/20 text-purple-300 border-purple-500/30" 
  },
] as const;

export const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

export type QuoteStatus = typeof QUOTE_STATUSES[number]["value"];
