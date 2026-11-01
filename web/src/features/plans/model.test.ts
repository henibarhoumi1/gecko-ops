import { describe, expect, it } from "vitest";
import { PLANS, reelSlots } from "./model";

describe("plans", () => {
  it("carries the launch prices", () => {
    expect(PLANS.test.price).toBe(999);
    expect(PLANS.regular).toMatchObject({ price: 2900, reels: 10 });
    expect(PLANS.pro).toMatchObject({ price: 3800, reels: 15 });
    expect(PLANS.partner.price).toBeNull();
  });
});

describe("reelSlots", () => {
  it("fills approved, then with the client, then being written", () => {
    const scripts = [
      { status: "review" as const },
      { status: "approved" as const },
      { status: "changes" as const },
    ];
    expect(reelSlots(5, scripts)).toEqual(["approved", "review", "writing", "open", "open"]);
  });

  it("never adds slots beyond the plan", () => {
    expect(reelSlots(1, [{ status: "approved" }, { status: "approved" }])).toEqual(["approved"]);
  });
});
