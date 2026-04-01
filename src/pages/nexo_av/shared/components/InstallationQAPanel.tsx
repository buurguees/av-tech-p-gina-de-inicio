import { useState } from "react";
import { MessageSquare, Clock, CheckCircle2, User, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QAEntry } from "../hooks/useInstallationDocuments";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ANSWERER_LABELS: Record<string, string> = {
  BOT: "Bot",
  INTERNAL_USER: "Técnico interno",
  INTERNAL_WHATSAPP: "WhatsApp interno",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface InstallationQAPanelProps {
  entries: QAEntry[];
  loading: boolean;
}

// ─── QA Entry Card ────────────────────────────────────────────────────────────

const QACard = ({ entry }: { entry: QAEntry }) => {
  const [expanded, setExpanded] = useState(!entry.answer_text);
  const isPending = !entry.answer_text;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isPending ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20"
      )}
    >
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isPending ? (
            <Clock className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
            {entry.question_text}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.technician_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.technician_name}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(entry.question_at)}
            </span>
            {isPending ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-400/40">
                Pendiente
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-400/40">
                Respondida
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-border/50 pt-2.5">
          {/* Tags */}
          {entry.topic_tags && entry.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.topic_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Escalation */}
          {entry.escalated_to_name && (
            <div className="text-xs text-muted-foreground">
              Escalada a: <span className="font-medium text-foreground">{entry.escalated_to_name}</span>
              {entry.escalated_at && (
                <span> · {formatDateTime(entry.escalated_at)}</span>
              )}
            </div>
          )}

          {/* Answer */}
          {entry.answer_text ? (
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {entry.answered_by_type ? ANSWERER_LABELS[entry.answered_by_type] || entry.answered_by_type : "Respondido"}
                  {entry.answered_at && (
                    <span className="font-normal text-muted-foreground">
                      {" "}· {formatDateTime(entry.answered_at)}
                    </span>
                  )}
                </span>
              </div>
              <p className="text-sm text-foreground">{entry.answer_text}</p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Esperando respuesta del técnico interno...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const InstallationQAPanel = ({ entries, loading }: InstallationQAPanelProps) => {
  const [showAll, setShowAll] = useState(false);

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
        <MessageSquare className="w-8 h-8 opacity-30" />
        <p className="text-sm">Sin preguntas registradas</p>
      </div>
    );
  }

  const pending = entries.filter((e) => !e.answer_text);
  const answered = entries.filter((e) => !!e.answer_text);
  const visibleEntries = showAll ? entries : entries.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-sm">{pending.length} pendiente{pending.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-sm">{answered.length} respondida{answered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {visibleEntries.map((entry) => (
          <QACard key={entry.id} entry={entry} />
        ))}
      </div>

      {entries.length > 5 && (
        <button
          className="text-sm text-primary hover:underline w-full text-center py-1"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Mostrar menos" : `Ver todas (${entries.length})`}
        </button>
      )}
    </div>
  );
};

export default InstallationQAPanel;
