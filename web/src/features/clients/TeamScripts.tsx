import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import {
  estimateSeconds,
  groupScripts,
  hookName,
  STYLE_LABEL,
  TEMPLATES,
  templateGuide,
  tidyLines,
  tidyTreatment,
  TREATMENT_KEYS,
  treatmentLabel,
  byClient,
  type Treatment,
  type Script,
  type ScriptLine,
  type ScriptStyle,
} from "@/features/scripts/model";
import { ScriptView } from "@/features/scripts/ScriptView";
import {
  useDeleteScript,
  useSaveScript,
  useScripts,
  useSetScriptStatus,
  useTeamScriptNote,
} from "@/features/scripts/scriptsApi";
import { friendlyError } from "@/lib/errors";
import { useConcepts } from "./clientsApi";
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
  const [mode, setMode] = useState<"idle" | "edit" | "delete" | "changes">("idle");
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
                  status: "draft",
                  position: nextPosition,
                }),
              )
            }
          >
            Duplicate
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

const blank = (n: number): ScriptLine[] => Array.from({ length: n }, () => ({}));
const isEmpty = (lines: ScriptLine[]) => tidyLines(lines).length === 0;

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
  const [style, setStyle] = useState<ScriptStyle>(script?.style ?? "problem-fix");
  const guide = templateGuide(style);
  const [hooks, setHooks] = useState<ScriptLine[]>(
    script?.hooks.length
      ? script.hooks
      : startIdea?.hook
        ? [{ hear: startIdea.hook }, {}]
        : blank(2),
  );
  const [lead, setLead] = useState<ScriptLine>(script?.beats.find((b) => b.part === "lead") ?? {});
  const [body, setBody] = useState<ScriptLine[]>(
    script?.beats.some((b) => b.part !== "lead")
      ? script.beats.filter((b) => b.part !== "lead")
      : blank(guide.body.length),
  );
  const [title, setTitle] = useState(script?.title ?? startIdea?.title ?? "");
  const [conceptId, setConceptId] = useState(script?.conceptId ?? startIdea?.id ?? "");
  const [seconds, setSeconds] = useState(script?.seconds ?? 30);
  const [cta, setCta] = useState(script?.cta ?? "");
  const templates = useTemplates();
  const cinematic =
    templates.data?.[clientId] === "cinematic" ||
    TREATMENT_KEYS.some((k) => script?.treatment?.[k]);
  const [error, setError] = useState("");
  const shared = script && script.status !== "draft";
  const beats = tidyLines([
    { ...lead, part: "lead" },
    ...body.map((b) => ({ ...b, part: "body" as const })),
  ]);
  const runs = estimateSeconds({ hooks: tidyLines(hooks), beats, cta });
  const idea = approved.find((c) => c.id === conceptId);

  // A new template sets how many body parts there are, as long as none has words in it yet.
  function pickTemplate(next: ScriptStyle) {
    setStyle(next);
    if (isEmpty(body)) setBody(blank(templateGuide(next).body.length));
  }

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
        style,
        seconds,
        goal: String(form.get("goal") ?? "").trim(),
        hooks: tidyLines(hooks),
        beats,
        cta: cta.trim(),
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
      <div className="row">
        <Select
          label="For the idea"
          name="concept"
          value={conceptId}
          onChange={(e) => {
            setConceptId(e.target.value);
            const concept = approved.find((c) => c.id === e.target.value);
            if (concept && !title.trim()) setTitle(concept.title);
            if (concept?.hook && isEmpty(hooks)) setHooks([{ hear: concept.hook }, {}]);
          }}
          options={[["", "No idea yet"], ...approved.map((c) => [c.id, c.title] as const)]}
        />
        <Select
          label="Template"
          name="style"
          value={style}
          onChange={(e) => pickTemplate(e.target.value as ScriptStyle)}
          options={[
            ...TEMPLATES.map((k) => [k, STYLE_LABEL[k]] as const),
            ...(TEMPLATES.includes(style) ? [] : [[style, STYLE_LABEL[style]] as const]),
          ]}
        />
      </div>
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
      <Field
        label="After watching, the viewer should…"
        name="goal"
        defaultValue={script?.goal}
        maxLength={300}
        placeholder="Order the starter kit on the site"
      />

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

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">1</span> Hook{" "}
          <span className="muted">· first 1–3 seconds · write 2 or 3, the client picks</span>
        </legend>
        <p className="part-hint">{guide.hook}</p>
        {hooks.map((hook, i) => (
          <LineEditor
            key={i}
            name={hookName(i)}
            line={hook}
            onChange={(next) => setHooks(hooks.map((h, j) => (j === i ? next : h)))}
            onRemove={
              hooks.length > 1 ? () => setHooks(hooks.filter((_, j) => j !== i)) : undefined
            }
          />
        ))}
        {hooks.length < 3 && (
          <Button variant="link" onClick={() => setHooks([...hooks, {}])}>
            Add a hook option
          </Button>
        )}
      </fieldset>

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">2</span> Lead{" "}
          <span className="muted">· the next line, sets it up</span>
        </legend>
        <LineEditor name="Lead" hint={guide.lead} line={lead} onChange={setLead} />
      </fieldset>

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">3</span> Body{" "}
          <span className="muted">· each part keeps them watching</span>
        </legend>
        {body.map((part, i) => (
          <LineEditor
            key={i}
            name={`Body ${i + 1}`}
            hint={guide.body[i]}
            line={part}
            onChange={(next) => setBody(body.map((b, j) => (j === i ? next : b)))}
            onRemove={body.length > 1 ? () => setBody(body.filter((_, j) => j !== i)) : undefined}
            onUp={
              i > 0
                ? () =>
                    setBody(
                      body.map((b, j) => (j === i - 1 ? body[i]! : j === i ? body[i - 1]! : b)),
                    )
                : undefined
            }
          />
        ))}
        {body.length < 8 && (
          <Button variant="link" onClick={() => setBody([...body, {}])}>
            Add a body part
          </Button>
        )}
      </fieldset>

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">4</span> CTA <span className="muted">· the last frame</span>
        </legend>
        <Field
          label="What the viewer does next"
          name="cta"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          maxLength={300}
          placeholder={guide.cta}
        />
      </fieldset>
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

