import { t } from "@/lib/i18n";
import { words } from "@/lib/wording";
export type ScriptStatus = "draft" | "review" | "changes" | "approved";
/** The template a script was written from. The last five are older styles, kept for scripts already written. */
export type ScriptStyle =
  | "problem-fix"
  | "before-after"
  | "founder"
  | "review"
  | "reasons"
  | "other"
  | "talking-head"
  | "demo"
  | "skit"
  | "ugc"
  | "voiceover";

/** Which part of the ad a scene line is. The hook and the CTA have their own fields. */
export type ScriptPart = "lead" | "body";

/** One row of a script: what we see, what we hear, and the words on screen. */
export interface ScriptLine {
  see?: string;
  hear?: string;
  text?: string;
  part?: ScriptPart;
}

/**
 * Every ad follows the same shape: Hook (the first 1–3 s) → Lead (sets up the problem or the promise) → Body (1 to
 * 3 parts that keep people watching: show it, prove it) → CTA. A template only changes what each part is for.
 */
export interface TemplateGuide {
  hook: string;
  lead: string;
  body: string[];
  cta: string;
}

export const TEMPLATES: ScriptStyle[] = [
  "problem-fix",
  "before-after",
  "founder",
  "review",
  "reasons",
  "other",
];

/** What each part of the ad is for, per template. Built on each call so it reads in the language in use. */
function guides(): Record<string, TemplateGuide> {
  return {
    "problem-fix": {
      hook: t("Name the pain in the first second. No product yet.", "Nommez le problème dès la première seconde. Pas encore de produit."),
      lead: t("Make it hurt: why this problem is so annoying.", "Faites-le ressentir : pourquoi ce problème est si pénible."),
      body: [
        t("The product steps in and fixes it, on camera.", "Le produit arrive et règle le problème, à l'écran."),
        t("The result, clearly visible.", "Le résultat, bien visible."),
      ],
      cta: t("What to do now, and why today.", "Quoi faire maintenant, et pourquoi aujourd'hui."),
    },
    "before-after": {
      hook: t("Open on the after: the best-looking result first.", "Ouvrez sur l'après : le plus beau résultat d'abord."),
      lead: t("Rewind to the before. Same light, same frame.", "Retour à l'avant. Même lumière, même cadre."),
      body: [
        t("What changed: the product in use.", "Ce qui a changé : le produit en action."),
        t("Close-up proof of the result.", "La preuve du résultat, en gros plan."),
      ],
      cta: t("Get the same result: where and how.", "Obtenez le même résultat : où et comment."),
    },
    founder: {
      hook: t("A bold line from the founder, straight to camera.", "Une phrase forte du fondateur, face caméra."),
      lead: t("Why I started this.", "Pourquoi j'ai commencé."),
      body: [
        t("What makes it different from the rest.", "Ce qui le rend différent des autres."),
        t("Proof: a customer, a number, a moment.", "La preuve : un client, un chiffre, un moment."),
      ],
      cta: t("An invitation from the founder.", "Une invitation du fondateur."),
    },
    review: {
      hook: t("A real reaction: the first second of trying it.", "Une vraie réaction : la première seconde d'essai."),
      lead: t("My problem before.", "Mon problème avant."),
      body: [
        t("First try: what I noticed.", "Premier essai : ce que j'ai remarqué."),
        t("After a few days: the result.", "Après quelques jours : le résultat."),
      ],
      cta: t("Where to get it, in my own words.", "Où l'acheter, avec mes mots."),
    },
    reasons: {
      hook: t("\u201c3 reasons [who] love [product]\u201d", "\u00ab 3 raisons pour lesquelles [qui] adorent [produit] \u00bb"),
      lead: t("Optional: who this is for.", "Facultatif : pour qui c'est."),
      body: [
        t("Reason 1, shown, not told.", "Raison 1, montrée, pas racontée."),
        t("Reason 2, shown.", "Raison 2, montrée."),
        t("Reason 3: the strongest, last.", "Raison 3 : la plus forte, en dernier."),
      ],
      cta: t("The easiest next step.", "L'étape suivante la plus simple."),
    },
    other: {
      hook: t("Stop the scroll in the first second.", "Arrêtez le scroll dès la première seconde."),
      lead: t("Set up the problem or the promise.", "Posez le problème ou la promesse."),
      body: [t("Show it.", "Montrez-le."), t("Prove it.", "Prouvez-le.")],
      cta: t("One clear next step.", "Une seule étape suivante, claire."),
    },
  };
}

