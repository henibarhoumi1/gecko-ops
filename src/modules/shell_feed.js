/* GECKO Ops · shell: notification feed built from existing data (no separate store).
   Overdue invoices, tasks due, plans waiting, files in review, payments received, client feedback. Read marks are kept per person in localStorage. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var SH = GK.shell;

  GK.i18n.add({
    sh_f_title: ["Notifications", "Notifications"], sh_f_mark: ["Mark all read", "Tout marquer comme lu"], sh_f_none: ["You're all caught up.", "Vous êtes à jour."],
    sh_f_none_sub: ["New payments, feedback and due work will show here.", "Les paiements, retours et échéances apparaîtront ici."],
    sh_f_overdue: ["Invoice {no} is overdue", "La facture {no} est en retard"],
    sh_f_overdue_m: ["{brand} · {amt} · {n} days late", "{brand} · {amt} · {n} jours de retard"],
    sh_f_task: ["Task due today: {title}", "Tâche pour aujourd'hui : {title}"], sh_f_task_late: ["Task overdue: {title}", "Tâche en retard : {title}"],
    sh_f_plan: ["Plan waiting for the client", "Plan en attente du client"],
    sh_f_review_1: ["1 file waiting for your review", "1 fichier à relire"], sh_f_review_n: ["{n} files waiting for your review", "{n} fichiers à relire"],
    sh_f_paid: ["Payment received · {amt}", "Paiement reçu · {amt}"],
    sh_f_fb: ["{brand} sent feedback", "{brand} a envoyé un retour"],
    sh_f_fb_approve: ["approved", "validé"], sh_f_fb_changes: ["asked for changes", "demande des retouches"], sh_f_fb_comment: ["commented", "a commenté"],
    sh_f_today: ["Today", "Aujourd'hui"], sh_f_yday: ["Yesterday", "Hier"], sh_f_ago: ["{n}d ago", "il y a {n} j"],
    sh_f_unread: ["{n} unread", "{n} non lues"], sh_f_all: ["All", "Toutes"]
  });

  function me() { return GK.me() || { id: "", role: "founder" }; }
  function key() { return "gecko-ops-seen-" + S.mode + "-" + (me().id || "x"); }
  function seen() { var a = u.lsGet(key(), []); return Array.isArray(a) ? a : []; }
  /** "Today", "Yesterday", "3d ago", or a date */
  SH.when = function (d) {
    if (!d) return "";
    var n = u.daysBetween(String(d).slice(0, 10), u.today());
    return n === 0 ? t("sh_f_today") : n === 1 ? t("sh_f_yday") : n > 1 && n < 7 ? t("sh_f_ago", { n: n }) : u.fmtDate(d);
  };

  /** [{id, icon, tone: "alert"|"good"|"", title, meta, at, view, params}] newest first, for this viewer. */
  SH.feedItems = function () {
    var r = me().role, td = u.today(), out = [], founder = r === "founder";
    if (founder) {
      S.all("invoices").filter(function (i) { return m.invStatus(i) === "overdue"; }).forEach(function (i) {
        out.push({ id: "od:" + i.id, icon: "invoice", tone: "alert", at: i.due, view: "finance", params: { invoiceId: i.id, tab: "invoices" },
          title: t("sh_f_overdue", { no: i.no }), meta: t("sh_f_overdue_m", { brand: m.brand(i.clientId), amt: u.money(m.invBalance(i)), n: Math.max(1, u.daysBetween(i.due, td)) }) });
      });
      S.all("invoices").forEach(function (i) {
        (i.payments || []).forEach(function (p, ix) {
          if (p.date && p.date >= u.addDays(td, -10) && p.date <= td) out.push({ id: "pay:" + i.id + ":" + ix + ":" + p.date, icon: "cash", tone: "good", at: p.date, view: "finance", params: { invoiceId: i.id, tab: "invoices" },
            title: t("sh_f_paid", { amt: u.money((+p.net || 0) + (+p.withheld || 0)) }), meta: m.brand(i.clientId) + (i.no ? " · " + i.no : "") });
        });
      });
      S.all("projects").filter(function (p) { return p.stage !== "retention"; }).forEach(function (p) {
        var n = m.files(p).filter(function (f) { return f.item.status === "review"; }).length;
        if (n) out.push({ id: "rev:" + p.id + ":" + n, icon: "production", at: td, view: "production", params: { projectId: p.id }, title: t(n === 1 ? "sh_f_review_1" : "sh_f_review_n", { n: n }), meta: m.projectLabel(p) });
      });
    }
    if (founder || r === "sales") {
      S.all("projects").filter(function (p) { return p.stage === "scripting" && !p.planApproved; }).forEach(function (p) {
        out.push({ id: "plan:" + p.id, icon: "projects", at: td, view: "projects", params: { id: p.id }, title: t("sh_f_plan"), meta: m.projectLabel(p) });
      });
      S.all("feedback").filter(function (f) { return (f.at || "").slice(0, 10) >= u.addDays(td, -10); }).forEach(function (f) {
        out.push({ id: "fb:" + f.id, icon: "msg", tone: f.kind === "changes" ? "alert" : f.kind === "approve" ? "good" : "", at: (f.at || "").slice(0, 10), view: "clients", params: { id: f.clientId, tab: "approvals" },
          title: t("sh_f_fb", { brand: m.brand(f.clientId) }), meta: t("sh_f_fb_" + (f.kind || "comment")) + (f.text ? " · " + String(f.text).slice(0, 70) : "") });
      });
    }
    S.all("tasks").filter(function (x) { return !x.done && x.who === me().id && x.due && x.due <= td; }).forEach(function (x) {
      var late = x.due < td;
      out.push({ id: "tk:" + x.id + ":" + x.due, icon: "tasks", tone: late ? "alert" : "", at: x.due, view: "tasks", params: { open: x.id },
        title: t(late ? "sh_f_task_late" : "sh_f_task", { title: x.title }), meta: (x.projectId && m.project(x.projectId) ? m.projectLabel(m.project(x.projectId)) + " · " : "") + u.fmtDate(x.due) });
    });
    out.sort(function (a, b) { return (b.at || "") < (a.at || "") ? -1 : (b.at || "") > (a.at || "") ? 1 : 0; });
    return out.slice(0, 60);
  };
  SH.unread = function () {
    var set = {}; seen().forEach(function (k) { set[k] = 1; });
    return SH.feedItems().filter(function (i) { return !set[i.id]; }).length;
  };
  SH.markRead = function (ids) {
    var s = seen(); ids.forEach(function (k) { if (s.indexOf(k) < 0) s.push(k); });
    u.lsSet(key(), s.slice(-600));
  };
  SH.feedHTML = function () {
    var items = SH.feedItems(), set = {}; seen().forEach(function (k) { set[k] = 1; });
    var un = items.filter(function (i) { return !set[i.id]; }).length;
    var h = '<div class="pop-h"><div class="stack" style="gap:0"><h2 class="sec">' + esc(t("sh_f_title")) + "</h2>" + (un ? '<span class="small faint">' + esc(t("sh_f_unread", { n: un })) + "</span>" : "") + "</div>" +
      (un ? ui.btn(t("sh_f_mark"), "sh-feed-all", { cls: "ghost sm", icon: "check" }) : "") + "</div>";
    if (!items.length) return h + '<div class="feed-empty">' + ui.icon("bell", "lg") + "<b>" + esc(t("sh_f_none")) + '</b><span class="small">' + esc(t("sh_f_none_sub")) + "</span></div>";
    return h + items.map(function (i) {
      return '<button type="button" class="feed-i ' + (i.tone || "") + (set[i.id] ? "" : " unread") + '" data-a="sh-feed-go" data-id="' + esc(i.id) + '"><span class="fic">' + ui.icon(i.icon) + "</span>" +
        '<span class="fi-t"><b>' + esc(i.title) + "</b><span>" + esc(i.meta) + '</span></span><span class="fi-w">' + esc(SH.when(i.at)) + "</span></button>";
    }).join("");
  };
  GK.act("sh-feed-all", function () {
    SH.markRead(SH.feedItems().map(function (i) { return i.id; }));
    SH.closeAll(); ui.render(true);
  });
  GK.act("sh-feed-go", function (el) {
    var id = el.getAttribute("data-id"), i = SH.feedItems().filter(function (x) { return x.id === id; })[0];
    if (!i) return;
    SH.markRead([i.id]);
    ui.go(i.view, i.params);
  });
})(window.GK);
