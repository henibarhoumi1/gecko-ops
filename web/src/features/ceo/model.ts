// The CEO cockpit's sums (Heni, 23 Nov 2026). Pure functions over what the app already loads: leads, invoices,
// projects and the Home lists. Tested in model.test.ts.

export interface MoneyInvoice {
  status: "draft" | "sent" | "paid" | "void";
  total: number | string;
  overdue: boolean;
  paidOn: string | null;
  dueDate: string;
}

export interface Money {
  /** Paid this month. */
  cashIn: number;
  /** Sent, not paid yet. */
  owed: number;
  /** Sent and past due. */
  overdue: number;
  /** Written, not sent. */
  drafts: number;
  paidCount: number;
}

const num = (v: number | string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** month is "2026-11". */
export function moneyFor(invoices: readonly MoneyInvoice[], month: string): Money {
  const m: Money = { cashIn: 0, owed: 0, overdue: 0, drafts: 0, paidCount: 0 };
  for (const v of invoices) {
    const total = num(v.total);
    if (v.status === "paid" && v.paidOn?.startsWith(month)) {
      m.cashIn += total;
      m.paidCount += 1;
    } else if (v.status === "sent") {
      m.owed += total;
      if (v.overdue) m.overdue += total;
    } else if (v.status === "draft") m.drafts += total;
  }
  return m;
}

export const addMoney = (a: Money, b: Money): Money => ({
  cashIn: a.cashIn + b.cashIn,
  owed: a.owed + b.owed,
  overdue: a.overdue + b.overdue,
  drafts: a.drafts + b.drafts,
  paidCount: a.paidCount + b.paidCount,
});

export const NO_MONEY: Money = { cashIn: 0, owed: 0, overdue: 0, drafts: 0, paidCount: 0 };

/** How likely an open lead is to sign, by where it is on the board. */
export const CHANCE: Record<string, number> = {
  prospect: 0.05,
  contacted: 0.1,
  conversation: 0.15,
  meeting_booked: 0.25,
  qualified: 0.35,
  proposal_sent: 0.5,
  negotiation: 0.65,
  accepted: 0.85,
  signed: 0.9,
};

export interface ForecastLead {
  stage: string;
  value: number | null;
  history: { at: string; stage: string }[];
}

const WON = new Set(["won", "signed", "accepted"]);

/** The open pipeline, its value weighted by each lead's chance, and what was won this month. */
export function forecast(leads: readonly ForecastLead[], month: string) {
  let open = 0;
  let weighted = 0;
  let wonValue = 0;
  let wonCount = 0;
  let openCount = 0;
  for (const l of leads) {
    const value = l.value ?? 0;
    if (l.stage === "won" || l.stage === "lost" || l.stage === "nurture") {
      // counted below if won this month
    } else {
      open += value;
      weighted += value * (CHANCE[l.stage] ?? 0.1);
      openCount += 1;
    }
    const wonAt = l.history.find((h) => WON.has(h.stage))?.at;
    if (WON.has(l.stage) && wonAt?.startsWith(month)) {
      wonValue += value;
      wonCount += 1;
    }
  }
  return { open, weighted, openCount, wonValue, wonCount };
}

export interface HealthInput {
  /** Days the oldest thing has waited on the client (0 when nothing waits). */
  waitingDays: number;
  overdue: number;
  scripts: number;
  approved: number;
  nextShoot: string | null;
  /** Days since the client last did anything (null: never). */
  quietDays: number | null;
}

export interface Health {
  score: number;
  tone: "good" | "watch" | "risk";
  reasons: string[];
}

/** 100 is a client in great shape. Each problem takes points off and says why. */
export function clientHealth(h: HealthInput): Health {
  let score = 100;
  const reasons: string[] = [];
  if (h.overdue > 0) {
    score -= 35;
    reasons.push("an invoice is overdue");
  }
  if (h.waitingDays >= 7) {
    score -= 25;
    reasons.push(`waiting on them ${h.waitingDays} days`);
  } else if (h.waitingDays >= 3) {
    score -= 10;
    reasons.push(`waiting on them ${h.waitingDays} days`);
  }
  if (h.quietDays === null || h.quietDays >= 14) {
    score -= 15;
    reasons.push(
      h.quietDays === null ? "never active in their space" : `quiet for ${h.quietDays} days`,
    );
  }
  if (h.scripts > 0 && h.approved === 0) {
    score -= 10;
    reasons.push("no script approved yet");
  }
  if (!h.nextShoot) {
    score -= 10;
    reasons.push("no shoot planned");
  }
  score = Math.max(0, score);
  return { score, tone: score >= 75 ? "good" : score >= 50 ? "watch" : "risk", reasons };
}

export interface WeekNumbers {
  lang: "en" | "fr";
  cashIn: number;
  owed: number;
  wonCount: number;
  wonValue: number;
  newLeads: number;
  approvals: number;
  shoots: number;
  goal: number | null;
}

const dt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DT`;

/** A short report to paste in WhatsApp or send the team, from this week's numbers. */
export function weeklyReport(w: WeekNumbers): string {
  const pct = w.goal ? Math.round((w.cashIn / w.goal) * 100) : null;
  if (w.lang === "fr")
    return [
      "Gecko · point de la semaine",
      `• Encaissé ce mois : ${dt(w.cashIn)}${pct !== null ? ` (${pct} % de l'objectif)` : ""}`,
      `• À encaisser : ${dt(w.owed)}`,
      `• Signés ce mois : ${w.wonCount} (${dt(w.wonValue)})`,
      `• Nouveaux leads (7 j) : ${w.newLeads}`,
      `• Validations clients (7 j) : ${w.approvals}`,
      `• Tournages à venir : ${w.shoots}`,
    ].join("\n");
  return [
    "Gecko · this week",
    `• Cash in this month: ${dt(w.cashIn)}${pct !== null ? ` (${pct}% of goal)` : ""}`,
    `• Still owed: ${dt(w.owed)}`,
    `• Signed this month: ${w.wonCount} (${dt(w.wonValue)})`,
    `• New leads (7 days): ${w.newLeads}`,
    `• Client approvals (7 days): ${w.approvals}`,
    `• Shoots coming up: ${w.shoots}`,
  ].join("\n");
}
