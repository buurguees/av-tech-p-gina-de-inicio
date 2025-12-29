import { motion, type Easing } from 'motion/react';

const BlueprintAnimation = () => {
  const customEase: Easing = [0.43, 0.13, 0.23, 0.96];
  
  // Animation variants for drawing effect
  const drawPath = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { 
          delay: i * 0.15, 
          duration: 1.2, 
          ease: customEase
        },
        opacity: { delay: i * 0.15, duration: 0.3 }
      }
    })
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { delay: i * 0.15 + 0.5, duration: 0.8 }
    })
  };

  return (
    <section className="relative py-20 sm:py-32 overflow-hidden bg-background">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
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
            <motion.rect 
              width="800" 
              height="500" 
              fill="url(#grid)"
              variants={fadeIn}
              custom={0}
            />

            {/* Main LED Panel Frame - Left */}
            <motion.rect
              x="100"
              y="80"
              width="180"
              height="340"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              variants={drawPath}
              custom={1}
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
                variants={drawPath}
                custom={2 + row * 0.1}
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
                variants={drawPath}
                custom={2.5 + col * 0.1}
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
              variants={drawPath}
              custom={3}
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
                variants={drawPath}
                custom={4 + row * 0.1}
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
                variants={drawPath}
                custom={4.5 + col * 0.1}
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
              variants={drawPath}
              custom={5}
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
                variants={drawPath}
                custom={6 + row * 0.1}
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
                variants={drawPath}
                custom={6.5 + col * 0.1}
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
              variants={drawPath}
              custom={7}
            />
            <motion.line
              x1="100"
              y1="445"
              x2="100"
              y2="455"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              variants={drawPath}
              custom={7.1}
            />
            <motion.line
              x1="700"
              y1="445"
              x2="700"
              y2="455"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              variants={drawPath}
              custom={7.2}
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
              variants={drawPath}
              custom={7.5}
            />
            <motion.line
              x1="45"
              y1="80"
              x2="55"
              y2="80"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              variants={drawPath}
              custom={7.6}
            />
            <motion.line
              x1="45"
              y1="420"
              x2="55"
              y2="420"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              variants={drawPath}
              custom={7.7}
            />

            {/* Structural support lines */}
            <motion.line
              x1="100"
              y1="420"
              x2="100"
              y2="480"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="4 2"
              variants={drawPath}
              custom={8}
            />
            <motion.line
              x1="280"
              y1="420"
              x2="280"
              y2="480"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="4 2"
              variants={drawPath}
              custom={8.1}
            />
            <motion.line
              x1="520"
              y1="420"
              x2="520"
              y2="480"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="4 2"
              variants={drawPath}
              custom={8.2}
            />
            <motion.line
              x1="700"
              y1="420"
              x2="700"
              y2="480"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="4 2"
              variants={drawPath}
              custom={8.3}
            />

            {/* Technical labels */}
            <motion.text
              x="400"
              y="470"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              fontFamily="monospace"
              opacity="0.6"
              variants={fadeIn}
              custom={9}
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
              opacity="0.6"
              transform="rotate(-90, 30, 255)"
              variants={fadeIn}
              custom={9.5}
            >
              3400mm
            </motion.text>

            {/* Panel labels */}
            <motion.text
              x="190"
              y="60"
              textAnchor="middle"
              fill="hsl(var(--primary))"
              fontSize="10"
              fontFamily="monospace"
              opacity="0.8"
              variants={fadeIn}
              custom={10}
            >
              MÓDULO A
            </motion.text>
            <motion.text
              x="400"
              y="60"
              textAnchor="middle"
              fill="hsl(var(--primary))"
              fontSize="10"
              fontFamily="monospace"
              opacity="0.8"
              variants={fadeIn}
              custom={10.5}
            >
              MÓDULO B
            </motion.text>
            <motion.text
              x="610"
              y="60"
              textAnchor="middle"
              fill="hsl(var(--primary))"
              fontSize="10"
              fontFamily="monospace"
              opacity="0.8"
              variants={fadeIn}
              custom={11}
            >
              MÓDULO C
            </motion.text>

            {/* Corner detail markers */}
            {[[100, 80], [280, 80], [100, 420], [280, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-left-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                variants={fadeIn}
                custom={12 + i * 0.1}
              />
            ))}
            {[[310, 80], [490, 80], [310, 420], [490, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-center-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                variants={fadeIn}
                custom={12.5 + i * 0.1}
              />
            ))}
            {[[520, 80], [700, 80], [520, 420], [700, 420]].map(([x, y], i) => (
              <motion.circle
                key={`corner-right-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                variants={fadeIn}
                custom={13 + i * 0.1}
              />
            ))}

            {/* Title block */}
            <motion.rect
              x="580"
              y="10"
              width="210"
              height="35"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.5"
              strokeOpacity="0.3"
              fill="none"
              variants={drawPath}
              custom={14}
            />
            <motion.text
              x="685"
              y="25"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="8"
              fontFamily="monospace"
              opacity="0.5"
              variants={fadeIn}
              custom={14.5}
            >
              AVTECH PANTALLAS LED
            </motion.text>
            <motion.text
              x="685"
              y="38"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="7"
              fontFamily="monospace"
              opacity="0.4"
              variants={fadeIn}
              custom={15}
            >
              PLANO TÉCNICO - ESCALA 1:50
            </motion.text>
          </svg>
        </motion.div>
      </div>
    </section>
  );
};

export default BlueprintAnimation;
