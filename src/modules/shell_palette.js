/* GECKO Ops · shell: command palette (Cmd/Ctrl K), keyboard shortcuts and their help sheet.
   The palette searches clients, projects, invoices, ideas, tasks, leads, team and whiteboards, and runs actions
   (create, go to any view, language, theme, sidebar). It lives in <body>; store updates never close it. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var SH = GK.shell;

  GK.i18n.add({
    sh_p_ph: ["Search or type a command…", "Rechercher ou taper une commande…"], sh_p_none: ["No match. Try a brand, an invoice number or a view.", "Aucun résultat. Essayez une marque, un numéro de facture ou une vue."],
    sh_p_create: ["Create", "Créer"], sh_p_go: ["Go to", "Aller à"], sh_p_prefs: ["Preferences", "Préférences"],
    sh_p_clients: ["Clients", "Clients"], sh_p_projects: ["Projects", "Projets"], sh_p_invoices: ["Invoices", "Factures"], sh_p_ideas: ["Ideas", "Idées"],
    sh_p_tasks: ["Tasks", "Tâches"], sh_p_leads: ["Leads", "Prospects"], sh_p_team: ["Team", "Équipe"], sh_p_boards: ["Whiteboards", "Tableaux blancs"],
    sh_p_nav: ["navigate", "naviguer"], sh_p_open: ["open", "ouvrir"], sh_p_close: ["close", "fermer"],
    sh_p_lang: ["Switch to French", "Passer en anglais"], sh_p_dark: ["Dark theme", "Thème sombre"], sh_p_light: ["Light theme", "Thème clair"], sh_p_auto: ["Theme follows the system", "Thème selon le système"],
    sh_p_rail: ["Collapse or expand the sidebar", "Replier ou déplier le menu"], sh_p_help: ["Keyboard shortcuts", "Raccourcis clavier"],
    sh_p_sample: ["Use local workspace", "Utiliser l'espace local"], sh_p_live: ["Show live data", "Voir les vraies données"],
    sh_p_due: ["due {d}", "pour le {d}"], sh_p_done: ["done", "faite"],
    // help sheet
    sh_k_title: ["Keyboard shortcuts", "Raccourcis clavier"], sh_k_general: ["General", "Général"], sh_k_go: ["Go to", "Aller à"],
    sh_k_palette: ["Search and commands", "Recherche et commandes"], sh_k_new: ["Create something", "Créer quelque chose"], sh_k_help: ["This sheet", "Cette page"],
    sh_k_rail: ["Collapse the sidebar", "Replier le menu"], sh_k_esc: ["Close a menu, panel or window", "Fermer un menu, panneau ou fenêtre"],
    sh_k_then: ["then", "puis"]
  });

  var GO = [["h", "today"], ["t", "tasks"], ["c", "calendar"], ["l", "pipeline"], ["k", "clients"], ["p", "projects"], ["r", "production"], ["d", "deliveries"], ["s", "studio"], ["w", "boards"], ["f", "finance"], ["m", "team"], [",", "settings"]];

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  /** 0 = no match; higher is better */
  function score(hay, q) {
    if (!q) return 1;
    var h = norm(hay), i = h.indexOf(q);
    if (i < 0) { var words = q.split(/\s+/).filter(Boolean); return words.length > 1 && words.every(function (w) { return h.indexOf(w) > -1; }) ? 2 : 0; }
    return i === 0 ? 10 : /[\s·\-_/(]/.test(h.charAt(i - 1)) ? 6 : 3;
  }
  function hi(text, q) {
    var s = String(text || ""); if (!q) return esc(s);
    var i = norm(s).indexOf(q); if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + q.length)) + "</mark>" + esc(s.slice(i + q.length));
  }

  /** Everything the palette can offer, for this viewer. [{g, icon, title, sub, hay, run}] */
  function sources(q) {
    var nav = SH.navNow(), has = function (v) { return nav.indexOf(v) > -1; }, out = [];
    function add(g, icon, title, sub, run, extra) { out.push({ g: g, icon: icon, title: title, sub: sub || "", hay: title + " " + (sub || "") + " " + (extra || ""), run: run }); }
    if (q) {
      if (has("clients")) S.all("clients").forEach(function (c) { add("sh_p_clients", "clients", c.brand || "—", [c.contact, c.sector].filter(Boolean).join(" · "), function () { ui.go("clients", { id: c.id }); }, c.code); });
      if (has("projects")) S.all("projects").forEach(function (p) { add("sh_p_projects", "projects", m.projectLabel(p), t("st_" + p.stage), function () { ui.go("projects", { id: p.id }); }, p.name); });
      if (has("finance")) S.all("invoices").forEach(function (i) { add("sh_p_invoices", "invoice", (i.no || t("inv_draft")) + " · " + m.brand(i.clientId), u.money(m.invTotal ? m.invTotal(i) : i.amount) + " · " + t("inv_" + m.invStatus(i)), function () { ui.go("finance", { tab: "invoices", invoiceId: i.id }); }, i.label); });
      if (has("studio")) S.all("ideas").forEach(function (x) { add("sh_p_ideas", "studio", x.title || "—", [x.hook, x.clientId ? m.brand(x.clientId) : ""].filter(Boolean).join(" · "), function () { ui.go("studio", { id: x.id }); }, (x.tags || []).join(" ")); });
      if (has("tasks")) S.all("tasks").forEach(function (x) { var w = m.member(x.who); add("sh_p_tasks", "tasks", x.title || "—", [w && w.name, x.done ? t("sh_p_done") : x.due ? t("sh_p_due", { d: u.fmtDate(x.due) }) : ""].filter(Boolean).join(" · "), function () { ui.go("tasks", { open: x.id }); }); });
      if (has("pipeline")) S.all("leads").forEach(function (l) { add("sh_p_leads", "lead", l.brand || "—", [l.contact, t("ls_" + l.stage)].filter(Boolean).join(" · "), function () { ui.go("pipeline", { id: l.id }); }, l.handle); });
      if (has("team")) S.all("team").forEach(function (p) { add("sh_p_team", "user", p.name, t("role_" + p.role), function () { ui.go("team", { tab: "people" }); }); });
      if (has("boards")) S.all("boards").forEach(function (b) { add("sh_p_boards", "boards", b.title || "—", b.clientId ? m.brand(b.clientId) : "", function () { ui.go("boards", { id: b.id }); }); });
    }
    SH.creates().forEach(function (c) { add("sh_p_create", "plus", c.label, "", c.run); });
    nav.forEach(function (v) {
      var k = GO.filter(function (g) { return g[1] === v; })[0];
      out.push({ g: "sh_p_go", icon: v, title: t("nav_" + v), sub: "", hay: t("nav_" + v) + " " + v, key: k ? "G " + k[0].toUpperCase() : "", run: function () { ui.go(v); } });
    });
    var fr = GK.i18n.lang() === "fr", th = ui.theme();
    add("sh_p_prefs", "lang", t("sh_p_lang"), "", function () { ui.trigger("lang", { l: fr ? "en" : "fr" }); }, "language langue english francais");
    if (th !== "dark") add("sh_p_prefs", "moon", t("sh_p_dark"), "", function () { ui.trigger("theme", { m: "dark" }); }, "theme dark noir sombre");
    if (th !== "light") add("sh_p_prefs", "sun", t("sh_p_light"), "", function () { ui.trigger("theme", { m: "light" }); }, "theme light clair");
    if (th !== "auto") add("sh_p_prefs", "theme", t("sh_p_auto"), "", function () { ui.trigger("theme", { m: "auto" }); }, "theme auto system systeme");
    add("sh_p_prefs", "sidebar", t("sh_p_rail"), "", function () { ui.trigger("rail-mini"); }, "sidebar menu rail");
    if (S.mode === "demo" && S.hasLive()) add("sh_p_prefs", "swap", t("sh_p_live"), "", function () { ui.trigger("show-live"); }, "live");
    if (S.mode !== "demo") add("sh_p_prefs", "swap", t("sh_p_sample"), "", function () { ui.trigger("show-demo"); }, "local workspace");
    add("sh_p_prefs", "keyboard", t("sh_p_help"), "", function () { SH.help(); }, "help aide shortcuts raccourcis keyboard clavier");
    return out;
  }
  var ORDER = ["sh_p_clients", "sh_p_projects", "sh_p_invoices", "sh_p_leads", "sh_p_ideas", "sh_p_tasks", "sh_p_boards", "sh_p_team", "sh_p_create", "sh_p_go", "sh_p_prefs"];

  var pal = null, results = [], sel = 0, palReturn = null;
  function compute(qRaw) {
    var q = norm(qRaw).trim(), all = sources(q), groups = {};
    all.forEach(function (it) { var s = score(it.hay, q); if (s) { it.s = s; (groups[it.g] = groups[it.g] || []).push(it); } });
    results = [];
    ORDER.forEach(function (g) {
      var list = groups[g]; if (!list) return;
      if (q) list.sort(function (a, b) { return b.s - a.s; });
      var cap = !q ? (g === "sh_p_go" ? 20 : 8) : g === "sh_p_go" || g === "sh_p_prefs" || g === "sh_p_create" ? 4 : 6;
      list.slice(0, cap).forEach(function (it) { results.push(it); });
    });
    sel = 0;
    return q;
  }
  function draw(q) {
    var box = pal.querySelector(".pal-r"), h = "", last = "";
    if (!results.length) { box.innerHTML = '<p class="pal-empty">' + esc(t("sh_p_none")) + "</p>"; return; }
    results.forEach(function (it, ix) {
      if (it.g !== last) { h += '<div class="pal-g" role="presentation">' + esc(t(it.g)) + "</div>"; last = it.g; }
      h += '<div class="pal-i" role="option" id="pal-o' + ix + '" data-ix="' + ix + '" aria-selected="' + (ix === sel) + '"><span class="pic">' + ui.icon(it.icon) + '</span><span class="pt"><b>' + hi(it.title, q) + "</b>" +
        (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</span>" + (it.key ? '<span class="pk"><kbd>' + esc(it.key) + "</kbd></span>" : "") + "</div>";
    });
    box.innerHTML = h;
    pal.querySelector("input").setAttribute("aria-activedescendant", "pal-o" + sel);
  }
  function move(d) {
    if (!results.length) return;
    sel = (sel + d + results.length) % results.length;
    pal.querySelectorAll(".pal-i").forEach(function (el) { el.setAttribute("aria-selected", String(+el.getAttribute("data-ix") === sel)); });
    var on = pal.querySelector('.pal-i[data-ix="' + sel + '"]'); if (on) on.scrollIntoView({ block: "nearest" });
    pal.querySelector("input").setAttribute("aria-activedescendant", "pal-o" + sel);
  }
  function runSel(ix) {
    var it = results[ix == null ? sel : ix]; if (!it) return;
    SH.closePalette(true);
    try { it.run(); } catch (e) { console.error(e); }
  }
  SH.closePalette = function (noFocus) {
    if (!pal) return;
    pal.remove(); pal = null;
    if (!noFocus && palReturn && document.contains(palReturn)) palReturn.focus();
  };
  SH.paletteOpen = function () { return !!pal; };
  /** Open the command palette, optionally with a query. */
  SH.palette = function (q) {
    if (SH.closeAll) SH.closeAll();
    if (pal) { pal.querySelector("input").focus(); return; }
    palReturn = document.activeElement;
    pal = document.createElement("div");
    pal.className = "scrim pal"; pal.id = "sh-pal";
    pal.innerHTML = '<div class="pal-box" role="dialog" aria-modal="true" aria-label="' + esc(t("sh_search_short")) + '"><div class="pal-in">' + ui.icon("search") +
      '<input type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="' + esc(t("sh_p_ph")) + '" value="' + esc(q || "") + '"><kbd>Esc</kbd></div>' +
      '<div class="pal-r" id="pal-list" role="listbox"></div>' +
      '<div class="pal-f"><span><kbd>↑</kbd><kbd>↓</kbd> ' + esc(t("sh_p_nav")) + "</span><span><kbd>↵</kbd> " + esc(t("sh_p_open")) + "</span><span><kbd>Esc</kbd> " + esc(t("sh_p_close")) + "</span></div></div>";
    document.body.appendChild(pal);
    var input = pal.querySelector("input");
    draw(compute(input.value));
    input.focus(); input.select();
    input.addEventListener("input", function () { draw(compute(input.value)); });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); move(1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); move(-1); }
      else if (ev.key === "Enter") { ev.preventDefault(); runSel(); }
      else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); SH.closePalette(); }
      else if (ev.key === "Tab") ev.preventDefault();
    });
    pal.addEventListener("mousedown", function (ev) { if (ev.target === pal) { ev.preventDefault(); SH.closePalette(); } });
    pal.addEventListener("click", function (ev) { var it = ev.target.closest(".pal-i"); if (it) runSel(+it.getAttribute("data-ix")); });
    pal.addEventListener("mousemove", function (ev) { var it = ev.target.closest(".pal-i"); if (it && +it.getAttribute("data-ix") !== sel) { sel = +it.getAttribute("data-ix"); move(0); } });
  };

  /** The keyboard sheet (opened with "?"). */
  SH.help = function () {
    function k() { return Array.prototype.map.call(arguments, function (x) { return "<kbd>" + esc(x) + "</kbd>"; }).join(""); }
    var then = ' <span class="small faint">' + esc(t("sh_k_then")) + "</span> ";
    var nav = SH.navNow();
    var rows = '<dl class="hk"><dt class="hk-g">' + esc(t("sh_k_general")) + "</dt><dd></dd>" +
      "<dt>" + esc(t("sh_k_palette")) + "</dt><dd>" + k(SH.mod, "K") + " " + k("/") + "</dd>" +
      "<dt>" + esc(t("sh_k_new")) + "</dt><dd>" + k("N") + "</dd>" +
      "<dt>" + esc(t("sh_k_rail")) + "</dt><dd>" + k("[") + "</dd>" +
      "<dt>" + esc(t("sh_k_help")) + "</dt><dd>" + k("?") + "</dd>" +
      "<dt>" + esc(t("sh_k_esc")) + "</dt><dd>" + k("Esc") + "</dd>" +
      '<dt class="hk-g">' + esc(t("sh_k_go")) + "</dt><dd></dd>" +
      GO.filter(function (g) { return nav.indexOf(g[1]) > -1; }).map(function (g) { return "<dt>" + esc(t("nav_" + g[1])) + "</dt><dd>" + k("G") + then + k(g[0].toUpperCase()) + "</dd>"; }).join("") + "</dl>";
    ui.modal({ title: t("sh_k_title"), body: rows });
  };

  // ---------- global shortcuts ----------
  var gPending = 0;
  function typingIn(el) { return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
  document.addEventListener("keydown", function (ev) {
    if (ui.clientToken) return;
    var k = ev.key;
    if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && (k === "k" || k === "K")) { ev.preventDefault(); if (pal) SH.closePalette(); else SH.palette(""); return; }
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.defaultPrevented) return;
    if (pal || ui.modalOpen() || typingIn(ev.target) || (SH.menuOpen && SH.menuOpen())) return;
    if (ui.state.view === "boards" && ui.p("boards").id) return;   // the whiteboard editor owns single-key shortcuts
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      var hit = GO.filter(function (g) { return g[0] === k.toLowerCase(); })[0];
      if (hit && SH.navNow().indexOf(hit[1]) > -1) { ev.preventDefault(); ui.go(hit[1]); }
      return;
    }
    if (k === "/") { ev.preventDefault(); SH.palette(""); }
    else if (k === "?") { ev.preventDefault(); SH.help(); }
    else if (k === "g" || k === "G") { gPending = Date.now(); }
    else if (k === "n" || k === "N") { var a = document.querySelector('.topbar [data-a="sh-menu"][data-m="quick"]'); if (a) { ev.preventDefault(); SH.menu("quick", a); } }
    else if (k === "[") { ev.preventDefault(); ui.trigger("rail-mini"); }
  });
})(window.GK);
