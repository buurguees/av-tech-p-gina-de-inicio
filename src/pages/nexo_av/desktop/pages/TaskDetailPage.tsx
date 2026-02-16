import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle,
  MessageSquare, Loader2, Send, Users, Calendar, Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

interface TaskDetail {
  id: string; title: string; description: string; status: string; priority: string;
  due_date: string | null; start_date: string | null; completed_at: string | null;
  project_id: string | null; project_name: string; site_id: string | null; site_name: string;
  quote_id: string | null; invoice_id: string | null; visit_id: string | null;
  tags: string[] | null; source: string; is_archived: boolean;
  created_at: string; updated_at: string; created_by: string; created_by_name: string;
}

interface Assignee { user_id: string; user_name: string; role_in_task: string; assigned_at: string; }
interface Activity { id: string; created_at: string; created_by_name: string; type: string; message: string; meta: any; }

const statusOptions = [
  { value: "TODO", label: "Pendiente", icon: Circle, color: "text-muted-foreground" },
  { value: "IN_PROGRESS", label: "En curso", icon: Clock, color: "text-blue-500" },
  { value: "BLOCKED", label: "Bloqueada", icon: AlertTriangle, color: "text-red-500" },
  { value: "DONE", label: "Hecha", icon: CheckCircle2, color: "text-green-500" },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgente", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  HIGH: { label: "Alta", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  MEDIUM: { label: "Media", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  LOW: { label: "Baja", color: "bg-muted text-muted-foreground border-border" },
};

const TaskDetailPage = () => {
  const { userId, taskId } = useParams<{ userId: string; taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (taskId) fetchAll();
  }, [taskId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [taskRes, assigneesRes, activityRes] = await Promise.all([
        supabase.rpc("tasks_get", { p_task_id: taskId }),
        supabase.rpc("tasks_get_assignees", { p_task_id: taskId }),
        supabase.rpc("tasks_get_activity", { p_task_id: taskId }),
      ]);
      if (taskRes.data) setTask((taskRes.data as unknown as TaskDetail[])[0] || null);
      if (assigneesRes.data) setAssignees(assigneesRes.data as unknown as Assignee[]);
      if (activityRes.data) setActivity(activityRes.data as unknown as Activity[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase.rpc("tasks_set_status", { p_task_id: taskId, p_status: newStatus });
      if (error) throw error;
      toast.success(`Estado actualizado`);
      fetchAll();
    } catch (e) {
      toast.error("Error al cambiar estado");
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setSending(true);
      const { error } = await supabase.rpc("tasks_add_comment", { p_task_id: taskId, p_message: comment });
      if (error) throw error;
      setComment("");
      toast.success("Comentario añadido");
      fetchAll();
    } catch (e) {
      toast.error("Error al añadir comentario");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <DetailNavigationBar pageTitle="Tarea" />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Tarea no encontrada</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const prio = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle={task.title}
        contextInfo={`Creada por ${task.created_by_name}`}
        tools={
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[9999]">
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center gap-2">
                    <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            {task.description && (
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Descripción</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Activity & Comments */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Actividad
              </h4>

              {/* Add comment */}
              <div className="flex gap-2 mb-4">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={2}
                  className="text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAddComment(); }}
                />
                <Button size="sm" onClick={handleAddComment} disabled={sending || !comment.trim()} className="self-end">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {/* Activity list */}
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] mt-0.5",
                      a.type === "COMMENT" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      {a.type === "COMMENT" ? "💬" : "⚡"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{a.created_by_name}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(a.created_at).toLocaleDateString("es-ES", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">Sin actividad</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Meta */}
            <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Prioridad</span>
                <Badge variant="outline" className={cn("mt-1 block w-fit", prio.color)}>{prio.label}</Badge>
              </div>
              {task.due_date && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha límite</span>
                  <p className={cn("text-sm mt-0.5 flex items-center gap-1",
                    new Date(task.due_date) < new Date() && task.status !== "DONE" ? "text-red-500" : "text-foreground"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString("es-ES")}
                  </p>
                </div>
              )}
              {task.project_name && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Proyecto</span>
                  <p className="text-sm text-foreground mt-0.5">📁 {task.project_name}</p>
                </div>
              )}
              {task.site_name && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Site</span>
                  <p className="text-sm text-foreground mt-0.5">📍 {task.site_name}</p>
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Asignados
              </h4>
              {assignees.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">Sin asignados</p>
              ) : (
                <div className="space-y-2">
                  {assignees.map(a => (
                    <div key={a.user_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {a.user_name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs text-foreground">{a.user_name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({a.role_in_task})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
