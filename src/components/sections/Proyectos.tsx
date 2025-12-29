import { motion } from 'motion/react';
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

const projects = [
  { id: 1, image: project1, title: 'Metro Barcelona ARS Gràcia', category: 'Transporte' },
  { id: 2, image: project2, title: 'Bershka Milan', category: 'Retail LED' },
  { id: 3, image: project3, title: 'Oxford Street Flagship Window', category: 'Escaparate a Medida' },
  { id: 4, image: project4, title: 'Lefties Parque Sur', category: 'LED Transparente' },
  { id: 5, image: project5, title: 'Digital Signage Jack & Jones', category: 'Señalización' },
  { id: 6, image: project6, title: 'Pantalla Circular', category: 'Displays Especiales' },
  { id: 7, image: project7, title: 'Interior Retail', category: 'Experiencia Visual' },
  { id: 8, image: project8, title: 'Corporate Lobby Experience', category: 'Espacios Corporativos' },
];

const Proyectos = () => {
  return (
    <section id="proyectos" className="relative py-20 sm:py-32 overflow-hidden">
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
            <span className="section-title-primary">Proyectos que </span>
            <span className="section-title-secondary">inspiran</span>
          </h2>
          <p className="section-description mt-4">
            Cada proyecto es una historia única.
            <br />
            Soluciones audiovisuales que transforman espacios y experiencias.
          </p>
        </motion.div>

        {/* Carousel de proyectos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16"
        >
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {projects.map((project) => (
                <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="group relative overflow-hidden rounded-sm">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="font-mono text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--text-secondary))' }}>
                        {project.category}
                      </p>
                      <h3 className="font-mono text-lg mt-1" style={{ color: 'hsl(var(--text-primary))' }}>
                        {project.title}
                      </h3>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-6">
              <CarouselPrevious className="static translate-y-0 bg-secondary border-border hover:bg-accent" />
              <CarouselNext className="static translate-y-0 bg-secondary border-border hover:bg-accent" />
            </div>
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
};

export default Proyectos;
