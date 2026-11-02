import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { noteAt, notesFor, timecode, type Cut, type CutNote } from "./model";
import { usePreviewUrl } from "./reviewApi";

/**
 * One cut on screen: the player with its notes laid on the timeline, the notes beside it, and the version picker.
 * The same screen serves both sides; what each side can do comes in through the props.
 */
export function CutScreen({
  cut,
  reader,
  onNote,
  onDone,
  decision,
}: {
  cut: Cut;
  reader: "client" | "team";
  onNote: (input: { at: number | null; body: string }) => Promise<unknown>;
  /** Team only: tick a note off once the next version handles it. */
  onDone?: (note: CutNote, done: boolean) => void;
  /** The client's approve / ask for changes, shown only on the latest version. */
  decision?: ReactNode;
}) {
  const [shown, setShown] = useState(cut.version);
  // A new version arriving moves the screen to it.
  useEffect(() => setShown(cut.version), [cut.version]);
  const version = cut.versions.find((v) => v.version === shown) ?? cut.versions.at(-1);
  const url = usePreviewUrl(version?.path);
  const video = useRef<HTMLVideoElement>(null);
  const [length, setLength] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // Ticks show at once; the list catches up when the save lands.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const notes = version ? notesFor(cut, version.version) : [];
  const total = length ?? (version?.seconds != null ? Number(version.seconds) : null);
  const onLatest = version?.version === cut.version;

  function seek(at: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = at;
    v.pause();
    setNow(at);
  }

  if (!version)
    return (
      <p className="muted">
        {t(
          "No preview yet. It shows here as soon as the first cut is uploaded.",
          "Pas encore d'aperçu. Il s'affiche ici dès que le premier montage est en ligne.",
        )}
      </p>
    );

  return (
    <div className="screening">
      <div className="screen-main">
        <div className="screen-frame" onContextMenu={(e) => e.preventDefault()}>
          {url.data ? (
            <video
              ref={video}
              key={version.path}
              src={url.data}
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onLoadedMetadata={(e) =>
                setLength(
                  Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : null,
                )
              }
              onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            />
          ) : (
            <p className="screen-wait">
              {url.isError
                ? friendlyError(url.error)
                : t("Loading the preview…", "Chargement de l'aperçu…")}
            </p>
          )}
          <span className="screen-mark" aria-hidden="true">
            Gecko · {t("preview", "aperçu")}
          </span>
        </div>
        {total != null && total > 0 && (
          <div
            className="screen-line"
            aria-label={t("Notes on the timeline", "Notes sur la ligne de temps")}
          >
            <span
              className="screen-now"
              style={{ left: `${Math.min(100, (now / total) * 100)}%` }}
            />
            {notes
              .filter((n) => noteAt(n) != null)
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`screen-pin${n.fromClient ? " client" : ""}${n.done ? " done" : ""}`}
                  style={{ left: `${Math.min(100, (noteAt(n)! / total) * 100)}%` }}
                  title={`${timecode(noteAt(n)!)} · ${n.body}`}
                  aria-label={`${timecode(noteAt(n)!)}: ${n.body}`}
                  onClick={() => seek(noteAt(n)!)}
                />
              ))}
          </div>
        )}
        <div className="screen-versions">
          {cut.versions.length > 1 && (
            <div className="screen-tabs" role="group" aria-label={t("Versions", "Versions")}>
              {cut.versions.map((v) => (
                <button
                  key={v.version}
                  type="button"
                  className={`screen-tab${v.version === version.version ? " active" : ""}`}
                  onClick={() => setShown(v.version)}
                >
                  V{v.version}
                  {v.version === cut.approvedVersion && " ✓"}
                </button>
              ))}
            </div>
          )}
          <p className="small muted">
            {t(`Version ${version.version}`, `Version ${version.version}`)} ·{" "}
            {shortDate(version.createdAt)}
            {version.whatChanged && <> · {version.whatChanged}</>}
          </p>
        </div>
        {!onLatest && (
          <Notice>
            {t(
              `You're looking at an older version. The latest is V${cut.version}.`,
              `Vous regardez une ancienne version. La dernière est la V${cut.version}.`,
            )}{" "}
            <Button variant="link" onClick={() => setShown(cut.version)}>
              {t("Open it", "L'ouvrir")}
            </Button>
          </Notice>
        )}
        {onLatest && decision}
      </div>

      <aside className="screen-notes">
        <h3>
          {t("Notes", "Notes")} <span className="count">{notes.length}</span>
        </h3>
        {onLatest && (
          <NoteForm now={now} hasVideo={Boolean(url.data)} onNote={onNote} video={video} />
        )}
        {notes.length === 0 ? (
          <p className="small muted">
            {reader === "client"
              ? t(
                  "Pause where something should change and write it down. Your note keeps the moment.",
                  "Mettez sur pause là où quelque chose doit changer et notez-le. Votre note garde le moment.",
                )
              : t("No notes on this version yet.", "Pas encore de notes sur cette version.")}
          </p>
        ) : (
          <ol className="screen-list">
            {notes.map((n) => (
              <li
                key={n.id}
                className={`screen-note${(ticked[n.id] ?? n.done) ? " done" : ""} kind-${n.kind}`}
              >
                <div className="screen-note-head">
                  {noteAt(n) != null ? (
                    <button type="button" className="timecode" onClick={() => seek(noteAt(n)!)}>
                      {timecode(noteAt(n)!)}
                    </button>
                  ) : (
                    <span className="timecode whole">
                      {n.kind === "approve"
                        ? t("Approved", "Validé")
                        : n.kind === "changes"
                          ? t("Changes", "Changements")
                          : t("Whole cut", "Tout le montage")}
                    </span>
                  )}
                  <strong dir="auto">
                    {n.fromClient ? n.authorName : `${n.authorName} · Gecko`}
                  </strong>
                  {onDone && n.fromClient && n.kind !== "approve" && (
                    <label className="note-done small">
                      <input
                        type="checkbox"
                        checked={ticked[n.id] ?? n.done}
                        onChange={(e) => {
                          const done = e.target.checked;
                          setTicked((all) => ({ ...all, [n.id]: done }));
                          onDone(n, done);
                        }}
                      />{" "}
                      Handled
                    </label>
                  )}
                </div>
                {n.body && (
                  <p dir="auto" className="screen-note-body">
                    {n.body}
                  </p>
                )}
                {reader === "client" && n.done && (
                  <p className="small muted">{t("Handled by Gecko", "Traité par Gecko")}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

function NoteForm({
  now,
  hasVideo,
  onNote,
  video,
}: {
  now: number;
  hasVideo: boolean;
  onNote: (input: { at: number | null; body: string }) => Promise<unknown>;
  video: React.RefObject<HTMLVideoElement | null>;
}) {
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [at, setAt] = useState<number | null>(null);

  // Writing pauses the film and keeps the moment, so the note lands where the viewer stopped.
  function onFocus() {
    video.current?.pause();
    setAt(video.current?.currentTime ?? now);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError(t("Write your note first.", "Écrivez d'abord votre note."));
    setError("");
    setSending(true);
    try {
      await onNote({ at: pinned && hasVideo ? (at ?? now) : null, body: body.trim() });
      setBody("");
      setAt(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  const moment = timecode(at ?? now);
  return (
    <form className="screen-form" onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor="cut-note">
        {t("Your note", "Votre note")}
      </label>
      <textarea
        id="cut-note"
        rows={3}
        maxLength={2000}
        value={body}
        placeholder={t("What should change here?", "Que faut-il changer ici ?")}
        onFocus={onFocus}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="screen-form-row">
        {hasVideo && (
          <label className="small">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />{" "}
            {t(`At ${moment}`, `À ${moment}`)}
          </label>
        )}
        <Button type="submit" disabled={sending}>
          {t("Add note", "Ajouter la note")}
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
