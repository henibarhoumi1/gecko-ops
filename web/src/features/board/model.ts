import { t } from "@/lib/i18n";
export type CardKind =
  | "note"
  | "todo"
  | "link"
  | "video"
  | "image"
  | "table"
  | "column"
  | "board"
  | "arrow";

export type NoteColor = "white" | "pink" | "yellow" | "green";

export interface Task {
  text: string;
  done: boolean;
}

/** What each kind of card keeps. Everything is optional so an older card never breaks a newer screen. */
export interface CardData {
  text?: string;
  color?: NoteColor;
  title?: string;
  tasks?: Task[];
  url?: string;
  path?: string;
  caption?: string;
  ratio?: number;
  cols?: string[];
  rows?: string[][];
  boardId?: string;
  from?: string;
  to?: string;
}

export interface Card {
  id: string;
  kind: CardKind;
  x: number;
  y: number;
  w: number;
  h: number | null;
  z: number;
  columnId: string | null;
  position: number;
  data: CardData;
  author?: string;
  fromClient?: boolean;
  updatedAt?: string;
  /** Board cards: how many cards the inner board holds. */
  count?: number | null;
}

export interface BoardPage {
  board: { id: string; title: string; parentId: string | null; rev: number };
  path: { id: string; title: string }[];
  items: Card[];
}

export const DEFAULT_WIDTH: Record<CardKind, number> = {
  note: 280,
  todo: 280,
  link: 280,
  video: 320,
  image: 300,
  table: 520,
  column: 300,
  board: 280,
  arrow: 40,
};

// Getters, so the toolbar reads in the language in use when it is drawn.
export const KIND_LABEL: Record<Exclude<CardKind, "arrow">, string> = {
  get note() {
    return t("Note", "Note");
  },
  get todo() {
    return t("To-do", "À faire");
  },
  get link() {
    return t("Link or video", "Lien ou vidéo");
  },
  get video() {
    return t("Video", "Vidéo");
  },
  get image() {
    return t("Image", "Image");
  },
  get table() {
    return t("Table", "Grille");
  },
  get column() {
    return t("Column", "Colonne");
  },
  get board() {
    return t("Board", "Tableau");
  },
};

export function newId(): string {
  return crypto.randomUUID();
}

