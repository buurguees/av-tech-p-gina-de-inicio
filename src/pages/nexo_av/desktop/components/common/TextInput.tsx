import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../../styles/components/common/text-input.css";

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
  // Para tipo select
  options?: TextInputOption[];
  placeholder?: string;
  // Para tipo textarea
  rows?: number;
  // Valores y eventos
  value?: string | number;
  onChange?: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((value: string) => void);
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  // Props comunes
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
    const fieldClasses = cn(
      "text-input__field",
      `text-input__field--${size}`,
      `text-input__field--${variant}`,
      error && "text-input__field--error",
      leftIcon && "text-input__field--with-left-icon",
      rightIcon && "text-input__field--with-right-icon",
      type === "textarea" && "text-input__field--textarea",
      className
    );

    // Si es tipo select
    if (type === "select") {
      return (
        <div className="text-input">
          {label && (
            <label className={cn("text-input__label", error && "text-input__label--error")}>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          <div className="text-input__wrapper">
            {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
            <Select
              value={value as string}
              onValueChange={(val) => {
                if (onChange && typeof onChange === 'function') {
                  (onChange as (value: string) => void)(val);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={fieldClasses}>
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
            {rightIcon && <div className="text-input__icon text-input__icon--right">{rightIcon}</div>}
          </div>
          {error && errorMessage && (
            <span className="text-input__error">{errorMessage}</span>
          )}
          {!error && helperText && (
            <span className="text-input__helper">{helperText}</span>
          )}
        </div>
      );
    }

    // Si es tipo textarea
    if (type === "textarea") {
      return (
        <div className="text-input">
          {label && (
            <label className={cn("text-input__label", error && "text-input__label--error")}>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          <div className="text-input__wrapper">
            {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              name={name}
              className={fieldClasses}
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
            {rightIcon && <div className="text-input__icon text-input__icon--right">{rightIcon}</div>}
          </div>
          {error && errorMessage && (
            <span className="text-input__error">{errorMessage}</span>
          )}
          {!error && helperText && (
            <span className="text-input__helper">{helperText}</span>
          )}
        </div>
      );
    }

    // Para tipos input normales
    return (
      <div className="text-input">
        {label && (
          <label className={cn("text-input__label", error && "text-input__label--error")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <div className="text-input__wrapper">
          {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            id={id}
            name={name}
            className={fieldClasses}
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
          {rightIcon && <div className="text-input__icon text-input__icon--right">{rightIcon}</div>}
        </div>
        {error && errorMessage && (
          <span className="text-input__error">{errorMessage}</span>
        )}
        {!error && helperText && (
          <span className="text-input__helper">{helperText}</span>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
