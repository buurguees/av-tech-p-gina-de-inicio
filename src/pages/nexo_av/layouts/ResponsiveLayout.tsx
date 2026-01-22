import { lazy, Suspense, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

// Lazy load layouts
const DesktopLayout = lazy(() => import("../desktop/layouts/NexoAvLayout"));
const MobileLayout = lazy(() => import("../mobile/layouts/NexoAvLayoutMobile"));

// Loading fallback component
const LayoutLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * Detecta si la pantalla debe usar el layout mobile basándose en:
 * 1. Ancho mínimo: Si width >= 1440px, siempre Desktop (incluso si height > width)
 * 2. Aspect ratio: Si width < 1440px, usa orientación (height > width = mobile)
 * 
 * Aspect ratios horizontales (Desktop):
 * - 4:3 (width >= height)
 * - 16:9 (width >= height)
 * 
 * Aspect ratios verticales (Mobile):
 * - 3:4 (height > width)
 * - 9:16 (height > width)
 * 
 * @returns true si debe usar mobile layout, false si debe usar desktop layout
 */
const shouldUseMobileLayout = (width: number, height: number): boolean => {
  // Si el ancho es >= 1440px, siempre usar Desktop Layout
  // Esto asegura que pantallas grandes (incluso verticales) usen Desktop
  if (width >= 1440) {
    return false;
  }
  
  // Para pantallas menores a 1440px, usar lógica de orientación
  // Si la altura es mayor que el ancho, es orientación vertical (mobile)
  return height > width;
};

/**
 * ResponsiveLayout - Detecta la orientación de la pantalla y carga el layout apropiado
 * 
 * Lógica de detección:
 * 1. Pantallas >= 1440px de ancho: Siempre Desktop Layout
 *    - Incluye monitores grandes, incluso si están en orientación vertical
 *    - Ejemplos: 1440x2560, 1920x1080, 2560x1440
 * 
 * 2. Pantallas < 1440px de ancho: Basado en orientación (aspect ratio)
 *    - Horizontal (width >= height): Desktop Layout
 *      * Aspect ratios: 4:3, 16:9
 *      * Tablets horizontales
 *    - Vertical (height > width): Mobile Layout
 *      * Aspect ratios: 3:4, 9:16
 *      * Tablets verticales, móviles
 */
const ResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    return shouldUseMobileLayout(width, height);
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(shouldUseMobileLayout(width, height));
    };

    const handleOrientationChange = () => {
      // Pequeño delay para que el navegador actualice las dimensiones
      setTimeout(handleResize, 100);
    };

    // Detectar cambios de tamaño
    window.addEventListener("resize", handleResize);
    
    // Detectar cambios de orientación (especialmente importante en móviles/tablets)
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return (
    <Suspense fallback={<LayoutLoader />}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </Suspense>
  );
};

export default ResponsiveLayout;
