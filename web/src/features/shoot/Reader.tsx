import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { t } from "@/lib/i18n";
import {
  changeLine,
  lineLabel,
  readerLines,
  readSeconds,
  toggleLine,
  type ReaderLine,
  type ShootReel,
} from "./model";
import type { ReelChanges } from "./shootApi";

/** Keeps the phone's screen on while the reader is open, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<Lock> };
    };
    let lock: Lock | null = null;
    let gone = false;
    const take = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          lock = await nav.wakeLock.request("screen");
          if (gone) void lock.release();
        }
      } catch {
        // Not allowed here (low battery, old browser): the screen may sleep.
      }
    };
    void take();
    document.addEventListener("visibilitychange", take);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", take);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

/** The number of each body line among body lines only, for "Line 3". */
function beatNumbers(lines: readonly ReaderLine[]): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const l of lines) if (l.kind === "beat") numbers.set(l.key, ++n);
  return numbers;
}

const SPEEDS = [
  { id: "slow", px: 22, label: () => t("Slow", "Lent") },
  { id: "normal", px: 38, label: () => t("Normal", "Normal") },
  { id: "fast", px: 60, label: () => t("Fast", "Rapide") },
] as const;

/**
 * Reading lines to the talent on set: one line at a time in very large type, the next one underneath.
 * Tap or press space for the next line. Hook options come first so each one gets shot.
 */
