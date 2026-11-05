import { bodyFor, partTimes, template } from "./templates";
import { describe, expect, it } from "vitest";
import {
  changedParts,
  estimateSeconds,
  lineLabel,
  partLabel,
  TEMPLATES,
  templateGuide,
  tidyLines,
  type ScriptContent,
} from "./model";

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
    expect(lineLabel("beat-0")).toBe("Part 1");
    expect(
      lineLabel("beat-1", [
        { part: "lead", hear: "x" },
        { part: "body", see: "y" },
      ]),
    ).toBe("Body 1");
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

describe("ad structure", () => {
  it("names lead and body parts, counting old lines as body", () => {
    const beats = [
      { part: "lead" as const, hear: "a" },
      { part: "body" as const, see: "b" },
      { see: "c" },
    ];
    expect(partLabel(beats, 0)).toBe("Lead");
    expect(partLabel(beats, 1)).toBe("Body 1");
    expect(partLabel(beats, 2)).toBe("Body 2");
  });

  it("keeps the part only on lines with words", () => {
    expect(tidyLines([{ part: "lead" }, { part: "body", see: " shot " }])).toEqual([
      { see: "shot", part: "body" },
    ]);
  });

  it("gives every template a hook, a lead, body parts and a CTA", () => {
    for (const key of TEMPLATES) {
      const g = templateGuide(key);
      expect(g.hook && g.lead && g.cta).toBeTruthy();
      expect(g.body.length).toBeGreaterThan(0);
    }
    expect(templateGuide("reasons").body).toHaveLength(3);
    expect(templateGuide("talking-head")).toEqual(templateGuide("other"));
  });

  it("sizes the body for the video length", () => {
    const fix = template("problem-fix");
    expect(bodyFor(fix, 15)).toHaveLength(1);
    expect(bodyFor(fix, 30)).toHaveLength(2);
    expect(bodyFor(fix, 60)).toHaveLength(3);
    expect(bodyFor(template("reasons"), 15)).toHaveLength(3);
  });

  it("times every part inside the video", () => {
    const times = partTimes(30, 2);
    expect(times).toHaveLength(5);
    expect(times[0]).toBe("0–3 s");
    expect(times[4]!.endsWith("–30 s")).toBe(true);
    expect(partTimes(7, 1).at(-1)!.endsWith("–7 s")).toBe(true);
  });

  it("gives every template but Blank hook ideas", () => {
    for (const key of TEMPLATES) if (key !== "other") expect(template(key).hooks.length).toBe(3);
  });
});
