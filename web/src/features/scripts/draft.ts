import { bodyFor, template } from "./templates";
import { ctaLine, ctaString, tidyLines, type ScriptLine, type ScriptStyle } from "./model";

/** The editor's draft of a script, and how it turns into what's saved. No React here, so it's testable. */

/** What a script is made of, the way an ad is built: Hook → Lead → Body 1, 2, 3 → CTA. */
export interface AdDraft {
  style: ScriptStyle;
  hooks: ScriptLine[];
  lead: ScriptLine;
  body: ScriptLine[];
  /** What we see, hear and read on the last frame. */
  cta: ScriptLine;
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
  // Blank: one hook, one free page, the call to action.
  const blank = s === "other";
  return {
    style: s,
    hooks: script?.hooks.length
      ? script.hooks
      : firstHook
        ? [{ hear: firstHook }, ...(blank ? [] : [{}])]
        : blankLines(blank ? 1 : 2),
    lead: beats.find((b) => b.part === "lead") ?? {},
    body: beats.some((b) => b.part !== "lead")
      ? beats.filter((b) => b.part !== "lead")
      : blankLines(blank ? 1 : bodyFor(template(s), seconds).length),
    cta: ctaLine(script?.cta),
  };
}

/** The scene lines to save: the lead first, then the body parts, each marked with its part. */
/** The call to action as it's stored. */
export const draftCta = (d: AdDraft): string => ctaString(d.cta);

/**
 * Blank writes freely: one page of text instead of parts, while there's nothing that needs the parts
 * (a lead, several body parts, or what we see on screen).
 */
export const isFreeWrite = (d: AdDraft) =>
  d.style === "other" &&
  noWords([d.lead]) &&
  d.body.every((b) => !b.see?.trim() && !b.text?.trim());

/** The free page as one text: its paragraphs, one after the other. */
export const freeText = (d: AdDraft) =>
  d.body
    .map((b) => b.hear ?? "")
    .filter((x) => x.trim())
    .join("\n\n");

/** The free page saved as body parts: one per paragraph, long ones cut at a sentence under 1,000 characters. */
export function freeBeats(text: string): ScriptLine[] {
  const out: ScriptLine[] = [];
  for (const para of text.split(/\n\s*\n/)) {
    let rest = para.trim();
    while (rest.length > 1000) {
      const cut = Math.max(rest.lastIndexOf(". ", 1000), rest.lastIndexOf(" ", 1000));
      const at = cut > 200 ? cut + 1 : 1000;
      out.push({ hear: rest.slice(0, at).trim(), part: "body" });
      rest = rest.slice(at).trim();
    }
    if (rest) out.push({ hear: rest, part: "body" });
  }
  return out;
}

const partBeats = (d: AdDraft): ScriptLine[] =>
  tidyLines([{ ...d.lead, part: "lead" }, ...d.body.map((b) => ({ ...b, part: "body" as const }))]);

export const draftBeats = (d: AdDraft): ScriptLine[] =>
  isFreeWrite(d) ? freeBeats(freeText(d)) : partBeats(d);
