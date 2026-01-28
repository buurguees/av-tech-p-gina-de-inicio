/**
 * MobileEditClientPage - Página para editar cliente en móvil
 * VERSIÓN: 1.0 - Formulario completo con carga de datos y actualización
 */
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ChevronLeft,
  Building2,
  MapPin,
  FileText,
  Users,
  Briefcase,
  Save,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  { value: 'NEW', label: 'Nuevo Lead', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
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

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

// Componente SectionCard reutilizable
const SectionCard = ({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

const MobileEditClientPage = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Tú");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form state - Información Básica
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [industrySector, setIndustrySector] = useState("");

  // Form state - Dirección Fiscal
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingProvince, setBillingProvince] = useState("");
  const [billingCountry, setBillingCountry] = useState("España");
  const [website, setWebsite] = useState("");

  // Form state - Redes Sociales
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Form state - Gestión Comercial
  const [leadStage, setLeadStage] = useState("NEW");
  const [leadSource, setLeadSource] = useState("");
  const [urgency, setUrgency] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  // Form state - Información Adicional
  const [notes, setNotes] = useState("");

  // Get stage info
  const stageInfo = useMemo(() => getStageInfo(leadStage), [leadStage]);

  // Convert assignable users to select options
  const assignableUserOptions = useMemo(() => {
    return assignableUsers.map((user) => ({
      value: user.id,
      label: user.full_name,
    }));
  }, [assignableUsers]);

  // Cargar datos del cliente
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_client', {
          p_client_id: clientId
        });

        if (error) throw error;
        if (!data || data.length === 0) {
          toast({
            title: "Error",
            description: "Cliente no encontrado",
            variant: "destructive",
          });
          navigate(`/nexo-av/${userId}/clients`);
          return;
        }

        const client = data[0];
        
        // Prellenar todos los campos
        setCompanyName(client.company_name || "");
        setLegalName(client.legal_name || "");
        setContactEmail(client.contact_email || "");
        setContactPhone(client.contact_phone || "");
        setTaxId(client.tax_id || "");
        setIndustrySector(client.industry_sector || "");
        setBillingAddress(client.billing_address || "");
        setBillingPostalCode(client.billing_postal_code || "");
        setBillingCity(client.billing_city || "");
        setBillingProvince(client.billing_province || "");
        setBillingCountry(client.billing_country || "España");
        setWebsite(client.website || "");
        setInstagramHandle(client.instagram_handle || "");
        setTiktokHandle(client.tiktok_handle || "");
        setLinkedinUrl(client.linkedin_url || "");
        setLeadStage(client.lead_stage || "NEW");
        setLeadSource(client.lead_source || "");
        setUrgency(client.urgency || "");
        setAssignedTo(client.assigned_to || "");
        setNotes(client.notes || "");
      } catch (error: any) {
        console.error('Error fetching client:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar el cliente",
          variant: "destructive",
        });
        navigate(`/nexo-av/${userId}/clients`);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, userId, navigate, toast]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoadingUsers(true);
        const { data, error } = await supabase.rpc('get_current_user_info');

        if (error || !data || data.length === 0) {
          console.error('Error fetching user info:', error);
          return;
        }

        const currentUserInfo = data[0];
        setCurrentUserId(currentUserInfo.user_id);
        setCurrentUserName(currentUserInfo.full_name || "Tú");
        const userIsAdmin = currentUserInfo.roles?.includes('admin') || false;
        setIsAdmin(userIsAdmin);
      } catch (err) {
        console.error('Error fetching user info:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      
      try {
        const { data } = await supabase.rpc('list_assignable_users');
        if (data) setAssignableUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleSubmit = async () => {
    if (!clientId) return;

    // Validación
    if (!companyName.trim()) {
      toast({ 
        title: "Error", 
        description: "El nombre de empresa es obligatorio.", 
        variant: "destructive" 
      });
      return;
    }

    if (!contactEmail.trim()) {
      toast({ 
        title: "Error", 
        description: "El email es obligatorio.", 
        variant: "destructive" 
      });
      return;
    }

    if (!contactPhone.trim()) {
      toast({ 
        title: "Error", 
        description: "El teléfono es obligatorio.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setSaving(true);
      const sanitize = (val: string): string | null => val && val.trim() ? val.trim() : null;

      // Determinar assigned_to (solo admins pueden cambiarlo)
      let assignedToValue: string | null | undefined = undefined;
      if (isAdmin) {
        assignedToValue = assignedTo || null;
      }

      // Actualizar el cliente
      const { error } = await supabase.rpc('update_client', {
        p_client_id: clientId,
        p_company_name: companyName.trim().toUpperCase(),
        p_contact_email: sanitize(contactEmail),
        p_contact_phone: sanitize(contactPhone),
        p_lead_stage: leadStage || 'NEW',
        p_lead_source: sanitize(leadSource),
        p_industry_sector: sanitize(industrySector),
        p_urgency: sanitize(urgency),
        p_tax_id: sanitize(taxId),
        p_legal_name: sanitize(legalName),
        p_billing_address: sanitize(billingAddress),
        p_billing_city: sanitize(billingCity),
        p_billing_province: sanitize(billingProvince),
        p_billing_postal_code: sanitize(billingPostalCode),
        p_billing_country: sanitize(billingCountry),
        p_website: sanitize(website),
        p_notes: sanitize(notes),
        p_instagram_handle: sanitize(instagramHandle),
        p_tiktok_handle: sanitize(tiktokHandle),
        p_linkedin_url: sanitize(linkedinUrl),
        p_assigned_to: assignedToValue,
      });

      if (error) throw error;

      toast({ 
        title: "Cliente actualizado", 
        description: "Los datos del cliente se han actualizado correctamente." 
      });
      
      // Navegar de vuelta al detalle del cliente
      navigate(`/nexo-av/${userId}/clients/${clientId}`);
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({ 
        title: "Error al actualizar cliente", 
        description: error.message || "No se pudo actualizar el cliente.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/clients/${clientId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              Editar Cliente
            </h1>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:scale-95 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-primary/20"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== FORMULARIO ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-[80px]">
        <div className="px-4 py-4 space-y-4">
          {/* ===== SECCIÓN: INFORMACIÓN BÁSICA ===== */}
          <SectionCard title="Información Básica" icon={Building2}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Nombre de Empresa <span className="text-destructive">*</span>
                </Label>
                <Input 
                  placeholder="Nombre comercial" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Razón Social
                </Label>
                <Input 
                  placeholder="Razón social legal" 
                  value={legalName} 
                  onChange={(e) => setLegalName(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    type="email"
                    placeholder="email@empresa.com" 
                    value={contactEmail} 
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Teléfono <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    type="tel"
                    placeholder="+34 600 000 000" 
                    value={contactPhone} 
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    NIF/CIF
                  </Label>
                  <Input 
                    placeholder="B12345678" 
                    value={taxId} 
                    onChange={(e) => setTaxId(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Sector
                  </Label>
                  <Select 
                    value={industrySector}
                    onValueChange={setIndustrySector}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_SECTORS.map(sector => (
                        <SelectItem key={sector.value} value={sector.value}>
                          {sector.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: DIRECCIÓN FISCAL ===== */}
          <SectionCard title="Dirección Fiscal" icon={MapPin}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Dirección
                </Label>
                <Input 
                  placeholder="Calle, número, ciudad, código postal" 
                  value={billingAddress} 
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Código Postal
                  </Label>
                  <Input 
                    placeholder="08001" 
                    value={billingPostalCode} 
                    onChange={(e) => setBillingPostalCode(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Ciudad
                  </Label>
                  <Input 
                    placeholder="Barcelona" 
                    value={billingCity} 
                    onChange={(e) => setBillingCity(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Provincia
                  </Label>
                  <Input 
                    placeholder="Barcelona" 
                    value={billingProvince} 
                    onChange={(e) => setBillingProvince(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    País
                  </Label>
                  <Input 
                    placeholder="España" 
                    value={billingCountry} 
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Página Web
                </Label>
                <Input 
                  type="url"
                  placeholder="https://ejemplo.com" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: REDES SOCIALES ===== */}
          <SectionCard title="Redes Sociales" icon={Share2}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Instagram
                  </Label>
                  <Input 
                    placeholder="@usuario" 
                    value={instagramHandle} 
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    TikTok
                  </Label>
                  <Input 
                    placeholder="@usuario" 
                    value={tiktokHandle} 
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  LinkedIn
                </Label>
                <Input 
                  placeholder="https://linkedin.com/company/..." 
                  value={linkedinUrl} 
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: GESTIÓN COMERCIAL ===== */}
          <SectionCard title="Gestión Comercial" icon={Briefcase}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Estado <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={leadStage}
                    onValueChange={setLeadStage}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STAGES.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leadStage && (
                    <div className="pt-1">
                      <Badge 
                        variant="outline" 
                        className={cn(stageInfo.color, "text-xs px-2 py-0.5")}
                      >
                        {stageInfo.label}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Origen
                  </Label>
                  <Select 
                    value={leadSource}
                    onValueChange={setLeadSource}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="¿Cómo nos encontró?" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Urgencia
                </Label>
                <Select 
                  value={urgency}
                  onValueChange={setUrgency}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar urgencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Asignar a
                  </Label>
                  <Select 
                    value={assignedTo || undefined}
                    onValueChange={(value) => setAssignedTo(value || "")}
                    disabled={loadingUsers}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingUsers ? "Cargando..." : "Sin asignar"} />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUserOptions.map(user => (
                        <SelectItem key={user.value} value={user.value}>
                          {user.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Asignado a
                  </Label>
                  <Input 
                    value={currentUserName}
                    disabled
                    className="bg-muted border-border text-muted-foreground"
                  />
                </div>
              )}
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: INFORMACIÓN ADICIONAL ===== */}
          <SectionCard title="Información Adicional" icon={FileText}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Notas
                </Label>
                <Textarea 
                  placeholder="Información adicional sobre el cliente o lead..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="bg-card border-border resize-none"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default MobileEditClientPage;
