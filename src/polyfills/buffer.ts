// Buffer polyfill - executed once at app startup
// This ensures global and Buffer are available before any modules load

if (typeof window !== "undefined") {
  // Set up global reference (required by Node.js-style libraries)
  if (!(window as any).global) {
    (window as any).global = window;
  }
  
  if (!(globalThis as any).global) {
    (globalThis as any).global = globalThis;
  }
  
  // Buffer will be provided by the 'buffer' package polyfill in the vendor bundle
  // We don't import it here to avoid initialization order conflicts
  // The bundle's polyfills will set window.Buffer when needed
}

export {};
