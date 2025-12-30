import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface NexoLoadingScreenProps {
  onLoadingComplete: () => void;
}

const NexoLoadingScreen = ({ onLoadingComplete }: NexoLoadingScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

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
          <motion.svg
            width="200"
            height="200"
            viewBox="0 0 1000 1000"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[200px] h-[200px] md:w-[250px] md:h-[250px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.path
              d="M750 743.902L506.098 500H590.779L750 659.045V743.902Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.path
              d="M506.098 500L750 256.098V340.779L590.955 500H506.098Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.path
              d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
            <motion.path
              d="M743.902 250L500 493.902V409.221L659.045 250H743.902Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
            <motion.path
              d="M500 506.098L743.902 750H659.221L500 590.955V506.098Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            />
            <motion.path
              d="M256.098 750L500 506.098V590.779L340.955 750H256.098Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            />
            <motion.path
              d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            />
            <motion.path
              d="M493.902 500L250 743.902V659.221L409.045 500H493.902Z"
              fill="white"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NexoLoadingScreen;