export function blankCard(kind: CardKind, at: { x: number; y: number }, z: number): Card {
  const data: CardData =
    kind === "note"
      ? { text: "", color: "white" }
      : kind === "todo"
        ? { title: "", tasks: [{ text: "", done: false }] }
        : kind === "table"
          ? {
              title: "",
              cols: ["", "", ""],
              rows: [
                ["", "", ""],
                ["", "", ""],
              ],
            }
          : kind === "column"
            ? { title: "" }
            : kind === "board"
              ? { title: t("Untitled board", "Tableau sans titre") }
              : {};
  return {
    id: newId(),
    kind,
    x: Math.round(at.x),
    y: Math.round(at.y),
    w: DEFAULT_WIDTH[kind],
    h: null,
    z,
    columnId: null,
    position: 0,
    data,
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a line from the centre of `a` towards the centre of `b` leaves `a`. Arrows start and end on the edges. */
export function edgePoint(a: Rect, b: Rect): { x: number; y: number } {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  const dx = b.x + b.w / 2 - cx;
  const dy = b.y + b.h / 2 - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx === 0 ? Infinity : a.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : a.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** The cards inside a column, top to bottom. */
export function columnCards(cards: Card[], columnId: string): Card[] {
  return cards
    .filter((c) => c.columnId === columnId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** A position between the neighbours at `index`, so one card moves without renumbering the others. */
export function positionAt(siblings: Card[], index: number): number {
  const before = siblings[index - 1]?.position;
  const after = siblings[index]?.position;
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

const grid = (cols: string[], rows: number): Pick<CardData, "cols" | "rows"> => ({
  cols,
  rows: Array.from({ length: rows }, () => cols.map(() => "")),
});

/**
 * Gecko's campaign board: the brand, the inspiration, the story and the shoot, in four columns like a production
 * wall. Each card says what goes in it, so the client knows where to drop things.
 */
export function campaignTemplate(z: number): Card[] {
  const col = (x: number, title: string): Card => ({
    ...blankCard("column", { x, y: 0 }, z),
    data: { title },
  });
  const about = col(0, t("About the brand", "La marque"));
  const inspiration = col(340, t("Inspiration", "Inspiration"));
  const story = col(680, t("Story", "Histoire"));
  const shoot = col(1020, t("Shoot", "Tournage"));
  const inside = (column: Card, position: number, card: Card): Card => ({
    ...card,
    columnId: column.id,
    position,
  });
  const note = (text: string, color: NoteColor = "white"): Card => ({
    ...blankCard("note", { x: 0, y: 0 }, z),
    data: { text, color },
  });
  const board = (title: string): Card => ({
    ...blankCard("board", { x: 0, y: 0 }, z),
    data: { title },
  });
  const todo = (title: string, tasks: string[]): Card => ({
    ...blankCard("todo", { x: 0, y: 0 }, z),
    data: { title, tasks: tasks.map((text) => ({ text, done: false })) },
  });
  return [
    about,
    inside(
      about,
      0,
      note(
        t(
          "Who we sell to, in one sentence.\n\nWhat they should feel after a reel.",
          "À qui on vend, en une phrase.\n\nCe qu'ils doivent ressentir après une vidéo.",
        ),
        "yellow",
      ),
    ),
    inside(
      about,
      1,
      note(
        t(
          "Words we always use:\n\nWords we never use:",
          "Les mots qu'on utilise toujours :\n\nLes mots qu'on n'utilise jamais :",
        ),
      ),
    ),
    inside(
      about,
      2,
      note(t("Key contact\nName:\nPhone:", "Contact principal\nNom :\nTéléphone :")),
    ),
    inspiration,
    inside(inspiration, 0, board(t("Moodboard", "Moodboard"))),
    inside(inspiration, 1, board(t("Reels we love", "Vidéos qu'on adore"))),
    inside(
      inspiration,
      2,
      note(
        t(
          "Paste any Instagram, TikTok, YouTube or Pinterest link on the board and it plays right here.",
          "Collez n'importe quel lien Instagram, TikTok, YouTube ou Pinterest sur le tableau : il se lit directement ici.",
        ),
        "pink",
      ),
    ),
    story,
    inside(story, 0, board(t("Ideas", "Idées"))),
    inside(story, 1, board(t("Storyboard", "Storyboard"))),
    inside(
      story,
      2,
      todo(t("Next steps", "Prochaines étapes"), [
        t("Approve the ideas", "Valider les idées"),
        t("Approve the scripts", "Valider les scripts"),
      ]),
    ),
    shoot,
    inside(shoot, 0, board(t("Call sheet", "Feuille de service"))),
    inside(
      shoot,
      1,
      todo(t("Props and products to bring", "Accessoires et produits à apporter"), []),
    ),
    inside(shoot, 2, todo(t("Gear", "Matériel"), [])),
    {
      ...blankCard("table", { x: 0, y: 560 }, z),
      w: 660,
      data: {
        title: t("Shot list", "Liste des plans"),
        ...grid(
          [t("Shot", "Plan"), t("Framing", "Cadrage"), t("Sound", "Son"), t("Done", "Fait")],
          5,
        ),
      },
    },
    {
      ...blankCard("table", { x: 700, y: 560 }, z),
      w: 620,
      data: {
        title: t("Location plan", "Plan des lieux"),
        ...grid(
          [
            t("Day", "Jour"),
            t("Location", "Lieu"),
            t("Address", "Adresse"),
            t("Start", "Début"),
            t("Finish", "Fin"),
          ],
          3,
        ),
      },
    },
  ];
}

/**
 * The nearest empty spot to `start` for a new card, searching outwards in rings, so new cards don't land on top
 * of what's already there. Falls back to `start` when the area is full.
 */
export function freeSpot(
  taken: Rect[],
  start: { x: number; y: number },
  size: { w: number; h: number },
): { x: number; y: number } {
  const gap = 20;
  const clear = (x: number, y: number) =>
    taken.every(
      (r) =>
        x + size.w + gap <= r.x ||
        x >= r.x + r.w + gap ||
        y + size.h + gap <= r.y ||
        y >= r.y + r.h + gap,
    );
  const step = 40;
  for (let ring = 0; ring <= 30; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (const dy of ring === 0 ? [0] : [-ring, ring]) {
        const x = start.x + dx * step;
        const y = start.y + dy * step;
        if (clear(x, y)) return { x, y };
      }
    }
    for (let dy = -ring + 1; dy <= ring - 1; dy++) {
      for (const dx of [-ring, ring]) {
        const x = start.x + dx * step;
        const y = start.y + dy * step;
        if (clear(x, y)) return { x, y };
      }
    }
  }
  return start;
}
