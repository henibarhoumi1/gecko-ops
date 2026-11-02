import { describe, expect, it } from "vitest";
import { money, sendBlockers, statusOf, totals, type Invoice, type InvoiceSettings } from "./model";

describe("invoice sums", () => {
  it("adds rate taxes on taxed lines only and fixed amounts once, like the database", () => {
    const out = totals(
      [
        { label: "Balance", qty: 1, unit: 750, taxed: true },
        { label: "Talent", qty: 1, unit: 400, taxed: false },
      ],
      [
        { label: "TVA", kind: "rate", value: 19 },
        { label: "Timbre", kind: "fixed", value: 1 },
      ],
    );
    expect(out.subtotal).toBe(1150);
    expect(out.rows.map((r) => r.amount)).toEqual([142.5, 1]);
    expect(out.total).toBe(1293.5);
  });

  it("keeps millimes", () => {
    expect(totals([{ label: "x", qty: 3, unit: 333.3335 }], []).subtotal).toBe(1000.001);
  });

  it("writes amounts the Tunisian way in each language", () => {
    expect(money(1500, "en")).toBe("1,500.000 DT");
    expect(money(1500, "fr").replace(/\s/g, " ")).toBe("1 500,000 DT");
  });
});

describe("invoice state", () => {
  it("calls a sent invoice past its date overdue", () => {
    expect(statusOf({ status: "sent", overdue: true })).toBe("overdue");
    expect(statusOf({ status: "paid", overdue: false })).toBe("paid");
  });

  it("lists what blocks sending, accountant first", () => {
    const settings = {
      legalName: "",
      payment: "",
      taxesCheckedAt: null,
    } as unknown as InvoiceSettings;
    const invoice = { billTo: { name: "X" }, lines: [{}], total: 10 } as unknown as Invoice;
    const blockers = sendBlockers(settings, invoice);
    expect(blockers[0]).toMatch(/accountant/);
    expect(blockers).toHaveLength(2);
  });
});
