import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import NexoLoadingScreen from "../components/layout/NexoLoadingScreen";
import whiteLogo from "../../assets/logos/white_logo.svg";

interface RateLimitResponse {
  allowed: boolean;
  retry_after_seconds?: number;
  remaining_attempts?: number;
  message?: string;
}

interface CurrentUserInfo {
  user_id: string;
  otp_verified_for_today?: boolean;
}

type LoginStep = "credentials" | "otp";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpRemainingAttempts, setOtpRemainingAttempts] = useState<number | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useNexoAvTheme("dark");

  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResendOtp(true);
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data: userInfo } = await supabase.rpc("get_current_user_info");

      if (userInfo && userInfo.length > 0 && userInfo[0].otp_verified_for_today) {
        navigate(`/nexo-av/${userInfo[0].user_id}/dashboard`, { replace: true });
        return;
      }

      setEmail(normalizeEmail(session.user.email ?? ""));
      setPassword("");
      setOtpCode("");
      setOtpError(null);
      setCanResendOtp(true);
      setResendCountdown(0);
      setLoginStep("otp");
      setIsLoading(false);
    };

    void checkSession();
  }, [navigate]);

  const checkRateLimit = async (emailToCheck: string): Promise<RateLimitResponse | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("rate-limit", {
        body: { action: "check", email: emailToCheck },
      });

      if (invokeError) {
        console.error("Rate limit check failed:", invokeError);
        return null;
      }

      return data as RateLimitResponse;
    } catch (err) {
      console.error("Rate limit check error:", err);
      return null;
    }
  };

  const recordAttempt = async (emailToRecord: string, success: boolean) => {
    try {
      await supabase.functions.invoke("rate-limit", {
        body: { action: "record", email: emailToRecord, success },
      });
    } catch (err) {
      console.error("Record attempt error:", err);
    }
  };

  const sendOtpCode = async (emailToSend: string): Promise<boolean> => {
    setOtpSending(true);
    setOtpError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("send-otp", {
        body: { email: emailToSend },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Error al enviar el codigo");
      }

      if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
        throw new Error(data.error);
      }

      setResendCountdown(60);
      setCanResendOtp(false);
      return true;
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err, "Error al enviar el codigo de verificacion"));
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpCode = async (emailToVerify: string, code: string): Promise<boolean> => {
    setOtpVerifying(true);
    setOtpError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-otp", {
        body: { email: emailToVerify, code },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Error al verificar el codigo");
      }

      const verificationResult =
        data && typeof data === "object"
          ? (data as { valid?: boolean; message?: string; remaining_attempts?: number })
          : null;

      if (!verificationResult?.valid) {
        setOtpError(verificationResult?.message || "Codigo incorrecto");
        setOtpRemainingAttempts(verificationResult?.remaining_attempts ?? null);
        return false;
      }

      return true;
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err, "Error al verificar el codigo"));
      return false;
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const genericAuthError = "Credenciales incorrectas o usuario no autorizado.";
    const normalizedEmail = normalizeEmail(email);

    try {
      if (!normalizedEmail.endsWith("@avtechesdeveniments.com")) {
        setError("Solo se permite el acceso con emails corporativos (@avtechesdeveniments.com)");
        return;
      }

      setEmail(normalizedEmail);

      const rateLimitCheck = await checkRateLimit(normalizedEmail);
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        setIsRateLimited(true);
        setRetryAfter(rateLimitCheck.retry_after_seconds || 0);
        setError(rateLimitCheck.message || "Demasiados intentos. Espera unos minutos.");
        return;
      }

      if (rateLimitCheck) {
        setRemainingAttempts(rateLimitCheck.remaining_attempts || null);
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        await recordAttempt(normalizedEmail, false);

        const newCheck = await checkRateLimit(normalizedEmail);
        if (newCheck) {
          setRemainingAttempts(newCheck.remaining_attempts || null);
          if (!newCheck.allowed) {
            setIsRateLimited(true);
            setRetryAfter(newCheck.retry_after_seconds || 0);
            setError(newCheck.message || "Demasiados intentos. Espera unos minutos.");
            return;
          }
        }

        setError(genericAuthError);
        return;
      }

      if (!data.session) {
        setError(genericAuthError);
        return;
      }

      const { data: userInfo, error: userInfoError } = await supabase.rpc("get_current_user_info");

      if (userInfoError || !userInfo || userInfo.length === 0) {
        await supabase.auth.signOut();
        await recordAttempt(normalizedEmail, false);
        setError(genericAuthError);
        return;
      }

        const currentUserInfo = userInfo[0] as CurrentUserInfo;

        if (currentUserInfo.otp_verified_for_today) {
        await recordAttempt(normalizedEmail, true);
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesion correctamente.",
        });
        navigate(`/nexo-av/${currentUserInfo.user_id}/dashboard`, { replace: true });
        return;
      }

      const otpSent = await sendOtpCode(normalizedEmail);
      if (!otpSent) {
        return;
      }

      setPassword("");
      setLoginStep("otp");
      toast({
        title: "Codigo enviado",
        description: `Hemos enviado un codigo de verificacion a ${normalizedEmail}`,
      });
    } catch {
      setError(genericAuthError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      setOtpError("Introduce el codigo de 6 digitos");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const isValid = await verifyOtpCode(normalizedEmail, otpCode);
    if (!isValid) {
      return;
    }

    const { error: markOtpError } = await supabase.rpc("mark_current_user_otp_verified");
    if (markOtpError) {
      await supabase.auth.signOut();
      setOtpError("No se pudo completar la verificacion de seguridad.");
      return;
    }

    await recordAttempt(normalizedEmail, true);

    const { data: userInfo } = await supabase.rpc("get_current_user_info");
    if (userInfo && userInfo.length > 0) {
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesion correctamente.",
      });
      navigate(`/nexo-av/${userInfo[0].user_id}/dashboard`, { replace: true });
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    setOtpError(null);
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    const normalizedEmail = normalizeEmail(email);
    const sent = await sendOtpCode(normalizedEmail);
    if (sent) {
      setOtpCode("");
      toast({
        title: "Codigo reenviado",
        description: `Nuevo codigo enviado a ${normalizedEmail}`,
      });
    }
  };

  const handleBackToCredentials = async () => {
    await supabase.auth.signOut();
    setLoginStep("credentials");
    setEmail("");
    setPassword("");
    setOtpCode("");
    setOtpError(null);
    setOtpRemainingAttempts(null);
    setCanResendOtp(false);
    setResendCountdown(0);
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
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <img src={whiteLogo} alt="NEXO AV Logo" className="w-full h-full object-contain" />
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
            {loginStep === "credentials" ? "Plataforma de gestion interna" : "Verificacion en dos pasos"}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {loginStep === "credentials" ? (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
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
                      Podras intentarlo de nuevo en {Math.floor(retryAfter / 60)}:
                      {(retryAfter % 60).toString().padStart(2, "0")} minutos
                    </p>
                  </div>
                </motion.div>
              )}

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
                        {remainingAttempts} intento{remainingAttempts !== 1 ? "s" : ""} restante
                        {remainingAttempts !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70 text-sm font-medium">
                    Correo electronico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@avtechesdeveniments.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="!pl-10 !bg-white/5 !border-white/10 !text-white placeholder:!text-white/30 focus-visible:!border-white/30 focus-visible:!ring-white/20 !h-12 disabled:!opacity-50 !rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70 text-sm font-medium">
                    Contrasena
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="!pl-10 !pr-10 !bg-white/5 !border-white/10 !text-white placeholder:!text-white/30 focus-visible:!border-white/30 focus-visible:!ring-white/20 !h-12 disabled:!opacity-50 !rounded-lg"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                      Verificando...
                    </>
                  ) : isRateLimited ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Bloqueado temporalmente
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>

                <p className="text-center text-white/50 text-xs sm:text-sm mt-6">
                  Problemas para acceder? Contacta con el administrador
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
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 text-sm font-medium">Verificacion de seguridad</p>
                  <p className="text-blue-400/70 text-sm">
                    Hemos enviado un codigo de 6 digitos a <strong className="font-semibold text-blue-300">{email}</strong>
                  </p>
                </div>
              </div>

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
                        {otpRemainingAttempts} intento{otpRemainingAttempts !== 1 ? "s" : ""} restante
                        {otpRemainingAttempts !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-white text-sm sm:text-base text-center block font-medium">
                    Introduce el codigo de verificacion
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
                      Verificar codigo
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
                    {otpSending
                      ? "Enviando..."
                      : canResendOtp
                        ? "No recibiste el codigo? Reenviar"
                        : `Reenviar codigo en ${resendCountdown}s`}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="flex items-center justify-center gap-2 text-white/50 text-sm hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesion
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Login;
