import { LucideIcon } from "lucide-react";
import "../../styles/components/detail/metric-card.css";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
}

const MetricCard = ({ title, value, icon: Icon, className }: MetricCardProps) => {
  return (
    <div className={`metric-card ${className || ""}`}>
      <div className="metric-card__icon">
        <Icon className="metric-card__icon-svg" />
      </div>
      <div className="metric-card__content">
        <span className="metric-card__title">{title}</span>
        <span className="metric-card__value">{value}</span>
      </div>
    </div>
  );
};

export default MetricCard;
