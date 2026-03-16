import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Boxes,
  ChevronRight,
  Euro,
  Layers3,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Tag,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type CatalogTabId = "products" | "services" | "packs";

interface CatalogProduct {
  category_id: string;
  category_code: string;
  category_name: string;
  cost_price: number;
  description: string;
  discount_percent: number;
  has_low_stock_alert: boolean;
  id: string;
  is_active: boolean;
  margin_percentage: number;
  min_stock_alert: number;
  name: string;
  product_type: "PRODUCT" | "SERVICE" | "BUNDLE";
  sale_price: number;
  sale_price_effective: number;
  subcategory_code: string;
  subcategory_id: string;
  subcategory_name: string;
  sku: string;
  stock_quantity: number;
  supplier_id: string;
  supplier_name: string;
  tax_rate: number;
  track_stock: boolean;
  unit: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg";
}

interface CatalogPack {
  base_price_real: number;
  category_id: string;
  component_count: number;
  description: string;
  discount_percent: number;
  id: string;
  is_active: boolean;
  name: string;
  sale_price: number;
  sale_price_effective: number;
  sku: string;
  tax_rate: number;
  visible_discount_percent: number;
}

type SelectedItem =
  | { type: "product"; item: CatalogProduct }
  | { type: "pack"; item: CatalogPack }
  | null;

