import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  irpf_rate?: number;
  ss_regime?: string;
}

interface CreatePartnerCompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePartnerCompensationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePartnerCompensationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [formData, setFormData] = useState({
    partner_id: "",
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    gross_amount: "",
    irpf_rate: "19.00",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchPartners();
    }
  }, [open]);

  const fetchPartners = async () => {
    setLoadingPartners(true);
    try {
      // Obtener socios
      const { data: partnersData, error: partnersError } = await supabase.rpc("list_partners", {
        p_status: "ACTIVE",
      });

      if (partnersError) throw partnersError;

      // Obtener datos de trabajadores para el IRPF
      const { data: workersData } = await supabase.rpc("list_workers");
      
      // Combinar datos
      const enrichedPartners = (partnersData || []).map((partner: any) => {
        const linkedWorker = (workersData || []).find(
          (w: any) => w.linked_partner_id === partner.id
        );
        return {
          id: partner.id,
          partner_number: partner.partner_number,
          full_name: partner.full_name,
          irpf_rate: linkedWorker?.irpf_rate || 19,
          ss_regime: linkedWorker?.ss_regime || "RETA",
        };
      });
      
      setPartners(enrichedPartners);
    } catch (error: any) {
      console.error("Error fetching partners:", error);
      toast({
        title: "Error",
        description: "Error al cargar socios",
        variant: "destructive",
      });
    } finally {
      setLoadingPartners(false);
    }
  };

  // Auto-cargar IRPF cuando se selecciona un socio
  const handlePartnerChange = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    setFormData({
      ...formData,
      partner_id: partnerId,
      irpf_rate: (partner?.irpf_rate || 19).toFixed(2),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_partner_compensation_run", {
        p_partner_id: formData.partner_id,
        p_period_year: formData.period_year,
        p_period_month: formData.period_month,
        p_gross_amount: parseFloat(formData.gross_amount),
        p_irpf_rate: parseFloat(formData.irpf_rate),
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Retribución creada",
        description: "La retribución se ha creado correctamente en estado DRAFT",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating compensation:", error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la retribución",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partner_id: "",
      period_year: new Date().getFullYear(),
      period_month: new Date().getMonth() + 1,
      gross_amount: "",
      irpf_rate: "19.00",
      notes: "",
    });
  };

  const calculateNet = () => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const irpfRate = parseFloat(formData.irpf_rate) || 0;
    const irpf = gross * (irpfRate / 100);
    return gross - irpf;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Retribución de Socio/Administrador</DialogTitle>
          <DialogDescription>
            Crea una nueva retribución en estado DRAFT. Podrás postearla después para generar el asiento contable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partner_id">
                Socio/Administrador <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.partner_id}
                onValueChange={handlePartnerChange}
                disabled={loadingPartners}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un socio" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.partner_number} - {partner.full_name} ({partner.irpf_rate}% IRPF)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.partner_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  IRPF cargado automáticamente desde la ficha del socio
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="period_year">Año <span className="text-destructive">*</span></Label>
              <Input
                id="period_year"
                type="number"
                value={formData.period_year}
                onChange={(e) => setFormData({ ...formData, period_year: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="period_month">Mes <span className="text-destructive">*</span></Label>
              <Select
                value={formData.period_month.toString()}
                onValueChange={(value) => setFormData({ ...formData, period_month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gross_amount">
                Bruto (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gross_amount"
                type="number"
                step="0.01"
                value={formData.gross_amount}
                onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="irpf_rate">IRPF (%)</Label>
              <Input
                id="irpf_rate"
                type="number"
                step="0.01"
                value={formData.irpf_rate}
                onChange={(e) => setFormData({ ...formData, irpf_rate: e.target.value })}
              />
            </div>

            <div>
              <Label>Neto (€)</Label>
              <Input
                value={calculateNet().toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.partner_id || !formData.gross_amount}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Retribución"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
