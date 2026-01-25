import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText } from "lucide-react";
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

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  // Initialize from URL params and fetch taxes
  useEffect(() => {
    fetchSaleTaxes();

    // Pre-select client from URL params
    const urlClientId = searchParams.get('clientId');
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }
  }, [searchParams]);

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
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_invoice_with_number",
        {
          p_client_id: selectedClientId,
          p_project_id: selectedProjectId || null,
          p_project_name: selectedProject?.project_name || null,
          p_issue_date: issueDate,
          p_due_date: dueDate,
        }
      );

      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = invoiceData[0].invoice_id;

      for (const line of lines) {
        if (line.concept.trim()) {
          const { error: lineError } = await supabase.rpc("add_invoice_line", {
            p_invoice_id: invoiceId,
            p_concept: line.concept,
            p_description: null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (lineError) throw lineError;
        }
      }

      toast({
        title: "Factura creada",
        description: `Factura ${invoiceData[0].invoice_number} guardada correctamente`,
      });

      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la factura",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
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
              <h1 className="document-page-title">Nueva factura</h1>
              <p className="document-page-subtitle">
                El número se asignará automáticamente al guardar (F-YY-XXXXXX)
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
              <span>Datos de la factura</span>
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
                <Label className="text-muted-foreground text-xs">Fecha emisión</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="document-info-field">
                <Label className="text-muted-foreground text-xs">Vencimiento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
            showDescription={false}
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

export default NewInvoicePage;
