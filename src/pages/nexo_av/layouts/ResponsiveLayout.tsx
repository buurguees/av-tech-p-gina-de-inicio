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
 * ResponsiveLayout - Detecta el tamaño del dispositivo y carga el layout apropiado
 * 
 * Desktop (>= 1024px): NexoAvLayout con Header fijo superior y Sidebar fijo izquierdo
 * Mobile/Tablet (< 1024px): NexoAvLayoutMobile con Header superior y Bottom Navigation
 */
const ResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Suspense fallback={<LayoutLoader />}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </Suspense>
  );
};

export default ResponsiveLayout;
