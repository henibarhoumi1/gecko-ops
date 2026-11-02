import { Logo } from "@/components/Logo";
import type { Lang } from "@/lib/i18n";
import {
  kindLabel,
  lineAmount,
  longDate,
  money,
  statusOf,
  totals,
  type Invoice,
  type Party,
} from "./model";

/** Words on the invoice follow the invoice's language, whatever language the screen is in. */
const W = {
  invoice: ["Invoice", "Facture"],
  draft: ["Draft, not sent", "Brouillon, non envoyée"],
  from: ["From", "Émetteur"],
  to: ["Billed to", "Facturé à"],
  taxId: ["Tax ID", "Matricule fiscal"],
  issued: ["Date", "Date"],
  due: ["Due", "Échéance"],
  item: ["Description", "Désignation"],
  qty: ["Qty", "Qté"],
  unit: ["Unit price", "Prix unitaire"],
  amount: ["Amount", "Montant"],
  subtotal: ["Subtotal", "Total HT"],
  total: ["Total to pay", "Total à payer"],
  untaxed: ["not subject to VAT", "hors TVA"],
  pay: ["How to pay", "Règlement"],
  paid: ["Paid on", "Réglée le"],
  cancelled: ["Cancelled", "Annulée"],
  thanks: ["Thank you for working with Gecko.", "Merci de travailler avec Gecko."],
} as const;

const w = (key: keyof typeof W, lang: Lang) => W[key][lang === "fr" ? 1 : 0];

function PartyBlock({ title, party, lang }: { title: string; party: Party; lang: Lang }) {
  return (
    <div className="inv-party">
      <span className="inv-label">{title}</span>
      <strong dir="auto">{party.name || "—"}</strong>
      {party.address && (
        <span dir="auto" className="inv-pre">
          {party.address}
        </span>
      )}
      {party.taxId && (
        <span>
          {w("taxId", lang)} {party.taxId}
        </span>
      )}
      {party.contact && <span dir="auto">{party.contact}</span>}
      {party.email && <span>{party.email}</span>}
    </div>
  );
}

/**
 * The invoice as a page: what the client reads in Money and what prints as the PDF.
 * A draft shows Gecko's current details; a sent invoice shows the ones frozen when it was sent.
 */
export function InvoiceSheet({ invoice, seller }: { invoice: Invoice; seller?: Party }) {
  const lang = invoice.lang;
  const from = invoice.status === "draft" ? (seller ?? {}) : invoice.seller;
  // Drafts are summed here so edits show at once; sent invoices print what the database stored.
  const sums =
    invoice.status === "draft"
      ? totals(invoice.lines, invoice.taxes)
      : {
          subtotal: Number(invoice.subtotal),
          total: Number(invoice.total),
          rows: invoice.taxes,
        };
  const state = statusOf(invoice);
  const hasUntaxed = invoice.lines.some((l) => l.taxed === false);

  return (
    <article className={`invoice-sheet inv-${state}`} lang={lang}>
      <header className="inv-head">
        <Logo className="inv-logo" />
        <div className="inv-title">
          <h1>
            {w("invoice", lang)}
            {invoice.kind !== "extra" && (
              <span className="inv-kind"> · {kindLabel(invoice.kind, lang)}</span>
            )}
          </h1>
          <p className="inv-number">{invoice.number ?? w("draft", lang)}</p>
        </div>
      </header>

      {state === "paid" && (
        <p className="inv-stamp paid">
          {w("paid", lang)} {longDate(invoice.paidOn, lang)}
        </p>
      )}
      {state === "void" && <p className="inv-stamp void">{w("cancelled", lang)}</p>}

      <div className="inv-parties">
        <PartyBlock title={w("from", lang)} party={from} lang={lang} />
        <PartyBlock title={w("to", lang)} party={invoice.billTo} lang={lang} />
        <dl className="inv-dates">
          <dt>{w("issued", lang)}</dt>
          <dd>{longDate(invoice.issueDate, lang)}</dd>
          <dt>{w("due", lang)}</dt>
          <dd>{longDate(invoice.dueDate, lang)}</dd>
        </dl>
      </div>

      {invoice.title && (
        <p className="inv-subject" dir="auto">
          {invoice.title}
        </p>
      )}

      <table className="inv-lines">
        <thead>
          <tr>
            <th>{w("item", lang)}</th>
            <th className="num">{w("qty", lang)}</th>
            <th className="num">{w("unit", lang)}</th>
            <th className="num">{w("amount", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i}>
              <td>
                <span dir="auto">{line.label}</span>
                {(line.detail || line.taxed === false) && (
                  <span className="inv-detail" dir="auto">
                    {[line.detail, hasUntaxed && line.taxed === false ? w("untaxed", lang) : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </td>
              <td className="num">{Number(line.qty).toLocaleString(lang)}</td>
              <td className="num">{money(line.unit, lang)}</td>
              <td className="num">{money(lineAmount(line), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="inv-totals">
        <dt>{w("subtotal", lang)}</dt>
        <dd>{money(sums.subtotal, lang)}</dd>
        {sums.rows.map((tx, i) => (
          <div key={i} className="inv-tax">
            <dt dir="auto">
              {tx.label}
              {tx.kind === "rate" && ` ${Number(tx.value).toLocaleString(lang)} %`}
            </dt>
            <dd>{money(tx.amount, lang)}</dd>
          </div>
        ))}
        <div className="inv-grand">
          <dt>{w("total", lang)}</dt>
          <dd>{money(sums.total, lang)}</dd>
        </div>
      </dl>

      {invoice.note && (
        <p className="inv-note inv-pre" dir="auto">
          {invoice.note}
        </p>
      )}

      <footer className="inv-foot">
        {from.payment && (
          <div>
            <span className="inv-label">{w("pay", lang)}</span>
            <p className="inv-pre" dir="auto">
              {from.payment}
            </p>
          </div>
        )}
        <p className="inv-thanks">{w("thanks", lang)}</p>
      </footer>
    </article>
  );
}
