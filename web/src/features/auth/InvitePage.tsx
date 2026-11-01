import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { parseInviteCode, savePendingInvite } from "./inviteCode";

/** /invite/:code remembers the code, then sends the person to sign up (or straight in if signed in). */
export function InvitePage() {
  const { code = "" } = useParams();
  const { state, refresh } = useAuth();
  const parsed = parseInviteCode(code);
  if (parsed) savePendingInvite(parsed);

  const signedIn = state.status === "ready" || state.status === "error";
  useEffect(() => {
    if (parsed && signedIn) void refresh();
  }, [parsed, signedIn, refresh]);

  // Opened from the confirmation email, the sign-in is still being read from the link: wait for it.
  if (state.status === "loading") return null;
  if (!signedIn) return <Navigate to="/sign-up" replace />;
  return <Navigate to="/" replace />;
}
