import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const NexoNotFound = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent NEXO AV route");
  }, []);

  const handleGoBack = () => {
    if (userId) {
      navigate(`/nexo-av/${userId}/dashboard`);
    } else {
      navigate("/nexo-av");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black">
      {/* Logo animado NEXO */}
      <motion.svg
        width="100"
        height="100"
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <path d="M750 743.902L506.098 500H590.779L750 659.045V743.902Z" fill="white" />
        <path d="M506.098 500L750 256.098V340.779L590.955 500H506.098Z" fill="white" />
        <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="white" />
        <path d="M743.902 250L500 493.902V409.221L659.045 250H743.902Z" fill="white" />
        <path d="M500 506.098L743.902 750H659.221L500 590.955V506.098Z" fill="white" />
        <path d="M256.098 750L500 506.098V590.779L340.955 750H256.098Z" fill="white" />
        <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="white" />
        <path d="M493.902 500L250 743.902V659.221L409.045 500H493.902Z" fill="white" />
      </motion.svg>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-4">
          <span className="text-white">Error </span>
          <span className="text-white/60">404</span>
        </h1>
        <p className="text-white/50 mb-8">
          La página que buscas no existe o ha sido movida.
        </p>
        <button
          onClick={handleGoBack}
          className="inline-block border border-white/20 px-8 py-3 text-sm uppercase tracking-wider text-white transition-all duration-300 hover:bg-white hover:text-black"
        >
          Volver al inicio
        </button>
      </motion.div>
    </div>
  );
};

export default NexoNotFound;
