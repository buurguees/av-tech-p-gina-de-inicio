import { defineConfig, Plugin, ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
const suppressNodeModuleWarnings = (): Plugin => {
  return {
    name: 'suppress-node-module-warnings',
    configResolved(config: ResolvedConfig) {
      const originalWarn = config.logger.warn;
      const originalInfo = config.logger.info;
      
      config.logger.warn = (msg: string, options?) => {
        if (typeof msg === 'string' && 
            msg.includes('has been externalized for browser compatibility') &&
            nodeModulesToExternalize.some(mod => msg.includes(`Module "${mod}"`))) {
          return;
        }
        originalWarn(msg, options);
      };
      
      config.logger.info = (msg: string, options?) => {
        if (typeof msg === 'string' && 
            msg.includes('has been externalized for browser compatibility') &&
            nodeModulesToExternalize.some(mod => msg.includes(`Module "${mod}"`))) {
          return;
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
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/~oauth/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/takvthfatlcjsqgssnta\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      manifest: {
        name: 'NEXO AV - ERP',
        short_name: 'NEXO AV',
        description: 'ERP de gestión integral para AV TECH ESDEVENIMENTS',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ].filter(Boolean) as Plugin[],
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
    exclude: ['jscanify'],
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      ignore: nodeModulesToExternalize,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        if (warning.code === 'UNRESOLVED_IMPORT' && 
            nodeModulesToExternalize.some(mod => warning.message?.includes(mod))) {
          return;
        }
        warn(warning);
      },
      external: (id) => {
        if (nodeModulesToExternalize.some(mod => id === mod || id.startsWith(`${mod}/`))) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
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
  logLevel: mode === 'production' ? 'warn' : 'info',
}));