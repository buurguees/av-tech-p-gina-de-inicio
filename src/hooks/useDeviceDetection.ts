import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

/**
 * Hook para detectar el tipo de dispositivo basado en el tamaño de la pantalla
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 */
export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1920,
        height: 1080,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height,
      });
    };

    // Detectar cambios de tamaño
    window.addEventListener('resize', handleResize);
    
    // Detectar cambios de orientación en móviles
    window.addEventListener('orientationchange', handleResize);

    // Verificar al montar
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
};

/**
 * Hook simple para detectar si es mobile (incluye tablets)
 */
export const useIsMobile = (): boolean => {
  const { isMobile, isTablet } = useDeviceDetection();
  return isMobile || isTablet;
};

/**
 * Hook para detectar si es desktop
 */
export const useIsDesktop = (): boolean => {
  const { isDesktop } = useDeviceDetection();
  return isDesktop;
};
