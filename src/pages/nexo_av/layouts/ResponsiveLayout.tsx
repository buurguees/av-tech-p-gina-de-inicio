import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Load layouts lazily
const DesktopLayout = lazy(() => import("../desktop/layouts/NexoAvLayout"));
const MobileLayout = lazy(() => import("../mobile/layouts/NexoAvMobileLayout"));

// Loading fallback component
const LayoutLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * ResponsiveLayout - Loads Desktop or Mobile layout based on screen size
 */
const ResponsiveLayout = () => {
  const isMobile = useIsMobile();
  
  return (
    <Suspense fallback={<LayoutLoader />}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </Suspense>
  );
};

export default ResponsiveLayout;
