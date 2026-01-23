/**
 * Quote Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum quotes.quote_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: quotes.quote_status ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED')
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-neutral: DRAFT
 * - status-info: SENT
 * - status-success: APPROVED
 * - status-error: REJECTED
 * - status-warning: EXPIRED
 * - status-invoiced: INVOICED
 */

export const QUOTE_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "status-neutral",
    priority: 0
  },
  { 
    value: "SENT", 
    label: "Enviado", 
    color: "status-info",
    className: "status-info",
    priority: 1
  },
  { 
    value: "APPROVED", 
    label: "Aprobado", 
    color: "status-success",
    className: "status-success",
    priority: 2
  },
  { 
    value: "REJECTED", 
    label: "Rechazado", 
    color: "status-error",
    className: "status-error",
    priority: 3
  },
  { 
    value: "EXPIRED", 
    label: "Expirado", 
    color: "status-warning",
    className: "status-warning",
    priority: 4
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "status-invoiced",
    className: "status-invoiced",
    priority: 5
  },
] as const;

export const getQuoteStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

// Alias for backward compatibility
export const getStatusInfo = getQuoteStatusInfo;

export type QuoteStatus = typeof QUOTE_STATUSES[number]["value"];
