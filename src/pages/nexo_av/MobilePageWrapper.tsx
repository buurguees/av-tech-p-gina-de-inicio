import React, { ComponentType, lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CreateMobilePageOptions<T> {
  DesktopComponent: ComponentType<T>;
  MobileComponent: ComponentType<T>;
}

export function createMobilePage<T extends object>({
  DesktopComponent,
  MobileComponent,
}: CreateMobilePageOptions<T>) {
  const ResponsivePage = (props: T) => {
    const isMobile = useIsMobile();
    
    if (isMobile) {
      return (
        <Suspense fallback={<div className="min-h-screen bg-nexo-bg flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nexo-accent"></div></div>}>
          <MobileComponent {...props} />
        </Suspense>
      );
    }
    
    return <DesktopComponent {...props} />;
  };
  
  return ResponsivePage;
}

export default createMobilePage;
