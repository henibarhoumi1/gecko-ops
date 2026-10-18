/* GECKO Ops · portal: client pages (team side). Create, publish, preview and share the interactive page a client opens by link.
   The page itself is built in clientmode.js; the client-safe data in portal_snapshot.js. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var P = GK.portal = GK.portal || {};
  var pendingNewPage = null;

  GK.i18n.add({
    po_tab_pages: ["Client pages", "Pages client"], po_tab_quick: ["Quick update", "Point rapide"],
    po_pages_intro: ["Each client opens one link: their plan, scripts, files, timeline, invoices and boards, read-only. They can approve or ask for changes, and it reaches you on WhatsApp.", "Chaque client ouvre un lien : son plan, ses scripts, ses fichiers, son calendrier, ses factures et ses tableaux, en lecture seule. Il peut valider ou demander des changements, et ça vous arrive sur WhatsApp."],
    po_new: ["Create client page", "Créer une page client"], po_new_t: ["New client", "Nouvelle"], po_new_a: ["page", "page"],
    po_f_title: ["Page title", "Titre de la page"], po_f_project: ["Which project", "Quel projet"], po_f_all: ["All current projects", "Tous les projets en cours"],
    po_sections: ["What the client sees", "Ce que voit le client"],
    po_sec_plan: ["Campaign plan", "Plan de campagne"], po_sec_scripts: ["Scripts", "Scripts"], po_sec_files: ["Files", "Fichiers"], po_sec_timeline: ["Timeline", "Calendrier"], po_sec_invoices: ["Invoices", "Factures"], po_sec_boards: ["Boards", "Tableaux"],
    po_sec_assets: ["Brand assets", "Éléments de marque"], po_sec_results: ["Ad results", "Résultats pub"], po_sec_notes: ["Shared notes", "Notes partagées"], po_sec_extras: ["Talents, props and extras", "Talents, accessoires et extras"],
    po_t_extra: ["Extra: {name}", "Extra : {name}"],
    po_no_pages: ["No client page for {brand} yet. Create one and send the link.", "Pas encore de page client pour {brand}. Créez-en une et envoyez le lien."],
    po_live: ["Live", "Active"], po_off: ["Switched off", "Désactivée"], po_enabled: ["Page is on", "Page active"],
    po_scope_all: ["All current projects", "Tous les projets en cours"],
    po_published: ["Published {when}", "Publiée {when}"], po_never: ["Not published yet", "Pas encore publiée"],
    po_unpub: ["You changed something since the last update. Publish an update so the client sees it.", "Vous avez modifié quelque chose depuis la dernière mise à jour. Publiez une mise à jour pour que le client le voie."],
    po_publish: ["Publish update", "Publier la mise à jour"], po_publish_hint: ["The client sees a copy made at this moment. Costs, profit and commission are never part of it.", "Le client voit une copie faite à cet instant. Les coûts, le profit et la commission n'en font jamais partie."],
    po_published_ok: ["Update published.", "Mise à jour publiée."],
    po_copy_link: ["Copy link", "Copier le lien"], po_preview: ["Preview as client", "Voir comme le client"],
    po_copy_msg: ["Copy WhatsApp message", "Copier le message WhatsApp"], po_delete: ["Delete page", "Supprimer la page"],
    po_secure_link_missing: ["The one-time secure link is not in this browser session.", "Le lien sécurisé temporaire n'est pas dans cette session."],
    po_secure_link_create: ["Generate a new secure link", "Générer un nouveau lien sécurisé"],
    po_secure_link_created: ["A new secure link is ready.", "Un nouveau lien sécurisé est prêt."],
    po_link_note: ["On the hosted website this will be the client's own address. For now the client opens this link, and it works in the same app.", "Sur le site hébergé, ce sera l'adresse propre du client. Pour l'instant le client ouvre ce lien, et il fonctionne dans la même appli."],
    po_boards: ["Boards to show", "Tableaux à montrer"], po_no_boards: ["No whiteboards for this client yet.", "Aucun tableau pour ce client pour l'instant."],
    po_boards_na: ["Boards need the whiteboard module.", "Les tableaux demandent le module de tableaux blancs."],
    po_scripts_pick: ["Scripts and ideas to show", "Scripts et idées à montrer"], po_scripts_none: ["Nothing to show yet. A script appears here when a reel has one, or when an idea is marked shareable in Studio.", "Rien à montrer pour l'instant. Un script apparaît ici quand un reel en a un, ou quand une idée est marquée partageable dans le Studio."],
    po_direct: ["Direct", "Direct"], po_indirect: ["Indirect", "Indirect"],
    po_del_q: ["Delete this client page?", "Supprimer cette page client ?"], po_del_b: ["The link stops working at once. The client's feedback stays in your inbox.", "Le lien cesse de fonctionner tout de suite. Les retours du client restent dans votre boîte."],
    po_unsafe: ["The page text contains a word that should stay internal ({hits}). Check the texts, then publish again.", "Le texte de la page contient un mot à garder en interne ({hits}). Vérifiez les textes, puis publiez à nouveau."],
    po_unsafe_ok: ["Publish anyway", "Publier quand même"],
    po_wa_pg1: ["Hello {name},", "Bonjour {name},"],
    po_wa_pg2: ["Your {brand} campaign page is ready: the plan, the scripts and where we are today.", "Votre page campagne {brand} est prête : le plan, les scripts et où nous en sommes aujourd'hui."],
    po_wa_pg3: ["{link}", "{link}"],
    po_wa_pg4: ["Open it, and tap Approve or Ask for changes on anything. It comes straight to us on WhatsApp.", "Ouvrez-la, et touchez Valider ou Demander des changements sur ce que vous voulez. Ça nous arrive directement sur WhatsApp."],
    po_wa_pg5: ["Any question, just reply here. GECKO", "Une question ? Répondez ici. GECKO"],
    // feedback inbox
    po_fb_h: ["What clients said", "Ce que disent les clients"], po_fb_sub: ["Replies from the page and from WhatsApp, in one place.", "Les retours de la page et de WhatsApp, au même endroit."],
    po_fb_add: ["Client said (WhatsApp)", "Le client a dit (WhatsApp)"], po_fb_none: ["No feedback yet.", "Pas encore de retour."],
    po_fb_kind: ["Kind", "Type"], po_fb_target: ["About", "À propos de"], po_fb_text: ["What they said", "Ce qu'il a dit"],
    po_fb_file_target: ["{code} · version {version}", "{code} · version {version}"],
    po_k_comment: ["Comment", "Commentaire"], po_k_approve: ["Approved", "Validé"], po_k_changes: ["Wants changes", "Veut des changements"],
    po_t_plan: ["The plan", "Le plan"], po_t_other: ["Something else", "Autre chose"],
    po_fb_page: ["Which page", "Quelle page"], po_fb_proj: ["Project", "Projet"],
    po_fb_saved: ["Feedback saved.", "Retour enregistré."], po_fb_who_client: ["Client", "Client"],
    po_mark_ok: ["Mark plan approved", "Marquer le plan validé"], po_mark_q: ["Mark the plan as approved?", "Marquer le plan comme validé ?"], po_mark_b: ["This sets {project} as plan approved today. You can undo it in Projects.", "Le plan de {project} sera marqué validé aujourd'hui. Vous pouvez l'annuler dans Projets."],
    po_mark_done: ["Plan marked approved.", "Plan marqué validé."], po_plan_is_ok: ["Plan approved", "Plan validé"],
    po_apply_file: ["Apply to file", "Appliquer au fichier"], po_apply_changes: ["Apply requested changes", "Appliquer les retouches"],
    po_apply_file_q: ["Update this file's client approval?", "Mettre à jour la validation client de ce fichier ?"],
    po_apply_file_b: ["This changes {code}, version {version} only. It does not change its immutable creative revision.", "Cela modifie uniquement {code}, version {version}. La révision créative reste inchangée."],
    po_file_applied: ["Client feedback applied to {code} · v{version}.", "Retour client appliqué à {code} · v{version}."],
    po_file_snapshot_failed: ["The file state changed, but this client page could not be refreshed. Publish an update before relying on its displayed status.", "L'état du fichier a changé, mais cette page client n'a pas pu être actualisée. Publiez une mise à jour avant de vous fier à son statut affiché."],
    po_file_stale: ["This feedback does not match the current published file version. Publish the current file and ask the client to confirm again.", "Ce retour ne correspond pas à la version publiée actuelle. Publiez le fichier actuel et demandez une nouvelle confirmation au client."],
    po_no_perm2: ["Only the owner and the Client Lead manage client pages.", "Seuls le fondateur et le responsable clients gèrent les pages client."],
    po_no_perm3: ["Only the owner and the Client Lead can approve a plan.", "Seuls le fondateur et le responsable clients peuvent valider un plan."]
  });

  /** Stamp with seconds, so "edited after publishing" works inside the same minute. */
  function stampS() { return u.nowStamp() + ":" + String(new Date().getSeconds()).padStart(2, "0") + "." + String(new Date().getMilliseconds()).padStart(3, "0"); }
  function can() { return m.can("portal"); }
  function guard() { if (!can()) { ui.toast(t("po_no_perm2")); return false; } return true; }
  function sharesOf(c) { return S.all("shares").filter(function (s) { return s.clientId === c.id; }).sort(u.by(function (s) { return s.created || s.publishedAt || ""; }, "desc")); }
  function when(stamp) { return stamp ? u.fmtDate(stamp, { day: "numeric", month: "short" }) + " " + String(stamp).slice(11, 16) : ""; }
  function scopeLabel(s) { var p = s.projectId && m.project(s.projectId); return p ? p.name : t("po_scope_all"); }
  function dirty(s) { return !!s.editedAt && (!s.publishedAt || s.editedAt > s.publishedAt); }
  var SECS = ["plan", "scripts", "files", "timeline", "invoices", "boards", "assets", "results", "notes", "extras"];
  function secs(s) { return Object.assign({ plan: true, scripts: true, files: true, timeline: true, invoices: true, boards: true, assets: true, results: true, notes: true, extras: true }, s.sections || {}); }

  function targetLabel(s, target) {
    if (target === "plan") return t("po_t_plan");
    var snap = s && s.snapshot, found = "";
    if (/^extra:/.test(target || "") && snap) (snap.extras || []).forEach(function (x) { if (target === "extra:" + x.id) found = t("po_t_extra", { name: x.name }); });
    if (snap) (snap.projects || []).forEach(function (p) {
      (p.reels || []).forEach(function (r) { if (target === "reel:" + r.id || (r.ideaId && target === "idea:" + r.ideaId)) found = (r.angle || "") + " · " + t(r.mode === "Indirect" ? "po_indirect" : "po_direct"); });
      (p.ideas || []).forEach(function (i) { if (target === "idea:" + i.id) found = i.title; });
    });
    return found || target || t("po_t_other");
  }

  function feedbackMeta(f) {
    var match = /\n\n\[\[gecko-file:v1:([^\]]+)\]\]$/.exec(String(f && f.text || ""));
    if (!match) return null;
    try { return JSON.parse(decodeURIComponent(match[1])); } catch (e) { return null; }
  }
  function feedbackText(f) {
    return String(f && f.text || "").replace(/\n\n\[\[gecko-file:v1:[^\]]+\]\]$/, "").trim();
  }
  function versionOf(item) { return +item.v || 1; }
  function sourceRevisionOf(file) { return file.item.sourceRevisionId || (file.reel && file.reel.creativeRevisionId) || ""; }
  function resolveFileFeedback(f) {
    var meta = feedbackMeta(f);
    if (!meta || !f || (f.kind !== "approve" && f.kind !== "changes") || f.target !== "reel:" + meta.reelId ||
        f.projectId !== meta.projectId || !meta.fileKey || !meta.version) return null;
    var share = S.get("shares", f.shareId), project = m.project(meta.projectId);
    if (!share || share.clientId !== f.clientId || !project || project.clientId !== f.clientId) return null;
    var publishedProject = (share.snapshot && share.snapshot.projects || []).find(function (p) { return p.id === meta.projectId; });
    var publishedReel = publishedProject && (publishedProject.reels || []).find(function (r) { return r.id === meta.reelId; });
    var publishedFile = publishedReel && (publishedReel.files || []).find(function (file) { return file.key === meta.fileKey; });
    var file = m.findFile(project, meta.fileKey);
    if (!publishedFile || !file || file.kind !== "hook" || file.reel.id !== meta.reelId ||
        publishedFile.status !== "approved" || publishedFile.version !== meta.version ||
        (publishedFile.revisionId || "") !== (meta.revisionId || "") ||
        file.item.status !== "approved" || versionOf(file.item) !== meta.version ||
        sourceRevisionOf(file) !== (meta.revisionId || "")) return null;
    return { project: project, file: file, meta: meta, share: share };
  }
  function updatePublishedFile(resolved, changes) {
    var snapshot = u.clone(resolved.share.snapshot);
    var project = (snapshot.projects || []).find(function (p) { return p.id === resolved.meta.projectId; });
    var reel = project && (project.reels || []).find(function (r) { return r.id === resolved.meta.reelId; });
    var file = reel && (reel.files || []).find(function (f) { return f.key === resolved.meta.fileKey; });
    if (!file) return false;
    if (Object.prototype.hasOwnProperty.call(changes, "status")) file.status = changes.status;
    if (Object.prototype.hasOwnProperty.call(changes, "clientOk")) file.clientOk = changes.clientOk;
    return S.patch("shares", resolved.share.id, { snapshot: snapshot });
  }
  function applyFileFeedback(f) {
    var resolved = resolveFileFeedback(f);
    if (!resolved) return { ok: false };
    var p = resolved.project, file = resolved.file, meta = resolved.meta;
    var changes = f.kind === "approve" ? { clientOk: true } : { status: "revise", clientOk: false, note: feedbackText(f) };
    if (f.kind === "changes" && !changes.note) return { ok: false };
    if ((f.kind === "approve" && file.item.clientOk) ||
        (f.kind === "changes" && file.item.status === "revise" && !file.item.clientOk && file.item.note === changes.note)) {
      return { ok: true, unchanged: true, code: file.code, version: meta.version };
    }
    var reels = u.clone(p.reels || []), reel = reels.find(function (r) { return r.id === meta.reelId; });
    var hook = reel && (reel.hooks || []).find(function (h) { return h.id === file.item.id; });
    if (!hook) return { ok: false };
    Object.assign(hook, changes);
    var saved = S.patch("projects", p.id, { reels: reels }, { log: f.kind === "approve" ? "client approved " + file.code + " v" + meta.version : "client requested changes to " + file.code + " v" + meta.version });
    if (!saved) return { ok: false };
    var applied = { ok: true, code: file.code, version: meta.version };
    var snapshotSave = updatePublishedFile(resolved, changes);
    if (snapshotSave && typeof snapshotSave.then === "function") {
      return snapshotSave.then(function (result) {
        applied.snapshotOk = !!result;
        return applied;
      }, function (error) {
        applied.snapshotOk = false;
        applied.snapshotError = error;
        return applied;
      });
    }
    applied.snapshotOk = !!snapshotSave;
    return applied;
  }
  P.resolveFileFeedback = resolveFileFeedback;
  P.applyFileFeedback = applyFileFeedback;

  // ---------- one page panel ----------
  function pagePanel(s, c) {
    var sec = secs(s), ed = can(), dis = ed ? "" : " disabled";
    var h = '<section class="panel" aria-label="' + esc(s.title) + '"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(s.title || c.brand) + '</h2><span class="small muted">' + esc(scopeLabel(s)) + " · " + esc(s.publishedAt ? t("po_published", { when: when(s.publishedAt) }) : t("po_never")) + "</span></div>" +
      ui.pill(s.enabled ? t("po_live") : t("po_off"), s.enabled ? "wip" : "") + "</div>";
    h += '<label class="check"><input type="checkbox" data-c="po-on" data-id="' + esc(s.id) + '"' + (s.enabled ? " checked" : "") + dis + "><span>" + esc(t("po_enabled")) + "</span></label>";
    // link
    var link = P.linkFor(s.id);
    h += '<div class="stack" style="gap:6px"><span class="lab sm">' + esc(t("po_copy_link")) + '</span>';
    if (link) h += '<code class="code" style="word-break:break-all;user-select:all">' + esc(link) + "</code>";
    else h += '<span class="small muted">' + esc(t("po_secure_link_missing")) + "</span>";
    h += '<span class="small muted">' + esc(t("po_link_note")) + "</span></div>";
    h += '<div class="row">' + ui.btn(t("po_publish"), "po-publish", { cls: "primary", data: { id: s.id }, disabled: !ed, title: ed ? "" : t("po_no_perm2") }) +
      ui.btn(t("po_copy_link"), "po-copylink", { data: { id: s.id } }) + ui.btn(t("po_preview"), "po-preview", { data: { id: s.id } }) +
      ui.btn(t("po_copy_msg"), "po-wamsg", { data: { id: s.id } }) +
      (S.backend === "supabase" && !link && s.enabled ? ui.btn(t("po_secure_link_create"), "po-regenerate", { data: { id: s.id } }) : "") + "</div>";
    h += '<span class="small muted">' + esc(t("po_publish_hint")) + "</span>";
    if (dirty(s)) h += '<p class="note" style="margin:0">' + esc(t("po_unpub")) + "</p>";
    // sections
    h += '<div class="stack" style="gap:2px"><span class="lab sm">' + esc(t("po_sections")) + '</span><div class="form" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 14px">' +
      SECS.map(function (k) {
        return '<label class="check"><input type="checkbox" data-c="po-sec" data-id="' + esc(s.id) + '" data-k="' + k + '"' + (sec[k] ? " checked" : "") + dis + "><span>" + esc(t("po_sec_" + k)) + "</span></label>";
      }).join("") + "</div></div>";
    // scripts picker
    if (sec.scripts) {
      var cands = P.scriptCandidates(s), picked = s.scriptIds;
      h += '<div class="stack" style="gap:2px"><span class="lab sm">' + esc(t("po_scripts_pick")) + "</span>";
      h += cands.length ? cands.map(function (x) {
        var on = !Array.isArray(picked) || picked.indexOf(x.key) > -1;
        return '<label class="check"><input type="checkbox" data-c="po-script" data-id="' + esc(s.id) + '" data-k="' + esc(x.key) + '"' + (on ? " checked" : "") + dis + "><span>" + esc(x.label) + ' <span class="muted small">· ' + esc(x.project) + "</span></span></label>";
      }).join("") : '<p class="small muted" style="margin:0">' + esc(t("po_scripts_none")) + "</p>";
      h += "</div>";
    }
    // boards picker
    if (sec.boards) {
      var bs = S.all("boards").filter(function (b) { return b.clientId === c.id; }).sort(u.by("title"));
      h += '<div class="stack" style="gap:2px"><span class="lab sm">' + esc(t("po_boards")) + "</span>";
      if (typeof GK.boardSVG !== "function") h += '<p class="small muted" style="margin:0">' + esc(t("po_boards_na")) + "</p>";
      else h += bs.length ? bs.map(function (b) {
        return '<label class="check"><input type="checkbox" data-c="po-board" data-id="' + esc(s.id) + '" data-k="' + esc(b.id) + '"' + ((s.boardIds || []).indexOf(b.id) > -1 ? " checked" : "") + dis + "><span>" + esc(b.title || "—") + "</span></label>";
      }).join("") : '<p class="small muted" style="margin:0">' + esc(t("po_no_boards")) + "</p>";
      h += "</div>";
    }
    h += '<div class="row">' + ui.btn(t("po_delete"), "po-del", { cls: "ghost sm", data: { id: s.id }, disabled: !ed, title: ed ? "" : t("po_no_perm2") }) + "</div></section>";
    return h;
  }

  // ---------- feedback inbox ----------
  function inbox(c, shares) {
    var ids = shares.map(function (s) { return s.id; });
    var list = S.all("feedback").filter(function (f) { return f.clientId === c.id || ids.indexOf(f.shareId) > -1; }).sort(u.by("at", "desc"));
    var h = '<section class="panel" aria-label="' + esc(t("po_fb_h")) + '"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("po_fb_h")) + '</h2><span class="small muted">' + esc(t("po_fb_sub")) + "</span></div>" +
      ui.btn(t("po_fb_add"), "po-fb-add", { cls: "sm", data: { id: c.id }, disabled: !can(), title: can() ? "" : t("po_no_perm2") }) + "</div>";
    if (!list.length) return h + ui.empty(t("po_fb_none")) + "</section>";
    h += '<div class="list">' + list.map(function (f) {
      var sh = S.get("shares", f.shareId), p = m.project(f.projectId || (sh && sh.projectId));
      var fileFeedback = resolveFileFeedback(f);
      var canOk = f.kind === "approve" && f.target === "plan" && p && !p.planApproved;
      var okBtn = canOk ? ui.btn(t("po_mark_ok"), "po-mark-ok", { cls: "sm", data: { id: f.id }, disabled: !m.can("projects.edit"), title: m.can("projects.edit") ? "" : t("po_no_perm3") }) : "";
      if (fileFeedback && m.can("projects.edit")) {
        okBtn = ui.btn(f.kind === "approve" ? t("po_apply_file") : t("po_apply_changes"), "po-apply-file", { cls: "sm", data: { id: f.id } });
      }
      var target = fileFeedback ? fileFeedback.file.code + " · v" + fileFeedback.meta.version : targetLabel(sh, f.target);
      return '<div class="li" style="align-items:flex-start"><div class="stack" style="gap:4px"><div class="row" style="gap:6px">' + ui.pill(t("po_k_" + f.kind), f.kind === "changes" ? "alert" : f.kind === "approve" ? "done" : "") +
        "<strong>" + esc(target) + "</strong>" + (p ? '<span class="small muted">· ' + esc(p.name) + "</span>" : "") + "</div>" +
        (feedbackText(f) ? '<span style="white-space:pre-wrap">' + esc(feedbackText(f)) + "</span>" : "") +
        '<span class="small muted">' + esc(f.who === "client" ? t("po_fb_who_client") : m.member(f.who).name) + " · " + esc(when(f.at)) + (f.kind === "approve" && f.target === "plan" && p && p.planApproved ? " · " + esc(t("po_plan_is_ok")) : "") + "</span></div>" + okBtn + "</div>";
    }).join("") + "</div></section>";
    return h;
  }

  /** The share panels for one client: create button, link, publish, preview, switch off. */
  P.sharesHTML = function (c) {
    var shares = sharesOf(c), ed = can();
    var h = '<p class="note" style="margin:0">' + esc(t("po_pages_intro")) + "</p>";
    h += '<div class="row between"><h2 class="sec">' + esc(c.brand) + "</h2>" + ui.btn(t("po_new"), "po-new", { cls: "primary", data: { id: c.id }, disabled: !ed, title: ed ? "" : t("po_no_perm2") }) + "</div>";
    h += shares.length ? '<div class="grid2">' + shares.map(function (s) { return pagePanel(s, c); }).join("") + "</div>" : ui.empty(t("po_no_pages", { brand: c.brand }));
    return h;
  };
  /** What the client said, with the buttons to apply it. */
  P.inboxHTML = function (c) { return inbox(c, sharesOf(c)); };
  /** The "Client pages" tab for one client. */
  P.pagesHTML = function (c) { return P.sharesHTML(c) + P.inboxHTML(c); };
  P.targetLabel = targetLabel;
  P.sharesOf = sharesOf;

  // ---------- actions ----------
  function patchShare(id, partial) {
    var cur = S.get("shares", id); if (!cur) return;
    S.patch("shares", id, Object.assign({ editedAt: stampS() }, partial));
  }
  /** The team changed something the client page shows (notes, extras, brand files): flag the pages as not yet published. */
  P.markDirty = function (c) { sharesOf(c).forEach(function (s) { if (s.publishedAt) patchShare(s.id, {}); }); };
  GK.change("po-on", function (el) { if (!guard()) return render(); patchShare(el.getAttribute("data-id"), { enabled: el.checked }); });
  GK.change("po-sec", function (el) {
    if (!guard()) return render();
    var s = S.get("shares", el.getAttribute("data-id")); if (!s) return;
    var sec = secs(s); sec[el.getAttribute("data-k")] = el.checked; patchShare(s.id, { sections: sec });
  });
  GK.change("po-script", function (el) {
    if (!guard()) return render();
    var s = S.get("shares", el.getAttribute("data-id")); if (!s) return;
    var all = P.scriptCandidates(s).map(function (x) { return x.key; });
    var cur = Array.isArray(s.scriptIds) ? s.scriptIds.slice() : all.slice(), k = el.getAttribute("data-k"), i = cur.indexOf(k);
    if (el.checked && i < 0) cur.push(k); else if (!el.checked && i > -1) cur.splice(i, 1);
    patchShare(s.id, { scriptIds: cur });
  });
  GK.change("po-board", function (el) {
    if (!guard()) return render();
    var s = S.get("shares", el.getAttribute("data-id")); if (!s) return;
    var cur = (s.boardIds || []).slice(), k = el.getAttribute("data-k"), i = cur.indexOf(k);
    if (el.checked && i < 0) cur.push(k); else if (!el.checked && i > -1) cur.splice(i, 1);
    patchShare(s.id, { boardIds: cur });
  });
  function render() { ui.render(true); }

  function publish(s, force) {
    var snap = P.buildSnapshot(s); if (!snap) return;
    var hits = P.check(snap);
    function go() {
      var me = GK.me();
      var saved = S.patch("shares", s.id, { snapshot: snap, feedbackTargets: P.feedbackTargets(snap), publishedAt: stampS(), publishedBy: me ? me.id : "", editedAt: "" }, { log: "published" });
      if (saved && typeof saved.then === "function") saved.then(function (result) { if (result) ui.toast(t("po_published_ok")); });
      else if (saved) ui.toast(t("po_published_ok"));
    }
    if (hits.length && !force) {
      ui.modal({ title: t("po_publish"), body: '<p style="margin:0">' + esc(t("po_unsafe", { hits: hits.slice(0, 3).join("; ") })) + "</p>", foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("po_unsafe_ok"), "po-publish-force", { data: { id: s.id } }) });
      return;
    }
    go();
  }
  GK.act("po-publish", function (el) { if (!guard()) return; var s = S.get("shares", el.getAttribute("data-id")); if (s) publish(s); });
  GK.act("po-publish-force", function (el) { var s = S.get("shares", el.getAttribute("data-id")); ui.closeModal(true); if (s && guard()) publish(s, true); });
  GK.act("po-copylink", function (el) {
    var link = P.linkFor(el.getAttribute("data-id"));
    if (!link) return ui.toast(t("po_secure_link_missing"));
    u.copy(link).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
  GK.act("po-regenerate", function (el) {
    var id = el.getAttribute("data-id");
    if (S.backend !== "supabase") return;
    S.rotateClientShare(id).then(function () { render(); ui.toast(t("po_secure_link_created")); }, function (error) { ui.toast(error.message); });
  });
  GK.act("po-wamsg", function (el) {
    var s = S.get("shares", el.getAttribute("data-id")); if (!s) return;
    var c = m.client(s.clientId); if (!c) return;
    var link = P.linkFor(s.id); if (!link) return ui.toast(t("po_secure_link_missing"));
    var msg = [t("po_wa_pg1", { name: c.contact || c.brand }), t("po_wa_pg2", { brand: c.brand }), link, t("po_wa_pg4"), t("po_wa_pg5")].join("\n");
    u.copy(msg).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
  GK.act("po-preview", function (el) {
    var s = S.get("shares", el.getAttribute("data-id")); if (!s || !GK.clientMode) return;
    var view = s.snapshot ? s : Object.assign({}, s, { snapshot: P.buildSnapshot(s), publishedAt: "" });
    if (!view.snapshot) return;
    GK.clientMode.preview(Object.assign({}, view, { enabled: true }));
  });
  GK.act("po-del", function (el) {
    if (!guard()) return;
    var id = el.getAttribute("data-id");
    ui.confirm(t("po_del_q"), t("po_del_b"), function () {
      var result = S.remove("shares", id);
      if (result && typeof result.then === "function") result.then(function (ok) { if (ok) ui.toast(t("saved")); });
      else ui.toast(t("saved"));
    }, t("po_delete"));
  });

  // new page
  GK.act("po-new", function (el) {
    if (!guard()) return;
    var c = m.client(el.getAttribute("data-id")); if (!c) return;
    var ps = S.all("projects").filter(function (p) { return p.clientId === c.id; }).sort(u.by(function (p) { return m.STAGES.indexOf(p.stage); }));
    ui.modal({
      title: t("po_new_t"), accent: t("po_new_a"), label: c.brand,
      body: '<div class="form">' + ui.field({ id: "po-n-title", label: t("po_f_title"), value: c.brand + " · " + t("po_tab_pages").toLowerCase(), span: true }) +
        ui.field({ id: "po-n-proj", label: t("po_f_project"), type: "select", value: "", options: [["", t("po_f_all")]].concat(ps.map(function (p) { return [p.id, p.name]; })), span: true }) + "</div>" +
        '<div class="stack" style="gap:0"><span class="lab sm">' + esc(t("po_sections")) + "</span>" +
        SECS.map(function (k) { return ui.field({ id: "po-n-" + k, type: "checkbox", label: t("po_sec_" + k), value: k !== "boards" }); }).join("") + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "po-new-save", { cls: "primary", data: { id: c.id } })
    });
  });
  GK.act("po-new-save", function (el) {
    var c = m.client(el.getAttribute("data-id")); if (!c) return;
    var title = u.val("po-n-title").trim(); if (!title) { u.focus("po-n-title"); return ui.toast(t("required")); }
    var sec = {}; SECS.forEach(function (k) { sec[k] = u.checked("po-n-" + k); });
    var boards = [];
    var share = { id: P.newToken(), clientId: c.id, projectId: u.val("po-n-proj"), title: title, enabled: true, sections: sec, boardIds: boards, snapshot: null, publishedAt: "", publishedBy: "", note: "", created: stampS(), editedAt: "" };
    ui.closeModal(true);
    if (S.backend === "supabase") {
      var snapshot = P.buildSnapshot(share), hits = snapshot ? P.check(snapshot) : [];
      function createSecurePage() {
        if (!snapshot) return ui.toast(t("po_no_pages", { brand: c.brand }));
        S.createClientShare(share, snapshot, P.feedbackTargets(snapshot)).then(function () {
          ui.toast(t("po_published_ok")); ui.render(true);
        }, function (error) { ui.toast("Could not create the secure page: " + error.message); });
      }
      if (hits.length) {
        ui.modal({
          title: t("po_publish"),
          body: '<p style="margin:0">' + esc(t("po_unsafe", { hits: hits.slice(0, 3).join("; ") })) + "</p>",
          foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("po_unsafe_ok"), "po-new-force", { cls: "primary" })
        });
        pendingNewPage = createSecurePage;
      } else createSecurePage();
      return;
    }
    var saved = S.put("shares", share, { log: "created" });
    if (saved) publish(saved);
  });
  GK.act("po-new-force", function () {
    ui.closeModal(true);
    var create = pendingNewPage; pendingNewPage = null;
    if (create) create();
  });

  // feedback by hand
  GK.act("po-fb-add", function (el) {
    if (!guard()) return;
    var c = m.client(el.getAttribute("data-id")); if (!c) return;
    var shares = sharesOf(c);
    if (!shares.length) return ui.toast(t("po_no_pages", { brand: c.brand }));
    var ps = S.all("projects").filter(function (p) { return p.clientId === c.id; });
    var tg = [["plan", t("po_t_plan")]];
    shares.forEach(function (s) { (P.scriptCandidates(s)).forEach(function (x) { if (!tg.some(function (y) { return y[0] === x.key; })) tg.push([x.key, x.label]); }); });
    shares.forEach(function (s) {
      var targets = s.feedbackTargets || {};
      (s.snapshot && s.snapshot.projects || []).forEach(function (p) {
        (p.reels || []).forEach(function (r) {
          var key = "reel:" + r.id;
          if (!(targets[key] || []).some(function (kind) { return kind === "approve" || kind === "changes"; })) return;
          (r.files || []).forEach(function (file) {
            if (file.status !== "approved" || !file.key || !file.version) return;
            var meta = { shareId: s.id, projectId: p.id, reelId: r.id, fileKey: file.key, version: file.version, revisionId: file.revisionId || "" };
            tg.push(["file:" + encodeURIComponent(JSON.stringify(meta)), t("po_fb_file_target", { code: file.code, version: file.version }) + " · " + p.name]);
          });
        });
      });
    });
    tg.push(["other", t("po_t_other")]);
    ui.modal({
      title: t("po_fb_add"), label: c.brand,
      body: '<div class="form">' + ui.field({ id: "po-f-share", label: t("po_fb_page"), type: "select", value: shares[0].id, options: shares.map(function (s) { return [s.id, s.title]; }) }) +
        ui.field({ id: "po-f-proj", label: t("po_fb_proj"), type: "select", value: (shares[0].projectId || (ps[0] && ps[0].id) || ""), options: ps.map(function (p) { return [p.id, p.name]; }) }) +
        ui.field({ id: "po-f-kind", label: t("po_fb_kind"), type: "select", value: "comment", options: [["comment", t("po_k_comment")], ["approve", t("po_k_approve")], ["changes", t("po_k_changes")]] }) +
        ui.field({ id: "po-f-target", label: t("po_fb_target"), type: "select", value: "plan", options: tg }) + "</div>" +
        ui.field({ id: "po-f-text", label: t("po_fb_text"), type: "textarea", rows: 3 }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "po-fb-save", { cls: "primary", data: { id: c.id } })
    });
  });
  GK.act("po-fb-save", function (el) {
    var c = m.client(el.getAttribute("data-id")); if (!c) return;
    var kind = u.val("po-f-kind"), target = u.val("po-f-target"), shareId = u.val("po-f-share"), projectId = u.val("po-f-proj"), text = u.val("po-f-text").trim(), meta = null;
    if (kind !== "approve" && !text) { u.focus("po-f-text"); return ui.toast(t("required")); }
    if (target.indexOf("file:") === 0) {
      try { meta = JSON.parse(decodeURIComponent(target.slice(5))); } catch (e) { return ui.toast(t("po_file_stale")); }
      if (!meta || meta.shareId !== shareId || meta.projectId !== projectId || !meta.reelId || !meta.fileKey || !meta.version) return ui.toast(t("po_file_stale"));
      target = "reel:" + meta.reelId;
      delete meta.shareId;
      if (kind !== "comment") text += "\n\n[[gecko-file:v1:" + encodeURIComponent(JSON.stringify(meta)) + "]]";
    }
    ui.closeModal(true);
    var me = GK.me();
    var saved = S.put("feedback", { id: u.uid("f"), shareId: shareId, clientId: c.id, projectId: projectId, kind: kind, target: target, text: text, who: "client", at: u.nowStamp(), by: me ? me.id : "" });
    if (saved && typeof saved.then === "function") saved.then(function () { ui.toast(t("po_fb_saved")); }, function (error) { ui.toast("Feedback was not saved: " + error.message); });
    else if (saved) ui.toast(t("po_fb_saved"));
  });
  GK.act("po-mark-ok", function (el) {
    if (!m.can("projects.edit")) return ui.toast(t("po_no_perm3"));
    var f = S.get("feedback", el.getAttribute("data-id")); if (!f) return;
    var sh = S.get("shares", f.shareId), p = m.project(f.projectId || (sh && sh.projectId)); if (!p) return;
    ui.confirm(t("po_mark_q"), t("po_mark_b", { project: p.name }), function () {
      S.patch("projects", p.id, { planApproved: true, planApprovedOn: u.today() }, { log: "plan approved" });
      ui.toast(t("po_mark_done"));
    }, t("po_mark_ok"));
  });
  GK.act("po-apply-file", function (el) {
    if (!m.can("projects.edit")) return ui.toast(t("po_no_perm3"));
    var f = S.get("feedback", el.getAttribute("data-id")), resolved = f && resolveFileFeedback(f);
    if (!resolved) return ui.toast(t("po_file_stale"));
    var meta = resolved.meta;
    ui.confirm(t("po_apply_file_q"), t("po_apply_file_b", { code: resolved.file.code, version: meta.version }), function () {
      function done(result) {
        if (!result.ok) return ui.toast(t("po_file_stale"));
        ui.toast(result.snapshotOk ? t("po_file_applied", { code: result.code, version: result.version }) : t("po_file_snapshot_failed"));
        render();
      }
      var result = applyFileFeedback(f);
      if (result && typeof result.then === "function") result.then(done, function (error) { ui.toast("Client approval update failed: " + (error && error.message || "unknown error")); });
      else done(result);
    }, f.kind === "approve" ? t("po_apply_file") : t("po_apply_changes"));
  });
})(window.GK);