export const templateGuide = (style: ScriptStyle): TemplateGuide => {
  const all = guides();
  return all[style] ?? all.other!;
};

/** The sections of a Cinematic treatment, written before the scenes. */
export const TREATMENT_KEYS = ["mood", "story", "music", "styling", "casting"] as const;
export type TreatmentKey = (typeof TREATMENT_KEYS)[number];
export type Treatment = Partial<Record<TreatmentKey, string>>;

export function treatmentLabel(key: TreatmentKey): string {
  return {
    mood: t("Mood", "Ambiance"),
    story: t("Story", "Histoire"),
    music: t("Music", "Musique"),
    styling: t("Styling", "Stylisme"),
    casting: t("Casting", "Casting"),
  }[key];
}

/** Keeps only the sections that have words in them. */
export function tidyTreatment(treatment: Treatment): Treatment {
  const out: Treatment = {};
  for (const key of TREATMENT_KEYS) {
    const value = (treatment[key] ?? "").trim();
    if (value) out[key] = value;
  }
  return out;
}

export interface ScriptContent {
  title: string;
  style: ScriptStyle;
  seconds: number;
  goal: string;
  hooks: ScriptLine[];
  beats: ScriptLine[];
  cta: string;
  /** Missing on a database without two-way writing yet. */
  treatment?: Treatment;
}

export interface ScriptNote {
  id: string;
  kind: "comment" | "approve" | "changes";
  /** hook-0..hook-2, beat-N, goal, cta, or null for the whole script. */
  line: string | null;
  hook: number | null;
  fromClient: boolean;
  authorName: string;
  body: string;
  version: number;
  createdAt: string;
}

export interface Script extends ScriptContent {
  id: string;
  conceptId: string | null;
  position: number;
  status: ScriptStatus;
  version: number;
  hook: number | null;
  approvedVersion: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  previous: ScriptContent | null;
  notes: ScriptNote[];
  /** Who wrote the version on screen. The other side approves it. */
  writtenBy?: "gecko" | "client";
  /** Written by the person looking at it (client side only). */
  mine?: boolean;
}

export const byClient = (s: Pick<Script, "writtenBy">) => s.writtenBy === "client";

/** How a script's status reads, from either side, depending on who wrote this version. */
export function scriptStatus(
  s: Pick<Script, "status" | "writtenBy">,
  reader: "client" | "team",
): string {
  if (!byClient(s)) return SCRIPT_STATUS[reader][s.status];
  if (reader === "client")
    return {
      draft: t("Draft", "Brouillon"),
      review: t("With Gecko", "Chez Gecko"),
      changes: t("Gecko suggested changes", "Gecko propose des changements"),
      approved: t("Approved by Gecko", "Validé par Gecko"),
    }[s.status];
  return {
    draft: "Draft",
    review: "Written by the client: needs your yes",
    changes: "You asked the client for changes",
    approved: "Approved by Gecko",
  }[s.status];
}

// Labels are getters so they read in the language in use at the moment they're shown.
export const STYLE_LABEL: Record<ScriptStyle, string> = {
  get "before-after"() {
    return t("Before / After", "Avant / Après");
  },
  get founder() {
    return t("Founder story", "Histoire du fondateur");
  },
  get review() {
    return t("Honest review (UGC)", "Avis sincère (UGC)");
  },
  get reasons() {
    return t("3 reasons", "3 raisons");
  },
  get "talking-head"() {
    return t("Talking head", "Face caméra");
  },
  get demo() {
    return t("Product demo", "Démo produit");
  },
  get "problem-fix"() {
    return t("Problem → Fix", "Problème → Solution");
  },
  get skit() {
    return t("Skit", "Sketch");
  },
  get ugc() {
    return t("UGC style", "Style UGC");
  },
  get voiceover() {
    return t("Voiceover on footage", "Voix off sur images");
  },
  get other() {
    return t("Blank", "Libre");
  },
};

