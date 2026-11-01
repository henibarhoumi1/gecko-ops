import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { t } from "@/lib/i18n";

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
        eyebrow={t("Check your email", "Regardez vos e-mails")}
        title={t("Reset link sent", "Lien envoyé")}
        intro={t(
          `If ${sentTo} has an account, a link to choose a new password is on its way. It works once, for one hour.`,
          `Si ${sentTo} a un compte, un lien pour choisir un nouveau mot de passe arrive. Il marche une fois, pendant une heure.`,
        )}
      >
        <p className="center">
          <Link to="/sign-in">{t("Back to sign in", "Retour à la connexion")}</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={t("Forgot your password", "Mot de passe oublié")}
      title={t("Choose a new one", "Choisissez-en un nouveau")}
      intro={t(
        "Enter your email and we'll send you a link.",
        "Entrez votre e-mail, on vous envoie un lien.",
      )}
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label={t("Email", "E-mail")}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? t("Sending…", "Envoi…") : t("Send the link", "Envoyer le lien")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/sign-in">{t("Back to sign in", "Retour à la connexion")}</Link>
      </p>
    </AuthLayout>
  );
}
