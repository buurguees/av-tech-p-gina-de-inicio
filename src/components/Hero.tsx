import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(0_0%_15%/0.15)_0%,_transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 animate-fade-in-up">
            Convertimos espacios físicos en{' '}
            <span className="text-glow">experiencias visuales</span>
          </h1>

          {/* Subheadline */}
          <h2 className="text-xl md:text-2xl text-muted-foreground font-light max-w-3xl mx-auto mb-6 animate-fade-in-up-delay-1">
            Ayudamos a empresas y marcas a mejorar la forma en la que se muestran, 
            se escuchan y se recuerdan, a través de soluciones audiovisuales 
            profesionales adaptadas a cada espacio.
          </h2>

          {/* Supporting text */}
          <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl mx-auto mb-12 animate-fade-in-up-delay-2">
            Desde pantallas LED y sistemas de sonido hasta gestión de contenidos y soporte continuo.
          </p>

          {/* CTA Button */}
          <div className="animate-fade-in-up-delay-3">
            <Button variant="hero" size="xl" className="group">
              Descubrir soluciones
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
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