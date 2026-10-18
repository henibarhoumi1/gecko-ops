/* GECKO Ops · marketing: Ads and Showcase tabs. Stored in config.marketing.ads and config.marketing.showcase. Budget, spend and cost per lead are for the founder only. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, K = GK.mk;

  GK.i18n.add({
    mk_a_new: ["New campaign", "Nouvelle campagne"], mk_a_new_t: ["New ad campaign", "Nouvelle campagne pub"], mk_a_edit_t: ["Edit ad campaign", "Modifier la campagne pub"],
    mk_a_hint: ["Our own ad campaigns. Log what each one spent and how many conversations it brought.", "Nos propres campagnes pub. Notez ce que chacune a dépensé et combien de conversations elle a apportées."],
    mk_a_hint_sales: ["Our own ad campaigns and what they brought in. Budget and spend are for the owner.", "Nos propres campagnes pub et ce qu'elles ont rapporté. Budget et dépenses sont réservés au fondateur."],
    mk_a_name: ["Name", "Nom"], mk_a_objective: ["Objective", "Objectif"], mk_a_channel: ["Channel", "Canal"], mk_a_budget: ["Budget (TND)", "Budget (TND)"],
    mk_a_start: ["Start", "Début"], mk_a_end: ["End", "Fin"], mk_a_spend: ["Spent (TND)", "Dépensé (TND)"], mk_a_leads: ["Leads or DMs", "Prospects ou DM"],
    mk_a_cpl: ["Cost per lead", "Coût par prospect"], mk_a_status: ["Status", "Statut"], mk_a_notes: ["Notes", "Notes"],
    mk_ao_messages: ["Messages", "Messages"], mk_ao_traffic: ["Traffic", "Trafic"], mk_ao_awareness: ["Awareness", "Notoriété"], mk_ao_leads: ["Lead form", "Formulaire"],
    mk_as_planned: ["Planned", "Prévue"], mk_as_running: ["Running", "En cours"], mk_as_paused: ["Paused", "En pause"], mk_as_done: ["Finished", "Terminée"],
    mk_a_empty_t: ["No ad campaigns yet", "Aucune campagne pub"], mk_a_empty_b: ["Add the first one. Test phase: 15 TND a day for 14 days.", "Ajoutez la première. Phase de test : 15 TND par jour pendant 14 jours."],
    mk_a_tot_spend: ["Spent", "Dépensé"], mk_a_tot_leads: ["Leads or DMs", "Prospects ou DM"], mk_a_tot_cpl: ["Cost per lead", "Coût par prospect"], mk_a_tot_run: ["Running now", "En cours"],
    mk_a_unit_leads: ["{n} leads", "{n} prospects"],
    // showcase
    mk_w_hint: ["Delivered projects we can show. Only mark one when the client has said yes. Costs are never shown here.", "Projets livrés que nous pouvons montrer. Cochez seulement si le client a dit oui. Les coûts ne sont jamais affichés ici."],
    mk_w_add: ["Add other case", "Ajouter un autre cas"], mk_w_new_t: ["Add a case study", "Ajouter une étude de cas"], mk_w_edit_t: ["Edit case study", "Modifier l'étude de cas"],
    mk_w_title: ["Title or brand", "Titre ou marque"], mk_w_title_ph: ["Brand name and sector", "Nom de la marque et secteur"], mk_w_project: ["Project", "Projet"], mk_w_other: ["Not a project (our own campaign, partner)", "Pas un projet (notre campagne, partenaire)"],
    mk_w_allowed: ["The client allows us to show it", "Le client nous autorise à le montrer"], mk_w_result: ["Result line", "Ligne de résultat"], mk_w_result_ph: ["Real numbers only, for example: cost per purchase down 32%", "Vrais chiffres seulement, par exemple : coût par achat en baisse de 32 %"],
    mk_w_link: ["Link to the work", "Lien vers le travail"], mk_w_notes: ["Notes", "Notes"], mk_w_can: ["Can show", "Peut être montré"], mk_w_wait: ["Not cleared yet", "Pas encore autorisé"],
    mk_w_ready: ["Ready to show", "Prêts à montrer"], mk_w_total: ["Delivered projects", "Projets livrés"], mk_w_noresult: ["No result line yet", "Pas encore de résultat"],
    mk_w_empty_t: ["Nothing to show yet", "Rien à montrer pour l'instant"], mk_w_empty_b: ["Projects appear here once they are delivered. You can also add our own campaign as a case.", "Les projets apparaissent ici une fois livrés. Vous pouvez aussi ajouter notre propre campagne comme cas."],
    mk_w_edit: ["Open", "Ouvrir"]
  });

  var OBJ = ["messages", "traffic", "awareness", "leads"], ST = ["planned", "running", "paused", "done"], CH = ["meta", "tiktok", "linkedin", "other"];
  K.ads = function () { return K.data().ads; };
  K.cpl = function (a) { return (+a.leads > 0 && +a.spend > 0) ? a.spend / a.leads : null; };

  // ---------- Ads ----------
  K.tabs.ads = function () {
    var money = K.money(), ads = K.ads();
    var h = '<div class="mk-bar"><p class="muted small" style="margin:0;flex:1;min-width:200px">' + esc(t(money ? "mk_a_hint" : "mk_a_hint_sales")) + "</p>" +
      ui.btn(t("mk_a_new"), "mk-ad-new", { cls: "primary", icon: "plus", disabled: !K.canEdit(), title: K.canEdit() ? "" : t("mk_no_perm") }) + "</div>";
    if (!ads.length) return h + ui.empty({ title: t("mk_a_empty_t"), text: t("mk_a_empty_b"), action: K.canEdit() ? { label: t("mk_a_new"), a: "mk-ad-new" } : null });
    var spend = u.sum(ads, function (a) { return a.spend; }), leads = u.sum(ads, function (a) { return a.leads; });
    var items = [{ lab: t("mk_a_tot_leads"), v: String(leads), n: "" }, { lab: t("mk_a_tot_run"), v: String(ads.filter(function (a) { return a.status === "running"; }).length), n: "" }];
    if (money) items.unshift({ lab: t("mk_a_tot_spend"), v: u.money(spend), n: "" }, { lab: t("mk_a_tot_cpl"), v: leads && spend ? u.money(spend / leads, 1) : t("mk_dash"), n: "" });
    h += ui.kpis(items);
    var rows = ads.slice().sort(function (a, b) { return String(b.start || "").localeCompare(String(a.start || "")); });
    h += '<div class="mk-table" style="margin-top:var(--sp-4)"><table><thead><tr><th>' + esc(t("mk_a_name")) + "</th><th>" + esc(t("mk_a_status")) + "</th><th>" + esc(t("mk_a_objective")) + "</th><th>" + esc(t("mk_a_channel")) + "</th><th>" + esc(t("mk_a_start")) + "</th><th>" + esc(t("mk_a_end")) + "</th>" +
      (money ? '<th class="r">' + esc(t("mk_a_budget")) + '</th><th class="r">' + esc(t("mk_a_spend")) + "</th>" : "") + '<th class="r">' + esc(t("mk_a_leads")) + "</th>" + (money ? '<th class="r">' + esc(t("mk_a_cpl")) + "</th>" : "") + "</tr></thead><tbody>" +
      rows.map(function (a) {
        var c = K.cpl(a);
        return '<tr data-a="mk-ad-edit" data-id="' + esc(a.id) + '"><td class="w"><b>' + esc(a.name) + "</b>" + (a.notes ? '<br><span class="small muted">' + esc(a.notes) + "</span>" : "") + "</td><td>" + ui.pill(t("mk_as_" + a.status), a.status === "running" ? "chroma" : a.status === "done" ? "done" : "") + "</td><td>" + esc(t("mk_ao_" + a.objective)) + "</td><td>" + esc(t("mk_ch_" + a.channel)) + "</td><td>" + esc(u.fmtDate(a.start)) + "</td><td>" + esc(u.fmtDate(a.end)) + "</td>" +
          (money ? '<td class="r num">' + (a.budget ? esc(u.money(a.budget)) : esc(t("mk_dash"))) + '</td><td class="r num">' + (a.spend ? esc(u.money(a.spend)) : esc(t("mk_dash"))) + "</td>" : "") +
          '<td class="r num">' + (a.leads ? esc(a.leads) : esc(t("mk_dash"))) + "</td>" + (money ? '<td class="r num">' + (c != null ? esc(u.money(c, 1)) : esc(t("mk_dash"))) + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
    return h;
  };
  function adForm(a) {
    var money = K.money();
    return '<div class="form">' + ui.field({ id: "mk-a-name", label: t("mk_a_name"), value: a.name, span: true }) +
      ui.field({ id: "mk-a-objective", label: t("mk_a_objective"), type: "select", value: a.objective, options: K.opts(OBJ, "mk_ao_") }) +
      ui.field({ id: "mk-a-channel", label: t("mk_a_channel"), type: "select", value: a.channel, options: K.opts(CH, "mk_ch_") }) +
      ui.field({ id: "mk-a-status", label: t("mk_a_status"), type: "select", value: a.status, options: K.opts(ST, "mk_as_") }) +
      ui.field({ id: "mk-a-leads", label: t("mk_a_leads"), type: "number", value: a.leads || "" }) +
      ui.field({ id: "mk-a-start", label: t("mk_a_start"), type: "date", value: a.start }) + ui.field({ id: "mk-a-end", label: t("mk_a_end"), type: "date", value: a.end }) +
      (money ? ui.field({ id: "mk-a-budget", label: t("mk_a_budget"), type: "number", value: a.budget || "" }) + ui.field({ id: "mk-a-spend", label: t("mk_a_spend"), type: "number", value: a.spend || "" }) : "") +
      ui.field({ id: "mk-a-notes", label: t("mk_a_notes"), type: "textarea", rows: 3, value: a.notes, span: true }) + "</div>";
  }
  function adOpen(a, isNew) {
    if (!K.guard()) return;
    K.formModal({ title: t(isNew ? "mk_a_new_t" : "mk_a_edit_t"), body: adForm(a), save: "mk-ad-save", del: isNew || !K.money() ? "" : "mk-ad-del", data: { id: a.id || "" } });
  }
  GK.act("mk-ad-new", function () { adOpen({ objective: "messages", channel: "meta", status: "planned", start: u.today() }, true); });
  GK.act("mk-ad-edit", function (el) { var a = K.ads().find(function (x) { return x.id === el.dataset.id; }); if (a) adOpen(a, false); });
  GK.act("mk-ad-save", function (el) {
    if (!K.guard()) return;
    var name = u.val("mk-a-name").trim();
    if (!name) { u.focus("mk-a-name"); return ui.toast(t("required")); }
    var rec = { name: name, objective: u.val("mk-a-objective"), channel: u.val("mk-a-channel"), status: u.val("mk-a-status"), start: u.val("mk-a-start"), end: u.val("mk-a-end"), leads: K.num("mk-a-leads"), notes: u.val("mk-a-notes").trim() };
    if (K.money()) { rec.budget = K.num("mk-a-budget"); rec.spend = K.num("mk-a-spend"); }
    var id = el.dataset.id;
    if (K.save(function (d) { var old = id ? d.ads.find(function (x) { return x.id === id; }) : null; if (old) Object.assign(old, rec); else d.ads.push(Object.assign({ id: K.id(), budget: 0, spend: 0 }, rec)); })) K.done();
  });
  GK.act("mk-ad-del", function (el) {
    if (!K.guard() || !K.money()) return;
    if (K.save(function (d) { d.ads = d.ads.filter(function (x) { return x.id !== el.dataset.id; }); })) K.done();
  });

  // ---------- Showcase ----------
  var DONE = ["delivered", "paid", "retention"];
  function delivered() { return S.all("projects").filter(function (p) { return DONE.indexOf(p.stage) > -1; }); }
  function entryFor(d, pid) { return d.showcase.find(function (e) { return e.projectId === pid; }); }
  function brandOf(p) { var c = p && p.clientId ? m.client(p.clientId) : null; return c ? c.brand : ""; }
  function wCard(title, sub, e, attrs, i) {
    var ok = e && e.allowed;
    return '<div class="mk-card" role="button" tabindex="0" data-a="mk-w-edit"' + attrs + ' style="animation-delay:' + Math.min(i, 8) * 30 + 'ms"><span class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="t">' + esc(title) + "</span>" + (ok ? '<span class="mk-show">' + esc(t("mk_w_can")) + "</span>" : ui.pill(t("mk_w_wait"))) + "</span>" +
      (sub ? '<span class="small muted">' + esc(sub) + "</span>" : "") +
      (e && e.result ? '<p class="mk-quote">' + esc(e.result) + "</p>" : '<span class="small muted">' + esc(t("mk_w_noresult")) + "</span>") + K.linkHTML(e && e.link) + "</div>";
  }
  K.tabs.showcase = function () {
    var d = K.data(), ps = delivered(), others = d.showcase.filter(function (e) { return !e.projectId; });
    var h = '<div class="mk-bar"><p class="muted small" style="margin:0;flex:1;min-width:200px">' + esc(t("mk_w_hint")) + "</p>" + ui.btn(t("mk_w_add"), "mk-w-new", { cls: "primary", icon: "plus", disabled: !K.canEdit(), title: K.canEdit() ? "" : t("mk_no_perm") }) + "</div>";
    if (!ps.length && !others.length) return h + ui.empty({ title: t("mk_w_empty_t"), text: t("mk_w_empty_b") });
    var ready = d.showcase.filter(function (e) { return e.allowed; }).length;
    h += ui.kpis([{ lab: t("mk_w_ready"), v: String(ready), n: "" }, { lab: t("mk_w_total"), v: String(ps.length), n: "" }]);
    var i = 0;
    h += '<div class="mk-grid" style="margin-top:var(--sp-4)">' + ps.map(function (p) {
      var e = entryFor(d, p.id), c = m.pack(p.pack);
      return wCard(brandOf(p) || p.name, [p.name, c.name].filter(Boolean).join(" · "), e, ' data-pid="' + esc(p.id) + '"', i++);
    }).join("") + others.map(function (e) { return wCard(e.title || t("mk_c_untitled"), "", e, ' data-id="' + esc(e.id) + '"', i++); }).join("") + "</div>";
    return h;
  };
  function wForm(e, p) {
    return '<div class="form">' +
      (p ? '<p style="grid-column:1/-1;margin:0"><b>' + esc(brandOf(p) || p.name) + "</b> · " + esc(p.name) + "</p>" : ui.field({ id: "mk-w-title", label: t("mk_w_title"), value: e.title, placeholder: t("mk_w_title_ph"), span: true })) +
      ui.field({ id: "mk-w-allowed", label: t("mk_w_allowed"), type: "checkbox", value: e.allowed }) +
      ui.field({ id: "mk-w-result", label: t("mk_w_result"), value: e.result, placeholder: t("mk_w_result_ph"), span: true }) +
      ui.field({ id: "mk-w-link", label: t("mk_w_link"), value: e.link, placeholder: "https://", span: true }) +
      ui.field({ id: "mk-w-notes", label: t("mk_w_notes"), type: "textarea", rows: 3, value: e.notes, span: true }) + "</div>";
  }
  function wOpen(e, p, isNew) {
    if (!K.guard()) return;
    K.formModal({ title: t(isNew ? "mk_w_new_t" : "mk_w_edit_t"), body: wForm(e, p), save: "mk-w-save", del: e.id && !p ? "mk-w-del" : "", data: { id: e.id || "", pid: p ? p.id : "" } });
  }
  GK.act("mk-w-new", function () { wOpen({}, null, true); });
  GK.act("mk-w-edit", function (el, ev) {
    if (K.onLink(ev)) return;
    var d = K.data(), pid = el.dataset.pid;
    if (pid) return wOpen(entryFor(d, pid) || { projectId: pid }, m.project(pid), false);
    var e = d.showcase.find(function (x) { return x.id === el.dataset.id; }); if (e) wOpen(e, null, false);
  });
  GK.act("mk-w-save", function (el) {
    if (!K.guard()) return;
    var pid = el.dataset.pid, id = el.dataset.id, rec = { allowed: u.checked("mk-w-allowed"), result: u.val("mk-w-result").trim(), link: u.val("mk-w-link").trim(), notes: u.val("mk-w-notes").trim() };
    if (!pid) { rec.title = u.val("mk-w-title").trim(); if (!rec.title) { u.focus("mk-w-title"); return ui.toast(t("required")); } }
    if (K.save(function (d) {
      var old = pid ? entryFor(d, pid) : (id ? d.showcase.find(function (x) { return x.id === id; }) : null);
      if (old) Object.assign(old, rec); else d.showcase.push(Object.assign({ id: K.id(), projectId: pid || "" }, rec));
    })) K.done();
  });
  GK.act("mk-w-del", function (el) {
    if (!K.guard()) return;
    if (K.save(function (d) { d.showcase = d.showcase.filter(function (x) { return x.id !== el.dataset.id; }); })) K.done();
  });
})(window.GK);
