import { Buffer } from "buffer";

// Polyfill Buffer for @react-pdf/renderer
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./firebase";

createRoot(document.getElementById("root")!).render(<App />);
