/* GECKO Ops · module: activity (founder)
   A timeline of what changed, built from each record's log lines ({at, who, text}), plus invoice payments,
   finished tasks, lead stage moves (when a lead has no log yet) and client feedback.
   Filter by type and person, grouped by day, newest first. Each line opens its record. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, TK = GK.tk;
  var STEP = 30, MAX_ROWS = 400;

  GK.i18n.add({
    ac_title: ["Activity", "Activité"], ac_accent: ["", ""],
    ac_sub: ["{n} changes in the last {d} days, newest first.", "{n} changements ces {d} derniers jours, du plus récent au plus ancien."],
    ac_founder_only: ["The activity timeline is for the owner.", "Le fil d'activité est réservé au fondateur."],
    ac_types: ["Show", "Afficher"], ac_person: ["Person", "Personne"], ac_anyone: ["Everyone", "Tout le monde"], ac_system: ["No one named", "Personne de nommé"],
    ac_t_project: ["Projects", "Projets"], ac_t_lead: ["Leads", "Prospects"], ac_t_client: ["Clients", "Clients"], ac_t_money: ["Finance", "Finance"],
    ac_t_task: ["Tasks", "Tâches"], ac_t_message: ["Messages", "Messages"], ac_t_studio: ["Studio", "Studio"],
    ac_k_changes: ["Changes, last 7 days", "Changements, 7 jours"], ac_k_changes_n: ["{d} vs the 7 days before ({p})", "{d} par rapport aux 7 jours d'avant ({p})"],
    ac_k_cash: ["Cash received, 7 days", "Encaissé, 7 jours"], ac_k_cash_n: ["{n} payments · {p} the week before", "{n} paiements · {p} la semaine d'avant"], ac_k_cash_n1: ["1 payment · {p} the week before", "1 paiement · {p} la semaine d'avant"],
    ac_k_who: ["Most active, 7 days", "Le plus actif, 7 jours"], ac_k_who_n: ["{n} changes", "{n} changements"],
    ac_k_quiet: ["Quiet projects", "Projets silencieux"], ac_k_quiet_n: ["active, nothing logged for 7+ days", "en cours, rien depuis 7 jours ou plus"],
    ac_dec_t: ["{n} active projects went quiet", "{n} projets en cours sont silencieux"], ac_dec_t1: ["1 active project went quiet", "1 projet en cours est silencieux"],
    ac_dec_why: ["{p} has had no change or task for {d} days.", "{p} n'a eu aucun changement ni tâche depuis {d} jours."],
    ac_dec_rec: ["Check where it stands and set the next step.", "Vérifiez où il en est et fixez la prochaine étape."],
    ac_dec_btn: ["Open project", "Ouvrir le projet"],
    ac_paid: ["Payment received: {amt}", "Paiement reçu : {amt}"], ac_wrote: ["wrote in", "a écrit dans"],
    ac_done: ["Finished a task", "A terminé une tâche"], ac_moved: ["Lead moved to {s}", "Prospect passé à : {s}"],
    ac_fb: ["sent feedback: {k}", "a envoyé un retour : {k}"], ac_fb_approve: ["approved", "validé"], ac_fb_changes: ["changes asked", "retouches demandées"], ac_fb_comment: ["comment", "commentaire"],
    ac_general: ["General", "Général"], ac_client: ["Client", "Client"],
    ac_none: ["Nothing logged for these filters.", "Rien d'enregistré pour ces filtres."],
    ac_older: ["Show 30 more days", "Voir 30 jours de plus"], ac_cut: ["Showing the latest {n}. Narrow the filters to see more.", "Les {n} plus récents. Affinez les filtres pour en voir plus."],
    ac_clear: ["Clear filters", "Effacer les filtres"]
  });

  var TYPES = ["project", "lead", "client", "money", "task", "studio"];
  var ICON = { project: "projects", lead: "lead", client: "clients", money: "finance", task: "tasks", message: "inbox", studio: "studio" };
  var COLL = {
    projects: { type: "project", label: function (x) { return m.projectLabel(x); }, open: function (x) { return ["projects", { id: x.id }]; } },
    contracts: { type: "project", label: function (x) { return m.brand(x.clientId) + " · " + m.pack(x.pack).name; }, open: function (x) { return ["clients", { id: x.clientId }]; } },
    leads: { type: "lead", label: function (x) { return x.brand; }, open: function (x) { return ["pipeline", { id: x.id }]; } },
    clients: { type: "client", label: function (x) { return x.brand; }, open: function (x) { return ["clients", { id: x.id }]; } },
    shares: { type: "client", label: function (x) { return x.title || m.brand(x.clientId); }, open: function (x) { return ["clients", { id: x.clientId, tab: "portal" }]; } },
    invoices: { type: "money", label: function (x) { return (x.no || t("inv_draft")) + " · " + m.brand(x.clientId); }, open: function (x) { return ["finance", { tab: "invoices", invoiceId: x.id }]; } },
    quotes: { type: "money", label: function (x) { return (x.no || x.title || "") + " · " + m.brand(x.clientId); }, open: function (x) { return ["finance", { tab: "quotes", quoteId: x.id }]; } },
    expenses: { type: "money", label: function (x) { return x.label || ""; }, open: function () { return ["finance", { tab: "expenses" }]; } },
    tasks: { type: "task", label: function (x) { return x.title; }, open: function (x) { return ["tasks", { open: x.id, focusPanel: true }]; } },
    ideas: { type: "studio", label: function (x) { return x.title; }, open: function (x) { return ["studio", { id: x.id }]; } },
    boards: { type: "studio", label: function (x) { return x.title; }, open: function (x) { return ["boards", { id: x.id }]; } }
  };

  TK.css("gk-activity-css", [
    ".ac-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:2px 12px;align-items:start;padding:10px 4px;border-bottom:1px solid var(--line)}",
    ".ac-row:last-child{border-bottom:0}",
    ".ac-ic{width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:var(--s3,var(--line));color:var(--tx-2,var(--ink-2))}",
    ".ac-ic .ic{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6}",
    ".ac-ic.money{color:var(--chroma)}",
    ".ac-b{display:flex;flex-direction:column;gap:2px;min-width:0}",
    ".ac-tx{font-size:14px;line-height:1.45;overflow-wrap:anywhere;color:var(--tx-2,var(--ink-2))}",
    ".ac-tx b{color:var(--tx,var(--ink));font-weight:600}",
    ".ac-ex{font-size:12px;color:var(--tx-3,var(--ink-3));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ac-ref{all:unset;cursor:pointer;color:var(--chroma);font-size:13px;overflow-wrap:anywhere}",
    ".ac-ref:hover{text-decoration:underline}.ac-ref:focus-visible{outline:2px solid var(--chroma);outline-offset:2px;border-radius:4px}",
    ".ac-tm{font-size:12px;color:var(--tx-3,var(--ink-3));font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}",
    ".ac-tm .ty{display:block;font-size:11px}",
    "@media (max-width:640px){.ac-row{grid-template-columns:28px minmax(0,1fr)}.ac-tm{grid-column:2;text-align:left}.ac-tm .ty{display:inline;margin-left:6px}}"
  ].join("\n"));

  function P() { return ui.p("activity"); }
  function day(at) { return String(at || "").slice(0, 10); }
  function chLabel(id) { if (id === "general") return t("ac_general"); var p = m.project(id); return p ? m.projectLabel(p) : id; }

  /** Every entry since `since` (YYYY-MM-DD): {at, who, type, text, label, open:[view, params], ex} */
  function entries(since) {
    var out = [];
    function push(e) { if (day(e.at) >= since && day(e.at) <= u.today() + "~") { e.n = out.length; out.push(e); } }
    Object.keys(COLL).forEach(function (c) {
      var def = COLL[c];
      S.all(c).forEach(function (x) {
        var label = "";
        try { label = def.label(x); } catch (e) { label = x.id; }
        (x.log || []).forEach(function (l) {
          if (!l || !l.at) return;
          push({ at: l.at, who: l.who || "", type: def.type, text: l.text || l.what || "", label: label, open: def.open(x) });
        });
        if (c === "invoices") (x.payments || []).forEach(function (p) {
          if (!p.date) return;
          // the finance module may already log the payment: don't show it twice
          if ((x.log || []).some(function (l) { return l && day(l.at) === p.date && /pay|paie|re[cç]u|encaiss/i.test(l.text || l.what || ""); })) return;
          push({ at: p.date, who: "", type: "money", text: t("ac_paid", { amt: u.money((+p.net || 0) + (+p.withheld || 0)) }), label: label, open: def.open(x), amount: (+p.net || 0) + (+p.withheld || 0) });
        });
        if (c === "tasks" && x.done && x.doneOn && !(x.log || []).some(function (l) { return day(l.at) === x.doneOn; })) {
          push({ at: x.doneOn, who: x.who || "", type: "task", text: t("ac_done"), label: label, open: def.open(x) });
        }
        if (c === "leads" && !(x.log || []).length) (x.history || []).forEach(function (h) {
          if (h.at) push({ at: h.at, who: x.owner || "", type: "lead", text: t("ac_moved", { s: t("ls_" + h.stage) }), label: label, open: def.open(x) });
        });
      });
    });
    S.all("feedback").forEach(function (f) {
      if (!f.at) return;
      push({ at: f.at, who: "client", type: "client", text: t("ac_fb", { k: t("ac_fb_" + (f.kind || "comment")) }), label: m.brand(f.clientId), ex: String(f.text || "").slice(0, 140), open: f.projectId && m.project(f.projectId) ? ["projects", { id: f.projectId }] : ["clients", { id: f.clientId }] });
    });
    out.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : b.n - a.n; });
    return out;
  }
  function filtered(list) {
    var st = P(), off = st.off || {};
    return list.filter(function (e) {
      if (off[e.type]) return false;
      if (st.who === "-") return !e.who || !S.get("team", e.who);
      if (st.who && e.who !== st.who) return false;
      return true;
    });
  }

  /** Active projects with no log or task for 7+ days. */
  function quiet() {
    var td = u.today(), lim = u.addDays(td, -7), last = {};
    function bump(id, d) { if (id && d && (!last[id] || d > last[id])) last[id] = d; }
    var act = S.all("projects").filter(function (p) { return p.stage !== "retention"; });
    act.forEach(function (p) { (p.log || []).forEach(function (l) { bump(p.id, day(l.at)); }); bump(p.id, p.planApprovedOn); bump(p.id, p.shootDate && p.shootDate <= td ? p.shootDate : ""); });
    S.all("tasks").forEach(function (x) { bump(x.projectId, x.doneOn); (x.log || []).forEach(function (l) { bump(x.projectId, day(l.at)); }); });
    S.all("invoices").forEach(function (i) { (i.payments || []).forEach(function (p) { bump(i.projectId, p.date); }); bump(i.projectId, i.issued); });
    return act.filter(function (p) { return !last[p.id] || last[p.id] < lim; }).map(function (p) { return { p: p, last: last[p.id] || "" }; })
      .sort(function (a, b) { return (a.last || "0") < (b.last || "0") ? -1 : 1; });
  }

  function insight(all) {
    var td = u.today(), w0 = u.addDays(td, -6), p0 = u.addDays(td, -13);
    var wk = all.filter(function (e) { return day(e.at) >= w0; }), pv = all.filter(function (e) { return day(e.at) >= p0 && day(e.at) < w0; });
    var pay = wk.filter(function (e) { return e.amount; }), payP = pv.filter(function (e) { return e.amount; });
    var per = {}; wk.forEach(function (e) { if (e.who && S.get("team", e.who)) per[e.who] = (per[e.who] || 0) + 1; });
    var top = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; })[0];
    var q = quiet(), diff = wk.length - pv.length;
    var spark = []; for (var i = 6; i >= 0; i--) { var d = u.addDays(td, -i); spark.push(all.filter(function (e) { return day(e.at) === d; }).length); }
    var h = TK.kpis([
      { label: t("ac_k_changes"), value: wk.length, delta: pv.length ? Math.round(diff / pv.length * 100) : null, deltaLabel: t("ac_k_changes_n", { d: (diff > 0 ? "+" : diff < 0 ? "−" : "±") + Math.abs(diff), p: pv.length }), spark: spark },
      { label: t("ac_k_cash"), value: u.money(u.sum(pay, function (e) { return e.amount; })), note: t(pay.length === 1 ? "ac_k_cash_n1" : "ac_k_cash_n", { n: pay.length, p: u.money(u.sum(payP, function (e) { return e.amount; })) }) },
      { label: t("ac_k_who"), value: top ? m.member(top).name : "—", note: top ? t("ac_k_who_n", { n: per[top] }) : "" },
      { label: t("ac_k_quiet"), value: q.length, note: t("ac_k_quiet_n") }
    ]);
    if (q.length) {
      var x = q[0];
      h += TK.decision({
        title: q.length === 1 ? t("ac_dec_t1") : t("ac_dec_t", { n: q.length }),
        why: t("ac_dec_why", { p: m.projectLabel(x.p), d: x.last ? u.daysBetween(x.last, td) : "30+" }),
        recommend: t("ac_dec_rec"), tone: "urgent", action: { label: t("ac_dec_btn"), a: "ac-proj", data: { id: x.p.id }, cls: "primary sm" }
      });
    }
    return h;
  }

  function row(e, i) {
    var w = e.who === "client" ? { name: t("ac_client") } : e.who ? m.member(e.who) : null;
    var lead = w ? ui.av(w.name, e.who === TK.me().id ? "gel" : "") : '<span class="ac-ic ' + e.type + '" aria-hidden="true">' + ui.icon(ICON[e.type]) + "</span>";
    var tm = String(e.at).length > 10 ? String(e.at).slice(11, 16) : "";
    return '<div class="ac-row">' + lead + '<div class="ac-b"><span class="ac-tx">' + (w ? "<b>" + esc(w.name) + "</b> " : "") + esc(e.text) + "</span>" +
      (e.label ? '<button type="button" class="ac-ref" data-a="ac-open" data-i="' + i + '">' + esc(e.label) + "</button>" : '<button type="button" class="ac-ref" data-a="ac-open" data-i="' + i + '">' + esc(t("open")) + "</button>") +
      (e.ex ? '<span class="ac-ex">' + esc(e.ex) + "</span>" : "") + "</div>" +
      '<span class="ac-tm">' + esc(tm) + '<span class="ty">' + esc(t("ac_t_" + e.type)) + "</span></span></div>";
  }

  var shown = [];
  GK.view("activity", {
    render: function () {
      var head = ui.head({ label: t("nav_activity"), title: t("ac_title"), accent: t("ac_accent"), sub: "", actions: ui.sample() });
      if (!m.isFounder()) return head + ui.empty(t("ac_founder_only"));
      var st = P(), days = Math.max(STEP, +st.days || STEP), since = u.addDays(u.today(), -(days - 1));
      var all = entries(u.addDays(u.today(), -Math.max(days, 14)));
      var inRange = all.filter(function (e) { return day(e.at) >= since; });
      var list = filtered(inRange), off = st.off || {};
      shown = list.slice(0, MAX_ROWS);
      var counts = {}; inRange.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
      var team = S.all("team").sort(u.by("name"));
      var h = ui.head({ label: t("nav_activity"), title: t("ac_title"), accent: t("ac_accent"), sub: esc(t("ac_sub", { n: inRange.length, d: days })), actions: ui.sample() });
      h += insight(all);
      h += '<div class="gk-bar"><div class="gk-bar-l">' + TK.chips("ac-type", TYPES.map(function (k) { return { v: k, label: t("ac_t_" + k), on: !off[k], n: counts[k] || 0 }; }), t("ac_types")) + "</div>" +
        '<div class="gk-bar-l" style="flex:0 1 auto">' + TK.select("ac-who", t("ac_person"), st.who || "", [["", t("ac_anyone")]].concat(team.map(function (x) { return [x.id, x.name]; })).concat([["-", t("ac_system")]])) +
        (st.who || Object.keys(off).some(function (k) { return off[k]; }) ? ui.btn(t("ac_clear"), "ac-clear", { cls: "ghost sm" }) : "") + "</div></div>";
      var body = "", cur = "";
      shown.forEach(function (e, i) {
        var d = day(e.at);
        if (d !== cur) { body += (cur ? "</div>" : "") + '<div class="gk-daylab"><span>' + esc(TK.dayLabel(d)) + "</span></div><div>"; cur = d; }
        body += row(e, i);
      });
      if (cur) body += "</div>";
      h += '<section class="panel" style="gap:0">' + (shown.length ? body : ui.empty(t("ac_none"))) +
        (list.length > shown.length ? '<p class="small muted">' + esc(t("ac_cut", { n: MAX_ROWS })) + "</p>" : "") +
        '<div class="row" style="justify-content:center;padding-top:12px">' + ui.btn(t("ac_older"), "ac-older", { cls: "ghost sm" }) + "</div></section>";
      return h;
    },
    count: function () { return ""; }
  });

  GK.act("ac-open", function (el) {
    var e = shown[+el.getAttribute("data-i")];
    if (e && e.open) ui.go(e.open[0], e.open[1]);
  });
  GK.act("ac-proj", function (el) { ui.go("projects", { id: el.getAttribute("data-id") }); });
  GK.act("ac-type", function (el) {
    var k = el.getAttribute("data-v"), o = Object.assign({}, P().off || {});
    o[k] = !o[k];
    ui.go("activity", { off: o });
  });
  GK.change("ac-who", function (el) { ui.go("activity", { who: el.value }); });
  GK.act("ac-clear", function () { ui.go("activity", { who: "", off: {} }); });
  GK.act("ac-older", function () { var st = P(); ui.go("activity", { days: Math.max(STEP, +st.days || STEP) + STEP }); });
})(window.GK);
