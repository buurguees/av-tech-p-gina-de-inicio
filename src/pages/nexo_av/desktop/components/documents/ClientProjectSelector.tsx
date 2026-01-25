import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Building2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import SearchableDropdown, { type SearchableDropdownOption } from "../common/SearchableDropdown";

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

  // Convert to SearchableDropdownOption format
  const clientOptions: SearchableDropdownOption[] = clients.map(c => ({
    value: c.id,
    label: c.company_name,
  }));

  const projectOptions: SearchableDropdownOption[] = projects.map(p => ({
    value: p.id,
    label: p.project_name,
    secondaryLabel: p.project_number,
  }));

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
        <SearchableDropdown
          value={selectedClientId}
          onChange={handleClientChange}
          options={clientOptions}
          placeholder="Seleccionar cliente"
          searchPlaceholder="Buscar cliente..."
          disabled={disabled}
          loading={loadingClients}
          emptyMessage="No hay clientes"
        />
      </div>

      {/* Project Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Proyecto</span>
          </Label>
        )}
        <SearchableDropdown
          value={selectedProjectId}
          onChange={onProjectChange}
          options={projectOptions}
          placeholder={
            !selectedClientId
              ? "Selecciona un cliente primero"
              : projects.length === 0
              ? "Sin proyectos disponibles"
              : "Seleccionar proyecto"
          }
          searchPlaceholder="Buscar proyecto..."
          disabled={disabled || !selectedClientId}
          loading={loadingProjects}
          emptyMessage={!selectedClientId ? "Selecciona un cliente" : "Sin proyectos"}
        />
      </div>
    </div>
  );
}
