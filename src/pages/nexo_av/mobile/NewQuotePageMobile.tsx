import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FormLineEditorMobile from "../components/mobile/FormLineEditorMobile";
import MobileTotalsFooter from "../components/mobile/MobileTotalsFooter";

interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface QuoteLine {
  id?: string;
  tempId?: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

const NewQuotePageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  
  // Line editor state
  const [editingLine, setEditingLine] = useState<QuoteLine | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Calcular totales
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase.rpc("list_clients", {
        p_search: null,
      });
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Get clientId from URL if provided
      const clientIdFromUrl = searchParams.get("clientId");
      if (clientIdFromUrl) {
        setSelectedClientId(clientIdFromUrl);
        
        // Fetch projects for this client
        const { data: projectsData, error: projectsError } = await supabase.rpc(
          "list_projects",
          { p_search: null }
        );
        if (!projectsError && projectsData) {
          const clientProjects = projectsData.filter(
            (p: Project) => (p as any).client_id === clientIdFromUrl
          );
          setProjects(clientProjects);
        }
      }

      // Set default valid until date (30 days from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      setValidUntil(futureDate.toISOString().split("T")[0]);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos iniciales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    
    // Fetch projects for selected client
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (!error && data) {
        const clientProjects = data.filter((p: any) => p.client_id === clientId);
        setProjects(clientProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleAddLine = () => {
    setEditingLine(null);
    setEditorOpen(true);
  };

  const handleEditLine = (line: QuoteLine) => {
    setEditingLine(line);
    setEditorOpen(true);
  };

  const handleSaveLine = (line: QuoteLine) => {
    if (editingLine) {
      // Update existing line
      setLines(prev =>
        prev.map(l => (l.tempId === editingLine.tempId ? { ...line, tempId: editingLine.tempId } : l))
      );
    } else {
      // Add new line
      setLines(prev => [...prev, { ...line, tempId: `temp-${Date.now()}` }]);
    }
  };

  const handleDeleteLine = (lineToDelete: QuoteLine) => {
    setLines(prev => prev.filter(l => l.tempId !== lineToDelete.tempId));
    toast({
      title: "Línea eliminada",
      description: "La línea se ha eliminado del presupuesto",
    });
  };

  const handleSave = async () => {
    // Validation
    if (!selectedClientId) {
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (lines.length === 0) {
      toast({
        title: "Sin líneas",
        description: "Debes agregar al menos una línea",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create quote
      const { data: quoteData, error: quoteError } = await supabase.rpc("create_quote", {
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_valid_until: validUntil || null,
        p_notes: null,
      });

      if (quoteError) throw quoteError;

      const quoteId = Array.isArray(quoteData) ? quoteData[0].id : quoteData.id;

      // Create quote lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const { error: lineError } = await supabase.rpc("add_quote_line", {
          p_quote_id: quoteId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_line_order: i,
        });

        if (lineError) throw lineError;
      }

      toast({
        title: "Presupuesto creado",
        description: `Se ha creado el presupuesto correctamente`,
      });

      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el presupuesto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[240px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg">Nuevo Presupuesto</h1>
          <p className="text-sm text-muted-foreground">Completa los campos</p>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-4 py-4 space-y-6">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client">
            Cliente <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Selection */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="project">Proyecto (opcional)</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin proyecto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_number} - {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Valid Until */}
        <div className="space-y-2">
          <Label htmlFor="valid_until">Válido hasta</Label>
          <Input
            id="valid_until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Lines Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Líneas del presupuesto</Label>
            <Button
              onClick={handleAddLine}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No hay líneas agregadas</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pulsa "Añadir" para crear una línea
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.tempId}
                  className="border rounded-lg p-3 bg-card"
                  onClick={() => handleEditLine(line)}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate">{line.concept}</p>
                      {line.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {line.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLine(line);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {line.quantity} × {line.unit_price.toFixed(2)} €
                    </span>
                    <span className="font-semibold">
                      {line.total.toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line Editor */}
      <FormLineEditorMobile
        line={editingLine}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveLine}
        type="quote"
      />

      {/* Totals Footer */}
      <MobileTotalsFooter
        subtotal={subtotal}
        taxAmount={taxAmount}
        total={total}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Crear Presupuesto"
        disabled={!selectedClientId || lines.length === 0}
      />
    </div>
  );
};

export default NewQuotePageMobile;
