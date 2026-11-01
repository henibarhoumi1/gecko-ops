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

export function SignInPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState("");

  async function emailLink(form: HTMLFormElement | null) {
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email)
      return setError(
        t(
          "Type your email first, then ask for the link.",
          "Tapez d'abord votre e-mail, puis demandez le lien.",
        ),
      );
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
      return setError(
        t(
          "Type your password, or ask for a sign-in link.",
          "Tapez votre mot de passe, ou demandez un lien de connexion.",
        ),
      );
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
        eyebrow={t("One more step", "Encore une étape")}
        title={t("Check your email", "Regardez vos e-mails")}
        intro={t(
          `If ${linkSent} has a Gecko login, a sign-in link is on its way. Open it and you're in.`,
          `Si ${linkSent} a un accès Gecko, un lien de connexion arrive. Ouvrez-le et vous y êtes.`,
        )}
      >
        <p className="center">
          <Button variant="link" onClick={() => setLinkSent("")}>
            {t("Back to sign in", "Retour à la connexion")}
          </Button>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout
      eyebrow={t("Sign in", "Connexion")}
      title={t("Welcome back", "Bon retour")}
      intro={
        readPendingInvite()
          ? t(
              "You have an invite. Sign in with the email it was sent to.",
              "Vous avez une invitation. Connectez-vous avec l'e-mail qui l'a reçue.",
            )
          : t(
              "Team and clients sign in here with their own email.",
              "L'équipe et les clients se connectent ici avec leur propre e-mail.",
            )
      }
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label={t("Email", "E-mail")}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label={t("Password", "Mot de passe")}
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" disabled={busy}>
          {busy ? t("Signing in…", "Connexion…") : t("Sign in", "Se connecter")}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={(e) => void emailLink(e.currentTarget.form)}
        >
          {t("Email me a sign-in link instead", "Recevoir un lien de connexion par e-mail")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center">
        <Link to="/forgot">{t("Forgot your password?", "Mot de passe oublié ?")}</Link>
      </p>
      <p className="center">
        <Link to="/sign-up">{t("New here? Create an account", "Nouveau ? Créer un compte")}</Link>
      </p>
    </AuthLayout>
  );
}
