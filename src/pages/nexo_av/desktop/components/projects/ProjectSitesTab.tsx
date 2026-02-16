import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Pencil, Star, Archive, Loader2 } from "lucide-react";

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
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  is_active: boolean;
}

interface ProjectSitesTabProps {
  projectId: string;
  siteMode?: string | null;
}

const ProjectSitesTab = ({ projectId, siteMode }: ProjectSitesTabProps) => {
  const { toast } = useToast();
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ProjectSite | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formCountry, setFormCountry] = useState("España");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
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
    setFormContactName(""); setFormContactPhone(""); setFormContactEmail("");
    setFormNotes(""); setFormFloorArea("");
    setEditingSite(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (site: ProjectSite) => {
    setEditingSite(site);
    setFormName(site.site_name || "");
    setFormRef(site.site_reference || "");
    setFormAddress(site.address || "");
    setFormCity(site.city || "");
    setFormPostalCode(site.postal_code || "");
    setFormProvince(site.province || "");
    setFormCountry(site.country || "España");
    setFormContactName(site.contact_name || "");
    setFormContactPhone(site.contact_phone || "");
    setFormContactEmail(site.contact_email || "");
    setFormNotes(site.notes || "");
    setFormFloorArea(site.floor_area || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre del sitio es obligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const sanitize = (v: string) => v.trim() || null;

      if (editingSite) {
        const { error } = await supabase.rpc("update_project_site", {
          p_site_id: editingSite.id,
          p_site_name: formName.trim(),
          p_site_reference: sanitize(formRef),
          p_address: sanitize(formAddress),
          p_city: sanitize(formCity),
          p_postal_code: sanitize(formPostalCode),
          p_province: sanitize(formProvince),
          p_country: sanitize(formCountry),
          p_contact_name: sanitize(formContactName),
          p_contact_phone: sanitize(formContactPhone),
          p_contact_email: sanitize(formContactEmail),
          p_notes: sanitize(formNotes),
          p_floor_area: sanitize(formFloorArea),
        });
        if (error) throw error;
        toast({ title: "Sitio actualizado" });
      } else {
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
          p_contact_email: sanitize(formContactEmail),
          p_notes: sanitize(formNotes),
          p_floor_area: sanitize(formFloorArea),
        });
        if (error) throw error;
        toast({ title: "Sitio creado" });
      }

      setDialogOpen(false);
      resetForm();
      fetchSites();
    } catch (error: any) {
      console.error("Error saving site:", error);
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

  const handleArchive = async (siteId: string) => {
    try {
      const { error } = await supabase.rpc("archive_project_site", { p_site_id: siteId });
      if (error) throw error;
      toast({ title: "Sitio archivado" });
      fetchSites();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeSites = sites.filter(s => s.is_active);
  const archivedSites = sites.filter(s => !s.is_active);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Sitios de instalación</h3>
          <p className="text-sm text-muted-foreground">
            {siteMode === "MULTI_SITE"
              ? "Este proyecto tiene múltiples sitios de instalación"
              : "Sitio principal del proyecto"}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo sitio
        </Button>
      </div>

      {/* Active Sites */}
      {activeSites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay sitios configurados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSites.map((site) => (
            <div
              key={site.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <h4 className="font-semibold text-foreground">{site.site_name}</h4>
                  {site.is_default && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Star className="h-3 w-3" /> Principal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(site)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!site.is_default && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetDefault(site.id)} title="Hacer principal">
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleArchive(site.id)} title="Archivar">
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5 pl-6">
                {site.address && <p>{site.address}</p>}
                {(site.city || site.postal_code) && (
                  <p>{[site.postal_code, site.city, site.province].filter(Boolean).join(", ")}</p>
                )}
                {site.site_reference && <p className="text-xs">Ref: {site.site_reference}</p>}
                {site.contact_name && <p className="text-xs mt-1">Contacto: {site.contact_name} {site.contact_phone ? `· ${site.contact_phone}` : ""}</p>}
                {site.floor_area && <p className="text-xs">Superficie: {site.floor_area}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archivedSites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Archivados ({archivedSites.length})</h4>
          <div className="space-y-2">
            {archivedSites.map((site) => (
              <div key={site.id} className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{site.site_name}</span>
                {site.city && <span>— {site.city}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editingSite ? "Editar sitio" : "Nuevo sitio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre del sitio *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Tienda Centro" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Referencia interna</Label>
                <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="Código interno" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Dirección</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Calle y número" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">C.P.</Label>
                <Input value={formPostalCode} onChange={(e) => setFormPostalCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Provincia</Label>
                <Input value={formProvince} onChange={(e) => setFormProvince(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">País</Label>
                <Input value={formCountry} onChange={(e) => setFormCountry(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Superficie</Label>
                <Input value={formFloorArea} onChange={(e) => setFormFloorArea(e.target.value)} placeholder="Ej: 120 m²" />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Contacto del sitio</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre</Label>
                  <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Notas sobre el sitio..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingSite ? "Guardar cambios" : "Crear sitio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSitesTab;
