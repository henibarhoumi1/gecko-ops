import type { ConceptNote, NoteRow } from "@/features/concepts/model";

export type VideoStatus = "draft" | "review" | "changes" | "approved";

export interface Video {
  id: string;
  title: string;
  position: number;
  status: VideoStatus;
  version: number;
  hasPreview: boolean;
  hasFinal: boolean;
  finalName: string | null;
  finalSize: number | null;
  approvedVersion: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  conceptId?: string | null;
  conceptTitle: string | null;
  notes: ConceptNote[];
}

export const VIDEO_STATUS_LABEL: Record<"client" | "team", Record<VideoStatus, string>> = {
  client: {
    draft: "Draft",
    review: "Waiting for you",
    changes: "Changes asked",
    approved: "Approved",
  },
  team: {
    draft: "Draft, only the team sees it",
    review: "With the client",
    changes: "Client asked for changes",
    approved: "Approved by the client",
  },
};

const CLIENT_ORDER: [VideoStatus, string][] = [
  ["review", "Waiting for your approval"],
  ["changes", "You asked for changes"],
  ["approved", "Approved"],
];

const TEAM_ORDER: [VideoStatus, string][] = [
  ["changes", "Client asked for changes"],
  ["draft", "Drafts"],
  ["review", "With the client"],
  ["approved", "Approved"],
];

export interface VideoGroup {
  status: VideoStatus;
  title: string;
  items: Video[];
}

/** Videos grouped in the order the reader should act on them. Empty groups are left out. */
export function groupVideos(videos: Video[], reader: "client" | "team"): VideoGroup[] {
  return (reader === "client" ? CLIENT_ORDER : TEAM_ORDER)
    .map(([status, title]) => ({
      status,
      title,
      items: videos
        .filter((v) => v.status === status)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    }))
    .filter((g) => g.items.length > 0);
}

export function fileSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Rows from the team's direct table reads. */
export interface VideoRow {
  id: string;
  title: string;
  position: number;
  status: VideoStatus;
  version: number;
  preview_uid: string | null;
  final_name: string | null;
  final_size: number | null;
  approved_version: number | null;
  approved_at: string | null;
  approved_by: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
  concept_id: string | null;
}

export function videosFromRows(
  rows: VideoRow[],
  notes: (Omit<NoteRow, "concept_id"> & { video_id: string })[],
  conceptTitles: Map<string, string>,
): Video[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    position: r.position,
    status: r.status,
    version: r.version,
    hasPreview: r.preview_uid != null,
    hasFinal: r.final_name != null,
    finalName: r.final_name,
    finalSize: r.final_size,
    approvedVersion: r.approved_version,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    conceptId: r.concept_id,
    conceptTitle: r.concept_id ? (conceptTitles.get(r.concept_id) ?? null) : null,
    notes: notes
      .filter((n) => n.video_id === r.id)
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
