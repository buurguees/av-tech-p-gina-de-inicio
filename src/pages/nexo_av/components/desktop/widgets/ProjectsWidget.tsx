import { useState, useEffect } from "react";
import { FolderKanban, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Project {
    id: string;
    project_name: string;
    client_name: string;
    status: string;
    created_at: string;
}

const ProjectsWidget = ({ userId }: { userId: string | undefined }) => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, [userId]);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase.rpc('list_projects', {
                p_search: null
            });

            if (error) throw error;

            if (data) {
                // Filter for active projects and take top 5
                const active = (data as any[])
                    .filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNED')
                    .slice(0, 5);

                setProjects(active.map(p => ({
                    id: p.id,
                    project_name: p.project_name,
                    client_name: p.client_name,
                    status: p.status,
                    created_at: p.created_at
                })));
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        'IN_PROGRESS': 'bg-blue-500/10 text-blue-600',
        'PLANNED': 'bg-orange-500/10 text-orange-600',
    };

    const statusLabels: Record<string, string> = {
        'IN_PROGRESS': 'En Progreso',
        'PLANNED': 'Planificado',
    };

    return (
        <DashboardWidget
            title="Proyectos Activos"
            subtitle="En curso y planificados"
            icon={FolderKanban}
            action={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/projects`)} className="gap-1">
                    Ver todos <ArrowRight className="w-4 h-4" />
                </Button>
            }
            variant="clean"
            className="h-full"
        >
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                    <FolderKanban className="w-10 h-10 mb-2 opacity-20" />
                    <p>No hay proyectos activos</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/nexo-av/${userId}/projects/${project.id}`)}>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {project.project_name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                                    <span className="truncate">{project.client_name}</span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-xs opacity-70 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                </p>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[project.status] || project.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardWidget>
    );
};

export default ProjectsWidget;
