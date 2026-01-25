import { useState, useEffect, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import DetailActionButton, { DetailActionType } from "../navigation/DetailActionButton";
import "../../styles/components/common/form-dialog.css";

// ============= INLINE TEXT INPUT =============
interface InlineTextInputProps {
  type?: "text" | "email" | "tel" | "number" | "textarea" | "date";
  label?: string;
  placeholder?: string;
  value: string | number;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((value: string) => void);
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  rows?: number;
  min?: number;
  max?: number;
}

const InlineTextInput = ({
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  error,
  errorMessage,
  rows = 3,
  min,
  max,
}: InlineTextInputProps) => {
  const baseClasses = cn(
    "w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm",
    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
    "transition-all duration-200 placeholder:text-muted-foreground/60",
    disabled && "opacity-50 cursor-not-allowed bg-muted",
    error && "border-destructive focus:border-destructive focus:ring-destructive/20"
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (typeof onChange === "function") {
      (onChange as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void)(e);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <Label className={cn("text-xs font-medium", error ? "text-destructive" : "text-muted-foreground")}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(baseClasses, "resize-y min-h-[80px]")}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          className={cn(baseClasses, "h-11")}
        />
      )}
      {error && errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
};

// ============= INLINE SELECT =============
interface InlineSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
}

const InlineSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  required,
  disabled,
  error,
  errorMessage,
}: InlineSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <Label className={cn("text-xs font-medium", error ? "text-destructive" : "text-muted-foreground")}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full h-11 px-4 flex items-center justify-between gap-2",
            "bg-background border border-border rounded-xl text-sm",
            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200",
            disabled && "opacity-50 cursor-not-allowed bg-muted",
            error && "border-destructive",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors",
                    value === opt.value && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
};

// ============= TYPES =============
export type FormFieldType = "text" | "email" | "tel" | "number" | "textarea" | "select" | "date";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  rows?: number;
  validation?: (value: any) => string | null;
  className?: string;
  colSpan?: 1 | 2;
  disabled?: boolean;
}

export interface FormSection {
  title?: string;
  fields: FormField[];
}

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  title: string;
  description?: string;
  fields?: FormField[];
  sections?: FormSection[];
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  defaultValues?: Record<string, any>;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  submitActionType?: DetailActionType;
  useCustomSubmitButton?: boolean;
  twoColumnLayout?: boolean;
}

export default function FormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  fields = [],
  sections,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  loading = false,
  defaultValues = {},
  className,
  size = "md",
  submitActionType,
  useCustomSubmitButton = false,
  twoColumnLayout = true,
}: FormDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allFields = sections ? sections.flatMap(section => section.fields) : fields;

  useEffect(() => {
    if (open) {
      const initialData: Record<string, any> = {};
      allFields.forEach((field) => {
        initialData[field.name] = defaultValues[field.name] ?? field.defaultValue ?? "";
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [open, allFields, defaultValues]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || (typeof value === "string" && value.trim() === ""))) {
      return `${field.label} es requerido`;
    }
    if (field.validation && value) return field.validation(value);
    if (field.type === "email" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email no válido";
    }
    if (field.type === "number" && value !== "" && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) return `${field.label} debe ser un número`;
      if (field.min !== undefined && numValue < field.min) return `${field.label} debe ser mayor o igual a ${field.min}`;
      if (field.max !== undefined && numValue > field.max) return `${field.label} debe ser menor o igual a ${field.max}`;
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    allFields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) newErrors[field.name] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      const initialData: Record<string, any> = {};
      allFields.forEach((field) => { initialData[field.name] = field.defaultValue ?? ""; });
      setFormData(initialData);
      setErrors({});
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    const initialData: Record<string, any> = {};
    allFields.forEach((field) => { initialData[field.name] = field.defaultValue ?? ""; });
    setFormData(initialData);
    setErrors({});
  };

  const renderField = (field: FormField): ReactNode => {
    const hasError = !!errors[field.name];
    const fieldValue = formData[field.name] ?? "";
    const colSpan = field.colSpan || 1;

    if (field.type === "select") {
      return (
        <div key={field.name} className={cn("form-dialog__field", colSpan === 2 && "form-dialog__field--full-width", field.className)}>
          <InlineSelect
            label={field.label}
            value={fieldValue as string}
            onChange={(value: string) => handleChange(field.name, value)}
            options={field.options || []}
            placeholder={field.placeholder}
            required={field.required}
            error={hasError}
            errorMessage={hasError ? errors[field.name] : undefined}
            disabled={field.disabled || loading || isSubmitting}
          />
        </div>
      );
    }

    return (
      <div key={field.name} className={cn("form-dialog__field", colSpan === 2 && "form-dialog__field--full-width", field.className)}>
        <InlineTextInput
          type={field.type}
          label={field.label}
          value={fieldValue as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          error={hasError}
          errorMessage={hasError ? errors[field.name] : undefined}
          disabled={field.disabled || loading || isSubmitting}
          rows={field.rows}
          min={field.min}
          max={field.max}
        />
      </div>
    );
  };

  return (
    <>
      {open && <div className="form-dialog__backdrop" />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("form-dialog", `form-dialog--${size}`, className)}>
          <DialogHeader className="form-dialog__header">
            <DialogTitle className="form-dialog__title">{title}</DialogTitle>
            {description && <DialogDescription className="form-dialog__description">{description}</DialogDescription>}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="form-dialog__form">
            <div className={cn("form-dialog__fields", twoColumnLayout && "form-dialog__fields--two-column")}>
              {sections ? (
                sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="form-dialog__section">
                    {section.title && <h3 className="form-dialog__section-title">{section.title}</h3>}
                    <div className={cn("form-dialog__section-fields", twoColumnLayout && "form-dialog__section-fields--two-column")}>
                      {section.fields.map((field) => renderField(field))}
                    </div>
                  </div>
                ))
              ) : (
                fields.map((field) => renderField(field))
              )}
            </div>

            <DialogFooter className="form-dialog__footer">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={loading || isSubmitting} className="form-dialog__button form-dialog__button--cancel">
                {cancelLabel}
              </Button>
              {useCustomSubmitButton && submitActionType ? (
                <div className="form-dialog__custom-submit">
                  <DetailActionButton
                    actionType={submitActionType}
                    onClick={() => { if (validateForm()) { const syntheticEvent = { preventDefault: () => {} } as React.FormEvent; handleSubmit(syntheticEvent); } }}
                    disabled={loading || isSubmitting}
                  />
                </div>
              ) : (
                <Button type="submit" disabled={loading || isSubmitting} className="form-dialog__button form-dialog__button--submit">
                  {isSubmitting && <Loader2 className="form-dialog__spinner" />}
                  {submitLabel}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}