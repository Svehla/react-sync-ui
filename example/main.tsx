import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// The entry point exports nothing and defines no component on purpose: it must
// never be re-executed by HMR, or `createRoot` would run twice on the same
// container. Everything that could be hot-updated lives in `App.tsx`, which is
// a proper Fast Refresh boundary (see README - "Fast Refresh").
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
