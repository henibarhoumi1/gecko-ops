/* GECKO Ops · module: shootday. The shoot, inside each project (Projects > Shoot tab): the project's videos in run order,
   what each video still needs (B-roll, hero shots), the shot list, and a reader that shows each script one line at a time
   (original and Darija side by side), with takes marked and lines edited on set.
   Stored on the idea: shootOrder, takes {lineIndex: "good" | "again"}, needs [{id, kind: "broll" | "hero", text, done}],
   lineLog [{at, by, line, from, to, fromD, toD}] (every change made on set). */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    sd_none: ["No script is linked to this project yet.", "Aucun script n'est lié à ce projet."],
    sd_none_how: ["Add scripts in the Scripts tab. They show up here in run order.", "Ajoutez des scripts dans l'onglet Scripts. Ils apparaissent ici dans l'ordre."],
    sd_open: ["Read", "Lire"], sd_start: ["Read with the actor", "Lire avec l'acteur"],
    sd_done_n: ["{a} of {b} lines done", "{a} lignes sur {b} faites"], sd_no_lines_s: ["No lines yet", "Pas encore de lignes"],
    sd_up: ["Move up", "Monter"], sd_down: ["Move down", "Descendre"],
    sd_line_of: ["Line {a} of {b}", "Ligne {a} sur {b}"], sd_video_of: ["Video {a} of {b}", "Vidéo {a} sur {b}"],
    sd_shot: ["Shot", "Plan"], sd_silent: ["No dialogue", "Sans dialogue"],
    sd_show_both: ["Both", "Les deux"], sd_show_orig: ["Original", "Original"], sd_show_darija: ["Darija", "Darija"],
    sd_no_darija: ["No Darija version yet", "Pas encore de version en darija"],
    sd_good: ["Good take", "Bonne prise"], sd_again: ["Again", "À refaire"],
    sd_prev: ["Back", "Retour"], sd_next: ["Next", "Suivant"], sd_close: ["Close", "Fermer"],
    sd_next_video: ["Next video", "Vidéo suivante"], sd_end: ["That's the last line of the shoot.", "C'est la dernière ligne du tournage."],
    sd_keys: ["Tap the right side or press → for the next line, the left side or ← to go back. E edits the line.", "Touchez à droite ou → pour la ligne suivante, à gauche ou ← pour revenir. E modifie la ligne."],
    sd_tab_order: ["Run order", "Ordre de passage"], sd_tab_shots: ["Shot list", "Liste des plans"], sd_tab_log: ["Changes on set", "Changements sur le plateau"],
    sd_shots_none: ["No shots planned yet. Add them under Storyboard and shots on each script.", "Aucun plan prévu. Ajoutez-les dans Storyboard et plans sur chaque script."],
    sd_no_loc: ["No location set", "Lieu non précisé"], sd_shots_done: ["{a} of {b} shots done", "{a} plans sur {b} faits"],
    sd_scene: ["Scene {n}", "Scène {n}"],
    sd_no_rights: ["Only the owner, the Client Lead and production can change the shoot.", "Seuls le fondateur, le responsable clients et la production peuvent modifier le tournage."],
    // needs
    sd_broll: ["B-roll", "B-roll"], sd_hero: ["Hero shot", "Plan héros"],
    sd_need_add: ["Add", "Ajouter"], sd_need_ph: ["What is needed, e.g. close-up of the product pour", "Ce qu'il faut, ex. gros plan du produit versé"],
    sd_needs_n: ["{a} of {b} extra shots done", "{a} plans en plus sur {b} faits"],
    // edit on set
    sd_edit: ["Edit line", "Modifier la ligne"], sd_save: ["Save change", "Enregistrer"], sd_cancel: ["Cancel", "Annuler"],
    sd_orig_l: ["Line", "Ligne"], sd_dj_l: ["Darija", "Darija"],
    sd_changed: ["Changed on set", "Modifié sur le plateau"], sd_saved: ["Line updated. The change is noted.", "Ligne mise à jour. Le changement est noté."],
    sd_log_none: ["No line has been changed on set.", "Aucune ligne modifiée sur le plateau."],
    sd_log_line: ["Line {n}", "Ligne {n}"], sd_by: ["by {n}", "par {n}"], sd_undo: ["Put back", "Rétablir"], sd_undone: ["Line put back.", "Ligne rétablie."],
    sd_kpi_date: ["Shoot date", "Date du tournage"], sd_kpi_videos: ["Videos", "Vidéos"], sd_kpi_lines: ["Lines done", "Lignes faites"], sd_kpi_extra: ["Extra shots", "Plans en plus"]
  });

  // ---------- data ----------
  function splitLines(s) { return String(s || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  /** The lines the actor says, in order: scenes first (with their shot), then the free script. src points back to where the line lives. */
  function lines(i) {
    var out = [];
    (i.scenes || []).forEach(function (s, k) {
      var x = String(s.x || "").trim(), v = String(s.v || "").trim();
      if (!x && !v) return;
      out.push({ text: s.silent ? "" : x, darija: s.silent ? "" : String(s.xd || "").trim(), shot: v, silent: !!s.silent || !x, src: { scene: k } });
    });
    var d = splitLines(i.scriptDarija);
    splitLines(i.script).forEach(function (x, k) { out.push({ text: x, darija: d[k] || "", shot: "", silent: false, src: { script: k } }); });
    var log = i.lineLog || [];
    out.forEach(function (l, n) { l.changed = log.some(function (e) { return e.line === n && e.to === l.text && (e.toD == null || e.toD === l.darija); }); });
    return out;
  }
  function allVideos(pid) {
    return S.all("ideas").filter(function (i) { return i.projectId === pid && i.stage !== "parked"; })
      .sort(function (a, b) { return (a.shootOrder == null ? 999 : a.shootOrder) - (b.shootOrder == null ? 999 : b.shootOrder) || String(a.title).localeCompare(String(b.title)); });
  }
  function videos(pid) { return allVideos(pid).filter(function (i) { return lines(i).length; }); }
  function doneCount(i, n) { var tk = i.takes || {}, c = 0; for (var k = 0; k < n; k++) if (tk[k] === "good") c++; return c; }
  function canMark() { return m.can("shoot"); }
  function meName() { var me = GK.me(); return me ? me.name : ""; }

  /** Write a changed line back to the idea and note the change. */
  function setLine(i, n, text, darija) {
    var ls = lines(i), L = ls[n]; if (!L) return false;
    text = String(text || "").trim(); darija = String(darija || "").trim();
    if (text === L.text && darija === L.darija) return false;
    var patch = {};
    if (L.src.scene != null) {
      var sc = u.clone(i.scenes || []), s = sc[L.src.scene]; s.x = text; s.xd = darija; if (text) s.silent = false; patch.scenes = sc;
    } else {
      var a = splitLines(i.script), d = splitLines(i.scriptDarija), k = L.src.script;
      a[k] = text; while (d.length < k) d.push(""); d[k] = darija;
      patch.script = a.filter(Boolean).join("\n"); patch.scriptDarija = d.join("\n").replace(/\n+$/, "");
    }
    patch.lineLog = (i.lineLog || []).concat([{ at: new Date().toISOString(), by: meName(), line: n, from: L.text, to: text, fromD: L.darija, toD: darija }]);
    S.patch("ideas", i.id, patch, { log: t("sd_changed") + ": " + (i.title || "") });
    return true;
  }

  // ---------- the Shoot tab of a project ----------
  function panel(p) {
    var all = allVideos(p.id), mode = ui.p("projects").sdMode || "order";
    var nl = 0, nd = 0, xn = 0, xd = 0;
    all.forEach(function (i) { var n = lines(i).length; nl += n; nd += doneCount(i, n); (i.needs || []).forEach(function (x) { xn++; if (x.done) xd++; }); });
    var h = '<section class="panel sd-panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_t_shoot")) + "</h2>" +
      (videos(p.id).length ? ui.btn(t("sd_start"), "sd-read", { cls: "primary", icon: "play", data: { pid: p.id, i: 0 } }) : "") + "</div>";
    h += ui.kpis([
      { lab: t("sd_kpi_date"), v: p.shootDate ? u.fmtDate(p.shootDate, { weekday: "short", day: "numeric", month: "short" }) : "—" },
      { lab: t("sd_kpi_videos"), v: String(all.length) },
      { lab: t("sd_kpi_lines"), v: nl ? nd + " / " + nl : "0" },
      { lab: t("sd_kpi_extra"), v: xn ? xd + " / " + xn : "0" }
    ]);
    if (!all.length) return h + ui.empty({ icon: "camera", title: t("sd_none"), text: t("sd_none_how") }) + "</section>";
    h += '<div class="tabs sd-tabs" role="tablist">' + [["order", "sd_tab_order"], ["shots", "sd_tab_shots"], ["log", "sd_tab_log"]].map(function (x) {
      return '<button type="button" role="tab" data-a="sd-mode" data-v="' + x[0] + '" aria-selected="' + (mode === x[0]) + '">' + esc(t(x[1])) + "</button>";
    }).join("") + "</div>";
    if (mode === "shots") h += shotList(all);
    else if (mode === "log") h += logList(all);
    else h += runOrder(p, all);
    return h + "</section>";
  }
  function runOrder(p, list) {
    var D = !canMark(), readable = videos(p.id);
    return '<ol class="sd-list">' + list.map(function (i, k) {
      var n = lines(i).length, done = doneCount(i, n), needs = i.needs || [], ri = readable.indexOf(i);
      var bar = n ? '<span class="sd-prog" aria-hidden="true"><i style="width:' + Math.round(done / n * 100) + '%"></i></span>' : "";
      return '<li class="sd-item"><div class="sd-row"><span class="sd-n">' + (k + 1) + '</span><div class="sd-meta"><strong>' + esc(i.title || "—") + "</strong>" +
        '<span class="small muted">' + esc(n ? t("sd_done_n", { a: done, b: n }) : t("sd_no_lines_s")) + (needs.length ? " · " + esc(t("sd_needs_n", { a: needs.filter(function (x) { return x.done; }).length, b: needs.length })) : "") + "</span>" + bar + "</div>" +
        '<span class="row" style="gap:6px">' +
        ui.btn(t("sd_up"), "sd-move", { cls: "ghost icon sm", icon: "mvup", data: { pid: p.id, id: i.id, d: -1 }, disabled: k === 0 || D }) +
        ui.btn(t("sd_down"), "sd-move", { cls: "ghost icon sm", icon: "mvdown", data: { pid: p.id, id: i.id, d: 1 }, disabled: k === list.length - 1 || D }) +
        (ri > -1 ? ui.btn(t("sd_open"), "sd-read", { cls: "sm", icon: "play", data: { pid: p.id, i: ri } }) : "") + "</span></div>" +
        '<div class="sd-needs">' + needs.map(function (x) {
          return '<label class="sd-need sd-k-' + esc(x.kind) + (x.done ? " is-done" : "") + '"><input type="checkbox" data-c="sd-need" data-id="' + esc(i.id) + '" data-n="' + esc(x.id) + '"' + (x.done ? " checked" : "") + (D ? " disabled" : "") + ">" +
            "<b>" + esc(t(x.kind === "hero" ? "sd_hero" : "sd_broll")) + "</b><span>" + esc(x.text) + "</span>" +
            (D ? "" : '<button type="button" class="sd-x" data-a="sd-need-del" data-id="' + esc(i.id) + '" data-n="' + esc(x.id) + '" aria-label="' + esc(t("delete")) + '">' + ui.icon("x", "sm") + "</button>") + "</label>";
        }).join("") +
        (D ? "" : '<form class="sd-add" data-id="' + esc(i.id) + '"><select class="in sm" aria-label="' + esc(t("sd_broll")) + '"><option value="broll">' + esc(t("sd_broll")) + '</option><option value="hero">' + esc(t("sd_hero")) + "</option></select>" +
          '<input class="in sm" placeholder="' + esc(t("sd_need_ph")) + '" aria-label="' + esc(t("sd_need_ph")) + '"><button type="submit" class="btn sm ghost">' + ui.icon("plus", "sm") + esc(t("sd_need_add")) + "</button></form>") +
        "</div></li>";
    }).join("") + "</ol>";
  }
  function shotList(list) {
    var all = GK.studio && GK.studio.shotsOf ? GK.studio.shotsOf(list) : [];
    if (!all.length) return ui.empty({ icon: "camera", title: t("sd_shots_none") });
    var groups = {}, order = [];
    all.forEach(function (r) { var l = String(r.shot.loc || "").trim() || t("sd_no_loc"); if (!groups[l]) { groups[l] = []; order.push(l); } groups[l].push(r); });
    var done = all.filter(function (r) { return r.shot.done; }).length, D = canMark() ? "" : " disabled";
    return '<p class="small muted">' + esc(t("sd_shots_done", { a: done, b: all.length })) + "</p>" + order.map(function (l) {
      return '<div class="sd-loc"><h3 class="lab">' + esc(l) + '</h3><div class="list">' + groups[l].map(function (r) {
        var x = r.shot, name = GK.studio.shotTypeName(x.type || "medium");
        return '<label class="li sd-shot' + (x.done ? " sd-shot-done" : "") + '"><input type="checkbox" data-c="sd-shot" data-id="' + esc(r.idea.id) + '" data-k="' + r.k + '" data-j="' + r.j + '"' + (x.done ? " checked" : "") + D + ">" +
          '<span class="stack" style="gap:2px;flex:1;min-width:0"><b>' + esc(name) + " · " + esc(x.roll === "B" ? "B-roll" : "A-roll") + "</b>" +
          '<span class="small muted">' + esc(r.idea.title || "") + " · " + esc(t("sd_scene", { n: r.k + 1 })) + (r.scene.v ? " · " + esc(r.scene.v) : "") + "</span>" +
          (x.props || x.note ? '<span class="small">' + esc([x.props, x.note].filter(Boolean).join(" · ")) + "</span>" : "") + "</span></label>";
      }).join("") + "</div></div>";
    }).join("");
  }
  function logList(list) {
    var rows = [];
    list.forEach(function (i) { (i.lineLog || []).forEach(function (e, k) { rows.push({ i: i, e: e, k: k }); }); });
    if (!rows.length) return ui.empty(t("sd_log_none"));
    rows.sort(function (a, b) { return String(b.e.at).localeCompare(String(a.e.at)); });
    return '<ul class="sd-log">' + rows.map(function (r) {
      var e = r.e, when = e.at ? u.fmtDate(e.at.slice(0, 10), { day: "numeric", month: "short" }) + " " + e.at.slice(11, 16) : "";
      return '<li><div class="small muted">' + esc(r.i.title || "") + " · " + esc(t("sd_log_line", { n: e.line + 1 })) + " · " + esc(when) + (e.by ? " · " + esc(t("sd_by", { n: e.by })) : "") + "</div>" +
        (e.from !== e.to ? '<p><del>' + esc(e.from || "—") + "</del></p><p><ins>" + esc(e.to || "—") + "</ins></p>" : "") +
        ((e.fromD || "") !== (e.toD || "") ? '<p dir="auto"><del>' + esc(e.fromD || "—") + '</del></p><p dir="auto"><ins>' + esc(e.toD || "—") + "</ins></p>" : "") +
        (canMark() ? ui.btn(t("sd_undo"), "sd-undo", { cls: "ghost sm", data: { id: r.i.id, k: r.k } }) : "") + "</li>";
    }).join("") + "</ul>";
  }

  GK.act("sd-mode", function (el) { ui.p("projects").sdMode = el.dataset.v; ui.render(true); });
  GK.change("sd-shot", function (el) {
    if (!canMark()) { el.checked = !el.checked; return ui.toast(t("sd_no_rights")); }
    var i = S.get("ideas", el.dataset.id); if (!i) return;
    var sc = u.clone(i.scenes || []), s = sc[+el.dataset.k], x = s && (s.shots || [])[+el.dataset.j]; if (!x) return;
    x.done = el.checked; S.patch("ideas", i.id, { scenes: sc }, { log: "" }); ui.render(true);
  });
  GK.change("sd-need", function (el) {
    if (!canMark()) { el.checked = !el.checked; return ui.toast(t("sd_no_rights")); }
    var i = S.get("ideas", el.dataset.id); if (!i) return;
    var ns = u.clone(i.needs || []); ns.forEach(function (x) { if (x.id === el.dataset.n) x.done = el.checked; });
    S.patch("ideas", i.id, { needs: ns }, { log: "" });
    var lab = el.closest(".sd-need"); if (lab) lab.classList.toggle("is-done", el.checked);
  });
  GK.act("sd-need-del", function (el) {
    var i = S.get("ideas", el.dataset.id); if (!i || !canMark()) return;
    S.patch("ideas", i.id, { needs: (i.needs || []).filter(function (x) { return x.id !== el.dataset.n; }) }, { log: "" }); ui.render(true);
  });
  document.addEventListener("submit", function (ev) {
    var f = ev.target.closest && ev.target.closest(".sd-add"); if (!f) return;
    ev.preventDefault();
    var i = S.get("ideas", f.dataset.id), txt = f.querySelector("input").value.trim(); if (!i || !txt || !canMark()) return;
    S.patch("ideas", i.id, { needs: (i.needs || []).concat([{ id: u.uid(), kind: f.querySelector("select").value, text: txt, done: false }]) }, { log: "" });
    ui.render(true);
    var again = document.querySelector('.sd-add[data-id="' + f.dataset.id + '"] input'); if (again) again.focus();
  });
  GK.act("sd-move", function (el) {
    if (!canMark()) return ui.toast(t("sd_no_rights"));
    var list = allVideos(el.dataset.pid), k = list.findIndex(function (x) { return x.id === el.dataset.id; }), j = k + (+el.dataset.d);
    if (k < 0 || j < 0 || j >= list.length) return;
    var tmp = list[k]; list[k] = list[j]; list[j] = tmp;
    list.forEach(function (i, n) { if (i.shootOrder !== n) S.patch("ideas", i.id, { shootOrder: n }, { log: "" }); });
    ui.render(true);
  });
  GK.act("sd-undo", function (el) {
    if (!canMark()) return;
    var i = S.get("ideas", el.dataset.id), e = i && (i.lineLog || [])[+el.dataset.k]; if (!e) return;
    if (setLine(i, e.line, e.from, e.fromD)) ui.toast(t("sd_undone"));
    ui.render(true);
  });

  // ---------- reader (an overlay that stays open while the store changes underneath) ----------
  var R = null; // { pid, vi, li, show, editing }
  function cur() { var list = videos(R.pid), i = list[R.vi]; return { list: list, idea: i, ls: i ? lines(i) : [] }; }
  function draw() {
    var box = document.getElementById("sd-reader"); if (!box || !R) return;
    var c = cur(), i = c.idea, ls = c.ls;
    if (!i) return close();
    if (R.li >= ls.length) R.li = Math.max(0, ls.length - 1);
    var L = ls[R.li] || { text: "", darija: "", shot: "" }, tk = (i.takes || {})[R.li] || "";
    var showO = R.show !== "darija", showD = R.show !== "orig";
    function say(l, cls) {
      if (!l) return "";
      if (l.silent) return '<p class="' + cls + ' sd-silent">' + esc(t("sd_silent")) + "</p>";
      var o = showO && l.text ? '<p class="' + cls + '">' + esc(l.text) + "</p>" : "";
      var d = showD ? (l.darija ? '<p class="' + cls + ' sd-dj" dir="auto">' + esc(l.darija) + "</p>" : (R.show === "darija" ? '<p class="' + cls + ' sd-silent">' + esc(t("sd_no_darija")) + "</p>" : "")) : "";
      return o + d;
    }
    var last = R.li >= ls.length - 1, lastVideo = R.vi >= c.list.length - 1, pct = ls.length ? Math.round((R.li + 1) / ls.length * 100) : 0;
    var now = R.editing
      ? '<div class="sd-edit"><label class="lab" for="sd-e-o">' + esc(t("sd_orig_l")) + '</label><textarea id="sd-e-o" class="in" rows="2">' + esc(L.text) + "</textarea>" +
        '<label class="lab" for="sd-e-d">' + esc(t("sd_dj_l")) + '</label><textarea id="sd-e-d" class="in" rows="2" dir="auto">' + esc(L.darija) + "</textarea>" +
        '<div class="row" style="gap:8px;justify-content:center"><button type="button" class="btn ghost" data-sd="cancel">' + esc(t("sd_cancel")) + '</button><button type="button" class="btn primary" data-sd="save">' + esc(t("sd_save")) + "</button></div></div>"
      : '<div class="sd-now" data-k="' + R.vi + "-" + R.li + '">' + say(L, "sd-line") + (L.changed ? '<span class="sd-tag">' + esc(t("sd_changed")) + "</span>" : "") + "</div>";
    box.innerHTML =
      '<div class="sd-meter" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      '<div class="sd-top"><div><strong>' + esc(i.title || "") + '</strong><span class="small muted"> · ' + esc(t("sd_video_of", { a: R.vi + 1, b: c.list.length })) + " · " + esc(t("sd_line_of", { a: R.li + 1, b: ls.length })) + "</span></div>" +
      '<div class="row" style="gap:6px">' + ["both", "orig", "darija"].map(function (k) {
        return '<button type="button" class="btn sm ' + (R.show === k ? "" : "ghost") + '" data-sd="show" data-v="' + k + '">' + esc(t(k === "both" ? "sd_show_both" : k === "orig" ? "sd_show_orig" : "sd_show_darija")) + "</button>";
      }).join("") + '<button type="button" class="btn sm ghost" data-sd="close">' + esc(t("sd_close")) + "</button></div></div>" +
      '<div class="sd-stage">' + (R.editing ? "" : '<button type="button" class="sd-zone sd-left" data-sd="prev" aria-label="' + esc(t("sd_prev")) + '"></button>') +
      '<div class="sd-text' + (R.editing ? " is-editing" : "") + '">' + (R.editing ? "" : say(ls[R.li - 1], "sd-dim")) +
      (L.shot ? '<p class="sd-shot"><span>' + esc(t("sd_shot")) + "</span> " + esc(L.shot) + "</p>" : "") +
      now + (R.editing ? "" : say(ls[R.li + 1], "sd-dim")) +
      (last && lastVideo && !R.editing ? '<p class="small muted">' + esc(t("sd_end")) + "</p>" : "") + "</div>" +
      (R.editing ? "" : '<button type="button" class="sd-zone sd-right" data-sd="next" aria-label="' + esc(t("sd_next")) + '"></button>') + "</div>" +
      '<div class="sd-bar"><button type="button" class="btn" data-sd="prev"' + (R.editing ? " disabled" : "") + ">" + esc(t("sd_prev")) + "</button>" +
      '<span class="row" style="gap:8px">' + (canMark() && !L.silent ? '<button type="button" class="btn ghost" data-sd="edit"' + (R.editing ? " disabled" : "") + ">" + ui.icon("edit", "sm") + esc(t("sd_edit")) + "</button>" : "") +
      '<button type="button" class="btn ' + (tk === "again" ? "sd-on-again" : "ghost") + '" data-sd="take" data-v="again">' + esc(t("sd_again")) + "</button>" +
      '<button type="button" class="btn ' + (tk === "good" ? "sd-on-good" : "ghost") + '" data-sd="take" data-v="good">' + esc(t("sd_good")) + "</button></span>" +
      (last && !lastVideo ? '<button type="button" class="btn primary" data-sd="nextvideo">' + esc(t("sd_next_video")) + "</button>"
        : '<button type="button" class="btn primary" data-sd="next"' + (R.editing ? " disabled" : "") + ">" + esc(t("sd_next")) + "</button>") + "</div>" +
      '<p class="sd-keys small muted">' + esc(t("sd_keys")) + "</p>";
    var now2 = box.querySelector(".sd-now");
    if (now2 && R.dir) { now2.classList.add(R.dir > 0 ? "in-fwd" : "in-back"); R.dir = 0; }
    if (R.editing) { var ta = box.querySelector("#sd-e-o"); if (ta) { ta.focus(); ta.select(); } }
  }
  function step(d) {
    var c = cur(); if (!c.idea || R.editing) return;
    var n = R.li + d;
    if (n >= c.ls.length) { if (R.vi < c.list.length - 1) { R.vi++; R.li = 0; } else return; }
    else if (n < 0) { if (R.vi > 0) { R.vi--; R.li = Math.max(0, lines(c.list[R.vi]).length - 1); } else return; }
    else R.li = n;
    R.dir = d; draw();
  }
  function take(v) {
    if (!canMark()) return ui.toast(t("sd_no_rights"));
    var i = cur().idea; if (!i) return;
    var tk = Object.assign({}, i.takes || {});
    if (tk[R.li] === v) delete tk[R.li]; else tk[R.li] = v;
    S.patch("ideas", i.id, { takes: tk }, { log: "" });
    if (v === "good" && tk[R.li] === "good") step(1); else draw();
  }
  function saveEdit() {
    var box = document.getElementById("sd-reader"), i = cur().idea; if (!box || !i) return;
    var o = box.querySelector("#sd-e-o").value, d = box.querySelector("#sd-e-d").value;
    R.editing = false;
    if (setLine(i, R.li, o, d)) ui.toast(t("sd_saved"));
    draw();
  }
  function open(pid, vi) {
    R = { pid: pid, vi: vi || 0, li: 0, show: ui.p("projects").sdShow || "both", editing: false };
    var box = document.getElementById("sd-reader");
    if (!box) {
      box = document.createElement("div"); box.id = "sd-reader"; box.className = "sd-reader"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      document.body.appendChild(box);
      box.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-sd]"); if (!b || b.disabled) return;
        var a = b.dataset.sd;
        if (a === "next") step(1); else if (a === "prev") step(-1); else if (a === "close") close();
        else if (a === "show") { R.show = ui.p("projects").sdShow = b.dataset.v; draw(); }
        else if (a === "take") take(b.dataset.v);
        else if (a === "nextvideo") { R.vi++; R.li = 0; R.dir = 1; draw(); }
        else if (a === "edit") { if (canMark()) { R.editing = true; draw(); } }
        else if (a === "cancel") { R.editing = false; draw(); }
        else if (a === "save") saveEdit();
      });
      var x0 = null;
      box.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
      box.addEventListener("touchend", function (ev) { if (x0 == null || R.editing) return; var dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); });
    }
    document.documentElement.classList.add("sd-lock");
    draw();
  }
  function close() {
    R = null;
    var box = document.getElementById("sd-reader"); if (box) box.remove();
    document.documentElement.classList.remove("sd-lock");
    if (ui.state.view === "projects") ui.render(true);
  }
  document.addEventListener("keydown", function (ev) {
    if (!R) return;
    if (R.editing) {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); R.editing = false; draw(); }
      else if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); saveEdit(); }
      return;
    }
    if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "PageDown") { ev.preventDefault(); step(1); }
    else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); step(-1); }
    else if ((ev.key === "e" || ev.key === "E") && canMark()) { ev.preventDefault(); R.editing = true; draw(); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); }
  }, true);
  GK.act("sd-read", function (el) { open(el.dataset.pid, +el.dataset.i || 0); });
  GK.shootday = { lines: lines, videos: videos, open: open, panel: panel, setLine: setLine };

  var css = document.createElement("style"); css.id = "gk-shootday-css";
  css.textContent =
    ".sd-tabs{margin-top:var(--sp-4)}" +
    ".sd-list{list-style:none;margin:var(--sp-4) 0 0;padding:0;display:flex;flex-direction:column;gap:var(--sp-3)}" +
    ".sd-item{border:1px solid var(--line);padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3)}.enter .sd-item{animation:sdIn .35s cubic-bezier(.2,.7,.2,1) both}" +
    ".sd-item:nth-child(2){animation-delay:.04s}.sd-item:nth-child(3){animation-delay:.08s}.sd-item:nth-child(n+4){animation-delay:.12s}" +
    ".sd-row{display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap}.sd-meta{flex:1;min-width:180px;display:flex;flex-direction:column;gap:4px}" +
    ".sd-n{width:36px;height:36px;display:grid;place-items:center;background:var(--chroma);color:var(--b-ink);font-weight:700;font-family:var(--f-type)}" +
    ".sd-prog{display:block;height:3px;background:var(--line);max-width:240px}.sd-prog i{display:block;height:100%;background:var(--tx);transition:width .4s ease}" +
    ".sd-needs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-left:52px}" +
    ".sd-need{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 8px;border:1px solid var(--line);font-size:13px;cursor:pointer;transition:opacity .2s}" +
    ".sd-need b{font-family:var(--f-type);font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:1px 5px}" +
    ".sd-k-broll b{background:var(--gel);color:var(--b-ink)}.sd-k-hero b{background:var(--chroma);color:var(--b-ink)}" +
    ".sd-need.is-done{opacity:.55}.sd-need.is-done span{text-decoration:line-through}" +
    ".sd-x{all:unset;cursor:pointer;display:grid;place-items:center;width:18px;height:18px;opacity:.5}.sd-x:hover{opacity:1}" +
    ".sd-add{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}.sd-add .in{width:auto}.sd-add input.in{min-width:200px;flex:1}" +
    ".sd-loc{margin-top:var(--sp-4)}" +
    ".sd-log{list-style:none;margin:var(--sp-4) 0 0;padding:0;display:flex;flex-direction:column;gap:var(--sp-3)}.sd-log li{border-left:3px solid var(--chroma);padding:var(--sp-2) var(--sp-4)}" +
    ".sd-log p{margin:4px 0}.sd-log del{opacity:.55}.sd-log ins{text-decoration:none;background:var(--gel);color:var(--b-ink);padding:0 3px}" +
    "@media (max-width:600px){.sd-needs{padding-left:0}}" +
    "html.sd-lock,html.sd-lock body{overflow:hidden}" +
    ".sd-reader{position:fixed;inset:0;z-index:10000;background:var(--bg);color:var(--tx);display:flex;flex-direction:column;padding:var(--sp-4) var(--sp-6);gap:var(--sp-4);animation:sdFade .25s ease both}" +
    ".sd-meter{position:absolute;top:0;left:0;right:0;height:4px;background:var(--line)}.sd-meter i{display:block;height:100%;background:var(--chroma);transition:width .35s ease}" +
    ".sd-top{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap}" +
    ".sd-stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-height:0}" +
    ".sd-zone{all:unset;position:absolute;top:0;bottom:0;width:30%;cursor:pointer;z-index:1}.sd-left{left:0}.sd-right{right:0}" +
    ".sd-text{position:relative;z-index:2;pointer-events:none;max-width:1100px;width:100%;text-align:center;display:flex;flex-direction:column;gap:var(--sp-4)}.sd-text.is-editing{pointer-events:auto}" +
    ".sd-line{margin:0;font-size:clamp(28px,5vw,64px);line-height:1.2;font-weight:600;letter-spacing:-.02em}" +
    ".sd-line.sd-dj{opacity:.7}" +
    ".sd-now{display:flex;flex-direction:column;gap:var(--sp-4);align-items:center}.sd-now.in-fwd{animation:sdFwd .3s cubic-bezier(.2,.7,.2,1) both}.sd-now.in-back{animation:sdBack .3s cubic-bezier(.2,.7,.2,1) both}" +
    ".sd-tag{font-family:var(--f-type);font-size:12px;letter-spacing:.06em;text-transform:uppercase;background:var(--gel);color:var(--b-ink);padding:2px 8px}" +
    ".sd-dim{margin:0;font-size:clamp(15px,1.8vw,22px);opacity:.45}" +
    ".sd-silent{opacity:.5}" +
    ".sd-edit{display:flex;flex-direction:column;gap:8px;text-align:left;max-width:760px;width:100%;margin:0 auto}.sd-edit textarea{font-size:22px;line-height:1.35}" +
    ".sd-shot{margin:0;font-size:15px}.sd-shot span{font-weight:700}" +
    ".sd-bar{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap}" +
    ".sd-on-good{background:var(--chroma);color:var(--b-ink)}.sd-on-again{background:var(--gel);color:var(--b-ink)}" +
    ".sd-keys{text-align:center;margin:0}label.sd-shot{cursor:pointer;gap:12px;align-items:flex-start}label.sd-shot input{margin-top:3px}.sd-shot-done b{text-decoration:line-through;opacity:.55}" +
    "@keyframes sdIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes sdFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes sdFwd{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}@keyframes sdBack{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.sd-item,.sd-reader,.sd-now{animation:none!important}}" +
    "@media (max-width:600px){.sd-reader{padding:var(--sp-3)}.sd-keys{display:none}.sd-bar .btn{flex:1}}";
  document.head.appendChild(css);
})(window.GK);
