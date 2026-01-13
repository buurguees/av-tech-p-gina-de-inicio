import { useEffect } from 'react';
// Importar CSS estáticamente para que se procese correctamente
import '../styles/global.css';

/**
 * Hook para aplicar el tema light de NEXO AV
 * Añade la clase 'nexo-av-theme' al body cuando el componente se monta
 * y la remueve cuando se desmonta
 */
export function useNexoAvTheme() {
  useEffect(() => {
    // Añadir la clase al body
    document.body.classList.add('nexo-av-theme');
    
    // Cleanup: remover la clase cuando el componente se desmonte
    return () => {
      document.body.classList.remove('nexo-av-theme');
    };
  }, []);
}
