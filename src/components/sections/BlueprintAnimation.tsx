import { motion } from 'motion/react';

const BlueprintAnimation = () => {
  const baseDuration = 0.6;
  const staggerDelay = 0.06;
  const totalAnimTime = 4;

  // Create transition for path drawing (no reverse, plays once per view)
  const getPathTransition = (index: number) => ({
    pathLength: {
      duration: baseDuration,
      delay: index * staggerDelay,
      ease: "easeOut" as const
    },
    opacity: {
      duration: 0.3,
      delay: index * staggerDelay
    }
  });

  const getFadeTransition = (index: number) => ({
    duration: 0.4,
    delay: index * staggerDelay + 0.2
  });

  // Panel dimensions: 4 squares wide (100mm each = 1000mm), 8 squares tall (250mm each = 2000mm)
  const squareSize = 40; // pixels per square
  const panelWidth = squareSize * 4; // 160px = 4 squares
  const panelHeight = squareSize * 8; // 320px = 8 squares
  const panelGap = 30;
  const startX = 140;
  const startY = 60;

  const panels = [
    { x: startX, label: 'Panel 1' },
    { x: startX + panelWidth + panelGap, label: 'Panel 2' },
    { x: startX + (panelWidth + panelGap) * 2, label: 'Panel 3' }
  ];

  const totalWidth = panelWidth * 3 + panelGap * 2; // 540px

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

            {/* Draw all 3 panels */}
            {panels.map((panel, panelIndex) => (
              <g key={`panel-${panelIndex}`}>
                {/* Main panel frame */}
                <motion.rect
                  x={panel.x}
                  y={startY}
                  width={panelWidth}
                  height={panelHeight}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={getPathTransition(1 + panelIndex * 6)}
                />

                {/* Horizontal grid lines (8 rows = 9 lines including edges) */}
                {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                  <motion.line
                    key={`h-${panelIndex}-${row}`}
                    x1={panel.x}
                    y1={startY + row * squareSize}
                    x2={panel.x + panelWidth}
                    y2={startY + row * squareSize}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    strokeOpacity="0.6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    transition={getPathTransition(2 + panelIndex * 6 + row * 0.3)}
                  />
                ))}

                {/* Vertical grid lines (4 columns = 5 lines including edges) */}
                {[1, 2, 3].map((col) => (
                  <motion.line
                    key={`v-${panelIndex}-${col}`}
                    x1={panel.x + col * squareSize}
                    y1={startY}
                    x2={panel.x + col * squareSize}
                    y2={startY + panelHeight}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    strokeOpacity="0.6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    transition={getPathTransition(4 + panelIndex * 6 + col * 0.3)}
                  />
                ))}

                {/* Corner markers */}
                {[
                  [panel.x, startY],
                  [panel.x + panelWidth, startY],
                  [panel.x, startY + panelHeight],
                  [panel.x + panelWidth, startY + panelHeight]
                ].map(([cx, cy], i) => (
                  <motion.circle
                    key={`corner-${panelIndex}-${i}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill="hsl(var(--primary))"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={getFadeTransition(20 + panelIndex * 2 + i * 0.2)}
                  />
                ))}
              </g>
            ))}

            {/* Dimension line - Width per panel (1000mm) */}
            <motion.line
              x1={startX}
              y1={startY + panelHeight + 25}
              x2={startX + panelWidth}
              y2={startY + panelHeight + 25}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(25)}
            />
            <motion.line
              x1={startX}
              y1={startY + panelHeight + 20}
              x2={startX}
              y2={startY + panelHeight + 30}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(25.2)}
            />
            <motion.line
              x1={startX + panelWidth}
              y1={startY + panelHeight + 20}
              x2={startX + panelWidth}
              y2={startY + panelHeight + 30}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(25.2)}
            />
            <motion.text
              x={startX + panelWidth / 2}
              y={startY + panelHeight + 45}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="11"
              fontFamily="monospace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={getFadeTransition(26)}
            >
              1000mm
            </motion.text>

            {/* Dimension line - Total width (3000mm) */}
            <motion.line
              x1={startX}
              y1={startY + panelHeight + 60}
              x2={startX + totalWidth}
              y2={startY + panelHeight + 60}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(27)}
            />
            <motion.line
              x1={startX}
              y1={startY + panelHeight + 55}
              x2={startX}
              y2={startY + panelHeight + 65}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(27.2)}
            />
            <motion.line
              x1={startX + totalWidth}
              y1={startY + panelHeight + 55}
              x2={startX + totalWidth}
              y2={startY + panelHeight + 65}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(27.2)}
            />
            <motion.text
              x={startX + totalWidth / 2}
              y={startY + panelHeight + 80}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="11"
              fontFamily="monospace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={getFadeTransition(28)}
            >
              3000mm
            </motion.text>

            {/* Dimension line - Height (2000mm) */}
            <motion.line
              x1={startX - 25}
              y1={startY}
              x2={startX - 25}
              y2={startY + panelHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(29)}
            />
            <motion.line
              x1={startX - 30}
              y1={startY}
              x2={startX - 20}
              y2={startY}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(29.2)}
            />
            <motion.line
              x1={startX - 30}
              y1={startY + panelHeight}
              x2={startX - 20}
              y2={startY + panelHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.8"
              strokeOpacity="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={getPathTransition(29.2)}
            />
            <motion.text
              x={startX - 45}
              y={startY + panelHeight / 2}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="11"
              fontFamily="monospace"
              transform={`rotate(-90, ${startX - 45}, ${startY + panelHeight / 2})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={getFadeTransition(30)}
            >
              2000mm
            </motion.text>

            {/* Structural support lines */}
            {panels.map((panel, i) => (
              <g key={`support-${i}`}>
                <motion.line
                  x1={panel.x}
                  y1={startY + panelHeight}
                  x2={panel.x}
                  y2={startY + panelHeight + 15}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  strokeDasharray="4 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={getPathTransition(31 + i * 0.3)}
                />
                <motion.line
                  x1={panel.x + panelWidth}
                  y1={startY + panelHeight}
                  x2={panel.x + panelWidth}
                  y2={startY + panelHeight + 15}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  strokeDasharray="4 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={getPathTransition(31.5 + i * 0.3)}
                />
              </g>
            ))}
          </svg>
        </motion.div>
      </div>
    </section>
  );
};

export default BlueprintAnimation;
