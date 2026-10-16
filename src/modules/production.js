/* GECKO Ops · module: production (the editors' screen: every file, by status) */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    pr_title: ["Cut, check,", "Monter, relire,"], pr_accent: ["approve", "valider"],
    pr_sub: ["Every hook and carousel is one file. Editors send them to review, Heni approves.", "Chaque accroche et chaque carrousel est un fichier. Les monteurs l'envoient en relecture, Heni valide."],
    pr_project: ["Project", "Projet"], pr_all: ["All projects", "Tous les projets"],
    pr_board: ["Board", "Tableau"], pr_reels: ["By reel", "Par reel"],
    pr_empty: ["No project has files in production right now. Files appear once reels are planned.", "Aucun projet n'a de fichiers en production. Les fichiers apparaissent quand les reels sont planifiés."],
    pr_col_empty: ["Nothing here.", "Rien ici."],
    pr_base: ["Base reel", "Reel de base"], pr_hook: ["Hook {n}", "Accroche {n}"], pr_carousel: ["Carousel", "Carrousel"], pr_carousels: ["Carousels", "Carrousels"],
    pr_direct: ["Direct", "Direct"], pr_indirect: ["Indirect", "Indirect"],
    pr_drive: ["Drive", "Drive"], pr_drive_folder: ["Reel folder", "Dossier du reel"], pr_drive_t: ["Reel", "Dossier du"], pr_drive_acc: ["folder", "reel"], pr_no_drive: ["No Drive link yet", "Pas encore de lien Drive"],
    pr_set_drive: ["Drive link", "Lien Drive"], pr_drive_bad: ["Paste a full link starting with https://", "Collez un lien complet qui commence par https://"],
    pr_start: ["Start editing", "Commencer"], pr_to_review: ["Send to review", "Envoyer en relecture"],
    pr_approve: ["Approve", "Valider"], pr_send_back: ["Send back", "Renvoyer"], pr_new_version: ["Start new version", "Nouvelle version"],
    pr_reopen: ["Reopen", "Rouvrir"],
    pr_wait_founder: ["Waiting for Heni's review", "En attente de la relecture de Heni"],
    pr_note: ["Note for the editor", "Note pour le monteur"], pr_note_ph: ["What to change, in one or two lines", "Quoi changer, en une ou deux lignes"],
    pr_back_title: ["Send back to", "Renvoyer au"], pr_back_accent: ["edit", "montage"], pr_reopen_t: ["Reopen for", "Rouvrir pour le"],
    pr_log_drive: ["{code} · Drive link", "{code} · lien Drive"], pr_log_rdrive: ["Reel Drive folder set", "Dossier Drive du reel ajouté"],
    pr_log_move: ["{code} → {s}", "{code} → {s}"],
    pr_reopen_hint: ["Reopening an approved file starts a new version.", "Rouvrir un fichier validé crée une nouvelle version."],
    pr_version: ["Version", "Version"], pr_script: ["Script", "Script"], pr_angle: ["Angle", "Angle"],
    pr_client_ok: ["Client approved", "Validé client"],
    pr_file: ["File", "Fichier"], pr_file_accent: ["details", "fiche"],
    pr_moved: ["Moved to {s}", "Passé en {s}"], pr_new_v: ["now v{v}", "maintenant v{v}"],
    pr_scope: ["Scope vs {pack}", "Volume vs {pack}"], pr_sc_reels: ["reels", "reels"], pr_sc_var: ["hook variations", "variations d'accroche"],
    pr_shot_plan: ["Shot plan", "Plan de tournage"], pr_scene_done: ["Shot complete", "Plan tourné"],
    pr_silent: ["silent / B-roll", "silencieux / plans de coupe"], pr_source_idea: ["Open source idea", "Ouvrir l'idée source"],
    pr_sc_car: ["carousels", "carrousels"], pr_sc_appr: ["approved", "validés"], pr_over: ["above pack", "au-dessus du pack"],
    pr_no_rights: ["Only editors and Heni change file status.", "Seuls les monteurs et Heni changent le statut."],
    pr_founder_only: ["Only Heni approves or sends back.", "Seul Heni valide ou renvoie."],
    pr_no_edit: ["Only editors and Heni set Drive links.", "Seuls les monteurs et Heni ajoutent les liens Drive."]
  });

  var COLS = ["todo", "edit", "review", "revise", "approved"];
  var FILE_DOT = { todo: "", edit: "dot-blue", review: "dot-yellow", revise: "dot-pink", approved: "dot-green" };
  var LIVE = m.STAGES.concat(["onboard", "plan", "edit", "testing", "done"]);

  function activeProjects() {
    return S.all("projects").filter(function (p) { return LIVE.indexOf(p.stage) > -1 && m.files(p).length; })
      .sort(u.by(function (p) { return m.projectLabel(p); }));
  }
  function isUrl(s) { return /^https?:\/\/\S+$/i.test(String(s || "").trim()); }
  function linkHTML(href, label) {
    return isUrl(href) ? '<a class="small link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" data-a="pr-link">' + esc(label) + "</a>" : "";
  }
  function fileTitle(f) { return f.kind === "carousel" ? (f.item.title || t("pr_carousel")) : (f.item.text || "—"); }
  function fileKind(f) {
    if (f.kind === "carousel") return t("pr_carousel");
    return (f.isBase ? t("pr_base") : t("pr_hook", { n: f.hookIndex + 1 })) + " · " + (f.reel.mode === "I" ? t("pr_indirect") : t("pr_direct"));
  }
  function excerpt(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function canStatus() { return m.can("files.status"); }
  function canJudge() { return m.can("files.status") && m.isFounder(); }

  /** Moves allowed from a status for this viewer. note: asks for a note first. */
  function moves(st) {
    st = st || "todo";
    if (st === "todo") return canStatus() ? [{ to: "edit", lab: "pr_start", cls: "primary" }] : [];
    if (st === "edit") return canStatus() ? [{ to: "review", lab: "pr_to_review", cls: "primary" }] : [];
    if (st === "review") return canJudge() ? [{ to: "approved", lab: "pr_approve", cls: "primary" }, { to: "edit", lab: "pr_send_back", note: true }] : [];
    if (st === "revise") return canStatus() ? [{ to: "edit", lab: "pr_new_version", cls: "primary" }] : [];
    if (st === "approved") return canJudge() ? [{ to: "edit", lab: "pr_reopen", note: true }] : [];
    return [];
  }
  function moveBtns(p, f, full) {
    var st = f.item.status || "todo";
    var list = moves(st).filter(function (x) { return full || x.lab !== "pr_reopen"; });
    var h = list.map(function (x) {
      return ui.btn(t(x.lab), x.note ? "pr-back" : "pr-move", { cls: "sm " + (x.cls || ""), data: { p: p.id, k: f.key, to: x.to } });
    }).join("");
    if (!h && st === "review" && canStatus()) h = '<span class="small muted">' + esc(t("pr_wait_founder")) + "</span>";
    return h;
  }

  /** Write changes into one file (hook or carousel) of a project. */
  function writeFile(pid, key, changes, log) {
    var p = m.project(pid); if (!p) return false;
    var f = m.findFile(p, key); if (!f) return false;
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
  function move(pid, key, to, note) {
    var p = m.project(pid); var f = p && m.findFile(p, key); if (!f) return;
    var from = f.item.status || "todo";
    var ok = moves(from).some(function (x) { return x.to === to; });
    if (!ok) { ui.toast(from === "review" || from === "approved" ? t("pr_founder_only") : t("pr_no_rights")); return; }
    var ch = { status: to }, msg = t("pr_moved", { s: t("s_" + to) });
    if (to === "edit" && (from === "revise" || from === "approved")) {
      ch.v = (+f.item.v || 1) + 1; msg += " · " + t("pr_new_v", { v: ch.v });
      if (from === "approved") ch.clientOk = false;
    }
    if (note != null) ch.note = note;
    if (to === "approved") ch.note = "";
    if (writeFile(pid, key, ch, t("pr_log_move", { code: f.code, s: t("s_" + to) }) + (ch.v ? " (v" + ch.v + ")" : ""))) ui.toast(msg);
  }

  function cardHTML(p, f, showProject) {
    var it = f.item, st = it.status || "todo";
    var drive = it.drive || (f.reel && f.reel.drive) || "";
    var btns = moveBtns(p, f, false);
    return '<div class="card" tabindex="0" data-a="pr-open"' + ui.attrs({ p: p.id, k: f.key }) + ">" +
      '<span class="code">' + esc(f.code) + "</span>" +
      (showProject ? '<span class="lab sm muted">' + esc(m.projectLabel(p)) + "</span>" : "") +
      '<span class="t">' + esc(fileTitle(f)) + "</span>" +
      '<span class="m">' + esc(f.angle.name) + " · " + esc(fileKind(f)) + " · v" + esc(it.v || 1) + "</span>" +
      (f.reel && f.reel.script ? '<span class="m">' + esc(excerpt(f.reel.script, 80)) + "</span>" : "") +
      (it.note && st !== "approved" ? '<span class="note small">' + esc(it.note) + "</span>" : "") +
      '<div class="row between">' + (linkHTML(drive, t("pr_drive")) || '<span class="small faint">' + esc(t("pr_no_drive")) + "</span>") +
      (st === "approved" && it.clientOk ? ui.pill(t("pr_client_ok"), "done") : "") + "</div>" +
      (btns ? '<div class="row">' + btns + "</div>" : "") +
      "</div>";
  }

  function boardHTML(projects, showProject) {
    var all = [];
    projects.forEach(function (p) { m.files(p).forEach(function (f) { all.push({ p: p, f: f }); }); });
    return '<div class="board" style="grid-auto-columns:minmax(200px,1fr)">' + COLS.map(function (c) {
      var items = all.filter(function (x) { return (x.f.item.status || "todo") === c; });
      return '<section class="col" aria-label="' + esc(t("s_" + c)) + '"><div class="col-h"><h3 class="sec">' + ui.dot(FILE_DOT[c]) + esc(t("s_" + c)) + '</h3><span class="small muted num">' + items.length + "</span></div>" +
        (items.length ? items.map(function (x) { return cardHTML(x.p, x.f, showProject); }).join("") : '<p class="empty">' + esc(t("pr_col_empty")) + "</p>") + "</section>";
    }).join("") + "</div>";
  }

  function liHTML(p, f) {
    var it = f.item;
    return '<div class="li click" tabindex="0" data-a="pr-open"' + ui.attrs({ p: p.id, k: f.key }) + ' style="flex-wrap:wrap">' +
      '<div class="stack" style="gap:3px;flex:1 1 220px"><span class="code">' + esc(f.code) + "</span><span>" + esc(fileTitle(f)) + '</span><span class="m">' +
      esc(fileKind(f)) + (it.note && it.status !== "approved" ? " · " + esc(it.note) : "") + "</span></div>" +
      '<div class="row">' + ui.filePill(it.status) + linkHTML(it.drive, t("pr_drive")) + moveBtns(p, f, false) + "</div></div>";
  }
  function reelsHTML(projects, showProject) {
    return projects.map(function (p) {
      var files = m.files(p);
      var h = '<div class="stack">';
      if (showProject) h += '<h2 class="sec">' + esc(m.projectLabel(p)) + "</h2>";
      (p.reels || []).forEach(function (r) {
        var a = (p.angles || []).find(function (x) { return x.id === r.angleId; }) || { name: "—" };
        var rf = files.filter(function (f) { return f.reel && f.reel.id === r.id; });
        var scenes = Array.isArray(r.scenes) ? r.scenes.filter(function (s) { return s && typeof s === "object"; }) : [];
        var sceneChecks = Array.isArray(r.productionScenes) ? r.productionScenes : [];
        var done = rf.filter(function (f) { return f.item.status === "approved"; }).length;
        h += '<div class="panel"><div class="panel-h"><div class="stack" style="gap:4px"><span class="row" style="gap:6px"><span class="lab sm muted">' + esc(a.name) + " · " + esc(r.mode === "I" ? t("pr_indirect") : t("pr_direct")) + '</span><span class="code">' + esc(r.format || p.format || "9x16") + "</span></span>" +
          "<strong>" + esc(r.script || "—") + "</strong></div>" +
          '<div class="row">' + (r.sourceIdeaId && S.get("ideas", r.sourceIdeaId) ? ui.btn(t("pr_source_idea"), "pr-source-idea", { cls: "ghost sm", data: { id: r.sourceIdeaId } }) : "") +
          (linkHTML(r.drive, t("pr_drive_folder")) || '<span class="small faint">' + esc(t("pr_no_drive")) + "</span>") +
          (m.can("files.edit") ? ui.btn(t("pr_set_drive"), "pr-rdrive", { cls: "ghost sm", data: { p: p.id, r: r.id } }) : "") +
          '<span class="small muted num">' + done + " / " + rf.length + "</span></div></div>" +
          (scenes.length ? '<div class="stack" style="gap:4px"><h3 class="sec">' + esc(t("pr_shot_plan")) + '</h3><div class="list">' + scenes.map(function (s, si) {
            var sid = String(s.id || "legacy-" + si), chk = sceneChecks.find(function (x) { return x && x.id === sid; });
            var sceneText = String(s.v || "").trim() || "—";
            if (s.x) sceneText += " · " + String(s.x);
            if (s.s) sceneText += " · " + s.s + " s";
            if (s.silent === true) sceneText += " · " + t("pr_silent");
            return '<label class="check"><input type="checkbox" data-c="pr-scene-check"' + ui.attrs({ p: p.id, r: r.id, id: sid, i: si }) +
              (chk && chk.done ? " checked" : "") + (m.can("files.edit") ? "" : " disabled") + "><span>" + esc(sceneText) + "</span></label>";
          }).join("") + "</div></div>" : "") +
          '<div class="list">' + rf.map(function (f) { return liHTML(p, f); }).join("") + "</div></div>";
      });
      var cars = files.filter(function (f) { return f.kind === "carousel"; });
      if (cars.length) h += '<div class="panel"><h3 class="sec">' + esc(t("pr_carousels")) + '</h3><div class="list">' + cars.map(function (f) { return liHTML(p, f); }).join("") + "</div></div>";
      return h + "</div>";
    }).join("");
  }

  function scopeLine(p) {
    var s = m.scope(p), pg = m.progress(p), pk = m.pack(p.pack);
    function part(n, tgt, lab) { return '<span class="num">' + n + " / " + tgt + "</span> " + esc(lab) + (n > tgt ? " " + ui.pill(t("pr_over")) : ""); }
    return '<p class="small" style="margin:0"><span class="lab sm">' + esc(t("pr_scope", { pack: pk.name })) + "</span> · " +
      part(s.reels, s.target.reels, t("pr_sc_reels")) + " · " + part(s.variations, s.target.variations, t("pr_sc_var")) + " · " +
      part(s.carousels, s.target.carousels, t("pr_sc_car")) + ' · <strong class="num">' + pg.done + " / " + pg.total + "</strong> " + esc(t("pr_sc_appr")) + "</p>";
  }

  GK.view("production", {
    render: function (params) {
      var list = activeProjects();
      // Older links pass {id}: treat it as the project to show, then forget it.
      if (params.id && !params.projectId) params.projectId = params.id;
      if (params.id) delete params.id;
      var sel = params.projectId ? m.project(params.projectId) : null;
      if (sel && !m.files(sel).length) sel = null;
      if (sel && !list.some(function (p) { return p.id === sel.id; })) list = list.concat([sel]);
      var mode = params.mode === "reels" ? "reels" : "board";
      var opts = [["", t("pr_all")]].concat(list.map(function (p) { return [p.id, m.projectLabel(p)]; }));
      var picker = '<div style="min-width:220px;max-width:100%">' + ui.field({ id: "pr-proj", label: t("pr_project"), type: "select", value: sel ? sel.id : "", options: opts, attrs: ' data-c="pr-proj"' }) + "</div>";
      var h = ui.head({ label: t("nav_production"), title: t("pr_title"), accent: t("pr_accent"), sub: esc(t("pr_sub")), actions: list.length ? picker : "" });
      h += GK.insight.projects("production");
      if (!list.length) return h + ui.empty(t("pr_empty"));
      var shown = sel ? [sel] : list;
      h += '<div class="row between"><div class="tabs" role="tablist">' +
        ["board", "reels"].map(function (v) { return '<button type="button" role="tab" data-a="pr-mode" data-v="' + v + '" aria-selected="' + (mode === v) + '">' + esc(t(v === "board" ? "pr_board" : "pr_reels")) + "</button>"; }).join("") +
        "</div>" + ui.sample() + "</div>";
      if (sel) {
        h += '<div class="stack" style="gap:6px">' + scopeLine(sel) + m.gates(sel).map(function (g) { return '<p class="gate" style="margin:0">' + esc(g) + "</p>"; }).join("") + "</div>";
      } else {
        h += '<div class="stack" style="gap:4px">' + list.map(function (p) {
          var pg = m.progress(p);
          return '<p class="small" style="margin:0"><button type="button" class="link" data-a="pr-pick" data-id="' + esc(p.id) + '">' + esc(m.projectLabel(p)) + "</button> · " + esc(t("st_" + p.stage)) + ' · <span class="num">' + pg.done + " / " + pg.total + "</span> " + esc(t("pr_sc_appr")) + "</p>";
        }).join("") + "</div>";
      }
      h += mode === "board" ? boardHTML(shown, !sel) : reelsHTML(shown, !sel);
      return h;
    },
    count: function () {
      var me = GK.me();
      var want = m.isFounder() ? ["review"] : (me && me.role === "editor") ? ["todo", "edit", "revise"] : null;
      if (!want) return "";
      var n = 0;
      activeProjects().forEach(function (p) { m.files(p).forEach(function (f) { if (want.indexOf(f.item.status || "todo") > -1) n++; }); });
      return n || "";
    }
  });

  function openFile(pid, key) {
    var p = m.project(pid); var f = p && m.findFile(p, key); if (!f) return;
    var it = f.item, st = it.status || "todo";
    function row(lab, val) { return '<div class="li" style="align-items:flex-start"><span class="lab sm" style="flex:none">' + esc(lab) + '</span><span style="text-align:right">' + val + "</span></div>"; }
    var body = '<span class="code">' + esc(f.code) + "</span>" +
      '<div class="row">' + ui.filePill(st) + ui.pill(t("pr_version") + " " + (it.v || 1)) + (it.clientOk ? ui.pill(t("pr_client_ok"), "done") : "") + "</div>" +
      '<div class="list">' +
      row(t("pr_project"), esc(m.projectLabel(p))) +
      row(t("pr_angle"), esc(f.angle.name) + " · " + esc(fileKind(f))) +
      row(f.kind === "carousel" ? t("pr_carousel") : t("pr_hook", { n: f.hookIndex + 1 }), esc(fileTitle(f))) +
      (f.reel ? row(t("pr_script"), esc(f.reel.script || "—")) : "") +
      (f.reel && isUrl(f.reel.drive) ? row(t("pr_drive_folder"), linkHTML(f.reel.drive, t("pr_drive"))) : "") +
      "</div>" +
      (it.note ? '<p class="note" style="margin:0">' + esc(it.note) + "</p>" : "") +
      (m.can("files.edit")
        ? ui.field({ id: "pr-drive", label: t("pr_set_drive"), value: it.drive || "", placeholder: "https://drive.google.com/…" })
        : (isUrl(it.drive) ? linkHTML(it.drive, t("pr_drive")) : '<p class="small faint" style="margin:0">' + esc(t("pr_no_drive")) + "</p>"));
    var foot = (m.can("files.edit") ? ui.btn(t("save"), "pr-save-drive", { cls: "ghost", data: { p: p.id, k: key } }) : "") +
      moves(st).map(function (x) { return ui.btn(t(x.lab), x.note ? "pr-back" : "pr-move", { cls: x.cls || "", data: { p: p.id, k: key, to: x.to } }); }).join("");
    ui.modal({ title: t("pr_file"), accent: t("pr_file_accent"), body: body, foot: foot || ui.btn(t("close"), "close", { cls: "ghost" }) });
  }

  GK.act("pr-open", function (el) { openFile(el.dataset.p, el.dataset.k); });
  GK.act("pr-link", function () { /* the browser opens the link */ });
  GK.act("pr-pick", function (el) { ui.go("production", { projectId: el.dataset.id }); });
  GK.act("pr-source-idea", function (el) { if (S.get("ideas", el.dataset.id)) ui.go("studio", { id: el.dataset.id }); });
  GK.act("pr-mode", function (el) { ui.go("production", { mode: el.dataset.v }); });
  GK.change("pr-proj", function (el) { ui.go("production", { projectId: el.value }); });
  GK.change("pr-scene-check", function (el) {
    if (!m.can("files.edit")) return ui.toast(t("pr_no_edit"));
    var p = m.project(el.dataset.p); if (!p) return;
    var reels = u.clone(Array.isArray(p.reels) ? p.reels : []);
    var r = reels.find(function (x) { return x && x.id === el.dataset.r; }); if (!r) return;
    var scenes = Array.isArray(r.scenes) ? r.scenes : [], index = +el.dataset.i;
    if (!scenes[index] || (scenes[index].id && scenes[index].id !== el.dataset.id)) return;
    var checks = Array.isArray(r.productionScenes) ? u.clone(r.productionScenes) : [];
    var item = checks.find(function (x) { return x && x.id === el.dataset.id; });
    if (item) item.done = !!el.checked;
    else checks.push({ id: el.dataset.id, done: !!el.checked });
    r.productionScenes = checks;
    S.patch("projects", p.id, { reels: reels });
  });
  GK.act("pr-move", function (el) { if (ui.modalOpen()) ui.closeModal(true); move(el.dataset.p, el.dataset.k, el.dataset.to); });
  GK.act("pr-back", function (el) {
    var p = m.project(el.dataset.p), f = p && m.findFile(p, el.dataset.k); if (!f) return;
    var reopen = (f.item.status || "todo") === "approved";
    ui.modal({
      title: reopen ? t("pr_reopen_t") : t("pr_back_title"), accent: t("pr_back_accent"), label: m.projectLabel(p),
      body: '<span class="code">' + esc(f.code) + "</span>" + (reopen ? '<p class="small muted" style="margin:0">' + esc(t("pr_reopen_hint")) + "</p>" : "") +
        ui.field({ id: "pr-note", label: t("pr_note"), type: "textarea", value: f.item.note || "", placeholder: t("pr_note_ph") }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(reopen ? t("pr_reopen") : t("pr_send_back"), "pr-do-back", { cls: "primary", data: { p: p.id, k: f.key, to: el.dataset.to } })
    });
  });
  GK.act("pr-do-back", function (el) {
    var note = u.val("pr-note").trim();
    if (!note) { u.focus("pr-note"); ui.toast(t("required")); return; }
    ui.closeModal(true); move(el.dataset.p, el.dataset.k, el.dataset.to, note);
  });
  GK.act("pr-save-drive", function (el) {
    if (!m.can("files.edit")) return ui.toast(t("pr_no_edit"));
    var v = u.val("pr-drive").trim();
    if (v && !isUrl(v)) { u.focus("pr-drive"); ui.toast(t("pr_drive_bad")); return; }
    var p = m.project(el.dataset.p), f = p && m.findFile(p, el.dataset.k); if (!f) return;
    ui.closeModal(true);
    if (writeFile(p.id, f.key, { drive: v }, t("pr_log_drive", { code: f.code }))) ui.toast(t("saved"));
  });
  GK.act("pr-rdrive", function (el) {
    var p = m.project(el.dataset.p); var r = p && (p.reels || []).find(function (x) { return x.id === el.dataset.r; }); if (!r) return;
    ui.modal({
      title: t("pr_drive_t"), accent: t("pr_drive_acc"), label: m.projectLabel(p),
      body: '<p class="small muted" style="margin:0">' + esc(r.script || "") + "</p>" + ui.field({ id: "pr-rdrive-in", label: t("pr_set_drive"), value: r.drive || "", placeholder: "https://drive.google.com/…" }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "pr-save-rdrive", { cls: "primary", data: { p: p.id, r: r.id } })
    });
  });
  GK.act("pr-save-rdrive", function (el) {
    if (!m.can("files.edit")) return ui.toast(t("pr_no_edit"));
    var v = u.val("pr-rdrive-in").trim();
    if (v && !isUrl(v)) { u.focus("pr-rdrive-in"); ui.toast(t("pr_drive_bad")); return; }
    var p = m.project(el.dataset.p); if (!p) return;
    var reels = u.clone(p.reels || []); var r = reels.find(function (x) { return x.id === el.dataset.r; }); if (!r) return;
    r.drive = v;
    ui.closeModal(true);
    S.patch("projects", p.id, { reels: reels }, { log: t("pr_log_rdrive") });
    ui.toast(t("saved"));
  });
})(window.GK);
