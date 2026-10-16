/* GECKO Ops · module: shootday. The director's page on set: the day's videos in run order, and a reader that shows
   each script one line at a time (original and Darija side by side), with takes marked as they happen.
   Data: ideas linked to projects shooting that day (project.shootDate) or with their own idea.shootDate.
   Stored on the idea: shootOrder (number), takes {lineIndex: "good" | "again"}, scenes[].xd and scriptDarija (Darija text). */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    nav_shootday: ["Shoot day", "Jour de tournage"],
    sd_title: ["Shoot day", "Jour de tournage"],
    sd_sub: ["Everything for the set in one place: the videos in order, each script line by line for the actor, and the takes as you go.", "Tout pour le plateau au même endroit : les vidéos dans l'ordre, chaque script ligne par ligne pour l'acteur, et les prises au fur et à mesure."],
    sd_day: ["Day", "Jour"], sd_next_days: ["Next shoot days", "Prochains tournages"],
    sd_none: ["No video is planned for this day.", "Aucune vidéo prévue ce jour-là."],
    sd_none_how: ["Give a project a shoot date, then link its scripts to the project in Ideas and scripts. They show up here in order.", "Donnez une date de tournage à un projet, puis liez ses scripts au projet dans Idées et scripts. Ils apparaissent ici dans l'ordre."],
    sd_open: ["Read with the actor", "Lire avec l'acteur"], sd_start: ["Start the first video", "Commencer la première vidéo"],
    sd_lines: ["{n} lines", "{n} lignes"], sd_done_n: ["{a} of {b} lines done", "{a} lignes sur {b} faites"],
    sd_up: ["Move up", "Monter"], sd_down: ["Move down", "Descendre"],
    sd_no_lines: ["This script has no lines yet.", "Ce script n'a pas encore de lignes."],
    sd_line_of: ["Line {a} of {b}", "Ligne {a} sur {b}"], sd_video_of: ["Video {a} of {b}", "Vidéo {a} sur {b}"],
    sd_shot: ["Shot", "Plan"], sd_silent: ["No dialogue", "Sans dialogue"],
    sd_show_both: ["Both", "Les deux"], sd_show_orig: ["Original", "Original"], sd_show_darija: ["Darija", "Darija"],
    sd_no_darija: ["No Darija version yet", "Pas encore de version en darija"],
    sd_good: ["Good take", "Bonne prise"], sd_again: ["Again", "À refaire"],
    sd_prev: ["Back", "Retour"], sd_next: ["Next", "Suivant"], sd_close: ["Close", "Fermer"],
    sd_next_video: ["Next video", "Vidéo suivante"], sd_end: ["That's the last line of the day.", "C'est la dernière ligne de la journée."],
    sd_keys: ["Tap the right side or press → for the next line, the left side or ← to go back.", "Touchez à droite ou appuyez sur → pour la ligne suivante, à gauche ou ← pour revenir."],
    sd_reset: ["Clear takes", "Effacer les prises"], sd_reset_q: ["Clear the takes of this video?", "Effacer les prises de cette vidéo ?"],
    sd_reset_body: ["The script stays. Only the good and again marks are removed.", "Le script reste. Seules les marques bonne prise et à refaire sont retirées."],
    sd_no_rights: ["Only the owner, the Client Lead and production can mark takes.", "Seuls le fondateur, le responsable clients et la production peuvent marquer les prises."]
  });

  // ---------- data ----------
  function splitLines(s) { return String(s || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  /** The lines the actor says, in order: scenes first (with their shot), then the free script. */
  function lines(i) {
    var out = [];
    (i.scenes || []).forEach(function (s) {
      var x = String(s.x || "").trim(), v = String(s.v || "").trim();
      if (!x && !v) return;
      out.push({ text: s.silent ? "" : x, darija: s.silent ? "" : String(s.xd || "").trim(), shot: v, silent: !!s.silent || !x });
    });
    var d = splitLines(i.scriptDarija);
    splitLines(i.script).forEach(function (x, k) { out.push({ text: x, darija: d[k] || "", shot: "", silent: false }); });
    return out;
  }
  function dayOf(i) {
    if (i.shootDate) return i.shootDate;
    var p = i.projectId && m.project(i.projectId);
    return p && p.shootDate || "";
  }
  function videos(day) {
    return S.all("ideas").filter(function (i) { return i.stage !== "parked" && dayOf(i) === day && lines(i).length; })
      .sort(function (a, b) { return (a.shootOrder == null ? 999 : a.shootOrder) - (b.shootOrder == null ? 999 : b.shootOrder) || String(a.title).localeCompare(String(b.title)); });
  }
  function days() {
    var set = {};
    S.all("ideas").forEach(function (i) { var d = dayOf(i); if (d && i.stage !== "parked" && lines(i).length) set[d] = 1; });
    return Object.keys(set).sort();
  }
  function defaultDay() {
    var td = u.today(), ds = days();
    return ds.filter(function (d) { return d >= td; })[0] || ds[ds.length - 1] || td;
  }
  function doneCount(i, n) { var tk = i.takes || {}, c = 0; for (var k = 0; k < n; k++) if (tk[k] === "good") c++; return c; }
  function canMark() { return m.can("shoot"); }

  // ---------- page ----------
  GK.view("shootday", {
    render: function () {
      var p = ui.p("shootday"), day = p.day || (p.day = defaultDay()), list = videos(day);
      var picker = '<label class="lab sm" for="sd-day">' + esc(t("sd_day")) + '</label><input id="sd-day" class="in inline" type="date" value="' + esc(day) + '" data-c="sd-day">';
      var h = ui.head({ title: t("sd_title"), sub: esc(t("sd_sub")), actions: picker + (list.length ? ui.btn(t("sd_start"), "sd-read", { cls: "primary", icon: "play", data: { i: 0 } }) : "") });
      var up = days().filter(function (d) { return d >= u.today() && d !== day; }).slice(0, 6);
      if (up.length) h += '<div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">' + esc(t("sd_next_days")) + "</span>" +
        up.map(function (d) { return ui.btn(u.fmtDate(d, { weekday: "short", day: "numeric", month: "short" }), "sd-goday", { cls: "ghost sm", data: { d: d } }); }).join("") + "</div>";
      if (!list.length) return h + ui.empty({ icon: "calendar", title: t("sd_none"), text: t("sd_none_how") });
      h += '<ol class="sd-list">' + list.map(function (i, k) {
        var n = lines(i).length, done = doneCount(i, n), pr = i.projectId && m.project(i.projectId);
        return '<li class="card sd-item"><span class="sd-n num">' + (k + 1) + '</span><div class="sd-meta"><strong>' + esc(i.title || "—") + "</strong>" +
          '<span class="small muted">' + esc(pr ? m.projectLabel(pr) : m.brand(i.clientId)) + " · " + esc(t("sd_done_n", { a: done, b: n })) + "</span></div>" +
          '<span class="row" style="gap:6px">' +
          ui.btn(t("sd_up"), "sd-move", { cls: "ghost icon sm", icon: "mvup", data: { id: i.id, d: -1 }, disabled: k === 0 || !canMark() }) +
          ui.btn(t("sd_down"), "sd-move", { cls: "ghost icon sm", icon: "mvdown", data: { id: i.id, d: 1 }, disabled: k === list.length - 1 || !canMark() }) +
          ui.btn(t("sd_open"), "sd-read", { cls: "sm", data: { i: k } }) + "</span></li>";
      }).join("") + "</ol>";
      return h;
    }
  });
  GK.change("sd-day", function (el) { if (el.value) { ui.p("shootday").day = el.value; ui.render(true); } });
  GK.act("sd-goday", function (el) { ui.p("shootday").day = el.dataset.d; ui.render(true); });
  GK.act("sd-move", function (el) {
    if (!canMark()) return ui.toast(t("sd_no_rights"));
    var list = videos(ui.p("shootday").day), k = list.findIndex(function (x) { return x.id === el.dataset.id; }), j = k + (+el.dataset.d);
    if (k < 0 || j < 0 || j >= list.length) return;
    var tmp = list[k]; list[k] = list[j]; list[j] = tmp;
    list.forEach(function (i, n) { if (i.shootOrder !== n) S.patch("ideas", i.id, { shootOrder: n }, { log: "" }); });
    ui.render(true);
  });

  // ---------- reader (an overlay that stays open while the store changes underneath) ----------
  var R = null; // { day, vi, li, show }
  function cur() { var list = videos(R.day), i = list[R.vi]; return { list: list, idea: i, ls: i ? lines(i) : [] }; }
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
    var last = R.li >= ls.length - 1, lastVideo = R.vi >= c.list.length - 1;
    box.innerHTML =
      '<div class="sd-top"><div><strong>' + esc(i.title || "") + '</strong><span class="small muted"> · ' + esc(t("sd_video_of", { a: R.vi + 1, b: c.list.length })) + " · " + esc(t("sd_line_of", { a: R.li + 1, b: ls.length })) + "</span></div>" +
      '<div class="row" style="gap:6px">' + ["both", "orig", "darija"].map(function (k) {
        return '<button type="button" class="btn sm ' + (R.show === k ? "" : "ghost") + '" data-sd="show" data-v="' + k + '">' + esc(t(k === "both" ? "sd_show_both" : k === "orig" ? "sd_show_orig" : "sd_show_darija")) + "</button>";
      }).join("") + '<button type="button" class="btn sm ghost" data-sd="close">' + esc(t("sd_close")) + "</button></div></div>" +
      '<div class="sd-stage"><button type="button" class="sd-zone sd-left" data-sd="prev" aria-label="' + esc(t("sd_prev")) + '"></button>' +
      '<div class="sd-text">' + say(ls[R.li - 1], "sd-dim") +
      (L.shot ? '<p class="sd-shot"><span>' + esc(t("sd_shot")) + "</span> " + esc(L.shot) + "</p>" : "") +
      '<div class="sd-now">' + say(L, "sd-line") + "</div>" + say(ls[R.li + 1], "sd-dim") +
      (last && lastVideo ? '<p class="small muted">' + esc(t("sd_end")) + "</p>" : "") + "</div>" +
      '<button type="button" class="sd-zone sd-right" data-sd="next" aria-label="' + esc(t("sd_next")) + '"></button></div>' +
      '<div class="sd-bar"><button type="button" class="btn" data-sd="prev">' + esc(t("sd_prev")) + "</button>" +
      '<span class="row" style="gap:8px"><button type="button" class="btn ' + (tk === "again" ? "sd-on-again" : "ghost") + '" data-sd="take" data-v="again">' + esc(t("sd_again")) + "</button>" +
      '<button type="button" class="btn ' + (tk === "good" ? "sd-on-good" : "ghost") + '" data-sd="take" data-v="good">' + esc(t("sd_good")) + "</button></span>" +
      (last && !lastVideo ? '<button type="button" class="btn primary" data-sd="nextvideo">' + esc(t("sd_next_video")) + "</button>"
        : '<button type="button" class="btn primary" data-sd="next">' + esc(t("sd_next")) + "</button>") + "</div>" +
      '<p class="sd-keys small muted">' + esc(t("sd_keys")) + "</p>";
  }
  function step(d) {
    var c = cur(); if (!c.idea) return;
    var n = R.li + d;
    if (n >= c.ls.length) { if (R.vi < c.list.length - 1) { R.vi++; R.li = 0; } }
    else if (n < 0) { if (R.vi > 0) { R.vi--; R.li = Math.max(0, lines(c.list[R.vi]).length - 1); } }
    else R.li = n;
    draw();
  }
  function take(v) {
    if (!canMark()) return ui.toast(t("sd_no_rights"));
    var i = cur().idea; if (!i) return;
    var tk = Object.assign({}, i.takes || {});
    if (tk[R.li] === v) delete tk[R.li]; else tk[R.li] = v;
    S.patch("ideas", i.id, { takes: tk }, { log: "" });
    if (v === "good" && tk[R.li] === "good") step(1); else draw();
  }
  function open(vi) {
    R = { day: ui.p("shootday").day || defaultDay(), vi: vi || 0, li: 0, show: ui.p("shootday").show || "both" };
    var box = document.getElementById("sd-reader");
    if (!box) {
      box = document.createElement("div"); box.id = "sd-reader"; box.className = "sd-reader"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      document.body.appendChild(box);
      box.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-sd]"); if (!b) return;
        var a = b.dataset.sd;
        if (a === "next") step(1); else if (a === "prev") step(-1); else if (a === "close") close();
        else if (a === "show") { R.show = ui.p("shootday").show = b.dataset.v; draw(); }
        else if (a === "take") take(b.dataset.v);
        else if (a === "nextvideo") { R.vi++; R.li = 0; draw(); }
      });
      var x0 = null;
      box.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
      box.addEventListener("touchend", function (ev) { if (x0 == null) return; var dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); });
    }
    document.documentElement.classList.add("sd-lock");
    draw();
  }
  function close() {
    R = null;
    var box = document.getElementById("sd-reader"); if (box) box.remove();
    document.documentElement.classList.remove("sd-lock");
    if (ui.state.view === "shootday") ui.render(true);
  }
  document.addEventListener("keydown", function (ev) {
    if (!R) return;
    if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "PageDown") { ev.preventDefault(); step(1); }
    else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); step(-1); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); }
  }, true);
  GK.act("sd-read", function (el) { open(+el.dataset.i || 0); });
  GK.shootday = { lines: lines, videos: videos, open: open };

  var css = document.createElement("style"); css.id = "gk-shootday-css";
  css.textContent =
    ".sd-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--sp-3)}" +
    ".sd-item{display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap}.sd-meta{flex:1;min-width:180px;display:flex;flex-direction:column;gap:2px}" +
    ".sd-n{width:32px;height:32px;border-radius:var(--r-pill);display:grid;place-items:center;background:var(--s3);font-weight:600}" +
    "html.sd-lock,html.sd-lock body{overflow:hidden}" +
    ".sd-reader{position:fixed;inset:0;z-index:10000;background:var(--bg);color:var(--tx);display:flex;flex-direction:column;padding:var(--sp-4) var(--sp-6);gap:var(--sp-4)}" +
    ".sd-top{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap}" +
    ".sd-stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-height:0}" +
    ".sd-zone{all:unset;position:absolute;top:0;bottom:0;width:30%;cursor:pointer;z-index:1}.sd-left{left:0}.sd-right{right:0}" +
    ".sd-text{position:relative;z-index:2;pointer-events:none;max-width:1100px;width:100%;text-align:center;display:flex;flex-direction:column;gap:var(--sp-4)}" +
    ".sd-line{margin:0;font-size:clamp(28px,5vw,64px);line-height:1.2;font-weight:500}" +
    ".sd-line.sd-dj{color:var(--tx-2)}" +
    ".sd-now{display:flex;flex-direction:column;gap:var(--sp-4)}" +
    ".sd-dim{margin:0;font-size:clamp(15px,1.8vw,22px);color:var(--tx-3)}" +
    ".sd-silent{font-style:normal;color:var(--tx-3)}" +
    ".sd-shot{margin:0;color:var(--tx-2);font-size:15px}.sd-shot span{font-weight:600;color:var(--tx)}" +
    ".sd-bar{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap}" +
    ".sd-on-good{background:var(--chroma);color:var(--on-chroma)}.sd-on-again{background:var(--gel-soft);color:var(--tx)}" +
    ".sd-keys{text-align:center;margin:0}" +
    "@media (max-width:600px){.sd-reader{padding:var(--sp-3)}.sd-keys{display:none}.sd-bar .btn{flex:1}}";
  document.head.appendChild(css);
})(window.GK);
