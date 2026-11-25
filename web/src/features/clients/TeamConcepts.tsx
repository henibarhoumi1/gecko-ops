import { toast } from "@/components/Toast";
import { WritingTabs, useSaveKeys } from "@/components/WritingTabs";
import { IdeaStarters } from "@/features/concepts/IdeaStarters";
import { TeamPicks } from "@/features/picks/TeamPicks";
import { DraftNotice } from "@/components/DraftNotice";
import { useFormDraft } from "@/lib/drafts";
import { StageList } from "@/components/StageList";
import { useHashScroll } from "@/lib/useHashScroll";
import { useEffect, useState, type FormEvent, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
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
  useSetConceptShoot,
  useSetConceptStatus,
} from "./clientsApi";
import type { ShootPlan } from "@/features/scripts/model";
import { ShootPanel } from "@/features/writing/ShootPanel";
import { LiveShootPanel } from "@/features/writing/WriteParts";
import { useTeamShootChoices } from "@/features/writing/useShootChoices";
import { tidyPlan } from "@/features/writing/shootPlan";

const FORMATS = Object.entries(FORMAT_LABEL) as [ConceptFormat, string][];

/** The team writes concepts, shares them with the client, and answers the client's notes. */
export function TeamConcepts({ clientId }: { clientId: string }) {
  const concepts = useConcepts(clientId);
  useHashScroll(concepts.isSuccess);
  // ?new=1 comes from the command bar (⌘K → "New idea for …").
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get("new") === "1");
  // Already on this page when ⌘K asks for a new one: open it too.
  const wantsNew = params.get("new") === "1";
  useEffect(() => {
    if (wantsNew) setAdding(true);
  }, [wantsNew]);

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
            onDone={() => {
              setAdding(false);
              if (params.get("new")) setParams({}, { replace: true });
            }}
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
  const choices = useTeamShootChoices(clientId, concept.projectId ?? null);
  const setShoot = useSetConceptShoot(clientId);

  const run = (action: Promise<unknown>, after: () => void = () => setMode("idle")) =>
    action.then(after, (e: unknown) => setError(friendlyError(e)));

  if (mode === "edit")
    return <ConceptForm clientId={clientId} concept={concept} onDone={() => setMode("idle")} />;

  return (
    <ConceptCard
      concept={concept}
      reader="team"
      aside={
        <>
          <LiveShootPanel
            choices={choices}
            plan={concept.shoot ?? {}}
            onSave={(shoot) => setShoot.mutateAsync({ id: concept.id, shoot })}
            empty="Add talent, sets and props in Production, then pick them here."
          />
          <TeamPicks clientId={clientId} kind="concept" id={concept.id} />
        </>
      }
    >
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
  const [shoot, setShoot] = useState<ShootPlan>(
    concept?.shoot ?? (concept?.talent?.length ? { talent: concept.talent } : {}),
  );
  const choices = useTeamShootChoices(clientId, concept?.projectId ?? null);
  const shared = concept && concept.status !== "draft" && concept.status !== "idea";
  // Kept on this device while writing: closing the tab doesn't lose it.
  const formRef = useRef<HTMLFormElement>(null);
  const keep = useFormDraft(formRef, `idea.${clientId}.${concept?.id ?? "new"}`);
  useSaveKeys(formRef);

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
        shoot: tidyPlan(shoot),
        ...(concept ? {} : { status: form.get("share") ? "review" : "draft", position }),
      });
      keep.clear();
      toast(
        !concept && form.get("share")
          ? { text: "Idea shared with the client", detail: text("title"), celebrate: true }
          : { text: concept ? "Idea saved" : "Idea added", detail: text("title") },
      );
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form ref={formRef} className="ws concept-edit" onSubmit={onSubmit}>
      <div className="ws-bar">
        <div className="ws-where">
          <strong>{concept ? "Idea" : "New idea"}</strong>
          <span>
            {concept
              ? `Version ${concept.version}${shared ? " · the client has seen it" : ""}`
              : "Kept on this device until you save"}
          </span>
        </div>
        <div className="ws-actions">
          {!concept && (
            <label className="ws-check">
              <input type="checkbox" name="share" /> Share with the client now
            </label>
          )}
          <Button
            variant="link"
            onClick={() => {
              keep.clear();
              onDone();
            }}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending} aria-keyshortcuts="Meta+S">
            {concept ? "Save" : "Add idea"}
          </Button>
        </div>
      </div>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
      <div className="ws-grid">
        <div className="ws-main">
          <input
            className="ws-title"
            name="title"
            aria-label="Title"
            placeholder="Untitled idea"
            defaultValue={concept?.title}
            maxLength={160}
            autoFocus
            required
          />
          <div className="ws-meta">
            <Select
              label="Format"
              name="format"
              defaultValue={concept?.format ?? "reel"}
              options={FORMATS}
            />
          </div>
          <WritingTabs
            tabs={[
              {
                key: "idea",
                label: "The idea",
                body: (
                  <div className="ws-page">
                    {!concept && <IdeaStarters form={formRef} />}
                    <label className="ws-hook">
                      <span>Hook</span>
                      <input
                        name="hook"
                        aria-label="Hook line: the first words of the ad"
                        defaultValue={concept?.hook}
                        maxLength={200}
                        placeholder="The first words of the ad…"
                      />
                    </label>
                    <textarea
                      className="ws-body"
                      name="body"
                      aria-label="The idea"
                      rows={10}
                      defaultValue={concept?.body}
                      maxLength={10000}
                      placeholder="What happens, in a few lines: who, where, what we show, how it ends."
                    />
                  </div>
                ),
              },
              {
                key: "refs",
                label: "References",
                body: (
                  <TextArea
                    label="One link per line"
                    name="refs"
                    rows={4}
                    defaultValue={concept?.refs}
                    maxLength={2000}
                  />
                ),
              },
            ]}
          />
          <p className="ws-keys" aria-hidden="true">
            <kbd>⌘S</kbd> save · <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>2</kbd> sections
          </p>
        </div>
        <div className="ws-rail">
          <ShootPanel
            choices={choices}
            plan={shoot}
            onChange={setShoot}
            empty="Add talent, sets and props in Production, then pick them here."
            note={shared ? "Changing who, where or what never makes a new version." : undefined}
          />
        </div>
      </div>
      {shared && (
        <p className="small muted ws-foot">
          Changing the title, format, hook, idea or references makes a new version, and the client
          approves it again.
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
