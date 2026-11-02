import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { InvoiceSheet } from "@/features/invoices/InvoiceSheet";
import { useMyInvoices } from "@/features/invoices/invoicesApi";
import {
  kindLabel,
  longDate,
  money,
  STATUS,
  statusOf,
  type Invoice,
} from "@/features/invoices/model";
import { printInvoice } from "@/features/invoices/printInvoice";
import { friendlyError } from "@/lib/errors";
import { getLang, t } from "@/lib/i18n";
import { seesMoney, useClientRole } from "./role";

const status = (invoice: Invoice) => STATUS[statusOf(invoice)][getLang() === "fr" ? 1 : 0];

/** Money: every invoice Gecko has sent, what's paid and what's still to pay. Owners and finance only. */
export function MoneyTab({ portal }: { portal: ClientPortal }) {
  const role = useClientRole();
  const { invoiceId } = useParams();
  const allowed = seesMoney(role);
  const invoices = useMyInvoices(
    { workspaceId: portal.workspaceId, clientId: portal.clientId },
    allowed,
  );

  if (!allowed)
    return (
      <Notice>
        {t(
          "Invoices are for your owner and finance people. Ask your owner if you need to see them.",
          "Les factures sont réservées au responsable et aux finances. Demandez à votre responsable si vous en avez besoin.",
        )}
      </Notice>
    );
  if (invoices.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (invoices.isError) return <Notice tone="error">{friendlyError(invoices.error)}</Notice>;

  if (invoiceId) {
    const invoice = invoices.data.find((i) => i.id === invoiceId);
    if (!invoice)
      return (
        <Notice>
          {t("This invoice isn't here.", "Cette facture n'est pas là.")}{" "}
          <Link to="/money">{t("All invoices", "Toutes les factures")}</Link>
        </Notice>
      );
    return (
      <section className="tab-body">
        <div className="inv-toolbar no-print">
          <Link to="/money" className="small">
            ← {t("All invoices", "Toutes les factures")}
          </Link>
          <Button onClick={() => printInvoice(invoice)}>
            {t("Download PDF", "Télécharger en PDF")}
          </Button>
        </div>
        <InvoiceSheet invoice={invoice} />
      </section>
    );
  }

  const lang = getLang();
  const open = invoices.data.filter((i) => i.status === "sent");
  const due = open.reduce((sum, i) => sum + Number(i.total), 0);
  const late = open.filter((i) => i.overdue);
  return (
    <section className="tab-body">
      <p className="lede">
        {t(
          "Every invoice from Gecko, with what's paid and what's left. Open one to download it as a PDF.",
          "Toutes les factures de Gecko, ce qui est réglé et ce qui reste. Ouvrez-en une pour la télécharger en PDF.",
        )}
      </p>
      {open.length > 0 && (
        <div className={`money-due${late.length ? " late" : ""}`}>
          <strong>{money(due, lang)}</strong>
          <span>
            {late.length
              ? t(
                  `to pay, ${late.length === 1 ? "one invoice is" : `${late.length} invoices are`} past due`,
                  `à régler, dont ${late.length === 1 ? "une facture en retard" : `${late.length} factures en retard`}`,
                )
              : t(
                  `to pay, next due ${longDate(open.map((i) => i.dueDate).sort()[0], lang)}`,
                  `à régler, prochaine échéance le ${longDate(open.map((i) => i.dueDate).sort()[0], lang)}`,
                )}
          </span>
        </div>
      )}
      {invoices.data.length === 0 ? (
        <p className="muted">
          {t(
            "No invoices yet. The first one shows up here when Gecko sends it.",
            "Pas encore de facture. La première s'affiche ici dès que Gecko l'envoie.",
          )}
        </p>
      ) : (
        <ul className="invoice-list">
          {invoices.data.map((invoice) => (
            <li key={invoice.id}>
              <Link to={`/money/${invoice.id}`} className={`invoice-row is-${statusOf(invoice)}`}>
                <span className="invoice-row-main">
                  <strong>{invoice.number}</strong>
                  <span className="small muted" dir="auto">
                    {[
                      kindLabel(invoice.kind, lang),
                      invoice.title,
                      longDate(invoice.issueDate, lang),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="invoice-row-total">{money(invoice.total, lang)}</span>
                <span className="invoice-status">
                  {status(invoice)}
                  {invoice.status === "sent" && (
                    <span className="small muted">
                      {" "}
                      · {t("due", "échéance")} {longDate(invoice.dueDate, lang)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
