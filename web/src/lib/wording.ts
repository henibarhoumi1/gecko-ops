import { t } from "./i18n";

/**
 * Each client's portal speaks the language of what they bought. Performance is for brands buying ads that sell a
 * product (reels, hooks, calls to action). Cinematic is for brands buying image (films, stills, treatments), and
 * never sounds like an ad. The portal sets the template once it knows the client; everything else asks `tw`.
 */
export type Template = "performance" | "cinematic";

export const TEMPLATES: { id: Template; label: string; hint: string }[] = [
  {
    id: "performance",
    label: "Performance",
    hint: "Ads that sell a product: reels, hooks, calls to action. Dany Clean.",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    hint: "Image work: campaign films, stills, treatments. No hooks, no CTA. RareRich.",
  },
];

let current: Template = "performance";

export function setTemplate(template: string | null | undefined) {
  current = template === "cinematic" ? "cinematic" : "performance";
}

export function getTemplate(): Template {
  return current;
}

export const isCinematic = () => current === "cinematic";

/** The words for this client's template, in the language in use: tw(["Hooks", "Accroches"], ["Opening shot", "Plan d'ouverture"]). */
export function tw(performance: [string, string], cinematic: [string, string]): string {
  const [en, fr] = current === "cinematic" ? cinematic : performance;
  return t(en, fr);
}

/** The words that change between templates, in one place. */
export const words = {
  ideas: () => tw(["Ideas", "Idées"], ["Concepts", "Concepts"]),
  idea: () => tw(["idea", "idée"], ["concept", "concept"]),
  ideaPlural: (n: number) =>
    n === 1 ? words.idea() : tw(["ideas", "idées"], ["concepts", "concepts"]),
  scripts: () => tw(["Scripts", "Scripts"], ["Treatments", "Notes d'intention"]),
  script: () => tw(["script", "script"], ["treatment", "note d'intention"]),
  scriptPlural: (n: number) =>
    n === 1 ? words.script() : tw(["scripts", "scripts"], ["treatments", "notes d'intention"]),
  hook: () => tw(["Hook", "Accroche"], ["Opening", "Ouverture"]),
  cta: () => tw(["Call to action", "Appel à l'action"], ["Final frame", "Dernier plan"]),
  goal: () =>
    tw(["The viewer should", "Le spectateur doit"], ["It should leave you", "Il doit laisser"]),
  piece: () => tw(["reel", "vidéo"], ["film", "film"]),
  pieces: () => tw(["Reels", "Vidéos"], ["Films and stills", "Films et photos"]),
  piecePlural: (n: number) =>
    n === 1 ? words.piece() : tw(["reels", "vidéos"], ["films", "films"]),
  board: () => tw(["Inspiration", "Inspiration"], ["Moodboard", "Moodboard"]),
  talent: () => tw(["Talent", "Talents"], ["Cast", "Casting"]),
  location: () => tw(["Location", "Lieu"], ["Set", "Décor"]),
  review: () => tw(["Review", "Validation"], ["Screening", "Projection"]),
  results: () => tw(["Results", "Résultats"], ["Impact", "Impact"]),
};
