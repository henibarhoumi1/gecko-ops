/* GECKO Ops · finance: Overview tab. Cash, receivables, runway, three charts, and the invoices to chase with a ready WhatsApp reminder. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_ov_cash: ["Cash this month", "Encaissé ce mois"], fi_ov_cash_n: ["net, plus {w} withheld by clients", "net, plus {w} retenus par les clients"],
    fi_ov_recv: ["Receivables", "À recevoir"], fi_ov_recv_n: ["{n} invoices open", "{n} factures ouvertes"], fi_ov_recv_1: ["1 invoice open", "1 facture ouverte"],
    fi_ov_over: ["Overdue", "En retard"], fi_ov_over_n: ["{n} invoices late", "{n} factures en retard"], fi_ov_over_1: ["1 invoice late", "1 facture en retard"], fi_ov_over_0: ["Nothing late", "Rien en retard"],
    fi_ov_cap: ["Cap used", "Plafond utilisé"], fi_ov_cap_n: ["{a} of {b}, {y}", "{a} sur {b}, {y}"],
    fi_ov_mrr: ["Monthly retainers", "Récurrent mensuel"], fi_ov_mrr_n: ["active SKIN contracts", "contrats SKIN actifs"],
    fi_ov_run: ["Runway", "Autonomie"], fi_ov_run_v: ["{n} months", "{n} mois"], fi_ov_run_n: ["at the last 3 months' spending", "au rythme des 3 derniers mois"],
    fi_ov_run_none: ["Set the opening cash in Cash forecast", "Renseignez la trésorerie de départ dans Prévision"],
    fi_ov_inout: ["Money in and money out", "Entrées et sorties"], fi_ov_inout_sub: ["Last 6 months. Cash received (net) against everything paid out. Estimate.", "6 derniers mois. Encaissements (net) face à tout ce qui sort. Estimation."],
    fi_ov_in: ["Cash in", "Entrées"], fi_ov_out: ["Cash out", "Sorties"],
    fi_ov_aging: ["Receivables by age", "Créances par ancienneté"], fi_ov_aging_sub: ["What clients still owe, by days past the due date.", "Ce que les clients doivent encore, par jours de retard."],
    fi_ov_b_current: ["Not due yet", "Pas encore échu"], fi_ov_b_d1_7: ["1 to 7 days late", "1 à 7 jours de retard"], fi_ov_b_d8_30: ["8 to 30 days late", "8 à 30 jours de retard"], fi_ov_b_d31: ["Over 30 days late", "Plus de 30 jours de retard"],
    fi_ov_profit: ["Profit by client", "Bénéfice par client"], fi_ov_profit_sub: ["Received minus project costs, before commission. Estimate.", "Reçu moins coûts projets, avant commission. Estimation."],
    fi_ov_margin: ["margin {p}", "marge {p}"],
    fi_ov_chase: ["To chase", "À relancer"], fi_ov_chase_none: ["Nothing to chase. Every open invoice is on time.", "Rien à relancer. Toutes les factures ouvertes sont dans les temps."],
    fi_ov_chase_sub: ["Late invoices, and those due in the next 3 days. The tone gets firmer with the days late.", "Factures en retard et celles qui arrivent à échéance sous 3 jours. Le ton se durcit avec le retard."],
    fi_ov_copy_wa: ["Copy WhatsApp reminder", "Copier le rappel WhatsApp"], fi_ov_tone_friendly: ["Friendly", "Amical"], fi_ov_tone_firm: ["Firm", "Ferme"], fi_ov_tone_final: ["Final", "Dernier rappel"],
    fi_ov_due_in: ["due {d}", "échéance le {d}"], fi_ov_late_d: ["{n} days late, due {d}", "{n} jours de retard, échéance le {d}"], fi_ov_late_1: ["1 day late, due {d}", "1 jour de retard, échéance le {d}"],
    fi_ov_day_1: ["1 day", "1 jour"], fi_ov_day_n: ["{n} days", "{n} jours"],
    fi_ov_wa_friendly: ["Hello {name}, hope you're well. A quick reminder from {co} about invoice {no} ({label}): {amount} is left to pay, due {due}. You can pay by bank transfer or D17: tell us and we'll send the details. If it's already done, thank you, and please ignore this message.\n{co} · {phone} · {email}",
      "Bonjour {name}, j'espère que vous allez bien. Petit rappel de {co} à propos de la facture {no} ({label}) : il reste {amount} à régler, échéance le {due}. Vous pouvez payer par virement bancaire ou D17 : dites-le-nous et nous vous enverrons les coordonnées. Si c'est déjà fait, merci, et ignorez ce message.\n{co} · {phone} · {email}"],
    fi_ov_wa_firm: ["Hello {name}, invoice {no} ({label}) is now {days} past its due date of {due}, with {amount} still to pay. Could you settle it this week by bank transfer or D17, or tell us the date we can expect the payment? Thank you for your help.\n{co} · {phone} · {email}",
      "Bonjour {name}, la facture {no} ({label}) a {days} de retard sur son échéance du {due}, et il reste {amount} à régler. Pourriez-vous la régler cette semaine par virement bancaire ou D17, ou nous indiquer la date prévue du paiement ? Merci de votre aide.\n{co} · {phone} · {email}"],
    fi_ov_wa_final: ["Hello {name}, this is our final reminder. Invoice {no} ({label}) is {days} overdue: {amount} was due on {due}. Please pay within 3 days by bank transfer or D17. Until the balance is paid we have to hold back the final files. If something is blocking the payment, please call us so we can find a solution together.\n{co} · {phone} · {email}",
      "Bonjour {name}, ceci est notre dernier rappel. La facture {no} ({label}) a {days} de retard : {amount} étaient dus le {due}. Merci de régler sous 3 jours par virement bancaire ou D17. Tant que le solde n'est pas payé, nous devons retenir les fichiers finaux. Si quelque chose bloque le paiement, appelez-nous pour trouver une solution ensemble.\n{co} · {phone} · {email}"],
    fi_ov_cash_check: ["Cash check", "Point trésorerie"], fi_ov_cash_check_open: ["Open the forecast", "Ouvrir la prévision"]
  });

  function dayWord(n) { return n === 1 ? t("fi_ov_day_1") : t("fi_ov_day_n", { n: n }); }
  function tone(late) { return late > 20 ? "final" : late > 7 ? "firm" : "friendly"; }

  /** Polite WhatsApp text for one open invoice, firmer with the days late. */
  function reminderText(inv, late) {
    var c = m.client(inv.clientId) || {}, co = m.company();
    return t("fi_ov_wa_" + tone(late), { name: c.contact || c.brand || "", co: co.name, no: inv.no, label: inv.label || "", amount: F.fmP(m.invBalance(inv)),
      due: F.longDate(inv.due), days: dayWord(Math.max(1, late)), phone: co.phone, email: co.email });
  }
  FIN.reminderText = reminderText;

  function toChase() { return X.receivables().filter(function (r) { return r.late >= -3; }); }

  function chaseHTML() {
    var rows = toChase();
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("fi_ov_chase")) + '</h2></div><p class="small muted" style="margin:0">' + esc(t("fi_ov_chase_sub")) + "</p>";
    if (!rows.length) return h + ui.empty(t("fi_ov_chase_none")) + "</section>";
    h += '<div class="list">' + rows.map(function (r) {
      var i = r.inv, tn = tone(r.late);
      var when = r.late > 0 ? t(r.late === 1 ? "fi_ov_late_1" : "fi_ov_late_d", { n: r.late, d: u.fmtDate(i.due) }) : t("fi_ov_due_in", { d: u.fmtDate(i.due) });
      return '<div class="li" style="align-items:flex-start;flex-wrap:wrap"><div class="stack" style="gap:3px;min-width:0">' +
        '<span><button type="button" class="link code" data-a="fi-open" data-id="' + esc(i.id) + '">' + esc(i.no) + "</button> · " + esc(m.brand(i.clientId)) + "</span>" +
        '<span class="m">' + esc(i.label || "") + " · " + esc(when) + '</span></div>' +
        '<div class="row" style="gap:8px"><strong class="num">' + F.fmP(r.balance) + "</strong>" + ui.pill(t("fi_ov_tone_" + tn), tn === "final" ? "alert" : tn === "firm" ? "wip" : "") +
        ui.btn(t("fi_ov_copy_wa"), "fi-ov-copy", { cls: "sm", data: { id: i.id } }) + "</div></div>";
    }).join("") + "</div></section>";
    return h;
  }
  GK.act("fi-ov-copy", function (el) {
    var i = S.get("invoices", el.dataset.id); if (!i) return;
    var rc = X.receivables().filter(function (r) { return r.inv.id === i.id; })[0];
    u.copy(reminderText(i, rc ? rc.late : 0)).then(function (ok) { ui.toast(ok ? t("copied") : t("fi_copy_fail")); });
  });

  function render() {
    var rows = X.monthly(6), cur = rows[rows.length - 1], ag = X.aging(), rec = X.receivables(), r = m.rules(), year = u.year(u.today());
    var used = F.capUsed(), late = rec.filter(function (x) { return x.late > 0; }), lateAmt = ag.d1_7 + ag.d8_30 + ag.d31, rw = X.runway();
    var kp = GK.insight.finance() + ui.kpis([
      { lab: t("fi_ov_mrr"), v: F.fm(X.mrr()), n: t("fi_ov_mrr_n") },
      { lab: t("fi_ov_run"), v: rw.months != null ? t("fi_ov_run_v", { n: u.dec(rw.months, 1) }) : "—", n: rw.months != null ? t("fi_ov_run_n") : t("fi_ov_run_none") }
    ]);
    var h = kp;
    if (FIN.cashCheck) h += FIN.cashCheck();
    h += '<div class="grid2"><section class="panel">' + GK.charts.bars({ title: t("fi_ov_inout"), sub: t("fi_ov_inout_sub"), labels: rows.map(function (x) { return x.label; }),
      series: [{ name: t("fi_ov_in"), values: rows.map(function (x) { return Math.round(x.cashIn); }) }, { name: t("fi_ov_out"), values: rows.map(function (x) { return Math.round(x.out); }) }], fmt: F.fm }) + "</section>";
    h += '<section class="panel">' + GK.charts.hbars({ title: t("fi_ov_aging"), sub: t("fi_ov_aging_sub"), fmt: F.fm, items: ["current", "d1_7", "d8_30", "d31"].map(function (k) {
      return { label: t("fi_ov_b_" + k), value: Math.round(ag[k]) };
    }) }) + "</section></div>";
    var cs = X.clientStats().filter(function (c) { return c.received || c.costs; }).slice(0, 6);
    h += '<div class="grid2"><section class="panel">' + GK.charts.hbars({ title: t("fi_ov_profit"), sub: t("fi_ov_profit_sub"), fmt: F.fm,
      items: cs.map(function (c) { return { label: c.client.brand, value: Math.round(c.profit), note: c.received ? t("fi_ov_margin", { p: u.pct(c.margin) }) : "" }; }) }) + "</section>";
    h += chaseHTML() + "</div>";
    return h;
  }
  FIN.tabs.overview = { render: render };
})(window.GK);
