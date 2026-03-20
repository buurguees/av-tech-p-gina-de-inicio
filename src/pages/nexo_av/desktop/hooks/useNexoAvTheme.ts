import { useEffect } from 'react';

/**
 * Hook para aplicar el tema de NEXO AV (light o dark)
 * Añade la clase correspondiente al body cuando el componente se monta
 * y la remueve cuando se desmonta
 * 
 * @param theme - 'light' o 'dark', por defecto 'light'
 */
export function useNexoAvTheme(theme: 'light' | 'dark' = 'light') {
  useEffect(() => {
    // Remover ambas clases primero para evitar conflictos
    document.body.classList.remove('nexo-av-theme', 'nexo-av-theme-dark');

    // Sincronizar la clase `dark` en <html> para que las variantes dark: de Tailwind funcionen
    if (theme === 'dark') {
      document.body.classList.add('nexo-av-theme-dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.add('nexo-av-theme');
      document.documentElement.classList.remove('dark');
    }

    // Cleanup: remover las clases cuando el componente se desmonte
    return () => {
      document.body.classList.remove('nexo-av-theme', 'nexo-av-theme-dark');
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);
}
