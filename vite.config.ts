import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Módulos de Node.js que deben ser externalizados (no disponibles en el navegador)
const nodeModulesToExternalize = [
  'fs',
  'path',
  'vm',
  'http',
  'https',
  'net',
  'tls',
  'crypto',
  'stream',
  'zlib',
  'util',
  'url',
  'assert',
  'os',
  'child_process',
];

// Plugin para suprimir warnings de módulos externalizados durante el build
const suppressNodeModuleWarnings = () => {
  return {
    name: 'suppress-node-module-warnings',
    configResolved(config) {
      // Interceptar el logger de Vite para filtrar warnings específicos
      const originalWarn = config.logger.warn;
      const originalInfo = config.logger.info;
      
      config.logger.warn = (msg, options) => {
        // Suprimir warnings sobre módulos externalizados
        if (typeof msg === 'string' && 
            msg.includes('has been externalized for browser compatibility') &&
            nodeModulesToExternalize.some(mod => msg.includes(`Module "${mod}"`))) {
          return; // No mostrar este warning
        }
        originalWarn(msg, options);
      };
      
      // También interceptar mensajes de info que pueden contener estos warnings
      config.logger.info = (msg, options) => {
        if (typeof msg === 'string' && 
            msg.includes('has been externalized for browser compatibility') &&
            nodeModulesToExternalize.some(mod => msg.includes(`Module "${mod}"`))) {
          return; // No mostrar este mensaje
        }
        originalInfo(msg, options);
      };
    },
  };
};

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
    suppressNodeModuleWarnings(),
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
    include: ['buffer'],
    exclude: ['jscanify'], // Excluir jscanify de la optimización ya que se carga dinámicamente
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000, // Aumentar el límite para evitar warnings innecesarios
    commonjsOptions: {
      // Ignorar módulos de Node.js durante la transformación CommonJS
      ignore: nodeModulesToExternalize,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        // Suprimir warnings comunes que no son críticos
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        // Suprimir warnings sobre módulos externalizados (son esperados)
        if (warning.code === 'UNRESOLVED_IMPORT' && 
            nodeModulesToExternalize.some(mod => warning.message?.includes(mod))) {
          return;
        }
        warn(warning);
      },
      external: (id) => {
        // Externalizar módulos de Node.js que no deberían estar en el bundle
        if (nodeModulesToExternalize.some(mod => id === mod || id.startsWith(`${mod}/`))) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          // Separar vendor chunks grandes para mejor code splitting
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['@react-pdf/renderer'],
        },
      },
    },
  },
  // Configurar el nivel de logging
  // Los warnings sobre módulos externalizados son informativos y no afectan el funcionamiento
  logLevel: mode === 'production' ? 'warn' : 'info',
}));
