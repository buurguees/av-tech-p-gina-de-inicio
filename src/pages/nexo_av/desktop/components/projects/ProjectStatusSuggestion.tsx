import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight } from "lucide-react";
import { PROJECT_STATUSES, getProjectStatusInfo } from "@/constants/projectStatuses";

interface ProjectStatusSuggestionProps {
  projectId: string;
  currentStatus: string;
  onApply: (newStatus: string) => void;
}

const ProjectStatusSuggestion = ({ projectId, currentStatus, onApply }: ProjectStatusSuggestionProps) => {
  const [suggestion, setSuggestion] = useState<{ suggested_status: string; reason: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase.rpc("get_suggested_project_status", { p_project_id: projectId });
        if (error) throw error;
        if (data && (data as any[]).length > 0) {
          const s = (data as any[])[0];
          // Only show if different from current
          if (s.suggested_status !== currentStatus) {
            setSuggestion({ suggested_status: s.suggested_status, reason: s.reason });
          } else {
            setSuggestion(null);
          }
        }
      } catch (err) {
        console.error("Error fetching status suggestion:", err);
      }
    };
    fetch();
  }, [projectId, currentStatus]);

  if (!suggestion) return null;

  const suggestedInfo = getProjectStatusInfo(suggestion.suggested_status);

  return (
    <div className="mx-4 mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Sugerencia de estado</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{suggestion.reason}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${suggestedInfo.className} border-0 text-[10px]`}>
              {suggestedInfo.label}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => onApply(suggestion.suggested_status)}
            >
              Aplicar <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusSuggestion;
