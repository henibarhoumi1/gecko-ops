/* GECKO Ops · finance: Month close. A simple profit-and-loss for one month, against the month before and the monthly goal, plus Heni's real pay. Estimate. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_cl_invoiced: ["Revenue invoiced (before stamp, credit notes deducted)", "Chiffre d'affaires facturé (hors timbre, avoirs déduits)"],
    fi_cl_cash: ["Cash received (net)", "Encaissements (net)"], fi_cl_wh: ["Tax withheld by clients (tax credit, not cash)", "Retenues à la source des clients (crédit d'impôt, pas de la trésorerie)"],
    fi_cl_in: ["Money in", "Total entrées"], fi_cl_costs: ["Project costs", "Coûts des projets"], fi_cl_project_exp: ["Project-linked expense", "Dépense liée au projet"],
    fi_cl_over: ["Overheads (Expenses tab)", "Charges (onglet Dépenses)"], fi_cl_salary: ["Heni's salary", "Salaire de Heni"], fi_cl_comm: ["Commissions paid", "Commissions payées"],
    fi_cl_out: ["Money out", "Total sorties"], fi_cl_reserve: ["Reserve, {p}% of money in", "Réserve, {p} % des entrées"], fi_cl_left: ["Left after reserve", "Reste après réserve"],
    fi_cl_stmt: ["Profit and loss", "Compte de résultat"], fi_cl_est: ["estimate", "estimation"],
    fi_cl_nocosts: ["no costs logged", "aucun coût saisi"],
    fi_cl_note: ["Money in includes tax withheld (a tax credit, not cash). Project costs include actual linked expenses dated this month; project budget estimates are excluded. Overheads come from the Expenses tab. Whole dinars. Estimate.", "Les entrées comptent la retenue à la source (un crédit d'impôt, pas de la trésorerie). Les coûts projets comprennent les dépenses réelles liées datées ce mois ; les estimations de budget des projets sont exclues. Les charges viennent de l'onglet Dépenses. Dinars entiers. Estimation."],
    fi_cl_formula: ["Left = money in − money out − reserve.", "Reste = entrées − sorties − réserve."],
    fi_cl_cmp: ["Against last month and the goal", "Face au mois dernier et à l'objectif"], fi_cl_c_item: ["Line", "Ligne"], fi_cl_c_now: ["This month", "Ce mois"], fi_cl_c_prev: ["Last month", "Mois dernier"], fi_cl_c_diff: ["Change", "Écart"],
    fi_cl_goal: ["Monthly revenue goal: {g}. Invoiced this month: {i}, that is {p} of the goal.", "Objectif de chiffre d'affaires mensuel : {g}. Facturé ce mois : {i}, soit {p} de l'objectif."],
    fi_cl_goal_none: ["No monthly revenue goal set yet. Set one in Settings to compare.", "Pas encore d'objectif mensuel. Définissez-en un dans Réglages pour comparer."],
    fi_cl_pay: ["Heni's real pay", "Le vrai revenu de Heni"],
    fi_cl_pay_ok: ["Salary this month: {s}. After project costs, overheads and the reserve, {l} is left in the studio. If you take it all, your real pay is {r}.", "Salaire ce mois : {s}. Après les coûts projets, les charges et la réserve, il reste {l} dans le studio. Si vous le prenez en entier, votre vrai revenu est de {r}."],
    fi_cl_pay_short: ["Salary this month: {s}. The month did not cover it: it is short by {l}. In real terms the studio only earned {r} for you, and the rest of the salary came from savings.", "Salaire ce mois : {s}. Le mois ne l'a pas couvert : il manque {l}. En réalité le studio n'a gagné que {r} pour vous, le reste du salaire est venu de l'épargne."],
    fi_cl_pay_loss: ["Salary this month: {s}. The month was short by {l}, more than the salary itself: the studio earned nothing for you and spent savings.", "Salaire ce mois : {s}. Le mois est déficitaire de {l}, plus que le salaire lui-même : le studio n'a rien gagné pour vous et a puisé dans l'épargne."],
    fi_cl_pay_nosal: ["No salary is set in Settings, so what is left is all yours: {l}.", "Aucun salaire n'est défini dans Réglages : ce qui reste est tout à vous, soit {l}."],
    fi_cl_12: ["12 months", "12 mois"], fi_cl_c_inv: ["Invoiced", "Facturé"], fi_cl_up: ["up {d}", "en hausse de {d}"], fi_cl_down: ["down {d}", "en baisse de {d}"], fi_cl_same: ["same", "identique"]
  });

  function P() { return F.P(); }
  function row(label, v, o) {
    o = o || {};
    return "<tr><td" + (o.sub ? ' class="small muted" style="padding-left:22px"' : "") + ">" + (o.strong ? "<strong>" + label + "</strong>" : label) + '</td><td class="r num' + (o.sub ? " small muted" : "") + '">' + (o.strong ? "<strong>" + v + "</strong>" : v) + "</td></tr>";
  }
  function diffText(a, b) {
    var d = Math.round(a) - Math.round(b);
    return d === 0 ? t("fi_cl_same") : t(d > 0 ? "fi_cl_up" : "fi_cl_down", { d: F.fm(Math.abs(d)) });
  }
  function overheadSubs(f) {
    var by = {}; f.over.forEach(function (e) { var c = e.category || "other"; by[c] = (by[c] || 0) + (+e.amount || 0); });
    return GK.x.EXPENSE_CATS.filter(function (c) { return by[c]; }).map(function (c) { return row(esc(FIN.catLabel ? FIN.catLabel(c) : c), F.fm(by[c]), { sub: true }); }).join("");
  }
  function payHTML(f) {
    var sal = f.salary, l = f.left, r = sal + l, key, h;
    if (!sal) { key = "fi_cl_pay_nosal"; }
    else if (l >= 0) key = "fi_cl_pay_ok";
    else if (r >= 0) key = "fi_cl_pay_short";
    else key = "fi_cl_pay_loss";
    return '<section class="panel gel"><h3 class="sec">' + esc(t("fi_cl_pay")) + '</h3><p style="margin:0">' + esc(t(key, { s: F.fm(sal), l: F.fm(Math.abs(l)), r: F.fm(Math.max(0, r)) })) + "</p></section>";
  }

  function render() {
    var ym = P().month || u.month(u.today()), f = F.monthFigures(ym), pv = F.monthFigures(F.addMonths(ym, -1)), r = m.rules(), goal = +(m.cfg().goals || {}).monthlyRevenue || 0;
    var h = '<div style="max-width:220px">' + ui.field({ id: "fi-month", label: t("fi_mc_month"), type: "month", value: ym, attrs: ' data-c="fi-month"' }) + "</div>";
    h += '<div class="grid2"><div class="stack"><section class="panel"><div class="panel-h"><h2 class="sec">' + esc(u.fmtMonth(ym)) + '</h2><span class="lab sm muted">' + esc(t("fi_cl_stmt")) + " · " + esc(t("fi_cl_est")) + "</span></div>";
    h += '<div class="tbl"><table><tbody>';
    h += row(esc(t("fi_cl_invoiced")), F.fm(f.invoiced), { strong: true });
    h += '<tr><th colspan="2">' + esc(t("fi_mc_in")) + "</th></tr>";
    h += row(esc(t("fi_cl_cash")), F.fm(f.net));
    h += row(esc(t("fi_cl_wh")), F.fm(f.wh));
    h += row(esc(t("fi_cl_in")), F.fm(f.inTot), { strong: true });
    h += '<tr><th colspan="2">' + esc(t("fi_mc_out")) + "</th></tr>";
    h += row(esc(t("fi_cl_costs")), F.fm(f.costs));
    f.projectExpenses.forEach(function (e) { h += row(esc(t("fi_cl_project_exp")) + " · " + esc(e.label || "—") + " · " + esc(u.fmtDate(e.date)), F.fm(e.amount), { sub: true }); });
    h += row(esc(t("fi_cl_over")), F.fm(f.overheads)) + overheadSubs(f);
    h += row(esc(t("fi_cl_salary")), F.fm(f.salary));
    h += row(esc(t("fi_cl_comm")), F.fm(f.commPaid));
    f.comm.forEach(function (p) { h += row(esc(m.projectLabel(p)), F.fm(p.payout.amount), { sub: true }); });
    h += row(esc(t("fi_cl_out")), F.fm(f.outTot), { strong: true });
    h += row(esc(t("fi_cl_reserve", { p: r.reserve })), F.fm(f.reserve));
    h += "</tbody><tfoot>" + row(esc(t("fi_cl_left")), F.fm(f.left)) + "</tfoot></table></div>";
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_cl_formula")) + '</p><p class="note" style="margin:0">' + esc(t("fi_cl_note")) + "</p></section>" + payHTML(f) + "</div>";

    // comparison + 12 months
    h += '<div class="stack"><section class="stack"><h3 class="sec">' + esc(t("fi_cl_cmp")) + '</h3><div class="tbl"><table><thead><tr><th>' + esc(t("fi_cl_c_item")) + '</th><th class="r">' + esc(t("fi_cl_c_now")) + '</th><th class="r">' + esc(t("fi_cl_c_prev")) + "</th><th>" + esc(t("fi_cl_c_diff")) + "</th></tr></thead><tbody>";
    [["fi_cl_c_inv", "invoiced"], ["fi_cl_in", "inTot"], ["fi_cl_out", "outTot"], ["fi_cl_left", "left"]].forEach(function (k) {
      h += "<tr><td>" + esc(t(k[0])) + '</td><td class="r num">' + F.fm(f[k[1]]) + '</td><td class="r num">' + F.fm(pv[k[1]]) + '</td><td class="small">' + esc(diffText(f[k[1]], pv[k[1]])) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += '<p class="small" style="margin:0">' + esc(goal ? t("fi_cl_goal", { g: F.fm(goal), i: F.fm(f.invoiced), p: u.pct(f.invoiced / goal * 100) }) : t("fi_cl_goal_none")) + "</p></section>";

    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_cl_12")) + '</h3><div class="tbl"><table><thead><tr><th>' + esc(t("fi_mc_month")) + '</th><th class="r">' + esc(t("fi_cl_c_inv")) + '</th><th class="r">' + esc(t("fi_mc_c_in")) + '</th><th class="r">' + esc(t("fi_mc_c_out")) + '</th><th class="r">' + esc(t("fi_mc_c_left")) + "</th></tr></thead><tbody>";
    var tot = { v: 0, i: 0, o: 0, l: 0 };
    for (var k = 11; k >= 0; k--) {
      var mk = F.addMonths(ym, -k), g = F.monthFigures(mk), cur = mk === ym;
      tot.v += g.invoiced; tot.i += g.inTot; tot.o += g.outTot; tot.l += g.left;
      h += '<tr class="click" tabindex="0" data-a="fi-month-go" data-m="' + mk + '"><td>' + (cur ? "<strong>" : "") + esc(u.fmtMonth(mk)) + (cur ? "</strong>" : "") + '</td><td class="r num">' + F.fm(g.invoiced) + '</td><td class="r num">' + F.fm(g.inTot) + '</td><td class="r num">' + F.fm(g.outTot) + '</td><td class="r num">' + F.fm(g.left) + "</td></tr>";
    }
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + F.fm(tot.v) + '</td><td class="r num">' + F.fm(tot.i) + '</td><td class="r num">' + F.fm(tot.o) + '</td><td class="r num">' + F.fm(tot.l) + "</td></tr></tfoot></table></div></section></div></div>";
    return h;
  }
  GK.change("fi-month", function (el) { if (/^\d{4}-\d{2}$/.test(el.value)) { P().month = el.value; el.blur(); ui.render(true); } });
  GK.act("fi-month-go", function (el) { ui.go("finance", { month: el.dataset.m }); });

  FIN.tabs.close = { render: render };
})(window.GK);
