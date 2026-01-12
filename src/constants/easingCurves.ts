/**
 * Curvas de easing cubic-bezier personalizadas
 * 
 * Estas curvas pueden ser usadas con framer-motion pasándolas como array [x1, y1, x2, y2]
 * o como string "cubic-bezier(x1, y1, x2, y2)" en CSS
 * 
 * Ejemplo de uso en framer-motion:
 * transition={{ ease: EASING_CURVES.outBezier }}
 * 
 * Ejemplo de uso en CSS:
 * transition-timing-function: cubic-bezier(0.085, 1.295, 1, -0.376);
 */

// Curva Out Bezier con overshoot (de la imagen)
// Produce un efecto de rebote suave al final
export const EASING_CURVES = {
  // Out bezier con overshoot - efecto rebote suave
  outBezier: [0.085, 1.295, 1, -0.376] as [number, number, number, number],
  
  // Curvas estándar mejoradas
  easeOutExpo: [0.19, 1, 0.22, 1] as [number, number, number, number],
  easeInOutCubic: [0.65, 0, 0.35, 1] as [number, number, number, number],
  
  // Curvas personalizadas para diferentes efectos
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
  elastic: [0.68, -0.6, 0.32, 1.6] as [number, number, number, number],
  
  // Curva usada en LoadingScreen (ya existente)
  loadingScreen: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;

/**
 * Convierte una curva cubic-bezier a string para uso en CSS
 */
export const cubicBezierToString = (curve: [number, number, number, number]): string => {
  return `cubic-bezier(${curve.join(', ')})`;
};

/**
 * Presets de transiciones comunes con las curvas personalizadas
 */
export const TRANSITION_PRESETS = {
  // Transición suave con out bezier
  smoothOut: {
    duration: 0.6,
    ease: EASING_CURVES.outBezier,
  },
  
  // Transición rápida con bounce
  quickBounce: {
    duration: 0.4,
    ease: EASING_CURVES.bounce,
  },
  
  // Transición elástica para elementos que aparecen
  elasticIn: {
    duration: 0.8,
    ease: EASING_CURVES.elastic,
  },
  
  // Transición estándar suave
  standard: {
    duration: 0.5,
    ease: EASING_CURVES.smooth,
  },
} as const;
