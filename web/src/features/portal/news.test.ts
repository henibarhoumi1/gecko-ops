import { describe, expect, it } from "vitest";
import { newsLines, type News } from "./news";

const none: News = { since: "2026-11-02T10:00:00Z", ideas: 0, scripts: 0, cuts: 0, options: 0, replies: 0, delivered: 0, invoices: 0 };

describe("new since your last visit", () => {
  it("says nothing when nothing changed", () => {
    expect(newsLines(none)).toEqual([]);
  });

  it("lists only what changed, videos first, with where to look", () => {
    const lines = newsLines({ ...none, scripts: 2, cuts: 1, replies: 1 });
    expect(lines.map((l) => l.label)).toEqual([
      "1 new video to watch",
      "2 new scripts to read",
      "1 reply from Gecko",
    ]);
    expect(lines.map((l) => l.to)).toEqual(["/review", "/scripts", null]);
  });
});
