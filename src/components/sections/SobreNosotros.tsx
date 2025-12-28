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
          className="text-left"
        >
          <div className="section-tag">
            Quiénes somos
          </div>
          <h2 className="section-title max-w-3xl">
            <span className="section-title-primary">Pasión por </span>
            <span className="section-title-secondary">la innovación</span>
          </h2>
          <p className="section-description mt-4">
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
          className="mt-16 text-left"
        >
          <p className="font-mono text-sm text-foreground/50">
            Próximamente: nuestra historia y equipo.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SobreNosotros;
