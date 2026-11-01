import { locale, t } from "@/lib/i18n";
export type ConceptStatus = "draft" | "review" | "changes" | "approved" | "idea";
export type ConceptFormat = "reel" | "carousel" | "static" | "other";
export type NoteKind = "comment" | "approve" | "changes";

export interface ConceptNote {
  id: string;
  kind: NoteKind;
  fromClient: boolean;
  authorName: string;
  body: string;
  version: number;
  createdAt: string;
}

export interface Concept {
  id: string;
  title: string;
  format: ConceptFormat;
  body: string;
  refs: string;
  position: number;
  fromClient: boolean;
  status: ConceptStatus;
  version: number;
  approvedVersion: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  notes: ConceptNote[];
}

// Labels are getters so they read in the language in use at the moment they're shown.
export const FORMAT_LABEL: Record<ConceptFormat, string> = {
  get reel() {
    return t("Reel", "Vidéo");
  },
  get carousel() {
    return t("Carousel", "Carrousel");
  },
  get static() {
    return t("Static post", "Post fixe");
  },
  get other() {
    return t("Other", "Autre");
  },
};

/** What each status means to the person reading it. */
export const STATUS_LABEL: Record<"client" | "team", Record<ConceptStatus, string>> = {
  client: {
    get draft() {
      return t("Draft", "Brouillon");
    },
    get review() {
      return t("Waiting for you", "Vous attend");
    },
    get changes() {
      return t("Changes asked", "Changements demandés");
    },
    get approved() {
      return t("Approved", "Validée");
    },
    get idea() {
      return t("Your idea", "Votre idée");
    },
  },
  team: {
    draft: "Draft, only the team sees it",
    review: "With the client",
    changes: "Client asked for changes",
    approved: "Approved by the client",
    idea: "Client's idea",
  },
};

export interface ConceptGroup {
  status: ConceptStatus;
  title: string;
  items: Concept[];
}

const clientOrder = (): [ConceptStatus, string][] => [
  ["review", t("Waiting for your approval", "En attente de votre validation")],
  ["changes", t("You asked for changes", "Vous avez demandé des changements")],
  ["approved", t("Approved", "Validées")],
  ["idea", t("Your ideas", "Vos idées")],
];

const TEAM_ORDER: [ConceptStatus, string][] = [
  ["changes", "Client asked for changes"],
  ["idea", "Ideas from the client"],
  ["draft", "Drafts"],
  ["review", "With the client"],
  ["approved", "Approved"],
];

function byPosition(a: Concept, b: Concept): number {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
}

/** Concepts grouped in the order the reader should act on them. Empty groups are left out. */
export function groupConcepts(concepts: Concept[], reader: "client" | "team"): ConceptGroup[] {
  const order = reader === "client" ? clientOrder() : TEAM_ORDER;
  return order
    .map(([status, title]) => ({
      status,
      title,
      items: concepts.filter((c) => c.status === status).sort(byPosition),
    }))
    .filter((group) => group.items.length > 0);
}

export function countByStatus(concepts: Concept[]): Record<ConceptStatus, number> {
  const counts: Record<ConceptStatus, number> = {
    draft: 0,
    review: 0,
    changes: 0,
    approved: 0,
    idea: 0,
  };
  for (const c of concepts) counts[c.status] += 1;
  return counts;
}

export interface RefLine {
  text: string;
  href: string | null;
}

/** One reference per line; only http and https lines become links. */
export function refLines(refs: string): RefLine[] {
  return refs
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => {
      try {
        const url = new URL(text);
        return {
          text,
          href: url.protocol === "https:" || url.protocol === "http:" ? url.href : null,
        };
      } catch {
        return { text, href: null };
      }
    });
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return date.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

/** Rows from the team's direct table reads, in the same shape the client functions return. */
export interface ConceptRow {
  id: string;
  title: string;
  format: ConceptFormat;
  body: string;
  refs: string;
  position: number;
  from_client: boolean;
  status: ConceptStatus;
  version: number;
  approved_version: number | null;
  approved_at: string | null;
  approved_by: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  concept_id: string;
  kind: NoteKind;
  from_client: boolean;
  author_name: string;
  body: string;
  version: number;
  created_at: string;
}

export function fromRows(rows: ConceptRow[], notes: NoteRow[]): Concept[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    format: r.format,
    body: r.body,
    refs: r.refs,
    position: r.position,
    fromClient: r.from_client,
    status: r.status,
    version: r.version,
    approvedVersion: r.approved_version,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    notes: notes
      .filter((n) => n.concept_id === r.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((n) => ({
        id: n.id,
        kind: n.kind,
        fromClient: n.from_client,
        authorName: n.author_name,
        body: n.body,
        version: n.version,
        createdAt: n.created_at,
      })),
  }));
}
