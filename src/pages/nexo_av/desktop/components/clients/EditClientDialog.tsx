import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FormDialog, { FormField, FormSection } from "../common/FormDialog";
import { DetailActionType } from "../navigation/DetailActionButton";

const LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Sitio Web' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Referido' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'TRADE_SHOW', label: 'Feria' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'OTHER', label: 'Otro' },
];

const INDUSTRY_SECTORS = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'HOSPITALITY', label: 'Hostelería' },
  { value: 'GYM', label: 'Gimnasio' },
  { value: 'OFFICE', label: 'Oficina' },
  { value: 'EVENTS', label: 'Eventos' },
  { value: 'EDUCATION', label: 'Educación' },
  { value: 'HEALTHCARE', label: 'Salud' },
  { value: 'DIGITAL_SIGNAGE', label: 'Cartelería Digital' },
  { value: 'OTHER', label: 'Otro' },
];

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo Lead' },
  { value: 'CONTACTED', label: 'Contactado' },
  { value: 'MEETING', label: 'Reunión Programada' },
  { value: 'PROPOSAL', label: 'Propuesta Enviada' },
  { value: 'NEGOTIATION', label: 'En Negociación' },
  { value: 'WON', label: 'Cliente (Ganado)' },
  { value: 'RECURRING', label: 'Recurrente' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'PAUSED', label: 'Pausado' },
];

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface ClientDetail {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  website: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  linkedin_url: string | null;
  industry_sector: string | null;
  approximate_budget: number | null;
  urgency: string | null;
  lead_stage: string;
  lead_source: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDetail;
  isAdmin: boolean;
  onSuccess: () => void;
}

