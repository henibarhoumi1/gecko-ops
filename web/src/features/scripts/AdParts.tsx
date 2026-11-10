import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { t } from "@/lib/i18n";
import { draftNever } from "./brand";
import {
  adDraft,
  blankLines,
  draftBeats,
  draftCta,
  freeBeats,
  freeText,
  isFreeWrite,
  noWords,
  type AdDraft,
} from "./draft";

// The draft logic lives in ./draft (no React, testable); the editor's users import it from here too.
export { adDraft, blankLines, draftBeats, draftCta, freeBeats, freeText, isFreeWrite, noWords };
export type { AdDraft };
import { useScriptMode, type ScriptMode } from "./ScriptView";
import {
  estimateSeconds,
  hookName,
  STYLE_LABEL,
  tidyLines,
  type ScriptLine,
  type ScriptStyle,
} from "./model";
import {
  anyHooks,
  bodyFor,
  GOAL_LABEL,
  hookLibrary,
  partTimes,
  template,
  TEMPLATES,
} from "./templates";

/**
 * The template picker and the four parts of the ad, sized for the video's length, with hook ideas to
 * start from. Used by the team and by the client in the portal.
 */
export function AdParts({
  draft,
  onChange,
  hookNote,
  seconds,
  never = [],
  proven = [],
}: {
  draft: AdDraft;
  onChange: (next: AdDraft) => void;
  /** Who picks among the hook options, shown next to the Hook title. */
  hookNote: string;
  /** The video's length: it sets how many body parts there are and when each part plays. */
  seconds: number;
  /** Words the brand never uses: any line that has one gets flagged. */
  never?: readonly string[];
  /** Hooks that worked for this client, from Results: first in the library. */
  proven?: readonly string[];
}) {
  const tpl = template(draft.style);
  const hints = bodyFor(tpl, seconds);
  const set = (patch: Partial<AdDraft>) => onChange({ ...draft, ...patch });
  const { hooks, body } = draft;
  const times = partTimes(seconds, body.length);
  const [lo, hi] = tpl.best;
  const goals = GOAL_LABEL();

  // While the body parts are still empty, they follow the template and the length.
  useEffect(() => {
    if (draft.style !== "other" && noWords(body) && body.length !== hints.length)
      set({ body: blankLines(hints.length) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hints.length]);

  // A hook idea fills the first empty hook option, or adds one.
  const emptyHook = hooks.findIndex((h) => noWords([h]));
  function takeHook(line: string) {
    if (emptyHook >= 0)
      set({ hooks: hooks.map((h, j) => (j === emptyHook ? { ...h, hear: line } : h)) });
    else if (hooks.length < 3) set({ hooks: [...hooks, { hear: line }] });
  }
  const canAddHook = emptyHook >= 0 || hooks.length < 3;
  const hits = draftNever(draft, never);
  const free = isFreeWrite(draft);
  const [library, setLibrary] = useState(false);
  // Write on the page (the words big, the picture as a stage direction) or in the see / hear / on-screen table.
  const [mode, setMode] = useScriptMode("client");

  return (
    <div className={`ad-parts mode-${mode}`}>
      <div
        className="mode-switch ad-mode"
        role="group"
        aria-label={t("How to write", "Mode d'écriture")}
      >
        {(["write", "breakdown"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === "write" ? t("Page", "Page") : t("Breakdown", "Découpage")}
          </button>
        ))}
      </div>
      <Select
        label={t("Template", "Modèle")}
        name="style"
        value={draft.style}
        onChange={(e) => set({ style: e.target.value as ScriptStyle })}
        options={[
          ...TEMPLATES.map(
            (k) =>
              [
                k,
                k === "other" ? STYLE_LABEL[k] : `${goals[template(k).goal]} · ${STYLE_LABEL[k]}`,
              ] as const,
          ),
          ...(TEMPLATES.includes(draft.style)
            ? []
            : [[draft.style, STYLE_LABEL[draft.style]] as const]),
        ]}
      />
      {draft.style !== "other" && (
        <p className="small template-when">
          <strong>{tpl.when}</strong>{" "}
          {seconds < lo || seconds > hi ? (
            <span className="template-warn">
              {t(
                `Works best at ${lo}–${hi} s, this one is ${seconds} s.`,
                `Marche mieux entre ${lo} et ${hi} s, celle-ci fait ${seconds} s.`,
              )}
            </span>
          ) : (
            t(`Best at ${lo}–${hi} s.`, `Idéal entre ${lo} et ${hi} s.`)
          )}
        </p>
      )}

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">1</span> {t("Hook", "Accroche")}{" "}
          <span className="muted">
            · {times[0]} · {hookNote}
          </span>
        </legend>
        <p className="part-hint">{tpl.hook}</p>
        {canAddHook && (
          <div className="hook-ideas">
            <span className="small">{t("Start from:", "Partir de :")}</span>
            {[...tpl.hooks, ...anyHooks()].map((line) => (
              <button key={line} type="button" className="hook-idea" onClick={() => takeHook(line)}>
                {line}
              </button>
            ))}
            <button
              type="button"
              className="hook-idea more"
              aria-expanded={library}
              onClick={() => setLibrary((v) => !v)}
            >
              {library
                ? t("Fewer hooks", "Moins d'accroches")
                : t("Hook library", "Bibliothèque d'accroches")}
            </button>
          </div>
        )}
        {canAddHook && library && (
          <div className="hook-library">
            {[
              ...(proven.length
                ? [
                    {
                      name: t("Worked for this brand", "Ont marché pour la marque"),
                      hooks: [...proven],
                    },
                  ]
                : []),
              ...hookLibrary(),
            ].map((group) => (
              <div key={group.name} className="hook-group">
                <span className="small">{group.name}</span>
                {group.hooks.map((line) => (
                  <button
                    key={line}
                    type="button"
                    className="hook-idea"
                    onClick={() => takeHook(line)}
                  >
                    {line}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        {hooks.map((hook, i) => (
          <LineEditor
            mode={mode}
            key={i}
            name={hookName(i)}
            line={hook}
            onChange={(next) => set({ hooks: hooks.map((h, j) => (j === i ? next : h)) })}
            onRemove={
              hooks.length > 1 ? () => set({ hooks: hooks.filter((_, j) => j !== i) }) : undefined
            }
          />
        ))}
        {hooks.length < 3 && (
          <Button variant="link" onClick={() => set({ hooks: [...hooks, {}] })}>
            {t("Add a hook option", "Ajouter une accroche")}
          </Button>
        )}
      </fieldset>

      {free ? (
        <fieldset className="fieldset script-lines free-write">
          <legend>
            <span className="part-tag">2</span> {t("The script", "Le script")}{" "}
            <span className="muted">· {t("write freely", "écrivez librement")}</span>
          </legend>
          <FreeText value={freeText(draft)} onChange={(hear) => set({ body: [{ hear }] })} />
        </fieldset>
      ) : (
        <>
          <fieldset className="fieldset script-lines">
            <legend>
              <span className="part-tag">2</span> Lead{" "}
              <span className="muted">
                · {times[1]} · {t("sets it up", "pose le sujet")}
              </span>
            </legend>
            <LineEditor
              mode={mode}
              name="Lead"
              hint={tpl.lead}
              line={draft.lead}
              onChange={(lead) => set({ lead })}
            />
          </fieldset>

          <fieldset className="fieldset script-lines">
            <legend>
              <span className="part-tag">3</span> Body{" "}
              <span className="muted">
                · {t("each part keeps them watching", "chaque partie garde l'attention")}
              </span>
            </legend>
            {body.map((part, i) => (
              <LineEditor
                mode={mode}
                key={i}
                name={`Body ${i + 1} · ${times[2 + i]}`}
                hint={hints[i]}
                line={part}
                onChange={(next) => set({ body: body.map((b, j) => (j === i ? next : b)) })}
                onRemove={
                  body.length > 1 ? () => set({ body: body.filter((_, j) => j !== i) }) : undefined
                }
                onUp={
                  i > 0
                    ? () =>
                        set({
                          body: body.map((b, j) =>
                            j === i - 1 ? body[i]! : j === i ? body[i - 1]! : b,
                          ),
                        })
                    : undefined
                }
              />
            ))}
            {body.length < 8 && (
              <Button variant="link" onClick={() => set({ body: [...body, {}] })}>
                {t("Add a body part", "Ajouter une partie")}
              </Button>
            )}
          </fieldset>
        </>
      )}

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">4</span> CTA{" "}
          <span className="muted">
            · {times[times.length - 1]} · {t("the last frame", "le dernier plan")}
          </span>
        </legend>
        <LineEditor
          mode={mode}
          name={t("What the viewer does next", "Ce que le spectateur fait ensuite")}
          hint={tpl.cta}
          line={draft.cta}
          onChange={(cta) => set({ cta })}
        />
      </fieldset>

      <ReadMeter draft={draft} seconds={seconds} />
      {hits.length > 0 && (
        <div className="never-hits" role="status">
          <strong>
            {t("Words the brand never uses", "Des mots que la marque n'utilise jamais")}
          </strong>
          <ul>
            {hits.map((h) => (
              <li key={`${h.where}-${h.term}`}>
                “{h.term}” · {h.where}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * How long the script reads out loud, live while typing, with the first hook. The bar fills up to
 * the video's length and turns red past it.
 */
export function ReadMeter({ draft, seconds }: { draft: AdDraft; seconds: number }) {
  const runs = estimateSeconds({
    hooks: tidyLines(draft.hooks),
    beats: draftBeats(draft),
    cta: draftCta(draft),
  });
  const over = runs > seconds + 3;
  const fill = Math.min(100, Math.round((runs / Math.max(1, seconds)) * 100));
  return (
    <div className={`read-meter${over ? " over" : ""}`} aria-live="polite">
      <div className="read-meter-bar">
        <span style={{ width: `${fill}%` }} />
      </div>
      <p className="small">
        {t(
          `Reads in about ${runs} s with the first hook · made for ${seconds} s`,
          `Se lit en environ ${runs} s avec la première accroche · prévu pour ${seconds} s`,
        )}
        {over &&
          ` · ${t(`${runs - seconds} s too long, trim it`, `${runs - seconds} s de trop, coupez`)}`}
      </p>
    </div>
  );
}

function LineEditor({
  mode,
  name,
  hint,
  line,
  onChange,
  onRemove,
  onUp,
}: {
  mode: ScriptMode;
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
  const head = (
    <div className="line-edit-head">
      <strong>{name}</strong>
      {hint && <span className="part-hint inline">{hint}</span>}
      {onUp && (
        <button type="button" className="line-comment" onClick={onUp}>
          {t("Move up", "Monter")}
        </button>
      )}
      {onRemove && (
        <button type="button" className="line-comment" onClick={onRemove}>
          {t("Remove", "Retirer")}
        </button>
      )}
    </div>
  );
  if (mode === "write")
    return (
      <div className="line-edit line-page">
        {head}
        <AutoText
          className="page-see"
          value={line.see ?? ""}
          onChange={set("see")}
          maxLength={1000}
          placeholder={t("(what we see)", "(ce qu'on voit)")}
          label={t("We see", "On voit")}
        />
        <AutoText
          className="page-hear"
          value={line.hear ?? ""}
          onChange={set("hear")}
          maxLength={1000}
          placeholder={hint || t("What we hear…", "Ce qu'on entend…")}
          label={t("We hear", "On entend")}
        />
        <AutoText
          className="page-onscreen"
          value={line.text ?? ""}
          onChange={set("text")}
          maxLength={300}
          placeholder={t("On screen", "À l'écran")}
          label={t("On screen", "À l'écran")}
        />
      </div>
    );
  return (
    <div className="line-edit">
      {head}
      <div className="line-edit-cols">
        <label>
          <span>{t("We see", "On voit")}</span>
          <textarea
            dir="auto"
            rows={2}
            maxLength={1000}
            value={line.see ?? ""}
            onChange={set("see")}
          />
        </label>
        <label>
          <span>{t("We hear", "On entend")}</span>
          <textarea
            dir="auto"
            rows={2}
            maxLength={1000}
            value={line.hear ?? ""}
            onChange={set("hear")}
          />
        </label>
        <label>
          <span>{t("On screen", "À l'écran")}</span>
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

/** A text box with no frame that grows with what's typed, for writing on the page. */
function AutoText({
  value,
  onChange,
  className,
  placeholder,
  maxLength,
  label,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className: string;
  placeholder: string;
  maxLength: number;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={`page-text ${className}`}
      dir="auto"
      rows={1}
      aria-label={label}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      placeholder={placeholder}
    />
  );
}

/** The free page of a Blank script: no boxes, room to write, grows with the text. */
function FreeText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 360)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="free-text"
      dir="auto"
      aria-label={t("The script", "Le script")}
      value={value}
      maxLength={20000}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t(
        "Write it the way you hear it. What happens, what's said, in your own words…",
        "Écrivez-le comme vous l'entendez. Ce qui se passe, ce qui se dit, avec vos mots…",
      )}
    />
  );
}