export function Reader({
  reel,
  canTick,
  hasNext,
  onUpdate,
  onNextReel,
  onClose,
}: {
  reel: ShootReel;
  canTick: boolean;
  hasNext: boolean;
  onUpdate: (changes: ReelChanges) => void;
  onNextReel: () => void;
  onClose: () => void;
}) {
  useWakeLock();
  const lines = useMemo(() => readerLines(reel), [reel]);
  const numbers = useMemo(() => beatNumbers(lines), [lines]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"read" | "prompt">("read");
  const [editing, setEditing] = useState<string | null>(null);
  const end = index >= lines.length;
  const line = lines[index];
  const next = lines[index + 1];

  const go = (to: number) => {
    setEditing(null);
    setIndex(Math.max(0, Math.min(lines.length, to)));
  };

  const markLine = (key: string, on: boolean) => {
    if (!canTick) return;
    const changes: ReelChanges = { linesDone: toggleLine(reel.linesDone, key, on) };
    if (on && reel.status === "todo") changes.status = "shooting";
    onUpdate(changes);
  };

  // Keyboard on a laptop or a Bluetooth remote: space or → for next, ← for back, Esc to close.
  const keys = useRef({ index, go, onClose, editing, mode });
  keys.current = { index, go, onClose, editing, mode };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (k.editing) return;
      if (e.key === "Escape") return k.onClose();
      if (k.mode !== "read") return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        k.go(k.index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        k.go(k.index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = (l: ReaderLine) => lineLabel(l, numbers.get(l.key) ?? 0);

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={reel.title}>
      <header className="reader-bar">
        <div className="reader-title">
          <strong dir="auto">{reel.title}</strong>
          <span className="small">
            {lines.length
              ? `${Math.min(index + 1, lines.length)} / ${lines.length} · ~${readSeconds(lines)} s`
              : ""}
          </span>
        </div>
        <div className="reader-tools">
          <button
            type="button"
            className="reader-chip"
            aria-pressed={mode === "prompt"}
            onClick={() => setMode(mode === "read" ? "prompt" : "read")}
          >
            {mode === "read" ? t("Prompter", "Prompteur") : t("Line by line", "Ligne par ligne")}
          </button>
          <button type="button" className="reader-chip" onClick={onClose}>
            {t("Close", "Fermer")}
          </button>
        </div>
      </header>

      {lines.length === 0 ? (
        <div className="reader-stage">
          <p className="reader-words small-words">
            {reel.shared
              ? t("This script has no lines yet.", "Ce script n'a pas encore de texte.")
              : t(
                  "Gecko hasn't sent this script to you yet.",
                  "Gecko ne vous a pas encore envoyé ce script.",
                )}
          </p>
        </div>
      ) : mode === "prompt" ? (
        <Prompter lines={lines} label={label} />
      ) : end ? (
        <div className="reader-stage">
          <p className="reader-words small-words">{t("All lines read.", "Tout est lu.")}</p>
          <div className="reader-end">
            {canTick && reel.status !== "done" && (
              <Button onClick={() => onUpdate({ status: "done" })}>
                {t("Mark the reel done", "Marquer la vidéo faite")}
              </Button>
            )}
            {hasNext && (
              <Button variant="secondary" onClick={onNextReel}>
                {t("Next reel", "Vidéo suivante")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => go(0)}>
              {t("From the top", "Depuis le début")}
            </Button>
          </div>
        </div>
      ) : (
        line && (
          <>
            <button
              type="button"
              className="reader-stage reader-tap"
              onClick={() => go(index + 1)}
              aria-label={t("Next line", "Ligne suivante")}
            >
              <span className={`reader-label kind-${line.kind}`}>
                {label(line)}
                {line.chosen && <span className="reader-chosen">{t("chosen", "choisie")}</span>}
                {reel.linesDone.includes(line.key) && (
                  <span className="reader-got">{t("got it", "dans la boîte")}</span>
                )}
              </span>
              {line.see && (
                <span className="reader-see" dir="auto">
                  {line.see}
                </span>
              )}
              <span className="reader-words" dir="auto">
                {line.words || "…"}
              </span>
              {line.written && (
                <span className="reader-written" dir="auto">
                  {t("Written:", "Écrit :")} {line.written}
                </span>
              )}
              {line.onScreen && (
                <span className="reader-onscreen" dir="auto">
                  {t("On screen:", "À l'écran :")} {line.onScreen}
                </span>
              )}
              {next && (
                <span className="reader-next" dir="auto">
                  <span className="small">{label(next)}</span> {next.words || next.see}
                </span>
              )}
            </button>

            {editing === line.key ? (
              <EditLine
                line={line}
                onCancel={() => setEditing(null)}
                onSave={(words) => {
                  onUpdate({
                    lineChanges: changeLine(
                      reel.lineChanges,
                      line.key,
                      words,
                      line.written ?? line.words,
                    ),
                  });
                  setEditing(null);
                }}
              />
            ) : (
              <footer className="reader-controls">
                <button
                  type="button"
                  className="reader-btn"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                >
                  ← {t("Back", "Retour")}
                </button>
                {canTick && (
                  <button type="button" className="reader-btn" onClick={() => setEditing(line.key)}>
                    {t("Said differently", "Dit autrement")}
                  </button>
                )}
                {canTick && (
                  <button
                    type="button"
                    className="reader-btn"
                    onClick={() => markLine(line.key, false)}
                  >
                    {t("Again", "Encore")}
                  </button>
                )}
                <button
                  type="button"
                  className="reader-btn reader-btn-main"
                  onClick={() => {
                    markLine(line.key, true);
                    go(index + 1);
                  }}
                >
                  {canTick ? t("Got it →", "Dans la boîte →") : t("Next →", "Suivant →")}
                </button>
              </footer>
            )}
          </>
        )
      )}
    </div>
  );
}

function EditLine({
  line,
  onSave,
  onCancel,
}: {
  line: ReaderLine;
  onSave: (words: string) => void;
  onCancel: () => void;
}) {
  const [words, setWords] = useState(line.words);
  return (
    <form
      className="reader-edit"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(words);
      }}
    >
      <label className="small" htmlFor="reader-edit-words">
        {t(
          "The words as said on set. The script itself doesn't change; the editor gets this note.",
          "Le texte tel que dit sur le plateau. Le script ne change pas ; le monteur reçoit cette note.",
        )}
      </label>
      <textarea
        id="reader-edit-words"
        value={words}
        onChange={(e) => setWords(e.target.value)}
        maxLength={600}
        rows={3}
        dir="auto"
        autoFocus
      />
      <div className="reader-end">
        <Button type="submit">{t("Keep these words", "Garder ce texte")}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("Cancel", "Annuler")}
        </Button>
      </div>
    </form>
  );
}

/** Every line scrolling up at a steady pace, for talent reading for themselves. */
function Prompter({ lines, label }: { lines: ReaderLine[]; label: (l: ReaderLine) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]["id"]>("normal");

  useEffect(() => {
    if (!playing) return;
    const px = SPEEDS.find((s) => s.id === speed)?.px ?? 38;
    let last = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const el = box.current;
      if (el) {
        el.scrollTop += (px * (now - last)) / 1000;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false);
      }
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  return (
    <>
      <div className="prompter" ref={box}>
        <div className="prompter-pad" />
        {lines.map((l) => (
          <p key={l.key} className="prompter-line" dir="auto">
            <span className={`reader-label kind-${l.kind}`}>{label(l)}</span>
            {l.words || l.see}
          </p>
        ))}
        <div className="prompter-pad" />
      </div>
      <footer className="reader-controls">
        <button
          type="button"
          className="reader-btn"
          onClick={() => {
            if (box.current) box.current.scrollTop = 0;
          }}
        >
          {t("Top", "Début")}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="reader-btn"
            aria-pressed={speed === s.id}
            onClick={() => setSpeed(s.id)}
          >
            {s.label()}
          </button>
        ))}
        <button
          type="button"
          className="reader-btn reader-btn-main"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? t("Pause", "Pause") : t("Play", "Lecture")}
        </button>
      </footer>
    </>
  );
}
