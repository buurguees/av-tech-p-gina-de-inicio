import { motion } from 'motion/react';

const Contacto = () => {
  return (
    <section id="contacto" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="section-tag">
            Hablemos
          </div>
          <h2 className="section-title max-w-3xl">
            <span className="section-title-primary">Empecemos </span>
            <span className="section-title-secondary">tu proyecto</span>
          </h2>
          <p className="section-description mt-4">
            ¿Tienes una idea en mente?
            <br />
            Cuéntanos tu visión y la haremos realidad.
          </p>
        </motion.div>

        {/* Placeholder para formulario de contacto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 text-left"
        >
          <p className="font-mono text-sm text-foreground/50">
            Próximamente: formulario de contacto.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Contacto;
