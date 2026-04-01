import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Clock, MessageSquare, ExternalLink, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstallationDocuments } from "@/pages/nexo_av/shared/hooks/useInstallationDocuments";
import SiteInstallationGallery from "@/pages/nexo_av/shared/components/SiteInstallationGallery";
import InstallationWorkLog from "@/pages/nexo_av/shared/components/InstallationWorkLog";
import InstallationQAPanel from "@/pages/nexo_av/shared/components/InstallationQAPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteOption {
  id: string;
  site_name: string;
  city: string | null;
  site_status: string;
}

type SectionId = "galeria" | "horas" | "qa";

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "galeria", label: "Documentación", icon: Camera },
  { id: "horas", label: "Control Horario", icon: Clock },
  { id: "qa", label: "Preguntas / QA", icon: MessageSquare },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectInstallationTabProps {
  projectId: string;
  siteMode?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProjectInstallationTab = ({ projectId, siteMode }: ProjectInstallationTabProps) => {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("galeria");

  // Load sites for this project
  const fetchSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const { data, error } = await supabase.rpc("list_project_sites", {
        p_project_id: projectId,
      });
      if (error) throw error;
      const active = ((data || []) as any[])
        .filter((s) => s.is_active)
        .map((s) => ({
          id: s.id,
          site_name: s.site_name,
          city: s.city ?? null,
          site_status: s.site_status ?? "PLANNED",
        }));
      setSites(active);
      if (active.length > 0 && !selectedSiteId) {
        setSelectedSiteId(active[0].id);
      }
    } catch (err) {
      console.error("[ProjectInstallationTab] fetchSites:", err);
    } finally {
      setLoadingSites(false);
    }
  }, [projectId, selectedSiteId]);

  useEffect(() => {
    fetchSites();
  }, [projectId]);

  const isSingle = siteMode === "SINGLE" || sites.length === 1;

  // Installation documents hook for selected site
  const { documents, workLog, qaEntries, summary, loading, uploading, uploadDocument, deleteDocument } =
    useInstallationDocuments(selectedSiteId);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  if (loadingSites) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Camera className="w-10 h-10 opacity-30" />
        <p className="font-medium">Sin sitios configurados</p>
        <p className="text-sm">Crea al menos un sitio en la pestaña "Sitios" para documentar la instalación.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left panel: site list (multi-site only) */}
      {!isSingle && (
        <div className="w-64 border-r border-border overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sitios</p>
          </div>
          <div className="p-2 space-y-1">
            {sites.map((site) => (
              <button
                key={site.id}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                  "flex items-center gap-2.5",
                  selectedSiteId === site.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted/50"
                )}
                onClick={() => setSelectedSiteId(site.id)}
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{site.site_name}</p>
                  {site.city && (
                    <p className="text-xs text-muted-foreground truncate">{site.city}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right panel: content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Site header (single mode) */}
        {isSingle && selectedSite && (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{selectedSite.site_name}</span>
            {selectedSite.city && (
              <span className="text-sm text-muted-foreground">· {selectedSite.city}</span>
            )}
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-0 border-b border-border px-5 flex-shrink-0">
          {SECTIONS.map((sec) => {
            const count =
              sec.id === "galeria"
                ? summary?.total_documents
                : sec.id === "horas"
                ? workLog.length
                : qaEntries.length;

            return (
              <button
                key={sec.id}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors",
                  activeSection === sec.id
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveSection(sec.id)}
              >
                <sec.icon className="w-4 h-4" />
                <span>{sec.label}</span>
                {count != null && count > 0 && (
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* SharePoint link */}
          {documents.find((d) => d.sharepoint_web_url) && (
            <a
              href={documents.find((d) => d.sharepoint_web_url)?.sharepoint_web_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              SharePoint
            </a>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedSiteId ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Selecciona un sitio
            </div>
          ) : (
            <>
              {activeSection === "galeria" && (
                <SiteInstallationGallery
                  siteId={selectedSiteId}
                  documents={documents}
                  loading={loading}
                  uploading={uploading}
                  canUpload
                  canDelete
                  onUpload={uploadDocument}
                  onDelete={deleteDocument}
                />
              )}
              {activeSection === "horas" && (
                <InstallationWorkLog entries={workLog} loading={loading} />
              )}
              {activeSection === "qa" && (
                <InstallationQAPanel entries={qaEntries} loading={loading} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInstallationTab;
