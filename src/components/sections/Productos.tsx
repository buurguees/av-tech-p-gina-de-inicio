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
    <section id="productos" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Carousel - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:w-1/2 relative aspect-[3/4] max-h-[600px] rounded-2xl overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={catalogImages[currentIndex]}
                alt={`Catálogo producto ${currentIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </AnimatePresence>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

            {/* Carousel indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {catalogImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-primary w-6' 
                      : 'bg-foreground/40 hover:bg-foreground/60'
                  }`}
                  aria-label={`Ir a imagen ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Content - Right Side */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="w-full lg:w-1/2 text-right lg:pl-8"
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
              <Button variant="hero" size="lg" className="group">
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
