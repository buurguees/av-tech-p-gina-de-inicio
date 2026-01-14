// Buffer polyfill for libraries that require it (like @react-pdf/renderer, exceljs)
// Simplified approach - just re-export buffer and set globals

import { Buffer } from "buffer";

// Ensure global is available
if (typeof globalThis !== "undefined" && !(globalThis as any).global) {
  (globalThis as any).global = globalThis;
}

// Ensure Buffer is globally available
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

// Also set on window for browser compatibility
if (typeof window !== "undefined") {
  if (!(window as any).global) {
    (window as any).global = window;
  }
  if (!(window as any).Buffer) {
    (window as any).Buffer = Buffer;
  }
}

export { Buffer };
