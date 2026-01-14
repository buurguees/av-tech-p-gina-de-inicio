// Buffer polyfill - simplified synchronous approach
import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer?: typeof Buffer;
    global?: typeof globalThis;
  }
}

// Safe initialization in browser environment
if (typeof window !== "undefined") {
  try {
    if (!window.global) {
      window.global = globalThis;
    }

    if (!window.Buffer) {
      window.Buffer = Buffer;
    }
  } catch (e) {
    // Silently fail - buffer may not be needed for all features
    console.warn("Buffer polyfill initialization warning:", e);
  }
}

export { Buffer };

