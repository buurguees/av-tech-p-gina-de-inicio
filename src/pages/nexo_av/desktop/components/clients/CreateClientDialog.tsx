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
  { value: 'NEGOTIATION', label: 'En Negociación' },
  { value: 'WON', label: 'Ganado' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'RECURRING', label: 'Recurrente' },
];

interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

export interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  enableGeocoding?: boolean; // Si es true, geocodifica la dirección y guarda coordenadas
}

const CreateClientDialog = ({
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
  isAdmin,
  enableGeocoding = false,
}: CreateClientDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("Tú");

  // Fetch assignable users and current user info when dialog opens
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Get current user info
        if (currentUserId) {
          const { data: userInfo } = await supabase.rpc('get_current_user_info');
          if (userInfo && userInfo.length > 0) {
            setCurrentUserName(userInfo[0].full_name || "Tú");
          }
        }

        // Fetch assignable users (for admins)
        const { data } = await supabase.rpc('list_assignable_users');
        if (data) setAssignableUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (open) {
      fetchUsers();
    }
  }, [open, currentUserId]);


  // Geocode address function
  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      // Delay de 1 segundo para cumplir con rate limiting de Nominatim
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=es&limit=1`,
        {
          headers: {
            'User-Agent': 'NexoAV-LeadMap/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (data.length === 0) {
        return null;
      }

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Convert assignable users to select options
  const assignableUserOptions = useMemo(() => {
    return assignableUsers.map((user) => ({
      value: user.id,
      label: user.full_name,
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
            colSpan: 2,
          },
          {
            name: "legal_name",
            label: "Razón Social",
            type: "text",
            placeholder: "Razón social legal",
            colSpan: 2,
          },
          {
            name: "contact_email",
            label: "Email",
            type: "email",
            placeholder: "email@empresa.com",
            required: true,
            colSpan: 1,
          },
          {
            name: "contact_phone",
            label: "Teléfono",
            type: "tel",
            placeholder: "+34 600 000 000",
            required: true,
            colSpan: 1,
          },
          {
            name: "tax_id",
            label: "NIF/CIF",
            type: "text",
            placeholder: "B12345678",
            colSpan: 1,
          },
          {
            name: "industry_sector",
            label: "Sector",
            type: "select",
            placeholder: "Seleccionar sector",
            options: INDUSTRY_SECTORS,
            colSpan: 1,
          },
        ],
      },
      {
        title: "Dirección Fiscal",
        fields: [
          {
            name: "billing_address",
            label: enableGeocoding ? "Dirección completa *" : "Dirección",
            type: "text",
            placeholder: enableGeocoding ? "Calle, número, ciudad, código postal" : "C/ Ejemplo, 123",
            required: enableGeocoding,
            colSpan: 2,
          },
          {
            name: "billing_postal_code",
            label: "Código Postal",
            type: "text",
            placeholder: "08001",
            colSpan: 1,
          },
          {
            name: "billing_city",
            label: "Ciudad",
            type: "text",
            placeholder: "Barcelona",
            colSpan: 1,
          },
          {
            name: "billing_province",
            label: "Provincia",
            type: "text",
            placeholder: "Barcelona",
            colSpan: 1,
          },
          {
            name: "billing_country",
            label: "País",
            type: "text",
            placeholder: "España",
            defaultValue: "España",
            colSpan: 1,
          },
          {
            name: "website",
            label: "Página Web",
            type: "text",
            placeholder: "https://ejemplo.com",
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
            defaultValue: "NEGOTIATION",
            required: true,
            colSpan: 1,
          },
          {
            name: "lead_source",
            label: "Origen",
            type: "select",
            placeholder: "¿Cómo nos encontró?",
            options: LEAD_SOURCES,
            colSpan: 1,
          },
          {
            name: "assigned_to",
            label: isAdmin ? "Asignar a" : "Asignar a (automático)",
            type: isAdmin ? "select" : "text",
            placeholder: isAdmin ? "Sin asignar" : currentUserName,
            options: isAdmin ? assignableUserOptions : undefined,
            defaultValue: isAdmin ? undefined : currentUserName,
            disabled: !isAdmin,
            colSpan: 1,
          },
        ],
      },
      {
        title: "Información Adicional",
        fields: [
          {
            name: "notes",
            label: "Notas",
            type: "textarea",
            placeholder: "Información adicional sobre el cliente o lead...",
            rows: 3,
            colSpan: 2,
          },
        ],
      },
    ];

    return sections;
  }, [isAdmin, assignableUserOptions, currentUserId, enableGeocoding]);

  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      // If enableGeocoding is true, geocode the address first
      let coords: { lat: number; lon: number } | null = null;
      if (enableGeocoding && data.billing_address) {
        coords = await geocodeAddress(data.billing_address);
        if (!coords) {
          toast({
            title: "Error",
            description: "No se pudo encontrar la dirección. Verifica que sea correcta.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // First create the client. The RPC returns a UUID if successful.
      // Auto-assign to current user if lead_source is COMMERCIAL
      let assignedTo: string | null = null;
      if (data.lead_source === 'COMMERCIAL' && currentUserId) {
        assignedTo = currentUserId;
      } else if (!isAdmin && currentUserId) {
        // If not admin, always assign to current user
        assignedTo = currentUserId;
      } else {
        // Admin can assign to anyone or leave unassigned
        assignedTo = data.assigned_to || null;
      }

      const { data: clientResult, error: createError } = await supabase.rpc('create_client', {
        p_company_name: data.company_name.toUpperCase(),
        p_contact_phone: data.contact_phone,
        p_contact_email: data.contact_email,
        p_lead_stage: data.lead_stage || 'NEGOTIATION',
        p_lead_source: data.lead_source || null,
        p_industry_sector: data.industry_sector || null,
        p_tax_id: data.tax_id || null,
        p_legal_name: data.legal_name || null,
        p_notes: data.notes || null,
        p_assigned_to: assignedTo,
        p_created_by: currentUserId || null,
      });

      if (createError) throw createError;

      // The RPC returns a scalar string (UUID), not an array of objects
      let clientId: string | undefined;

      if (typeof clientResult === 'string') {
        clientId = clientResult;
      } else if (Array.isArray(clientResult) && clientResult.length > 0) {
        clientId = typeof clientResult[0] === 'object' ? clientResult[0]?.client_id : clientResult[0];
      }

      // Then update with billing address and website if provided
      const hasBillingData = data.billing_address || data.billing_city || data.billing_postal_code || data.billing_province || data.billing_country || data.website;

      if (clientId && hasBillingData) {
        const { error: updateError } = await supabase.rpc('update_client', {
          p_client_id: clientId,
          p_company_name: data.company_name.toUpperCase(),
          p_billing_address: data.billing_address || null,
          p_billing_city: data.billing_city || null,
          p_billing_postal_code: data.billing_postal_code || null,
          p_billing_province: data.billing_province || null,
          p_billing_country: data.billing_country || null,
          p_website: data.website || null,
        });

        if (updateError) {
          console.warn('Could not update billing address:', updateError);
        }
      }

      // If geocoding was successful, update coordinates
      if (clientId && coords && enableGeocoding && data.billing_address) {
        const { error: coordError } = await supabase.rpc('update_client_coordinates', {
          p_client_id: clientId,
          p_latitude: coords.lat,
          p_longitude: coords.lon,
          p_full_address: data.billing_address
        });

        if (coordError) {
          console.warn('Could not update coordinates:', coordError);
        }
      }

      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating client:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo crear el cliente",
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
      title="Nuevo Cliente / Lead"
      description={enableGeocoding ? "La dirección se geocodificará automáticamente para mostrarla en el mapa" : undefined}
      sections={formSections}
      submitLabel="Crear Cliente"
      cancelLabel="Cancelar"
      loading={loading}
      size="lg"
      twoColumnLayout={true}
    />
  );
};

export default CreateClientDialog;
