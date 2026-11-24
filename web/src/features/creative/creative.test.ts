import { describe, expect, it } from "vitest";
import { BANK, fillIn, filterBank, ideaBody } from "./bank";
import { conceptBody, EMPTY_BRIEF, generate } from "./lab";

describe("creative bank", () => {
  it("has a big, well-formed bank", () => {
    expect(BANK.length >= 30).toBe(true);
    expect(new Set(BANK.map((f) => f.key)).size).toBe(BANK.length);
    for (const f of BANK) {
      expect(f.beats.length >= 3).toBe(true);
      expect(f.hooks.length >= 1).toBe(true);
      expect(f.signals.length >= 1).toBe(true);
    }
  });
  it("filters and fills", () => {
    expect(filterBank({ family: "street" }).every((f) => f.family === "street")).toBe(true);
    expect(filterBank({ signal: "sends", stage: "seen" }).length > 2).toBe(true);
    expect(fillIn("Still doing [pain] like this?", { pain: "scrubbing" })).toBe(
      "Still doing scrubbing like this?",
    );
    expect(fillIn("[Price]? Here's why.", {})).toBe("[Price]? Here's why.");
    expect(ideaBody(BANK[0]!).split("\n")[0]).toContain("Format:");
  });
});

describe("creative lab", () => {
  const brief = {
    ...EMPTY_BRIEF,
    brand: "Dany Clean",
    product: "Dany Clean",
    pain: "the bathroom smells",
    result: "a fresh bathroom in 5 minutes",
  };
  it("makes distinct concepts across the funnel, with the brief's words", () => {
    const set = generate(brief, { n: 9, seed: 7, mix: "balanced" });
    expect(set).toHaveLength(9);
    expect(new Set(set.map((c) => c.format.key)).size).toBe(9);
    expect(set.map((c) => c.stage).slice(0, 3)).toEqual(["seen", "trusted", "bought"]);
    for (let i = 1; i < set.length; i++)
      expect(set[i]!.format.family === set[i - 1]!.format.family).toBe(false);
    expect(
      set.some(
        (c) => c.hook.includes("the bathroom smells") || c.title.includes("the bathroom smells"),
      ),
    ).toBe(true);
    expect(conceptBody(set[0]!)).toContain("Why it works:");
  });
  it("gives the same set for the same seed and a new one for a new seed", () => {
    const a = generate(brief, { n: 6, seed: 1, mix: "seen" }).map((c) => c.format.key);
    expect(generate(brief, { n: 6, seed: 1, mix: "seen" }).map((c) => c.format.key)).toEqual(a);
    expect(
      generate(brief, { n: 6, seed: 2, mix: "seen" })
        .map((c) => c.format.key)
        .join() === a.join(),
    ).toBe(false);
  });
});
