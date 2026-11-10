import { describe, expect, it } from "vitest";
import { brandSheet, draftNever, findNever, neverTerms, sheetIsEmpty } from "./brand";

describe("brand sheet", () => {
  it("reads the onboarding answers", () => {
    const s = brandSheet(
      {
        oneline: " Fresh juice for busy people ",
        words: ["Premium", "Fun"],
        "words.other": "Sunny",
        tone1: "20",
        tone2: "50",
        tone3: "80",
        reasons: [{ reason: "Cold pressed" }, {}],
        never: "cheap, discount",
      },
      "  Always say 'Tunis'. ",
    );
    expect(s.oneline).toBe("Fresh juice for busy people");
    expect(s.feel).toEqual(["Premium", "Fun", "Sunny"]);
    expect(s.tone).toEqual(["Playful", "Luxury"]);
    expect(s.reasons).toEqual(["Cold pressed"]);
    expect(s.notes).toBe("Always say 'Tunis'.");
    expect(sheetIsEmpty(s)).toBe(false);
    expect(sheetIsEmpty(brandSheet({}))).toBe(true);
  });
});

describe("never say", () => {
  it("splits the answer into short words and phrases", () => {
    expect(
      neverTerms('cheap, discount; "best price"\nWe never talk about the old shop in Sousse'),
    ).toEqual(["cheap", "discount", "best price"]);
  });

  it("adds rules written in the brand notes, once", () => {
    expect(
      neverTerms("promo", "Tone: warm\nNever say: Promo, solde\nÀ éviter : concurrent"),
    ).toEqual(["promo", "solde", "concurrent"]);
  });

  it("matches whole words, any case or accent", () => {
    const terms = ["cheap", "best price", "promo"];
    expect(findNever("Not CHEAP at all", terms)).toEqual(["cheap"]);
    expect(findNever("cheaper than ever", terms)).toEqual([]);
    expect(findNever("Our best\nprice ever, en prómo", terms)).toEqual(["best price", "promo"]);
    expect(findNever("", terms)).toEqual([]);
  });

  it("says where each word is in the draft", () => {
    const hits = draftNever(
      {
        hooks: [{ hear: "So cheap!" }, {}],
        lead: { text: "fine" },
        body: [{ see: "a promo sign" }],
        cta: { hear: "Get the promo" },
      },
      ["cheap", "promo"],
    );
    expect(hits).toEqual([
      { where: "Hook 1", term: "cheap" },
      { where: "Body 1", term: "promo" },
      { where: "CTA", term: "promo" },
    ]);
  });
});
