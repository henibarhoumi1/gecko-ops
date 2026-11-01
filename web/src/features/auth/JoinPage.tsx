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
import { t } from "@/lib/i18n";

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
    if (!code)
      return setError(
        t(
          "Paste the whole invite link Gecko sent you.",
          "Collez le lien d'invitation complet envoyé par Gecko.",
        ),
      );
    void run(() => acceptInvite(requireSupabase(), code, String(form.get("name")).trim()));
  }

  return (
    <AuthLayout
      eyebrow={t("One more step", "Encore une étape")}
      title={t("Join Gecko", "Rejoindre Gecko")}
      intro={t(
        "Open the invite link Gecko sent you, or paste it below. No link yet? Ask Gecko to invite this email.",
        "Ouvrez le lien d'invitation envoyé par Gecko, ou collez-le ci-dessous. Pas encore de lien ? Demandez à Gecko d'inviter cet e-mail.",
      )}
    >
      <form className="stack" onSubmit={onJoin}>
        <Field label={t("Invite link", "Lien d'invitation")} name="invite" required />
        <Field
          label={t("Your name", "Votre nom")}
          name="name"
          autoComplete="name"
          maxLength={120}
        />
        <Button type="submit" disabled={busy}>
          {t("Join", "Rejoindre")}
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
          {t("Sign out", "Se déconnecter")}
        </Button>
      </p>
    </AuthLayout>
  );
}
