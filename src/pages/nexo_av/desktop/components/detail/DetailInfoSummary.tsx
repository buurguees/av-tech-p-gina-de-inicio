import { ReactNode } from "react";
import "../../styles/components/detail/detail-info-summary.css";

interface DetailInfoSummaryItem {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

interface DetailInfoSummaryProps {
  items?: DetailInfoSummaryItem[];
  columns?: 2 | 3 | 4;
  children?: ReactNode;
  className?: string;
}

/**
 * Componente para el bloque de resumen del DetailInfoBlock
 * Muestra información resumida en formato de grid
 */
const DetailInfoSummary = ({
  items,
  columns = 3,
  children,
  className,
}: DetailInfoSummaryProps) => {
  return (
    <div className={`detail-info-summary detail-info-summary--cols-${columns} ${className || ""}`}>
      {items && items.length > 0 ? (
        <div className="detail-info-summary__grid">
          {items.map((item, index) => (
            <div key={index} className="detail-info-summary__item">
              {item.icon && (
                <div className="detail-info-summary__icon">{item.icon}</div>
              )}
              <div className="detail-info-summary__content">
                <span className="detail-info-summary__label">{item.label}</span>
                <span className="detail-info-summary__value">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default DetailInfoSummary;
