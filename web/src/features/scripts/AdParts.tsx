import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { t } from "@/lib/i18n";
import { draftNever } from "./brand";
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

/** What a script is made of, the way an ad is built: Hook → Lead → Body 1, 2, 3 → CTA. */
export interface AdDraft {
  style: ScriptStyle;
  hooks: ScriptLine[];
  lead: ScriptLine;
  body: ScriptLine[];
  cta: string;
}

export const blankLines = (n: number): ScriptLine[] => Array.from({ length: n }, () => ({}));
export const noWords = (lines: ScriptLine[]) => tidyLines(lines).length === 0;

/** A draft from a saved script, or a fresh one from a template sized for the video's length. */
export function adDraft(
  script?: { style: ScriptStyle; hooks: ScriptLine[]; beats: ScriptLine[]; cta: string },
  style: ScriptStyle = "problem-fix",
  firstHook?: string,
  seconds = 30,
): AdDraft {
  const s = script?.style ?? style;
  const beats = script?.beats ?? [];
  return {
    style: s,
    hooks: script?.hooks.length
      ? script.hooks
      : firstHook
        ? [{ hear: firstHook }, {}]
        : blankLines(2),
    lead: beats.find((b) => b.part === "lead") ?? {},
    body: beats.some((b) => b.part !== "lead")
      ? beats.filter((b) => b.part !== "lead")
      : blankLines(bodyFor(template(s), seconds).length),
    cta: script?.cta ?? "",
  };
}

/** The scene lines to save: the lead first, then the body parts, each marked with its part. */
export const draftBeats = (d: AdDraft): ScriptLine[] =>
  tidyLines([{ ...d.lead, part: "lead" }, ...d.body.map((b) => ({ ...b, part: "body" as const }))]);

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
    if (noWords(body) && body.length !== hints.length) set({ body: blankLines(hints.length) });
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
  const [library, setLibrary] = useState(false);

  return (
    <>
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

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">2</span> Lead{" "}
          <span className="muted">
            · {times[1]} · {t("sets it up", "pose le sujet")}
          </span>
        </legend>
        <LineEditor
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

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">4</span> CTA{" "}
          <span className="muted">
            · {times[times.length - 1]} · {t("the last frame", "le dernier plan")}
          </span>
        </legend>
        <Field
          label={t("What the viewer does next", "Ce que le spectateur fait ensuite")}
          name="cta"
          value={draft.cta}
          onChange={(e) => set({ cta: e.target.value })}
          maxLength={300}
          placeholder={tpl.cta}
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
    </>
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
    cta: draft.cta,
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
            {t("Move up", "Monter")}
          </button>
        )}
        {onRemove && (
          <button type="button" className="line-comment" onClick={onRemove}>
            {t("Remove", "Retirer")}
          </button>
        )}
      </div>
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
