import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderKanban, Loader2, Users, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjectStatusInfo } from "@/constants/projectStatuses";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import MapWithMarkers, { type MapItem } from "../components/map/MapWithMarkers";
import {
  geocodeAddress,
  geocodeFullAddress,
  geocodeLocality,
} from "../components/map/geocode";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

const MAP_CLIENT_LEAD_STAGES = ["NEGOTIATION", "WON", "RECURRING"] as const;

const LEAD_STAGES = [
  {
    value: "NEGOTIATION",
    label: "En negociacion",
    color: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  },
  {
    value: "WON",
    label: "Ganado",
    color: "bg-green-500/20 text-green-700 border-green-500/30",
  },
  {
    value: "LOST",
    label: "Perdido",
    color: "bg-red-500/20 text-red-700 border-red-500/30",
  },
  {
    value: "RECURRING",
    label: "Recurrente",
    color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  },
] as const;

const MAP_TABS = [
  {
    value: "proyectos",
    label: "Proyectos",
    icon: FolderKanban,
    listTitle: "Proyectos en el mapa",
    color: "#3B82F6",
  },
  {
    value: "clientes",
    label: "Clientes",
    icon: Users,
    listTitle: "Clientes en el mapa",
    color: "#10B981",
  },
  {
    value: "tecnicos",
    label: "Tecnicos",
    icon: Wrench,
    listTitle: "Tecnicos en el mapa",
    color: "#F59E0B",
  },
] as const;

interface ProjectRow {
  id: string;
  project_number: string;
  project_name: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  default_site_id?: string | null;
}

interface ProjectSiteRow {
  id: string;
  project_id: string;
  site_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_default: boolean | null;
  is_active: boolean | null;
}

