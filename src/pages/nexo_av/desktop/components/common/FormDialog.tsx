import { useState, useEffect, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import DetailActionButton, { DetailActionType } from "../navigation/DetailActionButton";
import "../../styles/components/common/form-dialog.css";
import "../../styles/components/common/form-input.css";

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
          <div className="space-y-1.5 w-full">
            {field.label && (
              <Label className={cn("text-xs font-medium", hasError ? "text-destructive" : "text-muted-foreground")}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Select
              value={fieldValue as string}
              onValueChange={(value: string) => handleChange(field.name, value)}
              disabled={field.disabled || loading || isSubmitting}
            >
              <SelectTrigger className={cn(hasError && "border-destructive")}>
                <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-xs text-destructive mt-1">{errors[field.name]}</p>}
          </div>
        </div>
      );
    }

    const isTextarea = field.type === "textarea";

    return (
      <div key={field.name} className={cn("form-dialog__field", colSpan === 2 && "form-dialog__field--full-width", field.className)}>
        <div className="space-y-1.5 w-full">
          {field.label && (
            <Label className={cn("text-xs font-medium", hasError ? "text-destructive" : "text-muted-foreground")}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
          )}
          {isTextarea ? (
            <textarea
              value={fieldValue as string}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled || loading || isSubmitting}
              rows={field.rows || 3}
              className={cn("form-textarea", hasError && "form-textarea--error")}
            />
          ) : (
            <input
              type={field.type}
              value={fieldValue as string}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled || loading || isSubmitting}
              min={field.min}
              max={field.max}
              className={cn("form-input", hasError && "form-input--error")}
            />
          )}
          {hasError && <p className="text-xs text-destructive mt-1">{errors[field.name]}</p>}
        </div>
      </div>
    );
  };

  return (
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
  );
}