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
      
      // Pre-select from URL params
      const urlClientId = searchParams.get('clientId') || clientId;
      if (urlClientId) {
        setSelectedClientId(urlClientId);
        await fetchProjects(urlClientId);
      }
      
      // Check for source quote
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
      // Filter projects by client
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

  // Client/Project options for select
  const clientOptions = clients.map(c => ({ value: c.id, label: `${c.client_number} - ${c.company_name}` }));
  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.project_number} - ${p.project_name}` }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.25rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {sourceQuoteNumber ? "Nueva versión" : "Nuevo presupuesto"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {sourceQuoteNumber
                  ? `Basado en ${sourceQuoteNumber}`
                  : "El número se asignará automáticamente al guardar"}
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>

          {/* Document Info Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/30 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Datos del documento</span>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Client */}
                <div className="lg:col-span-2">
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
                    leftIcon={<Building2 className="w-4 h-4" />}
                    required
                    size="md"
                  />
                </div>

                {/* Project */}
                <div className="lg:col-span-2">
                  <TextInput
                    type="select"
                    label="Proyecto"
                    placeholder={selectedClientId ? "Seleccionar proyecto..." : "Primero selecciona cliente"}
                    value={selectedProjectId}
                    onChange={(value: string) => setSelectedProjectId(value)}
                    options={projectOptions}
                    leftIcon={<FolderKanban className="w-4 h-4" />}
                    disabled={!selectedClientId || projects.length === 0}
                    size="md"
                  />
                </div>

                {/* Date */}
                <div>
                  <TextInput
                    type="date"
                    label="Fecha"
                    value={new Date().toISOString().split("T")[0]}
                    disabled
                    leftIcon={<Calendar className="w-4 h-4" />}
                    size="md"
                  />
                </div>

                {/* Valid Until */}
                <div>
                  <TextInput
                    type="date"
                    label="Válido hasta"
                    value={validUntil}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValidUntil(e.target.value)}
                    disabled
                    helperText="Auto: +30 días"
                    leftIcon={<Calendar className="w-4 h-4" />}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>

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
