/**
 * Project Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum projects.project_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: projects.project_status ('NEGOTIATION', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'INVOICED', 'CLOSED')
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-info: NEGOTIATION
 * - status-progress: IN_PROGRESS
 * - status-warning: PAUSED
 * - status-special: COMPLETED
 * - status-invoiced: INVOICED
 * - status-closed: CLOSED
 * - status-error: CANCELLED
 *
 * markerColorHex: mismo color que las etiquetas (variables --status-* en variables.css) para mapa/charts.
 */

export const PROJECT_STATUSES = [
  { 
    value: "NEGOTIATION", 
    label: "Negociación", 
    color: "status-info",
    className: "status-info",
    markerColorHex: "#2563eb",  /* hsl(217 91% 60%) */
    priority: 0
  },
  { 
    value: "IN_PROGRESS", 
    label: "En Progreso", 
    color: "status-progress",
    className: "status-progress",
    markerColorHex: "#eab308",  /* hsl(38 92% 50%) */
    priority: 1
  },
  { 
    value: "PAUSED", 
    label: "Pausado", 
    color: "status-warning",
    className: "status-warning",
    markerColorHex: "#eab308",  /* hsl(38 92% 50%) */
    priority: 2
  },
  { 
    value: "COMPLETED", 
    label: "Completado", 
    color: "status-special",
    className: "status-special",
    markerColorHex: "#7c3aed",  /* hsl(262 83% 58%) */
    priority: 3
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "status-invoiced",
    className: "status-invoiced",
    markerColorHex: "#16a34a",  /* hsl(142 71% 45%) */
    priority: 4
  },
  { 
    value: "CLOSED", 
    label: "Cerrado", 
    color: "status-closed",
    className: "status-closed",
    markerColorHex: "#64748b",  /* hsl(220 9% 46%) */
    priority: 5
  },
  { 
    value: "CANCELLED", 
    label: "Cancelado", 
    color: "status-error",
    className: "status-error",
    markerColorHex: "#dc2626",  /* hsl(0 84% 60%) */
    priority: 6
  },
] as const;

export const getProjectStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];
