/* GECKO Ops · module: today. The first screen each person sees, shaped by their role. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    td_t_founder: ["Home", "Accueil"], td_a_founder: ["", ""],
    td_t_sales: ["Home", "Accueil"], td_a_sales: ["", ""],
    td_t_editor: ["Home", "Accueil"], td_a_editor: ["", ""],
    td_t_assistant: ["Home", "Accueil"], td_a_assistant: ["", ""],
    td_hello: ["Hi {name}. Here's what needs you today.", "Bonjour {name}. Voici ce qui vous attend aujourd'hui."], td_hello_anon: ["Here's what needs you today.", "Voici ce qui vous attend aujourd'hui."],
    td_needs: ["Needs you", "Pour vous"],
    td_needs_none: ["Nothing waiting on you. Good day to shoot or to sell.", "Rien ne vous attend. Bonne journée pour tourner ou vendre."],
    td_plan_wait: ["Plan waiting for client approval", "Plan en attente de validation client"],
    td_review_wait_1: ["1 file in internal review", "1 fichier en relecture"], td_review_wait_n: ["{n} files in internal review", "{n} fichiers en relecture"],
    td_overdue: ["Overdue invoice", "Facture en retard"],
    td_draft: ["Draft invoice to issue", "Brouillon de facture à émettre"],
    td_blocked: ["Blocked", "Bloqué"],
    td_month_due: ["Create the next monthly project", "Créer le prochain projet mensuel"],
    td_commission: ["Partner share owed", "Part partenaire due"],
    td_follow: ["Follow-up due", "Relance à faire"],
    td_late: ["Late", "En retard"], td_today: ["Today", "Aujourd'hui"],
    td_due_on: ["due {d}", "échéance {d}"], td_late_since: ["overdue since {d}", "en retard depuis le {d}"],
    td_b_plan: ["Open plan", "Voir le plan"], td_b_review: ["Review", "Relire"], td_b_invoice: ["Open invoice", "Voir la facture"],
    td_b_issue: ["Issue", "Émettre"], td_b_project: ["Open project", "Voir le projet"], td_b_create: ["Create", "Créer"],
    td_b_pay: ["Pay", "Payer"], td_b_lead: ["Open lead", "Voir le prospect"],
    td_k_cash: ["Cash in this month", "Encaissé ce mois"], td_k_cash_n: ["net, after withholding", "net, après retenue"],
    td_k_owed: ["Clients still owe", "Reste à encaisser"], td_k_owed_0: ["No open invoice", "Aucune facture ouverte"], td_k_owed_1: ["1 open invoice", "1 facture ouverte"], td_k_owed_n: ["{n} open invoices", "{n} factures ouvertes"],
    td_k_active: ["Active projects", "Projets actifs"], td_k_active_0: ["No shoot this week", "Aucun tournage cette semaine"], td_k_active_1: ["1 shoot this week", "1 tournage cette semaine"], td_k_active_n: ["{n} shoots this week", "{n} tournages cette semaine"],
    td_k_cap: ["Yearly cap used", "Plafond annuel utilisé"], td_k_cap_n: ["{used} of {cap}", "{used} sur {cap}"],
    td_my_tasks: ["My tasks", "Mes tâches"], td_no_tasks: ["No open tasks. Add one from Team.", "Aucune tâche ouverte. Ajoutez-en depuis Équipe."],
    td_all_tasks: ["All tasks", "Toutes les tâches"], td_no_due: ["no date", "sans date"],
    td_shoots7: ["Shoots in the next 7 days", "Tournages des 7 prochains jours"], td_next_shoots: ["Next shoots", "Prochains tournages"],
    td_no_shoots: ["No shoot planned.", "Aucun tournage prévu."],
    td_in_days: ["in {n} days", "dans {n} jours"], td_tomorrow: ["Tomorrow", "Demain"],
    td_ready: ["Ready", "Prêt"], td_checklist: ["Checklist {n}/{t}", "Checklist {n}/{t}"],
    // sales
    td_log: ["Today's DM log", "DM du jour"], td_dms: ["DMs sent", "DM envoyés"], td_replies: ["Replies", "Réponses"], td_calls: ["Calls booked", "Appels prévus"],
    td_log_save: ["Save today", "Enregistrer"], td_log_saved: ["Logged. Keep going.", "Enregistré. On continue."],
    td_of_target: ["{n} of {t} DMs today", "{n} DM sur {t} aujourd'hui"], td_target_hit: ["Target hit. Anything more is a bonus.", "Objectif atteint. Le reste est du bonus."],
    td_week: ["This week", "Cette semaine"], td_k_dms: ["DMs", "DM"], td_k_replies: ["Replies", "Réponses"], td_k_calls: ["Calls", "Appels"],
    td_k_props: ["Proposals", "Propositions"], td_k_won: ["Won", "Gagnés"], td_avg: ["{n} a day on average", "{n} par jour en moyenne"],
    td_reply_rate: ["{n} reply rate", "{n} de réponses"],
    td_follows: ["Follow-ups due", "Relances à faire"], td_no_follows: ["No follow-up due. Send new DMs.", "Aucune relance due. Envoyez de nouveaux DM."],
    td_props: ["Proposals waiting", "Propositions en attente"], td_no_props: ["No proposal out right now.", "Aucune proposition en cours."],
    td_sent_ago: ["sent {n} days ago", "envoyée il y a {n} jours"],
    td_comm: ["Partner share", "Part partenaire"], td_k_c_owed: ["Owed to you", "Dû"], td_k_c_paid: ["Paid so far", "Déjà payé"],
    td_k_c_wait: ["Waiting on client payment", "En attente du paiement client"], td_k_c_n: ["{n}% of project profit", "{n} % du bénéfice projet"],
    td_no_log: ["Only sales can log DMs.", "Seul le commercial peut saisir les DM."],
    // editor
    td_files: ["Files to work on", "Fichiers à travailler"], td_no_files: ["Nothing to edit. Check with the owner.", "Rien à monter. Voyez avec le fondateur."],
    td_open_prod: ["Open production", "Ouvrir la production"], td_drive: ["Drive", "Drive"],
    td_c_file: ["File", "Fichier"], td_c_project: ["Project", "Projet"], td_c_status: ["Status", "Statut"],
    td_more_files: ["{n} more in Production.", "{n} de plus dans Production."],
    // founder home (V03)
    td_h_label: ["Cash in · {m}", "Encaissé · {m}"], td_h_goal: ["Monthly goal", "Objectif du mois"],
    td_h_sub_goal: ["{p} of the {g} goal. {o} still to collect.", "{p} de l'objectif de {g}. {o} encore à encaisser."],
    td_h_sub: ["Net cash received this month. {o} still to collect.", "Encaissé net ce mois-ci. {o} encore à encaisser."],
    td_h_last: ["Last month: {a}", "Mois dernier : {a}"], td_h_open: ["Open money", "Ouvrir l'argent"],
    td_k_late_amt: ["{a} late", "{a} en retard"], td_k_invoiced: ["Invoiced this month", "Facturé ce mois"], td_vs_last: ["vs last month", "vs mois dernier"],
    td_k_pipe: ["Pipeline, weighted", "Prospection pondérée"], td_k_pipe_n: ["of {a} if every lead signs", "sur {a} si tout signe"], td_k_pipe_wr: ["of {a} · win rate {w}", "sur {a} · taux de signature {w}"],
    td_k_runway: ["Cash runway", "Autonomie"], td_k_months: ["{n} months", "{n} mois"], td_k_burn: ["at {a} out a month", "à {a} de sorties par mois"], td_k_runway_none: ["Set the opening cash in Settings", "Indiquez la trésorerie de départ dans Réglages"],
    td_r_plan: ["Resend the plan link on WhatsApp and ask for a yes today.", "Renvoyez le lien du plan sur WhatsApp et demandez un oui aujourd'hui."],
    td_r_review: ["Approve or send back with one clear note.", "Validez ou renvoyez avec une note claire."],
    td_r_overdue: ["Call {brand} today; no new files until it is paid.", "Appelez {brand} aujourd'hui ; pas de nouveaux fichiers avant paiement."],
    td_r_draft: ["Issue it now so the due date starts running.", "Émettez-la maintenant pour lancer l'échéance."],
    td_r_blocked: ["Clear the gate before planning more work on it.", "Levez le blocage avant de planifier plus de travail."],
    td_r_month: ["Create next month so the shoot can be booked.", "Créez le mois suivant pour réserver le tournage."],
    td_r_comm: ["Pay it with the next transfer.", "Payez-la avec le prochain virement."], td_r_follow: ["Send the follow-up today.", "Envoyez la relance aujourd'hui."],
    td_more_tasks: ["{n} more in Tasks.", "{n} de plus dans Tâches."],
    td_all: ["View all {n}", "Tout voir ({n})"], td_less: ["Show less", "Voir moins"], td_view_all: ["View all", "Tout voir"],
    td_recent: ["Recent activity", "Activité récente"], td_recent_none: ["Nothing happened in the last 7 days.", "Rien ces 7 derniers jours."],
    td_a_paid: ["{brand} paid {amt}", "{brand} a payé {amt}"], td_a_fb_approve: ["{brand} approved", "{brand} a validé"], td_a_fb_changes: ["{brand} asked for changes", "{brand} demande des retouches"], td_a_fb_comment: ["{brand} commented", "{brand} a commenté"],
    td_a_task: ["Done: {title}", "Fait : {title}"], td_yday: ["Yesterday", "Hier"], td_days_ago: ["{n} days ago", "il y a {n} jours"],
    td_load: ["Team load", "Charge de l'équipe"], td_c_person: ["Person", "Personne"], td_c_load: ["Open tasks", "Tâches ouvertes"], td_c_late: ["Late", "En retard"], td_c_done7: ["Done, 7 days", "Faites, 7 jours"],
    td_c_money: ["Invoiced and cash in", "Facturé et encaissé"], td_c_money_sub: ["Last 6 months, TND", "6 derniers mois, TND"], td_c_inv: ["Invoiced", "Facturé"], td_c_cash: ["Cash in", "Encaissé"]
  });

  /** key_0 / key_1 / key_n by count (key_0 falls back to key_n). */
  function plural(key, n) { return n === 1 ? t(key + "_1") : n === 0 && GK.i18n.has(key + "_0") ? t(key + "_0") : t(key + "_n", { n: n }); }
  function me() { return GK.me() || { id: "", name: "", role: "founder" }; }
  function today() { return u.today(); }
  function active(p) { return p.stage !== "retention"; }
  function founderName() { var f = S.all("team").find(function (x) { return x.role === "founder"; }); return f ? f.name : ""; }
  function salesName() { var f = S.all("team").find(function (x) { return x.role === "sales"; }); return f ? f.name : t("role_sales"); }
  function dueLabel(d) {
    if (!d) return t("td_no_due");
    var n = u.daysBetween(today(), d);
    if (n === 0) return t("td_today");
    if (n === 1) return t("td_tomorrow");
    return u.fmtDate(d);
  }
  function line(main, meta, btn) {
    return '<div class="li"><div class="stack" style="gap:2px;min-width:0"><span>' + main + "</span>" + (meta ? '<span class="m">' + meta + "</span>" : "") + "</div>" + (btn || "") + "</div>";
  }
  function panel(title, body, right) {
    return '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(title) + "</h2>" + (right || "") + "</div>" + body + "</section>";
  }
  function followsDue(owner) {
    var td = today();
    return S.all("leads").filter(function (l) { return l.nextDate && l.nextDate <= td && l.stage !== "won" && l.stage !== "lost" && (!owner || l.owner === owner); }).sort(u.by("nextDate"));
  }

  /** Founder queue: [{main, meta, label, view, params, alert}] */
  function needs() {
    var out = [], td = today();
    var projects = S.all("projects");
    projects.filter(function (p) { return p.stage === "scripting" && !p.planApproved; }).forEach(function (p) {
      out.push({ main: t("td_plan_wait"), meta: m.projectLabel(p), label: t("td_b_plan"), view: "projects", params: { id: p.id }, rec: t("td_r_plan"), icon: "projects" });
    });
    projects.filter(active).forEach(function (p) {
      var n = m.files(p).filter(function (f) { return f.item.status === "review"; }).length;
      if (n) out.push({ main: plural("td_review_wait", n), meta: m.projectLabel(p), label: t("td_b_review"), view: "production", params: { projectId: p.id }, rec: t("td_r_review"), icon: "production" });
    });
    S.all("invoices").filter(function (i) { return m.invStatus(i) === "overdue"; }).sort(u.by("due")).forEach(function (i) {
      out.push({ main: t("td_overdue") + " · " + i.no, meta: m.brand(i.clientId) + " · " + u.money(m.invBalance(i)) + " · " + t("td_late_since", { d: u.fmtDate(i.due) }), label: t("td_b_invoice"), view: "finance", params: { invoiceId: i.id, tab: "invoices" }, alert: true, rec: t("td_r_overdue", { brand: m.brand(i.clientId) }), icon: "invoice" });
    });
    S.all("invoices").filter(function (i) { return m.invStatus(i) === "draft"; }).forEach(function (i) {
      out.push({ main: t("td_draft"), meta: m.brand(i.clientId) + " · " + (i.label || t("k_" + i.kind)) + " · " + u.money(m.invTotal(i)), label: t("td_b_issue"), view: "finance", params: { invoiceId: i.id, tab: "invoices" }, rec: t("td_r_draft"), icon: "invoice" });
    });
    projects.filter(function (p) { return active(p) && m.STAGES.indexOf(p.stage) >= m.STAGES.indexOf("shoot"); }).forEach(function (p) {
      m.gates(p).forEach(function (g) { out.push({ main: t("td_blocked") + " · " + m.projectLabel(p), meta: g, label: t("td_b_project"), view: "projects", params: { id: p.id }, alert: true, rec: t("td_r_blocked"), icon: "alert" }); });
    });
    m.monthsDue().forEach(function (c) {
      var n = m.contractMonths(c).length + 1;
      out.push({ main: t("td_month_due"), meta: m.brand(c.clientId) + " · " + m.pack(c.pack).name + " · " + u.fmtMonth(m.monthKey(c.start, n)), label: t("td_b_create"), view: "projects", params: {}, rec: t("td_r_month"), icon: "calendar" });
    });
    projects.forEach(function (p) {
      var c = m.commission(p);
      if (c.owed > 0) out.push({ main: t("td_commission", { name: salesName() }) + " · " + u.money(c.owed), meta: m.projectLabel(p), label: t("td_b_pay"), view: "finance", params: { tab: "commission", invoiceId: "" }, rec: t("td_r_comm"), icon: "cash" });
    });
    followsDue().forEach(function (l) {
      out.push({ main: t("td_follow") + " · " + l.brand, meta: (l.next || t("ls_" + l.stage)) + " · " + (l.nextDate < td ? t("td_late") : t("td_today")), label: t("td_b_lead"), view: "pipeline", params: { id: l.id }, alert: l.nextDate < td, rec: l.next || t("td_r_follow"), icon: "lead" });
    });
    return out;
  }

  function myTasks(id) {
    return S.all("tasks").filter(function (x) { return x.who === id && !x.done; }).sort(function (a, b) { var A = a.due || "9999", B = b.due || "9999"; return A < B ? -1 : A > B ? 1 : 0; });
  }
  function tasksPanel() {
    var all = myTasks(me().id), list = all.slice(0, 8), td = today(), can = m.can("tasks");
    var body = list.length ? '<div class="list">' + list.map(function (x) {
      var p = x.projectId ? m.project(x.projectId) : null;
      var late = x.due && x.due < td;
      return '<div class="li"><label class="check" style="padding:0;min-width:0"><input type="checkbox" data-c="td-task" data-id="' + esc(x.id) + '"' + (can ? "" : " disabled") + "><span>" + esc(x.title) +
        (p ? '<br><span class="small muted">' + esc(m.projectLabel(p)) + "</span>" : "") + "</span></label>" +
        (late ? ui.pill(t("td_late") + " · " + dueLabel(x.due), "alert") : '<span class="small muted num" style="white-space:nowrap">' + esc(dueLabel(x.due)) + "</span>") + "</div>";
    }).join("") + "</div>" + (all.length > list.length ? '<p class="small faint">' + esc(t("td_more_tasks", { n: all.length - list.length })) + "</p>" : "") : ui.empty(t("td_no_tasks"));
    return panel(t("td_my_tasks"), body, ui.btn(t("td_all_tasks"), "td-go", { cls: "ghost sm", data: { v: ui.nav().indexOf("tasks") > -1 ? "tasks" : "team" } }));
  }
  function shootsPanel(days, title, withChecklist) {
    var td = today(), end = days ? u.addDays(td, days) : "9999";
    var list = S.all("projects").filter(function (p) { return active(p) && p.shootDate && p.shootDate >= td && p.shootDate <= end; }).sort(u.by("shootDate")).slice(0, 8);
    var body = list.length ? '<div class="list">' + list.map(function (p) {
      var n = u.daysBetween(td, p.shootDate);
      var when = n === 0 ? t("td_today") : n === 1 ? t("td_tomorrow") : t("td_in_days", { n: n });
      var ob = (p.onboarding || []).filter(Boolean).length;
      var meta = esc(u.fmtDate(p.shootDate, { weekday: "short", day: "numeric", month: "short" })) + " · " + esc(when) + " · " + esc(m.pack(p.pack).name);
      if (withChecklist) meta += " · " + esc(t("td_checklist", { n: ob, t: m.ONBOARDING_STEPS }));
      var pill = m.canShoot(p) ? ui.pill(t("td_ready"), "done") : ui.pill(t("td_blocked"), "alert");
      return '<div class="li click" tabindex="0" data-a="td-go" data-v="projects" data-id="' + esc(p.id) + '"><div class="stack" style="gap:2px;min-width:0"><strong>' + esc(m.brand(p.clientId)) + '</strong><span class="m">' + esc(p.name) + " · " + meta + "</span></div>" + pill + "</div>";
    }).join("") + "</div>" : ui.empty(t("td_no_shoots"));
    return panel(title, body);
  }
  function upcomingShootCount(days) {
    var td = today(), end = u.addDays(td, days);
    return S.all("projects").filter(function (p) { return active(p) && p.shootDate && p.shootDate >= td && p.shootDate <= end; }).length;
  }

  // ---------- founder: decide first (insight strip, hero, decisions), then activity, team load and money ----------
  function monthCash(ym) {
    var c = 0;
    S.all("invoices").forEach(function (i) { if (i.kind === "credit") return; (i.payments || []).forEach(function (p) { if (u.month(p.date) === ym) c += m.toTND(+p.net || 0, i.currency || "TND"); }); });
    return c;
  }
  function founder() {
    var q = needs(), td = today(), ym = u.month(td), X = GK.x;
    var cash = monthCash(ym);
    var invs = S.all("invoices");
    var open = invs.filter(function (i) { return i.no && i.kind !== "credit" && !i.credited && m.invBalance(i) > 0; });
    var owed = u.sum(open, m.invBalance), late = open.filter(function (i) { return m.invStatus(i) === "overdue"; }), lateAmt = u.sum(late, m.invBalance);
    var goal = +((S.config() || {}).goals || {}).monthlyRevenue || 0, pv = X.pipelineValue(), wr = X.winRate();

    // money in one quiet panel: this month's cash, what is owed, the pipeline
    var pct = goal ? cash / goal * 100 : 0;
    var money = '<section class="card c5"><div class="card-h"><span class="lead">' + ui.icon("cash") + "<h2>" + esc(t("td_h_label", { m: u.fmtMonth(ym) })) + "</h2></span>" +
      ui.btn(t("td_h_open"), "td-go", { cls: "ghost sm", data: { v: "finance" } }) + "</div>" +
      '<div class="td-big num">' + esc(u.money(cash)) + "</div>" +
      (goal ? '<div class="stack" style="gap:6px"><div class="meter-lab"><span>' + esc(t("td_h_goal")) + "</span><span>" + esc(u.pct(Math.min(pct, 999))) + "</span></div>" + ui.meter(pct, { segments: 24, sm: true }) + "</div>" : "") +
      '<div class="list">' +
      line(esc(t("td_k_owed")), late.length ? esc(t("td_k_late_amt", { a: u.money(lateAmt) })) : esc(plural("td_k_owed", open.length)), '<span class="num">' + esc(u.money(owed)) + "</span>") +
      line(esc(t("td_k_pipe")), esc(wr == null ? t("td_k_pipe_n", { a: u.money(pv.total) }) : t("td_k_pipe_wr", { a: u.money(pv.total), w: u.pct(wr) })), '<span class="num">' + esc(u.money(pv.weighted)) + "</span>") +
      "</div></section>";
    var h = "";
    // decisions: what is waiting, why, what to do, one button
    var all = !!ui.p("today").all, shown = all ? q : q.slice(0, 6);
    var dec = '<section class="card c7"><div class="card-h"><span class="lead">' + ui.icon("sparkle") + "<h2>" + esc(t("td_needs", { name: me().name || founderName() })) + "</h2>" + (q.length ? '<span class="cnt hot">' + q.length + "</span>" : "") + "</span>" +
      (q.length > 6 ? ui.btn(all ? t("td_less") : t("td_all", { n: q.length }), "td-all", { cls: "ghost sm" }) : "") + "</div>" +
      (q.length ? '<div class="decs">' + shown.map(function (x, i) {
        return ui.decision({ title: x.main, why: x.meta, recommend: x.rec, icon: x.icon, tone: x.alert ? "urgent" : "", action: { label: x.label, a: "td-need", data: { i: i }, cls: x.alert ? "primary sm" : "sm" } });
      }).join("") + "</div>" : ui.empty({ icon: "check", title: t("td_needs_none") })) + "</section>";

    h += '<div class="g12">' + dec + money + "</div>";
    h += '<div class="grid2">' + tasksPanel() + shootsPanel(7, t("td_shoots7")) + "</div>";
    return h;
  }

  // ---------- sales ----------
  function sales() {
    var who = me(), td = today(), id = td + "_" + who.id;
    var rec = S.get("outreach", id) || { dms: 0, replies: 0, calls: 0 };
    var can = m.can("outreach");
    var log = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("td_log")) + '</h2><span class="small muted">' + esc(u.fmtDate(td, { weekday: "long", day: "numeric", month: "long" })) + "</span></div>" +
      '<div class="form" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
      ui.field({ id: "td-dms", label: t("td_dms"), type: "number", value: rec.dms || 0, attrs: ' min="0" step="1"' }) +
      ui.field({ id: "td-replies", label: t("td_replies"), type: "number", value: rec.replies || 0, attrs: ' min="0" step="1"' }) +
      ui.field({ id: "td-calls", label: t("td_calls"), type: "number", value: rec.calls || 0, attrs: ' min="0" step="1"' }) +
      "</div>" +
      '<div class="row between"><span></span>' +
      ui.btn(t("td_log_save"), "td-log-save", { cls: "primary", disabled: !can, title: can ? "" : t("td_no_log") }) + "</div></section>";

    var ws = u.weekStart(td), f = m.funnel(ws, who.id);
    var days = Math.max(1, u.daysBetween(ws, td) + 1);
    var week = '<section class="stack"><h2 class="sec">' + esc(t("td_week")) + "</h2>" + ui.kpis([
      { lab: t("td_k_dms"), v: String(f.dms), n: t("td_avg", { n: u.dec(f.dms / days, 1) }) },
      { lab: t("td_k_replies"), v: String(f.replies), n: t("td_reply_rate", { n: u.pct(f.dms ? f.replies / f.dms * 100 : 0) }) },
      { lab: t("td_k_calls"), v: String(f.calls) },
      { lab: t("td_k_props"), v: String(f.proposals), n: t("td_k_won") + " " + f.won }
    ]) + "</section>";

    var fl = followsDue(who.id);
    var follows = panel(t("td_follows"), fl.length ? '<div class="list">' + fl.map(function (l) {
      var late = l.nextDate < td;
      return line((late ? ui.pill(t("td_late"), "alert") + " " : "") + "<strong>" + esc(l.brand) + "</strong> · " + esc(t("ls_" + l.stage)), esc(l.next || "") + (l.next ? " · " : "") + esc(dueLabel(l.nextDate)), ui.btn(t("td_b_lead"), "td-go", { cls: "sm", data: { v: "pipeline", id: l.id } }));
    }).join("") + "</div>" : ui.empty(t("td_no_follows")));

    var props = S.all("leads").filter(function (l) { return l.stage === "proposal" && l.owner === who.id; });
    var propP = panel(t("td_props"), props.length ? '<div class="list">' + props.map(function (l) {
      var h = (l.history || []).filter(function (x) { return x.stage === "proposal"; }).pop();
      var meta = esc(m.pack(l.pack).name) + " · " + esc(u.money(m.pack(l.pack).price)) + (h ? " · " + esc(t("td_sent_ago", { n: Math.max(0, u.daysBetween(h.at, td)) })) : "");
      return line("<strong>" + esc(l.brand) + "</strong>", meta, ui.btn(t("td_b_lead"), "td-go", { cls: "sm", data: { v: "pipeline", id: l.id } }));
    }).join("") + "</div>" : ui.empty(t("td_no_props")));

    return '<div class="grid2">' + follows + propP + "</div>" + '<div class="grid2">' + tasksPanel() + shootsPanel(7, t("td_shoots7")) + "</div>" + log + week;
  }

  // ---------- editor ----------
  function safeUrl(s) { return /^https?:\/\//i.test(String(s || "")) ? s : ""; }
  function editor() {
    var order = { revise: 0, edit: 1, todo: 2 }, rows = [];
    S.all("projects").filter(active).forEach(function (p) {
      m.files(p).forEach(function (f) {
        var st = f.item.status || "todo";
        if (order[st] != null) rows.push({ p: p, f: f, st: st });
      });
    });
    rows.sort(function (a, b) { return order[a.st] - order[b.st] || (a.p.shootDate || "").localeCompare(b.p.shootDate || ""); });
    var shown = rows.slice(0, 40);
    var body = rows.length ? '<div class="tbl"><table><thead><tr><th>' + esc(t("td_c_file")) + "</th><th>" + esc(t("td_c_project")) + "</th><th>" + esc(t("td_c_status")) + "</th><th></th></tr></thead><tbody>" +
      shown.map(function (r) {
        var link = safeUrl(r.f.item.drive || (r.f.reel && r.f.reel.drive));
        var txt = r.f.kind === "hook" ? r.f.item.text : r.f.item.title;
        return '<tr><td><span class="code">' + esc(r.f.code) + "</span>" + (txt ? '<br><span class="small muted">' + esc(txt) + "</span>" : "") + (r.f.item.note ? '<br><span class="small">' + esc(r.f.item.note) + "</span>" : "") +
          "</td><td>" + esc(m.projectLabel(r.p)) + "</td><td>" + ui.filePill(r.st) + "</td><td>" + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(t("td_drive")) + "</a>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (rows.length > shown.length ? '<p class="small muted">' + esc(t("td_more_files", { n: rows.length - shown.length })) + "</p>" : "")
      : ui.empty(t("td_no_files"));
    return panel(t("td_files"), body, ui.btn(t("td_open_prod"), "td-go", { cls: "primary sm", data: { v: "production" } })) +
      '<div class="grid2">' + tasksPanel() + shootsPanel(0, t("td_next_shoots")) + "</div>";
  }

  // ---------- assistant ----------
  function assistant() {
    return '<div class="grid2">' + tasksPanel() + shootsPanel(0, t("td_next_shoots"), true) + "</div>";
  }

  GK.view("today", {
    render: function () {
      var who = me(), role = who.role || "founder";
      if (!{ founder: 1, sales: 1, editor: 1, assistant: 1 }[role]) role = "founder";
      var body = role === "sales" ? sales() : role === "editor" ? editor() : role === "assistant" ? assistant() : founder();
      return ui.head({ label: t("nav_today") + " · " + u.fmtDate(today(), { weekday: "short", day: "numeric", month: "short" }), title: t("td_t_" + role), accent: t("td_a_" + role),
        sub: esc((who.name || founderName()) ? t("td_hello", { name: who.name || founderName() }) : t("td_hello_anon")), actions: ui.sample() }) + body;
    },
    count: function () {
      var who = GK.me();
      if (!who || who.role === "founder") return needs().length || "";
      return myTasks(who.id).length || "";
    }
  });

  var css = document.createElement("style"); css.id = "gk-today-css";
  css.textContent = ".td-big{font-size:clamp(28px,4vw,40px);line-height:1.1;letter-spacing:-.01em}";
  document.head.appendChild(css);

  GK.act("td-need", function (el) {
    var x = needs()[+el.getAttribute("data-i")];
    if (x) ui.go(x.view, x.params);
  });
  GK.act("td-all", function () { ui.go("today", { all: !ui.p("today").all }); });
  GK.act("td-go", function (el) {
    var v = el.getAttribute("data-v"), id = el.getAttribute("data-id");
    ui.go(v, id ? { id: id } : null);
  });
  GK.change("td-task", function (el) {
    if (!m.can("tasks")) { el.checked = false; return; }
    S.patch("tasks", el.getAttribute("data-id"), { done: true, doneOn: u.today() });
    ui.toast(t("saved"));
    ui.render(true);
  });
  GK.act("td-log-save", function () {
    var who = GK.me();
    if (!who) return;
    var v = {};
    ["dms", "replies", "calls"].forEach(function (k) { v[k] = Math.max(0, Math.round(u.numVal("td-" + k))); });
    S.put("outreach", { id: u.today() + "_" + who.id, date: u.today(), owner: who.id, dms: v.dms, replies: v.replies, calls: v.calls });
    ui.toast(t("td_log_saved"));
    ui.render(true);
  });
})(window.GK);
