/* GECKO Ops · V03 shell: top bar (search, sample strip, quick create, notifications, account).
   The sidebar and bottom bar live in core/ui.js. Menus: shell_menus.js · feed: shell_feed.js · palette and shortcuts: shell_palette.js. */
(function (GK) {
  "use strict";
  var t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = GK.u.esc;

  GK.i18n.add({
    sh_search: ["Search clients, projects, invoices…", "Rechercher clients, projets, factures…"], sh_search_short: ["Search", "Rechercher"],
    sh_quick: ["Create", "Créer"], sh_bell: ["Notifications", "Notifications"], sh_user: ["Account", "Compte"],
    sh_home: ["Home", "Accueil"],
    // quick create + palette actions
    sh_new_project: ["New project", "Nouveau projet"], sh_new_client: ["New client", "Nouveau client"], sh_new_task: ["New task", "Nouvelle tâche"],
    sh_new_idea: ["New idea", "Nouvelle idée"], sh_new_invoice: ["New invoice", "Nouvelle facture"], sh_new_lead: ["New lead", "Nouveau prospect"],
    sh_new_board: ["New whiteboard", "Nouveau tableau blanc"],
    // account menu
    sh_workspace: ["Workspace", "Espace de travail"], sh_use_sample: ["Local workspace", "Espace local"], sh_use_live: ["Live data", "Données réelles"],
    sh_start_live: ["Start for real", "Démarrer pour de vrai"], sh_sample_strip: ["Local workspace", "Espace local"], sh_sample_long: ["this browser only", "ce navigateur uniquement"],
    sh_working_as: ["Working as", "Connecté en tant que"], sh_help: ["Keyboard shortcuts", "Raccourcis clavier"],
    sh_contact: ["Reach GECKO", "Contacter GECKO"], sh_lang: ["Language", "Langue"], sh_theme: ["Theme", "Thème"],
    sh_theme_auto: ["Auto", "Auto"], sh_theme_light: ["Light", "Clair"], sh_theme_dark: ["Dark", "Sombre"],
    sh_switch_lang: ["Switch to {l}", "Passer en {l}"], sh_switch_theme: ["Theme: {m}", "Thème : {m}"],
    sh_lang_name: ["Français", "English"], sh_read_only: ["Read only", "Lecture seule"]
  });

  var SH = GK.shell = GK.shell || {};
  var isMac = /Mac|iPhone|iPad/.test((navigator.platform || "") + (navigator.userAgent || ""));
  SH.mod = isMac ? "⌘" : "Ctrl";
  SH.isMac = isMac;

  SH.navNow = function () { return ui.nav(); };
  /** What the quick-create menu, the New button and the palette can start, for this viewer: [{key, icon, label, run}] */
  SH.creates = function () {
    var out = [], nav = SH.navNow();
    function has(v) { return nav.indexOf(v) > -1; }
    function act(n) { return ui.hasAction(n); }
    if (m.can("tasks") && (act("tk-new") || act("tm-task-new"))) out.push({ key: "task", icon: "tasks", label: t("sh_new_task"), run: function () { ui.trigger(act("tk-new") ? "tk-new" : "tm-task-new"); } });
    if (m.can("projects.create") && has("projects") && act("pj-new")) out.push({ key: "project", icon: "projects", label: t("sh_new_project"), run: function () { ui.go("projects"); ui.trigger("pj-new"); } });
    if (m.can("clients") && has("clients") && act("cl-new")) out.push({ key: "client", icon: "clients", label: t("sh_new_client"), run: function () { ui.go("clients"); ui.trigger("cl-new"); } });
    if (m.can("ideas") && has("studio") && act("st-new")) out.push({ key: "idea", icon: "studio", label: t("sh_new_idea"), run: function () { ui.go("studio"); ui.trigger("st-new"); } });
    if (m.can("*") && has("finance") && act("fi-new")) out.push({ key: "invoice", icon: "invoice", label: t("sh_new_invoice"), run: function () { ui.go("finance", { tab: "invoices" }); ui.trigger("fi-new"); } });
    if (m.can("leads") && has("pipeline") && act("pl-new")) out.push({ key: "lead", icon: "lead", label: t("sh_new_lead"), run: function () { ui.go("pipeline"); ui.trigger("pl-new"); } });
    if (m.can("boards") && has("boards") && act("bd-new")) out.push({ key: "board", icon: "boards", label: t("sh_new_board"), run: function () { ui.go("boards"); ui.trigger("bd-new"); } });
    return out;
  };

  function sampleStrip() {
    if (S.mode === "demo") return '<span class="sample" title="' + esc(t("demo_banner")) + '"><i aria-hidden="true"></i><span class="sl">' + esc(t("sh_sample_strip")) + '</span><span class="ss">' + esc(t("sample_tag")) + '</span><span class="st faint">· ' + esc(t("sh_sample_long")) + "</span>" +
      '<button type="button" data-a="' + (S.hasLive() ? "show-live" : "start-live") + '">' + esc(S.hasLive() ? t("back_live") : t("start_live")) + "</button></span>";
    if (S.readOnly) return '<span class="sample ro" title="' + esc(t("read_only")) + '"><i aria-hidden="true"></i><span>' + esc(t("sh_read_only")) + "</span></span>";
    return "";
  }

  /** Top bar HTML. Rendered by ui.render on every view. */
  SH.top = function (me) {
    var unread = SH.unread ? SH.unread() : 0;
    var h = '<header class="topbar">' +
      '<a class="tb-logo" href="#today" data-a="nav" data-v="today" aria-label="GECKO Ops">' + GK.logo.wordmark + "</a>" +
      '<button type="button" class="srch" data-a="sh-search" aria-label="' + esc(t("sh_search_short")) + '" aria-keyshortcuts="Control+K Meta+K">' + ui.icon("search") + "<span>" + esc(t("sh_search")) + "</span><kbd>" + SH.mod + (isMac ? "" : " ") + "K</kbd></button>" +
      '<div class="tb-r">' + sampleStrip();
    if (SH.creates().length) h += '<button type="button" class="ib bd" data-a="sh-menu" data-m="quick" aria-haspopup="menu" aria-expanded="false" aria-label="' + esc(t("sh_quick")) + '" title="' + esc(t("sh_quick")) + ' (N)">' + ui.icon("plus") + "</button>";
    h += '<button type="button" class="ib bd" data-a="sh-menu" data-m="bell" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(t("sh_bell") + (unread ? " (" + unread + ")" : "")) + '" title="' + esc(t("sh_bell")) + '">' + ui.icon("bell") + (unread ? '<span class="badge" aria-hidden="true">' + (unread > 9 ? "9+" : unread) + "</span>" : "") + "</button>";
    h += '<button type="button" class="ib me" data-a="sh-menu" data-m="user" aria-haspopup="menu" aria-expanded="false" aria-label="' + esc(t("sh_user") + (me ? ": " + me.name : "")) + '" title="' + esc(me ? me.name : t("sh_user")) + '">' + ui.avatar(me ? me.name : "?", { tone: "gel" }) + "</button>";
    return h + "</div></header>";
  };

  GK.act("sh-search", function () { SH.palette(""); });
  GK.act("sh-menu", function (el) { SH.menu(el.getAttribute("data-m"), el); });
})(window.GK);
