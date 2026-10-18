/* GECKO Ops · module: clients. The hub: the list of our clients, and one workspace per client with tabs (overview, projects, assets,
   approvals, performance, invoices, notes, extras, portal, details). Tabs from clients_*.js register through GK.clientHub.tab().
   Data on the client record: assets [{id, name, url, kind}], notes [{id, at, by, text, shared}], extras [{id, projectId, kind, name, detail, amount, status}]. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    cl_title: ["Clients", "Clients"], cl_accent: ["", ""], cl_file: ["file", "fiche"],
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
    cl_skin: ["Monthly", "Mensuel"], cl_k_clients: ["Clients", "Clients"], cl_k_skin: ["Active monthly contracts", "Contrats mensuels actifs"],
    cl_k_inv: ["Invoiced to date", "Facturé à ce jour"], cl_k_owed: ["Still owed", "Reste dû"],
    cl_back: ["All clients", "Tous les clients"], cl_wa: ["Copy WhatsApp", "Copier le WhatsApp"], cl_no_wa: ["No WhatsApp number yet.", "Pas encore de numéro WhatsApp."],
    cl_details: ["Details", "Coordonnées"], cl_projects: ["Projects", "Projets"], cl_invoices: ["Invoices", "Factures"], cl_draft_no: ["Draft", "Brouillon"],
    cl_inv_no: ["No.", "N°"], cl_inv_what: ["What", "Objet"], cl_inv_amount: ["Amount", "Montant"], cl_inv_left: ["Left", "Reste"],
    cl_contracts: ["Monthly contracts", "Contrats mensuels"], cl_start_skin: ["Start a monthly contract", "Démarrer un contrat mensuel"],
    cl_skin_none: ["No monthly contract yet. Three months minimum.", "Pas encore de contrat mensuel. Trois mois minimum."],
    cl_skin_pack: ["Pack", "Pack"], cl_skin_start: ["First month", "Premier mois"], cl_skin_min: ["Minimum 3 months. The client can stop after the third month.", "Minimum 3 mois. Le client peut arrêter après le troisième mois."],
    cl_skin_title: ["Monthly contract", "Contrat mensuel"], cl_skin_acc: ["contract", "contrat"],
    cl_skin_has: ["This client already has an active monthly contract.", "Ce client a déjà un contrat mensuel actif."],
    cl_skin_months: ["{n} of 3 minimum months made", "{n} mois créés sur 3 minimum"], cl_skin_from: ["From {m}", "Depuis {m}"],
    cl_skin_end_min: ["Earliest end: {m}", "Fin au plus tôt : {m}"], cl_skin_active: ["Active", "Actif"], cl_skin_ended: ["Ended", "Terminé"],
    cl_skin_end: ["End contract", "Arrêter le contrat"], cl_skin_end_wait: ["It can end once 3 months exist ({n} so far).", "Arrêt possible quand 3 mois existent ({n} pour l'instant)."],
    cl_skin_end_q: ["End this monthly contract?", "Arrêter ce contrat mensuel ?"], cl_skin_end_body: ["No new monthly projects will be due. Existing months stay as they are.", "Plus aucun mois ne sera à créer. Les mois existants restent tels quels."],
    cl_skin_months_link: ["Monthly projects", "Projets mensuels"], cl_skin_started: ["Monthly contract started", "Contrat mensuel démarré"],
    cl_skin_month_n: ["Month {n}", "Mois {n}"],
    cl_log_added: ["added", "ajouté"], cl_log_edited: ["details edited", "coordonnées modifiées"],
    cl_log_skin: ["Monthly contract started ({p}, {m})", "Contrat mensuel démarré ({p}, {m})"], cl_log_skin_end: ["Monthly contract ended", "Contrat mensuel arrêté"],
    cl_del: ["Delete client", "Supprimer le client"], cl_del_founder: ["Only the founder can delete a client.", "Seul le fondateur peut supprimer un client."],
    cl_del_blocked: ["This client has projects or invoices. They stay for the books.", "Ce client a des projets ou des factures. Ils restent pour la comptabilité."],
    cl_del_q: ["Delete this client?", "Supprimer ce client ?"], cl_del_body: ["They have no projects and no invoices. This can't be undone.", "Aucun projet ni facture. C'est définitif."],
    cl_deleted: ["Client deleted", "Client supprimé"], cl_none_yet: ["No clients yet. Win a lead or add one here.", "Pas encore de client. Gagnez un prospect ou ajoutez-en un ici."],
    cl_no_projects: ["No projects yet.", "Pas encore de projet."], cl_no_invoices: ["No invoices yet.", "Pas encore de facture."],
    cl_code_taken: ["Another client already uses this code.", "Un autre client utilise déjà ce code."], cl_read: ["Read only", "Lecture seule"]
  });

  GK.i18n.add({
    cl_sub2: ["{n} clients · {active} active projects · {owed} still owed", "{n} clients · {active} projets actifs · {owed} restant dû"],
    cl_c_active: ["Active", "Actifs"], cl_c_owed: ["Owed", "Dû"], cl_c_last: ["Last activity", "Dernière activité"], cl_c_none: ["No activity yet", "Pas encore d'activité"],
    cl_waiting: ["{n} waiting", "{n} en attente"], cl_c_stage: ["Now", "En ce moment"],
    cl_t_overview: ["Overview", "Vue d'ensemble"], cl_t_projects: ["Projects", "Projets"], cl_t_assets: ["Assets", "Fichiers"], cl_t_approvals: ["Approvals", "Validations"],
    cl_t_performance: ["Performance", "Résultats"], cl_t_invoices: ["Invoices", "Factures"], cl_t_notes: ["Notes", "Notes"], cl_t_extras: ["Extras", "Extras"],
    cl_t_portal: ["Portal", "Portail"], cl_t_details: ["Details", "Fiche"],
    cl_wa_open: ["WhatsApp", "WhatsApp"], cl_portal_live: ["Portal live", "Portail actif"], cl_portal_off: ["Portal off", "Portail désactivé"], cl_portal_none: ["No portal yet", "Pas encore de portail"],
    cl_ov_projects: ["Active projects", "Projets actifs"], cl_ov_next: ["Next shoot", "Prochain tournage"], cl_ov_wait: ["Waiting on the client", "En attente du client"],
    cl_ov_none_proj: ["No active project. Start one when the client says yes.", "Aucun projet actif. Lancez-en un quand le client dit oui."],
    cl_ov_nothing: ["Nothing is waiting on the client.", "Rien n'attend le client."], cl_ov_see_all: ["See all", "Tout voir"],
    cl_ov_unpaid: ["To collect", "À encaisser"], cl_ov_nounpaid: ["Nothing to collect.", "Rien à encaisser."],
    cl_pj_active: ["Active", "En cours"], cl_pj_done: ["Done", "Terminés"], cl_pj_new: ["New project", "Nouveau projet"], cl_pj_videos: ["{done} of {total} videos", "{done} vidéos sur {total}"],
    cl_quotes: ["Quotes", "Devis"], cl_q_no_quotes: ["No quotes yet.", "Pas encore de devis."], cl_q_title: ["Quote", "Devis"], cl_q_status: ["Status", "Statut"]
  });

  var HUB = GK.clientHub = { tabs: [] };
  /** Register a workspace tab: {key, order, label, render(c), count(c), show(c)}. */
  HUB.tab = function (def) {
    HUB.tabs = HUB.tabs.filter(function (x) { return x.key !== def.key; }).concat([def]).sort(function (a, b) { return a.order - b.order; });
  };
  function canEdit() { return m.can("clients"); }
  function codeOf(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8); }
  function invsOf(c) { return S.all("invoices").filter(function (i) { return i.clientId === c.id; }); }
  function projsOf(c) { return S.all("projects").filter(function (p) { return p.clientId === c.id; }); }
  function contractsOf(c) { return S.all("contracts").filter(function (k) { return k.clientId === c.id; }); }
  function billable(i) { return i.no && i.kind !== "credit" && !i.credited; }
  /** Issued invoices before stamp, credit notes included (they carry a negative amount). Same basis as Finance. */
  function invoiced(c) { return u.sum(invsOf(c), m.invoiceTurnover); }
  function owed(c) { return u.sum(invsOf(c).filter(billable), m.invBalance); }
  function activeProjects(c) { return projsOf(c).filter(function (p) { return p.stage !== "retention"; }); }
  function activeContract(c) { return contractsOf(c).filter(function (k) { return k.status === "active"; })[0] || null; }

  /** Notes live as a list. A client saved before that has one text: it becomes a single internal note. */
  function notesOf(c) {
    if (Array.isArray(c.notes)) return c.notes;
    return typeof c.notes === "string" && c.notes.trim() ? [{ id: "legacy", at: "", by: "", text: c.notes.trim(), shared: false }] : [];
  }
  function waNumber(c) {
    var d = String(c.whatsapp || c.phone || "").replace(/\D/g, "");
    if (d.indexOf("00") === 0) d = d.slice(2);
    if (d.length === 8) d = "216" + d;
    return d;
  }
  function sharesOf(c) { return S.all("shares").filter(function (x) { return x.clientId === c.id; }); }
  function lastActivity(c) {
    var best = "";
    function see(x) { x = String(x || ""); if (x && x > best) best = x; }
    (c.log || []).forEach(function (l) { see(l.at); });
    projsOf(c).forEach(function (p) { (p.log || []).forEach(function (l) { see(l.at); }); });
    invsOf(c).forEach(function (i) { see(i.issued); (i.payments || []).forEach(function (x) { see(x.date); }); });
    S.all("feedback").forEach(function (f) { if (f.clientId === c.id) see(f.at); });
    sharesOf(c).forEach(function (x) { see(x.publishedAt); });
    return best;
  }
  function waitingOf(c) { return HUB.waiting ? HUB.waiting(c) : []; }
  function nextShoot(c) {
    return activeProjects(c).map(function (p) { return p.shootDate; }).filter(function (d) { return d && d >= u.today(); }).sort()[0] || "";
  }
  HUB.canEdit = canEdit; HUB.projsOf = projsOf; HUB.invsOf = invsOf; HUB.activeProjects = activeProjects; HUB.owed = owed; HUB.invoiced = invoiced; HUB.billable = billable;
  HUB.notesOf = notesOf; HUB.waNumber = waNumber; HUB.sharesOf = sharesOf; HUB.nextShoot = nextShoot; HUB.lastActivity = lastActivity;

  function css() {
    if (document.getElementById("clh-css")) return;
    var st = document.createElement("style"); st.id = "clh-css";
    st.textContent = [
      ".clh-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}",
      ".clh-card{border:1px solid var(--line);background:var(--s1);padding:18px;display:flex;flex-direction:column;gap:16px;cursor:pointer;animation:clh-in .3s var(--ease) both;animation-delay:calc(var(--i,0)*35ms);transition:border-color var(--dur) var(--ease),transform var(--dur) var(--ease)}",
      ".clh-card:hover{border-color:var(--tx);transform:translateY(-2px)}.clh-card:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}",
      ".clh-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}",
      ".clh-brand{margin:0;font-family:var(--f-display);font-weight:400;font-size:26px;line-height:1.05;overflow-wrap:anywhere}",
      ".clh-sub{font-size:13px;color:var(--tx-2)}",
      ".clh-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-top:1px solid var(--line);padding-top:12px}",
      ".clh-stats>div{display:flex;flex-direction:column;gap:4px;min-width:0}.clh-stats strong{font-size:15px;overflow-wrap:anywhere}",
      ".clh-tabs{max-width:100%}",
      ".clh-in{animation:clh-in .26s var(--ease) both}",
      "@keyframes clh-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      "@media (prefers-reduced-motion:reduce){.clh-card,.clh-in{animation:none!important;transition:none!important}.clh-card:hover{transform:none}}",
      ".clh-bd{display:inline-block;min-width:18px;padding:0 5px;margin-left:6px;background:var(--chroma);color:var(--b-ink);font-size:11px;line-height:18px;text-align:center}",
      ".clh-split{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:18px;align-items:start}",
      ".clh-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;align-items:start}",
      ".clh-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)}.clh-row:last-child{border-bottom:0}",
      ".clh-row .st{display:flex;flex-direction:column;gap:3px;min-width:0}",
      ".clh-note{white-space:pre-wrap;overflow-wrap:anywhere}",
      ".clh-wa{text-decoration:none}",
      "@media (max-width:760px){.clh-split{grid-template-columns:1fr}.clh-cards{grid-template-columns:1fr}}"
    ].join("\n");
    document.head.appendChild(st);
  }

  // ---------- list ----------
  function listView() {
    css();
    var clients = S.all("clients").sort(u.by(function (c) { return (c.brand || "").toLowerCase(); }));
    var totOwed = u.sum(clients, owed), totActive = u.sum(clients, function (c) { return activeProjects(c).length; });
    var add = ui.btn(t("cl_add"), "cl-new", { cls: "primary", disabled: !canEdit(), title: canEdit() ? "" : t("cl_no_edit") });
    var cards = clients.map(function (c, i) {
      var k = activeContract(c), ow = owed(c), act = activeProjects(c).length, last = lastActivity(c), wait = waitingOf(c).length;
      return '<article class="clh-card" style="--i:' + Math.min(i, 12) + '" tabindex="0" role="button" data-a="cl-open" data-id="' + esc(c.id) + '" aria-label="' + esc(c.brand) + '">' +
        '<div class="clh-top"><div class="stack" style="gap:6px"><h3 class="clh-brand">' + esc(c.brand) + '</h3><span class="clh-sub">' + esc([c.sector, c.contact].filter(Boolean).join(" · ") || "—") + "</span></div>" +
        '<div class="stack" style="gap:6px;align-items:flex-end">' + (wait ? ui.pill(t("cl_waiting", { n: wait }), "chroma") : "") + (k ? ui.chip(m.pack(k.pack).name, k.pack) : "") + "</div></div>" +
        '<div class="clh-stats"><div><span class="lab sm">' + esc(t("cl_c_active")) + '</span><strong class="num">' + act + "</strong></div>" +
        '<div><span class="lab sm">' + esc(t("cl_c_owed")) + '</span><strong class="num">' + (ow > 0 ? esc(u.money(ow)) : '<span class="faint">' + esc(u.money(0)) + "</span>") + "</strong></div>" +
        '<div><span class="lab sm">' + esc(t("cl_c_last")) + '</span><strong>' + (last ? esc(u.fmtDate(last.slice(0, 10), { day: "numeric", month: "short" })) : '<span class="faint">' + esc(t("cl_c_none")) + "</span>") + "</strong></div></div></article>";
    }).join("");
    return ui.head({ label: t("nav_clients"), title: t("cl_title"), accent: t("cl_accent"), sub: esc(t("cl_sub2", { n: clients.length, active: totActive, owed: u.money(totOwed) })) + " " + ui.sample(), actions: add }) +
      GK.insight.clients() +
      (clients.length ? '<div class="clh-cards">' + cards + "</div>" : ui.empty(t("cl_none_yet")));
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
      "</div>" +
      (canEdit() ? '<div class="row" style="justify-content:flex-end">' + ui.btn(t("save"), "cl-save", { cls: "primary", data: { id: c.id } }) + "</div>" : "") + "</div>";
  }
  function projectsPanel(c) {
    var ps = projsOf(c).sort(u.by(function (p) { return (p.stage === "retention" ? "1" : "0") + (p.shootDate || ""); }));
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
  // ---------- workspace ----------
  function portalPill(c) {
    var sh = sharesOf(c);
    if (!sh.length) return ui.pill(t("cl_portal_none"), "");
    return sh.some(function (x) { return x.enabled && x.publishedAt; }) ? ui.pill(t("cl_portal_live"), "done") : ui.pill(t("cl_portal_off"), "");
  }
  function tabsOf(c) {
    return HUB.tabs.filter(function (x) { return !x.show || x.show(c); });
  }
  function detailView(c, params) {
    css();
    var tabs = tabsOf(c), keys = tabs.map(function (x) { return x.key; });
    var tab = keys.indexOf(params.tab) > -1 ? params.tab : "overview";
    var wa = waNumber(c);
    var actions = ui.btn(t("cl_back"), "cl-back", { cls: "ghost" }) +
      (wa ? '<a class="btn clh-wa" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' + esc(t("cl_wa_open")) + "</a>"
        : ui.btn(t("cl_wa_open"), "cl-wa", { data: { id: c.id }, disabled: true, title: t("cl_no_wa") }));
    var k = activeContract(c);
    var sub = '<span class="row">' + [c.sector, c.contact, c.whatsapp || c.phone].filter(Boolean).map(esc).join(" · ") + (k ? " " + ui.pill(m.pack(k.pack).name, "done") : "") + " " + portalPill(c) + "</span>";
    var h = ui.head({ label: t("nav_clients"), title: c.brand || "—", accent: t("cl_file"), sub: sub, actions: actions });
    h += '<div class="tabs clh-tabs" role="tablist">' + tabs.map(function (x) {
      var n = x.count ? x.count(c) : 0;
      return '<button type="button" role="tab" data-a="cl-tab" data-v="' + x.key + '" aria-selected="' + (tab === x.key) + '">' + esc(x.label()) + (n ? '<span class="clh-bd">' + n + "</span>" : "") + "</button>";
    }).join("") + "</div>";
    var cur = tabs.filter(function (x) { return x.key === tab; })[0];
    return h + '<div class="stack clh-in" data-tab="' + tab + '" style="gap:18px">' + cur.render(c) + "</div>";
  }

  // ---------- tabs kept in this file ----------
  function projRow(p) {
    var pr = m.progress(p);
    return '<div class="clh-row click" tabindex="0" role="button" data-a="cl-proj" data-id="' + esc(p.id) + '"><div class="st"><strong>' + esc(p.name) + '</strong><span class="small muted">' +
      esc(m.pack(p.pack).name) + (p.shootDate ? " · " + esc(u.fmtDate(p.shootDate)) : "") + (pr.total ? " · " + esc(t("cl_pj_videos", { done: pr.done, total: pr.total })) : "") + "</span></div>" + ui.stagePill(p) + "</div>";
  }
  function overviewTab(c) {
    var act = activeProjects(c).sort(u.by(function (p) { return m.STAGES.indexOf(p.stage); })), wait = waitingOf(c), ns = nextShoot(c);
    var unpaid = invsOf(c).filter(function (i) { return billable(i) && m.invBalance(i) > 0; }).sort(u.by("issued"));
    var h = ui.kpis([
      { lab: t("cl_ov_projects"), v: String(act.length) },
      { lab: t("cl_ov_next"), v: ns ? u.fmtDate(ns, { day: "numeric", month: "short" }) : "—" },
      { lab: t("cl_ov_wait"), v: String(wait.length) },
      { lab: t("cl_owed"), v: u.money(owed(c)) }
    ]);
    h += '<div class="clh-split"><div class="stack" style="gap:18px">';
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_ov_projects")) + '</h2>' + ui.btn(t("cl_ov_see_all"), "cl-tab", { cls: "ghost sm", data: { v: "projects" } }) + "</div>" +
      (act.length ? act.map(projRow).join("") : ui.empty(t("cl_ov_none_proj"))) + "</section>";
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_ov_unpaid")) + "</h2>" + ui.btn(t("cl_ov_see_all"), "cl-tab", { cls: "ghost sm", data: { v: "invoices" } }) + "</div>" +
      (unpaid.length ? unpaid.slice(0, 4).map(function (i) {
        return '<div class="clh-row"><div class="st"><strong>' + esc(i.label || t("k_" + i.kind)) + '</strong><span class="small muted code">' + esc(i.no) + (i.due ? " · " + esc(u.fmtDate(i.due)) : "") + '</span></div><div class="stack" style="gap:4px;align-items:flex-end"><strong class="num">' + esc(u.money(m.invBalance(i))) + "</strong>" + ui.invPill(i) + "</div></div>";
      }).join("") : '<p class="small muted" style="margin:0">' + esc(t("cl_ov_nounpaid")) + "</p>") + "</section>";
    h += '</div><section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_ov_wait")) + "</h2>" + ui.btn(t("cl_ov_see_all"), "cl-tab", { cls: "ghost sm", data: { v: "approvals" } }) + "</div>" +
      (wait.length ? wait.slice(0, 6).map(function (w) {
        return '<div class="clh-row"><div class="st"><strong>' + esc(w.title) + '</strong><span class="small muted">' + esc(w.sub || "") + "</span></div>" + ui.pill(w.kindLabel, "chroma") + "</div>";
      }).join("") : '<p class="small muted" style="margin:0">' + esc(t("cl_ov_nothing")) + "</p>") + "</section></div>";
    return h;
  }
  function projectsTab(c) {
    var all = projsOf(c), act = activeProjects(c).sort(u.by(function (p) { return m.STAGES.indexOf(p.stage); })), done = all.filter(function (p) { return p.stage === "retention"; }).sort(u.by(function (p) { return p.shootDate || ""; }, "desc"));
    function block(title, list) {
      return '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(title) + '</h2><span class="small muted num">' + list.length + "</span></div>" + (list.length ? list.map(projRow).join("") : ui.empty(t("cl_no_projects"))) + "</section>";
    }
    var add = GK.pj && GK.pj.openNew && m.can("projects.create") ? '<div class="row">' + ui.btn(t("cl_pj_new"), "cl-pj-new", { cls: "primary sm", icon: "plus", data: { id: c.id } }) + "</div>" : "";
    return add + block(t("cl_pj_active"), act) + (done.length ? block(t("cl_pj_done"), done) : "") + contractsPanel(c);
  }
  function quotesPanel(c) {
    var qs = S.all("quotes").filter(function (q) { return q.clientId === c.id; }).sort(u.by(function (q) { return q.sentOn || q.no || ""; }, "desc"));
    var st = GK.fin && GK.fin.quotes && GK.fin.quotes.status ? GK.fin.quotes.status : function (q) { return q.status || "draft"; };
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cl_quotes")) + '</h2><span class="small muted num">' + qs.length + "</span></div>" +
      (qs.length ? '<div class="tbl"><table><thead><tr><th>' + esc(t("cl_inv_no")) + "</th><th>" + esc(t("cl_q_title")) + '</th><th class="r">' + esc(t("cl_inv_amount")) + "</th><th>" + esc(t("cl_q_status")) + "</th></tr></thead><tbody>" +
        qs.map(function (q) {
          var s1 = st(q);
          return '<tr><td class="code">' + esc(q.no || t("cl_draft_no")) + "</td><td>" + esc(q.title || "—") + '</td><td class="r num">' + esc(u.money(+q.amount || 0)) + "</td><td>" + ui.pill(t("fi_q_st_" + s1), s1 === "accepted" ? "done" : s1 === "sent" ? "chroma" : "") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : ui.empty(t("cl_q_no_quotes"))) + "</div>";
  }
  function invoicesTab(c) { return invoicesPanel(c) + quotesPanel(c); }
  function detailsTab(c) {
    var founder = m.isFounder() && m.can("clients"), busy = projsOf(c).length || invsOf(c).length;
    return assignmentPanel(c) + detailsForm(c) +
      '<div class="row">' + ui.btn(t("cl_del"), "cl-del", { cls: "ghost", data: { id: c.id }, disabled: !founder || !!busy, title: !founder ? t("cl_del_founder") : busy ? t("cl_del_blocked") : "" }) + "</div>";
  }
  HUB.tab({ key: "overview", order: 10, label: function () { return t("cl_t_overview"); }, render: overviewTab });
  HUB.tab({ key: "projects", order: 20, label: function () { return t("cl_t_projects"); }, render: projectsTab, count: function (c) { return activeProjects(c).length; } });
  HUB.tab({ key: "invoices", order: 60, label: function () { return t("cl_t_invoices"); }, render: invoicesTab });
  HUB.tab({ key: "details", order: 100, label: function () { return t("cl_t_details"); }, render: detailsTab });

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
      return c ? detailView(c, params) : listView();
    },
    after: function () {
      var p = ui.p("clients");
      if (HUB.after) HUB.after(p);
      // ui.go("clients", {new: true}) from another screen opens the Add-client modal once.
      if (!p.new) return;
      delete p.new;
      if (canEdit()) newModal(); else ui.toast(t("cl_no_edit"));
    }
  });

  // ---------- actions ----------
  GK.act("cl-open", function (el) { ui.go("clients", { id: el.dataset.id, tab: "overview" }); });
  GK.act("cl-tab", function (el) { ui.go("clients", { tab: el.dataset.v }); });
  GK.act("cl-pj-new", function (el) { if (GK.pj && GK.pj.openNew) GK.pj.openNew({ clientId: el.dataset.id }); });
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
      baseline: { v: u.numVal("cl-base"), date: u.val("cl-base-date") }
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
      taxId: "", buyer: u.val("cln-buyer").trim(), baseline: { v: 0, date: "" }, notes: [], assets: [], extras: [] }, { log: t("cl_log_added") });
    ui.closeModal(true);
    ui.toast(t("saved"));
    ui.go("clients", { id: c.id, tab: "overview" });
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

  // ---------- monthly contracts ----------
  GK.act("cl-skin-new", function (el) {
    if (!canEdit()) return ui.toast(t("cl_no_edit"));
    var c = S.get("clients", el.dataset.id); if (!c) return;
    var packs = m.packKeys().filter(function (k) { return m.pack(k).monthly; });
    ui.modal({
      title: t("cl_skin_title"), accent: t("cl_skin_acc"), label: c.brand,
      body: '<div class="form">' +
        ui.field({ id: "clk-pack", label: t("cl_skin_pack"), type: "select", value: packs[0], options: packs.map(function (k) { return [k, m.pack(k).name + " · " + u.money(m.pack(k).price) + " " + t("per_month")]; }) }) +
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
