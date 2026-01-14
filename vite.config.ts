import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Permite acceso desde la red local
    port: 8080,
    strictPort: false, // Si el puerto está ocupado, intenta el siguiente
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Alias for buffer to avoid initialization issues
      buffer: "buffer/",
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    include: ['buffer'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // IMPORTANTE: El orden importa. Primero las más específicas, luego las generales
          // Evitar dependencias circulares: no separar dependencias que comparten código común
          
          // React y React-DOM - separar primero (son muy grandes)
          // IMPORTANTE: React debe estar en su propio chunk para evitar ciclos
          if (id.includes('react/') || id.includes('react-dom/') || id.includes('react/jsx-runtime')) {
            return 'react-vendor';
          }
          
          // React PDF - solo se usa en componentes de PDF
          if (id.includes('@react-pdf/renderer')) {
            return 'react-pdf';
          }
          
          // ExcelJS - solo se usa en diálogos de importación (muy grande, ~937KB)
          if (id.includes('exceljs')) {
            return 'exceljs';
          }
          
          // Leaflet - solo se usa en el mapa de leads
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'leaflet';
          }
          
          // Globe.gl - solo se usa en la página de alcance
          if (id.includes('globe.gl')) {
            return 'globe';
          }
          
          // Recharts - solo se usa en gráficos (si se usa)
          if (id.includes('recharts')) {
            return 'recharts';
          }
          
          // Supabase - separar en su propio chunk
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          
          // TanStack Query - separar en su propio chunk
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Firebase - separar en su propio chunk
          if (id.includes('firebase')) {
            return 'firebase';
          }
          
          // Motion/Framer Motion - separar animaciones
          if (id.includes('framer-motion') || id.includes('motion')) {
            return 'motion';
          }
          
          // React Router - separar routing (antes de otros para evitar ciclos)
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // Radix UI - agrupar todos los componentes de Radix
          // Nota: Radix UI depende de React, pero React ya está separado
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // React Hook Form - separar formularios
          // Nota: react-hook-form depende de React, pero React ya está separado
          if (id.includes('react-hook-form')) {
            return 'react-hook-form';
          }
          
          // Lucide icons - separar iconos
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          
          // Buffer y polyfills - mantener juntos para evitar ciclos
          if (id.includes('buffer') || id.includes('process')) {
            return 'polyfills';
          }
          
          // Utilidades que NO dependen de React directamente
          // Agrupar en utils solo las que no causan dependencias circulares
          if (id.includes('date-fns') || 
              id.includes('zod') || 
              id.includes('clsx') || 
              id.includes('tailwind-merge') || 
              id.includes('class-variance-authority') ||
              id.includes('sonner') ||
              id.includes('embla-carousel') ||
              id.includes('react-day-picker') ||
              id.includes('react-resizable-panels') ||
              id.includes('cmdk') ||
              id.includes('vaul') ||
              id.includes('input-otp') ||
              id.includes('next-themes') ||
              id.includes('@hookform/resolvers') ||
              id.includes('lovable-tagger')) {
            return 'utils';
          }
          
          // Node modules vendor chunk para el resto
          // Esto incluirá todas las demás dependencias de node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Aumentar el límite a 1.5MB
    // Nota: El chunk vendor es grande (3.4MB) pero contiene muchas dependencias pequeñas
    // que no tienen sentido separar individualmente. Las librerías pesadas ya están
    // separadas en chunks específicos (react-vendor, exceljs, leaflet, etc.)
  },
}));
