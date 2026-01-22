import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Load desktop layout directly (mobile removed)
const DesktopLayout = lazy(() => import("../desktop/layouts/NexoAvLayout"));

// Loading fallback component
const LayoutLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * ResponsiveLayout - Now only loads Desktop Layout
 * Mobile support has been temporarily disabled for refactoring
 */
const ResponsiveLayout = () => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <DesktopLayout />
    </Suspense>
  );
};

export default ResponsiveLayout;
