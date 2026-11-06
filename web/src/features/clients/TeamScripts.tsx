import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import {
  estimateSeconds,
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
import { AdParts, adDraft, draftBeats, noWords, type AdDraft } from "@/features/scripts/AdParts";
import {
  useDeleteScript,
  useSaveScript,
  useScripts,
  useSetScriptStatus,
  useTeamScriptNote,
} from "@/features/scripts/scriptsApi";
import { friendlyError } from "@/lib/errors";
import { useConcepts } from "./clientsApi";
import { CleanCopy, ShootPlanPicker, useApprovedProduction } from "./ShootPlan";
import { useTemplates } from "./lookApi";
import { TextArea } from "@/components/TextArea";
import { ApproveForClient } from "./ApproveForClient";

/** The team writes scripts, shares them, and works through the client's line comments. */
export function TeamScripts({ clientId }: { clientId: string }) {
  const scripts = useScripts(clientId);
  // ?idea=… comes from "Write the script" on an approved idea: the form opens linked to it.
  const [params, setParams] = useSearchParams();
  const fromIdea = params.get("idea") ?? undefined;
  const [adding, setAdding] = useState(Boolean(fromIdea));
  const done = () => {
    setAdding(false);
    if (fromIdea) setParams({}, { replace: true });
  };

  if (scripts.isPending) return <p className="muted">Loading scripts…</p>;
  if (scripts.isError) return <Notice tone="error">{friendlyError(scripts.error)}</Notice>;
  const groups = groupScripts(scripts.data, "team");
  const nextPosition = scripts.data.reduce((max, s) => Math.max(max, s.position + 1), 0);

  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          One script per reel, built Hook → Lead → Body → CTA. Pick the idea and a template; write
          two or three hooks so the client can pick. Once approved, a script is locked: editing it
          sends a new version back to the client.
        </p>
        {!adding && <Button onClick={() => setAdding(true)}>New script</Button>}
      </div>
      {adding && (
        <ScriptForm clientId={clientId} position={nextPosition} fromIdea={fromIdea} onDone={done} />
      )}
      {groups.length === 0 && !adding && <p className="muted">No scripts yet.</p>}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((script) => (
              <TeamScript
                key={script.id}
                clientId={clientId}
                script={script}
                nextPosition={nextPosition}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
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
  const production = useApprovedProduction(clientId);
  const plan = script.shoot ?? {};
  const optionName = (id: string | null | undefined) =>
    production.all.find((o) => o.id === id)?.name ?? "";
  const planParts = [
    ["Talent", (plan.talent ?? []).map(optionName).filter(Boolean).join(", ")],
    ["Set", optionName(plan.set)],
    [
      "Props",
      [...(plan.props ?? []).map(optionName), plan.extraProps?.trim() ?? ""]
        .filter(Boolean)
        .join(", "),
    ],
  ].filter(([, v]) => v);
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
    >
      {planParts.length > 0 && (
        <p className="small shoot-summary">
          {planParts.map(([k, v]) => (
            <span key={k}>
              <strong>{k}:</strong> {v}
            </span>
          ))}
        </p>
      )}
      {mode === "clean" && (
        <CleanCopy script={script} options={production.all} onClose={() => setMode("idle")} />
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
  const approved = (concepts.data ?? []).filter((c) => c.status === "approved");
  const startIdea = approved.find((c) => c.id === fromIdea);
  const [draft, setDraft] = useState<AdDraft>(() =>
    adDraft(script, "problem-fix", startIdea?.hook, script?.seconds ?? 30),
  );
  const [title, setTitle] = useState(script?.title ?? startIdea?.title ?? "");
  const [conceptId, setConceptId] = useState(script?.conceptId ?? startIdea?.id ?? "");
  const [seconds, setSeconds] = useState(script?.seconds ?? 30);
  const [shoot, setShoot] = useState<ShootPlan>(script?.shoot ?? {});
  const templates = useTemplates();
  const cinematic =
    templates.data?.[clientId] === "cinematic" ||
    TREATMENT_KEYS.some((k) => script?.treatment?.[k]);
  const [error, setError] = useState("");
  const shared = script && script.status !== "draft";
  const beats = draftBeats(draft);
  const runs = estimateSeconds({ hooks: tidyLines(draft.hooks), beats, cta: draft.cta });
  const idea = approved.find((c) => c.id === conceptId);

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
        cta: draft.cta.trim(),
        shoot: { ...shoot, extraProps: (shoot.extraProps ?? "").trim() },
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
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="card stack concept-edit script-edit" onSubmit={onSubmit}>
      <h3>{script ? `Edit "${script.title}"` : "New script"}</h3>
      <Select
        label="For the idea"
        name="concept"
        value={conceptId}
        onChange={(e) => {
          setConceptId(e.target.value);
          const concept = approved.find((c) => c.id === e.target.value);
          if (concept && !title.trim()) setTitle(concept.title);
          if (concept?.hook && noWords(draft.hooks))
            setDraft({ ...draft, hooks: [{ hear: concept.hook }, {}] });
        }}
        options={[["", "No idea yet"], ...approved.map((c) => [c.id, c.title] as const)]}
      />
      {idea && (
        <div className="script-idea">
          <p className="small">
            <strong>The idea</strong>
            {idea.format ? ` · ${idea.format}` : ""}
          </p>
          {idea.hook && <p className="script-idea-hook">&ldquo;{idea.hook}&rdquo;</p>}
          {idea.body && <p className="small">{idea.body}</p>}
        </div>
      )}
      <div className="row">
        <Field
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          autoFocus={!startIdea}
          required
        />
        <Field
          label="Length (seconds)"
          name="seconds"
          type="number"
          min={5}
          max={180}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value) || 30)}
        />
      </div>

      {cinematic && (
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
      )}

      <AdParts
        draft={draft}
        onChange={setDraft}
        seconds={seconds}
        hookNote="write 2 or 3, the client picks"
      />
      <ShootPlanPicker clientId={clientId} plan={shoot} onChange={setShoot} />
      <p className={`small script-runs${runs > seconds + 3 ? " over" : ""}`}>
        Runs about {runs} s spoken with the first hook · made for {seconds} s
        {runs > seconds + 3 && " · too long, trim it"}
      </p>
      {shared && (
        <p className="small muted">
          The client has seen this script. Saving a change makes version {script.version + 1}, and
          the client approves it again.
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        {script ? (
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        ) : (
          <>
            <Button type="submit" variant="secondary" value="draft" disabled={save.isPending}>
              Save as draft
            </Button>
            <Button type="submit" value="share" disabled={save.isPending}>
              Share with the client
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