interface ClientMapRow {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  lead_stage: string;
  full_address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

interface TechnicianListRow {
  id: string;
  technician_number: string;
  company_name: string;
  type: string;
  city?: string | null;
  province?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

interface TechnicianMapRow extends TechnicianListRow {
  address?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const getClientStageInfo = (stage: string) =>
  LEAD_STAGES.find((item) => item.value === stage) ?? LEAD_STAGES[0];

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const joinAddressParts = (...parts: Array<string | null | undefined>) =>
  parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");

const buildStructuredAddress = (site: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  country?: string | null;
}) =>
  joinAddressParts(
    site.address,
    [site.postal_code, site.city].filter(Boolean).join(" "),
    site.province,
    site.country,
  );

const selectBestProjectSite = (
  sites: ProjectSiteRow[],
  defaultSiteId?: string | null,
) => {
  if (sites.length === 0) return null;

  const byId = defaultSiteId
    ? sites.find((site) => site.id === defaultSiteId)
    : null;
  if (byId && byId.is_active) return byId;

  return (
    byId ??
    sites.find((site) => site.is_default && site.is_active) ??
    sites.find((site) => site.is_default) ??
    sites.find((site) => site.is_active) ??
    sites[0]
  );
};

const MapPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(MAP_TABS[0].value);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMapItems, setProjectMapItems] = useState<MapItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsGeocoding, setProjectsGeocoding] = useState(false);

  const [clients, setClients] = useState<ClientMapRow[]>([]);
  const [clientMapItems, setClientMapItems] = useState<MapItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [technicians, setTechnicians] = useState<TechnicianMapRow[]>([]);
  const [technicianMapItems, setTechnicianMapItems] = useState<MapItem[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);

  const projectMapItemById = useMemo(
    () => new Map(projectMapItems.map((item) => [item.id, item])),
    [projectMapItems],
  );
  const clientMapItemById = useMemo(
    () => new Map(clientMapItems.map((item) => [item.id, item])),
    [clientMapItems],
  );
  const technicianMapItemById = useMemo(
    () => new Map(technicianMapItems.map((item) => [item.id, item])),
    [technicianMapItems],
  );

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", {
        p_status: null,
        p_search: null,
      });
      if (error) throw error;
      setProjects((data as ProjectRow[]) ?? []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
      setProjectMapItems([]);
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

      const rows = (data as ClientMapRow[]) ?? [];
      setClients(rows);

      const items: MapItem[] = [];
      for (const client of rows) {
        const latitude = toNullableNumber(client.latitude);
        const longitude = toNullableNumber(client.longitude);

        if (latitude != null && longitude != null) {
          items.push({
            id: client.id,
            name: client.company_name,
            latitude,
            longitude,
            address: client.full_address,
            lead_stage: client.lead_stage,
            location_precision: "exact",
          });
          continue;
        }

        if (!client.full_address?.trim()) continue;

        const coords = await geocodeFullAddress(client.full_address);
        if (!coords) continue;

        items.push({
          id: client.id,
          name: client.company_name,
          latitude: coords.lat,
          longitude: coords.lon,
          address: client.full_address,
          lead_stage: client.lead_stage,
          location_precision: "approximate",
        });
      }

      setClientMapItems(items);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
      setClientMapItems([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    setTechniciansLoading(true);
    try {
      const [
        { data: listData, error: listError },
        { data: mapData, error: mapError },
      ] = await Promise.all([
        supabase.rpc("list_technicians", {
          p_search: null,
          p_type: null,
          p_status: null,
          p_specialty: null,
        }),
        supabase.rpc("list_technicians_for_map", {
          p_type: null,
          p_status: null,
          p_specialty: null,
        }),
      ]);

      if (listError) throw listError;
      if (mapError)
        console.error("Error fetching technician coordinates:", mapError);

      const baseRows = ((listData as TechnicianListRow[]) ?? []).map(
        (technician) => ({
          ...technician,
          address: null,
          postal_code: null,
          country: null,
          latitude: null,
          longitude: null,
        }),
      );
      const mapRows = (mapData as TechnicianMapRow[]) ?? [];

      const mergedById = new Map<string, TechnicianMapRow>();
      for (const technician of baseRows) {
        mergedById.set(technician.id, technician);
      }
      for (const technician of mapRows) {
        const previous = mergedById.get(technician.id);
        mergedById.set(technician.id, {
          ...(previous ?? {}),
          ...technician,
          city: technician.city ?? previous?.city ?? null,
          province: technician.province ?? previous?.province ?? null,
          contact_email:
            technician.contact_email ?? previous?.contact_email ?? null,
          contact_phone:
            technician.contact_phone ?? previous?.contact_phone ?? null,
        });
      }

      const merged = Array.from(mergedById.values());
      setTechnicians(merged);

      const items: MapItem[] = [];
      for (const technician of merged) {
        const latitude = toNullableNumber(technician.latitude);
        const longitude = toNullableNumber(technician.longitude);
        const address = buildStructuredAddress(technician);

        if (latitude != null && longitude != null) {
          items.push({
            id: technician.id,
            name: technician.company_name,
            latitude,
            longitude,
            address:
              address || joinAddressParts(technician.city, technician.province),
            type: technician.type,
            location_precision: "exact",
          });
          continue;
        }

        let coords = null;
        if (technician.address?.trim()) {
          coords = await geocodeAddress(technician.address, technician.city, {
            postalCode: technician.postal_code,
            province: technician.province,
          });
        }
        if (!coords) {
          coords = await geocodeLocality(
            technician.city,
            technician.province,
            technician.postal_code,
          );
        }
        if (!coords) continue;

        items.push({
          id: technician.id,
          name: technician.company_name,
          latitude: coords.lat,
          longitude: coords.lon,
          address:
            address || joinAddressParts(technician.city, technician.province),
          type: technician.type,
          location_precision: "approximate",
        });
      }

      setTechnicianMapItems(items);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
      setTechnicianMapItems([]);
    } finally {
      setTechniciansLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeTab === "clientes" && clients.length === 0 && !clientsLoading) {
      void fetchClients();
    }
  }, [activeTab, clients.length, clientsLoading, fetchClients]);

  useEffect(() => {
    if (
      activeTab === "tecnicos" &&
      technicians.length === 0 &&
      !techniciansLoading
    ) {
      void fetchTechnicians();
    }
  }, [activeTab, technicians.length, techniciansLoading, fetchTechnicians]);

  useEffect(() => {
    if (projects.length === 0) {
      setProjectMapItems([]);
      setProjectsGeocoding(false);
      return;
    }

    let cancelled = false;

    const buildProjectMapItems = async () => {
      setProjectsGeocoding(true);
      try {
        const sitesByProject = await Promise.all(
          projects.map(async (project) => {
            const { data, error } = await supabase.rpc("list_project_sites", {
              p_project_id: project.id,
            });

            if (error) {
              console.error(
                `Error fetching project sites for ${project.id}:`,
                error,
              );
              return [project.id, []] as const;
            }

            return [project.id, (data as ProjectSiteRow[]) ?? []] as const;
          }),
        );

        if (cancelled) return;

        const items: MapItem[] = [];
        for (const project of projects) {
          if (cancelled) return;

          const projectSites =
            sitesByProject.find(
              ([projectId]) => projectId === project.id,
            )?.[1] ?? [];
          const bestSite = selectBestProjectSite(
            projectSites,
            project.default_site_id,
          );

          const exactLatitude = toNullableNumber(bestSite?.latitude);
          const exactLongitude = toNullableNumber(bestSite?.longitude);
          const siteAddress = bestSite
            ? buildStructuredAddress(bestSite)
            : null;

          if (exactLatitude != null && exactLongitude != null) {
            items.push({
              id: project.id,
              name: project.project_name || project.project_number,
              latitude: exactLatitude,
              longitude: exactLongitude,
              address:
                siteAddress ||
                joinAddressParts(project.project_address, project.project_city),
              client_name: project.client_name,
              project_number: project.project_number,
              site_name: bestSite?.site_name,
              status: project.status,
              location_precision: "exact",
            });
            continue;
          }

          let coords = null;
          let displayAddress =
            siteAddress ||
            joinAddressParts(project.project_address, project.project_city);

          if (bestSite?.address?.trim()) {
            coords = await geocodeAddress(bestSite.address, bestSite.city, {
              postalCode: bestSite.postal_code,
              province: bestSite.province,
            });
          }

          if (
            !coords &&
            bestSite &&
            (bestSite.city?.trim() || bestSite.province?.trim())
          ) {
            coords = await geocodeLocality(
              bestSite.city,
              bestSite.province,
              bestSite.postal_code,
            );
            displayAddress =
              displayAddress ||
              joinAddressParts(
                bestSite.city,
                bestSite.province,
                bestSite.country,
              );
          }

          if (!coords && project.project_city?.trim()) {
            coords = await geocodeLocality(project.project_city, null, null);
            displayAddress = displayAddress || project.project_city;
          }

          if (!coords) continue;

          items.push({
            id: project.id,
            name: project.project_name || project.project_number,
            latitude: coords.lat,
            longitude: coords.lon,
            address: displayAddress,
            client_name: project.client_name,
            project_number: project.project_number,
            site_name: bestSite?.site_name,
            status: project.status,
            location_precision: "approximate",
          });
        }

        if (!cancelled) {
          setProjectMapItems(items);
        }
      } catch (error) {
        console.error("Error building project map items:", error);
        if (!cancelled) {
          setProjectMapItems([]);
        }
      } finally {
        if (!cancelled) {
          setProjectsGeocoding(false);
        }
      }
    };

    void buildProjectMapItems();

    return () => {
      cancelled = true;
    };
  }, [projects]);

  const mapLoading =
    (activeTab === "proyectos" && (projectsLoading || projectsGeocoding)) ||
    (activeTab === "clientes" && clientsLoading) ||
    (activeTab === "tecnicos" && techniciansLoading);

  return (
    <div className="map-page flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <DetailNavigationBar
          pageTitle="Mapa"
          contextInfo={
            <span className="text-sm text-muted-foreground">
              Vista general de ubicaciones
            </span>
          }
          backPath={userId ? `/nexo-av/${userId}/dashboard` : undefined}
          onBack={
            userId ? () => navigate(`/nexo-av/${userId}/dashboard`) : undefined
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex h-full min-h-0 flex-col"
        >
          <TabsList className="mb-0 h-11 w-full flex-shrink-0 justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
            {MAP_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {MAP_TABS.map(({ value, listTitle, color }) => (
            <TabsContent
              key={value}
              value={value}
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden pt-4"
            >
              <div className="flex min-h-0 flex-1 flex-row gap-4 overflow-hidden">
                <div className="relative min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/20">
                  <div className="absolute inset-0 h-full w-full">
                    {value === "proyectos" && (
                      <>
                        <MapWithMarkers
                          items={projectMapItems}
                          markerColor={color}
                          getMarkerColor={(item) =>
                            getProjectStatusInfo(String(item.status ?? ""))
                              .markerColorHex ?? color
                          }
                          loading={mapLoading}
                          renderTooltip={(item) => (
                            <div className="p-1 text-left">
                              <p className="font-semibold text-foreground">
                                {item.name}
                              </p>
                              {item.project_number && (
                                <p className="text-xs text-muted-foreground">
                                  N. {String(item.project_number)}
                                </p>
                              )}
                              {item.client_name && (
                                <p className="text-xs text-muted-foreground">
                                  Cliente: {String(item.client_name)}
                                </p>
                              )}
                              {item.site_name && (
                                <p className="text-xs text-muted-foreground">
                                  Sitio: {String(item.site_name)}
                                </p>
                              )}
                              {item.address && (
                                <p className="text-xs text-muted-foreground">
                                  {String(item.address)}
                                </p>
                              )}
                              {String(item.location_precision) ===
                                "approximate" && (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                  Ubicacion aproximada
                                </p>
                              )}
                              {item.status && (
                                <p className="mt-1 text-xs">
                                  Estado:{" "}
                                  <span className="font-medium">
                                    {
                                      getProjectStatusInfo(String(item.status))
                                        .label
                                    }
                                  </span>
                                </p>
                              )}
                            </div>
                          )}
                        />
                        {!projectsLoading &&
                          !projectsGeocoding &&
                          projects.length === 0 && (
                            <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                              <p className="px-4 text-center text-sm text-muted-foreground">
                                No hay proyectos para mostrar.
                              </p>
                            </div>
                          )}
                        {!projectsLoading &&
                          !projectsGeocoding &&
                          projects.length > 0 &&
                          projectMapItems.length === 0 && (
                            <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                              <p className="max-w-md px-4 text-center text-sm text-muted-foreground">
                                Para ubicar proyectos en el mapa hace falta al
                                menos una direccion de sitio o una
                                ciudad/provincia valida.
                              </p>
                            </div>
                          )}
                      </>
                    )}

                    {value === "clientes" && (
                      <>
                        <MapWithMarkers
                          items={clientMapItems}
                          markerColor={color}
                          loading={mapLoading}
                          renderTooltip={(item) => {
                            const stageInfo = getClientStageInfo(
                              String(item.lead_stage ?? ""),
                            );
                            return (
                              <div className="p-1 text-left">
                                <p className="font-semibold text-foreground">
                                  {item.name}
                                </p>
                                <p className="text-xs">
                                  Estado:{" "}
                                  <span className="font-medium">
                                    {stageInfo.label}
                                  </span>
                                </p>
                                {item.address && (
                                  <p className="text-xs text-muted-foreground">
                                    {String(item.address)}
                                  </p>
                                )}
                                {String(item.location_precision) ===
                                  "approximate" && (
                                  <p className="mt-1 text-xs font-medium text-amber-700">
                                    Ubicacion aproximada
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        {!clientsLoading && clients.length === 0 && (
                          <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                            <p className="px-4 text-center text-sm text-muted-foreground">
                              No hay clientes para mostrar.
                            </p>
                          </div>
                        )}
                        {!clientsLoading &&
                          clients.length > 0 &&
                          clientMapItems.length === 0 && (
                            <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                              <p className="max-w-md px-4 text-center text-sm text-muted-foreground">
                                Para ubicar clientes en el mapa hace falta una
                                direccion valida o coordenadas guardadas.
                              </p>
                            </div>
                          )}
                      </>
                    )}

                    {value === "tecnicos" && (
                      <>
                        <MapWithMarkers
                          items={technicianMapItems}
                          markerColor={color}
                          loading={mapLoading}
                          renderTooltip={(item) => (
                            <div className="max-w-[260px] p-1 text-left">
                              <p className="font-semibold text-foreground">
                                {item.name}
                              </p>
                              {item.address && (
                                <p className="text-xs text-muted-foreground">
                                  {String(item.address)}
                                </p>
                              )}
                              {String(item.location_precision) ===
                                "approximate" && (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                  Ubicacion aproximada
                                </p>
                              )}
                              {item.type && (
                                <p className="text-xs">
                                  Tipo: {String(item.type)}
                                </p>
                              )}
                            </div>
                          )}
                        />
                        {!techniciansLoading && technicians.length === 0 && (
                          <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                            <p className="px-4 text-center text-sm text-muted-foreground">
                              No hay tecnicos para mostrar.
                            </p>
                          </div>
                        )}
                        {!techniciansLoading &&
                          technicians.length > 0 &&
                          technicianMapItems.length === 0 && (
                            <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-lg bg-muted/30">
                              <p className="max-w-md px-4 text-center text-sm text-muted-foreground">
                                Para ubicar tecnicos en el mapa hace falta al
                                menos una direccion o una ciudad/provincia
                                valida.
                              </p>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 w-[360px] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
                  <div className="border-b border-border p-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Listado
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {listTitle}
                    </p>
                  </div>

                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-2 p-3">
                      {value === "proyectos" &&
                        (projectsLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">
                              Cargando proyectos...
                            </span>
                          </div>
                        ) : projects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay proyectos para mostrar.
                          </p>
                        ) : (
                          projects.map((project) => {
                            const statusInfo = getProjectStatusInfo(
                              project.status,
                            );
                            const mapItem = projectMapItemById.get(project.id);
                            return (
                              <button
                                key={project.id}
                                type="button"
                                className="w-full rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                                onClick={() =>
                                  navigate(
                                    `/nexo-av/${userId}/projects/${project.id}`,
                                  )
                                }
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                    {project.project_number} -{" "}
                                    {project.project_name || "Sin nombre"}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      statusInfo.className,
                                      "shrink-0 px-1.5 py-0 text-[10px]",
                                    )}
                                  >
                                    {statusInfo.label}
                                  </Badge>
                                  {String(mapItem?.location_precision) ===
                                    "approximate" && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-[10px] text-amber-700"
                                    >
                                      Aproximado
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {project.client_name || "Sin cliente"} |{" "}
                                  {String(
                                    mapItem?.address ??
                                      project.project_city ??
                                      "Sin ubicacion de sitio",
                                  )}
                                </p>
                              </button>
                            );
                          })
                        ))}

                      {value === "clientes" &&
                        (clientsLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">
                              Cargando clientes...
                            </span>
                          </div>
                        ) : clients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay clientes para mostrar.
                          </p>
                        ) : (
                          clients.map((client) => {
                            const stageInfo = getClientStageInfo(
                              client.lead_stage,
                            );
                            const mapItem = clientMapItemById.get(client.id);
                            return (
                              <button
                                key={client.id}
                                type="button"
                                className="w-full rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                                onClick={() =>
                                  navigate(
                                    `/nexo-av/${userId}/clients/${client.id}`,
                                  )
                                }
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                    {client.company_name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      stageInfo.color,
                                      "shrink-0 px-1.5 py-0 text-[10px]",
                                    )}
                                  >
                                    {stageInfo.label}
                                  </Badge>
                                  {String(mapItem?.location_precision) ===
                                    "approximate" && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-[10px] text-amber-700"
                                    >
                                      Aproximado
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {client.full_address || "Sin direccion"}
                                </p>
                                {(client.contact_email ||
                                  client.contact_phone) && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {client.contact_email ||
                                      client.contact_phone}
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
                            <span className="text-sm">
                              Cargando tecnicos...
                            </span>
                          </div>
                        ) : technicians.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay tecnicos.
                          </p>
                        ) : (
                          technicians.map((technician) => {
                            const mapItem = technicianMapItemById.get(
                              technician.id,
                            );
                            return (
                              <button
                                key={technician.id}
                                type="button"
                                className="w-full rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                                onClick={() =>
                                  navigate(
                                    `/nexo-av/${userId}/technicians/${technician.id}`,
                                  )
                                }
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                    {technician.company_name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-[10px] text-amber-700"
                                  >
                                    {technician.type}
                                  </Badge>
                                  {String(mapItem?.location_precision) ===
                                    "approximate" && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-[10px] text-amber-700"
                                    >
                                      Aproximado
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {String(
                                    mapItem?.address ||
                                      buildStructuredAddress(technician) ||
                                      joinAddressParts(
                                        technician.city,
                                        technician.province,
                                      ) ||
                                      "Sin direccion",
                                  )}
                                </p>
                                {(technician.contact_email ||
                                  technician.contact_phone) && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {technician.contact_email ||
                                      technician.contact_phone}
                                  </p>
                                )}
                              </button>
                            );
                          })
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
