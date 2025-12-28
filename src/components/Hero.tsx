const Hero = () => {
  return (
    <section
      id="inicio"
      className="min-h-screen flex items-center justify-center bg-background px-6"
    >
      <div className="max-w-3xl">
        {/* Main Headline */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-medium leading-tight mb-8 animate-fade-in-up tracking-tight">
          Convertimos espacios físicos en experiencias visuales
        </h1>

        {/* Subheadline */}
        <h2 className="text-base md:text-lg text-muted-foreground font-light mb-6 animate-fade-in-up-delay-1 leading-relaxed">
          Ayudamos a empresas y marcas a mejorar la forma en la que se muestran, 
          se escuchan y se recuerdan, a través de soluciones audiovisuales 
          profesionales adaptadas a cada espacio.
        </h2>

        {/* Supporting text */}
        <p className="text-sm text-muted-foreground/60 animate-fade-in-up-delay-2">
          Desde pantallas LED y sistemas de sonido hasta gestión de contenidos y soporte continuo.
        </p>
      </div>
    </section>
  );
};

export default Hero;
