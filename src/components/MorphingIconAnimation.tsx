import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const MorphingIconAnimation = () => {
  const [currentIcon, setCurrentIcon] = useState(0);
  const iconCount = 4;
  const cycleDuration = 3000; // 3 seconds per icon

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % iconCount);
    }, cycleDuration);

    return () => clearInterval(interval);
  }, []);

  // SVG paths for each icon state
  const icons = {
    // Tools icon - wrench and screwdriver
    tools: [
      // Wrench
      "M80 120 L120 160 L200 80 L240 120 L320 40 L280 80 L320 120 L280 160 L200 240 L160 200 L80 280 L40 240 L120 160 L80 120",
      // Screwdriver
      "M320 280 L360 320 L380 300 L400 320 L360 360 L340 340 L320 360 L280 320 L320 280",
      // Handle detail
      "M200 200 L240 240 L280 200 L240 160 L200 200",
      // Bolt/nut
      "M60 340 L100 340 L120 380 L100 420 L60 420 L40 380 L60 340",
    ],
    // Airplane flying
    airplane: [
      // Fuselage
      "M40 200 L160 200 L280 120 L400 120 L360 200 L400 200 L400 240 L360 240 L400 320 L280 320 L160 240 L40 240 L40 200",
      // Wing top
      "M120 200 L200 80 L280 80 L200 200 L120 200",
      // Wing bottom
      "M120 240 L200 360 L280 360 L200 240 L120 240",
      // Tail
      "M360 160 L400 120 L400 160 L380 180 L360 160",
    ],
    // Globe
    globe: [
      // Outer circle
      "M200 40 C290 40 360 110 360 200 C360 290 290 360 200 360 C110 360 40 290 40 200 C40 110 110 40 200 40",
      // Horizontal line
      "M40 200 L360 200",
      // Vertical ellipse
      "M200 40 C240 40 280 110 280 200 C280 290 240 360 200 360 C160 360 120 290 120 200 C120 110 160 40 200 40",
      // Latitude lines
      "M60 120 C100 100 160 90 200 90 C240 90 300 100 340 120 M60 280 C100 300 160 310 200 310 C240 310 300 300 340 280",
    ],
    // AV TECH Logo
    logo: [
      // Top left arrow
      "M100 100 L0 200 L35 200 L100 135 L100 100",
      // Top arrows
      "M200 0 L100 100 L135 100 L200 35 L200 0 M200 0 L300 100 L265 100 L200 35 L200 0",
      // Right arrows
      "M300 100 L400 200 L365 200 L300 135 L300 100 M400 200 L300 300 L300 265 L365 200 L400 200",
      // Bottom arrows
      "M200 400 L300 300 L265 300 L200 365 L200 400 M200 400 L100 300 L135 300 L200 365 L200 400 M100 300 L0 200 L35 200 L100 265 L100 300",
    ],
  };

  const iconKeys = ['tools', 'airplane', 'globe', 'logo'] as const;
  const currentIconKey = iconKeys[currentIcon];

  return (
    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
      <motion.svg
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[300px] max-h-[300px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <AnimatePresence mode="wait">
          <motion.g
            key={currentIcon}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {icons[currentIconKey].map((path, index) => (
              <motion.path
                key={`${currentIcon}-${index}`}
                d={path}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: {
                    duration: 1,
                    delay: index * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  },
                  opacity: {
                    duration: 0.3,
                    delay: index * 0.15,
                  },
                }}
              />
            ))}
          </motion.g>
        </AnimatePresence>
      </motion.svg>
    </div>
  );
};

export default MorphingIconAnimation;
