import { describe, expect, it } from "vitest";
import { adDraft, draftBeats, draftCta, freeBeats, isFreeWrite } from "./draft";
import { ctaLine, ctaString, estimateSeconds } from "./model";

describe("the call to action", () => {
  it("reads plain words from older scripts", () => {
    expect(ctaLine("Order today")).toEqual({ hear: "Order today" });
    expect(ctaLine("")).toEqual({});
    expect(ctaLine("{not json")).toEqual({ hear: "{not json" });
  });

  it("keeps plain words plain, and the rest as a small object", () => {
    expect(ctaString({ hear: " Order today " })).toBe("Order today");
    const s = ctaString({ see: "Logo on white", hear: "Order today", text: "-20%" });
    expect(ctaLine(s)).toEqual({ see: "Logo on white", hear: "Order today", text: "-20%" });
    expect(ctaLine(ctaString({ hear: "{weird}" }))).toEqual({ hear: "{weird}" });
  });

  it("counts only the words in the reading time", () => {
    const a = estimateSeconds({ hooks: [], beats: [], cta: "Order today now" });
    const b = estimateSeconds({
      hooks: [],
      beats: [],
      cta: ctaString({
        see: "A very long description of the last frame that nobody says",
        hear: "Order today now",
      }),
    });
    expect(b).toBe(a);
  });
});

describe("Blank writes freely", () => {
  it("starts with one hook, one page and the call to action", () => {
    const d = adDraft(undefined, "other");
    expect(d.hooks).toHaveLength(1);
    expect(d.body).toHaveLength(1);
    expect(isFreeWrite(d)).toBe(true);
    expect(isFreeWrite(adDraft(undefined, "problem-fix"))).toBe(false);
  });

  it("saves the page as one part per paragraph, long ones cut", () => {
    expect(freeBeats("First idea.\n\n  Second one  \n\n\n")).toEqual([
      { hear: "First idea.", part: "body" },
      { hear: "Second one", part: "body" },
    ]);
    const long = "Word ".repeat(400);
    expect(freeBeats(long).every((b) => (b.hear ?? "").length <= 1000)).toBe(true);
    const d = { ...adDraft(undefined, "other"), body: [{ hear: "A\n\nB" }], cta: { hear: "Go" } };
    expect(draftBeats(d)).toEqual([
      { hear: "A", part: "body" },
      { hear: "B", part: "body" },
    ]);
    expect(draftCta(d)).toBe("Go");
  });

  it("reopens a saved free script as one page again", () => {
    const d = adDraft(
      {
        style: "other",
        hooks: [{ hear: "Hi" }],
        beats: [
          { hear: "A", part: "body" },
          { hear: "B", part: "body" },
        ],
        cta: "",
      },
      "other",
    );
    expect(isFreeWrite(d)).toBe(true);
  });
});
