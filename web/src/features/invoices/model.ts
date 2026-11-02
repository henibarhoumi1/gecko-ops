import type { Lang } from "@/lib/i18n";

export type InvoiceKind = "deposit" | "balance" | "month" | "extra";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceLine {
  label: string;
  detail?: string;
  qty: number;
  unit: number;
  /** Rate taxes (VAT) apply to taxed lines only. Costs paid on the client's behalf default to untaxed. */
  taxed?: boolean;
  /** The talent, location or prop this line bills, from Production. */
  optionId?: string;
  was?: string;
}

export interface TaxLine {
  label: string;
  kind: "rate" | "fixed";
  value: number;
  /** Filled in on invoices: what this line comes to. */
  amount?: number;
}

export interface Party {
  name?: string;
  address?: string;
  taxId?: string;
  email?: string;
  contact?: string;
  payment?: string;
}

export interface Invoice {
  id: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  number: string | null;
  lang: Lang;
  title: string;
  issueDate: string;
  dueDate: string;
  overdue: boolean;
  billTo: Party;
  seller: Party;
  lines: InvoiceLine[];
  taxes: TaxLine[];
  note: string;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  sentAt: string | null;
  paidOn: string | null;
  paidHow: string;
  voidedAt: string | null;
  voidReason: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSettings {
  legalName: string;
  address: string;
  taxId: string;
  contact: string;
  payment: string;
  dueDays: number;
  taxes: TaxLine[];
  taxesCheckedBy: string;
  taxesCheckedAt: string | null;
}

export interface OpenCost {
  id: string;
  kind: "talent" | "location" | "prop";
  name: string;
  role: string;
  cost: number | string;
  status: string;
}

export interface TeamInvoices {
  settings: InvoiceSettings;
  plan: string | null;
  price: number | string | null;
  campaign: string;
  depositStatus: string | null;
  balanceStatus: string | null;
  openCosts: OpenCost[];
  invoices: Invoice[];
}

/** Millimes: three decimals, rounded half away from zero like the database. */
const round3 = (n: number) => (Math.sign(n) * Math.round(Math.abs(n) * 1000)) / 1000;

export const lineAmount = (line: InvoiceLine) => round3(Number(line.qty) * Number(line.unit));

/** The same sums the database makes, for the draft on screen. */
export function totals(lines: InvoiceLine[], taxes: TaxLine[]) {
  const subtotal = round3(lines.reduce((sum, l) => sum + lineAmount(l), 0));
  const base = round3(
    lines.filter((l) => l.taxed !== false).reduce((s, l) => s + lineAmount(l), 0),
  );
  const rows = taxes.map((tx) => ({
    ...tx,
    amount: tx.kind === "rate" ? round3((base * Number(tx.value)) / 100) : round3(Number(tx.value)),
  }));
  const taxTotal = round3(rows.reduce((s, r) => s + r.amount, 0));
  return { subtotal, taxTotal, total: round3(subtotal + taxTotal), rows };
}

/** 1 500,000 DT in French, 1,500.000 DT in English: Tunisian amounts keep their millimes. */
export function money(amount: number | string | null | undefined, lang: Lang): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} DT`;
}

/** 2 November 2026 / 2 novembre 2026, in the invoice's language rather than the screen's. */
export function longDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const KIND: Record<InvoiceKind, [string, string]> = {
  deposit: ["Deposit", "Acompte"],
  balance: ["Balance", "Solde"],
  month: ["Monthly", "Mensuelle"],
  extra: ["Invoice", "Facture"],
};

export const kindLabel = (kind: InvoiceKind, lang: Lang) => KIND[kind][lang === "fr" ? 1 : 0];

/** Where an invoice stands, in the reader's words. Overdue is a sent invoice past its due date. */
export function statusOf(invoice: Pick<Invoice, "status" | "overdue">) {
  return invoice.status === "sent" && invoice.overdue ? "overdue" : invoice.status;
}

export const STATUS: Record<"draft" | "sent" | "paid" | "void" | "overdue", [string, string]> = {
  draft: ["Draft", "Brouillon"],
  sent: ["To pay", "À régler"],
  paid: ["Paid", "Réglée"],
  void: ["Cancelled", "Annulée"],
  overdue: ["Overdue", "En retard"],
};

/** Invoices the client still has to pay. */
export const unpaid = (invoices: Invoice[]) => invoices.filter((i) => i.status === "sent");

export function normaliseTeam(data: unknown): TeamInvoices {
  const d = (data ?? {}) as Partial<TeamInvoices>;
  return {
    settings: {
      legalName: "",
      address: "",
      taxId: "",
      contact: "",
      payment: "",
      dueDays: 7,
      taxes: [],
      taxesCheckedBy: "",
      taxesCheckedAt: null,
      ...(d.settings ?? {}),
    },
    plan: d.plan ?? null,
    price: d.price ?? null,
    campaign: d.campaign ?? "",
    depositStatus: d.depositStatus ?? null,
    balanceStatus: d.balanceStatus ?? null,
    openCosts: d.openCosts ?? [],
    invoices: d.invoices ?? [],
  };
}

/** What still blocks sending, in the order to fix it. Empty when an invoice can go. */
export function sendBlockers(settings: InvoiceSettings, invoice: Invoice): string[] {
  const out: string[] = [];
  if (!settings.taxesCheckedAt)
    out.push("The accountant hasn't checked the tax lines yet (Gecko's invoice details, below).");
  if (!settings.legalName.trim() || !settings.payment.trim())
    out.push("Gecko's legal name and how to pay are missing (Gecko's invoice details, below).");
  if (!invoice.billTo.name?.trim()) out.push("Who it's billed to is empty.");
  if (invoice.lines.length === 0 || Number(invoice.total) <= 0) out.push("It has nothing to bill.");
  return out;
}
