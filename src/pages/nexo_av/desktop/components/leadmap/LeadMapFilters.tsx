import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../constants/leadStages";

interface LeadMapFiltersProps {
  selectedStages: string[];
  onStagesChange: (stages: string[]) => void;
  showOnlyMine: boolean;
  onShowOnlyMineChange: (value: boolean) => void;
  isAdmin: boolean;
}

const LeadMapFilters = ({
  selectedStages,
  onStagesChange,
  showOnlyMine,
  onShowOnlyMineChange,
  isAdmin,
}: LeadMapFiltersProps) => {
  const stages = Object.keys(LEAD_STAGE_LABELS);

  const toggleStage = (stage: string) => {
    if (selectedStages.includes(stage)) {
      onStagesChange(selectedStages.filter(s => s !== stage));
    } else {
      onStagesChange([...selectedStages, stage]);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex flex-wrap gap-4">
        {/* Show only mine toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-only-mine"
            checked={showOnlyMine}
            onCheckedChange={onShowOnlyMineChange}
          />
          <Label htmlFor="show-only-mine" className="text-sm cursor-pointer">
            Solo mis leads
          </Label>
        </div>

        {/* Stage filters */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => {
              const isSelected = selectedStages.includes(stage);
              const color = LEAD_STAGE_COLORS[stage];
              
              return (
                <Badge
                  key={stage}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected ? color : "transparent",
                    borderColor: color,
                    color: isSelected ? "white" : color,
                  }}
                  onClick={() => toggleStage(stage)}
                >
                  {LEAD_STAGE_LABELS[stage]}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Clear filters */}
        {selectedStages.length > 0 && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => onStagesChange([])}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadMapFilters;
