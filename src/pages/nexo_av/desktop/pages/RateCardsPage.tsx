import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tag, Plus, Loader2, Star, Users, AlertTriangle, ChevronRight } from "lucide-react";

interface RateCard {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  lines_count: number;
  technicians_count: number;
  created_at: string;
}

const RateCardsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [dbReady, setDbReady] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_default: false });

  const MOCK_RATE_CARDS: RateCard[] = [
    {
      id: "mock-1",
      name: "Tarifa Estándar AV TECH 2026",
      description: "Condiciones económicas base: jornadas, horas extra, desplazamiento y dietas. Revisión anual en enero.",
      is_default: true,
      is_active: true,
      lines_count: 7,
      technicians_count: 0,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_rate_cards" as any);
      if (error) {
        // DB no lista — usar mock para revisión UI
        setRateCards(MOCK_RATE_CARDS);
        setDbReady(true);
      } else {
        setRateCards((data as RateCard[])?.length ? (data as RateCard[]) : MOCK_RATE_CARDS);
        setDbReady(true);
      }
    } catch (err) {
      setRateCards(MOCK_RATE_CARDS);
      setDbReady(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      setCreating(true);
      const { error } = await supabase.rpc("create_rate_card" as any, {
        p_name: form.name.trim(),
        p_description: form.description.trim() || null,
        p_is_default: form.is_default,
      });
      if (error) {
        // Mock: simular creación hasta que exista la migración
        const newCard: RateCard = {
          id: `mock-${Date.now()}`,
          name: form.name.trim(),
          description: form.description.trim() || null,
          is_default: form.is_default,
          is_active: true,
          lines_count: 0,
          technicians_count: 0,
          created_at: new Date().toISOString(),
        };
        setRateCards((prev) => [...prev, newCard]);
      } else {
        load();
      }
      toast({ title: "Tarifa creada", description: form.name });
      setCreateOpen(false);
      setForm({ name: "", description: "", is_default: false });
    } catch (err: any) {
      toast({
        title: "Error al crear",
        description: err?.message || "No se pudo crear la tarifa",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <Tag className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Tarifas</h1>
            <p className="text-xs text-muted-foreground">
              Tarifas estándar de AV TECH para técnicos externos
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={!dbReady}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nueva Tarifa
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !dbReady ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-1">Migración pendiente</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              El módulo de tarifas requiere aplicar la migración{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                technician_rates
              </code>{" "}
              en Supabase antes de poder usarse.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Ejecuta el archivo SQL de migración correspondiente y recarga la página.
          </p>
        </div>
      ) : rateCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-full">
            <Tag className="h-8 w-8 text-violet-500/50" />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-1">Sin tarifas definidas</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crea la primera tarifa estándar para asignarla a técnicos y controlar los precios que pagamos.
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Crear primera tarifa
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Descripción
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Líneas
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Técnicos
                </th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rateCards.map((rc) => (
                <tr
                  key={rc.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/nexo-av/${userId}/tarifas/${rc.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rc.name}</span>
                      {rc.is_default && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-amber-500 border-amber-500/30 bg-amber-500/10"
                        >
                          <Star className="h-2.5 w-2.5 fill-amber-500" />
                          Por defecto
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {rc.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {rc.lines_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {rc.technicians_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={
                        rc.is_active
                          ? "text-[10px] text-green-500 border-green-500/30 bg-green-500/10"
                          : "text-[10px] text-gray-400 border-gray-500/30 bg-gray-500/10"
                      }
                    >
                      {rc.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: crear tarifa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-violet-500" />
              Nueva Tarifa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input
                placeholder="Ej. Tarifa Estándar 2026"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Descripción opcional..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="text-sm resize-none"
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Marcar como tarifa por defecto</span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || !form.name.trim()}
              className="gap-2"
            >
              {creating && <Loader2 className="h-3 w-3 animate-spin" />}
              Crear Tarifa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateCardsPage;
