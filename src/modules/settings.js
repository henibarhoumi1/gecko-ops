/* GECKO Ops · module: settings. Company details, packs, rates and rules, and where the data lives. Founder edits, others read. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    se_title: ["Settings", "Réglages"], se_accent: ["", ""],
    se_sub: ["Company details for invoices, the packs and their prices, the cost rates and money rules, and where the data lives.", "Les infos de la société pour les factures, les packs et leurs prix, les tarifs de coûts, les règles d'argent et l'endroit où vivent les données."],
    se_tab_company: ["Company", "Société"], se_tab_packs: ["Packs & rules", "Packs & règles"], se_tab_data: ["Data & sharing", "Données & partage"],
    se_read_only: ["Only the owner can change these settings. You can read them.", "Seul le fondateur peut modifier ces réglages. Vous pouvez les consulter."],
    // company
    se_company: ["Company", "Société"],
    se_co_name: ["Trading name", "Nom commercial"], se_co_legal: ["Legal name", "Raison sociale / nom légal"], se_co_mf: ["Tax ID (matricule fiscal, MF)", "Matricule fiscal (MF)"],
    se_co_address: ["Address", "Adresse"], se_co_phone: ["Phone", "Téléphone"], se_co_email: ["Email", "E-mail"], se_co_ig: ["Instagram", "Instagram"],
    se_co_note: ["Note printed on invoices", "Mention en bas des factures"],
    se_co_note_ph: ["Bank details, RIB, payment terms", "Coordonnées bancaires, RIB, conditions de paiement"],
    se_mf_why: ["The MF goes on every invoice. Without it, an invoice is not valid in Tunisia, so GECKO Ops won't issue one until it's filled in.", "Le MF figure sur chaque facture. Sans lui, une facture n'est pas valable en Tunisie : GECKO Ops n'en émet aucune tant qu'il n'est pas renseigné."],
    se_mf_ok: ["MF on file. Invoices can be issued.", "MF enregistré. Les factures peuvent être émises."],
    se_save_company: ["Save company", "Enregistrer la société"],
    // packs
    se_packs: ["Packs", "Packs"],
    se_packs_hint: ["Prices are what the client pays, excluding stamp duty. Cost estimate is what a pack costs us to make; the rates below give a suggestion.", "Les prix sont ceux payés par le client, hors timbre. L'estimation de coût est ce que le pack nous coûte ; les tarifs ci-dessous donnent une suggestion."],
    se_c_pack: ["Pack", "Pack"], se_c_name: ["Name", "Nom"], se_c_price: ["Price (TND)", "Prix (TND)"], se_c_monthly: ["Monthly", "Mensuel"],
    se_c_angles: ["Angles", "Angles"], se_c_reels: ["Reels", "Reels"], se_c_var: ["Variations", "Variations"], se_c_car: ["Carousels", "Carrousels"],
    se_c_cost: ["Cost estimate (TND)", "Coût estimé (TND)"], se_from_rates: ["rates say {v}", "selon les tarifs : {v}"],
    se_save_packs: ["Save packs", "Enregistrer les packs"], se_reset_packs: ["Reset packs to defaults", "Remettre les packs par défaut"],
    se_reset_q: ["Reset to defaults?", "Remettre par défaut ?"],
    se_reset_packs_b: ["Pack names, prices and contents go back to the business model values. Existing projects keep their pack key.", "Les noms, prix et contenus des packs reviennent aux valeurs du business model. Les projets existants gardent leur pack."],
    se_reset_rates_b: ["Cost rates and money rules go back to the business model values.", "Les tarifs et les règles d'argent reviennent aux valeurs du business model."],
    // rates
    se_rates: ["Cost rates (TND)", "Tarifs de coûts (TND)"],
    se_r_heniDay: ["Owner, shoot day", "Fondateur, journée de tournage"], se_r_reel: ["Reel edit, each", "Montage d'un reel"], se_r_gear: ["Gear rental, full day", "Location matériel, journée"],
    se_r_assistant: ["Assistant, day", "Assistant, journée"], se_r_transport: ["Transport and small buys, day", "Transport et petits achats, journée"],
    se_r_recut: ["Hook re-cut, each", "Re-montage d'une accroche"], se_r_carousel: ["Carousel design, each", "Design d'un carrousel"], se_r_report: ["Monthly report", "Rapport mensuel"],
    // rules
    se_rules: ["Money rules", "Règles d'argent"],
    se_u_cap: ["Yearly invoicing cap (TND)", "Plafond annuel de facturation (TND)"], se_u_reserve: ["Reserve (% of revenue)", "Réserve (% du chiffre)"],
    se_u_commission: ["Partner share (% of profit)", "Part partenaire (% du bénéfice)"], se_u_salary: ["Owner salary (TND / month)", "Salaire du fondateur (TND / mois)"],
    se_u_stamp: ["Stamp duty per invoice (TND)", "Droit de timbre par facture (TND)"], se_u_withholding: ["Withholding by company clients (%)", "Retenue à la source des sociétés (%)"],
    se_u_dueDays: ["Invoices due after (days)", "Échéance des factures (jours)"],
    se_u_extrasDirect: ["Extras (studio, talent) are invoiced directly by the supplier to the client", "Les extras (studio, talents) sont facturés directement au client par le fournisseur"],
    se_acct: ["Accountant to confirm.", "À confirmer par le comptable."],
    se_save_rates: ["Save rates and rules", "Enregistrer tarifs et règles"], se_reset_rates: ["Reset rates and rules", "Remettre tarifs et règles"],
    se_bad: ["Use a number of 0 or more.", "Saisissez un nombre positif ou nul."],
    // data
    se_data: ["Where the data lives", "Où vivent les données"],
    se_d_demo: ["This local workspace is saved in this browser only. New workspaces start empty; no sample business records are loaded.", "Cet espace local est enregistré dans ce navigateur. Un nouvel espace démarre vide ; aucune donnée métier d'exemple n'est chargée."],
    se_d_shared: ["Live data, shared with the team. Everyone who has this page as a Contributor sees the same clients, projects and money, and changes show up for all.", "Données réelles, partagées avec l'équipe. Toute personne qui a cette page en Contributeur voit les mêmes clients, projets et chiffres, et les modifications apparaissent pour tous."],
    se_d_local: ["Live data, saved in this browser only. Nobody else sees it, and clearing the browser deletes it. Copy a backup often.", "Données réelles, enregistrées dans ce navigateur seulement. Personne d'autre ne les voit, et vider le navigateur les efface. Copiez une sauvegarde souvent."],
    se_d_ro: ["You can read this data but not change it.", "Vous pouvez lire ces données mais pas les modifier."],
    se_reset_demo: ["Clear workspace records", "Vider les données de l'espace"],
    se_backup: ["Download a backup", "Télécharger une sauvegarde"],
    se_backup_hint: ["Downloads a JSON copy of all workspace records and configuration before cleanup.", "Télécharge une copie JSON des données et de la configuration avant le nettoyage."],
    se_backup_ok: ["Backup copied: {n} records", "Sauvegarde copiée : {n} éléments"],
    se_clear_title: ["Clear local workspace records?", "Effacer les données de l'espace local ?"],
    se_clear_confirm: ["This permanently removes {n} saved records from {collections}. Company details, packs, rates, financial rules, invoice numbering, language, theme and navigation preferences are preserved. Download a backup first if you may need these records.", "Cette action supprime définitivement {n} éléments enregistrés dans : {collections}. Les informations de société, packs, tarifs, règles financières, numérotation des factures, langue, thème et préférences de navigation sont conservés. Téléchargez une sauvegarde avant si vous pourriez en avoir besoin."],
    se_clear_done: ["Cleared {n} records. Configuration and preferences were preserved.", "{n} éléments effacés. La configuration et les préférences sont conservées."],
    se_clear_failed: ["The workspace was not cleared because local storage could not be updated.", "L'espace n'a pas été vidé car le stockage local n'a pas pu être mis à jour."],
    se_records: ["{n} saved records", "{n} éléments enregistrés"],
    se_coll_team: ["team members", "membres de l'équipe"], se_coll_clients: ["clients", "clients"], se_coll_leads: ["leads", "prospects"],
    se_coll_outreach: ["outreach logs", "journaux de prospection"], se_coll_contracts: ["contracts", "contrats"], se_coll_projects: ["projects (including production files and reports)", "projets (avec fichiers de production et rapports)"],
    se_coll_invoices: ["invoices and payments", "factures et paiements"], se_coll_tasks: ["tasks", "tâches"], se_coll_msgs: ["messages", "messages"],
    se_coll_ideas: ["creative ideas and revisions", "idées créatives et révisions"], se_coll_boards: ["whiteboards", "tableaux blancs"], se_coll_shares: ["client shares", "partages client"],
    se_coll_feedback: ["client feedback", "retours client"], se_coll_expenses: ["expenses", "dépenses"], se_coll_quotes: ["quotes", "devis"],
    se_sharing: ["Sharing with the team", "Partager avec l'équipe"],
    se_share_body: ["To let the team and freelancers work in GECKO Ops, share this page with them as Contributor. Viewers can only read. The first time they open it, each person picks their name and role.", "Pour que l'équipe et les freelances travaillent dans GECKO Ops, partagez cette page avec eux en Contributeur. Les Lecteurs peuvent seulement consulter. À la première ouverture, chacun choisit son nom et son rôle."],
    se_lang_note: ["Language and theme are at the bottom of the menu.", "La langue et le thème sont en bas du menu."]
  });

  var RATE_KEYS = ["heniDay", "reel", "gear", "assistant", "transport", "recut", "carousel", "report"];
  var RULE_KEYS = ["cap", "reserve", "commission", "salary", "stamp", "withholding", "dueDays"];
  var ACCT = { cap: 1, stamp: 1, withholding: 1 };
  var PACK_NUM = ["price", "angles", "reels", "variations", "carousels", "cost"];

  function canEdit() { return m.can("settings"); }
  function dis(on) { return on ? "" : " disabled"; }
  function tab() { return ui.p("settings").tab || "company"; }
  function localRecordSummary() {
    return S.COLLS.map(function (coll) {
      var count = S.all(coll).length;
      return count ? t("se_coll_" + coll) + " (" + count + ")" : "";
    }).filter(Boolean);
  }

  function companyTab(ed) {
    var co = m.company();
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("se_company")) + "</h2></div>";
    h += co.mf ? '<p class="note" style="margin:0">' + esc(t("se_mf_ok")) + "</p>"
      : '<p class="note strong" style="margin:0"><strong>' + esc(t("gate_mf")) + "</strong> " + esc(t("se_mf_why")) + "</p>";
    h += '<div class="form">' +
      ui.field({ id: "se-co-name", label: t("se_co_name"), value: co.name, attrs: dis(ed) }) +
      ui.field({ id: "se-co-legal", label: t("se_co_legal"), value: co.legal, attrs: dis(ed) }) +
      ui.field({ id: "se-co-mf", label: t("se_co_mf"), value: co.mf, placeholder: "0000000/X/X/X/000", attrs: dis(ed) }) +
      ui.field({ id: "se-co-address", label: t("se_co_address"), value: co.address, attrs: dis(ed) }) +
      ui.field({ id: "se-co-phone", label: t("se_co_phone"), value: co.phone, attrs: dis(ed) }) +
      ui.field({ id: "se-co-email", label: t("se_co_email"), value: co.email, attrs: dis(ed) }) +
      ui.field({ id: "se-co-ig", label: t("se_co_ig"), value: co.instagram, attrs: dis(ed) }) +
      ui.field({ id: "se-co-note", label: t("se_co_note"), type: "textarea", rows: 2, span: true, value: co.invoiceNote, placeholder: t("se_co_note_ph"), attrs: dis(ed) }) +
      "</div>";
    if (ed) h += '<div class="row">' + ui.btn(t("se_save_company"), "se-save-company", { cls: "primary" }) + "</div>";
    return h + "</section>";
  }

  function packsTab(ed) {
    var keys = m.packKeys();
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("se_packs")) + "</h2></div>";
    h += '<p class="small muted" style="margin:0">' + esc(t("se_packs_hint")) + " " + esc(t("no_discount")) + "</p>";
    h += '<div class="tbl"><table><thead><tr><th>' + esc(t("se_c_pack")) + "</th><th>" + esc(t("se_c_name")) + '</th><th class="r">' + esc(t("se_c_price")) + "</th><th>" + esc(t("se_c_monthly")) +
      '</th><th class="r">' + esc(t("se_c_angles")) + '</th><th class="r">' + esc(t("se_c_reels")) + '</th><th class="r">' + esc(t("se_c_var")) + '</th><th class="r">' + esc(t("se_c_car")) + '</th><th class="r">' + esc(t("se_c_cost")) + "</th></tr></thead><tbody>";
    keys.forEach(function (k) {
      var pk = m.pack(k), id = "se-pk-" + k.replace(/[^A-Za-z0-9]/g, "");
      var est = u.sum(m.estimateCosts(k), function (c) { return c.amount; });
      function n(f, w) { return '<td class="r"><input class="in num" id="' + id + "-" + f + '" type="number" min="0" step="1" inputmode="decimal" value="' + esc(pk[f] == null ? "" : pk[f]) + '" aria-label="' + esc(k + " · " + t("se_c_" + { price: "price", angles: "angles", reels: "reels", variations: "var", carousels: "car", cost: "cost" }[f])) + '"' + (w ? ' style="width:' + w + 'px"' : "") + dis(ed) + "></td>"; }
      h += '<tr><td><span class="code">' + esc(k) + "</span></td>" +
        '<td><input class="in" style="min-width:110px" id="' + id + '-name" value="' + esc(pk.name || k) + '" aria-label="' + esc(k + " · " + t("se_c_name")) + '"' + dis(ed) + "></td>" +
        n("price", 92) +
        '<td><input type="checkbox" style="width:16px;height:16px;accent-color:var(--chroma)" id="' + id + '-monthly"' + (pk.monthly ? " checked" : "") + ' aria-label="' + esc(k + " · " + t("se_c_monthly")) + '"' + dis(ed) + "></td>" +
        n("angles", 64) + n("reels", 64) + n("variations", 64) + n("carousels", 64) +
        '<td class="r">' + '<input class="in num" id="' + id + '-cost" type="number" min="0" step="1" value="' + esc(pk.cost == null ? "" : pk.cost) + '" aria-label="' + esc(k + " · " + t("se_c_cost")) + '"' + dis(ed) + '><div class="small faint" style="white-space:nowrap">' + esc(t("se_from_rates", { v: u.money(est) })) + "</div></td></tr>";
    });
    h += "</tbody></table></div>";
    if (ed) h += '<div class="row">' + ui.btn(t("se_save_packs"), "se-save-packs", { cls: "primary" }) + ui.btn(t("se_reset_packs"), "se-reset-packs", { cls: "ghost" }) + "</div>";
    h += "</section>";

    var r = m.rates(), ru = m.rules();
    h += '<div class="grid2"><section class="panel"><h2 class="sec">' + esc(t("se_rates")) + '</h2><div class="form">' +
      RATE_KEYS.map(function (k) { return ui.field({ id: "se-rate-" + k, label: t("se_r_" + k), type: "number", value: r[k], attrs: ' min="0" step="1"' + dis(ed) }); }).join("") + "</div></section>";
    h += '<section class="panel"><h2 class="sec">' + esc(t("se_rules")) + '</h2><div class="form">' +
      RULE_KEYS.map(function (k) { return ui.field({ id: "se-rule-" + k, label: t("se_u_" + k), type: "number", value: ru[k], hint: ACCT[k] ? t("se_acct") : "", attrs: ' min="0" step="any"' + dis(ed) }); }).join("") +
      ui.field({ id: "se-rule-extrasDirect", label: t("se_u_extrasDirect"), type: "checkbox", value: ru.extrasDirect, span: true, attrs: dis(ed) }) +
      "</div></section></div>";
    if (ed) h += '<div class="row">' + ui.btn(t("se_save_rates"), "se-save-rates", { cls: "primary" }) + ui.btn(t("se_reset_rates"), "se-reset-rates", { cls: "ghost" }) + "</div>";
    return h;
  }

  function dataTab() {
    var where = S.mode === "demo" ? t("se_d_demo") : S.backend === "shared" ? t("se_d_shared") : t("se_d_local");
    var mode = S.mode === "demo" ? t("mode_demo") : S.backend === "shared" ? t("shared_note") : t("local_note");
    var btns = "";
    if (S.mode === "live") btns += ui.btn(t("view_demo"), "show-demo", { cls: "" });
    if (S.mode === "demo" && S.hasLive()) btns += ui.btn(t("back_live"), "show-live", { cls: "primary" });
    if (S.mode === "demo" && !S.hasLive()) btns += ui.btn(t("start_live"), "start-live", { cls: "primary" });
    var records = S.localRecordCount ? S.localRecordCount() : S.COLLS.reduce(function (n, coll) { return n + S.all(coll).length; }, 0);
    var h = '<div class="grid2"><section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("se_data")) + "</h2>" + ui.pill(mode, S.mode === "demo" ? "" : "done") + "</div>" +
      '<p style="margin:0">' + esc(where) + (S.readOnly ? " " + esc(t("se_d_ro")) : "") + "</p>" +
      (S.backend === "local" ? '<p class="small muted" style="margin:0">' + esc(t("se_records", { n: records })) + "</p>" : "") +
      '<div class="row">' + btns + "</div>" +
      '<hr class="rule"><div class="stack" style="gap:6px"><div class="row">' + ui.btn(t("se_backup"), "se-backup", { cls: "" }) + "</div>" +
      '<span class="small muted">' + esc(t("se_backup_hint")) + "</span></div>" +
      (S.backend === "local" && canEdit() ? '<hr class="rule"><div class="stack" style="gap:6px">' +
        ui.btn(t("se_reset_demo"), "se-clear-local", { cls: "ghost" }) +
        '<span class="small muted">' + esc(t("se_clear_confirm", { n: records, collections: localRecordSummary().join(", ") || t("none") })) + "</span></div>" : "") +
      "</section>";
    h += '<section class="panel"><h2 class="sec">' + esc(t("se_sharing")) + "</h2>" +
      '<p style="margin:0">' + esc(t("se_share_body")) + "</p>" +
      '<p class="small muted" style="margin:0">' + esc(t("se_lang_note")) + "</p></section></div>";
    return h;
  }

  GK.view("settings", {
    render: function () {
      var ed = canEdit(), tb = tab();
      var h = ui.head({ label: t("nav_settings"), title: t("se_title"), accent: t("se_accent"), sub: esc(t("se_sub")), actions: ui.sample() });
      if (!ed) h += '<p class="note" style="margin:0">' + esc(t("se_read_only")) + "</p>";
      h += '<div class="tabs" role="tablist">' + [["company", "se_tab_company"], ["packs", "se_tab_packs"], ["data", "se_tab_data"]].map(function (x) {
        return '<button type="button" role="tab" data-a="se-tab" data-v="' + x[0] + '" aria-selected="' + (tb === x[0]) + '">' + esc(t(x[1])) +
          (x[0] === "company" && !m.company().mf ? " !" : "") + "</button>";
      }).join("") + "</div>";
      if (tb === "packs") h += packsTab(ed);
      else if (tb === "data") h += dataTab();
      else h += companyTab(ed);
      return h;
    },
    count: function () { return m.isFounder() && !m.company().mf ? "!" : ""; }
  });

  function guard() { if (!canEdit()) { ui.toast(t("se_read_only")); return false; } return true; }
  /** Read a non-negative number field; flags it and returns null when invalid. */
  function readNum(id) {
    var raw = String(u.val(id)).trim();
    var v = parseFloat(raw.replace(",", "."));
    if (raw === "" || !isFinite(v) || v < 0) { u.focus(id); ui.toast(t("se_bad")); return null; }
    return v;
  }

  GK.act("se-tab", function (el) { ui.go("settings", { tab: el.getAttribute("data-v") }); });
  GK.act("se-save-company", function () {
    if (!guard()) return;
    var name = u.val("se-co-name").trim();
    if (!name) { u.focus("se-co-name"); return ui.toast(t("required")); }
    var co = Object.assign({}, (S.config() || {}).company || {}, {
      name: name, legal: u.val("se-co-legal").trim(), mf: u.val("se-co-mf").trim().toUpperCase(), address: u.val("se-co-address").trim(),
      phone: u.val("se-co-phone").trim(), email: u.val("se-co-email").trim(), instagram: u.val("se-co-ig").trim(), invoiceNote: u.val("se-co-note").trim()
    });
    S.setConfig({ company: co });
    ui.toast(t("saved"));
  });
  GK.act("se-save-packs", function () {
    if (!guard()) return;
    var cur = u.clone((S.config() || {}).packs || m.PACKS_DEFAULT), out = {};
    var keys = m.packKeys();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], id = "se-pk-" + k.replace(/[^A-Za-z0-9]/g, ""), pk = Object.assign({}, cur[k] || m.pack(k));
      var name = u.val(id + "-name").trim(); if (!name) { u.focus(id + "-name"); return ui.toast(t("required")); }
      pk.name = name; pk.monthly = u.checked(id + "-monthly");
      for (var j = 0; j < PACK_NUM.length; j++) { var v = readNum(id + "-" + PACK_NUM[j]); if (v == null) return; pk[PACK_NUM[j]] = Math.round(v); }
      out[k] = pk;
    }
    S.setConfig({ packs: out });
    ui.toast(t("saved"));
  });
  GK.act("se-save-rates", function () {
    if (!guard()) return;
    var rates = {}, rules = {};
    for (var i = 0; i < RATE_KEYS.length; i++) { var v = readNum("se-rate-" + RATE_KEYS[i]); if (v == null) return; rates[RATE_KEYS[i]] = v; }
    for (var j = 0; j < RULE_KEYS.length; j++) { var w = readNum("se-rule-" + RULE_KEYS[j]); if (w == null) return; rules[RULE_KEYS[j]] = w; }
    rules.extrasDirect = u.checked("se-rule-extrasDirect");
    S.setConfig({ rates: rates, rules: rules });
    ui.toast(t("saved"));
  });
  GK.act("se-reset-packs", function () {
    if (!guard()) return;
    ui.confirm(t("se_reset_q"), t("se_reset_packs_b"), function () { S.setConfig({ packs: u.clone(m.PACKS_DEFAULT) }); ui.toast(t("saved")); });
  });
  GK.act("se-reset-rates", function () {
    if (!guard()) return;
    ui.confirm(t("se_reset_q"), t("se_reset_rates_b"), function () { S.setConfig({ rates: u.clone(m.RATES_DEFAULT), rules: u.clone(m.RULES_DEFAULT) }); ui.toast(t("saved")); });
  });
  GK.act("se-backup", function () {
    var o = { app: "GECKO Ops", version: 1, exported: u.nowStamp(), mode: S.mode, backend: S.backend, config: S.config(), colls: {} }, n = 0;
    S.COLLS.forEach(function (c) { o.colls[c] = S.all(c); n += o.colls[c].length; });
    ui.download("gecko-ops-backup-" + u.today() + ".json", JSON.stringify(o, null, 1));
  });
  GK.act("se-clear-local", function () {
    if (!canEdit() || S.backend !== "local") return;
    var count = S.localRecordCount ? S.localRecordCount() : S.COLLS.reduce(function (n, coll) { return n + S.all(coll).length; }, 0);
    var collections = localRecordSummary().join(", ") || t("none");
    ui.confirm(t("se_clear_title"), t("se_clear_confirm", { n: count, collections: collections }), function () {
      var result = S.clearLocalRecords();
      if (!result) return ui.toast(t("se_clear_failed"));
      ui.toast(t("se_clear_done", { n: result.count }));
      if (GK.guide && GK.guide.maybeWelcome) GK.guide.maybeWelcome();
    }, t("se_reset_demo"));
  });
})(window.GK);
