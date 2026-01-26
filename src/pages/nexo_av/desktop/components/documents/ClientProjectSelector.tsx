import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Building2, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Client {
  id: string;
  company_name: string;
}

export interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

// ============= MAIN COMPONENT =============
interface ClientProjectSelectorProps {
  selectedClientId: string;
  selectedProjectId: string;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  onProjectsLoaded?: (projects: Project[]) => void;
  disabled?: boolean;
  className?: string;
  layout?: "horizontal" | "vertical";
  showLabels?: boolean;
}

export default function ClientProjectSelector({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onProjectsLoaded,
  disabled = false,
  className,
  layout = "horizontal",
  showLabels = true,
}: ClientProjectSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase.rpc("list_clients", {});
        if (error) throw error;
        const clientList = data?.map((c: any) => ({ id: c.id, company_name: c.company_name })) || [];
        setClients(clientList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Fetch projects when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      return;
    }

    const fetchClientProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase.rpc("list_projects", { p_search: null });
        if (error) throw error;
        
        const clientProjects = (data || [])
          .filter((p: any) => p.client_id === selectedClientId)
          .map((p: any) => ({ id: p.id, project_number: p.project_number, project_name: p.project_name }));
        
        setProjects(clientProjects);
        onProjectsLoaded?.(clientProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchClientProjects();
  }, [selectedClientId, onProjectsLoaded]);

  const handleClientChange = (clientId: string) => {
    onClientChange(clientId);
    onProjectChange("");
  };

  return (
    <div className={cn(
      "client-project-selector",
      layout === "horizontal" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-4",
      className
    )}>
      {/* Client Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>Cliente</span>
          </Label>
        )}
        <div className="relative">
          <select
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={disabled || loadingClients}
            className="form-input"
          >
            <option value="">
              {loadingClients ? "Cargando..." : "Seleccionar cliente"}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          {loadingClients && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Project Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Proyecto</span>
          </Label>
        )}
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={disabled || !selectedClientId || loadingProjects}
            className="form-input"
          >
            <option value="">
              {!selectedClientId
                ? "Selecciona un cliente primero"
                : loadingProjects
                  ? "Cargando..."
                  : projects.length === 0
                    ? "Sin proyectos disponibles"
                    : "Seleccionar proyecto"}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name} ({p.project_number})</option>
            ))}
          </select>
          {loadingProjects && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}