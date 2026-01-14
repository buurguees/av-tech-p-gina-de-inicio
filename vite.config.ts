import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Solo separar librerías muy grandes que se cargan bajo demanda
          // NO separar React - causa errores de inicialización
          
          // ExcelJS - muy grande (~937KB), solo en diálogos de importación
          if (id.includes('exceljs')) {
            return 'exceljs';
          }
          
          // React PDF - solo en componentes de PDF
          if (id.includes('@react-pdf/renderer')) {
            return 'react-pdf';
          }
          
          // Leaflet - solo en mapas
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'leaflet';
          }
          
          // Globe.gl - solo en página de alcance
          if (id.includes('globe.gl')) {
            return 'globe';
          }
          
          // Firebase - carga diferida
          if (id.includes('firebase')) {
            return 'firebase';
          }
          
          // Agrupar el resto de node_modules en vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
}));
