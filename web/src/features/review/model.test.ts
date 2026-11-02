import { describe, expect, it } from "vitest";
import { groupCuts, notesFor, openNotes, timecode, type Cut, type CutNote } from "./model";

const note = (over: Partial<CutNote>): CutNote => ({
  id: Math.random().toString(36),
  version: 1,
  at: null,
  kind: "comment",
  fromClient: true,
  authorName: "Sara",
  body: "x",
  done: false,
  createdAt: "2026-11-02T10:00:00Z",
  ...over,
});

const cut = (over: Partial<Cut>): Cut => ({
  id: "c",
  title: "Reel 1",
  position: 0,
  status: "review",
  version: 1,
  approvedVersion: null,
  approvedAt: null,
  approvedBy: null,
  authorName: "Heni",
  createdAt: "2026-11-02T09:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  delivered: false,
  deliveredAt: null,
  finalLink: null,
  finalNote: "",
  versions: [],
  notes: [],
  ...over,
});

describe("timecode", () => {
  it("reads like a player", () => {
    expect(timecode(7.9)).toBe("0:07");
    expect(timecode(92)).toBe("1:32");
    expect(timecode(3725)).toBe("1:02:05");
  });
});

describe("notesFor", () => {
  it("puts timecoded notes first, in play order", () => {
    const c = cut({
      notes: [
        note({ id: "late", at: "30.00" }),
        note({ id: "whole" }),
        note({ id: "early", at: "4.50" }),
        note({ id: "old", at: "1", version: 0 }),
      ],
    });
    expect(notesFor(c, 1).map((n) => n.id)).toEqual(["early", "late", "whole"]);
  });
});

describe("openNotes", () => {
  it("counts the client's unhandled notes on the latest version", () => {
    const c = cut({
      version: 2,
      notes: [
        note({ version: 1 }),
        note({ version: 2 }),
        note({ version: 2, done: true }),
        note({ version: 2, fromClient: false }),
      ],
    });
    expect(openNotes(c)).toBe(1);
  });
});

describe("groupCuts", () => {
  it("shows the team what needs work first", () => {
    const cuts = [cut({ id: "a", status: "approved" }), cut({ id: "b", status: "changes" })];
    expect(groupCuts(cuts, "team").map(([s]) => s)).toEqual(["changes", "approved"]);
  });
});
