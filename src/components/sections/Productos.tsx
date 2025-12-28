import { motion } from 'motion/react';

const Productos = () => {
  return (
    <section id="productos" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 flex flex-col items-end text-right">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="section-tag">
            Catálogo
          </div>
          <h2 className="section-title max-w-3xl">
            <span className="section-title-primary">Tecnología </span>
            <span className="section-title-secondary">de vanguardia</span>
          </h2>
          <p className="section-description mt-4 ml-auto">
            Equipos y soluciones de última generación.
            <br />
            Pantallas LED, sistemas de sonido profesional y control audiovisual.
          </p>
        </motion.div>

        {/* Placeholder para contenido de productos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 text-left"
        >
          <p className="font-mono text-sm text-foreground/50">
            Próximamente: catálogo de productos.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Productos;
