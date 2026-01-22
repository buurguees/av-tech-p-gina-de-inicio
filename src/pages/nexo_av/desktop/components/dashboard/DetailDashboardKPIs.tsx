import { ReactNode } from "react";
import "../../styles/components/dashboard/detail-dashboard-kpis.css";

interface KPICard {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
}

interface DetailDashboardKPIsProps {
  title?: string;
  kpis: KPICard[];
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Componente para mostrar KPIs en el Dashboard de detalle
 */
const DetailDashboardKPIs = ({
  title = "KPIs",
  kpis,
  columns = 4,
  className,
}: DetailDashboardKPIsProps) => {
  return (
    <div className={`detail-dashboard-kpis detail-dashboard-kpis--cols-${columns} ${className || ""}`}>
      {title && (
        <h2 className="detail-dashboard-kpis__title">{title}</h2>
      )}
      <div className="detail-dashboard-kpis__grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="detail-dashboard-kpis__card">
            {kpi.icon && (
              <div className="detail-dashboard-kpis__icon">
                {kpi.icon}
              </div>
            )}
            <div className="detail-dashboard-kpis__content">
              <span className="detail-dashboard-kpis__label">{kpi.title}</span>
              <span className="detail-dashboard-kpis__value">{kpi.value}</span>
              {kpi.subtitle && (
                <span className="detail-dashboard-kpis__subtitle">{kpi.subtitle}</span>
              )}
              {kpi.trend && (
                <div className="detail-dashboard-kpis__trend">
                  <span className={`detail-dashboard-kpis__trend-value ${kpi.trend.value >= 0 ? 'positive' : 'negative'}`}>
                    {kpi.trend.value >= 0 ? '+' : ''}{kpi.trend.value}%
                  </span>
                  <span className="detail-dashboard-kpis__trend-label">{kpi.trend.label}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailDashboardKPIs;
