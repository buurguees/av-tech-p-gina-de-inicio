import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import whiteLogo from "../../../assets/logos/white_logo.svg";
import { useNexoAvTheme } from "../../../hooks/useNexoAvTheme";

interface NexoLoadingScreenProps {
  onLoadingComplete: () => void;
}

const NexoLoadingScreen = ({ onLoadingComplete }: NexoLoadingScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // Apply dark theme for loading screen
  useNexoAvTheme('dark');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onLoadingComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-[200px] h-[200px] md:w-[250px] md:h-[250px]"
          >
            <img 
              src={whiteLogo} 
              alt="NEXO AV Logo" 
              className="w-full h-full object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NexoLoadingScreen;
