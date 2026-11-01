import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { readPendingInvite } from "./inviteCode";

export function SignInPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState("");

  async function emailLink(form: HTMLFormElement | null) {
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email) return setError("Type your email first, then ask for the link.");
    setBusy(true);
    setError("");
    const invite = readPendingInvite();
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: invite
          ? `${window.location.origin}/invite/${invite}`
          : window.location.origin,
      },
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else setLinkSent(email);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!String(form.get("password") ?? ""))
      return setError("Type your password, or ask for a sign-in link.");
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
  }

  if (linkSent)
    return (
      <AuthLayout
        eyebrow="One more step"
        title="Check your email"
        intro={`If ${linkSent} has a Gecko login, a sign-in link is on its way. Open it and you're in.`}
      >
        <p className="center">
          <Button variant="link" onClick={() => setLinkSent("")}>
            Back to sign in
          </Button>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back"
      intro={
        readPendingInvite()
          ? "You have an invite. Sign in with the email it was sent to."
          : "Team and clients sign in here with their own email."
      }
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={(e) => void emailLink(e.currentTarget.form)}
        >
          Email me a sign-in link instead
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/forgot">Forgot your password?</Link>
      </p>
      <p className="center">
        <Link to="/sign-up">New here? Create an account</Link>
      </p>
    </AuthLayout>
  );
}
