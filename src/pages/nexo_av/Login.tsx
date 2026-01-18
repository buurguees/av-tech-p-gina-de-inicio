import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, Clock, ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import NexoLoadingScreen from "./components/NexoLoadingScreen";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";
import whiteLogo from "./styles/logos/white_logo.svg";

// Configuration
const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";

const LAST_LOGIN_KEY = 'nexo_av_last_login';

interface RateLimitResponse {
  allowed: boolean;
  remaining_attempts: number;
  retry_after_seconds: number;
  message: string | null;
}

type LoginStep = 'credentials' | 'otp';

// Check if OTP can be skipped based on last login time (once per day)
const canSkipOtp = (email: string): boolean => {
  try {
    const stored = localStorage.getItem(LAST_LOGIN_KEY);
    if (!stored) return false;

    const { email: storedEmail, timestamp } = JSON.parse(stored);

    // Must be the same user
    if (storedEmail !== email.toLowerCase()) return false;

    // Check if it's the same day
    const lastLoginDate = new Date(timestamp);
    const now = new Date();

    return lastLoginDate.toDateString() === now.toDateString();
  } catch {
    return false;
  }
};

// Save last successful login timestamp
const saveLastLogin = (email: string): void => {
  try {
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({
      email: email.toLowerCase(),
      timestamp: Date.now()
    }));
  } catch {
    // Ignore localStorage errors
  }
};