const EditClientDialog = ({
  open,
  onOpenChange,
  client,
  isAdmin,
  onSuccess,
}: EditClientDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  // Fetch assignable users when dialog opens (only for admins)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase.rpc('list_assignable_users');
        if (data) setAssignableUsers(data);
      } catch (error) {
        console.error('Error fetching assignable users:', error);
      }
    };

    if (open && isAdmin) {
      fetchUsers();
    }
  }, [open, isAdmin]);

  // Convert assignable users to select options
  const assignableUserOptions = useMemo(() => {
    return assignableUsers.map((user) => ({
      value: user.id,
      label: `${user.full_name} (${user.department})`,
    }));
  }, [assignableUsers]);

  // Build form sections
  const formSections: FormSection[] = useMemo(() => {
    const sections: FormSection[] = [
      {
        title: "Información Básica",
        fields: [
          {
            name: "company_name",
            label: "Nombre de Empresa",
            type: "text",
            placeholder: "Nombre comercial",
            required: true,
            defaultValue: client.company_name || "",
            colSpan: 2,
          },
          {
            name: "legal_name",
            label: "Razón Social",
            type: "text",
            placeholder: "Razón social legal",
            defaultValue: client.legal_name || "",
            colSpan: 2,
          },
          {
            name: "contact_email",
            label: "Email",
            type: "email",
            placeholder: "email@empresa.com",
            required: true,
            defaultValue: client.contact_email || "",
            colSpan: 1,
          },
          {
            name: "contact_phone",
            label: "Teléfono",
            type: "tel",
            placeholder: "+34 600 000 000",
            required: true,
            defaultValue: client.contact_phone || "",
            colSpan: 1,
          },
          {
            name: "tax_id",
            label: "NIF/CIF",
            type: "text",
            placeholder: "B12345678",
            defaultValue: client.tax_id || "",
            colSpan: 1,
          },
          {
            name: "industry_sector",
            label: "Sector",
            type: "select",
            placeholder: "Seleccionar sector",
            options: INDUSTRY_SECTORS,
            defaultValue: client.industry_sector || "",
            colSpan: 1,
          },
        ],
      },
      {
        title: "Dirección Fiscal",
        fields: [
          {
            name: "billing_address",
            label: "Dirección",
            type: "text",
            placeholder: "C/ Ejemplo, 123",
            defaultValue: client.billing_address || "",
            colSpan: 2,
          },
          {
            name: "billing_postal_code",
            label: "Código Postal",
            type: "text",
            placeholder: "08001",
            defaultValue: client.billing_postal_code || "",
            colSpan: 1,
          },
          {
            name: "billing_city",
            label: "Ciudad",
            type: "text",
            placeholder: "Barcelona",
            defaultValue: client.billing_city || "",
            colSpan: 1,
          },
          {
            name: "billing_province",
            label: "Provincia",
            type: "text",
            placeholder: "Barcelona",
            defaultValue: client.billing_province || "",
            colSpan: 1,
          },
          {
            name: "billing_country",
            label: "País",
            type: "text",
            placeholder: "España",
            defaultValue: client.billing_country || "España",
            colSpan: 1,
          },
          {
            name: "website",
            label: "Página Web",
            type: "text",
            placeholder: "https://ejemplo.com",
            defaultValue: client.website || "",
            colSpan: 2,
          },
        ],
      },
      {
        title: "Redes Sociales",
        fields: [
          {
            name: "instagram_handle",
            label: "Instagram",
            type: "text",
            placeholder: "@usuario",
            defaultValue: client.instagram_handle || "",
            colSpan: 1,
          },
          {
            name: "tiktok_handle",
            label: "TikTok",
            type: "text",
            placeholder: "@usuario",
            defaultValue: client.tiktok_handle || "",
            colSpan: 1,
          },
          {
            name: "linkedin_url",
            label: "LinkedIn",
            type: "text",
            placeholder: "https://linkedin.com/company/...",
            defaultValue: client.linkedin_url || "",
            colSpan: 2,
          },
        ],
      },
      {
        title: "Gestión Comercial",
        fields: [
          {
            name: "lead_stage",
            label: "Estado",
            type: "select",
            placeholder: "Seleccionar estado",
            options: LEAD_STAGES,
            defaultValue: client.lead_stage || "NEW",
            required: true,
            colSpan: 1,
          },
          {
            name: "lead_source",
            label: "Origen",
            type: "select",
            placeholder: "¿Cómo nos encontró?",
            options: LEAD_SOURCES,
            defaultValue: client.lead_source || "",
            colSpan: 1,
          },
          {
            name: "urgency",
            label: "Urgencia",
            type: "select",
            placeholder: "Seleccionar urgencia",
            options: URGENCY_LEVELS,
            defaultValue: client.urgency || "",
            colSpan: 1,
          },
          ...(isAdmin ? [
            {
              name: "assigned_to",
              label: "Asignar a",
              type: "select" as const,
              placeholder: "Sin asignar",
              options: assignableUserOptions,
              defaultValue: client.assigned_to || "",
              colSpan: 1 as const,
            },
            {
              name: "created_at",
              label: "Fecha de Alta",
              type: "date" as const,
              defaultValue: client.created_at ? new Date(client.created_at).toISOString().split('T')[0] : "",
              colSpan: 1 as const,
            },
          ] : []),
        ],
      },
      {
        title: "Información Adicional",
        fields: [
          {
            name: "notes",
            label: "Notas",
            type: "textarea",
            placeholder: "Información adicional sobre el cliente...",
            rows: 3,
            defaultValue: client.notes || "",
            colSpan: 2,
          },
        ],
      },
    ];

    return sections;
  }, [client, isAdmin, assignableUserOptions]);

  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_client', {
        p_client_id: client.id,
        p_company_name: data.company_name.toUpperCase(),
        p_contact_email: data.contact_email,
        p_contact_phone: data.contact_phone,
        p_lead_stage: data.lead_stage || 'NEW',
        p_lead_source: data.lead_source || null,
        p_industry_sector: data.industry_sector || null,
        p_urgency: data.urgency || null,
        p_tax_id: data.tax_id || null,
        p_legal_name: data.legal_name || null,
        p_billing_address: data.billing_address || null,
        p_billing_city: data.billing_city || null,
        p_billing_province: data.billing_province || null,
        p_billing_postal_code: data.billing_postal_code || null,
        p_billing_country: data.billing_country || null,
        p_website: data.website || null,
        p_notes: data.notes || null,
        p_instagram_handle: data.instagram_handle || null,
        p_tiktok_handle: data.tiktok_handle || null,
        p_linkedin_url: data.linkedin_url || null,
        p_assigned_to: isAdmin && data.assigned_to ? data.assigned_to : undefined,
        p_created_at: isAdmin && data.created_at ? new Date(data.created_at).toISOString() : undefined,
      });

      if (error) throw error;

      toast({
        title: "Cliente actualizado",
        description: "Los datos del cliente se han actualizado correctamente",
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error updating client:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      title="Editar Cliente"
      description="Modifica la información del cliente"
      sections={formSections}
      submitLabel="Guardar Cambios"
      cancelLabel="Cancelar"
      loading={loading}
      size="lg"
      submitActionType="edit"
      useCustomSubmitButton={true}
      twoColumnLayout={true}
      defaultValues={{
        company_name: client.company_name || "",
        legal_name: client.legal_name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        tax_id: client.tax_id || "",
        industry_sector: client.industry_sector || "",
        billing_address: client.billing_address || "",
        billing_postal_code: client.billing_postal_code || "",
        billing_city: client.billing_city || "",
        billing_province: client.billing_province || "",
        billing_country: client.billing_country || "España",
        website: client.website || "",
        instagram_handle: client.instagram_handle || "",
        tiktok_handle: client.tiktok_handle || "",
        linkedin_url: client.linkedin_url || "",
        lead_stage: client.lead_stage || "NEW",
        lead_source: client.lead_source || "",
        urgency: client.urgency || "",
        assigned_to: client.assigned_to || "",
        notes: client.notes || "",
        created_at: client.created_at ? new Date(client.created_at).toISOString().split('T')[0] : "",
      }}
    />
  );
};

export default EditClientDialog;
