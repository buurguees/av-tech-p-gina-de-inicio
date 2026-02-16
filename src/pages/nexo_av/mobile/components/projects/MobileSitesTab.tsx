/**
 * MobileSitesTab - Gestión de sitios de instalación (mobile)
 * Vista read + create para sites dentro de un proyecto
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Plus, Star, Loader2, ChevronRight, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProjectSite {
  id: string;
  site_name: string;
  site_reference: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  floor_area: string | null;
  is_default: boolean;
  is_active: boolean;
  site_status?: string;
}

interface MobileSitesTabProps {
  projectId: string;
  siteMode?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planificado",
  SCHEDULED: "Programado",
  IN_PROGRESS: "En ejecución",
  READY_TO_INVOICE: "Listo p/ facturar",
  INVOICED: "Facturado",
  CLOSED: "Cerrado",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-500/15 text-blue-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400",
  READY_TO_INVOICE: "bg-emerald-500/15 text-emerald-400",
  INVOICED: "bg-violet-500/15 text-violet-400",
  CLOSED: "bg-muted text-muted-foreground",
};

const MobileSitesTab = ({ projectId, siteMode }: MobileSitesTabProps) => {
  const { toast } = useToast();
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formCountry, setFormCountry] = useState("España");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formFloorArea, setFormFloorArea] = useState("");

  useEffect(() => {
    fetchSites();
  }, [projectId]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      setSites((data || []) as ProjectSite[]);
    } catch (error) {
      console.error("Error fetching sites:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormRef(""); setFormAddress(""); setFormCity("");
    setFormPostalCode(""); setFormProvince(""); setFormCountry("España");
    setFormContactName(""); setFormContactPhone(""); setFormNotes(""); setFormFloorArea("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre del sitio es obligatorio", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const sanitize = (v: string) => v.trim() || null;
      const { error } = await supabase.rpc("create_project_site", {
        p_project_id: projectId,
        p_site_name: formName.trim(),
        p_site_reference: sanitize(formRef),
        p_address: sanitize(formAddress),
        p_city: sanitize(formCity),
        p_postal_code: sanitize(formPostalCode),
        p_province: sanitize(formProvince),
        p_country: sanitize(formCountry),
        p_contact_name: sanitize(formContactName),
        p_contact_phone: sanitize(formContactPhone),
        p_notes: sanitize(formNotes),
        p_floor_area: sanitize(formFloorArea),
      });
      if (error) throw error;
      toast({ title: "Sitio creado" });
      setShowCreateForm(false);
      resetForm();
      fetchSites();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (siteId: string) => {
    try {
      const { error } = await supabase.rpc("set_default_project_site", {
        p_project_id: projectId,
        p_site_id: siteId,
      });
      if (error) throw error;
      toast({ title: "Sitio principal actualizado" });
      fetchSites();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeSites = sites.filter(s => s.is_active);
  const archivedSites = sites.filter(s => !s.is_active);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {siteMode === "MULTI_SITE"
              ? `${activeSites.length} sitios activos`
              : "Sitio principal"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={cn(
            "h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-medium",
            "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
            "text-white/90 hover:text-white hover:bg-white/15",
            "active:scale-95 transition-all duration-200",
          )}
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo sitio
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Nuevo sitio</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Tienda Centro" className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Referencia</Label>
              <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="Código" className="bg-card border-border" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dirección</Label>
            <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Calle y número" className="bg-card border-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ciudad</Label>
              <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">C.P.</Label>
              <Input value={formPostalCode} onChange={(e) => setFormPostalCode(e.target.value)} className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provincia</Label>
              <Input value={formProvince} onChange={(e) => setFormProvince(e.target.value)} className="bg-card border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Contacto</Label>
              <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="Nombre" className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Teléfono</Label>
              <Input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} className="bg-card border-border" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Superficie</Label>
            <Input value={formFloorArea} onChange={(e) => setFormFloorArea(e.target.value)} placeholder="Ej: 120 m²" className="bg-card border-border" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Notas..." className="bg-card border-border resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowCreateForm(false); resetForm(); }}
              className={cn(
                "flex-1 h-10 rounded-full text-sm font-medium",
                "bg-muted text-muted-foreground",
                "active:scale-95 transition-all"
              )}
              style={{ touchAction: 'manipulation' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className={cn(
                "flex-1 h-10 rounded-full text-sm font-medium",
                "bg-primary text-primary-foreground",
                "active:scale-95 transition-all",
                "disabled:opacity-50"
              )}
              style={{ touchAction: 'manipulation' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Crear sitio"}
            </button>
          </div>
        </div>
      )}

      {/* Active sites */}
      {activeSites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-white/5 rounded-full mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No hay sitios configurados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeSites.map((site) => (
            <div
              key={site.id}
              className={cn(
                "bg-card border border-border rounded-xl p-3",
                "active:scale-[0.98] transition-all duration-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-foreground truncate">{site.site_name}</h4>
                      {site.is_default && (
                        <Badge className="bg-primary/10 text-primary border-0 text-[9px] px-1 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Principal
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {site.city && <span className="text-[11px] text-muted-foreground">{site.city}</span>}
                      {site.site_status && (
                        <Badge className={cn(STATUS_COLORS[site.site_status] || "bg-muted text-muted-foreground", "border-0 text-[9px] px-1 py-0")}>
                          {STATUS_LABELS[site.site_status] || site.site_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {!site.is_default && (
                  <button
                    onClick={() => handleSetDefault(site.id)}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    title="Hacer principal"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Details */}
              <div className="mt-2 pl-6 space-y-0.5 text-[11px] text-muted-foreground">
                {site.address && <p>{site.address}</p>}
                {(site.postal_code || site.province) && (
                  <p>{[site.postal_code, site.province].filter(Boolean).join(", ")}</p>
                )}
                {site.site_reference && <p>Ref: {site.site_reference}</p>}
                {site.contact_name && (
                  <p>
                    Contacto: {site.contact_name}
                    {site.contact_phone ? ` · ${site.contact_phone}` : ""}
                  </p>
                )}
                {site.floor_area && <p>Superficie: {site.floor_area}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archivedSites.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Archivados ({archivedSites.length})</p>
          <div className="space-y-1">
            {archivedSites.map((site) => (
              <div key={site.id} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{site.site_name}</span>
                {site.city && <span>— {site.city}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSitesTab;
