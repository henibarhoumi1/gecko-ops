import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthProvider";

/** Where the reset email lands: the link signs the person in, and they set a new password here. */
export function ResetPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("again"))) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else void navigate("/", { replace: true });
  }

  if (state.status === "loading") return <p className="loading">Loading…</p>;
  if (state.status === "signed-out")
    return (
      <AuthLayout
        eyebrow="Reset link"
        title="This link has expired"
        intro="Reset links work once, for one hour. Ask for a new one."
      >
        <p className="center">
          <Link to="/forgot">Send a new link</Link>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout eyebrow="New password" title="Choose a new password">
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Field
          label="Same password again"
          name="again"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save and continue"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    </AuthLayout>
  );
}
