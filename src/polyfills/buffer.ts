import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer?: typeof Buffer;
    global?: typeof window;
  }
}

// Aseguramos Buffer y global sólo en entorno navegador y si no existen ya
if (typeof window !== "undefined") {
  if (!window.global) {
    window.global = window;
  }

  if (!window.Buffer) {
    window.Buffer = Buffer;
  }
}

export {};

