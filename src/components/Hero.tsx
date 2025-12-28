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

const projectImages = [
  project1, project2, project3, project4,
  project5, project6, project7, project8
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
      className="relative min-h-screen flex items-center px-6 sm:px-8 md:px-16 overflow-hidden"
    >
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={projectImages[currentIndex]}
              alt="Proyecto AV Tech"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-background/70" />
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 40%, transparent 100%)'
          }}
        />
        {/* Bottom gradient for seamless section transition */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1800px] w-full">
        <div className="max-w-3xl text-left">
          {/* Main Headline */}
          <h1 className="section-title mb-8 animate-fade-in-up">
            <span className="section-title-primary">Convertimos</span>
            <br />
            <span className="section-title-primary">espacios físicos</span>
            <br />
            <span className="section-title-secondary">en experiencias</span>
            <br />
            <span className="section-title-secondary">visuales</span>
          </h1>

          {/* Subheadline */}
          <h2 className="section-description mb-6 animate-fade-in-up-delay-1">
            Ayudamos a empresas y marcas a mejorar la forma en la que se muestran, 
            se escuchan y se recuerdan, a través de soluciones audiovisuales 
            profesionales adaptadas a cada espacio.
          </h2>

          {/* Supporting text */}
          <p className="font-mono text-sm animate-fade-in-up-delay-2" style={{ color: 'hsl(var(--text-secondary) / 0.6)' }}>
            Desde pantallas LED y sistemas de sonido hasta gestión de contenidos y soporte continuo.
          </p>
        </div>
      </div>

      {/* Carousel indicators */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-2">
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
