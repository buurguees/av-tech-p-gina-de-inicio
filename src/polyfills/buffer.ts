// Buffer polyfill for libraries that require it (like @react-pdf/renderer, exceljs)
// This must be imported at the entry point (main.tsx) before any other imports

import { Buffer as BufferPolyfill } from "buffer";

declare global {
  interface Window {
    Buffer: typeof BufferPolyfill;
    global: typeof globalThis;
  }
}

// Set up global references for browser environment
if (typeof window !== "undefined") {
  (window as any).global = (window as any).global || window;
  (window as any).Buffer = (window as any).Buffer || BufferPolyfill;
}

// Also set on globalThis for module compatibility
if (typeof globalThis !== "undefined") {
  (globalThis as any).global = (globalThis as any).global || globalThis;
  (globalThis as any).Buffer = (globalThis as any).Buffer || BufferPolyfill;
}

export { BufferPolyfill as Buffer };

