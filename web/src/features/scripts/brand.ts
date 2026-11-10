import { QUESTIONS, type Words } from "@/features/onboarding/questions";
import { t } from "@/lib/i18n";
import type { ScriptLine } from "./model";

/**
 * The brand sheet the writer keeps open next to a script: what the client told us in onboarding,
 * plus the shared brand notes. The "never say" answer becomes a list of words every line is checked
 * against.
 */
export interface BrandSheet {
  oneline: string;
  promise: string;
  feel: string[];
  tone: string[];
  languages: string[];
  reasons: string[];
  proof: string[];
  customer: string;
  must: string[];
  never: string;
  avoid: string;
  notes: string;
}

type Answers = Record<string, unknown>;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The words of a picked option, in the language in use. */
function optionWords(questionId: string, value: string): string {
  const q = QUESTIONS.find((x) => x.id === questionId);
  const opts = q && "opts" in q ? (q.opts as readonly Words[]) : [];
  const hit = opts.find((o) => o[0] === value);
  return hit ? t(hit[0], hit[1]) : value;
}

function picks(answers: Answers, id: string): string[] {
  const list = Array.isArray(answers[id]) ? (answers[id] as unknown[]) : [];
  const out = list.filter((v): v is string => typeof v === "string").map((v) => optionWords(id, v));
  const other = text(answers[`${id}.other`]);
  return other ? [...out, other] : out;
}

const SCALES: [string, Words, Words][] = [
  ["tone1", ["Playful", "Joueur"], ["Serious", "Sérieux"]],
  ["tone2", ["Loud", "Fort"], ["Calm", "Calme"]],
  ["tone3", ["Everyday", "Quotidien"], ["Luxury", "Luxe"]],
  ["tone4", ["Tunisian", "Tunisien"], ["International", "International"]],
];

/** A tone slider only says something when it leans clearly one way. */
function tone(answers: Answers): string[] {
  const out: string[] = [];
  for (const [id, left, right] of SCALES) {
    const raw = text(answers[id]);
    if (!raw) continue;
    const n = Number(raw);
    if (n <= 35) out.push(t(left[0], left[1]));
    else if (n >= 65) out.push(t(right[0], right[1]));
  }
  return out;
}

export function brandSheet(answers: Answers, notes = ""): BrandSheet {
  const reasons = Array.isArray(answers.reasons)
    ? (answers.reasons as Record<string, unknown>[]).map((r) => text(r?.reason)).filter(Boolean)
    : [];
  return {
    oneline: text(answers.oneline),
    promise: text(answers.promise),
    feel: picks(answers, "words"),
    tone: tone(answers),
    languages: picks(answers, "lang"),
    reasons,
    proof: picks(answers, "proof"),
    customer: text(answers.who),
    must: picks(answers, "must"),
    never: text(answers.never),
    avoid: text(answers.avoid),
    notes: notes.trim(),
  };
}

export const sheetIsEmpty = (s: BrandSheet) =>
  Object.values(s).every((v) => (Array.isArray(v) ? v.length === 0 : !v));

// A brand-notes line like "Never say: cheap, discount" or "À éviter : promo" adds its words to the list.
const NOTE_RULE =
  /^\s*[-•*]?\s*(never say|never|don't say|do not say|avoid|banned|ne jamais dire|jamais|à éviter|a eviter|éviter|eviter|interdit)\s*:\s*(.+)$/i;

/**
 * The words and short phrases to never use. Long sentences ("don't talk about our old shop") are
 * guidance, not words, so they stay in the sheet but are not matched line by line.
 */
export function neverTerms(never: string, notes = ""): string[] {
  const sources = [never];
  for (const line of notes.split("\n")) {
    const m = NOTE_RULE.exec(line);
    if (m) sources.push(m[2]!);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const source of sources) {
    for (const piece of source.split(/[,;\n/•|]+|\s+-\s+/)) {
      const term = piece
        .trim()
        .replace(/^["'«“‘(]+|["'»”’).!?]+$/g, "")
        .trim();
      const size = term.split(/\s+/).length;
      if (term.length < 3 || size > 3) continue;
      const key = fold(term);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
    }
  }
  return out;
}

/** Lower case, without accents, so "Promo" and "promò" match. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** The never-say words found in a piece of text, whole words only. */
export function findNever(textToCheck: string, terms: readonly string[]): string[] {
  if (!textToCheck.trim() || terms.length === 0) return [];
  const hay = fold(textToCheck);
  return terms.filter((term) => {
    const needle = fold(term)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${needle}($|[^\\p{L}\\p{N}])`, "u").test(hay);
  });
}

export interface NeverHit {
  /** Where it is: "Hook 1", "Lead", "Body 2", "CTA". */
  where: string;
  term: string;
}

const lineText = (l: ScriptLine) => [l.see, l.hear, l.text].filter(Boolean).join("\n");

/** Every never-say word in the draft, part by part. */
export function draftNever(
  draft: { hooks: ScriptLine[]; lead: ScriptLine; body: ScriptLine[]; cta: string },
  terms: readonly string[],
): NeverHit[] {
  if (terms.length === 0) return [];
  const parts: [string, string][] = [
    ...draft.hooks.map((h, i): [string, string] => [
      `${t("Hook", "Accroche")} ${i + 1}`,
      lineText(h),
    ]),
    ["Lead", lineText(draft.lead)],
    ...draft.body.map((b, i): [string, string] => [`Body ${i + 1}`, lineText(b)]),
    ["CTA", draft.cta],
  ];
  return parts.flatMap(([where, s]) => findNever(s, terms).map((term) => ({ where, term })));
}
