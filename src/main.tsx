// Import polyfills FIRST, before any other code
import "@/polyfills/buffer";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./firebase";

createRoot(document.getElementById("root")!).render(<App />);
