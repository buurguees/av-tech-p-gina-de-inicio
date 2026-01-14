import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, User, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validatePassword } from "@/hooks/usePasswordValidation";
import PasswordStrengthIndicator from "./components/PasswordStrengthIndicator";
import whiteLogo from "./styles/logos/white_logo.svg";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";

const DEPARTMENTS = [
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'ADMIN', label: 'Administración' },
  { value: 'DIRECTION', label: 'Dirección' },
];

type SetupStep = 'loading' | 'password' | 'profile' | 'success' | 'error';

const AccountSetup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Apply dark theme for account setup
  useNexoAvTheme('dark');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [step, setStep] = useState<SetupStep>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('COMMERCIAL');
  const [position, setPosition] = useState('');

  // User info
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token, email]);

  const validateToken = async () => {
    if (!token || !email) {
      setStep('error');
      setErrorMessage('Enlace de invitación inválido. Falta el token o el email.');
      return;
    }

    try {
      // Validate token through edge function
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'validate-invitation',
          token: token,
          email: email
        }
      });

      if (error) {
        console.error('Token validation error:', error);
        // Continue to password step even if validation fails
        setStep('password');
        return;
      }

      if (data && !data.is_valid) {
        setStep('error');
        setErrorMessage(data.error_message || 'El enlace de invitación ha expirado o no es válido.');
        return;
      }

      if (data?.user_id) {
        setUserId(data.user_id);
      }

      setStep('password');
    } catch (error) {
      console.error('Validation error:', error);
      // Continue to password step even if validation fails
      setStep('password');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor, asegúrate de que ambas contraseñas sean idénticas.",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(password);
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
      // Sign in with the temporary password and update to new password
      // First, get user by email through admin function
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email!,
        password: password // Try with new password first (in case it's a retry)
      });

      if (signInError) {
        // If sign in fails, we need to update password through edge function
        const { data, error } = await supabase.functions.invoke('admin-users', {
          body: {
            action: 'setup-password',
            email: email,
            token: token,
            newPassword: password
          }
        });

        if (error) throw error;

        // Now sign in with new password
        const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
          email: email!,
          password: password
        });

        if (newSignInError) throw newSignInError;
      }

      // Get user info
      const { data: userInfo } = await supabase.rpc('get_current_user_info');
      if (userInfo && userInfo.length > 0) {
        setUserId(userInfo[0].user_id);
      }

      setStep('profile');
    } catch (error: any) {
      console.error('Password setup error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo configurar la contraseña.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre completo es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user info first
      const { data: userInfo } = await supabase.rpc('get_current_user_info');
      
      if (!userInfo || userInfo.length === 0) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      const currentUserId = userInfo[0].user_id;

      // Update profile through edge function
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'update_own_info',
          userId: currentUserId,
          full_name: fullName,
          phone: phone || null,
          department: department,
          position: position || null
        }
      });

      if (error) throw error;

      // Mark setup as complete by updating user metadata
      await supabase.auth.updateUser({
        data: { pending_setup: false }
      });

      setStep('success');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate(`/nexo-av/${currentUserId}/dashboard`);
      }, 2000);

    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto">
            <img 
              src={whiteLogo} 
              alt="NEXO AV Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-white/50 mx-auto" />
          <p className="text-white/50">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-white/10">
          <CardContent className="pt-8 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Enlace Inválido</h1>
            <p className="text-white/60">{errorMessage}</p>
            <Button
              onClick={() => navigate('/nexo-av')}
              className="bg-white text-black hover:bg-white/90"
            >
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-white/10">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">¡Cuenta Configurada!</h1>
            <p className="text-white/60">
              Tu cuenta ha sido configurada correctamente. Redirigiendo al panel...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-white/50 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto">
            <img 
              src={whiteLogo} 
              alt="NEXO AV Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-16 rounded-full ${step === 'password' ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-2 w-16 rounded-full ${step === 'profile' ? 'bg-white' : 'bg-white/30'}`} />
        </div>

        {step === 'password' && (
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Configura tu contraseña</CardTitle>
              <CardDescription className="text-white/50">
                Introduce una contraseña segura para tu cuenta
              </CardDescription>
              <div className="mt-2 flex items-center justify-center gap-2 text-white/40 text-sm">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 12 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <PasswordStrengthIndicator validation={validatePassword(password)} />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-400 text-xs">Las contraseñas no coinciden</p>
                  )}
                  {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Las contraseñas coinciden
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || password !== confirmPassword}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'profile' && (
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Completa tu perfil</CardTitle>
              <CardDescription className="text-white/50">
                Necesitamos algunos datos para identificarte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Nombre completo *</Label>
                  <Input
                    placeholder="Tu nombre y apellidos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Teléfono</Label>
                  <Input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Departamento</Label>
                  <Select value={department} onValueChange={setDepartment}>
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

                <div className="space-y-2">
                  <Label className="text-white/70">Cargo</Label>
                  <Input
                    placeholder="Director, Técnico, etc."
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !fullName.trim()}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Finalizar configuración'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountSetup;
