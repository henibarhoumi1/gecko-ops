import { describe, expect, it } from "vitest";
import { changedParts, estimateSeconds, lineLabel, tidyLines, type ScriptContent } from "./model";

const base: ScriptContent = {
  title: "Coffee spill",
  style: "problem-fix",
  seconds: 20,
  goal: "Order on the site",
  hooks: [{ hear: "This used to mean a new sofa." }, { see: "Close on the stain", hear: "Watch." }],
  beats: [{ see: "Spray, wipe", hear: "One spray, ten seconds." }, { see: "Clean sofa" }],
  cta: "Order today",
};

describe("estimateSeconds", () => {
  it("counts the picked hook, every beat and the call to action", () => {
    // 7 words + 4 words + silent beat (1 s) + 2 words = 13 words / 2.5 + 1 = 6.2
    expect(estimateSeconds(base)).toBe(6);
    // hook B: 1 word -> 0.4 rounds up to the 1 second minimum
    expect(estimateSeconds(base, 1)).toBe(4);
  });

  it("reads Arabic a little slower", () => {
    const ar = {
      hooks: [],
      beats: [{ hear: "كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة" }],
      cta: "",
    };
    expect(estimateSeconds(ar)).toBe(5);
  });
});

describe("changedParts", () => {
  it("is empty for a first version", () => {
    expect(changedParts(base, null).size).toBe(0);
  });

  it("marks only the lines that changed", () => {
    const next = {
      ...base,
      beats: [base.beats[0]!, { see: "Clean sofa", text: "Gone" }],
      cta: "Order now",
    };
    expect([...changedParts(next, base)].sort()).toEqual(["beat-1", "cta"]);
  });

  it("ignores spaces around words", () => {
    const next = { ...base, goal: " Order on the site " };
    expect(changedParts(next, base).size).toBe(0);
  });
});

describe("helpers", () => {
  it("names lines the way people say them", () => {
    expect(lineLabel("hook-1")).toBe("Hook B");
    expect(lineLabel("beat-0")).toBe("Beat 1");
    expect(lineLabel("cta")).toBe("Call to action");
  });

  it("drops empty rows and fields", () => {
    expect(
      tidyLines([
        { see: " ", hear: "" },
        { see: " Wide ", text: "" },
      ]),
    ).toEqual([{ see: "Wide" }]);
  });
});
