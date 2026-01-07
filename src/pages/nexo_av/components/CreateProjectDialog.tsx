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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

const CreateProjectDialog = ({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [status, setStatus] = useState<string>("PLANNED");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [localName, setLocalName] = useState("");

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
    setSelectedClientId("");
    setStatus("PLANNED");
    setProjectAddress("");
    setProjectCity("");
    setClientOrderNumber("");
    setLocalName("");
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_project', {
        p_client_id: selectedClientId,
        p_status: status,
        p_project_address: projectAddress || null,
        p_project_city: projectCity || null,
        p_client_order_number: clientOrderNumber || null,
        p_local_name: localName || null,
      });

      if (error) throw error;

      toast.success("Proyecto creado correctamente");
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || "Error al crear el proyecto");
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
          <DialogTitle className="text-xl font-bold">Crear Proyecto</DialogTitle>
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
                  className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
                >
                  {loadingClients ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedClient ? (
                    selectedClient.company_name
                  ) : (
                    "Seleccionar cliente..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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

          {/* Dirección del proyecto */}
          <div className="space-y-2">
            <Label className="text-white/80">Dirección del Proyecto</Label>
            <Input
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
              placeholder="Calle, número, código postal..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <Label className="text-white/80">Ciudad</Label>
            <Input
              value={projectCity}
              onChange={(e) => setProjectCity(e.target.value)}
              placeholder="Ciudad del proyecto"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
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
              XXXXXX - {selectedClient?.company_name || '[Cliente]'}
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
                  Creando...
                </>
              ) : (
                'Crear Proyecto'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
