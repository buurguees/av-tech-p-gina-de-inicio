import { motion } from 'motion/react';

const SobreNosotros = () => {
  return (
    <section id="sobre-nosotros" className="relative overflow-hidden">

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
              Somos técnicos audiovisuales con más de cinco años de experiencia trabajando en instalaciones, eventos y proyectos reales, tanto en entornos comerciales como en proyectos de mayor envergadura.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60 mt-6">
              Antes de fundar AV TECH, ya estábamos en el terreno: montando, configurando, resolviendo incidencias y entendiendo cómo funciona de verdad un espacio cuando se integra tecnología audiovisual.
            </p>
            <p className="font-mono text-sm tracking-wide text-foreground/40 mt-8 uppercase">
              Esa experiencia técnica y operativa es la base de todo lo que hacemos hoy.
            </p>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 h-px bg-foreground/20 origin-left max-w-xl"
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
              Con el tiempo detectamos una realidad clara: muchas empresas —especialmente pequeñas y medianas— querían incorporar soluciones audiovisuales profesionales, pero no siempre encontraban propuestas ajustadas a su escala, a su ritmo de crecimiento o a su forma de trabajar.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60">
              Al mismo tiempo, vimos que la tecnología audiovisual podía aplicarse de una forma más flexible, más cercana y más adaptada, sin perder nivel técnico ni calidad de ejecución.
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
              AV TECH nace con la voluntad de acercar la tecnología audiovisual profesional a más tipos de negocio, adaptando cada proyecto a su contexto real, independientemente de su tamaño.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Block 3: Nuestra visión */}
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
              Creemos que la tecnología audiovisual no debería entenderse como una solución única ni rígida.
            </p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/60">
              Creemos que cada espacio, cada empresa y cada proyecto requieren una lectura propia.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 p-8 md:p-12 border border-foreground/10 max-w-2xl"
          >
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40 mb-4">Nuestra finalidad</p>
            <p className="font-mono text-base md:text-lg leading-relaxed text-foreground/80 mb-6">
              Desarrollar soluciones audiovisuales que permitan:
            </p>
            <ul className="space-y-3 font-mono text-base md:text-lg text-foreground/70">
              <li className="flex items-start gap-3">
                <span className="text-foreground/40">—</span>
                <span>mejorar la comunicación visual,</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-foreground/40">—</span>
                <span>generar impacto,</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-foreground/40">—</span>
                <span>y crear experiencias memorables,</span>
              </li>
            </ul>
            <p className="font-mono text-sm text-foreground/50 mt-6">
              tanto en entornos retail y PYMEs como en proyectos corporativos y de mayor escala.
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
            ¿Qué necesita este espacio para comunicar mejor y cumplir su objetivo?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl"
          >
            {[
              { num: '01', text: 'Analizamos el entorno y el uso real del espacio' },
              { num: '02', text: 'Diseñamos una solución audiovisual coherente y escalable' },
              { num: '03', text: 'Integramos la tecnología de forma precisa y cuidada' },
              { num: '04', text: 'Acompañamos al cliente antes, durante y después de la instalación' },
            ].map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4 p-4 border border-foreground/5 hover:border-foreground/15 transition-colors duration-300"
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
            Desarrollamos proyectos únicos, adaptados a cada necesidad, cada espacio y cada fase de crecimiento.
          </motion.p>
        </div>
      </div>

      {/* Block 5: Lo que nos define */}
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
              'Capacidad para trabajar a distintas escalas',
              'Enfoque claro en soluciones bien dimensionadas',
              'Tecnología aplicada con criterio, no por exceso',
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
            Más que proveedores, buscamos ser un <span className="text-foreground">partner audiovisual de confianza</span>, capaz de acompañar proyectos pequeños, medianos o complejos con la misma seriedad y atención al detalle.
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
              AV TECH no nace para imponer tecnología,
            </p>
            <p className="font-mono text-xl sm:text-2xl md:text-3xl leading-relaxed text-foreground mt-2">
              nace para ponerla al servicio de las personas, los espacios y los proyectos, sea cual sea su tamaño.
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
