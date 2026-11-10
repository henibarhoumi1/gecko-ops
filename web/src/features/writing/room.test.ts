import { describe, expect, it } from "vitest";
import type { Concept } from "@/features/concepts/model";
import type { Script } from "@/features/scripts/model";
import { byStage, roomPieces, waitingOnMe } from "./room";

const idea = (id: string, patch: Partial<Concept> = {}): Concept => ({
  id,
  title: `Idea ${id}`,
  format: "reel",
  hook: "",
  body: "",
  refs: "",
  position: 0,
  fromClient: false,
  status: "review",
  version: 1,
  approvedVersion: null,
  approvedAt: null,
  approvedBy: null,
  authorName: "",
  createdAt: "2026-11-01T10:00:00Z",
  updatedAt: "2026-11-01T10:00:00Z",
  notes: [],
  ...patch,
});

const script = (id: string, patch: Partial<Script> = {}): Script => ({
  id,
  conceptId: null,
  title: `Script ${id}`,
  style: "problem-fix",
  seconds: 30,
  goal: "",
  hooks: [{ hear: "Stop scrolling" }],
  beats: [],
  cta: "",
  position: 0,
  status: "draft",
  version: 1,
  hook: null,
  approvedVersion: null,
  approvedAt: null,
  approvedBy: null,
  authorName: "",
  createdAt: "2026-11-02T10:00:00Z",
  updatedAt: "2026-11-02T10:00:00Z",
  previous: null,
  notes: [],
  ...patch,
});

describe("writing room", () => {
  it("puts each idea where it has got to", () => {
    const pieces = roomPieces(
      [
        idea("a"),
        idea("b", { status: "approved" }),
        idea("c", { status: "approved" }),
        idea("d", { status: "approved", hook: "Wait for it" }),
      ],
      [
        script("s1", { conceptId: "c", status: "review" }),
        script("s2", { conceptId: "d", status: "approved" }),
        script("s3"),
      ],
    );
    const cols = byStage(pieces);
    expect(cols.idea.map((p) => p.key)).toEqual(["idea-a"]);
    expect(cols.write.map((p) => p.key)).toEqual(["idea-b"]);
    expect(cols.check.map((p) => p.key)).toEqual(["idea-c"]);
    expect(cols.ready.map((p) => p.key)).toEqual(["idea-d"]);
    expect(cols.script.map((p) => p.key)).toEqual(["script-s3"]);
    expect(cols.ready[0]!.hook).toBe("Wait for it");
    expect(cols.check[0]!.hook).toBe("Stop scrolling");
  });

  it("keeps an idea at its slowest script", () => {
    const [piece] = roomPieces(
      [idea("a", { status: "approved" })],
      [
        script("s1", { conceptId: "a", status: "approved" }),
        script("s2", { conceptId: "a", status: "changes", updatedAt: "2026-11-05T00:00:00Z" }),
      ],
    );
    expect(piece!.stage).toBe("script");
    expect(piece!.scripts.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(piece!.updatedAt).toBe("2026-11-05T00:00:00Z");
  });

  it("says whose turn it is", () => {
    const pieces = roomPieces(
      [idea("a"), idea("b", { fromClient: true })],
      [script("s1", { status: "review", writtenBy: "client" })],
    );
    expect(waitingOnMe(pieces, "client")).toBe(1);
    expect(waitingOnMe(pieces, "team")).toBe(2);
  });

  it("treats a script whose idea isn't here as its own piece", () => {
    const pieces = roomPieces([], [script("s1", { conceptId: "gone" })]);
    expect(pieces.map((p) => p.key)).toEqual(["script-s1"]);
  });
});