function LineEditor({
  name,
  hint,
  line,
  onChange,
  onRemove,
  onUp,
}: {
  name: string;
  /** What this part is for, from the template. */
  hint?: string;
  line: ScriptLine;
  onChange: (line: ScriptLine) => void;
  onRemove?: () => void;
  onUp?: () => void;
}) {
  const set = (key: keyof ScriptLine) => (e: { target: { value: string } }) =>
    onChange({ ...line, [key]: e.target.value });
  return (
    <div className="line-edit">
      <div className="line-edit-head">
        <strong>{name}</strong>
        {hint && <span className="part-hint inline">{hint}</span>}
        {onUp && (
          <button type="button" className="line-comment" onClick={onUp}>
            Move up
          </button>
        )}
        {onRemove && (
          <button type="button" className="line-comment" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      <div className="line-edit-cols">
        <label>
          <span>We see</span>
          <textarea
            dir="auto"
            rows={2}
            maxLength={1000}
            value={line.see ?? ""}
            onChange={set("see")}
          />
        </label>
        <label>
          <span>We hear</span>
          <textarea
            dir="auto"
            rows={2}
            maxLength={1000}
            value={line.hear ?? ""}
            onChange={set("hear")}
          />
        </label>
        <label>
          <span>On screen</span>
          <textarea
            dir="auto"
            rows={2}
            maxLength={300}
            value={line.text ?? ""}
            onChange={set("text")}
          />
        </label>
      </div>
    </div>
  );
}
