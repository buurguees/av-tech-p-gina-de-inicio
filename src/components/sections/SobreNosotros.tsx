import { motion } from 'motion/react';

const SobreNosotros = () => {
  return (
    <section id="sobre-nosotros" className="relative bg-background overflow-hidden">

      {/* Block 1: Header */}
      <div className="relative min-h-screen flex items-center">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="section-tag">Quiénes somos</div>
            <h2 className="section-title max-w-4xl">
              <span className="section-title-primary">Técnicos </span>
              <span className="section-title-secondary">antes que empresa</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-2xl"
          >
            <p className="font-mono text-lg md:text-xl leading-relaxed text-foreground/80">
              Somos técnicos audiovisuales con más de cinco años de experiencia trabajando en instalaciones, eventos y proyectos reales.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60 mt-6">
              Antes de fundar AV TECH, ya estábamos en el terreno: montando, configurando, resolviendo problemas y entendiendo cómo funciona de verdad un espacio cuando se integra tecnología audiovisual.
            </p>
            <p className="font-mono text-sm tracking-wide text-foreground/40 mt-8 uppercase">
              Esa experiencia práctica es la base de todo lo que hacemos hoy.
            </p>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 h-px bg-gradient-to-r from-foreground/30 via-foreground/10 to-transparent origin-left max-w-xl"
          />
        </div>
      </div>

      {/* Block 2: Por qué nació AV TECH */}
      <div className="relative min-h-screen flex items-center border-t border-foreground/5">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40">Origen</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl"
          >
            <span className="text-foreground">Por qué nació </span>
            <span className="text-foreground/50">AV TECH</span>
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-2xl space-y-6"
          >
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/70">
              Con el tiempo detectamos una realidad clara: para muchas pequeñas y medianas empresas, acceder a tecnología audiovisual profesional —especialmente pantallas LED— seguía siendo poco viable.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60">
              El sector estaba dominado por grandes integradores con márgenes elevados, soluciones sobredimensionadas y precios fuera del alcance de las PYMEs.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60">
              Negocios con potencial se quedaban fuera no por falta de visión, sino por falta de accesibilidad.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 pl-6 border-l-2 border-foreground/20"
          >
            <p className="font-mono text-xl md:text-2xl text-foreground font-medium">
              AV TECH nace precisamente para romper esa barrera.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Block 3: Nuestra visión */}
      <div className="relative min-h-screen flex items-center border-t border-foreground/5 bg-foreground/[0.02]">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40">Visión</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl"
          >
            <span className="text-foreground">Nuestra </span>
            <span className="text-foreground/50">visión</span>
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-2xl space-y-6"
          >
            <p className="font-mono text-lg md:text-xl leading-relaxed text-foreground/80">
              Creemos que la tecnología audiovisual no debería ser un privilegio reservado a grandes marcas.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60">
              Creemos que cualquier espacio, por pequeño que sea, puede comunicar mejor, generar emociones y dejar huella.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 p-8 md:p-12 bg-foreground/[0.03] border border-foreground/10 max-w-2xl"
          >
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40 mb-4">Nuestra finalidad</p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/80">
              Hacer accesible la tecnología audiovisual profesional a pequeñas y medianas empresas, tanto en entornos retail como en espacios pensados para crear experiencias memorables.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Block 4: Cómo trabajamos */}
      <div className="relative min-h-screen flex items-center border-t border-foreground/5">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40">Proceso</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl"
          >
            <span className="text-foreground">Cómo </span>
            <span className="text-foreground/50">trabajamos</span>
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 font-mono text-lg md:text-xl leading-relaxed text-foreground/70 max-w-2xl"
          >
            No ofrecemos soluciones genéricas. Cada proyecto parte de una pregunta simple:
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-mono text-xl md:text-2xl text-foreground font-medium italic"
          >
            ¿Qué necesita este espacio para comunicar mejor?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl"
          >
            {[
              { num: '01', text: 'Analizamos el entorno' },
              { num: '02', text: 'Diseñamos la solución adecuada' },
              { num: '03', text: 'Integramos tecnología audiovisual de forma coherente' },
              { num: '04', text: 'Acompañamos al cliente antes, durante y después' },
            ].map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4 p-4 bg-foreground/[0.02] border border-foreground/5 hover:border-foreground/15 transition-colors duration-300"
              >
                <span className="font-mono text-xs text-foreground/30">{step.num}</span>
                <span className="font-mono text-sm md:text-base text-foreground/70">{step.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 font-mono text-sm text-foreground/50 max-w-xl"
          >
            Desarrollamos proyectos únicos, adaptados a cada necesidad, cada espacio y cada objetivo.
          </motion.p>
        </div>
      </div>

      {/* Block 5: Lo que nos define */}
      <div className="relative min-h-screen flex items-center border-t border-foreground/5 bg-foreground/[0.02]">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40">Valores</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl"
          >
            <span className="text-foreground">Lo que </span>
            <span className="text-foreground/50">nos define</span>
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl"
          >
            {[
              'Experiencia técnica real',
              'Enfoque claro en PYMEs',
              'Tecnología bien aplicada, sin exceso',
              'Proyectos pensados para personas, no solo para pantallas',
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-4"
              >
                <div className="w-1 h-8 bg-foreground/20" />
                <span className="font-mono text-base md:text-lg text-foreground/80">{value}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 font-mono text-lg md:text-xl text-foreground/70 max-w-2xl"
          >
            Más que proveedores, buscamos ser un <span className="text-foreground">partner audiovisual de confianza</span>, cercano y transparente.
          </motion.p>
        </div>
      </div>

      {/* Block 6: Cierre */}
      <div className="relative min-h-[70vh] flex items-center justify-center border-t border-foreground/5">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-20 sm:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto"
          >
            <p className="font-mono text-xl sm:text-2xl md:text-3xl leading-relaxed text-foreground/60">
              AV TECH no nace para vender más tecnología,
            </p>
            <p className="font-mono text-xl sm:text-2xl md:text-3xl leading-relaxed text-foreground mt-2">
              nace para ayudar a las empresas a comunicarse mejor a través de ella.
            </p>
          </motion.div>

          {/* Decorative element */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 flex justify-center gap-2"
          >
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-foreground/30 rounded-full"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SobreNosotros;
