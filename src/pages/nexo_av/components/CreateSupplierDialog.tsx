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
import { SUPPLIER_CATEGORIES } from "@/constants/supplierConstants";

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
    category: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    payment_terms: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.company_name.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    if (!formData.tax_id.trim()) {
      toast.error("El NIF/CIF es obligatorio");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("La dirección de facturación es obligatoria");
      return;
    }

    if (!formData.city.trim()) {
      toast.error("La ciudad es obligatoria");
      return;
    }

    if (!formData.postal_code.trim()) {
      toast.error("El código postal es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_supplier", {
        p_company_name: formData.company_name.trim(),
        p_tax_id: formData.tax_id.trim().toUpperCase(),
        p_category: formData.category || null,
        p_contact_email: formData.contact_email.trim() || null,
        p_contact_phone: formData.contact_phone.trim() || null,
        p_address: formData.address.trim(),
        p_city: formData.city.trim(),
        p_province: formData.province.trim() || null,
        p_postal_code: formData.postal_code.trim(),
        p_country: formData.country.trim() || "España",
        p_payment_terms: formData.payment_terms.trim() || null,
      });

      if (error) throw error;

      const result = data?.[0] || data;
      toast.success(`Proveedor ${result?.supplier_number || ""} creado correctamente`);
      
      // Reset form
      setFormData({
        company_name: "",
        category: "",
        tax_id: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        postal_code: "",
        city: "",
        province: "",
        country: "España",
        payment_terms: "",
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
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category || "none"} onValueChange={(value) => handleChange("category", value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {SUPPLIER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label htmlFor="tax_id">
                  NIF / CIF <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleChange("tax_id", e.target.value.toUpperCase())}
                  placeholder="B12345678"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dirección de facturación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Dirección de facturación <span className="text-destructive">*</span>
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">
                  Dirección completa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Calle, número, piso, puerta"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="postal_code">
                    Código Postal <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                    placeholder="08001"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="city">
                    Ciudad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Barcelona"
                    required
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
              Crear Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
