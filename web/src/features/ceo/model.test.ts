import { describe, expect, it } from "vitest";
import { clientHealth, forecast, moneyFor, weeklyReport } from "./model";

describe("moneyFor", () => {
  it("splits paid this month, owed, overdue and drafts", () => {
    const m = moneyFor(
      [
        { status: "paid", total: "1000", overdue: false, paidOn: "2026-11-05", dueDate: "" },
        { status: "paid", total: 500, overdue: false, paidOn: "2026-10-30", dueDate: "" },
        { status: "sent", total: 750, overdue: true, paidOn: null, dueDate: "" },
        { status: "sent", total: 250, overdue: false, paidOn: null, dueDate: "" },
        { status: "draft", total: 100, overdue: false, paidOn: null, dueDate: "" },
      ],
      "2026-11",
    );
    expect(m.cashIn).toBe(1000);
    expect(m.owed).toBe(1000);
    expect(m.overdue).toBe(750);
    expect(m.drafts).toBe(100);
  });
});

describe("forecast", () => {
  it("weights open leads by their chance and counts this month's wins", () => {
    const f = forecast(
      [
        { stage: "proposal_sent", value: 2000, history: [] },
        { stage: "prospect", value: 1000, history: [] },
        { stage: "won", value: 3000, history: [{ at: "2026-11-10T10:00:00Z", stage: "won" }] },
        { stage: "lost", value: 9000, history: [] },
      ],
      "2026-11",
    );
    expect(f.open).toBe(3000);
    expect(f.weighted).toBe(1050);
    expect(f.wonValue).toBe(3000);
    expect(f.wonCount).toBe(1);
  });
});

describe("clientHealth", () => {
  it("is good when nothing is wrong", () => {
    const h = clientHealth({
      waitingDays: 0,
      overdue: 0,
      scripts: 2,
      approved: 1,
      nextShoot: "2026-11-29",
      quietDays: 2,
    });
    expect(h.tone).toBe("good");
    expect(h.reasons).toEqual([]);
  });
  it("says why a client is at risk", () => {
    const h = clientHealth({
      waitingDays: 9,
      overdue: 300,
      scripts: 2,
      approved: 0,
      nextShoot: null,
      quietDays: 20,
    });
    expect(h.tone).toBe("risk");
    expect(h.reasons).toContain("an invoice is overdue");
  });
});

describe("weeklyReport", () => {
  it("writes the goal share in both languages", () => {
    const base = {
      cashIn: 5000,
      owed: 1000,
      wonCount: 1,
      wonValue: 3000,
      newLeads: 4,
      approvals: 6,
      shoots: 2,
      goal: 10000,
    };
    expect(weeklyReport({ ...base, lang: "en" })).toContain("50% of goal");
    expect(weeklyReport({ ...base, lang: "fr" })).toContain("50 % de l'objectif");
  });
});
