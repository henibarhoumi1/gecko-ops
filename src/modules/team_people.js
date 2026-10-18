/* GECKO Ops · module: team people. People cards, member profile (info, pay, history, performance) and role pay defaults.
   Data per member (on the team record; with the Supabase backend, where team records cannot be edited from the page,
   the same three objects live in config.teamExtra[id]):
     info    {phone, whatsapp, email, startDate, skills, notes}         visible to the member and the owner
     private {cin, rib, contract, emergencyName, emergencyPhone}         owner only
     pay     {type: ""|"project"|"day"|"month", amount: number|null, currency, note}   owner only; "" = use the role default
   Role defaults: config.rolePay[role] = {type, amount, note}. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    tp_people: ["The team", "L'équipe"], tp_back: ["All people", "Toute l'équipe"],
    tp_active_n: ["{n} active projects", "{n} projets en cours"], tp_active_1: ["1 active project", "1 projet en cours"],
    tp_open: ["Open profile", "Ouvrir le profil"],
    tp_sub_info: ["Info", "Infos"], tp_sub_pay: ["Pay", "Paie"], tp_sub_history: ["History", "Historique"], tp_sub_perf: ["Performance", "Performance"],
    tp_contact: ["Contact", "Contact"], tp_phone: ["Phone", "Téléphone"], tp_whatsapp: ["WhatsApp", "WhatsApp"], tp_email: ["Email", "E-mail"],
    tp_start: ["Start date", "Date de début"], tp_skills: ["Skills and gear", "Compétences et matériel"], tp_notes: ["Notes", "Notes"],
    tp_creds: ["Credentials", "Dossier administratif"], tp_creds_note: ["Only the owner sees this block.", "Seul le fondateur voit ce bloc."],
    tp_cin: ["ID or CIN number", "Numéro de CIN"], tp_rib: ["Bank RIB", "RIB bancaire"], tp_contract: ["Contract type", "Type de contrat"],
    tp_em_name: ["Emergency contact", "Contact d'urgence"], tp_em_phone: ["Emergency phone", "Téléphone d'urgence"],
    tp_c_none: ["Not set", "Non défini"], tp_c_freelance: ["Freelance", "Freelance"], tp_c_employee: ["Employee", "Salarié"], tp_c_partner: ["Partner", "Associé"], tp_c_intern: ["Intern", "Stagiaire"],
    tp_save: ["Save", "Enregistrer"], tp_saved: ["Saved", "Enregistré"], tp_not_set: ["Not filled in yet", "Pas encore rempli"],
    tp_no_edit: ["Only the owner or this person can change this.", "Seuls le fondateur ou cette personne peuvent modifier."],
    tp_limited: ["You can see contact details and open tasks for this person.", "Vous voyez les coordonnées et les tâches ouvertes de cette personne."],
    tp_joined_on: ["Joined {d}", "Depuis le {d}"],
    // pay
    tp_pay_h: ["Pay setup", "Rémunération"], tp_pay_sub: ["Fill this in when you are ready. Only the owner sees it.", "À remplir quand vous serez prêt. Seul le fondateur le voit."],
    tp_pay_type: ["Paid", "Payé"], tp_pay_inherit: ["Use the role default", "Reprendre le défaut du rôle"],
    tp_pt_project: ["Per project", "Par projet"], tp_pt_day: ["Per day", "Par jour"], tp_pt_month: ["Monthly salary", "Salaire mensuel"],
    tp_pay_amount: ["Amount (TND)", "Montant (TND)"], tp_pay_note: ["Note", "Note"],
    tp_pay_eff: ["Applies now", "Appliqué actuellement"], tp_pay_from_role: ["from the role default", "défaut du rôle"], tp_pay_own: ["set for this person", "défini pour cette personne"],
    tp_pay_unset: ["Not set yet", "Pas encore défini"], tp_pay_amt_unset: ["Amount not set yet", "Montant pas encore défini"],
    tp_u_project: ["per project", "par projet"], tp_u_day: ["per day", "par jour"], tp_u_month: ["a month", "par mois"],
    tp_est_h: ["Estimate for this month", "Estimation pour ce mois"],
    tp_est_note: ["An estimate from tasks and shoot dates in the app. It is not a payslip.", "Une estimation à partir des tâches et dates de tournage de l'app. Ce n'est pas une fiche de paie."],
    tp_est_month: ["Monthly salary", "Salaire mensuel"], tp_est_day: ["{n} shoot days × {r}", "{n} jours de tournage × {r}"], tp_est_project: ["{n} projects delivered × {r}", "{n} projets livrés × {r}"],
    tp_est_na: ["No estimate until a rate is set.", "Pas d'estimation tant qu'un tarif n'est pas défini."],
    tp_est_days_hint: ["Shoot days count projects shot this month where this person has a task.", "Les jours de tournage comptent les projets tournés ce mois-ci où cette personne a une tâche."],
    tp_est_proj_hint: ["Delivered projects count those where this person finished a task this month.", "Les projets livrés comptent ceux où cette personne a terminé une tâche ce mois-ci."],
    tp_owner_rates: ["Owner pay rates from Settings", "Tarifs du fondateur dans Réglages"],
    tp_or_direct: ["Directing and camera, per shoot day", "Réalisation et caméra, par jour de tournage"],
    tp_or_edit: ["Editing a pack: up to 6 reels / 7 to 14 / 15 or more", "Montage d'un pack : jusqu'à 6 reels / 7 à 14 / 15 ou plus"],
    tp_rp_h: ["Role pay defaults", "Rémunération par défaut des rôles"], tp_rp_sub: ["Each person takes their role's default unless you set theirs. Leave blank for later.", "Chacun prend le défaut de son rôle sauf si vous fixez le sien. Laissez vide pour plus tard."],
    tp_rp_save: ["Save defaults", "Enregistrer les défauts"], tp_rp_none: ["Later", "Plus tard"],
    // history
    tp_h_projects: ["Projects", "Projets"], tp_h_none_p: ["No project yet. Tasks linked to a project show it here.", "Aucun projet. Les tâches liées à un projet apparaissent ici."],
    tp_h_tasks: ["{a} of {b} tasks done", "{a} tâches faites sur {b}"],
    tp_h_done: ["Tasks finished", "Tâches terminées"], tp_h_none_t: ["No finished task yet.", "Aucune tâche terminée."],
    tp_h_log: ["Activity", "Activité"], tp_h_none_l: ["No activity logged.", "Aucune activité enregistrée."],
    // performance
    tp_k_30: ["Done, 30 days", "Faites, 30 jours"], tp_k_90: ["Done, 90 days", "Faites, 90 jours"],
    tp_k_ontime: ["On time", "À l'heure"], tp_k_ontime_n: ["{a} of {b} with a due date, last 90 days", "{a} sur {b} avec une échéance, 90 derniers jours"], tp_k_ontime_na: ["No dated task finished yet", "Aucune tâche datée terminée"],
    tp_k_late: ["Late now", "En retard"], tp_k_late_n: ["open tasks past their date", "tâches ouvertes dépassées"],
    tp_k_delivered: ["Projects delivered", "Projets livrés"], tp_k_delivered_n: ["with a task by this person", "avec une tâche de cette personne"],
    tp_k_avg: ["Finish vs due date", "Fin vs échéance"], tp_k_avg_n: ["average days, last 90 days", "jours en moyenne, 90 derniers jours"],
    tp_avg_early: ["{n} days early", "{n} jours d'avance"], tp_avg_late: ["{n} days late", "{n} jours de retard"], tp_avg_zero: ["On the day", "Le jour même"],
    tp_ch: ["Tasks finished per week", "Tâches terminées par semaine"], tp_ch_sub: ["Last 12 weeks. A task counts on the day it was ticked.", "12 dernières semaines. Une tâche compte le jour où elle est cochée."],
    tp_ch_s: ["Tasks", "Tâches"],
    tp_perf_note: ["Counts only what is ticked in the app. It shows how work moves, not how good it is.", "Ne compte que ce qui est coché dans l'app. Cela montre le rythme, pas la qualité."]
  });

  var STYLE_ID = "tp-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style"); s.id = STYLE_ID;
    s.textContent =
      ".tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}" +
      ".tp-card{border:1px solid var(--line);background:var(--bg,transparent);display:flex;flex-direction:column;min-width:0;animation:tp-in .28s ease both}" +
      ".tp-card .tp-main{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:14px;min-width:0;width:100%}" +
      ".tp-card .tp-main:hover,.tp-card .tp-main:focus-visible{outline:2px solid var(--chroma);outline-offset:-2px}" +
      ".tp-card .tp-t{min-width:0;display:flex;flex-direction:column;gap:3px}" +
      ".tp-card .tp-t strong{overflow-wrap:anywhere}" +
      ".tp-card .tp-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--line);flex-wrap:wrap}" +
      ".tp-sub{display:flex;gap:6px;flex-wrap:wrap}" +
      ".tp-kv{display:grid;grid-template-columns:minmax(120px,max-content) 1fr;gap:6px 16px;margin:0}" +
      ".tp-kv dt{color:var(--tx-2)}.tp-kv dd{margin:0;overflow-wrap:anywhere}" +
      ".tp-est{border:1px solid var(--line);border-left:4px solid var(--chroma);padding:12px 14px;display:flex;flex-direction:column;gap:4px}" +
      ".tp-est b{font-size:1.5rem}" +
      ".tp-rp{display:grid;grid-template-columns:minmax(110px,1fr) 150px 120px;gap:8px;align-items:end}" +
      "@media(max-width:560px){.tp-rp{grid-template-columns:1fr 1fr}.tp-rp .tp-rl{grid-column:1/-1}.tp-kv{grid-template-columns:1fr}}" +
      "@keyframes tp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
      "@media(prefers-reduced-motion:reduce){.tp-card{animation:none}}";
    document.head.appendChild(s);
  }

  // ---------- data ----------
  function me() { return GK.me() || { id: "", role: "founder" }; }
  function p() { return ui.p("team"); }
  function isOwner() { return m.isFounder() && m.can("*"); }
  function extra(id) { return ((m.cfg().teamExtra || {})[id]) || {}; }
  var PRIV = ["private", "pay"];
  /** Pay and credentials live in config.teamPrivate, which the server strips for everyone but the owner. */
  function privX(id) { return ((m.cfg().teamPrivate || {})[id]) || {}; }
  function getX(mb, key) {
    if (PRIV.indexOf(key) > -1) { var pv = privX(mb.id)[key]; if (pv && Object.keys(pv).length) return pv; }
    var own = mb[key], ex = extra(mb.id)[key];
    return (own && Object.keys(own).length ? own : ex) || {};
  }
  function saveX(mb, key, val) {
    if (PRIV.indexOf(key) > -1) {
      var pa = u.clone(m.cfg().teamPrivate || {}); pa[mb.id] = Object.assign({}, pa[mb.id] || {}); pa[mb.id][key] = val;
      if (mb[key] && S.backend !== "supabase") { var clear = {}; clear[key] = null; S.patch("team", mb.id, clear, { log: "" }); }
      return S.setConfig({ teamPrivate: pa });
    }
    if (S.backend === "supabase") {
      var all = u.clone(m.cfg().teamExtra || {}); all[mb.id] = Object.assign({}, all[mb.id] || {}); all[mb.id][key] = val;
      return S.setConfig({ teamExtra: all });
    }
    var part = {}; part[key] = val;
    return S.patch("team", mb.id, part, { log: "profile" });
  }
  function canEdit(mb, priv) {
    if (isOwner()) return true;
    if (priv) return false;
    return mb.id === me().id && S.backend !== "supabase";
  }
  function rolePay(role) {
    var d = (m.cfg().rolePay || {})[role];
    if (d && (d.type || d.amount != null)) return d;
    if (role === "founder") return { type: "day", amount: m.rates().ownerDirect, note: "" };
    return { type: "", amount: null, note: "" };
  }
  /** The pay that applies: the person's own, else the role default. */
  function effPay(mb) {
    var own = getX(mb, "pay");
    if (own.type) return { pay: own, src: "own" };
    return { pay: rolePay(mb.role), src: "role" };
  }
  function tasksOf(id) { return S.all("tasks").filter(function (x) { return x.who === id; }); }
  function doneDate(x) { return x.doneOn || x.due || ""; }
  function stageIdx(pr) { return m.STAGES.indexOf(pr.stage); }
  function isActive(pr) { return pr.stage !== "retention" && pr.stage !== "paid" && pr.stage !== "delivered"; }
  function projectsOf(id) {
    var by = {};
    tasksOf(id).forEach(function (x) {
      if (!x.projectId) return;
      var pr = m.project(x.projectId); if (!pr) return;
      var o = by[pr.id] = by[pr.id] || { p: pr, done: 0, total: 0, last: "" };
      o.total++; if (x.done) { o.done++; if (doneDate(x) > o.last) o.last = doneDate(x); }
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.p.stage === b.p.stage ? 0 : isActive(a.p) ? -1 : 1; });
  }
  function activeCount(id) { return projectsOf(id).filter(function (o) { return isActive(o.p); }).length; }
  function money(v) { return u.money ? u.money(v) : Math.round(v) + " TND"; }

  function stats(id) {
    var today = u.today(), ts = tasksOf(id), done = ts.filter(function (x) { return x.done; });
    function since(n) { var d = u.addDays(today, -n); return done.filter(function (x) { return doneDate(x) >= d; }); }
    var d90 = since(90), dated = d90.filter(function (x) { return x.due && x.doneOn; });
    var onTime = dated.filter(function (x) { return x.doneOn <= x.due; }).length;
    var avg = dated.length ? dated.reduce(function (a, x) { return a + u.daysBetween(x.due, x.doneOn); }, 0) / dated.length : null;
    var late = ts.filter(function (x) { return !x.done && x.due && x.due < today; }).length;
    var delivered = projectsOf(id).filter(function (o) { return stageIdx(o.p) >= m.STAGES.indexOf("delivered"); }).length;
    // 12 weeks, Monday start
    var dow = (new Date(today + "T12:00:00").getDay() + 6) % 7, wk0 = u.addDays(today, -dow), labels = [], vals = [];
    for (var i = 11; i >= 0; i--) {
      var a = u.addDays(wk0, -7 * i), b = u.addDays(a, 6);
      labels.push(a.slice(8, 10) + "/" + a.slice(5, 7));
      vals.push(done.filter(function (x) { var d = doneDate(x); return d >= a && d <= b; }).length);
    }
    return { d30: since(30).length, d90: d90.length, dated: dated.length, onTime: onTime, avg: avg, late: late, delivered: delivered, labels: labels, vals: vals };
  }

  function estimate(mb) {
    var e = effPay(mb).pay, month = u.today().slice(0, 7), amt = e.amount;
    if (!e.type) return null;
    if (e.type === "month") return { text: t("tp_est_month"), total: amt };
    var ps = projectsOf(mb.id);
    if (e.type === "day") {
      var days = 0;
      ps.forEach(function (o) { if (String(o.p.shootDate || "").slice(0, 7) === month) days += (m.pack(o.p.pack).shootDays || 1); });
      return { text: t("tp_est_day", { n: days, r: amt == null ? "?" : money(amt) }), total: amt == null ? null : days * amt, hint: t("tp_est_days_hint") };
    }
    var n = 0;
    ps.forEach(function (o) {
      if (stageIdx(o.p) < m.STAGES.indexOf("delivered")) return;
      var hit = tasksOf(mb.id).some(function (x) { return x.projectId === o.p.id && x.done && String(doneDate(x)).slice(0, 7) === month; });
      if (hit) n++;
    });
    return { text: t("tp_est_project", { n: n, r: amt == null ? "?" : money(amt) }), total: amt == null ? null : n * amt, hint: t("tp_est_proj_hint") };
  }
  function payLine(pay) {
    if (!pay || !pay.type) return t("tp_pay_unset");
    return (pay.amount == null ? t("tp_pay_amt_unset") : money(pay.amount)) + " " + t("tp_u_" + pay.type);
  }

  // ---------- list ----------
  function card(x) {
    var self = x.id === me().id, n = activeCount(x.id), open = GK.team.openTasksFor(x.id).length;
    var own = isOwner();
    return '<article class="tp-card"><button type="button" class="tp-main" data-a="tp-open" data-id="' + esc(x.id) + '" aria-label="' + esc(t("tp_open") + ": " + x.name) + '">' +
      ui.avatar(x.name, self ? { tone: "gel" } : {}) + '<span class="tp-t"><strong>' + esc(x.name) + (self ? ' <span class="small muted">· ' + esc(t("tm_you")) + "</span>" : "") + "</strong>" +
      '<span class="lab sm">' + esc(t("role_" + x.role)) + "</span>" +
      '<span class="small muted">' + esc(n === 1 ? t("tp_active_1") : t("tp_active_n", { n: n })) + " · " + esc(t("tm_open_n", { n: open })) + "</span></span></button>" +
      '<div class="tp-foot"><span class="small muted">' + (S.mode === "live" ? (x.userId ? esc(t("tm_joined")) : esc(t("tm_not_joined"))) : (x.joinedOn ? esc(t("tp_joined_on", { d: u.fmtDate(x.joinedOn) })) : "")) + "</span>" +
      (own ? ui.btn(t("tm_remove"), "tm-member-del", { cls: "ghost sm", data: { id: x.id }, disabled: self, title: self ? t("tm_no_self") : t("tm_remove") }) : "") + "</div></article>";
  }
  function rolePayPanel() {
    var roles = m.ROLES;
    var h = '<section class="panel" data-tour="tp-rolepay"><div class="panel-h"><h2 class="sec">' + esc(t("tp_rp_h")) + '</h2></div><p class="small muted" style="margin:0 0 10px">' + esc(t("tp_rp_sub")) + '</p><div class="stack">';
    roles.forEach(function (r) {
      var d = rolePay(r);
      h += '<div class="tp-rp"><div class="tp-rl"><span class="lab sm">' + esc(t("role_" + r)) + "</span></div>" +
        ui.field({ id: "tp-rp-t-" + r, label: t("tp_pay_type"), type: "select", value: d.type || "", options: [["", t("tp_rp_none")], ["project", t("tp_pt_project")], ["day", t("tp_pt_day")], ["month", t("tp_pt_month")]] }) +
        ui.field({ id: "tp-rp-a-" + r, label: t("tp_pay_amount"), type: "number", value: d.amount == null ? "" : d.amount, attrs: ' min="0" step="any"' }) + "</div>";
    });
    return h + "</div>" + ownerRatesLine() + '<div class="row" style="justify-content:flex-end;margin-top:10px">' + ui.btn(t("tp_rp_save"), "tp-rp-save", { cls: "primary" }) + "</div></section>";
  }
  function ownerRatesLine() {
    var r = m.rates();
    return '<div class="small muted" style="margin-top:10px"><span class="lab sm">' + esc(t("tp_owner_rates")) + "</span><br>" + esc(t("tp_or_direct")) + ": " + esc(money(r.ownerDirect)) + "<br>" +
      esc(t("tp_or_edit")) + ": " + esc(money(r.editSmall)) + " / " + esc(money(r.editMid)) + " / " + esc(money(r.editLarge)) + "</div>";
  }
  function list() {
    var team = S.all("team").sort(function (a, b) { return m.ROLES.indexOf(a.role) - m.ROLES.indexOf(b.role) || (a.name > b.name ? 1 : -1); });
    var h = "";
    if (S.backend === "shared") h += '<p class="note">' + esc(t("tm_shared_note")) + "</p>";
    if (S.backend === "supabase") h += '<p class="note">Team access is granted by email invitation. The token is shown once; send it to the invited person through a trusted channel.</p>';
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_people")) + '</h2><span class="small muted">' + team.length + "</span>" +
      (S.backend === "supabase" ? ui.btn(t("tm_signout"), "auth-signout", { cls: "ghost sm" }) : "") + '</div><div class="tp-grid">' + team.map(card).join("") + "</div></section>";
    if (isOwner()) h += rolePayPanel();
    return h + GK.team.addPanel();
  }

  // ---------- profile ----------
  function row(label, val) { return "<dt>" + esc(label) + "</dt><dd>" + (val ? esc(val) : '<span class="muted">' + esc(t("tp_not_set")) + "</span>") + "</dd>"; }
  function link(kind, val) {
    if (!val) return "";
    var href = kind === "email" ? "mailto:" + val : kind === "wa" ? "https://wa.me/" + String(val).replace(/[^0-9]/g, "") : "tel:" + String(val).replace(/[^0-9+]/g, "");
    return '<a href="' + esc(href) + '"' + (kind === "wa" ? ' target="_blank" rel="noopener"' : "") + ">" + esc(val) + "</a>";
  }
  function infoTab(mb, full) {
    var inf = getX(mb, "info"), ed = canEdit(mb, false), h = "";
    if (!full) {
      h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_contact")) + '</h2></div><dl class="tp-kv">' +
        "<dt>" + esc(t("tp_phone")) + "</dt><dd>" + (link("tel", inf.phone) || '<span class="muted">' + esc(t("tp_not_set")) + "</span>") + "</dd>" +
        "<dt>" + esc(t("tp_whatsapp")) + "</dt><dd>" + (link("wa", inf.whatsapp) || '<span class="muted">' + esc(t("tp_not_set")) + "</span>") + "</dd>" +
        "<dt>" + esc(t("tp_email")) + "</dt><dd>" + (link("email", inf.email) || '<span class="muted">' + esc(t("tp_not_set")) + "</span>") + "</dd></dl></section>";
      return h + '<p class="note">' + esc(t("tp_limited")) + "</p>";
    }
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_contact")) + "</h2></div>";
    if (ed) {
      h += '<div class="form">' +
        ui.field({ id: "tp-i-phone", label: t("tp_phone"), type: "tel", value: inf.phone }) +
        ui.field({ id: "tp-i-wa", label: t("tp_whatsapp"), type: "tel", value: inf.whatsapp }) +
        ui.field({ id: "tp-i-email", label: t("tp_email"), type: "email", value: inf.email }) +
        ui.field({ id: "tp-i-start", label: t("tp_start"), type: "date", value: inf.startDate }) +
        ui.field({ id: "tp-i-skills", label: t("tp_skills"), type: "textarea", value: inf.skills, span: true, rows: 2 }) +
        ui.field({ id: "tp-i-notes", label: t("tp_notes"), type: "textarea", value: inf.notes, span: true, rows: 3 }) +
        '</div><div class="row" style="justify-content:flex-end">' + ui.btn(t("tp_save"), "tp-info-save", { cls: "primary", data: { id: mb.id } }) + "</div>";
    } else {
      h += '<dl class="tp-kv">' + row(t("tp_phone"), inf.phone) + row(t("tp_whatsapp"), inf.whatsapp) + row(t("tp_email"), inf.email) +
        row(t("tp_start"), inf.startDate ? u.fmtDate(inf.startDate) : "") + row(t("tp_skills"), inf.skills) + row(t("tp_notes"), inf.notes) + "</dl>" +
        '<p class="small muted">' + esc(t("tp_no_edit")) + "</p>";
    }
    h += "</section>";
    if (isOwner()) {
      var pv = getX(mb, "private");
      h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_creds")) + '</h2><span class="small muted">' + esc(t("tp_creds_note")) + '</span></div><div class="form">' +
        ui.field({ id: "tp-p-cin", label: t("tp_cin"), value: pv.cin, attrs: ' autocomplete="off"' }) +
        ui.field({ id: "tp-p-rib", label: t("tp_rib"), value: pv.rib, attrs: ' autocomplete="off"' }) +
        ui.field({ id: "tp-p-contract", label: t("tp_contract"), type: "select", value: pv.contract || "", options: [["", t("tp_c_none")], ["freelance", t("tp_c_freelance")], ["employee", t("tp_c_employee")], ["partner", t("tp_c_partner")], ["intern", t("tp_c_intern")]] }) +
        ui.field({ id: "tp-p-emname", label: t("tp_em_name"), value: pv.emergencyName }) +
        ui.field({ id: "tp-p-emphone", label: t("tp_em_phone"), type: "tel", value: pv.emergencyPhone }) +
        '</div><div class="row" style="justify-content:flex-end">' + ui.btn(t("tp_save"), "tp-priv-save", { cls: "primary", data: { id: mb.id } }) + "</div></section>";
    }
    return h;
  }
  function payTab(mb) {
    var own = getX(mb, "pay"), eff = effPay(mb), est = estimate(mb), r = m.rates();
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_pay_h")) + '</h2></div><p class="small muted" style="margin:0">' + esc(t("tp_pay_sub")) + '</p><div class="form">' +
      ui.field({ id: "tp-pay-type", label: t("tp_pay_type"), type: "select", value: own.type || "", options: [["", t("tp_pay_inherit")], ["project", t("tp_pt_project")], ["day", t("tp_pt_day")], ["month", t("tp_pt_month")]] }) +
      ui.field({ id: "tp-pay-amount", label: t("tp_pay_amount"), type: "number", value: own.amount == null ? "" : own.amount, attrs: ' min="0" step="any"' }) +
      ui.field({ id: "tp-pay-note", label: t("tp_pay_note"), value: own.note, span: true }) +
      '</div><div class="row between"><span class="small muted"><span class="lab sm">' + esc(t("tp_pay_eff")) + "</span> " + esc(payLine(eff.pay)) + " · " + esc(eff.src === "own" ? t("tp_pay_own") : t("tp_pay_from_role")) + "</span>" +
      ui.btn(t("tp_save"), "tp-pay-save", { cls: "primary", data: { id: mb.id } }) + "</div></section>";
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_est_h")) + '</h2></div><div class="tp-est">';
    if (!est || est.total == null) h += '<span class="small muted">' + esc(est ? est.text + " · " + t("tp_pay_amt_unset") : t("tp_est_na")) + "</span>";
    else h += '<b>' + esc(money(est.total)) + '</b><span>' + esc(est.text) + "</span>";
    h += '<span class="small muted">' + esc(t("tp_est_note")) + (est && est.hint ? " " + esc(est.hint) : "") + "</span></div>";
    if (mb.role === "founder") h += ownerRatesLine();
    return h + "</section>";
  }
  function historyTab(mb) {
    var ps = projectsOf(mb.id), ts = tasksOf(mb.id).filter(function (x) { return x.done; }).sort(u.by(doneDate, "desc")).slice(0, 15);
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_h_projects")) + '</h2><span class="small muted">' + ps.length + "</span></div>";
    h += ps.length ? '<div class="list">' + ps.map(function (o) {
      return '<div class="li"><div class="stack" style="gap:2px;min-width:0"><strong style="overflow-wrap:anywhere">' + esc(m.projectLabel(o.p)) + '</strong><span class="small muted">' + esc(t("tp_h_tasks", { a: o.done, b: o.total })) + " · " + esc(t("st_" + o.p.stage)) + "</span></div>" +
        ui.btn(t("tp_open"), "tp-proj", { cls: "ghost sm", data: { id: o.p.id } }) + "</div>";
    }).join("") + "</div>" : ui.empty(t("tp_h_none_p"));
    h += '</section><section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_h_done")) + "</h2></div>";
    h += ts.length ? '<div class="list">' + ts.map(function (x) {
      var pr = x.projectId ? m.project(x.projectId) : null;
      return '<div class="li"><span style="min-width:0;overflow-wrap:anywhere">' + esc(x.title) + (pr ? '<br><span class="small muted">' + esc(m.projectLabel(pr)) + "</span>" : "") + '</span><span class="small muted" style="white-space:nowrap">' + esc(doneDate(x) ? u.fmtDate(doneDate(x)) : "") + "</span></div>";
    }).join("") + "</div>" : ui.empty(t("tp_h_none_t"));
    h += "</section>";
    var logs = [];
    ["tasks", "projects", "leads", "clients", "ideas", "quotes", "boards"].forEach(function (c) {
      S.all(c).forEach(function (rec) { (rec.log || []).forEach(function (l) { if (l && l.who === mb.id) logs.push(l); }); });
    });
    logs.sort(u.by("at", "desc")); logs = logs.slice(0, 15);
    h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tp_h_log")) + "</h2></div>";
    h += logs.length ? '<div class="list">' + logs.map(function (l) {
      return '<div class="li"><span class="small" style="min-width:0;overflow-wrap:anywhere">' + esc(l.text) + '</span><span class="small muted" style="white-space:nowrap">' + esc(u.fmtDate(String(l.at).slice(0, 10))) + "</span></div>";
    }).join("") + "</div>" : ui.empty(t("tp_h_none_l"));
    return h + "</section>";
  }
  function perfTab(mb) {
    var s = stats(mb.id), avgTxt, avgN = s.avg == null ? null : Math.round(s.avg * 10) / 10;
    if (avgN == null) avgTxt = "—"; else if (avgN === 0) avgTxt = t("tp_avg_zero"); else avgTxt = avgN < 0 ? t("tp_avg_early", { n: Math.abs(avgN) }) : t("tp_avg_late", { n: avgN });
    var h = ui.kpis([
      { lab: t("tp_k_30"), v: String(s.d30) },
      { lab: t("tp_k_90"), v: String(s.d90) },
      { lab: t("tp_k_ontime"), v: s.dated ? Math.round(s.onTime / s.dated * 100) + "%" : "—", n: s.dated ? t("tp_k_ontime_n", { a: s.onTime, b: s.dated }) : t("tp_k_ontime_na") },
      { lab: t("tp_k_late"), v: String(s.late), n: t("tp_k_late_n") },
      { lab: t("tp_k_delivered"), v: String(s.delivered), n: t("tp_k_delivered_n") },
      { lab: t("tp_k_avg"), v: avgTxt, n: t("tp_k_avg_n") }
    ]);
    h += GK.charts.bars({ title: t("tp_ch"), sub: t("tp_ch_sub"), labels: s.labels, series: [{ name: t("tp_ch_s"), values: s.vals }], fmt: function (v) { return String(v); }, height: 210 });
    return h + '<p class="small muted">' + esc(t("tp_perf_note")) + "</p>";
  }

  function profile(id) {
    var mb = S.get("team", id);
    if (!mb) { p().id = null; return list(); }
    var own = isOwner(), self = mb.id === me().id, full = own || self;
    var subs = full ? ["info"].concat(own ? ["pay"] : []).concat(["history", "perf"]) : ["info"];
    var sub = subs.indexOf(p().sub) > -1 ? p().sub : "info";
    var inf = getX(mb, "info");
    var h = '<div class="row between" style="margin-bottom:8px">' + ui.btn(t("tp_back"), "tp-back", { cls: "ghost sm", icon: "back" }) + "</div>" +
      '<div class="row" style="flex-wrap:nowrap;margin-bottom:12px">' + ui.avatar(mb.name, self ? { tone: "gel", size: "lg" } : { size: "lg" }) +
      '<div class="stack" style="gap:2px;min-width:0"><h2 class="sec" style="margin:0;overflow-wrap:anywhere">' + esc(mb.name) + (self ? ' <span class="small muted">· ' + esc(t("tm_you")) + "</span>" : "") + '</h2><span class="lab sm">' + esc(t("role_" + mb.role)) +
      (inf.startDate ? " · " + esc(t("tp_joined_on", { d: u.fmtDate(inf.startDate) })) : "") + "</span></div></div>";
    if (subs.length > 1) h += '<div class="tabs" role="tablist">' + subs.map(function (k) {
      return '<button type="button" role="tab" data-a="tp-sub" data-v="' + k + '" aria-selected="' + (k === sub) + '">' + esc(t("tp_sub_" + (k === "perf" ? "perf" : k))) + "</button>";
    }).join("") + "</div>";
    h += sub === "pay" ? payTab(mb) : sub === "history" ? historyTab(mb) : sub === "perf" ? perfTab(mb) : infoTab(mb, full);
    return h;
  }

  GK.teamPeople = {
    render: function () { injectStyle(); var id = p().id; return id ? profile(id) : list(); }
  };

  // ---------- actions ----------
  GK.act("tp-open", function (el) { ui.go("team", { tab: "people", id: el.getAttribute("data-id"), sub: "info" }); });
  GK.act("tp-back", function () { ui.go("team", { tab: "people", id: null }); });
  GK.act("tp-sub", function (el) { ui.go("team", { sub: el.getAttribute("data-v") }); });
  GK.act("tp-proj", function (el) { ui.go("projects", { id: el.getAttribute("data-id") }); });
  GK.act("tp-info-save", function (el) {
    var mb = S.get("team", el.getAttribute("data-id")); if (!mb || !canEdit(mb, false)) return ui.toast(t("tp_no_edit"));
    var v = function (id) { return u.val(id).trim().slice(0, 300); };
    saveX(mb, "info", { phone: v("tp-i-phone"), whatsapp: v("tp-i-wa"), email: v("tp-i-email"), startDate: u.val("tp-i-start"), skills: v("tp-i-skills"), notes: u.val("tp-i-notes").trim().slice(0, 1500) });
    ui.toast(t("tp_saved"));
  });
  GK.act("tp-priv-save", function (el) {
    var mb = S.get("team", el.getAttribute("data-id")); if (!mb || !isOwner()) return ui.toast(t("tp_no_edit"));
    var v = function (id) { return u.val(id).trim().slice(0, 120); };
    saveX(mb, "private", { cin: v("tp-p-cin"), rib: v("tp-p-rib"), contract: u.val("tp-p-contract"), emergencyName: v("tp-p-emname"), emergencyPhone: v("tp-p-emphone") });
    ui.toast(t("tp_saved"));
  });
  GK.act("tp-pay-save", function (el) {
    var mb = S.get("team", el.getAttribute("data-id")); if (!mb || !isOwner()) return ui.toast(t("tp_no_edit"));
    var a = u.val("tp-pay-amount").trim(), n = a === "" ? null : Math.max(0, parseFloat(a));
    saveX(mb, "pay", { type: u.val("tp-pay-type"), amount: n == null || isNaN(n) ? null : n, currency: "TND", note: u.val("tp-pay-note").trim().slice(0, 200) });
    ui.toast(t("tp_saved"));
  });
  GK.act("tp-rp-save", function () {
    if (!isOwner()) return ui.toast(t("tp_no_edit"));
    var out = {};
    m.ROLES.forEach(function (r) {
      var a = u.val("tp-rp-a-" + r).trim(), n = a === "" ? null : Math.max(0, parseFloat(a));
      out[r] = { type: u.val("tp-rp-t-" + r), amount: n == null || isNaN(n) ? null : n, note: "" };
    });
    S.setConfig({ rolePay: out });
    ui.toast(t("tp_saved"));
  });
})(window.GK);
