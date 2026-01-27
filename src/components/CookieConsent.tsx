import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay before showing the popup
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-4 md:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Text */}
                <div className="flex-1">
                  <h3 className="font-mono text-sm md:text-base font-medium text-foreground mb-1">
                    Usamos cookies
                  </h3>
                  <p className="font-mono text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Utilizamos cookies para mejorar tu experiencia de navegación y analizar el tráfico. 
                    Al hacer clic en "Aceptar", consientes el uso de todas las cookies.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    className="font-mono text-xs md:text-sm px-4 md:px-6"
                  >
                    Rechazar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAccept}
                    className="font-mono text-xs md:text-sm px-4 md:px-6"
                  >
                    Aceptar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
