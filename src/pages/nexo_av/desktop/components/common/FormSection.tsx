import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "../../styles/components/common/form-section.css";

export interface FormSectionProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "flat";
  grid?: 1 | 2 | 3;
}

export default function FormSection({
  title,
  description,
  icon,
  children,
  className,
  variant = "default",
  grid,
}: FormSectionProps) {
  return (
    <div
      className={cn(
        "form-section",
        variant !== "default" && `form-section--${variant}`,
        className
      )}
    >
      {(title || icon) && (
        <div className="form-section__header">
          {icon && <div className="form-section__icon">{icon}</div>}
          <div>
            {title && <h4 className="form-section__title">{title}</h4>}
            {description && (
              <p className="form-section__description">{description}</p>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "form-section__content",
          grid && "form-section__grid",
          grid && grid > 1 && `form-section__grid--${grid}`
        )}
      >
        {children}
      </div>
    </div>
  );
}
