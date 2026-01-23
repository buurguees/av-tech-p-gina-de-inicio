import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import "../../styles/components/common/dropdown.css";

export interface DropDownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive";
  className?: string;
}

export interface DropDownProps {
  options: DropDownOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  trigger?: ReactNode;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  maxOptions?: number; // Máximo de opciones visibles antes de scroll (default: 7)
}

export default function DropDown({
  options,
  value,
  onSelect,
  placeholder = "Seleccionar...",
  trigger,
  align = "start",
  disabled = false,
  className,
  triggerClassName,
  maxOptions = 7,
}: DropDownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLDivElement>(null);

  // Validar que tenga entre 2 y 7 opciones
  const validOptions = options.filter(opt => !opt.disabled);
  if (validOptions.length < 2 || validOptions.length > 7) {
    console.warn(`DropDown: Se esperan entre 2 y 7 opciones, pero se recibieron ${validOptions.length}`);
  }

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

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    if (options.find(opt => opt.value === optionValue)?.disabled) {
      return;
    }
    onSelect(optionValue);
    setIsOpen(false);
  };

  // Calcular altura dinámica basada en el número de opciones
  const itemCount = validOptions.length;
  const needsScroll = itemCount > maxOptions;
  const visibleItems = Math.min(itemCount, maxOptions);

  return (
    <div className={cn("dropdown", className)} ref={dropdownRef}>
      {trigger ? (
        <div
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "dropdown__trigger-wrapper",
            disabled && "dropdown__trigger-wrapper--disabled",
            triggerClassName
          )}
        >
          {trigger}
        </div>
      ) : (
        <button
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "dropdown__trigger",
            disabled && "dropdown__trigger--disabled",
            triggerClassName
          )}
        >
          <span className="dropdown__trigger-label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "dropdown__chevron",
              isOpen && "dropdown__chevron--open"
            )}
          />
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "dropdown__menu",
            `dropdown__menu--align-${align}`,
            needsScroll && "dropdown__menu--scrollable"
          )}
          style={{
            maxHeight: needsScroll
              ? `calc(var(--dropdown-item-height) * ${maxOptions} + var(--dropdown-padding-y) * 2)`
              : "auto",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const isDisabled = option.disabled;

            return (
              <button
                key={option.value}
                onClick={() => !isDisabled && handleSelect(option.value)}
                disabled={isDisabled}
                className={cn(
                  "dropdown__item",
                  isSelected && "dropdown__item--selected",
                  isDisabled && "dropdown__item--disabled",
                  option.variant === "destructive" && "dropdown__item--destructive",
                  option.className
                )}
              >
                {option.icon && (
                  <span className="dropdown__item-icon">{option.icon}</span>
                )}
                <span className="dropdown__item-label">{option.label}</span>
                {isSelected && (
                  <span className="dropdown__item-indicator">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
