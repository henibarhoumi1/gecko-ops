/* GECKO Ops · module: deliveries (what goes to the client, and when) */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    dv_title: ["Delivery", "Livraison"], dv_accent: ["", ""],
    dv_sub: ["What is ready to send. Files leave once the money is in.", "Ce qui est prêt à envoyer. Les fichiers partent une fois l'argent reçu."],
    dv_empty: ["Nothing to deliver right now. Projects show up here once editing starts.", "Rien à livrer pour l'instant. Les projets apparaissent ici dès le montage."],
    dv_k_ready: ["Ready to send", "Prêts à envoyer"], dv_k_ready_n: ["projects with every file approved", "projets avec tous les fichiers validés"],
    dv_k_locked: ["Waiting on payment", "En attente de paiement"], dv_k_locked_n: ["files held until paid", "fichiers bloqués jusqu'au paiement"],
    dv_k_client: ["Client approved", "Validés par le client"], dv_k_client_n: ["of {n} approved files", "sur {n} fichiers validés"],
    dv_approved: ["Approved", "Validés"], dv_client: ["Client OK", "OK client"], dv_client_lc: ["client OK", "OK client"],
    dv_overdue: ["overdue since {d}", "en retard depuis le {d}"],
    dv_log_ok: ["{code} · client OK", "{code} · OK client"], dv_log_ok_off: ["{code} · client OK removed", "{code} · OK client retiré"],
    dv_log_changes: ["{code} → {s}", "{code} → {s}"], dv_files: ["files", "fichiers"],
    dv_locked: ["Files locked", "Fichiers bloqués"], dv_open: ["Files can go", "Fichiers libres"],
    dv_balance: ["Balance due", "Solde dû"],
    dv_copy_delivery: ["Copy delivery message", "Copier le message de livraison"],
    dv_copy_update: ["Copy WhatsApp update", "Copier le point WhatsApp"],
    dv_preview: ["Message preview", "Aperçu du message"],
    dv_open_project: ["Open project", "Ouvrir le projet"], dv_open_prod: ["Open in production", "Ouvrir en production"],
    dv_deliver_hint: ["Mark it delivered from the project page once the files are sent.", "Passez-le en livré depuis la page projet une fois les fichiers envoyés."],
    dv_client_ok: ["Client approved", "Validé client"], dv_client_ok_q: ["Mark client approved", "Marquer validé client"],
    dv_changes: ["Client asked for changes", "Le client demande des retouches"], dv_changes_btn: ["Client wants changes", "Demander des retouches"],
    dv_changes_title: ["Client", "Retouches"], dv_changes_accent: ["changes", "client"],
    dv_changes_lab: ["What the client wants changed", "Ce que le client veut changer"],
    dv_changes_ph: ["Their words, short. The editor reads this.", "Leurs mots, en bref. Le monteur lit ceci."],
    dv_changes_saved: ["Sent back to editing as changes asked", "Renvoyé au montage en retouches"],
    dv_no_rights: ["Only the owner or the Client Lead record client feedback.", "Seuls le fondateur ou le responsable clients notent les retours client."],
    dv_only_approved: ["Only approved files go to the client.", "Seuls les fichiers validés partent chez le client."],
    dv_not_ready: ["in progress", "en cours"], dv_no_files: ["No files planned yet.", "Aucun fichier prévu."],
    dv_msg_copied: ["Message copied. Paste it in WhatsApp.", "Message copié. Collez-le dans WhatsApp."],
    dv_copy_fail: ["Couldn't copy. Select the preview and copy it by hand.", "Copie impossible. Sélectionnez l'aperçu et copiez-le à la main."],
    // message lines
    dv_m_hi: ["Hi {name},", "Bonjour {name},"],
    dv_m_ready_one: ["1 file for {proj} is approved and ready:", "1 fichier pour {proj} est validé et prêt :"],
    dv_m_ready: ["{n} files for {proj} are approved and ready:", "{n} fichiers pour {proj} sont validés et prêts :"],
    dv_m_held_one: ["1 file for {proj} is approved: {codes}. It goes out as soon as the balance is settled.", "1 fichier pour {proj} est validé : {codes}. Il part dès que le solde est réglé."],
    dv_m_held: ["{n} files for {proj} are approved: {codes}. They go out as soon as the balance is settled.", "{n} fichiers pour {proj} sont validés : {codes}. Ils partent dès que le solde est réglé."],
    dv_m_none: ["We're editing the files for {proj}. Nothing is approved yet, we'll send them as soon as they are.", "Nous montons les fichiers de {proj}. Rien n'est encore validé, on vous les envoie dès que possible."],
    dv_m_left: ["{n} more are on the way.", "{n} autres arrivent."],
    dv_m_next_edit: ["Next: we finish the edit and send everything in full quality.", "Ensuite : on termine le montage et on envoie tout en pleine qualité."],
    dv_m_next_delivered: ["Next: we launch the ads test and watch which hook wins.", "Ensuite : on lance le test pub et on regarde quelle accroche gagne."],
    dv_m_next_testing: ["Next: we send you the report on what won and what to cut.", "Ensuite : on vous envoie le rapport sur ce qui gagne et ce qu'on coupe."],
    dv_m_next_done: ["Next: we plan the next round with what we learned.", "Ensuite : on prépare la prochaine série avec ce qu'on a appris."],
    dv_m_next_editing: ["Next: we finish the edit and send approved previews for your review.", "Ensuite : nous terminons le montage et vous envoyons les aperçus validés."],
    dv_m_next_client_review: ["Next: we collect your feedback on the approved previews.", "Ensuite : nous recueillons vos retours sur les aperçus validés."],
    dv_m_next_revisions: ["Next: we make the requested changes and send the files back for review.", "Ensuite : nous effectuons les changements demandés et renvoyons les fichiers en relecture."],
    dv_m_next_paid: ["Next: we review the available campaign results together.", "Ensuite : nous examinons ensemble les résultats disponibles de la campagne."],
    dv_m_next_retention: ["Next: we plan the next round with what we learned.", "Ensuite : nous préparons la prochaine série à partir des enseignements."],
    dv_m_balance: ["Balance due: {amt} ({nos}).", "Solde dû : {amt} ({nos})."],
    dv_m_balance_late: ["Balance due: {amt} ({nos}), overdue since {d}.", "Solde dû : {amt} ({nos}), en retard depuis le {d}."],
    dv_m_thanks: ["Thanks!", "Merci !"]
  });

  var STAGES = ["editing", "client_review", "revisions", "delivered", "paid"];
  function stageKey(p) {
    var stage = String(p && p.stage || "");
    return m.OLD && m.OLD.stage[stage] || stage;
  }

  function isUrl(s) { return /^https?:\/\/\S+$/i.test(String(s || "").trim()); }
  function fileDrive(f) { return isUrl(f.item.drive) ? f.item.drive : (f.reel && isUrl(f.reel.drive) ? f.reel.drive : ""); }
  function fileTitle(f) { return f.kind === "carousel" ? (f.item.title || "") : (f.item.text || ""); }
  function canClient() { return m.can("portal"); }

  /** When the project was last touched: last activity line, else the latest invoice date. */
  function lastTouch(p) {
    var at = "";
    (p.log || []).forEach(function (l) { if (l.at && l.at > at) at = l.at; });
    m.invoicesOf(p).forEach(function (i) { (i.payments || []).forEach(function (x) { if (x.date > at) at = x.date; }); if (i.issued && i.issued > at) at = i.issued; });
    return String(at).slice(0, 10);
  }
  function inScope(p) {
    if (STAGES.indexOf(stageKey(p)) > -1) return true;
    return p.stage === "retention" && m.files(p).length > 0 && lastTouch(p) >= u.addDays(u.today(), -30);
  }
  function projects() {
    var order = { editing: 0, client_review: 1, revisions: 2, delivered: 3, paid: 4, retention: 5 };
    return S.all("projects").filter(inScope).sort(function (a, b) { return (order[stageKey(a)] - order[stageKey(b)]) || (m.projectLabel(a) > m.projectLabel(b) ? 1 : -1); });
  }
  function unpaidInvoices(p) {
    return S.all("invoices").filter(function (i) {
      return i.projectId === p.id && i.no && !i.credited && i.kind !== "credit" && m.invBalance(i) > 0.001;
    }).sort(u.by("issued"));
  }
  /** Earliest due date among this project's overdue invoices, or "". */
  function overdueSince(inv) {
    return inv.filter(function (i) { return m.invStatus(i) === "overdue"; }).map(function (i) { return i.due; }).sort()[0] || "";
  }
  function stats(p) {
    var files = m.files(p);
    var appr = files.filter(function (f) { return f.item.status === "approved"; });
    return { files: files, appr: appr, client: appr.filter(function (f) { return f.item.clientOk; }) };
  }

  /** The WhatsApp text. withLinks false = never include Drive links (files held until paid). */
  function message(p, withLinks) {
    var c = m.client(p.clientId) || {}, st = stats(p), co = m.company();
    var proj = p.name || m.projectLabel(p);
    var L = [t("dv_m_hi", { name: c.contact || c.brand || "" }), ""];
    var n = st.appr.length;
    if (!n) L.push(t("dv_m_none", { proj: proj }));
    else if (withLinks) {
      L.push(t(n === 1 ? "dv_m_ready_one" : "dv_m_ready", { n: n, proj: proj }));
      st.appr.forEach(function (f) { var d = fileDrive(f); L.push("- " + f.code + (d ? " " + d : "")); });
    } else {
      L.push(t(n === 1 ? "dv_m_held_one" : "dv_m_held", { n: n, proj: proj, codes: st.appr.map(function (f) { return f.code; }).join(", ") }));
    }
    var left = st.files.length - n;
    if (n && left > 0) L.push(t("dv_m_left", { n: left }));
    var nextStage = stageKey(p);
    L.push(t("dv_m_next_" + (nextStage || "retention")));
    var inv = unpaidInvoices(p);
    if (inv.length) {
      var late = overdueSince(inv), bo = { amt: u.money(u.sum(inv, m.invBalance)), nos: inv.map(function (i) { return i.no; }).join(", "), d: u.fmtDate(late) };
      L.push(t(late ? "dv_m_balance_late" : "dv_m_balance", bo).replace(/\.\.$/, "."));
    }
    L.push("");
    L.push(t("dv_m_thanks"));
    L.push(co.name + " · " + co.phone);
    return L.join("\n");
  }

  function fileRow(p, f, locked) {
    var it = f.item, appr = it.status === "approved", d = fileDrive(f);
    var ctrl = "";
    if (appr) {
      ctrl += '<button type="button" class="pill ' + (it.clientOk ? "done" : "") + '" data-a="dv-ok"' + ui.attrs({ p: p.id, k: f.key }) +
        ' aria-pressed="' + !!it.clientOk + '"' + (canClient() ? "" : ' aria-disabled="true" title="' + esc(t("dv_no_rights")) + '"') + ">" +
        esc(it.clientOk ? t("dv_client_ok") : t("dv_client_ok_q")) + "</button>";
      ctrl += ui.btn(t("dv_changes_btn"), "dv-changes", { cls: "sm", data: { p: p.id, k: f.key }, disabled: !canClient(), title: canClient() ? t("dv_changes") : t("dv_no_rights") });
    } else {
      ctrl += ui.filePill(it.status);
    }
    return '<div class="li" style="flex-wrap:wrap;align-items:flex-start">' +
      '<div class="stack" style="gap:3px;flex:1 1 240px"><span class="code">' + esc(f.code) + '</span><span class="small">' + esc(fileTitle(f)) + "</span>" +
      (it.note && it.status === "revise" ? '<span class="note small">' + esc(it.note) + "</span>" : "") + "</div>" +
      '<div class="row">' + (appr && d ? (locked ? '<span class="small faint">' + esc(t("pr_drive")) + "</span>" : '<a class="small link" href="' + esc(d) + '" target="_blank" rel="noopener noreferrer" data-a="dv-link">' + esc(t("pr_drive")) + "</a>") : "") + ctrl + "</div></div>";
  }

  function projectPanel(p) {
    var st = stats(p), open = m.canFiles(p), inv = unpaidInvoices(p);
    var bal = u.sum(inv, m.invBalance), late = overdueSince(inv);
    var h = '<section class="panel"><div class="panel-h"><div class="stack" style="gap:4px"><span class="lab sm muted">' + esc(m.pack(p.pack).name) + "</span>" +
      '<h2 class="sec">' + esc(m.projectLabel(p)) + "</h2></div>" +
      '<div class="row">' + ui.stagePill(p) + (st.appr.length ? (open ? ui.pill(t("dv_open"), "done") : ui.pill(t("dv_locked"), "alert")) : "") + "</div></div>";
    h += '<div class="row" style="gap:18px"><span><strong class="num">' + st.appr.length + " / " + st.files.length + "</strong> " + esc(t("dv_approved").toLowerCase()) + "</span>" +
      "<span><strong class=\"num\">" + st.client.length + " / " + st.appr.length + "</strong> " + esc(t("dv_client_lc")) + "</span>" +
      (bal > 0 ? "<span>" + esc(t("dv_balance")) + ' <strong class="num">' + esc(u.money(bal)) + "</strong>" + (late ? " " + ui.pill(t("dv_overdue", { d: u.fmtDate(late) }), "alert") : "") + "</span>" : "") + "</div>" +
      ui.meter(st.files.length ? st.appr.length / st.files.length * 100 : 0);
    if (!open) h += '<p class="gate" style="margin:0">' + esc(t("gate_files")) + "</p>";
    if (!st.files.length) h += ui.empty(t("dv_no_files"));
    else {
      var ordered = st.appr.concat(st.files.filter(function (f) { return f.item.status !== "approved"; }));
      h += '<div class="list">' + ordered.map(function (f) { return fileRow(p, f, !open); }).join("") + "</div>";
    }
    var text = message(p, open);
    h += '<div class="stack" style="gap:6px"><span class="lab sm muted">' + esc(t("dv_preview")) + '</span><div class="note strong small" style="white-space:pre-wrap;overflow-wrap:anywhere;margin:0">' + esc(text) + "</div></div>";
    h += '<div class="row">' +
      ui.btn(t("dv_copy_delivery"), "dv-copy", { cls: "primary", data: { p: p.id, links: "1" }, disabled: !open || !st.appr.length, title: !open ? t("gate_files") : !st.appr.length ? t("dv_only_approved") : "" }) +
      (!open ? ui.btn(t("dv_copy_update"), "dv-copy", { cls: "gel", data: { p: p.id, links: "0" } }) : "") +
      ui.btn(t("dv_open_prod"), "dv-prod", { cls: "ghost sm", data: { id: p.id } }) +
      ui.btn(t("dv_open_project"), "dv-proj", { cls: "ghost sm", data: { id: p.id } }) + "</div>";
    if (stageKey(p) === "editing" && open && st.files.length && st.appr.length === st.files.length) h += '<p class="small muted" style="margin:0">' + esc(t("dv_deliver_hint")) + "</p>";
    return h + "</section>";
  }

  GK.view("deliveries", {
    render: function () {
      var list = projects();
      var h = ui.head({ label: t("nav_deliveries"), title: t("dv_title"), accent: t("dv_accent"), sub: esc(t("dv_sub")), actions: ui.sample() });
      if (!list.length) return h + ui.empty(t("dv_empty"));
      var ready = 0, held = 0, appr = 0, cok = 0;
      list.forEach(function (p) {
        var st = stats(p);
        if (stageKey(p) === "editing" && st.files.length && st.appr.length === st.files.length) ready++;
        if (!m.canFiles(p) && STAGES.indexOf(stageKey(p)) > -1) held += st.appr.length;
        appr += st.appr.length; cok += st.client.length;
      });
      h += GK.insight.deliveries();
      return h + '<div class="stack" style="gap:18px">' + list.map(projectPanel).join("") + "</div>";
    },
    count: function () {
      var n = S.all("projects").filter(function (p) {
        if (stageKey(p) !== "editing") return false;
        var st = stats(p); return st.files.length > 0 && st.appr.length === st.files.length;
      }).length;
      return n || "";
    }
  });

  function writeFile(pid, key, changes, log) {
    var p = m.project(pid); var f = p && m.findFile(p, key); if (!f) return false;
    if (f.kind === "hook") {
      var reels = u.clone(p.reels || []);
      var r = reels.find(function (x) { return x.id === f.reel.id; });
      var h = r && (r.hooks || []).find(function (x) { return x.id === f.item.id; });
      if (!h) return false;
      Object.assign(h, changes);
      S.patch("projects", p.id, { reels: reels }, { log: log });
    } else {
      var cars = u.clone(p.carousels || []);
      var c = cars.find(function (x) { return x.id === f.item.id; });
      if (!c) return false;
      Object.assign(c, changes);
      S.patch("projects", p.id, { carousels: cars }, { log: log });
    }
    return true;
  }

  GK.act("dv-link", function () { /* the browser opens the link */ });
  GK.act("dv-prod", function (el) { ui.go("production", { projectId: el.dataset.id }); });
  GK.act("dv-proj", function (el) { ui.go("projects", { id: el.dataset.id }); });
  GK.act("dv-copy", function (el) {
    var p = m.project(el.dataset.p); if (!p) return;
    var withLinks = el.dataset.links === "1";
    if (withLinks && !m.canFiles(p)) return ui.toast(t("gate_files"));
    u.copy(message(p, withLinks)).then(function (ok) { ui.toast(ok ? t("dv_msg_copied") : t("dv_copy_fail")); });
  });
  GK.act("dv-ok", function (el) {
    if (!canClient()) return ui.toast(t("dv_no_rights"));
    var p = m.project(el.dataset.p), f = p && m.findFile(p, el.dataset.k); if (!f) return;
    if (f.item.status !== "approved") return ui.toast(t("dv_only_approved"));
    var v = !f.item.clientOk;
    if (writeFile(p.id, f.key, { clientOk: v }, t(v ? "dv_log_ok" : "dv_log_ok_off", { code: f.code }))) ui.toast(t("saved"));
  });
  GK.act("dv-changes", function (el) {
    var p = m.project(el.dataset.p), f = p && m.findFile(p, el.dataset.k); if (!f) return;
    ui.modal({
      title: t("dv_changes_title"), accent: t("dv_changes_accent"), label: m.projectLabel(p),
      body: '<span class="code">' + esc(f.code) + "</span>" + '<p class="small muted" style="margin:0">' + esc(fileTitle(f)) + "</p>" +
        ui.field({ id: "dv-note", label: t("dv_changes_lab"), type: "textarea", value: "", placeholder: t("dv_changes_ph") }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "dv-do-changes", { cls: "primary", data: { p: p.id, k: f.key } })
    });
  });
  GK.act("dv-do-changes", function (el) {
    if (!canClient()) return ui.toast(t("dv_no_rights"));
    var note = u.val("dv-note").trim();
    if (!note) { u.focus("dv-note"); ui.toast(t("required")); return; }
    var p = m.project(el.dataset.p), f = p && m.findFile(p, el.dataset.k); if (!f) return;
    ui.closeModal(true);
    if (writeFile(p.id, f.key, { status: "revise", clientOk: false, note: note }, t("dv_log_changes", { code: f.code, s: t("s_revise") }))) ui.toast(t("dv_changes_saved"));
  });
})(window.GK);
