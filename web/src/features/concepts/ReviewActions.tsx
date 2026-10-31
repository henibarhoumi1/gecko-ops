import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { friendlyError } from "@/lib/errors";
import type { NoteKind } from "./model";

type Mode = "idle" | NoteKind;

/**
 * The client's buttons under a concept or a video: approve, ask for changes, or comment. Approving
 * asks for one confirmation that names the exact version, since the team acts on it.
 */
export function ReviewActions({
  canDecide,
  pending,
  approveNote,
  onSend,
}: {
  canDecide: boolean;
  pending: boolean;
  approveNote: string;
  onSend: (kind: NoteKind, body: string) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");

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
      return setError(mode === "changes" ? "Tell us what to change." : "Write a comment first.");
    void send(mode === "changes" ? "changes" : "comment", body);
  }

  if (mode === "idle")
    return (
      <div className="concept-actions">
        {canDecide && (
          <>
            <Button onClick={() => setMode("approve")}>Approve</Button>
            <Button variant="secondary" onClick={() => setMode("changes")}>
              Ask for changes
            </Button>
          </>
        )}
        <Button variant="link" onClick={() => setMode("comment")}>
          Comment
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
            ? "Anything to add? (optional)"
            : mode === "changes"
              ? "What should change?"
              : "Your comment"
        }
        name="body"
        rows={3}
        maxLength={4000}
        autoFocus
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setMode("idle")} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {mode === "approve" ? "Confirm approval" : mode === "changes" ? "Send changes" : "Send"}
        </Button>
      </div>
    </form>
  );
}
