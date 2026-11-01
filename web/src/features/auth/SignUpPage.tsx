import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { readPendingInvite } from "./inviteCode";
import { t } from "@/lib/i18n";

export function SignUpPage() {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const invited = readPendingInvite() !== null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const invite = readPendingInvite();
    setBusy(true);
    setError("");
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password: String(form.get("password")),
      options: {
        data: { name: String(form.get("name")).trim() },
        // The confirmation email often opens in another browser than the invite did (WhatsApp, then the mail app),
        // so the invite code rides along in the link instead of relying on this browser's storage.
        emailRedirectTo: invite
          ? `${window.location.origin}/invite/${invite}`
          : window.location.origin,
      },
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    // With email confirmation off the session comes straight back and the router moves on by itself.
    else if (!data.session) setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow={t("Almost there", "Presque fini")}
        title={t("Check your email", "Regardez vos e-mails")}
        intro={t(
          `We sent a confirmation link to ${sentTo}. Open it and you're in.`,
          `Nous avons envoyé un lien de confirmation à ${sentTo}. Ouvrez-le et vous y êtes.`,
        )}
      >
        <p className="center">
          <Link to="/sign-in">{t("Go to sign in", "Aller à la connexion")}</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={
        invited ? t("You're invited", "Invitation") : t("Create an account", "Créer un compte")
      }
      title={
        invited ? t("Create your login", "Créez votre accès") : t("Join Gecko", "Rejoindre Gecko")
      }
      intro={t(
        "Use the email your invite was sent to.",
        "Utilisez l'e-mail qui a reçu l'invitation.",
      )}
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label={t("Your name", "Votre nom")}
          name="name"
          autoComplete="name"
          required
          maxLength={120}
        />
        <Field
          label={t("Email", "E-mail")}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label={t("Password (8 characters or more)", "Mot de passe (8 caractères ou plus)")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Button type="submit" disabled={busy}>
          {busy ? t("Creating…", "Création…") : t("Create account", "Créer le compte")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/sign-in">
          {t("Already have an account? Sign in", "Déjà un compte ? Se connecter")}
        </Link>
      </p>
    </AuthLayout>
  );
}
