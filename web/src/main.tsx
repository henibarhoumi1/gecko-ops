import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { parseInviteCode } from "./features/auth/inviteCode";
import "./styles/global.css";

// Invite links from the current app look like /#join-<code>; send them to the new invite route.
if (window.location.hash.startsWith("#join-")) {
  const code = parseInviteCode(window.location.hash);
  if (code) window.history.replaceState(null, "", `/invite/${code}`);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
