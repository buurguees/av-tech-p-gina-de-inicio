import { motion } from 'motion/react';
import comoTrabajamosVisual from '@/assets/como-trabajamos-visual.png';
import visionVideo from '@/assets/vision-video.mp4';
import logoAvtech from '@/assets/logos/Logto_AVETCH_Simple_Fondo_Negro_Logo_Blanco.png';
const SobreNosotros = () => {
  return (
    <section id="sobre-nosotros" className="relative overflow-hidden">

      {/* Block 1: Por qué nació AV TECH - Layout 60/40 */}
      <div className="relative py-16 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="flex flex-col lg:flex-row lg:gap-16 items-stretch">
            {/* Left column - Text (60%) */}
            <div className="w-full lg:w-[60%]">
              <motion.div initial={{
              opacity: 0
            }} whileInView={{
              opacity: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 1
            }} className="flex items-center gap-4 mb-12">
                <div className="section-indicator" />
                <span className="section-tag mb-0">Quiénes somos</span>
              </motion.div>

              <motion.h3 initial={{
              opacity: 0,
              y: 40
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1]
            }} className="section-title">
                <span className="section-title-primary">Por qué nació</span>
                <br />
                <span className="section-title-secondary">AV TECH</span>
              </motion.h3>

              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-12 space-y-8">
                <div>
                  <p className="text-lead mb-4">
                    Detectamos algo frustrante en el mercado:
                  </p>
                  <p className="text-body-muted text-justify">
                    Empresas con grandes ideas se encontraban con proveedores que solo ofrecían soluciones rígidas, pensadas para grandes corporaciones. Presupuestos inflados. Propuestas que no escuchaban lo que realmente necesitaban.
                  </p>
                </div>

                <div>
                  <p className="text-lead mb-4">
                    Vimos una oportunidad:
                  </p>
                  <p className="text-body-muted text-justify">
                    ¿Y si la tecnología audiovisual profesional pudiera ser flexible, cercana y perfectamente ajustada a cada tipo de negocio?
                  </p>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              x: -20
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-10 pl-6 border-l-2 border-foreground/20 space-y-4">
                <p className="text-body text-justify">
                  AV TECH nace para democratizar el acceso a experiencias audiovisuales de alto impacto. Sin importar si tienes una boutique en Barcelona o una cadena de hoteles en Europa.
                </p>
                <p className="text-quote">
                  Porque creemos que cada espacio, sea cual sea su tamaño, merece brillar con la misma intensidad.
                </p>
              </motion.div>
            </div>

            {/* Right column - Logo (40%) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="hidden lg:flex w-[40%] items-center justify-center"
            >
              <motion.img 
                src={logoAvtech} 
                alt="AV TECH" 
                className="w-[80%] max-w-[450px]"
                animate={{ 
                  scale: [1, 1.07, 1],
                }}
                transition={{
                  duration: 4,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop"
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Block 2: Cómo trabajamos - Background Image Layout - DERECHA */}
      <div className="relative py-16 sm:py-32 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full relative z-10">
          {/* Mobile: Title first */}
          <div className="lg:hidden">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 1
          }} className="flex items-center gap-4 mb-12 justify-end">
              <span className="section-tag mb-0">Proceso</span>
              <div className="section-indicator" />
            </motion.div>

            <motion.h3 initial={{
            opacity: 0,
            y: 40
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1]
          }} className="section-title text-right">
              <span className="section-title-primary">Cómo </span>
              <span className="section-title-secondary">trabajamos</span>
            </motion.h3>
          </div>

          {/* Mobile: Image second */}
          <motion.div initial={{
          opacity: 0
        }} whileInView={{
          opacity: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1]
        }} className="lg:hidden relative my-12 -mx-6">
            {/* Top gradient */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

            <img src={comoTrabajamosVisual} alt="Antes y después de instalación de pantalla LED en tienda" className="w-full h-auto object-contain" />
          </motion.div>

          {/* Mobile: Text third */}
          <div className="lg:hidden">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1]
          }} className="space-y-4 text-right">
              <p className="text-lead">
                Cada proyecto comienza con una pregunta diferente.
              </p>
              <p className="text-lead">
                Nunca con una solución predefinida.
              </p>
              <p className="text-body-muted mt-6">
                Porque no creemos en imponer tecnología.
              </p>
              <p className="text-body-muted">
                Creemos en escuchar primero, diseñar después.
              </p>
            </motion.div>

            <motion.p initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.25,
            ease: [0.22, 1, 0.36, 1]
          }} className="mt-8 text-quote italic text-right">
              ¿Qué necesita este espacio para dejar huella?
            </motion.p>

            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.35,
            ease: [0.22, 1, 0.36, 1]
          }} className="mt-12 grid grid-cols-1 gap-4">
              {[{
              num: '01',
              text: 'Escuchamos tu visión y analizamos el potencial real del espacio'
            }, {
              num: '02',
              text: 'Diseñamos una propuesta audiovisual única, pensada solo para ti'
            }, {
              num: '03',
              text: 'Integramos cada elemento con precisión milimétrica, porque los detalles son los que marcan la diferencia'
            }, {
              num: '04',
              text: 'Te acompañamos en cada fase: desde la idea hasta el día que todo cobra vida, y más allá'
            }].map((step, index) => <motion.div key={step.num} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.6,
              delay: 0.4 + index * 0.1,
              ease: [0.22, 1, 0.36, 1]
            }} className="flex items-start gap-4 p-4 border border-foreground/5 bg-transparent hover:border-foreground/15 transition-colors duration-300 flex-row-reverse text-right">
                  <span className="text-caption">{step.num}</span>
                  <span className="text-body text-justify">{step.text}</span>
                </motion.div>)}
            </motion.div>

            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.6
          }} className="mt-12 space-y-2 text-right">
              <p className="text-small">
                No hacemos instalaciones.
              </p>
              <p className="text-small">
                Creamos experiencias que crecen contigo.
              </p>
            </motion.div>
          </div>

          {/* Desktop: Layout 40/60 with background image (text on right) */}
          <div className="hidden lg:flex lg:flex-row lg:gap-16 items-stretch">
            {/* Background Image - positioned absolute (unchanged) */}
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1]
          }} className="absolute top-1/2 -translate-y-1/2 left-16 w-[50%] z-0">
              {/* Top gradient */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              
              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
              
              {/* Right gradient - stronger to blend into content */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              
              {/* Left gradient */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

              <img src={comoTrabajamosVisual} alt="Antes y después de instalación de pantalla LED en tienda" className="w-full h-auto object-contain" />
            </motion.div>

            {/* Left column - Empty space for background image (40%) */}
            <div className="w-[40%]" />

            {/* Right column - Text (60%) */}
            <div className="w-[60%] relative z-10">
              <motion.div initial={{
              opacity: 0
            }} whileInView={{
              opacity: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 1
            }} className="flex items-center gap-4 mb-12 justify-end">
                <span className="section-tag mb-0" style={{
                  textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
                }}>Proceso</span>
                <div className="section-indicator" />
              </motion.div>

              <motion.h3 initial={{
              opacity: 0,
              y: 40
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1]
            }} className="section-title text-right" style={{
              textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
            }}>
                <span className="section-title-primary">Cómo </span>
                <span className="section-title-secondary">trabajamos</span>
              </motion.h3>

              <motion.div initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-8 space-y-4 text-right" style={{
              textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
            }}>
                <p className="text-lead">
                  Cada proyecto comienza con una pregunta diferente.
                </p>
                <p className="text-lead">
                  Nunca con una solución predefinida.
                </p>
                <p className="text-body-muted mt-6">
                  Porque no creemos en imponer tecnología.
                </p>
                <p className="text-body-muted">
                  Creemos en escuchar primero, diseñar después.
                </p>
              </motion.div>

              <motion.p initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.25,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-8 text-quote italic text-right" style={{
              textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
            }}>
                ¿Qué necesita este espacio para dejar huella?
              </motion.p>

              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
                {[{
                num: '01',
                text: 'Escuchamos tu visión y analizamos el potencial real del espacio'
              }, {
                num: '02',
                text: 'Diseñamos una propuesta audiovisual única, pensada solo para ti'
              }, {
                num: '03',
                text: 'Integramos cada elemento con precisión milimétrica, porque los detalles son los que marcan la diferencia'
              }, {
                num: '04',
                text: 'Te acompañamos en cada fase: desde la idea hasta el día que todo cobra vida, y más allá'
              }].map((step, index) => <motion.div key={step.num} initial={{
                opacity: 0,
                x: 20
              }} whileInView={{
                opacity: 1,
                x: 0
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.6,
                delay: 0.4 + index * 0.1,
                ease: [0.22, 1, 0.36, 1]
              }} className="gap-4 p-4 border border-foreground/5 bg-transparent hover:border-foreground/15 transition-colors duration-300 text-right items-center justify-center flex flex-row px-[10px] py-[10px]">
                    <span className="text-caption" style={{
                  textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
                }}>{step.num}</span>
                    <span style={{
                  textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
                }} className="text-body text-left">{step.text}</span>
                  </motion.div>)}
              </motion.div>

              <motion.div initial={{
              opacity: 0
            }} whileInView={{
              opacity: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.6
            }} className="mt-12 space-y-2 text-right" style={{
              textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
            }}>
                <p className="text-small">
                  No hacemos instalaciones.
                </p>
                <p className="text-small">
                  Creamos experiencias que crecen contigo.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Block 3: Nuestra visión - Layout 60/40 (texto izquierda, video derecha) */}
      <div className="relative py-16 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <div className="flex flex-col lg:flex-row lg:gap-16 items-stretch">
            {/* Left column - Text (60%) */}
            <div className="w-full lg:w-[60%]">
              <motion.div initial={{
              opacity: 0
            }} whileInView={{
              opacity: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 1
            }} className="flex items-center gap-4 mb-12">
                <div className="section-indicator" />
                <span className="section-tag mb-0">Visión</span>
              </motion.div>

              <motion.h3 initial={{
              opacity: 0,
              y: 40
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1]
            }} className="section-title">
                <span className="section-title-primary">Nuestra </span>
                <span className="section-title-secondary">visión</span>
              </motion.h3>

              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-12 space-y-8">
                <div>
                  <p className="text-lead mb-4">
                    La tecnología audiovisual no debería ser una imposición.
                  </p>
                  <p className="text-body-muted text-justify">
                    Debería ser una extensión natural de lo que tu espacio ya es, pero en su mejor versión.
                  </p>
                </div>

                <div>
                  <p className="text-body text-justify">
                    Cada lugar tiene su propia personalidad. Cada marca, su propio lenguaje. Cada proyecto, su propio ritmo.
                  </p>
                  <p className="text-lead mt-4">
                    Por eso no creemos en soluciones estándar.
                  </p>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              x: -20
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-10 pl-6 border-l-2 border-foreground/20">
                <p className="text-caption mb-4 uppercase tracking-widest">Nuestra finalidad</p>
                <p className="text-body text-justify mb-6">
                  Diseñar experiencias audiovisuales que:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                    <span className="text-body">Amplifiquen tu mensaje sin que nadie note la tecnología</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                    <span className="text-body">Generen impacto visual que se quede grabado en la memoria</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                    <span className="text-body">Transformen espacios en lugares donde las personas quieren estar</span>
                  </li>
                </ul>
                <p className="text-small text-justify mt-6">
                  Ya sea una pequeña tienda, un hotel, un evento corporativo o una instalación permanente en cualquier parte del mundo.
                </p>
              </motion.div>

              <motion.p initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8,
              delay: 0.5,
              ease: [0.22, 1, 0.36, 1]
            }} className="mt-10 text-quote">
                Porque cuando la tecnología desaparece, solo queda la experiencia. Y eso es lo que importa.
              </motion.p>
            </div>

            {/* Right column - Video (40%) with gradient effect */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="hidden lg:flex w-[40%] items-center justify-center relative"
            >
              {/* Top gradient */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              
              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
              
              {/* Left gradient */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
              
              {/* Right gradient */}
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

              <video 
                src={visionVideo} 
                autoPlay 
                muted 
                loop
                playsInline 
                className="w-full h-auto object-contain"
              />
            </motion.div>

            {/* Mobile: Video */}
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1]
          }} className="lg:hidden relative my-12 -mx-6">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
              <video src={visionVideo} autoPlay muted loop playsInline className="w-full h-auto object-contain" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Block 4: Lo que nos define - Full width with cards */}
      <div className="relative py-24 sm:py-32">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          {/* Header centered */}
          <div className="text-center mb-16 sm:mb-24">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 1
          }} className="flex items-center gap-4 mb-8 justify-center">
              <div className="section-indicator" />
              <span className="section-tag mb-0">Valores</span>
              <div className="section-indicator" />
            </motion.div>

            <motion.h3 initial={{
            opacity: 0,
            y: 40
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1]
          }} className="section-title">
              <span className="section-title-primary">Lo que </span>
              <span className="section-title-secondary">nos define</span>
            </motion.h3>

            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.2,
            ease: [0.22, 1, 0.36, 1]
          }} className="mt-8 max-w-xl mx-auto">
              <p className="text-lead">
                Hay cosas que no se ven en un portfolio,
              </p>
              <p className="text-body-muted mt-2">
                pero que hacen toda la diferencia:
              </p>
            </motion.div>
          </div>

          {/* Cards grid */}
          <motion.div initial={{
          opacity: 0,
          y: 40
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8,
          delay: 0.3,
          ease: [0.22, 1, 0.36, 1]
        }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Experiencia real', desc: 'De campo, no solo de catálogo' },
              { num: '02', title: 'Flexibilidad', desc: 'Nos adaptamos a cualquier escala sin perder calidad' },
              { num: '03', title: 'Criterio técnico', desc: 'Sabemos cuándo más es mejor, y cuándo menos es más' },
              { num: '04', title: 'Obsesión por el detalle', desc: 'El tipo de obsesión que hace que todo funcione perfecto' }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: 0.4 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className="group relative p-6 sm:p-8 border border-foreground/10 bg-card/50 hover:border-foreground/30 hover:bg-card transition-all duration-500"
              >
                <span className="absolute top-4 right-4 text-caption opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                  {item.num}
                </span>
                <div className="pt-8">
                  <h4 className="text-lg sm:text-xl font-medium mb-3 text-foreground group-hover:text-foreground transition-colors duration-300">
                    {item.title}
                  </h4>
                  <p className="text-small leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-foreground/40 group-hover:w-full transition-all duration-500" />
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom section - Partner message */}
          <div className="mt-20 sm:mt-28 max-w-3xl mx-auto text-center">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.5,
            ease: [0.22, 1, 0.36, 1]
          }} className="space-y-6">
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="w-16 h-px bg-foreground/20" />
                <span className="text-caption">Partner</span>
                <div className="w-16 h-px bg-foreground/20" />
              </div>
              
              <p className="text-body-muted">
                No queremos ser tu proveedor.
              </p>
              <p className="text-lead">
                Queremos ser tu cómplice creativo.
              </p>
            </motion.div>

            <motion.p initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1]
          }} className="mt-8 text-body max-w-2xl mx-auto">
              Ese partner que entiende tu visión, desafía tus límites cuando es necesario, y celebra contigo cuando el resultado supera las expectativas.
            </motion.p>

            <motion.p initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.7,
            ease: [0.22, 1, 0.36, 1]
          }} className="mt-10 text-quote">
              Porque al final, tu éxito es nuestro mejor proyecto.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Block 5: Cierre - CENTRADO */}
      <div className="relative py-24 sm:py-32 flex items-center justify-center">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 text-center">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1]
        }} className="max-w-3xl mx-auto">
            <p className="text-statement text-statement-secondary">
              AV TECH no existe para vender tecnología.
            </p>
            <p className="text-statement text-statement-primary mt-4">
              Existimos para crear momentos en los que alguien entra en un espacio y piensa: <span className="italic">"Wow, esto es diferente"</span>.
            </p>
            <p className="text-body-muted mt-6">
              Porque la mejor tecnología no se ve.
            </p>
            <p className="text-lead mt-2">
              Solo se siente.
            </p>
          </motion.div>

          {/* Logo AV TECH */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8,
          delay: 0.3
        }} className="mt-16 flex justify-center">
            <img src={logoAvtech} alt="AV TECH" className="h-8 w-auto opacity-60" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SobreNosotros;
