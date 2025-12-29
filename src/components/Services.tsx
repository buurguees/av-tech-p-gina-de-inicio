import { Monitor, Palette, Wrench, Headphones } from 'lucide-react';

const services = [
  {
    icon: Monitor,
    title: 'Pantallas LED Premium',
    description:
      'Tecnología de última generación con resolución ultra-alta y brillo adaptativo para cualquier ambiente.',
  },
  {
    icon: Palette,
    title: 'Contenido Personalizado',
    description:
      'Diseño y gestión de contenidos visuales adaptados a tu marca y objetivos comerciales.',
  },
  {
    icon: Wrench,
    title: 'Instalación Profesional',
    description:
      'Montaje e integración completa en tu espacio por nuestro equipo técnico especializado.',
  },
  {
    icon: Headphones,
    title: 'Soporte Continuo',
    description:
      'Asistencia técnica 24/7 y mantenimiento preventivo incluido en todos nuestros planes.',
  },
];

const Services = () => {
  return (
    <section id="servicios" className="py-24 md:py-32 bg-card relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 text-xs font-medium tracking-widest uppercase text-muted-foreground border border-border rounded-full mb-6">
            Nuestros Servicios
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Todo incluido, sin sorpresas
          </h2>
          <p className="text-muted-foreground text-lg text-justify">
            Un servicio integral que transforma la complejidad técnica en una
            solución simple y efectiva para tu negocio.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group p-8 bg-secondary/30 border border-border/50 rounded-lg hover:border-foreground/20 hover:bg-secondary/50 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 mb-6 flex items-center justify-center bg-foreground/5 rounded-lg group-hover:bg-foreground/10 transition-colors">
                <service.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed text-justify">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;