import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ListTodo, Plus, Search, Filter, CheckCircle2, Circle,
  Clock, AlertTriangle, Loader2, ChevronRight, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  project_id: string | null;
  project_name: string;
  site_id: string | null;
  site_name: string;
  tags: string[] | null;
  assignee_count: number;
  created_at: string;
  updated_at: string;
  created_by_name: string;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgente", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  HIGH: { label: "Alta", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  MEDIUM: { label: "Media", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  LOW: { label: "Baja", color: "bg-muted text-muted-foreground border-border" },
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  TODO: { label: "Pendiente", icon: Circle, color: "text-muted-foreground" },
  IN_PROGRESS: { label: "En curso", icon: Clock, color: "text-blue-500" },
  BLOCKED: { label: "Bloqueada", icon: AlertTriangle, color: "text-red-500" },
  DONE: { label: "Hecha", icon: CheckCircle2, color: "text-green-500" },
};

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "MEDIUM", due_date: "" });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { p_limit: 100, p_include_archived: false };
      if (statusFilter !== "all") params.p_status = statusFilter;
      if (priorityFilter !== "all") params.p_priority = priorityFilter;

      const { data, error } = await supabase.rpc("tasks_list_for_user", params);
      if (error) throw error;
      setTasks((data as unknown as Task[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!newTask.title.trim()) { toast.error("El título es obligatorio"); return; }
    try {
      setCreating(true);
      const { data, error } = await supabase.rpc("tasks_create", {
        p_title: newTask.title,
        p_description: newTask.description || null,
        p_priority: newTask.priority,
        p_due_date: newTask.due_date || null,
      });
      if (error) throw error;
      toast.success("Tarea creada");
      setShowCreateModal(false);
      setNewTask({ title: "", description: "", priority: "MEDIUM", due_date: "" });
      fetchTasks();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error al crear tarea"));
    } finally {
      setCreating(false);
    }
  };

  const handleQuickStatus = async (taskId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.rpc("tasks_set_status", { p_task_id: taskId, p_status: newStatus });
      if (error) throw error;
      toast.success(`Estado: ${statusConfig[newStatus]?.label || newStatus}`);
      fetchTasks();
    } catch (e) {
      toast.error("Error al cambiar estado");
    }
  };

  const Filters = () => (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-[9999]">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="TODO">Pendiente</SelectItem>
          <SelectItem value="IN_PROGRESS">En curso</SelectItem>
          <SelectItem value="BLOCKED">Bloqueada</SelectItem>
          <SelectItem value="DONE">Hecha</SelectItem>
        </SelectContent>
      </Select>
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-[9999]">
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="URGENT">Urgente</SelectItem>
          <SelectItem value="HIGH">Alta</SelectItem>
          <SelectItem value="MEDIUM">Media</SelectItem>
          <SelectItem value="LOW">Baja</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreateModal(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Nueva tarea
      </Button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Tareas" contextInfo={`${tasks.length} tareas`} tools={<Filters />} />

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ListTodo className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay tareas</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Crear primera tarea
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => {
              const prio = priorityConfig[task.priority] || priorityConfig.MEDIUM;
              const stat = statusConfig[task.status] || statusConfig.TODO;
              const StatusIcon = stat.icon;
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";

              return (
                <button
                  key={task.id}
                  onClick={() => navigate(`/nexo-av/${userId}/tasks/${task.id}`)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border hover:border-primary/30 transition-all group"
                >
                  <button
                    onClick={(e) => handleQuickStatus(task.id, task.status === "DONE" ? "TODO" : "DONE", e)}
                    className="flex-shrink-0"
                  >
                    <StatusIcon className={cn("h-5 w-5", stat.color)} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium truncate", task.status === "DONE" && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", prio.color)}>
                        {prio.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.project_name && <span className="text-[11px] text-muted-foreground">📁 {task.project_name}</span>}
                      {task.site_name && <span className="text-[11px] text-muted-foreground">📍 {task.site_name}</span>}
                      {task.due_date && (
                        <span className={cn("text-[11px] flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {task.assignee_count} asig.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {task.status !== "DONE" && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        {task.status !== "IN_PROGRESS" && (
                          <button
                            onClick={(e) => handleQuickStatus(task.id, "IN_PROGRESS", e)}
                            className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                          >
                            En curso
                          </button>
                        )}
                        {task.status !== "BLOCKED" && (
                          <button
                            onClick={(e) => handleQuickStatus(task.id, "BLOCKED", e)}
                            className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la tarea"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[9999]">
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fecha límite</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
