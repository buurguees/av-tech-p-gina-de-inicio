// Constantes de estados de sites de instalación compartidas entre
// ProjectPlanningTab, MobilePlanningTab y el módulo Calendario.

import { CalendarCheck, Users, Square, Receipt, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SITE_STATUSES = [
  { value: "ALL",              label: "Todos" },
  { value: "PLANNED",          label: "Planificado" },
  { value: "SCHEDULED",        label: "Programado" },
  { value: "IN_PROGRESS",      label: "En ejecución" },
  { value: "READY_TO_INVOICE", label: "Listo p/ facturar" },
  { value: "INVOICED",         label: "Facturado" },
  { value: "CLOSED",           label: "Cerrado" },
] as const;

export type SiteStatus = Exclude<(typeof SITE_STATUSES)[number]["value"], "ALL">;

export const STATUS_COLORS: Record<string, string> = {
  PLANNED:          "bg-muted text-muted-foreground",
  SCHEDULED:        "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  IN_PROGRESS:      "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  READY_TO_INVOICE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  INVOICED:         "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  CLOSED:           "bg-muted text-muted-foreground",
};

// Colores de borde/fondo para chips en el calendario
export const STATUS_CHIP_COLORS: Record<string, string> = {
  PLANNED:          "border-border bg-muted/60 text-muted-foreground",
  SCHEDULED:        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_PROGRESS:      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  READY_TO_INVOICE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  INVOICED:         "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  CLOSED:           "border-border bg-muted/40 text-muted-foreground",
};

export const STATUS_LABELS: Record<string, string> = {
  PLANNED:          "Planificado",
  SCHEDULED:        "Programado",
  IN_PROGRESS:      "En ejecución",
  READY_TO_INVOICE: "Listo para facturar",
  INVOICED:         "Facturado",
  CLOSED:           "Cerrado",
};

export const STATUS_CTA: Record<string, { label: string; icon: LucideIcon }> = {
  PLANNED:          { label: "Planificar",      icon: CalendarCheck },
  SCHEDULED:        { label: "Asignar equipo",  icon: Users },
  IN_PROGRESS:      { label: "Marcar fin",      icon: Square },
  READY_TO_INVOICE: { label: "Crear factura",   icon: Receipt },
  INVOICED:         { label: "Ver factura",     icon: Eye },
  CLOSED:           { label: "Ver resumen",     icon: Eye },
};

// Estados que bloquean edición de planning y asignaciones
export const LOCKED_STATUSES: SiteStatus[] = ["INVOICED", "CLOSED"];

export const isSiteLocked = (status: string): boolean =>
  LOCKED_STATUSES.includes(status as SiteStatus);
