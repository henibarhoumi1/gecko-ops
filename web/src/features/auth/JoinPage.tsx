import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { acceptInvite, createWorkspace } from "./account";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthProvider";
import { parseInviteCode } from "./inviteCode";

/** Signed in, but not part of the workspace or any client yet. */
export function JoinPage({ problem }: { problem?: string }) {
  const { refresh, signOut } = useAuth();
  const [error, setError] = useState(problem ?? "");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = parseInviteCode(String(form.get("invite")));
    if (!code) return setError("Paste the whole invite link the founder sent you.");
    void run(() => acceptInvite(requireSupabase(), code, String(form.get("name")).trim()));
  }

  return (
    <AuthLayout
      eyebrow="One more step"
      title="Join Gecko"
      intro="Open the invite link the Gecko founder sent you, or paste it below. No link yet? Ask them to invite this email."
    >
      <form className="stack" onSubmit={onJoin}>
        <Field label="Invite link" name="invite" required />
        <Field label="Your name" name="name" autoComplete="name" maxLength={120} />
        <Button type="submit" disabled={busy}>
          Join
        </Button>
      </form>
      <details className="first-time">
        <summary>Setting up Gecko for the first time?</summary>
        <p className="muted">
          Only the very first account can create the workspace and become its founder.
        </p>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void run(() => createWorkspace(requireSupabase(), "Gecko"))}
        >
          Create the Gecko workspace
        </Button>
      </details>
      {error && <Notice tone="error">{error}</Notice>}
      <p className="center">
        <Button variant="link" onClick={() => void signOut()}>
          Sign out
        </Button>
      </p>
    </AuthLayout>
  );
}
