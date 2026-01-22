import { useEffect, useState } from "react";

/**
 * Hook ligero para detectar si el tema actual de NEXO AV es oscuro.
 * Se basa en las clases que aplica `useNexoAvTheme` al `<body>`:
 * - `nexo-av-theme`       → modo claro
 * - `nexo-av-theme-dark` → modo oscuro
 */
export function useIsNexoAvDarkTheme(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.body.classList.contains("nexo-av-theme-dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const update = () => {
      setIsDark(document.body.classList.contains("nexo-av-theme-dark"));
    };

    // Comprobación inicial
    update();

    // Observar cambios en las clases del body (cuando el usuario cambia el tema)
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
