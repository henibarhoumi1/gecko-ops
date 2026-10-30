import { byNextDate, gapMessage, gaps, isOverdue, stepOf, type Lead } from "./model";

const lead = (over: Partial<Lead>): Lead =>
  ({
    id: "l",
    brand: "B",
    stage: "prospect",
    owner_member_id: "m1",
    next_step: "Call",
    next_date: "2026-11-01",
    ...over,
  }) as Lead;
const team = new Set(["m1"]);

describe("pipeline model", () => {
  it("folds older stages into the five columns", () => {
    expect(stepOf("conversation")).toBe("contacted");
    expect(stepOf("negotiation")).toBe("proposal_sent");
    expect(stepOf("lost")).toBe("lost");
  });

  it("flags open leads missing an owner, next step or date", () => {
    expect(gaps(lead({}), team)).toEqual([]);
    expect(gaps(lead({ owner_member_id: "gone", next_step: " ", next_date: null }), team)).toEqual([
      "owner",
      "next",
      "date",
    ]);
  });

  it("asks for what is missing in plain words", () => {
    expect(gapMessage(["owner", "next", "date"])).toBe(
      "Add an owner, a next step and a date so this lead can't go quiet.",
    );
    expect(gapMessage(["date"])).toBe("Add a date so this lead can't go quiet.");
  });

  it("does not nag about closed leads", () => {
    expect(gaps(lead({ stage: "lost", owner_member_id: null }), team)).toEqual([]);
  });

  it("sorts by next date with undated leads last", () => {
    const sorted = [
      lead({ brand: "C", next_date: null }),
      lead({ brand: "B", next_date: "2026-11-03" }),
      lead({ brand: "A", next_date: "2026-11-01" }),
    ].sort(byNextDate);
    expect(sorted.map((l) => l.brand)).toEqual(["A", "B", "C"]);
  });

  it("knows when a follow-up is late", () => {
    expect(isOverdue(lead({ next_date: "2026-10-01" }), "2026-10-30")).toBe(true);
    expect(isOverdue(lead({ stage: "won", next_date: "2026-10-01" }), "2026-10-30")).toBe(false);
  });
});
