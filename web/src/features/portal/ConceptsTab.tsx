import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { Field } from "@/components/Field";
import type { ClientPortal } from "@/features/auth/account";
import { ConceptCard } from "@/features/concepts/ConceptCard";
import { ReviewActions } from "@/features/concepts/ReviewActions";
import { groupConcepts, type Concept } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { useConceptNote, useDeleteIdea, useSaveIdea } from "./portalApi";

export function ConceptsTab({ portal, concepts }: { portal: ClientPortal; concepts: Concept[] }) {
  const [adding, setAdding] = useState(false);
  const groups = groupConcepts(concepts, "client");

  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          Each concept is one reel or post. Read it, then approve it or tell us what to change.
          Nothing is shot until you approve it.
        </p>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add your own idea
          </Button>
        )}
      </div>
      {adding && <IdeaForm portal={portal} onDone={() => setAdding(false)} />}
      {groups.length === 0 && !adding && (
        <p className="muted">
          Gecko is writing your concepts. They'll appear here for you to read and approve.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((concept) => (
              <ConceptCard key={concept.id} concept={concept} reader="client">
                {concept.status === "idea" ? (
                  <IdeaActions portal={portal} concept={concept} />
                ) : (
                  <ClientActions portal={portal} concept={concept} />
                )}
              </ConceptCard>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ClientActions({ portal, concept }: { portal: ClientPortal; concept: Concept }) {
  const note = useConceptNote(portal);
  return (
    <ReviewActions
      canDecide={concept.status === "review" || concept.status === "changes"}
      pending={note.isPending}
      approveNote={`You're approving version ${concept.version} of "${concept.title}". Gecko goes ahead with it as written.`}
      onSend={(kind, body) =>
        note.mutateAsync({ conceptId: concept.id, kind, body, version: concept.version })
      }
    />
  );
}

function IdeaActions({ portal, concept }: { portal: ClientPortal; concept: Concept }) {
  const remove = useDeleteIdea(portal);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  if (editing) return <IdeaForm portal={portal} idea={concept} onDone={() => setEditing(false)} />;
  return (
    <div className="concept-actions">
      <Button variant="secondary" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button
        variant="link"
        disabled={remove.isPending}
        onClick={() =>
          remove.mutateAsync(concept.id).catch((e: unknown) => setError(friendlyError(e)))
        }
      >
        Remove
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function IdeaForm({
  portal,
  idea,
  onDone,
}: {
  portal: ClientPortal;
  idea?: Concept;
  onDone: () => void;
}) {
  const save = useSaveIdea(portal);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("title")) return setError("Give your idea a short title.");
    try {
      await save.mutateAsync({
        id: idea?.id ?? null,
        title: text("title"),
        body: text("body"),
        refs: text("refs"),
      });
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <h3>{idea ? "Edit your idea" : "Your idea"}</h3>
      <Field label="Title" name="title" defaultValue={idea?.title} maxLength={160} autoFocus />
      <TextArea
        label="The idea"
        name="body"
        rows={4}
        defaultValue={idea?.body}
        maxLength={10000}
        placeholder="Rough is fine: a scene, a line, a trend you saw."
      />
      <TextArea
        label="Links (one per line)"
        name="refs"
        rows={2}
        defaultValue={idea?.refs}
        maxLength={2000}
        placeholder="Reels or videos you like"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {idea ? "Save" : "Send to Gecko"}
        </Button>
      </div>
    </form>
  );
}
