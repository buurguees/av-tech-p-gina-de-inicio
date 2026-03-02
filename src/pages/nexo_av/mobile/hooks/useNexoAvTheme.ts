import { useEffect } from 'react';

/**
 * Hook para aplicar el tema de NEXO AV (light o dark) en mobile
 * Añade la clase correspondiente al body cuando el componente se monta
 * y la remueve cuando se desmonta
 * 
 * @param theme - 'light' o 'dark', por defecto 'light'
 */
export function useNexoAvTheme(theme: 'light' | 'dark' = 'light') {
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    body.classList.remove('nexo-av-theme', 'nexo-av-theme-dark');
    root.classList.remove('dark');
    
    // Añadir la clase correspondiente al tema
    if (theme === 'dark') {
      body.classList.add('nexo-av-theme-dark');
      root.classList.add('dark');
    } else {
      body.classList.add('nexo-av-theme');
    }
    
    // Cleanup: remover las clases cuando el componente se desmonte
    return () => {
      body.classList.remove('nexo-av-theme', 'nexo-av-theme-dark');
      root.classList.remove('dark');
    };
  }, [theme]);
}
