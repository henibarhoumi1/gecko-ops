/* GECKO Ops · module: pipeline (Mohamed's sales board) */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    pl_title: ["Leads in", "Prospects en"], pl_accent: ["play", "jeu"],
    pl_sub: ["{open} open · {due} to follow up today or late", "{open} en cours · {due} à relancer aujourd'hui ou en retard"],
    pl_add: ["Add lead", "Ajouter un prospect"], pl_new: ["New", "Nouveau"], pl_lead: ["lead", "prospect"],
    pl_no_edit: ["Only sales and the founder can change leads.", "Seuls le commercial et le fondateur peuvent modifier les prospects."],
    pl_brand: ["Brand", "Marque"], pl_contact: ["Contact", "Contact"], pl_handle: ["Instagram", "Instagram"],
    pl_channel: ["Came from", "Provenance"], pl_pack: ["Pack in mind", "Pack visé"], pl_owner: ["Owner", "Responsable"],
    pl_stage: ["Stage", "Étape"], pl_move: ["Move to", "Passer à"], pl_next: ["Next step", "Prochaine étape"], pl_next_date: ["By", "Pour le"],
    pl_next_ph: ["Send the teardown, book the call…", "Envoyer l'analyse, caler l'appel…"],
    pl_qual: ["Qualification", "Qualification"], pl_qual_hint: ["Four yes = worth a call.", "Quatre oui = ça vaut un appel."],
    pl_q1: ["Sells a physical product online or in stores", "Vend un produit physique en ligne ou en boutique"],
    pl_q2: ["Running ads or posting to sell now", "Fait de la pub ou publie pour vendre en ce moment"],
    pl_q3: ["Can share orders per week or an Ads Manager screenshot", "Peut partager ses commandes par semaine ou une capture d'Ads Manager"],
    pl_q4: ["Has a monthly content budget, separate from ad spend", "A un budget contenu mensuel, distinct du budget pub"],
    pl_log_added: ["added", "ajouté"], pl_log_edited: ["edited", "modifié"], pl_log_moved: ["moved to {s}", "passé à {s}"],
    pl_log_client: ["created from the pipeline", "créé depuis la prospection"],
    pl_ch_teardown_dm: ["Teardown DM", "DM avec analyse"], pl_ch_media_buyer: ["Media buyer", "Media buyer"], pl_ch_referral: ["Referral", "Recommandation"],
    pl_ch_warm: ["Warm intro", "Mise en relation"], pl_ch_inbound: ["Inbound", "Entrant"],
    pl_lr_no_budget: ["No budget", "Pas de budget"], pl_lr_no_product: ["No product yet", "Pas encore de produit"], pl_lr_not_now: ["Not now", "Pas maintenant"],
    pl_lr_went_elsewhere: ["Went elsewhere", "Parti ailleurs"], pl_lr_no_reply: ["Never replied", "Jamais répondu"], pl_lr_other: ["Other", "Autre"],
    pl_lost_reason: ["Why was it lost?", "Pourquoi perdu ?"], pl_lost_q: ["Lost", "Perdu"], pl_lost_acc: ["why", "pourquoi"],
    pl_lost_body: ["Pick the real reason. The tally tells us what to fix.", "Choisissez la vraie raison. Le décompte montre quoi corriger."],
    pl_late: ["Late", "En retard"], pl_today: ["Today", "Aujourd'hui"], pl_no_next: ["No next step", "Pas de prochaine étape"],
    pl_won30: ["Won · last 30 days", "Gagnés · 30 derniers jours"], pl_lost30: ["Lost · last 30 days", "Perdus · 30 derniers jours"],
    pl_funnel: ["Weekly funnel", "Entonnoir par semaine"], pl_week: ["Week", "Semaine"], pl_this_week: ["This week", "Cette semaine"],
    pl_week_of: ["Week of {d}", "Semaine du {d}"], pl_dms: ["DMs", "DM"], pl_replies: ["Replies", "Réponses"], pl_rate: ["Reply rate", "Taux de réponse"],
    pl_calls: ["Calls", "Appels"], pl_props: ["Proposals", "Propositions"], pl_won: ["Won", "Gagnés"], pl_total: ["4 weeks", "4 semaines"],
    pl_target: ["Target: 10 DMs a day, 50 to 70 a week.", "Objectif : 10 DM par jour, 50 à 70 par semaine."],
    pl_below: ["Below 50", "Sous 50"], pl_running: ["In progress", "En cours"],
    pl_reasons: ["Why we lose", "Pourquoi on perd"], pl_reasons_none: ["No lost leads yet.", "Aucun prospect perdu pour l'instant."],
    pl_everyone: ["Everyone", "Tout le monde"],
    pl_k_open: ["Open leads", "Prospects en cours"], pl_k_due: ["Follow up now", "À relancer"], pl_k_qual: ["Fully qualified", "Qualifiés 4/4"],
    pl_k_dms: ["DMs this week", "DM cette semaine"], pl_k_dms_n: ["target 50 to 70", "objectif 50 à 70"],
    pl_won_value: ["Won opportunity estimate: {a}. It is not invoiced revenue.", "Estimation des opportunités gagnées : {a}. Ce n'est pas du chiffre d'affaires facturé."],
    pl_confirmed_revenue: ["Confirmed invoiced revenue this year: {r}.", "Chiffre d'affaires facturé confirmé cette année : {r}."],
    pl_convert_title: ["Convert signed lead", "Convertir le prospect signé"], pl_convert_hint: ["Signing creates or links a client, but the lead stays signed until the required upfront payment is recorded.", "La signature crée ou relie un client, mais le prospect reste signé jusqu'à l'enregistrement du paiement initial requis."],
    pl_convert_choose: ["Choose an existing client", "Choisir un client existant"], pl_convert_use: ["Use selected client", "Utiliser ce client"], pl_convert_create: ["Create a new client", "Créer un nouveau client"],
    pl_convert_need: ["Choose a client first.", "Choisissez d'abord un client."],
    pl_duplicate_client_q: ["A client with this brand name already exists. Create a separate record anyway?", "Un client portant déjà ce nom existe. Créer tout de même une fiche distincte ?"],
    pl_duplicate_client_body: ["Creating a new record will not merge it with the existing client. Check the list carefully before continuing.", "La nouvelle fiche ne sera pas fusionnée avec le client existant. Vérifiez bien la liste avant de continuer."],
    pl_saved_won: ["Signed. {b} is now linked to this lead.", "Signé. {b} est maintenant lié à ce prospect."], pl_won_existing: ["Signed. Opening the project for {b}.", "Signé. Ouverture du projet de {b}."],
    pl_signed_unpaid: ["A signed deal stays open until its required upfront payment is recorded.", "Un contrat signé reste en cours jusqu'à l'enregistrement du paiement initial requis."],
    pl_conversion_error: ["The conversion could not be saved. No project was opened; retry to recover any client created from this lead.", "La conversion n'a pas été enregistrée. Aucun projet n'a été ouvert ; réessayez pour retrouver tout client créé depuis ce prospect."],
    pl_won_payment_error: ["The lead was not marked won because its payment status could not be reconciled.", "Le prospect n'a pas été marqué gagné car le statut de paiement n'a pas pu être vérifié."],
    pl_moved: ["Moved to {s}", "Passé à {s}"], pl_del_q: ["Delete this lead?", "Supprimer ce prospect ?"],
    pl_del_body: ["It disappears from the board and the funnel. Clients and projects stay.", "Il disparaît du tableau et de l'entonnoir. Les clients et projets restent."],
    pl_deleted: ["Lead deleted", "Prospect supprimé"], pl_history: ["History", "Historique"],
    pl_client_note: ["From the pipeline · {h}", "Depuis la prospection · {h}"], pl_read: ["Read only", "Lecture seule"]
  });

  var OPEN = m.OPEN_STAGES.slice();
  var LEAD_DOT = { prospect: "dot-blue", contacted: "dot-blue", conversation: "dot-yellow", meeting_booked: "dot-pink", qualified: "dot-chroma", proposal_sent: "dot-chroma", negotiation: "dot-pink", accepted: "dot-chroma", signed: "dot-chroma" };
  var QN = 4;

  function canEdit() { return m.can("leads"); }
  function sellers() { return S.all("team").filter(function (p) { return p.role === "founder" || p.role === "sales"; }).sort(u.by("name")); }
  function defaultOwner() { var me = GK.me(); if (me) return me.id; var s = sellers().filter(function (p) { return p.role === "sales"; })[0] || sellers()[0]; return s ? s.id : ""; }
  function lastAt(l, stage) { var h = (l.history || []).filter(function (x) { return x.stage === stage; }); return h.length ? h[h.length - 1].at : ""; }
  function qn(l) { return (l.q || []).filter(Boolean).length; }
  function codeOf(brand) {
    return String(brand || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) || "BRAND";
  }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function byNext(a, b) { var A = a.nextDate || "9999", B = b.nextDate || "9999"; return A < B ? -1 : A > B ? 1 : 0; }

  function nextHTML(l) {
    var today = u.today();
    if (!l.next && !l.nextDate) return '<span class="small faint">' + esc(t("pl_no_next")) + "</span>";
    var date = "";
    if (l.nextDate) {
      if (l.nextDate < today) date = ui.pill(t("pl_late") + " · " + u.fmtDate(l.nextDate), "alert");
      else if (l.nextDate === today) date = ui.pill(t("pl_today"), "wip");
      else date = '<span class="small muted num">' + esc(u.fmtDate(l.nextDate)) + "</span>";
    }
    return '<div class="row" style="gap:6px"><span class="small">' + esc(l.next || "—") + "</span>" + date + "</div>";
  }
  function stageSelect(l) {
    if (!canEdit()) return "";
    return '<select class="in inline small" data-c="pl-move" data-id="' + esc(l.id) + '" aria-label="' + esc(t("pl_move") + " · " + l.brand) + '">' +
      m.LEAD_STAGES.map(function (s) { return '<option value="' + s + '"' + (s === m.leadStage(l) ? " selected" : "") + ">" + esc(t("ls_" + s)) + "</option>"; }).join("") + "</select>";
  }
  function card(l) {
    var n = qn(l), owner = m.member(l.owner);
    return '<div class="card" tabindex="0" data-a="pl-open" data-id="' + esc(l.id) + '">' +
      '<div class="row between" style="gap:6px;flex-wrap:nowrap"><span class="t">' + esc(l.brand || "—") + "</span>" +
      ui.pill(n + "/" + QN, n === QN ? "done" : "") + "</div>" +
      '<div class="m">' + [l.handle, l.pack ? m.pack(l.pack).name : "", l.channel ? t("pl_ch_" + l.channel) : ""].filter(Boolean).map(esc).join(" · ") + "</div>" +
      nextHTML(l) +
      '<div class="row between" style="gap:6px"><span class="row small muted" style="gap:6px">' + ui.av(owner.name) + esc(owner.name) + "</span>" + stageSelect(l) + "</div>" +
      "</div>";
  }

  function board(leads) {
    return '<div class="board">' + OPEN.map(function (s) {
      var list = leads.filter(function (l) { return m.leadStage(l) === s; }).sort(byNext);
      return '<section class="col" aria-label="' + esc(t("ls_" + s)) + '"><div class="col-h"><span class="lab">' + ui.dot(LEAD_DOT[s]) + esc(t("ls_" + s)) + '</span><span class="small muted num">' + list.length + "</span></div>" +
        (list.length ? list.map(card).join("") : '<p class="small faint" style="margin:0">—</p>') + "</section>";
    }).join("") + "</div>";
  }

  function closedList(leads, stage) {
    var since = u.addDays(u.today(), -30);
    var list = leads.filter(function (l) { return l.stage === stage && (lastAt(l, stage) || "") >= since; })
      .sort(u.by(function (l) { return lastAt(l, stage); }, "desc"));
    var body = list.length ? '<div class="list">' + list.map(function (l) {
      var right = stage === "lost" ? ui.pill(t("pl_lr_" + (l.lostReason || "other"))) : (l.pack ? ui.pill(m.pack(l.pack).name, "done") : "");
      return '<div class="li click" tabindex="0" data-a="pl-open" data-id="' + esc(l.id) + '"><div class="stack" style="gap:2px"><strong>' + esc(l.brand) + '</strong><span class="m">' +
        esc(u.fmtDate(lastAt(l, stage))) + " · " + esc(m.member(l.owner).name) + "</span></div>" + right + "</div>";
    }).join("") + "</div>" : ui.empty();
    return '<div class="panel"><div class="panel-h"><h3 class="sec">' + esc(t(stage === "won" ? "pl_won30" : "pl_lost30")) + '</h3><span class="small muted num">' + list.length + "</span></div>" + body + "</div>";
  }

  function funnelPanel(owner) {
    var ws = u.weekStart(u.today()), rows = [], tot = { dms: 0, replies: 0, calls: 0, proposals: 0, won: 0 };
    for (var i = 0; i < 4; i++) {
      var start = u.addDays(ws, -7 * i), f = m.funnel(start, owner);
      for (var k in tot) tot[k] += f[k] || 0;
      var flag = i === 0 ? ui.pill(t("pl_running"), "wip") : f.dms < 50 ? ui.pill(t("pl_below"), "alert") : "";
      rows.push('<tr><td style="white-space:nowrap">' + esc(i === 0 ? t("pl_this_week") : t("pl_week_of", { d: u.fmtDate(start) })) + "</td>" +
        '<td class="r num">' + f.dms + "</td><td>" + flag + '</td><td class="r num">' + f.replies + '</td><td class="r num">' + (f.dms ? u.pct(f.replies / f.dms * 100) : "—") +
        '</td><td class="r num">' + f.calls + '</td><td class="r num">' + f.proposals + '</td><td class="r num">' + f.won + "</td></tr>");
    }
    var ownerSel = '<select class="in inline small" data-c="pl-owner" aria-label="' + esc(t("pl_owner")) + '"><option value="">' + esc(t("pl_everyone")) + "</option>" +
      sellers().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === owner ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select>";
    return '<div class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pl_funnel")) + "</h2>" + ownerSel + "</div>" +
      '<p class="small muted" style="margin:0">' + esc(t("pl_target")) + "</p>" +
      '<div class="tbl"><table><thead><tr><th>' + esc(t("pl_week")) + '</th><th class="r">' + esc(t("pl_dms")) + '</th><th></th><th class="r">' + esc(t("pl_replies")) +
      '</th><th class="r">' + esc(t("pl_rate")) + '</th><th class="r">' + esc(t("pl_calls")) + '</th><th class="r">' + esc(t("pl_props")) + '</th><th class="r">' + esc(t("pl_won")) + "</th></tr></thead><tbody>" +
      rows.join("") + "</tbody><tfoot><tr><td>" + esc(t("pl_total")) + '</td><td class="r num">' + tot.dms + '</td><td></td><td class="r num">' + tot.replies + '</td><td class="r num">' +
      (tot.dms ? u.pct(tot.replies / tot.dms * 100) : "—") + '</td><td class="r num">' + tot.calls + '</td><td class="r num">' + tot.proposals + '</td><td class="r num">' + tot.won + "</td></tr></tfoot></table></div></div>";
  }

  function reasonsPanel(leads, owner) {
    var lost = leads.filter(function (l) { return l.stage === "lost" && (!owner || l.owner === owner); });
    var counts = {};
    lost.forEach(function (l) { var r = l.lostReason || "other"; counts[r] = (counts[r] || 0) + 1; });
    var rows = m.LOST_REASONS.filter(function (r) { return counts[r]; }).sort(function (a, b) { return counts[b] - counts[a]; });
    return '<div class="panel"><h2 class="sec">' + esc(t("pl_reasons")) + "</h2>" +
      (rows.length ? '<div class="list">' + rows.map(function (r) {
        return '<div class="li"><span>' + esc(t("pl_lr_" + r)) + '</span><span class="row" style="gap:10px;flex-wrap:nowrap"><span style="width:90px">' + ui.meter(counts[r] / lost.length * 100) + '</span><strong class="num">' + counts[r] + "</strong></span></div>";
      }).join("") + "</div>" : ui.empty(t("pl_reasons_none"))) +
      '<p class="note" style="margin:0">' + esc(t("no_discount")) + "</p></div>";
  }

  GK.view("pipeline", {
    render: function (params) {
      var leads = S.all("leads"), today = u.today(), owner = params.owner || "";
      var open = leads.filter(m.isOpen);
      var due = open.filter(function (l) { return l.nextDate && l.nextDate <= today; }).length;
      var qual = open.filter(m.qualified).length;
      var week = m.funnel(u.weekStart(today), owner);
      var add = ui.btn(t("pl_add"), "pl-new", { cls: "primary", disabled: !canEdit(), title: canEdit() ? "" : t("pl_no_edit") });
      var values = t("pl_won_value", { a: u.money(GK.x.wonOpportunityValue()) });
      if (m.isFounder()) values += " " + t("pl_confirmed_revenue", { r: u.money(GK.x.confirmedRevenue(u.year(today))) });
      return ui.head({ label: t("nav_pipeline"), title: t("pl_title"), accent: t("pl_accent"), sub: esc(t("pl_sub", { open: open.length, due: due })) + " " + ui.sample(), actions: add }) +
        GK.insight.pipeline() +
        '<p class="small muted">' + esc(values) + "</p>" +
        board(open) +
        '<div class="grid3">' + closedList(leads, "won") + closedList(leads, "lost") + reasonsPanel(leads, owner) + "</div>" +
        funnelPanel(owner);
    },
    after: function () {
      // Opened from elsewhere (Today's "Open lead"): ui.go("pipeline", {id}) opens that lead once.
      var p = ui.p("pipeline"), id = p.id;
      if (!id) return;
      delete p.id;
      var l = S.get("leads", id);
      if (l) leadModal(l);
    },
    count: function () {
      var today = u.today();
      return S.all("leads").filter(function (l) { return m.isOpen(l) && l.nextDate && l.nextDate <= today; }).length || "";
    }
  });

  // ---------- stage moves ----------
  function wonFlow(lead, fields) {
    var related = relatedClient(lead);
    if (related) return finishConversion(lead, related, fields, false);
    var clients = S.all("clients").sort(u.by("brand"));
    ui.modal({
      title: t("pl_convert_title"), accent: t("pl_lead"), label: lead.brand || "",
      body: '<p class="small muted">' + esc(t("pl_convert_hint")) + "</p>" +
        ui.field({ id: "pl-convert-client", label: t("pl_convert_choose"), type: "select", value: "", options: [["", "—"]].concat(clients.map(function (c) { return [c.id, [c.brand, c.code, c.contact].filter(Boolean).join(" · ")]; })) }),
      foot: ui.btn(t("cancel"), "pl-convert-cancel", { cls: "ghost" }) +
        ui.btn(t("pl_convert_use"), "pl-convert-existing", { cls: "primary", data: { id: lead.id, fields: JSON.stringify(fields || {}) } }) +
        ui.btn(t("pl_convert_create"), "pl-convert-new", { cls: "ghost", data: { id: lead.id, fields: JSON.stringify(fields || {}) } })
    });
  }
  function fieldsFrom(el) {
    try { return JSON.parse(el.dataset.fields || "{}"); }
    catch (error) { ui.toast(t("pl_conversion_error")); return null; }
  }
  function relatedClient(lead) {
    var byLead = lead.clientId && S.get("clients", lead.clientId);
    if (byLead) return byLead;
    return S.all("clients").find(function (client) { return client.sourceLeadId === lead.id; }) || null;
  }
  function linkedProject(lead, client) {
    var byId = lead.projectId && S.get("projects", lead.projectId);
    if (byId && byId.clientId === client.id) return byId;
    return S.all("projects").find(function (project) { return project.sourceLeadId === lead.id && project.clientId === client.id; }) || null;
  }
  function openWonProject(lead, client, created) {
    ui.toast(t(created ? "pl_saved_won" : "pl_won_existing", { b: client.brand }));
    var project = linkedProject(lead, client);
    if (project) {
      if (lead.projectId !== project.id) S.patch("leads", lead.id, { projectId: project.id });
      ui.go("projects", { id: project.id });
    } else if (GK.pj && typeof GK.pj.openNew === "function") {
      GK.pj.openNew({ clientId: client.id, pack: lead.pack || "", mohamed: m.member(lead.owner).role === "sales", sourceLeadId: lead.id });
    }
    else ui.go("projects");
  }
  function finishConversion(lead, client, fields, created) {
    var current = S.get("leads", lead.id);
    if (!current || !S.get("clients", client.id)) return ui.toast(t("pl_conversion_error"));
    var stage = m.leadStage(current), history = (current.history || []).slice();
    if (stage !== "signed") history.push({ stage: "signed", at: u.today() });
    var patch = Object.assign({}, fields || {}, { clientId: client.id, stage: "signed", lostReason: "", history: history });
    var saved = S.patch("leads", current.id, patch, { log: t("pl_log_moved", { s: t("ls_signed") }) });
    if (!saved) return ui.toast(t("pl_conversion_error"));
    ui.closeModal(true);
    var project = linkedProject(saved, client);
    if (project) {
      var payment = m.syncLeadPayment(project.id);
      if (!payment.ok) return ui.toast(t("pl_won_payment_error"));
      saved = S.get("leads", saved.id) || saved;
    }
    openWonProject(saved, client, created);
  }
  function saveNewWonClient(lead, fields) {
    var related = relatedClient(lead);
    if (related) return finishConversion(lead, related, fields, false);
    var client = S.put("clients", { brand: (lead.brand || "").trim(), code: codeOf(lead.brand), sourceLeadId: lead.id, contact: lead.contact || "", phone: "", whatsapp: "", email: "", sector: "", taxId: "", buyer: "",
      baseline: { v: 0, date: "" }, notes: lead.handle ? t("pl_client_note", { h: lead.handle }) : "" }, { log: t("pl_log_client") });
    if (!client) return ui.toast(t("pl_conversion_error"));
    finishConversion(lead, client, fields, true);
  }
  GK.act("pl-convert-existing", function (el) {
    var lead = S.get("leads", el.dataset.id), client = S.get("clients", u.val("pl-convert-client"));
    if (!lead) return;
    if (!client) return ui.toast(t("pl_convert_need"));
    var fields = fieldsFrom(el); if (!fields) return;
    finishConversion(lead, client, fields, false);
  });
  GK.act("pl-convert-new", function (el) {
    var lead = S.get("leads", el.dataset.id); if (!lead) return;
    var fields = fieldsFrom(el); if (!fields) return;
    var related = relatedClient(lead);
    if (related) return finishConversion(lead, related, fields, false);
    if (S.all("clients").some(function (client) { return norm(client.brand) === norm(lead.brand); })) {
      return ui.confirm(t("pl_duplicate_client_q"), t("pl_duplicate_client_body"), function () { saveNewWonClient(lead, fields); }, t("pl_convert_create"));
    }
    saveNewWonClient(lead, fields);
  });
  GK.act("pl-convert-cancel", function () { ui.closeModal(true); });
  /** Move a lead to a stage. extra = other fields saved at the same time. */
  function moveTo(id, stage, extra) {
    var l = S.get("leads", id); if (!l) return;
    if (stage === "won") {
      return wonFlow(Object.assign({}, l, extra || {}), extra);
    }
    var patch = Object.assign({}, extra || {}), moved = stage !== l.stage;
    if (moved) {
      patch.stage = stage;
      patch.history = (l.history || []).concat([{ stage: stage, at: u.today() }]);
      if (stage !== "lost") patch.lostReason = "";
    }
    var saved = S.patch("leads", id, patch, { log: moved ? t("pl_log_moved", { s: t("ls_" + stage) }) : t("pl_log_edited") });
    ui.toast(moved ? t("pl_moved", { s: t("ls_" + stage) }) : t("saved"));
  }
  function lostModal(id) {
    var l = S.get("leads", id) || {};
    ui.modal({
      title: t("pl_lost_q"), accent: t("pl_lost_acc"), label: l.brand || "",
      body: '<p style="margin:0">' + esc(t("pl_lost_body")) + "</p>" +
        ui.field({ id: "pl-lr", label: t("pl_lost_reason"), type: "select", value: "", options: [["", "—"]].concat(m.LOST_REASONS.map(function (r) { return [r, t("pl_lr_" + r)]; })) }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "pl-lost-save", { cls: "primary", data: { id: id } })
    });
  }

  GK.change("pl-move", function (el) {
    var id = el.dataset.id, stage = el.value;
    if (!canEdit()) return ui.toast(t("pl_no_edit"));
    if (stage === "lost") { ui.render(true); return lostModal(id); }
    if (stage === "won") ui.render(true);
    moveTo(id, stage);
  });
  GK.act("pl-lost-save", function (el) {
    var r = u.val("pl-lr");
    if (!r) { u.focus("pl-lr"); return ui.toast(t("required")); }
    ui.closeModal(true);
    moveTo(el.dataset.id, "lost", { lostReason: r });
  });
  GK.change("pl-owner", function (el) { ui.go("pipeline", { owner: el.value }); });

  // ---------- add / edit ----------
  function leadModal(l) {
    var isNew = !l, ro = !canEdit(), dis = ro ? " disabled" : "";
    l = l || { brand: "", contact: "", handle: "", channel: "outbound_dm", stage: "prospect", q: [false, false, false, false], pack: m.packKeys()[0] || "", next: "", nextDate: u.addDays(u.today(), 2), owner: defaultOwner(), lostReason: "" };
    var owners = sellers(); if (l.owner && !owners.some(function (p) { return p.id === l.owner; })) owners.push(m.member(l.owner));
    var q = l.q || [];
    var hist = (l.history || []).slice().reverse().map(function (h) { return esc(t("ls_" + h.stage)) + " · " + esc(u.fmtDate(h.at)); }).join("<br>");
    var body = '<div class="form">' +
      ui.field({ id: "pl-brand", label: t("pl_brand"), value: l.brand, attrs: dis }) +
      ui.field({ id: "pl-contact", label: t("pl_contact"), value: l.contact, attrs: dis }) +
      ui.field({ id: "pl-handle", label: t("pl_handle"), value: l.handle, placeholder: "@brand", attrs: dis }) +
      ui.field({ id: "pl-channel", label: t("pl_channel"), type: "select", value: l.channel, options: m.CHANNELS.map(function (c) { return [c, t("pl_ch_" + c)]; }), attrs: dis }) +
      ui.field({ id: "pl-pack", label: t("pl_pack"), type: "select", value: l.pack, options: m.packKeys().map(function (k) { return [k, m.pack(k).name]; }), attrs: dis }) +
      ui.field({ id: "pl-owner-f", label: t("pl_owner"), type: "select", value: l.owner, options: owners.map(function (p) { return [p.id, p.name]; }), attrs: dis }) +
      "</div>" +
      '<div class="stack" style="gap:0"><span class="lab sm muted">' + esc(t("pl_qual")) + " · " + esc(t("pl_qual_hint")) + "</span>" +
      '<div class="form" style="gap:0 14px">' + [1, 2, 3, 4].map(function (i) { return ui.field({ id: "pl-q" + i, type: "checkbox", label: t("pl_q" + i), value: !!q[i - 1], attrs: dis }); }).join("") + "</div></div>" +
      '<div class="form">' +
      ui.field({ id: "pl-next", label: t("pl_next"), value: l.next, placeholder: t("pl_next_ph"), attrs: dis }) +
      ui.field({ id: "pl-nextdate", label: t("pl_next_date"), type: "date", value: l.nextDate, attrs: dis }) +
      ui.field({ id: "pl-stage", label: t("pl_stage"), type: "select", value: m.leadStage(l), options: m.LEAD_STAGES.map(function (s) { return [s, t("ls_" + s)]; }), attrs: dis + ' data-c="pl-mstage"' }) +
      '<div id="pl-lostwrap"' + (m.leadStage(l) === "lost" ? "" : " hidden") + ">" +
      ui.field({ id: "pl-lostr", label: t("pl_lost_reason"), type: "select", value: l.lostReason || "", options: [["", "—"]].concat(m.LOST_REASONS.map(function (r) { return [r, t("pl_lr_" + r)]; })), attrs: dis }) + "</div>" +
      "</div>" +
      (hist ? '<div class="stack" style="gap:4px"><span class="lab sm muted">' + esc(t("pl_history")) + '</span><p class="small muted" style="margin:0">' + hist + "</p></div>" : "");
    var foot = ro ? ui.pill(t("pl_read")) + ui.btn(t("close"), "close", { cls: "ghost" }) :
      (!isNew ? ui.btn(t("del"), "pl-del", { cls: "ghost", data: { id: l.id } }) : "") + ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "pl-save", { cls: "primary", data: { id: isNew ? "" : l.id } });
    ui.modal({ title: isNew ? t("pl_new") : l.brand, accent: t("pl_lead"), label: isNew ? "" : t("ls_" + l.stage), body: body, foot: foot, wide: true });
  }

  GK.act("pl-new", function () { leadModal(null); });
  GK.act("pl-open", function (el, ev) {
    if (ev && ev.target && ev.target.closest && ev.target.closest("select,input,button")) return;
    var l = S.get("leads", el.dataset.id); if (l) leadModal(l);
  });
  GK.change("pl-mstage", function (el) { var w = document.getElementById("pl-lostwrap"); if (w) w.hidden = el.value !== "lost"; });
  GK.act("pl-save", function (el) {
    if (!canEdit()) return ui.toast(t("pl_no_edit"));
    var brand = u.val("pl-brand").trim();
    if (!brand) { u.focus("pl-brand"); return ui.toast(t("required")); }
    var stage = u.val("pl-stage"), lr = u.val("pl-lostr");
    if (stage === "lost" && !lr) { u.focus("pl-lostr"); return ui.toast(t("required")); }
    if (!id && stage === "won") return ui.toast(t("pl_signed_unpaid"));
    var data = { brand: brand, contact: u.val("pl-contact").trim(), handle: u.val("pl-handle").trim(), channel: u.val("pl-channel"), pack: u.val("pl-pack"),
      owner: u.val("pl-owner-f"), q: [1, 2, 3, 4].map(function (i) { return u.checked("pl-q" + i); }), next: u.val("pl-next").trim(), nextDate: u.val("pl-nextdate"),
      lostReason: stage === "lost" ? lr : "" };
    var id = el.dataset.id;
    ui.closeModal(true);
    if (!id) {
      var saved = S.put("leads", Object.assign(data, { stage: stage, history: [{ stage: stage, at: u.today() }] }), { log: t("pl_log_added") });
      ui.toast(t("saved"));
    } else moveTo(id, stage, data);
  });
  GK.act("pl-del", function (el) {
    var id = el.dataset.id;
    ui.confirm(t("pl_del_q"), t("pl_del_body"), function () { S.remove("leads", id); ui.toast(t("pl_deleted")); }, t("del"));
  });
})(window.GK);
