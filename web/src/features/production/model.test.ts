import { describe, expect, it } from "vitest";
import { committedByKind, wouldGoOver, type Budget, type ProductionOption } from "./model";

const option = (o: Partial<ProductionOption>): ProductionOption => ({
  id: "x",
  kind: "talent",
  name: "Yasmine",
  role: "main",
  details: "",
  link: "",
  photos: [],
  cost: 400,
  costNote: "",
  when: "",
  usage: "",
  boughtBy: "gecko",
  status: "proposed",
  overBudget: false,
  decidedBy: "",
  decidedAt: null,
  fromClient: false,
  mine: false,
  authorName: "Heni",
  createdAt: "2026-11-02T00:00:00Z",
  notes: [],
  ...o,
});

const budget = (cap: number | null, committed: number): Budget => ({
  cap,
  committed,
  note: "",
  updatedAt: null,
});

describe("wouldGoOver", () => {
  it("is false inside the budget", () => {
    expect(wouldGoOver(option({ cost: 400 }), budget(1300, 900))).toBe(false);
  });
  it("is true past the budget", () => {
    expect(wouldGoOver(option({ cost: 401 }), budget(1300, 900))).toBe(true);
  });
  it("ignores what the client brings and a missing budget", () => {
    expect(wouldGoOver(option({ cost: 5000, boughtBy: "client" }), budget(1300, 0))).toBe(false);
    expect(wouldGoOver(option({ cost: 5000 }), budget(null, 0))).toBe(false);
    expect(wouldGoOver(option({ cost: 5000 }), null)).toBe(false);
  });
  it("doesn't count an already approved option twice", () => {
    expect(wouldGoOver(option({ cost: 400, status: "passed" }), budget(1300, 1300))).toBe(true);
    expect(wouldGoOver(option({ cost: 400, status: "approved" }), budget(1300, 1300))).toBe(false);
  });
});

describe("committedByKind", () => {
  it("adds up only approved costs Gecko pays", () => {
    const by = committedByKind([
      option({ cost: 400, status: "approved" }),
      option({ cost: 300, status: "proposed" }),
      option({ kind: "location", cost: 700, status: "paid" }),
      option({ kind: "prop", cost: 90, status: "approved", boughtBy: "client" }),
    ]);
    expect(by).toEqual({ talent: 400, location: 700, prop: 0 });
  });
});
