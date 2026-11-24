import { describe, expect, it } from "vitest";
import { htOf, ledgerCsv, summarise, vatCalc, vatOf, type Entry } from "./model";

const e = (p: Partial<Entry>): Entry => ({
  id: Math.random().toString(36).slice(2),
  kind: "out",
  status: "done",
  title: "x",
  category: "other",
  counterparty: "",
  clientId: null,
  amount: 0,
  vatRate: 0,
  method: "",
  reference: "",
  dueOn: null,
  doneOn: "2026-11-10",
  note: "",
  receipts: [],
  createdAt: "2026-11-01T00:00:00Z",
  ...p,
});

describe("finance", () => {
  it("splits TTC into HT and VAT", () => {
    expect(htOf(119, 19)).toBe(100);
    expect(vatOf(119, 19)).toBe(19);
    expect(vatOf(50, 0)).toBe(0);
  });
  it("sums the month, the balance, what's owed and the VAT due", () => {
    const s = summarise(
      [
        e({ kind: "in", amount: 2380, vatRate: 19, category: "client" }),
        e({ kind: "out", amount: 119, vatRate: 19, category: "props", receipts: ["a.jpg"] }),
        e({ kind: "out", amount: 300, category: "talent" }),
        e({ kind: "in", status: "planned", doneOn: null, dueOn: "2026-11-01", amount: 1000 }),
        e({ kind: "out", status: "planned", doneOn: null, dueOn: "2026-12-01", amount: 200 }),
        e({ kind: "out", amount: 50, doneOn: "2026-10-30" }),
      ],
      "2026-11-24",
      { amount: 1000, on: "2026-10-31" },
    );
    expect(s.inMonth).toBe(2380);
    expect(s.outMonth).toBe(419);
    expect(s.balance).toBe(1000 + 2380 - 419);
    expect(s.toReceive).toBe(1000);
    expect(s.overdueIn).toBe(1000);
    expect(s.toPay).toBe(200);
    expect(s.overdueOut).toBe(0);
    expect(s.vatDue).toBe(380 - 19);
    expect(s.byCategory[0]).toEqual({ key: "talent", total: 300 });
    expect(s.missingReceipts).toBe(2);
  });
  it("works out a facture from HT or TTC, with the stamp and withholding", () => {
    const r = vatCalc({ amount: 1000, from: "ht", rate: 19, stamp: 1, withholding: 1.5 });
    expect(r).toEqual({
      ht: 1000,
      vat: 190,
      ttc: 1190,
      total: 1191,
      withheld: 17.85,
      net: 1173.15,
    });
    expect(vatCalc({ amount: 1190, from: "ttc", rate: 19, stamp: 0, withholding: 0 }).ht).toBe(
      1000,
    );
  });
  it("exports the ledger for the accountant", () => {
    const csv = ledgerCsv([
      e({ title: "Rent, November", amount: 119, vatRate: 19, category: "rent" }),
    ]);
    expect(csv.split("\n")[1]).toBe(
      '2026-11-10,out,paid,"Rent, November",Rent and office,,,,100.000,19%,19.000,119.000,0',
    );
  });
});
