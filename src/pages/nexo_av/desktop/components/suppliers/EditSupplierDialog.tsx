import React, { useState, useEffect } from "react";
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

interface SupplierDetail {
  id: string;
  supplier_number: string;
  company_name: string;
  tax_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  province: string | null;
  payment_terms: string | null;
  status: string;
}

interface EditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierDetail;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "BLOCKED", label: "Bloqueado" },
];

export default function EditSupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: EditSupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    payment_terms: "",
    status: "ACTIVE",
  });

  // Reset form when supplier changes
  useEffect(() => {
    if (open && supplier) {
      setFormData({
        company_name: supplier.company_name || "",
        tax_id: supplier.tax_id || "",
        contact_email: supplier.contact_email || "",
        contact_phone: supplier.contact_phone || "",
        address: "",
        postal_code: "",
        city: supplier.city || "",
        province: supplier.province || "",
        country: "España",
        payment_terms: supplier.payment_terms || "",
        status: supplier.status || "ACTIVE",
      });
    }
  }, [open, supplier]);

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
      const { error } = await supabase.rpc("update_supplier", {
        p_supplier_id: supplier.id,
        p_company_name: formData.company_name.trim(),
        p_tax_id: formData.tax_id.trim().toUpperCase() || null,
        p_contact_email: formData.contact_email.trim() || null,
        p_contact_phone: formData.contact_phone.trim() || null,
        p_address: formData.address.trim() || null,
        p_city: formData.city.trim() || null,
        p_province: formData.province.trim() || null,
        p_postal_code: formData.postal_code.trim() || null,
        p_country: formData.country.trim() || "España",
        p_payment_terms: formData.payment_terms.trim() || null,
        p_status: formData.status,
      });

      if (error) throw error;

      toast.success("Proveedor actualizado correctamente");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error updating supplier:", err);
      toast.error(err.message || "Error al actualizar el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Proveedor</DialogTitle>
          <DialogDescription>
            Modifica los datos del proveedor {supplier.supplier_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <Label htmlFor="company_name">
                  Nombre de la empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="tax_id">NIF / CIF</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleChange("tax_id", e.target.value.toUpperCase())}
                  placeholder="B12345678"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Dirección
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Dirección completa</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Calle, número, piso, puerta"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                    placeholder="08001"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Barcelona"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    placeholder="Barcelona"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    placeholder="España"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Datos de contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="col-span-1">
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

          {/* Facturación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Facturación
            </h3>
            <div>
              <Label htmlFor="payment_terms">Condiciones de pago</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => handleChange("payment_terms", e.target.value)}
                placeholder="30 días, transferencia..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
