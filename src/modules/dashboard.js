/* GECKO Ops · module: dashboard (CEO cockpit). Founder only. Every number comes from GK.x / GK.m; all money-out figures are estimates. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, X = GK.x, C = GK.charts, esc = u.esc;

  GK.i18n.add({
    db_title: ["Numbers", "Chiffres"], db_accent: ["", ""],
    db_sub: ["Are we okay this month, what is slipping, where the next money comes from.", "On va bien ce mois-ci, ce qui glisse, d'où vient le prochain argent."],
    db_founder_only: ["The dashboard is for the owner only.", "Le tableau de bord est réservé au fondateur."],
    db_range: ["Period", "Période"], db_r3: ["3 months", "3 mois"], db_r6: ["6 months", "6 mois"], db_r12: ["12 months", "12 mois"],
    db_est: ["Estimates built from your records. Accountant to confirm.", "Estimations calculées depuis vos données. À confirmer par le comptable."],
    // look at
    db_look: ["Look at this", "À regarder"], db_look_none: ["Nothing is slipping. Keep shooting and selling.", "Rien ne glisse. On continue à tourner et à vendre."],
    db_l_overdue_1: ["1 invoice is overdue: {a}", "1 facture en retard : {a}"], db_l_overdue_n: ["{n} invoices are overdue: {a}", "{n} factures en retard : {a}"],
    db_l_cap: ["Yearly cap {p} used ({a} left)", "Plafond annuel utilisé à {p} (reste {a})"],
    db_l_quiet_1: ["1 lead has gone quiet: {b}", "1 prospect s'est tu : {b}"], db_l_quiet_n: ["{n} leads have gone quiet: {b}", "{n} prospects se sont tus : {b}"],
    db_l_gate_1: ["1 project is blocked by a gate: {b}", "1 projet est bloqué par une étape : {b}"], db_l_gate_n: ["{n} projects are blocked by a gate: {b}", "{n} projets sont bloqués par une étape : {b}"],
    db_l_neg: ["Cash goes below zero in the week of {w} ({a})", "La trésorerie passe sous zéro la semaine du {w} ({a})"],
    db_l_comm: ["Commission owed: {a}", "Commission due : {a}"],
    db_l_cash: ["Set your opening cash in Settings to see the cash forecast and runway.", "Indiquez votre trésorerie de départ dans Réglages pour voir la prévision et l'autonomie."],
    db_b_invoices: ["Open invoices", "Voir les factures"], db_b_cap: ["See the cap", "Voir le plafond"], db_b_pipeline: ["Open pipeline", "Voir le pipeline"],
    db_b_project: ["Open project", "Voir le projet"], db_b_forecast: ["See Money", "Voir l'argent"], db_b_comm: ["Pay it", "Payer"], db_b_settings: ["Open Settings", "Ouvrir Réglages"],
    // tiles
    db_t_cash: ["Cash in this month", "Encaissé ce mois"], db_t_cash_n: ["goal {g}", "objectif {g}"], db_t_cash_n0: ["net, after withholding", "net, après retenue"],
    db_d_vs: ["{s}{p} vs last month", "{s}{p} vs mois dernier"], db_d_new: ["First money in", "Premiers encaissements"],
    db_t_mrr: ["Monthly retainers", "Récurrent mensuel"], db_t_mrr_n_1: ["1 active contract", "1 contrat actif"], db_t_mrr_n: ["{n} active contracts", "{n} contrats actifs"], db_t_mrr_0: ["No monthly contract yet", "Pas encore de contrat mensuel"],
    db_t_owed: ["Clients owe", "Reste à encaisser"], db_t_owed_n: ["{a} overdue", "{a} en retard"], db_t_owed_0: ["Nothing overdue", "Rien en retard"],
    db_t_cap: ["Yearly cap used", "Plafond annuel utilisé"], db_t_cap_s: ["{a} of {b}", "{a} sur {b}"],
    db_t_run: ["Cash runway", "Autonomie de trésorerie"], db_t_run_m: ["{n} months", "{n} mois"], db_t_run_n: ["at {b} a month out", "à {b} de sorties par mois"],
    db_t_run_set: ["Set your opening cash in Settings", "Indiquez votre trésorerie de départ dans Réglages"], db_t_run_na: ["No burn yet", "Pas encore de sorties"],
    db_t_win: ["Win rate", "Taux de succès"], db_t_win_n: ["won of closed leads", "gagnés sur prospects clos"], db_t_win_na: ["No closed lead yet", "Aucun prospect clos"],
    db_t_dm: ["DM reply rate", "Taux de réponse DM"], db_t_dm_n: ["{n} a day vs {g} goal, last 4 weeks", "{n} par jour pour {g} visés, 4 dernières semaines"], db_t_dm_n0: ["{n} a day, last 4 weeks", "{n} par jour, 4 dernières semaines"],
    db_t_dm_na: ["No DMs logged yet", "Aucun DM saisi"],
    // charts
    db_c_money: ["Money in and money out", "Argent entré et sorti"], db_c_money_sub: ["By month, TND. Money out = expenses + salary + project costs + commissions (estimate).", "Par mois, TND. Sorties = dépenses + salaire + coûts projets + commissions (estimation)."],
    db_s_in: ["Money in", "Entrées"], db_s_out: ["Money out", "Sorties"], db_goal: ["Goal", "Objectif"],
    db_net_line: ["Net over {n} months: {a}. Best month {b}.", "Net sur {n} mois : {a}. Meilleur mois : {b}."],
    db_c_fc: ["Next 13 weeks of cash", "Trésorerie des 13 prochaines semaines"], db_c_fc_sub: ["Estimate. Booked = invoices due and costs known. With pipeline adds weighted leads.", "Estimation. Acquis = factures dues et coûts connus. Avec pipeline ajoute les prospects pondérés."],
    db_s_booked: ["Booked", "Acquis"], db_s_pipe: ["With pipeline", "Avec pipeline"], db_fc_set: ["Set your opening cash in Settings so the line starts from the real balance.", "Indiquez votre trésorerie de départ dans Réglages pour partir du vrai solde."],
    db_c_age: ["What clients owe, by age", "Ce que les clients doivent, par ancienneté"], db_a_cur: ["Not due yet", "Pas encore dû"], db_a_1: ["1 to 7 days late", "1 à 7 jours de retard"], db_a_8: ["8 to 30 days late", "8 à 30 jours de retard"], db_a_31: ["Over 30 days late", "Plus de 30 jours de retard"],
    db_dso: ["Clients take {n} days on average to pay.", "Les clients paient en {n} jours en moyenne."],
    db_c_fun: ["Sales funnel, last 4 weeks", "Entonnoir de vente, 4 dernières semaines"], db_f_dms: ["DMs", "DM"], db_f_rep: ["Replies", "Réponses"], db_f_calls: ["Calls", "Appels"], db_f_prop: ["Proposals", "Propositions"], db_f_won: ["Won", "Gagnés"],
    db_pipe: ["Pipeline: {t} open, {w} weighted by stage (estimate).", "Pipeline : {t} ouvert, {w} pondéré par étape (estimation)."],
    db_c_stage: ["Projects by stage", "Projets par étape"],
    db_c_client: ["Profit by client", "Bénéfice par client"], db_c_client_sub: ["Received minus project costs. Margin in grey.", "Reçu moins coûts projet. Marge en gris."], db_margin_t: ["Margin target {g}, average now {a}.", "Marge visée {g}, moyenne actuelle {a}."], db_margin_na: ["Margin target {g}.", "Marge visée {g}."],
    db_c_win: ["What is winning", "Ce qui gagne"], db_c_ang: ["Angles by cost per purchase", "Angles par coût d'achat"], db_c_ang_sub: ["Lower is better. From the results you log on hooks.", "Plus bas est mieux. Selon les résultats saisis sur les accroches."],
    db_c_hook: ["Best hooks", "Meilleures accroches"], db_win_none: ["Log hook results on a project and the winners show up here.", "Saisissez les résultats des accroches dans un projet et les gagnantes apparaissent ici."],
    db_c_team: ["Team workload", "Charge de l'équipe"], db_c_team_sub: ["Open tasks per person.", "Tâches ouvertes par personne."], db_late_n: ["{n} late", "{n} en retard"], db_files_open: ["{n} of {t} files still waiting on someone.", "{n} fichiers sur {t} attendent encore quelqu'un."], db_team_none: ["No open task.", "Aucune tâche ouverte."],
    db_c_ideas: ["Content engine", "Machine à contenu"], db_c_ideas_sub: ["Ideas by stage.", "Idées par étape."], db_ideas_none: ["No idea yet. Start one in Studio.", "Aucune idée pour l'instant. Commencez dans Studio."],
    db_i_idea: ["Idea", "Idée"], db_i_concept: ["Concept", "Concept"], db_i_script: ["Script", "Script"], db_i_ready: ["Ready", "Prêt"], db_i_shot: ["Shot", "Tourné"], db_i_parked: ["Parked", "En pause"],
    db_shoots: ["Next shoots, 14 days", "Prochains tournages, 14 jours"], db_shoots_none: ["No shoot in the next 14 days.", "Aucun tournage dans les 14 prochains jours."], db_today: ["Today", "Aujourd'hui"], db_in_d: ["in {n} days", "dans {n} jours"], db_tomorrow: ["Tomorrow", "Demain"],
    // goals
    db_goals: ["Goals", "Objectifs"], db_goals_sub: ["They feed the goal line and the tiles.", "Ils alimentent la ligne d'objectif et les tuiles."],
    db_g_rev: ["Monthly revenue goal (TND)", "Objectif de chiffre mensuel (TND)"], db_g_dm: ["DMs per day", "DM par jour"], db_g_margin: ["Margin target (%)", "Marge visée (%)"],
    db_g_save: ["Save goals", "Enregistrer les objectifs"], db_g_saved: ["Goals saved", "Objectifs enregistrés"]
  });

  var STYLE_ID = "db-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style"); s.id = STYLE_ID;
    s.textContent =
      ".db-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:14px}" +
      ".db-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:18px}" +
      ".db-grid.w3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}" +
      ".db-tile{padding:14px}.db-tile .stat .row{flex-wrap:wrap!important}.db-tile .stat .v{font-size:30px}.db-tile .ring-wrap{flex-direction:row;align-items:center;gap:12px}.db-tile .ring{width:84px;height:84px;flex:none}" +
      ".db-look .btn{color:var(--slate);border-color:var(--slate)}.db-look .li{align-items:center;flex-wrap:wrap}.db-look .li>span:first-child{flex:1 1 220px;min-width:0}" +
      ".db-ranges{display:flex;gap:4px}.db-note{margin:0;font-size:12px;color:var(--ink-2)}" +
      ".db-sub{display:flex;flex-direction:column;gap:8px}";
    document.head.appendChild(s);
  }

  function cfg() { return S.config() || {}; }
  function goals() { var g = cfg().goals || {}; return { monthlyRevenue: +g.monthlyRevenue || 0, dmsPerDay: +g.dmsPerDay || 0, margin: +g.margin || 0 }; }
  function range() { var n = +ui.p("dashboard").range; return n === 3 || n === 12 ? n : 6; }
  function fm(n) { return u.money(n); }
  function names(arr, fn, max) { var l = arr.slice(0, max || 3).map(fn); if (arr.length > l.length) l.push("+" + (arr.length - l.length)); return l.join(", "); }

  // ---------- look at this ----------
  function lookItems(fc) {
    var out = [], r = m.rules(), today = u.today();
    var late = X.receivables().filter(function (x) { return x.late > 0; });
    if (late.length) out.push({ w: 100, text: t(late.length === 1 ? "db_l_overdue_1" : "db_l_overdue_n", { n: late.length, a: fm(u.sum(late, function (x) { return x.balance; })) }), btn: "db_b_invoices", view: "finance", params: { tab: "invoices", filter: "overdue", invoiceId: "" } });
    var used = m.capUsed(), capP = r.cap ? used / r.cap * 100 : 0;
    if (capP > 70) out.push({ w: capP > 90 ? 95 : 70, text: t("db_l_cap", { p: u.pct(capP), a: fm(Math.max(0, r.cap - used)) }), btn: "db_b_cap", view: "finance", params: { tab: "cap", invoiceId: "" } });
    if (+r.openingCash > 0) {
      var neg = fc.filter(function (w) { return w.balance < 0; })[0];
      if (neg) out.push({ w: 90, text: t("db_l_neg", { w: u.fmtDate(neg.wk), a: fm(neg.balance) }), btn: "db_b_forecast", view: "finance", params: { tab: "forecast", invoiceId: "" } });
    } else out.push({ w: 10, text: t("db_l_cash"), btn: "db_b_settings", view: "settings", params: {} });
    var quiet = S.all("leads").filter(function (l) { return ["dm", "replied", "call", "proposal"].indexOf(l.stage) > -1 && l.nextDate && u.daysBetween(l.nextDate, today) >= 3; });
    if (quiet.length) out.push({ w: 60, text: t(quiet.length === 1 ? "db_l_quiet_1" : "db_l_quiet_n", { n: quiet.length, b: names(quiet, function (l) { return l.brand; }) }), btn: "db_b_pipeline", view: "pipeline", params: quiet.length === 1 ? { id: quiet[0].id } : {} });
    var gated = S.all("projects").filter(function (p) { return p.stage !== "retention" && m.gates(p).length; });
    if (gated.length) out.push({ w: 80, text: t(gated.length === 1 ? "db_l_gate_1" : "db_l_gate_n", { n: gated.length, b: names(gated, function (p) { return m.projectLabel(p); }) }), btn: "db_b_project", view: "projects", params: { id: gated[0].id } });
    var owed = u.sum(S.all("projects"), function (p) { return m.commission(p).owed; });
    if (owed > 0) out.push({ w: 50, text: t("db_l_comm", { a: fm(owed) }), btn: "db_b_comm", view: "finance", params: { tab: "commission", invoiceId: "" } });
    return out.sort(u.by("w", "desc")).slice(0, 6);
  }
  function lookHTML(fc) {
    var items = lookItems(fc);
    return '<section class="panel gel db-look"><div class="panel-h"><h2 class="sec" style="margin:0">' + esc(t("db_look")) + "</h2></div>" +
      (items.length ? '<div class="list">' + items.map(function (i) {
        return '<div class="li"><span>' + esc(i.text) + "</span>" + ui.btn(t(i.btn), "db-go", { cls: "sm", data: { v: i.view, p: JSON.stringify(i.params || {}) } }) + "</div>";
      }).join("") + "</div>" : ui.empty(t("db_look_none"))) + "</section>";
  }

  // ---------- tiles ----------
  function tile(html) { return '<div class="panel db-tile">' + html + "</div>"; }
  function tilesHTML(rows) {
    var g = goals(), r = m.rules(), cur = rows[rows.length - 1], prev = rows[rows.length - 2];
    var h = "";
    // cash in
    var delta = null;
    if (prev && prev.cashIn > 0) { var p = Math.round((cur.cashIn - prev.cashIn) / prev.cashIn * 100); delta = { text: t("db_d_vs", { s: p >= 0 ? "+" : "−", p: u.pct(Math.abs(p)) }), up: p >= 0 }; }
    else if (cur.cashIn > 0) delta = { text: t("db_d_new"), up: true };
    h += tile(C.stat({ lab: t("db_t_cash"), value: fm(cur.cashIn), note: g.monthlyRevenue ? t("db_t_cash_n", { g: fm(g.monthlyRevenue) }) : t("db_t_cash_n0"), trend: rows.map(function (x) { return x.cashIn; }), delta: delta }));
    // mrr
    var act = S.all("contracts").filter(function (c) { return c.status === "active"; }).length;
    h += tile(C.stat({ lab: t("db_t_mrr"), value: fm(X.mrr()), note: act ? (act === 1 ? t("db_t_mrr_n_1") : t("db_t_mrr_n", { n: act })) : t("db_t_mrr_0") }));
    // receivables
    var ag = X.aging(), over = ag.d1_7 + ag.d8_30 + ag.d31;
    h += tile(C.stat({ lab: t("db_t_owed"), value: fm(ag.total), note: over > 0 ? t("db_t_owed_n", { a: fm(over) }) : t("db_t_owed_0"), delta: over > 0 ? { text: "!", up: false } : null }));
    // cap
    var used = m.capUsed();
    h += tile(C.ring({ title: t("db_t_cap"), value: used, max: r.cap || 1, sub: t("db_t_cap_s", { a: fm(used), b: fm(r.cap) }), warnAt: 0.7 }));
    // runway
    var rw = X.runway(), rv, rn;
    if (!(+r.openingCash > 0)) { rv = "—"; rn = t("db_t_run_set"); }
    else if (rw.months == null) { rv = "—"; rn = t("db_t_run_na"); }
    else { rv = t("db_t_run_m", { n: rw.months >= 24 ? "24+" : u.dec(rw.months, 1) }); rn = t("db_t_run_n", { b: fm(rw.burn) }); }
    h += tile(C.stat({ lab: t("db_t_run"), value: rv, note: rn }));
    // win rate
    var wr = X.winRate();
    h += tile(C.stat({ lab: t("db_t_win"), value: wr == null ? "—" : u.pct(wr), note: wr == null ? t("db_t_win_na") : t("db_t_win_n") }));
    // dm reply
    var from = u.addDays(u.today(), -27), logs = S.all("outreach").filter(function (o) { return o.date >= from && o.date <= u.today(); });
    var dms = u.sum(logs, function (o) { return o.dms; }), reps = u.sum(logs, function (o) { return o.replies; });
    var days = logs.filter(function (o) { return +o.dms > 0; }).length, avg = days ? dms / days : 0;
    var note = !dms ? t("db_t_dm_na") : g.dmsPerDay ? t("db_t_dm_n", { n: u.dec(avg, 1), g: g.dmsPerDay }) : t("db_t_dm_n0", { n: u.dec(avg, 1) });
    h += tile(C.stat({ lab: t("db_t_dm"), value: dms ? u.pct(reps / dms * 100) : "—", note: note }));
    return '<div class="db-tiles">' + h + "</div>";
  }

  // ---------- charts ----------
  function panel(inner) { return '<section class="panel">' + inner + "</section>"; }
  function moneyChart(rows) {
    var g = goals(), net = u.sum(rows, function (r) { return r.net; }), best = rows.slice().sort(u.by("net", "desc"))[0];
    var ch = C.bars({ title: t("db_c_money"), sub: t("db_c_money_sub"), labels: rows.map(function (r) { return r.label; }),
      series: [{ name: t("db_s_in"), values: rows.map(function (r) { return Math.round(r.cashIn); }), c: 1 }, { name: t("db_s_out"), values: rows.map(function (r) { return Math.round(r.out); }), c: 2 }],
      goal: g.monthlyRevenue ? { value: g.monthlyRevenue, label: t("db_goal") + " " + C.compact(g.monthlyRevenue) } : null });
    var any = rows.some(function (r) { return r.cashIn || r.out; });
    return panel(ch + (any ? '<p class="db-note">' + esc(t("db_net_line", { n: rows.length, a: fm(net), b: best ? best.label + " " + fm(best.net) : "—" })) + "</p>" : ""));
  }
  function forecastChart(fc) {
    var r = m.rules();
    return panel(C.line({ title: t("db_c_fc"), sub: t("db_c_fc_sub"), labels: fc.map(function (w) { return w.label; }),
      series: [{ name: t("db_s_booked"), values: fc.map(function (w) { return Math.round(w.balance); }), c: 1 }, { name: t("db_s_pipe"), values: fc.map(function (w) { return Math.round(w.balanceWithPipeline); }), c: 2, dash: true }] }) +
      (+r.openingCash > 0 ? "" : '<p class="db-note">' + esc(t("db_fc_set")) + "</p>"));
  }
  function agingChart() {
    var a = X.aging(), d = X.dso();
    return panel(C.hbars({ title: t("db_c_age"), items: [
      { label: t("db_a_cur"), value: a.current, c: 1 }, { label: t("db_a_1"), value: a.d1_7, c: 2 }, { label: t("db_a_8"), value: a.d8_30, c: 2 }, { label: t("db_a_31"), value: a.d31, c: 3 }] }) +
      (d != null ? '<p class="db-note">' + esc(t("db_dso", { n: d })) + "</p>" : ""));
  }
  function funnelChart() {
    var ws = u.weekStart(u.today()), tot = { dms: 0, replies: 0, calls: 0, proposals: 0, won: 0 };
    for (var i = 0; i < 4; i++) { var f = m.funnel(u.addDays(ws, -7 * i)); for (var k in tot) tot[k] += f[k] || 0; }
    var pv = X.pipelineValue();
    return panel(C.funnel({ title: t("db_c_fun"), steps: [{ label: t("db_f_dms"), value: tot.dms }, { label: t("db_f_rep"), value: tot.replies }, { label: t("db_f_calls"), value: tot.calls }, { label: t("db_f_prop"), value: tot.proposals }, { label: t("db_f_won"), value: tot.won }] }) +
      '<p class="db-note">' + esc(t("db_pipe", { t: fm(pv.total), w: fm(pv.weighted) })) + "</p>");
  }
  function stageChart() {
    return panel(C.hbars({ title: t("db_c_stage"), fmt: function (n) { return String(n); }, items: X.stageCounts().map(function (s) { return { label: t("st_" + s.stage), value: s.n }; }) }));
  }
  function clientChart() {
    var g = goals(), cs = X.clientStats().filter(function (c) { return c.received || c.costs; }).slice(0, 8), am = X.avgMargin();
    return panel(C.hbars({ title: t("db_c_client"), sub: t("db_c_client_sub"), items: cs.map(function (c) { return { label: c.client.brand, value: c.profit, note: u.pct(c.margin), c: c.profit < 0 ? 3 : 1, tip: c.client.brand + " · " + fm(c.profit) + " · " + u.pct(c.margin) }; }) }) +
      (g.margin ? '<p class="db-note">' + esc(am == null ? t("db_margin_na", { g: u.pct(g.margin) }) : t("db_margin_t", { g: u.pct(g.margin), a: u.pct(am) })) + "</p>" : ""));
  }
  function winChart() {
    var angs = X.angles().slice(0, 5), hooks = X.hooks().filter(function (h) { return h.cpp; }).sort(u.by("cpp")).slice(0, 5);
    if (!angs.length && !hooks.length) return panel('<h3 class="sec">' + esc(t("db_c_win")) + "</h3>" + ui.empty(t("db_win_none")));
    return panel(C.hbars({ title: t("db_c_ang"), sub: t("db_c_ang_sub"), items: angs.map(function (a) { return { label: a.angle, note: a.brand, value: a.cpp }; }), fmt: function (n) { return u.money(n, 1); } }) +
      C.hbars({ title: t("db_c_hook"), items: hooks.map(function (h) { return { label: h.code, note: h.text, value: h.cpp, tip: h.code + " · " + h.text + " · " + u.money(h.cpp, 1) }; }), fmt: function (n) { return u.money(n, 1); } }));
  }
  function teamChart() {
    var w = X.workload(), info = w[w.length - 1], mem = w.slice(0, -1);
    return panel(C.hbars({ title: t("db_c_team"), sub: t("db_c_team_sub"), fmt: function (n) { return String(n); }, empty: t("db_team_none"),
      items: mem.map(function (x) { return { label: x.member.name, value: x.tasks, note: x.late ? t("db_late_n", { n: x.late }) : "", c: x.late ? 2 : 1 }; }) }) +
      (info && info.filesTotal ? '<p class="db-note">' + esc(t("db_files_open", { n: info.filesOpen, t: info.filesTotal })) + "</p>" : ""));
  }
  function ideasPanel() {
    var ideas = S.all("ideas"), today = u.today(), end = u.addDays(today, 14);
    var stages = ["idea", "concept", "script", "ready", "shot", "parked"];
    var shoots = S.all("projects").filter(function (p) { return p.shootDate && p.shootDate >= today && p.shootDate <= end && p.stage !== "retention"; }).sort(u.by("shootDate"));
    var chart = ideas.length ? C.hbars({ title: t("db_c_ideas"), sub: t("db_c_ideas_sub"), fmt: function (n) { return String(n); }, items: stages.map(function (s) { return { label: t("db_i_" + s), value: ideas.filter(function (i) { return i.stage === s; }).length }; }) })
      : '<h3 class="sec">' + esc(t("db_c_ideas")) + "</h3>" + ui.empty(t("db_ideas_none"));
    var sh = '<h3 class="sec">' + esc(t("db_shoots")) + "</h3>" + (shoots.length ? '<div class="list">' + shoots.map(function (p) {
      var n = u.daysBetween(today, p.shootDate), when = n === 0 ? t("db_today") : n === 1 ? t("db_tomorrow") : t("db_in_d", { n: n });
      return '<div class="li click" tabindex="0" data-a="db-go" data-v="projects" data-p="' + esc(JSON.stringify({ id: p.id })) + '"><span>' + esc(m.projectLabel(p)) + '<span class="m"> · ' + esc(u.fmtDate(p.shootDate)) + "</span></span>" + ui.pill(when, n <= 1 ? "wip" : "") + "</div>";
    }).join("") + "</div>" : ui.empty(t("db_shoots_none")));
    return panel(chart + sh);
  }
  function goalsPanel() {
    var g = goals();
    return panel('<div class="panel-h"><div><h3 class="sec" style="margin:0">' + esc(t("db_goals")) + '</h3><p class="small muted" style="margin:2px 0 0">' + esc(t("db_goals_sub")) + "</p></div></div>" +
      '<div class="form">' + ui.field({ id: "db-g-rev", label: t("db_g_rev"), type: "number", value: g.monthlyRevenue || "" }) + ui.field({ id: "db-g-dm", label: t("db_g_dm"), type: "number", value: g.dmsPerDay || "" }) + ui.field({ id: "db-g-margin", label: t("db_g_margin"), type: "number", value: g.margin || "" }) + "</div>" +
      '<div class="row">' + ui.btn(t("db_g_save"), "db-goals", { cls: "primary" }) + "</div>");
  }

  GK.view("dashboard", {
    count: function () { return ""; },
    render: function () {
      injectStyle();
      if (!m.isFounder()) return ui.head({ label: t("nav_dashboard"), title: t("db_title"), accent: t("db_accent") }) + ui.empty(t("db_founder_only"));
      var n = range(), rows = X.monthly(n), fc = X.forecast(13);
      var tabs = '<div class="tabs db-ranges" role="tablist" aria-label="' + esc(t("db_range")) + '">' + [3, 6, 12].map(function (k) {
        return '<button type="button" role="tab" data-a="db-range" data-n="' + k + '" aria-selected="' + (n === k) + '">' + esc(t("db_r" + k)) + "</button>";
      }).join("") + "</div>";
      var h = ui.head({ label: t("nav_dashboard"), title: t("db_title"), accent: t("db_accent"), sub: esc(t("db_sub")), actions: ui.sample() + tabs });
      h += '<div class="stack" style="gap:18px">';
      h += lookHTML(fc) + tilesHTML(X.monthly(Math.max(n, 2)).slice(-Math.max(n, 2)));
      h += '<div class="db-grid">' + moneyChart(rows) + forecastChart(fc) + "</div>";
      h += '<div class="db-grid w3">' + agingChart() + funnelChart() + stageChart() + "</div>";
      h += '<div class="db-grid">' + clientChart() + winChart() + "</div>";
      h += '<div class="db-grid w3">' + teamChart() + ideasPanel() + goalsPanel() + "</div>";
      h += '<p class="db-note">' + esc(t("db_est")) + "</p></div>";
      return h;
    }
  });

  GK.act("db-range", function (el) { ui.go("dashboard", { range: +el.dataset.n }); });
  GK.act("db-go", function (el) { var p = {}; try { p = JSON.parse(el.dataset.p || "{}"); } catch (e) {} ui.go(el.dataset.v, p); });
  GK.act("db-goals", function () {
    if (!m.isFounder()) return;
    var g = { monthlyRevenue: Math.max(0, u.numVal("db-g-rev")), dmsPerDay: Math.max(0, u.numVal("db-g-dm")), margin: Math.max(0, Math.min(100, u.numVal("db-g-margin"))) };
    S.setConfig({ goals: g }); ui.toast(t("db_g_saved"));
  });
})(window.GK);
