import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-led-screen.jpg';

const Hero = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Pantalla LED profesional en espacio comercial"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 hero-overlay" />
        {/* Extra dark overlay for better text readability */}
        <div className="absolute inset-0 bg-background/40" />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-up">
            <span className="inline-block px-4 py-2 text-xs font-medium tracking-widest uppercase bg-secondary/50 border border-border/50 rounded-full mb-8 backdrop-blur-sm">
              Tecnología Audiovisual como Servicio
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in-up-delay-1">
            Transforma tu espacio en una{' '}
            <span className="text-glow">experiencia visual</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up-delay-2">
            Pantallas LED profesionales en alquiler con contenido, instalación y
            soporte técnico incluidos. Sin inversión inicial, sin complicaciones.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
            <Button variant="hero" size="xl" className="group">
              Solicitar Presupuesto
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="hero-outline" size="xl" className="group">
              <Play className="w-5 h-5" />
              Ver Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-border/30 animate-fade-in-up-delay-3">
            <p className="text-sm text-muted-foreground mb-4">
              Confianza de más de 100+ empresas
            </p>
            <div className="flex items-center justify-center gap-8 opacity-50">
              <span className="text-sm font-medium">RETAIL</span>
              <span className="text-sm font-medium">GIMNASIOS</span>
              <span className="text-sm font-medium">OFICINAS</span>
              <span className="text-sm font-medium">EVENTOS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;