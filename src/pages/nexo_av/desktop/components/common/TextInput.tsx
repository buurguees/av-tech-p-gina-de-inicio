import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TextInputType = "text" | "email" | "tel" | "number" | "password" | "date" | "textarea" | "select";

export interface TextInputOption {
  value: string;
  label: string;
}

export interface TextInputProps {
  type?: TextInputType;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "filled";
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  options?: TextInputOption[];
  placeholder?: string;
  rows?: number;
  value?: string | number;
  onChange?: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((value: string) => void);
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  className?: string;
}

// Estilos base usando tokens semánticos
const sizeStyles = {
  sm: "text-sm px-2.5 py-1.5 min-h-[32px]",
  md: "text-sm px-3 py-2 min-h-[38px]",
  lg: "text-base px-4 py-2.5 min-h-[44px]",
};

const labelSizeStyles = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
};

const TextInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  (
    {
      type = "text",
      size = "md",
      variant = "default",
      error = false,
      errorMessage,
      label,
      helperText,
      leftIcon,
      rightIcon,
      options,
      placeholder,
      rows = 4,
      value,
      onChange,
      onKeyDown,
      onFocus,
      onBlur,
      id,
      name,
      disabled,
      required,
      autoComplete,
      autoFocus,
      min,
      max,
      step,
      className,
    },
    ref
  ) => {
    // Clases base del input
    const baseInputClasses = cn(
      // Layout
      "w-full min-w-0 box-border",
      // Apariencia
      "rounded-lg border bg-muted/20 text-foreground",
      "border-border/70",
      "placeholder:text-muted-foreground/60",
      // Transiciones
      "transition-all duration-150 ease-out",
      // Estados
      "hover:border-border hover:bg-muted/30",
      "focus:outline-none focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
      // Error
      error && "border-destructive/70 bg-destructive/5 focus:border-destructive focus:ring-destructive/10",
      // Tamaño
      sizeStyles[size],
      // Iconos
      leftIcon && "pl-9",
      rightIcon && "pr-9",
      className
    );

    // Contenedor principal
    const containerClasses = "flex flex-col gap-1.5 w-full min-w-0";

    // Label
    const renderLabel = () => {
      if (!label) return null;
      return (
        <label 
          className={cn(
            "font-medium text-muted-foreground leading-tight",
            labelSizeStyles[size],
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      );
    };

    // Iconos
    const renderLeftIcon = () => {
      if (!leftIcon) return null;
      return (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {leftIcon}
        </div>
      );
    };

    const renderRightIcon = () => {
      if (!rightIcon) return null;
      return (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {rightIcon}
        </div>
      );
    };

    // Mensajes
    const renderMessages = () => {
      if (error && errorMessage) {
        return <span className="text-xs text-destructive leading-tight">{errorMessage}</span>;
      }
      if (helperText) {
        return <span className="text-xs text-muted-foreground/80 leading-tight">{helperText}</span>;
      }
      return null;
    };

    // SELECT
    if (type === "select") {
      return (
        <div className={containerClasses}>
          {renderLabel()}
          <div className="relative w-full min-w-0">
            {renderLeftIcon()}
            <Select
              value={value as string}
              onValueChange={(val) => {
                if (onChange && typeof onChange === "function") {
                  (onChange as (value: string) => void)(val);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={baseInputClasses}>
                <SelectValue placeholder={placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderRightIcon()}
          </div>
          {renderMessages()}
        </div>
      );
    }

    // TEXTAREA
    if (type === "textarea") {
      return (
        <div className={containerClasses}>
          {renderLabel()}
          <div className="relative w-full min-w-0">
            {renderLeftIcon()}
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              name={name}
              className={cn(baseInputClasses, "resize-y leading-relaxed", size === "sm" && "min-h-[60px]", size === "md" && "min-h-[80px]", size === "lg" && "min-h-[100px]")}
              rows={rows}
              value={value}
              onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
              onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
              onFocus={onFocus as React.FocusEventHandler<HTMLTextAreaElement>}
              onBlur={onBlur as React.FocusEventHandler<HTMLTextAreaElement>}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
            />
            {renderRightIcon()}
          </div>
          {renderMessages()}
        </div>
      );
    }

    // INPUT NORMAL
    return (
      <div className={containerClasses}>
        {renderLabel()}
        <div className="relative w-full min-w-0">
          {renderLeftIcon()}
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            id={id}
            name={name}
            className={baseInputClasses}
            value={value}
            onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
            onFocus={onFocus as React.FocusEventHandler<HTMLInputElement>}
            onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            min={min}
            max={max}
            step={step}
          />
          {renderRightIcon()}
        </div>
        {renderMessages()}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
