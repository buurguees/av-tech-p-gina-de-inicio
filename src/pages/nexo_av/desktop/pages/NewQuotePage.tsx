import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Save, Loader2, FileText, Calendar, Building2, FolderKanban } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import TextInput from "../components/common/TextInput";
import {
  DocumentLinesEditor,
  DocumentTotals,
  type DocumentLine,
  type TaxOption,
} from "../components/documents";

interface Client {
  id: string;
  company_name: string;
  client_number: string;
}

interface Project {
  id: string;
  project_name: string;
  project_number: string;
}

const NewQuotePage = () => {
  const navigate = useNavigate();
  const { userId, clientId } = useParams<{ userId: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClients(), fetchSaleTaxes()]);
      
      const urlClientId = searchParams.get('clientId') || clientId;
      if (urlClientId) {
        setSelectedClientId(urlClientId);
        await fetchProjects(urlClientId);
      }
      
      const sourceQuoteId = searchParams.get('sourceQuoteId');
      if (sourceQuoteId) {
        await loadSourceQuoteData(sourceQuoteId);
      }
      
      setLoading(false);
    };
    init();
  }, [clientId, searchParams]);

  // Load projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId]);

  // Pre-select project from URL
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId && projects.length > 0) {
      const exists = projects.find(p => p.id === urlProjectId);
      if (exists) setSelectedProjectId(urlProjectId);
    }
  }, [projects, searchParams]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", {});
      if (error) throw error;
      setClients((data || []).map((c: any) => ({
        id: c.id,
        company_name: c.company_name,
        client_number: c.client_number,
      })));
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProjects = async (clientId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: "" });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_name: p.project_name,
        project_number: p.project_number,
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;
      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({ value: t.rate, label: t.name }));
      setTaxOptions(options);
      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      setDefaultTaxRate(defaultTax?.rate ?? options[0]?.value ?? 21);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const loadSourceQuoteData = async (sourceQuoteId: string) => {
    try {
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", { p_quote_id: sourceQuoteId });
      if (quoteError) throw quoteError;
      if (!quoteData?.[0]) throw new Error("Presupuesto no encontrado");

      const quote = quoteData[0];
      setSourceQuoteNumber(quote.quote_number);
      setSelectedClientId(quote.client_id);
      if (quote.project_id) setSelectedProjectId(quote.project_id);

      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", { p_quote_id: sourceQuoteId });
      if (linesError) throw linesError;

      setLines((linesData || []).map((line: any, index: number) => ({
        tempId: crypto.randomUUID(),
        concept: line.concept,
        description: line.description || "",
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent,
        subtotal: line.subtotal,
        tax_amount: line.tax_amount,
        total: line.total,
        group_name: line.group_name || null,
        line_order: index + 1,
      })));

      toast({ title: "Datos importados", description: `Datos cargados de ${quote.quote_number}` });
    } catch (error: any) {
      console.error("Error loading source quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 30);
      const calculatedValidUntil = validDate.toISOString().split("T")[0];

      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { data: quoteData, error: quoteError } = await supabase.rpc("create_quote_with_number", {
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: calculatedValidUntil,
        p_project_id: selectedProjectId || null,
      });

      if (quoteError) throw quoteError;
      if (!quoteData?.[0]) throw new Error("No se pudo crear el presupuesto");

      const quoteId = quoteData[0].quote_id;
      const lineIds: string[] = [];

      for (const line of lines) {
        if (line.concept.trim()) {
          const { data: lineIdData, error: lineError } = await supabase.rpc("add_quote_line", {
            p_quote_id: quoteId,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
            p_group_name: line.group_name || null,
            p_line_order: line.line_order || null,
          });
          if (lineError) throw lineError;
          const lineId = typeof lineIdData === 'string' ? lineIdData : lineIdData?.[0] || lineIdData;
          if (lineId) lineIds.push(lineId);
        }
      }

      if (lineIds.length > 0) {
        await supabase.rpc("update_quote_lines_order", { p_quote_id: quoteId, p_line_ids: lineIds });
      }

      toast({ title: "Presupuesto creado", description: `${quoteData[0].quote_number} guardado` });
      navigate(`/nexo-av/${userId}/quotes`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Options for selects
  const clientOptions = clients.map(c => ({ value: c.id, label: `${c.client_number} - ${c.company_name}` }));
  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.project_number} - ${p.project_name}` }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.25rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.25rem)] overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Header */}
          <header className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {sourceQuoteNumber ? "Nueva versión" : "Nuevo presupuesto"}
              </h1>
              <p className="text-base text-muted-foreground">
                {sourceQuoteNumber
                  ? `Creando nueva versión basada en ${sourceQuoteNumber}`
                  : "El número se asignará automáticamente al guardar el documento"}
              </p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              size="lg"
              className="h-12 px-6 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Guardar presupuesto
            </Button>
          </header>

          {/* Document Info Card */}
          <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Información del documento</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Row 1: Client and Project */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TextInput
                  type="select"
                  label="Cliente"
                  placeholder="Seleccionar cliente..."
                  value={selectedClientId}
                  onChange={(value: string) => {
                    setSelectedClientId(value);
                    setSelectedProjectId("");
                  }}
                  options={clientOptions}
                  leftIcon={<Building2 />}
                  required
                  size="lg"
                  variant="filled"
                />

                <TextInput
                  type="select"
                  label="Proyecto"
                  placeholder={selectedClientId ? "Seleccionar proyecto..." : "Primero selecciona un cliente"}
                  value={selectedProjectId}
                  onChange={(value: string) => setSelectedProjectId(value)}
                  options={projectOptions}
                  leftIcon={<FolderKanban />}
                  disabled={!selectedClientId || projects.length === 0}
                  size="lg"
                  variant="filled"
                />
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <TextInput
                  type="date"
                  label="Fecha de emisión"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  leftIcon={<Calendar />}
                  size="md"
                  variant="filled"
                  helperText="Fecha actual"
                />

                <TextInput
                  type="date"
                  label="Válido hasta"
                  value={validUntil}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValidUntil(e.target.value)}
                  disabled
                  leftIcon={<Calendar />}
                  size="md"
                  variant="filled"
                  helperText="Automático: +30 días"
                />
              </div>
            </div>
          </section>

          {/* Lines Editor */}
          <DocumentLinesEditor
            lines={lines}
            onLinesChange={setLines}
            taxOptions={taxOptions}
            defaultTaxRate={defaultTaxRate}
            showDescription={true}
            showLineNumbers={true}
            title="Líneas del presupuesto"
          />

          {/* Totals */}
          <div className="flex justify-end">
            <DocumentTotals lines={lines} taxOptions={taxOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewQuotePage;
