/**
 * MobileNewClientPage - Página para crear nuevo cliente en móvil
 * VERSIÓN: 1.0 - Formulario completo con misma lógica que desktop
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
  Globe
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
  { value: 'NEGOTIATION', label: 'En Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
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

const MobileNewClientPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
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

  // Form state - Gestión Comercial
  const [leadStage, setLeadStage] = useState("NEGOTIATION");
  const [leadSource, setLeadSource] = useState("");
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

        // Auto-assign to current user if not admin
        if (!userIsAdmin && currentUserInfo.user_id) {
          setAssignedTo(currentUserInfo.user_id);
        }
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
      setLoading(true);
      const sanitize = (val: string): string | null => val && val.trim() ? val.trim() : null;

      // Auto-assign logic (same as desktop)
      let assignedToValue: string | null = null;
      if (leadSource === 'COMMERCIAL' && currentUserId) {
        assignedToValue = currentUserId;
      } else if (!isAdmin && currentUserId) {
        // If not admin, always assign to current user
        assignedToValue = currentUserId;
      } else {
        // Admin can assign to anyone or leave unassigned
        assignedToValue = assignedTo || null;
      }

      // First create the client
      const { data: clientResult, error: createError } = await supabase.rpc('create_client', {
        p_company_name: companyName.trim().toUpperCase(),
        p_contact_phone: sanitize(contactPhone),
        p_contact_email: sanitize(contactEmail),
        p_lead_stage: leadStage || 'NEGOTIATION',
        p_lead_source: sanitize(leadSource),
        p_industry_sector: sanitize(industrySector),
        p_tax_id: sanitize(taxId),
        p_legal_name: sanitize(legalName),
        p_notes: sanitize(notes),
        p_assigned_to: assignedToValue,
        p_created_by: currentUserId || null,
      });

      if (createError) throw createError;

      // The RPC returns a UUID
      let clientId: string | undefined;
      if (typeof clientResult === 'string') {
        clientId = clientResult;
      } else if (Array.isArray(clientResult) && clientResult.length > 0) {
        clientId = typeof clientResult[0] === 'object' ? clientResult[0]?.client_id : clientResult[0];
      }

      // Then update with billing address and website if provided
      const hasBillingData = billingAddress || billingCity || billingPostalCode || billingProvince || billingCountry || website;

      if (clientId && hasBillingData) {
        const { error: updateError } = await supabase.rpc('update_client', {
          p_client_id: clientId,
          p_company_name: companyName.trim().toUpperCase(),
          p_billing_address: sanitize(billingAddress),
          p_billing_city: sanitize(billingCity),
          p_billing_postal_code: sanitize(billingPostalCode),
          p_billing_province: sanitize(billingProvince),
          p_billing_country: sanitize(billingCountry),
          p_website: sanitize(website),
        });

        if (updateError) {
          console.warn('Could not update billing address:', updateError);
        }
      }

      toast({ 
        title: "Cliente creado", 
        description: "El cliente se ha creado correctamente." 
      });
      
      // Navegar de vuelta a la lista de clientes
      navigate(`/nexo-av/${userId}/clients`);
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast({ 
        title: "Error al crear cliente", 
        description: error.message || "No se pudo crear el cliente.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/clients`);
  };

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
              Nuevo Cliente / Lead
            </h1>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
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
            {loading ? (
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
                    Asignar a (automático)
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

export default MobileNewClientPage;
