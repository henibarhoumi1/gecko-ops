import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import {
  changedParts,
  estimateSeconds,
  hookName,
  partLabel,
  lineLabel,
  scriptStatus,
  STYLE_LABEL,
  TREATMENT_KEYS,
  treatmentLabel,
  type Script,
  type ScriptLine,
  type ScriptNote,
} from "./model";
import { t } from "@/lib/i18n";
import { isCinematic, tw, words } from "@/lib/wording";

// The script's scene lines, so a comment can say "Body 2" rather than a number.
const BeatsContext = createContext<ScriptLine[]>([]);

/**
 * Two ways to read a script. Write reads like a page: the words people hear, with the picture as a
 * stage direction. Breakdown is the shooting table: see, hear and on-screen text, line by line.
 */
export type ScriptMode = "write" | "breakdown";
const ModeContext = createContext<ScriptMode>("breakdown");
const MODE_KEY = "gecko.scriptMode";

function savedMode(reader: "client" | "team"): ScriptMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "write" || v === "breakdown") return v;
  } catch {
    // Private mode or no storage: use the default.
  }
  return reader === "client" ? "write" : "breakdown";
}

export function useScriptMode(reader: "client" | "team") {
  const [mode, setMode] = useState<ScriptMode>(() => savedMode(reader));
  const choose = (next: ScriptMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Not kept: fine.
    }
  };
  return [mode, choose] as const;
}

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
  const [mode, setMode] = useScriptMode(reader);

  return (
    <BeatsContext.Provider value={script.beats}>
      <ModeContext.Provider value={mode}>
        <article
          id={`script-${script.id}`}
          className={`concept script concept-${script.status} mode-${mode}`}
        >
          <header className="concept-head">
            {!isCinematic() && !(script.writtenBy === "client" && script.style === "other") && (
              <span className="tag">{STYLE_LABEL[script.style]}</span>
            )}
            <span className={`status status-${script.status}`}>{scriptStatus(script, reader)}</span>
            {script.version > 1 && (
              <span className="small muted">
                {t("Version", "Version")} {script.version}
              </span>
            )}
          </header>
          <div className="script-title-row">
            <h3 dir="auto">{script.title}</h3>
            {!isCinematic() && (
              <div
                className="mode-switch"
                role="group"
                aria-label={t("How to read it", "Mode de lecture")}
              >
                {(["write", "breakdown"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {m === "write" ? t("Read", "Lecture") : t("Breakdown", "Découpage")}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isCinematic() && (
            <p className={`small script-runs${runs > script.seconds + 3 ? " over" : ""}`}>
              {t(
                `Runs about ${runs} s spoken · made for ${script.seconds} s`,
                `Environ ${runs} s à l'oral · prévu pour ${script.seconds} s`,
              )}
              {runs > script.seconds + 3 && reader === "team" && " · too long, trim it"}
            </p>
          )}

          {changed.size > 0 && (
            <p className="small script-changed-note">
              {reader === "client"
                ? t(
                    "Marked lines changed since the version you read before.",
                    "Les lignes marquées ont changé depuis la version que vous avez lue.",
                  )
                : "Marked lines changed since the version the client read before."}
            </p>
          )}

          {script.treatment && TREATMENT_KEYS.some((k) => script.treatment?.[k]) && (
            <dl className="treatment">
              {TREATMENT_KEYS.filter((k) => script.treatment?.[k]).map((k) => (
                <div key={k} className={changed.has(k) ? "changed" : ""}>
                  <dt>{treatmentLabel(k)}</dt>
                  <dd dir="auto">{script.treatment?.[k]}</dd>
                </div>
              ))}
            </dl>
          )}

          {script.goal && (
            <Line
              id="goal"
              changed={changed.has("goal")}
              notes={byLine("goal")}
              onComment={onComment}
            >
              <p className="script-goal" dir="auto">
                <strong>{words.goal()}</strong> {script.goal}
              </p>
            </Line>
          )}

          {script.hooks.length > 0 && (
            <section className="script-part">
              <h4>
                {script.hooks.length > 1
                  ? onPick
                    ? tw(
                        ["Pick the hook you like best", "Choisissez l'accroche que vous préférez"],
                        [
                          "Pick the opening you like best",
                          "Choisissez l'ouverture que vous préférez",
                        ],
                      )
                    : tw(
                        ["Hook options", "Accroches possibles"],
                        ["Opening options", "Ouvertures possibles"],
                      )
                  : tw(["The hook", "L'accroche"], ["The opening shot", "Le plan d'ouverture"])}
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
                          {script.hooks.length > 1 ? hookName(i) : words.hook()}
                          {isPicked && script.status === "approved" && t(" · picked", " · choisie")}
                        </span>
                      )}
                      <LineText line={hook} />
                    </Line>
                  );
                })}
              </div>
            </section>
          )}

          {/* Lead, then the body parts, in the order they play. */}
          {(["lead", "body"] as const).map((part) => {
            const rows = script.beats
              .map((beat, i) => ({ beat, i }))
              .filter(({ beat }) =>
                part === "lead" ? beat.part === "lead" : beat.part !== "lead",
              );
            if (rows.length === 0) return null;
            return (
              <section key={part} className="script-part">
                <h4>{part === "lead" ? t("Lead", "Mise en place") : t("Body", "Corps")}</h4>
                <ol className="beats">
                  {rows.map(({ beat, i }) => (
                    <li key={i}>
                      <Line
                        id={`beat-${i}`}
                        changed={changed.has(`beat-${i}`)}
                        notes={byLine(`beat-${i}`)}
                        onComment={onComment}
                        className="beat"
                      >
                        <span className="beat-n" aria-hidden="true">
                          {part === "lead" ? "L" : partLabel(script.beats, i).replace(/\D+/g, "")}
                        </span>
                        <LineText line={beat} />
                      </Line>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          {script.cta && (
            <Line id="cta" changed={changed.has("cta")} notes={byLine("cta")} onComment={onComment}>
              <p className="script-cta" dir="auto">
                <strong>{tw(["Ends on", "Finit sur"], ["Final frame", "Dernier plan"])}</strong>{" "}
                {script.cta}
              </p>
            </Line>
          )}

          <p className="small muted">
            {t("By", "Par")} {script.authorName || "Gecko"}
            {script.writtenBy === "client" && reader === "team" && " (client)"}
            {script.approvedAt &&
              t(
                ` · Approved by ${script.approvedBy ?? "the client"} on ${shortDate(script.approvedAt)}`,
                ` · Validé par ${script.approvedBy ?? "le client"} le ${shortDate(script.approvedAt)}`,
              )}
          </p>
          <Notes notes={general} />
          {children}
        </article>
      </ModeContext.Provider>
    </BeatsContext.Provider>
  );
}

function LineText({ line }: { line: ScriptLine }) {
  const mode = useContext(ModeContext);
  if (mode === "write")
    return (
      <div className="line-prose">
        {line.see && (
          <p className="see" dir="auto">
            {line.see}
          </p>
        )}
        {line.hear && (
          <p className="hear" dir="auto">
            {line.hear}
          </p>
        )}
        {line.text && (
          <p className="onscreen" dir="auto">
            <span className="visually-hidden">{t("On screen: ", "À l'écran : ")}</span>
            {line.text}
          </p>
        )}
      </div>
    );
  return (
    <dl className="line-text">
      {line.see && (
        <>
          <dt>{t("See", "On voit")}</dt>
          <dd dir="auto">{line.see}</dd>
        </>
      )}
      {line.hear && (
        <>
          <dt>{t("Hear", "On entend")}</dt>
          <dd dir="auto" className="hear">
            {line.hear}
          </dd>
        </>
      )}
      {line.text && (
        <>
          <dt>{t("On screen", "À l'écran")}</dt>
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
  const beats = useContext(BeatsContext);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onComment) return;
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body) return setError(t("Write a comment first.", "Écrivez d'abord un commentaire."));
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
      <div className="line-main">
        {changed && <span className="changed-tag">{t("Changed", "Modifié")}</span>}
        {children}
      </div>
      <div className="line-side">
        <Notes notes={notes} />
        {onComment && !open && (
          <button
            type="button"
            className="line-comment"
            aria-label={t(
              `Comment on ${lineLabel(id, beats)}`,
              `Commenter : ${lineLabel(id, beats)}`,
            )}
            onClick={() => setOpen(true)}
          >
            {t("Comment", "Commenter")}
          </button>
        )}
        {open && (
          <form className="concept-form" onSubmit={onSubmit}>
            <TextArea
              label={t(
                `Your comment on ${lineLabel(id, beats)}`,
                `Votre commentaire : ${lineLabel(id, beats)}`,
              )}
              name="body"
              rows={2}
              maxLength={4000}
              autoFocus
            />
            {error && <Notice tone="error">{error}</Notice>}
            <div className="actions">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                {t("Cancel", "Annuler")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("Send", "Envoyer")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const kindLabel = (kind: ScriptNote["kind"]) =>
  kind === "approve"
    ? t("Approved", "A validé")
    : kind === "changes"
      ? t("Asked for changes", "A demandé des changements")
      : "";

function Notes({ notes }: { notes: ScriptNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ol className="notes" aria-label={t("Comments", "Commentaires")}>
      {notes.map((note) => (
        <li
          key={note.id}
          className={`note note-${note.kind}${note.fromClient ? " from-client" : ""}`}
        >
          <p className="small">
            <strong>
              {note.authorName || (note.fromClient ? t("Client", "Client") : "Gecko")}
            </strong>
            {kindLabel(note.kind) && (
              <span className="note-kind">
                {kindLabel(note.kind)}
                {note.kind === "approve" &&
                  note.hook !== null &&
                  t(` with ${hookName(note.hook)}`, `, ${hookName(note.hook)}`)}
              </span>
            )}
            <span className="muted">
              {" "}
              · {shortDate(note.createdAt)}
              {note.kind !== "comment" ? ` · ${t("version", "version")} ${note.version}` : ""}
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
