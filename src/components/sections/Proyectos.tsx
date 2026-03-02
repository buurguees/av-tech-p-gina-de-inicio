import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

import project1 from '@/assets/projects/project-1.png';
import project5 from '@/assets/projects/project-5.png';
import project7 from '@/assets/projects/project-7.jpg';
import project8 from '@/assets/projects/project-8.jpg';
import mupysLed from '@/assets/catalog/mupys-led.png';
import pantallaLedInterior from '@/assets/catalog/pantalla-led-interior.png';

const projects = [
  { id: 1, image: project1, title: 'Metro Barcelona ARS Gracia', category: 'Transporte' },
  { id: 5, image: project5, title: 'Digital Signage Jack and Jones', category: 'Senalizacion' },
  { id: 7, image: project7, title: 'Interior Retail', category: 'Experiencia visual' },
  { id: 8, image: project8, title: 'Corporate Lobby Experience', category: 'Espacios corporativos' },
  { id: 9, image: mupysLed, title: 'Mupis LED Gimnasio', category: 'Digital Signage' },
  { id: 10, image: pantallaLedInterior, title: 'Pantalla LED Retail Interior', category: 'LED interior' },
];

const MobileCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
  });

  const autoplay = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(autoplay, 2800);
    return () => clearInterval(interval);
  }, [autoplay, emblaApi]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between px-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/55">
          Desliza proyectos reales
        </p>
        <p className="font-mono text-xs text-muted-foreground">{projects.length} casos</p>
      </div>

      <div className="-mx-6 overflow-hidden" ref={emblaRef}>
        <div className="flex pl-6">
          {projects.map((project) => (
            <div key={project.id} className="min-w-0 shrink-0 basis-[84%] pr-4">
              <article className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/60">
                    {project.category}
                  </p>
                  <h3 className="mt-2 font-mono text-lg text-foreground">{project.title}</h3>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    const interval = setInterval(autoplay, 2800);
    return () => clearInterval(interval);
  }, [autoplay, emblaApi]);

  return (
    <div className="w-full">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {projects.map((project) => (
            <div key={project.id} className="min-w-0 shrink-0 pl-4 md:basis-1/2 lg:basis-1/3">
              <article className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-foreground/60">{project.category}</p>
                  <h3 className="mt-1 font-mono text-lg text-foreground">{project.title}</h3>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Proyectos = () => {
  return (
    <section id="proyectos" className="relative overflow-hidden py-16 sm:py-32">
      <div className="mx-auto max-w-[1800px] px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="section-tag">Nuestro trabajo</div>
          <h2 className="section-title max-w-3xl">
            <span className="section-title-primary">Proyectos</span>
            <br />
            <span className="section-title-secondary">que inspiran</span>
          </h2>
          <p className="section-description mt-4 max-w-2xl">
            Cada proyecto es una historia unica. Soluciones audiovisuales que transforman espacios y experiencias.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16"
        >
          <div className="sm:hidden">
            <MobileCarousel />
          </div>
          <div className="hidden sm:block">
            <DesktopCarousel />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Proyectos;
