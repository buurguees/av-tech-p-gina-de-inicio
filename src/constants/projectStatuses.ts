/**
 * Project Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum projects.project_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: projects.project_status ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED')
 * 
 * Traffic Light System:
 * - Blue (info): PLANNED
 * - Green (success): IN_PROGRESS
 * - Orange (warning): PAUSED
 * - Purple (success): COMPLETED
 * - Red (error): CANCELLED
 */

export const PROJECT_STATUSES = [
  { 
    value: "PLANNED", 
    label: "Planificado", 
    color: "status-info",
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    priority: 0
  },
  { 
    value: "IN_PROGRESS", 
    label: "En Progreso", 
    color: "status-success",
    className: "bg-green-500/20 text-green-300 border border-green-500/30",
    priority: 1
  },
  { 
    value: "PAUSED", 
    label: "Pausado", 
    color: "status-warning",
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    priority: 2
  },
  { 
    value: "COMPLETED", 
    label: "Completado", 
    color: "status-special",
    className: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    priority: 3
  },
  { 
    value: "CANCELLED", 
    label: "Cancelado", 
    color: "status-error",
    className: "bg-red-500/20 text-red-300 border border-red-500/30",
    priority: 4
  },
] as const;

export const getProjectStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];
