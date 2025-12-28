import { motion } from 'motion/react';

const Productos = () => {
  return (
    <section id="productos" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="font-mono text-xs text-foreground/50 tracking-[0.2em] uppercase mb-6 sm:mb-8">
            Catálogo
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tighter max-w-3xl text-foreground">
            Tecnología{' '}
            <span className="text-foreground/40">de vanguardia</span>
          </h2>
          <p className="mt-4 font-mono text-base md:text-lg text-foreground/50 max-w-2xl leading-relaxed">
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
