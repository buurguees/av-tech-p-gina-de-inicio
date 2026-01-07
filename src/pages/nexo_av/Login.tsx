import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NexoLoadingScreen from "./components/NexoLoadingScreen";

// Rate limiting configuration
const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";

interface RateLimitResponse {
  allowed: boolean;
  remaining_attempts: number;
  retry_after_seconds: number;
  message: string | null;
}

const NexoLogo = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 1000 1000"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-20 h-20"
  >
    <path d="M750 743.902L506.098 500H590.779L750 659.045V743.902Z" fill="white" />
    <path d="M506.098 500L750 256.098V340.779L590.955 500H506.098Z" fill="white" />
    <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="white" />
    <path d="M743.902 250L500 493.902V409.221L659.045 250H743.902Z" fill="white" />
    <path d="M500 506.098L743.902 750H659.221L500 590.955V506.098Z" fill="white" />
    <path d="M256.098 750L500 506.098V590.779L340.955 750H256.098Z" fill="white" />
    <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="white" />
    <path d="M493.902 500L250 743.902V659.221L409.045 500H493.902Z" fill="white" />
  </svg>
);

const Login = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retryAfter <= 0) return;
    
    const timer = setInterval(() => {
      setRetryAfter(prev => {
        if (prev <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  // Check rate limit before submitting
  const checkRateLimit = async (emailToCheck: string): Promise<RateLimitResponse | null> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', email: emailToCheck }),
      });
      
      if (!response.ok) {
        console.error('Rate limit check failed');
        return null;
      }
      
      return await response.json();
    } catch (err) {
      console.error('Rate limit check error:', err);
      return null;
    }
  };

  // Record login attempt
  const recordAttempt = async (emailToRecord: string, success: boolean) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record', email: emailToRecord, success }),
      });
    } catch (err) {
      console.error('Record attempt error:', err);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user info to get the user_id for the URL
        const { data: userInfo } = await supabase.rpc('get_current_user_info');
        
        if (userInfo && userInfo.length > 0) {
          navigate(`/nexo-av/${userInfo[0].user_id}/dashboard`, { replace: true });
        } else {
          // User is logged in but not in authorized_users
          await supabase.auth.signOut();
        }
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Defer Supabase call to prevent deadlock
          setTimeout(async () => {
            const { data: userInfo } = await supabase.rpc('get_current_user_info');
            
            if (userInfo && userInfo.length > 0) {
              navigate(`/nexo-av/${userInfo[0].user_id}/dashboard`, { replace: true });
            } else {
              await supabase.auth.signOut();
              setError('Tu email no está autorizado para acceder a esta plataforma.');
            }
          }, 0);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Generic error message to prevent user enumeration
    const GENERIC_AUTH_ERROR = 'Credenciales incorrectas o usuario no autorizado.';

    try {
      // Validate email domain first (this is public knowledge, not enumeration)
      if (!email.endsWith('@avtechesdeveniments.com')) {
        setError('Solo se permite el acceso con emails corporativos (@avtechesdeveniments.com)');
        setIsSubmitting(false);
        return;
      }

      // Check rate limit BEFORE attempting login
      const rateLimitCheck = await checkRateLimit(email);
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        setIsRateLimited(true);
        setRetryAfter(rateLimitCheck.retry_after_seconds);
        setError(rateLimitCheck.message || 'Demasiados intentos. Por favor espera unos minutos.');
        setIsSubmitting(false);
        return;
      }
      
      // Update remaining attempts
      if (rateLimitCheck) {
        setRemainingAttempts(rateLimitCheck.remaining_attempts);
      }

      // Attempt to sign in FIRST - don't check authorization before login
      // This prevents user enumeration attacks
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Record failed attempt
        await recordAttempt(email, false);
        
        // Update remaining attempts
        const newCheck = await checkRateLimit(email);
        if (newCheck) {
          setRemainingAttempts(newCheck.remaining_attempts);
          if (!newCheck.allowed) {
            setIsRateLimited(true);
            setRetryAfter(newCheck.retry_after_seconds);
            setError(newCheck.message || 'Demasiados intentos. Por favor espera unos minutos.');
            setIsSubmitting(false);
            return;
          }
        }
        
        // Always show generic error to prevent enumeration
        setError(GENERIC_AUTH_ERROR);
        setIsSubmitting(false);
        return;
      }

      // AFTER successful auth, verify the user is authorized
      if (data.session) {
        const { data: userInfo, error: userInfoError } = await supabase.rpc('get_current_user_info');
        
        if (userInfoError || !userInfo || userInfo.length === 0) {
          // User authenticated but not authorized - sign them out
          await supabase.auth.signOut();
          // Record as failed (unauthorized)
          await recordAttempt(email, false);
          setError(GENERIC_AUTH_ERROR);
          setIsSubmitting(false);
          return;
        }

        // Record successful login
        await recordAttempt(email, true);
        
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente.",
        });
        // Navigation will be handled by onAuthStateChange
      }
    } catch (err) {
      // Don't log error details in production
      setError(GENERIC_AUTH_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <NexoLoadingScreen onLoadingComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <NexoLogo />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mt-6 tracking-wider"
          >
            NEXO AV
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/50 text-sm mt-2"
          >
            Plataforma de gestión interna
          </motion.p>
        </div>

        {/* Rate limit warning */}
        {isRateLimited && retryAfter > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3"
          >
            <Clock className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 text-sm font-medium">Cuenta bloqueada temporalmente</p>
              <p className="text-orange-400/70 text-sm">
                Podrás intentarlo de nuevo en {Math.floor(retryAfter / 60)}:{(retryAfter % 60).toString().padStart(2, '0')} minutos
              </p>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && !isRateLimited && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm">{error}</p>
              {remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts <= 3 && (
                <p className="text-red-400/70 text-xs mt-1">
                  {remainingAttempts} intento{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Formulario */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70 text-sm">
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                id="email"
                type="email"
                placeholder="example@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 h-12 disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70 text-sm">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 h-12 disabled:opacity-50"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isRateLimited}
            className="w-full h-12 bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : isRateLimited ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Bloqueado temporalmente
              </>
            ) : (
              'Iniciar sesión'
            )}
          </Button>

          <p className="text-center text-white/30 text-xs mt-8">
            ¿Problemas para acceder? Contacta con el administrador
          </p>
        </motion.form>
      </motion.div>

      {/* Decoración de fondo */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Login;
