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
import TextInput from "./TextInput";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import DetailActionButton, { DetailActionType } from "../navigation/DetailActionButton";
import "../../styles/components/common/form-dialog.css";

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
  options?: FormFieldOption[]; // Para tipo "select"
  min?: number; // Para tipo "number"
  max?: number; // Para tipo "number"
  rows?: number; // Para tipo "textarea"
  validation?: (value: any) => string | null; // Función de validación personalizada
  className?: string;
  colSpan?: 1 | 2; // Para controlar el ancho en layout de dos columnas (1 = media columna, 2 = ancho completo)
  disabled?: boolean; // Para deshabilitar campos
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
  fields?: FormField[]; // Campos simples (sin secciones)
  sections?: FormSection[]; // Secciones con campos agrupados (prioridad sobre fields)
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  defaultValues?: Record<string, any>;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  submitActionType?: DetailActionType; // Tipo de acción para DetailActionButton
  useCustomSubmitButton?: boolean; // Si true, usa DetailActionButton en lugar del botón estándar
  twoColumnLayout?: boolean; // Si true, usa layout de dos columnas
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

  // Normalizar campos: si hay sections, usar esos; si no, usar fields
  const allFields = sections 
    ? sections.flatMap(section => section.fields)
    : fields;

  // Inicializar formData con valores por defecto
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    // Validación de campo requerido
    if (field.required && (!value || (typeof value === "string" && value.trim() === ""))) {
      return `${field.label} es requerido`;
    }

    // Validación personalizada
    if (field.validation && value) {
      return field.validation(value);
    }

    // Validación de email
    if (field.type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Email no válido";
      }
    }

    // Validación de número
    if (field.type === "number" && value !== "" && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${field.label} debe ser un número`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} debe ser mayor o igual a ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} debe ser menor o igual a ${field.max}`;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    allFields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      // Resetear formulario después de enviar exitosamente
      const initialData: Record<string, any> = {};
      allFields.forEach((field) => {
        initialData[field.name] = field.defaultValue ?? "";
      });
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
    // Resetear formulario al cancelar
    const initialData: Record<string, any> = {};
    allFields.forEach((field) => {
      initialData[field.name] = field.defaultValue ?? "";
    });
    setFormData(initialData);
    setErrors({});
  };

  const renderField = (field: FormField): ReactNode => {
    const hasError = !!errors[field.name];
    const fieldValue = formData[field.name] ?? "";
    const colSpan = field.colSpan || 1;

    if (field.type === "select") {
      return (
        <div 
          key={field.name} 
          className={cn(
            "form-dialog__field", 
            colSpan === 2 && "form-dialog__field--full-width",
            field.className
          )}
        >
          <TextInput
            type="select"
            label={field.label}
            value={fieldValue as string}
            onChange={(value: string) => handleChange(field.name, value)}
            placeholder={field.placeholder}
            required={field.required}
            error={hasError}
            errorMessage={hasError ? errors[field.name] : undefined}
            disabled={field.disabled || loading || isSubmitting}
            options={field.options}
            size="md"
            variant="default"
            className={field.className}
          />
        </div>
      );
    }

    return (
      <div 
        key={field.name} 
        className={cn(
          "form-dialog__field",
          colSpan === 2 && "form-dialog__field--full-width",
          field.className
        )}
      >
        <TextInput
          type={field.type}
          label={field.label}
          value={fieldValue as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange(field.name, e.target.value)
          }
          placeholder={field.placeholder}
          required={field.required}
          error={hasError}
          errorMessage={hasError ? errors[field.name] : undefined}
          disabled={field.disabled || loading || isSubmitting}
          rows={field.rows}
          min={field.min}
          max={field.max}
          size="md"
          variant="default"
          className={field.className}
        />
      </div>
    );
  };

  return (
    <>
      {/* Efecto de desenfoque cuando el diálogo está abierto */}
      {open && <div className="form-dialog__backdrop" />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("form-dialog", `form-dialog--${size}`, className)}>
        <DialogHeader className="form-dialog__header">
          <DialogTitle className="form-dialog__title">{title}</DialogTitle>
          {description && (
            <DialogDescription className="form-dialog__description">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="form-dialog__form">
          <div className={cn("form-dialog__fields", twoColumnLayout && "form-dialog__fields--two-column")}>
            {sections ? (
              sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="form-dialog__section">
                  {section.title && (
                    <h3 className="form-dialog__section-title">{section.title}</h3>
                  )}
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
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading || isSubmitting}
              className="form-dialog__button form-dialog__button--cancel"
            >
              {cancelLabel}
            </Button>
            {useCustomSubmitButton && submitActionType ? (
              <div className="form-dialog__custom-submit">
                <DetailActionButton
                  actionType={submitActionType}
                  onClick={() => {
                    // Validar y enviar el formulario
                    if (validateForm()) {
                      // Crear un evento sintético para handleSubmit
                      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleSubmit(syntheticEvent);
                    }
                  }}
                  disabled={loading || isSubmitting}
                />
              </div>
            ) : (
              <Button
                type="submit"
                disabled={loading || isSubmitting}
                className="form-dialog__button form-dialog__button--submit"
              >
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
