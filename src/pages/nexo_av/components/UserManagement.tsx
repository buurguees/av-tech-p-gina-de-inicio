import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { validatePassword } from "@/hooks/usePasswordValidation";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Loader2,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  X,
  Check,
  RefreshCw,
  Mail,
  Send,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuthorizedUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  department: string;
  position: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  setup_completed: boolean;
  roles: string[];
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  invitation_days_remaining: number | null;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
}

const DEPARTMENTS = [
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'ADMIN', label: 'Administración' },
  { value: 'DIRECTION', label: 'Dirección' },
];

const UserManagement = () => {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthorizedUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    department: "COMMERCIAL",
    position: "",
    password: "",
    selectedRoles: [] as string[],
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list-roles' }
      });

      if (error) throw error;
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || formData.selectedRoles.length === 0) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, introduce el email y selecciona al menos un rol.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.endsWith('@avtechesdeveniments.com')) {
      toast({
        title: "Email inválido",
        description: "El email debe ser del dominio @avtechesdeveniments.com",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user info for invitation name
      const { data: currentUserInfo } = await supabase.rpc('get_current_user_info');
      const invitedByName = currentUserInfo?.[0]?.full_name || 'Administrador';

      // Send invitation via edge function
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: formData.email,
          role: formData.selectedRoles[0],
          invitedByName: invitedByName
        }
      });

      if (error) throw error;

      toast({
        title: "Invitación enviada",
        description: `Se ha enviado un email de invitación a ${formData.email}`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la invitación.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (user: AuthorizedUser) => {
    setIsSubmitting(true);
    try {
      const { data: currentUserInfo } = await supabase.rpc('get_current_user_info');
      const invitedByName = currentUserInfo?.[0]?.full_name || 'Administrador';
      const userRole = user.roles?.[0] || 'viewer';

      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: user.email,
          role: userRole,
          invitedByName: invitedByName,
          resend: true
        }
      });

      if (error) throw error;

      toast({
        title: "Invitación reenviada",
        description: `Se ha reenviado el email de invitación a ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo reenviar la invitación.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'update',
          userId: selectedUser.id,
          userData: {
            full_name: formData.full_name,
            phone: formData.phone || null,
            department: formData.department,
            position: formData.position || null,
            is_active: selectedUser.is_active,
            roles: formData.selectedRoles,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Usuario actualizado",
        description: `Los datos de ${selectedUser.email} han sido actualizados.`,
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'delete',
          userId: selectedUser.id,
        }
      });

      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: `El usuario ${selectedUser.email} ha sido eliminado.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !formData.password) return;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Contraseña no válida",
        description: passwordValidation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'reset-password',
          userId: selectedUser.id,
          newPassword: formData.password,
        }
      });

      if (error) throw error;

      toast({
        title: "Contraseña restablecida",
        description: `La contraseña de ${selectedUser.email} ha sido actualizada.`,
      });

      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo restablecer la contraseña.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: AuthorizedUser) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'toggle-status',
          userId: user.id,
          isActive: !user.is_active,
        }
      });

      if (error) throw error;

      toast({
        title: user.is_active ? "Usuario desactivado" : "Usuario activado",
        description: `El usuario ${user.email} ha sido ${user.is_active ? 'desactivado' : 'activado'}.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado del usuario.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      phone: "",
      department: "COMMERCIAL",
      position: "",
      password: "",
      selectedRoles: [],
    });
    setSelectedUser(null);
  };

  const openEditDialog = (user: AuthorizedUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || "",
      department: user.department,
      position: user.position || "",
      password: "",
      selectedRoles: user.roles || [],
    });
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'manager': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'sales': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'tech': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'viewer': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'invited': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getDepartmentLabel = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gestión de Usuarios
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Administra los usuarios autorizados del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-white text-black hover:bg-white/90"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Usuario</TableHead>
              <TableHead className="text-white/60">Contacto</TableHead>
              <TableHead className="text-white/60">Departamento</TableHead>
              <TableHead className="text-white/60">Roles</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">{user.full_name}</p>
                      <p className="text-white/50 text-sm">{user.email}</p>
                      {user.position && (
                        <p className="text-white/40 text-xs mt-0.5">{user.position}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {user.phone ? (
                        <p className="text-white/70 text-sm">{user.phone}</p>
                      ) : (
                        <p className="text-white/30 text-sm italic">Sin teléfono</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-white/70">{getDepartmentLabel(user.department)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {!user.setup_completed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs cursor-help"
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Invitado
                                {user.invitation_days_remaining !== null && (
                                  <span className="ml-1 flex items-center">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {user.invitation_days_remaining}d
                                  </span>
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="bg-zinc-900 border-white/20 text-white p-3 max-w-xs"
                            >
                              <div className="space-y-1.5 text-xs">
                                {user.invitation_sent_at && (
                                  <p className="text-white/70">
                                    <span className="text-white/50">Enviada:</span>{' '}
                                    {format(new Date(user.invitation_sent_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                                  </p>
                                )}
                                {user.invitation_expires_at && (
                                  <p className="text-white/70">
                                    <span className="text-white/50">Expira:</span>{' '}
                                    {format(new Date(user.invitation_expires_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                                  </p>
                                )}
                                {user.invitation_days_remaining !== null && (
                                  <p className={`font-medium ${user.invitation_days_remaining <= 1 ? 'text-red-400' : user.invitation_days_remaining <= 3 ? 'text-amber-400' : 'text-green-400'}`}>
                                    {user.invitation_days_remaining === 0 
                                      ? '⚠️ Expira hoy' 
                                      : user.invitation_days_remaining === 1 
                                        ? '⚠️ Expira mañana'
                                        : `${user.invitation_days_remaining} días restantes`}
                                  </p>
                                )}
                                {!user.invitation_sent_at && (
                                  <p className="text-white/50 italic">Sin información de invitación</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        user.roles?.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={`${getRoleBadgeColor(role)} text-xs`}
                          >
                            {role}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleUserStatus(user)}
                      className="flex items-center gap-1.5"
                    >
                      {user.is_active ? (
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                          <X className="h-3 w-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Resend invitation button - only for pending users */}
                      {!user.setup_completed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResendInvitation(user)}
                          disabled={isSubmitting}
                          className="h-8 w-8 text-white/50 hover:text-amber-400 hover:bg-amber-500/10"
                          title="Reenviar invitación"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                        className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsResetPasswordDialogOpen(true);
                        }}
                        className="h-8 w-8 text-white/50 hover:text-amber-400 hover:bg-amber-500/10"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-white/40">No se encontraron usuarios</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog - Simplified for invitations */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitar Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Se enviará un email de invitación para que el usuario configure su cuenta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Email *</Label>
              <Input
                type="email"
                placeholder="usuario@avtechesdeveniments.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Rol *</Label>
              <Select
                value={formData.selectedRoles[0] || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedRoles: [value] }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name} className="text-white">
                      <div className="flex items-center gap-2">
                        {role.name === 'admin' && <ShieldCheck className="h-4 w-4 text-red-400" />}
                        {role.name === 'manager' && <Shield className="h-4 w-4 text-purple-400" />}
                        {role.name === 'sales' && <UserCog className="h-4 w-4 text-blue-400" />}
                        {role.name === 'tech' && <UserCog className="h-4 w-4 text-green-400" />}
                        {role.name === 'viewer' && <UserCog className="h-4 w-4 text-gray-400" />}
                        <span className="capitalize">{role.display_name || role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <p className="text-white/70 text-sm font-medium">¿Qué sucederá?</p>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• Se enviará un email de invitación al usuario</li>
                <li>• El usuario configurará su propia contraseña</li>
                <li>• Deberá completar su perfil antes de acceder</li>
                <li>• El enlace expira en 7 días</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isSubmitting || !formData.email || formData.selectedRoles.length === 0}
              className="bg-white text-black hover:bg-white/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Email</Label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-white/5 border-white/10 text-white/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Nombre completo *</Label>
              <Input
                placeholder="Nombre y apellidos"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Teléfono</Label>
                <Input
                  placeholder="+34 600 000 000"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Departamento</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value} className="text-white">
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Cargo</Label>
              <Input
                placeholder="Director, Técnico, etc."
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        selectedRoles: prev.selectedRoles.includes(role.name)
                          ? prev.selectedRoles.filter(r => r !== role.name)
                          : [...prev.selectedRoles, role.name]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      formData.selectedRoles.includes(role.name)
                        ? getRoleBadgeColor(role.name)
                        : 'border-white/10 text-white/40 hover:border-white/30'
                    }`}
                  >
                    {role.display_name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-white/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Restablecer Contraseña
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Establece una nueva contraseña para {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Nueva contraseña *</Label>
              <Input
                type="password"
                placeholder="Mínimo 12 caracteres con mayúsculas, números y símbolos"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              {formData.password && (
                <PasswordStrengthIndicator 
                  validation={validatePassword(formData.password)} 
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetPasswordDialogOpen(false);
                setFormData(prev => ({ ...prev, password: '' }));
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isSubmitting || !formData.password}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                'Restablecer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5" />
              Eliminar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              ¿Estás seguro de que quieres eliminar al usuario{' '}
              <span className="text-white font-medium">{selectedUser?.email}</span>?
              <br /><br />
              Esta acción no se puede deshacer. El usuario perderá acceso al sistema inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Usuario'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
