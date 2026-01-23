import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../../styles/components/common/text-input.css";

export type TextInputType = "text" | "email" | "tel" | "number" | "password" | "date" | "textarea" | "select";

export interface TextInputOption {
  value: string;
  label: string;
}

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
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
  // Manejo de onChange unificado
  onChange?: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((value: string) => void);
  value?: string | number;
  // Eventos adicionales
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
      className,
      rows = 4,
      ...props
    },
    ref
  ) => {
    // Si es tipo select
    if (type === "select") {
      return (
        <div className="text-input">
          {label && (
            <label className={cn("text-input__label", error && "text-input__label--error")}>
              {label}
            </label>
          )}
          <div className="text-input__wrapper">
            {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
            <Select
              value={props.value as string}
              onValueChange={(value) => {
                if (props.onChange && typeof props.onChange === 'function') {
                  // Si onChange es una función que acepta string directamente (para select)
                  (props.onChange as (value: string) => void)(value);
                }
              }}
              disabled={props.disabled}
            >
              <SelectTrigger
                className={cn(
                  "text-input__field",
                  `text-input__field--${size}`,
                  `text-input__field--${variant}`,
                  error && "text-input__field--error",
                  leftIcon && "text-input__field--with-left-icon",
                  rightIcon && "text-input__field--with-right-icon",
                  className
                )}
              >
                <SelectValue placeholder={props.placeholder || "Seleccionar..."} />
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
            </label>
          )}
          <div className="text-input__wrapper">
            {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={cn(
                "text-input__field text-input__field--textarea",
                `text-input__field--${size}`,
                `text-input__field--${variant}`,
                error && "text-input__field--error",
                leftIcon && "text-input__field--with-left-icon",
                rightIcon && "text-input__field--with-right-icon",
                className
              )}
              rows={rows}
              value={props.value}
              onChange={props.onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
              onKeyDown={props.onKeyDown}
              onFocus={props.onFocus}
              onBlur={props.onBlur}
              placeholder={props.placeholder}
              disabled={props.disabled}
              {...(props as Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value" | "onKeyDown" | "onFocus" | "onBlur">)}
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
          </label>
        )}
        <div className="text-input__wrapper">
          {leftIcon && <div className="text-input__icon text-input__icon--left">{leftIcon}</div>}
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            className={cn(
              "text-input__field",
              `text-input__field--${size}`,
              `text-input__field--${variant}`,
              error && "text-input__field--error",
              leftIcon && "text-input__field--with-left-icon",
              rightIcon && "text-input__field--with-right-icon",
              className
            )}
            value={props.value}
            onChange={props.onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            placeholder={props.placeholder}
            disabled={props.disabled}
            min={props.min}
            max={props.max}
            {...(props as Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size" | "onKeyDown" | "onFocus" | "onBlur">)}
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
