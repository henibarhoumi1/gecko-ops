import { DraftNotice } from "@/components/DraftNotice";
import { TeamPicks } from "@/features/picks/TeamPicks";
import { useDraft } from "@/lib/drafts";
import { StageList } from "@/components/StageList";
import { useHashScroll } from "@/lib/useHashScroll";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "@/components/Toast";
import { WritingTabs, useSaveKeys, type WritingTab } from "@/components/WritingTabs";
import { ShootPanel } from "@/features/writing/ShootPanel";
import { IdeaCard, LengthPicker, LiveShootPanel } from "@/features/writing/WriteParts";
import { useTeamShootChoices } from "@/features/writing/useShootChoices";
import { planCount, tidyPlan } from "@/features/writing/shootPlan";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import {
  groupScripts,
  tidyLines,
  tidyTreatment,
  TREATMENT_KEYS,
  treatmentLabel,
  byClient,
  type Treatment,
  type Script,
  type ShootPlan,
} from "@/features/scripts/model";
import { ScriptView } from "@/features/scripts/ScriptView";
import { BrandDrawer, useBrand } from "@/features/scripts/BrandDrawer";
import { useProvenHooks } from "@/features/results/ResultsExtras";
import { useTeamShared } from "@/features/shared/sharedApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import {
  AdParts,
  adDraft,
  draftBeats,
  noWords,
  type AdDraft,
  draftCta,
} from "@/features/scripts/AdParts";
import {
  useDeleteScript,
  useSaveScript,
  useScripts,
  useSetScriptShoot,
  useSetScriptStatus,
  useTeamScriptNote,
} from "@/features/scripts/scriptsApi";
import { friendlyError } from "@/lib/errors";
import { useClients, useConcepts } from "./clientsApi";
import { CreativeKit } from "@/features/scripts/CreativeKit";
import { ShotListButton } from "@/features/scripts/ShotListButton";
import { CleanCopy, useApprovedProduction } from "./ShootPlan";
import { useTemplates } from "./lookApi";
import { TextArea } from "@/components/TextArea";
import { ApproveForClient } from "./ApproveForClient";

/** The team writes scripts, shares them, and works through the client's line comments. */
export function TeamScripts({ clientId }: { clientId: string }) {
  const scripts = useScripts(clientId);
  // ?idea=… comes from "Write the script" on an approved idea: the form opens linked to it.
  const [params, setParams] = useSearchParams();
  const fromIdea = params.get("idea") ?? undefined;
  useHashScroll(scripts.isSuccess);
  // ?new=1 comes from the command bar (⌘K → "New script for …").
  const [adding, setAdding] = useState(Boolean(fromIdea) || params.get("new") === "1");
  // Already on this page when ⌘K asks for a new one: open it too.
  const wantsNew = params.get("new") === "1";
  useEffect(() => {
    if (wantsNew) setAdding(true);
  }, [wantsNew]);
  const done = () => {
    setAdding(false);
    if (fromIdea || params.get("new")) setParams({}, { replace: true });
  };

  if (scripts.isPending) return <p className="muted">Loading scripts…</p>;
  if (scripts.isError) return <Notice tone="error">{friendlyError(scripts.error)}</Notice>;
  const groups = groupScripts(scripts.data, "team");
  const nextPosition = scripts.data.reduce((max, s) => Math.max(max, s.position + 1), 0);

  return (
    <StageList
      lede="One script per reel, built Hook → Lead → Body → CTA. Pick the idea and a template; write two or three hooks so the client can pick. Approved scripts stay editable, by Gecko and by the client: an edit makes a new version that needs one more approval."
      action={<Button onClick={() => setAdding(true)}>New script</Button>}
      form={
        adding ? (
          <ScriptForm
            clientId={clientId}
            position={nextPosition}
            fromIdea={fromIdea}
            onDone={done}
          />
        ) : null
      }
      empty="No scripts yet."
      groups={groups.map((g) => ({ key: g.status, title: g.title, items: g.items }))}
      itemKey={(s) => s.id}
      renderItem={(script) => (
        <TeamScript clientId={clientId} script={script} nextPosition={nextPosition} />
      )}
    />
  );
}

