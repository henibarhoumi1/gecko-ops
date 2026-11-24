// Finance OS (Heni, 24 Nov 2026): the ledger's shapes and sums, kept pure for tests. Amounts are TTC (all taxes
// included) in dinars with millimes; HT and VAT are worked out from the rate.

export type Kind = "in" | "out";
export type Status = "planned" | "done";
export type Method = "" | "cash" | "transfer" | "cheque" | "card" | "d17" | "flouci" | "other";

export interface Entry {
  id: string;
  kind: Kind;
  status: Status;
  title: string;
  category: string;
  counterparty: string;
  clientId: string | null;
  amount: number;
  vatRate: number;
  method: Method;
  reference: string;
  dueOn: string | null;
  doneOn: string | null;
  note: string;
  receipts: string[];
  createdAt: string;
}

export const CATEGORIES: Record<Kind, { key: string; label: string }[]> = {
  in: [
    { key: "client", label: "Client payment" },
    { key: "deposit", label: "Deposit" },
    { key: "refund", label: "Refund received" },
    { key: "capital", label: "Capital or loan" },
    { key: "other-in", label: "Other income" },
  ],
  out: [
    { key: "talent", label: "Talent" },
    { key: "location", label: "Locations" },
    { key: "props", label: "Props and sets" },
    { key: "crew", label: "Freelancers and crew" },
    { key: "gear", label: "Gear and rental" },
    { key: "transport", label: "Transport and fuel" },
    { key: "food", label: "Food on set" },
    { key: "ads", label: "Ads (Gecko)" },
    { key: "software", label: "Software and subscriptions" },
    { key: "salaries", label: "Salaries" },
    { key: "rent", label: "Rent and office" },
    { key: "utilities", label: "Internet, phone, power" },
    { key: "taxes", label: "Taxes and CNSS" },
    { key: "bank", label: "Bank fees" },
    { key: "equipment", label: "Equipment bought" },
    { key: "other", label: "Other" },
  ],
};

export const categoryLabel = (key: string) =>
  [...CATEGORIES.in, ...CATEGORIES.out].find((c) => c.key === key)?.label ?? key;

export const METHODS: { key: Method; label: string }[] = [
  { key: "transfer", label: "Bank transfer" },
  { key: "cash", label: "Cash" },
  { key: "cheque", label: "Cheque" },
  { key: "card", label: "Card" },
  { key: "d17", label: "D17" },
  { key: "flouci", label: "Flouci" },
  { key: "other", label: "Other" },
];

/** Tunisian VAT rates: 19% standard, 13% and 7% reduced, 0% exempt. */
export const VAT_RATES = [19, 13, 7, 0];

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const htOf = (ttc: number, rate: number) => r3(ttc / (1 + rate / 100));
export const vatOf = (ttc: number, rate: number) => r3(ttc - htOf(ttc, rate));