const TABS: Array<{
  id: CatalogTabId;
  label: string;
  icon: typeof Package;
  emptyTitle: string;
  emptyDescription: string;
}> = [
  {
    id: "products",
    label: "Productos",
    icon: Package,
    emptyTitle: "No hay productos",
    emptyDescription: "Ajusta la búsqueda o revisa la taxonomía del catálogo.",
  },
  {
    id: "services",
    label: "Servicios",
    icon: Wrench,
    emptyTitle: "No hay servicios",
    emptyDescription: "Los servicios activos del catálogo aparecerán aquí.",
  },
  {
    id: "packs",
    label: "Packs",
    icon: Boxes,
    emptyTitle: "No hay packs",
    emptyDescription: "Los bundles comerciales del catálogo aparecerán aquí.",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value || 0)}%`;

const MobileCatalogPage = () => {
  const [activeTab, setActiveTab] = useState<CatalogTabId>("products");
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<CatalogProduct[]>([]);
  const [packs, setPacks] = useState<CatalogPack[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  const debouncedSearchTerm = useDebounce(searchInput, 400);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);

        if (activeTab === "packs") {
          const { data, error } = await supabase.rpc("list_catalog_bundles", {
            p_search: debouncedSearchTerm || undefined,
          });

          if (error) throw error;
          setPacks((data || []) as CatalogPack[]);
          return;
        }

        const { data, error } = await supabase.rpc("list_catalog_products", {
          p_domain: activeTab === "products" ? "PRODUCT" : "SERVICE",
          p_search: debouncedSearchTerm || undefined,
          p_include_inactive: true,
        });

        if (error) throw error;

        const nextItems = (data || []) as CatalogProduct[];
        if (activeTab === "products") {
          setProducts(nextItems);
        } else {
          setServices(nextItems);
        }
      } catch (error) {
        console.error("Error fetching catalog items:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchCatalog();
  }, [activeTab, debouncedSearchTerm]);

  const currentItems = useMemo(() => {
    if (activeTab === "products") return products;
    if (activeTab === "services") return services;
    return packs;
  }, [activeTab, packs, products, services]);

  const stats = useMemo(() => {
    if (activeTab === "packs") {
      const packItems = packs;
      return [
        {
          label: "Packs",
          value: packItems.length,
          icon: Boxes,
          tone: "text-blue-600 bg-blue-500/10",
        },
        {
          label: "Activos",
          value: packItems.filter((item) => item.is_active).length,
          icon: Layers3,
          tone: "text-emerald-600 bg-emerald-500/10",
        },
        {
          label: "Con dto",
          value: packItems.filter((item) => item.visible_discount_percent > 0).length,
          icon: Tag,
          tone: "text-amber-600 bg-amber-500/10",
        },
      ];
    }

    const itemList = activeTab === "products" ? products : services;
    return [
      {
        label: activeTab === "products" ? "Productos" : "Servicios",
        value: itemList.length,
        icon: activeTab === "products" ? Package : Wrench,
        tone: "text-blue-600 bg-blue-500/10",
      },
      {
        label: "Activos",
        value: itemList.filter((item) => item.is_active).length,
        icon: Layers3,
        tone: "text-emerald-600 bg-emerald-500/10",
      },
      {
        label: activeTab === "products" ? "Stock bajo" : "Con dto",
        value:
          activeTab === "products"
            ? itemList.filter((item) => item.has_low_stock_alert).length
            : itemList.filter((item) => item.discount_percent > 0).length,
        icon: activeTab === "products" ? ShieldAlert : Tag,
        tone: activeTab === "products" ? "text-rose-600 bg-rose-500/10" : "text-amber-600 bg-amber-500/10",
      },
    ];
  }, [activeTab, packs, products, services]);

  const currentTabMeta = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const EmptyStateIcon = currentTabMeta.icon;

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="sticky top-0 z-20 flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-4 px-4 pb-4 pt-2">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5",
                    "text-[11px] font-medium leading-tight transition-colors duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("rounded-xl p-1.5", stat.tone)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                </div>
              );
            })}
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`Buscar ${currentTabMeta.label.toLowerCase()}...`}
              className="h-11 border-border bg-card pl-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <EmptyStateIcon className="mb-4 h-14 w-14 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">{currentTabMeta.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchInput ? "Prueba con otra búsqueda o cambia de pestaña." : currentTabMeta.emptyDescription}
              </p>
            </div>
          ) : activeTab === "packs" ? (
            (currentItems as CatalogPack[]).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem({ type: "pack", item })}
                className={cn(
                  "w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm",
                  "active:scale-[0.98] transition-all duration-200 hover:border-primary/30"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.component_count} componentes
                      </Badge>
                      {!item.is_active && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        Base {formatCurrency(item.base_price_real)}
                      </span>
                      {item.visible_discount_percent > 0 && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                          DTO {formatPercent(item.visible_discount_percent)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.sale_price_effective)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))
          ) : (
            (currentItems as CatalogProduct[]).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem({ type: "product", item })}
                className={cn(
                  "w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm",
                  "active:scale-[0.98] transition-all duration-200 hover:border-primary/30"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.subcategory_code || item.category_code}
                      </Badge>
                      {item.has_low_stock_alert && (
                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-300">
                          Stock bajo
                        </Badge>
                      )}
                      {!item.is_active && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.category_name} · {item.subcategory_name}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        {item.unit}
                        {item.track_stock ? ` · Stock ${item.stock_quantity}` : ""}
                      </span>
                      {item.supplier_name && (
                        <span className="rounded-full bg-muted px-2.5 py-1">{item.supplier_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.sale_price_effective)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Drawer open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DrawerContent className="max-h-[86vh]">
          {selectedItem && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="pr-8 text-left">{selectedItem.item.name}</DrawerTitle>
                <DrawerDescription className="text-left">
                  {selectedItem.item.sku}
                  {selectedItem.type === "product"
                    ? ` · ${selectedItem.item.category_name} / ${selectedItem.item.subcategory_name}`
                    : ` · ${selectedItem.item.component_count} componentes`}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-4 overflow-y-auto px-4 pb-6">
                <div className="grid grid-cols-3 gap-2">
                  {selectedItem.type === "product" ? (
                    <>
                      <MetricCard
                        icon={Euro}
                        label="PVP"
                        value={formatCurrency(selectedItem.item.sale_price_effective)}
                      />
                      <MetricCard
                        icon={Tag}
                        label="Margen"
                        value={formatPercent(selectedItem.item.margin_percentage)}
                      />
                      <MetricCard
                        icon={Layers3}
                        label="IVA"
                        value={formatPercent(selectedItem.item.tax_rate)}
                      />
                    </>
                  ) : (
                    <>
                      <MetricCard
                        icon={Euro}
                        label="PVP"
                        value={formatCurrency(selectedItem.item.sale_price_effective)}
                      />
                      <MetricCard
                        icon={Layers3}
                        label="Base"
                        value={formatCurrency(selectedItem.item.base_price_real)}
                      />
                      <MetricCard
                        icon={Tag}
                        label="DTO"
                        value={formatPercent(selectedItem.item.visible_discount_percent)}
                      />
                    </>
                  )}
                </div>

                {selectedItem.item.description && (
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">Descripción</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedItem.item.description}</p>
                  </section>
                )}

                {selectedItem.type === "product" ? (
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">Ficha rápida</h4>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <DetailItem label="Categoría" value={selectedItem.item.category_name} />
                      <DetailItem label="Subcategoría" value={selectedItem.item.subcategory_name} />
                      <DetailItem label="Unidad" value={selectedItem.item.unit} />
                      <DetailItem label="Proveedor" value={selectedItem.item.supplier_name || "Sin proveedor"} />
                      <DetailItem
                        label="Stock"
                        value={selectedItem.item.track_stock ? `${selectedItem.item.stock_quantity}` : "No controlado"}
                      />
                      <DetailItem
                        label="Alerta mínima"
                        value={selectedItem.item.track_stock ? `${selectedItem.item.min_stock_alert}` : "No aplica"}
                      />
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">Ficha rápida</h4>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <DetailItem label="Componentes" value={`${selectedItem.item.component_count}`} />
                      <DetailItem label="Estado" value={selectedItem.item.is_active ? "Activo" : "Inactivo"} />
                      <DetailItem label="PVP base pack" value={formatCurrency(selectedItem.item.sale_price)} />
                      <DetailItem label="IVA" value={formatPercent(selectedItem.item.tax_rate)} />
                    </div>
                  </section>
                )}

                <p className="text-xs text-muted-foreground">
                  La edición completa del catálogo sigue en desktop. En mobile esta vista queda adaptada para consulta rápida.
                </p>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="rounded-xl bg-primary/10 p-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[11px]">{label}</span>
    </div>
    <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/40 p-3">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
  </div>
);

export default MobileCatalogPage;
