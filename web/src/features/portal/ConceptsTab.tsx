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
import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

export function ConceptsTab({ portal, concepts }: { portal: ClientPortal; concepts: Concept[] }) {
  const [adding, setAdding] = useState(false);
  const groups = groupConcepts(concepts, "client");

  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          {tw(
            [
              "Each idea is one reel or post. Approve the ones you like or tell us what to change, and the approved ones become scripts.",
              "Chaque idée, c'est une vidéo ou un post. Validez celles qui vous plaisent ou dites-nous quoi changer : les idées validées deviennent des scripts.",
            ],
            [
              "Each concept is one film or set of stills. Approve the ones that feel right or tell us what to change. Approved concepts become treatments.",
              "Chaque concept, c'est un film ou une série de photos. Validez ceux qui vous parlent ou dites-nous quoi changer : les concepts validés deviennent des notes d'intention.",
            ],
          )}
        </p>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {tw(
              ["Add your own idea", "Proposer une idée"],
              ["Suggest a concept", "Proposer un concept"],
            )}
          </Button>
        )}
      </div>
      {adding && <IdeaForm portal={portal} onDone={() => setAdding(false)} />}
      {groups.length === 0 && !adding && (
        <p className="muted">
          {tw(
            [
              "Gecko is working on your ideas. They'll appear here for you to read and approve.",
              "Gecko travaille sur vos idées. Elles apparaîtront ici pour que vous les lisiez et les validiez.",
            ],
            [
              "Gecko is shaping your concepts. They'll appear here for you to read and approve.",
              "Gecko prépare vos concepts. Ils apparaîtront ici pour que vous les lisiez et les validiez.",
            ],
          )}
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
      approveNote={t(
        `You're approving version ${concept.version} of "${concept.title}". Gecko goes ahead with it as written.`,
        `Vous validez la version ${concept.version} de « ${concept.title} ». Gecko avance avec, tel quel.`,
      )}
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
        {t("Edit", "Modifier")}
      </Button>
      <Button
        variant="link"
        disabled={remove.isPending}
        onClick={() =>
          remove.mutateAsync(concept.id).catch((e: unknown) => setError(friendlyError(e)))
        }
      >
        {t("Remove", "Retirer")}
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
    if (!text("title"))
      return setError(
        tw(
          ["Give your idea a short title.", "Donnez un titre court à votre idée."],
          ["Give your concept a short title.", "Donnez un titre court à votre concept."],
        ),
      );
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
      <h3>
        {idea
          ? tw(
              ["Edit your idea", "Modifier votre idée"],
              ["Edit your concept", "Modifier votre concept"],
            )
          : tw(["Your idea", "Votre idée"], ["Your concept", "Votre concept"])}
      </h3>
      <Field
        label={t("Title", "Titre")}
        name="title"
        defaultValue={idea?.title}
        maxLength={160}
        autoFocus
      />
      <TextArea
        label={tw(["The idea", "L'idée"], ["The concept", "Le concept"])}
        name="body"
        rows={4}
        defaultValue={idea?.body}
        maxLength={10000}
        placeholder={tw(
          [
            "Rough is fine: a scene, a line, a trend you saw.",
            "Brut, c'est très bien : une scène, une phrase, une tendance repérée.",
          ],
          [
            "Rough is fine: a mood, a place, a feeling, a reference.",
            "Brut, c'est très bien : une ambiance, un lieu, une émotion, une référence.",
          ],
        )}
      />
      <TextArea
        label={t("Links (one per line)", "Liens (un par ligne)")}
        name="refs"
        rows={2}
        defaultValue={idea?.refs}
        maxLength={2000}
        placeholder={tw(
          ["Reels or videos you like", "Des vidéos qui vous plaisent"],
          [
            "Films, photos or campaigns you like",
            "Des films, photos ou campagnes qui vous plaisent",
          ],
        )}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {idea ? t("Save", "Enregistrer") : t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
      </div>
    </form>
  );
}
