import { motion } from 'motion/react';

const SobreNosotros = () => {
  return (
    <section id="sobre-nosotros" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase mb-6 sm:mb-8">
            Quiénes somos
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tighter max-w-3xl">
            Pasión por{' '}
            <span className="text-muted-foreground">la innovación</span>
          </h2>
          <p className="mt-4 font-mono text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Más de una década creando experiencias audiovisuales.
            <br />
            Un equipo comprometido con la excelencia y la creatividad.
          </p>
        </motion.div>

        {/* Placeholder para contenido sobre nosotros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16"
        >
          <p className="font-mono text-sm text-muted-foreground">
            Próximamente: nuestra historia y equipo.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SobreNosotros;
