export type CutStatus = "draft" | "review" | "changes" | "approved";

export interface CutVersion {
  version: number;
  path: string;
  size: number;
  seconds: number | null;
  whatChanged: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CutNote {
  id: string;
  version: number;
  /** Seconds into the video, or null for the whole cut. Arrives as a string from numeric columns. */
  at: number | string | null;
  kind: "comment" | "approve" | "changes";
  fromClient: boolean;
  authorName: string;
  body: string;
  done: boolean;
  createdAt: string;
}

export interface Cut {
  id: string;
  title: string;
  position: number;
  status: CutStatus;
  version: number;
  approvedVersion: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  delivered: boolean;
  deliveredAt: string | null;
  /** Only for the team, or for the client once the balance is paid. */
  finalLink: string | null;
  finalNote: string;
  versions: CutVersion[];
  notes: CutNote[];
}

export interface CutsPage {
  balancePaid: boolean;
  cuts: Cut[];
}

export function normaliseCuts(data: unknown): CutsPage {
  const page = (data ?? {}) as Partial<CutsPage>;
  return { balancePaid: Boolean(page.balancePaid), cuts: page.cuts ?? [] };
}

export const noteAt = (n: CutNote): number | null => (n.at == null ? null : Number(n.at));

/** 0:07, 1:32, 1:02:05. */
export function timecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export const latest = (cut: Cut): CutVersion | undefined => cut.versions[cut.versions.length - 1];

/** Notes on one version, timecoded ones first in the order they play, then the rest by date. */
export function notesFor(cut: Cut, version: number): CutNote[] {
  return cut.notes
    .filter((n) => n.version === version)
    .sort((a, b) => {
      const x = noteAt(a);
      const y = noteAt(b);
      if (x != null && y != null) return x - y || a.createdAt.localeCompare(b.createdAt);
      if (x != null) return -1;
      if (y != null) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

/** Client notes on the latest version the team hasn't ticked off yet. */
export const openNotes = (cut: Cut): number =>
  cut.notes.filter(
    (n) => n.fromClient && n.kind !== "approve" && !n.done && n.version === cut.version,
  ).length;

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

const ORDER = {
  client: ["review", "changes", "approved"],
  team: ["changes", "draft", "review", "approved"],
} as const;

export function groupCuts(cuts: Cut[], reader: "client" | "team"): [CutStatus, Cut[]][] {
  return ORDER[reader]
    .map((status): [CutStatus, Cut[]] => [
      status,
      cuts
        .filter((c) => c.status === status)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    ])
    .filter(([, items]) => items.length > 0);
}

/** Previews: 720p, watermarked in the edit, under the free plan's 50 MB per file. */
export const PREVIEW_LIMIT = 50 * 1024 * 1024;
export const PREVIEW_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
