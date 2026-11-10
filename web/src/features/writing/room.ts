import type { Concept } from "@/features/concepts/model";
import { byClient, type Script } from "@/features/scripts/model";
import { t } from "@/lib/i18n";

/**
 * The Writing Room puts ideas and scripts on one page: each piece is an idea with the scripts written
 * from it (or a script on its own), placed in the column of the step it has reached.
 */
export type RoomStage = "idea" | "write" | "script" | "check" | "ready";

export const ROOM_STAGES: RoomStage[] = ["idea", "write", "script", "check", "ready"];

export function stageLabel(stage: RoomStage, reader: "client" | "team"): string {
  switch (stage) {
    case "idea":
      return t("Ideas", "Idées");
    case "write":
      return t("To script", "À scénariser");
    case "script":
      return reader === "client" ? t("Being written", "En écriture") : "Writing";
    case "check":
      return reader === "client" ? t("To read", "À relire") : "With the client";
    case "ready":
      return t("Ready to shoot", "Prêt à tourner");
  }
}

export interface Piece {
  key: string;
  concept: Concept | null;
  /** Newest first. */
  scripts: Script[];
  stage: RoomStage;
  /** Who has to do the next thing, if anyone. */
  waitingOn: "client" | "team" | null;
  title: string;
  /** The first words people will hear. */
  hook: string;
  updatedAt: string;
}

const newer = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  b.updatedAt.localeCompare(a.updatedAt);

function scriptStage(s: Script): Pick<Piece, "stage" | "waitingOn"> {
  if (s.status === "approved") return { stage: "ready", waitingOn: null };
  if (s.status === "review") return { stage: "check", waitingOn: byClient(s) ? "team" : "client" };
  // Changes asked: the side that didn't write this version answered, the writer is up.
  if (s.status === "changes")
    return { stage: "script", waitingOn: byClient(s) ? "client" : "team" };
  return { stage: "script", waitingOn: byClient(s) ? "client" : "team" };
}

function conceptStage(c: Concept): Pick<Piece, "stage" | "waitingOn"> {
  if (c.status === "approved") return { stage: "write", waitingOn: "team" };
  if (c.status === "review") return { stage: "idea", waitingOn: c.fromClient ? "team" : "client" };
  if (c.status === "changes") return { stage: "idea", waitingOn: c.fromClient ? "client" : "team" };
  return { stage: "idea", waitingOn: null };
}

/** Pieces of the scripts' furthest-behind state win: one script still with the client keeps the idea there. */
const RANK: Record<RoomStage, number> = { idea: 0, write: 1, script: 2, check: 3, ready: 4 };

export function roomPieces(concepts: readonly Concept[], scripts: readonly Script[]): Piece[] {
  const ideaIds = new Set(concepts.map((c) => c.id));
  const byIdea = new Map<string, Script[]>();
  const loose: Script[] = [];
  for (const s of scripts) {
    if (s.conceptId && ideaIds.has(s.conceptId)) {
      const list = byIdea.get(s.conceptId) ?? [];
      list.push(s);
      byIdea.set(s.conceptId, list);
    } else loose.push(s);
  }

  const pieces: Piece[] = concepts.map((c) => {
    const list = (byIdea.get(c.id) ?? []).sort(newer);
    let state = conceptStage(c);
    if (list.length > 0) {
      const states = list.map(scriptStage);
      state = states.reduce((a, b) => (RANK[b.stage] < RANK[a.stage] ? b : a));
      // Someone waiting anywhere in the piece is worth showing.
      if (!state.waitingOn)
        state = { ...state, waitingOn: states.find((x) => x.waitingOn)?.waitingOn ?? null };
    }
    const latest = [c, ...list].sort(newer)[0]!;
    return {
      key: `idea-${c.id}`,
      concept: c,
      scripts: list,
      ...state,
      title: c.title,
      hook: (c.hook ?? "").trim() || firstHook(list[0]),
      updatedAt: latest.updatedAt,
    };
  });

  for (const s of loose)
    pieces.push({
      key: `script-${s.id}`,
      concept: null,
      scripts: [s],
      ...scriptStage(s),
      title: s.title,
      hook: firstHook(s),
      updatedAt: s.updatedAt,
    });

  return pieces.sort(newer);
}

function firstHook(s: Script | undefined): string {
  if (!s) return "";
  const pick = s.hooks[s.hook ?? 0] ?? s.hooks[0];
  return (pick?.hear || pick?.text || pick?.see || "").trim();
}

export function byStage(pieces: readonly Piece[]): Record<RoomStage, Piece[]> {
  const out = { idea: [], write: [], script: [], check: [], ready: [] } as Record<
    RoomStage,
    Piece[]
  >;
  for (const p of pieces) out[p.stage].push(p);
  return out;
}

/** How many pieces wait on this reader. */
export const waitingOnMe = (pieces: readonly Piece[], reader: "client" | "team") =>
  pieces.filter((p) => p.waitingOn === reader).length;
