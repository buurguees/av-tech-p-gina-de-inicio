import { useState, useEffect, useCallback } from "react";
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
import { Save, Loader2, FileText, MapPin } from "lucide-react";
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

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}

interface ProjectWithSite extends Project {
  site_mode?: string;
  default_site_id?: string;
}

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectWithSite[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
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

  // Load sites when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchSites(selectedProjectId);
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId]);

  const fetchSites = async (projectId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const sites: ProjectSite[] = (data || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({ id: s.id, site_name: s.site_name, city: s.city, is_default: s.is_default }));
      setProjectSites(sites);
      // Auto-select for SINGLE_SITE
      const proj = projects.find(p => p.id === projectId);
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const defaultSite = sites.find(s => s.is_default) || sites[0];
        setSelectedSiteId(defaultSite.id);
      } else {
        setSelectedSiteId("");
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
      setProjectSites([]);
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
      if (defaultTax) setDefaultTaxRate(defaultTax.rate);
      else if (options.length > 0) setDefaultTaxRate(options[0].value);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const handleProjectsLoaded = useCallback((loadedProjects: Project[]) => {
    // Enrich with site_mode by fetching project details
    const enrichProjects = async () => {
      const enriched: ProjectWithSite[] = [];
      for (const p of loadedProjects) {
        try {
          const { data } = await supabase.rpc("get_project", { p_project_id: p.id });
          if (data?.[0]) {
            enriched.push({
              ...p,
              site_mode: data[0].site_mode || undefined,
              default_site_id: data[0].default_site_id || undefined,
            });
          } else {
            enriched.push(p);
          }
        } catch {
          enriched.push(p);
        }
      }
      setProjects(enriched);
    };
    enrichProjects();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const showSiteSelector = selectedProject?.site_mode === "MULTI_SITE" && projectSites.length > 0;

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    if (selectedProject?.site_mode === "MULTI_SITE" && !selectedSiteId) {
      toast({ title: "Error", description: "Selecciona un sitio para este proyecto multi-sitio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_invoice_with_number",
        {
          p_client_id: selectedClientId,
          p_project_id: selectedProjectId || null,
          p_project_name: selectedProject?.project_name || null,
          p_issue_date: issueDate,
          p_due_date: dueDate,
          p_site_id: selectedSiteId || null,
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
      toast({ title: "Error", description: error.message || "No se pudo guardar la factura", variant: "destructive" });
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
            <Button onClick={handleSave} disabled={saving} className="document-save-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Guardar</span>
            </Button>
          </div>

          {/* Document Info Card */}
          <div className="document-info-card">
            <div className="document-info-header">
              <div className="icon-wrapper"><FileText /></div>
              <span>Datos de la factura</span>
            </div>
            <div className="document-info-grid">
              {/* Client & Project Selector */}
              <div className="col-span-2">
                <ClientProjectSelector
                  selectedClientId={selectedClientId}
                  selectedProjectId={selectedProjectId}
                  onClientChange={(id) => {
                    setSelectedClientId(id);
                    setSelectedProjectId("");
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                  onProjectChange={setSelectedProjectId}
                  onProjectsLoaded={handleProjectsLoaded}
                />
              </div>

              {/* Site Selector - only for MULTI_SITE */}
              {showSiteSelector && (
                <div className="col-span-2">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Sitio de instalación *
                  </Label>
                  <Select value={selectedSiteId || undefined} onValueChange={setSelectedSiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sitio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}{s.city ? ` — ${s.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Site info for SINGLE_SITE */}
              {selectedProject?.site_mode === "SINGLE_SITE" && projectSites.length > 0 && (
                <div className="col-span-2">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Sitio
                  </Label>
                  <div className="text-sm font-medium text-foreground px-3 py-2 bg-muted/30 rounded-md border border-border">
                    {projectSites[0]?.site_name}{projectSites[0]?.city ? ` — ${projectSites[0].city}` : ""}
                  </div>
                </div>
              )}

              {/* Date Fields */}
              <div className="document-info-field">
                <Label className="text-muted-foreground text-xs">Fecha emisión</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="document-info-field">
                <Label className="text-muted-foreground text-xs">Vencimiento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
            <DocumentTotals lines={lines} taxOptions={taxOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewInvoicePage;
