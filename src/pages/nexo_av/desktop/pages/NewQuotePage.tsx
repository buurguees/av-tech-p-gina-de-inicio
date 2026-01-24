import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import {
  ClientProjectSelector,
  DocumentLinesEditor,
  DocumentTotals,
  type DocumentLine,
  type TaxOption,
  type Project,
} from "../components/documents";

const NewQuotePage = () => {
  const navigate = useNavigate();
  const { userId, clientId } = useParams<{ userId: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);

  // Initialize from URL params and fetch taxes
  useEffect(() => {
    fetchSaleTaxes();

    // Pre-select client from URL params
    const urlClientId = searchParams.get('clientId') || clientId;
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }

    // Check if we're creating a new version from an existing quote
    const sourceQuoteId = searchParams.get('sourceQuoteId');
    if (sourceQuoteId) {
      loadSourceQuoteData(sourceQuoteId);
    }
  }, [clientId, searchParams]);

  // Pre-select project from URL params after projects are loaded
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId && projects.length > 0) {
      const exists = projects.find(p => p.id === urlProjectId);
      if (exists) {
        setSelectedProjectId(urlProjectId);
      }
    }
  }, [projects, searchParams]);

  const loadSourceQuoteData = async (sourceQuoteId: string) => {
    setLoading(true);
    try {
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: sourceQuoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");

      const quoteInfo = quoteData[0];
      setSourceQuoteNumber(quoteInfo.quote_number);
      setSelectedClientId(quoteInfo.client_id);

      if (quoteInfo.project_id) {
        setSelectedProjectId(quoteInfo.project_id);
      }

      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: sourceQuoteId,
      });
      if (linesError) throw linesError;

      const importedLines: DocumentLine[] = (linesData || []).map((line: any, index: number) => ({
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
      }));

      setLines(importedLines);

      toast({
        title: "Datos importados",
        description: `Se han cargado los datos del presupuesto ${quoteInfo.quote_number}`,
      });
    } catch (error: any) {
      console.error("Error loading source quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos del presupuesto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;

      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({
          value: t.rate,
          label: t.name,
        }));

      setTaxOptions(options);

      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      if (defaultTax) {
        setDefaultTaxRate(defaultTax.rate);
      } else if (options.length > 0) {
        setDefaultTaxRate(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const handleProjectsLoaded = useCallback((loadedProjects: Project[]) => {
    setProjects(loadedProjects);
  }, []);

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Selecciona un cliente",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const validUntilDate = new Date(today);
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      const calculatedValidUntil = validUntilDate.toISOString().split("T")[0];

      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { data: quoteData, error: quoteError } = await supabase.rpc(
        "create_quote_with_number",
        {
          p_client_id: selectedClientId,
          p_project_name: selectedProject?.project_name || null,
          p_valid_until: calculatedValidUntil,
          p_project_id: selectedProjectId || null,
        }
      );

      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("No se pudo crear el presupuesto");

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
            p_line_order: line.line_order || null
          });
          if (lineError) throw lineError;
          const lineId = typeof lineIdData === 'string' ? lineIdData : lineIdData?.[0] || lineIdData;
          if (lineId) lineIds.push(lineId);
        }
      }

      if (lineIds.length > 0) {
        const { error: orderError } = await supabase.rpc("update_quote_lines_order", {
          p_quote_id: quoteId,
          p_line_ids: lineIds,
        });
        if (orderError) throw orderError;
      }

      toast({
        title: "Presupuesto creado",
        description: `Presupuesto ${quoteData[0].quote_number} guardado correctamente`,
      });

      navigate(`/nexo-av/${userId}/quotes`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="document-page">
      <div className="document-page-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="document-page-header">
            <div>
              <h1 className="document-page-title">
                {sourceQuoteNumber ? "Nueva versión" : "Nuevo presupuesto"}
              </h1>
              <p className="document-page-subtitle">
                {sourceQuoteNumber
                  ? `Basado en ${sourceQuoteNumber}`
                  : "El número se asignará automáticamente al guardar"}
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="document-save-btn"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Guardar</span>
            </Button>
          </div>

          {/* Document Info Card */}
          <div className="document-info-card">
            <div className="document-info-header">
              <div className="icon-wrapper">
                <FileText />
              </div>
              <span>Datos del documento</span>
            </div>

            <div className="document-info-grid">
              {/* Client & Project Selector */}
              <div className="col-span-2">
                <ClientProjectSelector
                  selectedClientId={selectedClientId}
                  selectedProjectId={selectedProjectId}
                  onClientChange={setSelectedClientId}
                  onProjectChange={setSelectedProjectId}
                  onProjectsLoaded={handleProjectsLoaded}
                />
              </div>

              {/* Date Fields */}
              <div className="document-info-field">
                <Label className="text-muted-foreground text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  className="h-10 bg-muted/30 border-border/50 text-muted-foreground"
                />
              </div>

              <div className="document-info-field">
                <Label className="text-muted-foreground text-xs">
                  Vence
                  <span className="text-primary/70 text-[9px] ml-1">(auto: +30 días)</span>
                </Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled
                  className="h-10 bg-muted/30 border-border/50 text-muted-foreground"
                  title="En borrador, la fecha se calcula automáticamente como hoy + 30 días al guardar"
                />
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
            <DocumentTotals
              lines={lines}
              taxOptions={taxOptions}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewQuotePage;
