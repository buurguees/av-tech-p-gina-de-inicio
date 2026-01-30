import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Loader2, Receipt, Percent, Banknote, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PayrollSettings {
  id: string;
  bonus_enabled: boolean;
  bonus_percent: number;
  bonus_cap_amount: number;
  min_profit_to_pay_bonus: number;
  bonus_reference_mode: string;
  bonus_requires_closed_period: boolean;
  default_irpf_rate: number | null;
  version: number;
}

interface PartnerProfile {
  partner_id: string;
  partner_number: string;
  partner_name: string;
  base_salary: number;
  irpf_rate: number;
  bonus_enabled_override: boolean | null;
  bonus_cap_override: number | null;
  updated_at: string | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val);

export function PayrollSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [profiles, setProfiles] = useState<PartnerProfile[]>([]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, profilesRes] = await Promise.all([
        supabase.rpc("get_payroll_settings"),
        (supabase.rpc as any)("list_partner_payroll_profiles", { p_status: "ACTIVE" }),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const settingsData = settingsRes.data;
      if (settingsData && settingsData.length > 0) {
        const s = settingsData[0];
        setSettings({
          id: s.id,
          bonus_enabled: s.bonus_enabled ?? true,
          bonus_percent: Number(s.bonus_percent ?? 10),
          bonus_cap_amount: Number(s.bonus_cap_amount ?? 600),
          min_profit_to_pay_bonus: Number(s.min_profit_to_pay_bonus ?? 0),
          bonus_reference_mode: s.bonus_reference_mode ?? "NET_PROFIT_PREV_MONTH",
          bonus_requires_closed_period: s.bonus_requires_closed_period ?? false,
          default_irpf_rate: s.default_irpf_rate != null ? Number(s.default_irpf_rate) : null,
          version: s.version ?? 1,
        });
      }

      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      console.error("Error fetching payroll settings:", error);
      toast.error(error.message || "Error al cargar la configuración de nóminas");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    if (!reason.trim()) {
      toast.error("Indica un motivo para el cambio (obligatorio por auditoría)");
      return;
    }

    setSavingSettings(true);
    try {
      const patch: Record<string, unknown> = {
        bonus_enabled: settings.bonus_enabled,
        bonus_percent: settings.bonus_percent,
        bonus_cap_amount: settings.bonus_cap_amount,
        min_profit_to_pay_bonus: settings.min_profit_to_pay_bonus,
        bonus_reference_mode: settings.bonus_reference_mode,
        bonus_requires_closed_period: settings.bonus_requires_closed_period,
      };
      if (settings.default_irpf_rate != null) {
        patch.default_irpf_rate = settings.default_irpf_rate;
      }

      const { error } = await (supabase.rpc as any)("admin_update_payroll_settings", {
        p_patch: patch,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
      setReason("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la configuración");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (profile: PartnerProfile) => {
    setSavingProfile(profile.partner_id);
    try {
      const { error } = await (supabase.rpc as any)("admin_upsert_partner_payroll_profile", {
        p_partner_id: profile.partner_id,
        p_base_salary: profile.base_salary,
        p_irpf_rate: profile.irpf_rate,
        p_bonus_enabled_override: profile.bonus_enabled_override,
        p_bonus_cap_override: profile.bonus_cap_override,
      });

      if (error) throw error;

      toast.success(`Perfil de ${profile.partner_name} guardado`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el perfil");
    } finally {
      setSavingProfile(null);
    }
  };

  const updateProfile = (partnerId: string, field: keyof PartnerProfile, value: unknown) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.partner_id === partnerId ? { ...p, [field]: value } : p
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuración global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Configuración global de pluses (% sobre beneficios)
          </CardTitle>
          <CardDescription>
            Se aplica a las retribuciones de socios. El plus se calcula sobre el beneficio neto del mes anterior (M-1).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Pluses habilitados</Label>
                  <p className="text-sm text-muted-foreground">
                    Si está activo, se añade un % del beneficio como plus a la retribución base
                  </p>
                </div>
                <Switch
                  checked={settings.bonus_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, bonus_enabled: v })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bonus_percent">
                    <Percent className="inline h-4 w-4 mr-1" />
                    % de plus sobre beneficio
                  </Label>
                  <Input
                    id="bonus_percent"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.bonus_percent}
                    onChange={(e) =>
                      setSettings({ ...settings, bonus_percent: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus_cap_amount">
                    <Banknote className="inline h-4 w-4 mr-1" />
                    Techo máximo del plus (€)
                  </Label>
                  <Input
                    id="bonus_cap_amount"
                    type="number"
                    min={0}
                    step={10}
                    value={settings.bonus_cap_amount}
                    onChange={(e) =>
                      setSettings({ ...settings, bonus_cap_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_profit">Beneficio mínimo para pagar plus (€)</Label>
                  <Input
                    id="min_profit"
                    type="number"
                    min={0}
                    step={100}
                    value={settings.min_profit_to_pay_bonus}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        min_profit_to_pay_bonus: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_irpf">IRPF por defecto (%)</Label>
                  <Input
                    id="default_irpf"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="19"
                    value={settings.default_irpf_rate ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSettings({
                        ...settings,
                        default_irpf_rate: v === "" ? null : parseFloat(v) || 19,
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Requiere M-1 cerrado
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Si está activo, no se generarán nóminas hasta que el mes anterior esté cerrado
                  </p>
                </div>
                <Switch
                  checked={settings.bonus_requires_closed_period}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, bonus_requires_closed_period: v })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo del cambio (obligatorio)</Label>
                <Input
                  id="reason"
                  placeholder="Ej: Ajuste anual de pluses"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <Save className="h-4 w-4 mr-2" />
                Guardar configuración global
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Perfiles por socio */}
      <Card>
        <CardHeader>
          <CardTitle>Sueldo base y ajustes por socio</CardTitle>
          <CardDescription>
            Configura el sueldo base, IRPF y opcionalmente el techo de plus para cada socio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              No hay socios activos. Los perfiles se crean al guardar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead className="text-right">Sueldo base (€)</TableHead>
                  <TableHead className="text-right">IRPF (%)</TableHead>
                  <TableHead className="text-right">Techo plus (€)</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.partner_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.partner_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {profile.partner_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        className="w-28 text-right"
                        value={profile.base_salary}
                        onChange={(e) =>
                          updateProfile(
                            profile.partner_id,
                            "base_salary",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        className="w-20 text-right"
                        value={profile.irpf_rate}
                        onChange={(e) =>
                          updateProfile(
                            profile.partner_id,
                            "irpf_rate",
                            parseFloat(e.target.value) || 19
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        className="w-28 text-right"
                        placeholder="Por defecto"
                        value={profile.bonus_cap_override ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateProfile(
                            profile.partner_id,
                            "bonus_cap_override",
                            v === "" ? null : parseFloat(v) || 0
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveProfile(profile)}
                        disabled={savingProfile === profile.partner_id}
                      >
                        {savingProfile === profile.partner_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
