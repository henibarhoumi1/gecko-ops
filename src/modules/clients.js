/* GECKO Ops · module: clients (who we work for, what they owe, their SKIN contracts) */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    cl_title: ["Clients on", "Clients à"], cl_accent: ["board", "bord"], cl_file: ["file", "fiche"],
    cl_sub: ["{n} brands · {owed} still owed", "{n} marques · {owed} restant dû"],
    cl_add: ["Add client", "Ajouter un client"], cl_new: ["New", "Nouveau"], cl_client: ["client", "client"],
    cl_no_edit: ["Only sales and the founder can change clients.", "Seuls le commercial et le fondateur peuvent modifier les clients."],
    cl_brand: ["Brand", "Marque"], cl_code: ["File code", "Code fichiers"], cl_code_hint: ["Caps, max 8. Starts every file name: {c}_A1-H1…", "Majuscules, 8 max. Début de chaque nom de fichier : {c}_A1-H1…"],
    cl_contact: ["Contact", "Contact"], cl_phone: ["Phone", "Téléphone"], cl_whatsapp: ["WhatsApp", "WhatsApp"], cl_email: ["Email", "E-mail"],
    cl_sector: ["Sector", "Secteur"], cl_tax: ["Tax ID (matricule fiscal)", "Matricule fiscal"], cl_tax_hint: ["Needed before any invoice is issued.", "Nécessaire avant d'émettre une facture."],
    cl_buyer: ["Who runs their ads", "Qui gère leurs pubs"], cl_buyer_ph: ["In-house, freelance, agency…", "En interne, freelance, agence…"],
    cl_base: ["Baseline orders / week", "Commandes / semaine de départ"], cl_base_date: ["Measured on", "Mesuré le"],
    cl_base_hint: ["Before we start. The report compares against it.", "Avant de commencer. Le rapport s'y compare."],
    cl_notes: ["Notes", "Notes"],
    cl_active: ["Active projects", "Projets actifs"], cl_invoiced: ["Invoiced to date", "Facturé à ce jour"], cl_owed: ["Still owed", "Reste dû"],
    cl_assign_h: ["Assignments", "Affectations"],
    cl_assign_hint: ["Editors and assistants only see their assigned clients and projects.", "Les éditeurs et assistants ne voient que les clients et projets qui leur sont affectés."],
    cl_assign_client: ["Client access", "Accès client"], cl_assign_project: ["Project access", "Accès projet"],
    cl_assign_invite: ["Invite editors or assistants before assigning work.", "Invitez des éditeurs ou assistants avant d'affecter du travail."],
    cl_skin: ["SKIN", "SKIN"], cl_k_clients: ["Clients", "Clients"], cl_k_skin: ["Active SKIN contracts", "Contrats SKIN actifs"],
    cl_k_inv: ["Invoiced to date", "Facturé à ce jour"], cl_k_owed: ["Still owed", "Reste dû"],
    cl_back: ["All clients", "Tous les clients"], cl_wa: ["Copy WhatsApp", "Copier le WhatsApp"], cl_no_wa: ["No WhatsApp number yet.", "Pas encore de numéro WhatsApp."],
    cl_details: ["Details", "Coordonnées"], cl_projects: ["Projects", "Projets"], cl_invoices: ["Invoices", "Factures"], cl_draft_no: ["Draft", "Brouillon"],
    cl_inv_no: ["No.", "N°"], cl_inv_what: ["What", "Objet"], cl_inv_amount: ["Amount", "Montant"], cl_inv_left: ["Left", "Reste"],
    cl_contracts: ["SKIN contracts", "Contrats SKIN"], cl_start_skin: ["Start a SKIN contract", "Démarrer un contrat SKIN"],
    cl_skin_none: ["No monthly contract. SKIN 10 or SKIN 20, three months minimum.", "Pas de contrat mensuel. SKIN 10 ou SKIN 20, trois mois minimum."],
    cl_skin_pack: ["Pack", "Pack"], cl_skin_start: ["First month", "Premier mois"], cl_skin_min: ["Minimum 3 months. The client can stop after the third month.", "Minimum 3 mois. Le client peut arrêter après le troisième mois."],
    cl_skin_title: ["SKIN", "SKIN"], cl_skin_acc: ["contract", "contrat"],
    cl_skin_has: ["This client already has an active SKIN contract.", "Ce client a déjà un contrat SKIN actif."],
    cl_skin_months: ["{n} of 3 minimum months made", "{n} mois créés sur 3 minimum"], cl_skin_from: ["From {m}", "Depuis {m}"],
    cl_skin_end_min: ["Earliest end: {m}", "Fin au plus tôt : {m}"], cl_skin_active: ["Active", "Actif"], cl_skin_ended: ["Ended", "Terminé"],
    cl_skin_end: ["End contract", "Arrêter le contrat"], cl_skin_end_wait: ["It can end once 3 months exist ({n} so far).", "Arrêt possible quand 3 mois existent ({n} pour l'instant)."],
    cl_skin_end_q: ["End this SKIN contract?", "Arrêter ce contrat SKIN ?"], cl_skin_end_body: ["No new monthly projects will be due. Existing months stay as they are.", "Plus aucun mois ne sera à créer. Les mois existants restent tels quels."],
    cl_skin_months_link: ["Monthly projects", "Projets mensuels"], cl_skin_started: ["SKIN contract started", "Contrat SKIN démarré"],
    cl_skin_month_n: ["Month {n}", "Mois {n}"],
    cl_log_added: ["added", "ajouté"], cl_log_edited: ["details edited", "coordonnées modifiées"],
    cl_log_skin: ["SKIN contract started ({p}, {m})", "Contrat SKIN démarré ({p}, {m})"], cl_log_skin_end: ["SKIN contract ended", "Contrat SKIN arrêté"],
    cl_del: ["Delete client", "Supprimer le client"], cl_del_founder: ["Only the founder can delete a client.", "Seul le fondateur peut supprimer un client."],
    cl_del_blocked: ["This client has projects or invoices. They stay for the books.", "Ce client a des projets ou des factures. Ils restent pour la comptabilité."],
    cl_del_q: ["Delete this client?", "Supprimer ce client ?"], cl_del_body: ["They have no projects and no invoices. This can't be undone.", "Aucun projet ni facture. C'est définitif."],
    cl_deleted: ["Client deleted", "Client supprimé"], cl_none_yet: ["No clients yet. Win a lead or add one here.", "Pas encore de client. Gagnez un prospect ou ajoutez-en un ici."],
    cl_no_projects: ["No projects yet.", "Pas encore de projet."], cl_no_invoices: ["No invoices yet.", "Pas encore de facture."],
    cl_code_taken: ["Another client already uses this code.", "Un autre client utilise déjà ce code."], cl_read: ["Read only", "Lecture seule"]
  });

  function canEdit() { return m.can("clients"); }
  function codeOf(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8); }
  function invsOf(c) { return S.all("invoices").filter(function (i) { return i.clientId === c.id; }); }
  function projsOf(c) { return S.all("projects").filter(function (p) { return p.clientId === c.id; }); }
  function contractsOf(c) { return S.all("contracts").filter(function (k) { return k.clientId === c.id; }); }
  function billable(i) { return i.no && i.kind !== "credit" && !i.credited; }
  /** Issued invoices before stamp, credit notes included (they carry a negative amount). Same basis as Finance. */
  function invoiced(c) { return u.sum(invsOf(c), m.invoiceTurnover); }
  function owed(c) { return u.sum(invsOf(c).filter(billable), m.invBalance); }
  function activeProjects(c) { return projsOf(c).filter(function (p) { return p.stage !== "done"; }); }
  function activeContract(c) { return contractsOf(c).filter(function (k) { return k.status === "active"; })[0] || null; }

  // ---------- list ----------
  function listView() {
    var clients = S.all("clients").sort(u.by(function (c) { return (c.brand || "").toLowerCase(); }));
    var totInv = u.sum(clients, invoiced), totOwed = u.sum(clients, owed);
    var add = ui.btn(t("cl_add"), "cl-new", { cls: "primary", disabled: !canEdit(), title: canEdit() ? "" : t("cl_no_edit") });
    var rows = clients.map(function (c) {
      var k = activeContract(c), ow = owed(c);
      return '<tr class="click" tabindex="0" data-a="cl-open" data-id="' + esc(c.id) + '"><td><strong>' + esc(c.brand) + '</strong><br><span class="code faint">' + esc(c.code || "—") + "</span></td>" +
        '<td data-l="' + esc(t("cl_sector")) + '">' + (c.sector ? ui.chip(c.sector) : "—") + '</td><td data-l="' + esc(t("cl_contact")) + '">' + esc(c.contact || "—") + '</td><td class="r num" data-l="' + esc(t("cl_active")) + '">' + activeProjects(c).length + "</td>" +
        '<td class="r num" data-l="' + esc(t("cl_invoiced")) + '">' + esc(u.money(invoiced(c))) + '</td><td class="r num" data-l="' + esc(t("cl_owed")) + '">' + (ow > 0 ? "<strong>" + esc(u.money(ow)) + "</strong>" : '<span class="faint">' + esc(u.money(0)) + "</span>") + "</td>" +
        "<td>" + (k ? ui.chip(m.pack(k.pack).name, k.pack) : "") + "</td></tr>";
    }).join("");
    return ui.head({ label: t("nav_clients"), title: t("cl_title"), accent: t("cl_accent"), sub: esc(t("cl_sub", { n: clients.length, owed: u.money(totOwed) })) + " " + ui.sample(), actions: add }) +
      GK.insight.clients() +
      (clients.length ? '<div class="tbl tbl-stack"><table><thead><tr><th>' + esc(t("cl_brand")) + "</th><th>" + esc(t("cl_sector")) + "</th><th>" + esc(t("cl_contact")) +
        '</th><th class="r">' + esc(t("cl_active")) + '</th><th class="r">' + esc(t("cl_invoiced")) + '</th><th class="r">' + esc(t("cl_owed")) + "</th><th>" + esc(t("cl_skin")) +
        "</th></tr></thead><tbody>" + rows + '</tbody><tfoot><tr><td colspan="4"></td><td class="r num">' + esc(u.money(totInv)) + '</td><td class="r num">' + esc(u.money(totOwed)) + "</td><td></td></tr></tfoot></table></div>"
        : ui.empty(t("cl_none_yet")));
  }

  // ---------- detail ----------
  function detailsForm(c) {
    var dis = canEdit() ? "" : " disabled", b = c.baseline || {};
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_details")) + "</h2>" + (canEdit() ? "" : ui.pill(t("cl_read"))) + "</div>" +
      '<div class="form">' +
      ui.field({ id: "cl-brand", label: t("cl_brand"), value: c.brand, attrs: dis }) +
      ui.field({ id: "cl-code", label: t("cl_code"), value: c.code, hint: t("cl_code_hint", { c: c.code || "BRAND" }), attrs: dis + ' maxlength="8" autocapitalize="characters"' }) +
      ui.field({ id: "cl-contact", label: t("cl_contact"), value: c.contact, attrs: dis }) +
      ui.field({ id: "cl-phone", label: t("cl_phone"), value: c.phone, attrs: dis + ' inputmode="tel"' }) +
      ui.field({ id: "cl-wa", label: t("cl_whatsapp"), value: c.whatsapp, attrs: dis + ' inputmode="tel"' }) +
      ui.field({ id: "cl-email", label: t("cl_email"), type: "email", value: c.email, attrs: dis }) +
      ui.field({ id: "cl-sector", label: t("cl_sector"), value: c.sector, attrs: dis }) +
      ui.field({ id: "cl-tax", label: t("cl_tax"), value: c.taxId, hint: c.taxId ? "" : t("cl_tax_hint"), attrs: dis }) +
      ui.field({ id: "cl-buyer", label: t("cl_buyer"), value: c.buyer, placeholder: t("cl_buyer_ph"), attrs: dis }) +
      ui.field({ id: "cl-base", label: t("cl_base"), type: "number", value: b.v || "", hint: t("cl_base_hint"), attrs: dis + ' min="0"' }) +
      ui.field({ id: "cl-base-date", label: t("cl_base_date"), type: "date", value: b.date || "", attrs: dis }) +
      ui.field({ id: "cl-notes", label: t("cl_notes"), type: "textarea", value: c.notes, span: true, attrs: dis }) +
      "</div>" +
      (canEdit() ? '<div class="row" style="justify-content:flex-end">' + ui.btn(t("save"), "cl-save", { cls: "primary", data: { id: c.id } }) + "</div>" : "") + "</div>";
  }
  function projectsPanel(c) {
    var ps = projsOf(c).sort(u.by(function (p) { return (p.stage === "done" ? "1" : "0") + (p.shootDate || ""); }));
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_projects")) + '</h2><span class="small muted num">' + ps.length + "</span></div>" +
      (ps.length ? '<div class="list">' + ps.map(function (p) {
        return '<div class="li click" tabindex="0" data-a="cl-proj" data-id="' + esc(p.id) + '"><div class="stack" style="gap:2px"><strong>' + esc(p.name) + '</strong><span class="m">' +
          esc(m.pack(p.pack).name) + (p.shootDate ? " · " + esc(u.fmtDate(p.shootDate)) : "") + "</span></div>" + ui.stagePill(p) + "</div>";
      }).join("") + "</div>" : ui.empty(t("cl_no_projects"))) + "</div>";
  }
  function invoicesPanel(c) {
    var inv = invsOf(c).sort(u.by(function (i) { return i.issued || "9999"; }, "desc"));
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_invoices")) + '</h2><span class="small muted">' + esc(t("cl_owed")) + " · <strong class=\"num\">" + esc(u.money(owed(c))) + "</strong></span></div>" +
      (inv.length ? '<div class="tbl"><table><thead><tr><th>' + esc(t("cl_inv_no")) + "</th><th>" + esc(t("cl_inv_what")) + '</th><th class="r">' + esc(t("cl_inv_amount")) +
        '</th><th class="r">' + esc(t("cl_inv_left")) + "</th><th></th></tr></thead><tbody>" + inv.map(function (i) {
          var left = billable(i) ? m.invBalance(i) : 0;
          return '<tr><td class="code">' + esc(i.no || t("cl_draft_no")) + "</td><td>" + esc(i.label || t("k_" + i.kind)) + '<br><span class="small faint">' + esc(u.fmtDate(i.issued)) + "</span></td>" +
            '<td class="r num">' + esc(u.money(+i.amount || 0)) + '</td><td class="r num">' + (left ? esc(u.money(left)) : "—") + "</td><td>" + ui.invPill(i) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : ui.empty(t("cl_no_invoices"))) + "</div>";
  }
  function contractsPanel(c) {
    var ks = contractsOf(c).sort(u.by("start", "desc")), has = !!activeContract(c);
    var start = ui.btn(t("cl_start_skin"), "cl-skin-new", { cls: "sm", data: { id: c.id }, disabled: !canEdit() || has, title: !canEdit() ? t("cl_no_edit") : has ? t("cl_skin_has") : "" });
    var body = ks.length ? ks.map(function (k) {
      var months = m.contractMonths(k), n = months.length, active = k.status === "active";
      var end = !active ? "" : ui.btn(t("cl_skin_end"), "cl-skin-end", { cls: "sm ghost", data: { id: k.id }, disabled: !canEdit() || n < 3, title: !canEdit() ? t("cl_no_edit") : n < 3 ? t("cl_skin_end_wait", { n: n }) : "" });
      return '<div class="stack" style="gap:8px;padding-bottom:12px;border-bottom:1px solid var(--line)">' +
        '<div class="row between"><strong>' + esc(m.pack(k.pack).name) + "</strong>" + ui.pill(t(active ? "cl_skin_active" : "cl_skin_ended"), active ? "wip" : "done") + "</div>" +
        '<span class="small muted">' + esc(t("cl_skin_from", { m: u.fmtMonth(k.start) })) + " · " + esc(t("cl_skin_end_min", { m: u.fmtMonth(m.monthKey(k.start, k.minMonths || 3)) })) + "</span>" +
        ui.meter(Math.min(100, n / (k.minMonths || 3) * 100)) +
        '<span class="small">' + esc(t("cl_skin_months", { n: n })) + "</span>" +
        (n ? '<div class="row" style="gap:6px">' + months.map(function (p) { return ui.btn(t("cl_skin_month_n", { n: p.month }), "cl-proj", { cls: "sm ghost", data: { id: p.id } }); }).join("") + "</div>" : "") +
        '<div class="row">' + ui.btn(t("cl_skin_months_link"), "cl-skin-projects", { cls: "sm" }) + end + "</div></div>";
    }).join("") : ui.empty(t("cl_skin_none"));
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_contracts")) + "</h2>" + start + "</div>" + body + "</div>";
  }
  function detailView(c) {
    var founder = m.isFounder() && m.can("clients"), busy = projsOf(c).length || invsOf(c).length;
    var actions = ui.btn(t("cl_back"), "cl-back", { cls: "ghost" }) +
      ui.btn(t("cl_wa"), "cl-wa", { data: { id: c.id }, disabled: !c.whatsapp, title: c.whatsapp ? c.whatsapp : t("cl_no_wa") }) +
      ui.btn(t("cl_del"), "cl-del", { cls: "ghost", data: { id: c.id }, disabled: !founder || !!busy, title: !founder ? t("cl_del_founder") : busy ? t("cl_del_blocked") : "" });
    var k = activeContract(c);
    var sub = [c.sector, c.contact, c.whatsapp].filter(Boolean).map(esc).join(" · ") + (k ? " " + ui.pill(m.pack(k.pack).name, "done") : "");
    return ui.head({ label: t("nav_clients"), title: c.brand || "—", accent: t("cl_file"), sub: sub, actions: actions }) +
      assignmentPanel(c) +
      ui.kpis([
        { lab: t("cl_active"), v: String(activeProjects(c).length) },
        { lab: t("cl_invoiced"), v: u.money(invoiced(c)) },
        { lab: t("cl_owed"), v: u.money(owed(c)) },
        { lab: t("cl_base"), v: c.baseline && c.baseline.v ? String(c.baseline.v) : "—", n: c.baseline && c.baseline.date ? u.fmtDate(c.baseline.date) : "" }
      ]) +
      '<div class="grid2">' + detailsForm(c) + '<div class="stack" style="gap:18px">' + projectsPanel(c) + contractsPanel(c) + "</div></div>" +
      invoicesPanel(c);
  }
  function assignmentPanel(c) {
    if (S.backend !== "supabase" || !m.isFounder()) return "";
    var people = S.all("team").filter(function (member) { return member.role === "editor" || member.role === "assistant"; });
    var assignments = S.assignments();
    function checks(type, entityId) {
      if (!people.length) return '<span class="small muted">' + esc(t("cl_assign_invite")) + "</span>";
      return people.map(function (member) {
        var assigned = assignments.some(function (row) { return row.type === type && row.entityId === entityId && row.memberId === member.id; });
        return '<label class="check"><input type="checkbox" data-c="cl-assignment" data-type="' + type + '" data-entity="' + esc(entityId) +
          '" data-member="' + esc(member.id) + '"' + (assigned ? " checked" : "") + '><span>' + esc(member.name) + ' <span class="muted small">· ' + esc(t("role_" + member.role)) + "</span></span></label>";
      }).join("");
    }
    var projects = projsOf(c);
    return '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_assign_h")) + '</h2><span class="small muted">' + esc(t("cl_assign_hint")) + "</span></div>" +
      '<div class="stack"><strong class="lab sm">' + esc(t("cl_assign_client")) + '</strong><div class="row">' + checks("client", c.id) + "</div></div>" +
      (projects.length ? '<div class="stack"><strong class="lab sm">' + esc(t("cl_assign_project")) + '</strong>' + projects.map(function (project) {
        return '<div class="stack"><span class="small">' + esc(project.name) + "</span><div class=\"row\">" + checks("project", project.id) + "</div></div>";
      }).join("") + "</div>" : "") + "</section>";
  }

  GK.view("clients", {
    render: function (params) {
      var c = params.id ? S.get("clients", params.id) : null;
      return c ? detailView(c) : listView();
    },
    after: function () {
      // ui.go("clients", {new: true}) from another screen opens the Add-client modal once.
      var p = ui.p("clients");
      if (!p.new) return;
      delete p.new;
      if (canEdit()) newModal(); else ui.toast(t("cl_no_edit"));
    }
  });

  // ---------- actions ----------
  GK.act("cl-open", function (el) { ui.go("clients", { id: el.dataset.id }); });
  GK.change("cl-assignment", function (el) {
    var checked = el.checked;
    S.setAssignment(el.getAttribute("data-type"), el.getAttribute("data-entity"), el.getAttribute("data-member"), checked)
      .catch(function (error) { el.checked = !checked; ui.toast("Assignment failed: " + error.message); });
  });
  GK.act("cl-back", function () { ui.go("clients", { id: null }); });
  GK.act("cl-proj", function (el) { ui.go("projects", { id: el.dataset.id }); });
  GK.act("cl-skin-projects", function () { ui.go("projects"); });
  GK.act("cl-wa", function (el) {
    var c = S.get("clients", el.dataset.id); if (!c || !c.whatsapp) return ui.toast(t("cl_no_wa"));
    u.copy(c.whatsapp).then(function (ok) { ui.toast(ok ? t("copied") + " · " + c.whatsapp : c.whatsapp); });
  });
  function codeClash(code, id) { return code && S.all("clients").some(function (x) { return x.id !== id && (x.code || "") === code; }); }
  GK.act("cl-save", function (el) {
    if (!canEdit()) return ui.toast(t("cl_no_edit"));
    var id = el.dataset.id, c = S.get("clients", id); if (!c) return;
    var brand = u.val("cl-brand").trim();
    if (!brand) { u.focus("cl-brand"); return ui.toast(t("required")); }
    var code = codeOf(u.val("cl-code")) || codeOf(brand);
    if (codeClash(code, id)) { u.focus("cl-code"); return ui.toast(t("cl_code_taken")); }
    S.patch("clients", id, {
      brand: brand, code: code, contact: u.val("cl-contact").trim(), phone: u.val("cl-phone").trim(), whatsapp: u.val("cl-wa").trim(), email: u.val("cl-email").trim(),
      sector: u.val("cl-sector").trim(), taxId: u.val("cl-tax").trim(), buyer: u.val("cl-buyer").trim(),
      baseline: { v: u.numVal("cl-base"), date: u.val("cl-base-date") }, notes: u.val("cl-notes")
    }, { log: t("cl_log_edited") });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    ui.toast(t("saved"));
  });
  GK.act("cl-new", function () {
    if (!canEdit()) return ui.toast(t("cl_no_edit"));
    newModal();
  });
  function newModal() {
    ui.modal({
      title: t("cl_new"), accent: t("cl_client"),
      body: '<div class="form">' +
        ui.field({ id: "cln-brand", label: t("cl_brand") }) +
        ui.field({ id: "cln-code", label: t("cl_code"), hint: t("cl_code_hint", { c: "BRAND" }), attrs: ' maxlength="8"' }) +
        ui.field({ id: "cln-contact", label: t("cl_contact") }) +
        ui.field({ id: "cln-wa", label: t("cl_whatsapp"), attrs: ' inputmode="tel"' }) +
        ui.field({ id: "cln-sector", label: t("cl_sector") }) +
        ui.field({ id: "cln-buyer", label: t("cl_buyer"), placeholder: t("cl_buyer_ph") }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "cl-create", { cls: "primary" })
    });
  }
  GK.act("cl-create", function () {
    var brand = u.val("cln-brand").trim();
    if (!brand) { u.focus("cln-brand"); return ui.toast(t("required")); }
    var code = codeOf(u.val("cln-code")) || codeOf(brand) || "BRAND";
    if (codeClash(code, null)) { u.focus("cln-code"); return ui.toast(t("cl_code_taken")); }
    var wa = u.val("cln-wa").trim();
    var c = S.put("clients", { brand: brand, code: code, contact: u.val("cln-contact").trim(), phone: wa, whatsapp: wa, email: "", sector: u.val("cln-sector").trim(),
      taxId: "", buyer: u.val("cln-buyer").trim(), baseline: { v: 0, date: "" }, notes: "" }, { log: t("cl_log_added") });
    ui.closeModal(true);
    ui.toast(t("saved"));
    ui.go("clients", { id: c.id });
  });
  GK.act("cl-del", function (el) {
    var id = el.dataset.id, c = S.get("clients", id); if (!c) return;
    if (!m.isFounder()) return ui.toast(t("cl_del_founder"));
    if (projsOf(c).length || invsOf(c).length) return ui.toast(t("cl_del_blocked"));
    ui.confirm(t("cl_del_q"), t("cl_del_body"), function () {
      contractsOf(c).forEach(function (k) { S.remove("contracts", k.id); });
      S.remove("clients", id); ui.toast(t("cl_deleted")); ui.go("clients", { id: null });
    }, t("del"));
  });

  // ---------- SKIN contracts ----------
  GK.act("cl-skin-new", function (el) {
    if (!canEdit()) return ui.toast(t("cl_no_edit"));
    var c = S.get("clients", el.dataset.id); if (!c) return;
    var packs = ["SKIN10", "SKIN20"];
    ui.modal({
      title: t("cl_skin_title"), accent: t("cl_skin_acc"), label: c.brand,
      body: '<div class="form">' +
        ui.field({ id: "clk-pack", label: t("cl_skin_pack"), type: "select", value: "SKIN10", options: packs.map(function (k) { return [k, m.pack(k).name + " · " + u.money(m.pack(k).price) + " " + t("per_month")]; }) }) +
        ui.field({ id: "clk-start", label: t("cl_skin_start"), type: "month", value: u.month(u.today()) }) + "</div>" +
        '<p class="note" style="margin:0">' + esc(t("cl_skin_min")) + "</p>" +
        '<p class="small muted" style="margin:0">' + esc(t("no_discount")) + "</p>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("cl_start_skin"), "cl-skin-save", { cls: "primary", data: { id: c.id } })
    });
  });
  GK.act("cl-skin-save", function (el) {
    var start = u.val("clk-start");
    if (!/^\d{4}-\d{2}$/.test(start)) { u.focus("clk-start"); return ui.toast(t("required")); }
    var c = S.get("clients", el.dataset.id); if (!c) return;
    if (activeContract(c)) { ui.closeModal(true); return ui.toast(t("cl_skin_has")); }
    var pack = u.val("clk-pack");
    S.put("contracts", { clientId: c.id, pack: pack, monthlyPrice: m.priceFor(pack, c.id, 1, start + "-01").price, start: start, minMonths: 3, status: "active" });
    S.patch("clients", c.id, {}, { log: t("cl_log_skin", { p: m.pack(u.val("clk-pack")).name, m: u.fmtMonth(start) }) });
    ui.closeModal(true);
    ui.toast(t("cl_skin_started"));
  });
  GK.act("cl-skin-end", function (el) {
    var k = S.get("contracts", el.dataset.id); if (!k) return;
    if (m.contractMonths(k).length < 3) return ui.toast(t("cl_skin_end_wait", { n: m.contractMonths(k).length }));
    ui.confirm(t("cl_skin_end_q"), t("cl_skin_end_body"), function () {
      S.patch("contracts", k.id, { status: "ended" });
      S.patch("clients", k.clientId, {}, { log: t("cl_log_skin_end") });
      ui.toast(t("saved"));
    }, t("cl_skin_end"));
  });
})(window.GK);
