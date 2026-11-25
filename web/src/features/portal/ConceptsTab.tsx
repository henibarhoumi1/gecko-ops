import { Select } from "@/components/Select";
import { IdeaStarters } from "@/features/concepts/IdeaStarters";
import { Sheet } from "@/components/Sheet";
import { BANK, ideaBody, type BankFormat } from "@/features/creative/bank";
import { FormatBank } from "@/features/creative/FormatBank";
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
import type { ClientPortal } from "@/features/auth/account";
import { ConceptCard } from "@/features/concepts/ConceptCard";
import { ReviewActions } from "@/features/concepts/ReviewActions";
import { groupConcepts, type Concept } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { useClientSetIdeaShoot, useConceptNote, useDeleteIdea, useSaveIdea } from "./portalApi";
import type { ShootPlan } from "@/features/scripts/model";
import { ShootPanel } from "@/features/writing/ShootPanel";
import { LiveShootPanel } from "@/features/writing/WriteParts";
import { useClientShootChoices } from "@/features/writing/useShootChoices";
import { samePlan, tidyPlan } from "@/features/writing/shootPlan";
import { previewRole } from "@/lib/preview";
import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

export function ConceptsTab({ portal, concepts }: { portal: ClientPortal; concepts: Concept[] }) {
  const [adding, setAdding] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [start, setStart] = useState<BankFormat | null>(null);
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
        <span className="action-pair">
          <Button variant="secondary" onClick={() => setBrowsing(true)}>
            {t(`Browse ${BANK.length} formats`, `Voir les ${BANK.length} formats`)}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setStart(null);
              setAdding(true);
            }}
          >
            {tw(
              ["Add your own idea", "Proposer une idée"],
              ["Suggest a concept", "Proposer un concept"],
            )}
          </Button>
          {browsing && (
            <Sheet
              wide
              title={t("Format bank", "Banque de formats")}
              sub={t(
                "The formats Gecko pitches and shoots, with how each one goes. Pick one to suggest it as an idea.",
                "Les formats que Gecko propose et tourne, avec leur déroulé. Choisissez-en un pour le proposer comme idée.",
              )}
              onClose={() => setBrowsing(false)}
            >
              <FormatBank
                useLabel={t("Suggest this", "Proposer celui-ci")}
                onUse={(f) => {
                  setStart(f);
                  setAdding(true);
                  setBrowsing(false);
                }}
              />
            </Sheet>
          )}
        </span>
      }
      form={
        adding ? (
          <IdeaForm
            key={start?.key ?? "blank"}
            portal={portal}
            start={start}
            onDone={() => setAdding(false)}
          />
        ) : null
      }
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
        <ConceptCard
          concept={concept}
          reader="client"
          aside={<IdeaShoot portal={portal} concept={concept} />}
        >
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

/** Who, which sets, which props: the same panel Gecko sees, editable while the idea is with the client. */
function IdeaShoot({ portal, concept }: { portal: ClientPortal; concept: Concept }) {
  const role = useClientRole();
  const choices = useClientShootChoices(portal, concept.projectId ?? null);
  const save = useClientSetIdeaShoot(portal);
  const open =
    (concept.status === "idea" && concept.fromClient) ||
    concept.status === "review" ||
    concept.status === "changes";
  const canEdit = open && canApprove(role) && !previewRole();
  return (
    <LiveShootPanel
      choices={choices}
      plan={concept.shoot ?? {}}
      onSave={canEdit ? (shoot) => save.mutateAsync({ id: concept.id, shoot }) : undefined}
      note={
        canEdit
          ? t(
              "Pick who, where and what. It saves on its own.",
              "Choisissez qui, où et quoi. C'est enregistré tout seul.",
            )
          : undefined
      }
      empty={t(
        "Gecko adds the talent, the sets and the props here.",
        "Gecko ajoute ici les talents, les décors et les accessoires.",
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
  start,
  onDone,
}: {
  portal: ClientPortal;
  idea?: Concept;
  start?: BankFormat | null;
  onDone: () => void;
}) {
  const seed = start
    ? { title: `${start.name}: `, hook: start.hooks[0] ?? "", body: ideaBody(start) }
    : null;
  const save = useSaveIdea(portal);
  const [error, setError] = useState("");
  const [shoot, setShoot] = useState<ShootPlan>(idea?.shoot ?? {});
  const choices = useClientShootChoices(portal, idea?.projectId ?? null);
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
        hook: text("hook"),
        format: text("format") || "reel",
        ...(samePlan(shoot, idea?.shoot) ? {} : { shoot: tidyPlan(shoot) }),
      });
      keep.clear();
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form ref={formRef} className="ws idea-write" onSubmit={onSubmit}>
      <div className="ws-bar">
        <div className="ws-where">
          <strong>
            {idea
              ? tw(
                  ["Edit your idea", "Modifier votre idée"],
                  ["Edit your concept", "Modifier votre concept"],
                )
              : tw(["Your idea", "Votre idée"], ["Your concept", "Votre concept"])}
          </strong>
          <span>
            {t(
              "Rough is fine. Gecko reads it and shapes it with you.",
              "Brut, c'est très bien. Gecko la lit et la façonne avec vous.",
            )}
          </span>
        </div>
        <div className="ws-actions">
          <Button
            variant="link"
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
      </div>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
      <div className="ws-grid">
        <div className="ws-main">
          <input
            className="ws-title"
            name="title"
            aria-label={t("Title", "Titre")}
            placeholder={tw(
              ["Untitled idea", "Idée sans titre"],
              ["Untitled concept", "Concept sans titre"],
            )}
            defaultValue={idea?.title ?? seed?.title}
            maxLength={160}
            autoFocus
          />
          <div className="ws-meta">
            <Select
              label={t("Format", "Format")}
              name="format"
              defaultValue={idea?.format ?? "reel"}
              options={[
                ["reel", t("Reel / video", "Reel / vidéo")],
                ["carousel", t("Carousel", "Carrousel")],
                ["static", t("Single image", "Image seule")],
                ["other", t("Other", "Autre")],
              ]}
            />
          </div>
          <div className="ws-page">
            {!idea && <IdeaStarters form={formRef} />}
            <label className="ws-hook">
              <span>{t("Hook", "Accroche")}</span>
              <input
                name="hook"
                aria-label={t(
                  "The hook: the first words people hear",
                  "L'accroche : les premiers mots entendus",
                )}
                defaultValue={idea?.hook ?? seed?.hook}
                maxLength={200}
                placeholder={t(
                  "The first words people hear (optional)",
                  "Les premiers mots entendus (facultatif)",
                )}
              />
            </label>
            <textarea
              className="ws-body"
              name="body"
              aria-label={tw(["The idea", "L'idée"], ["The concept", "Le concept"])}
              rows={8}
              defaultValue={idea?.body ?? seed?.body}
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
          </div>
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
        </div>
        <div className="ws-rail">
          <ShootPanel
            choices={choices}
            plan={shoot}
            onChange={setShoot}
            empty={t(
              "Gecko adds the talent, the sets and the props here. You'll pick them for each video.",
              "Gecko ajoute ici les talents, les décors et les accessoires. Vous les choisirez pour chaque vidéo.",
            )}
          />
        </div>
      </div>
    </form>
  );
}
