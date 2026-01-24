import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TextInputType = "text" | "email" | "tel" | "number" | "password" | "date" | "textarea" | "select";

export interface TextInputOption {
  value: string;
  label: string;
}

export interface TextInputProps {
  type?: TextInputType;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
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
  inputClassName?: string;
}

// Size configurations
const sizes = {
  sm: {
    input: "h-8 text-xs px-2.5",
    label: "text-[11px]",
    icon: "w-3.5 h-3.5",
    iconLeft: "left-2",
    iconRight: "right-2",
    paddingWithIcon: "pl-7",
    paddingWithRightIcon: "pr-7",
    textarea: "min-h-[60px] py-1.5",
  },
  md: {
    input: "h-9 text-sm px-3",
    label: "text-xs",
    icon: "w-4 h-4",
    iconLeft: "left-2.5",
    iconRight: "right-2.5",
    paddingWithIcon: "pl-9",
    paddingWithRightIcon: "pr-9",
    textarea: "min-h-[80px] py-2",
  },
  lg: {
    input: "h-10 text-sm px-3.5",
    label: "text-xs",
    icon: "w-4 h-4",
    iconLeft: "left-3",
    iconRight: "right-3",
    paddingWithIcon: "pl-10",
    paddingWithRightIcon: "pr-10",
    textarea: "min-h-[100px] py-2.5",
  },
};

// Variant configurations
const variants = {
  default: "bg-muted/30 border-border/60 hover:border-border hover:bg-muted/40 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
  outline: "bg-transparent border-border hover:border-foreground/30 focus:border-primary focus:ring-2 focus:ring-primary/10",
  ghost: "bg-transparent border-transparent hover:bg-muted/50 focus:bg-muted/30 focus:ring-0",
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
      options = [],
      placeholder,
      rows = 3,
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
      inputClassName,
    },
    ref
  ) => {
    const sizeConfig = sizes[size];
    const variantStyles = variants[variant];

    // Base input classes
    const baseClasses = cn(
      "w-full min-w-0 rounded-lg border outline-none transition-all duration-150",
      "text-foreground placeholder:text-muted-foreground/50",
      "disabled:cursor-not-allowed disabled:opacity-50",
      variantStyles,
      error && "border-destructive/60 bg-destructive/5 focus:border-destructive focus:ring-destructive/10",
      sizeConfig.input,
      leftIcon && sizeConfig.paddingWithIcon,
      rightIcon && sizeConfig.paddingWithRightIcon,
      inputClassName
    );

    // Render label
    const renderLabel = () => {
      if (!label) return null;
      return (
        <label
          htmlFor={id}
          className={cn(
            "block font-medium text-muted-foreground mb-1.5",
            sizeConfig.label,
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      );
    };

    // Render icon wrapper
    const renderIcon = (icon: React.ReactNode, position: "left" | "right") => {
      if (!icon) return null;
      return (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none flex items-center justify-center",
            position === "left" ? sizeConfig.iconLeft : sizeConfig.iconRight
          )}
        >
          <div className={sizeConfig.icon}>{icon}</div>
        </div>
      );
    };

    // Render helper/error message
    const renderMessage = () => {
      if (error && errorMessage) {
        return <p className="text-[10px] text-destructive mt-1">{errorMessage}</p>;
      }
      if (helperText) {
        return <p className="text-[10px] text-muted-foreground/70 mt-1">{helperText}</p>;
      }
      return null;
    };

    // SELECT TYPE
    if (type === "select") {
      return (
        <div className={cn("w-full min-w-0", className)}>
          {renderLabel()}
          <div className="relative w-full">
            {renderIcon(leftIcon, "left")}
            <Select
              value={value as string}
              onValueChange={(val) => {
                if (onChange && typeof onChange === "function") {
                  (onChange as (value: string) => void)(val);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  baseClasses,
                  "flex items-center justify-between"
                )}
              >
                <SelectValue placeholder={placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {options.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm cursor-pointer hover:bg-accent"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderIcon(rightIcon, "right")}
          </div>
          {renderMessage()}
        </div>
      );
    }

    // TEXTAREA TYPE
    if (type === "textarea") {
      return (
        <div className={cn("w-full min-w-0", className)}>
          {renderLabel()}
          <div className="relative w-full">
            {renderIcon(leftIcon, "left")}
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              name={name}
              className={cn(baseClasses, "resize-y", sizeConfig.textarea)}
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
            {renderIcon(rightIcon, "right")}
          </div>
          {renderMessage()}
        </div>
      );
    }

    // STANDARD INPUT
    return (
      <div className={cn("w-full min-w-0", className)}>
        {renderLabel()}
        <div className="relative w-full">
          {renderIcon(leftIcon, "left")}
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            id={id}
            name={name}
            className={baseClasses}
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
          {renderIcon(rightIcon, "right")}
        </div>
        {renderMessage()}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
