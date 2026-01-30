import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import { CalendarIcon, Loader2, Save, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  company_name: string;
  tax_id: string | null;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name?: string | null;
}

interface Technician {
  id: string;
  company_name: string;
  technician_number: string;
}

const NewPurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Preselecciones desde URL
  const preselectedProjectId = searchParams.get("projectId");
  const preselectedSupplierId = searchParams.get("supplierId");
  const preselectedTechnicianId = searchParams.get("technicianId");

  const [saving, setSaving] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [supplierSearchValue, setSupplierSearchValue] = useState("");
  const [projectSearchValue, setProjectSearchValue] = useState("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [expectedStartDate, setExpectedStartDate] = useState<Date | undefined>();
  const [expectedEndDate, setExpectedEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Cargar técnicos
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setLoadingTechnicians(true);
        const { data, error } = await supabase.rpc("list_technicians", {
          p_search: null,
        });
        if (error) throw error;
        setTechnicians((data || []) as Technician[]);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      } finally {
        setLoadingTechnicians(false);
      }
    };
    fetchTechnicians();
  }, []);

  // Precargar proyecto si viene en URL
  useEffect(() => {
    if (preselectedProjectId) {
      const fetchProject = async () => {
        try {
          const { data, error } = await supabase.rpc("get_project", {
            p_project_id: preselectedProjectId,
          });
          if (error) throw error;
          if (data && data.length > 0) {
            const project = {
              id: data[0].id,
              project_number: data[0].project_number,
              project_name: data[0].project_name,
              client_name: data[0].client_name,
            };
            setSelectedProject(project);
            setProjectSearchValue(project.project_name);
          }
        } catch (error) {
          console.error("Error fetching project:", error);
        }
      };
      fetchProject();
    }
  }, [preselectedProjectId]);

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const { data: orderId, error } = await supabase.rpc("create_purchase_order" as any, {
        p_supplier_id: selectedSupplier?.id || null,
        p_technician_id: selectedTechnician?.id || null,
        p_project_id: selectedProject?.id || null,
        p_issue_date: issueDate.toISOString().split("T")[0],
        p_expected_start_date: expectedStartDate
          ? expectedStartDate.toISOString().split("T")[0]
          : null,
        p_expected_end_date: expectedEndDate
          ? expectedEndDate.toISOString().split("T")[0]
          : null,
        p_notes: notes || null,
        p_internal_notes: internalNotes || null,
      });

      if (error) throw error;

      toast({
        title: "Pedido creado",
        description: "El pedido de compra se ha creado correctamente. Ahora puedes añadir las líneas.",
      });

      // Navegar al detalle para añadir líneas
      navigate(`/nexo-av/${userId}/purchase-orders/${orderId}`);
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el pedido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Nuevo Pedido de Compra"
        contextInfo="Crear estimación de coste"
        backPath={userId ? `/nexo-av/${userId}/purchase-orders` : undefined}
        tools={
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Pedido
              </>
            )}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-400">
                  Documento de Estimación (No Fiscal)
                </h4>
                <p className="text-xs text-blue-300/70 mt-1">
                  Los Pedidos de Compra sirven para estimar costes y planificar técnicos.
                  <strong className="text-blue-300"> NO generan asientos contables.</strong>
                  La contabilidad se registra cuando se crea la Factura de Compra real.
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Proveedor / Técnico */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Proveedor / Técnico
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Proveedor</Label>
                <SupplierSearchInput
                  value={supplierSearchValue}
                  onChange={setSupplierSearchValue}
                  onSelectSupplier={(supplier) => {
                    setSelectedSupplier(supplier);
                    setSupplierSearchValue(supplier.company_name);
                    // Si selecciona proveedor, limpiar técnico
                    setSelectedTechnician(null);
                  }}
                  placeholder="Escribe @ para buscar..."
                  entityType="SUPPLIER"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Escribe @ seguido del nombre para buscar
                </p>
              </div>

              <div>
                <Label>Técnico</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedTechnician?.id || ""}
                  onChange={(e) => {
                    const tech = technicians.find((t) => t.id === e.target.value);
                    setSelectedTechnician(tech || null);
                    // Si selecciona técnico, limpiar proveedor
                    if (tech) setSelectedSupplier(null);
                  }}
                  disabled={loadingTechnicians}
                >
                  <option value="">Seleccionar técnico...</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.company_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Técnico de instalación freelance
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Proyecto */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Proyecto Asociado</h3>

            <div>
              <Label>Proyecto</Label>
              <ProjectSearchInput
                value={projectSearchValue}
                onChange={setProjectSearchValue}
                onSelectProject={(project) => {
                  setSelectedProject(project);
                  setProjectSearchValue(project.project_name);
                }}
                placeholder="Escribe @ para buscar o selecciona..."
                showDropdown={true}
              />
              {selectedProject && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <p className="font-medium">{selectedProject.project_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProject.project_number}
                    {selectedProject.client_name && ` • ${selectedProject.client_name}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sección: Fechas */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Fechas</h3>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <Label>Fecha de emisión</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !issueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {issueDate ? format(issueDate, "PPP", { locale: es }) : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={issueDate}
                      onSelect={(date) => date && setIssueDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Inicio previsto del trabajo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedStartDate
                        ? format(expectedStartDate, "PPP", { locale: es })
                        : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedStartDate}
                      onSelect={setExpectedStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Fin previsto del trabajo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedEndDate
                        ? format(expectedEndDate, "PPP", { locale: es })
                        : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedEndDate}
                      onSelect={setExpectedEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Sección: Notas */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Notas</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="notes">Notas (visibles para el proveedor)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información sobre el trabajo a realizar..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="internal_notes">Notas internas</Label>
                <Textarea
                  id="internal_notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas internas (no visibles para el proveedor)..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/nexo-av/${userId}/purchase-orders`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear y añadir líneas
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPurchaseOrderPage;
