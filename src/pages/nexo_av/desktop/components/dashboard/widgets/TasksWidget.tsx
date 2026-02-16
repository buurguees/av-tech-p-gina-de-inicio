import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Plus,
  ChevronRight, Loader2, ListTodo
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name: string;
  site_name: string;
  assignee_count: number;
  created_at: string;
}

const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  URGENT: { label: "Urgente", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle },
  HIGH: { label: "Alta", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle },
  MEDIUM: { label: "Media", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  LOW: { label: "Baja", color: "bg-muted text-muted-foreground border-border", icon: Circle },
};

const statusConfig: Record<string, { label: string; icon: any }> = {
  TODO: { label: "Pendiente", icon: Circle },
  IN_PROGRESS: { label: "En curso", icon: Clock },
  BLOCKED: { label: "Bloqueada", icon: AlertTriangle },
  DONE: { label: "Hecha", icon: CheckCircle2 },
};

interface TasksWidgetProps {
  variant?: "today" | "pending" | "urgent";
  maxItems?: number;
  siteId?: string;
}

const TasksWidget = ({ variant = "today", maxItems = 8, siteId }: TasksWidgetProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    fetchTasks();
  }, [variant, siteId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: any = { p_limit: maxItems };
      
      if (variant === "today") {
        params.p_due_today = true;
      } else if (variant === "urgent") {
        params.p_priority = "URGENT";
      } else {
        params.p_status = "TODO";
      }
      
      if (siteId) params.p_site_id = siteId;

      const { data, error } = await supabase.rpc("tasks_list_for_user", params);
      if (error) throw error;
      setTasks((data as unknown as Task[]) || []);
    } catch (e) {
      console.error("Error fetching tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDone = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.rpc("tasks_set_status", { p_task_id: taskId, p_status: "DONE" });
      if (error) throw error;
      toast.success("Tarea completada");
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      toast.error("Error al completar tarea");
    }
  };

  const titles: Record<string, string> = {
    today: "Mis tareas hoy",
    pending: "Tareas pendientes",
    urgent: "Urgentes / Bloqueadas",
  };

  const emptyMessages: Record<string, string> = {
    today: "No hay tareas para hoy",
    pending: "Sin tareas pendientes",
    urgent: "Sin tareas urgentes",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card/50 border border-border rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{titles[variant]}</h3>
          {tasks.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {tasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate(`/nexo-av/${userId}/tasks`)}
          >
            Ver todas <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{emptyMessages[variant]}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const prio = priorityConfig[task.priority] || priorityConfig.MEDIUM;
            const stat = statusConfig[task.status] || statusConfig.TODO;
            const StatusIcon = stat.icon;

            return (
              <button
                key={task.id}
                onClick={() => navigate(`/nexo-av/${userId}/tasks/${task.id}`)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
              >
                <button
                  onClick={(e) => handleQuickDone(task.id, e)}
                  className="flex-shrink-0 p-0.5 rounded-full hover:bg-primary/10 transition-colors"
                  title="Marcar como hecha"
                >
                  <StatusIcon className={cn(
                    "h-4 w-4",
                    task.status === "BLOCKED" ? "text-red-500" :
                    task.status === "IN_PROGRESS" ? "text-blue-500" :
                    "text-muted-foreground group-hover:text-primary"
                  )} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground truncate">{task.title}</span>
                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", prio.color)}>
                      {prio.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.project_name && (
                      <span className="text-[10px] text-muted-foreground truncate">📁 {task.project_name}</span>
                    )}
                    {task.site_name && (
                      <span className="text-[10px] text-muted-foreground truncate">📍 {task.site_name}</span>
                    )}
                    {task.due_date && (
                      <span className={cn(
                        "text-[10px]",
                        new Date(task.due_date) < new Date() ? "text-red-500" : "text-muted-foreground"
                      )}>
                        📅 {new Date(task.due_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default TasksWidget;
