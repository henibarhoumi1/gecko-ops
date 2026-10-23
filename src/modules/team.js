/* GECKO Ops · module: team. Tasks and people (people list and profiles: team_people.js). */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    tm_title: ["Team", "Équipe"], tm_accent: ["", ""],
    tm_sub: ["Who does what, by when.", "Qui fait quoi, pour quand."],
    tm_tab_tasks: ["Tasks", "Tâches"], tm_tab_people: ["People", "Personnes"],
    tm_everyone: ["Everyone", "Tout le monde"], tm_mine: ["Mine", "Les miennes"],
    tm_add_task: ["Add task", "Ajouter une tâche"], tm_new_task: ["New", "Nouvelle"], tm_new_task_acc: ["task", "tâche"],
    tm_f_title: ["What needs doing", "Ce qu'il faut faire"], tm_f_project: ["Project", "Projet"], tm_f_who: ["Who", "Qui"], tm_f_due: ["Due", "Pour le"],
    tm_no_project: ["No project", "Sans projet"], tm_unassigned: ["Not assigned", "Non attribuée"],
    tm_open_n: ["{n} open", "{n} en cours"], tm_late: ["Late", "En retard"], tm_today: ["Today", "Aujourd'hui"], tm_no_due: ["no date", "sans date"],
    tm_no_open: ["No open tasks. Nice.", "Aucune tâche ouverte. Bien joué."],
    tm_done_recent: ["Done in the last 14 days ({n})", "Faites ces 14 derniers jours ({n})"],
    tm_del_task_q: ["Delete this task?", "Supprimer cette tâche ?"], tm_del_task_b: ["It goes for everyone. This can't be undone.", "Elle disparaît pour tout le monde. Action définitive."],
    tm_no_del: ["Only the owner or the person on the task can delete it.", "Seuls le fondateur ou la personne concernée peuvent la supprimer."],
    tm_no_tasks_right: ["You can view tasks but not change them.", "Vous pouvez voir les tâches mais pas les modifier."],
    tm_task_added: ["Task added", "Tâche ajoutée"], tm_reopen: ["Reopen", "Rouvrir"],
    // people
    tm_people: ["The team", "L'équipe"], tm_add_member: ["Add a person", "Ajouter une personne"], tm_name: ["Name", "Nom"], tm_role: ["Role", "Rôle"],
    tm_joined: ["Joined", "A rejoint"], tm_not_joined: ["Not joined yet", "Pas encore rejoint"], tm_you: ["You", "Vous"],
    tm_remove: ["Remove", "Retirer"], tm_remove_q: ["Remove {name} from the team?", "Retirer {name} de l'équipe ?"],
    tm_remove_b: ["Their tasks stay and show as not assigned. They lose access to this workspace.", "Leurs tâches restent, sans personne. Cette personne perd l'accès à l'espace."],
    tm_no_self: ["You can't remove yourself.", "Vous ne pouvez pas vous retirer vous-même."], tm_only_founder: ["Only the owner can change the team.", "Seul le fondateur peut modifier l'équipe."],
    tm_shared_note: ["People join by opening this page and picking their name. The owner must share the page with them as Contributor so they can edit.", "Chacun rejoint en ouvrant cette page et en choisissant son nom. Le fondateur doit la partager en Contributeur pour qu'ils puissent modifier."],
    tm_add_hint: ["Add someone here first, then they claim their name when they open the page.", "Ajoutez la personne ici, puis elle choisit son nom en ouvrant la page."],
    tm_member_added: ["Added to the team", "Ajouté à l'équipe"],
    tm_invite_email: ["Email address", "Adresse e-mail"],
    tm_invite_ready: ["Secure invitation token", "Jeton d'invitation sécurisé"],
    tm_signout: ["Sign out", "Se déconnecter"]
  });

  function me() { return GK.me() || { id: "", name: "", role: "founder" }; }
  function p() { return ui.p("team"); }
  function openTasksFor(id) { return S.all("tasks").filter(function (x) { return !x.done && x.who === id; }); }
  function byDue(a, b) { var A = a.due || "9999", B = b.due || "9999"; return A < B ? -1 : A > B ? 1 : 0; }
  function activeProjects() { return S.all("projects").filter(function (x) { return x.stage !== "retention"; }).sort(u.by(function (x) { return m.projectLabel(x).toLowerCase(); })); }
  function canDelTask(x) { return m.can("tasks") && (m.isFounder() || x.who === me().id); }
  function dueTxt(d) {
    if (!d) return t("tm_no_due");
    return d === u.today() ? t("tm_today") : u.fmtDate(d);
  }

  // ---------- tasks ----------
  function taskRow(x) {
    var pr = x.projectId ? m.project(x.projectId) : null, can = m.can("tasks"), late = !x.done && x.due && x.due < u.today();
    var del = canDelTask(x);
    return '<div class="li"><label class="check' + (x.done ? " done" : "") + '" style="padding:0;min-width:0;flex:1"><input type="checkbox" data-c="tm-task" data-id="' + esc(x.id) + '"' + (x.done ? " checked" : "") + (can ? "" : " disabled") + "><span>" + esc(x.title) +
      (pr ? '<br><span class="small muted">' + esc(m.projectLabel(pr)) + "</span>" : "") + "</span></label>" +
      '<div class="row" style="flex-wrap:nowrap">' + (late ? ui.pill(t("tm_late") + " · " + dueTxt(x.due), "alert") : '<span class="small muted" style="white-space:nowrap">' + esc(dueTxt(x.due)) + "</span>") +
      ui.btn(t("del"), "tm-task-del", { cls: "ghost sm", data: { id: x.id }, disabled: !del, title: del ? t("del") : t("tm_no_del") }) + "</div></div>";
  }
  function tasksTab() {
    var st = p(), mine = !!st.mine, my = me();
    var team = S.all("team").sort(u.by("name"));
    var open = S.all("tasks").filter(function (x) { return !x.done; });
    if (mine) open = open.filter(function (x) { return x.who === my.id; });
    var can = m.can("tasks");
    var h = '<div class="row between"><div class="row">' +
      ui.btn(t("tm_everyone"), "tm-mine", { cls: "sm" + (mine ? "" : " primary"), data: { v: "0" } }) +
      ui.btn(t("tm_mine"), "tm-mine", { cls: "sm" + (mine ? " primary" : ""), data: { v: "1" } }) + "</div>" +
      ui.btn(t("tm_add_task"), "tm-task-new", { cls: "primary", disabled: !can, title: can ? "" : t("tm_no_tasks_right") }) + "</div>";
    var groups = [];
    team.forEach(function (mb) { var l = open.filter(function (x) { return x.who === mb.id; }).sort(byDue); if (l.length) groups.push({ mb: mb, l: l }); });
    var ids = team.map(function (x) { return x.id; });
    var orphan = open.filter(function (x) { return ids.indexOf(x.who) < 0; }).sort(byDue);
    if (orphan.length) groups.push({ mb: null, l: orphan });
    // the viewer's own group first
    groups.sort(function (a, b) { return (b.mb && b.mb.id === my.id ? 1 : 0) - (a.mb && a.mb.id === my.id ? 1 : 0); });
    if (!groups.length) h += ui.empty(t("tm_no_open"));
    else h += '<div class="grid2">' + groups.map(function (g) {
      var name = g.mb ? g.mb.name : t("tm_unassigned");
      return '<section class="panel"><div class="panel-h"><div class="row">' + ui.av(name, g.mb && g.mb.id === my.id ? "gel" : "") + '<h2 class="sec">' + esc(name) + "</h2></div>" +
        '<span class="small muted">' + esc(t("tm_open_n", { n: g.l.length })) + '</span></div><div class="list">' + g.l.map(taskRow).join("") + "</div></section>";
    }).join("") + "</div>";
    var since = u.addDays(u.today(), -14);
    var done = S.all("tasks").filter(function (x) { return x.done && (x.doneOn || x.due || "") >= since && (!mine || x.who === my.id); })
      .sort(u.by(function (x) { return x.doneOn || x.due || ""; }, "desc"));
    if (done.length) {
      h += '<details class="panel"><summary class="lab" style="cursor:pointer">' + esc(t("tm_done_recent", { n: done.length })) + '</summary><div class="list">' +
        done.map(function (x) { var w = m.member(x.who); return taskRow(x).replace('<div class="row" style="flex-wrap:nowrap">', '<div class="row" style="flex-wrap:nowrap"><span class="small muted">' + esc(w.name) + "</span>"); }).join("") + "</div></details>";
    }
    return h;
  }
  function taskModal() {
    var my = me();
    var team = S.all("team").sort(u.by("name"));
    ui.modal({
      title: t("tm_new_task"), accent: t("tm_new_task_acc"),
      body: '<div class="form">' +
        ui.field({ id: "tm-t-title", label: t("tm_f_title"), span: true }) +
        ui.field({ id: "tm-t-who", label: t("tm_f_who"), type: "select", value: my.id, options: team.map(function (x) { return [x.id, x.name]; }) }) +
        ui.field({ id: "tm-t-due", label: t("tm_f_due"), type: "date", value: u.d(1) }) +
        ui.field({ id: "tm-t-proj", label: t("tm_f_project"), type: "select", value: "", span: true, options: [["", t("tm_no_project")]].concat(activeProjects().map(function (x) { return [x.id, m.projectLabel(x)]; })) }) +
        "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "tm-task-save", { cls: "primary" })
    });
  }

  // ---------- people ----------
  /** Add-a-person panel (owner only). The people list and profiles live in team_people.js. */
  function addPanel() {
    if (!(m.isFounder() && m.can("*"))) return "";
    return '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("tm_add_member")) + '</h2></div><p class="small muted" style="margin:0">' + esc(S.backend === "supabase" ? "Invite a verified account by email." : t("tm_add_hint")) + '</p><div class="form">' +
      ui.field({ id: S.backend === "supabase" ? "tm-m-email" : "tm-m-name", label: S.backend === "supabase" ? t("tm_invite_email") : t("tm_name"), type: S.backend === "supabase" ? "email" : "text" }) +
      ui.field({ id: "tm-m-role", label: t("tm_role"), type: "select", value: "editor", options: m.ROLES.filter(function (r) { return r !== "founder"; }).map(function (r) { return [r, t("role_" + r)]; }) }) +
      '</div><div class="row" style="justify-content:flex-end">' + ui.btn(t("add"), "tm-member-add", { cls: "primary" }) + "</div></section>";
  }
  GK.team = { addPanel: addPanel, openTasksFor: openTasksFor };

  GK.view("team", {
    render: function () {
      var st = p(), tab = st.tab || "tasks";
      if (["tasks", "people"].indexOf(tab) < 0) tab = "tasks";
      var tabs = '<div class="tabs" role="tablist">' + ["tasks", "people"].map(function (k) {
        return '<button type="button" role="tab" data-a="tm-tab" data-v="' + k + '" aria-selected="' + (k === tab) + '">' + esc(t("tm_tab_" + k)) + "</button>";
      }).join("") + "</div>";
      var body = tab === "people" ? (GK.teamPeople ? GK.teamPeople.render() : "") : tasksTab();
      return ui.head({ label: t("nav_team"), title: t("tm_title"), accent: t("tm_accent"), sub: esc(t("tm_sub")), actions: ui.sample() }) + GK.insight.team() + tabs + body;
    },
    count: function () { var who = GK.me(); return who ? (openTasksFor(who.id).length || "") : ""; }
  });

  GK.act("tm-tab", function (el) { ui.go("team", { tab: el.getAttribute("data-v") }); });
  GK.act("tm-mine", function (el) { ui.go("team", { mine: el.getAttribute("data-v") === "1" }); });
  GK.act("tm-task-new", taskModal);
  GK.act("tm-task-save", function () {
    var title = u.val("tm-t-title").trim();
    if (!title) { u.focus("tm-t-title"); return ui.toast(t("required")); }
    S.put("tasks", { id: u.uid("t"), projectId: u.val("tm-t-proj"), title: title, who: u.val("tm-t-who"), due: u.val("tm-t-due"), done: false });
    ui.closeModal();
    ui.toast(t("tm_task_added"));
  });
  GK.change("tm-task", function (el) {
    if (!m.can("tasks")) { el.checked = !el.checked; return ui.toast(t("tm_no_tasks_right")); }
    var on = el.checked;
    S.patch("tasks", el.getAttribute("data-id"), { done: on, doneOn: on ? u.today() : "" });
    ui.render(true);
  });
  GK.act("tm-task-del", function (el) {
    var id = el.getAttribute("data-id");
    ui.confirm(t("tm_del_task_q"), t("tm_del_task_b"), function () { S.remove("tasks", id); });
  });
  GK.act("tm-member-add", function () {
    if (S.backend === "supabase") {
      var email = u.val("tm-m-email").trim(), role = u.val("tm-m-role") || "editor";
      if (!email) { u.focus("tm-m-email"); return ui.toast(t("required")); }
      S.createInvite(email, role).then(function (token) {
        ui.modal({
          title: t("tm_invite_ready"),
          body: '<p class="small muted">This one-time token expires in seven days. Copy it and share it with the invited person through a trusted channel.</p><code class="code" style="word-break:break-all;user-select:all">' + esc(token) + "</code>",
          foot: ui.btn(t("close"), "close", { cls: "primary" })
        });
      }, function (error) { ui.toast(error.message); });
      return;
    }
    var name = u.val("tm-m-name").trim();
    if (!name) { u.focus("tm-m-name"); return ui.toast(t("required")); }
    S.put("team", { id: "m" + u.uid(""), name: name.slice(0, 60), role: u.val("tm-m-role") || "editor", joinedOn: u.today() });
    ui.toast(t("tm_member_added"));
    ui.render(true);
  });
  GK.act("tm-member-del", function (el) {
    var x = S.get("team", el.getAttribute("data-id"));
    if (!x) return;
    ui.confirm(t("tm_remove_q", { name: x.name }), t("tm_remove_b"), function () { S.remove("team", x.id); }, t("tm_remove"));
  });
})(window.GK);
