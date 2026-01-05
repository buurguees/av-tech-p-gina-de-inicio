import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Import project images
import project1 from '@/assets/projects/project-1.png';
import project2 from '@/assets/projects/project-2.jpg';
import project3 from '@/assets/projects/project-3.png';
import project4 from '@/assets/projects/project-4.jpg';
import project5 from '@/assets/projects/project-5.png';
import project6 from '@/assets/projects/project-6.png';
import project7 from '@/assets/projects/project-7.jpg';
import project8 from '@/assets/projects/project-8.jpg';

// Import catalog images for projects
import mupysLed from '@/assets/catalog/mupys-led.png';
import pantallaLedInterior from '@/assets/catalog/pantalla-led-interior.png';

const projects = [
  { id: 1, image: project1, title: 'Metro Barcelona ARS Gràcia', category: 'Transporte' },
  { id: 2, image: project2, title: 'Bershka Milan', category: 'Retail LED' },
  { id: 3, image: project3, title: 'Oxford Street Flagship Window', category: 'Escaparate a Medida' },
  { id: 4, image: project4, title: 'Lefties Parque Sur', category: 'LED Transparente' },
  { id: 5, image: project5, title: 'Digital Signage Jack & Jones', category: 'Señalización' },
  { id: 6, image: project6, title: 'Pantalla Circular', category: 'Displays Especiales' },
  { id: 7, image: project7, title: 'Interior Retail', category: 'Experiencia Visual' },
  { id: 8, image: project8, title: 'Corporate Lobby Experience', category: 'Espacios Corporativos' },
  { id: 9, image: mupysLed, title: 'Mupis LED Gimnasio', category: 'Digital Signage' },
  { id: 10, image: pantallaLedInterior, title: 'Pantalla LED Retail Interior', category: 'LED Interior' },
];

// Mobile auto-scroll carousel component
const MobileCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: true,
    skipSnaps: false,
  });

  const autoplay = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(autoplay, 2500);
    return () => clearInterval(interval);
  }, [emblaApi, autoplay]);

  return (
    <div className="overflow-hidden -mx-6" ref={emblaRef}>
      <div className="flex">
        {projects.map((project) => (
          <div 
            key={project.id} 
            className="flex-shrink-0 px-2"
            style={{ flexBasis: '75%' }}
          >
            <div className="relative overflow-hidden rounded-sm">
              <div className="aspect-square overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-mono text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {project.category}
                </p>
                <h3 className="font-mono text-sm mt-1" style={{ color: 'hsl(var(--text-primary))' }}>
                  {project.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Desktop carousel component with auto-scroll
const DesktopCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
  });

  const autoplay = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(autoplay, 2500);
    return () => clearInterval(interval);
  }, [emblaApi, autoplay]);

  return (
    <div className="w-full">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {projects.map((project) => (
            <div key={project.id} className="flex-shrink-0 pl-4 md:basis-1/2 lg:basis-1/3" style={{ minWidth: '33.333%' }}>
              <div className="group relative overflow-hidden rounded-sm">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-mono text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--text-secondary))' }}>
                    {project.category}
                  </p>
                  <h3 className="font-mono text-lg mt-1" style={{ color: 'hsl(var(--text-primary))' }}>
                    {project.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Proyectos = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section id="proyectos" className="relative py-16 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="section-tag">
            Nuestro trabajo
          </div>
          <h2 className="section-title max-w-3xl">
            <span className="section-title-primary">Proyectos</span>
            <br />
            <span className="section-title-secondary">que inspiran</span>
          </h2>
          <p className="section-description mt-4">
            Cada proyecto es una historia única.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Soluciones audiovisuales que transforman espacios y experiencias.
          </p>
        </motion.div>

        {/* Carousel de proyectos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16"
        >
          {isMobile ? <MobileCarousel /> : <DesktopCarousel />}
        </motion.div>
      </div>
    </section>
  );
};

export default Proyectos;
