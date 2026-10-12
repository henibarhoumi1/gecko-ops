/* GECKO Ops · finance: Profitability. Margin per client and per project, what clients still owe, how fast they pay, margin by pack. Estimate. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_pf_sort: ["Sort by", "Trier par"], fi_pf_s_profit: ["Profit", "Bénéfice"], fi_pf_s_margin: ["Margin", "Marge"], fi_pf_s_owed: ["Still owed", "Reste dû"], fi_pf_s_speed: ["Payment speed", "Rapidité de paiement"],
    fi_pf_clients: ["By client", "Par client"], fi_pf_projects: ["By project", "Par projet"],
    fi_pf_c_client: ["Client", "Client"], fi_pf_c_projects: ["Projects", "Projets"], fi_pf_c_project: ["Project", "Projet"], fi_pf_c_recv: ["Received", "Reçu"], fi_pf_c_costs: ["Costs", "Coûts"], fi_pf_c_profit: ["Profit", "Bénéfice"],
    fi_pf_c_comm: ["Commission", "Commission"], fi_pf_c_after: ["After commission", "Après commission"], fi_pf_c_margin: ["Margin", "Marge"], fi_pf_c_owed: ["Still owed", "Reste dû"], fi_pf_c_speed: ["Pays in", "Paie en"],
    fi_pf_days: ["{n} days", "{n} jours"], fi_pf_day1: ["1 day", "1 jour"], fi_pf_nocosts: ["no costs logged", "aucun coût saisi"],
    fi_pf_pack: ["Margin by pack", "Marge par pack"], fi_pf_pack_sub: ["Profit as a share of what was received, projects with logged costs. Estimate.", "Bénéfice en part du reçu, projets avec coûts saisis. Estimation."], fi_pf_pack_n: ["{n} projects", "{n} projets"], fi_pf_pack_1: ["1 project", "1 projet"],
    fi_pf_note: ["Profit = received (tax withheld counts as received, stamps left out) minus project costs. Costs stay estimates until the project is closed. Payment speed is the average number of days from issue to the last payment, on paid invoices.", "Bénéfice = reçu (la retenue compte comme reçue, timbres exclus) moins coûts projets. Les coûts restent des estimations jusqu'à la clôture du projet. La rapidité de paiement est la moyenne des jours entre l'émission et le dernier paiement, sur les factures payées."],
    fi_pf_none: ["Nothing to compare yet.", "Rien à comparer pour l'instant."]
  });

  function P() { return F.P(); }
  function daysTxt(n) { return n == null ? "—" : n === 1 ? t("fi_pf_day1") : t("fi_pf_days", { n: n }); }
  /** Average days from issue to the last payment over the paid invoices in the list (null when none). */
  function speed(list) {
    var ds = list.filter(function (i) { return i.no && i.kind !== "credit" && !i.credited && m.invIsPaid(i) && (i.payments || []).length; }).map(function (i) {
      return Math.max(0, u.daysBetween(i.issued, i.payments.map(function (p) { return p.date; }).sort().pop()));
    });
    return ds.length ? Math.round(u.sum(ds) / ds.length) : null;
  }
  function owedOf(list) { return u.sum(list.filter(function (i) { return i.no && i.kind !== "credit" && !i.credited; }), m.invBalance); }
  function pctOrDash(v, has) { return has ? u.pct(v) : "—"; }

  function render() {
    var sort = P().pfSort || "profit";
    var inv = F.invoices();
    var cs = X.clientStats().filter(function (c) { return c.projects || c.invoiced; }).map(function (c) {
      var list = inv.filter(function (i) { return i.clientId === c.client.id; });
      return Object.assign({ speed: speed(list) }, c);
    });
    var key = { profit: function (c) { return -c.profit; }, margin: function (c) { return -(c.costs ? c.margin : -1e9); }, owed: function (c) { return -c.owed; }, speed: function (c) { return c.speed == null ? 1e9 : c.speed; } }[sort] || function (c) { return -c.profit; };
    cs.sort(u.by(key));
    var ps = S.all("projects").map(function (p) {
      var list = m.invoicesOf(p), rec = m.received(p), cost = m.costOf(p), pr = rec - cost, cm = m.commission(p);
      return { p: p, rec: rec, cost: cost, profit: pr, comm: cm.amount, after: pr - cm.amount, margin: rec ? pr / rec * 100 : 0, owed: owedOf(list), speed: speed(list) };
    }).filter(function (x) { return x.rec || x.cost || x.owed; });
    var pkey = { profit: function (x) { return -x.profit; }, margin: function (x) { return -(x.cost ? x.margin : -1e9); }, owed: function (x) { return -x.owed; }, speed: function (x) { return x.speed == null ? 1e9 : x.speed; } }[sort];
    ps.sort(u.by(pkey));

    var h = '<div class="row" style="align-items:flex-end"><div style="min-width:200px">' + ui.field({ id: "fi-pf-sort", label: t("fi_pf_sort"), type: "select", value: sort,
      options: ["profit", "margin", "owed", "speed"].map(function (k) { return [k, t("fi_pf_s_" + k)]; }), attrs: ' data-c="fi-pf-sort"' }) + "</div></div>";

    // margin by pack
    var by = {};
    ps.forEach(function (x) { if (!x.rec || !x.cost) return; var k = x.p.pack; var o = by[k] || (by[k] = { rec: 0, profit: 0, n: 0 }); o.rec += x.rec; o.profit += x.profit; o.n++; });
    var items = Object.keys(by).map(function (k) { var o = by[k]; return { label: m.pack(k).name, value: Math.round(o.profit / o.rec * 100), note: o.n === 1 ? t("fi_pf_pack_1") : t("fi_pf_pack_n", { n: o.n }) }; }).sort(u.by("value", "desc"));
    h += '<section class="panel">' + GK.charts.hbars({ title: t("fi_pf_pack"), sub: t("fi_pf_pack_sub"), items: items, fmt: function (v) { return u.pct(v); }, max: Math.max(100, items.length ? items[0].value : 0) }) + "</section>";

    if (!cs.length && !ps.length) return h + ui.empty(t("fi_pf_none"));
    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_pf_clients")) + '</h3><div class="tbl"><table style="min-width:860px"><thead><tr><th>' + esc(t("fi_pf_c_client")) + '</th><th class="r">' + esc(t("fi_pf_c_projects")) + '</th><th class="r">' + esc(t("fi_pf_c_recv")) +
      '</th><th class="r">' + esc(t("fi_pf_c_costs")) + '</th><th class="r">' + esc(t("fi_pf_c_profit")) + '</th><th class="r">' + esc(t("fi_pf_c_margin")) + '</th><th class="r">' + esc(t("fi_pf_c_owed")) + '</th><th class="r">' + esc(t("fi_pf_c_speed")) + "</th></tr></thead><tbody>";
    cs.forEach(function (c) {
      h += "<tr><td>" + esc(c.client.brand) + (c.costs || !c.received ? "" : " " + ui.pill(t("fi_pf_nocosts"), "alert")) + '</td><td class="r num">' + c.projects + '</td><td class="r num">' + F.fm(c.received) + '</td><td class="r num">' + F.fm(c.costs) + '</td><td class="r num">' + F.fm(c.profit) +
        '</td><td class="r num">' + pctOrDash(c.margin, c.costs && c.received) + '</td><td class="r num">' + F.fm(c.owed) + '</td><td class="r num">' + esc(daysTxt(c.speed)) + "</td></tr>";
    });
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + u.sum(cs, function (c) { return c.projects; }) + '</td><td class="r num">' + F.fm(u.sum(cs, function (c) { return c.received; })) + '</td><td class="r num">' + F.fm(u.sum(cs, function (c) { return c.costs; })) +
      '</td><td class="r num">' + F.fm(u.sum(cs, function (c) { return c.profit; })) + '</td><td></td><td class="r num">' + F.fm(u.sum(cs, function (c) { return c.owed; })) + "</td><td></td></tr></tfoot></table></div></section>";

    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_pf_projects")) + '</h3><div class="tbl"><table style="min-width:980px"><thead><tr><th>' + esc(t("fi_pf_c_project")) + '</th><th class="r">' + esc(t("fi_pf_c_recv")) + '</th><th class="r">' + esc(t("fi_pf_c_costs")) +
      '</th><th class="r">' + esc(t("fi_pf_c_profit")) + '</th><th class="r">' + esc(t("fi_pf_c_comm")) + '</th><th class="r">' + esc(t("fi_pf_c_after")) + '</th><th class="r">' + esc(t("fi_pf_c_margin")) + '</th><th class="r">' + esc(t("fi_pf_c_owed")) + '</th><th class="r">' + esc(t("fi_pf_c_speed")) + "</th></tr></thead><tbody>";
    ps.forEach(function (x) {
      h += "<tr><td>" + esc(m.projectLabel(x.p)) + ' <span class="small muted">' + esc(m.pack(x.p.pack).name) + "</span>" + ((x.p.costs || []).length || !x.rec ? "" : " " + ui.pill(t("fi_pf_nocosts"), "alert")) + '</td><td class="r num">' + F.fm(x.rec) + '</td><td class="r num">' + F.fm(x.cost) + '</td><td class="r num">' + F.fm(x.profit) +
        '</td><td class="r num">' + F.fm(x.comm) + '</td><td class="r num">' + F.fm(x.after) + '</td><td class="r num">' + pctOrDash(x.margin, x.cost && x.rec) + '</td><td class="r num">' + F.fm(x.owed) + '</td><td class="r num">' + esc(daysTxt(x.speed)) + "</td></tr>";
    });
    h += "</tbody></table></div></section>";
    h += '<p class="small muted" style="margin:0">' + esc(t("fi_pf_note")) + "</p>";
    return h;
  }
  GK.change("fi-pf-sort", function (el) { P().pfSort = el.value; ui.render(true); });

  FIN.tabs.profit = { render: render };
})(window.GK);
