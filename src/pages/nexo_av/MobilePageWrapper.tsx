/**
 * MobilePageWrapper
 * 
 * Wrapper inteligente que detecta el dispositivo y carga automáticamente
 * la versión móvil u desktop de una página según corresponda.
 * 
 * Uso:
 * export default createMobilePage({
 *   DesktopComponent: ClientsPageDesktop,
 *   MobileComponent: lazy(() => import('./mobile/ClientsPageMobile')),
 * });
 */

import { lazy, Suspense, ComponentType, LazyExoticComponent } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NexoLogo } from "./components/NexoHeader";

interface MobilePageConfig<T = any> {
  DesktopComponent: ComponentType<T>;
  MobileComponent: ComponentType<T> | LazyExoticComponent<ComponentType<T>>;
  fallback?: React.ReactNode;
}

/**
 * Loading fallback por defecto con el logo de NEXO AV
 */
const DefaultLoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="animate-pulse">
      <NexoLogo />
    </div>
  </div>
);

/**
 * Crea un componente que renderiza automáticamente la versión
 * móvil o desktop según el dispositivo detectado
 */
export function createMobilePage<T = any>(config: MobilePageConfig<T>) {
  const { DesktopComponent, MobileComponent, fallback } = config;

  return function MobileAwarePage(props: T) {
    const isMobile = useIsMobile();

    // Esperar a que se determine el tipo de dispositivo antes de renderizar
    // Esto evita el flash de contenido incorrecto
    if (isMobile === undefined) {
      return <DefaultLoadingFallback />;
    }

    // En móvil, usar la versión móvil con Suspense para lazy loading
    if (isMobile) {
      return (
        <Suspense fallback={fallback || <DefaultLoadingFallback />}>
          <MobileComponent {...props} />
        </Suspense>
      );
    }

    // En desktop, renderizar directamente la versión desktop
    return <DesktopComponent {...props} />;
  };
}

/**
 * Hook para componentes que necesitan adaptar su contenido
 * sin crear una página completamente separada
 */
export function useMobileAdaptive() {
  const isMobile = useIsMobile();
  
  return {
    isMobile,
    // Clases helper para mostrar/ocultar según dispositivo
    showOnMobile: isMobile ? "" : "hidden",
    hideOnMobile: isMobile ? "hidden" : "",
    showOnDesktop: isMobile ? "hidden" : "",
    hideOnDesktop: isMobile ? "" : "hidden",
  };
}

export default createMobilePage;