// Clear last login on explicit logout or failed attempts
const clearLastLogin = (): void => {
  try {
    localStorage.removeItem(LAST_LOGIN_KEY);
  } catch {
    // Ignore localStorage errors
  }
};

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

  // 2FA OTP state
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpRemainingAttempts, setOtpRemainingAttempts] = useState<number | null>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Store session temporarily until OTP is verified
  const [pendingSession, setPendingSession] = useState<any>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResendOtp(true);
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

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

  // Send OTP code
  const sendOtpCode = async (emailToSend: string): Promise<boolean> => {
    setOtpSending(true);
    setOtpError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el código');
      }

      // Start resend countdown (60 seconds)
      setResendCountdown(60);
      setCanResendOtp(false);

      return true;
    } catch (err: any) {
      setOtpError(err.message || 'Error al enviar el código de verificación');
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP code
  const verifyOtpCode = async (emailToVerify: string, code: string): Promise<boolean> => {
    setOtpVerifying(true);
    setOtpError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar el código');
      }

      if (data.valid) {
        return true;
      } else {
        setOtpError(data.message || 'Código incorrecto');
        setOtpRemainingAttempts(data.remaining_attempts);
        return false;
      }
    } catch (err: any) {
      setOtpError(err.message || 'Error al verificar el código');
      return false;
    } finally {
      setOtpVerifying(false);
    }
  };

  // Apply nexo-av theme - dark for login
  useNexoAvTheme('dark');

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userInfo } = await supabase.rpc('get_current_user_info');

        if (userInfo && userInfo.length > 0) {
          // Móviles siempre van al Mapa Comercial como página inicial
          const targetPath = isMobile
            ? `/nexo-av/${userInfo[0].user_id}/lead-map`
            : `/nexo-av/${userInfo[0].user_id}/dashboard`;
          navigate(targetPath, { replace: true });
        } else {
          await supabase.auth.signOut();
        }
      }
    };

    checkSession();
  }, [navigate, isMobile]);

  // Handle credentials submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const GENERIC_AUTH_ERROR = 'Credenciales incorrectas o usuario no autorizado.';

    try {
      // Validate email domain
      if (!email.endsWith('@avtechesdeveniments.com')) {
        setError('Solo se permite el acceso con emails corporativos (@avtechesdeveniments.com)');
        setIsSubmitting(false);
        return;
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(email);
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        setIsRateLimited(true);
        setRetryAfter(rateLimitCheck.retry_after_seconds);
        setError(rateLimitCheck.message || 'Demasiados intentos. Por favor espera unos minutos.');
        setIsSubmitting(false);
        return;
      }

      if (rateLimitCheck) {
        setRemainingAttempts(rateLimitCheck.remaining_attempts);
      }

      // Attempt sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        await recordAttempt(email, false);

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

        setError(GENERIC_AUTH_ERROR);
        setIsSubmitting(false);
        return;
      }

      // Verify user is authorized
      if (data.session) {
        const { data: userInfo, error: userInfoError } = await supabase.rpc('get_current_user_info');

        if (userInfoError || !userInfo || userInfo.length === 0) {
          await supabase.auth.signOut();
          await recordAttempt(email, false);
          setError(GENERIC_AUTH_ERROR);
          setIsSubmitting(false);
          return;
        }

        // Check if we can skip OTP (last login was less than 1 hour ago)
        if (canSkipOtp(email)) {
          // Skip OTP - direct login
          await recordAttempt(email, true);
          saveLastLogin(email);

          toast({
            title: "Bienvenido",
            description: "Has iniciado sesión correctamente.",
          });
          const targetPath = isMobile
            ? `/nexo-av/${userInfo[0].user_id}/lead-map`
            : `/nexo-av/${userInfo[0].user_id}/dashboard`;
          navigate(targetPath, { replace: true });
          return;
        }

        // Sign out temporarily - we'll complete login after OTP verification
        await supabase.auth.signOut();

        // Store credentials for after OTP
        setPendingSession({ email, password });

        // Send OTP code
        const otpSent = await sendOtpCode(email);

        if (otpSent) {
          setLoginStep('otp');
          toast({
            title: "Código enviado",
            description: `Hemos enviado un código de verificación a ${email}`,
          });
        }
      }
    } catch (err) {
      setError(GENERIC_AUTH_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      setOtpError('Introduce el código de 6 dígitos');
      return;
    }

    const isValid = await verifyOtpCode(email, otpCode);

    if (isValid && pendingSession) {
      // Re-authenticate with stored credentials
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: pendingSession.email,
        password: pendingSession.password,
      });

      if (signInError) {
        setOtpError('Error al completar el inicio de sesión. Inténtalo de nuevo.');
        setLoginStep('credentials');
        setPendingSession(null);
        return;
      }

      // Record successful login and save timestamp for OTP skip
      await recordAttempt(email, true);
      saveLastLogin(email);

      // Get user info for navigation
      const { data: userInfo } = await supabase.rpc('get_current_user_info');

      if (userInfo && userInfo.length > 0) {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente.",
        });
        const targetPath = isMobile
          ? `/nexo-av/${userInfo[0].user_id}/lead-map`
          : `/nexo-av/${userInfo[0].user_id}/dashboard`;
        navigate(targetPath, { replace: true });
      }

      // Clear pending session
      setPendingSession(null);
    }
  };

  // Handle OTP code change - auto-submit when 6 digits
  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    setOtpError(null);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    const sent = await sendOtpCode(email);
    if (sent) {
      setOtpCode("");
      toast({
        title: "Código reenviado",
        description: `Nuevo código enviado a ${email}`,
      });
    }
  };

  // Go back to credentials step
  const handleBackToCredentials = async () => {
    setLoginStep('credentials');
    setOtpCode("");
    setOtpError(null);
    setOtpRemainingAttempts(null);
    setPendingSession(null);
  };

  if (isLoading) {
    return <NexoLoadingScreen onLoadingComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <img
                src={whiteLogo}
                alt="NEXO AV Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-wider"
          >
            NEXO AV
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/70 text-sm sm:text-base mt-1 text-center"
          >
            {loginStep === 'credentials' ? 'Plataforma de gestión interna' : 'Verificación en dos pasos'}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {loginStep === 'credentials' ? (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Rate limit warning */}
              {isRateLimited && retryAfter > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3 shadow-sm"
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
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-sm"
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

              {/* Credentials Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70 text-sm font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@avtechesdeveniments.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/20 h-12 disabled:opacity-50 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70 text-sm font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/20 h-12 disabled:opacity-50 rounded-lg"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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
                  className="w-full h-12 bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {otpSending ? 'Enviando código...' : 'Verificando...'}
                    </>
                  ) : isRateLimited ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Bloqueado temporalmente
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>

                <p className="text-center text-white/50 text-xs sm:text-sm mt-6">
                  ¿Problemas para acceder? Contacta con el administrador
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* OTP Info */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 text-sm font-medium">Verificación de seguridad</p>
                  <p className="text-blue-400/70 text-sm">
                    Hemos enviado un código de 6 dígitos a <strong className="font-semibold text-blue-300">{email}</strong>
                  </p>
                </div>
              </div>

              {/* OTP Error */}
              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-sm"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm">{otpError}</p>
                    {otpRemainingAttempts !== null && otpRemainingAttempts >= 0 && (
                      <p className="text-red-400/70 text-xs mt-1">
                        {otpRemainingAttempts} intento{otpRemainingAttempts !== 1 ? 's' : ''} restante{otpRemainingAttempts !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-white text-sm sm:text-base text-center block font-medium">
                    Introduce el código de verificación
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={handleOtpChange}
                      disabled={otpVerifying}
                      containerClassName="gap-2 sm:gap-3"
                    >
                      <InputOTPGroup className="gap-2 sm:gap-3">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="!w-10 !h-12 sm:!w-12 sm:!h-14 text-lg sm:text-xl font-semibold bg-white/5 !border !border-white/10 text-white !rounded-lg focus:!border-white/30 focus:!ring-white/20"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="w-full h-12 bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {otpVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verificar código
                    </>
                  )}
                </Button>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp || otpSending}
                    className="text-center text-white/50 text-sm hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {otpSending ? (
                      'Enviando...'
                    ) : canResendOtp ? (
                      '¿No recibiste el código? Reenviar'
                    ) : (
                      `Reenviar código en ${resendCountdown}s`
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="flex items-center justify-center gap-2 text-white/50 text-sm hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Background decoration - Subtle gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Login;
