/* GECKO Ops · module: clients_portal. The Portal tab of a client workspace: the share link (create, publish, preview, switch off), built in
   portal_pages.js, and the quick update (a clean page to screen-share, or a WhatsApp text), built in portal.js. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, HUB = GK.clientHub;
  if (!HUB) return;

  GK.i18n.add({
    cpo_quick_h: ["Quick update", "Point rapide"], cpo_quick_sub: ["Where each project is and what we need, ready to send or show.", "Où en est chaque projet et ce qu'il nous faut, prêt à envoyer ou montrer."],
    cpo_log_h: ["Client logins", "Accès client"], cpo_log_sub: ["People at the brand who sign in with their own email to see their page, approve and comment.", "Les personnes de la marque qui se connectent avec leur e-mail pour voir leur page, valider et commenter."],
    cpo_log_email: ["Their email", "Son e-mail"], cpo_log_add: ["Invite", "Inviter"], cpo_log_ready: ["Client invite ready", "Invitation client prête"],
    cpo_log_joined: ["Signed in", "Connecté"], cpo_log_wait: ["Invite sent", "Invitation envoyée"], cpo_log_off: ["Access removed", "Accès retiré"],
    cpo_log_rm: ["Remove access", "Retirer l'accès"], cpo_log_rm_q: ["Remove this person's access?", "Retirer l'accès de cette personne ?"],
    cpo_log_rm_b: ["They can't sign in to this client page any more. The share link, if you sent one, keeps working until you switch it off.", "Elle ne peut plus se connecter à cette page client. Le lien de partage, si vous en avez envoyé un, marche jusqu'à ce que vous le coupiez."],
    cpo_log_none: ["Nobody yet. Invite the brand's contact so they sign in instead of using a link.", "Personne pour l'instant. Invitez le contact de la marque pour qu'il se connecte au lieu d'utiliser un lien."],
    cpo_log_need: ["They see the latest page you published. Publish one first if you haven't.", "Ils voient la dernière page publiée. Publiez-en une d'abord si ce n'est pas fait."],
    cpo_copy: ["Copy WhatsApp update", "Copier le point WhatsApp"], cpo_show: ["Show the page", "Voir la page"], cpo_hide: ["Hide the page", "Masquer la page"]
  });

  var accounts = {}, loading = {};
  function loadAccounts(id) {
    if (loading[id]) return; loading[id] = true;
    S.clientAccounts(id).then(function (rows) { accounts[id] = rows || []; loading[id] = false; ui.render(true); },
      function () { accounts[id] = []; loading[id] = false; });
  }
  function loginsHTML(c) {
    if (S.backend !== "supabase" || !m.can("portal")) return "";
    var list = accounts[c.id];
    if (!list) { loadAccounts(c.id); list = []; }
    var rows = list.length ? '<div class="list">' + list.map(function (a) {
      var st = a.revoked ? ui.pill(t("cpo_log_off")) : a.joined ? ui.pill(t("cpo_log_joined"), "done") : ui.pill(t("cpo_log_wait"), "wip");
      return '<div class="li"><div class="stack" style="gap:2px"><strong>' + esc(a.name || a.email) + '</strong><span class="m">' + esc(a.email) + "</span></div>" +
        '<span class="row" style="gap:8px">' + st + (a.revoked ? "" : ui.btn(t("cpo_log_rm"), "cpo-log-rm", { cls: "ghost sm", data: { id: a.id, c: c.id } })) + "</span></div>";
    }).join("") + "</div>" : '<p class="small muted" style="margin:0">' + esc(t("cpo_log_none")) + "</p>";
    return '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("cpo_log_h")) + '</h2><span class="small muted">' + esc(t("cpo_log_sub")) + "</span></div></div>" +
      rows + '<div class="row" style="gap:8px;align-items:flex-end">' + ui.field({ id: "cpo-log-email", label: t("cpo_log_email"), type: "email", value: c.email || "" }) +
      ui.btn(t("cpo_log_add"), "cpo-log-add", { cls: "primary", data: { c: c.id } }) + "</div>" +
      '<p class="small muted" style="margin:0">' + esc(t("cpo_log_need")) + "</p></section>";
  }
  GK.act("cpo-log-add", function (el) {
    var cid = el.getAttribute("data-c"), email = u.val("cpo-log-email").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { u.focus("cpo-log-email"); return ui.toast(t("required")); }
    S.inviteClient(cid, email).then(function (code) {
      delete accounts[cid]; ui.inviteModal(t("cpo_log_ready"), email, code); ui.render(true);
    }, function (e) { ui.toast(e.message); });
  });
  GK.act("cpo-log-rm", function (el) {
    var id = el.getAttribute("data-id"), cid = el.getAttribute("data-c");
    ui.confirm(t("cpo_log_rm_q"), t("cpo_log_rm_b"), function () {
      S.revokeClientAccount(id).then(function () { delete accounts[cid]; ui.render(true); }, function (e) { ui.toast(e.message); });
    }, t("cpo_log_rm"));
  });

  function portalTab(c) {
    var P = GK.portal || {}, st = ui.p("clients"), can = m.can("portal");
    var h = loginsHTML(c) + (P.sharesHTML ? P.sharesHTML(c) : "");
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
