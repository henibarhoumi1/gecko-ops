import { describe, expect, it } from "vitest";
import { currentStage, localDay } from "./stage";

const at = (iso: string) => new Date(`${iso}T10:00:00`);

describe("currentStage", () => {
  it("is Plan until something is approved", () => {
    expect(currentStage(null, 0, at("2026-11-02"))).toBe("plan");
    expect(currentStage("2026-11-12", 0, at("2026-11-02"))).toBe("plan");
  });
  it("is Prep once something is approved and the shoot is ahead", () => {
    expect(currentStage("2026-11-12", 2, at("2026-11-02"))).toBe("prep");
    expect(currentStage(null, 1, at("2026-11-02"))).toBe("prep");
  });
  it("is Shoot on the day and Edit after it", () => {
    expect(currentStage("2026-11-12", 0, at("2026-11-12"))).toBe("shoot");
    expect(currentStage("2026-11-12", 3, at("2026-11-13"))).toBe("edit");
  });
  it("reads today in local time", () => {
    expect(localDay(new Date(2026, 10, 2, 23, 30))).toBe("2026-11-02");
  });

  it("moves to Edit once a cut is sent, and to Delivery once a final is out", () => {
    expect(currentStage(null, 0, at("2026-11-02"), { sent: 1, delivered: 0 })).toBe("edit");
    expect(currentStage("2026-11-30", 2, at("2026-11-02"), { sent: 3, delivered: 1 })).toBe(
      "delivery",
    );
  });
});
