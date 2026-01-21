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
    
    // Añadir la clase correspondiente al tema
    if (theme === 'dark') {
      document.body.classList.add('nexo-av-theme-dark');
    } else {
      document.body.classList.add('nexo-av-theme');
    }
    
    // Cleanup: remover las clases cuando el componente se desmonte
    return () => {
      document.body.classList.remove('nexo-av-theme', 'nexo-av-theme-dark');
    };
  }, [theme]);
}
