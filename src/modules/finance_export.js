/* GECKO Ops · finance: Accountant export. CSV of invoices, payments and expenses for a year, and a yearly summary to paste into an email. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_xp_year: ["Year", "Année"], fi_xp_inv: ["Download invoices CSV", "Télécharger les factures en CSV"], fi_xp_pay: ["Download payments CSV", "Télécharger les paiements en CSV"], fi_xp_exp: ["Download expenses CSV", "Télécharger les dépenses en CSV"],
    fi_xp_sum: ["Copy yearly summary", "Copier le résumé annuel"],
    fi_xp_intro: ["Files for your accountant. UTF-8, comma-separated, every text field in quotes, amounts with a dot (728.50), dates as YYYY-MM-DD, one header row. Whole year chosen below. Accountant to confirm what they need.", "Fichiers pour votre comptable. UTF-8, séparés par des virgules, chaque champ texte entre guillemets, montants avec un point (728.50), dates au format AAAA-MM-JJ, une ligne d'en-tête. Pour l'année choisie ci-dessous. À confirmer avec le comptable."],
    fi_xp_count_inv: ["{n} invoices and credit notes issued in {y}", "{n} factures et avoirs émis en {y}"], fi_xp_count_pay: ["{n} payments received in {y}", "{n} paiements reçus en {y}"], fi_xp_count_exp: ["{n} expense lines in {y} (monthly ones counted in each month)", "{n} lignes de dépenses en {y} (les mensuelles comptées chaque mois)"],
    fi_xp_empty: ["Nothing to export for {y}.", "Rien à exporter pour {y}."],
    fi_xp_h_no: ["Number", "Numéro"], fi_xp_h_status: ["Status", "Statut"], fi_xp_h_kind: ["Kind", "Type"], fi_xp_h_issued: ["Issued", "Émise le"], fi_xp_h_due: ["Due", "Échéance"], fi_xp_h_client: ["Client", "Client"], fi_xp_h_taxid: ["Client tax ID", "Matricule fiscal client"],
    fi_xp_h_project: ["Project", "Projet"], fi_xp_h_label: ["Label", "Libellé"], fi_xp_h_amount: ["Amount excl. stamp", "Montant hors timbre"], fi_xp_h_stamp: ["Stamp duty", "Droit de timbre"], fi_xp_h_total: ["Total", "Total"],
    fi_xp_h_paid: ["Paid incl. withheld", "Payé retenue incluse"], fi_xp_h_wh: ["Withheld", "Retenue"], fi_xp_h_net: ["Received net", "Reçu net"], fi_xp_h_bal: ["Balance", "Reste"], fi_xp_h_pass: ["Pass-through", "Débours"], fi_xp_h_cancels: ["Cancels invoice", "Annule la facture"],
    fi_xp_h_date: ["Date", "Date"], fi_xp_h_invno: ["Invoice", "Facture"], fi_xp_h_method: ["Method", "Moyen"], fi_xp_h_ref: ["Reference", "Référence"],
    fi_xp_h_month: ["Month", "Mois"], fi_xp_h_cat: ["Category", "Catégorie"], fi_xp_h_vendor: ["Vendor", "Fournisseur"], fi_xp_h_rec: ["Repeats", "Récurrence"], fi_xp_h_link: ["Receipt link", "Lien du justificatif"], fi_xp_h_note: ["Note", "Note"],
    fi_xp_yes: ["yes", "oui"], fi_xp_no: ["no", "non"], fi_xp_monthly: ["monthly", "mensuelle"], fi_xp_once: ["once", "unique"],
    fi_xp_s_title: ["{co} · yearly summary {y}", "{co} · résumé annuel {y}"], fi_xp_s_note: ["Estimate from the invoices, payments and expenses in GECKO Ops. Accountant to confirm.", "Estimation à partir des factures, paiements et dépenses de GECKO Ops. À confirmer par le comptable."],
    fi_xp_s_inv: ["Invoiced, counted for the cap", "Facturé, compté pour le plafond"], fi_xp_s_cap: ["Cap", "Plafond"], fi_xp_s_cash: ["Cash received (net)", "Encaissements (net)"], fi_xp_s_wh: ["Tax withheld by clients (credit)", "Retenues à la source des clients (crédit)"],
    fi_xp_s_stamp: ["Stamp duty on invoices issued", "Timbres sur factures émises"], fi_xp_s_over: ["Overheads", "Charges"], fi_xp_s_costs: ["Direct project costs", "Coûts directs des projets"], fi_xp_s_sal: ["Heni's salary", "Salaire de Heni"],
    fi_xp_s_comm: ["Commissions paid", "Commissions payées"], fi_xp_s_open: ["Still owed by clients today", "Encore dû par les clients aujourd'hui"]
  });

  function P() { return F.P(); }
  function yearsList() {
    var ys = {}; ys[u.year(u.today())] = 1;
    F.invoices().forEach(function (i) { if (i.issued) ys[u.year(i.issued)] = 1; (i.payments || []).forEach(function (p) { if (p.date) ys[u.year(p.date)] = 1; }); });
    S.all("expenses").forEach(function (e) { if (e.date) ys[u.year(e.date)] = 1; });
    return Object.keys(ys).sort().reverse();
  }
  function year() { var ys = yearsList(), y = P().xpYear; return ys.indexOf(y) > -1 ? y : ys[0]; }

  /** CSV: UTF-8 with a byte-order mark (so Excel reads the accents), comma separated, text fields quoted, numbers bare with a dot. */
  function cell(v) {
    if (v == null) return '""';
    if (typeof v === "number") return isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : "";
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // a text field must never run as a formula in a spreadsheet
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csv(headers, rows) { return "﻿" + [headers.map(cell).join(",")].concat(rows.map(function (r) { return r.map(cell).join(","); })).join("\r\n") + "\r\n"; }

  function invoiceRows(y) {
    return F.invoices().filter(function (i) { return i.no && u.year(i.issued) === y; }).sort(u.by("no")).map(function (i) {
      var c = m.client(i.clientId) || {}, p = i.projectId ? m.project(i.projectId) : null, o = i.creditFor ? S.get("invoices", i.creditFor) : null, dead = i.kind === "credit" || i.credited;
      return [i.no, t("inv_" + m.invStatus(i)), t("k_" + i.kind), i.issued, i.due || "", c.brand || "", c.taxId || "", p ? p.name : "", i.label || "", +i.amount || 0, i.kind === "credit" ? 0 : (+i.stamp || 0), m.invTotal(i),
        m.invPaidGross(i), m.invWithheld(i), m.invPaidNet(i), dead ? 0 : m.invBalance(i), t(i.passThrough ? "fi_xp_yes" : "fi_xp_no"), o ? o.no : ""];
    });
  }
  function paymentRows(y) {
    var out = [];
    F.invoices().forEach(function (i) {
      (i.payments || []).forEach(function (p) {
        if (u.year(p.date) !== y) return;
        out.push([p.date, i.no || "", m.brand(i.clientId), F.METHODS.indexOf(p.method) > -1 ? t("fi_m_" + p.method) : (p.method || ""), p.ref || "", +p.net || 0, +p.withheld || 0, (+p.net || 0) + (+p.withheld || 0)]);
      });
    });
    return out.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  function expenseRows(y) {
    var last = y === u.year(u.today()) ? +u.today().slice(5, 7) : 12, out = [];
    for (var k = 1; k <= last; k++) {
      var ym = y + "-" + String(k).padStart(2, "0");
      X.expensesIn(ym).forEach(function (e) {
        var p = e.projectId ? m.project(e.projectId) : null;
        out.push([e.date, ym, e.label || "", FIN.catLabel(e.category), e.vendor || "", +e.amount || 0, t(e.recurring === "monthly" ? "fi_xp_monthly" : "fi_xp_once"), p ? m.projectLabel(p) : "", e.link || "", e.note || ""]);
      });
    }
    return out.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  var H = {
    inv: ["no", "status", "kind", "issued", "due", "client", "taxid", "project", "label", "amount", "stamp", "total", "paid", "wh", "net", "bal", "pass", "cancels"],
    pay: ["date", "invno", "client", "method", "ref", "net", "wh", "total"],
    exp: ["date", "month", "label", "cat", "vendor", "amount", "rec", "project", "link", "note"]
  };
  function heads(k) { return H[k].map(function (x) { return t("fi_xp_h_" + x); }); }
  // the pay table reuses "total" and "wh" headers; "date" for payments is the payment date

  function summaryText(y) {
    var last = y === u.year(u.today()) ? +u.today().slice(5, 7) : 12, tot = { net: 0, wh: 0, costs: 0, over: 0, sal: 0, comm: 0 }, cats = {};
    for (var k = 1; k <= last; k++) {
      var f = F.monthFigures(y + "-" + String(k).padStart(2, "0"));
      tot.net += f.net; tot.wh += f.wh; tot.costs += f.costs; tot.over += f.overheads; tot.sal += f.salary; tot.comm += f.commPaid;
      f.over.forEach(function (e) { var c = e.category || "other"; cats[c] = (cats[c] || 0) + (+e.amount || 0); });
    }
    var stamps = u.sum(F.invoices().filter(function (i) { return i.no && i.kind !== "credit" && u.year(i.issued) === y; }), function (i) { return +i.stamp || 0; });
    var cap = +m.rules().cap || 0, used = F.capUsed(y), c_ = F.colon(), L = [];
    L.push(t("fi_xp_s_title", { co: m.company().name, y: y }), t("fi_xp_s_note"), "");
    L.push(t("fi_xp_s_inv") + c_ + F.fm(used) + (cap ? " (" + u.pct(used / cap * 100) + " " + t("fi_xp_s_cap").toLowerCase() + " " + F.fm(cap) + ")" : ""));
    L.push(t("fi_xp_s_cash") + c_ + F.fm(tot.net), t("fi_xp_s_wh") + c_ + F.fm(tot.wh), t("fi_xp_s_stamp") + c_ + F.fm(stamps), "");
    L.push(t("fi_xp_s_over") + c_ + F.fm(tot.over));
    X.EXPENSE_CATS.forEach(function (c) { if (cats[c]) L.push("  - " + FIN.catLabel(c) + c_ + F.fm(cats[c])); });
    L.push(t("fi_xp_s_costs") + c_ + F.fm(tot.costs), t("fi_xp_s_sal") + c_ + F.fm(tot.sal), t("fi_xp_s_comm") + c_ + F.fm(tot.comm));
    if (y === u.year(u.today())) L.push("", t("fi_xp_s_open") + c_ + F.fm(X.aging().total));
    return L.join("\n");
  }

  function render() {
    var y = year(), ni = invoiceRows(y).length, np = paymentRows(y).length, ne = expenseRows(y).length;
    var h = '<section class="panel"><p class="small muted" style="margin:0">' + esc(t("fi_xp_intro")) + '</p><div class="row" style="align-items:flex-end"><div style="min-width:140px">' +
      ui.field({ id: "fi-xp-year", label: t("fi_xp_year"), type: "select", value: y, options: yearsList().map(function (k) { return [k, k]; }), attrs: ' data-c="fi-xp-year"' }) + "</div></div>";
    h += '<div class="list">' + [["fi_xp_count_inv", ni, "fi_xp_inv", "fi-xp-inv"], ["fi_xp_count_pay", np, "fi_xp_pay", "fi-xp-pay"], ["fi_xp_count_exp", ne, "fi_xp_exp", "fi-xp-exp"]].map(function (x) {
      return '<div class="li"><span>' + esc(t(x[0], { n: x[1], y: y })) + "</span>" + ui.btn(t(x[2]), x[3], { cls: "sm", disabled: !x[1], title: x[1] ? undefined : t("fi_xp_empty", { y: y }) }) + "</div>";
    }).join("") + "</div>";
    h += '<div class="row">' + ui.btn(t("fi_xp_sum"), "fi-xp-sum", { cls: "primary" }) + "</div></section>";
    return h;
  }
  GK.change("fi-xp-year", function (el) { P().xpYear = el.value; ui.render(true); });
  GK.act("fi-xp-inv", function () { var y = year(); ui.download("gecko-invoices-" + y + ".csv", csv(heads("inv"), invoiceRows(y))); });
  GK.act("fi-xp-pay", function () { var y = year(); ui.download("gecko-payments-" + y + ".csv", csv(heads("pay"), paymentRows(y))); });
  GK.act("fi-xp-exp", function () { var y = year(); ui.download("gecko-expenses-" + y + ".csv", csv(heads("exp"), expenseRows(y))); });
  GK.act("fi-xp-sum", function () { u.copy(summaryText(year())).then(function (ok) { ui.toast(ok ? t("copied") : t("fi_copy_fail")); }); });

  FIN.csv = { cell: cell, build: csv, invoices: invoiceRows, payments: paymentRows, expenses: expenseRows };
  FIN.tabs.export = { render: render };
})(window.GK);
