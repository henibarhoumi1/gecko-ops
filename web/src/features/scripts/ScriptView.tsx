import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import {
  changedParts,
  estimateSeconds,
  hookName,
  lineLabel,
  SCRIPT_STATUS,
  STYLE_LABEL,
  type Script,
  type ScriptLine,
  type ScriptNote,
} from "./model";

type CommentFn = (line: string | null, body: string) => Promise<unknown>;

/**
 * A script the way it will be filmed: the hook options, then the beats (what we see, what we hear, the words on
 * screen), then the call to action. Lines that changed since the client's last version are marked, and
 * comments sit under the line they are about.
 */
export function ScriptView({
  script,
  reader,
  picked,
  onPick,
  onComment,
  children,
}: {
  script: Script;
  reader: "client" | "team";
  /** The hook shown as chosen: the client's pick while deciding, or the approved one. */
  picked: number | null;
  onPick?: (hook: number) => void;
  onComment?: CommentFn;
  children?: ReactNode;
}) {
  const changed = changedParts(script, script.previous);
  const runs = estimateSeconds(script, picked ?? 0);
  const byLine = (line: string) => script.notes.filter((n) => n.line === line);
  const general = script.notes.filter((n) => n.line === null);

  return (
    <article className={`concept script concept-${script.status}`}>
      <header className="concept-head">
        <span className="tag">{STYLE_LABEL[script.style]}</span>
        <span className={`status status-${script.status}`}>
          {SCRIPT_STATUS[reader][script.status]}
        </span>
        {script.version > 1 && <span className="small muted">Version {script.version}</span>}
      </header>
      <h3 dir="auto">{script.title}</h3>
      <p className={`small script-runs${runs > script.seconds + 3 ? " over" : ""}`}>
        Runs about {runs} s spoken · made for {script.seconds} s
        {runs > script.seconds + 3 && reader === "team" && " · too long, trim it"}
      </p>

      {changed.size > 0 && (
        <p className="small script-changed-note">
          Marked lines changed since the version {reader === "client" ? "you" : "the client"} read
          before.
        </p>
      )}

      {script.goal && (
        <Line id="goal" changed={changed.has("goal")} notes={byLine("goal")} onComment={onComment}>
          <p className="script-goal" dir="auto">
            <strong>The viewer should</strong> {script.goal}
          </p>
        </Line>
      )}

      {script.hooks.length > 0 && (
        <section className="script-part">
          <h4>
            {script.hooks.length > 1
              ? onPick
                ? "Pick the hook you like best"
                : "Hook options"
              : "The hook"}
          </h4>
          <div className="hooks" role={onPick ? "radiogroup" : undefined}>
            {script.hooks.map((hook, i) => {
              const id = `hook-${i}`;
              const isPicked = picked === i;
              return (
                <Line
                  key={id}
                  id={id}
                  changed={changed.has(id)}
                  notes={byLine(id)}
                  onComment={onComment}
                  className={`hook${isPicked ? " picked" : ""}${
                    picked !== null && !isPicked && !onPick ? " not-picked" : ""
                  }`}
                >
                  {onPick && script.hooks.length > 1 ? (
                    <label className="hook-pick">
                      <input
                        type="radio"
                        name={`hook-${script.id}`}
                        checked={isPicked}
                        onChange={() => onPick(i)}
                      />
                      <span className="hook-name">{hookName(i)}</span>
                    </label>
                  ) : (
                    <span className="hook-name">
                      {script.hooks.length > 1 ? hookName(i) : "Hook"}
                      {isPicked && script.status === "approved" && " · picked"}
                    </span>
                  )}
                  <LineText line={hook} />
                </Line>
              );
            })}
          </div>
        </section>
      )}

      {script.beats.length > 0 && (
        <section className="script-part">
          <h4>Then</h4>
          <ol className="beats">
            {script.beats.map((beat, i) => (
              <li key={i}>
                <Line
                  id={`beat-${i}`}
                  changed={changed.has(`beat-${i}`)}
                  notes={byLine(`beat-${i}`)}
                  onComment={onComment}
                  className="beat"
                >
                  <span className="beat-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <LineText line={beat} />
                </Line>
              </li>
            ))}
          </ol>
        </section>
      )}

      {script.cta && (
        <Line id="cta" changed={changed.has("cta")} notes={byLine("cta")} onComment={onComment}>
          <p className="script-cta" dir="auto">
            <strong>Ends on</strong> {script.cta}
          </p>
        </Line>
      )}

      <p className="small muted">
        By {script.authorName || "Gecko"}
        {script.approvedAt &&
          ` · Approved by ${script.approvedBy ?? "the client"} on ${shortDate(script.approvedAt)}`}
      </p>
      <Notes notes={general} />
      {children}
    </article>
  );
}

function LineText({ line }: { line: ScriptLine }) {
  return (
    <dl className="line-text">
      {line.see && (
        <>
          <dt>See</dt>
          <dd dir="auto">{line.see}</dd>
        </>
      )}
      {line.hear && (
        <>
          <dt>Hear</dt>
          <dd dir="auto" className="hear">
            {line.hear}
          </dd>
        </>
      )}
      {line.text && (
        <>
          <dt>On screen</dt>
          <dd dir="auto" className="onscreen">
            {line.text}
          </dd>
        </>
      )}
    </dl>
  );
}

/** One commentable part of the script, with its notes and its own small comment form. */
function Line({
  id,
  changed,
  notes,
  onComment,
  className = "",
  children,
}: {
  id: string;
  changed: boolean;
  notes: ScriptNote[];
  onComment?: CommentFn;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onComment) return;
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body) return setError("Write a comment first.");
    setBusy(true);
    setError("");
    try {
      await onComment(id, body);
      setOpen(false);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`script-line ${className}${changed ? " changed" : ""}`}>
      {changed && <span className="changed-tag">Changed</span>}
      {children}
      <Notes notes={notes} />
      {onComment && !open && (
        <button
          type="button"
          className="line-comment"
          aria-label={`Comment on ${lineLabel(id)}`}
          onClick={() => setOpen(true)}
        >
          Comment
        </button>
      )}
      {open && (
        <form className="concept-form" onSubmit={onSubmit}>
          <TextArea
            label={`Your comment on ${lineLabel(id)}`}
            name="body"
            rows={2}
            maxLength={4000}
            autoFocus
          />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="actions">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const KIND_LABEL: Record<ScriptNote["kind"], string> = {
  comment: "",
  approve: "Approved",
  changes: "Asked for changes",
};

function Notes({ notes }: { notes: ScriptNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ol className="notes" aria-label="Comments">
      {notes.map((note) => (
        <li
          key={note.id}
          className={`note note-${note.kind}${note.fromClient ? " from-client" : ""}`}
        >
          <p className="small">
            <strong>{note.authorName || (note.fromClient ? "Client" : "Gecko")}</strong>
            {KIND_LABEL[note.kind] && (
              <span className="note-kind">
                {KIND_LABEL[note.kind]}
                {note.kind === "approve" && note.hook !== null && ` with ${hookName(note.hook)}`}
              </span>
            )}
            <span className="muted">
              {" "}
              · {shortDate(note.createdAt)}
              {note.kind !== "comment" ? ` · version ${note.version}` : ""}
            </span>
          </p>
          {note.body && (
            <p className="note-body" dir="auto">
              {note.body}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
