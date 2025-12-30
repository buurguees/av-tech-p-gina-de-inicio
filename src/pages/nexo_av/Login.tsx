import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import NexoLoadingScreen from "./components/NexoLoadingScreen";

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
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sin funcionalidad por ahora
    console.log("Login attempt:", { email, password });
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
                placeholder="usuario@avtechesdeveniments.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 h-12"
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
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
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
            className="w-full h-12 bg-white text-black font-medium hover:bg-white/90 transition-all"
          >
            Iniciar sesión
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
