import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Key, Eye, EyeOff, Sun, Moon, Settings } from "lucide-react";
import { validatePassword } from "@/hooks/usePasswordValidation";
import PasswordStrengthIndicator from "../users/PasswordStrengthIndicator";
import DropDown, { DropDownOption } from "./DropDown";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import "../../styles/components/common/user-avatar.css";

interface UserAvatarProps {
  fullName: string;
  email: string;
  userId: string;
  phone?: string;
  position?: string;
  themePreference?: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export default function UserAvatar({
  fullName,
  email,
  userId,
  phone = '',
  position = '',
  themePreference = 'light',
  onLogout,
  onThemeChange
}: UserAvatarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(themePreference);
  
  const [editForm, setEditForm] = useState({
    full_name: fullName,
    phone: phone,
    position: position,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form when props change
  useEffect(() => {
    setEditForm({
      full_name: fullName,
      phone: phone,
      position: position,
    });
  }, [fullName, phone, position]);

  // Update theme when prop changes
  useEffect(() => {
    setCurrentTheme(themePreference);
  }, [themePreference]);

  // Get initials from full name (first letter of first name + first letter of first surname)
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-amber-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const initials = getInitials(fullName);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    
    if (onThemeChange) {
      onThemeChange(newTheme);
    }

    // Guardar en la base de datos
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session found");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      const requestBody = {
        action: 'update_own_info',
        userId: userId,
        theme_preference: newTheme,
      };

      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      toast({
        title: "Tema actualizado",
        description: `Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} guardado correctamente.`,
      });
    } catch (error: any) {
      console.error('Error saving theme preference:', error);
      toast({
        title: "Error al guardar tema",
        description: error.message || "No se pudo guardar la preferencia del tema. El cambio se aplicará solo en esta sesión.",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session found");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update_own_info',
            userId: userId,
            full_name: editForm.full_name,
            phone: editForm.phone,
            position: editForm.position,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error updating user info');
      }

      toast({
        title: "Información actualizada",
        description: "Tu información ha sido actualizada correctamente.",
      });

      setIsEditDialogOpen(false);
      setSelectedOption(undefined);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la información.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas nuevas no coinciden.",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Contraseña no válida",
        description: passwordValidation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        throw new Error("La contraseña actual es incorrecta.");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente.",
      });

      setIsPasswordDialogOpen(false);
      setSelectedOption(undefined);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar la contraseña.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dropdown option selection
  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
    
    switch (value) {
      case 'profile':
        setIsEditDialogOpen(true);
        break;
      case 'preferences':
        setIsPasswordDialogOpen(true);
        break;
      case 'theme':
        // Toggle theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        handleThemeChange(newTheme);
        break;
      case 'logout':
        onLogout();
        break;
    }
  };

  // Dropdown options
  const dropdownOptions: DropDownOption[] = [
    {
      value: 'profile',
      label: 'Mi perfil',
      icon: <User className="w-4 h-4" />,
    },
    {
      value: 'preferences',
      label: 'Preferencias',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      value: 'theme',
      label: currentTheme === 'light' ? 'Tema: Claro' : 'Tema: Oscuro',
      icon: (
        <div className="flex items-center gap-1">
          <Sun className={cn("w-4 h-4", currentTheme === 'light' ? "opacity-100" : "opacity-40")} />
          <Moon className={cn("w-4 h-4", currentTheme === 'dark' ? "opacity-100" : "opacity-40")} />
        </div>
      ),
    },
    {
      value: 'logout',
      label: 'Cerrar sesión',
      icon: <LogOut className="w-4 h-4" />,
      variant: 'destructive',
    },
  ];

  return (
    <>
      <DropDown
        options={dropdownOptions}
        value={selectedOption}
        onSelect={handleOptionSelect}
        align="end"
        trigger={
          <button 
            className="user-avatar__button"
            aria-label="Menú de usuario"
          >
            <span className={cn("user-avatar__initials", getAvatarColor(fullName))}>
              {initials}
            </span>
          </button>
        }
      />

      {/* Edit Info Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="user-avatar__dialog">
          <DialogHeader>
            <DialogTitle className="user-avatar__dialog-title">Editar información</DialogTitle>
            <DialogDescription className="user-avatar__dialog-description">
              Actualiza tu información personal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="user-avatar__form-fields">
              <div className="user-avatar__form-field">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="user-avatar__input"
                />
                <p className="user-avatar__field-hint">El email no se puede cambiar.</p>
              </div>
              <div className="user-avatar__form-field">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Tu nombre completo"
                  className="user-avatar__input"
                />
              </div>
              <div className="user-avatar__form-field">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                  className="user-avatar__input"
                />
              </div>
              <div className="user-avatar__form-field">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  placeholder="Tu cargo en la empresa"
                  className="user-avatar__input"
                />
              </div>
            </div>
            <DialogFooter className="user-avatar__dialog-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="user-avatar__button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="user-avatar__button-submit"
              >
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="user-avatar__dialog">
          <DialogHeader>
            <DialogTitle className="user-avatar__dialog-title">Cambiar contraseña</DialogTitle>
            <DialogDescription className="user-avatar__dialog-description">
              Introduce tu contraseña actual y la nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="user-avatar__form-fields">
              <div className="user-avatar__form-field">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <div className="user-avatar__password-wrapper">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="user-avatar__input user-avatar__input--password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="user-avatar__password-toggle"
                  >
                    {showCurrentPassword ? <EyeOff className="user-avatar__password-icon" /> : <Eye className="user-avatar__password-icon" />}
                  </button>
                </div>
              </div>
              <div className="user-avatar__form-field">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="user-avatar__password-wrapper">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="user-avatar__input user-avatar__input--password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="user-avatar__password-toggle"
                  >
                    {showNewPassword ? <EyeOff className="user-avatar__password-icon" /> : <Eye className="user-avatar__password-icon" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {passwordForm.newPassword && (
                  <PasswordStrengthIndicator 
                    validation={validatePassword(passwordForm.newPassword)} 
                  />
                )}
              </div>
              <div className="user-avatar__form-field">
                <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                <div className="user-avatar__password-wrapper">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="user-avatar__input user-avatar__input--password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="user-avatar__password-toggle"
                  >
                    {showConfirmPassword ? <EyeOff className="user-avatar__password-icon" /> : <Eye className="user-avatar__password-icon" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter className="user-avatar__dialog-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="user-avatar__button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="user-avatar__button-submit"
              >
                {isLoading ? "Cambiando..." : "Cambiar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
