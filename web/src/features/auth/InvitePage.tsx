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
import { t } from "@/lib/i18n";

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
  const [byEmail, setByEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = peek.data?.email ?? String(form.get("email")).trim();
    const name = String(form.get("name") ?? "").trim();
    // The code rides in the link, so an emailed link works even if it opens in another browser.
    const redirect = `${window.location.origin}/invite/${code}`;
    setBusy(true);
    setError("");
    if (byEmail) {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data: { name }, emailRedirectTo: redirect },
      });
      setBusy(false);
      if (error) setError(friendlyError(error));
      else setSentTo(email);
      return;
    }
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password: String(form.get("password")),
      options: { data: { name }, emailRedirectTo: redirect },
    });
    setBusy(false);
    if (error) setError(friendlyError(error));
    // With email confirmation off the session comes straight back and the page moves on by itself.
    else if (!data.session) setSentTo(email);
  }

  if (peek.isPending) return null;
  if (peek.data === null)
    return (
      <AuthLayout
        eyebrow={t("Invite", "Invitation")}
        title={t("This link has already been used", "Ce lien a déjà servi")}
        intro={t(
          "It was used to create a login, or it expired after 14 days. If you already have a login, sign in. Otherwise ask Gecko for a new link.",
          "Il a servi à créer un accès, ou il a expiré après 14 jours. Si vous avez déjà un accès, connectez-vous. Sinon, demandez un nouveau lien à Gecko.",
        )}
      >
        <p className="center">
          <Link to="/sign-in">{t("Sign in", "Se connecter")}</Link>
        </p>
      </AuthLayout>
    );

  if (sentTo)
    return (
      <AuthLayout
        eyebrow={t("One more step", "Encore une étape")}
        title={t("Check your email", "Regardez vos e-mails")}
        intro={t(
          `We sent a link to ${sentTo}. Open it on this phone or computer and you're in.`,
          `Nous avons envoyé un lien à ${sentTo}. Ouvrez-le sur ce téléphone ou cet ordinateur et vous y êtes.`,
        )}
      >
        <p className="small muted center">
          {t(
            "Nothing after a minute? Check spam, or",
            "Rien après une minute ? Regardez les spams, ou",
          )}{" "}
          <Button variant="link" onClick={() => setSentTo("")}>
            {t("try again", "réessayez")}
          </Button>
          .
        </p>
      </AuthLayout>
    );

  const brand = peek.data?.brand;
  return (
    <AuthLayout
      eyebrow={t("You're invited", "Invitation")}
      title={brand ? `${brand} × Gecko` : t("Your Gecko portal", "Votre espace Gecko")}
      intro={
        byEmail
          ? t(
              "We'll email you a link to get in, no password needed.",
              "On vous envoie un lien par e-mail pour entrer, sans mot de passe.",
            )
          : t(
              "Everything for your campaign in one place: ideas and scripts to approve, your shoot, your videos. Pick a password and you're in.",
              "Toute votre campagne au même endroit : idées et scripts à valider, votre tournage, vos vidéos. Choisissez un mot de passe et vous y êtes.",
            )
      }
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label={t("Your name", "Votre nom")}
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          autoFocus
        />
        {peek.data?.email ? (
          <Field
            label={t("Email", "E-mail")}
            name="email"
            type="email"
            autoComplete="username"
            value={peek.data.email}
            readOnly
          />
        ) : (
          <Field
            label={t(
              "Email (the one the invite was sent to)",
              "E-mail (celui qui a reçu l'invitation)",
            )}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        )}
        {!byEmail && (
          <Field
            label={t(
              "Choose a password (8 characters or more)",
              "Choisissez un mot de passe (8 caractères ou plus)",
            )}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        )}
        <Button type="submit" disabled={busy}>
          {byEmail
            ? busy
              ? t("Sending…", "Envoi…")
              : t("Email me my link", "Recevoir mon lien")
            : busy
              ? t("Opening…", "Ouverture…")
              : t("Open my portal", "Ouvrir mon espace")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <p className="center small">
        <Button
          variant="link"
          onClick={() => {
            setByEmail(!byEmail);
            setError("");
          }}
        >
          {byEmail
            ? t("Use a password instead", "Utiliser un mot de passe")
            : t("Email me a link instead", "Recevoir un lien par e-mail")}
        </Button>{" "}
        · <Link to="/sign-in">{t("I already have a login", "J'ai déjà un accès")}</Link>
      </p>
    </AuthLayout>
  );
}
