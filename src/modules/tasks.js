/* GECKO Ops · module: tasks
   Everyone's to-do list. Insight strip, list grouped by due (overdue, today, next 7 days, later, done),
   a board (To do / Doing / Done), filters (person, project, client, My tasks), quick add with Enter,
   inline complete with undo, and a right side panel to edit one task.
   Additive task fields (optional, older records work without them):
     status: "" | "doing"   set from the board or the panel; "Doing" also includes open tasks due today or overdue
     note:   free text      shown and edited in the side panel
     log:    [{at, who, text}] the store's activity lines (written through S.put / S.patch {log})
   Shared helpers for the tasks, calendar, inbox and activity views live on GK.tk. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    tk_title: ["Who does", "Qui fait"], tk_accent: ["what", "quoi"],
    tk_sub: ["{open} open · {late} overdue · {week} due in the next 7 days", "{open} ouvertes · {late} en retard · {week} à faire sous 7 jours"],
    // insight
    tk_k_open: ["Open", "Ouvertes"], tk_k_open_n: ["across {n} people", "pour {n} personnes"], tk_k_open_1: ["for one person", "pour une personne"],
    tk_k_late: ["Overdue", "En retard"], tk_k_late_n: ["oldest {n} days late", "la plus ancienne : {n} jours"], tk_k_late_n1: ["oldest 1 day late", "la plus ancienne : 1 jour"], tk_k_late_0: ["nothing late", "rien en retard"],
    tk_k_week: ["Due in 7 days", "À faire sous 7 jours"], tk_k_week_n: ["{n} due today", "{n} pour aujourd'hui"],
    tk_k_done: ["Done, last 7 days", "Faites, 7 derniers jours"], tk_k_done_n: ["{d} vs the 7 days before ({p})", "{d} par rapport aux 7 jours d'avant ({p})"],
    tk_dec_t: ["{n} tasks are overdue", "{n} tâches sont en retard"], tk_dec_t1: ["1 task is overdue", "1 tâche est en retard"],
    tk_dec_why: ["Oldest: “{title}” ({who}), {d} days late.", "La plus ancienne : « {title} » ({who}), {d} jours de retard."],
    tk_dec_why1: ["Oldest: “{title}” ({who}), 1 day late.", "La plus ancienne : « {title} » ({who}), 1 jour de retard."],
    tk_dec_rec: ["Finish it, give it to someone else or move the date.", "Terminez-la, confiez-la à quelqu'un d'autre ou changez la date."],
    tk_dec_btn: ["Open the task", "Ouvrir la tâche"],
    // filters
    tk_everyone: ["Everyone", "Tout le monde"], tk_mine: ["My tasks", "Mes tâches"],
    tk_f_who: ["Person", "Personne"], tk_f_proj: ["Project", "Projet"], tk_f_client: ["Client", "Client"],
    tk_f_any_who: ["Anyone", "Tout le monde"], tk_f_any_proj: ["All projects", "Tous les projets"], tk_f_any_client: ["All clients", "Tous les clients"],
    tk_f_clear: ["Clear filters", "Effacer les filtres"], tk_view: ["View", "Affichage"], tk_list: ["List", "Liste"], tk_board: ["Board", "Tableau"],
    tk_filters: ["Filters", "Filtres"],
    // quick add
    tk_q_title: ["New task", "Nouvelle tâche"], tk_q_ph: ["What needs doing? Enter adds it", "Que faut-il faire ? Entrée pour ajouter"],
    tk_q_who: ["Who", "Qui"], tk_q_proj: ["Project", "Projet"], tk_q_due: ["Due", "Pour le"], tk_add: ["Add", "Ajouter"],
    tk_added: ["Task added", "Tâche ajoutée"], tk_no_project: ["No project", "Sans projet"], tk_unassigned: ["Not assigned", "Non attribuée"],
    tk_no_right: ["You can view tasks but not change them.", "Vous pouvez voir les tâches mais pas les modifier."],
    // groups
    tk_g_late: ["Overdue", "En retard"], tk_g_today: ["Today", "Aujourd'hui"], tk_g_week: ["Next 7 days", "7 prochains jours"],
    tk_g_later: ["Later or no date", "Plus tard ou sans date"], tk_g_done: ["Done", "Faites"],
    tk_done_recent: ["Done in the last 14 days", "Faites ces 14 derniers jours"], tk_show_all_done: ["Show all {n} done", "Voir les {n} faites"],
    tk_nothing: ["No tasks match these filters.", "Aucune tâche pour ces filtres."], tk_all_clear: ["Nothing open. Add the next thing that needs doing.", "Rien d'ouvert. Ajoutez la prochaine chose à faire."],
    tk_late_d: ["{n} d late", "{n} j de retard"], tk_today: ["Today", "Aujourd'hui"], tk_tomorrow: ["Tomorrow", "Demain"], tk_yesterday: ["Yesterday", "Hier"], tk_no_due: ["No date", "Sans date"],
    tk_done_on: ["done {d}", "faite le {d}"],
    tk_complete: ["Mark “{title}” done", "Marquer « {title} » comme faite"], tk_reopen_l: ["Reopen “{title}”", "Rouvrir « {title} »"],
    tk_done_toast: ["Done: {title}", "Faite : {title}"], tk_reopened: ["Reopened: {title}", "Rouverte : {title}"],
    // board
    tk_c_todo: ["To do", "À faire"], tk_c_doing: ["Doing", "En cours"], tk_c_done: ["Done", "Faites"],
    tk_c_doing_n: ["Started, due today or overdue", "Commencées, pour aujourd'hui ou en retard"],
    tk_start: ["Start", "Commencer"], tk_finish: ["Done", "Faite"], tk_back_todo: ["Back to do", "Remettre à faire"], tk_reopen: ["Reopen", "Rouvrir"],
    tk_moved: ["Moved to {c}", "Déplacée vers {c}"],
    // panel
    tk_p_label: ["Task", "Tâche"], tk_p_title: ["Title", "Titre"], tk_p_status: ["Status", "Statut"], tk_p_note: ["Note", "Note"],
    tk_p_note_ph: ["Details, links, what done looks like", "Détails, liens, à quoi ressemble « fait »"],
    tk_p_log: ["History", "Historique"], tk_p_nolog: ["No changes recorded yet.", "Aucune modification enregistrée."],
    tk_p_open_proj: ["Open project", "Ouvrir le projet"], tk_saved: ["Task saved", "Tâche enregistrée"],
    tk_del_q: ["Delete this task?", "Supprimer cette tâche ?"], tk_del_b: ["It goes for everyone.", "Elle disparaît pour tout le monde."],
    tk_deleted: ["Task deleted", "Tâche supprimée"], tk_no_del: ["Only Heni or the person on the task can delete it.", "Seuls Heni ou la personne concernée peuvent la supprimer."],
    tk_gone: ["This task no longer exists.", "Cette tâche n'existe plus."],
    tk_log_new: ["Created", "Créée"], tk_log_done: ["Marked done", "Marquée faite"], tk_log_reopen: ["Reopened", "Rouverte"],
    tk_log_doing: ["Started", "Commencée"], tk_log_todo: ["Back to do", "Remise à faire"], tk_log_edit: ["Edited: {f}", "Modifiée : {f}"],
    tk_fld_title: ["title", "titre"], tk_fld_who: ["person", "personne"], tk_fld_proj: ["project", "projet"], tk_fld_due: ["due date", "échéance"],
    tk_fld_note: ["note", "note"], tk_fld_status: ["status", "statut"],
    tk_esc: ["Esc closes", "Échap pour fermer"]
  });

  // ---------- shared helpers (used by calendar, inbox and activity too) ----------
  var TK = GK.tk = GK.tk || {};
  /** Inject one <style id> once. Tokens only. */
  TK.css = function (id, text) {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    var s = document.createElement("style"); s.id = id; s.textContent = text;
    (document.head || document.documentElement).appendChild(s);
  };
  /** Insight strip: [{label, value, note, delta (pct number or null), deltaLabel, spark:[]}] -> KPI tiles. */
  TK.kpis = function (items) {
    if (typeof ui.kpi === "function") {
      try { return ui.kpis(items.map(function (k) { return { label: k.label, value: String(k.value), delta: k.delta, deltaLabel: k.deltaLabel, hint: k.note, spark: k.spark, good: k.good, icon: k.icon }; })); }
      catch (e) { /* fall back to the V02 tiles */ }
    }
    return ui.kpis(items.map(function (k) { return { lab: k.label, v: String(k.value), n: k.deltaLabel || k.note || "" }; }));
  };
  /** One decision card: what is happening, why (with the number), what to do, one button. action: {label, a, data, cls} */
  TK.decision = function (o) {
    if (typeof ui.decision === "function") return ui.decision(o);
    var a = o.action;
    return '<section class="panel gk-dec" aria-label="' + esc(o.title) + '"><div class="gk-dec-b"><strong>' + esc(o.title) + "</strong>" +
      '<span class="small">' + esc(o.why) + '</span><span class="small muted">' + esc(o.recommend) + "</span></div>" + (a ? ui.btn(a.label, a.a, { cls: a.cls || "primary sm", data: a.data }) : "") + "</section>";
  };
  /** Right side panel (480px, full screen on phone). close = action name that closes it. */
  TK.side = function (o) {
    return '<div class="gk-scrim" data-a="' + esc(o.close) + '" aria-hidden="true"></div>' +
      '<aside class="panel-side gk-side" id="' + esc(o.id) + '" role="dialog" aria-modal="true" aria-labelledby="' + esc(o.id) + '-h" tabindex="-1">' +
      '<div class="gk-side-h"><div class="stack" style="gap:2px;min-width:0">' + (o.label ? '<span class="lab sm muted">' + esc(o.label) + "</span>" : "") +
      '<h2 class="sec" id="' + esc(o.id) + '-h" style="overflow-wrap:anywhere">' + esc(o.title) + "</h2></div>" +
      '<button type="button" class="btn ghost sm" data-a="' + esc(o.close) + '" title="' + esc(t("tk_esc")) + '">' + esc(t("close")) + "</button></div>" +
      '<div class="gk-side-b">' + o.body + "</div>" + (o.foot ? '<div class="gk-side-f">' + o.foot + "</div>" : "") + "</aside>";
  };
  /** Wire Esc + first focus on a side panel after render. */
  TK.sideAfter = function (main, id, closeAction, focusFirst) {
    var el = main.querySelector("#" + id);
    if (!el) return;
    el.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); ui.trigger(closeAction); } });
    if (focusFirst) { var f = el.querySelector("input:not([disabled]),select:not([disabled]),textarea:not([disabled])"); (f || el).focus(); }
  };
  /** Toggle chips: [{v, label, on, dot, n}] for action a. */
  TK.chips = function (a, list, label) {
    return '<div class="gk-chips" role="group"' + (label ? ' aria-label="' + esc(label) + '"' : "") + ">" + list.map(function (c) {
      return '<button type="button" class="gk-chip" data-a="' + esc(a) + '" data-v="' + esc(c.v) + '" aria-pressed="' + (!!c.on) + '">' + (c.dot ? '<i class="gk-dot ' + esc(c.dot) + '" aria-hidden="true"></i>' : "") + esc(c.label) + (c.n != null ? ' <span class="gk-chip-n">' + esc(c.n) + "</span>" : "") + "</button>";
    }).join("") + "</div>";
  };
  /** Compact filter select (label read by screen readers, the first option says what it filters). Fires GK.change(id). */
  TK.select = function (id, label, value, options) {
    return '<div class="field gk-sel' + (value ? " on" : "") + '"><label class="gk-sr" for="' + esc(id) + '">' + esc(label) + "</label>" +
      '<select id="' + esc(id) + '" data-c="' + esc(id) + '" title="' + esc(label) + '">' + options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
      }).join("") + "</select></div>";
  };
  /** Segmented control (tabs style). list: [[value, label]] */
  TK.seg = function (a, list, cur, label) {
    return '<div class="tabs gk-seg" role="tablist"' + (label ? ' aria-label="' + esc(label) + '"' : "") + ">" + list.map(function (x) {
      return '<button type="button" role="tab" data-a="' + esc(a) + '" data-v="' + esc(x[0]) + '" aria-selected="' + (x[0] === cur) + '">' + esc(x[1]) + "</button>";
    }).join("") + "</div>";
  };
  /** Avatar + name. */
  TK.who = function (id, mine) {
    var w = id ? m.member(id) : null, name = w ? w.name : t("tk_unassigned");
    return '<span class="gk-who">' + ui.av(name, mine ? "gel" : "") + '<span class="gk-who-n">' + esc(name) + "</span></span>";
  };
  TK.me = function () { return GK.me() || { id: "", name: "", role: "founder" }; };
  TK.role = function () { var x = GK.me(); return x ? x.role : (S.backend === "shared" ? "assistant" : "founder"); };
  TK.nav = function () { return (m.ROLE_NAV[TK.role()] || m.ROLE_NAV.founder); };
  TK.dayLabel = function (d) {
    var td = u.today();
    if (d === td) return t("tk_today");
    if (d === u.addDays(td, -1)) return t("tk_yesterday");
    if (d === u.addDays(td, 1)) return t("tk_tomorrow");
    return u.fmtDate(d, { weekday: "long", day: "numeric", month: "long" });
  };
  TK.activeProjects = function () { return S.all("projects").filter(function (x) { return x.stage !== "done"; }).sort(u.by(function (x) { return m.projectLabel(x).toLowerCase(); })); };

  TK.css("gk-shared-css", [
    ".gk-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px}",
    ".gk-dec{flex-direction:row;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-left:3px solid var(--gel-deep,var(--gel))}",
    ".gk-dec-b{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 260px}",
    ".gk-chips{display:flex;flex-wrap:wrap;gap:6px}",
    ".gk-chip{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--line-2,var(--line));background:var(--s2,transparent);color:var(--tx-2,var(--ink-2));font-size:13px;white-space:nowrap}",
    ".gk-chip[aria-pressed=\"true\"]{background:var(--chroma-soft,var(--line));color:var(--tx,var(--ink));border-color:var(--chroma)}",
    ".gk-chip:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}",
    ".gk-chip-n{font-variant-numeric:tabular-nums;color:var(--tx-3,var(--ink-3))}",
    ".gk-dot{width:8px;height:8px;border-radius:999px;display:inline-block;flex:none;background:var(--tx-3,var(--ink-3))}",
    ".gk-seg{border-bottom:0;align-self:flex-start}",
    ".gk-who{display:inline-flex;align-items:center;gap:8px;min-width:0}",
    ".gk-who-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--tx-2,var(--ink-2))}",
    ".gk-scrim{position:fixed;inset:0;z-index:30;background:var(--bg);opacity:.6}",
    ".gk-side{position:fixed;top:0;right:0;bottom:0;z-index:31;width:min(480px,100vw);display:flex;flex-direction:column;background:var(--s1,var(--bg));color:var(--tx,var(--ink));border-left:1px solid var(--line);border-radius:22px 0 0 22px;overflow:hidden}",
    ".gk-side:focus{outline:none}",
    ".gk-side-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 20px 12px;border-bottom:1px solid var(--line)}",
    ".gk-side-h h2{margin:0}",
    ".gk-side-b{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px;min-height:0}",
    ".gk-side-f{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;padding:12px 20px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line)}",
    ".gk-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}",
    ".gk-bar.start{justify-content:flex-start;align-items:flex-end}",
    ".gk-bar .field{flex:1 1 160px;max-width:260px}",
    ".gk-sp{display:flex;flex-direction:column;gap:16px}",
    ".gk-bar-l{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-width:0;flex:1 1 auto}",
    ".gk-sel{flex:0 1 200px;min-width:0}.gk-sel select{height:34px;min-height:34px;padding-top:0;padding-bottom:0;border-radius:999px;font-size:13px;width:100%}",
    ".gk-sel.on select{border-color:var(--chroma);background:var(--chroma-soft,transparent)}",
    ".gk-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    ".gk-daylab{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3,var(--ink-3));padding:16px 0 6px;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--line)}",
    "@media (max-width:640px){.gk-side{border-radius:0;border-left:0;width:100vw}.gk-bar .field{max-width:none;flex-basis:100%}.gk-sel{flex:1 1 140px}.gk-bar .gk-sel{flex-basis:calc(50% - 4px)}}"
  ].join("\n"));

  TK.css("gk-tasks-css", [
    ".tk-add{display:grid;grid-template-columns:minmax(0,1fr) 150px 220px 150px auto;gap:8px;align-items:end}",
    ".tk-grp{display:flex;flex-direction:column}",
    ".tk-grp-h{display:flex;align-items:baseline;gap:8px;padding:14px 4px 6px;border-bottom:1px solid var(--line)}",
    ".tk-grp-h h2{margin:0;font-size:14px;font-weight:600}",
    ".tk-grp-h .n{font-size:12px;color:var(--tx-3,var(--ink-3));font-variant-numeric:tabular-nums}",
    ".tk-grp.late .tk-grp-h h2{color:var(--gel-deep,var(--ink))}",
    "summary.tk-grp-h{list-style-position:inside}",
    ".tk-row{display:grid;grid-template-columns:24px minmax(0,1fr) 150px 110px;gap:4px 12px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--line);min-height:52px}",
    ".tk-row:hover{background:var(--s2,var(--line-2))}",
    ".tk-row input[type=checkbox]{width:18px;height:18px;margin:0;accent-color:var(--chroma);cursor:pointer}",
    ".tk-main{display:flex;flex-direction:column;gap:2px;min-width:0}",
    ".tk-t{all:unset;cursor:pointer;font-size:14px;color:var(--tx,var(--ink));overflow-wrap:anywhere}",
    ".tk-t:hover{text-decoration:underline}",
    ".tk-t:focus-visible{outline:2px solid var(--chroma);outline-offset:2px;border-radius:4px}",
    ".tk-m{font-size:12px;color:var(--tx-3,var(--ink-3));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".tk-row.done .tk-t{color:var(--tx-3,var(--ink-3));text-decoration:line-through}",
    ".tk-due{font-size:12px;color:var(--tx-2,var(--ink-2));text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}",
    ".tk-due.late{color:var(--gel-deep,var(--ink));font-weight:600}",
    ".tk-doing{color:var(--chroma);margin-left:4px}",
    ".tk-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}",
    ".tk-col{display:flex;flex-direction:column;gap:8px;min-width:0;background:var(--s1,transparent);border:1px solid var(--line);border-radius:16px;padding:12px}",
    ".tk-col-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:2px 4px}",
    ".tk-col-h h2{margin:0;font-size:14px;font-weight:600}",
    ".tk-col-h .n{font-size:12px;color:var(--tx-3,var(--ink-3));font-variant-numeric:tabular-nums}",
    ".tk-card{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--s2,var(--bg));min-width:0}",
    ".tk-card.late{border-left:3px solid var(--gel-deep,var(--gel))}",
    ".tk-card-f{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}",
    ".tk-card-a{display:flex;gap:6px;flex-wrap:wrap}",
    ".tk-more{all:unset;cursor:pointer;font-size:12px;color:var(--chroma);padding:8px 4px}",
    ".tk-more:focus-visible{outline:2px solid var(--chroma)}",
    ".tk-log{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--tx-2,var(--ink-2))}",
    ".tk-log>span{display:flex;justify-content:space-between;gap:12px}",
    ".tk-ro{font-size:12px;color:var(--tx-3,var(--ink-3));margin:0}",
    "@media (max-width:1100px){.tk-add{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.tk-add .tk-add-t{grid-column:1/-1}}",
    "@media (max-width:860px){.tk-board{grid-template-columns:minmax(0,1fr)}}",
    "@media (max-width:640px){.tk-row{grid-template-columns:24px minmax(0,1fr) auto}.tk-row .gk-who{grid-column:2;grid-row:2}.tk-row .tk-due{grid-column:3;grid-row:1}.tk-add{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.tk-add>.btn{grid-column:1/-1}}"
  ].join("\n"));

  // ---------- helpers ----------
  function P() { return ui.p("tasks"); }
  function today() { return u.today(); }
  function can() { return m.can("tasks"); }
  function canDel(x) { return can() && (m.isFounder() || x.who === TK.me().id); }
  function proj(x) { return x.projectId ? m.project(x.projectId) : null; }
  function clientOf(x) { var p = proj(x); return p ? p.clientId : ""; }
  function byDue(a, b) { var A = a.due || "9999", B = b.due || "9999"; return A < B ? -1 : A > B ? 1 : String(a.title).localeCompare(String(b.title)); }
  function isLate(x) { return !x.done && !!x.due && x.due < today(); }
  function isDoing(x) { return !x.done && (x.status === "doing" || (!!x.due && x.due <= today())); }
  function dueText(x) {
    if (x.done) return x.doneOn ? t("tk_done_on", { d: u.fmtDate(x.doneOn) }) : t("tk_c_done");
    if (!x.due) return t("tk_no_due");
    var n = u.daysBetween(today(), x.due);
    if (n < 0) return t("tk_late_d", { n: -n });
    if (n === 0) return t("tk_today");
    if (n === 1) return t("tk_tomorrow");
    return u.fmtDate(x.due, { weekday: "short", day: "numeric", month: "short" });
  }
  function team() { return S.all("team").sort(u.by("name")); }
  function plural(k, n, vars) { return n === 1 && GK.i18n.has(k + "1") ? t(k + "1", vars) : t(k, Object.assign({ n: n }, vars || {})); }

  /** Tasks in scope of the current filters. */
  function scoped() {
    var st = P(), my = TK.me();
    return S.all("tasks").filter(function (x) {
      if (st.mine) { if (x.who !== my.id) return false; }
      else if (st.who && x.who !== st.who) return false;
      if (st.proj && x.projectId !== st.proj) return false;
      if (st.client && clientOf(x) !== st.client) return false;
      return true;
    });
  }

  // ---------- insight ----------
  function insight(list) {
    var td = today(), wk = u.addDays(td, 7);
    var open = list.filter(function (x) { return !x.done; });
    var late = open.filter(isLate).sort(byDue);
    var week = open.filter(function (x) { return x.due && x.due >= td && x.due <= wk; });
    var dueToday = open.filter(function (x) { return x.due === td; }).length;
    var people = {}; open.forEach(function (x) { people[x.who || "-"] = 1; });
    var np = Object.keys(people).length;
    function doneIn(a, b) { return list.filter(function (x) { return x.done && x.doneOn && x.doneOn >= a && x.doneOn <= b; }).length; }
    var d7 = doneIn(u.addDays(td, -6), td), p7 = doneIn(u.addDays(td, -13), u.addDays(td, -7));
    var spark = []; for (var i = 6; i >= 0; i--) { var d = u.addDays(td, -i); spark.push(list.filter(function (x) { return x.done && x.doneOn === d; }).length); }
    var diff = d7 - p7, oldest = late[0];
    var h = TK.kpis([
      { label: t("tk_k_open"), value: open.length, note: np === 1 ? t("tk_k_open_1") : t("tk_k_open_n", { n: np }) },
      { label: t("tk_k_late"), value: late.length, note: oldest ? plural("tk_k_late_n", u.daysBetween(oldest.due, td)) : t("tk_k_late_0") },
      { label: t("tk_k_week"), value: week.length, note: t("tk_k_week_n", { n: dueToday }) },
      { label: t("tk_k_done"), value: d7, delta: p7 ? Math.round(diff / p7 * 100) : null, deltaLabel: t("tk_k_done_n", { d: (diff > 0 ? "+" : diff < 0 ? "−" : "±") + Math.abs(diff), p: p7 }), spark: spark }
    ]);
    if (oldest) {
      h += TK.decision({
        title: plural("tk_dec_t", late.length), why: plural("tk_dec_why", u.daysBetween(oldest.due, td), { title: oldest.title, who: oldest.who ? m.member(oldest.who).name : t("tk_unassigned"), d: u.daysBetween(oldest.due, td) }),
        recommend: t("tk_dec_rec"), tone: "urgent", action: { label: t("tk_dec_btn"), a: "tk-open", data: { id: oldest.id }, cls: "primary sm" }
      });
    }
    return h;
  }

  // ---------- filters + quick add ----------
  function filters() {
    var st = P(), mine = !!st.mine;
    var clients = S.all("clients").sort(u.by(function (c) { return String(c.brand).toLowerCase(); }));
    var projects = S.all("projects").filter(function (x) { return x.stage !== "done" || x.id === st.proj; }).sort(u.by(function (x) { return m.projectLabel(x).toLowerCase(); }));
    var any = st.who || st.proj || st.client;
    return '<div class="gk-bar"><div class="gk-bar-l">' + TK.chips("tk-mine", [{ v: "0", label: t("tk_everyone"), on: !mine }, { v: "1", label: t("tk_mine"), on: mine }], t("tk_filters")) +
      (mine ? "" : TK.select("tk-f-who", t("tk_f_who"), st.who || "", [["", t("tk_f_any_who")]].concat(team().map(function (x) { return [x.id, x.name]; })))) +
      TK.select("tk-f-proj", t("tk_f_proj"), st.proj || "", [["", t("tk_f_any_proj")]].concat(projects.map(function (x) { return [x.id, m.projectLabel(x)]; }))) +
      TK.select("tk-f-client", t("tk_f_client"), st.client || "", [["", t("tk_f_any_client")]].concat(clients.map(function (c) { return [c.id, c.brand]; }))) +
      (any ? ui.btn(t("tk_f_clear"), "tk-clear", { cls: "ghost sm" }) : "") + "</div>" +
      TK.seg("tk-mode", [["list", t("tk_list")], ["board", t("tk_board")]], st.mode === "board" ? "board" : "list", t("tk_view")) + "</div>";
  }
  function quickAdd() {
    if (!can()) return '<p class="tk-ro">' + esc(t("tk_no_right")) + "</p>";
    var st = P(), my = TK.me();
    var who = st.mine ? my.id : (st.who || my.id);
    return '<section class="panel" aria-label="' + esc(t("tk_q_title")) + '"><div class="tk-add">' +
      '<div class="field tk-add-t"><label for="tk-q-title">' + esc(t("tk_q_title")) + '</label><input id="tk-q-title" type="text" maxlength="200" autocomplete="off" placeholder="' + esc(t("tk_q_ph")) + '"></div>' +
      ui.field({ id: "tk-q-who", label: t("tk_q_who"), type: "select", value: who, options: team().map(function (x) { return [x.id, x.name]; }) }) +
      ui.field({ id: "tk-q-proj", label: t("tk_q_proj"), type: "select", value: st.proj || "", options: [["", t("tk_no_project")]].concat(TK.activeProjects().map(function (x) { return [x.id, m.projectLabel(x)]; })) }) +
      ui.field({ id: "tk-q-due", label: t("tk_q_due"), type: "date", value: u.d(1) }) +
      ui.btn(t("tk_add"), "tk-add", { cls: "primary" }) + "</div></section>";
  }

  // ---------- list ----------
  function row(x) {
    var p = proj(x), my = TK.me(), late = isLate(x);
    var meta = p ? m.projectLabel(p) : t("tk_no_project");
    var lab = t(x.done ? "tk_reopen_l" : "tk_complete", { title: x.title });
    return '<div class="tk-row' + (x.done ? " done" : "") + '">' +
      '<input type="checkbox" data-c="tk-done" data-id="' + esc(x.id) + '"' + (x.done ? " checked" : "") + (can() ? "" : " disabled") + ' aria-label="' + esc(lab) + '">' +
      '<div class="tk-main"><button type="button" class="tk-t" data-a="tk-open" data-id="' + esc(x.id) + '">' + esc(x.title) + "</button>" +
      '<span class="tk-m">' + esc(meta) + (x.status === "doing" && !x.done ? '<span class="tk-doing">· ' + esc(t("tk_c_doing")) + "</span>" : "") + "</span></div>" +
      TK.who(x.who, x.who === my.id) +
      '<span class="tk-due' + (late ? " late" : "") + '">' + esc(dueText(x)) + "</span></div>";
  }
  function group(key, list, cls) {
    if (!list.length) return "";
    return '<section class="tk-grp ' + (cls || "") + '" aria-label="' + esc(t(key)) + '"><div class="tk-grp-h"><h2>' + esc(t(key)) + '</h2><span class="n">' + list.length + "</span></div>" +
      list.map(row).join("") + "</section>";
  }
  function listView(list) {
    var td = today(), wk = u.addDays(td, 7), st = P();
    var open = list.filter(function (x) { return !x.done; }).sort(byDue);
    var done = list.filter(function (x) { return x.done; }).sort(u.by(function (x) { return x.doneOn || x.due || ""; }, "desc"));
    var since = u.addDays(td, -14);
    var recent = st.allDone ? done : done.filter(function (x) { return (x.doneOn || x.due || "") >= since; }).slice(0, 30);
    var h = group("tk_g_late", open.filter(isLate), "late") +
      group("tk_g_today", open.filter(function (x) { return x.due === td; })) +
      group("tk_g_week", open.filter(function (x) { return x.due > td && x.due <= wk; })) +
      group("tk_g_later", open.filter(function (x) { return !x.due || x.due > wk; }));
    if (!open.length) h += ui.empty(list.length ? t("tk_all_clear") : t("tk_nothing"));
    if (done.length) {
      var more = done.length > recent.length ? '<button type="button" class="tk-more" data-a="tk-alldone">' + esc(t("tk_show_all_done", { n: done.length })) + "</button>" : "";
      h += '<details class="tk-grp"' + (st.doneOpen ? " open" : "") + ' data-tk-done><summary class="tk-grp-h" style="cursor:pointer"><h2 style="display:inline">' + esc(t(st.allDone ? "tk_g_done" : "tk_done_recent")) + '</h2> <span class="n">' + recent.length + "</span></summary>" +
        recent.map(row).join("") + more + "</details>";
    }
    return '<section class="panel" style="gap:0">' + h + "</section>";
  }

  // ---------- board ----------
  function card(x, col) {
    var p = proj(x), my = TK.me(), late = isLate(x), c = can();
    var acts = "";
    if (c) {
      if (col === "todo") acts = ui.btn(t("tk_start"), "tk-move", { cls: "sm", data: { id: x.id, to: "doing" } }) + ui.btn(t("tk_finish"), "tk-move", { cls: "ghost sm", data: { id: x.id, to: "done" } });
      else if (col === "doing") acts = ui.btn(t("tk_finish"), "tk-move", { cls: "sm", data: { id: x.id, to: "done" } }) + (x.status === "doing" && !(x.due && x.due <= today()) ? ui.btn(t("tk_back_todo"), "tk-move", { cls: "ghost sm", data: { id: x.id, to: "todo" } }) : "");
      else acts = ui.btn(t("tk_reopen"), "tk-move", { cls: "ghost sm", data: { id: x.id, to: "todo" } });
    }
    return '<article class="tk-card' + (late ? " late" : "") + '"><button type="button" class="tk-t" data-a="tk-open" data-id="' + esc(x.id) + '">' + esc(x.title) + "</button>" +
      '<span class="tk-m">' + esc(p ? m.projectLabel(p) : t("tk_no_project")) + "</span>" +
      '<div class="tk-card-f">' + TK.who(x.who, x.who === my.id) + '<span class="tk-due' + (late ? " late" : "") + '">' + esc(dueText(x)) + "</span></div>" +
      (acts ? '<div class="tk-card-a">' + acts + "</div>" : "") + "</article>";
  }
  function boardView(list) {
    var td = today(), since = u.addDays(td, -14);
    var doing = list.filter(isDoing).sort(byDue);
    var todo = list.filter(function (x) { return !x.done && !isDoing(x); }).sort(byDue);
    var done = list.filter(function (x) { return x.done && (x.doneOn || "") >= since; }).sort(u.by(function (x) { return x.doneOn || ""; }, "desc"));
    function col(key, items, k, sub) {
      return '<section class="tk-col" aria-label="' + esc(t(key)) + '"><div class="tk-col-h"><h2>' + esc(t(key)) + '</h2><span class="n">' + items.length + "</span></div>" +
        (sub ? '<span class="tk-m" style="padding:0 4px;white-space:normal">' + esc(sub) + "</span>" : "") +
        (items.length ? items.map(function (x) { return card(x, k); }).join("") : ui.empty(t("none"))) + "</section>";
    }
    return '<div class="tk-board">' + col("tk_c_todo", todo, "todo") + col("tk_c_doing", doing, "doing", t("tk_c_doing_n")) + col("tk_done_recent", done, "done") + "</div>";
  }

  // ---------- side panel (core ui.sidePanel when present; else rendered in the page) ----------
  function panelParts(x) {
    var c = can(), p = proj(x), dis = c ? "" : " disabled";
    var projects = S.all("projects").filter(function (y) { return y.stage !== "done" || y.id === x.projectId; }).sort(u.by(function (y) { return m.projectLabel(y).toLowerCase(); }));
    var status = x.done ? "done" : x.status === "doing" ? "doing" : "todo";
    var body = '<div class="form" style="grid-template-columns:minmax(0,1fr)">' +
      ui.field({ id: "tk-e-title", label: t("tk_p_title"), value: x.title, attrs: ' maxlength="200"' + dis }) +
      ui.field({ id: "tk-e-who", label: t("tk_q_who"), type: "select", value: x.who || "", options: [["", t("tk_unassigned")]].concat(team().map(function (y) { return [y.id, y.name]; })), attrs: dis }) +
      ui.field({ id: "tk-e-proj", label: t("tk_q_proj"), type: "select", value: x.projectId || "", options: [["", t("tk_no_project")]].concat(projects.map(function (y) { return [y.id, m.projectLabel(y)]; })), attrs: dis }) +
      ui.field({ id: "tk-e-due", label: t("tk_q_due"), type: "date", value: x.due || "", attrs: dis }) +
      ui.field({ id: "tk-e-status", label: t("tk_p_status"), type: "select", value: status, options: [["todo", t("tk_c_todo")], ["doing", t("tk_c_doing")], ["done", t("tk_c_done")]], attrs: dis }) +
      ui.field({ id: "tk-e-note", label: t("tk_p_note"), type: "textarea", value: x.note || "", placeholder: t("tk_p_note_ph"), attrs: ' maxlength="2000"' + dis }) + "</div>";
    if (!c) body += '<p class="tk-ro">' + esc(t("tk_no_right")) + "</p>";
    if (p) body += "<div>" + ui.btn(t("tk_p_open_proj"), "tk-proj", { cls: "ghost sm", data: { id: p.id } }) + "</div>";
    var log = (x.log || []).slice().reverse().slice(0, 12);
    body += '<div class="stack" style="gap:8px"><span class="lab sm muted">' + esc(t("tk_p_log")) + "</span>" + (log.length ? '<div class="tk-log">' + log.map(function (l) {
      return "<span><span>" + esc(l.text || l.what || "") + (l.who ? " · " + esc(m.member(l.who).name) : "") + '</span><span class="num">' + esc(u.fmtDate(l.at) + " " + String(l.at || "").slice(11, 16)) + "</span></span>";
    }).join("") + "</div>" : '<span class="tk-ro">' + esc(t("tk_p_nolog")) + "</span>") + "</div>";
    var del = canDel(x);
    var foot = ui.btn(t("del"), "tk-del", { cls: "ghost", data: { id: x.id }, disabled: !del, title: del ? "" : t("tk_no_del") }) +
      '<div class="row">' + ui.btn(t("cancel"), "tk-close", { cls: "ghost" }) + (c ? ui.btn(t("save"), "tk-save", { cls: "primary", data: { id: x.id } }) : "") + "</div>";
    return { label: t("tk_p_label") + (p ? " · " + m.projectLabel(p) : ""), title: x.title, body: body, foot: foot };
  }
  function panel(x) { var o = panelParts(x); return TK.side({ id: "tk-side", close: "tk-close", label: o.label, title: o.title, body: o.body, foot: o.foot }); }
  function coreSide() { return typeof ui.sidePanel === "function" && typeof ui.sidePanel.isOpen === "function"; }
  /** Open the task in the core side panel; Esc, the scrim and Close all clear params.open. */
  function openSide(id) {
    var x = S.get("tasks", id);
    if (!x) { P().open = ""; return ui.toast(t("tk_gone")); }
    P().open = id;
    var o = panelParts(x);
    var el = ui.sidePanel({ label: o.label, title: o.title, body: '<div class="gk-sp">' + o.body + "</div>", foot: o.foot, onClose: function () { if (P().open === id) P().open = ""; } });
    if (el && el.querySelector) { var f = el.querySelector("#tk-e-title:not([disabled])"); if (f) f.focus(); }
  }

  GK.view("tasks", {
    render: function (st) {
      st = st || P();
      var list = scoped(), all = S.all("tasks").filter(function (x) { return !x.done; });
      var lateN = all.filter(isLate).length, wkN = all.filter(function (x) { return x.due && x.due >= today() && x.due <= u.addDays(today(), 7); }).length;
      var h = ui.head({ label: t("nav_tasks"), title: t("tk_title"), accent: t("tk_accent"), sub: esc(t("tk_sub", { open: all.length, late: lateN, week: wkN })), actions: ui.sample() });
      h += insight(list) + filters() + quickAdd();
      h += st.mode === "board" ? boardView(list) : listView(list);
      var open = st.open ? S.get("tasks", st.open) : null;
      if (open && !coreSide()) h += panel(open);
      return h;
    },
    count: function () {
      var my = GK.me(); if (!my) return "";
      var td = u.today();
      return S.all("tasks").filter(function (x) { return !x.done && x.who === my.id && x.due && x.due <= td; }).length || "";
    },
    after: function (main) {
      var st = P();
      var q = main.querySelector("#tk-q-title");
      if (q) {
        var onKey = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); add(); } };
        ["tk-q-title", "tk-q-due"].forEach(function (id) { var el = main.querySelector("#" + id); if (el) el.addEventListener("keydown", onKey); });
        if (st.focusAdd) { st.focusAdd = false; q.focus(); }
      }
      var det = main.querySelector("details[data-tk-done]");
      if (det) det.addEventListener("toggle", function () { P().doneOpen = det.open; });
      if (st.open && S.get("tasks", st.open)) {
        if (coreSide()) { if (!ui.sidePanel.isOpen()) openSide(st.open); }
        else TK.sideAfter(main, "tk-side", "tk-close", !!st.focusPanel);
        st.focusPanel = false;
      }
    }
  });

  // ---------- actions ----------
  function add() {
    if (!can()) return ui.toast(t("tk_no_right"));
    var title = u.val("tk-q-title").trim();
    if (!title) { u.focus("tk-q-title"); return ui.toast(t("required")); }
    var rec = { id: u.uid("t"), projectId: u.val("tk-q-proj"), title: title.slice(0, 200), who: u.val("tk-q-who"), due: u.val("tk-q-due"), done: false, doneOn: "" };
    var saved = S.put("tasks", rec, { log: t("tk_log_new") });
    if (!saved) return;
    var el = document.getElementById("tk-q-title"); if (el) { el.value = ""; el.defaultValue = ""; }
    P().focusAdd = true;
    ui.toast(t("tk_added"));
    ui.render(true);
  }
  function setDone(id, on) {
    var x = S.get("tasks", id); if (!x) return;
    if (!can()) { ui.toast(t("tk_no_right")); ui.render(true); return; }
    var before = { done: !!x.done, doneOn: x.doneOn || "", status: x.status || "" };
    S.patch("tasks", id, { done: on, doneOn: on ? u.today() : "", status: on ? "" : (x.status || "") }, { log: t(on ? "tk_log_done" : "tk_log_reopen") });
    ui.toast(t(on ? "tk_done_toast" : "tk_reopened", { title: x.title }), { label: t("undo"), fn: function () { if (S.get("tasks", id)) { S.patch("tasks", id, before); ui.render(true); } } });
    ui.render(true);
  }
  GK.act("tk-add", add);
  GK.act("tk-new", function () { ui.go("tasks", { focusAdd: true, open: "" }); });
  GK.act("tk-open", function (el) {
    var id = el.getAttribute("data-id");
    if (coreSide() && ui.state.view === "tasks") return openSide(id);
    ui.go("tasks", { open: id, focusPanel: true });
  });
  function closePanel() {
    var id = P().open; P().open = "";
    if (coreSide()) { if (ui.sidePanel.isOpen()) ui.sidePanel.close(); return; }
    ui.render(true);
    if (id) { var b = document.querySelector('.tk-t[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (b) b.focus(); }
  }
  GK.act("tk-close", closePanel);
  GK.act("tk-proj", function (el) { P().open = ""; ui.go("projects", { id: el.getAttribute("data-id") }); });
  GK.act("tk-mine", function (el) { ui.go("tasks", { mine: el.getAttribute("data-v") === "1" }); });
  GK.act("tk-mode", function (el) { ui.go("tasks", { mode: el.getAttribute("data-v") }); });
  GK.act("tk-clear", function () { ui.go("tasks", { who: "", proj: "", client: "" }); });
  GK.act("tk-alldone", function () { ui.go("tasks", { allDone: true, doneOpen: true }); });
  GK.change("tk-f-who", function (el) { ui.go("tasks", { who: el.value }); });
  GK.change("tk-f-proj", function (el) { ui.go("tasks", { proj: el.value }); });
  GK.change("tk-f-client", function (el) { ui.go("tasks", { client: el.value }); });
  GK.change("tk-done", function (el) { setDone(el.getAttribute("data-id"), el.checked); });
  GK.act("tk-move", function (el) {
    var id = el.getAttribute("data-id"), to = el.getAttribute("data-to"), x = S.get("tasks", id);
    if (!x) return;
    if (!can()) return ui.toast(t("tk_no_right"));
    if (to === "done") return setDone(id, true);
    var before = { done: !!x.done, doneOn: x.doneOn || "", status: x.status || "" };
    S.patch("tasks", id, { done: false, doneOn: "", status: to === "doing" ? "doing" : "" }, { log: t(x.done ? "tk_log_reopen" : to === "doing" ? "tk_log_doing" : "tk_log_todo") });
    ui.toast(t("tk_moved", { c: t(to === "doing" ? "tk_c_doing" : "tk_c_todo") }), { label: t("undo"), fn: function () { if (S.get("tasks", id)) { S.patch("tasks", id, before); ui.render(true); } } });
    ui.render(true);
  });
  GK.act("tk-save", function (el) {
    var id = el.getAttribute("data-id"), x = S.get("tasks", id);
    if (!x) { closePanel(); return ui.toast(t("tk_gone")); }
    if (!can()) return ui.toast(t("tk_no_right"));
    var title = u.val("tk-e-title").trim();
    if (!title) { u.focus("tk-e-title"); return ui.toast(t("required")); }
    var status = u.val("tk-e-status");
    var next = { title: title.slice(0, 200), who: u.val("tk-e-who"), projectId: u.val("tk-e-proj"), due: u.val("tk-e-due"), note: u.val("tk-e-note").slice(0, 2000),
      done: status === "done", doneOn: status === "done" ? (x.done ? x.doneOn || u.today() : u.today()) : "", status: status === "doing" ? "doing" : "" };
    var changed = [];
    [["title", "tk_fld_title"], ["who", "tk_fld_who"], ["projectId", "tk_fld_proj"], ["due", "tk_fld_due"], ["note", "tk_fld_note"]].forEach(function (f) { if ((x[f[0]] || "") !== (next[f[0]] || "")) changed.push(t(f[1])); });
    var wasStatus = x.done ? "done" : x.status === "doing" ? "doing" : "todo";
    if (wasStatus !== status) changed.push(t("tk_fld_status"));
    closePanel();
    if (changed.length) S.patch("tasks", id, next, { log: status !== wasStatus && changed.length === 1 ? t(status === "done" ? "tk_log_done" : status === "doing" ? "tk_log_doing" : "tk_log_todo") : t("tk_log_edit", { f: changed.join(", ") }) });
    ui.toast(t("tk_saved"));
    ui.render(true);
  });
  GK.act("tk-del", function (el) {
    var id = el.getAttribute("data-id"), x = S.get("tasks", id);
    if (!x) return;
    if (!canDel(x)) return ui.toast(t("tk_no_del"));
    closePanel();
    ui.confirm(t("tk_del_q"), t("tk_del_b"), function () {
      var copy = u.clone(x);
      P().open = "";
      S.remove("tasks", id);
      ui.toast(t("tk_deleted"), { label: t("undo"), fn: function () { S.put("tasks", copy); } });
    }, t("del"));
  });
})(window.GK);
