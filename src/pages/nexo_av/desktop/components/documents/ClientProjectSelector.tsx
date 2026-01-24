import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        const clientList = data?.map((c: any) => ({
          id: c.id,
          company_name: c.company_name,
        })) || [];
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
        const { data, error } = await supabase.rpc("list_projects", {
          p_search: null,
        });
        if (error) throw error;
        
        const clientProjects = (data || [])
          .filter((p: any) => p.client_id === selectedClientId)
          .map((p: any) => ({
            id: p.id,
            project_number: p.project_number,
            project_name: p.project_name,
          }));
        
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
    // Reset project when client changes
    onProjectChange("");
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className={cn(
      "client-project-selector",
      layout === "horizontal" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-4",
      className
    )}>
      {/* Client Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label">
            <Building2 className="h-3.5 w-3.5" />
            <span>Cliente</span>
          </Label>
        )}
        <Select
          value={selectedClientId}
          onValueChange={handleClientChange}
          disabled={disabled || loadingClients}
        >
          <SelectTrigger className="selector-trigger">
            {loadingClients ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <SelectValue placeholder="Seleccionar cliente" />
            )}
          </SelectTrigger>
          <SelectContent className="selector-content">
            {clients.map((client) => (
              <SelectItem
                key={client.id}
                value={client.id}
                className="selector-item"
              >
                {client.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Proyecto</span>
          </Label>
        )}
        <Select
          value={selectedProjectId}
          onValueChange={onProjectChange}
          disabled={disabled || !selectedClientId || loadingProjects}
        >
          <SelectTrigger className="selector-trigger">
            {loadingProjects ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <SelectValue
                placeholder={
                  !selectedClientId
                    ? "Selecciona un cliente primero"
                    : projects.length === 0
                    ? "Sin proyectos disponibles"
                    : "Seleccionar proyecto"
                }
              />
            )}
          </SelectTrigger>
          <SelectContent className="selector-content">
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                className="selector-item"
              >
                <span className="font-mono text-xs opacity-60 mr-2">
                  {project.project_number}
                </span>
                {project.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
