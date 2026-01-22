import { ReactNode } from "react";
import "../../styles/components/detail/detail-info-header.css";

interface DetailInfoHeaderProps {
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Componente para la cabecera del DetailInfoBlock
 * Muestra datos importantes como título, subtítulo, badge y acciones
 */
const DetailInfoHeader = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: DetailInfoHeaderProps) => {
  return (
    <div className={`detail-info-header ${className || ""}`}>
      <div className="detail-info-header__main">
        <div className="detail-info-header__info">
          {title && (
            <h2 className="detail-info-header__title">{title}</h2>
          )}
          {subtitle && (
            <p className="detail-info-header__subtitle">{subtitle}</p>
          )}
          {badge && (
            <div className="detail-info-header__badge">{badge}</div>
          )}
        </div>
        {actions && (
          <div className="detail-info-header__actions">{actions}</div>
        )}
      </div>
      {children && (
        <div className="detail-info-header__children">{children}</div>
      )}
    </div>
  );
};

export default DetailInfoHeader;
