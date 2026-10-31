import { QUESTIONS, SECTIONS, type Question, type Section, type Words } from "./questions";

export type Answers = Record<string, unknown>;

/** English for now; French is in the data for when the portal gets a language switch. */
export function en(words: Words | ""): string {
  return words === "" ? "" : words[0];
}

function filled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value != null && String(value).trim() !== "";
}

/** Whether a question has any answer. */
export function answered(answers: Answers, q: Question): boolean {
  if (q.type === "assets")
    return q.items.some(
      (_, n) => filled(answers[`${q.id}.${n}`]) || filled(answers[`${q.id}.${n}.link`]),
    );
  return filled(answers[q.id]) || filled(answers[`${q.id}.other`]);
}

export function sectionCount(answers: Answers, section: Section): number {
  return section.fields.filter((q) => answered(answers, q)).length;
}

export function percentFilled(answers: Answers): number {
  return Math.round(
    (QUESTIONS.filter((q) => answered(answers, q)).length / QUESTIONS.length) * 100,
  );
}

/** Questions without an answer yet, per section, for the "still open" list before sending. */
export function openQuestions(answers: Answers): { section: Section; missing: Question[] }[] {
  return SECTIONS.map((section) => ({
    section,
    missing: section.fields.filter((q) => !answered(answers, q)),
  })).filter((row) => row.missing.length > 0);
}

/** The label to show for a question; a tone slider has none, so it shows its two ends. */
export function questionLabel(q: Question): string {
  if (q.type === "scale") return `${en(q.left)} / ${en(q.right)}`;
  return en(q.label);
}

/**
 * Only what changed, for the database merge: a key set to null is removed there.
 * Comparing as JSON keeps arrays and list rows simple.
 */
export function changedKeys(before: Answers, after: Answers): Answers {
  const patch: Answers = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) patch[key] = b;
  }
  return patch;
}

/** A readable answer for the team's summary and the copy-to-clipboard text. */
export function answerText(answers: Answers, q: Question): string {
  const other = answers[`${q.id}.other`];
  const extra = typeof other === "string" && other.trim() ? other.trim() : "";
  switch (q.type) {
    case "text":
    case "long":
      return typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
    case "pick": {
      const v = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
      return [v, extra].filter(Boolean).join(", ");
    }
    case "picks": {
      const v = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
      return [...v, extra].filter(Boolean).join(", ");
    }
    case "scale": {
      const v = answers[q.id];
      if (!filled(v)) return "";
      const n = Number(v);
      if (n === 50) return "In between";
      return `${n < 50 ? en(q.left) : en(q.right)}${Math.abs(n - 50) >= 35 ? ", clearly" : ""}`;
    }
    case "list": {
      const rows = Array.isArray(answers[q.id]) ? (answers[q.id] as Record<string, string>[]) : [];
      return rows
        .map((row) =>
          q.cols
            .map((c) => row[c[0]])
            .filter(Boolean)
            .join(" · "),
        )
        .join("\n");
    }
    case "assets":
      return q.items
        .map((item, n) => {
          const state = answers[`${q.id}.${n}`];
          const link = answers[`${q.id}.${n}.link`];
          if (!filled(state) && !filled(link)) return "";
          const word =
            state === "have"
              ? "We have it"
              : state === "help"
                ? "Need help"
                : state === "none"
                  ? "Not needed"
                  : "";
          return `${en(item)}: ${[word, link].filter(Boolean).join(" · ")}`;
        })
        .filter(Boolean)
        .join("\n");
  }
}

/** The whole sheet as plain text, section by section. */
export function sheetText(brand: string, answers: Answers): string {
  const parts = [`${brand} onboarding`];
  for (const section of SECTIONS) {
    const lines = section.fields
      .map((q) => [questionLabel(q), answerText(answers, q)] as const)
      .filter(([, a]) => a)
      .map(([l, a]) => `${l}: ${a}`);
    if (lines.length) parts.push(`\n${en(section.title).toUpperCase()}\n${lines.join("\n")}`);
  }
  return parts.join("\n");
}
