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
import { TECHNICIAN_TYPES, TECHNICIAN_STATUSES, TECHNICIAN_SPECIALTIES, SPANISH_PROVINCES } from "@/constants/technicianConstants";

interface Technician {
  id: string;
  technician_number: string;
  type: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_phone_secondary: string | null;
  contact_email: string | null;
  billing_email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  specialties: string[];
  hourly_rate: number | null;
  daily_rate: number | null;
  iban: string | null;
  payment_terms: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
}

interface EditTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician;
  onSuccess: () => void;
}

export default function EditTechnicianDialog({
  open,
  onOpenChange,
  technician,
  onSuccess,
}: EditTechnicianDialogProps) {
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
    status: "ACTIVE",
    rating: "",
    notes: "",
  });

  useEffect(() => {
    if (technician && open) {
      setFormData({
        company_name: technician.company_name || "",
        type: technician.type || "FREELANCER",
        legal_name: technician.legal_name || "",
        tax_id: technician.tax_id || "",
        contact_name: technician.contact_name || "",
        contact_phone: technician.contact_phone || "",
        contact_phone_secondary: technician.contact_phone_secondary || "",
        contact_email: technician.contact_email || "",
        billing_email: technician.billing_email || "",
        address: technician.address || "",
        city: technician.city || "",
        province: technician.province || "",
        postal_code: technician.postal_code || "",
        specialties: technician.specialties || [],
        hourly_rate: technician.hourly_rate?.toString() || "",
        daily_rate: technician.daily_rate?.toString() || "",
        iban: technician.iban || "",
        payment_terms: technician.payment_terms || "",
        status: technician.status || "ACTIVE",
        rating: technician.rating?.toString() || "",
        notes: technician.notes || "",
      });
    }
  }, [technician, open]);

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
      const { error } = await supabase.rpc("update_technician", {
        p_technician_id: technician.id,
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
        p_status: formData.status,
        p_rating: formData.rating && formData.rating !== "" ? parseInt(formData.rating) : null,
        p_notes: formData.notes.trim() || null,
      });

      if (error) throw error;

      toast.success("Técnico actualizado correctamente");
      onSuccess();
    } catch (err: any) {
      console.error("Error updating technician:", err);
      toast.error(err.message || "Error al actualizar el técnico");
    } finally {
      setLoading(false);
    }
  };

  if (!technician) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Técnico</DialogTitle>
          <DialogDescription>
            Modifica los datos del técnico {technician.technician_number || ""}.
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
                  required
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="type">Tipo</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TECHNICIAN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("type", type.value)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        formData.type === type.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:bg-muted/70"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNICIAN_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="rating">Valoración (1-5)</Label>
                <Select value={formData.rating || "none"} onValueChange={(v) => handleChange("rating", v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin valoración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin valoración</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {"⭐".repeat(r)} ({r})
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
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="tax_id">NIF / CIF</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleChange("tax_id", e.target.value.toUpperCase())}
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
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_phone_secondary">Teléfono secundario</Label>
                <Input
                  id="contact_phone_secondary"
                  type="tel"
                  value={formData.contact_phone_secondary}
                  onChange={(e) => handleChange("contact_phone_secondary", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="billing_email">Email de facturación</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => handleChange("billing_email", e.target.value)}
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
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
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
                    id={`edit-specialty-${specialty.value}`}
                    checked={formData.specialties.includes(specialty.value)}
                    onCheckedChange={() => handleSpecialtyToggle(specialty.value)}
                  />
                  <Label htmlFor={`edit-specialty-${specialty.value}`} className="text-sm cursor-pointer">
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
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => handleChange("iban", e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="payment_terms">Condiciones de pago</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleChange("payment_terms", e.target.value)}
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
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
