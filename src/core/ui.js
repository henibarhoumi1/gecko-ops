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
    grp_main: ["Main", "Principal"],
    au_kick: ["Gecko · sign in", "Gecko · connexion"], au_in_t: ["Welcome back", "Bon retour"], au_in_p: ["Team and clients sign in here with their own email.", "L'équipe et les clients se connectent ici avec leur propre e-mail."],
    au_up_t: ["Create your account", "Créer votre compte"], au_up_p: ["Use the email your invite was sent to.", "Utilisez l'e-mail qui a reçu l'invitation."],
    au_email: ["Email", "E-mail"], au_pass: ["Password", "Mot de passe"], au_pass_h: ["8 characters or more", "8 caractères ou plus"], au_name: ["Your name", "Votre nom"],
    au_signin: ["Sign in", "Se connecter"], au_signup: ["Create account", "Créer le compte"], au_to_up: ["New here? Create an account", "Nouveau ? Créer un compte"], au_to_in: ["Already have an account? Sign in", "Déjà un compte ? Se connecter"],
    au_invite_on: ["You have an invite. Sign in or create an account with the email it was sent to.", "Vous avez une invitation. Connectez-vous ou créez un compte avec l'e-mail qui l'a reçue."],
    au_load: ["Opening your workspace", "Ouverture de votre espace"],
    au_none_t: ["One more step", "Encore une étape"], au_none_p: ["Paste the invite code Gecko sent you. It works for team members and for clients.", "Collez le code d'invitation envoyé par Gecko. Il marche pour l'équipe et pour les clients."],
    au_code: ["Invite code", "Code d'invitation"], au_join: ["Join", "Rejoindre"], au_out: ["Sign out", "Se déconnecter"],
    au_first_t: ["Setting up Gecko for the first time?", "Première installation de Gecko ?"], au_first_p: ["The first account creates the workspace and becomes its founder. After that, people join by invite only.", "Le premier compte crée l'espace et en devient le fondateur. Ensuite, on rejoint uniquement sur invitation."],
    au_create: ["Create the Gecko workspace", "Créer l'espace Gecko"],
    au_e_exists: ["Gecko's workspace already exists. Ask the founder for an invite.", "L'espace Gecko existe déjà. Demandez une invitation au fondateur."],
    au_e_invite: ["This code doesn't work for this email, or it has expired. Ask for a new one.", "Ce code ne marche pas pour cet e-mail, ou il a expiré. Demandez-en un nouveau."],
    au_e_login: ["Wrong email or password.", "E-mail ou mot de passe incorrect."], au_e_confirm: ["Confirm your email first: open the link we sent you, then sign in.", "Confirmez d'abord votre e-mail : ouvrez le lien envoyé, puis connectez-vous."],
    au_confirm: ["Check your email to confirm the account, then sign in.", "Vérifiez votre e-mail pour confirmer le compte, puis connectez-vous."],
    inv_body: ["Send this link to {e}. They open it, create an account with that email, and they're in.", "Envoyez ce lien à {e}. La personne l'ouvre, crée un compte avec cet e-mail, et elle est dedans."],
    inv_note: ["It works once, only for that email. You won't see it again, so copy it now.", "Il marche une fois, seulement pour cet e-mail. Il ne s'affichera plus, copiez-le maintenant."],
    inv_copy: ["Copy link", "Copier le lien"],
    au_client_bar: ["Signed in as {e}", "Connecté en tant que {e}"]
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
  ICONS.today = ICONS.home; ICONS.guide = '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'; ICONS.docs = ICONS.file || ICONS.dot; ICONS.idea = ICONS.studio; ICONS.globe = ICONS.portal; ICONS.money = ICONS.finance; ICONS.chart = ICONS.dashboard; ICONS.shootday = ICONS.camera; ICONS.play = '<path d="M8 5.5v13l10.5-6.5z"/>'; ICONS.mvdown = '<path d="M12 5v14M6 13l6 6 6-6"/>'; ICONS.mvup = '<path d="M12 19V5M6 11l6-6 6 6"/>'; ICONS.edit = '<path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/>'; ICONS.megaphone = '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>'; ICONS.marketing = ICONS.megaphone;
  UI.ICONS = ICONS;
  /** icon(name, extraClass) -> inline SVG (24px grid, 1.6 stroke) that follows currentColor. Unknown names fall back to a dot. */
  UI.icon = function (n, cls) { return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[n] || ICONS.dot) + "</svg>"; };

  /** Sidebar groups (DESIGN.md §3). A view not listed here lands in Main. */
  UI.GROUPS = [
    { id: "main", views: ["today", "tasks", "guide", "calendar"] },
    { id: "sales", views: ["pipeline", "marketing", "clients"] },
    { id: "prod", views: ["projects", "studio", "production", "deliveries", "boards", "reports"] },
    { id: "ceo", views: ["finance", "dashboard"] },
    { id: "team", views: ["team", "docs", "activity", "settings"] }
  ];
  /** The sidebar stays at seven items. Other screens open as tabs at the top of their parent. */
  UI.TOP = ["today", "pipeline", "clients", "projects", "calendar", "finance", "team"];
  UI.NAV_PARENT = { tasks: "today", guide: "today", marketing: "pipeline", studio: "projects", production: "projects", deliveries: "projects", boards: "projects", reports: "projects", dashboard: "finance", docs: "team", activity: "team", settings: "team" };
  /** The parent a view sits under for this viewer; a view whose parent this role can't open stands on its own. */
  UI.parentOf = function (v, nav) { var p = UI.NAV_PARENT[v]; return p && (!nav || nav.indexOf(p) > -1) ? p : null; };
  UI.groupOf = function (v) { for (var i = 0; i < UI.GROUPS.length; i++) if (UI.GROUPS[i].views.indexOf(v) > -1) return UI.GROUPS[i].id; return "main"; };
  /** Remembered sidebar state: {mini: icon rail} */
  UI.navPref = function () { var p = u.lsGet(NAV_KEY, null); return p && typeof p === "object" ? { mini: !!p.mini } : { mini: false }; };
  UI.setNavPref = function (p) { u.lsSet(NAV_KEY, { mini: !!p.mini }); };
  UI.views = function () { return Object.keys(views); };
  /** Count shown next to a nav item (a view's own count()). */
  UI.viewCount = function (v) { var c = ""; try { c = views[v] && views[v].count ? views[v].count() : ""; } catch (e) {} return c; };

  // ---------- solid palette: avatars, KPI badges, count pills, category chips (DESIGN.md §2) ----------
  /** Rotating highlight palette: blue, pink, yellow, green, work (black). Text: #000 on blue/pink/yellow, #F7F6F2 on green and black. */
  var PALETTE = [
    { bg: "var(--c-blue)", fg: "var(--on-green)", bd: "transparent" },
    { bg: "var(--c-pink)", fg: "var(--on-hi)", bd: "transparent" },
    { bg: "var(--c-yellow)", fg: "var(--on-hi)", bd: "transparent" },
    { bg: "var(--c-green)", fg: "var(--on-green)", bd: "transparent" },
    { bg: "var(--c-work)", fg: "var(--on-green)", bd: "var(--line-2)" }
  ];
  /** tint(key) -> {bg, fg, bd}. A string (name, category value) is hashed, so it keeps its colour; a number is a position, taken mod 5. */
  UI.tint = function (key) {
    var n = 0;
    if (typeof key === "number") n = Math.abs(Math.floor(key));
    else { var s = String(key == null ? "" : key); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 4294967296; }
    return PALETTE[n % PALETTE.length];
  };
  /** Inline style for a solid tint: background, text and border. */
  function tintStyle(tn) { return ' style="background:' + tn.bg + ";color:" + tn.fg + ";border-color:" + tn.bd + '"'; }
  /** chip(text, key) -> small solid category chip; colour by hash of key (default: the text). */
  UI.chip = function (text, key) { return '<span class="chip"' + tintStyle(UI.tint(key == null ? text : key)) + ">" + esc(text == null ? "" : text) + "</span>"; };

  // ---------- small builders (all return HTML strings) ----------
  /** data-* attributes from an object: {id:"x"} -> ' data-id="x"' */
  UI.attrs = function (o) { var s = ""; for (var k in o || {}) if (o[k] != null) s += " data-" + k + '="' + esc(o[k]) + '"'; return s; };
  /** "1,250 TND" -> 1,250<span class="u">TND</span> (the unit quieter than the number) */
  function unitHTML(v) {
    var s = String(v == null ? "" : v), mm = s.match(/^(.*?\d)(\s| )?(TND|DT|%|€|\$)$/);
    return mm ? esc(mm[1]) + '<span class="u">' + esc(mm[3]) + "</span>" : esc(s);
  }
  UI.unit = unitHTML;

  /** Page header: title (+ an accent word, set in the same font), one-line subtitle, actions on the right.
      o: {title, accent, sub (HTML), actions (HTML), label (eyebrow, shown only when it adds something), back:{label, a, data}} */
  UI.head = function (o) {
    var lab = o.label && o.label !== t("nav_" + UI.state.view) ? o.label : "";
    var help = GK.guide && GK.guide.hasHelp(UI.state.view)
      ? UI.btn(t("guide_help"), "guide-help", { cls: "ghost icon sm", icon: "help", data: { v: UI.state.view } }) : "";
    var actions = (o.actions || "") + help;
    return '<header class="head"><div class="t">' +
      (o.back ? '<button type="button" class="back" data-a="' + esc(o.back.a || "") + '"' + UI.attrs(o.back.data) + ">" + UI.icon("back", "sm") + esc(o.back.label || t("back")) + "</button>" : "") +
      (lab ? '<span class="eyebrow">' + esc(lab) + "</span>" : "") +
      '<h1 class="hl">' + esc(o.title || "") + (o.accent ? " <i>" + esc(o.accent) + "</i>" : "") + "</h1>" +
      (o.sub ? '<p class="subline">' + o.sub + "</p>" : "") +
      "</div>" + (actions ? '<div class="actions">' + actions + "</div>" : "") + "</header>";
  };
  /** pill(text, tone): tones "neutral" | "chroma" | "gel" | "urgent" | "done" | "blue" | "pink" | "yellow" | "green" (status, solid chip). Category dots: "dot-blue" etc. Legacy: "" = neutral, "wip" = chroma, "alert" = urgent. */
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
  function microBars(values, bg) {
    var v = (values || []).map(function (x) { return +x || 0; }).slice(-12);
    if (v.length < 2) return "";
    var mx = Math.max.apply(null, v.map(Math.abs)) || 1;
    return '<span class="mbars" aria-hidden="true">' + v.map(function (x, i) {
      var on = i === v.length - 1;
      return '<i class="' + (on ? "on" : "") + '" style="height:' + Math.max(8, Math.round(Math.abs(x) / mx * 100)) + "%" + (on ? ";background:" + bg : "") + '"></i>';
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
  /** One KPI tile. o: {label, value (formatted), delta (number % or text), deltaTone, deltaIcon, deltaLabel ("vs last month"), good ("up"|"down"), spark:[numbers], hint, icon, tint (palette position, 0 = blue), a (action), data} */
  UI.kpi = function (o) {
    var dl = UI.delta(o.delta, o.good, o.deltaTone, o.deltaIcon), tn = UI.tint(o.tint == null ? 0 : o.tint);
    var open = o.a ? '<button type="button" class="kpi click" data-a="' + esc(o.a) + '"' + UI.attrs(o.data) + ">" : '<div class="kpi">';
    var foot = dl + (o.deltaLabel ? '<span class="n">' + esc(o.deltaLabel) + "</span>" : "") + (o.hint && !o.deltaLabel ? '<span class="n">' + esc(o.hint) + "</span>" : "");
    var badge = o.icon ? '<span class="kbadge"' + tintStyle(tn) + ">" + UI.icon(o.icon) + "</span>" : "";
    return open + '<span class="kh">' + badge + "<span>" + esc(o.label || "") + "</span></span>" +
      '<span class="kb"><span class="v">' + unitHTML(o.value) + "</span>" + microBars(o.spark, tn.bg) + "</span>" +
      (foot ? '<span class="kf">' + foot + "</span>" : "") + (o.a ? "</button>" : "</div>");
  };
  /** kpis([{lab, v, n}]) (legacy) or kpis([ui.kpi options]) -> a row of KPI tiles */
  UI.kpis = function (items) {
    return '<div class="kpis">' + (items || []).map(function (k, i) {
      var tint = k.tint == null ? i : k.tint;
      return k.label != null ? UI.kpi(Object.assign({}, k, { tint: tint })) : UI.kpi({ label: k.lab, value: k.v, hint: k.n, tint: tint });
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
  /** avatar(name | member, {size:"sm"|"lg"}) -> initials disc, solid palette fill chosen by a hash of the name (tone is ignored, kept for old calls) */
  UI.avatar = function (x, o) {
    o = o || {};
    var name = x && typeof x === "object" ? x.name : x;
    var ph = GK.photos && GK.photos[String(name || "").trim().split(/\s+/)[0]];
    if (ph) return '<span class="av ph ' + esc(o.size || "") + '" aria-hidden="true"><img src="' + ph + '" alt=""></span>';
    return '<span class="av ' + esc(o.size || "") + '"' + tintStyle(UI.tint(name)) + ' aria-hidden="true">' + esc(initials(name)) + "</span>";
  };
  /** avatars([names|members], max) -> stacked group */
  UI.avatars = function (list, max) {
    list = list || []; max = max || 4;
    return '<span class="avs">' + list.slice(0, max).map(function (x) { return UI.avatar(x, { size: "sm" }); }).join("") + (list.length > max ? '<span class="av sm">+' + (list.length - max) + "</span>" : "") + "</span>";
  };
  UI.av = function (name) { return UI.avatar(name); };
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
  /** Project stage: one dot colour per stage. Blocked by a gate shows urgent; closed shows green. */
  var STAGE_DOT = { onboarding: "", scripting: "dot-yellow", pre_production: "dot-yellow", shoot: "dot-pink", editing: "dot-blue", client_review: "dot-gel", revisions: "dot-gel", delivered: "dot-chroma", paid: "dot-work", retention: "" };
  UI.STAGE_DOT = STAGE_DOT;
  UI.stagePill = function (p) { return UI.pill(t("st_" + p.stage), p.stage === "retention" ? "green" : GK.m.gates(p).length ? "urgent" : STAGE_DOT[p.stage] || ""); };
  /** Small coloured swatch for column headers. cls: a dot-* class. */
  UI.dot = function (cls) { return '<i class="sd ' + esc(cls || "") + '" aria-hidden="true"></i>'; };
  UI.filePill = function (s) { return UI.pill(t("s_" + (s || "todo")), { approved: "green", revise: "urgent", review: "yellow", edit: "blue" }[s] || ""); };

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
    var c = UI.viewCount(v), on = UI.state.view === v || UI.parentOf(UI.state.view, UI.nav()) === v, label = t("nav_" + v), gid = UI.groupOf(v), gi = 0;
    UI.GROUPS.forEach(function (g, i) { if (g.id === gid) gi = i; });
    return '<button type="button" class="nv" data-a="nav" data-v="' + v + '"' + (on ? ' aria-current="page"' : "") + ' title="' + esc(label) + '">' +
      UI.icon(v) + '<span class="nl">' + esc(label) + "</span>" + (c !== "" && c != null && c !== 0 ? '<span class="cnt"' + tintStyle(UI.tint(gi)) + ">" + esc(c) + "</span>" : "") + "</button>";
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
    var flat = UI.TOP.filter(function (v) { return nav.indexOf(v) > -1; });
    nav.forEach(function (v) { if (flat.indexOf(v) < 0 && !UI.parentOf(v, nav)) flat.push(v); });
    h += '<div class="grp">' + flat.map(navItem).join("") + "</div>";
    h += "</nav>";
    h += '<div class="side-foot"><button type="button" class="me-card" data-a="sh-menu" data-m="user" aria-haspopup="menu" aria-expanded="false" title="' + esc(me ? me.name : t("sh_user")) + '">' +
      UI.avatar(me ? me.name : "?", { tone: "gel" }) + '<span class="mt"><b>' + esc(me ? me.name : t("sh_user")) + "</b><span>" + esc(me ? t("role_" + me.role).split(" · ")[0] : "") + "</span></span>" + UI.icon("updown", "sm") + "</button></div>";
    return h + "</aside>";
  }
  /** Phone bottom bar: 5 items + More (opens the full sidebar as a drawer). */
  function bottomHTML(nav) {
    var pick = ["today", "pipeline", "projects", "calendar"].filter(function (v) { return nav.indexOf(v) > -1; });
    nav.forEach(function (v) { if (pick.length < 4 && pick.indexOf(v) < 0 && !UI.parentOf(v, nav)) pick.push(v); });
    var cur = UI.parentOf(UI.state.view, nav) || UI.state.view, inMore = pick.indexOf(cur) < 0;
    return '<nav class="bnav" aria-label="GECKO Ops">' + pick.map(function (v) {
      var c = UI.viewCount(v);
      return '<button type="button" data-a="nav" data-v="' + v + '"' + (cur === v ? ' aria-current="page"' : "") + ">" + UI.icon(v) + "<span>" + esc(t("nav_" + v)) + "</span>" + (c && v !== "today" ? '<i class="dot" aria-hidden="true"></i>' : "") + "</button>";
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
  function backendScreen() {
    var S = GK.store, mode = UI.state.authMode === "up" ? "up" : "in";
    var h = '<div class="auth"><div class="auth-card"><div class="auth-logo">' + GK.logo.wordmark + '</div><p class="auth-kick">' + esc(t("au_kick")) + "</p>";
    if (S.authState === "loading") {
      h += '<h1 class="hl">' + esc(t("au_load")) + "</h1>";
    } else if (S.authState === "no-workspace") {
      h += '<h1 class="hl">' + esc(t("au_none_t")) + '</h1><p class="auth-p">' + esc(t("au_none_p")) + "</p>";
      h += '<div class="auth-form">' + UI.field({ id: "auth-invite", label: t("au_code"), value: S.pendingInvite() }) + UI.field({ id: "auth-name", label: t("au_name"), value: "" }) + "</div>";
      h += UI.btn(t("au_join"), "auth-accept-invite", { cls: "primary auth-go" });
      h += '<details class="auth-first"><summary>' + esc(t("au_first_t")) + '</summary><p class="auth-p">' + esc(t("au_first_p")) + "</p>" +
        UI.btn(t("au_create"), "auth-create-workspace", { cls: "" }) + "</details>";
      h += '<button type="button" class="auth-link" data-a="auth-signout">' + esc(t("au_out")) + "</button>";
    } else {
      h += '<h1 class="hl">' + esc(t(mode === "up" ? "au_up_t" : "au_in_t")) + '</h1><p class="auth-p">' + esc(t(S.pendingInvite() ? "au_invite_on" : mode === "up" ? "au_up_p" : "au_in_p")) + "</p>";
      h += '<div class="auth-form" data-auth="' + mode + '">' + (mode === "up" ? UI.field({ id: "auth-name", label: t("au_name"), value: "" }) : "") +
        UI.field({ id: "auth-email", label: t("au_email"), type: "email", value: "", attrs: ' autocomplete="email"' }) +
        UI.field({ id: "auth-password", label: t("au_pass"), type: "password", value: "", hint: mode === "up" ? t("au_pass_h") : "", attrs: ' autocomplete="' + (mode === "up" ? "new-password" : "current-password") + '"' }) + "</div>";
      h += UI.btn(t(mode === "up" ? "au_signup" : "au_signin"), mode === "up" ? "auth-signup" : "auth-signin", { cls: "primary auth-go" });
      h += '<button type="button" class="auth-link" data-a="auth-mode">' + esc(t(mode === "up" ? "au_to_in" : "au_to_up")) + "</button>";
    }
    var message = S.authError || S.authMessage;
    if (message) h += '<p class="auth-msg" role="status">' + esc(message) + "</p>";
    return h + "</div></div>";
  }
  /** The link someone opens to join: sign in or sign up, and the code is used for them. */
  UI.inviteLink = function (code) { return location.origin + location.pathname + "#join-" + code; };
  /** Shows a one-time invite link with a copy button. */
  UI.inviteModal = function (title, email, code) {
    var link = UI.inviteLink(code);
    UI.modal({
      title: title,
      body: '<p style="margin:0">' + esc(t("inv_body", { e: email })) + '</p><code class="code" style="word-break:break-all;user-select:all">' + esc(link) + "</code>" +
        '<p class="small muted" style="margin:0">' + esc(t("inv_note")) + "</p>",
      foot: UI.btn(t("inv_copy"), "inv-copy", { cls: "", data: { v: link } }) + UI.btn(t("close"), "close", { cls: "primary" })
    });
  };
  actions["inv-copy"] = function (el) { u.copy(el.getAttribute("data-v")).then(function (ok) { UI.toast(t(ok ? "copied" : "write_failed")); }); };
  /** A signed-in client: their own page, with a slim bar to sign out. */
  function clientAccountScreen() {
    var S = GK.store, cm = GK.clientMode, sh = S.publicShare || {};
    var email = ""; try { var ses = JSON.parse(sessionStorage.getItem("gecko-ops-supabase-session") || "{}"); email = ses.user && ses.user.email || ""; } catch (e) {}
    return '<div class="cl-acct"><span>' + esc(t("au_client_bar", { e: email || (sh.account && sh.account.brand) || "" })) + '</span><button type="button" class="auth-link" data-a="auth-signout">' + esc(t("au_out")) + "</button></div>" +
      (cm ? cm.render("me") : "");
  }
  /** Full render. Store updates arriving while someone types are held until they leave the field. */
  var lastScreen = "";
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
    if (GK.store.backend === "supabase" && GK.store.authState === "client") {
      app.innerHTML = clientAccountScreen();
      if (GK.clientMode && GK.clientMode.after) try { GK.clientMode.after(app); } catch (e) { console.error(e); }
      return;
    }
    if (GK.store.backend === "supabase" && GK.store.authState !== "ready") {
      app.innerHTML = backendScreen();
      document.title = "Sign in · GECKO Ops";
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
    app.innerHTML = '<div class="shell' + (pref.mini ? " mini" : "") + (UI.state.drawer ? " drawer-open" : "") + '">' + sideHTML(me, nav) + '<div class="drawer-scrim" data-a="drawer"></div><main id="main">' + top + '<div class="page" id="page">' + subTabs(nav) + body + "</div></main>" + bottomHTML(nav) + "</div>";
    main = app.querySelector("main");
    if (lastView === UI.state.view) dirty.forEach(function (d) {
      var el = document.getElementById(d.id);
      if (el && app.contains(el) && typing(el) && el.defaultValue === d.was) el.value = d.value;
    });
    if (lastView === UI.state.view && scrolls[UI.state.view]) main.scrollTop = scrolls[UI.state.view];
    else main.scrollTop = 0;
    lastView = UI.state.view;
    // Entrance motion only when the screen changes (view, record or tab), never on a data refresh.
    var P0 = UI.p() || {}, screenKey = UI.state.view + "|" + (P0.id || "") + "|" + (P0.tab || "") + "|" + (P0.mode || "") + "|" + (P0.sub || "");
    if (screenKey !== lastScreen) { var pg = document.getElementById("page"); if (pg) { pg.classList.add("enter"); setTimeout(function () { pg.classList.remove("enter"); }, 700); } }
    lastScreen = screenKey;
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
  /** Tabs across the top when a screen has screens under it (Home: Tasks, Guide; Projects: Ideas, Shoots...). */
  function subTabs(nav) {
    var v = UI.state.view, top = UI.parentOf(v, nav) || v;
    var g = UI.GROUPS.filter(function (x) { return x.views.indexOf(top) > -1; })[0];
    var kids = (g ? g.views : []).filter(function (k) { return k !== top && nav.indexOf(k) > -1 && UI.parentOf(k, nav) === top; });
    if (!kids.length) return "";
    return '<nav class="subtabs" aria-label="' + esc(t("nav_" + top)) + '">' + [top].concat(kids).map(function (k) {
      return '<button type="button" data-a="nav" data-v="' + k + '"' + (k === v ? ' aria-current="page"' : "") + ">" + esc(t("nav_" + k)) + "</button>";
    }).join("") + "</nav>";
  }
  function flush() { if (deferred) UI.render(); }

  /** Theme: "dark" (default, total black), "light" or "auto" (follows the system). */
  UI.theme = function () { return "light"; };
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
  actions.theme = function () { applyTheme(); };
  actions.close = function () { UI.closeModal(); };
  actions["confirm-yes"] = function () { var f = confirmFn; UI.closeModal(); if (f) f(); };
  actions["start-live"] = startLiveModal;
  actions["do-start-live"] = function () { var n = u.val("live-name").trim(); if (!n) return u.focus("live-name"); UI.closeModal(true); GK.store.startLive(n); UI.go("today"); };
  actions["show-demo"] = function () { GK.store.showDemo(); UI.go("today"); };
  actions["show-live"] = function () { GK.store.showLive(); UI.go("today"); };
  actions["reset-demo"] = function () { UI.go("settings", { tab: "data" }); };
  actions["do-join"] = function () {
    var claim = u.val("join-claim"), name = u.val("join-name").trim(), role = u.val("join-role") || "sales";
    if (!claim && !name) return u.focus("join-name");
    UI.closeModal(true); GK.store.join(name, role, claim); UI.render(true);
  };
  function authFailure(error) {
    var m = error && error.message ? error.message : "";
    GK.store.authError = /workspace_exists/.test(m) ? t("au_e_exists") : /invalid_invite/.test(m) ? t("au_e_invite") :
      /Invalid login/i.test(m) ? t("au_e_login") : /not confirmed|verified_email/i.test(m) ? t("au_e_confirm") : (m || "Authentication request failed.");
    UI.render(true);
  }
  /** After sign-in: a code waiting from an invite link is used at once. */
  function afterAuth() {
    var S = GK.store, code = S.pendingInvite();
    S.authError = "";
    if (code && S.authState === "no-workspace") return S.acceptAnyInvite(code, u.val("auth-name").trim()).then(function () { UI.render(true); }, authFailure);
    UI.render(true);
  }
  actions["auth-mode"] = function () { UI.state.authMode = UI.state.authMode === "up" ? "in" : "up"; GK.store.authError = ""; GK.store.authMessage = ""; UI.render(true); };
  actions["auth-signin"] = function () {
    var email = u.val("auth-email").trim(), password = u.val("auth-password");
    if (!email) return u.focus("auth-email");
    if (!password) return u.focus("auth-password");
    GK.store.authError = "";
    GK.store.signIn(email, password).then(afterAuth, authFailure);
  };
  actions["auth-signup"] = function () {
    var email = u.val("auth-email").trim(), password = u.val("auth-password"), name = u.val("auth-name").trim();
    if (!email) return u.focus("auth-email");
    if (!password) return u.focus("auth-password");
    GK.store.authError = "";
    if (password.length < 8) { GK.store.authError = t("au_pass_h"); return UI.render(true); }
    GK.store.signUp(email, password, name).then(function () {
      if (GK.store.authState === "login") { GK.store.authMessage = t("au_confirm"); UI.state.authMode = "in"; }
      afterAuth();
    }, authFailure);
  };
  actions["auth-create-workspace"] = function () {
    var name = "Gecko";
    GK.store.authError = "";
    GK.store.createWorkspace(name || "Gecko").then(function () { GK.store.authError = ""; UI.render(true); }, authFailure);
  };
  actions["auth-accept-invite"] = function () {
    var token = u.val("auth-invite").trim(), name = u.val("auth-name").trim();
    if (!token) return u.focus("auth-invite");
    GK.store.authError = "";
    GK.store.acceptAnyInvite(token, name).then(function () { GK.store.authError = ""; UI.render(true); }, authFailure);
  };
  actions["auth-signout"] = function () {
    GK.store.signOut().then(function () { UI.render(true); }, authFailure);
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
    var join = /^join-([a-f0-9]{64})$/.exec(h);
    if (join) { GK.store.pendingInvite(join[1]); h = ""; try { history.replaceState(null, "", location.pathname); } catch (e) {} }
    UI.clientToken = GK.clientMode && GK.clientMode.match(h);   // "#cl-<token>" opens the client-facing page instead of the app
    UI.state.view = (UI.clientToken ? "" : h) || u.lsGet(VIEW_KEY, "today");
    window.addEventListener("hashchange", function () {
      var tk = GK.clientMode && GK.clientMode.match((location.hash || "").replace("#", ""));
      if ((tk || null) !== (UI.clientToken || null)) {
        UI.clientToken = tk; UI.render(true);
        if (tk && GK.supabase && GK.supabase.configured()) {
          GK.store.loadPublicShare(tk).then(function () { UI.render(true); }, function (error) {
            GK.store.authError = error.message; GK.store.publicShare = null; UI.render(true);
          });
        } else if (!tk && GK.supabase && GK.supabase.configured()) {
          GK.store.showLive();
        }
      }
    });
    GK.store.onChange(function () { UI.render(); });
    GK.store.boot(function () {
      if (!views[UI.state.view]) UI.state.view = "today";
      UI.render(true);
      if (GK.guide && GK.guide.maybeWelcome) GK.guide.maybeWelcome();
    });
  };

  GK.ui = UI;
})(window.GK);
