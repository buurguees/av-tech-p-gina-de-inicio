import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./firebase";

// Polyfill Buffer en navegador para librerías que lo necesitan (exceljs, @react-pdf/renderer)
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Register service worker for auto-update (cache-busting)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        // Check for updates every 60 seconds
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 1000);
        }
      },
      onOfflineReady() {
        console.log('[SW] App ready to work offline');
      },
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
