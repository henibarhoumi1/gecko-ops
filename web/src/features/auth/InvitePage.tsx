import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthProvider";
import { parseInviteCode, savePendingInvite } from "./inviteCode";

/**
 * /invite/:code greets the person by brand and lets them in with one emailed link, no password to invent.
 * Signed in (for example back from that email), it hands over to the app, which accepts the invite.
 */
export function InvitePage() {
  const { code = "" } = useParams();
  const { state, refresh } = useAuth();
  const parsed = parseInviteCode(code);
  if (parsed) savePendingInvite(parsed);

  const signedIn = state.status === "ready" || state.status === "error";
  useEffect(() => {
    if (parsed && signedIn) void refresh();
  }, [parsed, signedIn, refresh]);

  // Opened from the email, the sign-in is still being read from the link: wait for it.
  if (state.status === "loading") return null;
  if (signedIn) return <Navigate to="/" replace />;
  if (!parsed) return <Navigate to="/sign-in" replace />;
  return <InviteLanding code={parsed} />;
}

function usePeek(code: string) {
  return useQuery({
    queryKey: ["invite-peek", code],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("peek_client_invite", { p_token: code });
      if (error) {
        // An older database without the function: fall back to the plain sign-up.
        if (/PGRST202|could not find the function/i.test(error.message)) return undefined;
        throw error;
      }
      return (data as { brand: string; email: string } | null) ?? null;
    },
    retry: false,
  });
}

function InviteLanding({ code }: { code: string }) {
  const peek = usePeek(code);
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = peek.data?.email ?? String(form.get("email")).trim();
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { name: String(form.get("name") ?? "").trim() },
        // The code rides in the link, so it works even if the email opens in another browser.
        emailRedirectTo: `${window.location.origin}/invite/${code}`,
      },
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else setSentTo(email);
  }

  if (peek.isPending) return null;
  if (peek.data === null)
    return (
      <AuthLayout
        eyebrow="Invite"
        title="This link has already been used"
        intro="It was used to create a login, or it expired after 14 days. If you already have a login, sign in. Otherwise ask Gecko for a new link."
      >
        <p className="center">
          <Link to="/sign-in">Sign in</Link>
        </p>
      </AuthLayout>
    );

  if (sentTo)
    return (
      <AuthLayout
        eyebrow="One more step"
        title="Check your email"
        intro={`We sent a link to ${sentTo}. Open it on this phone or computer and you're in. No password needed.`}
      >
        <p className="small muted center">
          Nothing after a minute? Check spam, or{" "}
          <Button variant="link" onClick={() => setSentTo("")}>
            send it again
          </Button>
          .
        </p>
      </AuthLayout>
    );

  const brand = peek.data?.brand;
  return (
    <AuthLayout
      eyebrow="You're invited"
      title={brand ? `${brand} × Gecko` : "Your Gecko portal"}
      intro="Everything for your campaign in one place: ideas and scripts to approve, your shoot, your videos. We'll email you a link to get in, no password needed."
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label="Your name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          autoFocus
        />
        {peek.data?.email ? (
          <Field label="Email" name="email" type="email" value={peek.data.email} readOnly />
        ) : (
          <Field
            label="Email (the one the invite was sent to)"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Email me my link"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center small">
        <Link to="/sign-up">Prefer a password?</Link> ·{" "}
        <Link to="/sign-in">I already have a login</Link>
      </p>
    </AuthLayout>
  );
}
