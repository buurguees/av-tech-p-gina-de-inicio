import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Loader2 } from "lucide-react";

interface CreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    province: "",
    payment_terms: "",
    status: "ACTIVE",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_supplier", {
        p_company_name: formData.company_name.trim(),
        p_tax_id: formData.tax_id.trim() || null,
        p_contact_email: formData.contact_email.trim() || null,
        p_contact_phone: formData.contact_phone.trim() || null,
        p_city: formData.city.trim() || null,
        p_province: formData.province.trim() || null,
        p_payment_terms: formData.payment_terms.trim() || null,
      });

      if (error) throw error;

      const result = data?.[0];
      toast.success(`Proveedor ${result?.supplier_number || ""} creado correctamente`);
      
      // Reset form
      setFormData({
        company_name: "",
        tax_id: "",
        contact_email: "",
        contact_phone: "",
        city: "",
        province: "",
        payment_terms: "",
        status: "ACTIVE",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Error creating supplier:", err);
      toast.error(err.message || "Error al crear el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Añade un nuevo proveedor de suministros o servicios externos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información básica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="company_name">Nombre de la empresa *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="tax_id">NIF / CIF</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleChange("tax_id", e.target.value.toUpperCase())}
                  placeholder="12345678A"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Datos de contacto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Madrid"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  placeholder="Madrid"
                />
              </div>
            </div>
          </div>

          {/* Facturación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Facturación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="payment_terms">Condiciones de pago</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleChange("payment_terms", e.target.value)}
                  placeholder="30 días, transferencia..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
