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
            <button className="inline-flex items-center">
              <Badge className={cn(
                currentStatusInfo.className,
                "text-xs cursor-pointer hover:opacity-80 transition-opacity"
              )}>
                {currentStatusInfo.label}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
            {statusOptions.map((status) => {
              const statusInfo = statusOptions.find(s => s.value === status.value) || status;
              return (
                <DropdownMenuItem
                  key={status.value}
                  onClick={(e) => {
                    e.preventDefault();
                    handleStatusSelect(status.value);
                  }}
                  className="text-white hover:bg-white/10"
                  disabled={disabled}
                >
                  <span className={cn(statusInfo.className, "px-2 py-0.5 rounded text-xs")}>
                    {statusInfo.label}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Badge className={cn(currentStatusInfo.className, "text-xs")}>
          {currentStatusInfo.label}
        </Badge>
      )}
    </div>
  );
};

export default StatusSelector;
