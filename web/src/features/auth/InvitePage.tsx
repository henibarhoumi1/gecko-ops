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

  if (!signedIn) return <Navigate to="/sign-up" replace />;
  return <Navigate to="/" replace />;
}
