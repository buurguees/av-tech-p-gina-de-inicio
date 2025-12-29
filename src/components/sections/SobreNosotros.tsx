import { motion } from 'motion/react';
import comoTrabajamosVisual from '@/assets/como-trabajamos-visual.png';
import visionVideo from '@/assets/vision-video.mp4';

const SobreNosotros = () => {
  return (
    <section id="sobre-nosotros" className="relative overflow-hidden">

      {/* Block 1: Header - IZQUIERDA */}
      <div className="relative py-24 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-12"
            >
              <div className="section-indicator" />
              <span className="section-tag mb-0">Quiénes somos</span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="section-title"
            >
              <span className="section-title-primary">Técnicos </span>
              <span className="section-title-secondary">antes que empresa</span>
            </motion.h3>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 space-y-6"
            >
              <p className="text-lead text-justify">
                Somos técnicos audiovisuales con más de cinco años de experiencia trabajando en instalaciones, eventos y proyectos reales; tanto en entornos comerciales como en proyectos de mayor envergadura.
              </p>
              <p className="text-body-muted text-justify">
                Antes de fundar AV TECH, ya estábamos en el terreno: montando, configurando, resolviendo incidencias y entendiendo cómo funciona de verdad un espacio cuando se integra tecnología audiovisual.
              </p>
              <p className="text-caption text-justify">
                Esa experiencia técnica y operativa es la base de todo lo que hacemos hoy.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Block 2: Por qué nació AV TECH - DERECHA */}
      <div className="relative py-24 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="ml-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-12 justify-end"
            >
              <span className="section-tag mb-0">Origen</span>
              <div className="section-indicator" />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="section-title text-right"
            >
              <span className="section-title-primary">Por qué nació</span>
              <br />
              <span className="section-title-secondary">AV TECH</span>
            </motion.h3>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 space-y-6 text-right"
            >
              <p className="text-body text-justify">
                Con el tiempo detectamos una realidad clara: muchas empresas, especialmente pequeñas y medianas, querían incorporar soluciones audiovisuales profesionales, pero no siempre encontraban propuestas ajustadas a su escala, a su ritmo de crecimiento o a su forma de trabajar.
              </p>
              <p className="text-body-muted text-justify">
                Al mismo tiempo, vimos que la tecnología audiovisual podía aplicarse de una forma más flexible, más cercana y más adaptada; sin perder nivel técnico ni calidad de ejecución.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-16 pr-6 border-r-2 border-foreground/20 text-right"
            >
              <p className="text-quote">
                AV TECH nace con la voluntad de acercar la tecnología audiovisual profesional a más tipos de negocio, adaptando cada proyecto a su contexto real, independientemente de su tamaño.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Block 3: Nuestra visión - TWO COLUMNS */}
      <div className="relative py-24 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Title - Always first */}
            <div className="order-1">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="flex items-center gap-4 mb-12"
              >
                <div className="section-indicator" />
                <span className="section-tag mb-0">Visión</span>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="section-title"
              >
                <span className="section-title-primary">Nuestra </span>
                <span className="section-title-secondary">visión</span>
              </motion.h3>
            </div>

            {/* Video - Second on mobile, right column on desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center justify-center order-2 lg:order-3 lg:row-span-2"
            >
              {/* Top gradient */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              
              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
              
              {/* Left gradient */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
              
              {/* Right gradient */}
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

              <video 
                src={visionVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-contain"
              />
            </motion.div>

            {/* Text content - Third on mobile, left column on desktop */}
            <div className="order-3 lg:order-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <p className="text-lead text-justify">
                  Creemos que la tecnología audiovisual no debería entenderse como una solución única ni rígida.
                </p>
                <p className="text-body-muted text-justify">
                  Cada espacio, cada empresa y cada proyecto requieren una lectura propia.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-16 p-8 md:p-12 border border-foreground/10"
              >
                <p className="text-caption mb-4">Nuestra finalidad</p>
                <p className="text-body text-justify mb-6">
                  Desarrollar soluciones audiovisuales que permitan:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                    <span className="text-body">Mejorar la comunicación visual</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                    <span className="text-body">Generar impacto</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                    <span className="text-body">Crear experiencias memorables</span>
                  </li>
                </ul>
                <p className="text-small text-justify mt-6">
                  Tanto en entornos retail y PYMEs como en proyectos corporativos y de mayor escala.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Block 4: Cómo trabajamos - Background Image Layout */}
      <div className="relative py-24 sm:py-32 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full relative z-10">
          {/* Mobile: Title first */}
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-12"
            >
              <div className="section-indicator" />
              <span className="section-tag mb-0">Proceso</span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="section-title"
            >
              <span className="section-title-primary">Cómo </span>
              <span className="section-title-secondary">trabajamos</span>
            </motion.h3>
          </div>

          {/* Mobile: Image second */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden relative my-12 -mx-6"
          >
            {/* Top gradient */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

            <img 
              src={comoTrabajamosVisual} 
              alt="Antes y después de instalación de pantalla LED en tienda" 
              className="w-full h-auto object-contain"
            />
          </motion.div>

          {/* Mobile: Text third */}
          <div className="lg:hidden">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-lead"
            >
              No ofrecemos soluciones genéricas. Cada proyecto parte de una pregunta simple:
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-quote italic"
            >
              ¿Qué necesita este espacio para comunicar mejor y cumplir su objetivo?
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 grid grid-cols-1 gap-4"
            >
              {[
                { num: '01', text: 'Analizamos el entorno y el uso real del espacio' },
                { num: '02', text: 'Diseñamos una solución audiovisual coherente y escalable' },
                { num: '03', text: 'Integramos la tecnología de forma precisa y cuidada' },
                { num: '04', text: 'Acompañamos al cliente antes, durante y después de la instalación' },
              ].map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-4 p-4 border border-foreground/5 bg-transparent hover:border-foreground/15 transition-colors duration-300"
                >
                  <span className="text-caption">{step.num}</span>
                  <span className="text-body text-justify">{step.text}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12 text-small text-justify"
            >
              Desarrollamos proyectos únicos, adaptados a cada necesidad, cada espacio y cada fase de crecimiento.
            </motion.p>
          </div>

          {/* Desktop: Original layout with background image */}
          <div className="hidden lg:block">
            {/* Background Image - positioned absolute */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-1/2 -translate-y-1/2 left-16 w-[50%] z-0"
            >
              {/* Top gradient */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              
              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
              
              {/* Right gradient - stronger to blend into content */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              
              {/* Left gradient */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

              <img 
                src={comoTrabajamosVisual} 
                alt="Antes y después de instalación de pantalla LED en tienda" 
                className="w-full h-auto object-contain"
              />
            </motion.div>

            {/* Content - positioned on the right */}
            <div className="ml-auto max-w-xl lg:max-w-2xl relative z-10">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="flex items-center gap-4 mb-12 justify-end"
              >
                <span className="section-tag mb-0">Proceso</span>
                <div className="section-indicator" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="section-title text-right"
              >
                <span className="section-title-primary">Cómo </span>
                <span className="section-title-secondary">trabajamos</span>
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 text-lead text-right"
              >
                No ofrecemos soluciones genéricas. Cada proyecto parte de una pregunta simple:
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 text-quote italic text-right"
              >
                ¿Qué necesita este espacio para comunicar mejor y cumplir su objetivo?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {[
                  { num: '01', text: 'Analizamos el entorno y el uso real del espacio' },
                  { num: '02', text: 'Diseñamos una solución audiovisual coherente y escalable' },
                  { num: '03', text: 'Integramos la tecnología de forma precisa y cuidada' },
                  { num: '04', text: 'Acompañamos al cliente antes, durante y después de la instalación' },
                ].map((step, index) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-4 p-4 border border-foreground/5 bg-transparent hover:border-foreground/15 transition-colors duration-300 text-right flex-row-reverse"
                  >
                    <span className="text-caption" style={{ textShadow: '-1px -1px 0 hsl(var(--background)), 1px -1px 0 hsl(var(--background)), -1px 1px 0 hsl(var(--background)), 1px 1px 0 hsl(var(--background))' }}>{step.num}</span>
                    <span className="text-body text-justify" style={{ textShadow: '-1px -1px 0 hsl(var(--background)), 1px -1px 0 hsl(var(--background)), -1px 1px 0 hsl(var(--background)), 1px 1px 0 hsl(var(--background))' }}>{step.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-12 text-small text-justify"
              >
                Desarrollamos proyectos únicos, adaptados a cada necesidad, cada espacio y cada fase de crecimiento.
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      {/* Block 5: Lo que nos define - IZQUIERDA */}
      <div className="relative py-24 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-12"
            >
              <div className="section-indicator" />
              <span className="section-tag mb-0">Valores</span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="section-title"
            >
              <span className="section-title-primary">Lo que </span>
              <span className="section-title-secondary">nos define</span>
            </motion.h3>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8"
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
                  <span className="text-body">{value}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-16 text-lead"
            >
              Más que proveedores, buscamos ser un <span className="section-title-primary">partner audiovisual de confianza</span>, capaz de acompañar proyectos pequeños, medianos o complejos con la misma seriedad y atención al detalle.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Block 6: Cierre - CENTRADO */}
      <div className="relative py-24 sm:py-32 flex items-center justify-center">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto"
          >
            <p className="text-statement text-statement-secondary">
              AV TECH no nace para imponer tecnología,
            </p>
            <p className="text-statement text-statement-primary mt-2">
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
                className="section-indicator"
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