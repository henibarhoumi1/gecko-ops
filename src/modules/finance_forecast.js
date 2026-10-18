/* GECKO Ops · finance: 13-week cash forecast. Booked money only, and with the pipeline (leads you can switch on and off). Estimate. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_fc_open: ["Cash in the bank today (TND)", "Trésorerie en banque aujourd'hui (TND)"], fi_fc_open_h: ["The forecast starts from this number. Check it against your bank balance once a week.", "La prévision part de ce chiffre. Comparez-le chaque semaine au solde de la banque."],
    fi_fc_open_save: ["Save opening cash", "Enregistrer la trésorerie"], fi_fc_open_saved: ["Opening cash saved", "Trésorerie de départ enregistrée"], fi_fc_open_zero: ["Opening cash is 0, so the balances below show only the change from today. Enter your real balance to make them true.", "La trésorerie de départ est à 0 : les soldes ci-dessous montrent seulement la variation depuis aujourd'hui. Entrez votre solde réel."],
    fi_fc_founder: ["Only the owner can change the opening cash.", "Seul le fondateur peut modifier la trésorerie de départ."],
    fi_fc_chart: ["Cash balance, next 13 weeks", "Solde de trésorerie, 13 prochaines semaines"], fi_fc_chart_sub: ["Two lines: what is booked, and booked plus the leads you keep switched on. Estimate.", "Deux lignes : ce qui est acquis, et acquis plus les prospects que vous laissez activés. Estimation."],
    fi_fc_booked: ["Booked only", "Acquis seulement"], fi_fc_pipe: ["With pipeline", "Avec le pipeline"],
    fi_fc_neg_booked: ["Booked money only: the balance goes below zero in the week of {d} ({a}).", "Argent acquis seulement : le solde passe sous zéro la semaine du {d} ({a})."],
    fi_fc_neg_pipe: ["With the pipeline you kept on: the balance goes below zero in the week of {d} ({a}).", "Avec le pipeline activé : le solde passe sous zéro la semaine du {d} ({a})."],
    fi_fc_ok_booked: ["Booked money only: the balance stays above zero for the 13 weeks.", "Argent acquis seulement : le solde reste au-dessus de zéro pendant les 13 semaines."],
    fi_fc_ok_pipe: ["With the pipeline you kept on: the balance stays above zero for the 13 weeks.", "Avec le pipeline activé : le solde reste au-dessus de zéro pendant les 13 semaines."],
    fi_fc_first_neg: ["First week below zero", "Première semaine sous zéro"],
    fi_fc_c_week: ["Week of", "Semaine du"], fi_fc_c_in: ["In, booked", "Entrées acquises"], fi_fc_c_pipe: ["In, pipeline", "Entrées pipeline"], fi_fc_c_out: ["Out", "Sorties"], fi_fc_c_bal: ["Balance, booked", "Solde acquis"], fi_fc_c_balp: ["Balance, with pipeline", "Solde avec pipeline"],
    fi_fc_table: ["Week by week", "Semaine par semaine"], fi_fc_table_h: ["Tap a week to see what is in and out.", "Touchez une semaine pour voir les entrées et les sorties."],
    fi_fc_week: ["Week of {d}", "Semaine du {d}"], fi_fc_in: ["Money in, booked", "Entrées acquises"], fi_fc_lead: ["Money in, pipeline (not booked)", "Entrées pipeline (non acquises)"], fi_fc_out: ["Money out", "Sorties"],
    fi_fc_nothing: ["Nothing this week.", "Rien cette semaine."], fi_fc_salary: ["Owner salary", "Salaire du fondateur"], fi_fc_comm: ["Partner share owed", "Part partenaire due"],
    fi_fc_if: ["What if", "Et si"], fi_fc_if_h: ["Switch leads off to see the line without them. Each lead counts as its chance times 50% of the pack (a month for monthly offers), two weeks after its next step.", "Désactivez des prospects pour voir la ligne sans eux. Chaque prospect compte à hauteur de sa probabilité × 50 % du pack (un mois pour les offres mensuelles), deux semaines après sa prochaine étape."],
    fi_fc_if_none: ["No lead at the call or proposal stage right now.", "Aucun prospect au stade appel ou proposition pour l'instant."], fi_fc_if_row: ["{b} · {s} · {a}", "{b} · {s} · {a}"],
    fi_fc_note: ["Booked: unpaid invoices on their due date (late ones land in week 1). Out: overheads from the Expenses tab, Owner salary on the 1st, commission owed in week 1 and project costs in the week of the shoot. Estimate.", "Acquis : factures impayées à leur échéance (les retards tombent la semaine 1). Sorties : charges de l'onglet Dépenses, salaire du fondateur le 1er, commission due la semaine 1 et coûts projets la semaine du tournage. Estimation."],
    fi_fc_prob: ["{p} chance", "{p} de chances"]
  });

  var LEAD_P = { call: 0.2, proposal: 0.45 };
  function P() { return F.P(); }
  function leadValue(l) { var pk = m.pack(l.pack); return Math.round(pk.price * (pk.monthly ? 1 : 0.5) * (LEAD_P[l.stage] || 0)); }
  function pipeLeads() { return S.all("leads").filter(function (l) { return LEAD_P[l.stage]; }); }

  /** The 13 weeks, with a what-if "with pipeline" balance that leaves out the leads switched off. */
  function rows() {
    var off = P().fcOff || {}, base = X.forecast(13), cum = 0;
    return base.map(function (r) {
      var skip = u.sum(r.items.filter(function (i) { return i.k === "lead" && off[i.t]; }), function (i) { return i.v; });
      var pipe = r.inPipeline - skip; cum += pipe;
      return { wk: r.wk, label: r.label, inBooked: r.inBooked, inPipe: pipe, out: r.out, bal: r.balance, balP: r.balance + cum, items: r.items.filter(function (i) { return !(i.k === "lead" && off[i.t]); }) };
    });
  }
  function firstNeg(rs, key) { for (var i = 0; i < rs.length; i++) if (rs[i][key] < 0) return i; return -1; }
  function itemName(i) { return i.t === "Salary" ? t("fi_fc_salary") : i.t === "Commission" ? t("fi_fc_comm") : i.t; }

  /** One sentence for the Overview: when the booked balance first goes below zero, or that it doesn't. */
  FIN.cashCheck = function () {
    var rs = rows(), n = firstNeg(rs, "bal"), cash = +m.rules().openingCash || 0;
    if (!cash && n < 0) return "";
    var txt = n >= 0 ? t("fi_fc_neg_booked", { d: u.fmtDate(rs[n].wk, { day: "numeric", month: "long" }), a: F.fm(rs[n].bal) }) : t("fi_fc_ok_booked");
    return '<div class="note strong row between" style="margin:0"><span><strong>' + esc(t("fi_ov_cash_check")) + F.colon().replace(/\s$/, "") + "</strong> " + esc(txt) + "</span>" +
      ui.btn(t("fi_ov_cash_check_open"), "fi-tab", { cls: "ghost sm", data: { tab: "forecast" } }) + "</div>";
  };

  function render() {
    var rs = rows(), p = P(), wk = Math.min(rs.length - 1, Math.max(0, +p.fcWeek || 0)), r = m.rules(), off = p.fcOff || {};
    var nb = firstNeg(rs, "bal"), np = firstNeg(rs, "balP");
    var h;
    if (m.cashTotal && m.cashTotal() != null) {
      h = '<section class="panel"><div class="row between"><p class="note strong" style="margin:0">' + esc(t("fi_cb_old_note")) + " " + esc(t("fi_cb_k_now")) + F.colon() + F.fm(r.openingCash) + "</p>" +
        ui.btn(t("fi_cb_open_book"), "fi-tab", { cls: "ghost sm", data: { tab: "cash" } }) + "</div></section>";
    } else {
      h = '<section class="panel"><div class="row" style="align-items:flex-end"><div style="min-width:240px;flex:1;max-width:340px">' +
        ui.field({ id: "fi-fc-open", label: t("fi_fc_open"), type: "number", value: Math.round(+r.openingCash || 0), hint: t("fi_fc_open_h"), attrs: ' step="1"' }) + "</div>" +
        F.wBtn(t("fi_fc_open_save"), "fi-fc-open-save", { cls: "primary" }) + "</div>";
      if (!(+r.openingCash)) h += '<p class="note" style="margin:0">' + esc(t("fi_fc_open_zero")) + "</p>";
      h += "</section>";
    }

    h += '<div class="stack" style="gap:6px"><p class="note strong" style="margin:0">' + esc(nb >= 0 ? t("fi_fc_neg_booked", { d: u.fmtDate(rs[nb].wk, { day: "numeric", month: "long" }), a: F.fm(rs[nb].bal) }) : t("fi_fc_ok_booked")) + "</p>" +
      '<p class="note' + (np >= 0 ? " strong" : "") + '" style="margin:0">' + esc(np >= 0 ? t("fi_fc_neg_pipe", { d: u.fmtDate(rs[np].wk, { day: "numeric", month: "long" }), a: F.fm(rs[np].balP) }) : t("fi_fc_ok_pipe")) + "</p></div>";

    h += '<section class="panel">' + GK.charts.line({ title: t("fi_fc_chart"), sub: t("fi_fc_chart_sub"), labels: rs.map(function (x) { return x.label; }),
      series: [{ name: t("fi_fc_booked"), values: rs.map(function (x) { return Math.round(x.bal); }) }, { name: t("fi_fc_pipe"), values: rs.map(function (x) { return Math.round(x.balP); }), dash: true, c: 2 }], fmt: F.fm }) + "</section>";

    // what if
    var leads = pipeLeads();
    h += '<section class="panel"><div class="panel-h"><h3 class="sec">' + esc(t("fi_fc_if")) + '</h3></div><p class="small muted" style="margin:0">' + esc(t("fi_fc_if_h")) + "</p>";
    if (!leads.length) h += ui.empty(t("fi_fc_if_none"));
    else h += '<div class="grid3" style="gap:4px 18px">' + leads.map(function (l) {
      return ui.field({ id: "fi-fc-l-" + l.id, label: t("fi_fc_if_row", { b: l.brand, s: t("ls_" + l.stage) + " " + t("fi_fc_prob", { p: u.pct(LEAD_P[l.stage] * 100) }), a: F.fm(leadValue(l)) }),
        type: "checkbox", value: !off[l.brand], attrs: ' data-c="fi-fc-lead" data-b="' + esc(l.brand) + '"' });
    }).join("") + "</div>";
    h += "</section>";

    // table
    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_fc_table")) + '</h3><p class="small muted" style="margin:0">' + esc(t("fi_fc_table_h")) + '</p><div class="tbl"><table style="min-width:760px"><thead><tr><th>' + esc(t("fi_fc_c_week")) + '</th><th class="r">' + esc(t("fi_fc_c_in")) +
      '</th><th class="r">' + esc(t("fi_fc_c_pipe")) + '</th><th class="r">' + esc(t("fi_fc_c_out")) + '</th><th class="r">' + esc(t("fi_fc_c_bal")) + '</th><th class="r">' + esc(t("fi_fc_c_balp")) + "</th></tr></thead><tbody>";
    rs.forEach(function (x, i) {
      h += '<tr class="click" tabindex="0" data-a="fi-fc-week" data-w="' + i + '"><td>' + (i === wk ? "<strong>" : "") + esc(u.fmtDate(x.wk)) + (i === wk ? "</strong>" : "") + (i === nb ? " " + ui.pill(t("fi_fc_first_neg"), "alert") : "") + '</td><td class="r num">' + F.fm(x.inBooked) + '</td><td class="r num">' + F.fm(x.inPipe) +
        '</td><td class="r num">' + F.fm(x.out) + '</td><td class="r num">' + F.fm(x.bal) + '</td><td class="r num">' + F.fm(x.balP) + "</td></tr>";
    });
    h += "</tbody></table></div>";

    // drilldown
    var w = rs[wk], inB = w.items.filter(function (i) { return i.k === "in"; }), inL = w.items.filter(function (i) { return i.k === "lead"; }), out = w.items.filter(function (i) { return i.k === "out"; });
    function grp(title, list) {
      return '<div class="stack" style="gap:4px"><span class="lab sm muted">' + esc(title) + "</span>" + (list.length ? '<div class="list">' + list.map(function (i) {
        return '<div class="li"><span>' + esc(itemName(i)) + '</span><span class="num">' + F.fm(i.v) + "</span></div>";
      }).join("") + "</div>" : '<span class="small faint">' + esc(t("fi_fc_nothing")) + "</span>") + "</div>";
    }
    h += '<div class="panel"><h3 class="sec">' + esc(t("fi_fc_week", { d: u.fmtDate(w.wk, { day: "numeric", month: "long" }) })) + '</h3><div class="grid3">' + grp(t("fi_fc_in"), inB) + grp(t("fi_fc_lead"), inL) + grp(t("fi_fc_out"), out) + "</div></div>";
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_fc_note")) + "</p></section>";
    return h;
  }

  GK.act("fi-fc-week", function (el) { P().fcWeek = +el.dataset.w; ui.render(true); });
  GK.change("fi-fc-lead", function (el) { var off = P().fcOff || (P().fcOff = {}); if (el.checked) delete off[el.dataset.b]; else off[el.dataset.b] = 1; ui.render(true); });
  GK.act("fi-fc-open-save", function () {
    if (m.cashTotal && m.cashTotal() != null) return;
    if (!F.canW()) return ui.toast(t("fi_fc_founder"));
    var v = Math.round(u.numVal("fi-fc-open"));
    S.setConfig({ rules: Object.assign({}, m.rules(), { openingCash: v }) });
    ui.toast(t("fi_fc_open_saved"));
  });

  FIN.forecastRows = rows;
  FIN.tabs.forecast = { render: render };
})(window.GK);
