import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";

export function SignUpPage() {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.signUp({
      email,
      password: String(form.get("password")),
      options: {
        data: { name: String(form.get("name")).trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Almost there"
        title="Check your email"
        intro={`We sent a confirmation link to ${sentTo}. Open it, then sign in.`}
      >
        <p className="center">
          <Link to="/sign-in">Go to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Create an account"
      title="Join Gecko"
      intro="Use the email your invite was sent to."
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field label="Your name" name="name" autoComplete="name" required maxLength={120} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/sign-in">Already have an account? Sign in</Link>
      </p>
    </AuthLayout>
  );
}
