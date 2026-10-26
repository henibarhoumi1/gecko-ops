/* GECKO Ops · module: clients_tabs. The workspace tabs of one client: assets, approvals, performance, notes and extras.
   Stored on the client record: assets [{id, name, url, kind}], notes [{id, at, by, text, shared}],
   extras [{id, projectId, kind: "talent" | "prop" | "cost", name, detail, amount (price to the client), status: "proposed" | "approved" | "declined"}].
   Shared notes and extras reach the client page through portal_snapshot.js. Nothing here ever shows costs, profit, pay or commission. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, HUB = GK.clientHub;
  if (!HUB) return;

  GK.i18n.add({
    // assets
    ca_made: ["Made for this client", "Fait pour ce client"], ca_made_none: ["No finished file yet. Files show here as soon as they are made.", "Pas encore de fichier terminé. Ils apparaissent ici dès qu'ils sont faits."],
    ca_no_link: ["No link yet", "Pas encore de lien"], ca_open: ["Open", "Ouvrir"],
    ca_brand: ["Brand assets", "Éléments de marque"], ca_brand_sub: ["What the client gave us: logo, fonts, product photos. Links only.", "Ce que le client nous a donné : logo, polices, photos produit. Des liens seulement."],
    ca_add: ["Add a link", "Ajouter un lien"], ca_none: ["No brand file yet. Add the logo link first.", "Pas encore de fichier de marque. Ajoutez d'abord le lien du logo."],
    ca_kind: ["Type", "Type"], ca_name: ["Name", "Nom"], ca_url: ["Link", "Lien"], ca_url_bad: ["Paste a link that starts with https://", "Collez un lien qui commence par https://"],
    ca_k_logo: ["Logo", "Logo"], ca_k_font: ["Font", "Police"], ca_k_photo: ["Product photo", "Photo produit"], ca_k_doc: ["Document", "Document"], ca_k_other: ["Other", "Autre"],
    ca_edit_t: ["Brand asset", "Élément de marque"], ca_edit_a: ["link", "lien"], ca_shown: ["The client sees these on the portal.", "Le client les voit sur le portail."],
    ca_log_add: ["Brand asset added: {n}", "Élément de marque ajouté : {n}"], ca_log_del: ["Brand asset removed: {n}", "Élément de marque retiré : {n}"],
    // approvals
    cp_wait_h: ["Waiting on the client", "En attente du client"], cp_wait_sub: ["Things the client has to say yes to.", "Ce à quoi le client doit répondre."],
    cp_wait_none: ["Nothing is waiting on the client.", "Rien n'attend le client."],
    cp_k_plan: ["Plan", "Plan"], cp_k_scripts: ["Scripts", "Scripts"], cp_k_files: ["Files", "Fichiers"], cp_k_quote: ["Quote", "Devis"], cp_k_extra: ["Extra", "Extra"],
    cp_plan: ["Plan to approve", "Plan à valider"], cp_scripts: ["{n} scripts shared, no answer yet", "{n} scripts partagés, pas de réponse"],
    cp_files: ["{n} files to check", "{n} fichiers à vérifier"], cp_quote: ["Quote {no} sent", "Devis {no} envoyé"], cp_quote_valid: ["Valid until {d}", "Valable jusqu'au {d}"],
    cp_extra: ["Extra proposed: {n}", "Extra proposé : {n}"], cp_open: ["Open", "Ouvrir"],
    cp_hist_h: ["History", "Historique"], cp_plan_ok: ["Plan approved: {p}", "Plan validé : {p}"],
    // performance
    cf_best: ["Best cost per purchase", "Meilleur coût par achat"], cf_hook: ["Best hook rate", "Meilleur taux d'accroche"], cf_ctr: ["Average CTR", "CTR moyen"], cf_tested: ["Hooks with numbers", "Accroches chiffrées"],
    cf_chart: ["Cost per purchase by hook (TND)", "Coût par achat par accroche (TND)"], cf_none: ["No ad numbers yet. Enter them in Ad results once the ads have run.", "Pas encore de chiffres. Saisissez-les dans Résultats pubs une fois les pubs diffusées."],
    cf_open: ["Open ad results", "Ouvrir les résultats pubs"], cf_by_project: ["By project", "Par projet"], cf_hooks: ["Hooks", "Accroches"], cf_rate: ["Hook rate", "Taux d'accroche"], cf_cpp: ["Cost / purchase", "Coût / achat"],
    cf_orders: ["Orders per week now", "Commandes par semaine maintenant"], cf_base: ["Before us", "Avant nous"],
    // notes
    cn_h: ["Notes", "Notes"], cn_sub: ["A running list. Shared notes appear on the client portal, the others stay with us.", "Une liste qui avance. Les notes partagées apparaissent sur le portail client, les autres restent chez nous."],
    cn_ph: ["Write a note…", "Écrire une note…"], cn_shared: ["Show on the client portal", "Afficher sur le portail client"], cn_add: ["Add note", "Ajouter la note"],
    cn_none: ["No notes yet.", "Pas encore de note."], cn_internal: ["Internal", "Interne"], cn_pub: ["On the portal", "Sur le portail"],
    cn_share: ["Show on portal", "Afficher sur le portail"], cn_unshare: ["Keep internal", "Garder en interne"], cn_del: ["Delete", "Supprimer"],
    cn_log_add: ["Note added", "Note ajoutée"], cn_log_del: ["Note deleted", "Note supprimée"], cn_log_share: ["Note visibility changed", "Visibilité d'une note modifiée"],
    // extras
    cx_h: ["Talents, props and extras", "Talents, accessoires et extras"], cx_sub: ["What we suggest adding to a shoot, at the price the client pays. They answer on their page.", "Ce qu'on propose d'ajouter à un tournage, au prix payé par le client. Il répond sur sa page."],
    cx_add: ["Add extra", "Ajouter un extra"], cx_none: ["No extras yet. Suggest a talent, a prop or an extra cost for a shoot.", "Pas encore d'extra. Proposez un talent, un accessoire ou un coût en plus pour un tournage."],
    cx_k_talent: ["Talent", "Talent"], cx_k_prop: ["Prop", "Accessoire"], cx_k_cost: ["Extra cost", "Coût en plus"],
    cx_s_proposed: ["Proposed", "Proposé"], cx_s_approved: ["Approved", "Validé"], cx_s_declined: ["Declined", "Refusé"],
    cx_kind: ["Kind", "Type"], cx_project: ["Project", "Projet"], cx_no_project: ["Not tied to a project", "Pas lié à un projet"], cx_name: ["Name", "Nom"], cx_detail: ["Detail", "Détail"],
    cx_amount: ["Price to the client (TND)", "Prix pour le client (TND)"], cx_edit_t: ["Extra", "Extra"], cx_edit_a: ["", ""],
    cx_approve: ["Mark approved", "Marquer validé"], cx_decline: ["Mark declined", "Marquer refusé"], cx_reopen: ["Reopen", "Rouvrir"], cx_edit: ["Edit", "Modifier"], cx_del: ["Delete", "Supprimer"],
    cx_said_ok: ["The client approved on the portal.", "Le client a validé sur le portail."], cx_said_no: ["The client declined on the portal.", "Le client a refusé sur le portail."], cx_apply: ["Apply", "Appliquer"],
    cx_total: ["Approved total", "Total validé"], cx_open_total: ["Still proposed", "Encore proposé"],
    cx_log_add: ["Extra proposed: {n}", "Extra proposé : {n}"], cx_log_status: ["Extra {s}: {n}", "Extra {s} : {n}"], cx_log_del: ["Extra deleted: {n}", "Extra supprimé : {n}"], cx_log_edit: ["Extra edited: {n}", "Extra modifié : {n}"],
    cx_pending_publish: ["Publish an update on the Portal tab so the client sees the change.", "Publiez une mise à jour dans l'onglet Portail pour que le client voie le changement."]
  });

  function canEdit() { return m.can("clients"); }
  function guard() { if (!canEdit()) { ui.toast(t("cl_no_edit")); return false; } return true; }
  function client(id) { return S.get("clients", id); }
  function fbOf(c) {
    var ids = HUB.sharesOf(c).map(function (s) { return s.id; });
    return S.all("feedback").filter(function (f) { return f.clientId === c.id || ids.indexOf(f.shareId) > -1; }).sort(u.by("at", "desc"));
  }
  function save(c, key, list, log) {
    var o = {}; o[key] = list;
    S.patch("clients", c.id, o, { log: log });
    if (GK.portal && GK.portal.markDirty) GK.portal.markDirty(c);
  }
  function dirtyHint(c) {
    var live = HUB.sharesOf(c).some(function (s) { return s.publishedAt && s.editedAt && s.editedAt > s.publishedAt; });
    return live ? '<p class="note" style="margin:0">' + esc(t("cx_pending_publish")) + "</p>" : "";
  }
  function dateOf(s) { return s ? u.fmtDate(String(s).slice(0, 10), { day: "numeric", month: "short" }) : ""; }
  function numOrNull(v) { return v === "" || v == null || isNaN(+v) ? null : +v; }
  function safeUrl(l) { return /^https?:\/\//i.test(l || "") ? l : ""; }
  function extrasOf(c) { return Array.isArray(c.extras) ? c.extras : []; }
  function assetsOf(c) { return Array.isArray(c.assets) ? c.assets : []; }
  function openLink(url, label) { return '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label || t("ca_open")) + "</a>"; }

  // ---------- who answered an extra on the portal, and not applied yet ----------
  function answerFor(c, x) {
    var f = fbOf(c).filter(function (r) { return r.target === "extra:" + x.id && (r.kind === "approve" || r.kind === "changes"); })[0];
    return f && x.status === "proposed" ? f : null;
  }

  // ---------- what is waiting on the client ----------
  HUB.waiting = function (c) {
    var out = [], fb = fbOf(c);
    HUB.activeProjects(c).forEach(function (p) {
      if (p.stage === "scripting" && !p.planApproved) out.push({ kindLabel: t("cp_k_plan"), title: t("cp_plan"), sub: p.name, go: ["projects", { id: p.id, tab: "brief" }] });
      var shared = S.all("ideas").filter(function (i) {
        if (!i.shareOk || i.projectId !== p.id || i.stage === "parked") return false;
        return !fb.some(function (f) { return f.kind === "approve" && (f.target === "idea:" + i.id || (i.reelId && f.target === "reel:" + i.reelId)); });
      });
      if (shared.length) out.push({ kindLabel: t("cp_k_scripts"), title: t("cp_scripts", { n: shared.length }), sub: p.name, go: ["projects", { id: p.id, tab: "scripts" }] });
      var files = m.files(p).filter(function (f) { return f.item.status === "approved" && !f.item.clientOk && m.STAGES.indexOf(p.stage) >= m.STAGES.indexOf("client_review"); });
      if (files.length) out.push({ kindLabel: t("cp_k_files"), title: t("cp_files", { n: files.length }), sub: p.name, go: ["projects", { id: p.id, tab: "edits" }] });
    });
    var st = GK.fin && GK.fin.quotes && GK.fin.quotes.status ? GK.fin.quotes.status : function (q) { return q.status; };
    S.all("quotes").filter(function (q) { return q.clientId === c.id && st(q) === "sent"; }).forEach(function (q) {
      out.push({ kindLabel: t("cp_k_quote"), title: t("cp_quote", { no: q.no || "" }), sub: (q.title || "") + (q.validUntil ? " · " + t("cp_quote_valid", { d: u.fmtDate(q.validUntil) }) : ""), go: ["clients", { tab: "invoices" }] });
    });
    extrasOf(c).filter(function (x) { return x.status === "proposed" && !answerFor(c, x); }).forEach(function (x) {
      var pr = x.projectId && m.project(x.projectId);
      out.push({ kindLabel: t("cp_k_extra"), title: t("cp_extra", { n: x.name }), sub: pr ? pr.name : "", go: ["clients", { tab: "extras" }] });
    });
    return out;
  };
  function waitRow(w) {
    return '<div class="clh-row"><div class="st"><strong>' + esc(w.title) + '</strong><span class="small muted">' + esc(w.sub || "") + '</span></div><div class="row" style="gap:6px">' + ui.pill(w.kindLabel, "chroma") +
      ui.btn(t("cp_open"), "cl-go", { cls: "sm ghost", data: { view: w.go[0], id: w.go[1].id || "", tab: w.go[1].tab || "" } }) + "</div></div>";
  }
  function approvalsTab(c) {
    var wait = HUB.waiting(c);
    var h = '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("cp_wait_h")) + '</h2><span class="small muted">' + esc(t("cp_wait_sub")) + "</span></div><span class=\"small muted num\">" + wait.length + "</span></div>" +
      (wait.length ? wait.map(waitRow).join("") : '<p class="small muted" style="margin:0">' + esc(t("cp_wait_none")) + "</p>") + "</section>";
    var plans = HUB.projsOf(c).filter(function (p) { return p.planApproved; }).sort(u.by(function (p) { return p.planApprovedOn || ""; }, "desc"));
    if (plans.length) h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cp_hist_h")) + "</h2></div>" + plans.map(function (p) {
      return '<div class="clh-row"><div class="st"><strong>' + esc(t("cp_plan_ok", { p: p.name })) + "</strong>" + (p.planApprovedOn ? '<span class="small muted">' + esc(u.fmtDate(p.planApprovedOn)) + "</span>" : "") + "</div>" + ui.pill(t("po_k_approve"), "done") + "</div>";
    }).join("") + "</section>";
    if (GK.portal && GK.portal.inboxHTML) h += GK.portal.inboxHTML(c);
    return h;
  }

  // ---------- assets ----------
  function fileDrive(f) { var l = f.item.drive || (f.reel && f.reel.drive) || ""; return safeUrl(l); }
  function assetsTab(c) {
    var ed = canEdit(), h = "";
    var made = "";
    HUB.projsOf(c).sort(u.by(function (p) { return p.shootDate || ""; }, "desc")).forEach(function (p) {
      var files = m.files(p).filter(function (f) { return f.item.status === "approved"; });
      if (!files.length) return;
      made += '<div class="stack" style="gap:0"><div class="row between" style="padding:10px 0 4px"><strong>' + esc(p.name) + "</strong>" + ui.btn(t("cl_projects"), "cl-proj", { cls: "sm ghost", data: { id: p.id } }) + "</div>" +
        files.map(function (f) {
          var l = fileDrive(f);
          return '<div class="clh-row"><div class="st"><span>' + esc((f.angle && f.angle.name !== "—" ? f.angle.name + " · " : "") + (f.item.text || f.item.title || "")) + '</span><span class="code small muted">' + esc(f.code) + "</span></div>" +
            '<div class="row" style="gap:6px">' + (f.item.clientOk ? ui.pill(t("cm_client_approved"), "done") : "") + (l ? openLink(l) : '<span class="small muted">' + esc(t("ca_no_link")) + "</span>") + "</div></div>";
        }).join("") + "</div>";
    });
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("ca_made")) + "</h2></div>" + (made || ui.empty(t("ca_made_none"))) + "</section>";
    var as = assetsOf(c);
    h += '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("ca_brand")) + '</h2><span class="small muted">' + esc(t("ca_brand_sub")) + " " + esc(t("ca_shown")) + "</span></div>" +
      ui.btn(t("ca_add"), "cl-as-edit", { cls: "primary sm", icon: "plus", data: { id: c.id }, disabled: !ed, title: ed ? "" : t("cl_no_edit") }) + "</div>" +
      (as.length ? as.map(function (a) {
        var l = safeUrl(a.url);
        return '<div class="clh-row"><div class="st"><strong>' + esc(a.name) + '</strong><span class="small muted">' + esc(t(GK.i18n.has("ca_k_" + a.kind) ? "ca_k_" + a.kind : "ca_k_other")) + '</span></div><div class="row" style="gap:6px">' +
          (l ? openLink(l) : "") + ui.btn(t("cx_edit"), "cl-as-edit", { cls: "sm ghost", data: { id: c.id, aid: a.id }, disabled: !ed }) + ui.btn(t("cx_del"), "cl-as-del", { cls: "sm ghost", data: { id: c.id, aid: a.id }, disabled: !ed }) + "</div></div>";
      }).join("") : ui.empty(t("ca_none"))) + "</section>";
    return h + dirtyHint(c);
  }
  GK.act("cl-as-edit", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var a = assetsOf(c).filter(function (x) { return x.id === el.dataset.aid; })[0] || { kind: "logo" };
    ui.modal({
      title: t("ca_edit_t"), accent: t("ca_edit_a"), label: c.brand,
      body: '<div class="form">' + ui.field({ id: "ca-name", label: t("ca_name"), value: a.name || "", span: true }) +
        ui.field({ id: "ca-kind", label: t("ca_kind"), type: "select", value: a.kind || "logo", options: ["logo", "font", "photo", "doc", "other"].map(function (k) { return [k, t("ca_k_" + k)]; }) }) +
        ui.field({ id: "ca-url", label: t("ca_url"), value: a.url || "", placeholder: "https://", span: true, attrs: ' inputmode="url"' }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "cl-as-save", { cls: "primary", data: { id: c.id, aid: a.id || "" } })
    });
  });
  GK.act("cl-as-save", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var name = u.val("ca-name").trim(), url = u.val("ca-url").trim();
    if (!name) { u.focus("ca-name"); return ui.toast(t("required")); }
    if (!safeUrl(url)) { u.focus("ca-url"); return ui.toast(t("ca_url_bad")); }
    var list = assetsOf(c).slice(), id = el.dataset.aid, rec = { id: id || u.uid("as"), name: name, url: url, kind: u.val("ca-kind") };
    var i = list.map(function (x) { return x.id; }).indexOf(id);
    if (i > -1) list[i] = rec; else list.push(rec);
    ui.closeModal(true);
    save(c, "assets", list, t("ca_log_add", { n: name }));
    ui.toast(t("saved"));
  });
  GK.act("cl-as-del", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var a = assetsOf(c).filter(function (x) { return x.id === el.dataset.aid; })[0]; if (!a) return;
    save(c, "assets", assetsOf(c).filter(function (x) { return x.id !== a.id; }), t("ca_log_del", { n: a.name }));
  });

  // ---------- performance ----------
  function perfRows(c) {
    var out = [];
    HUB.projsOf(c).forEach(function (p) {
      m.files(p).forEach(function (f) {
        if (f.kind !== "hook") return;
        var r = f.item.results || {}, cpp = numOrNull(r.cpp), hook = numOrNull(r.hook), ctr = numOrNull(r.ctr);
        if (cpp == null && hook == null && ctr == null) return;
        out.push({ p: p, f: f, cpp: cpp != null && cpp > 0 ? cpp : null, hook: hook, ctr: ctr });
      });
    });
    return out;
  }
  function pct(v) { return v == null ? "—" : (Math.round(v * 10) / 10) + "%"; }
  function performanceTab(c) {
    var rows = perfRows(c), h = "";
    var go = GK.ui.nav().indexOf("reports") > -1 ? '<div class="row">' + ui.btn(t("cf_open"), "cl-go", { cls: "ghost sm", data: { view: "reports", id: "", tab: "" } }) + "</div>" : "";
    if (!rows.length) return go + '<section class="panel">' + ui.empty(t("cf_none")) + "</section>";
    var cpps = rows.filter(function (r) { return r.cpp != null; }).sort(u.by("cpp")), hooks = rows.filter(function (r) { return r.hook != null; }), ctrs = rows.filter(function (r) { return r.ctr != null; });
    var bestHook = hooks.slice().sort(function (a, b) { return b.hook - a.hook; })[0];
    var avgCtr = ctrs.length ? u.sum(ctrs, function (r) { return r.ctr; }) / ctrs.length : null;
    h += ui.kpis([
      { lab: t("cf_best"), v: cpps[0] ? u.money(cpps[0].cpp, 1) : "—" },
      { lab: t("cf_hook"), v: bestHook ? pct(bestHook.hook) : "—" },
      { lab: t("cf_ctr"), v: pct(avgCtr) },
      { lab: t("cf_tested"), v: String(rows.length) }
    ]);
    if (cpps.length && GK.charts && GK.charts.hbars) h += '<section class="panel">' + GK.charts.hbars({ title: t("cf_chart"), items: cpps.slice(0, 8).map(function (r) { return { label: r.f.code, note: r.f.item.text || "", value: r.cpp }; }), fmt: function (v) { return u.money(v, 1); } }) + "</section>";
    var byProj = {};
    rows.forEach(function (r) { (byProj[r.p.id] = byProj[r.p.id] || { p: r.p, rows: [] }).rows.push(r); });
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("cf_by_project")) + "</h2></div>" + Object.keys(byProj).map(function (k) {
      var g = byProj[k], cp = g.rows.filter(function (r) { return r.cpp != null; });
      var rep = g.p.report || {};
      return '<div class="clh-row click" tabindex="0" role="button" data-a="cl-proj" data-id="' + esc(g.p.id) + '"><div class="st"><strong>' + esc(g.p.name) + '</strong><span class="small muted">' + esc(t("cf_hooks")) + " · " + g.rows.length +
        (rep.now != null && rep.now !== "" ? " · " + esc(t("cf_orders")) + " " + esc(String(rep.now)) : "") + '</span></div><strong class="num">' + (cp.length ? esc(u.money(u.sum(cp, function (r) { return r.cpp; }) / cp.length, 1)) : "—") + "</strong></div>";
    }).join("") + "</section>";
    h += '<section class="panel"><div class="tbl"><table><thead><tr><th>' + esc(t("cf_hooks")) + '</th><th class="r">' + esc(t("cf_rate")) + '</th><th class="r">CTR</th><th class="r">' + esc(t("cf_cpp")) + "</th></tr></thead><tbody>" +
      rows.slice().sort(function (a, b) { return (a.cpp == null) - (b.cpp == null) || (a.cpp || 0) - (b.cpp || 0); }).map(function (r) {
        return "<tr><td>" + esc(r.f.item.text || r.f.code) + '<br><span class="code small faint">' + esc(r.f.code) + '</span></td><td class="r num">' + esc(pct(r.hook)) + '</td><td class="r num">' + esc(pct(r.ctr)) + '</td><td class="r num">' + esc(r.cpp != null ? u.money(r.cpp, 1) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
    return go + h;
  }

  // ---------- notes ----------
  function notesTab(c) {
    var ed = canEdit(), list = HUB.notesOf(c).slice().sort(u.by(function (n) { return n.at || ""; }, "desc"));
    var h = '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("cn_h")) + '</h2><span class="small muted">' + esc(t("cn_sub")) + "</span></div></div>" +
      '<div class="form">' + ui.field({ id: "cn-text", label: t("cn_h"), type: "textarea", span: true, placeholder: t("cn_ph"), attrs: ed ? ' rows="3"' : " disabled" }) + "</div>" +
      '<div class="row between">' + ui.field({ id: "cn-shared", type: "checkbox", label: t("cn_shared"), value: false }) + ui.btn(t("cn_add"), "cl-note-add", { cls: "primary", data: { id: c.id }, disabled: !ed, title: ed ? "" : t("cl_no_edit") }) + "</div></section>";
    h += '<section class="panel">' + (list.length ? list.map(function (n) {
      var who = n.by ? (m.member(n.by) || {}).name : "";
      return '<div class="clh-row"><div class="st"><span class="clh-note">' + esc(n.text) + '</span><span class="small muted">' + esc([dateOf(n.at), who].filter(Boolean).join(" · ")) + "</span></div>" +
        '<div class="stack" style="gap:6px;align-items:flex-end">' + ui.pill(n.shared ? t("cn_pub") : t("cn_internal"), n.shared ? "done" : "") +
        '<div class="row" style="gap:6px">' + ui.btn(n.shared ? t("cn_unshare") : t("cn_share"), "cl-note-share", { cls: "sm ghost", data: { id: c.id, nid: n.id }, disabled: !ed }) + ui.btn(t("cn_del"), "cl-note-del", { cls: "sm ghost", data: { id: c.id, nid: n.id }, disabled: !ed }) + "</div></div></div>";
    }).join("") : ui.empty(t("cn_none"))) + "</section>";
    return h + dirtyHint(c);
  }
  GK.act("cl-note-add", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var text = u.val("cn-text").trim(); if (!text) { u.focus("cn-text"); return ui.toast(t("required")); }
    var me = GK.me();
    var list = HUB.notesOf(c).concat([{ id: u.uid("n"), at: u.nowStamp(), by: me ? me.id : "", text: text, shared: u.checked("cn-shared") }]);
    save(c, "notes", list, t("cn_log_add"));
  });
  GK.act("cl-note-share", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    save(c, "notes", HUB.notesOf(c).map(function (n) { return n.id === el.dataset.nid ? Object.assign({}, n, { shared: !n.shared }) : n; }), t("cn_log_share"));
  });
  GK.act("cl-note-del", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    save(c, "notes", HUB.notesOf(c).filter(function (n) { return n.id !== el.dataset.nid; }), t("cn_log_del"));
  });

  // ---------- extras ----------
  function extrasTab(c) {
    var ed = canEdit(), list = extrasOf(c);
    var sum = function (st) { return u.sum(list.filter(function (x) { return x.status === st; }), function (x) { return x.amount; }); };
    var h = '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("cx_h")) + '</h2><span class="small muted">' + esc(t("cx_sub")) + "</span></div>" +
      ui.btn(t("cx_add"), "cl-x-edit", { cls: "primary sm", icon: "plus", data: { id: c.id }, disabled: !ed, title: ed ? "" : t("cl_no_edit") }) + "</div>";
    if (!list.length) return h + ui.empty(t("cx_none")) + "</section>";
    h += '<div class="row" style="gap:18px"><span class="small muted">' + esc(t("cx_total")) + ' <strong class="num">' + esc(u.money(sum("approved"))) + '</strong></span><span class="small muted">' + esc(t("cx_open_total")) + ' <strong class="num">' + esc(u.money(sum("proposed"))) + "</strong></span></div>";
    h += list.map(function (x) {
      var pr = x.projectId && m.project(x.projectId), ans = answerFor(c, x);
      var tone = x.status === "approved" ? "done" : x.status === "declined" ? "" : "chroma";
      var acts = "";
      if (ans) acts += ui.btn(t("cx_apply"), "cl-x-apply", { cls: "sm primary", data: { id: c.id, xid: x.id, to: ans.kind === "approve" ? "approved" : "declined" }, disabled: !ed });
      if (x.status !== "approved") acts += ui.btn(t("cx_approve"), "cl-x-set", { cls: "sm ghost", data: { id: c.id, xid: x.id, to: "approved" }, disabled: !ed });
      if (x.status !== "declined") acts += ui.btn(t("cx_decline"), "cl-x-set", { cls: "sm ghost", data: { id: c.id, xid: x.id, to: "declined" }, disabled: !ed });
      if (x.status !== "proposed") acts += ui.btn(t("cx_reopen"), "cl-x-set", { cls: "sm ghost", data: { id: c.id, xid: x.id, to: "proposed" }, disabled: !ed });
      acts += ui.btn(t("cx_edit"), "cl-x-edit", { cls: "sm ghost", data: { id: c.id, xid: x.id }, disabled: !ed }) + ui.btn(t("cx_del"), "cl-x-del", { cls: "sm ghost", data: { id: c.id, xid: x.id }, disabled: !ed });
      return '<div class="clh-row"><div class="st"><span class="row" style="gap:8px">' + ui.chip(t("cx_k_" + x.kind), x.kind) + "<strong>" + esc(x.name) + "</strong></span>" +
        (x.detail ? '<span class="clh-note small">' + esc(x.detail) + "</span>" : "") + '<span class="small muted">' + esc(pr ? pr.name : t("cx_no_project")) + "</span>" +
        (ans ? '<span class="small"><strong>' + esc(t(ans.kind === "approve" ? "cx_said_ok" : "cx_said_no")) + "</strong></span>" : "") +
        '<div class="row" style="gap:6px;margin-top:6px">' + acts + '</div></div><div class="stack" style="gap:6px;align-items:flex-end"><strong class="num">' + esc(u.money(+x.amount || 0)) + "</strong>" + ui.pill(t("cx_s_" + x.status), tone) + "</div></div>";
    }).join("") + "</section>";
    return h + dirtyHint(c);
  }
  function setExtras(c, list, log) { save(c, "extras", list, log); }
  GK.act("cl-x-edit", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var x = extrasOf(c).filter(function (r) { return r.id === el.dataset.xid; })[0] || { kind: "talent", status: "proposed", amount: "", projectId: "" };
    var ps = HUB.projsOf(c).sort(u.by(function (p) { return p.stage === "retention" ? 1 : 0; }));
    ui.modal({
      title: t("cx_edit_t"), accent: t("cx_edit_a"), label: c.brand,
      body: '<div class="form">' +
        ui.field({ id: "cx-kind", label: t("cx_kind"), type: "select", value: x.kind, options: ["talent", "prop", "cost"].map(function (k) { return [k, t("cx_k_" + k)]; }) }) +
        ui.field({ id: "cx-proj", label: t("cx_project"), type: "select", value: x.projectId || "", options: [["", t("cx_no_project")]].concat(ps.map(function (p) { return [p.id, p.name]; })) }) +
        ui.field({ id: "cx-name", label: t("cx_name"), value: x.name || "", span: true }) +
        ui.field({ id: "cx-detail", label: t("cx_detail"), type: "textarea", value: x.detail || "", span: true }) +
        ui.field({ id: "cx-amount", label: t("cx_amount"), type: "number", value: x.amount === "" || x.amount == null ? "" : x.amount, attrs: ' min="0" step="1" inputmode="decimal"' }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "cl-x-save", { cls: "primary", data: { id: c.id, xid: x.id || "" } })
    });
  });
  GK.act("cl-x-save", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var name = u.val("cx-name").trim(); if (!name) { u.focus("cx-name"); return ui.toast(t("required")); }
    var list = extrasOf(c).slice(), id = el.dataset.xid, i = list.map(function (r) { return r.id; }).indexOf(id);
    var rec = Object.assign({ status: "proposed" }, i > -1 ? list[i] : {}, { id: id || u.uid("x"), projectId: u.val("cx-proj"), kind: u.val("cx-kind"), name: name, detail: u.val("cx-detail").trim(), amount: Math.max(0, u.numVal("cx-amount")) });
    if (i > -1) list[i] = rec; else list.push(rec);
    ui.closeModal(true);
    setExtras(c, list, t(i > -1 ? "cx_log_edit" : "cx_log_add", { n: name }));
    ui.toast(t("saved"));
  });
  function setStatus(el, to) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var name = "";
    setExtras(c, extrasOf(c).map(function (x) { if (x.id !== el.dataset.xid) return x; name = x.name; return Object.assign({}, x, { status: to }); }), t("cx_log_status", { s: t("cx_s_" + to).toLowerCase(), n: name }));
  }
  GK.act("cl-x-set", function (el) { setStatus(el, el.dataset.to); });
  GK.act("cl-x-apply", function (el) { setStatus(el, el.dataset.to); });
  GK.act("cl-x-del", function (el) {
    if (!guard()) return;
    var c = client(el.dataset.id); if (!c) return;
    var x = extrasOf(c).filter(function (r) { return r.id === el.dataset.xid; })[0]; if (!x) return;
    ui.confirm(t("cx_del") + " ?", x.name, function () { setExtras(c, extrasOf(c).filter(function (r) { return r.id !== x.id; }), t("cx_log_del", { n: x.name })); }, t("cx_del"));
  });

  GK.act("cl-go", function (el) {
    var v = el.dataset.view, id = el.dataset.id, tab = el.dataset.tab;
    if (v === "clients") return ui.go("clients", { tab: tab });
    var p = {}; if (id) p.id = id; if (tab) p.tab = tab;
    ui.go(v, p);
  });

  // ---------- register ----------
  HUB.tab({ key: "assets", order: 30, label: function () { return t("cl_t_assets"); }, render: assetsTab });
  HUB.tab({ key: "approvals", order: 40, label: function () { return t("cl_t_approvals"); }, render: approvalsTab, count: function (c) { return HUB.waiting(c).length; } });
  HUB.tab({ key: "performance", order: 50, label: function () { return t("cl_t_performance"); }, render: performanceTab });
  HUB.tab({ key: "notes", order: 70, label: function () { return t("cl_t_notes"); }, render: notesTab });
  HUB.tab({ key: "extras", order: 80, label: function () { return t("cl_t_extras"); }, render: extrasTab, count: function (c) { return extrasOf(c).filter(function (x) { return x.status === "proposed"; }).length; } });
})(window.GK);
