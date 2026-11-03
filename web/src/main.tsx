import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { onUnknownError } from "./lib/errors";
import { listenForUnhandledErrors, reportError } from "./lib/reportError";
import "./styles/global.css";

// Alerts: tell Gecko about problems people hit (reportError.ts).
listenForUnhandledErrors();
onUnknownError((error) => reportError("request", error));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
