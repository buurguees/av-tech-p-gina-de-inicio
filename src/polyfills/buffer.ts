// Buffer polyfill - only initialize if needed and in a safe way
declare global {
  interface Window {
    Buffer?: typeof import("buffer").Buffer;
    global?: typeof globalThis;
  }
}

// Lazy initialization to avoid issues with module loading
const initPolyfills = async () => {
  if (typeof window !== "undefined") {
    if (!window.global) {
      window.global = globalThis;
    }

    if (!window.Buffer) {
      try {
        const { Buffer } = await import("buffer");
        window.Buffer = Buffer;
      } catch (e) {
        console.warn("Buffer polyfill failed to load:", e);
      }
    }
  }
};

// Only run in browser environment
if (typeof window !== "undefined") {
  initPolyfills();
}

export {};

