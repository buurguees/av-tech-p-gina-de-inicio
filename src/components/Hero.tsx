import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import project1 from '@/assets/projects/project-1.png';
import project5 from '@/assets/projects/project-5.png';
import project7 from '@/assets/projects/project-7.jpg';
import project8 from '@/assets/projects/project-8.jpg';
import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage4 from '@/assets/catalog/lcd-techo.png';

const projectImages = [project1, project5, project7, project8, catalogImage1, catalogImage2, catalogImage4];

const heroHighlights = ['Instalacion integral', 'Experiencia visual premium', 'Retail y corporate'];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projectImages.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-6 pb-12 pt-24 sm:px-8 sm:pb-0 sm:pt-0 md:px-16"
    >
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentIndex}
            src={projectImages[currentIndex]}
            alt="Proyecto AV Tech"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-background/60 md:bg-background/50" />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 40%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.45) 52%, transparent 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 md:h-48"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1800px]">
        <div className="flex flex-col md:flex-row">
          <div className="w-full max-w-4xl text-left md:w-[70%]">
            <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-background/35 px-4 py-2 backdrop-blur-sm sm:mb-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--text-secondary) / 0.92)' }}>
                Diseno audiovisual para espacios con marca
              </span>
            </div>

            <h1 className="section-title mb-5 animate-fade-in-up sm:mb-8">
              <span className="section-title-primary">La experiencia que vive tu cliente</span>
              <br />
              <span className="section-title-primary">en tu espacio</span>
              <br />
              <span className="section-title-secondary">debe reflejar el valor de tu marca</span>
            </h1>

            <h2 className="section-description mb-4 max-w-2xl animate-fade-in-up-delay-1 text-left sm:mb-6">
              Transformamos lugares ordinarios en experiencias visuales que conectan, impactan y se quedan en la memoria.
            </h2>

            <p className="max-w-xl font-mono text-xs animate-fade-in-up-delay-2 sm:text-sm" style={{ color: 'hsl(var(--text-secondary) / 0.72)' }}>
              Porque la tecnologia audiovisual no deberia notarse. Deberia hacer sentir.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
              {heroHighlights.map((item) => (
                <div
                  key={item}
                  className="min-h-11 rounded-2xl border border-white/12 bg-background/30 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--text-secondary) / 0.92)' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden w-[30%] md:block" />
        </div>
      </div>

      <div className="absolute bottom-8 right-8 z-10 hidden gap-2 md:flex">
        {projectImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-6 bg-foreground' : 'w-2 bg-foreground/30 hover:bg-foreground/50'
            }`}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
