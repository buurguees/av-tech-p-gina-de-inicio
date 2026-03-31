import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ChevronLeft,
  Save,
  FileText,
  AlertCircle,
  MapPin,
  Euro,
  CalendarDays,
  Tag,
  CheckCircle2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ScannedDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  status: string;
  created_at: string;
  suggested_project_id: string | null;
  suggested_site_id: string | null;
  suggested_project_name: string | null;
}

interface Project {
  id: string;
  project_name: string;
  project_number: string;
  site_mode?: string | null;
}

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}

const EXPENSE_CATEGORIES = [
  { value: "FUEL", label: "Combustible" },
  { value: "MEALS", label: "Comidas" },
  { value: "TOLLS", label: "Peajes" },
  { value: "PARKING", label: "Parking" },
  { value: "MATERIALS", label: "Materiales" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "OTHER", label: "Otros" },
] as const;

const TAX_RATES = [
  { value: "0",  label: "0%",  hint: "Exento" },
  { value: "4",  label: "4%",  hint: "Superred." },
  { value: "10", label: "10%", hint: "Reducido" },
  { value: "21", label: "21%", hint: "General" },
] as const;

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

// File preview component
const FilePreview = ({ filePath }: { filePath: string }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedPath = filePath.trim().replace(/^\//, '');
  const isPdf = normalizedPath.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(normalizedPath);

  useEffect(() => {
    if (!normalizedPath) {
      setError(true);
      setErrorMessage('Ruta del documento vacía');
      setLoading(false);
      return;
    }
    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError(false);
        setErrorMessage(null);
        const { data, error: err } = await supabase.storage
          .from('purchase-documents')
          .createSignedUrl(normalizedPath, 3600);
        if (err) {
          console.error('Storage createSignedUrl error:', err.message, { path: normalizedPath });
          setErrorMessage(err.message || 'Error al obtener el documento');
          setError(true);
          return;
        }
        const url = data?.signedUrl ?? null;
        if (!url) {
          setErrorMessage('No se pudo generar el enlace al documento');
          setError(true);
          return;
        }
        setFileUrl(url);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('Error getting signed URL:', msg, err);
        setErrorMessage(msg);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    getSignedUrl();
  }, [normalizedPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground p-4">
        <AlertCircle className="h-12 w-12 mb-2 opacity-30" />
        <p>Error al cargar el documento</p>
        {errorMessage && <p className="text-sm mt-1 opacity-80">{errorMessage}</p>}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col min-h-[300px]">
        <iframe
          src={fileUrl}
          className="w-full flex-1 rounded-lg border border-border"
          title="PDF Preview"
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px]">
        <img
          src={fileUrl}
          alt="Document preview"
          className="max-w-full max-h-[600px] rounded-lg border border-border object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
      <FileText className="h-12 w-12 mb-2 opacity-30" />
      <p>Tipo de archivo no soportado para preview</p>
    </div>
  );
};

const MobileScannerDetailPage = () => {
  const { userId, documentId } = useParams<{ userId: string; documentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<ScannedDocument | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSiteMode, setProjectSiteMode] = useState<string | null>(null);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);

  // Project/site selection (existing)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // New: quick expense fields
  const [docType, setDocType] = useState<"TICKET" | "INVOICE">("TICKET");
  const [expenseCategory, setExpenseCategory] = useState<string>("");
  const [concept, setConcept] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(todayIso());
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("21");

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("scanned_documents")
        .select("*")
        .eq("id", documentId)
        .single();
      if (error) throw error;
      setDocument(data as ScannedDocument);
      if (data.suggested_project_id) setSelectedProjectId(data.suggested_project_id);
      if (data.suggested_site_id) setSelectedSiteId(data.suggested_site_id);
    } catch (error: unknown) {
      console.error("Error fetching document:", error);
      toast({ title: "Error", description: "No se pudo cargar el documento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_projects', { p_search: null });
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
    fetchProjects();
  }, [fetchDocument, fetchProjects]);

  useEffect(() => {
    const fetchProjectSites = async () => {
      if (!selectedProjectId) {
        setProjectSiteMode(null);
        setProjectSites([]);
        setSelectedSiteId("");
        return;
      }
      try {
        const { data: projectData, error: projectError } = await supabase.rpc("get_project", { p_project_id: selectedProjectId });
        if (projectError) throw projectError;
        const siteMode = projectData?.[0]?.site_mode || null;
        setProjectSiteMode(siteMode);

        const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: selectedProjectId });
        if (error) throw error;

        const sites: ProjectSite[] = (data || [])
          .filter((s: any) => s.is_active)
          .map((s: any) => ({ id: s.id, site_name: s.site_name, city: s.city, is_default: s.is_default }));
        setProjectSites(sites);

        if (siteMode === "SINGLE_SITE" && sites.length > 0) {
          const defaultSite = sites.find((site) => site.is_default) || sites[0];
          setSelectedSiteId(defaultSite.id);
        } else if (!sites.some((site) => site.id === selectedSiteId)) {
          setSelectedSiteId("");
        }
      } catch (error) {
        console.error("Error fetching project sites:", error);
        setProjectSiteMode(null);
        setProjectSites([]);
        setSelectedSiteId("");
      }
    };
    void fetchProjectSites();
  }, [selectedProjectId]);

  // Obligatorio: fecha + importe + categoría. Proyecto y concepto son opcionales.
  const canCreateDraft = !!(issueDate && totalAmount && parseFloat(totalAmount) > 0 && expenseCategory);

  const handleSave = async () => {
    if (!document || !documentId) return;

    if (!document.file_path?.trim()) {
      toast({ title: "Documento sin archivo", description: "Este documento no tiene archivo asociado.", variant: "destructive" });
      return;
    }
    if (selectedProjectId && projectSiteMode === "MULTI_SITE" && !selectedSiteId) {
      toast({ title: "Sitio obligatorio", description: "Selecciona un sitio para este proyecto multi-sitio.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // --- PATH A: crear borrador de gasto directamente ---
      if (canCreateDraft) {
        const totalWithIva = parseFloat(totalAmount);
        const rate = parseFloat(taxRate);
        // El RPC espera precio base (sin IVA). Calculamos desde el total con IVA.
        const basePrice = rate > 0 ? totalWithIva / (1 + rate / 100) : totalWithIva;
        const categoryLabel = EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.label ?? "Ticket";
        const lineConcept = concept.trim() || categoryLabel;

        // 1. Obtener número de borrador
        const { data: ticketNumber, error: numErr } = await (supabase.rpc as any)(
          docType === "TICKET" ? "get_next_ticket_number" : "get_next_factura_borr_number"
        );
        if (numErr) throw numErr;

        // 2. Crear el gasto/factura borrador
        const { data: invoiceId, error: invoiceErr } = await (supabase.rpc as any)(
          "create_purchase_invoice",
          {
            p_invoice_number: ticketNumber,
            p_document_type: docType === "TICKET" ? "EXPENSE" : "INVOICE",
            p_status: "PENDING_VALIDATION",
            p_project_id: selectedProjectId || null,
            p_site_id: selectedSiteId || null,
            p_expense_category: expenseCategory || null,
            p_issue_date: issueDate,
            // Para TICKET el concepto va a manual_beneficiary_name (ver paso 2b).
            // Para INVOICE lo usamos como nota descriptiva.
            p_notes: docType === "INVOICE" ? (concept.trim() || null) : null,
            p_file_path: document.file_path,
            p_file_name: document.file_name,
          }
        );
        if (invoiceErr) throw invoiceErr;

        // 2b. Para tickets, guardar el comercio/establecimiento en el campo correcto
        if (docType === "TICKET" && concept.trim()) {
          const { error: beneficiaryErr } = await (supabase.rpc as any)("update_purchase_invoice", {
            p_invoice_id: invoiceId,
            p_manual_beneficiary_name: concept.trim(),
          });
          if (beneficiaryErr) {
            console.warn("No se pudo guardar el comercio/establecimiento:", beneficiaryErr);
          }
        }

        // 3. Añadir línea con precio base calculado e IVA seleccionado
        await supabase.rpc("add_purchase_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: lineConcept,
          p_quantity: 1,
          p_unit_price: Math.round(basePrice * 10000) / 10000, // 4 decimales
          p_tax_rate: rate,
          p_withholding_tax_rate: 0,
          p_discount_percent: 0,
        });

        // 4. Marcar documento como ASIGNADO
        await supabase
          .from("scanned_documents")
          .update({
            status: "ASSIGNED",
            assigned_to_type: docType === "TICKET" ? "EXPENSE" : "PURCHASE_INVOICE",
            assigned_to_id: invoiceId,
          } as any)
          .eq("id", documentId);

        toast({
          title: docType === "TICKET" ? "Ticket guardado" : "Factura guardada",
          description: `${ticketNumber} — listo para revisar desde el ordenador.`,
        });

      // --- PATH B: guardar datos parciales para que desktop pueda completar ---
      } else {
        const foundProject = projects.find((p) => p.id === selectedProjectId);
        const suggestedProjectName = foundProject
          ? `${foundProject.project_name} (${foundProject.project_number})`
          : null;

        // Construir resumen legible de lo que el usuario rellenó en mobile
        const metaParts: string[] = [];
        if (docType === "INVOICE") metaParts.push("📄 Factura");
        else metaParts.push("🧾 Ticket");
        if (concept.trim()) metaParts.push(concept.trim());
        if (expenseCategory) {
          const catLabel = EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.label;
          if (catLabel) metaParts.push(catLabel);
        }
        if (issueDate) metaParts.push(issueDate);
        if (totalAmount && parseFloat(totalAmount) > 0) {
          const ivaLabel = taxRate !== "0" ? ` (IVA ${taxRate}%)` : " (exento)";
          metaParts.push(`${parseFloat(totalAmount).toFixed(2)}€${ivaLabel}`);
        }
        const notesValue = metaParts.length > 1 ? metaParts.join(" · ") : null;

        const { error: updateError } = await supabase
          .from("scanned_documents")
          .update({
            suggested_project_id: selectedProjectId || null,
            suggested_site_id: selectedSiteId || null,
            suggested_project_name: suggestedProjectName,
            notes: notesValue,
          } as any)
          .eq("id", documentId);

        if (updateError) throw updateError;

        toast({
          title: "Datos guardados",
          description: "El documento queda pendiente. Añade el importe desde el ordenador para finalizar.",
        });
      }

      navigate(`/nexo-av/${userId}/scanner`);
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast({ title: "Error", description: error.message || "No se pudo guardar el documento", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // --- Loading / error states ---

  if (loading) {
    return (
      <div className="mobile-page-viewport">
        <div className="flex-shrink-0 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/nexo-av/${userId}/scanner`)} className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="mobile-page-viewport">
        <div className="flex-shrink-0 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/nexo-av/${userId}/scanner`)} className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-base font-semibold">Documento no encontrado</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">El documento no existe</p>
          </div>
        </div>
      </div>
    );
  }

  const isAssigned = document.status === "ASSIGNED";

  // Permitir guardar si tenemos los datos mínimos (fecha + importe), o si hay proyecto seleccionado como fallback
  const canSave = canCreateDraft || !!selectedProjectId;

  return (
    <div className="mobile-page-viewport">
      {/* Header */}
      <div className="flex-shrink-0 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/nexo-av/${userId}/scanner`)} className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{document.file_name}</h2>
          </div>
          {!isAssigned && (
            <button
              onClick={handleSave}
              disabled={saving || !document.file_path?.trim() || !canSave}
              className={cn(
                "h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full shrink-0",
                "text-sm font-medium leading-none",
                canCreateDraft
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground",
                "active:scale-95 transition-all duration-200 shadow-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ touchAction: 'manipulation' }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : canCreateDraft ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden min-[400px]:inline">Crear gasto</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden min-[400px]:inline">Guardar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content — mobile-scroll-area para scroll limpio sin colisiones */}
      <div className="mobile-scroll-area px-0">
        {/* Preview compacto */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ maxHeight: '200px' }}>
            <FilePreview filePath={document.file_path} />
          </div>
        </div>

        {/* Estado: ya asignado */}
        {isAssigned && (
          <div className="mx-4 mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-medium text-emerald-600">Documento procesado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Este documento ya ha sido asignado.</p>
          </div>
        )}

        {!isAssigned && (
          <>
            {/* ── Tipo de documento ───────────────── */}
            <div className="px-4 pt-4 pb-1">
              <div className="flex gap-2">
                {(["TICKET", "INVOICE"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDocType(type)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      docType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    )}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {type === "TICKET" ? "🧾 Ticket / Gasto" : "📄 Factura"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Obligatorio ─────────────────────── */}
            <div className="px-4 pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Obligatorio
              </p>
              <div className="space-y-3">

                {/* Categoría */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Categoría *
                  </Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Fecha *
                  </Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                {/* Importe + IVA en fila */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Euro className="h-3.5 w-3.5" />
                      Importe total *
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0,00"
                      className="bg-card border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      IVA *
                    </Label>
                    <div className="grid grid-cols-2 gap-1">
                      {TAX_RATES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTaxRate(t.value)}
                          className={cn(
                            "py-2 rounded-lg text-xs font-semibold border transition-all",
                            taxRate === t.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border"
                          )}
                          style={{ touchAction: 'manipulation' }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumen base / IVA / total */}
                {totalAmount && parseFloat(totalAmount) > 0 && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground gap-2">
                    {(() => {
                      const total = parseFloat(totalAmount);
                      const rate = parseFloat(taxRate);
                      const base = rate > 0 ? total / (1 + rate / 100) : total;
                      const ivaAmt = total - base;
                      return (
                        <>
                          <span>Base <strong className="text-foreground">{base.toFixed(2)}€</strong></span>
                          <span className="text-border">·</span>
                          <span>IVA <strong className="text-foreground">{ivaAmt.toFixed(2)}€</strong></span>
                          <span className="text-border">·</span>
                          <span>Total <strong className="text-foreground">{total.toFixed(2)}€</strong></span>
                        </>
                      );
                    })()}
                  </div>
                )}

              </div>
            </div>

            {/* Indicador de estado */}
            <div className="px-4 pt-3">
              {canCreateDraft ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium">
                    ✓ Listo para guardar. Se creará el borrador para revisar desde el ordenador.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Rellena <strong>categoría</strong>, <strong>fecha</strong> e <strong>importe</strong> para guardar.
                  </p>
                </div>
              )}
            </div>

            {/* ── Opcional ────────────────────────── */}
            <div className="px-4 pt-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Opcional
              </p>
              <div className="space-y-3">

                {/* Concepto / Comercio */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {docType === "TICKET" ? "Comercio / Establecimiento" : "Concepto"}
                  </Label>
                  <Input
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder={docType === "TICKET" ? "Repsol, McDonald's, Leroy Merlin..." : "Descripción breve..."}
                    className="bg-card border-border"
                  />
                </div>

                {/* Proyecto */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Proyecto
                  </Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vincular a proyecto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay proyectos disponibles
                        </div>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name} ({project.project_number})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sitio multi-site */}
                {selectedProjectId && projectSiteMode === "MULTI_SITE" && projectSites.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Sitio
                    </Label>
                    <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar sitio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projectSites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.site_name}{site.city ? ` - ${site.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sitio single-site (solo lectura) */}
                {selectedProjectId && projectSiteMode === "SINGLE_SITE" && projectSites.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Sitio
                    </Label>
                    <div className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-card">
                      {projectSites[0]?.site_name}{projectSites[0]?.city ? ` - ${projectSites[0].city}` : ""}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Respiro final */}
            <div className="h-6" />
          </>
        )}
      </div>
    </div>
  );
};

export default MobileScannerDetailPage;
