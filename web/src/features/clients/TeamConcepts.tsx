import { StageList } from "@/components/StageList";
import { useHashScroll } from "@/lib/useHashScroll";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import { ConceptCard } from "@/features/concepts/ConceptCard";
import {
  FORMAT_LABEL,
  groupConcepts,
  type Concept,
  type ConceptFormat,
} from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { ApproveForClient } from "./ApproveForClient";
import {
  useAddNote,
  useConcepts,
  useDeleteConcept,
  useSaveConcept,
  useSetConceptStatus,
} from "./clientsApi";

const FORMATS = Object.entries(FORMAT_LABEL) as [ConceptFormat, string][];

/** The team writes concepts, shares them with the client, and answers the client's notes. */
export function TeamConcepts({ clientId }: { clientId: string }) {
  const concepts = useConcepts(clientId);
  useHashScroll(concepts.isSuccess);
  const [adding, setAdding] = useState(false);

  if (concepts.isPending) return <p className="muted">Loading ideas…</p>;
  if (concepts.isError) return <Notice tone="error">{friendlyError(concepts.error)}</Notice>;
  const groups = groupConcepts(concepts.data, "team");
  const nextPosition = concepts.data.reduce((max, c) => Math.max(max, c.position + 1), 0);

  return (
    <StageList
      lede="Drafts stay with the team. Share an idea and the client can approve it or ask for changes. Editing a shared idea sends the new version back for approval."
      action={<Button onClick={() => setAdding(true)}>New idea</Button>}
      form={
        adding ? (
          <ConceptForm
            clientId={clientId}
            position={nextPosition}
            onDone={() => setAdding(false)}
          />
        ) : null
      }
      empty="No ideas yet."
      groups={groups.map((g) => ({ key: g.status, title: g.title, items: g.items }))}
      itemKey={(c) => c.id}
      renderItem={(concept) => <TeamConcept clientId={clientId} concept={concept} />}
    />
  );
}

function TeamConcept({ clientId, concept }: { clientId: string; concept: Concept }) {
  const [mode, setMode] = useState<"idle" | "edit" | "comment" | "delete">("idle");
  const status = useSetConceptStatus();
  const remove = useDeleteConcept();
  const note = useAddNote(clientId);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const run = (action: Promise<unknown>, after: () => void = () => setMode("idle")) =>
    action.then(after, (e: unknown) => setError(friendlyError(e)));

  if (mode === "edit")
    return <ConceptForm clientId={clientId} concept={concept} onDone={() => setMode("idle")} />;

  return (
    <ConceptCard concept={concept} reader="team">
      {mode === "idle" && (
        <div className="concept-actions">
          {(concept.status === "draft" || concept.status === "idea") && (
            <Button
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: concept.id, status: "review" }))}
            >
              Share with the client
            </Button>
          )}
          {concept.status === "approved" && (
            <Button
              onClick={() =>
                navigate(`/clients/${encodeURIComponent(clientId)}/scripts?idea=${concept.id}`)
              }
            >
              Write the script
            </Button>
          )}
          {(concept.status === "review" || concept.status === "changes") && (
            <ApproveForClient
              clientId={clientId}
              kind="concept"
              id={concept.id}
              version={concept.version}
            />
          )}
          <Button variant="secondary" onClick={() => setMode("edit")}>
            Edit
          </Button>
          <Button variant="link" onClick={() => setMode("comment")}>
            Comment
          </Button>
          {concept.status === "review" && (
            <Button
              variant="link"
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: concept.id, status: "draft" }))}
            >
              Take back to draft
            </Button>
          )}
          <Button variant="link" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="concept-form">
          <p className="small">
            Delete "{concept.title}" and its conversation? The client won't see it any more.
          </p>
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Keep it
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => void run(remove.mutateAsync(concept.id))}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      {mode === "comment" && (
        <form
          className="concept-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
            if (!body) return setError("Write a comment first.");
            void run(note.mutateAsync({ conceptId: concept.id, body }));
          }}
        >
          <TextArea
            label={
              concept.status === "draft"
                ? "Comment (the client sees it once you share the idea)"
                : "Comment (the client sees it)"
            }
            name="body"
            rows={3}
            maxLength={4000}
            autoFocus
          />
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="submit" disabled={note.isPending}>
              Send
            </Button>
          </div>
        </form>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </ConceptCard>
  );
}

function ConceptForm({
  clientId,
  concept,
  position,
  onDone,
}: {
  clientId: string;
  concept?: Concept;
  position?: number;
  onDone: () => void;
}) {
  const save = useSaveConcept(clientId);
  const [error, setError] = useState("");
  const shared = concept && concept.status !== "draft" && concept.status !== "idea";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("title")) return setError("Give the idea a title.");
    try {
      await save.mutateAsync({
        id: concept?.id ?? null,
        title: text("title"),
        format: text("format") as ConceptFormat,
        body: text("body"),
        refs: text("refs"),
        hook: text("hook"),
        ...(concept ? {} : { status: form.get("share") ? "review" : "draft", position }),
      });
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="card stack concept-edit" onSubmit={onSubmit}>
      <h3>{concept ? `Edit "${concept.title}"` : "New idea"}</h3>
      <div className="row">
        <Field
          label="Title"
          name="title"
          defaultValue={concept?.title}
          maxLength={160}
          autoFocus
          required
        />
        <Select
          label="Format"
          name="format"
          defaultValue={concept?.format ?? "reel"}
          options={FORMATS}
        />
      </div>
      <Field
        label="Hook line: the first words of the ad"
        name="hook"
        defaultValue={concept?.hook}
        maxLength={200}
        placeholder="Your skin feels tight every morning? Not anymore."
      />
      <TextArea
        label="The idea"
        name="body"
        rows={6}
        defaultValue={concept?.body}
        maxLength={10000}
        placeholder="What happens, in a few lines: who, where, what we show, how it ends."
      />
      <TextArea
        label="References (one link per line)"
        name="refs"
        rows={2}
        defaultValue={concept?.refs}
        maxLength={2000}
      />
      {!concept && (
        <label className="check">
          <input type="checkbox" name="share" /> Share with the client now
        </label>
      )}
      {shared && (
        <p className="small muted">
          Changing the title, format, hook, idea or references makes a new version, and the client
          approves it again.
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {concept ? "Save" : "Add idea"}
        </Button>
      </div>
    </form>
  );
}
