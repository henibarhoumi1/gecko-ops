/* GECKO Ops · module: finance (Money). Invoices, partner share, month close, the auto-entrepreneur cap.
   All money rules come from GK.m; this file only adds them up for display. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    fi_title: ["Finance", "Finance"], fi_accent: ["", ""],
    fi_sub: ["Cash, invoices, quotes, overheads, the 13-week forecast, the month close and the yearly cap.", "Trésorerie, factures, devis, charges, prévision à 13 semaines, clôture du mois et plafond annuel."],
    fi_tab_overview: ["Overview", "Vue d'ensemble"], fi_tab_more: ["More", "Plus"], fi_tab_invoices: ["Invoices", "Factures"], fi_tab_quotes: ["Quotes", "Devis"], fi_tab_expenses: ["Expenses", "Dépenses"],
    fi_tab_forecast: ["Cash forecast", "Prévision"], fi_tab_close: ["Month close", "Clôture du mois"], fi_tab_profit: ["Profitability", "Rentabilité"],
    fi_tab_cap: ["Tax and cap", "Taxes et plafond"], fi_tab_commission: ["Commission", "Commission"], fi_tab_export: ["Export", "Export"],
    fi_founder_only: ["Only the owner can change invoices and payments.", "Seul le fondateur peut modifier les factures et les paiements."],
    fi_acct: ["Accountant to confirm.", "À confirmer par le comptable."],
    fi_estimate: ["estimate", "estimation"],
    // kpis
    fi_k_collect: ["To collect", "À encaisser"], fi_k_collect_n: ["{n} open invoices", "{n} factures ouvertes"], fi_k_collect_1: ["1 open invoice", "1 facture ouverte"],
    fi_k_overdue: ["Overdue", "En retard"], fi_k_overdue_n: ["{n} invoices", "{n} factures"], fi_k_overdue_1: ["1 invoice", "1 facture"],
    fi_k_month: ["Received this month", "Encaissé ce mois"], fi_k_month_n: ["net, plus {w} withheld", "net, plus {w} retenus"],
    fi_k_cap: ["Cap used", "Plafond utilisé"], fi_k_cap_n: ["{a} of {b}", "{a} sur {b}"],
    // invoices list
    fi_new: ["New invoice", "Nouvelle facture"], fi_f_open: ["Open", "Ouvertes"], fi_f_all: ["All", "Toutes"], fi_f_drafts: ["Drafts", "Brouillons"], fi_f_overdue: ["Overdue", "En retard"],
    fi_c_no: ["Number", "Numéro"], fi_c_client: ["Client", "Client"], fi_c_label: ["Label", "Libellé"], fi_c_kind: ["Kind", "Type"], fi_c_amount: ["Amount", "Montant"],
    fi_c_total: ["Total incl. stamp", "Total avec timbre"], fi_c_paid: ["Paid", "Payé"], fi_c_balance: ["Balance", "Reste"], fi_c_status: ["Status", "Statut"], fi_c_due: ["Due", "Échéance"],
    fi_draft: ["Draft", "Brouillon"], fi_late_since: ["overdue since {d}", "en retard depuis le {d}"], fi_drafts_out: ["Totals leave out drafts.", "Les totaux ne comptent pas les brouillons."], fi_none_filter: ["No invoices here.", "Aucune facture ici."],
    fi_paid_note: ["Paid counts the money received plus the tax withheld by the client.", "Payé compte l'argent reçu plus la retenue à la source du client."],
    // form
    fi_f_client: ["Client", "Client"], fi_f_project: ["Project", "Projet"], fi_f_noproject: ["No project", "Sans projet"], fi_f_kind: ["Kind", "Type"],
    fi_f_label: ["Label", "Libellé"], fi_f_amount: ["Amount (TND, before stamp)", "Montant (TND, hors timbre)"], fi_f_stamp: ["Stamp duty (TND)", "Droit de timbre (TND)"],
    fi_f_stamp_h: ["Droit de timbre, per invoice. Accountant to confirm.", "Droit de timbre, par facture. À confirmer par le comptable."],
    fi_f_extra_h: ["Studio, talent and ad spend: invoice it here only if GECKO really sells it.", "Studio, talent et budget pub : facturez ici seulement si GECKO le vend vraiment."],
    fi_f_extra_direct: ["Your rule: the supplier invoices the client directly, so extras stay out of your cap. Best not to invoice this here. If you must, keep it as a pass-through at cost.", "Votre règle : le fournisseur facture le client directement, pour que les extras restent hors plafond. Mieux vaut ne pas facturer ici. Si vous devez le faire, gardez-le en débours, au prix coûtant."],
    fi_f_pass: ["Pass-through at cost (débours): not counted in the cap", "Débours au prix coûtant : hors plafond"],
    fi_f_pass_h: ["Re-billed exactly at the supplier's price, with their invoice kept. Accountant to confirm.", "Refacturé exactement au prix du fournisseur, avec sa facture conservée. À confirmer par le comptable."],
    fi_new_title: ["New", "Nouvelle"], fi_new_accent: ["invoice", "facture"], fi_edit_title: ["Edit", "Modifier"], fi_edit_accent: ["draft", "brouillon"],
    fi_save_draft: ["Save draft", "Enregistrer le brouillon"], fi_no_clients: ["Add a client first.", "Ajoutez d'abord un client."],
    fi_amount_pos: ["Enter an amount above zero.", "Entrez un montant supérieur à zéro."],
    // detail
    fi_back: ["All invoices", "Toutes les factures"], fi_issued_on: ["Issued", "Émise le"], fi_due_on: ["Due", "Échéance"], fi_stamp: ["Stamp duty", "Droit de timbre"],
    fi_total: ["Total", "Total"], fi_balance: ["Balance", "Reste à payer"], fi_received_net: ["Received (net)", "Reçu (net)"], fi_withheld: ["Withheld", "Retenue"],
    fi_project: ["Project", "Projet"], fi_locked: ["Issued invoices are locked. To change one, cancel it with a credit note and issue a new one.", "Une facture émise est verrouillée. Pour la changer, annulez-la par un avoir et émettez-en une nouvelle."],
    fi_issue: ["Issue invoice", "Émettre la facture"], fi_issue_q: ["Issue this invoice?", "Émettre cette facture ?"],
    fi_issue_body: ["It gets the next safely reserved number when confirmed, is dated today and due {due}. After this the amount, client and label are locked.", "Elle reçoit le prochain numéro réservé sans doublon à la confirmation, est datée d'aujourd'hui et payable le {due}. Ensuite montant, client et libellé sont verrouillés."],
    fi_issued_toast: ["Issued {no}", "Facture {no} émise"],
    fi_number_error: ["Invoice not issued: {e}", "Facture non émise : {e}"],
    fi_no_taxid: ["This client has no tax ID on file. You can still issue, but company clients usually need it on the invoice.", "Ce client n'a pas de matricule fiscal enregistré. Vous pouvez émettre, mais les sociétés en ont en général besoin sur la facture."],
    fi_open_settings: ["Open settings", "Ouvrir les réglages"],
    fi_del_draft: ["Delete draft", "Supprimer le brouillon"], fi_del_q: ["Delete this draft?", "Supprimer ce brouillon ?"], fi_del_body: ["It was never issued, so no number is lost.", "Il n'a jamais été émis, aucun numéro n'est perdu."],
    fi_deleted: ["Draft deleted", "Brouillon supprimé"],
    fi_doc_btn: ["Invoice document", "Document de facture"],
    fi_pay: ["Record payment", "Enregistrer un paiement"], fi_payments: ["Payments", "Paiements"], fi_no_payments: ["No payment yet.", "Aucun paiement pour l'instant."],
    fi_p_date: ["Date", "Date"], fi_p_net: ["Net received (TND)", "Net reçu (TND)"], fi_p_wh: ["Withheld by client (TND)", "Retenue à la source (TND)"],
    fi_p_wh_h: ["Company clients often keep {p}% of the amount and pay it to the tax office for you. Accountant to confirm.", "Les sociétés gardent souvent {p} % du montant et le versent au fisc pour vous. À confirmer par le comptable."],
    fi_p_wh_none: ["No tax ID on file for this client, so usually nothing is withheld.", "Pas de matricule fiscal pour ce client, donc en général pas de retenue."],
    fi_p_method: ["Method", "Moyen"], fi_p_ref: ["Reference", "Référence"], fi_p_ref_ph: ["Transfer ref, cheque no.", "Réf. virement, n° de chèque"],
    fi_m_transfer: ["Bank transfer", "Virement"], fi_m_cash: ["Cash", "Espèces"], fi_m_cheque: ["Cheque", "Chèque"], fi_m_d17: ["D17 / Flouci", "D17 / Flouci"],
    fi_pay_title: ["Record", "Enregistrer"], fi_pay_accent: ["payment", "paiement"], fi_pay_left: ["Balance left: {b}", "Reste à payer : {b}"],
    fi_lead_sync_error: ["Payment was saved, but the linked lead status could not be updated. Reopen the project to retry reconciliation.", "Paiement enregistré, mais le statut du prospect lié n'a pas pu être mis à jour. Rouvrez le projet pour réessayer."],
    fi_overpay: ["That's more than the balance ({b}). Check the amounts.", "C'est plus que le reste à payer ({b}). Vérifiez les montants."],
    fi_pay_zero: ["Enter what you received.", "Entrez ce que vous avez reçu."], fi_pay_saved: ["Payment recorded", "Paiement enregistré"],
    fi_pay_rm: ["Remove", "Retirer"], fi_pay_rm_q: ["Remove this payment?", "Retirer ce paiement ?"], fi_pay_rm_body: ["{a} received on {d}. The invoice balance goes back up.", "{a} reçus le {d}. Le reste à payer remonte."],
    fi_pay_removed: ["Payment removed", "Paiement retiré"],
    fi_credit: ["Cancel with a credit note", "Annuler par un avoir"], fi_credit_q: ["Cancel this invoice with a credit note?", "Annuler cette facture par un avoir ?"],
    fi_credit_body: ["A credit note for {a} is issued today with the next safely reserved number. {orig} stays on record as cancelled. If the client already paid, settle the refund with them.", "Un avoir de {a} est émis aujourd'hui avec le prochain numéro réservé sans doublon. {orig} reste enregistrée comme annulée. Si le client a déjà payé, réglez le remboursement avec lui."],
    fi_credit_label: ["Credit note for {no}", "Avoir sur {no}"], fi_credit_done: ["Credit note {no} issued", "Avoir {no} émis"],
    fi_credit_for: ["Cancels {no}", "Annule {no}"], fi_credited_by: ["Cancelled by credit note {no}", "Annulée par l'avoir {no}"],
    fi_history: ["History", "Historique"],
    // document
    fi_d_invoice: ["Invoice", "Facture"], fi_d_credit: ["Credit note", "Avoir"], fi_d_draft: ["Draft, not issued", "Brouillon, non émis"],
    fi_d_billed: ["Billed to", "Facturé à"], fi_d_taxid: ["Tax ID", "Matricule fiscal"], fi_d_mf: ["MF", "MF"],
    fi_d_desc: ["Description", "Désignation"], fi_d_amount: ["Amount", "Montant"], fi_d_subtotal: ["Subtotal", "Sous-total"],
    fi_d_paid: ["Payments received", "Paiements reçus"], fi_d_wh: ["incl. {w} withheld at source", "dont {w} de retenue à la source"],
    fi_d_terms: ["Payment within {n} days of the invoice date, by bank transfer, cash, cheque or D17.", "Paiement sous {n} jours à compter de la date de facture, par virement, espèces, chèque ou D17."],
    fi_d_copy: ["Copy as text", "Copier en texte"], fi_copy_fail: ["Couldn't copy. Select the text instead.", "Copie impossible. Sélectionnez le texte."],
    fi_d_title: ["Invoice", "Facture"], fi_d_accent: ["document", "document"],
    // commission
    fi_cm_proj: ["Brand · project", "Marque · projet"], fi_cm_received: ["Received", "Reçu"], fi_cm_costs: ["Costs", "Coûts"], fi_cm_profit: ["Profit", "Bénéfice"],
    fi_cm_amount: ["Commission", "Commission"], fi_cm_payable: ["Payable", "Exigible"], fi_cm_paid: ["Paid", "Payée"], fi_cm_owed: ["Owed", "Dû"],
    fi_cm_yes: ["Ready to pay", "Prête à payer"], fi_cm_wait: ["Waiting on client", "Attente client"], fi_cm_wait_dl: ["Waiting on delivery", "Attente livraison"], fi_cm_nocosts: ["No costs logged", "Aucun coût saisi"],
    fi_cm_nocosts_t: ["Log this project's costs first, or the commission is overstated.", "Saisissez d'abord les coûts du projet, sinon la commission est surestimée."],
    fi_cm_mark: ["Mark paid", "Marquer payée"], fi_cm_mark_q: ["Pay the partner share of {a}?", "Payer la part partenaire de {a} ?"],
    fi_cm_mark_body: ["For {p}. It's recorded as paid today.", "Pour {p}. Enregistré comme payé aujourd'hui."], fi_cm_done: ["Commission marked paid", "Commission marquée payée"],
    fi_cm_owed_now: ["Owed now", "Dû maintenant"], fi_cm_paid_year: ["Paid this year", "Payé cette année"], fi_cm_pending: ["Not payable yet", "Pas encore exigible"],
    fi_cm_note: ["{p}% of project profit on projects covered by the partner share rules (first clients, or clients the partner brought alone). Profit is what the client paid (tax withheld counts as paid, stamp duty left out) minus costs. It becomes payable once the client has paid in full and the work is delivered: before that, costs are only estimates.", "{p} % du bénéfice des projets couverts par les règles de la part partenaire (premiers clients, ou clients apportés seul par le partenaire). Bénéfice = ce que le client a payé (la retenue compte comme payée, le timbre est exclu) moins les coûts. Exigible une fois que le client a tout payé et que le travail est livré : avant, les coûts ne sont que des estimations."],
    fi_cm_none: ["No projects with a partner share yet.", "Pas encore de projet avec une part partenaire."], fi_total_row: ["Total", "Total"],
    // month close
    fi_mc_month: ["Month", "Mois"], fi_mc_in: ["Money in", "Entrées"], fi_mc_out: ["Money out", "Sorties"],
    fi_mc_net: ["Payments received (net)", "Paiements reçus (net)"], fi_mc_wh: ["Withheld by clients (tax credit)", "Retenues des clients (crédit d'impôt)"],
    fi_mc_in_total: ["Total in", "Total entrées"], fi_mc_costs: ["Project costs, shoots this month", "Coûts projets, tournages du mois"],
    fi_mc_salary: ["Owner salary", "Salaire du fondateur"], fi_mc_comm: ["Commissions paid", "Commissions payées"], fi_mc_out_total: ["Total out", "Total sorties"],
    fi_mc_reserve: ["Reserve, {p}% of money in", "Réserve, {p} % des entrées"], fi_mc_left: ["Left after reserve", "Reste après réserve"],
    fi_mc_invoiced: ["Invoiced this month (before stamp, credit notes deducted)", "Facturé ce mois (hors timbre, avoirs déduits)"],
    fi_mc_nocosts: ["no costs logged", "aucun coût saisi"],
    fi_mc_note: ["Money in includes tax withheld (a tax credit, not cash). Costs are the logged project costs of this month's shoots. Estimate.", "Les entrées comptent la retenue à la source (un crédit d'impôt, pas de la trésorerie). Les coûts sont ceux saisis pour les tournages du mois. Estimation."],
    fi_mc_six: ["Last 6 months", "6 derniers mois"], fi_mc_c_in: ["In", "Entrées"], fi_mc_c_out: ["Out", "Sorties"], fi_mc_c_left: ["Left", "Reste"],
    fi_mc_statement: ["Statement", "Relevé"],
    fi_mc_formula: ["Left = total in − total out − reserve.", "Reste = entrées − sorties − réserve."],
    // cap
    fi_cap_used: ["Invoiced this year", "Facturé cette année"], fi_cap_room: ["Room left", "Marge restante"],
    fi_cap_months: ["Months left", "Mois restants"], fi_cap_months_n: ["after {m}", "après {m}"],
    fi_cap_avg: ["Average per month", "Moyenne par mois"], fi_cap_avg_n: ["since {m}", "depuis {m}"],
    fi_cap_proj: ["Projected year-end", "Projection fin d'année"], fi_cap_proj_n: ["{p}% of the cap", "{p} % du plafond"],
    fi_cap_alert: ["Talk to the accountant about switching to a company", "Parlez au comptable du passage en société"],
    fi_cap_soon: ["At this pace you pass 80% of the cap this year. Talk to the accountant about switching to a company.", "À ce rythme vous dépassez 80 % du plafond cette année. Parlez au comptable du passage en société."],
    fi_cap_note: ["Auto-entrepreneur cap: {c} invoiced a year, counted by invoice date, before stamp duty. Credit notes reduce it. Accountant to confirm.", "Plafond auto-entrepreneur : {c} facturés par an, par date de facture, hors timbre. Les avoirs le réduisent. À confirmer par le comptable."],
    fi_cap_bymonth: ["By month", "Par mois"], fi_cap_running: ["Running", "Cumul"], fi_cap_extras: ["Extras through GECKO", "Extras facturés par GECKO"], fi_cap_pass: ["Pass-through extras, left out of the cap", "Débours, hors plafond"],
    fi_cap_extras_note: ["These extras count against the cap. By default studio, talent and ad spend should be invoiced by the supplier directly to the client.", "Ces extras comptent dans le plafond. Par défaut, studio, talent et budget pub sont facturés par le fournisseur directement au client."],
    fi_cap_extras_none: ["No extras invoiced through GECKO this year. Good: they don't eat the cap.", "Aucun extra facturé par GECKO cette année. Bien : ils ne mangent pas le plafond."],
    fi_cap_year: ["Year", "Année"],
    // activity log (stored in the language of whoever writes it)
    fi_log_created: ["Draft created", "Brouillon créé"], fi_log_edited: ["Draft edited", "Brouillon modifié"], fi_log_issued: ["Issued {no}", "Émise {no}"],
    fi_log_pay: ["Payment {a} ({d})", "Paiement {a} ({d})"], fi_log_pay_rm: ["Payment removed ({d})", "Paiement retiré ({d})"],
    fi_log_credit: ["Credit note {no} for {orig}", "Avoir {no} sur {orig}"], fi_log_credited: ["Cancelled by credit note {no}", "Annulée par l'avoir {no}"],
    fi_log_comm: ["Commission paid {a}", "Commission payée {a}"], fi_cap_pct: ["{p}% used", "{p} % utilisé"]
  });

  // ---------- helpers ----------
  var KINDS_NEW = ["deposit", "balance", "month", "extra"];
  var METHODS = ["transfer", "cash", "cheque", "d17"];
  function r3(n) { return Math.round((+n || 0) * 1000) / 1000; }
  /** Money in whole dinars: totals, commission, month close, cap. */
  function fm(n) { return u.money(Math.round(+n || 0)); }
  /** One invoice or payment amount: whole dinars, or up to 2 decimals only when it has a fraction (728.5 -> "728.5 TND"). */
  function fmP(n) { var v = Math.round((+n || 0) * 100) / 100; return u.money(v, v % 1 === 0 ? 0 : Math.round(v * 10) === v * 10 ? 1 : 2); }
  /** " : " in French, ": " in English. */
  function colon() { return u.fr() ? "\u00a0: " : ": "; }
  function dueText(i) { return m.invStatus(i) === "overdue" ? t("fi_late_since", { d: u.fmtDate(i.due) }) : u.fmtDate(i.due); }
  /** Turnover against the cap. Core m.capUsed already leaves out pass-through extras (débours). */
  function passOf(year) { return invoices().filter(function (i) { return i.no && i.kind === "extra" && i.passThrough && u.year(i.issued) === year; }); }
  function capUsed(year) { return m.capUsed(year || u.year(u.today())); }
  function canW() { return m.can("*"); }
  function wBtn(label, a, o) {
    o = o || {};
    if (!canW()) { o.disabled = true; o.title = t("fi_founder_only"); }
    return ui.btn(label, a, o);
  }
  function P() { return ui.p("finance"); }
  function isOpen(i) { var s = m.invStatus(i); return s === "issued" || s === "partial" || s === "overdue"; }
  function addMonths(ym, n) { var y = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1 + n; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + "-" + String(mo + 1).padStart(2, "0"); }
  function invoices() { return S.all("invoices"); }
  function kindLabel(k) { return t("k_" + (k || "deposit")); }
  function longDate(s) { return u.fmtDate(s, { day: "numeric", month: "long", year: "numeric" }); }
  function shortDate(s) { return u.fmtDate(s, { day: "numeric", month: "short", year: "numeric" }); }
  function allocateInvoiceNo(write, stillCurrent) {
    if (!window.navigator || !window.navigator.locks || typeof window.navigator.locks.request !== "function") {
      return Promise.reject(new Error("This browser does not support cross-tab invoice numbering. Use a current browser with Web Locks."));
    }
    return window.navigator.locks.request("gecko-ops-invoice-number", function () {
      if (stillCurrent && !stillCurrent()) return null;
      var no = S.reserveInvoiceNo(u.year(u.today()));
      var result = write(no);
      if (!result) throw new Error("The invoice record could not be updated.");
      if (S.flush() === false) throw new Error("The invoice number was reserved, but the record could not be saved locally.");
      return { no: no, value: result };
    });
  }
  function syncLeadPayment(invoice) {
    if (!invoice || !invoice.projectId) return;
    var result = m.syncLeadPayment(invoice.projectId);
    if (!result.ok) ui.toast(t("fi_lead_sync_error"));
  }

  // ---------- money per month ----------
  /** First month with any money activity: the salary only counts from then on (same rule as GK.x.monthly). */
  function firstMonth() {
    var ds = [];
    invoices().forEach(function (i) { if (i.issued) ds.push(i.issued); });
    S.all("projects").forEach(function (p) { if (p.shootDate) ds.push(p.shootDate); });
    S.all("expenses").forEach(function (e) { if (e.date) ds.push(e.date); });
    return ds.length ? u.month(ds.sort()[0]) : u.month(u.today());
  }
  function monthFigures(ym) {
    var r = m.rules();
    var net = 0, wh = 0, invoiced = 0;
    invoices().forEach(function (i) {
      (i.payments || []).forEach(function (p) {
        if (u.month(p.date) === ym) {
          net += m.toTND(+p.net || 0, i.currency || "TND");
          wh += m.toTND(+p.withheld || 0, i.currency || "TND");
        }
      });
      if (u.month(i.issued) === ym) invoiced += m.invoiceTurnover(i);
    });
    var linkedExpenses = GK.x.expensesIn(ym).filter(function (e) { return e.projectId && m.project(e.projectId); });
    var costs = u.sum(linkedExpenses, function (e) { return +e.amount || 0; });
    var comm = S.all("projects").filter(function (p) { return p.payout && p.payout.paidOn && u.month(p.payout.paidOn) === ym; });
    var commPaid = u.sum(comm, function (p) { return +p.payout.amount || 0; });
    var over = GK.x.expensesIn(ym).filter(function (e) { return !e.projectId || !m.project(e.projectId); });
    var overheads = u.sum(over, function (e) { return +e.amount || 0; });
    var salary = ym >= firstMonth() ? +r.salary || 0 : 0;
    var inTot = r3(net + wh), outTot = r3(costs + overheads + salary + commPaid);
    var reserve = r3(inTot * r.reserve / 100);
    return { net: r3(net), wh: r3(wh), invoiced: r3(invoiced), projectExpenses: linkedExpenses, costs: r3(costs), over: over, overheads: r3(overheads), salary: salary, comm: comm, commPaid: r3(commPaid),
      inTot: inTot, outTot: outTot, reserve: reserve, left: r3(inTot - outTot - reserve) };
  }

  // ---------- page ----------
  var FIN = GK.fin = { tabs: {}, order: ["overview", "invoices", "quotes", "expenses", "forecast", "close", "profit", "cap", "commission", "export"] };
  function liveTabs() { return FIN.order.filter(function (k) { return FIN.tabs[k]; }); }
  var MAIN = ["overview", "invoices", "quotes", "expenses"];
  /** Four everyday tabs; the planning and year-end screens sit behind "More". */
  function tabsHTML(cur) {
    var live = liveTabs(), more = live.filter(function (k) { return MAIN.indexOf(k) < 0; }), inMore = more.indexOf(cur) > -1 || P().more;
    function tab(k, on, lab) { return '<button type="button" role="tab" data-a="fi-tab" data-tab="' + k + '" aria-selected="' + on + '">' + esc(lab || t("fi_tab_" + k)) + "</button>"; }
    var h = '<div class="tabs" role="tablist">' + live.filter(function (k) { return MAIN.indexOf(k) > -1; }).map(function (k) { return tab(k, cur === k && !inMore); }).join("") +
      (more.length ? '<button type="button" role="tab" data-a="fi-more" aria-selected="' + !!inMore + '">' + esc(t("fi_tab_more")) + "</button>" : "") + "</div>";
    if (inMore && more.length) h += '<div class="tabs fi-sub" role="tablist">' + more.map(function (k) { return tab(k, cur === k); }).join("") + "</div>";
    return h;
  }
  function kpisHTML() {
    var all = invoices(), open = all.filter(isOpen), over = all.filter(function (i) { return m.invStatus(i) === "overdue"; });
    var mf = monthFigures(u.month(u.today()));
    var r = m.rules(), used = capUsed();
    return ui.kpis([
      { lab: t("fi_k_collect"), v: fm(u.sum(open, m.invBalance)), n: open.length === 1 ? t("fi_k_collect_1") : t("fi_k_collect_n", { n: open.length }) },
      { lab: t("fi_k_overdue"), v: fm(u.sum(over, m.invBalance)), n: over.length === 1 ? t("fi_k_overdue_1") : t("fi_k_overdue_n", { n: over.length }) },
      { lab: t("fi_k_month"), v: fm(mf.net), n: t("fi_k_month_n", { w: fm(mf.wh) }) },
      { lab: t("fi_k_cap"), v: u.pct(r.cap ? used / r.cap * 100 : 0), n: t("fi_k_cap_n", { a: fm(used), b: fm(r.cap) }) }
    ]);
  }

  function render() {
    var p = P(), inv0 = p.invoiceId && S.get("invoices", p.invoiceId);
    // A new link to one invoice (from Today, Projects, a credit note) lands on it, on the invoices tab, with a filter that shows it.
    if (inv0 && p.seenInv !== inv0.id) {
      p.tab = "invoices";
      if (!matches(inv0, p.filter || "open")) p.filter = "all";
    }
    p.seenInv = inv0 ? inv0.id : "";
    var tab = liveTabs().indexOf(p.tab) > -1 ? p.tab : (FIN.tabs.overview ? "overview" : "invoices");
    var h = ui.head({ label: t("nav_finance"), title: t("fi_title"), accent: t("fi_accent"), sub: esc(t("fi_sub")) + " " + ui.sample(),
      actions: canW() ? ui.btn(t("fi_new"), "fi-new", { cls: "primary" }) : "" });
    h += tabsHTML(tab);
    if (tab === "invoices") h += kpisHTML() + (inv0 ? detailHTML(inv0) : listHTML());
    else h += FIN.tabs[tab].render();
    return h;
  }

  // ---------- invoices: list ----------
  function matches(i, f) {
    var s = m.invStatus(i);
    if (f === "drafts") return s === "draft";
    if (f === "overdue") return s === "overdue";
    if (f === "open") return isOpen(i);
    return true;
  }
  function listHTML() {
    var f = P().filter || "open";
    var rows = invoices().filter(function (i) { return matches(i, f); }).sort(function (a, b) {
      if (!a.no !== !b.no) return a.no ? 1 : -1;               // drafts first
      return (b.issued || "").localeCompare(a.issued || "") || (b.no || "").localeCompare(a.no || "");
    });
    var h = '<div class="row" role="group">' + ["open", "all", "drafts", "overdue"].map(function (k) {
      var n = invoices().filter(function (i) { return matches(i, k); }).length;
      return ui.btn(t("fi_f_" + k) + " · " + n, "fi-filter", { cls: "sm" + (f === k ? " primary" : ""), data: { f: k } });
    }).join("") + "</div>";
    if (!rows.length) return h + ui.empty(t("fi_none_filter"));
    h += '<div class="tbl"><table style="min-width:900px"><thead><tr><th>' + esc(t("fi_c_no")) + "</th><th>" + esc(t("fi_c_client")) + "</th><th>" + esc(t("fi_c_label")) + "</th><th>" + esc(t("fi_c_kind")) +
      '</th><th class="r">' + esc(t("fi_c_amount")) + '</th><th class="r">' + esc(t("fi_c_total")) + '</th><th class="r">' + esc(t("fi_c_paid")) + '</th><th class="r">' + esc(t("fi_c_balance")) +
      "</th><th>" + esc(t("fi_c_status")) + "</th><th>" + esc(t("fi_c_due")) + "</th></tr></thead><tbody>";
    rows.forEach(function (i) {
      var s = m.invStatus(i), bal = (s === "credited" || s === "credit") ? "—" : fmP(m.invBalance(i));
      h += '<tr class="click" tabindex="0" data-a="fi-open" data-id="' + esc(i.id) + '"><td class="code" style="word-break:normal;white-space:nowrap">' + (i.no ? esc(i.no) : '<span class="muted">' + esc(t("fi_draft")) + "</span>") + "</td>" +
        "<td>" + esc(m.brand(i.clientId)) + "</td><td>" + esc(i.label || "") + '</td><td class="small">' + esc(kindLabel(i.kind)) + "</td>" +
        '<td class="r num">' + fmP(i.amount) + '</td><td class="r num">' + fmP(m.invTotal(i)) + '</td><td class="r num">' + fmP(m.invPaidGross(i)) + '</td><td class="r num">' + bal + "</td>" +
        "<td>" + ui.invPill(i) + '</td><td class="small">' + esc(i.due ? dueText(i) : "—") + "</td></tr>";
    });
    // Drafts are not invoices yet: they stay out of the totals (except on the Drafts filter itself).
    var counted = f === "drafts" ? rows : rows.filter(function (i) { return !!i.no; }), open = counted.filter(isOpen);
    var hasDrafts = f !== "drafts" && counted.length < rows.length;
    h += '</tbody><tfoot><tr><td colspan="4">' + esc(t("fi_total_row")) + '</td><td class="r num">' + fm(u.sum(counted, function (i) { return i.amount; })) + '</td><td class="r num">' + fm(u.sum(counted, m.invTotal)) +
      '</td><td class="r num">' + fm(u.sum(counted, m.invPaidGross)) + '</td><td class="r num">' + fm(u.sum(open, m.invBalance)) + '</td><td colspan="2"></td></tr></tfoot></table></div>';
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_paid_note")) + (hasDrafts ? " " + esc(t("fi_drafts_out")) : "") + "</p>";
    return h;
  }

  // ---------- invoices: one ----------
  function fact(lab, val) { return '<div class="stack" style="gap:3px"><span class="lab sm muted">' + esc(lab) + '</span><span class="num">' + val + "</span></div>"; }
  function detailHTML(i) {
    var s = m.invStatus(i), c = m.client(i.clientId), proj = i.projectId ? m.project(i.projectId) : null, co = m.company();
    var dead = s === "credited" || s === "credit";
    var h = '<div class="row">' + ui.btn("← " + t("fi_back"), "fi-back", { cls: "ghost sm" }) + "</div>";
    h += '<section class="panel"><div class="panel-h"><div class="stack" style="gap:4px"><span class="lab sm muted">' + esc(kindLabel(i.kind)) + "</span>" +
      '<h2 class="sec">' + esc(i.no || t("fi_draft")) + " · " + esc(m.brand(i.clientId)) + "</h2></div>" + ui.invPill(i) + "</div>";
    h += '<div class="grid3" style="gap:14px">' +
      fact(t("fi_c_label"), esc(i.label || "—")) +
      fact(t("fi_project"), proj ? esc(m.projectLabel(proj)) : "—") +
      fact(t("fi_issued_on") + " · " + t("fi_due_on"), esc(i.issued ? shortDate(i.issued) : "—") + " · " + esc(i.due ? (s === "overdue" ? t("fi_late_since", { d: shortDate(i.due) }) : shortDate(i.due)) : "—")) +
      fact(t("fi_c_amount"), fmP(i.amount)) +
      fact(t("fi_stamp"), fmP(i.kind === "credit" ? 0 : i.stamp)) +
      fact(t("fi_total"), "<strong>" + fmP(m.invTotal(i)) + "</strong>") +
      fact(t("fi_received_net"), fmP(m.invPaidNet(i))) +
      fact(t("fi_withheld"), fmP(m.invWithheld(i))) +
      fact(t("fi_balance"), "<strong>" + (dead ? "—" : fmP(m.invBalance(i))) + "</strong>") +
      "</div>";
    if (i.creditFor) { var o = S.get("invoices", i.creditFor); h += '<div class="row small">' + esc(t("fi_credit_for", { no: o ? o.no : "—" })) + (o ? ui.btn(t("open"), "fi-open", { cls: "ghost sm", data: { id: o.id } }) : "") + "</div>"; }
    if (i.credited) { var cn = invoices().find(function (x) { return x.creditFor === i.id; }); h += '<div class="row small">' + esc(t("fi_credited_by", { no: cn ? cn.no : "—" })) + (cn ? ui.btn(t("open"), "fi-open", { cls: "ghost sm", data: { id: cn.id } }) : "") + "</div>"; }
    if (c && !c.taxId && !dead) h += '<p class="note" style="margin:0">' + esc(t("fi_no_taxid")) + "</p>";

    var a = [];
    if (s === "draft") {
      if (!co.mf) a.push(ui.btn(t("fi_issue"), "fi-issue", { cls: "primary", disabled: true, title: t("gate_mf") }));
      else a.push(wBtn(t("fi_issue"), "fi-issue", { cls: "primary", data: { id: i.id } }));
      a.push(wBtn(t("edit"), "fi-edit", { data: { id: i.id } }));
      a.push(wBtn(t("fi_del_draft"), "fi-del", { cls: "ghost", data: { id: i.id } }));
    } else if (!dead) {
      if (m.invBalance(i) > 0.0005) a.push(wBtn(t("fi_pay"), "fi-pay", { cls: "primary", data: { id: i.id } }));
      a.push(wBtn(t("fi_credit"), "fi-credit", { cls: "ghost", data: { id: i.id } }));
    }
    a.push(ui.btn(t("fi_doc_btn"), "fi-doc", { data: { id: i.id } }));
    h += '<div class="row">' + a.join("") + "</div>";
    if (s === "draft" && !co.mf) h += '<p class="gate" style="margin:0">' + esc(t("gate_mf")) + ' <button type="button" class="link" data-a="fi-settings">' + esc(t("fi_open_settings")) + "</button></p>";
    if (i.no) h += '<p class="small muted" style="margin:0">' + esc(t("fi_locked")) + "</p>";
    h += "</section>";

    if (i.no && i.kind !== "credit") {
      h += '<section class="stack"><h3 class="sec">' + esc(t("fi_payments")) + "</h3>";
      var pays = i.payments || [];
      if (!pays.length) h += ui.empty(t("fi_no_payments"));
      else {
        h += '<div class="tbl"><table style="min-width:620px"><thead><tr><th>' + esc(t("fi_p_date")) + '</th><th class="r">' + esc(t("fi_received_net")) + '</th><th class="r">' + esc(t("fi_withheld")) + '</th><th class="r">' + esc(t("fi_c_paid")) +
          "</th><th>" + esc(t("fi_p_method")) + "</th><th>" + esc(t("fi_p_ref")) + "</th><th></th></tr></thead><tbody>";
        pays.forEach(function (p, k) {
          h += "<tr><td>" + esc(shortDate(p.date)) + '</td><td class="r num">' + fmP(p.net) + '</td><td class="r num">' + fmP(p.withheld) + '</td><td class="r num">' + fmP((+p.net || 0) + (+p.withheld || 0)) +
            "</td><td>" + esc(METHODS.indexOf(p.method) > -1 ? t("fi_m_" + p.method) : (p.method || "—")) + '</td><td class="small">' + esc(p.ref || "") + '</td><td class="r">' +
            (canW() ? ui.btn(t("fi_pay_rm"), "fi-pay-rm", { cls: "ghost sm", data: { id: i.id, k: k } }) : "") + "</td></tr>";
        });
        h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + fmP(m.invPaidNet(i)) + '</td><td class="r num">' + fmP(m.invWithheld(i)) + '</td><td class="r num">' + fmP(m.invPaidGross(i)) + '</td><td colspan="3"></td></tr></tfoot></table></div>';
      }
      h += "</section>";
    }
    if ((i.log || []).length) {
      h += '<section class="stack"><h3 class="sec">' + esc(t("fi_history")) + '</h3><div class="list">' + i.log.slice().reverse().map(function (l) {
        return '<div class="li"><span>' + esc(l.text) + '</span><span class="m">' + esc(m.member(l.who).name) + " · " + esc(u.fmtDate(l.at)) + "</span></div>";
      }).join("") + "</div></section>";
    }
    return h;
  }

  // ---------- invoice form (new + edit draft) ----------
  var lastAuto = { label: "", amount: "" };
  function projOptions(clientId) {
    return [["", t("fi_f_noproject")]].concat(S.all("projects").filter(function (p) { return p.clientId === clientId; }).sort(u.by("name"))
      .map(function (p) { return [p.id, p.name + " · " + m.pack(p.pack).name]; }));
  }
  function optionsHTML(opts, v) { return opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); }
  function invoiceForm(inv) {
    var clients = S.all("clients").sort(u.by("brand"));
    if (!clients.length) { ui.toast(t("fi_no_clients")); return; }
    var editing = !!inv;
    var direct = !!m.rules().extrasDirect;
    inv = inv || { clientId: clients[0].id, projectId: "", kind: "deposit", label: "", amount: "", stamp: m.rules().stamp, passThrough: direct };
    var pass = inv.passThrough != null ? !!inv.passThrough : direct;
    lastAuto = { label: inv.label || "", amount: inv.amount === "" ? "" : String(inv.amount) };
    var body = '<div class="form">' +
      ui.field({ id: "fi-n-client", label: t("fi_f_client"), type: "select", value: inv.clientId, options: clients.map(function (c) { return [c.id, c.brand]; }), attrs: ' data-c="fi-n-client"' }) +
      ui.field({ id: "fi-n-project", label: t("fi_f_project"), type: "select", value: inv.projectId || "", options: projOptions(inv.clientId), attrs: ' data-c="fi-n-suggest"' }) +
      ui.field({ id: "fi-n-kind", label: t("fi_f_kind"), type: "select", value: inv.kind, options: KINDS_NEW.map(function (k) { return [k, kindLabel(k)]; }), attrs: ' data-c="fi-n-suggest"' }) +
      ui.field({ id: "fi-n-label", label: t("fi_f_label"), value: inv.label, span: true }) +
      ui.field({ id: "fi-n-amount", label: t("fi_f_amount"), type: "number", value: inv.amount, attrs: ' min="0" step="0.01"' }) +
      ui.field({ id: "fi-n-stamp", label: t("fi_f_stamp"), type: "number", value: inv.stamp, hint: t("fi_f_stamp_h"), attrs: ' min="0" step="0.01"' }) +
      "</div>" + '<div class="stack" id="fi-n-extra" style="gap:6px' + (inv.kind === "extra" ? "" : ";display:none") + '">' +
      '<p class="note' + (direct ? " strong" : "") + '" style="margin:0">' + esc(t(direct ? "fi_f_extra_direct" : "fi_f_extra_h")) + "</p>" +
      ui.field({ id: "fi-n-pass", label: t("fi_f_pass"), type: "checkbox", value: pass }) +
      '<span class="small muted">' + esc(t("fi_f_pass_h")) + "</span></div>";
    ui.modal({ title: t(editing ? "fi_edit_title" : "fi_new_title"), accent: t(editing ? "fi_edit_accent" : "fi_new_accent"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("fi_save_draft"), "fi-save", { cls: "primary", data: { id: editing ? inv.id : "" } }) });
  }
  /** Fill label and amount from the project's pack, unless the founder already typed their own. */
  function suggest() {
    var kind = u.val("fi-n-kind"), pid = u.val("fi-n-project"), p = pid ? m.project(pid) : null;
    var ex = document.getElementById("fi-n-extra"); if (ex) ex.style.display = kind === "extra" ? "" : "none";
    if (!p) return;
    var pk = m.pack(p.pack), lab = pk.name + " · " + p.name + " · " + kindLabel(kind), amt = "";
    if (kind === "deposit" || kind === "balance") amt = String(r3(pk.price / 2));
    else if (kind === "month") amt = String(pk.price);
    var le = document.getElementById("fi-n-label"), ae = document.getElementById("fi-n-amount");
    if (le && (!le.value || le.value === lastAuto.label)) { le.value = lab; lastAuto.label = lab; }
    if (ae && amt && (!ae.value || ae.value === lastAuto.amount)) { ae.value = amt; lastAuto.amount = amt; }
  }
  GK.change("fi-n-client", function (el) {
    var sel = document.getElementById("fi-n-project"); if (sel) sel.innerHTML = optionsHTML(projOptions(el.value), "");
    suggest();
  });
  GK.change("fi-n-suggest", function () { suggest(); });
  GK.act("fi-new", function () { if (!canW()) return ui.toast(t("fi_founder_only")); invoiceForm(null); });
  GK.act("fi-edit", function (el) { var i = S.get("invoices", el.dataset.id); if (i && !i.no) invoiceForm(i); });
  GK.act("fi-save", function (el) {
    if (!canW()) return ui.toast(t("fi_founder_only"));
    var clientId = u.val("fi-n-client"), label = u.val("fi-n-label").trim(), amount = r3(u.numVal("fi-n-amount")), kind = u.val("fi-n-kind");
    if (!clientId) return u.focus("fi-n-client");
    if (!label) { u.focus("fi-n-label"); return ui.toast(t("required")); }
    if (!(amount > 0)) { u.focus("fi-n-amount"); return ui.toast(t("fi_amount_pos")); }
    var stamp = u.val("fi-n-stamp") === "" ? m.rules().stamp : r3(u.numVal("fi-n-stamp"));
    var fields = { clientId: clientId, projectId: u.val("fi-n-project") || "", kind: kind, label: label, amount: amount, stamp: kind === "credit" ? 0 : Math.max(0, stamp) };
    fields.passThrough = kind === "extra" ? u.checked("fi-n-pass") : false;
    var id = el.dataset.id, saved;
    if (id) {
      var cur = S.get("invoices", id); if (!cur || cur.no) { ui.closeModal(); return; }
      saved = S.patch("invoices", id, fields, { log: t("fi_log_edited") });
    } else {
      saved = S.put("invoices", Object.assign({ no: "", issued: "", due: "", payments: [], credited: false, log: [] }, fields), { log: t("fi_log_created") });
    }
    ui.closeModal(true);
    if (saved) { ui.toast(t("saved")); ui.go("finance", { tab: "invoices", invoiceId: saved.id }); }
  });

  // ---------- issue, delete, credit ----------
  GK.act("fi-issue", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i || i.no) return;
    if (!m.company().mf) return ui.toast(t("gate_mf"));
    var due = u.addDays(u.today(), m.rules().dueDays), c = m.client(i.clientId);
    var body = t("fi_issue_body", { due: u.fmtDate(due, { day: "numeric", month: "long" }) }) + (c && !c.taxId ? " " + t("fi_no_taxid") : "");
    ui.confirm(t("fi_issue_q"), body, function () {
      var cur = S.get("invoices", i.id); if (!cur || cur.no) return;
      allocateInvoiceNo(function (no) {
        var today = u.today();
        return !!S.patch("invoices", i.id, { no: no, issued: today, due: u.addDays(today, m.rules().dueDays) }, { log: t("fi_log_issued", { no: no }) });
      }, function () { var latest = S.get("invoices", i.id); return !!latest && !latest.no; })
        .then(function (result) { if (result) ui.toast(t("fi_issued_toast", { no: result.no })); })
        .catch(function (error) { ui.toast(t("fi_number_error", { e: error.message })); });
    }, t("fi_issue"));
  });
  GK.act("fi-del", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i || i.no) return;
    ui.confirm(t("fi_del_q"), t("fi_del_body"), function () {
      var cur = S.get("invoices", i.id); if (!cur || cur.no) return;
      S.remove("invoices", i.id); ui.toast(t("fi_deleted")); ui.go("finance", { invoiceId: "" });
    }, t("del"));
  });
  GK.act("fi-credit", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i || !i.no || i.kind === "credit" || i.credited) return;
    if (!m.company().mf) return ui.toast(t("gate_mf"));
    ui.confirm(t("fi_credit_q"), t("fi_credit_body", { a: fmP(-i.amount), orig: i.no }), function () {
      var cur = S.get("invoices", i.id); if (!cur || cur.credited) return;
      allocateInvoiceNo(function (no) {
        var latest = S.get("invoices", i.id);
        if (!latest || latest.credited) return null;
        var today = u.today();
        var cn = S.put("invoices", { no: no, clientId: latest.clientId, projectId: latest.projectId || "", kind: "credit", label: t("fi_credit_label", { no: latest.no }),
          amount: -r3(latest.amount), stamp: 0, issued: today, due: today, payments: [], credited: false, creditFor: latest.id, log: [] }, { log: t("fi_log_credit", { no: no, orig: latest.no }) });
        if (!cn || !S.patch("invoices", latest.id, { credited: true }, { log: t("fi_log_credited", { no: no }) })) throw new Error("The credit note could not be saved.");
        syncLeadPayment(latest);
        return cn.id;
      }, function () { var latest = S.get("invoices", i.id); return !!latest && !latest.credited; })
        .then(function (result) {
          if (!result) return;
          var cn = S.get("invoices", result.value);
          ui.toast(t("fi_credit_done", { no: cn.no }));
          ui.go("finance", { tab: "invoices", invoiceId: result.value });
        }).catch(function (error) { ui.toast(t("fi_number_error", { e: error.message })); });
    }, t("fi_credit"));
  });

  // ---------- payments ----------
  GK.act("fi-pay", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i || !i.no) return;
    var r = m.rules(), c = m.client(i.clientId), bal = r3(m.invBalance(i));
    var wh = 0;
    if (c && c.taxId) wh = Math.max(0, Math.min(bal, r3(r3((+i.amount || 0) * r.withholding / 100) - m.invWithheld(i))));
    var net = r3(bal - wh);
    var body = '<p class="small muted" style="margin:0">' + esc(i.no + " · " + m.brand(i.clientId) + " · " + t("fi_pay_left", { b: fmP(bal) })) + "</p>" +
      '<div class="form">' +
      ui.field({ id: "fi-p-date", label: t("fi_p_date"), type: "date", value: u.today() }) +
      ui.field({ id: "fi-p-net", label: t("fi_p_net"), type: "number", value: net, attrs: ' min="0" step="0.01"' }) +
      ui.field({ id: "fi-p-wh", label: t("fi_p_wh"), type: "number", value: wh, hint: c && c.taxId ? t("fi_p_wh_h", { p: r.withholding }) : t("fi_p_wh_none"), attrs: ' min="0" step="0.01"' }) +
      ui.field({ id: "fi-p-method", label: t("fi_p_method"), type: "select", value: "transfer", options: METHODS.map(function (k) { return [k, t("fi_m_" + k)]; }) }) +
      ui.field({ id: "fi-p-ref", label: t("fi_p_ref"), placeholder: t("fi_p_ref_ph"), span: true }) + "</div>";
    ui.modal({ title: t("fi_pay_title"), accent: t("fi_pay_accent"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "fi-pay-save", { cls: "primary", data: { id: i.id } }) });
  });
  GK.act("fi-pay-save", function (el) {
    if (!canW()) return ui.toast(t("fi_founder_only"));
    var i = S.get("invoices", el.dataset.id); if (!i) return ui.closeModal();
    var date = u.val("fi-p-date"), net = r3(u.numVal("fi-p-net")), wh = r3(u.numVal("fi-p-wh")), bal = r3(m.invBalance(i));
    if (!date) return u.focus("fi-p-date");
    if (net < 0 || wh < 0 || net + wh <= 0) { u.focus("fi-p-net"); return ui.toast(t("fi_pay_zero")); }
    if (r3(net + wh) > bal + 0.0005) { u.focus("fi-p-net"); return ui.toast(t("fi_overpay", { b: fmP(bal) })); }
    var pays = (i.payments || []).concat([{ date: date, net: net, withheld: wh, method: u.val("fi-p-method") || "transfer", ref: u.val("fi-p-ref").trim() }]);
    var saved = S.patch("invoices", i.id, { payments: pays }, { log: t("fi_log_pay", { a: fmP(net + wh), d: u.fmtDate(date) }) });
    if (saved) syncLeadPayment(saved);
    ui.closeModal(true); ui.toast(t("fi_pay_saved"));
  });
  GK.act("fi-pay-rm", function (el) {
    var i = S.get("invoices", el.dataset.id), k = +el.dataset.k; if (!i || !(i.payments || [])[k]) return;
    var p = i.payments[k];
    ui.confirm(t("fi_pay_rm_q"), t("fi_pay_rm_body", { a: fmP((+p.net || 0) + (+p.withheld || 0)), d: u.fmtDate(p.date) }), function () {
      var cur = S.get("invoices", i.id); if (!cur) return;
      var pays = (cur.payments || []).slice(); pays.splice(k, 1);
      var saved = S.patch("invoices", cur.id, { payments: pays }, { log: t("fi_log_pay_rm", { d: u.fmtDate(p.date) }) });
      if (saved) syncLeadPayment(saved);
      ui.toast(t("fi_pay_removed"));
    }, t("fi_pay_rm"));
  });

  // ---------- invoice document ----------
  function docData(i) {
    var co = m.company(), c = m.client(i.clientId) || {}, r = m.rules(), credit = i.kind === "credit";
    var lines = (i.lines && i.lines.length ? i.lines : [{ label: i.label, amount: i.amount }]);
    return { co: co, c: c, r: r, credit: credit, orig: i.creditFor ? S.get("invoices", i.creditFor) : null, lines: lines,
      stamp: credit ? 0 : (+i.stamp || 0), total: m.invTotal(i), bal: i.credited ? 0 : m.invBalance(i) };
  }
  function payLine(p) { return fmP((+p.net || 0) + (+p.withheld || 0)) + (+p.withheld ? " (" + t("fi_d_wh", { w: fmP(p.withheld) }) + ")" : ""); }
  function docHTML(i) {
    var d = docData(i), co = d.co;
    var h = '<div class="doc"><div class="center">';
    h += '<span class="wm">' + GK.logo.wordmark + "</span>";
    h += '<div class="small" style="line-height:1.6"><strong>' + esc(co.name) + "</strong>" + (co.legal ? "<br>" + esc(co.legal) : "") +
      (co.mf ? "<br>" + esc(t("fi_d_mf")) + " " + esc(co.mf) : "") + "<br>" + esc(co.address) + "<br>" + esc(co.phone) + " · " + esc(co.email) + "<br>Instagram " + esc(co.instagram) + "</div>";
    h += '<span class="lab" style="margin-top:8px">' + esc(d.credit ? t("fi_d_credit") : t("fi_d_invoice")) + "</span>";
    h += '<h2 class="hl" style="font-size:34px">' + esc(i.no || t("fi_d_draft")) + "</h2>";
    h += '<div class="small">' + (i.issued ? esc(t("fi_issued_on")) + " " + esc(longDate(i.issued)) : "") + (i.due && !d.credit ? " · " + esc(t("fi_due_on")) + " " + esc(longDate(i.due)) : "") + "</div>";
    if (d.orig) h += '<div class="small">' + esc(t("fi_credit_for", { no: d.orig.no })) + "</div>";
    h += '<div class="stack" style="gap:2px;align-items:center"><span class="lab sm">' + esc(t("fi_d_billed")) + "</span><strong>" + esc(d.c.brand || "—") + "</strong>" +
      (d.c.taxId ? '<span class="small">' + esc(t("fi_d_taxid")) + " " + esc(d.c.taxId) + "</span>" : "") + "</div>";
    h += '<table style="max-width:520px"><thead><tr><th>' + esc(t("fi_d_desc")) + '</th><th class="r">' + esc(t("fi_d_amount")) + "</th></tr></thead><tbody>";
    d.lines.forEach(function (l) { h += '<tr><td style="text-align:left">' + esc(l.label || "") + '</td><td class="r num">' + fmP(l.amount) + "</td></tr>"; });
    if (!d.credit) h += '<tr><td style="text-align:left">' + esc(t("fi_d_subtotal")) + '</td><td class="r num">' + fmP(i.amount) + '</td></tr><tr><td style="text-align:left">' + esc(t("fi_stamp")) + '</td><td class="r num">' + fmP(d.stamp) + "</td></tr>";
    h += "</tbody></table>";
    h += '<div class="frame"><div class="stack" style="gap:4px;align-items:center"><span class="lab sm">' + esc(t("fi_total")) + '</span><span class="big">' + fmP(d.total) + "</span></div></div>";
    if (!d.credit && i.no) {
      if ((i.payments || []).length) h += '<div class="small" style="line-height:1.6"><span class="lab sm">' + esc(t("fi_d_paid")) + "</span><br>" + i.payments.map(function (p) { return esc(longDate(p.date)) + " · " + esc(payLine(p)); }).join("<br>") + "</div>";
      h += '<div class="stack" style="gap:2px;align-items:center"><span class="lab sm">' + esc(t("fi_balance")) + '</span><strong class="num">' + fmP(d.bal) + "</strong></div>";
      h += '<p class="small" style="margin:0;max-width:52ch">' + esc(t("fi_d_terms", { n: d.r.dueDays })) + "</p>";
    }
    if (co.invoiceNote) h += '<p class="small" style="margin:0;max-width:52ch;white-space:pre-line">' + esc(co.invoiceNote) + "</p>";
    return h + "</div></div>";
  }
  function docText(i) {
    var d = docData(i), co = d.co, L = [];
    L.push(co.name + (co.legal ? " · " + co.legal : ""));
    if (co.mf) L.push(t("fi_d_mf") + " " + co.mf);
    L.push(co.address, co.phone + " · " + co.email + " · Instagram " + co.instagram, "");
    L.push((d.credit ? t("fi_d_credit") : t("fi_d_invoice")) + " " + (i.no || "(" + t("fi_d_draft") + ")"));
    var c_ = colon();
    if (i.issued) L.push(t("fi_issued_on") + " " + longDate(i.issued));
    if (i.due && !d.credit) L.push(t("fi_due_on") + c_ + longDate(i.due));
    if (d.orig) L.push(t("fi_credit_for", { no: d.orig.no }));
    L.push("", t("fi_d_billed") + c_ + (d.c.brand || "—") + (d.c.taxId ? " · " + t("fi_d_taxid") + " " + d.c.taxId : ""), "");
    d.lines.forEach(function (l) { L.push((l.label || "") + c_ + fmP(l.amount)); });
    if (!d.credit) L.push(t("fi_d_subtotal") + c_ + fmP(i.amount), t("fi_stamp") + c_ + fmP(d.stamp));
    L.push(t("fi_total") + c_ + fmP(d.total));
    if (!d.credit && i.no) {
      (i.payments || []).forEach(function (p) { L.push(t("fi_c_paid") + " " + longDate(p.date) + c_ + payLine(p)); });
      L.push(t("fi_balance") + c_ + fmP(d.bal), "", t("fi_d_terms", { n: d.r.dueDays }));
    }
    if (co.invoiceNote) L.push("", co.invoiceNote);
    return L.join("\n");
  }
  GK.act("fi-doc", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i) return;
    ui.modal({ title: t("fi_d_title"), accent: t("fi_d_accent"), wide: true, body: docHTML(i),
      foot: ui.btn(t("fi_d_copy"), "fi-doc-copy", { cls: "primary", data: { id: i.id } }) });
  });
  GK.act("fi-doc-copy", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i) return;
    u.copy(docText(i)).then(function (ok) { ui.toast(ok ? t("copied") : t("fi_copy_fail")); });
  });

  // ---------- commission ----------
  function commissionHTML() {
    var r = m.rules(), year = u.year(u.today());
    var ps = S.all("projects").filter(function (p) { return !!m.commission(p).basis; }).sort(u.by(function (p) { return p.shootDate || p.planApprovedOn || ""; }, "desc"));
    var rows = ps.map(function (p) { return { p: p, c: m.commission(p), rec: m.received(p), cost: m.costOf(p), prof: m.profit(p) }; });
    var owedNow = u.sum(rows, function (x) { return x.c.owed; });
    var paidYear = u.sum(S.all("projects").filter(function (p) { return p.payout && p.payout.paidOn && u.year(p.payout.paidOn) === year; }), function (p) { return +p.payout.amount || 0; });
    var pending = u.sum(rows.filter(function (x) { return !x.c.payable; }), function (x) { return x.c.amount; });
    var h = ui.kpis([{ lab: t("fi_cm_owed_now"), v: fm(owedNow) }, { lab: t("fi_cm_paid_year"), v: fm(paidYear), n: year }, { lab: t("fi_cm_pending"), v: fm(pending) }]);
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_cm_note", { p: r.commission })) + "</p>";
    if (!rows.length) return h + ui.empty(t("fi_cm_none"));
    h += '<div class="tbl"><table style="min-width:900px"><thead><tr><th>' + esc(t("fi_cm_proj")) + '</th><th class="r">' + esc(t("fi_cm_received")) + '</th><th class="r">' + esc(t("fi_cm_costs")) + '</th><th class="r">' + esc(t("fi_cm_profit")) +
      '</th><th class="r">' + esc(t("fi_cm_amount")) + "</th><th>" + esc(t("fi_cm_payable")) + "</th><th>" + esc(t("fi_cm_paid")) + '</th><th class="r">' + esc(t("fi_cm_owed")) + "</th><th></th></tr></thead><tbody>";
    rows.forEach(function (x) {
      var p = x.p, c = x.c, noCosts = !(p.costs || []).length, act = "";
      if (c.owed > 0) {
        if (noCosts) act = ui.btn(t("fi_cm_mark"), "fi-cm-pay", { cls: "sm", disabled: true, title: t("fi_cm_nocosts_t") });
        else act = wBtn(t("fi_cm_mark"), "fi-cm-pay", { cls: "sm primary", data: { id: p.id } });
      }
      h += "<tr><td>" + esc(m.projectLabel(p)) + (noCosts && x.rec > 0 ? " " + ui.pill(t("fi_cm_nocosts"), "alert") : "") + '</td><td class="r num">' + fm(x.rec) + '</td><td class="r num">' + fm(x.cost) + '</td><td class="r num">' + fm(x.prof) +
        '</td><td class="r num">' + fm(c.amount) + "</td><td>" + (c.amount > 0 ? ui.pill(t(c.payable ? "fi_cm_yes" : m.fullyPaid(p) ? "fi_cm_wait_dl" : "fi_cm_wait"), c.payable ? "done" : "") : '<span class="faint">—</span>') + '</td><td class="small">' +
        (c.paidOn ? fm(c.paid) + " · " + esc(u.fmtDate(c.paidOn)) : "—") + '</td><td class="r num"><strong>' + fm(c.owed) + '</strong></td><td class="r">' + act + "</td></tr>";
    });
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + fm(u.sum(rows, function (x) { return x.rec; })) + '</td><td class="r num">' + fm(u.sum(rows, function (x) { return x.cost; })) +
      '</td><td class="r num">' + fm(u.sum(rows, function (x) { return x.prof; })) + '</td><td class="r num">' + fm(u.sum(rows, function (x) { return x.c.amount; })) + '</td><td></td><td class="small">' +
      fm(u.sum(rows, function (x) { return x.c.paid; })) + '</td><td class="r num">' + fm(owedNow) + "</td><td></td></tr></tfoot></table></div>";
    return h;
  }
  GK.act("fi-cm-pay", function (el) {
    var p = m.project(el.dataset.id); if (!p) return;
    var c = m.commission(p); if (!(c.owed > 0)) return;
    ui.confirm(t("fi_cm_mark_q", { a: fm(c.owed) }), t("fi_cm_mark_body", { p: m.projectLabel(p) }), function () {
      var cur = m.project(p.id); if (!cur) return;
      var cc = m.commission(cur); if (!(cc.owed > 0)) return;
      S.patch("projects", cur.id, { payout: { amount: Math.round(cc.owed + cc.paid), paidOn: u.today() } }, { log: t("fi_log_comm", { a: fm(cc.owed) }) });
      ui.toast(t("fi_cm_done"));
    }, t("fi_cm_mark"));
  });

  // ---------- cap ----------
  /** Years that have invoices (plus this one) and the one picked on the cap tab. */
  function capYearSel() {
    var thisYear = u.year(u.today()), years = {}; years[thisYear] = 1; invoices().forEach(function (i) { if (i.no && i.issued) years[u.year(i.issued)] = 1; });
    var ys = Object.keys(years).sort().reverse();
    return { years: ys, year: P().capYear && years[P().capYear] ? P().capYear : thisYear };
  }
  function capHTML() {
    var r = m.rules(), now = u.today(), thisYear = u.year(now);
    var cy = capYearSel(), ys = cy.years, year = cy.year;
    var used = capUsed(year), cap = +r.cap || 0, pct = cap ? used / cap * 100 : 0;
    var issued = invoices().filter(function (i) { return i.no && u.year(i.issued) === year && !(i.kind === "extra" && i.passThrough); });
    var curM = year === thisYear ? +now.slice(5, 7) : 12;
    var firstM = issued.length ? Math.min.apply(null, issued.map(function (i) { return +i.issued.slice(5, 7); })) : curM;
    var monthsActive = Math.max(1, curM - firstM + 1), left = 12 - curM;
    var avg = used / monthsActive, projected = used + avg * left;
    function monthName(n) { return u.fmtDate(year + "-" + String(n).padStart(2, "0") + "-15", { month: "long" }); }
    var h = "";
    if (ys.length > 1) h += '<div style="max-width:160px">' + ui.field({ id: "fi-capyear", label: t("fi_cap_year"), type: "select", value: year, options: ys.map(function (y) { return [y, y]; }), attrs: ' data-c="fi-capyear"' }) + "</div>";
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("fi_cap_pct", { p: u.dec(pct, 1) })) + " · " + esc(year) + "</h2>" +
      (pct >= 80 ? ui.pill(t("fi_cap_alert"), "alert") : "") + "</div>" + ui.meter(pct, pct >= 80) +
      '<div class="row between small"><span class="num">' + fm(used) + '</span><span class="num muted">' + fm(cap) + "</span></div>";
    h += ui.kpis([
      { lab: t("fi_cap_used"), v: fm(used) },
      { lab: t("fi_cap_room"), v: fm(Math.max(0, cap - used)) },
      { lab: t("fi_cap_months"), v: String(left), n: t("fi_cap_months_n", { m: monthName(curM) }) },
      { lab: t("fi_cap_avg"), v: fm(Math.round(avg)), n: t("fi_cap_avg_n", { m: monthName(firstM) }) },
      { lab: t("fi_cap_proj"), v: fm(Math.round(projected)), n: t("fi_cap_proj_n", { p: cap ? Math.round(projected / cap * 100) : 0 }) }
    ]);
    if (pct < 80 && cap && projected >= cap * 0.8) h += '<p class="note strong" style="margin:0">' + esc(t("fi_cap_soon")) + "</p>";
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_cap_note", { c: fm(cap) })) + "</p></section>";

    h += '<div class="grid2"><section class="stack"><h3 class="sec">' + esc(t("fi_cap_bymonth")) + '</h3><div class="tbl"><table><thead><tr><th>' + esc(t("fi_mc_month")) + '</th><th class="r">' + esc(t("fi_c_amount")) + '</th><th class="r">' + esc(t("fi_cap_running")) + "</th></tr></thead><tbody>";
    var run = 0;
    for (var k = firstM; k <= curM; k++) {
      var mk = year + "-" + String(k).padStart(2, "0");
      var amt = u.sum(issued.filter(function (i) { return u.month(i.issued) === mk; }), m.invoiceTurnover);
      run += amt;
      h += "<tr><td>" + esc(u.fmtMonth(mk)) + '</td><td class="r num">' + fm(amt) + '</td><td class="r num small muted">' + fm(run) + (cap ? " · " + esc(u.pct(run / cap * 100)) : "") + "</td></tr>";
    }
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + fm(used) + '</td><td class="r num">' + esc(u.pct(pct)) + "</td></tr></tfoot></table></div></section>";
    var extras = issued.filter(function (i) { return i.kind === "extra" && !i.passThrough; });
    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_cap_extras")) + "</h3>";
    if (!extras.length) h += ui.empty(t("fi_cap_extras_none"));
    else {
      h += '<div class="list">' + extras.map(function (i) {
        return '<div class="li click" tabindex="0" data-a="fi-open" data-id="' + esc(i.id) + '"><div class="stack" style="gap:2px"><span>' + esc(m.brand(i.clientId)) + " · " + esc(i.label) + '</span><span class="m code">' + esc(i.no) + '</span></div><span class="num">' + fmP(i.amount) + "</span></div>";
      }).join("") + '</div><p class="small" style="margin:0"><strong class="num">' + fm(u.sum(extras, m.invoiceTurnover)) + "</strong> · " + esc(t("fi_cap_extras_note")) + "</p>";
    }
    var pass = passOf(year);
    if (pass.length) {
      h += '<h3 class="sec">' + esc(t("fi_cap_pass")) + '</h3><div class="list">' + pass.map(function (i) {
        return '<div class="li click" tabindex="0" data-a="fi-open" data-id="' + esc(i.id) + '"><div class="stack" style="gap:2px"><span>' + esc(m.brand(i.clientId)) + " · " + esc(i.label) + '</span><span class="m code">' + esc(i.no) + '</span></div><span class="num">' + fmP(i.amount) + "</span></div>";
      }).join("") + "</div>";
    }
    h += "</section></div>";
    return h;
  }
  GK.change("fi-capyear", function (el) { P().capYear = el.value; el.blur(); ui.render(true); });

  // ---------- navigation ----------
  GK.act("fi-tab", function (el) { var k = el.dataset.tab; ui.go("finance", { tab: k, more: MAIN.indexOf(k) < 0, invoiceId: "", quoteId: "" }); });
  GK.act("fi-more", function () { var p = P(), first = liveTabs().filter(function (k) { return MAIN.indexOf(k) < 0; })[0]; ui.go("finance", { more: true, tab: MAIN.indexOf(p.tab) < 0 && p.tab ? p.tab : first, invoiceId: "", quoteId: "" }); });
  GK.act("fi-filter", function (el) { ui.go("finance", { filter: el.dataset.f, invoiceId: "" }); });
  GK.act("fi-open", function (el) { ui.closeModal(true); ui.go("finance", { tab: "invoices", invoiceId: el.dataset.id }); });
  GK.act("fi-back", function () { ui.go("finance", { invoiceId: "" }); });
  GK.act("fi-settings", function () { ui.go("settings"); });

  FIN.tabs.invoices = { render: function () { return ""; } };
  FIN.tabs.commission = { render: commissionHTML };
  FIN.tabs.cap = { render: capHTML };
  FIN.capHTML = capHTML; FIN.capYearSel = capYearSel;
  FIN.u = { fm: fm, fmP: fmP, r3: r3, colon: colon, canW: canW, wBtn: wBtn, P: P, isOpen: isOpen, addMonths: addMonths, invoices: invoices, kindLabel: kindLabel,
    longDate: longDate, shortDate: shortDate, monthFigures: monthFigures, firstMonth: firstMonth, capUsed: capUsed, optionsHTML: optionsHTML, METHODS: METHODS };

  GK.view("finance", {
    render: render,
    count: function () { return invoices().filter(function (i) { var s = m.invStatus(i); return s === "overdue" || s === "draft"; }).length || ""; }
  });
})(window.GK);
