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

export const KIND_LABEL: Record<Exclude<CardKind, "arrow">, string> = {
  note: "Note",
  todo: "To-do",
  link: "Link or video",
  video: "Video",
  image: "Image",
  table: "Table",
  column: "Column",
  board: "Board",
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
              ? { title: "Untitled board" }
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

const t = (cols: string[], rows: number): Pick<CardData, "cols" | "rows"> => ({
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
  const about = col(0, "About the brand");
  const inspiration = col(340, "Inspiration");
  const story = col(680, "Story");
  const shoot = col(1020, "Shoot");
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
      note("Who we sell to, in one sentence.\n\nWhat they should feel after a reel.", "yellow"),
    ),
    inside(about, 1, note("Words we always use:\n\nWords we never use:")),
    inside(about, 2, note("Key contact\nName:\nPhone:")),
    inspiration,
    inside(inspiration, 0, board("Moodboard")),
    inside(inspiration, 1, board("Reels we love")),
    inside(
      inspiration,
      2,
      note(
        "Paste any Instagram, TikTok, YouTube or Pinterest link on the board and it plays right here.",
        "pink",
      ),
    ),
    story,
    inside(story, 0, board("Ideas")),
    inside(story, 1, board("Storyboard")),
    inside(story, 2, todo("Next steps", ["Approve the ideas", "Approve the scripts"])),
    shoot,
    inside(shoot, 0, board("Call sheet")),
    inside(shoot, 1, todo("Props and products to bring", [])),
    inside(shoot, 2, todo("Gear", [])),
    {
      ...blankCard("table", { x: 0, y: 560 }, z),
      w: 660,
      data: { title: "Shot list", ...t(["Shot", "Framing", "Sound", "Done"], 5) },
    },
    {
      ...blankCard("table", { x: 700, y: 560 }, z),
      w: 620,
      data: { title: "Location plan", ...t(["Day", "Location", "Address", "Start", "Finish"], 3) },
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
