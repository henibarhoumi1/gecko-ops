/* GECKO Ops · module: clients_portal. The Portal tab of a client workspace: the share link (create, publish, preview, switch off), built in
   portal_pages.js, and the quick update (a clean page to screen-share, or a WhatsApp text), built in portal.js. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, esc = u.esc, HUB = GK.clientHub;
  if (!HUB) return;

  GK.i18n.add({
    cpo_quick_h: ["Quick update", "Point rapide"], cpo_quick_sub: ["Where each project is and what we need, ready to send or show.", "Où en est chaque projet et ce qu'il nous faut, prêt à envoyer ou montrer."],
    cpo_copy: ["Copy WhatsApp update", "Copier le point WhatsApp"], cpo_show: ["Show the page", "Voir la page"], cpo_hide: ["Hide the page", "Masquer la page"]
  });

  function portalTab(c) {
    var P = GK.portal || {}, st = ui.p("clients"), can = m.can("portal");
    var h = P.sharesHTML ? P.sharesHTML(c) : "";
    h += '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("cpo_quick_h")) + '</h2><span class="small muted">' + esc(t("cpo_quick_sub")) + "</span></div>" +
      '<div class="row" style="gap:6px">' + ui.btn(t("cpo_copy"), "po-copy", { cls: "primary sm", data: { id: c.id }, disabled: !can, title: can ? "" : t("po_no_perm") }) +
      ui.btn(st.quick ? t("cpo_hide") : t("cpo_show"), "cl-quick", { cls: "sm" }) + "</div></div>" +
      (st.quick && P.quickDoc ? P.quickDoc(c) : "") + "</section>";
    return h;
  }
  GK.act("cl-quick", function () { var p = ui.p("clients"); p.quick = !p.quick; ui.render(true); });
  HUB.after = function (p, main) {
    if (p.tab === "portal" && p.quick && GK.portal && GK.portal.quickAfter && main) GK.portal.quickAfter(main);
  };
  HUB.tab({ key: "portal", order: 90, label: function () { return t("cl_t_portal"); }, render: portalTab });
})(window.GK);