export const SCRIPT_STATUS: Record<"client" | "team", Record<ScriptStatus, string>> = {
  client: {
    get draft() {
      return t("Draft", "Brouillon");
    },
    get review() {
      return t("Waiting for you", "Vous attend");
    },
    get changes() {
      return t("Being reworked", "En cours de reprise");
    },
    get approved() {
      return t("Approved", "Validé");
    },
  },
  team: {
    draft: "Draft, only the team sees it",
    review: "With the client",
    changes: "Client asked for changes",
    approved: "Approved by the client",
  },
};

const clientOrder = (): [string, string, (s: Script) => boolean][] => [
  [
    "review",
    t("Waiting for your approval", "En attente de votre validation"),
    (s) => s.status === "review" && !byClient(s),
  ],
  [
    "changes",
    t("Being reworked", "En cours de reprise"),
    (s) => s.status === "changes" && !byClient(s),
  ],
  [
    "yours",
    t("Written by you, with Gecko", "Écrits par vous, chez Gecko"),
    (s) => byClient(s) && (s.status === "review" || s.status === "changes"),
  ],
  ["approved", t("Approved", "Validés"), (s) => s.status === "approved"],
];

const TEAM_ORDER: [string, string, (s: Script) => boolean][] = [
  ["client", "Written by the client: needs your yes", (s) => byClient(s) && s.status === "review"],
  ["changes", "Client asked for changes", (s) => s.status === "changes" && !byClient(s)],
  ["draft", "Drafts", (s) => s.status === "draft"],
  [
    "review",
    "With the client",
    (s) => (s.status === "review" && !byClient(s)) || (s.status === "changes" && byClient(s)),
  ],
  ["approved", "Approved", (s) => s.status === "approved"],
];

export function groupScripts(scripts: Script[], reader: "client" | "team") {
  const order = reader === "client" ? clientOrder() : TEAM_ORDER;
  return order
    .map(([status, title, match]) => ({
      status,
      title,
      items: scripts
        .filter(match)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    }))
    .filter((group) => group.items.length > 0);
}

// Spoken pace for short-form ads: about 2.5 words a second in English and French, a little slower in Arabic.
const ARABIC = /[؀-ۿ]/;

function spokenSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return words / (ARABIC.test(text) ? 2.2 : 2.5);
}

/**
 * Roughly how long the script runs when spoken: one hook (the picked one, else the first), every beat and
 * the call to action. Silent beats still take a second each.
 */
export function estimateSeconds(content: Pick<ScriptContent, "hooks" | "beats" | "cta">, hook = 0) {
  const chosen = content.hooks[hook] ?? content.hooks[0];
  const lines = [...(chosen ? [chosen] : []), ...content.beats];
  const total =
    lines.reduce((sum, line) => sum + Math.max(spokenSeconds(line.hear ?? ""), 1), 0) +
    spokenSeconds(content.cta);
  return Math.round(total);
}

const clean = (line: ScriptLine | undefined) =>
  line
    ? [line.see ?? "", line.hear ?? "", line.text ?? ""].map((s) => s.trim()).join("\u0000")
    : "";

