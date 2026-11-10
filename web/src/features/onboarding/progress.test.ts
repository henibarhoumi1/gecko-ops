import {
  answerText,
  answered,
  changedKeys,
  openQuestions,
  percentFilled,
  sheetText,
} from "./progress";
import { ESSENTIAL, QUESTIONS, sheetSections } from "./questions";

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

describe("onboarding progress", () => {
  it("has all 64 questions, 24 of them essential", () => {
    expect(QUESTIONS).toHaveLength(64);
    expect(ESSENTIAL).toHaveLength(24);
    for (const id of ESSENTIAL) expect(QUESTIONS.some((x) => x.id === id)).toBe(true);
    expect(sheetSections(false).flatMap((s) => s.fields)).toHaveLength(24);
    expect(sheetSections(false).some((s) => s.id === "shoot")).toBe(false);
  });

  it("counts a typed 'other' answer and an asset link as answered", () => {
    expect(answered({ "where.other": "Pop-up stores" }, q("where"))).toBe(true);
    expect(answered({ "files.2.link": "https://drive.google.com/x" }, q("files"))).toBe(true);
    expect(answered({ where: [] }, q("where"))).toBe(false);
  });

  it("rounds the share of answered questions", () => {
    expect(percentFilled({})).toBe(0);
    expect(percentFilled({ brand: "Dany Clean" })).toBe(4);
    expect(percentFilled({ brand: "Dany Clean" }, true)).toBe(2);
    expect(percentFilled({ brand: "D", "where.other": "Pop-ups" })).toBe(4);
  });

  it("lists what's still open on the quick sheet only", () => {
    const left = openQuestions({ brand: "D" }).reduce((n, r) => n + r.missing.length, 0);
    expect(left).toBe(23);
  });

  it("sends only what changed, with removed answers as null", () => {
    expect(
      changedKeys({ a: "1", b: ["x"], c: "same" }, { b: ["x", "y"], c: "same", d: "new" }),
    ).toEqual({
      a: null,
      b: ["x", "y"],
      d: "new",
    });
  });

  it("reads answers back as text for the team", () => {
    expect(answerText({ where: ["Online store"], "where.other": "Pop-ups" }, q("where"))).toBe(
      "Online store, Pop-ups",
    );
    expect(answerText({ tone1: "20" }, q("tone1"))).toBe("Playful");
    expect(answerText({ hero: [{ name: "Spray", price: "12 DT" }] }, q("hero"))).toBe(
      "Spray · 12 DT",
    );
    expect(sheetText("Dany Clean", { brand: "Dany Clean" })).toContain("Brand name: Dany Clean");
  });
});
