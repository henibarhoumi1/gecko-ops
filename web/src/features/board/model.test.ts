import { describe, expect, it } from "vitest";
import { campaignTemplate, columnCards, edgePoint, freeSpot, positionAt, type Card } from "./model";

describe("edgePoint", () => {
  it("leaves the card on the side facing the other card", () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    expect(edgePoint(a, { x: 300, y: 0, w: 100, h: 100 })).toEqual({ x: 100, y: 50 });
    expect(edgePoint(a, { x: 0, y: 300, w: 100, h: 100 })).toEqual({ x: 50, y: 100 });
  });
});

describe("positionAt", () => {
  const cards = [{ position: 0 }, { position: 1 }] as Card[];
  it("fits between, before and after", () => {
    expect(positionAt(cards, 1)).toBe(0.5);
    expect(positionAt(cards, 0)).toBe(-1);
    expect(positionAt(cards, 2)).toBe(2);
    expect(positionAt([], 0)).toBe(0);
  });
});

describe("campaignTemplate", () => {
  it("puts every card in a column that exists, in order", () => {
    const cards = campaignTemplate(1);
    const columns = cards.filter((c) => c.kind === "column");
    expect(columns.map((c) => c.data.title)).toEqual([
      "About the brand",
      "Inspiration",
      "Story",
      "Shoot",
    ]);
    for (const c of cards.filter((c) => c.columnId))
      expect(columns.some((col) => col.id === c.columnId)).toBe(true);
    expect(columnCards(cards, columns[1]!.id).map((c) => c.data.title ?? "note")).toEqual([
      "Moodboard",
      "Reels we love",
      "note",
    ]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
  });
});

describe("freeSpot", () => {
  it("keeps the spot when it's empty and moves off a card when it isn't", () => {
    expect(freeSpot([], { x: 0, y: 0 }, { w: 100, h: 100 })).toEqual({ x: 0, y: 0 });
    const spot = freeSpot([{ x: 0, y: 0, w: 100, h: 100 }], { x: 0, y: 0 }, { w: 100, h: 100 });
    const overlaps = spot.x < 120 && spot.x > -120 && spot.y < 120 && spot.y > -120;
    expect(overlaps).toBe(false);
  });
});
