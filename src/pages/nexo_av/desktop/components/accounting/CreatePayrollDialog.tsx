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

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
}

interface CreatePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePayrollDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePayrollDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    employee_id: "",
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    gross_amount: "",
    irpf_rate: "19.00",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase.rpc("list_employees", {
        p_status: "ACTIVE",
      });

      if (error) throw error;
      setEmployees((data || []).map((item: any) => ({
        id: item.id,
        employee_number: item.employee_number,
        full_name: item.full_name,
      })));
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Error",
        description: "Error al cargar empleados",
        variant: "destructive",
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_payroll_run", {
        p_employee_id: formData.employee_id,
        p_period_year: formData.period_year,
        p_period_month: formData.period_month,
        p_gross_amount: parseFloat(formData.gross_amount),
        p_irpf_rate: parseFloat(formData.irpf_rate),
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Nómina creada",
        description: "La nómina se ha creado correctamente en estado DRAFT",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating payroll:", error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la nómina",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
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
          <DialogTitle>Nueva Nómina de Empleado</DialogTitle>
          <DialogDescription>
            Crea una nueva nómina en estado DRAFT. Podrás postearla después para generar el asiento contable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee_id">
                Empleado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                disabled={loadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={loading || !formData.employee_id || !formData.gross_amount}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Nómina"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
