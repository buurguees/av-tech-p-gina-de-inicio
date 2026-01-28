import { lazy, Suspense, ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsivePageProps {
  desktopComponent: ComponentType;
  mobileComponent: ComponentType;
}

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * ResponsivePage - Renders the appropriate component based on device type
 * Desktop pages are rendered in desktop layout
 * Mobile pages are rendered in mobile layout
 */
const ResponsivePage = ({ desktopComponent: DesktopComponent, mobileComponent: MobileComponent }: ResponsivePageProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Suspense fallback={<PageLoader />}>
      {isMobile ? <MobileComponent /> : <DesktopComponent />}
    </Suspense>
  );
};

export default ResponsivePage;

// Factory function to create responsive page components with lazy loading
export const createResponsivePage = (
  desktopImport: () => Promise<{ default: ComponentType }>,
  mobileImport: () => Promise<{ default: ComponentType }>
) => {
  const DesktopComponent = lazy(desktopImport);
  const MobileComponent = lazy(mobileImport);
  
  return () => (
    <ResponsivePage 
      desktopComponent={DesktopComponent} 
      mobileComponent={MobileComponent} 
    />
  );
};
