import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { t } from "@/lib/i18n";
import {
  hookName,
  STYLE_LABEL,
  TEMPLATES,
  templateGuide,
  tidyLines,
  type ScriptLine,
  type ScriptStyle,
} from "./model";

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

/** A draft from a saved script, or a fresh one from a template. */
export function adDraft(
  script?: { style: ScriptStyle; hooks: ScriptLine[]; beats: ScriptLine[]; cta: string },
  style: ScriptStyle = "problem-fix",
  firstHook?: string,
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
      : blankLines(templateGuide(s).body.length),
    cta: script?.cta ?? "",
  };
}

/** The scene lines to save: the lead first, then the body parts, each marked with its part. */
export const draftBeats = (d: AdDraft): ScriptLine[] =>
  tidyLines([{ ...d.lead, part: "lead" }, ...d.body.map((b) => ({ ...b, part: "body" as const }))]);

/** The template picker and the four parts of the ad. Used by the team and by the client in the portal. */
export function AdParts({
  draft,
  onChange,
  hookNote,
}: {
  draft: AdDraft;
  onChange: (next: AdDraft) => void;
  /** Who picks among the hook options, shown next to the Hook title. */
  hookNote: string;
}) {
  const guide = templateGuide(draft.style);
  const set = (patch: Partial<AdDraft>) => onChange({ ...draft, ...patch });
  const { hooks, body } = draft;

  // A new template sets how many body parts there are, as long as none has words in it yet.
  function pickTemplate(next: ScriptStyle) {
    set({
      style: next,
      ...(noWords(body) ? { body: blankLines(templateGuide(next).body.length) } : {}),
    });
  }

  return (
    <>
      <Select
        label={t("Template", "Modèle")}
        name="style"
        value={draft.style}
        onChange={(e) => pickTemplate(e.target.value as ScriptStyle)}
        options={[
          ...TEMPLATES.map((k) => [k, STYLE_LABEL[k]] as const),
          ...(TEMPLATES.includes(draft.style)
            ? []
            : [[draft.style, STYLE_LABEL[draft.style]] as const]),
        ]}
      />

      <fieldset className="fieldset script-lines">
        <legend>
          <span className="part-tag">1</span> {t("Hook", "Accroche")}{" "}
          <span className="muted">
            · {t("first 1–3 seconds", "les 1 à 3 premières secondes")} · {hookNote}
          </span>
        </legend>
        <p className="part-hint">{guide.hook}</p>
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
            · {t("the next line, sets it up", "la suite, qui pose le sujet")}
          </span>
        </legend>
        <LineEditor
          name="Lead"
          hint={guide.lead}
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
            name={`Body ${i + 1}`}
            hint={guide.body[i]}
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
          <span className="muted">· {t("the last frame", "le dernier plan")}</span>
        </legend>
        <Field
          label={t("What the viewer does next", "Ce que le spectateur fait ensuite")}
          name="cta"
          value={draft.cta}
          onChange={(e) => set({ cta: e.target.value })}
          maxLength={300}
          placeholder={guide.cta}
        />
      </fieldset>
    </>
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
