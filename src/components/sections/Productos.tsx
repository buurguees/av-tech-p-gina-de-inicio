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
            <span className="section-title-primary">Soluciones diseñadas </span>
            <span className="section-title-secondary">para tu espacio</span>
          </h2>
          <p className="section-subtitle mt-4 ml-auto">
            Convierte cada espacio en un punto de conexión con tus clientes.
          </p>
          <p className="section-description mt-4 ml-auto">
            Packs pensados para comunicar mejor, generar impacto y conectar con más personas en cada espacio.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Productos;
