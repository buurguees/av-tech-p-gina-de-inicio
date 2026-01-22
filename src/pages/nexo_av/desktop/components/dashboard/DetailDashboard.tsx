import { ReactNode } from "react";
import "../../styles/components/dashboard/detail-dashboard.css";

interface DetailDashboardProps {
  kpis?: ReactNode;
  products?: ReactNode;
  tasks?: ReactNode;
  className?: string;
}

/**
 * Componente Dashboard reutilizable para páginas de detalle
 * Acepta secciones de KPIs, Productos y Tareas
 */
const DetailDashboard = ({
  kpis,
  products,
  tasks,
  className,
}: DetailDashboardProps) => {
  return (
    <div className={`detail-dashboard ${className || ""}`}>
      {/* Sección de KPIs */}
      {kpis && (
        <section className="detail-dashboard__section detail-dashboard__kpis">
          {kpis}
        </section>
      )}

      {/* Sección de Productos */}
      {products && (
        <section className="detail-dashboard__section detail-dashboard__products">
          {products}
        </section>
      )}

      {/* Sección de Tareas */}
      {tasks && (
        <section className="detail-dashboard__section detail-dashboard__tasks">
          {tasks}
        </section>
      )}
    </div>
  );
};

export default DetailDashboard;
