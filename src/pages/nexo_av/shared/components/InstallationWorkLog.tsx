import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkLogEntry } from "../hooks/useInstallationDocuments";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string | null): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatHours(hours: number | null): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InstallationWorkLogProps {
  entries: WorkLogEntry[];
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const InstallationWorkLog = ({ entries, loading }: InstallationWorkLogProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Clock className="w-8 h-8 opacity-30" />
        <p className="text-sm">Sin registros de horas</p>
      </div>
    );
  }

  const totalHours = entries.reduce((sum, e) => sum + (e.total_hours ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Total registrado:</span>
        <span className="text-sm font-semibold">{formatHours(totalHours)}</span>
        <span className="text-xs text-muted-foreground ml-auto">{entries.length} jornada{entries.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-muted/30 rounded-lg px-3 py-2.5 flex items-center gap-3"
          >
            {/* Date */}
            <div className="flex-shrink-0 min-w-[80px]">
              <p className="text-xs font-medium text-foreground capitalize">{formatDate(entry.work_date)}</p>
              {entry.technician_name && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                  {entry.technician_name}
                </p>
              )}
            </div>

            {/* Times */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <LogIn className="w-3 h-3 text-emerald-500" />
                <span className="text-sm font-mono">{formatTime(entry.check_in_time)}</span>
                {entry.check_in_declared && (
                  <CheckCircle className="w-3 h-3 text-emerald-500/70" title="Declarado" />
                )}
              </div>
              <span className="text-muted-foreground/50">→</span>
              <div className="flex items-center gap-1">
                <LogOut className="w-3 h-3 text-rose-500" />
                <span className="text-sm font-mono">{formatTime(entry.check_out_time)}</span>
                {entry.check_out_declared && (
                  <CheckCircle className="w-3 h-3 text-emerald-500/70" title="Declarado" />
                )}
                {!entry.check_out_time && (
                  <AlertCircle className="w-3 h-3 text-amber-500" title="Sin registro de salida" />
                )}
              </div>
            </div>

            {/* Total */}
            <div className="flex-shrink-0 text-right">
              <span
                className={cn(
                  "text-sm font-semibold",
                  entry.total_hours != null ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {formatHours(entry.total_hours)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {entries.some((e) => e.notes) && (
        <div className="space-y-1">
          {entries
            .filter((e) => e.notes)
            .map((e) => (
              <div key={e.id + "_notes"} className="flex gap-2 text-xs text-muted-foreground px-1">
                <span className="font-medium capitalize">{formatDate(e.work_date)}:</span>
                <span>{e.notes}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default InstallationWorkLog;
