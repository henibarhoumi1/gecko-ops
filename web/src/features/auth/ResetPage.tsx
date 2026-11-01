import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthProvider";
import { t } from "@/lib/i18n";

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
    if (password !== String(form.get("again")))
      return setError(
        t("The two passwords don't match.", "Les deux mots de passe ne sont pas identiques."),
      );
    setBusy(true);
    setError("");
    const { error } = await requireSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendlyError(error));
    else void navigate("/", { replace: true });
  }

  if (state.status === "loading") return <p className="loading">{t("Loading…", "Chargement…")}</p>;
  if (state.status === "signed-out")
    return (
      <AuthLayout
        eyebrow={t("Reset link", "Lien de réinitialisation")}
        title={t("This link has expired", "Ce lien a expiré")}
        intro={t(
          "Reset links work once, for one hour. Ask for a new one.",
          "Ces liens marchent une fois, pendant une heure. Demandez-en un nouveau.",
        )}
      >
        <p className="center">
          <Link to="/forgot">{t("Send a new link", "Envoyer un nouveau lien")}</Link>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout
      eyebrow={t("New password", "Nouveau mot de passe")}
      title={t("Choose a new password", "Choisissez un nouveau mot de passe")}
    >
      <form className="stack" onSubmit={onSubmit}>
        <Field
          label={t("New password", "Nouveau mot de passe")}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Field
          label={t("Same password again", "Le même, encore une fois")}
          name="again"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy
            ? t("Saving…", "Enregistrement…")
            : t("Save and continue", "Enregistrer et continuer")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    </AuthLayout>
  );
}