/** Which parts changed since the version the client saw before. Empty when there is no earlier version. */
export function changedParts(current: ScriptContent, previous: ScriptContent | null): Set<string> {
  const changed = new Set<string>();
  if (!previous) return changed;
  current.hooks.forEach((line, i) => {
    if (clean(line) !== clean(previous.hooks[i])) changed.add(`hook-${i}`);
  });
  current.beats.forEach((line, i) => {
    if (clean(line) !== clean(previous.beats[i])) changed.add(`beat-${i}`);
  });
  if (current.goal.trim() !== previous.goal.trim()) changed.add("goal");
  if (current.cta.trim() !== previous.cta.trim()) changed.add("cta");
  if (current.beats.length < previous.beats.length) changed.add("beats-removed");
  if (current.hooks.length < previous.hooks.length) changed.add("hooks-removed");
  for (const key of TREATMENT_KEYS)
    if ((current.treatment?.[key] ?? "").trim() !== (previous.treatment?.[key] ?? "").trim())
      changed.add(key);
  return changed;
}

/** "Lead", "Body 1", "Body 2"…: the name of a scene line from its part. Lines from before parts count as body. */
export function partLabel(beats: ScriptLine[], i: number): string {
  if (beats[i]?.part === "lead") return t("Lead", "Mise en place");
  const n = beats.slice(0, i + 1).filter((b) => b.part !== "lead").length;
  return `${t("Body", "Corps")} ${n}`;
}

export function lineLabel(line: string | null, beats?: ScriptLine[]): string {
  if (!line) return "";
  if (line === "goal") return t("Goal", "Objectif");
  if (line === "cta") return words.cta();
  const [kind, n] = line.split("-");
  if (kind === "hook") return hookName(Number(n));
  return beats ? partLabel(beats, Number(n)) : `${t("Part", "Partie")} ${Number(n) + 1}`;
}

export const hookName = (i: number) => `${words.hook()} ${String.fromCharCode(65 + i)}`;

/** Drops empty rows and trims every field, so the database keeps only what was written. */
export function tidyLines(lines: ScriptLine[]): ScriptLine[] {
  return lines
    .map((line) => {
      const out: ScriptLine = {};
      for (const key of ["see", "hear", "text"] as const) {
        const value = (line[key] ?? "").trim();
        if (value) out[key] = value;
      }
      if (Object.keys(out).length > 0 && line.part) out.part = line.part;
      return out;
    })
    .filter((line) => Object.keys(line).length > 0);
}

/** Rows from the team's direct table reads. */
export interface ScriptRow {
  id: string;
  client_id: string;
  concept_id: string | null;
  title: string;
  style: ScriptStyle;
  seconds: number;
  goal: string;
  hooks: ScriptLine[];
  beats: ScriptLine[];
  cta: string;
  position: number;
  status: ScriptStatus;
  version: number;
  hook: number | null;
  approved_version: number | null;
  approved_at: string | null;
  approved_by: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
  written_by?: "gecko" | "client";
  treatment?: Treatment;
}

export interface ScriptNoteRow {
  id: string;
  script_id: string;
  kind: ScriptNote["kind"];
  line: string | null;
  hook: number | null;
  from_client: boolean;
  author_name: string;
  body: string;
  version: number;
  created_at: string;
}

export interface ScriptVersionRow {
  script_id: string;
  version: number;
  content: ScriptContent;
}

export function scriptsFromRows(
  rows: ScriptRow[],
  notes: ScriptNoteRow[],
  versions: ScriptVersionRow[],
): Script[] {
  return rows.map((r) => ({
    id: r.id,
    conceptId: r.concept_id,
    title: r.title,
    style: r.style,
    seconds: r.seconds,
    goal: r.goal,
    hooks: r.hooks,
    beats: r.beats,
    cta: r.cta,
    treatment: r.treatment ?? {},
    writtenBy: r.written_by ?? "gecko",
    position: r.position,
    status: r.status,
    version: r.version,
    hook: r.hook,
    approvedVersion: r.approved_version,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    previous:
      versions
        .filter((v) => v.script_id === r.id && v.version < r.version)
        .sort((a, b) => b.version - a.version)[0]?.content ?? null,
    notes: notes
      .filter((n) => n.script_id === r.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((n) => ({
        id: n.id,
        kind: n.kind,
        line: n.line,
        hook: n.hook,
        fromClient: n.from_client,
        authorName: n.author_name,
        body: n.body,
        version: n.version,
        createdAt: n.created_at,
      })),
  }));
}
