/* GECKO Ops · shell, router, shared components (V03 design system), event delegation.
   Modules register with GK.view(name, {render, count}) and GK.act(name, fn). See CONTRACT.md and DESIGN.md. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, esc = u.esc;
  var views = {}, actions = {}, changes = {}, inputs = {};
  var THEME_KEY = "gecko-ops-theme", VIEW_KEY = "gecko-ops-view", NAV_KEY = "gecko-ops-nav";

  GK.view = function (name, def) { views[name] = def; };
  GK.act = function (name, fn) { actions[name] = fn; };
  GK.change = function (name, fn) { changes[name] = fn; };
  /** Live typing: fires on every keystroke of [data-i="name"] (search boxes). Update only your own list container, never the whole page. */
  GK.input = function (name, fn) { inputs[name] = fn; };

  GK.i18n.add({
    ui_new: ["New", "Nouveau"], ui_view_all: ["View all", "Tout voir"], ui_vs_prev: ["vs last period", "vs période précédente"],
    ui_filter: ["Filter…", "Filtrer…"], ui_sort_by: ["Sort by {c}", "Trier par {c}"],
    ui_recommend: ["Do", "À faire"], ui_close_panel: ["Close panel", "Fermer le panneau"],
    grp_main: ["Main", "Principal"]
  });

  var UI = { state: { view: "today", params: {} } };

  // ---------- icons: one 24px line set, 1.6 stroke (CSS), follows currentColor ----------
  var ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M4 13.5 6.2 6.3A1.8 1.8 0 0 1 7.9 5h8.2a1.8 1.8 0 0 1 1.7 1.3L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    activity: '<path d="M3.5 12h3.5l2.5-6 5 12 2.5-6h3.5"/>',
    dashboard: '<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/>',
    pipeline: '<path d="M4.5 5h15l-5.5 7v5.5l-4 2V12z"/>',
    clients: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
    projects: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.5l2 2.5H18a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z"/>',
    production: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
    deliveries: '<path d="M20 4 3.5 10.5l6.5 3 3 6.5z"/><path d="m10 13.5 4-4"/>',
    studio: '<path d="M9.5 17.5h5M10.5 20.5h3"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z"/>',
    boards: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M9.5 9.5V20"/>',
    reports: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.7 3.7M16 6h2.5a2.5 2.5 0 0 1-2.7 3.7M12 13v3.5M8.5 20h7M10 16.5h4V20h-4z"/>',
    finance: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3"/><path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20h12a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 18.5 8h-12A2.5 2.5 0 0 1 4 7.5z"/><path d="M16 14h.01" stroke-width="2.4"/>',
    portal: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
    team: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 14.6c2.4-.2 4.3 1.4 4.7 4.4"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>', down: '<path d="m6 9.5 6 6 6-6"/>', back: '<path d="m14.5 6-6 6 6 6"/>', updown: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>', upc: '<path d="m6 14.5 6-6 6 6"/>',
    sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
    more: '<path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="2.6"/>', kebab: '<path d="M12 5.5h.01M12 12h.01M12 18.5h.01" stroke-width="2.6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6"/>',
    invoice: '<path d="M6.5 3.5h11v17l-2.75-1.75L12 20.5l-2.75-1.75L6.5 20.5z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>',
    lead: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01" stroke-width="2.6"/>',
    lang: '<path d="M4 6h9M8.5 4v2M6 6c.5 3.5 2.8 6 6 7.5M11 6c-.7 3.6-3.3 6.8-7 8.5M13 20l3.5-9 3.5 9M14.2 17h4.6"/>',
    sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2"/>',
    up: '<path d="M7 17 17 7M9 7h8v8"/>', dn: '<path d="M7 7l10 10M17 9v8H9"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    alert: '<path d="M10.3 4.9 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0z"/><path d="M12 10v3.5M12 16.8v.2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M13.5 3.5v5h5"/>',
    cash: '<rect x="3" y="6.5" width="18" height="11" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01" stroke-width="2.4"/>',
    sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17 10h.01M7.5 14h9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.5"/>',
    msg: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3v-3H5A1.5 1.5 0 0 1 3.5 16V7A1.5 1.5 0 0 1 5 5.5z"/>',
    filter: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>', sort: '<path d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3"/>',
    trend: '<path d="M4 16l5-5 4 4 7-7"/><path d="M15 8h5v5"/>',
    command: '<path d="M9 6.5A2.5 2.5 0 1 0 6.5 9H9zM15 6.5A2.5 2.5 0 1 1 17.5 9H15zM9 17.5A2.5 2.5 0 1 1 6.5 15H9zM15 17.5a2.5 2.5 0 1 0 2.5-2.5H15zM9 9h6v6H9z"/>',
    logout: '<path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
    swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>', edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'
  };
  ICONS.today = ICONS.home; ICONS.idea = ICONS.studio; ICONS.globe = ICONS.portal; ICONS.money = ICONS.finance; ICONS.chart = ICONS.dashboard;
  UI.ICONS = ICONS;
  /** icon(name, extraClass) -> inline SVG (24px grid, 1.6 stroke) that follows currentColor. Unknown names fall back to a dot. */
  UI.icon = function (n, cls) { return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[n] || ICONS.dot) + "</svg>"; };

  /** Sidebar groups (DESIGN.md §3). A view not listed here lands in Main. */
  UI.GROUPS = [
    { id: "main", views: ["today", "inbox", "tasks", "calendar"] },
    { id: "work", views: ["pipeline", "clients", "projects", "production", "deliveries"] },
    { id: "studio", views: ["studio", "boards", "reports"] },
    { id: "money", views: ["dashboard", "finance", "portal"] },
    { id: "team", views: ["team", "activity", "settings"] }
  ];
  UI.groupOf = function (v) { for (var i = 0; i < UI.GROUPS.length; i++) if (UI.GROUPS[i].views.indexOf(v) > -1) return UI.GROUPS[i].id; return "main"; };
  /** Remembered sidebar state: {mini: icon rail} */
  UI.navPref = function () { var p = u.lsGet(NAV_KEY, null); return p && typeof p === "object" ? { mini: !!p.mini } : { mini: false }; };
  UI.setNavPref = function (p) { u.lsSet(NAV_KEY, { mini: !!p.mini }); };
  UI.views = function () { return Object.keys(views); };
  /** Count shown next to a nav item (a view's own count()). */
  UI.viewCount = function (v) { var c = ""; try { c = views[v] && views[v].count ? views[v].count() : ""; } catch (e) {} return c; };

  // ---------- small builders (all return HTML strings) ----------
  /** data-* attributes from an object: {id:"x"} -> ' data-id="x"' */
  UI.attrs = function (o) { var s = ""; for (var k in o || {}) if (o[k] != null) s += " data-" + k + '="' + esc(o[k]) + '"'; return s; };
  /** "1,250 DT" -> 1,250<span class="u">DT</span> (the unit quieter than the number) */
  function unitHTML(v) {
    var s = String(v == null ? "" : v), mm = s.match(/^(.*?\d)(\s| )?(DT|%)$/);
    return mm ? esc(mm[1]) + '<span class="u">' + esc(mm[3]) + "</span>" : esc(s);
  }
  UI.unit = unitHTML;

  /** Page header: title (+ one Trovical accent word), one-line subtitle, actions on the right.
      o: {title, accent, sub (HTML), actions (HTML), label (eyebrow, shown only when it adds something), back:{label, a, data}} */
  UI.head = function (o) {
    var lab = o.label && o.label !== t("nav_" + UI.state.view) ? o.label : "";
    return '<header class="head"><div class="t">' +
      (o.back ? '<button type="button" class="back" data-a="' + esc(o.back.a || "") + '"' + UI.attrs(o.back.data) + ">" + UI.icon("back", "sm") + esc(o.back.label || t("back")) + "</button>" : "") +
      (lab ? '<span class="eyebrow">' + esc(lab) + "</span>" : "") +
      '<h1 class="hl">' + esc(o.title || "") + (o.accent ? " <i>" + esc(o.accent) + "</i>" : "") + "</h1>" +
      (o.sub ? '<p class="subline">' + o.sub + "</p>" : "") +
      "</div>" + (o.actions ? '<div class="actions">' + o.actions + "</div>" : "") + "</header>";
  };
  /** pill(text, tone): tones "neutral" | "chroma" | "gel" | "urgent" | "done". Legacy: "" = neutral, "wip" = chroma, "alert" = urgent. */
  UI.pill = function (text, kind) { return '<span class="pill ' + esc(kind || "") + '">' + esc(text) + "</span>"; };
  /** btn(label, action, {cls:"primary|gel|ghost|sm|icon", icon, data:{}, disabled, title}) */
  UI.btn = function (label, a, o) {
    o = o || {};
    var ic = o.icon ? UI.icon(o.icon) : "", iconOnly = /\bicon\b/.test(o.cls || "");
    return '<button type="button" class="btn ' + (o.cls || "") + '"' + (a ? ' data-a="' + esc(a) + '"' : "") + UI.attrs(o.data) +
      (o.disabled ? ' aria-disabled="true"' : "") + (o.title || iconOnly ? ' title="' + esc(o.title || label) + '"' : "") + (iconOnly ? ' aria-label="' + esc(label) + '"' : "") + ">" +
      ic + (iconOnly ? "" : esc(label)) + "</button>";
  };
  /** field({id, label, type:"text|number|date|month|select|textarea|checkbox", value, options:[[v,label]], hint, placeholder, attrs, span}) */
  UI.field = function (o) {
    var id = esc(o.id), v = o.value == null ? "" : o.value, input;
    var extra = (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : "") + (o.attrs || "");
    if (o.type === "select") {
      input = '<select id="' + id + '"' + extra + ">" + (o.options || []).map(function (op) {
        var val = Array.isArray(op) ? op[0] : op, lab = Array.isArray(op) ? op[1] : op;
        return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? " selected" : "") + ">" + esc(lab) + "</option>";
      }).join("") + "</select>";
    } else if (o.type === "textarea") {
      input = '<textarea id="' + id + '" rows="' + (o.rows || 3) + '"' + extra + ">" + esc(v) + "</textarea>";
    } else if (o.type === "checkbox") {
      return '<label class="check"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + extra + "><span>" + esc(o.label) + "</span></label>";
    } else {
      input = '<input id="' + id + '" type="' + (o.type || "text") + '" value="' + esc(v) + '"' + (o.type === "number" ? ' inputmode="decimal"' : "") + extra + ">";
    }
    return '<div class="field"' + (o.span ? ' style="grid-column:1/-1"' : "") + '><label for="' + id + '">' + esc(o.label) + "</label>" + input + (o.hint ? '<span class="hint">' + esc(o.hint) + "</span>" : "") + "</div>";
  };

  /** Micro bar chart for KPI tiles: 7 to 12 bars, the last one highlighted. */
  function microBars(values, down) {
    var v = (values || []).map(function (x) { return +x || 0; }).slice(-12);
    if (v.length < 2) return "";
    var mx = Math.max.apply(null, v.map(Math.abs)) || 1;
    return '<span class="mbars' + (down ? " down" : "") + '" aria-hidden="true">' + v.map(function (x, i) {
      return '<i class="' + (i === v.length - 1 ? "on" : "") + '" style="height:' + Math.max(8, Math.round(Math.abs(x) / mx * 100)) + '%"></i>';
    }).join("") + "</span>";
  }
  /** Delta chip. delta: number (percent) or preformatted text with tone "up"|"down". good: "up" (default) or "down" when a fall is good news. */
  UI.delta = function (delta, good, tone, icon) {
    if (delta == null || delta === "" || (typeof delta === "number" && !isFinite(delta))) return "";
    var dir, txt;
    if (typeof delta === "number") {
      var r = Math.round(delta);
      dir = r > 0 ? "up" : r < 0 ? "down" : "";
      txt = (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r) + (u.fr() ? " %" : "%");
    } else { txt = String(delta); dir = tone || ""; }
    var cls = !dir ? "" : (dir === "up") === (good !== "down") ? "up" : "down";
    return '<span class="delta ' + cls + '">' + (icon ? UI.icon(icon) : dir ? UI.icon(dir === "up" ? "up" : "dn") : "") + esc(txt) + "</span>";
  };
  /** One KPI tile. o: {label, value (formatted), delta (number % or text), deltaTone, deltaIcon, deltaLabel ("vs last month"), good ("up"|"down"), spark:[numbers], hint, icon, a (action), data} */
  UI.kpi = function (o) {
    var dl = UI.delta(o.delta, o.good, o.deltaTone, o.deltaIcon), down = / down"/.test(dl);
    var open = o.a ? '<button type="button" class="kpi click" data-a="' + esc(o.a) + '"' + UI.attrs(o.data) + ">" : '<div class="kpi">';
    var foot = dl + (o.deltaLabel ? '<span class="n">' + esc(o.deltaLabel) + "</span>" : "") + (o.hint && !o.deltaLabel ? '<span class="n">' + esc(o.hint) + "</span>" : "");
    return open + '<span class="kh">' + (o.icon ? UI.icon(o.icon) : "") + "<span>" + esc(o.label || "") + "</span></span>" +
      '<span class="kb"><span class="v">' + unitHTML(o.value) + "</span>" + microBars(o.spark, down) + "</span>" +
      (foot ? '<span class="kf">' + foot + "</span>" : "") + (o.a ? "</button>" : "</div>");
  };
  /** kpis([{lab, v, n}]) (legacy) or kpis([ui.kpi options]) -> a row of KPI tiles */
  UI.kpis = function (items) {
    return '<div class="kpis">' + (items || []).map(function (k) {
      return k.label != null ? UI.kpi(k) : UI.kpi({ label: k.lab, value: k.v, hint: k.n });
    }).join("") + "</div>";
  };
  /** meter(pct) slim bar · meter(pct, true) gel bar (legacy) · meter(pct, {segments: 32, tone: "tx"|"chroma"|"gel", label: true|"text", sm}) */
  UI.meter = function (pct, o) {
    var p = Math.max(0, Math.min(100, +pct || 0));
    if (o === true || o === "gel") o = { tone: "gel" };
    o = o || {};
    var bar, aria = ' role="img" aria-label="' + Math.round(p) + '%"';
    if (o.segments) {
      var n = Math.max(8, Math.min(48, o.segments === true ? 32 : +o.segments)), on = Math.round(p / 100 * n), s = "";
      for (var i = 0; i < n; i++) s += '<i class="' + (i < on ? "on" : "") + '"></i>';
      bar = '<div class="meter-seg ' + (o.tone || "") + (o.sm ? " sm" : "") + '"' + aria + ">" + s + "</div>";
    } else {
      bar = '<div class="meter ' + (o.tone || "") + '"' + aria + '><i style="width:' + p + '%"></i></div>';
    }
    return o.label ? '<div class="meter-row">' + bar + '<span class="mv">' + esc(typeof o.label === "string" ? o.label : u.pct(p)) + "</span></div>" : bar;
  };
  /** hero(html) or hero({label, value, unit, sub, body, actions}) -> the one gradient card per screen */
  UI.hero = function (o) {
    if (typeof o === "string") return '<section class="hero">' + o + "</section>";
    return '<section class="hero">' + (o.label ? '<span class="lbl">' + esc(o.label) + "</span>" : "") +
      (o.value != null ? '<div class="hv">' + esc(o.value) + (o.unit ? "<small>" + esc(o.unit) + "</small>" : "") + "</div>" : "") +
      (o.sub ? '<p class="hs">' + esc(o.sub) + "</p>" : "") + (o.body || "") +
      (o.actions ? '<div class="hrow"><span></span><div class="actions">' + o.actions + "</div></div>" : "") + "</section>";
  };
  /** activity({icon, text, when, who (name or member), tone:"gel"|"chroma", a, data}) -> small activity card */
  UI.activity = function (o) {
    var who = o.who && typeof o.who === "object" ? o.who.name : o.who;
    var inner = '<span class="ai">' + UI.icon(o.icon || "activity") + '</span><span class="at">' + esc(o.text || "") + '</span><span class="aw">' +
      (who ? UI.avatar(who, { size: "sm" }) : "") + esc([who, o.when].filter(Boolean).join(" · ")) + "</span>";
    return o.a ? '<button type="button" class="act ' + esc(o.tone || "") + '" data-a="' + esc(o.a) + '"' + UI.attrs(o.data) + ">" + inner + "</button>"
      : '<div class="act ' + esc(o.tone || "") + '">' + inner + "</div>";
  };
  /** decision({title, why, recommend, action:{label, a, data, cls}, icon, tone:"urgent"|"chroma"}) -> what is happening, why it matters, what to do, one button */
  UI.decision = function (o) {
    var a = o.action;
    return '<div class="dec ' + esc(o.tone || "") + '"><span class="di">' + UI.icon(o.icon || (o.tone === "urgent" ? "alert" : "sparkle")) + "</span>" +
      '<span class="dt">' + esc(o.title || "") + "</span>" + (o.why ? '<span class="dw">' + esc(o.why) + "</span>" : "") +
      (o.recommend ? '<span class="dr"><b>' + esc(t("ui_recommend")) + "</b>" + esc(o.recommend) + "</span>" : "") +
      (a ? '<span class="da">' + UI.btn(a.label, a.a, { cls: a.cls || "sm", data: a.data, disabled: a.disabled, title: a.title }) + "</span>" : "") + "</div>";
  };
  function initials(name) {
    var w = String(name || "?").trim().split(/\s+/).filter(Boolean);
    return ((w[0] || "?").charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : "")).toUpperCase();
  }
  /** avatar(name | member, {size:"sm"|"lg", tone:"gel"|"chroma"|"ink"}) -> initials disc */
  UI.avatar = function (x, o) {
    o = o || {};
    var name = x && typeof x === "object" ? x.name : x;
    return '<span class="av ' + esc((o.size || "") + " " + (o.tone || "")) + '" aria-hidden="true">' + esc(initials(name)) + "</span>";
  };
  /** avatars([names|members], max) -> stacked group */
  UI.avatars = function (list, max) {
    list = list || []; max = max || 4;
    return '<span class="avs">' + list.slice(0, max).map(function (x) { return UI.avatar(x, { size: "sm" }); }).join("") + (list.length > max ? '<span class="av sm">+' + (list.length - max) + "</span>" : "") + "</span>";
  };
  UI.av = function (name, cls) { return UI.avatar(name, { tone: cls }); };
  /** empty(text) one quiet line · empty({icon, title, text, action:{label, a, data, icon}}) a full empty state with one primary action */
  UI.empty = function (o) {
    if (o == null || typeof o === "string") return '<p class="empty">' + esc(o || t("none")) + "</p>";
    return '<div class="empty-box"><span class="ei">' + UI.icon(o.icon || "sparkle") + "</span>" + (o.title ? "<b>" + esc(o.title) + "</b>" : "") + (o.text ? "<p>" + esc(o.text) + "</p>" : "") +
      (o.action ? UI.btn(o.action.label, o.action.a, { cls: "primary sm", icon: o.action.icon || "plus", data: o.action.data }) : "") + "</div>";
  };
  /** card({title, icon, link:{label, a, data}, actions (HTML), body (HTML), cls}) -> standard card with a header row */
  UI.card = function (o) {
    var h = o.title || o.link || o.actions ? '<div class="card-h"><span class="lead">' + (o.icon ? UI.icon(o.icon) : "") + "<h2>" + esc(o.title || "") + "</h2></span>" +
      '<span class="row">' + (o.actions || "") + (o.link ? UI.btn(o.link.label || t("ui_view_all"), o.link.a, { cls: "ghost sm", data: o.link.data }) : "") + "</span></div>" : "";
    return '<section class="card ' + esc(o.cls || "") + '">' + h + (o.body || "") + "</section>";
  };

  // ---------- table: sortable headers, search box, avatar and meter cells ----------
  var tblState = {};
  /** table({id, cols:[{key, label, align:"r", html(row), value(row), sort:false}], rows, sort:{key, dir}, search: true|"placeholder", row(row) -> {a, data}, empty})
      Sorting re-renders (state kept per table id); search filters rows in place, no render. */
  UI.table = function (o) {
    var id = o.id || "t", st = tblState[id] || o.sort || {}, cols = o.cols || [], rows = (o.rows || []).slice();
    var col = cols.filter(function (c) { return c.key === st.key; })[0];
    if (col) {
      var val = col.value || function (r) { return r[col.key]; };
      rows.sort(function (a, b) { var A = val(a), B = val(b); if (A == null) A = ""; if (B == null) B = ""; return (A > B ? 1 : A < B ? -1 : 0) * (st.dir === "desc" ? -1 : 1); });
    }
    var h = "";
    if (o.search) h += '<div class="tbl-tools"><input class="in" type="search" data-i="ui-tblq" data-t="' + esc(id) + '" placeholder="' + esc(o.search === true ? t("ui_filter") : o.search) + '" aria-label="' + esc(t("search")) + '"></div>';
    h += '<div class="tbl" id="tbl-' + esc(id) + '"><table><thead><tr>' + cols.map(function (c) {
      var on = st.key === c.key, cls = c.align === "r" ? ' class="r"' : "";
      if (c.sort === false || !c.label) return "<th" + cls + ">" + esc(c.label || "") + "</th>";
      return "<th" + cls + (on ? ' aria-sort="' + (st.dir === "desc" ? "descending" : "ascending") + '"' : "") + '><button type="button" class="sort" data-a="ui-sort" data-t="' + esc(id) + '" data-k="' + esc(c.key) + '" aria-pressed="' + on + '" title="' + esc(t("ui_sort_by", { c: c.label })) + '">' + esc(c.label) + UI.icon(on ? (st.dir === "desc" ? "down" : "upc") : "updown") + "</button></th>";
    }).join("") + "</tr></thead><tbody>";
    h += rows.map(function (r) {
      var ra = o.row ? o.row(r) || {} : {}, q = cols.map(function (c) { var v = c.value ? c.value(r) : r[c.key]; return v == null ? "" : String(v); }).join(" ").toLowerCase();
      return "<tr" + (ra.a ? ' class="click" tabindex="0" data-a="' + esc(ra.a) + '"' + UI.attrs(ra.data) : "") + ' data-q="' + esc(q) + '">' + cols.map(function (c) {
        return "<td" + (c.align === "r" ? ' class="r num"' : "") + ">" + (c.html ? c.html(r) : esc(r[c.key] == null ? "" : r[c.key])) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    h += "</tbody></table>" + (rows.length ? "" : '<p class="tbl-empty">' + esc(o.empty || t("none")) + "</p>") + "</div>";
    return h;
  };
  actions["ui-sort"] = function (el) {
    var id = el.getAttribute("data-t"), k = el.getAttribute("data-k"), s = tblState[id] || {};
    tblState[id] = { key: k, dir: s.key === k && s.dir !== "desc" ? "desc" : "asc" };
    UI.render(true);
  };
  inputs["ui-tblq"] = function (el) {
    var box = document.getElementById("tbl-" + el.getAttribute("data-t")), q = el.value.trim().toLowerCase();
    if (box) box.querySelectorAll("tbody tr").forEach(function (tr) { tr.hidden = !!q && (tr.getAttribute("data-q") || "").indexOf(q) < 0; });
  };

  /** Legacy: modules used to print a "Sample" pill in their head. The sample-data notice now lives once, in the top bar. */
  UI.sample = function () { return ""; };
  /** Shared status pills */
  UI.invPill = function (i) { var s = GK.m.invStatus(i); return UI.pill(t("inv_" + s), { paid: "done", overdue: "urgent", partial: "chroma", issued: "chroma", credited: "", credit: "", draft: "" }[s]); };
  UI.stagePill = function (p) { return UI.pill(t("st_" + p.stage), p.stage === "done" ? "done" : GK.m.gates(p).length ? "urgent" : "chroma"); };
  UI.filePill = function (s) { return UI.pill(t("s_" + (s || "todo")), { approved: "done", revise: "urgent", review: "gel", edit: "chroma" }[s] || ""); };

  /** Save a text file the viewer asked for (csv, json, txt, md). On claude.ai the viewer confirms; on a website it downloads. */
  UI.download = function (filename, text) {
    var c = window.claude && window.claude.use ? window.claude.use("downloads").catch(function () { return null; }) : Promise.resolve(null);
    return c.then(function (dl) {
      if (dl) return dl.save({ filename: filename, data: new Blob([text], { type: "text/plain" }) }).then(function () { UI.toast(t("saved")); }, function (e) { if (!e || e.code !== "declined") UI.toast(t("write_failed")); });
      try { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); UI.toast(t("saved")); }
      catch (e) { u.copy(text).then(function (ok) { UI.toast(ok ? t("copied") : t("write_failed")); }); }
    });
  };

  // ---------- toast (an optional Undo button for deletes) ----------
  var toastTimer, undoFn = null;
  /** toast(msg) or toast(msg, {label, fn}) — the button runs fn once. */
  UI.toast = function (msg, undo) {
    var el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    undoFn = undo && undo.fn ? undo.fn : null;
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (undoFn ? '<button type="button" class="toast-btn" data-a="toast-undo">' + esc(undo.label || t("undo")) + "</button>" : "");
    el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; undoFn = null; }, undoFn ? 7000 : 2600);
  };

  // ---------- modal (lives outside the main render so store updates never wipe a form) ----------
  var modalReturn = null, confirmFn = null;
  /** modal({label, title, accent, body, wide, foot}) — foot is button HTML; use data-a="close" to close. The accent word is plain text here (one Trovical word per screen: the page head). */
  UI.modal = function (o) {
    UI.closeModal(true);
    modalReturn = document.activeElement;
    var root = document.createElement("div");
    root.className = "scrim"; root.id = "modal";
    root.innerHTML = '<div class="modal' + (o.wide ? " wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="row between"><div class="stack" style="gap:4px">' + (o.label ? '<span class="lbl">' + esc(o.label) + "</span>" : "") +
      '<h2 class="hl" id="modal-title">' + esc(o.title || "") + (o.accent ? " " + esc(o.accent) : "") + "</h2></div>" +
      UI.btn(t("close"), "close", { cls: "ghost icon sm", icon: "x" }) + "</div>" +
      '<div class="stack">' + (o.body || "") + "</div>" +
      (o.foot ? '<div class="modal-foot">' + o.foot + "</div>" : "") + "</div>";
    document.body.appendChild(root);
    var first = root.querySelector(".modal .stack input,.modal .stack select,.modal .stack textarea") || root.querySelector(".modal-foot .btn:not(.ghost)") || root.querySelector("button");
    if (first) first.focus();
  };
  UI.closeModal = function (silent) {
    var m = document.getElementById("modal"); if (!m) return;
    m.remove(); confirmFn = null;
    if (!silent && modalReturn && document.contains(modalReturn)) modalReturn.focus();
    if (!silent) flush();
  };
  UI.modalOpen = function () { return !!document.getElementById("modal"); };
  /** confirm(title, body, onYes, yesLabel) */
  UI.confirm = function (title, body, onYes, yesLabel) {
    UI.modal({ title: title, body: '<p class="muted">' + esc(body || "") + "</p>", foot: UI.btn(t("cancel"), "close", { cls: "ghost" }) + UI.btn(yesLabel || t("yes_do_it"), "confirm-yes", { cls: "primary" }) });
    confirmFn = onYes;
  };

  // ---------- side panel (detail of a small item: task, invoice, idea, lead) ----------
  var spReturn = null, spClose = null;
  /** sidePanel({label, title, sub (HTML), body (HTML), foot (HTML), onClose}) opens a 480px panel on the right (full screen on phone).
      Calling it again replaces the content. ui.sidePanel.close() closes it. It lives in <body>: store updates don't touch it. */
  UI.sidePanel = function (o) {
    var el = document.getElementById("sp");
    if (!el) {
      spReturn = document.activeElement;
      var sc = document.createElement("div"); sc.className = "sp-scrim"; sc.id = "sp-scrim"; sc.setAttribute("data-a", "sp-close");
      el = document.createElement("aside"); el.className = "sp"; el.id = "sp"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "sp-title");
      document.body.appendChild(sc); document.body.appendChild(el);
    }
    spClose = o.onClose || null;
    el.innerHTML = '<div class="sp-h"><div class="stack" style="gap:4px;min-width:0">' + (o.label ? '<span class="lbl">' + esc(o.label) + "</span>" : "") + '<h2 class="hl" id="sp-title">' + esc(o.title || "") + "</h2>" +
      (o.sub ? '<p class="small muted">' + o.sub + "</p>" : "") + "</div>" + UI.btn(t("ui_close_panel"), "sp-close", { cls: "ghost icon sm", icon: "x" }) + "</div>" +
      '<div class="sp-b">' + (o.body || "") + "</div>" + (o.foot ? '<div class="sp-f">' + o.foot + "</div>" : "");
    var first = el.querySelector(".sp-b input,.sp-b select,.sp-b textarea,.sp-b button") || el.querySelector("button");
    if (first) first.focus({ preventScroll: true });
    return el;
  };
  UI.sidePanel.close = function () {
    var el = document.getElementById("sp"), sc = document.getElementById("sp-scrim");
    if (!el) return;
    el.remove(); if (sc) sc.remove();
    var f = spClose; spClose = null; if (f) try { f(); } catch (e) { console.error(e); }
    if (spReturn && document.contains(spReturn)) spReturn.focus();
    flush();
  };
  UI.sidePanel.isOpen = function () { return !!document.getElementById("sp"); };
  UI.closeSidePanel = UI.sidePanel.close;
  actions["sp-close"] = function () { UI.sidePanel.close(); };

  // ---------- router ----------
  UI.go = function (view, params) {
    if (!views[view]) view = "today";
    UI.state.view = view; UI.state.drawer = false;
    if (GK.shell && GK.shell.closeAll) GK.shell.closeAll();
    if (UI.sidePanel.isOpen()) UI.sidePanel.close();
    if (params) UI.state.params[view] = Object.assign({}, UI.state.params[view] || {}, params);
    u.lsSet(VIEW_KEY, view);
    try { if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view); } catch (e) {}
    UI.render(true);
  };
  /** Params of a view (e.g. which project is open). */
  UI.p = function (view) { return UI.state.params[view || UI.state.view] || (UI.state.params[view || UI.state.view] = {}); };

  /** Views this viewer may open, in nav order. */
  function navFor(me) {
    // In the shared workspace, someone who hasn't joined the team only sees the light screens.
    var role = me ? me.role : (GK.store.backend === "shared" ? "assistant" : "founder");
    var allowed = GK.m.ROLE_NAV[role] || GK.m.ROLE_NAV.founder;
    return allowed.filter(function (v) { return views[v]; });
  }
  UI.nav = function () { return navFor(GK.me()); };

  // ---------- shell ----------
  function navItem(v) {
    var c = UI.viewCount(v), on = UI.state.view === v, label = t("nav_" + v);
    return '<button type="button" class="nv" data-a="nav" data-v="' + v + '"' + (on ? ' aria-current="page"' : "") + ' title="' + esc(label) + '">' +
      UI.icon(v) + '<span class="nl">' + esc(label) + "</span>" + (c !== "" && c != null && c !== 0 ? '<span class="cnt">' + esc(c) + "</span>" : "") + "</button>";
  }
  /** The monogram cropped to its glyph (the source file has a wide safe area). */
  UI.monogram = function () { return (GK.logo.monogram || GK.logo.wordmark).replace('viewBox="0 0 1000 1000"', 'viewBox="225 150 550 700"'); };
  function logoHTML() {
    return '<a class="logo" href="#today" data-a="nav" data-v="today" aria-label="GECKO Ops"><span class="wm">' + GK.logo.wordmark + '</span><span class="mono">' + UI.monogram() + "</span></a>";
  }
  function sideHTML(me, nav) {
    var mini = UI.navPref().mini, seen = {};
    var h = '<aside class="side" id="side" aria-label="' + esc(t("sh_menu")) + '">' +
      '<div class="side-top">' + logoHTML() +
      '<button type="button" class="ib side-tg" data-a="rail-mini" aria-pressed="' + mini + '" title="' + esc(t(mini ? "sh_expand" : "sh_collapse")) + ' ([)" aria-label="' + esc(t(mini ? "sh_expand" : "sh_collapse")) + '">' + UI.icon("sidebar") + "</button>" +
      '<button type="button" class="ib side-x" data-a="drawer" aria-label="' + esc(t("close")) + '">' + UI.icon("x") + "</button></div>";
    var creates = GK.shell && GK.shell.creates ? GK.shell.creates() : [];
    if (creates.length) h += '<div class="side-new"><button type="button" class="btn primary" data-a="sh-menu" data-m="quick" aria-haspopup="menu" aria-expanded="false" title="' + esc(t("ui_new")) + ' (N)">' + UI.icon("plus") + "<span>" + esc(t("ui_new")) + "</span></button></div>";
    h += '<nav class="side-nav" aria-label="GECKO Ops">';
    UI.GROUPS.forEach(function (g, gi) {
      var vs = g.views.filter(function (v) { return nav.indexOf(v) > -1; });
      vs.forEach(function (v) { seen[v] = 1; });
      if (gi === 0) nav.forEach(function (v) { if (!seen[v] && !UI.GROUPS.some(function (x) { return x.views.indexOf(v) > -1; })) { vs.push(v); seen[v] = 1; } });
      if (!vs.length) return;
      h += '<div class="grp" role="group" aria-label="' + esc(t("grp_" + g.id)) + '"><span class="grp-h" aria-hidden="true">' + esc(t("grp_" + g.id)) + "</span>" + vs.map(navItem).join("") + "</div>";
    });
    h += "</nav>";
    h += '<div class="side-foot"><button type="button" class="me-card" data-a="sh-menu" data-m="user" aria-haspopup="menu" aria-expanded="false" title="' + esc(me ? me.name : t("sh_user")) + '">' +
      UI.avatar(me ? me.name : "?", { tone: "gel" }) + '<span class="mt"><b>' + esc(me ? me.name : t("sh_user")) + "</b><span>" + esc(me ? t("role_" + me.role).split(" · ")[0] : (GK.store.mode === "demo" ? t("mode_demo") : "")) + "</span></span>" + UI.icon("updown", "sm") + "</button></div>";
    return h + "</aside>";
  }
  /** Phone bottom bar: 5 items + More (opens the full sidebar as a drawer). */
  function bottomHTML(nav) {
    var pick = ["today", "tasks", "inbox", "calendar", "projects"].filter(function (v) { return nav.indexOf(v) > -1; });
    nav.forEach(function (v) { if (pick.length < 5 && pick.indexOf(v) < 0) pick.push(v); });
    var inMore = pick.indexOf(UI.state.view) < 0;
    return '<nav class="bnav" aria-label="GECKO Ops">' + pick.map(function (v) {
      var c = UI.viewCount(v);
      return '<button type="button" data-a="nav" data-v="' + v + '"' + (UI.state.view === v ? ' aria-current="page"' : "") + ">" + UI.icon(v) + "<span>" + esc(t("nav_" + v)) + "</span>" + (c && v !== "today" ? '<i class="dot" aria-hidden="true"></i>' : "") + "</button>";
    }).join("") + '<button type="button" data-a="drawer" aria-label="' + esc(t("sh_menu")) + '"' + (inMore ? ' aria-current="page"' : "") + ">" + UI.icon("more") + "<span>" + esc(t("sh_more")) + "</span></button></nav>";
  }
  /** First paint: the shell's shape, so the page doesn't jump when data arrives. */
  function skeleton() {
    var bars = "";
    for (var i = 0; i < 10; i++) bars += '<i class="sk sk-nav"></i>';
    return '<div class="shell skel" aria-busy="true" aria-label="GECKO Ops"><aside class="side"><div class="side-top">' + logoHTML() + '</div><div class="stack" style="padding:8px 14px;gap:4px">' + bars + "</div></aside>" +
      '<main><div class="topbar"><i class="sk sk-top"></i></div><div class="page"><i class="sk sk-h"></i><div class="kpis"><i class="sk sk-card"></i><i class="sk sk-card"></i><i class="sk sk-card"></i><i class="sk sk-card"></i></div><i class="sk sk-block"></i></div></main></div>';
  }

  var lastView = null, scrolls = {}, deferred = false;
  var NOT_TYPING = /^(checkbox|radio|button|submit|reset|range|color|file)$/;
  function typing(el) { return !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !NOT_TYPING.test(el.type))); }
  /** Text typed in inline fields but not saved yet: kept across a re-render when the field still holds the same stored value. */
  function dirtyFields(root) {
    var out = [];
    root.querySelectorAll("input[id],textarea[id]").forEach(function (el) {
      if (typing(el) && el.value !== el.defaultValue) out.push({ id: el.id, value: el.value, was: el.defaultValue });
    });
    return out;
  }
  /** Full render. Store updates arriving while someone types are held until they leave the field. */
  UI.render = function (force) {
    var app = document.getElementById("app");
    if (!app || !GK.store.ready) return;
    if (UI.clientToken) {   // client-facing page: no team shell, no join prompt
      var cm = GK.clientMode, cae = document.activeElement;
      if (!force && cae && app.contains(cae) && typing(cae)) { deferred = true; return; }
      deferred = false;
      var winTop = window.scrollY;
      app.innerHTML = cm ? cm.render(UI.clientToken) : "";
      if (cm && cm.after) try { cm.after(app); } catch (e) { console.error(e); }
      window.scrollTo(0, winTop);
      document.title = "GECKO";
      return;
    }
    var ae = document.activeElement, sp = document.getElementById("sp");
    if (!force && ae && (app.contains(ae) || (sp && sp.contains(ae))) && typing(ae)) { deferred = true; return; }
    deferred = false;
    var dirty = dirtyFields(app);
    var me = GK.me(), nav = navFor(me);
    if (nav.indexOf(UI.state.view) < 0) UI.state.view = nav[0] || "today";
    var main = app.querySelector("main");
    if (main && lastView) scrolls[lastView] = main.scrollTop;
    var focusKey = ae && app.contains(ae) && ae.getAttribute && (ae.getAttribute("data-a") ? ae.getAttribute("data-a") + "|" + (ae.getAttribute("data-v") || ae.getAttribute("data-id") || "") : null);
    var body;
    try { body = views[UI.state.view] ? views[UI.state.view].render(UI.p()) : UI.empty(); }
    catch (e) { console.error(e); body = '<div class="err"><strong>Something broke on this screen.</strong><p class="small muted">' + esc(e && e.message) + "</p></div>"; }
    var pref = UI.navPref(), top = "";
    try { top = GK.shell ? GK.shell.top(me, UI.state.view, nav) : ""; } catch (e) { console.error(e); }
    app.innerHTML = '<div class="shell' + (pref.mini ? " mini" : "") + (UI.state.drawer ? " drawer-open" : "") + '">' + sideHTML(me, nav) + '<div class="drawer-scrim" data-a="drawer"></div><main id="main">' + top + '<div class="page" id="page">' + body + "</div></main>" + bottomHTML(nav) + "</div>";
    main = app.querySelector("main");
    if (lastView === UI.state.view) dirty.forEach(function (d) {
      var el = document.getElementById(d.id);
      if (el && app.contains(el) && typing(el) && el.defaultValue === d.was) el.value = d.value;
    });
    if (lastView === UI.state.view && scrolls[UI.state.view]) main.scrollTop = scrolls[UI.state.view];
    else main.scrollTop = 0;
    lastView = UI.state.view;
    if (focusKey) {
      var parts = focusKey.split("|");
      var sel = '[data-a="' + parts[0] + '"]' + (parts[1] ? '[data-v="' + parts[1] + '"],[data-a="' + parts[0] + '"][data-id="' + parts[1] + '"]' : "");
      try { var el = app.querySelector(sel); if (el) el.focus({ preventScroll: true }); } catch (e) {}
    }
    var v = views[UI.state.view]; if (v && v.after) try { v.after(main); } catch (e) { console.error(e); }
    if (GK.shell && GK.shell.after) try { GK.shell.after(main); } catch (e) { console.error(e); }
    document.title = t("nav_" + UI.state.view) + " · GECKO Ops";
    if (GK.store.needsJoin() && !UI.modalOpen()) joinModal();
  };
  function flush() { if (deferred) UI.render(); }

  /** Theme: "dark" (default, total black), "light" or "auto" (follows the system). */
  UI.theme = function () { var m = u.lsGet(THEME_KEY, "dark"); return m === "light" || m === "auto" ? m : "dark"; };
  function applyTheme() { document.documentElement.setAttribute("data-theme", UI.theme()); }

  // ---------- built-in flows ----------
  function startLiveModal() {
    var S = GK.store;
    UI.modal({
      title: t("start_live_q"),
      body: '<p class="muted">' + esc(S.sharedAvailable && S.viewer.canWrite !== false ? t("start_live_shared") : t("start_live_local")) + "</p>" +
        UI.field({ id: "live-name", label: t("your_name"), value: "Heni" }),
      foot: UI.btn(t("cancel"), "close", { cls: "ghost" }) + UI.btn(t("start_live"), "do-start-live", { cls: "primary" })
    });
  }
  function joinModal() {
    var free = GK.store.all("team").filter(function (m) { return !m.userId; });
    UI.modal({
      title: t("join_title"),
      body: '<p class="muted">' + esc(t("join_body")) + "</p>" +
        (free.length ? UI.field({ id: "join-claim", label: t("join"), type: "select", value: "", options: [["", "—"]].concat(free.map(function (m) { return [m.id, m.name + " · " + t("role_" + m.role)]; })) }) : "") +
        '<div class="form">' + UI.field({ id: "join-name", label: t("your_name"), value: "" }) +
        UI.field({ id: "join-role", label: t("your_role"), type: "select", value: "sales", options: GK.m.ROLES.filter(function (r) { return r !== "founder"; }).map(function (r) { return [r, t("role_" + r)]; }) }) + "</div>",
      foot: UI.btn(t("join"), "do-join", { cls: "primary" })
    });
  }

  actions["toast-undo"] = function () { var f = undoFn; undoFn = null; var el = document.getElementById("toast"); if (el) el.hidden = true; if (f) f(); };
  actions["rail-mini"] = function () { var p = UI.navPref(); p.mini = !p.mini; UI.setNavPref(p); UI.render(true); };
  actions.drawer = function () { UI.state.drawer = !UI.state.drawer; UI.render(true); var f = UI.state.drawer && document.querySelector(".side .nv[aria-current]"); if (f) f.focus(); };
  actions.nav = function (el, ev) { if (ev) ev.preventDefault(); UI.go(el.getAttribute("data-v")); };
  actions.lang = function (el) { GK.i18n.setLang(el.getAttribute("data-l")); document.documentElement.lang = GK.i18n.lang(); UI.render(true); };
  actions.theme = function (el) { u.lsSet(THEME_KEY, el.getAttribute("data-m")); applyTheme(); UI.render(true); };
  actions.close = function () { UI.closeModal(); };
  actions["confirm-yes"] = function () { var f = confirmFn; UI.closeModal(); if (f) f(); };
  actions["start-live"] = startLiveModal;
  actions["do-start-live"] = function () { var n = u.val("live-name").trim(); if (!n) return u.focus("live-name"); UI.closeModal(true); GK.store.startLive(n); UI.go("today"); };
  actions["show-demo"] = function () { GK.store.showDemo(); UI.go("today"); };
  actions["show-live"] = function () { GK.store.showLive(); UI.go("today"); };
  actions["reset-demo"] = function () { UI.confirm(t("mode_demo"), t("demo_banner"), function () { GK.store.resetDemo(); UI.toast(t("saved")); }); };
  actions["do-join"] = function () {
    var claim = u.val("join-claim"), name = u.val("join-name").trim(), role = u.val("join-role") || "sales";
    if (!claim && !name) return u.focus("join-name");
    UI.closeModal(true); GK.store.join(name, role, claim); UI.render(true);
  };
  changes.workas = function (el) { GK.store.workAs(el.value); UI.state.view = "today"; };

  // ---------- event delegation ----------
  function run(map, name, el, ev) {
    var fn = map[name];
    if (!fn) { console.warn("GECKO Ops: no handler for", name); return; }
    if (el.getAttribute("aria-disabled") === "true") { var why = el.getAttribute("title"); if (why) UI.toast(why); return; }
    try { fn(el, ev); } catch (e) { console.error(e); UI.toast(e && e.message ? e.message : "Error"); }
  }
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-a]");
    if (el) return run(actions, el.getAttribute("data-a"), el, ev);
    if (ev.target.id === "modal") UI.closeModal();
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target.closest("[data-c]");
    if (el) run(changes, el.getAttribute("data-c"), el, ev);
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target.closest && ev.target.closest("[data-i]");
    if (el) run(inputs, el.getAttribute("data-i"), el, ev);
  });
  /** Run a registered action from code, as if its button had been clicked: UI.trigger("pj-new"), UI.trigger("tk-open", {id}). */
  UI.trigger = function (name, data) {
    var el = document.createElement("button");
    for (var k in data || {}) el.setAttribute("data-" + k, data[k]);
    el.setAttribute("data-a", name);
    run(actions, name, el, null);
  };
  /** True when some module registered this action (the palette only offers what exists). */
  UI.hasAction = function (name) { return !!actions[name]; };
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (UI.modalOpen()) { if (!GK.store.needsJoin()) UI.closeModal(); return; }
      if (UI.sidePanel.isOpen()) { UI.sidePanel.close(); return; }
      if (UI.state.drawer) { actions.drawer(); return; }
    }
    // Enter on a row/card that acts like a button
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("[data-a][tabindex]")) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener("focusout", function () { setTimeout(function () { if (deferred && !typing(document.activeElement)) UI.render(); }, 0); });

  // ---------- start ----------
  UI.start = function () {
    applyTheme();
    document.documentElement.lang = GK.i18n.lang();
    var app = document.getElementById("app");
    app.innerHTML = skeleton();
    var h = (location.hash || "").replace("#", "");
    UI.clientToken = GK.clientMode && GK.clientMode.match(h);   // "#cl-<token>" opens the client-facing page instead of the app
    UI.state.view = (UI.clientToken ? "" : h) || u.lsGet(VIEW_KEY, "today");
    window.addEventListener("hashchange", function () {
      var tk = GK.clientMode && GK.clientMode.match((location.hash || "").replace("#", ""));
      if ((tk || null) !== (UI.clientToken || null)) { UI.clientToken = tk; UI.render(true); }
    });
    GK.store.onChange(function () { UI.render(); });
    GK.store.boot(function () { if (!views[UI.state.view]) UI.state.view = "today"; UI.render(true); });
  };

  GK.ui = UI;
})(window.GK);
