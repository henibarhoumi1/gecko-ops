import { useState, type FormEvent } from "react";
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
  const [adding, setAdding] = useState(false);

  if (concepts.isPending) return <p className="muted">Loading concepts…</p>;
  if (concepts.isError) return <Notice tone="error">{friendlyError(concepts.error)}</Notice>;
  const groups = groupConcepts(concepts.data, "team");
  const nextPosition = concepts.data.reduce((max, c) => Math.max(max, c.position + 1), 0);

  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          Drafts stay with the team. Share a concept and the client can approve it or ask for
          changes. Editing a shared concept sends the new version back for approval.
        </p>
        {!adding && <Button onClick={() => setAdding(true)}>New concept</Button>}
      </div>
      {adding && (
        <ConceptForm clientId={clientId} position={nextPosition} onDone={() => setAdding(false)} />
      )}
      {groups.length === 0 && !adding && <p className="muted">No concepts yet.</p>}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((concept) => (
              <TeamConcept key={concept.id} clientId={clientId} concept={concept} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TeamConcept({ clientId, concept }: { clientId: string; concept: Concept }) {
  const [mode, setMode] = useState<"idle" | "edit" | "comment" | "delete">("idle");
  const status = useSetConceptStatus();
  const remove = useDeleteConcept();
  const note = useAddNote(clientId);
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
                ? "Comment (the client sees it once you share the concept)"
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
    if (!text("title")) return setError("Give the concept a title.");
    try {
      await save.mutateAsync({
        id: concept?.id ?? null,
        title: text("title"),
        format: text("format") as ConceptFormat,
        body: text("body"),
        refs: text("refs"),
        ...(concept ? {} : { status: form.get("share") ? "review" : "draft", position }),
      });
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="card stack concept-edit" onSubmit={onSubmit}>
      <h3>{concept ? `Edit "${concept.title}"` : "New concept"}</h3>
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
      <TextArea
        label="The concept"
        name="body"
        rows={8}
        defaultValue={concept?.body}
        maxLength={10000}
        placeholder={"Hook (first 2 seconds):\nStory:\nOn screen:\nCall to action:"}
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
          Changing the title, format, concept or references makes a new version, and the client
          approves it again.
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {concept ? "Save" : "Add concept"}
        </Button>
      </div>
    </form>
  );
}
