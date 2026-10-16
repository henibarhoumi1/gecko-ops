/* GECKO Ops · finance: Expenses tab. The overheads ledger (software, rent, gear, transport...). Feeds Month close and the cash forecast. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_ex_add: ["Add expense", "Ajouter une dépense"], fi_ex_new_t: ["New", "Nouvelle"], fi_ex_new_a: ["expense", "dépense"], fi_ex_edit_t: ["Edit", "Modifier"], fi_ex_edit_a: ["expense", "dépense"],
    fi_cat_software: ["Software and subscriptions", "Logiciels et abonnements"], fi_cat_gear: ["Gear", "Matériel"], fi_cat_rent: ["Rent and studio", "Loyer et studio"], fi_cat_transport: ["Transport", "Transport"],
    fi_cat_marketing: ["Marketing", "Marketing"], fi_cat_tax: ["Tax and fees", "Impôts et frais"], fi_cat_freelance: ["Freelance, not on a project", "Freelance hors projet"], fi_cat_other: ["Other", "Autre"],
    fi_ex_month: ["Month", "Mois"], fi_ex_cat: ["Category", "Catégorie"], fi_ex_all_months: ["All months", "Tous les mois"], fi_ex_all_cats: ["All categories", "Toutes les catégories"],
    fi_ex_c_date: ["Date", "Date"], fi_ex_c_label: ["Expense", "Dépense"], fi_ex_c_cat: ["Category", "Catégorie"], fi_ex_c_vendor: ["Vendor", "Fournisseur"], fi_ex_c_project: ["Project", "Projet"], fi_ex_c_amount: ["Amount", "Montant"], fi_ex_c_when: ["Repeats", "Récurrence"],
    fi_ex_none: ["No expenses here.", "Aucune dépense ici."], fi_ex_monthly: ["Every month", "Chaque mois"], fi_ex_monthly_until: ["Every month until {m}", "Chaque mois jusqu'en {m}"], fi_ex_once: ["Once", "Une fois"],
    fi_ex_receipt: ["Receipt", "Justificatif"], fi_ex_open_link: ["Open", "Ouvrir"],
    fi_ex_f_date: ["Date (first charge for a monthly one)", "Date (premier prélèvement si mensuelle)"], fi_ex_f_label: ["What was it", "De quoi s'agit-il"], fi_ex_f_cat: ["Category", "Catégorie"], fi_ex_f_amount: ["Amount (DT)", "Montant (DT)"],
    fi_ex_f_rec: ["Repeats", "Récurrence"], fi_ex_f_until: ["Last month (optional)", "Dernier mois (facultatif)"], fi_ex_f_until_h: ["Leave empty while it still runs.", "Laissez vide tant que ça continue."],
    fi_ex_f_vendor: ["Vendor", "Fournisseur"], fi_ex_f_project: ["Project (optional)", "Projet (facultatif)"], fi_ex_f_link: ["Receipt or link (https://...)", "Justificatif ou lien (https://...)"], fi_ex_f_note: ["Note", "Note"],
    fi_ex_f_estimate: ["Replaces estimate (optional)", "Remplace l'estimation (facultatif)"],
    fi_ex_f_estimate_h: ["Select the budget line this actual expense replaces. Amounts are never matched automatically.", "Sélectionnez la ligne de budget que cette dépense réelle remplace. Les montants ne sont jamais rapprochés automatiquement."],
    fi_ex_no_project: ["No project", "Sans projet"], fi_ex_f_none: ["Once", "Une fois"], fi_ex_f_monthly: ["Every month", "Chaque mois"],
    fi_ex_need_label: ["Say what the expense is.", "Indiquez de quelle dépense il s'agit."], fi_ex_need_amount: ["Enter an amount above zero.", "Entrez un montant supérieur à zéro."], fi_ex_need_date: ["Pick a date.", "Choisissez une date."],
    fi_ex_bad_link: ["The link must start with http:// or https://.", "Le lien doit commencer par http:// ou https://."], fi_ex_bad_until: ["The last month can't be before the first charge.", "Le dernier mois ne peut pas précéder le premier prélèvement."],
    fi_ex_founder: ["Only Heni can change expenses.", "Seul Heni peut modifier les dépenses."],
    fi_ex_del_q: ["Delete this expense?", "Supprimer cette dépense ?"], fi_ex_del_body: ["{l} · {a}. A monthly expense disappears from every month, including past closes.", "{l} · {a}. Une dépense mensuelle disparaît de tous les mois, y compris des clôtures passées."], fi_ex_deleted: ["Expense deleted", "Dépense supprimée"],
    fi_ex_k_month: ["Overheads this month", "Charges ce mois"], fi_ex_k_month_n: ["{n} lines", "{n} lignes"], fi_ex_k_rec: ["Monthly commitments", "Engagements mensuels"], fi_ex_k_rec_n: ["repeat every month", "reviennent chaque mois"],
    fi_ex_k_year: ["Overheads this year", "Charges cette année"], fi_ex_k_year_n: ["up to this month", "jusqu'à ce mois"],
    fi_ex_by_cat: ["By category", "Par catégorie"], fi_ex_by_cat_m: ["{m}. Overheads only, project costs are separate.", "{m}. Charges seulement, les coûts projets sont à part."], fi_ex_by_cat_12: ["Last 12 months. Overheads only, project costs are separate.", "12 derniers mois. Charges seulement, les coûts projets sont à part."],
    fi_ex_by_month: ["By month", "Par mois"], fi_ex_by_month_sub: ["Overheads over the last 12 months.", "Charges sur les 12 derniers mois."], fi_ex_series: ["Overheads", "Charges"],
    fi_ex_feeds: ["Where this goes", "Où ça va"],
    fi_ex_feeds_close: ["Month close: every line lands in the month of its date (monthly ones in each month from the first charge to the last) as Overheads, before the reserve.", "Clôture du mois : chaque ligne tombe dans le mois de sa date (les mensuelles dans chaque mois du premier au dernier prélèvement) sous Charges, avant la réserve."],
    fi_ex_feeds_fc: ["Cash forecast: monthly lines repeat on their day of the month in the 13 weeks ahead, one-off lines only if dated in those weeks.", "Prévision : les lignes mensuelles reviennent le même jour du mois sur les 13 semaines à venir, les lignes uniques seulement si elles tombent dans ces semaines."],
    fi_ex_feeds_split: ["Project costs (a shoot day, a freelance editor) stay on the project, so they are not counted twice.", "Les coûts projets (un jour de tournage, un monteur freelance) restent sur le projet : ils ne sont pas comptés deux fois."],
    fi_log_ex_created: ["Expense added", "Dépense ajoutée"], fi_log_ex_edited: ["Expense edited", "Dépense modifiée"]
  });

  var CATS = X.EXPENSE_CATS;
  function catLabel(c) { return t("fi_cat_" + (CATS.indexOf(c) > -1 ? c : "other")); }
  function isOverhead(e) { return !e.projectId || !m.project(e.projectId); }
  function P() { return F.P(); }
  function safeUrl(s) { return /^https?:\/\/\S+$/i.test(String(s || "").trim()); }
  function sumLines(ls) { return u.sum(ls, function (e) { return +e.amount || 0; }); }
  function estimateOptionPairs(projectId, recurring) {
    var opts = [["", "—"]];
    var project = projectId && m.project(projectId);
    if (project && recurring !== "monthly") (project.costs || []).forEach(function (c) {
      opts.push([c.id, (c.label || t("pj_k_" + c.kind)) + " · " + F.fmP(c.amount)]);
    });
    return opts;
  }
  function estimateOptions(projectId, selected, recurring) {
    return estimateOptionPairs(projectId, recurring).map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(selected || "") ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("");
  }

  function scopeLines(ym) {
    if (ym) return X.expensesIn(ym).filter(isOverhead);
    var out = []; X.months(12).forEach(function (k) { out = out.concat(X.expensesIn(k).filter(isOverhead)); });
    return out;
  }

  function render() {
    var p = P(), cur = u.month(u.today());
    var ym = p.exMonth == null ? cur : p.exMonth, cat = p.exCat || "";
    var months = X.months(12).slice().reverse();
    if (ym && months.indexOf(ym) < 0) months.unshift(ym);
    var recAll = S.all("expenses").filter(function (e) { return isOverhead(e) && e.recurring === "monthly" && e.date && u.month(e.date) <= cur && (!e.until || e.until >= cur); });
    var thisMonth = X.expensesIn(cur).filter(isOverhead), yearLines = [];
    X.months(+cur.slice(5, 7), cur).forEach(function (k) { yearLines = yearLines.concat(X.expensesIn(k).filter(isOverhead)); });
    var h = ui.kpis([
      { lab: t("fi_ex_k_month"), v: F.fm(sumLines(thisMonth)), n: t("fi_ex_k_month_n", { n: thisMonth.length }) },
      { lab: t("fi_ex_k_rec"), v: F.fm(sumLines(recAll)), n: t("fi_ex_k_rec_n") },
      { lab: t("fi_ex_k_year"), v: F.fm(sumLines(yearLines)), n: t("fi_ex_k_year_n") }
    ]);
    h += '<div class="row" style="align-items:flex-end"><div style="min-width:200px">' + ui.field({ id: "fi-ex-month", label: t("fi_ex_month"), type: "select", value: ym,
      options: [["", t("fi_ex_all_months")]].concat(months.map(function (k) { return [k, u.fmtMonth(k)]; })), attrs: ' data-c="fi-ex-filter"' }) + '</div><div style="min-width:200px">' +
      ui.field({ id: "fi-ex-cat", label: t("fi_ex_cat"), type: "select", value: cat, options: [["", t("fi_ex_all_cats")]].concat(CATS.map(function (c) { return [c, catLabel(c)]; })), attrs: ' data-c="fi-ex-filter"' }) +
      "</div>" + (F.canW() ? '<span class="right">' + ui.btn(t("fi_ex_add"), "fi-ex-new", { cls: "primary" }) + "</span>" : "") + "</div>";

    // charts
    var sc = scopeLines(ym), by = {};
    sc.forEach(function (e) { var c = CATS.indexOf(e.category) > -1 ? e.category : "other"; by[c] = (by[c] || 0) + (+e.amount || 0); });
    var items = CATS.filter(function (c) { return by[c]; }).map(function (c) { return { label: catLabel(c), value: Math.round(by[c]) }; }).sort(u.by("value", "desc"));
    var mrows = X.months(12).map(function (k) { return { ym: k, v: Math.round(sumLines(X.expensesIn(k).filter(isOverhead))) }; });
    h += '<div class="grid2"><section class="panel">' + GK.charts.hbars({ title: t("fi_ex_by_cat"), sub: ym ? t("fi_ex_by_cat_m", { m: u.fmtMonth(ym) }) : t("fi_ex_by_cat_12"), items: items, fmt: F.fm }) + "</section>" +
      '<section class="panel">' + GK.charts.bars({ title: t("fi_ex_by_month"), sub: t("fi_ex_by_month_sub"), labels: mrows.map(function (r) { return X.monthLabel(r.ym); }),
        series: [{ name: t("fi_ex_series"), values: mrows.map(function (r) { return r.v; }) }], fmt: F.fm }) + "</section></div>";

    // ledger
    var rows;
    if (ym) rows = X.expensesIn(ym); else rows = S.all("expenses").filter(function (e) { return e.date; });
    rows = rows.filter(function (e) { return !cat || (e.category || "other") === cat; }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    if (!rows.length) h += ui.empty(t("fi_ex_none"));
    else {
      h += '<div class="tbl"><table style="min-width:880px"><thead><tr><th>' + esc(t("fi_ex_c_date")) + "</th><th>" + esc(t("fi_ex_c_label")) + "</th><th>" + esc(t("fi_ex_c_cat")) + "</th><th>" + esc(t("fi_ex_c_vendor")) +
        "</th><th>" + esc(t("fi_ex_c_project")) + "</th><th>" + esc(t("fi_ex_c_when")) + '</th><th class="r">' + esc(t("fi_ex_c_amount")) + "</th><th></th></tr></thead><tbody>";
      rows.forEach(function (e) {
        var proj = e.projectId ? m.project(e.projectId) : null;
        var when = e.recurring === "monthly" ? (e.until ? t("fi_ex_monthly_until", { m: u.fmtMonth(e.until) }) : t("fi_ex_monthly")) : t("fi_ex_once");
        h += "<tr><td>" + esc(u.fmtDate(e.date)) + "</td><td>" + esc(e.label) + (e.note ? '<br><span class="small muted">' + esc(e.note) + "</span>" : "") + '</td><td class="small">' + esc(catLabel(e.category)) + "</td><td>" + esc(e.vendor || "—") + "</td><td class=\"small\">" +
          (proj ? esc(m.projectLabel(proj)) : "—") + '</td><td class="small">' + (e.recurring === "monthly" ? ui.pill(when, "wip") : esc(when)) + '</td><td class="r num">' + F.fmP(e.amount) + '</td><td class="r"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">' +
          (safeUrl(e.link) ? '<a class="link small" href="' + esc(e.link.trim()) + '" target="_blank" rel="noopener noreferrer">' + esc(t("fi_ex_receipt")) + "</a>" : "") +
          (F.canW() ? ui.btn(t("edit"), "fi-ex-edit", { cls: "ghost sm", data: { id: e.id } }) + ui.btn(t("del"), "fi-ex-del", { cls: "ghost sm", data: { id: e.id } }) : "") + "</div></td></tr>";
      });
      h += "</tbody><tfoot><tr><td colspan=\"6\">" + esc(t("fi_total_row")) + '</td><td class="r num">' + F.fm(sumLines(rows)) + "</td><td></td></tr></tfoot></table></div>";
    }
    h += '<section class="panel"><h3 class="sec">' + esc(t("fi_ex_feeds")) + '</h3><p class="small" style="margin:0">' + esc(t("fi_ex_feeds_close")) + '</p><p class="small" style="margin:0">' + esc(t("fi_ex_feeds_fc")) +
      '</p><p class="small muted" style="margin:0">' + esc(t("fi_ex_feeds_split")) + "</p></section>";
    return h;
  }
  GK.change("fi-ex-filter", function () { P().exMonth = u.val("fi-ex-month"); P().exCat = u.val("fi-ex-cat"); ui.render(true); });

  // ---------- form ----------
  function form(e) {
    var editing = !!e;
    e = e || { date: u.today(), label: "", category: "software", amount: "", recurring: "none", until: "", vendor: "", projectId: "", link: "", note: "" };
    var projs = S.all("projects").sort(u.by("name"));
    var body = '<div class="form">' +
      ui.field({ id: "fi-ex-f-label", label: t("fi_ex_f_label"), value: e.label, span: true }) +
      ui.field({ id: "fi-ex-f-amount", label: t("fi_ex_f_amount"), type: "number", value: e.amount, attrs: ' min="0" step="0.01"' }) +
      ui.field({ id: "fi-ex-f-date", label: t("fi_ex_f_date"), type: "date", value: e.date }) +
      ui.field({ id: "fi-ex-f-cat", label: t("fi_ex_f_cat"), type: "select", value: e.category || "other", options: CATS.map(function (c) { return [c, catLabel(c)]; }) }) +
      ui.field({ id: "fi-ex-f-rec", label: t("fi_ex_f_rec"), type: "select", value: e.recurring === "monthly" ? "monthly" : "none", options: [["none", t("fi_ex_f_none")], ["monthly", t("fi_ex_f_monthly")]], attrs: ' data-c="fi-ex-rec"' }) +
      ui.field({ id: "fi-ex-f-until", label: t("fi_ex_f_until"), type: "month", value: e.until || "", hint: t("fi_ex_f_until_h") }) +
      ui.field({ id: "fi-ex-f-vendor", label: t("fi_ex_f_vendor"), value: e.vendor || "" }) +
      ui.field({ id: "fi-ex-f-project", label: t("fi_ex_f_project"), type: "select", value: e.projectId || "", options: [["", t("fi_ex_no_project")]].concat(projs.map(function (p) { return [p.id, m.projectLabel(p)]; })), attrs: ' data-c="fi-ex-project"' }) +
      ui.field({ id: "fi-ex-f-estimate", label: t("fi_ex_f_estimate"), type: "select", value: e.estimateId || "", options: estimateOptionPairs(e.projectId, e.recurring), hint: t("fi_ex_f_estimate_h") }) +
      ui.field({ id: "fi-ex-f-link", label: t("fi_ex_f_link"), value: e.link || "", span: true, placeholder: "https://" }) +
      ui.field({ id: "fi-ex-f-note", label: t("fi_ex_f_note"), value: e.note || "", span: true }) + "</div>";
    ui.modal({ title: t(editing ? "fi_ex_edit_t" : "fi_ex_new_t"), accent: t(editing ? "fi_ex_edit_a" : "fi_ex_new_a"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "fi-ex-save", { cls: "primary", data: { id: editing ? e.id : "" } }) });
  }
  GK.change("fi-ex-project", function () {
    var select = document.getElementById("fi-ex-f-estimate");
    if (select) select.innerHTML = estimateOptions(u.val("fi-ex-f-project"), "", u.val("fi-ex-f-rec"));
  });
  GK.change("fi-ex-rec", function () {
    var select = document.getElementById("fi-ex-f-estimate");
    if (select) select.innerHTML = estimateOptions(u.val("fi-ex-f-project"), select.value, u.val("fi-ex-f-rec"));
  });
  GK.act("fi-ex-new", function () { if (!F.canW()) return ui.toast(t("fi_ex_founder")); form(null); });
  GK.act("fi-ex-edit", function (el) { var e = S.get("expenses", el.dataset.id); if (e && F.canW()) form(e); });
  GK.act("fi-ex-save", function (el) {
    if (!F.canW()) return ui.toast(t("fi_ex_founder"));
    var label = u.val("fi-ex-f-label").trim(), amount = F.r3(u.numVal("fi-ex-f-amount")), date = u.val("fi-ex-f-date"), link = u.val("fi-ex-f-link").trim(), until = u.val("fi-ex-f-until");
    var rec = u.val("fi-ex-f-rec") === "monthly" ? "monthly" : "none";
    if (!label) { u.focus("fi-ex-f-label"); return ui.toast(t("fi_ex_need_label")); }
    if (!(amount > 0)) { u.focus("fi-ex-f-amount"); return ui.toast(t("fi_ex_need_amount")); }
    if (!date) { u.focus("fi-ex-f-date"); return ui.toast(t("fi_ex_need_date")); }
    if (link && !safeUrl(link)) { u.focus("fi-ex-f-link"); return ui.toast(t("fi_ex_bad_link")); }
    if (rec !== "monthly") until = "";
    if (until && until < u.month(date)) { u.focus("fi-ex-f-until"); return ui.toast(t("fi_ex_bad_until")); }
    var projectId = u.val("fi-ex-f-project"), estimateId = rec === "monthly" ? "" : u.val("fi-ex-f-estimate");
    var project = projectId ? m.project(projectId) : null;
    if (estimateId && (!project || !(project.costs || []).some(function (c) { return c.id === estimateId; }))) {
      u.focus("fi-ex-f-estimate"); return ui.toast(t("required"));
    }
    var fields = { date: date, label: label, category: u.val("fi-ex-f-cat"), amount: amount, recurring: rec, until: until, vendor: u.val("fi-ex-f-vendor").trim(), projectId: projectId, estimateId: estimateId, link: link, note: u.val("fi-ex-f-note").trim() };
    var id = el.dataset.id, saved;
    if (id) { if (!S.get("expenses", id)) return ui.closeModal(); saved = S.patch("expenses", id, fields, { log: t("fi_log_ex_edited") }); }
    else saved = S.put("expenses", Object.assign({ log: [] }, fields), { log: t("fi_log_ex_created") });
    ui.closeModal(true);
    if (saved) ui.toast(t("saved"));
  });
  GK.act("fi-ex-del", function (el) {
    var e = S.get("expenses", el.dataset.id); if (!e || !F.canW()) return;
    ui.confirm(t("fi_ex_del_q"), t("fi_ex_del_body", { l: e.label, a: F.fmP(e.amount) }), function () { S.remove("expenses", e.id); ui.toast(t("fi_ex_deleted")); }, t("del"));
  });

  FIN.catLabel = catLabel;
  FIN.tabs.expenses = { render: render };
})(window.GK);
