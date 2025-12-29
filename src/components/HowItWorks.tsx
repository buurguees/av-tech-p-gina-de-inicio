import { CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Consulta Inicial',
    description:
      'Analizamos tu espacio y necesidades para diseñar la solución audiovisual perfecta.',
  },
  {
    number: '02',
    title: 'Propuesta Personalizada',
    description:
      'Te presentamos un plan adaptado con equipamiento, contenido y presupuesto transparente.',
  },
  {
    number: '03',
    title: 'Instalación Express',
    description:
      'Nuestro equipo técnico realiza la instalación completa en el menor tiempo posible.',
  },
  {
    number: '04',
    title: 'Activo y Funcionando',
    description:
      'Tu pantalla LED empieza a impactar a tus clientes con contenido profesional.',
  },
];

const benefits = [
  'Sin inversión inicial',
  'Contrato flexible a 18 meses',
  'Actualización de contenidos incluida',
  'Mantenimiento preventivo',
  'Soporte técnico 24/7',
  'Seguro todo riesgo',
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="relative min-h-screen overflow-hidden">
      {/* Video placeholder - Left Side */}
      <div className="absolute inset-y-0 left-0 w-1/2 hidden lg:block">
        {/* Video placeholder container with 1:1 aspect ratio centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-[min(100%,100vh)] aspect-square bg-secondary/20 border border-border/30">
            {/* Placeholder for future video */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              {/* Empty for video */}
            </div>
          </div>
        </div>

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-background via-background/60 to-transparent z-10" />
        
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
      </div>

      {/* Content - Right Side on desktop, full width on mobile */}
      <div className="relative min-h-screen flex items-center py-24 md:py-32">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 w-full">
          <div className="lg:w-1/2 lg:ml-auto lg:text-right lg:pl-8">
            {/* Section Header */}
            <div className="max-w-2xl lg:ml-auto mb-16">
              <span className="inline-block px-4 py-2 text-xs font-medium tracking-widest uppercase text-muted-foreground border border-border rounded-full mb-6">
                Proceso Simple
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                ¿Cómo funciona?
              </h2>
              <p className="text-muted-foreground text-lg">
                De la idea a la realidad en 4 simples pasos. Nos encargamos de todo
                para que tú solo disfrutes de los resultados.
              </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
              {steps.map((step, index) => (
                <div key={step.number} className="relative lg:text-right">
                  <div className="relative">
                    <span className="text-6xl font-bold text-secondary/80">
                      {step.number}
                    </span>
                    <h3 className="text-xl font-semibold mt-4 mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="bg-secondary/30 border border-border/50 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="lg:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    La tecnología profesional que tu negocio merece
                  </h3>
                  <p className="text-muted-foreground">
                    Eliminamos las barreras de entrada para que cualquier PYME pueda
                    acceder a soluciones audiovisuales de alto impacto.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:text-left">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;