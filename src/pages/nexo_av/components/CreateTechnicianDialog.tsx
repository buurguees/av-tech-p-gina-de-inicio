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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { TECHNICIAN_TYPES, TECHNICIAN_SPECIALTIES, SPANISH_PROVINCES } from "@/constants/technicianConstants";

interface CreateTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateTechnicianDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTechnicianDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    type: "FREELANCER",
    legal_name: "",
    tax_id: "",
    contact_name: "",
    contact_phone: "",
    contact_phone_secondary: "",
    contact_email: "",
    billing_email: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    specialties: [] as string[],
    hourly_rate: "",
    daily_rate: "",
    iban: "",
    payment_terms: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_technician", {
        p_company_name: formData.company_name.trim(),
        p_type: formData.type,
        p_legal_name: formData.legal_name.trim() || null,
        p_tax_id: formData.tax_id.trim() || null,
        p_contact_name: formData.contact_name.trim() || null,
        p_contact_phone: formData.contact_phone.trim() || null,
        p_contact_phone_secondary: formData.contact_phone_secondary.trim() || null,
        p_contact_email: formData.contact_email.trim() || null,
        p_billing_email: formData.billing_email.trim() || null,
        p_address: formData.address.trim() || null,
        p_city: formData.city.trim() || null,
        p_province: formData.province || null,
        p_postal_code: formData.postal_code.trim() || null,
        p_specialties: formData.specialties,
        p_hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        p_daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        p_iban: formData.iban.trim() || null,
        p_payment_terms: formData.payment_terms.trim() || null,
        p_notes: formData.notes.trim() || null,
      });

      if (error) throw error;

      const result = data?.[0];
      toast.success(`Técnico ${result?.technician_number || ""} creado correctamente`);
      
      // Reset form
      setFormData({
        company_name: "",
        type: "FREELANCER",
        legal_name: "",
        tax_id: "",
        contact_name: "",
        contact_phone: "",
        contact_phone_secondary: "",
        contact_email: "",
        billing_email: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        specialties: [],
        hourly_rate: "",
        daily_rate: "",
        iban: "",
        payment_terms: "",
        notes: "",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Error creating technician:", err);
      toast.error(err.message || "Error al crear el técnico");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Técnico</DialogTitle>
          <DialogDescription>
            Añade un nuevo técnico, empresa o autónomo colaborador.
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
                <Label htmlFor="company_name">Nombre / Empresa *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Nombre del técnico o empresa"
                  required
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNICIAN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="legal_name">Razón Social</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => handleChange("legal_name", e.target.value)}
                  placeholder="Razón social para facturación"
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
                <Label htmlFor="contact_name">Persona de contacto</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  placeholder="Nombre del contacto"
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
                <Label htmlFor="billing_email">Email de facturación</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => handleChange("billing_email", e.target.value)}
                  placeholder="facturacion@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Dirección
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Calle, número, piso..."
                />
              </div>
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
                <Select value={formData.province} onValueChange={(v) => handleChange("province", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPANISH_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  placeholder="28001"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Especialidades */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Especialidades
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TECHNICIAN_SPECIALTIES.map((specialty) => (
                <div key={specialty.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`specialty-${specialty.value}`}
                    checked={formData.specialties.includes(specialty.value)}
                    onCheckedChange={() => handleSpecialtyToggle(specialty.value)}
                  />
                  <Label htmlFor={`specialty-${specialty.value}`} className="text-sm cursor-pointer">
                    {specialty.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Tarifas y facturación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tarifas y facturación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="hourly_rate">Tarifa por hora (€)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange("hourly_rate", e.target.value)}
                  placeholder="25.00"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="daily_rate">Tarifa por día (€)</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.daily_rate}
                  onChange={(e) => handleChange("daily_rate", e.target.value)}
                  placeholder="200.00"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => handleChange("iban", e.target.value.toUpperCase())}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
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

          {/* Notas */}
          <div className="space-y-4">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Información adicional sobre el técnico..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Técnico
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
