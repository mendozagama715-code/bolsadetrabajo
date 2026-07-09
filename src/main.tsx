import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-queue";

createRoot(document.getElementById("root")!).render(<App />);

// Registra el Service Worker + fallback online para sincronización en segundo plano.
initOfflineSync();
