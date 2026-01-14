// Buffer polyfill - minimal setup for global context only
// The actual Buffer is provided by the 'buffer' package when needed by libraries

// Ensure global is available (required by some Node.js-style libraries)
if (typeof globalThis !== "undefined" && typeof (globalThis as any).global === "undefined") {
  (globalThis as any).global = globalThis;
}

if (typeof window !== "undefined" && typeof (window as any).global === "undefined") {
  (window as any).global = window;
}

// Note: Do NOT import Buffer here to avoid initialization order issues
// Libraries like @react-pdf/renderer will import buffer themselves when needed
