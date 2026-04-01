import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Clock, MessageSquare, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInstallationDocuments } from "@/pages/nexo_av/shared/hooks/useInstallationDocuments";
import SiteInstallationGallery from "@/pages/nexo_av/shared/components/SiteInstallationGallery";
import InstallationWorkLog from "@/pages/nexo_av/shared/components/InstallationWorkLog";
import InstallationQAPanel from "@/pages/nexo_av/shared/components/InstallationQAPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteOption {
  id: string;
  site_name: string;
  city: string | null;
}

type SectionId = "galeria" | "horas" | "qa";

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "galeria", label: "Fotos", icon: Camera },
  { id: "horas", label: "Horas", icon: Clock },
  { id: "qa", label: "QA", icon: MessageSquare },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileInstallationTabProps {
  projectId: string;
  siteMode?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MobileInstallationTab = ({ projectId, siteMode }: MobileInstallationTabProps) => {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("galeria");

  const fetchSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const { data, error } = await supabase.rpc("list_project_sites", {
        p_project_id: projectId,
      });
      if (error) throw error;
      const active = ((data || []) as any[])
        .filter((s) => s.is_active)
        .map((s) => ({ id: s.id, site_name: s.site_name, city: s.city ?? null }));
      setSites(active);
      if (active.length > 0) setSelectedSiteId(active[0].id);
    } catch (err) {
      console.error("[MobileInstallationTab] fetchSites:", err);
    } finally {
      setLoadingSites(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const { documents, workLog, qaEntries, summary, loading, uploading, uploadDocument, deleteDocument } =
    useInstallationDocuments(selectedSiteId);

  if (loadingSites) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground px-4">
        <Camera className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium text-center">Sin sitios configurados</p>
        <p className="text-xs text-center">Crea al menos un sitio para documentar la instalación.</p>
      </div>
    );
  }

  const isSingle = siteMode === "SINGLE" || sites.length === 1;
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="flex flex-col">
      {/* Site selector (multi only) */}
      {!isSingle && sites.length > 1 && (
        <div className="px-4 py-3 border-b border-border">
          <Select value={selectedSiteId ?? ""} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un sitio" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.site_name}{site.city ? ` · ${site.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Single site label */}
      {isSingle && selectedSite && (
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            {selectedSite.site_name}
            {selectedSite.city && (
              <span className="text-muted-foreground font-normal"> · {selectedSite.city}</span>
            )}
          </p>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
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
                "flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors flex-1 justify-center",
                activeSection === sec.id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveSection(sec.id)}
            >
              <sec.icon className="w-4 h-4" />
              <span>{sec.label}</span>
              {count != null && count > 0 && (
                <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {!selectedSiteId ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
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
                canDelete={false}
                onUpload={uploadDocument}
                onDelete={deleteDocument}
                compact
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
  );
};

export default MobileInstallationTab;