function TeamScript({
  clientId,
  script,
  nextPosition,
}: {
  clientId: string;
  script: Script;
  nextPosition: number;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete" | "changes" | "clean">("idle");
  const production = useApprovedProduction(clientId, script.projectId);
  const choices = useTeamShootChoices(clientId, script.projectId);
  const setShoot = useSetScriptShoot(clientId);
  const status = useSetScriptStatus();
  const save = useSaveScript(clientId);
  const remove = useDeleteScript();
  const note = useTeamScriptNote(clientId);
  const [error, setError] = useState("");

  const run = (action: Promise<unknown>) =>
    action.then(
      () => setMode("idle"),
      (e: unknown) => setError(friendlyError(e)),
    );

  if (mode === "edit")
    return <ScriptForm clientId={clientId} script={script} onDone={() => setMode("idle")} />;

  return (
    <ScriptView
      script={script}
      reader="team"
      picked={script.hook}
      onComment={(line, body) => note.mutateAsync({ scriptId: script.id, line, body })}
      aside={
        <>
          <LiveShootPanel
            choices={choices}
            plan={script.shoot ?? {}}
            onSave={(shoot) => setShoot.mutateAsync({ id: script.id, shoot })}
            empty="Add talent, sets and props in Production, then pick them here."
          />
          <TeamPicks
            clientId={clientId}
            kind="script"
            id={script.id}
            shoot={script.shoot as Record<string, unknown> | undefined}
          />
        </>
      }
    >
      {mode === "clean" && (
        <CleanCopy script={script} options={production.named} onClose={() => setMode("idle")} />
      )}
      {mode === "idle" && (
        <div className="concept-actions">
          {byClient(script) && script.status === "review" && (
            <>
              <Button
                disabled={status.isPending}
                onClick={() => void run(status.mutateAsync({ id: script.id, status: "approved" }))}
              >
                Approve version {script.version}
              </Button>
              <Button
                variant="secondary"
                disabled={status.isPending}
                onClick={() => setMode("changes")}
              >
                Ask for changes
              </Button>
            </>
          )}
          {script.status === "draft" && (
            <Button
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: script.id, status: "review" }))}
            >
              Share with the client
            </Button>
          )}
          {!byClient(script) && (script.status === "review" || script.status === "changes") && (
            <ApproveForClient
              clientId={clientId}
              kind="script"
              id={script.id}
              version={script.version}
              hooks={script.hooks.length}
            />
          )}
          <Button variant="secondary" onClick={() => setMode("edit")}>
            {byClient(script) && script.status !== "draft"
              ? "Rewrite it (Gecko's version goes to the client)"
              : script.status === "approved"
                ? "Edit (makes a new version)"
                : "Edit"}
          </Button>
          {script.status === "review" && !byClient(script) && (
            <Button
              variant="link"
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: script.id, status: "draft" }))}
            >
              Take back to draft
            </Button>
          )}
          <Button
            variant="link"
            disabled={save.isPending}
            onClick={() =>
              void run(
                save.mutateAsync({
                  id: null,
                  conceptId: script.conceptId,
                  title: `${script.title} (copy)`.slice(0, 160),
                  style: script.style,
                  seconds: script.seconds,
                  goal: script.goal,
                  hooks: script.hooks,
                  beats: script.beats,
                  cta: script.cta,
                  ...(script.treatment ? { treatment: script.treatment } : {}),
                  ...(script.shoot ? { shoot: script.shoot } : {}),
                  status: "draft",
                  position: nextPosition,
                }),
              )
            }
          >
            Duplicate
          </Button>
          <ShotListButton script={script} clientId={clientId} />
          <Button variant="link" onClick={() => setMode("clean")}>
            Clean copy
          </Button>
          <Button variant="link" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}
      {mode === "changes" && (
        <form
          className="concept-form"
          onSubmit={(event) => {
            event.preventDefault();
            const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
            if (!body) return setError("Tell the client what to change.");
            void run(
              note
                .mutateAsync({ scriptId: script.id, line: null, body })
                .then(() => status.mutateAsync({ id: script.id, status: "changes" })),
            );
          }}
        >
          <TextArea
            label="What should the client change?"
            name="body"
            rows={3}
            maxLength={4000}
            autoFocus
          />
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="submit" disabled={status.isPending || note.isPending}>
              Send to the client
            </Button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <div className="concept-form">
          <p className="small">
            Delete "{script.title}" with its versions and comments? The client won't see it any
            more.
          </p>
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Keep it
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => void run(remove.mutateAsync(script.id))}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </ScriptView>
  );
}

