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
  variant?: "default" | "filled" | "underline";
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
    // Size configurations - LARGER sizes for better usability
    const sizeConfig = {
      sm: {
        height: "h-10",
        padding: "px-4 py-2.5",
        paddingWithLeftIcon: "pl-11 pr-4 py-2.5",
        paddingWithRightIcon: "pl-4 pr-11 py-2.5",
        text: "text-sm",
        label: "text-xs mb-2",
        icon: "w-5 h-5",
        iconOffset: "left-3.5",
        iconOffsetRight: "right-3.5",
        textarea: "min-h-[100px] py-3",
      },
      md: {
        height: "h-12",
        padding: "px-4 py-3",
        paddingWithLeftIcon: "pl-12 pr-4 py-3",
        paddingWithRightIcon: "pl-4 pr-12 py-3",
        text: "text-base",
        label: "text-sm mb-2",
        icon: "w-5 h-5",
        iconOffset: "left-4",
        iconOffsetRight: "right-4",
        textarea: "min-h-[120px] py-3",
      },
      lg: {
        height: "h-14",
        padding: "px-5 py-3.5",
        paddingWithLeftIcon: "pl-14 pr-5 py-3.5",
        paddingWithRightIcon: "pl-5 pr-14 py-3.5",
        text: "text-base",
        label: "text-sm mb-2.5",
        icon: "w-6 h-6",
        iconOffset: "left-4",
        iconOffsetRight: "right-4",
        textarea: "min-h-[140px] py-4",
      },
    }[size];

    // Variant styles
    const variantStyles = {
      default: cn(
        "bg-background border-2 border-border/60 rounded-xl",
        "hover:border-border",
        "focus:border-primary focus:ring-4 focus:ring-primary/10",
        "disabled:bg-muted/50 disabled:border-muted"
      ),
      filled: cn(
        "bg-muted/50 border-2 border-transparent rounded-xl",
        "hover:bg-muted/70",
        "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10",
        "disabled:bg-muted/30"
      ),
      underline: cn(
        "bg-transparent border-0 border-b-2 border-border/60 rounded-none",
        "hover:border-border",
        "focus:border-primary focus:ring-0",
        "disabled:border-muted"
      ),
    }[variant];

    // Error styles
    const errorStyles = error
      ? "border-destructive/60 focus:border-destructive focus:ring-destructive/10 bg-destructive/5"
      : "";

    // Base input classes
    const baseClasses = cn(
      "w-full min-w-0 outline-none transition-all duration-200",
      "text-foreground placeholder:text-muted-foreground/60",
      "disabled:cursor-not-allowed disabled:opacity-60",
      sizeConfig.height,
      sizeConfig.text,
      leftIcon ? sizeConfig.paddingWithLeftIcon : rightIcon ? sizeConfig.paddingWithRightIcon : sizeConfig.padding,
      variantStyles,
      errorStyles,
      inputClassName
    );

    // Container styles
    const containerStyles = cn("w-full min-w-0 flex flex-col", className);

    // Render label
    const renderLabel = () => {
      if (!label) return null;
      return (
        <label
          htmlFor={id}
          className={cn(
            "block font-medium text-foreground/80",
            sizeConfig.label,
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      );
    };

    // Render icon
    const renderIcon = (icon: React.ReactNode, position: "left" | "right") => {
      if (!icon) return null;
      return (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none",
            position === "left" ? sizeConfig.iconOffset : sizeConfig.iconOffsetRight
          )}
        >
          <div className={sizeConfig.icon}>{icon}</div>
        </div>
      );
    };

    // Render helper/error message
    const renderMessage = () => {
      if (error && errorMessage) {
        return <p className="text-xs text-destructive mt-1.5 font-medium">{errorMessage}</p>;
      }
      if (helperText) {
        return <p className="text-xs text-muted-foreground mt-1.5">{helperText}</p>;
      }
      return null;
    };

    // SELECT TYPE
    if (type === "select") {
      return (
        <div className={containerStyles}>
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
              <SelectTrigger className={cn(baseClasses, "flex items-center justify-between")}>
                <SelectValue placeholder={placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border shadow-xl rounded-xl z-50">
                {options.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm py-3 px-4 cursor-pointer hover:bg-accent focus:bg-accent"
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
        <div className={containerStyles}>
          {renderLabel()}
          <div className="relative w-full">
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              name={name}
              className={cn(baseClasses, "resize-y h-auto", sizeConfig.textarea)}
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
          </div>
          {renderMessage()}
        </div>
      );
    }

    // STANDARD INPUT
    return (
      <div className={containerStyles}>
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
