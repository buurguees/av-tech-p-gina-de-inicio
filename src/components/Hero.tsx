const Hero = () => {
  return (
    <section
      id="inicio"
      className="min-h-screen flex items-center px-6 sm:px-8 md:px-16"
    >
      <div className="max-w-[1800px] w-full">
        <div className="max-w-3xl text-left">
          {/* Main Headline */}
          <h1 className="section-title mb-8 animate-fade-in-up">
            <span className="section-title-primary">Convertimos espacios físicos</span>
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
    </section>
  );
};

export default Hero;
