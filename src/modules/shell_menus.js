/* GECKO Ops · shell: popover menus (quick create, notifications, account). They live in <body>, so data changes never close them. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var SH = GK.shell;
  var pop = null, kind = "";

  function seg(label, action, items, on) {
    return '<div class="pop-s">' + esc(label) + '</div><div class="pop-seg"><div class="seg" role="group" aria-label="' + esc(label) + '">' +
      items.map(function (i) { return '<button type="button" data-a="' + action + '" data-v="' + esc(i[0]) + '" aria-pressed="' + (i[0] === on) + '">' + esc(i[1]) + "</button>"; }).join("") + "</div></div>";
  }
  var KEYS = { task: "T", project: "P", client: "C", idea: "I", invoice: "F", lead: "L", board: "B" };
  function quickHTML() {
    return '<div class="pop-s">' + esc(t("sh_quick")) + "</div>" + SH.creates().map(function (c, ix) {
      return '<button type="button" class="mi" role="menuitem" data-a="sh-create" data-ix="' + ix + '">' + ui.icon(c.icon) + "<span>" + esc(c.label) + "</span></button>";
    }).join("");
  }
  function userHTML() {
    var x = GK.me(), co = m.company(), lang = GK.i18n.lang(), theme = ui.theme();
    var h = x ? '<div class="pop-me">' + ui.avatar(x.name, { tone: "gel" }) + '<div class="mt"><b>' + esc(x.name) + "</b><span>" + esc(t("role_" + x.role)) + "</span></div></div>" : "";
    var team = S.all("team").sort(u.by("name"));
    if ((S.mode === "demo" || S.backend === "local") && team.length > 1) {
      h += '<div class="pop-s"><label for="sh-workas">' + esc(t("sh_working_as")) + '</label></div><select id="sh-workas" data-c="workas">' +
        team.map(function (p) { return '<option value="' + esc(p.id) + '"' + (x && x.id === p.id ? " selected" : "") + ">" + esc(p.name + " · " + t("role_" + p.role).split(" · ")[0]) + "</option>"; }).join("") + "</select>";
    }
    h += seg(t("sh_lang"), "sh-lang", [["en", "English"], ["fr", "Français"]], lang);
    h += "<hr>" + ["guide", "activity"].filter(function (v) { return ui.nav().indexOf(v) > -1; }).map(function (v) {
      return '<button type="button" class="mi" role="menuitem" data-a="nav" data-v="' + v + '">' + ui.icon(v) + "<span>" + esc(t("nav_" + v)) + "</span></button>";
    }).join("");
    h += '<button type="button" class="mi" role="menuitem" data-a="guide-restart">' + ui.icon("help") + "<span>" + esc(t("guide_restart")) + "</span></button>";
    h += '<button type="button" class="mi" role="menuitem" data-a="sh-help">' + ui.icon("keyboard") + "<span>" + esc(t("sh_help")) + '</span><span class="k"><kbd>?</kbd></span></button>';
    if (m.can("*")) h += '<button type="button" class="mi" role="menuitem" data-a="nav" data-v="settings">' + ui.icon("settings") + "<span>" + esc(t("nav_settings")) + "</span></button>";
    h += '<hr><div class="pop-s">' + esc(t("sh_contact")) + '</div><div class="pop-co"><span>' + esc(co.phone) + "</span><span>" + esc(co.email) + "</span><span>" + esc(co.instagram) + "</span></div>";
    return h;
  }

  SH.closeAll = function (focusBack) {
    var a = pop && pop.__anchor;
    if (pop) pop.remove();
    pop = null;
    document.querySelectorAll('[data-a="sh-menu"][aria-expanded="true"]').forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    kind = "";
    if (focusBack && a && document.contains(a)) a.focus();
  };
  SH.menuOpen = function () { return !!pop; };
  /** Open (or toggle shut) the menu `k` ("quick" | "bell" | "user") next to `anchor`. */
  SH.menu = function (k, anchor, keep) {
    var was = kind === k && pop && pop.__anchor === anchor;
    SH.closeAll();
    if (was && !keep) return;
    if (!anchor || !document.contains(anchor)) anchor = document.querySelector('.topbar [data-a="sh-menu"][data-m="' + k + '"]') || anchor;
    var el = document.createElement("div");
    el.className = "pop" + (k === "bell" ? " wide" : ""); el.id = "sh-pop";
    el.setAttribute("role", k === "bell" ? "dialog" : "menu");
    el.setAttribute("aria-label", t(k === "quick" ? "sh_quick" : k === "bell" ? "sh_bell" : "sh_user"));
    el.innerHTML = k === "quick" ? quickHTML() : k === "bell" ? SH.feedHTML() : userHTML();
    document.body.appendChild(el);
    var r = anchor ? anchor.getBoundingClientRect() : { left: 8, right: window.innerWidth - 8, top: 8, bottom: 56 };
    var w = el.offsetWidth, hgt = el.offsetHeight, top = r.bottom + 8;
    if (top + hgt > window.innerHeight - 8 && r.top - hgt - 8 > 8) top = r.top - hgt - 8;
    var left = r.left < window.innerWidth / 2 ? r.left : r.right - w;
    el.style.top = Math.round(Math.max(8, top)) + "px";
    el.style.left = Math.round(Math.max(8, Math.min(left, window.innerWidth - w - 8))) + "px";
    el.__anchor = anchor; pop = el; kind = k;
    if (anchor) anchor.setAttribute("aria-expanded", "true");
    var first = el.querySelector(".mi,.feed-i,select,button");
    if (first) first.focus({ preventScroll: true });
  };
  /** After a re-render the anchors are new elements: mark the open one again. */
  SH.after = function () {
    if (!pop) return;
    var a = document.querySelector('.topbar [data-a="sh-menu"][data-m="' + kind + '"]') || document.querySelector('[data-a="sh-menu"][data-m="' + kind + '"]');
    if (a) { pop.__anchor = a; a.setAttribute("aria-expanded", "true"); }
  };

  document.addEventListener("mousedown", function (ev) {
    if (!pop) return;
    if (pop.contains(ev.target) || (pop.__anchor && pop.__anchor.contains(ev.target))) return;
    SH.closeAll();
  });
  document.addEventListener("keydown", function (ev) {
    if (!pop) return;
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); SH.closeAll(true); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      var items = Array.prototype.slice.call(pop.querySelectorAll(".mi,.feed-i,select,.seg button,.btn"));
      if (!items.length) return;
      var i = items.indexOf(document.activeElement);
      i = ev.key === "ArrowDown" ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      ev.preventDefault(); items[i].focus();
    }
    if (ev.key === "Tab") {
      var f = Array.prototype.slice.call(pop.querySelectorAll("button,select")), last = f[f.length - 1];
      if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); SH.closeAll(true); }
    }
  }, true);
  window.addEventListener("resize", function () { if (pop) SH.closeAll(); });

  GK.act("sh-create", function (el) {
    var c = SH.creates()[+el.getAttribute("data-ix")];
    SH.closeAll();
    if (c) c.run();
  });
  GK.act("sh-help", function () { SH.closeAll(); SH.help(); });
  function reopen() { var a = document.querySelector('.topbar [data-a="sh-menu"][data-m="user"]'); if (a) SH.menu("user", a, true); }
  GK.act("sh-lang", function (el) { ui.trigger("lang", { l: el.getAttribute("data-v") }); reopen(); });
  GK.act("sh-theme", function (el) { ui.trigger("theme", { m: el.getAttribute("data-v") }); reopen(); });
  GK.act("sh-ws", function (el) {
    var v = el.getAttribute("data-v"); SH.closeAll();
    if (v === "demo") { if (S.mode !== "demo") ui.trigger("show-demo"); }
    else if (S.mode === "demo") ui.trigger(S.hasLive() ? "show-live" : "start-live");
  });
  SH.KEYS = KEYS;
})(window.GK);
