import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Tag,
  Plus,
  Loader2,
  Star,
  Users,
  Pencil,
  Trash2,
  Package,
  MoreHorizontal,
  AlertTriangle,
  Search,
  UserPlus,
  UserMinus,
  Check,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

interface RateCard {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
}

interface RateCardLine {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_type: "PRODUCT" | "SERVICE" | "BUNDLE";
  unit_price: number;
  notes: string | null;
  line_order: number;
}

interface AssignedTechnician {
  id: string;
  technician_number: string;
  company_name: string;
  type: string;
}

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  product_type: string;
  sale_price: number | null;
}

const RateCardDetailPage = () => {
  const { userId, rateCardId } = useParams<{ userId: string; rateCardId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [lines, setLines] = useState<RateCardLine[]>([]);
  const [assignedTechs, setAssignedTechs] = useState<AssignedTechnician[]>([]);
  const [dbReady, setDbReady] = useState(true);

  // PDF export
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!rateCard) return;
    try {
      setExportingPdf(true);
      // Cargar ajustes de empresa (fallback si RPC no existe)
      let company = null;
      try {
        const { data } = await supabase.rpc("get_company_settings" as any);
        company = data || null;
      } catch {
        company = null;
      }
      const { RateCardPDFDocument } = await import("@/pages/nexo_av/assets/plantillas");
      const { pdf } = await import("@react-pdf/renderer");
      const doc = (
        <RateCardPDFDocument
          rateCard={{ id: rateCard.id, name: rateCard.name, description: rateCard.description, is_default: rateCard.is_default, is_active: rateCard.is_active }}
          lines={lines.map((l) => ({
            id: l.id,
            product_name: l.product_name,
            product_sku: l.product_sku,
            product_type: l.product_type,
            unit_price: l.unit_price,
            notes: l.notes,
            line_order: l.line_order,
          }))}
          company={company}
          issueDate={new Date().toISOString().split("T")[0]}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = rateCard.name.replace(/[^a-zA-Z0-9_\-. ]/g, "").replace(/ /g, "_");
      a.download = `Tarifa-${safeName}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF exportado", description: rateCard.name });
    } catch (err: any) {
      toast({ title: "Error al exportar PDF", description: err?.message || "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  // Añadir técnico dialog
  const [addTechDialogOpen, setAddTechDialogOpen] = useState(false);
  const [allTechnicians, setAllTechnicians] = useState<AssignedTechnician[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const [loadingTechs, setLoadingTechs] = useState(false);


  // Add/edit line dialog
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<RateCardLine | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [lineForm, setLineForm] = useState({ product_id: "", unit_price: "", notes: "" });

  // Catalog search for the dialog
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const MOCK_RATE_CARD: RateCard = {
    id: rateCardId || "mock-1",
    name: "Tarifa Estándar AV TECH 2026",
    description: "Condiciones económicas base aplicables a todos los técnicos externos. Incluye jornadas, horas extra, desplazamiento y dietas. Revisión anual en enero.",
    is_default: true,
    is_active: true,
  };

  const MOCK_LINES: RateCardLine[] = [
    {
      id: "l1", product_id: "p1",
      product_name: "JORNADA COMPLETA", product_sku: "GR-JC-001", product_type: "SERVICE",
      unit_price: 230.00,
      notes: "Incluye 8 horas efectivas de trabajo + 1 hora de descanso para comer. El tiempo de desplazamiento está incluido dentro de las 8 horas. Si el tiempo total entre desplazamiento y trabajo supera las 8 horas, las horas de desplazamiento adicionales se facturan aparte como Hora Desplazamiento.",
      line_order: 1,
    },
    {
      id: "l2", product_id: "p2",
      product_name: "MEDIA JORNADA", product_sku: "GR-MJ-001", product_type: "SERVICE",
      unit_price: 120.00,
      notes: "Incluye 4 horas efectivas de trabajo. El tiempo de desplazamiento está incluido dentro de las 4 horas. Si el tiempo total entre desplazamiento y trabajo supera las 4 horas, las horas de desplazamiento adicionales se facturan aparte como Hora Desplazamiento.",
      line_order: 2,
    },
    {
      id: "l3", product_id: "p3",
      product_name: "HORA EXTRA", product_sku: "GR-HE-001", product_type: "SERVICE",
      unit_price: 30.00,
      notes: "Se contabiliza a partir de la primera hora adicional completa que supere la jornada contratada: más de 8 horas en jornada completa o más de 4 horas en media jornada.",
      line_order: 3,
    },
    {
      id: "l4", product_id: "p4",
      product_name: "HORA DESPLAZAMIENTO", product_sku: "GR-HD-001", product_type: "SERVICE",
      unit_price: 25.00,
      notes: "Solo aplica cuando el tiempo de desplazamiento supera el cómputo de horas de la jornada contratada (más de 8h en jornada completa o más de 4h en media jornada).",
      line_order: 4,
    },
    {
      id: "l5", product_id: "p5",
      product_name: "DESPLAZAMIENTO", product_sku: "GR-01-001", product_type: "SERVICE",
      unit_price: 0.40,
      notes: "Precio por kilómetro recorrido, contabilizando ida y vuelta desde el punto de origen del técnico hasta el lugar de instalación.",
      line_order: 5,
    },
    {
      id: "l6", product_id: "p6",
      product_name: "DIETA COMPLETA", product_sku: "GR-03-001", product_type: "SERVICE",
      unit_price: 40.00,
      notes: "Solo aplica cuando la instalación se realiza fuera de la Península Ibérica: Islas Baleares, Islas Canarias e internacional.",
      line_order: 6,
    },
    {
      id: "l7", product_id: "p7",
      product_name: "MEDIA DIETA", product_sku: "GR-03-002", product_type: "SERVICE",
      unit_price: 20.00,
      notes: "Para desplazamientos peninsulares de larga distancia que requieran manutención durante la jornada.",
      line_order: 7,
    },
  ];


  const load = async () => {
    if (!rateCardId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_rate_card_with_lines" as any, {
        p_rate_card_id: rateCardId,
      });
      if (error) {
        // DB no lista — usar mock para revisión UI
        setRateCard(MOCK_RATE_CARD);
        setLines(MOCK_LINES);
        setAssignedTechs([]);
        setDbReady(true);
      } else {
        const result = data as any;
        setRateCard(result?.rate_card || MOCK_RATE_CARD);
        setLines(result?.lines?.length ? result.lines : MOCK_LINES);
        setAssignedTechs(result?.technicians || MOCK_TECHS);
        setDbReady(true);
      }
    } catch (err) {
      setRateCard(MOCK_RATE_CARD);
      setLines(MOCK_LINES);
      setAssignedTechs([]);
      setDbReady(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [rateCardId]);

  // Cargar lista de técnicos cuando se abre el diálogo
  useEffect(() => {
    if (!addTechDialogOpen) return;
    (async () => {
      try {
        setLoadingTechs(true);
        const { data, error } = await supabase.rpc("list_technicians" as any, {
          p_search: null,
          p_status: "ACTIVE",
        });
        if (error) throw error;
        setAllTechnicians((data as AssignedTechnician[]) || []);
      } catch {
        setAllTechnicians([]);
      } finally {
        setLoadingTechs(false);
      }
    })();
  }, [addTechDialogOpen]);

  const handleToggleTech = async (tech: AssignedTechnician) => {
    const isAssigned = assignedTechs.some((t) => t.id === tech.id);
    try {
      if (isAssigned) {
        await supabase.rpc("unassign_rate_card_from_technician" as any, {
          p_technician_id: tech.id,
        });
      } else {
        await supabase.rpc("assign_rate_card_to_technician" as any, {
          p_technician_id: tech.id,
          p_rate_card_id: rateCardId,
        });
      }
    } catch {
      // Migración pendiente — operar en local
    }
    if (isAssigned) {
      setAssignedTechs((prev) => prev.filter((t) => t.id !== tech.id));
    } else {
      setAssignedTechs((prev) => [...prev, tech]);
    }
    toast({ title: isAssigned ? "Técnico desvinculado" : "Técnico asignado a esta tarifa" });
  };

  // Load catalog products for the dialog
  useEffect(() => {
    if (!lineDialogOpen) return;
    (async () => {
      try {
        setCatalogLoading(true);
        const { data } = await supabase.rpc("list_catalog_products" as any, {
          p_search: null,
          p_type: null,
          p_category_id: null,
        });
        setCatalogProducts((data as CatalogProduct[]) || []);
      } catch {
        // Fallback: try simple table query
        try {
          const { data } = await (supabase as any)
            .schema("catalog")
            .from("products")
            .select("id, sku, name, product_type, sale_price")
            .eq("is_active", true)
            .order("name");
          setCatalogProducts(data || []);
        } catch {
          setCatalogProducts([]);
        }
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, [lineDialogOpen]);

  const filteredCatalog = catalogProducts.filter(
    (p) =>
      !catalogSearch ||
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const openAddLine = () => {
    setEditingLine(null);
    setLineForm({ product_id: "", unit_price: "", notes: "" });
    setSelectedProduct(null);
    setCatalogSearch("");
    setLineDialogOpen(true);
  };

  const openEditLine = (line: RateCardLine) => {
    setEditingLine(line);
    setLineForm({
      product_id: line.product_id,
      unit_price: String(line.unit_price),
      notes: line.notes || "",
    });
    setSelectedProduct({
      id: line.product_id,
      sku: line.product_sku,
      name: line.product_name,
      product_type: line.product_type,
      sale_price: null,
    });
    setCatalogSearch("");
    setLineDialogOpen(true);
  };

  const handleSaveLine = async () => {
    const productId = editingLine ? editingLine.product_id : lineForm.product_id;
    const price = parseFloat(lineForm.unit_price);
    if (!productId || isNaN(price) || price < 0) {
      toast({ title: "Datos incompletos", description: "Selecciona un producto y un precio válido", variant: "destructive" });
      return;
    }
    try {
      setSavingLine(true);
      await supabase.rpc("upsert_rate_card_line" as any, {
        p_rate_card_id: rateCardId,
        p_product_id: productId,
        p_unit_price: price,
        p_notes: lineForm.notes.trim() || null,
      });
    } catch {
      // Migración pendiente — simular en local
    }
    if (editingLine) {
      setLines((prev) =>
        prev.map((l) =>
          l.id === editingLine.id
            ? { ...l, unit_price: price, notes: lineForm.notes.trim() || null }
            : l
        )
      );
    } else {
      const prod = catalogProducts.find((p) => p.id === productId);
      const newLine: RateCardLine = {
        id: `local-${Date.now()}`,
        product_id: productId,
        product_name: prod?.name || "Producto",
        product_sku: prod?.sku || "—",
        product_type: (prod?.product_type as any) || "SERVICE",
        unit_price: price,
        notes: lineForm.notes.trim() || null,
        line_order: lines.length + 1,
      };
      setLines((prev) => [...prev, newLine]);
    }
    toast({ title: editingLine ? "Línea actualizada" : "Línea añadida" });
    setLineDialogOpen(false);
    setSavingLine(false);
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await supabase.rpc("delete_rate_card_line" as any, { p_line_id: lineId });
    } catch {
      // Migración pendiente — ignorar
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    toast({ title: "Línea eliminada" });
  };

  const formatCurrency = (v: number | null) => {
    if (v == null) return "—";
    return v.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rateCard) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Tarifa no encontrada.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Detalle de Tarifa"
        contextInfo={
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{rateCard.name}</span>
          </div>
        }
        tools={
          <div className="flex items-center gap-2">
            {rateCard.is_default && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-500 border-amber-500/30 bg-amber-500/10">
                <Star className="h-2.5 w-2.5 fill-amber-500" />
                Por defecto
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                rateCard.is_active
                  ? "text-[10px] text-green-500 border-green-500/30 bg-green-500/10"
                  : "text-[10px] text-gray-400 border-gray-500/30 bg-gray-500/10"
              }
            >
              {rateCard.is_active ? "Activa" : "Inactiva"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-8 text-xs"
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              {exportingPdf
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />
              }
              Exportar PDF
            </Button>
          </div>
        }
        backPath={userId ? `/nexo-av/${userId}/tarifas` : undefined}
      />

      <div className="flex-1 overflow-auto px-4 lg:px-6 py-4 lg:py-6 space-y-5">
        {/* Descripción */}
        {rateCard.description && (
          <p className="text-sm text-muted-foreground">{rateCard.description}</p>
        )}

        {/* Líneas de tarifa */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Líneas de tarifa
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {lines.length}
                </Badge>
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-2 h-8 text-xs" onClick={openAddLine}>
                <Plus className="h-3.5 w-3.5" />
                Añadir producto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <Package className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Sin productos añadidos. Usa "Añadir producto" para construir esta tarifa.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">SKU</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Producto / Servicio</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Tipo</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">Precio acordado</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Notas</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {line.product_sku}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{line.product_name}</td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]",
                              line.product_type === "SERVICE"
                                ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                                : line.product_type === "BUNDLE"
                                ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
                                : "text-orange-400 border-orange-500/30 bg-orange-500/10"
                            )}
                          >
                            {line.product_type === "SERVICE" ? "Servicio" : line.product_type === "BUNDLE" ? "Pack" : "Producto"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">
                          {formatCurrency(line.unit_price)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {line.notes || "—"}
                        </td>
                        <td className="px-2 py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[140px] bg-zinc-900 border-white/10">
                              <DropdownMenuItem
                                className="cursor-pointer text-white hover:bg-white/10 gap-2"
                                onClick={() => openEditLine(line)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar precio
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-red-400 hover:bg-white/10 gap-2"
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Técnicos asignados */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Técnicos con esta tarifa
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {assignedTechs.length}
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-8 text-xs"
                onClick={() => { setTechSearch(""); setAddTechDialogOpen(true); }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Añadir técnico
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {assignedTechs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Ningún técnico tiene asignada esta tarifa todavía.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 text-xs"
                  onClick={() => { setTechSearch(""); setAddTechDialogOpen(true); }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Añadir primer técnico
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Número</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Técnico</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Tipo</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignedTechs.map((tech) => (
                      <tr key={tech.id} className="hover:bg-muted/20 transition-colors">
                        <td
                          className="px-3 py-2.5 font-mono text-xs text-muted-foreground cursor-pointer"
                          onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                        >
                          {tech.technician_number}
                        </td>
                        <td
                          className="px-3 py-2.5 font-medium cursor-pointer"
                          onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                        >
                          {tech.company_name}
                        </td>
                        <td
                          className="px-3 py-2.5 cursor-pointer"
                          onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                        >
                          <Badge variant="outline" className="text-[10px]">
                            {tech.type === "FREELANCER" ? "Autónomo" : tech.type === "COMPANY" ? "Empresa" : "Empleado"}
                          </Badge>
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            title="Desvincular"
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            onClick={() => handleToggleTech(tech)}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: añadir técnico */}
      <Dialog open={addTechDialogOpen} onOpenChange={setAddTechDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4 text-violet-500" />
              Gestionar técnicos — {rateCard?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Selecciona los técnicos que se rigen por esta tarifa. Los que ya tienen tarifa asignada quedan marcados.
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar técnico..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="rounded-md border border-border overflow-hidden max-h-72 overflow-y-auto">
              {loadingTechs ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : (
                allTechnicians
                  .filter(
                    (t) =>
                      !techSearch ||
                      t.company_name.toLowerCase().includes(techSearch.toLowerCase()) ||
                      t.technician_number.toLowerCase().includes(techSearch.toLowerCase())
                  )
                  .map((tech) => {
                    const isAssigned = assignedTechs.some((a) => a.id === tech.id);
                    return (
                      <button
                        key={tech.id}
                        className={cn(
                          "w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 border-b border-border last:border-0 transition-colors",
                          isAssigned
                            ? "bg-violet-500/10 hover:bg-violet-500/15"
                            : "hover:bg-muted/40"
                        )}
                        onClick={() => handleToggleTech(tech)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tech.company_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tech.technician_number}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {tech.type === "FREELANCER" ? "Autónomo" : tech.type === "COMPANY" ? "Empresa" : "Empleado"}
                          </Badge>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            isAssigned
                              ? "bg-violet-500 border-violet-500"
                              : "border-muted-foreground/40"
                          )}>
                            {isAssigned && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {assignedTechs.length} técnico{assignedTechs.length !== 1 ? "s" : ""} asignado{assignedTechs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setAddTechDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: añadir / editar línea */}
      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-violet-500" />
              {editingLine ? "Editar precio de línea" : "Añadir producto / servicio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Selección de producto (solo en modo crear) */}
            {!editingLine ? (
              <div className="space-y-2">
                <Label className="text-xs">Producto / Servicio *</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      if (selectedProduct) setSelectedProduct(null);
                    }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-2 rounded-md bg-violet-500/10 border border-violet-500/30 text-sm">
                    <div>
                      <span className="font-medium">{selectedProduct.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{selectedProduct.sku}</span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => { setSelectedProduct(null); setLineForm((p) => ({ ...p, product_id: "" })); }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : catalogSearch ? (
                  <div className="rounded-md border border-border overflow-hidden max-h-48 overflow-y-auto">
                    {catalogLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : filteredCatalog.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Sin resultados</p>
                    ) : (
                      filteredCatalog.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm flex items-center justify-between gap-2 border-b border-border last:border-0"
                          onClick={() => {
                            setSelectedProduct(p);
                            setLineForm((prev) => ({
                              ...prev,
                              product_id: p.id,
                              unit_price: prev.unit_price || String(p.sale_price ?? ""),
                            }));
                            setCatalogSearch(p.name);
                          }}
                        >
                          <span>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 font-mono">{p.sku}</span>
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {p.product_type === "SERVICE" ? "Servicio" : p.product_type === "BUNDLE" ? "Pack" : "Producto"}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-2 rounded-md bg-muted/30 border border-border text-sm">
                <span className="font-medium">{editingLine.product_name}</span>
                <span className="text-xs text-muted-foreground ml-2 font-mono">{editingLine.product_sku}</span>
              </div>
            )}

            {/* Precio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Precio acordado (€) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={lineForm.unit_price}
                onChange={(e) => setLineForm((p) => ({ ...p, unit_price: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notas internas</Label>
              <Input
                placeholder="Condiciones especiales, observaciones..."
                value={lineForm.notes}
                onChange={(e) => setLineForm((p) => ({ ...p, notes: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLineDialogOpen(false)}
              disabled={savingLine}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveLine}
              disabled={
                savingLine ||
                (!editingLine && !lineForm.product_id) ||
                !lineForm.unit_price
              }
              className="gap-2"
            >
              {savingLine && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingLine ? "Actualizar" : "Añadir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateCardDetailPage;
