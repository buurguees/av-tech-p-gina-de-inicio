import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ScrollLineProps {
  containerRef: React.RefObject<HTMLElement>;
}

const ScrollLine = ({ containerRef }: ScrollLineProps) => {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 5000 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // All hooks must be called before any conditional returns
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const offsetDistance = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.scrollHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Build path using memoized calculation
  const { mainPath, isMobile } = useMemo(() => {
    const w = dimensions.width;
    const h = dimensions.height;
    const mobile = w < 768;
    
    // Section heights (6 sections, 5 full height + 1 at 70%)
    const sectionHeight = h / 5.7;
    
    // Margins for positioning
    const textLeftEdge = mobile ? w * 0.12 : w * 0.08;
    const textRightEdge = mobile ? w * 0.88 : w * 0.75;
    const leftMargin = mobile ? w * 0.08 : w * 0.06;
    
    // Category label positions (approximate Y positions for each section's category label)
    const categoryY = [
      sectionHeight * 0.45,           // Block 1: "Quiénes somos" - LEFT
      sectionHeight * 1.45,           // Block 2: "Origen" - RIGHT
      sectionHeight * 2.45,           // Block 3: "Visión" - LEFT
      sectionHeight * 3.45,           // Block 4: "Proceso" - RIGHT
      sectionHeight * 4.45,           // Block 5: "Valores" - LEFT
    ];

    const points: string[] = [];
    
    // Start from top left, slightly outside viewport
    points.push(`M ${leftMargin - 50} ${categoryY[0] - 100}`);
    
    // Gentle curve entering the page
    points.push(`Q ${leftMargin - 20} ${categoryY[0] - 50}, ${leftMargin + 20} ${categoryY[0] - 30}`);
    
    // Circle around "Quiénes somos" (Block 1 - LEFT)
    const circle1X = textLeftEdge + 80;
    const circle1Y = categoryY[0];
    points.push(`Q ${leftMargin + 60} ${circle1Y - 60}, ${circle1X - 40} ${circle1Y - 25}`);
    points.push(`C ${circle1X - 60} ${circle1Y - 40}, ${circle1X - 70} ${circle1Y + 10}, ${circle1X - 50} ${circle1Y + 30}`);
    points.push(`C ${circle1X - 30} ${circle1Y + 50}, ${circle1X + 30} ${circle1Y + 40}, ${circle1X + 50} ${circle1Y + 10}`);
    points.push(`C ${circle1X + 60} ${circle1Y - 20}, ${circle1X + 40} ${circle1Y - 45}, ${circle1X} ${circle1Y - 35}`);
    
    // Flow to the right side with a graceful S-curve
    points.push(`C ${w * 0.3} ${categoryY[0] + sectionHeight * 0.3}, ${w * 0.5} ${categoryY[1] - sectionHeight * 0.3}, ${w * 0.7} ${categoryY[1] - 100}`);
    
    // Spiral approach to "Origen" (Block 2 - RIGHT)
    const circle2X = textRightEdge - 30;
    const circle2Y = categoryY[1];
    points.push(`Q ${w * 0.8} ${circle2Y - 80}, ${circle2X + 60} ${circle2Y - 40}`);
    points.push(`C ${circle2X + 80} ${circle2Y - 20}, ${circle2X + 70} ${circle2Y + 30}, ${circle2X + 40} ${circle2Y + 40}`);
    points.push(`C ${circle2X + 10} ${circle2Y + 50}, ${circle2X - 40} ${circle2Y + 30}, ${circle2X - 50} ${circle2Y}`);
    points.push(`C ${circle2X - 55} ${circle2Y - 30}, ${circle2X - 30} ${circle2Y - 50}, ${circle2X + 10} ${circle2Y - 40}`);
    
    // Flowing wave back to the left with emotion
    points.push(`C ${w * 0.7} ${categoryY[1] + sectionHeight * 0.2}, ${w * 0.4} ${categoryY[2] - sectionHeight * 0.4}, ${w * 0.25} ${categoryY[2] - 100}`);
    
    // Gentle loop approaching "Visión" (Block 3 - LEFT)
    const circle3X = textLeftEdge + 60;
    const circle3Y = categoryY[2];
    points.push(`Q ${w * 0.15} ${circle3Y - 60}, ${circle3X - 30} ${circle3Y - 35}`);
    points.push(`C ${circle3X - 55} ${circle3Y - 25}, ${circle3X - 60} ${circle3Y + 20}, ${circle3X - 40} ${circle3Y + 40}`);
    points.push(`C ${circle3X - 15} ${circle3Y + 55}, ${circle3X + 40} ${circle3Y + 40}, ${circle3X + 55} ${circle3Y + 10}`);
    points.push(`C ${circle3X + 65} ${circle3Y - 15}, ${circle3X + 45} ${circle3Y - 45}, ${circle3X + 5} ${circle3Y - 38}`);
    
    // Sweeping curve to the right with a playful twist
    points.push(`C ${w * 0.35} ${categoryY[2] + sectionHeight * 0.35}, ${w * 0.55} ${categoryY[3] - sectionHeight * 0.25}, ${w * 0.75} ${categoryY[3] - 80}`);
    
    // Approach "Proceso" with enthusiasm (Block 4 - RIGHT)
    const circle4X = textRightEdge - 40;
    const circle4Y = categoryY[3];
    points.push(`Q ${w * 0.85} ${circle4Y - 50}, ${circle4X + 50} ${circle4Y - 30}`);
    points.push(`C ${circle4X + 70} ${circle4Y - 10}, ${circle4X + 65} ${circle4Y + 35}, ${circle4X + 35} ${circle4Y + 45}`);
    points.push(`C ${circle4X} ${circle4Y + 55}, ${circle4X - 45} ${circle4Y + 30}, ${circle4X - 55} ${circle4Y - 5}`);
    points.push(`C ${circle4X - 60} ${circle4Y - 35}, ${circle4X - 35} ${circle4Y - 55}, ${circle4X + 5} ${circle4Y - 45}`);
    
    // Final flowing curve back to left for "Valores"
    points.push(`C ${w * 0.65} ${categoryY[3] + sectionHeight * 0.3}, ${w * 0.35} ${categoryY[4] - sectionHeight * 0.35}, ${w * 0.2} ${categoryY[4] - 90}`);
    
    // Approach "Valores" (Block 5 - LEFT)
    const circle5X = textLeftEdge + 55;
    const circle5Y = categoryY[4];
    points.push(`Q ${w * 0.12} ${circle5Y - 55}, ${circle5X - 35} ${circle5Y - 30}`);
    points.push(`C ${circle5X - 58} ${circle5Y - 15}, ${circle5X - 55} ${circle5Y + 30}, ${circle5X - 35} ${circle5Y + 45}`);
    points.push(`C ${circle5X - 10} ${circle5Y + 60}, ${circle5X + 45} ${circle5Y + 45}, ${circle5X + 60} ${circle5Y + 15}`);
    points.push(`C ${circle5X + 70} ${circle5Y - 15}, ${circle5X + 50} ${circle5Y - 45}, ${circle5X + 10} ${circle5Y - 40}`);
    
    // Exit gracefully towards the bottom center with a final flourish
    points.push(`C ${w * 0.3} ${categoryY[4] + sectionHeight * 0.4}, ${w * 0.5} ${h - 200}, ${w * 0.5} ${h - 50}`);
    
    return { mainPath: points.join(' '), isMobile: mobile };
  }, [dimensions]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {/* Main animated line */}
      <motion.path
        d={mainPath}
        fill="none"
        stroke="hsl(var(--foreground) / 0.15)"
        strokeWidth={isMobile ? 1 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          pathLength,
        }}
        initial={{ pathLength: 0 }}
      />
      
      {/* Subtle dot at the current position */}
      <motion.circle
        r={isMobile ? 3 : 4}
        fill="hsl(var(--foreground) / 0.3)"
        style={{
          offsetPath: `path('${mainPath}')`,
          offsetDistance,
        }}
      />
    </svg>
  );
};

export default ScrollLine;
