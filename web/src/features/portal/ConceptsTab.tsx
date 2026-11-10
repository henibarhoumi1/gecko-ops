import { canApprove, useClientRole } from "./role";
import { Link } from "react-router-dom";
import { DraftNotice } from "@/components/DraftNotice";
import { useFormDraft } from "@/lib/drafts";
import { StageList } from "@/components/StageList";
import { useHashScroll } from "@/lib/useHashScroll";
import { useState, type FormEvent, useRef } from "react";
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
  useHashScroll(true);

  return (
    <StageList
      lede={tw(
        [
          "Each idea is one reel or post. Approve the ones you like or tell us what to change, and the approved ones become scripts.",
          "Chaque idée, c'est une vidéo ou un post. Validez celles qui vous plaisent ou dites-nous quoi changer : les idées validées deviennent des scripts.",
        ],
        [
          "Each concept is one film or set of stills. Approve the ones that feel right or tell us what to change. Approved concepts become treatments.",
          "Chaque concept, c'est un film ou une série de photos. Validez ceux qui vous parlent ou dites-nous quoi changer : les concepts validés deviennent des notes d'intention.",
        ],
      )}
      action={
        <Button variant="secondary" onClick={() => setAdding(true)}>
          {tw(
            ["Add your own idea", "Proposer une idée"],
            ["Suggest a concept", "Proposer un concept"],
          )}
        </Button>
      }
      form={adding ? <IdeaForm portal={portal} onDone={() => setAdding(false)} /> : null}
      empty={tw(
        [
          "Gecko is working on your ideas. They'll appear here for you to read and approve.",
          "Gecko travaille sur vos idées. Elles apparaîtront ici pour que vous les lisiez et les validiez.",
        ],
        [
          "Gecko is shaping your concepts. They'll appear here for you to read and approve.",
          "Gecko prépare vos concepts. Ils apparaîtront ici pour que vous les lisiez et les validiez.",
        ],
      )}
      groups={groups.map((g) => ({ key: g.status, title: g.title, items: g.items }))}
      itemKey={(c) => c.id}
      renderItem={(concept) => (
        <ConceptCard concept={concept} reader="client">
          {concept.status === "idea" ? (
            <IdeaActions portal={portal} concept={concept} />
          ) : (
            <ClientActions portal={portal} concept={concept} />
          )}
        </ConceptCard>
      )}
    />
  );
}

function ClientActions({ portal, concept }: { portal: ClientPortal; concept: Concept }) {
  const note = useConceptNote(portal);
  const role = useClientRole();
  // An approved idea: the client can write its script too.
  if (concept.status === "approved" && canApprove(role))
    return (
      <div className="concept-actions">
        <Link className="btn" to={`/scripts?idea=${concept.id}`}>
          {t("Write the script", "Écrire le script")}
        </Link>
        <ReviewActions
          canDecide={false}
          pending={note.isPending}
          approveNote=""
          onSend={(kind, body) =>
            note.mutateAsync({ conceptId: concept.id, kind, body, version: concept.version })
          }
        />
      </div>
    );
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
  // Kept on this device while writing: closing the tab doesn't lose it.
  const formRef = useRef<HTMLFormElement>(null);
  const keep = useFormDraft(formRef, `idea.${portal.clientId}.${idea?.id ?? "new"}`);

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
      keep.clear();
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form ref={formRef} className="concept-form card" onSubmit={onSubmit}>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
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
        <Button
          variant="secondary"
          onClick={() => {
            keep.clear();
            onDone();
          }}
          disabled={save.isPending}
        >
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {idea ? t("Save", "Enregistrer") : t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
      </div>
    </form>
  );
}