export const dt = (n: number, digits = 0) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} DT`;

/** The day an entry counts on: when it was paid or received, else when it's due. */
export const dayOf = (e: Entry) => e.doneOn ?? e.dueOn ?? e.createdAt.slice(0, 10);

export const isOverdue = (e: Entry, today: string) =>
  e.status === "planned" && !!e.dueOn && e.dueOn < today;

export function monthsBack(n: number, today: string): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export interface Summary {
  balance: number;
  inMonth: number;
  outMonth: number;
  net: number;
  toReceive: number;
  toPay: number;
  overdueIn: number;
  overdueOut: number;
  /** VAT on money in, minus VAT on money out, this month (positive: to pay to the State). */
  vatCollected: number;
  vatDeductible: number;
  vatDue: number;
  months: { m: string; in: number; out: number }[];
  byCategory: { key: string; total: number }[];
  missingReceipts: number;
  /** Average spent per month over the last 3 full months, and how many months the balance covers. */
  burn: number;
  runway: number | null;
}

export function summarise(
  entries: readonly Entry[],
  today: string,
  opening: { amount: number; on: string | null } = { amount: 0, on: null },
): Summary {
  const month = today.slice(0, 7);
  const done = entries.filter((e) => e.status === "done");
  const planned = entries.filter((e) => e.status === "planned");
  const sign = (e: Entry) => (e.kind === "in" ? e.amount : -e.amount);
  const counted = done.filter((e) => !opening.on || (e.doneOn ?? "") >= opening.on);
  const balance = r3(opening.amount + counted.reduce((s, e) => s + sign(e), 0));
  const inMonth = (k: Kind) =>
    r3(
      done
        .filter((e) => e.kind === k && (e.doneOn ?? "").startsWith(month))
        .reduce((s, e) => s + e.amount, 0),
    );
  const vatMonth = (k: Kind) =>
    r3(
      done
        .filter((e) => e.kind === k && (e.doneOn ?? "").startsWith(month))
        .reduce((s, e) => s + vatOf(e.amount, e.vatRate), 0),
    );
  const sum = (list: Entry[]) => r3(list.reduce((s, e) => s + e.amount, 0));
  const months = monthsBack(6, today).map((m) => ({
    m,
    in: sum(done.filter((e) => e.kind === "in" && (e.doneOn ?? "").startsWith(m))),
    out: sum(done.filter((e) => e.kind === "out" && (e.doneOn ?? "").startsWith(m))),
  }));
  const cats = new Map<string, number>();
  for (const e of done)
    if (e.kind === "out" && (e.doneOn ?? "").startsWith(month))
      cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
  const full = months.slice(2, 5);
  const burn = r3(full.reduce((s, x) => s + x.out, 0) / 3);
  const vatCollected = vatMonth("in");
  const vatDeductible = vatMonth("out");
  const i = inMonth("in");
  const o = inMonth("out");
  return {
    balance,
    inMonth: i,
    outMonth: o,
    net: r3(i - o),
    toReceive: sum(planned.filter((e) => e.kind === "in")),
    toPay: sum(planned.filter((e) => e.kind === "out")),
    overdueIn: sum(planned.filter((e) => e.kind === "in" && isOverdue(e, today))),
    overdueOut: sum(planned.filter((e) => e.kind === "out" && isOverdue(e, today))),
    vatCollected,
    vatDeductible,
    vatDue: r3(vatCollected - vatDeductible),
    months,
    byCategory: [...cats]
      .map(([key, total]) => ({ key, total: r3(total) }))
      .sort((a, b) => b.total - a.total),
    missingReceipts: done.filter((e) => e.kind === "out" && e.receipts.length === 0 && e.amount > 0)
      .length,
    burn,
    runway: burn > 0 ? Math.round((balance / burn) * 10) / 10 : null,
  };
}

/** The TVA calculator: from HT or TTC, with an optional fiscal stamp and withholding tax. */
export function vatCalc(input: {
  amount: number;
  from: "ht" | "ttc";
  rate: number;
  stamp: number;
  withholding: number;
}) {
  const rate = Math.max(0, input.rate);
  const ht = input.from === "ht" ? r3(input.amount) : htOf(input.amount, rate);
  const vat = r3((ht * rate) / 100);
  const ttc = r3(ht + vat);
  const total = r3(ttc + Math.max(0, input.stamp));
  const withheld = r3((ttc * Math.max(0, input.withholding)) / 100);
  return { ht, vat, ttc, total, withheld, net: r3(total - withheld) };
}

export function ledgerCsv(
  entries: readonly Entry[],
  label: (key: string) => string = categoryLabel,
): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = [
    "Date",
    "In/Out",
    "Status",
    "What",
    "Category",
    "With",
    "Method",
    "Reference",
    "HT",
    "VAT rate",
    "VAT",
    "TTC",
    "Factures",
  ];
  const rows = entries.map((e) =>
    [
      dayOf(e),
      e.kind === "in" ? "in" : "out",
      e.status === "done"
        ? e.kind === "in"
          ? "received"
          : "paid"
        : e.kind === "in"
          ? "to receive"
          : "to pay",
      e.title,
      label(e.category),
      e.counterparty,
      e.method,
      e.reference,
      htOf(e.amount, e.vatRate).toFixed(3),
      `${e.vatRate}%`,
      vatOf(e.amount, e.vatRate).toFixed(3),
      e.amount.toFixed(3),
      String(e.receipts.length),
    ]
      .map((v) => esc(String(v)))
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}
