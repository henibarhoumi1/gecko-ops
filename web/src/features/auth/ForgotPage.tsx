import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";

/** Sends a password reset link. It says the same thing whether or not the email has an account. */
export function ForgotPage() {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Check your email"
        title="Reset link sent"
        intro={`If ${sentTo} has an account, a link to choose a new password is on its way. It works once, for one hour.`}
      >
        <p className="center">
          <Link to="/sign-in">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Forgot your password"
      title="Choose a new one"
      intro="Enter your email and we'll send you a link."
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send the link"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/sign-in">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
