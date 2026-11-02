import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { friendlyError } from "@/lib/errors";
import { canApprove, useClientRole } from "@/features/portal/role";
import type { NoteKind } from "./model";
import { t } from "@/lib/i18n";

type Mode = "idle" | NoteKind;

/**
 * The client's buttons under a concept or a video: approve, ask for changes, or comment. Approving
 * asks for one confirmation that names the exact version, since the team acts on it.
 */
export function ReviewActions({
  canDecide,
  pending,
  approveNote,
  commentLabel,
  onSend,
}: {
  canDecide: boolean;
  pending: boolean;
  approveNote: string;
  commentLabel?: string;
  onSend: (kind: NoteKind, body: string) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");
  // On the team's side there is no client role; the context's default lets the buttons through.
  const allowed = canApprove(useClientRole());

  async function send(kind: NoteKind, body: string) {
    setError("");
    try {
      await onSend(kind, body);
      setMode("idle");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (mode === "approve") return void send("approve", body);
    if (!body)
      return setError(
        mode === "changes"
          ? t("Tell us what to change.", "Dites-nous quoi changer.")
          : t("Write a comment first.", "Écrivez d'abord un commentaire."),
      );
    void send(mode === "changes" ? "changes" : "comment", body);
  }

  if (mode === "idle")
    return (
      <div className="concept-actions">
        {canDecide && !allowed && (
          <p className="small muted decide-note">
            {t(
              "Your owner or an approver on your side signs this off.",
              "C'est votre responsable ou un valideur de votre équipe qui valide.",
            )}
          </p>
        )}
        {canDecide && allowed && (
          <>
            <Button onClick={() => setMode("approve")}>{t("Approve", "Valider")}</Button>
            <Button variant="secondary" onClick={() => setMode("changes")}>
              {t("Ask for changes", "Demander des changements")}
            </Button>
          </>
        )}
        <Button variant="link" onClick={() => setMode("comment")}>
          {commentLabel ?? t("Comment", "Commenter")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    );

  return (
    <form className="concept-form" onSubmit={onSubmit}>
      {mode === "approve" && <p className="small">{approveNote}</p>}
      <TextArea
        label={
          mode === "approve"
            ? t("Anything to add? (optional)", "Quelque chose à ajouter ? (facultatif)")
            : mode === "changes"
              ? t("What should change?", "Qu'est-ce qui doit changer ?")
              : t("Your comment", "Votre commentaire")
        }
        name="body"
        rows={3}
        maxLength={4000}
        autoFocus
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setMode("idle")} disabled={pending}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={pending}>
          {mode === "approve"
            ? t("Confirm approval", "Confirmer la validation")
            : mode === "changes"
              ? t("Send changes", "Envoyer les changements")
              : t("Send", "Envoyer")}
        </Button>
      </div>
    </form>
  );
}
