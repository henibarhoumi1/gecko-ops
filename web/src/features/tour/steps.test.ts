import { describe, expect, it } from "vitest";
import { clientSteps, placeCard, teamSteps } from "./steps";

const view = { width: 1200, height: 800 };
const card = { width: 320, height: 180 };

describe("tour", () => {
  it("has short steps on both sides", () => {
    for (const steps of [teamSteps(), clientSteps()]) {
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(steps[0]!.target).toBeUndefined();
      for (const s of steps) expect(s.text.length).toBeLessThan(140);
    }
  });

  it("puts the card beside a sidebar item", () => {
    expect(placeCard({ top: 200, left: 10, width: 200, height: 36 }, card, view)).toEqual({
      top: 200,
      left: 222,
    });
  });

  it("puts the card under, or above, something in the page", () => {
    expect(placeCard({ top: 100, left: 600, width: 200, height: 40 }, card, view)).toEqual({
      top: 152,
      left: 600,
    });
    expect(placeCard({ top: 700, left: 1000, width: 150, height: 40 }, card, view)).toEqual({
      top: 508,
      left: 868,
    });
  });

  it("centres the card with nothing to point at, inside a small screen", () => {
    expect(placeCard(null, card, view)).toEqual({ top: 310, left: 440 });
    expect(placeCard(null, { width: 400, height: 180 }, { width: 360, height: 640 })).toEqual({
      top: 230,
      left: 12,
    });
  });
});
