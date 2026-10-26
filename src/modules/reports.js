/* GECKO Ops · module: reports ("What won"). Hook results per project, the client report, and the all-time leaderboard. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    rp_title: ["Ad results", "Résultats pub"], rp_accent: ["", ""],
    rp_sub: ["Enter the ad numbers per hook, see what won, send the client a report.", "Entrez les chiffres par accroche, voyez ce qui gagne, envoyez le rapport."],
    rp_pick: ["Project", "Projet"],
    rp_none: ["No project is in testing yet. Projects show up here once their files are delivered and the ads are running.", "Aucun projet en test pour l'instant. Les projets apparaissent ici une fois les fichiers livrés et les pubs lancées."],
    rp_results: ["Results per hook", "Résultats par accroche"],
    rp_filled: ["{n} of {total} hooks have numbers", "{n} accroches sur {total} ont des chiffres"],
    rp_how: ["Hook rate = 3-second views ÷ impressions. CTR = link clicks ÷ impressions. Cost per purchase = spend ÷ purchases, in TND. Lowest cost wins.", "Taux d'accroche = vues 3 secondes ÷ impressions. CTR = clics ÷ impressions. Coût par achat = dépense ÷ achats, en TND. Le coût le plus bas gagne."],
    rp_no_hooks: ["This project has no hooks to test.", "Ce projet n'a pas d'accroche à tester."],
    rp_c_rank: ["#", "#"], rp_c_code: ["Code", "Code"], rp_c_angle: ["Angle", "Angle"], rp_c_hook: ["Hook", "Accroche"],
    rp_c_rate: ["Hook rate %", "Taux d'accroche %"], rp_c_ctr: ["CTR %", "CTR %"], rp_c_cpp: ["Cost / purchase (TND)", "Coût / achat (TND)"],
    rp_c_brand: ["Brand", "Marque"], rp_c_tested: ["Hooks with a cost", "Accroches avec un coût"],
    rp_best_hook: ["Best hook", "Meilleure accroche"], rp_best_angle: ["Best angle", "Meilleur angle"],
    rp_angles: ["Angles · average cost per purchase", "Angles · coût moyen par achat"],
    rp_no_edit: ["Only the owner and the Client Lead can enter results.", "Seuls le fondateur et le responsable clients peuvent saisir les résultats."],
    rp_report: ["The report", "Le rapport"],
    rp_now: ["Orders per week now", "Commandes par semaine maintenant"],
    rp_baseline: ["Baseline before GECKO", "Point de départ avant GECKO"],
    rp_baseline_v: ["{v} orders / week, noted {date}", "{v} commandes / semaine, noté le {date}"],
    rp_baseline_none: ["No baseline noted on the client. Add it in Clients.", "Pas de point de départ noté sur le client. Ajoutez-le dans Clients."],
    rp_more: ["What to make more of", "Ce qu'on fait en plus"], rp_kill: ["What to kill", "Ce qu'on arrête"], rp_next: ["Next month's plan", "Le plan du mois prochain"],
    rp_why: ["Why it won", "Pourquoi elle gagne"], rp_log_now: ["Report: {v} orders / week", "Rapport : {v} commandes / semaine"],
    rp_why_ph: ["Angle, hook type, format", "Angle, type d'accroche, format"],
    rp_preview: ["Client report", "Rapport client"],
    rp_copy: ["Copy as text", "Copier en texte"],
    rp_doc_kind: ["What won this month", "Ce qui a gagné ce mois-ci"],
    rp_hl_t_up: ["Orders per week are", "Commandes par semaine en"], rp_hl_a_up: ["up", "hausse"],
    rp_hl_t_down: ["Orders per week are", "Commandes par semaine en"], rp_hl_a_down: ["down", "baisse"],
    rp_hl_t_flat: ["Orders per week are", "Commandes par semaine"], rp_hl_a_flat: ["steady", "stables"],
    rp_hl_t_none: ["Here is what", "Voici ce qui a"], rp_hl_a_none: ["won", "gagné"],
    rp_n_orders: ["Orders / week", "Commandes / semaine"], rp_n_was: ["was {v} before", "contre {v} avant"],
    rp_n_cpp: ["Best cost / purchase", "Meilleur coût / achat"], rp_n_tested: ["Hooks tested", "Accroches testées"],
    rp_n_angles: ["across {n} angles", "sur {n} angles"],
    rp_winners: ["Winners", "Gagnants"], rp_steps: ["Next steps", "Prochaines étapes"],
    rp_per_purchase: ["{v} per purchase", "{v} par achat"], rp_rate_line: ["{v}% hook rate", "{v} % d'accroche"],
    rp_doc_more: ["Make more of", "On fait plus de"], rp_doc_kill: ["Stop", "On arrête"], rp_doc_next: ["Next month", "Le mois prochain"],
    rp_doc_empty: ["Numbers come in after the first week of ads.", "Les chiffres arrivent après la première semaine de pubs."],
    rp_doc_tbd: ["To decide together", "À décider ensemble"],
    rp_doc_contact: ["Questions? Talk to us.", "Une question ? Parlez-nous."],
    rp_board: ["All projects", "Tous les projets"], rp_board_hooks: ["Top 10 hooks by cost per purchase", "Top 10 des accroches par coût par achat"],
    rp_board_angles: ["Angles that won most often", "Les angles qui gagnent le plus"],
    rp_board_none: ["No results yet. The leaderboard fills as numbers come in.", "Pas encore de résultats. Le classement se remplit avec les chiffres."],
    rp_wins: ["{n} win", "{n} victoire"], rp_wins_n: ["{n} wins", "{n} victoires"], rp_won_in: ["Won in: {list}", "Gagnant chez : {list}"],
    rp_res_saved: ["Result saved", "Résultat enregistré"], rp_bad_num: ["Use a number, like 4.5", "Saisissez un nombre, par exemple 4,5"]
  });

  var STAGES_IN = ["testing", "report", "done"];

  function numOrNull(v) { if (v === "" || v == null) return null; var n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function fmt1(v) { if (v == null) return "—"; var s = String(Math.round(v * 10) / 10); return u.fr() ? s.replace(".", ",") : s; }
  function colon() { return u.fr() ? "\u00a0: " : ": "; }
  function money1(v) { if (v == null) return "—"; v = Math.round(v * 10) / 10; return u.money(v, Math.round(v) === v ? 0 : 1); }

  /** Every hook of a project with its numbers, ranked: cost per purchase ascending, then hook rate, then blanks. */
  function hookRows(p) {
    var rows = m.files(p).filter(function (f) { return f.kind === "hook"; }).map(function (f, i) {
      var r = f.item.results || {}, c = numOrNull(r.cpp);
      return { f: f, i: i, rate: numOrNull(r.hook), ctr: numOrNull(r.ctr), cpp: c != null && c > 0 ? c : null };
    });
    rows.sort(function (a, b) {
      if (a.cpp != null && b.cpp != null) return a.cpp - b.cpp || a.i - b.i;
      if (a.cpp != null) return -1; if (b.cpp != null) return 1;
      if (a.rate != null && b.rate != null) return b.rate - a.rate || a.i - b.i;
      if (a.rate != null) return -1; if (b.rate != null) return 1;
      return a.i - b.i;
    });
    rows.forEach(function (r, k) { r.rank = r.cpp != null || r.rate != null ? k + 1 : null; });
    return rows;
  }
  function hasNumbers(r) { return r.cpp != null || r.rate != null || r.ctr != null; }
  /** Average cost per purchase per angle; best = lowest average. */
  function angleStats(p, rows) {
    var by = {};
    rows.forEach(function (r) {
      var id = r.f.reel.angleId; var s = by[id] || (by[id] = { id: id, angle: r.f.angle, hooks: 0, tested: 0, sum: 0 });
      s.hooks++; if (r.cpp != null) { s.tested++; s.sum += r.cpp; }
    });
    var list = Object.keys(by).map(function (k) { var s = by[k]; s.avg = s.tested ? s.sum / s.tested : null; return s; });
    list.sort(function (a, b) { if (a.avg != null && b.avg != null) return a.avg - b.avg; return a.avg != null ? -1 : b.avg != null ? 1 : 0; });
    return { list: list, best: list[0] && list[0].avg != null ? list[0] : null };
  }
  function projects() {
    return S.all("projects").filter(function (p) { return STAGES_IN.indexOf(p.stage) > -1; })
      .sort(function (a, b) { return STAGES_IN.indexOf(a.stage) - STAGES_IN.indexOf(b.stage) || m.projectLabel(a).localeCompare(m.projectLabel(b)); });
  }
  function current(list) {
    var id = ui.p("reports").projectId;
    var p = list.find(function (x) { return x.id === id; });
    if (p) return p;
    return list.find(function (x) { return x.stage === "delivered"; }) || list[0] || null;
  }
  function monthOf(p) {
    var c = m.contractOf(p);
    if (c && p.month) return m.monthKey(c.start, p.month);
    return u.month(p.shootDate || u.today());
  }

  // ---------- the client-facing report (one data source for the page and the text copy) ----------
  function reportData(p) {
    var c = m.client(p.clientId) || {}, rep = p.report || {}, rows = hookRows(p);
    var base = c.baseline && c.baseline.v != null && c.baseline.v !== "" ? +c.baseline.v : null;
    var now = numOrNull(rep.now);
    var state = "none";
    if (now != null && base) { var ch = (now - base) / base * 100; state = ch >= 5 ? "up" : ch <= -5 ? "down" : "flat"; }
    var ranked = rows.filter(function (r) { return r.rank; });
    var angles = angleStats(p, rows);
    return {
      brand: c.brand || "—", month: u.fmtMonth(monthOf(p)),
      title: t("rp_hl_t_" + state), accent: t("rp_hl_a_" + state),
      now: now, base: base,
      bestCpp: ranked.length && ranked[0].cpp != null ? ranked[0] : null,
      tested: rows.filter(hasNumbers).length, angleCount: angles.list.filter(function (a) { return a.tested; }).length,
      winners: ranked.slice(0, 3), why: rep.why || {},
      more: rep.more || "", kill: rep.kill || "", next: rep.next || ""
    };
  }
  function winnerLine(r) {
    return r.cpp != null ? t("rp_per_purchase", { v: money1(r.cpp) }) : t("rp_rate_line", { v: fmt1(r.rate) });
  }
  function docHTML(p) {
    var d = reportData(p), co = m.company();
    var nums = [
      { lab: t("rp_n_orders"), v: d.now != null ? fmt1(d.now) : "—", n: d.base != null ? t("rp_n_was", { v: fmt1(d.base) }) : "" },
      { lab: t("rp_n_cpp"), v: d.bestCpp ? money1(d.bestCpp.cpp) : "—", n: d.bestCpp ? "“" + d.bestCpp.f.item.text + "”" : "" },
      { lab: t("rp_n_tested"), v: String(d.tested), n: d.angleCount ? t("rp_n_angles", { n: d.angleCount }) : "" }
    ];
    var h = '<article class="doc" aria-label="' + esc(t("rp_preview")) + '">';
    h += '<div class="top"><span class="wm">' + GK.logo.wordmark + '</span><span class="lab sm">' + esc(t("rp_doc_kind")) + "</span></div>";
    h += '<div class="center"><span class="lab">' + esc(d.brand) + " · " + esc(d.month) + "</span>" +
      '<h2 class="hl" style="font-size:clamp(30px,5vw,46px)">' + esc(d.title) + " <i>" + esc(d.accent) + "</i></h2></div>";
    h += ui.kpis(nums);
    h += '<div class="stack"><h3 class="sec">' + esc(t("rp_winners")) + "</h3>";
    if (d.winners.length) {
      h += '<div class="list">' + d.winners.map(function (r, i) {
        var why = d.why[r.f.key];
        return '<div class="li"><div class="stack" style="gap:2px"><strong>' + (i + 1) + ". “" + esc(r.f.item.text) + "”</strong>" +
          '<span class="small muted">' + esc(r.f.angle.name) + (why ? " · " + esc(why) : "") + "</span></div>" +
          '<span class="num" style="white-space:nowrap">' + esc(winnerLine(r)) + "</span></div>";
      }).join("") + "</div>";
    } else h += '<p class="small muted" style="margin:0">' + esc(t("rp_doc_empty")) + "</p>";
    h += "</div>";
    h += '<div class="stack"><h3 class="sec">' + esc(t("rp_steps")) + '</h3><div class="list">' +
      [["rp_doc_more", d.more], ["rp_doc_kill", d.kill], ["rp_doc_next", d.next]].map(function (x) {
        return '<div class="li" style="align-items:flex-start;justify-content:flex-start"><span class="lab sm" style="min-width:110px;padding-top:2px">' + esc(t(x[0])) + '</span><span style="flex:1">' + (x[1] ? esc(x[1]) : '<span class="faint">' + esc(t("rp_doc_tbd")) + "</span>") + "</span></div>";
      }).join("") + "</div></div>";
    h += '<div class="foot" style="border-top:1px solid currentColor;padding-top:14px;flex-wrap:wrap"><span class="small">' + esc(t("rp_doc_contact")) + '</span><span class="small">' +
      esc(co.phone) + " · " + esc(co.email) + " · " + esc(co.instagram) + "</span></div>";
    return h + "</article>";
  }
  function docText(p) {
    var d = reportData(p), co = m.company(), L = [];
    L.push("GECKO · " + d.brand + " · " + d.month);
    L.push(d.title + " " + d.accent);
    L.push("");
    var c_ = colon();
    L.push(t("rp_n_orders") + c_ + (d.now != null ? fmt1(d.now) : "—") + (d.base != null ? " (" + t("rp_n_was", { v: fmt1(d.base) }) + ")" : ""));
    if (d.bestCpp) L.push(t("rp_n_cpp") + c_ + money1(d.bestCpp.cpp));
    L.push(t("rp_n_tested") + c_ + d.tested);
    L.push("");
    L.push(t("rp_winners") + c_.replace(/ $/, ""));
    if (d.winners.length) d.winners.forEach(function (r, i) { var why = d.why[r.f.key]; L.push((i + 1) + ". “" + r.f.item.text + "” (" + r.f.angle.name + ") · " + winnerLine(r) + (why ? " · " + why : "")); });
    else L.push(t("rp_doc_empty"));
    L.push("");
    L.push(t("rp_doc_more") + c_ + (d.more || t("rp_doc_tbd")));
    L.push(t("rp_doc_kill") + c_ + (d.kill || t("rp_doc_tbd")));
    L.push(t("rp_doc_next") + c_ + (d.next || t("rp_doc_tbd")));
    L.push("");
    L.push("GECKO · " + co.phone + " · " + co.email + " · " + co.instagram);
    return L.join("\n");
  }

  // ---------- screen parts ----------
  function numInput(p, r, field, val, can, label) {
    if (!can) return '<span class="num">' + esc(val == null ? "—" : fmt1(val)) + "</span>";
    return '<input class="in num" type="text" inputmode="decimal" autocomplete="off" value="' + esc(val == null ? "" : String(val)) + '"' +
      ' data-c="rp-res"' + ui.attrs({ p: p.id, key: r.f.key, f: field }) + ' aria-label="' + esc(label + " · " + r.f.code) + '">';
  }
  function resultsPanel(p, rows, can) {
    var ang = angleStats(p, rows), best = rows[0] && rows[0].rank ? rows[0] : null;
    var filled = rows.filter(hasNumbers).length;
    var h = '<section class="panel"><div class="panel-h"><div class="stack" style="gap:4px"><h2 class="sec">' + esc(t("rp_results")) + "</h2>" +
      '<span class="small muted">' + esc(m.projectLabel(p)) + " · " + esc(t("rp_filled", { n: filled, total: rows.length })) + "</span></div>" + ui.stagePill(p) + "</div>";
    if (!rows.length) return h + ui.empty(t("rp_no_hooks")) + "</section>";
    h += '<p class="small muted" style="margin:0">' + esc(t("rp_how")) + (can ? "" : " " + esc(t("rp_no_edit"))) + "</p>";
    h += '<div class="tbl"><table><thead><tr><th>' + esc(t("rp_c_rank")) + "</th><th>" + esc(t("rp_c_hook")) + "</th><th>" + esc(t("rp_c_angle")) +
      '</th><th class="r">' + esc(t("rp_c_rate")) + '</th><th class="r">' + esc(t("rp_c_ctr")) + '</th><th class="r">' + esc(t("rp_c_cpp")) + "</th></tr></thead><tbody>";
    var shownAngle = false;
    rows.forEach(function (r) {
      var isBest = best && r === best;
      var isBestAngle = ang.best && ang.best.id === r.f.reel.angleId && !shownAngle;
      if (isBestAngle) shownAngle = true;
      h += '<tr><td class="num">' + (r.rank ? r.rank : "—") + "</td>" +
        '<td style="min-width:170px">' + esc(r.f.item.text) + (isBest ? " " + ui.pill(t("rp_best_hook"), "done") : "") + '<br><span class="code faint" style="word-break:normal;white-space:nowrap">' + esc(r.f.code) + "</span></td>" +
        '<td style="min-width:120px">' + esc(r.f.angle.name) + (isBestAngle ? "<br>" + ui.pill(t("rp_best_angle"), "wip") : "") + "</td>" +
        '<td class="r">' + numInput(p, r, "hook", r.rate, can, t("rp_c_rate")) + "</td>" +
        '<td class="r">' + numInput(p, r, "ctr", r.ctr, can, t("rp_c_ctr")) + "</td>" +
        '<td class="r">' + numInput(p, r, "cpp", r.cpp, can, t("rp_c_cpp")) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += '<h3 class="sec">' + esc(t("rp_angles")) + '</h3><div class="list">' + ang.list.map(function (s) {
      return '<div class="li"><div class="stack" style="gap:2px"><strong>' + esc(s.angle.name) + "</strong>" +
        '<span class="m">' + esc(t("rp_c_tested") + colon()) + s.tested + " / " + s.hooks + "</span></div>" +
        '<div class="row">' + (ang.best === s ? ui.pill(t("rp_best_angle"), "wip") : "") + '<span class="num">' + esc(money1(s.avg)) + "</span></div></div>";
    }).join("") + "</div>";
    return h + "</section>";
  }
  function reportPanel(p, rows, can) {
    var c = m.client(p.clientId) || {}, rep = p.report || {};
    var dis = can ? "" : " disabled";
    var pid = ' data-p="' + esc(p.id) + '"';
    var base = c.baseline && c.baseline.v != null && c.baseline.v !== "" ? t("rp_baseline_v", { v: c.baseline.v, date: u.fmtDate(c.baseline.date, { day: "numeric", month: "short", year: "numeric" }) }) : t("rp_baseline_none");
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("rp_report")) + "</h2>" + '<span class="small muted">' + esc(m.projectLabel(p)) + " · " + esc(u.fmtMonth(monthOf(p))) + "</span></div>";
    h += '<div class="form">' +
      ui.field({ id: "rp-now", label: t("rp_now"), type: "number", value: rep.now == null ? "" : rep.now, attrs: ' data-c="rp-rep" data-f="now"' + pid + ' step="0.1" min="0"' + dis }) +
      '<div class="field"><span class="lab sm muted">' + esc(t("rp_baseline")) + '</span><span style="padding:8px 0">' + esc(base) + "</span></div>" +
      ui.field({ id: "rp-more", label: t("rp_more"), type: "textarea", rows: 2, span: true, value: rep.more || "", attrs: ' data-c="rp-rep" data-f="more"' + pid + dis }) +
      ui.field({ id: "rp-kill", label: t("rp_kill"), type: "textarea", rows: 2, span: true, value: rep.kill || "", attrs: ' data-c="rp-rep" data-f="kill"' + pid + dis }) +
      ui.field({ id: "rp-next", label: t("rp_next"), type: "textarea", rows: 2, span: true, value: rep.next || "", attrs: ' data-c="rp-rep" data-f="next"' + pid + dis }) +
      "</div>";
    var winners = rows.filter(function (r) { return r.rank; }).slice(0, 3);
    if (winners.length) {
      h += '<div class="form">' + winners.map(function (r, i) {
        var id = "rp-why-" + i;
        return '<div class="field" style="grid-column:1/-1"><label for="' + id + '">' + esc(t("rp_why")) + " · " + (i + 1) + '</label>' +
          '<span class="small"><span class="code">' + esc(r.f.code) + '</span> <span class="muted">“' + esc(r.f.item.text) + '”</span></span>' +
          '<input id="' + id + '" type="text" value="' + esc((rep.why || {})[r.f.key] || "") + '" placeholder="' + esc(t("rp_why_ph")) + '" data-c="rp-why" data-key="' + esc(r.f.key) + '"' + pid + dis + "></div>";
      }).join("") + "</div>";
    }
    return h + "</section>";
  }
  function leaderboard() {
    var all = [], wins = {};
    S.all("projects").forEach(function (p) {
      var rows = hookRows(p);
      rows.forEach(function (r) { if (r.cpp != null) all.push({ p: p, r: r }); });
      var a = angleStats(p, rows).best;
      if (a) {
        var k = String(a.angle.name || "").trim().toLowerCase();
        var w = wins[k] || (wins[k] = { name: a.angle.name, n: 0, brands: [] });
        w.n++; var b = m.brand(p.clientId); if (w.brands.indexOf(b) < 0) w.brands.push(b);
      }
    });
    all.sort(function (a, b) { return a.r.cpp - b.r.cpp; });
    var top = all.slice(0, 10);
    var h = '<h2 class="sec">' + esc(t("rp_board")) + '</h2><div class="stack" style="gap:18px">';
    h += '<section class="panel"><h3 class="sec">' + esc(t("rp_board_hooks")) + "</h3>";
    if (!top.length) h += ui.empty(t("rp_board_none"));
    else {
      h += '<div class="tbl"><table><thead><tr><th>#</th><th>' + esc(t("rp_c_hook")) + "</th><th>" + esc(t("rp_c_brand")) + '</th><th class="r">' + esc(t("rp_c_rate")) + '</th><th class="r">' + esc(t("rp_c_cpp")) + "</th></tr></thead><tbody>";
      top.forEach(function (x, i) {
        h += '<tr class="click" tabindex="0" data-a="rp-open" data-id="' + esc(x.p.id) + '"><td class="num">' + (i + 1) + '</td><td style="min-width:150px"><strong>' + esc(x.r.f.item.text) + '</strong><br><span class="small muted">' + esc(x.r.f.angle.name) + "</span></td>" +
          '<td style="white-space:nowrap">' + esc(m.brand(x.p.clientId)) + '</td><td class="r num">' + esc(fmt1(x.r.rate)) + '</td><td class="r num">' + esc(money1(x.r.cpp)) + "</td></tr>";
      });
      h += "</tbody></table></div>";
    }
    h += "</section>";
    var wl = Object.keys(wins).map(function (k) { return wins[k]; }).sort(function (a, b) { return b.n - a.n || String(a.name).localeCompare(String(b.name)); });
    h += '<section class="panel"><h3 class="sec">' + esc(t("rp_board_angles")) + "</h3>";
    h += wl.length ? '<div class="list">' + wl.map(function (w) {
      return '<div class="li"><div class="stack" style="gap:2px"><strong>' + esc(w.name) + '</strong><span class="m">' + esc(t("rp_won_in", { list: w.brands.join(", ") })) + "</span></div>" +
        ui.pill(t(w.n === 1 ? "rp_wins" : "rp_wins_n", { n: w.n }), "done") + "</div>";
    }).join("") + "</div>" : ui.empty(t("rp_board_none"));
    return h + "</section></div>";
  }

  GK.view("reports", {
    render: function () {
      var list = projects(), p = current(list), can = m.can("reports.edit");
      var picker = list.length ? '<label class="lab sm" for="rp-pick">' + esc(t("rp_pick")) + '</label><select id="rp-pick" class="in inline" data-c="rp-pick" style="max-width:100%">' +
        list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (p && x.id === p.id ? " selected" : "") + ">" + esc(m.projectLabel(x)) + " · " + esc(t("st_" + x.stage)) + "</option>"; }).join("") + "</select>" : "";
      var h = ui.head({ label: t("nav_reports"), title: t("rp_title"), accent: t("rp_accent"), sub: esc(t("rp_sub")), actions: picker + ui.sample() });
      if (!p) return h + ui.empty(t("rp_none")) + leaderboard();
      var rows = hookRows(p);
      h += resultsPanel(p, rows, can);
      h += reportPanel(p, rows, can);
      h += '<div class="row between"><h2 class="sec">' + esc(t("rp_preview")) + "</h2>" + ui.btn(t("rp_copy"), "rp-copy", { cls: "primary sm", data: { id: p.id } }) + "</div>";
      h += docHTML(p);
      h += leaderboard();
      return h;
    },
    count: function () {
      var n = S.all("projects").filter(function (p) { return p.stage === "delivered" && !hookRows(p).some(hasNumbers); }).length;
      return n || "";
    }
  });

  GK.change("rp-pick", function (el) { ui.go("reports", { projectId: el.value }); });
  GK.act("rp-open", function (el) { ui.go("reports", { projectId: el.getAttribute("data-id") }); });
  GK.change("rp-res", function (el) {
    if (!m.can("reports.edit")) return ui.toast(t("rp_no_edit"));
    var p = m.project(el.getAttribute("data-p")); if (!p) return;
    var f = m.findFile(p, el.getAttribute("data-key")); if (!f || f.kind !== "hook") return;
    var raw = el.value.trim(), v = raw === "" ? null : numOrNull(raw);
    if (raw !== "" && (v == null || v < 0)) { el.setAttribute("aria-invalid", "true"); el.focus(); return ui.toast(t("rp_bad_num")); }
    el.removeAttribute("aria-invalid");
    var reels = u.clone(p.reels || []);
    var reel = reels.find(function (r) { return r.id === f.reel.id; }); if (!reel) return;
    var hk = reel.hooks[f.hookIndex]; if (!hk) return;
    var res = Object.assign({ hook: null, ctr: null, cpp: null }, hk.results || {});
    res[el.getAttribute("data-f")] = v;
    hk.results = res;
    S.patch("projects", p.id, { reels: reels });
    ui.toast(t("rp_res_saved"));
  });
  GK.change("rp-rep", function (el) {
    if (!m.can("reports.edit")) return ui.toast(t("rp_no_edit"));
    var p = m.project(el.getAttribute("data-p")); if (!p) return;
    var rep = u.clone(p.report || { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" });
    var f = el.getAttribute("data-f");
    if (f === "now") { var n = numOrNull(el.value); rep.now = n == null ? "" : String(n); }
    else rep[f] = el.value.trim();
    S.patch("projects", p.id, { report: rep }, f === "now" ? { log: t("rp_log_now", { v: rep.now ? fmt1(+rep.now) : "—" }) } : null);
    ui.toast(t("saved"));
  });
  GK.change("rp-why", function (el) {
    if (!m.can("reports.edit")) return ui.toast(t("rp_no_edit"));
    var p = m.project(el.getAttribute("data-p")); if (!p) return;
    var rep = u.clone(p.report || {}); rep.why = rep.why || {};
    var k = el.getAttribute("data-key"), v = el.value.trim();
    if (v) rep.why[k] = v; else delete rep.why[k];
    S.patch("projects", p.id, { report: rep });
    ui.toast(t("saved"));
  });
  GK.act("rp-copy", function (el) {
    var p = m.project(el.getAttribute("data-id")); if (!p) return;
    u.copy(docText(p)).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
})(window.GK);
