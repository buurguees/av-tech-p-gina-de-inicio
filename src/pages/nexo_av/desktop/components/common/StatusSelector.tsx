import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentStatusInfo = statusOptions.find(
    (s) => s.value === currentStatus
  ) || statusOptions[0] || { value: currentStatus, label: currentStatus, className: "status-neutral" };

  // Cerrar el dropdown cuando hacemos click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus !== currentStatus && onStatusChange) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  // Calcular si necesita scroll (más de 7 estados)
  const needsScroll = statusOptions.length > 7;
  
  // Calcular altura dinámica usando rem (2.75rem por item, base 16px = 44px)
  const itemHeightRem = 2.75; // rem
  const maxVisibleItems = 7;
  const dropdownHeightRem = Math.min(
    statusOptions.length * itemHeightRem,
    maxVisibleItems * itemHeightRem
  );

  if (disabled || !onStatusChange) {
    return (
      <div className="inline-flex items-center px-3 py-2 rounded-lg border border-white/10 bg-white/5">
        <span className={cn(
          currentStatusInfo.className,
          "px-2 py-0.5 rounded text-xs font-medium text-white"
        )}>
          {currentStatusInfo.label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("status-selector-container", className)} ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="status-selector-trigger"
      >
        <span className={cn(
          currentStatusInfo.className,
          "px-2 py-0.5 rounded text-xs font-medium text-white"
        )}>
          {currentStatusInfo.label}
        </span>
        <ChevronDown className={cn(
          "status-selector-chevron",
          isOpen && "status-selector-chevron--open"
        )} />
      </button>

      {isOpen && (
        <div 
          className="status-selector-dropdown"
          style={{
            maxHeight: `${dropdownHeightRem + 0.5}rem`,
            overflowY: needsScroll ? "auto" : "visible",
          }}
        >
          {statusOptions.map((status, index) => {
            const statusInfo = statusOptions.find(s => s.value === status.value) || status;
            const isSelected = status.value === currentStatus;
            
            return (
              <button
                key={status.value}
                onClick={() => handleStatusSelect(status.value)}
                className={cn(
                  "status-selector-item",
                  isSelected && "status-selector-item--selected"
                )}
              >
                <span className={cn(
                  statusInfo.className,
                  "px-2 py-0.5 rounded text-xs font-medium inline-block"
                )}>
                  {statusInfo.label}
                </span>
                {isSelected && (
                  <div className="status-selector-item-indicator"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
