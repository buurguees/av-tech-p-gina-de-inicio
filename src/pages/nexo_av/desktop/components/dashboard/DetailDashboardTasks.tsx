import { ReactNode } from "react";
import "../../styles/components/dashboard/detail-dashboard-tasks.css";

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  [key: string]: any; // Para permitir campos adicionales
}

interface DetailDashboardTasksProps {
  title?: string;
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
  onTaskClick?: (task: Task) => void;
  renderTask?: (task: Task) => ReactNode;
  className?: string;
}

/**
 * Componente para mostrar tareas en el Dashboard de detalle
 */
const DetailDashboardTasks = ({
  title = "Tareas",
  tasks,
  loading = false,
  emptyMessage = "No hay tareas",
  onTaskClick,
  renderTask,
  className,
}: DetailDashboardTasksProps) => {
  if (loading) {
    return (
      <div className={`detail-dashboard-tasks ${className || ""}`}>
        {title && <h2 className="detail-dashboard-tasks__title">{title}</h2>}
        <div className="detail-dashboard-tasks__loading">
          <p className="detail-dashboard-tasks__loading-text">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={`detail-dashboard-tasks ${className || ""}`}>
        {title && <h2 className="detail-dashboard-tasks__title">{title}</h2>}
        <div className="detail-dashboard-tasks__empty">
          <p className="detail-dashboard-tasks__empty-text">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className={`detail-dashboard-tasks ${className || ""}`}>
      {title && <h2 className="detail-dashboard-tasks__title">{title}</h2>}
      <div className="detail-dashboard-tasks__list">
        {tasks.map((task) => {
          if (renderTask) {
            return (
              <div
                key={task.id}
                className={`detail-dashboard-tasks__item ${onTaskClick ? 'detail-dashboard-tasks__item--clickable' : ''}`}
                onClick={() => onTaskClick?.(task)}
              >
                {renderTask(task)}
              </div>
            );
          }

          return (
            <div
              key={task.id}
              className={`detail-dashboard-tasks__item ${onTaskClick ? 'detail-dashboard-tasks__item--clickable' : ''}`}
              onClick={() => onTaskClick?.(task)}
            >
              <div className="detail-dashboard-tasks__item-content">
                <div className="detail-dashboard-tasks__item-main">
                  <span className="detail-dashboard-tasks__item-title">{task.title}</span>
                  {task.description && (
                    <span className="detail-dashboard-tasks__item-description">{task.description}</span>
                  )}
                </div>
                <div className="detail-dashboard-tasks__item-meta">
                  {task.status && (
                    <span className="detail-dashboard-tasks__item-status">{task.status}</span>
                  )}
                  {task.priority && (
                    <span className="detail-dashboard-tasks__item-priority">{task.priority}</span>
                  )}
                  {task.due_date && (
                    <span className="detail-dashboard-tasks__item-date">
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetailDashboardTasks;
