import { motion } from 'motion/react';

const BlueprintAnimation = () => {
  const baseDuration = 0.8;
  const staggerDelay = 0.08;
  const totalAnimTime = 3;
  const pauseTime = 1.5;
  const cycleDuration = totalAnimTime + pauseTime;

  // Create transition for path drawing with loop
  const getPathTransition = (index: number) => ({
    pathLength: {
      duration: baseDuration,
      delay: index * staggerDelay,
      repeat: Infinity,
      repeatType: "reverse" as const,
      repeatDelay: cycleDuration - (index * staggerDelay) - baseDuration,
      ease: "easeInOut" as const
    },
    opacity: {
      duration: 0.2,
      delay: index * staggerDelay,
      repeat: Infinity,
      repeatType: "reverse" as const,
      repeatDelay: cycleDuration
    }
  });

  const getFadeTransition = (index: number) => ({
    duration: 0.4,
    delay: index * staggerDelay + 0.3,
    repeat: Infinity,
    repeatType: "reverse" as const,
    repeatDelay: cycleDuration
  });

  return (
    <section className="relative py-20 sm:py-32 overflow-hidden bg-background">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex justify-center"
        >
          <svg
            viewBox="0 0 800 500"
            className="w-full max-w-4xl h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grid pattern background */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path 
                  d="M 20 0 L 0 0 0 20" 
                  fill="none" 
                  stroke="hsl(var(--foreground))" 
                  strokeWidth="0.2" 
                  strokeOpacity="0.15"
                />
              </pattern>
            </defs>
            <rect width="800" height="500" fill="url(#grid)" />

            {/* Main LED Panel Frame - Left */}
            <motion.rect
              x="100"
              y="80"
              width="180"
              height="340"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={getPathTransition(1)}
            />
            
            {/* LED Module Grid - Left Panel */}
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <motion.line
                key={`h-left-${row}`}
                x1="100"
                y1={80 + row * 56.67}
                x2="280"
                y2={80 + row * 56.67}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(2 + row * 0.5)}
              />
            ))}
            {[0, 1, 2, 3].map((col) => (
              <motion.line
                key={`v-left-${col}`}
                x1={100 + col * 60}
                y1="80"
                x2={100 + col * 60}
                y2="420"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(5 + col * 0.5)}
              />
            ))}

            {/* Main LED Panel Frame - Center */}
            <motion.rect
              x="310"
              y="80"
              width="180"
              height="340"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={getPathTransition(7)}
            />

            {/* LED Module Grid - Center Panel */}
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <motion.line
                key={`h-center-${row}`}
                x1="310"
                y1={80 + row * 56.67}
                x2="490"
                y2={80 + row * 56.67}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(8 + row * 0.5)}
              />
            ))}
            {[0, 1, 2, 3].map((col) => (
              <motion.line
                key={`v-center-${col}`}
                x1={310 + col * 60}
                y1="80"
                x2={310 + col * 60}
                y2="420"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(11 + col * 0.5)}
              />
            ))}

            {/* Main LED Panel Frame - Right */}
            <motion.rect
              x="520"
              y="80"
              width="180"
              height="340"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={getPathTransition(13)}
            />

            {/* LED Module Grid - Right Panel */}
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <motion.line
                key={`h-right-${row}`}
                x1="520"
                y1={80 + row * 56.67}
                x2="700"
                y2={80 + row * 56.67}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(14 + row * 0.5)}
              />
            ))}
            {[0, 1, 2, 3].map((col) => (
              <motion.line
                key={`v-right-${col}`}
                x1={520 + col * 60}
                y1="80"
                x2={520 + col * 60}
                y2="420"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={getPathTransition(17 + col * 0.5)}
              />
            ))}

            {/* Dimension lines - Width */}
            <motion.line
              x1="100"
              y1="450"
              x2="700"
              y2="450"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(19)}
            />
            <motion.line
              x1="100"
              y1="445"
              x2="100"
              y2="455"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(19.5)}
            />
            <motion.line
              x1="700"
              y1="445"
              x2="700"
              y2="455"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(19.5)}
            />

            {/* Dimension lines - Height */}
            <motion.line
              x1="50"
              y1="80"
              x2="50"
              y2="420"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(20)}
            />
            <motion.line
              x1="45"
              y1="80"
              x2="55"
              y2="80"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(20.5)}
            />
            <motion.line
              x1="45"
              y1="420"
              x2="55"
              y2="420"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(20.5)}
            />

            {/* Structural support lines */}
            {[100, 280, 520, 700].map((x, i) => (
              <motion.line
                key={`support-${i}`}
                x1={x}
                y1="420"
                x2={x}
                y2="480"
                stroke="hsl(var(--foreground))"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="4 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={getPathTransition(21 + i * 0.3)}
              />
            ))}

            {/* Technical labels */}
            <motion.text
              x="400"
              y="470"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              fontFamily="monospace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={getFadeTransition(22)}
            >
              6000mm
            </motion.text>
            <motion.text
              x="30"
              y="255"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              fontFamily="monospace"
              transform="rotate(-90, 30, 255)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={getFadeTransition(22.5)}
            >
              3400mm
            </motion.text>


            {/* Corner detail markers */}
            {[[100, 80], [280, 80], [100, 420], [280, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-left-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={getFadeTransition(25 + i * 0.2)}
              />
            ))}
            {[[310, 80], [490, 80], [310, 420], [490, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-center-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={getFadeTransition(26 + i * 0.2)}
              />
            ))}
            {[[520, 80], [700, 80], [520, 420], [700, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-right-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={getFadeTransition(27 + i * 0.2)}
              />
            ))}

          </svg>
        </motion.div>
      </div>
    </section>
  );
};

export default BlueprintAnimation;
