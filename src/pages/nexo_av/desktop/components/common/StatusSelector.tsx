import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import "../../styles/components/common/status-selector.css";

export interface StatusOption {
  value: string;
  label: string;
  className: string;
  color?: string;
}

interface StatusSelectorProps {
  currentStatus: string;
  statusOptions: StatusOption[];
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const StatusSelector = ({
  currentStatus,
  statusOptions,
  onStatusChange,
  disabled = false,
  className,
  size = "md",
}: StatusSelectorProps) => {
  const currentStatusInfo = statusOptions.find(
    (s) => s.value === currentStatus
  ) || statusOptions[0];

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus !== currentStatus && onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  return (
    <div className={cn("status-selector", className)}>
      {onStatusChange && !disabled ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:border-white/20">
              <div className="flex items-center gap-1.5 flex-1">
                <span className={cn(
                  currentStatusInfo.className,
                  "px-2 py-0.5 rounded text-xs font-medium text-white"
                )}>
                  {currentStatusInfo.label}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-white/60 transition-transform duration-200" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-zinc-900/95 border border-white/10 backdrop-blur-sm">
            {statusOptions.map((status) => {
              const statusInfo = statusOptions.find(s => s.value === status.value) || status;
              const isSelected = status.value === currentStatus;
              return (
                <DropdownMenuItem
                  key={status.value}
                  onClick={(e) => {
                    e.preventDefault();
                    handleStatusSelect(status.value);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 text-white cursor-pointer transition-colors duration-150",
                    isSelected ? "bg-white/15" : "hover:bg-white/10"
                  )}
                  disabled={disabled}
                >
                  <div className="flex-1">
                    <span className={cn(statusInfo.className, "px-2 py-0.5 rounded text-xs font-medium inline-block")}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white/60"></div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="inline-flex items-center px-3 py-2 rounded-lg border border-white/10 bg-white/5">
          <Badge className={cn(currentStatusInfo.className, "text-xs")}>
            {currentStatusInfo.label}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