function ScriptForm({
  clientId,
  script,
  position,
  fromIdea,
  onDone,
}: {
  clientId: string;
  script?: Script;
  position?: number;
  /** Writing the script of an approved idea: it starts linked to it. */
  fromIdea?: string;
  onDone: () => void;
}) {
  const save = useSaveScript(clientId);
  const concepts = useConcepts(clientId);
  const { id: workspaceId } = useWorkspace();
  const space = useTeamShared(clientId);
  const brand = useBrand(workspaceId, clientId, space.data?.brandNotes.body);
  const proven = useProvenHooks({ workspaceId, clientId });
  const approved = (concepts.data ?? []).filter((c) => c.status === "approved");
  const startIdea = approved.find((c) => c.id === fromIdea);
  // Kept on this device while writing: closing the tab doesn't lose it.
  const keep = useDraft(
    `script.${clientId}.${script?.id ?? (fromIdea ? `idea-${fromIdea}` : "new")}`,
    () => ({
      draft: adDraft(script, "problem-fix", startIdea?.hook, script?.seconds ?? 30),
      title: script?.title ?? startIdea?.title ?? "",
      conceptId: script?.conceptId ?? startIdea?.id ?? fromIdea ?? "",
      seconds: script?.seconds ?? 30,
      // A script written from an idea starts with the idea's talent.
      shoot:
        script?.shoot ??
        startIdea?.shoot ??
        ((startIdea?.talent?.length ? { talent: startIdea.talent } : {}) as ShootPlan),
    }),
  );
  const { draft, title, conceptId, seconds, shoot } = keep.value;
  const setDraft = (next: AdDraft) => keep.setValue((v) => ({ ...v, draft: next }));
  const setTitle = (next: string) => keep.setValue((v) => ({ ...v, title: next }));
  const setConceptId = (next: string) => keep.setValue((v) => ({ ...v, conceptId: next }));
  const setSeconds = (next: number) => keep.setValue((v) => ({ ...v, seconds: next }));
  const setShoot = (next: ShootPlan) => keep.setValue((v) => ({ ...v, shoot: next }));
  const templates = useTemplates();
  const cinematic =
    templates.data?.[clientId] === "cinematic" ||
    TREATMENT_KEYS.some((k) => script?.treatment?.[k]);
  const [error, setError] = useState("");
  const shared = script && script.status !== "draft";
  const beats = draftBeats(draft);
  const idea = approved.find((c) => c.id === conceptId);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveKeys(formRef);
  const clientList = useClients();
  const clientBrand = clientList.data?.find((c) => c.id === clientId)?.brand ?? "";
  const choices = useTeamShootChoices(clientId, script?.projectId ?? null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    if (!title.trim()) return setError("Give the script a title.");
    try {
      await save.mutateAsync({
        id: script?.id ?? null,
        conceptId: conceptId || null,
        title: title.trim(),
        style: draft.style,
        seconds,
        goal: script?.goal ?? "",
        hooks: tidyLines(draft.hooks),
        beats,
        cta: draftCta(draft),
        shoot: tidyPlan(shoot),
        ...(cinematic
          ? {
              treatment: tidyTreatment(
                Object.fromEntries(
                  TREATMENT_KEYS.map((k) => [k, String(form.get(`t-${k}`) ?? "")]),
                ) as Treatment,
              ),
            }
          : {}),
        ...(script ? {} : { status: submitter?.value === "share" ? "review" : "draft", position }),
      });
      keep.clear();
      const sharing = !script && submitter?.value === "share";
      toast(
        sharing
          ? { text: "Shared with the client", detail: title.trim(), celebrate: true }
          : { text: script ? "Script saved" : "Draft saved", detail: title.trim() },
      );
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const tabs: WritingTab[] = [
    {
      key: "script",
      label: "Script",
      body: (
        <>
          <BrandDrawer sheet={brand.sheet} never={brand.never} />
          <AdParts
            draft={draft}
            onChange={setDraft}
            seconds={seconds}
            never={brand.never}
            proven={proven}
            hookNote="write 2 or 3, the client picks"
          />
        </>
      ),
    },
    ...(cinematic
      ? [
          {
            key: "treatment",
            label: "Treatment",
            body: (
              <fieldset className="fieldset">
                <legend>
                  Treatment: the film before the scenes. The client approves this with the rest.
                </legend>
                {TREATMENT_KEYS.map((k) => (
                  <TextArea
                    key={k}
                    label={treatmentLabel(k)}
                    name={`t-${k}`}
                    rows={2}
                    maxLength={2000}
                    defaultValue={script?.treatment?.[k]}
                  />
                ))}
              </fieldset>
            ),
          },
        ]
      : []),
    {
      key: "kit",
      label: "Creative kit",
      body: (
        <CreativeKit
          brand={clientBrand}
          onHook={(line) => {
            const kept = draft.hooks.filter((h) => !noWords([h]));
            if (kept.length >= 3)
              return toast({ text: "Three hooks already: remove one first", tone: "error" });
            setDraft({ ...draft, hooks: [...kept, { hear: line }] });
            toast({ text: "Hook added", detail: line });
          }}
          onBeat={(line) => {
            const empty = draft.body.findIndex((b) => noWords([b]));
            const body =
              empty >= 0
                ? draft.body.map((b, i) => (i === empty ? { ...b, see: line } : b))
                : [...draft.body, { see: line }];
            setDraft({ ...draft, body });
            toast({ text: "Beat added to the body", detail: line });
          }}
          onBeats={(lines) => {
            const kept = draft.body.filter((b) => !noWords([b]));
            setDraft({ ...draft, body: [...kept, ...lines.map((see) => ({ see }))] });
            toast({
              text: `${lines.length} beats laid out`,
              detail: "Write what we hear under each one",
            });
          }}
        />
      ),
    },
  ];

  return (
    <form ref={formRef} className="ws script-edit" onSubmit={onSubmit}>
      <div className="ws-bar">
        <div className="ws-where">
          <strong>{script ? "Script" : "New script"}</strong>
          <span>
            {script
              ? `Version ${script.version}${shared ? " · the client has seen it" : ""}`
              : "Kept on this device until you save"}
          </span>
        </div>
        <div className="ws-actions">
          <FocusToggle />
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
          {script ? (
            <Button type="submit" disabled={save.isPending} aria-keyshortcuts="Meta+S">
              {shared ? `Save as version ${script.version + 1}` : "Save"}
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                variant="secondary"
                value="draft"
                disabled={save.isPending}
                aria-keyshortcuts="Meta+S"
              >
                Save draft
              </Button>
              <Button
                type="submit"
                value="share"
                disabled={save.isPending}
                aria-keyshortcuts="Meta+Enter"
              >
                Share with the client
              </Button>
            </>
          )}
        </div>
      </div>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
      <div className="ws-grid">
        <div className="ws-main">
          <input
            className="ws-title"
            name="title"
            aria-label="Title"
            placeholder="Untitled script"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            autoFocus={!startIdea && !script}
            required
          />
          <div className="ws-meta">
            <Select
              label="Written from the idea"
              name="concept"
              value={conceptId}
              onChange={(e) => {
                setConceptId(e.target.value);
                const concept = approved.find((c) => c.id === e.target.value);
                if (concept && !title.trim()) setTitle(concept.title);
                if (concept?.hook && noWords(draft.hooks))
                  setDraft({ ...draft, hooks: [{ hear: concept.hook }, {}] });
                // The idea's plan comes along while this script has none of its own yet.
                if (concept?.shoot && planCount(shoot) === 0) setShoot(concept.shoot);
              }}
              options={[["", "No idea yet"], ...approved.map((c) => [c.id, c.title] as const)]}
            />
            <LengthPicker value={seconds} onChange={setSeconds} />
          </div>
          <WritingTabs tabs={tabs} />
          {error && <Notice tone="error">{error}</Notice>}
          <p className="ws-keys" aria-hidden="true">
            <kbd>⌘S</kbd> save{script ? "" : " · "}
            {!script && <kbd>⌘↵</kbd>}
            {!script && " share"} · <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>{tabs.length}</kbd> sections
          </p>
        </div>
        <div className="ws-rail">
          {idea && (
            <IdeaCard
              title={idea.title}
              hook={idea.hook}
              body={idea.body}
              onUseHook={
                noWords(draft.hooks)
                  ? () => setDraft({ ...draft, hooks: [{ hear: idea.hook ?? "" }, {}] })
                  : undefined
              }
            />
          )}
          <ShootPanel
            choices={choices}
            plan={shoot}
            onChange={setShoot}
            empty="Add talent, sets and props in Production, then pick them here."
            note={shared ? "Changing who, where or what never makes a new version." : undefined}
          />
        </div>
      </div>
    </form>
  );
}

/** Focus: the sidebar and everything around the script fade away until you press it again (or Esc). */
function FocusToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("focus-mode", on);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOn(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("focus-mode");
    };
  }, [on]);
  return (
    <Button variant="link" aria-pressed={on} onClick={() => setOn(!on)}>
      {on ? "Leave focus" : "Focus"}
    </Button>
  );
}
