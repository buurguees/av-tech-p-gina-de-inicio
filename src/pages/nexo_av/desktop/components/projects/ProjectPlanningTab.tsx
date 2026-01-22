import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Package,
  Truck,
  Wrench,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  CalendarPlus,
} from "lucide-react";

interface ProjectPlanningTabProps {
  projectId: string;
}

interface PlanningDate {
  id: string;
  type: string;
  label: string;
  date: string | null;
  icon: React.ReactNode;
  color: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  type: 'client' | 'project' | 'technician';
}

const DATE_TYPES = [
  { type: 'PREPARATION', label: 'Preparación de Material', icon: <Package className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { type: 'SHIPPING', label: 'Envío', icon: <Truck className="h-4 w-4" />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { type: 'INSTALLATION', label: 'Instalación', icon: <Wrench className="h-4 w-4" />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { type: 'DELIVERY', label: 'Entrega Final', icon: <Calendar className="h-4 w-4" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

const CONTACT_TYPES = [
  { value: 'client', label: 'Cliente', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'project', label: 'Proyecto', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'technician', label: 'Técnico', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

const getContactTypeInfo = (type: string) => {
  return CONTACT_TYPES.find(c => c.value === type) || CONTACT_TYPES[0];
};

const ProjectPlanningTab = ({ projectId }: ProjectPlanningTabProps) => {
  // Planning dates state
  const [planningDates, setPlanningDates] = useState<PlanningDate[]>(
    DATE_TYPES.map((dt, index) => ({
      id: `date-${index}`,
      type: dt.type,
      label: dt.label,
      date: null,
      icon: dt.icon,
      color: dt.color,
    }))
  );
  const [customDates, setCustomDates] = useState<PlanningDate[]>([]);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    role: '',
    phone: '',
    email: '',
    type: 'client',
  });

  // Custom date state
  const [isAddingCustomDate, setIsAddingCustomDate] = useState(false);
  const [newCustomDate, setNewCustomDate] = useState({ label: '', date: '' });

  const handleDateChange = (id: string, date: string) => {
    setPlanningDates(prev => 
      prev.map(pd => pd.id === id ? { ...pd, date } : pd)
    );
    setEditingDateId(null);
    // TODO: Save to database
  };

  const handleCustomDateChange = (id: string, date: string) => {
    setCustomDates(prev => 
      prev.map(pd => pd.id === id ? { ...pd, date } : pd)
    );
    setEditingDateId(null);
    // TODO: Save to database
  };

  const handleAddCustomDate = () => {
    if (!newCustomDate.label) return;
    
    const newDate: PlanningDate = {
      id: `custom-${Date.now()}`,
      type: 'CUSTOM',
      label: newCustomDate.label,
      date: newCustomDate.date || null,
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    
    setCustomDates(prev => [...prev, newDate]);
    setNewCustomDate({ label: '', date: '' });
    setIsAddingCustomDate(false);
    // TODO: Save to database
  };

  const handleAddContact = () => {
    if (!newContact.name) return;
    
    const contact: Contact = {
      id: `contact-${Date.now()}`,
      name: newContact.name || '',
      role: newContact.role || '',
      phone: newContact.phone || '',
      email: newContact.email || '',
      type: (newContact.type as 'client' | 'project' | 'technician') || 'client',
    };
    
    setContacts(prev => [...prev, contact]);
    setNewContact({ name: '', role: '', phone: '', email: '', type: 'client' });
    setIsAddingContact(false);
    // TODO: Save to database
  };

  const handleRemoveContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    // TODO: Delete from database
  };

  const handleRemoveCustomDate = (id: string) => {
    setCustomDates(prev => prev.filter(d => d.id !== id));
    // TODO: Delete from database
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin asignar';
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full">
      {/* Header - Estilo DashboardView */}
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Planificación</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona fechas clave y contactos del proyecto</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Planning Dates Section */}
        <Card className="bg-white/50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-3 pt-4 px-4">
            <CardTitle className="text-foreground text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fechas Clave
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-medium"
              onClick={() => setIsAddingCustomDate(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
              Añadir Fecha
            </Button>
          </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Default planning dates */}
            {planningDates.map((pd) => (
              <div
                key={pd.id}
                className="bg-white/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${pd.color.split(' ')[0]}`}>
                      {pd.icon}
                    </div>
                    <span className="text-foreground font-medium text-sm">{pd.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() => setEditingDateId(pd.id)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {editingDateId === pd.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      defaultValue={pd.date || ''}
                      className="bg-background border-slate-200 dark:border-slate-700 text-foreground h-9"
                      onChange={(e) => handleDateChange(pd.id, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDateId(null)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className={`text-sm ${pd.date ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {formatDate(pd.date)}
                  </p>
                )}
              </div>
            ))}

            {/* Custom dates */}
            {customDates.map((pd) => (
              <div
                key={pd.id}
                className="bg-white/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${pd.color.split(' ')[0]}`}>
                      {pd.icon}
                    </div>
                    <span className="text-foreground font-medium text-sm">{pd.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingDateId(pd.id)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleRemoveCustomDate(pd.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {editingDateId === pd.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      defaultValue={pd.date || ''}
                      className="bg-background border-slate-200 dark:border-slate-700 text-foreground h-9"
                      onChange={(e) => handleCustomDateChange(pd.id, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDateId(null)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className={`text-sm ${pd.date ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {formatDate(pd.date)}
                  </p>
                )}
              </div>
            ))}

            {/* Add custom date form */}
            {isAddingCustomDate && (
              <div className="bg-white/50 dark:bg-slate-900/30 border border-dashed border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Nombre de la fecha</Label>
                    <Input
                      placeholder="Ej: Revisión técnica"
                      value={newCustomDate.label}
                      onChange={(e) => setNewCustomDate(prev => ({ ...prev, label: e.target.value }))}
                      className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Fecha</Label>
                    <Input
                      type="date"
                      value={newCustomDate.date}
                      onChange={(e) => setNewCustomDate(prev => ({ ...prev, date: e.target.value }))}
                      className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handleAddCustomDate}
                      disabled={!newCustomDate.label}
                      className="bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCustomDate(false);
                        setNewCustomDate({ label: '', date: '' });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Contacts Section */}
        <Card className="bg-white/50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-3 pt-4 px-4">
            <CardTitle className="text-foreground text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Contactos del Proyecto
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-medium"
              onClick={() => setIsAddingContact(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Añadir Contacto
            </Button>
          </CardHeader>
        <CardContent className="p-4">
          {contacts.length === 0 && !isAddingContact ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No hay contactos asignados</p>
              <Button
                variant="link"
                className="text-primary hover:text-primary/80"
                onClick={() => setIsAddingContact(true)}
              >
                Añadir el primer contacto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contact list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contacts.map((contact) => {
                  const typeInfo = getContactTypeInfo(contact.type);
                  return (
                    <div
                      key={contact.id}
                      className="bg-white/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-foreground font-medium text-sm">{contact.name}</h4>
                          <p className="text-muted-foreground text-xs">{contact.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${typeInfo.color} border text-xs`}>
                            {typeInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-500 hover:bg-red-500/10 h-7 w-7 p-0"
                            onClick={() => handleRemoveContact(contact.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add contact form */}
              {isAddingContact && (
                <div className="bg-white/50 dark:bg-slate-900/30 border border-dashed border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4">
                  <h4 className="text-foreground font-medium mb-4 text-sm">Nuevo Contacto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Nombre *</Label>
                      <Input
                        placeholder="Nombre completo"
                        value={newContact.name}
                        onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Rol / Cargo</Label>
                      <Input
                        placeholder="Ej: Responsable de obra"
                        value={newContact.role}
                        onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                        className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Tipo</Label>
                      <select
                        value={newContact.type}
                        onChange={(e) => setNewContact(prev => ({ ...prev, type: e.target.value as 'client' | 'project' | 'technician' }))}
                        className="w-full mt-1 bg-background border border-slate-200 dark:border-slate-700 text-foreground rounded-md px-3 py-2 text-sm h-9"
                      >
                        {CONTACT_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Teléfono</Label>
                      <Input
                        placeholder="+34 600 000 000"
                        value={newContact.phone}
                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <Input
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={newContact.email}
                        onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-background border-slate-200 dark:border-slate-700 text-foreground mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        onClick={handleAddContact}
                        disabled={!newContact.name}
                        className="bg-primary text-primary-foreground hover:opacity-90"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsAddingContact(false);
                          setNewContact({ name: '', role: '', phone: '', email: '', type: 'client' });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectPlanningTab;