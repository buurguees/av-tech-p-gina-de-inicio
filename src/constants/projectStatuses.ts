/**
 * Project Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum projects.project_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: projects.project_status ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED')
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-info: PLANNED
 * - status-progress: IN_PROGRESS
 * - status-warning: PAUSED
 * - status-special: COMPLETED
 * - status-invoiced: INVOICED
 * - status-closed: CLOSED
 * - status-error: CANCELLED
 */

export const PROJECT_STATUSES = [
  { 
    value: "PLANNED", 
    label: "Planificado", 
    color: "status-info",
    className: "status-info",
    priority: 0
  },
  { 
    value: "IN_PROGRESS", 
    label: "En Progreso", 
    color: "status-progress",
    className: "status-progress",
    priority: 1
  },
  { 
    value: "PAUSED", 
    label: "Pausado", 
    color: "status-warning",
    className: "status-warning",
    priority: 2
  },
  { 
    value: "COMPLETED", 
    label: "Completado", 
    color: "status-special",
    className: "status-special",
    priority: 3
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "status-invoiced",
    className: "status-invoiced",
    priority: 4
  },
  { 
    value: "CLOSED", 
    label: "Cerrado", 
    color: "status-closed",
    className: "status-closed",
    priority: 5
  },
  { 
    value: "CANCELLED", 
    label: "Cancelado", 
    color: "status-error",
    className: "status-error",
    priority: 6
  },
] as const;

export const getProjectStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];
