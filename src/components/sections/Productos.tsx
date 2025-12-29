import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage3 from '@/assets/catalog/totem-lcd.png';

const catalogImages = [catalogImage1, catalogImage2, catalogImage3];

const Productos = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % catalogImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="productos" className="relative min-h-screen overflow-hidden">
      {/* Full height carousel - Left Side */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-1/2">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentIndex}
            src={catalogImages[currentIndex]}
            alt={`Catálogo producto ${currentIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Top gradient - transparent to black */}
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-background via-background/60 to-transparent" />
        
        {/* Bottom gradient - transparent to black */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* Content - Right Side */}
      <div className="relative min-h-screen flex items-center">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="lg:w-1/2 lg:ml-auto text-right lg:pl-8"
          >
            <div className="section-tag">
              Catálogo
            </div>
            <h2 className="section-title max-w-3xl ml-auto">
              <span className="section-title-primary">Soluciones diseñadas </span>
              <span className="section-title-secondary">para tu espacio</span>
            </h2>
            <p className="section-subtitle mt-4 ml-auto">
              Convierte cada espacio en un punto de conexión con tus clientes.
            </p>
            <p className="section-description mt-4 ml-auto">
              Packs pensados para comunicar mejor, generar impacto y conectar con más personas en cada espacio.
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8"
            >
              <Button variant="catalog" size="lg" className="group">
                Ver catálogo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Productos;
