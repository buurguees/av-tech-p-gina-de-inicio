import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Logo animado */}
      <motion.svg
        width="100"
        height="100"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <path d="M200 200L0 400H69.4387L200 269.583V200Z" fill="white" />
        <path d="M400 0L200 200H269.439L400 69.5834V0Z" fill="white" />
        <path d="M400 800L600 600H530.561L400 730.417V800Z" fill="white" />
        <path d="M600 600L800 400H730.561L600 530.417V600Z" fill="white" />
        <path d="M800 400L600 200V269.439L730.417 400H800Z" fill="white" />
        <path d="M600 200L400 0V69.4386L530.417 200H600Z" fill="white" />
        <path d="M200 600L400 800V730.561L269.583 600H200Z" fill="white" />
        <path d="M0 400L200 600V530.561L69.5834 400H0Z" fill="white" />
      </motion.svg>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center"
      >
        <h1 className="section-title mb-4">
          <span className="section-title-primary">Error </span>
          <span className="section-title-secondary">404</span>
        </h1>
        <p className="text-body-muted mb-8">
          La página que buscas no existe o ha sido movida.
        </p>
        <a
          href="/"
          className="inline-block border border-foreground/20 px-8 py-3 text-sm uppercase tracking-wider text-foreground transition-all duration-300 hover:bg-foreground hover:text-background"
        >
          Volver al inicio
        </a>
      </motion.div>
    </div>
  );
};

export default NotFound;
