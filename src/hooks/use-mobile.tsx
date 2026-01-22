import * as React from "react";

const MOBILE_BREAKPOINT = 550; // Ajustado para incluir tablets en horizontal como desktop

interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  iosVersion: number | null;
}

// Detect iOS device
function detectIOS(): {
  isIOS: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  iosVersion: number | null;
} {
  if (typeof window === "undefined") {
    return { isIOS: false, isIPhone: false, isIPad: false, iosVersion: null };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  // Check for iOS
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                (platform === "macintel" && navigator.maxTouchPoints > 1); // iPadOS 13+

  if (!isIOS) {
    return { isIOS: false, isIPhone: false, isIPad: false, iosVersion: null };
  }

  // Detect iPhone vs iPad
  const isIPhone = /iphone/.test(userAgent) || 
                   (platform !== "macintel" && /mobile/.test(userAgent));
  const isIPad = /ipad/.test(userAgent) || 
                 (platform === "macintel" && navigator.maxTouchPoints > 1);

  // Extract iOS version
  let iosVersion: number | null = null;
  const versionMatch = userAgent.match(/os (\d+)[._](\d+)/);
  if (versionMatch) {
    iosVersion = parseFloat(`${versionMatch[1]}.${versionMatch[2]}`);
  }

  return { isIOS: true, isIPhone, isIPad, iosVersion };
}

export function useIsMobile() {
  // Inicializar con el valor correcto inmediatamente para evitar flash
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Asegurar que el estado inicial sea correcto
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => {
    const iosInfo = detectIOS();
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    return {
      isMobile,
      ...iosInfo,
    };
  });

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const iosInfo = detectIOS();
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setDeviceInfo({
        isMobile,
        ...iosInfo,
      });
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", updateDeviceInfo);
    window.addEventListener("resize", updateDeviceInfo);
    window.addEventListener("orientationchange", updateDeviceInfo);

    return () => {
      mql.removeEventListener("change", updateDeviceInfo);
      window.removeEventListener("resize", updateDeviceInfo);
      window.removeEventListener("orientationchange", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

export function useIOS() {
  const [iosInfo, setIOSInfo] = React.useState(() => detectIOS());

  React.useEffect(() => {
    const updateIOSInfo = () => {
      setIOSInfo(detectIOS());
    };

    window.addEventListener("orientationchange", updateIOSInfo);
    return () => {
      window.removeEventListener("orientationchange", updateIOSInfo);
    };
  }, []);

  return iosInfo;
}
