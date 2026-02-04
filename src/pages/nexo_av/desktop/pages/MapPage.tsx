import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, FolderKanban, Users, Wrench, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import MapWithMarkers, { type MapItem } from "../components/map/MapWithMarkers";
import { geocodeFullAddress } from "../components/map/geocode";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getProjectStatusInfo } from "@/constants/projectStatuses";

/** Estados de proyecto a mostrar en el mapa: Planificado y En progreso */
const MAP_PROJECT_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;

/** Estados de cliente para mapa/listado: todos excepto LOST (perdidos no se muestran) */
const MAP_CLIENT_LEAD_STAGES = ["NEW", "CONTACTED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "RECURRING", "PAUSED"] as const;

const LEAD_STAGES = [
  { value: "NEW", label: "Nuevo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "CONTACTED", label: "Contactado", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "MEETING", label: "Reunión", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "PROPOSAL", label: "Propuesta", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { value: "NEGOTIATION", label: "Negociación", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "WON", label: "Ganado", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "RECURRING", label: "Recurrente", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "LOST", label: "Perdido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "PAUSED", label: "Pausado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
];
const getClientStageInfo = (stage: string) =>
  LEAD_STAGES.find((s) => s.value === stage) || LEAD_STAGES[0];

const MAP_TABS = [
  { value: "proyectos", label: "Proyectos", icon: FolderKanban, listTitle: "Proyectos en el mapa", color: "#3B82F6" },
  { value: "clientes", label: "Clientes", icon: Users, listTitle: "Clientes en el mapa", color: "#10B981" },
  { value: "tecnicos", label: "Técnicos", icon: Wrench, listTitle: "Técnicos en el mapa", color: "#F59E0B" },
] as const;

// Tipos según datos del backend
interface ProjectRow {
  id: string;
  project_number: string;
  project_name: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
}

/** Clientes para mapa: list_clients_for_map (excluye LOST en backend si p_lead_stages no incluye LOST) */
interface ClientMapRow {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  lead_stage: string;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Técnicos para mapa. Origen: list_technicians_for_map (con address, lat/lon) o, si falla/vacío, list_technicians.
 * En el modelo de negocio los técnicos son proveedores; en la UI se mantiene la sección "Técnicos".
 */
interface TechnicianMapRow {
  id: string;
  technician_number: string;
  company_name: string;
  type: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Página Mapa (nexo_av/desktop).
 * Proyectos, Clientes y Técnicos usan esta herramienta para localizar la dirección exacta.
 * 3 pestañas; en cada una: mapa (chinchetas + tooltip) y listado a la derecha.
 * Direcciones completas (calle, número, CP, población, provincia) cuando estén disponibles.
 */
const MapPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(MAP_TABS[0].value);

  // Proyectos
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMapItems, setProjectMapItems] = useState<MapItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsGeocoding, setProjectsGeocoding] = useState(false);

  // Clientes (solo no perdidos; mapa con coordenadas de list_clients_for_map)
  const [clients, setClients] = useState<ClientMapRow[]>([]);
  const [clientMapItems, setClientMapItems] = useState<MapItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Técnicos (proveedores en el modelo; en UI "Técnicos") — list_technicians_for_map
  const [technicians, setTechnicians] = useState<TechnicianMapRow[]>([]);
  const [technicianMapItems, setTechnicianMapItems] = useState<MapItem[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);

  /** Solo proyectos en Planificado (PLANNED) o En progreso (IN_PROGRESS) para mapa y listado */
  const projectsForMap = useMemo(
    () => projects.filter((p) => MAP_PROJECT_STATUSES.includes(p.status as (typeof MAP_PROJECT_STATUSES)[number])),
    [projects]
  );

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", {
        p_status: null,
        p_search: null,
      });
      if (error) throw error;
      setProjects((data as ProjectRow[]) || []);
    } catch (e) {
      console.error("Error fetching projects:", e);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_clients_for_map", {
        p_lead_stages: [...MAP_CLIENT_LEAD_STAGES],
      });
      if (error) throw error;
      const list = (data as ClientMapRow[]) || [];
      setClients(list);

      const withCoords = list.filter(
        (c) => c.latitude != null && c.longitude != null
      );
      const backendItems: MapItem[] = withCoords.map((c) => ({
        id: c.id,
        name: c.company_name,
        latitude: c.latitude!,
        longitude: c.longitude!,
        address: c.full_address ?? undefined,
        lead_stage: c.lead_stage,
      }));
      setClientMapItems(backendItems);

      // Geocodificar en frontend los que tienen dirección pero el backend no devolvió coordenadas
      const needGeocode = list.filter(
        (c) =>
          (c.latitude == null || c.longitude == null) &&
          c.full_address != null &&
          String(c.full_address).trim() !== ""
      );
      const geocodedItems: MapItem[] = [];
      for (const c of needGeocode) {
        const coords = await geocodeFullAddress(c.full_address!);
        if (coords)
          geocodedItems.push({
            id: c.id,
            name: c.company_name,
            latitude: coords.lat,
            longitude: coords.lon,
            address: c.full_address ?? undefined,
            lead_stage: c.lead_stage,
          });
      }
      if (geocodedItems.length > 0)
        setClientMapItems([...backendItems, ...geocodedItems]);
    } catch (e) {
      console.error("Error fetching clients:", e);
      setClients([]);
      setClientMapItems([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    setTechniciansLoading(true);
    try {
      let list: TechnicianMapRow[] = [];
      const { data: dataMap, error: errorMap } = await supabase.rpc("list_technicians_for_map", {
        p_type: null,
        p_status: null,
        p_specialty: null,
      });
      if (!errorMap && Array.isArray(dataMap) && dataMap.length > 0) {
        list = dataMap as TechnicianMapRow[];
      } else {
        // Fallback: misma fuente que la página Técnicos (list_technicians) para que el listado siempre aparezca
        const { data: dataList, error: errorList } = await supabase.rpc("list_technicians", {
          p_search: null,
          p_type: null,
          p_status: null,
          p_specialty: null,
        });
        if (errorList) throw errorList;
        const raw = (dataList || []) as Array<{ id: string; technician_number: string; company_name: string; type: string; city?: string; province?: string; contact_email?: string; contact_phone?: string }>;
        list = raw.map((t) => ({
          id: t.id,
          technician_number: t.technician_number,
          company_name: t.company_name,
          type: t.type,
          city: t.city ?? null,
          province: t.province ?? null,
          address: null,
          contact_email: t.contact_email ?? null,
          contact_phone: t.contact_phone ?? null,
          latitude: null,
          longitude: null,
        }));
      }
      setTechnicians(list);

      const withCoords = list.filter(
        (t) => t.latitude != null && t.longitude != null
      );
      const backendItems: MapItem[] = withCoords.map((t) => ({
        id: t.id,
        name: t.company_name,
        latitude: t.latitude!,
        longitude: t.longitude!,
        address: [t.address, t.city].filter(Boolean).join(", ") || undefined,
        type: t.type,
      }));
      setTechnicianMapItems(backendItems);

      // Geocodificar los que tienen dirección o al menos ciudad (fallback: ciudad + provincia)
      const needGeocode = list.filter(
        (t) =>
          (t.latitude == null || t.longitude == null) &&
          (t.address?.trim() || t.city?.trim())
      );
      const geocodedItems: MapItem[] = [];
      for (const t of needGeocode) {
        const fullStr = [t.address, t.city, t.province].filter(Boolean).join(", ");
        const coords = await geocodeFullAddress(fullStr);
        if (coords)
          geocodedItems.push({
            id: t.id,
            name: t.company_name,
            latitude: coords.lat,
            longitude: coords.lon,
            address: fullStr || undefined,
            type: t.type,
          });
      }
      if (geocodedItems.length > 0)
        setTechnicianMapItems([...backendItems, ...geocodedItems]);
    } catch (e) {
      console.error("Error fetching technicians:", e);
      setTechnicians([]);
      setTechnicianMapItems([]);
    } finally {
      setTechniciansLoading(false);
    }
  }, []);

  // Geocodificar cada proyecto con dirección completa para ubicación exacta en el mapa.
  useEffect(() => {
    if (projectsForMap.length === 0) {
      setProjectMapItems([]);
      return;
    }
    const withFullAddress = projectsForMap.filter(
      (p) => p.project_address != null && String(p.project_address).trim() !== ""
    );
    if (withFullAddress.length === 0) {
      setProjectMapItems([]);
      return;
    }
    let cancelled = false;
    setProjectsGeocoding(true);
    (async () => {
      const results: MapItem[] = [];
      for (const p of withFullAddress) {
        if (cancelled) break;
        const addressPart = String(p.project_address).trim();
        const cityPart = (p.project_city && String(p.project_city).trim()) || "";
        const fullAddressStr = [addressPart, cityPart].filter(Boolean).join(", ");
        const coords = await geocodeFullAddress(fullAddressStr);
        if (coords)
          results.push({
            id: p.id,
            name: p.project_name || p.project_number,
            latitude: coords.lat,
            longitude: coords.lon,
            address: fullAddressStr,
            project_number: p.project_number,
            client_name: p.client_name,
            status: p.status,
          });
      }
      if (!cancelled) setProjectMapItems(results);
      setProjectsGeocoding(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectsForMap]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeTab === "clientes") fetchClients();
  }, [activeTab, fetchClients]);

  useEffect(() => {
    if (activeTab === "tecnicos") fetchTechnicians();
  }, [activeTab, fetchTechnicians]);

  const mapLoading =
    (activeTab === "proyectos" && (projectsLoading || projectsGeocoding)) ||
    (activeTab === "clientes" && clientsLoading) ||
    (activeTab === "tecnicos" && techniciansLoading);

  return (
    <div className="map-page w-full h-full flex flex-col overflow-hidden min-h-0">
      <div className="flex-shrink-0 mb-4">
        <DetailNavigationBar
          pageTitle="Mapa"
          contextInfo={<span className="text-muted-foreground text-sm">Vista general</span>}
          backPath={userId ? `/nexo-av/${userId}/dashboard` : undefined}
          onBack={userId ? () => navigate(`/nexo-av/${userId}/dashboard`) : undefined}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0">
          <TabsList className="h-11 flex-shrink-0 bg-transparent border-b border-border rounded-none w-full justify-start gap-0 p-0 mb-0">
            {MAP_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {MAP_TABS.map(({ value, label, listTitle, color }) => (
            <TabsContent
              key={value}
              value={value}
              className="map-page__tabs-content mt-0 flex-1 min-h-0 flex flex-col overflow-hidden pt-4"
            >
              <div className="map-page__content flex-1 flex flex-row gap-4 min-h-0 overflow-hidden">
                <div className="map-page__map map-page__map--60 min-w-0 min-h-[300px] rounded-lg border border-border bg-muted/20 overflow-hidden relative">
                  <div className="absolute inset-0 w-full h-full min-h-0">
                  {value === "proyectos" && (
                    <>
                      <MapWithMarkers
                        items={projectMapItems}
                        markerColor={color}
                        getMarkerColor={(item) => getProjectStatusInfo(String(item.status)).markerColorHex ?? color}
                        loading={mapLoading}
                        renderTooltip={(item) => (
                        <div className="p-1 text-left">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          {item.project_number && (
                            <p className="text-xs text-muted-foreground">Nº {String(item.project_number)}</p>
                          )}
                          {item.client_name && (
                            <p className="text-xs text-muted-foreground">Cliente: {String(item.client_name)}</p>
                          )}
                          {item.address && (
                            <p className="text-xs text-muted-foreground">{String(item.address)}</p>
                          )}
                          {item.status && (
                            <p className="text-xs mt-1">
                              Estado: <span className="font-medium">{String(item.status)}</span>
                            </p>
                          )}
                        </div>
                      )}
                      />
                      {!projectsLoading && !projectsGeocoding && projectMapItems.length === 0 && projectsForMap.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[400] rounded-lg">
                          <p className="text-sm text-muted-foreground text-center px-4 max-w-md">
                            Para ver proyectos en el mapa hace falta <strong>dirección completa</strong> (calle, número, código postal, población, provincia). No se usa solo ciudad o población.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {value === "clientes" && (
                    <MapWithMarkers
                      items={clientMapItems}
                      markerColor={color}
                      loading={mapLoading}
                      renderTooltip={(item) => {
                        const stageInfo = getClientStageInfo(String(item.lead_stage));
                        return (
                          <div className="p-1 text-left">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            {item.lead_stage && (
                              <p className="text-xs mt-0.5">
                                Estado: <span className="font-medium">{stageInfo.label}</span>
                              </p>
                            )}
                            {item.address && (
                              <p className="text-xs text-muted-foreground">{String(item.address)}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}
                  {value === "tecnicos" && (
                    <MapWithMarkers
                      items={technicianMapItems}
                      markerColor={color}
                      loading={mapLoading}
                      renderTooltip={(item) => (
                        <div className="p-1 text-left max-w-[260px]">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          {item.address && (
                            <p className="text-xs text-muted-foreground">{String(item.address)}</p>
                          )}
                          {item.type && (
                            <p className="text-xs mt-0.5">Tipo: {String(item.type)}</p>
                          )}
                        </div>
                      )}
                    />
                  )}
                  {value === "tecnicos" && !techniciansLoading && technicians.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[400] rounded-lg">
                      <p className="text-sm text-muted-foreground text-center px-4">
                        No hay técnicos para mostrar.
                      </p>
                    </div>
                  )}
                  {value === "tecnicos" && !techniciansLoading && technicians.length > 0 && technicianMapItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[400] rounded-lg">
                      <p className="text-sm text-muted-foreground text-center px-4 max-w-md">
                        Para ver técnicos en el mapa hace falta <strong>dirección completa</strong> (calle, número, código postal, población, provincia). No se usa solo ciudad.
                      </p>
                    </div>
                  )}
                  {value === "clientes" && !clientsLoading && clients.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[400] rounded-lg">
                      <p className="text-sm text-muted-foreground text-center px-4">
                        No hay clientes para mostrar (se excluyen los perdidos).
                      </p>
                    </div>
                  )}
                  {value === "clientes" && !clientsLoading && clients.length > 0 && clientMapItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[400] rounded-lg">
                      <p className="text-sm text-muted-foreground text-center px-4 max-w-md">
                        Para ver clientes en el mapa hace falta <strong>dirección completa</strong> de facturación (calle, número, código postal, población, provincia). No se usa solo ciudad.
                      </p>
                    </div>
                  )}
                  </div>
                </div>

                <div className="map-page__list map-page__list--40 min-w-0 rounded-lg border border-border bg-card flex flex-col overflow-hidden min-h-0">
                  <div className="p-3 border-b border-border flex-shrink-0">
                    <h3 className="text-sm font-semibold text-foreground">Listado</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{listTitle}</p>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-2">
                      {value === "proyectos" &&
                        (projectsLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Cargando proyectos…</span>
                          </div>
                        ) : projectsForMap.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay proyectos en Planificado o En progreso.</p>
                        ) : (
                          projectsForMap.map((p) => {
                            const statusInfo = getProjectStatusInfo(p.status);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={cn(
                                  "w-full text-left rounded-md px-3 py-2 border border-transparent hover:bg-accent hover:border-border transition-colors"
                                )}
                                onClick={() => navigate(`/nexo-av/${userId}/projects/${p.id}`)}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-foreground truncate min-w-0 flex-1">
                                    {p.project_number} – {p.project_name || "Sin nombre"}
                                  </p>
                                  <Badge variant="outline" className={cn(statusInfo.className, "text-[10px] px-1.5 py-0 shrink-0")}>
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {p.client_name || "Sin cliente"} · {[p.project_address, p.project_city].filter(Boolean).join(", ") || "Sin dirección completa"}
                                </p>
                              </button>
                            );
                          })
                        ))}
                      {value === "clientes" &&
                        (clientsLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Cargando clientes…</span>
                          </div>
                        ) : clients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay clientes (se excluyen los perdidos).</p>
                        ) : (
                          clients.map((c) => {
                            const stageInfo = getClientStageInfo(c.lead_stage);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                className={cn(
                                  "w-full text-left rounded-md px-3 py-2 border border-transparent hover:bg-accent hover:border-border transition-colors"
                                )}
                                onClick={() => navigate(`/nexo-av/${userId}/clients/${c.id}`)}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-foreground truncate min-w-0 flex-1">
                                    {c.company_name}
                                  </p>
                                  <Badge variant="outline" className={cn(stageInfo.color, "text-[10px] px-1.5 py-0 shrink-0")}>
                                    {stageInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {c.full_address || "Sin dirección"}
                                </p>
                                {(c.contact_email || c.contact_phone) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {c.contact_email || c.contact_phone}
                                  </p>
                                )}
                              </button>
                            );
                          })
                        ))}
                      {value === "tecnicos" &&
                        (techniciansLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Cargando técnicos…</span>
                          </div>
                        ) : technicians.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay técnicos.</p>
                        ) : (
                          technicians.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={cn(
                                "w-full text-left rounded-md px-3 py-2 border border-transparent hover:bg-accent hover:border-border transition-colors"
                              )}
                              onClick={() => navigate(`/nexo-av/${userId}/technicians/${t.id}`)}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-foreground truncate min-w-0 flex-1">
                                  {t.company_name}
                                </p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  {t.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {(t.address || t.city || t.province) ? [t.address, t.city, t.province].filter(Boolean).join(", ") : "Sin dirección"}
                              </p>
                              {(t.contact_email ?? t.contact_phone) && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {t.contact_email ?? t.contact_phone}
                                </p>
                              )}
                            </button>
                          ))
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default MapPage;
