import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Import project images
import project1 from '@/assets/projects/project-1.png';
import project2 from '@/assets/projects/project-2.jpg';
import project3 from '@/assets/projects/project-3.png';
import project4 from '@/assets/projects/project-4.jpg';
import project5 from '@/assets/projects/project-5.png';
import project6 from '@/assets/projects/project-6.png';
import project7 from '@/assets/projects/project-7.jpg';
import project8 from '@/assets/projects/project-8.jpg';

// Import catalog images
import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage3 from '@/assets/catalog/totem-lcd.png';
import catalogImage4 from '@/assets/catalog/lcd-techo.png';

const projectImages = [
  project1, project2, project3, project4,
  project5, project6, project7, project8,
  catalogImage1, catalogImage2, catalogImage3, catalogImage4
];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projectImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="inicio"
      className="relative min-h-[100svh] flex items-center pt-20 pb-12 sm:pt-0 sm:pb-0 px-6 sm:px-8 md:px-16 overflow-hidden"
    >
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentIndex}
            src={projectImages[currentIndex]}
            alt="Proyecto AV Tech"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        
        {/* Dark overlay for text readability - lighter for better image visibility */}
        <div className="absolute inset-0 bg-background/60 md:bg-background/50" />
        <div 
          className="absolute inset-0 hidden md:block"
          style={{
            background: 'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 40%, transparent 100%)'
          }}
        />
        {/* Mobile gradient - bottom heavy for text readability */}
        <div 
          className="absolute inset-0 md:hidden"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.4) 50%, transparent 100%)'
          }}
        />
        {/* Bottom gradient for seamless section transition */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 md:h-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
          }}
        />
      </div>

      {/* Content - 60/40 Layout */}
      <div className="relative z-10 max-w-[1800px] w-full">
        <div className="flex flex-col md:flex-row">
          {/* Title Block - 60% width */}
          <div className="w-full md:w-[60%] text-left">
            {/* Main Headline */}
            <h1 className="section-title mb-6 sm:mb-8 animate-fade-in-up">
              <span className="section-title-primary">¿La experiencia que satisface</span>
              <br />
              <span className="section-title-primary">en tu espacio refleja</span>
              <br />
              <span className="section-title-secondary">el valor de</span>
              <br />
              <span className="section-title-secondary">tu marca?</span>
            </h1>

            {/* Subheadline */}
            <h2 className="section-description mb-4 sm:mb-6 animate-fade-in-up-delay-1 text-justify">
              Transformamos lugares ordinarios en experiencias visuales que conectan, 
              impactan y se quedan en la memoria.
            </h2>

            {/* Supporting text */}
            <p className="font-mono text-xs sm:text-sm animate-fade-in-up-delay-2" style={{ color: 'hsl(var(--text-secondary) / 0.6)' }}>
              Porque la tecnología audiovisual no debería notarse. Debería hacer sentir.
            </p>
          </div>
          
          {/* Right Block - 40% width (empty for now, reserved for future content) */}
          <div className="hidden md:block w-[40%]" />
        </div>
      </div>

      {/* Carousel indicators - hidden on mobile for cleaner look */}
      <div className="absolute bottom-8 right-8 z-10 hidden md:flex gap-2">
        {projectImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-foreground w-6' 
                : 'bg-foreground/30 hover:bg-foreground/50'
            }`}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
