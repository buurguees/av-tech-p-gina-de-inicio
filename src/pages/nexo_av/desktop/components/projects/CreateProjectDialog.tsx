import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectDetail {
  id: string;
  project_number: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  project_name: string;
  quote_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedClientId?: string;
  project?: ProjectDetail | null; // Para modo edición
}

interface Client {
  id: string;
  company_name: string;
}

const PROJECT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const CreateProjectDialog = ({ open, onOpenChange, onSuccess, preselectedClientId, project }: CreateProjectDialogProps) => {

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  
  const isEditMode = !!project;
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || "");
  const [status, setStatus] = useState<string>("PLANNED");
  // Address fields
  const [projectStreet, setProjectStreet] = useState("");
  const [projectPostalCode, setProjectPostalCode] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [projectProvince, setProjectProvince] = useState("");
  const [projectCountry, setProjectCountry] = useState("España");
  // Other fields
  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [localName, setLocalName] = useState("");

  // Parse address string into individual fields
  const parseAddress = (address: string | null) => {
    if (!address) return { street: "", postalCode: "", city: "", province: "", country: "España" };
    
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    // Typical format: "Calle, Código Postal, Ciudad, Provincia, País"
    // We'll try to be smart about it
    const result = {
      street: "",
      postalCode: "",
      city: "",
      province: "",
      country: "España"
    };
    
    if (parts.length > 0) {
      // First part is usually the street
      result.street = parts[0];
    }
    if (parts.length > 1) {
      // Second part might be postal code (if numeric) or city
      const secondPart = parts[1];
      if (/^\d{5}$/.test(secondPart)) {
        result.postalCode = secondPart;
        if (parts.length > 2) result.city = parts[2];
        if (parts.length > 3) result.province = parts[3];
        if (parts.length > 4) result.country = parts[4];
      } else {
        result.city = secondPart;
        if (parts.length > 2) result.province = parts[2];
        if (parts.length > 3) result.country = parts[3];
      }
    }
    
    return result;
  };

  // Load project data when in edit mode
  useEffect(() => {
    if (open && project) {
      setSelectedClientId(project.client_id || "");
      setStatus(project.status || "PLANNED");
      
      const parsedAddress = parseAddress(project.project_address);
      setProjectStreet(parsedAddress.street);
      setProjectPostalCode(parsedAddress.postalCode);
      setProjectCity(project.project_city || parsedAddress.city);
      setProjectProvince(parsedAddress.province);
      setProjectCountry(parsedAddress.country);
      
      setClientOrderNumber(project.client_order_number || "");
      setLocalName(project.local_name || "");
    }
  }, [open, project]);

  // Update selectedClientId when preselectedClientId changes
  useEffect(() => {
    if (preselectedClientId && !project) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId, open, project]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase.rpc('list_clients');
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    if (open) {
      fetchClients();
    }
  }, [open]);

  const resetForm = () => {
    if (project) {
      // In edit mode, reload project data
      setSelectedClientId(project.client_id || "");
      setStatus(project.status || "PLANNED");
      
      const parsedAddress = parseAddress(project.project_address);
      setProjectStreet(parsedAddress.street);
      setProjectPostalCode(parsedAddress.postalCode);
      setProjectCity(project.project_city || parsedAddress.city);
      setProjectProvince(parsedAddress.province);
      setProjectCountry(parsedAddress.country);
      
      setClientOrderNumber(project.client_order_number || "");
      setLocalName(project.local_name || "");
    } else {
      // In create mode, reset to defaults
      setSelectedClientId(preselectedClientId || "");
      setStatus("PLANNED");
      setProjectStreet("");
      setProjectPostalCode("");
      setProjectCity("");
      setProjectProvince("");
      setProjectCountry("España");
      setClientOrderNumber("");
      setLocalName("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    // Combine address fields into a single address string
    const addressParts = [
      projectStreet,
      projectPostalCode,
      projectCity,
      projectProvince,
      projectCountry
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    setSubmitting(true);
    try {
      if (isEditMode && project) {
        // Update existing project
        const { error } = await supabase.rpc('update_project', {
          p_project_id: project.id,
          p_status: status,
          p_project_address: fullAddress || null,
          p_project_city: projectCity || null,
          p_client_order_number: clientOrderNumber || null,
          p_local_name: localName || null,
        });

        if (error) throw error;

        toast.success("Proyecto actualizado correctamente");
        onSuccess();
      } else {
        // Create new project
        const { data, error } = await supabase.rpc('create_project', {
          p_client_id: selectedClientId,
          p_status: status,
          p_project_address: fullAddress || null,
          p_project_city: projectCity || null,
          p_client_order_number: clientOrderNumber || null,
          p_local_name: localName || null,
        });

        if (error) throw error;

        toast.success("Proyecto creado correctamente");
        resetForm();
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, error);
      toast.error(error.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el proyecto`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? "Editar Proyecto" : "Crear Proyecto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-white/80">Cliente *</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  disabled={isEditMode}
                  className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingClients ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedClient ? (
                    selectedClient.company_name
                  ) : (
                    "Seleccionar cliente..."
                  )}
                  {!isEditMode && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-zinc-900 border-white/10" align="start">
                <Command className="bg-transparent">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    className="text-white"
                  />
                  <CommandList>
                    <CommandEmpty className="text-white/40 py-4 text-center">
                      No se encontraron clientes
                    </CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.company_name}
                          onSelect={() => {
                            setSelectedClientId(client.id);
                            setClientOpen(false);
                          }}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedClientId === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {client.company_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label className="text-white/80">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem 
                    key={s.value} 
                    value={s.value}
                    className="text-white hover:bg-white/10"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dirección del proyecto - Sección */}
          <div className="space-y-3">
            <Label className="text-white/80 font-medium">Dirección del Proyecto</Label>
            
            {/* Calle y número */}
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Calle y Número</Label>
              <Input
                value={projectStreet}
                onChange={(e) => setProjectStreet(e.target.value)}
                placeholder="Ej: Calle Mayor, 25"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            {/* Código Postal y Población en una fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Código Postal</Label>
                <Input
                  value={projectPostalCode}
                  onChange={(e) => setProjectPostalCode(e.target.value)}
                  placeholder="Ej: 28001"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Población</Label>
                <Input
                  value={projectCity}
                  onChange={(e) => setProjectCity(e.target.value)}
                  placeholder="Ej: Madrid"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Provincia y País en una fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Provincia</Label>
                <Input
                  value={projectProvince}
                  onChange={(e) => setProjectProvince(e.target.value)}
                  placeholder="Ej: Madrid"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">País</Label>
                <Input
                  value={projectCountry}
                  onChange={(e) => setProjectCountry(e.target.value)}
                  placeholder="España"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          </div>

          {/* Nº de Pedido del cliente */}
          <div className="space-y-2">
            <Label className="text-white/80">Nº de Pedido del Cliente (opcional)</Label>
            <Input
              value={clientOrderNumber}
              onChange={(e) => setClientOrderNumber(e.target.value)}
              placeholder="Número de pedido del cliente"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Nombre del local */}
          <div className="space-y-2">
            <Label className="text-white/80">Nombre del Local</Label>
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Nombre del establecimiento"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Info del nombre auto-generado */}
          <div className="bg-white/5 rounded-lg p-3 text-sm text-white/60">
            <p className="font-medium text-white/80 mb-1">Nombre del proyecto (auto-generado):</p>
            <p className="font-mono text-xs">
              {isEditMode && project ? project.project_number : 'XXXXXX'} - {selectedClient?.company_name || '[Cliente]'}
              {clientOrderNumber ? ` - ${clientOrderNumber}` : ''}
              {projectCity ? ` - ${projectCity}` : ''}
              {localName ? ` - ${localName}` : ''}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedClientId}
              className="bg-white text-black hover:bg-white/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditMode ? "Actualizando..." : "Creando..."}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Proyecto'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
