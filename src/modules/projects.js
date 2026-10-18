/* GECKO Ops · module: projects
   Board of every project by stage, monthly projects to open, the New project flow (GK.pj.openNew),
   and the project detail: stage stepper with payment gates, onboarding, creative plan,
   deliverables (angle > reel > hooks, carousels) with the scope check, money, tasks and log. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    pj_title: ["Projects", "Projets"], pj_accent: ["", ""],
    pj_d_accent: ["", ""],
    pj_sub: ["{n} active · {b} blocked by a payment or an approval", "{n} en cours · {b} bloqués par un paiement ou une validation"],
    pj_new: ["New project", "Nouveau projet"], pj_new_t: ["New", "Nouveau"], pj_new_acc: ["project", "projet"],
    pj_f_all: ["All", "Tous"], pj_f_moh: ["Partner share", "Part partenaire"], pj_f_skin: ["Monthly only", "Mensuels seulement"],
    pj_filter: ["Filter projects", "Filtrer les projets"],
    pj_done_more: ["+ {n} older", "+ {n} plus anciens"],
    pj_month_n: ["Month {n}", "Mois {n}"],
    pj_shoot_on: ["Shoot {d}", "Tournage le {d}"], pj_no_shoot: ["No shoot date", "Pas de date de tournage"],
    pj_approved_x: ["{a}/{b} approved", "{a}/{b} validés"], pj_no_files: ["No files planned yet", "Aucun fichier prévu"],
    pj_empty_col: ["Nothing here.", "Rien ici."],
    pj_ph_prep: ["Getting ready", "Préparation"], pj_ph_shoot: ["Shooting", "Tournage"], pj_ph_post: ["Editing and review", "Montage et retours"], pj_ph_done: ["Delivered", "Livrés"],
    pj_search: ["Find a project or client", "Chercher un projet ou un client"], pj_layout: ["Layout", "Affichage"], pj_l_board: ["Board", "Tableau"], pj_l_list: ["List", "Liste"],
    pj_col_project: ["Project", "Projet"], pj_col_stage: ["Stage", "Étape"], pj_col_progress: ["Progress", "Avancement"], pj_none_found: ["No project matches.", "Aucun projet ne correspond."],
    pj_files: ["Files approved", "Fichiers validés"], pj_late_n: ["{n} late", "{n} en retard"],
    pj_next_h: ["Next step", "Prochaine étape"], pj_next_ready: ["Ready to move to {s}.", "Prêt à passer à : {s}."],
    pj_due_h: ["Monthly projects to open", "Projets mensuels à ouvrir"],
    pj_due_line: ["{pack} · month {n} · {month}", "{pack} · mois {n} · {month}"],
    pj_create_month: ["Create month {n}", "Créer le mois {n}"],
    pj_month_made: ["Month {n} created with its invoice draft.", "Mois {n} créé avec son brouillon de facture."],
    pj_no_perm: ["Your role can't change this. Ask the owner.", "Votre rôle ne permet pas ce changement. Demandez au fondateur."],
    pj_founder_only: ["Only the owner can do this.", "Seul le fondateur peut faire ça."],
    // new project
    pj_client: ["Client", "Client"], pj_pack: ["Pack", "Pack"], pj_name: ["Project name", "Nom du projet"],
    pj_name_ph: ["Eid launch, Drop 04…", "Lancement Aïd, Drop 04…"],
    pj_shoot: ["Shoot date", "Date de tournage"], pj_optional: ["Optional, you can set it later.", "Optionnel, à fixer plus tard."],
    pj_moh_brought: ["Partner share applies ({p} of profit)", "Part partenaire applicable ({p} du bénéfice)"],
    pj_skin_has: ["This client already has an active monthly contract.", "Ce client a déjà un contrat mensuel actif."],
    pj_inv_deposit: ["deposit", "acompte"], pj_inv_balance: ["balance", "solde"],
    pj_add_client: ["Add a new client", "Ajouter un nouveau client"], pj_no_client: ["No client yet. Add the client, then come back.", "Aucun client. Ajoutez le client, puis revenez."],
    pj_new_hint_once: ["Creates the project at onboarding and two invoice drafts: 50% deposit and 50% balance.", "Crée le projet au démarrage et deux brouillons de facture : acompte 50 % et solde 50 %."],
    pj_new_hint_month: ["Creates the month at onboarding (inside the client's monthly contract) and its invoice draft, full price, paid before the shoot.", "Crée le mois au démarrage (dans le contrat mensuel du client) et son brouillon de facture, prix complet, payé avant le tournage."],
    pj_create: ["Create project", "Créer le projet"], pj_created: ["Project created. Invoice drafts are in Finance.", "Projet créé. Les brouillons de facture sont dans Finance."],
    // detail
    pj_back: ["All projects", "Tous les projets"], pj_to_prod: ["Edit files", "Fichiers de montage"],
    pj_t_overview: ["Overview", "Vue d'ensemble"], pj_t_brief: ["Brief", "Brief"], pj_t_scripts: ["Scripts", "Scripts"], pj_t_board: ["Storyboard", "Storyboard"],
    pj_t_shoot: ["Shoot", "Tournage"], pj_t_edits: ["Edits", "Montage"], pj_t_money: ["Finance", "Finance"],
    pj_new_script: ["New script", "Nouveau script"], pj_no_scripts: ["No scripts for this project yet.", "Aucun script pour ce projet."], pj_script_n: ["Script {n}", "Script {n}"],
    pj_scenes_n: ["{n} scenes", "{n} scènes"], pj_no_board: ["Write scenes in a script first. Each scene becomes a frame.", "Écrivez d'abord des scènes dans un script. Chaque scène devient une image."],
    pj_shots: ["Shots done", "Plans faits"], pj_open_shootday: ["Open shoot day", "Ouvrir le tournage"], pj_set_date: ["Set a shoot date below.", "Fixez une date de tournage ci-dessous."],
    pj_to_deliv: ["Delivery", "Livraison"], pj_to_results: ["Ad results", "Résultats pub"], pj_to_boards: ["Whiteboards", "Tableaux blancs"],
    pj_move_to: ["Move to {s}", "Passer à : {s}"], pj_back_to: ["Back to {s}", "Revenir à : {s}"],
    pj_log_moved: ["Stage: {a} → {b}", "Étape : {a} → {b}"],
    pj_last_stage: ["Last stage. This project is closed.", "Dernière étape. Ce projet est clôturé."],
    pj_onb: ["Onboarding", "Démarrage"], pj_onb_n: ["{a} of 7 done", "{a} sur 7 faits"],
    pj_ob1: ["Brief call done", "Appel de brief fait"],
    pj_ob2: ["Brand assets and logo received", "Charte et logo reçus"],
    pj_ob3: ["Product samples received", "Échantillons produit reçus"],
    pj_ob4: ["Ad account access (or the media buyer's contact)", "Accès au compte pub (ou contact du media buyer)"],
    pj_ob5: ["Baseline orders per week recorded", "Commandes par semaine de départ notées"],
    pj_ob6: ["Creative plan sent", "Plan créatif envoyé"],
    pj_ob7: ["Shoot date booked", "Date de tournage réservée"],
    pj_baseline: ["Baseline: {v} orders / week ({d})", "Départ : {v} commandes / semaine ({d})"],
    pj_no_baseline: ["No baseline on the client yet.", "Pas encore de chiffre de départ sur le client."],
    pj_open_client: ["Open client", "Ouvrir le client"],
    pj_details: ["Details", "Infos"], pj_format: ["Main format", "Format principal"],
    pj_moh_on: ["Partner share on this project", "Part partenaire sur ce projet"],
    pj_moh_yes: ["Partner share applies: {p} of profit.", "Part partenaire applicable : {p} du bénéfice."],
    pj_moh_no: ["No partner share on this project.", "Pas de part partenaire sur ce projet."],
    pj_delete: ["Delete project", "Supprimer le projet"],
    pj_del_q: ["Delete this project?", "Supprimer ce projet ?"],
    pj_del_body: ["The project, its draft invoices and its tasks go. This can't be undone.", "Le projet, ses brouillons de facture et ses tâches seront supprimés. Impossible d'annuler."],
    pj_del_issued: ["An invoice is already issued. Cancel it with a credit note in Finance first.", "Une facture est déjà émise. Annulez-la d'abord avec un avoir dans Finance."],
    pj_deleted: ["Project deleted.", "Projet supprimé."],
    // plan
    pj_plan: ["Creative plan", "Plan créatif"], pj_angles_n: ["Angles {a} / {b} in the pack", "Angles {a} / {b} dans le pack"],
    pj_angle: ["Angle", "Angle"], pj_why: ["Why it should sell", "Pourquoi ça devrait vendre"],
    pj_angle_ph: ["Smells like home", "L'odeur de la maison"], pj_why_ph: ["What buyers say, search or ask", "Ce que les clients disent, cherchent ou demandent"],
    pj_add_angle: ["Add angle", "Ajouter l'angle"], pj_no_angles: ["No angles yet. Start with what buyers already say.", "Pas encore d'angle. Partez de ce que disent les clients."],
    pj_angle_used: ["Reels or carousels use this angle. Move or remove them first.", "Des reels ou carrousels utilisent cet angle. Déplacez-les ou supprimez-les d'abord."],
    pj_plan_ok: ["Client approved the plan", "Le client a validé le plan"],
    pj_plan_on: ["Approved {d}", "Validé le {d}"],
    pj_log_plan: ["Plan approved by the client", "Plan validé par le client"], pj_log_unplan: ["Plan approval removed", "Validation du plan retirée"],
    pj_remove: ["Remove", "Retirer"],
    // deliverables
    pj_deliv: ["Deliverables", "Livrables"],
    pj_reels: ["Reels", "Reels"], pj_vars: ["Hook variations", "Variations d'accroche"], pj_cars: ["Carousels", "Carrousels"],
    pj_over: ["over scope: invoice an extra or swap", "hors périmètre : facturer un extra ou échanger"],
    pj_under: ["{n} left in the pack", "{n} restants dans le pack"], pj_on_target: ["on target", "dans le pack"],
    pj_add_reel: ["Add reel", "Ajouter un reel"], pj_edit_reel: ["Edit reel", "Modifier le reel"],
    pj_add_reel_t: ["Add a", "Ajouter un"], pj_edit_reel_t: ["Edit the", "Modifier le"], pj_reel_acc: ["reel", "reel"],
    pj_reel_need: ["Write a short script or the H1 hook.", "Écrivez un script court ou l'accroche H1."],
    pj_need_angle: ["Add an angle to the plan first.", "Ajoutez d'abord un angle au plan."],
    pj_mode: ["Type", "Type"], pj_mode_D: ["D · direct to camera", "D · face caméra"], pj_mode_I: ["I · indirect b-roll", "I · plans indirects"],
    pj_script: ["Short script", "Script court"], pj_script_ph: ["Open on the jar, cut to the street at dusk.", "On ouvre sur le pot, puis la rue au coucher du soleil."],
    pj_h1: ["H1 hook (the base reel)", "Accroche H1 (le reel de base)"],
    pj_reel_n: ["Reel {n}", "Reel {n}"], pj_hook_ph: ["New hook line", "Nouvelle accroche"], pj_add_hook: ["Add hook", "Ajouter l'accroche"],
    pj_base: ["base", "base"], pj_no_reels: ["No reels on this angle yet.", "Pas encore de reel sur cet angle."],
    pj_no_angle: ["No angle", "Sans angle"],
    pj_del_reel_q: ["Remove this reel and its hooks?", "Retirer ce reel et ses accroches ?"],
    pj_del_reel_b: ["Its files leave production too.", "Ses fichiers quittent aussi la production."],
    pj_add_car: ["Add carousel", "Ajouter un carrousel"], pj_add_car_t: ["Add a", "Ajouter un"], pj_car_acc: ["carousel", "carrousel"], pj_car_title: ["Carousel title", "Titre du carrousel"],
    pj_car_ph: ["5 things your pharmacist knows", "5 choses que sait votre pharmacien"],
    pj_status_note: ["File statuses and versions change in production.", "Les statuts et versions des fichiers changent en production."],
    pj_hook_text: ["Hook text", "Texte de l'accroche"],
    // money
    pj_money: ["Money", "Argent"], pj_price: ["Price", "Prix"], pj_received: ["Received", "Reçu"], pj_costs: ["Costs", "Coûts"],
    pj_cost_basis: ["Cost basis (estimate + actual)", "Base de coûts (estimations + réel)"],
    pj_cost_basis_h: ["Un actual expense replaces only the estimate explicitly selected in Expenses. Other estimates and actual expenses remain separate.", "Une dépense réelle remplace uniquement l'estimation explicitement sélectionnée dans Dépenses. Les autres estimations et dépenses réelles restent distinctes."],
    pj_estimate: ["Estimate", "Estimation"], pj_estimate_replaced: ["replaced by linked actual spend", "remplacée par une dépense réelle liée"],
    pj_actual_cost: ["Actual spend", "Dépenses réelles"], pj_estimated_total: ["Budget estimates", "Estimations budgétaires"],
    pj_profit: ["Profit", "Bénéfice"], pj_comm: ["Partner share {p}", "Part partenaire {p}"],
    pj_net_note: ["tax withheld included, stamps excluded", "retenue incluse, hors timbre"],
    pj_cost_founder: ["Only the owner changes cost lines: they set the commission.", "Seul le fondateur modifie les coûts : ils fixent la commission."],
    pj_lead_link_error: ["Project created, but its lead link could not be saved. The source lead is retained on the project for recovery.", "Projet créé, mais le lien au prospect n'a pas été enregistré. Le prospect source est conservé sur le projet pour récupération."],
    pj_log_kv: ["{k}: {v}", "{k} : {v}"],
    pj_comm_paid: ["paid {d}", "payée le {d}"], pj_comm_owed: ["{x} owed now", "{x} dus maintenant"], pj_comm_wait: ["due once the client paid in full", "due quand le client a tout payé"],
    pj_kind: ["Kind", "Type"], pj_label: ["Line", "Ligne"], pj_amount: ["Amount", "Montant"],
    pj_k_heni: ["Owner", "Fondateur"], pj_k_freelance: ["Freelance", "Freelance"], pj_k_gear: ["Gear", "Matériel"], pj_k_other: ["Other", "Autre"],
    pj_add_cost: ["Add cost line", "Ajouter une ligne"], pj_fill_est: ["Fill from the pack estimate", "Remplir avec l'estimation du pack"],
    pj_no_costs: ["No cost lines yet.", "Aucune ligne de coût."], pj_total: ["Total", "Total"],
    pj_invoices: ["Invoices", "Factures"], pj_no_inv: ["No invoices for this project.", "Aucune facture pour ce projet."],
    pj_draft_no: ["draft", "brouillon"], pj_open_fin: ["Open in Finance", "Ouvrir dans Finance"],
    pj_gates: ["The two gates", "Les deux verrous"], pj_gate_ok: ["clear", "levé"], pj_gate_no: ["closed", "fermé"],
    pj_gate_files_m: ["No files until this month is paid.", "Pas de fichiers avant le paiement du mois."],
    pj_per_month: ["per month", "par mois"], pj_linked_exp: ["Project-linked expense", "Dépense liée au projet"],
    // tasks / log
    pj_tasks: ["Tasks", "Tâches"], pj_task_ph: ["What needs doing", "Ce qu'il faut faire"], pj_who: ["Who", "Qui"], pj_due: ["Due", "Échéance"],
    pj_add_task: ["Add task", "Ajouter la tâche"], pj_no_tasks: ["No tasks on this project.", "Aucune tâche sur ce projet."],
    pj_new_task: ["New task", "Nouvelle tâche"],
    pj_log: ["Latest activity", "Activité récente"], pj_no_log: ["Nothing logged yet.", "Rien d'enregistré."],
    pj_readonly: ["You can see this project. Changes are made by the owner or the Client Lead.", "Vous pouvez consulter ce projet. Les changements sont faits par le fondateur ou le responsable clients."],
    pj_late: ["late", "en retard"]
  });

  var OB = ["pj_ob1", "pj_ob2", "pj_ob3", "pj_ob4", "pj_ob5", "pj_ob6", "pj_ob7"];
  var KINDS = ["heni", "freelance", "gear", "other"];

  // ---------- helpers ----------
  function canEdit() { return m.can("projects.edit"); }
  function canCreate() { return m.can("projects.create"); }
  function guardEdit() { if (!canEdit()) { ui.toast(t("pj_no_perm")); return false; } return true; }
  function cur() { var id = ui.p("projects").id; return id ? m.project(id) : null; }
  function save(partial, log) { var p = cur(); if (!p) return null; return S.patch("projects", p.id, partial, log ? { log: log } : undefined); }
  function packName(k) { return m.pack(k).name || k; }
  function isMonthly(p) { return !!m.pack(p.pack).monthly; }
  function monthLabel(p) {
    var c = m.contractOf(p);
    return p.month ? t("pj_month_n", { n: p.month }) + (c && c.start ? " · " + u.fmtMonth(m.monthKey(c.start, p.month)) : "") : "";
  }
  function angleOf(p, id) { return (p.angles || []).find(function (a) { return a.id === id; }) || null; }
  function newHook(text) { return { id: u.uid("h"), text: text || "", status: "todo", v: 1, clientOk: false, drive: "", note: "", results: {} }; }
  function emptyReport() { return { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }; }
  function dis(cond, reason) { return cond ? { disabled: true, title: reason } : {}; }
  function opts(base, extra) { return Object.assign({}, base || {}, extra || {}); }
  function hasShare(p) { return !!m.commission(p).basis; }
  function kv(k, v) { return t("pj_log_kv", { k: k, v: v }); }
  /** Cost lines set the profit, so the commission: only the founder edits them. */
  function canCost() { return canEdit() && m.isFounder(); }
  function guardCost() { if (!canCost()) { ui.toast(t("pj_cost_founder")); return false; } return true; }
  /** Can the viewer open the clients screen? */
  function seesClients() {
    var me = GK.me(), role = me ? me.role : (S.backend === "shared" ? "assistant" : "founder");
    return (m.ROLE_NAV[role] || []).indexOf("clients") > -1;
  }

  /** Invoice drafts for a fresh project: deposit + balance (one-off) or one month (monthly offers). */
  function draftInvoices(p) {
    var pk = m.pack(p.pack), r = m.rules(), price = m.projectPrice(p), base = { no: "", clientId: p.clientId, projectId: p.id, stamp: r.stamp, issued: "", due: "", payments: [], credited: false, log: [] };
    if (pk.monthly) {
      return [Object.assign({}, base, { kind: "month", label: pk.name + " · " + p.name, amount: price })];
    }
    var dep = Math.round(price / 2);
    return [
      Object.assign({}, base, { kind: "deposit", label: pk.name + " · " + p.name + " · " + t("pj_inv_deposit"), amount: dep }),
      Object.assign({}, base, { kind: "balance", label: pk.name + " · " + p.name + " · " + t("pj_inv_balance"), amount: price - dep })
    ];
  }
  function baseProject(o) {
    return {
      clientId: o.clientId, sourceLeadId: o.sourceLeadId || "", sourceQuoteId: o.sourceQuoteId || "", contractId: o.contractId || "", month: o.month || 0, name: o.name, pack: o.pack, price: o.price, stage: "onboarding",
      planApproved: false, planApprovedOn: "", shootDate: o.shootDate || "", format: "9x16",
      onboarding: o.onboarding || [false, false, false, false, false, false, false],
      angles: [], reels: [], carousels: [], costs: m.estimateCosts(o.pack), report: emptyReport(), payout: null, log: []
    };
  }
  function createWithInvoices(proj, log, skipDrafts) {
    var p = S.put("projects", proj, { log: log });
    if (!p) return null;
    if (!skipDrafts) draftInvoices(p).forEach(function (inv) { S.put("invoices", inv, { log: log }); });
    return p;
  }
  /** Next month of a monthly contract. Onboarding carries over except the plan and shoot steps. */
  function createMonth(c) {
    var ms = m.contractMonths(c), last = ms[ms.length - 1], n = (last ? last.month : 0) + 1;
    var p = createWithInvoices(baseProject({
      clientId: c.clientId, contractId: c.id, month: n, name: t("pj_month_n", { n: n }), pack: c.pack,
      price: m.contractPrice(c),
      onboarding: [true, true, true, true, true, false, false]
    }), t("pj_month_n", { n: n }));
    return p ? { p: p, n: n } : null;
  }

  // ---------- board ----------
  var PHASES = [
    { id: "prep", stages: ["onboarding", "scripting", "pre_production"] },
    { id: "shoot", stages: ["shoot"] },
    { id: "post", stages: ["editing", "client_review", "revisions"] },
    { id: "done", stages: ["delivered", "paid", "retention"] }
  ];
  function stagePct(p) { var i = m.STAGES.indexOf(p.stage); return Math.round((i + 1) / m.STAGES.length * 100); }
  function people(p) {
    var ids = {}; m.tasksOf(p).forEach(function (x) { if (x.who && !x.done) ids[x.who] = 1; });
    return Object.keys(ids).slice(0, 4).map(function (id) { return ui.avatar(m.member(id).name, { tone: "gel" }); }).join("");
  }
  function facts(p) {
    var ideas = ideasOf(p), open = m.tasksOf(p).filter(function (x) { return !x.done; }), pr = m.progress(p);
    return { videos: ideas.length, open: open.length, late: open.filter(function (x) { return x.due && x.due < u.today(); }).length, files: pr };
  }
  function card(p) {
    var gates = m.gates(p), pk = m.pack(p.pack), f = facts(p);
    return '<div class="card pj-card" tabindex="0" role="button" data-a="pj-open" data-id="' + esc(p.id) + '">' +
      '<span class="pj-c-top"><span class="lab">' + esc(m.brand(p.clientId)) + "</span>" + ui.stagePill(p) + "</span>" +
      '<span class="t">' + esc(p.name) + "</span>" +
      '<span class="m">' + esc(pk.name) + (p.month ? " · " + esc(monthLabel(p)) : "") + "</span>" +
      '<span class="pj-c-bar" aria-hidden="true"><i style="width:' + stagePct(p) + '%"></i></span>' +
      '<span class="pj-c-facts"><span>' + ui.icon("camera", "sm") + esc(p.shootDate ? u.fmtDate(p.shootDate, { day: "numeric", month: "short" }) : "—") + "</span>" +
      "<span>" + ui.icon("studio", "sm") + f.videos + "</span><span" + (f.late ? ' class="is-late"' : "") + ">" + ui.icon("tasks", "sm") + f.open + "</span>" +
      (f.files.total ? "<span>" + ui.icon("check", "sm") + f.files.done + "/" + f.files.total + "</span>" : "") +
      '<span class="pj-c-ppl">' + people(p) + "</span></span>" +
      gates.map(function (g) { return '<span class="gate">' + esc(g) + "</span>"; }).join("") +
      (m.isFounder() && hasShare(p) ? '<span class="row">' + ui.pill(t("pj_f_moh")) + "</span>" : "") +
      "</div>";
  }
  function listView(list) {
    if (!list.length) return ui.empty(t("pj_none_found"));
    return '<div class="pj-table"><table><thead><tr><th>' + esc(t("pj_col_project")) + "</th><th>" + esc(t("pj_col_stage")) + "</th><th>" + esc(t("pj_shoot")) + "</th><th>" + esc(t("pj_t_scripts")) + "</th><th>" + esc(t("pj_tasks")) + "</th><th>" + esc(t("pj_col_progress")) + "</th></tr></thead><tbody>" +
      list.map(function (p) {
        var f = facts(p);
        return '<tr tabindex="0" data-a="pj-open" data-id="' + esc(p.id) + '"><td><b>' + esc(m.brand(p.clientId)) + "</b> · " + esc(p.name) + "</td><td>" + ui.stagePill(p) + "</td><td>" + esc(p.shootDate ? u.fmtDate(p.shootDate) : "—") + "</td><td class=\"num\">" + f.videos + "</td><td class=\"num" + (f.late ? " is-late" : "") + "\">" + f.open + '</td><td><span class="pj-c-bar"><i style="width:' + stagePct(p) + '%"></i></span></td></tr>';
      }).join("") + "</tbody></table></div>";
  }
  if (GK.input) GK.input("pj-q", function (el) { ui.p("projects").q = el.value; var box = document.getElementById("pj-results"); if (box) box.innerHTML = results(ui.p("projects")); });
  function filtered(params) {
    var f = params.filter || "all", q = String(params.q || "").trim().toLowerCase();
    return S.all("projects").filter(function (p) { return f === "moh" ? hasShare(p) : f === "skin" ? isMonthly(p) : true; })
      .filter(function (p) { return !q || (m.brand(p.clientId) + " " + p.name + " " + m.pack(p.pack).name).toLowerCase().indexOf(q) > -1; });
  }
  function results(params) {
    var list = filtered(params);
    if ((params.layout || "board") === "list") return listView(list.filter(function (p) { return params.q || p.stage !== "retention"; }).sort(u.by(function (p) { return m.STAGES.indexOf(p.stage); })));
    return '<div class="pj-phases">' + PHASES.map(function (ph) {
      var ps = list.filter(function (p) { return ph.stages.indexOf(p.stage) > -1; }), more = 0;
      if (ph.id === "done") { ps.sort(u.by(function (p) { return p.shootDate || ""; }, "desc")); more = Math.max(0, ps.length - 6); ps = ps.slice(0, 6); }
      else ps.sort(function (a, b) { return m.STAGES.indexOf(a.stage) - m.STAGES.indexOf(b.stage) || String(a.shootDate || "9999").localeCompare(String(b.shootDate || "9999")); });
      return '<section class="pj-col"><div class="col-h"><span class="lab">' + esc(t("pj_ph_" + ph.id)) + '</span><span class="num small muted">' + (ps.length + more) + "</span></div>" +
        (ps.length ? ps.map(card).join("") : '<p class="empty small">' + esc(t("pj_empty_col")) + "</p>") +
        (more > 0 ? '<span class="small muted">' + esc(t("pj_done_more", { n: more })) + "</span>" : "") + "</section>";
    }).join("") + "</div>";
  }
  function monthsDuePanel() {
    var due = m.monthsDue();
    if (!due.length) return "";
    return '<section class="panel gel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_due_h")) + '</h2></div><div class="list">' +
      due.map(function (c) {
        var ms = m.contractMonths(c), last = ms[ms.length - 1], n = (last ? last.month : 0) + 1;
        return '<div class="li"><div class="stack" style="gap:2px"><strong>' + esc(m.brand(c.clientId)) + "</strong><span>" +
          esc(t("pj_due_line", { pack: packName(c.pack), n: n, month: u.fmtMonth(m.monthKey(c.start, n)) })) + "</span></div>" +
          ui.btn(t("pj_create_month", { n: n }), "pj-month", opts({ cls: "primary sm", data: { id: c.id } }, dis(!canCreate(), t("pj_no_perm")))) + "</div>";
      }).join("") + "</div></section>";
  }
  function board(params) {
    var f = params.filter || "all", layout = params.layout || "board";
    var active = S.all("projects").filter(function (p) { return p.stage !== "retention"; });
    var blocked = active.filter(function (p) { return m.gates(p).length; });
    var h = ui.head({
      label: t("nav_projects"), title: t("pj_title"), accent: t("pj_accent"),
      sub: esc(t("pj_sub", { n: active.length, b: blocked.length })),
      actions: ui.btn(t("pj_new"), "pj-new", opts({ cls: "primary", icon: "plus" }, dis(!canCreate(), t("pj_no_perm"))))
    });
    h += GK.insight.projects();
    h += monthsDuePanel();
    h += '<div class="pj-bar"><label class="pj-search">' + ui.icon("search", "sm") + '<input class="in" type="search" data-i="pj-q" placeholder="' + esc(t("pj_search")) + '" aria-label="' + esc(t("pj_search")) + '" value="' + esc(params.q || "") + '"></label>' +
      '<div class="tabs" role="tablist" aria-label="' + esc(t("pj_filter")) + '">' + [["all", "pj_f_all"]].concat(m.isFounder() ? [["moh", "pj_f_moh"]] : []).concat([["skin", "pj_f_skin"]]).map(function (x) {
        return '<button type="button" role="tab" data-a="pj-filter" data-v="' + x[0] + '" aria-selected="' + (f === x[0]) + '">' + esc(t(x[1])) + "</button>";
      }).join("") + "</div>" +
      '<div class="tabs pj-layout" role="tablist" aria-label="' + esc(t("pj_layout")) + '">' + [["board", "pj_l_board"], ["list", "pj_l_list"]].map(function (x) {
        return '<button type="button" role="tab" data-a="pj-layout" data-v="' + x[0] + '" aria-selected="' + (layout === x[0]) + '">' + esc(t(x[1])) + "</button>";
      }).join("") + "</div></div>";
    return h + '<div id="pj-results">' + results(params) + "</div>";
  }

  // ---------- detail ----------
  function stepperPanel(p) {
    var si = m.STAGES.indexOf(p.stage), next = m.STAGES[si + 1], prev = m.STAGES[si - 1], ed = canEdit();
    var block = next ? m.stageBlock(p, next) : "";
    var gates = m.gates(p);
    var h = '<section class="panel"><div class="stepper">' + m.STAGES.map(function (s, i) {
      return '<div class="' + (i < si ? "done" : i === si ? "now" : "") + '"' + (i === si ? ' aria-current="step"' : "") + ">" + esc(t("st_" + s)) + "</div>";
    }).join("") + "</div>";
    h += gates.map(function (g) { return '<span class="gate">' + esc(g) + "</span>"; }).join("");
    if (next && block && gates.indexOf(block) < 0) h += '<span class="gate">' + esc(block) + "</span>";
    h += '<div class="row">';
    if (next) h += ui.btn(t("pj_move_to", { s: t("st_" + next) }), "pj-stage", opts({ cls: "primary", data: { v: next } }, !ed ? dis(true, t("pj_no_perm")) : dis(!!block, block)));
    else h += '<span class="small muted">' + esc(t("pj_last_stage")) + "</span>";
    if (prev) h += ui.btn(t("pj_back_to", { s: t("st_" + prev) }), "pj-stage", opts({ cls: "ghost", data: { v: prev } }, dis(!ed, t("pj_no_perm"))));
    h += "</div></section>";
    return h;
  }
  function onboardingPanel(p) {
    var ob = p.onboarding || [], ed = canEdit(), c = m.client(p.clientId), shootOk = m.canShoot(p);
    var n = ob.filter(Boolean).length;
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_onb")) + '</h2><span class="small muted num">' + esc(t("pj_onb_n", { a: n })) + "</span></div>" + ui.meter(n / 7 * 100) + '<div class="stack" style="gap:0">';
    OB.forEach(function (k, i) {
      var gated = i === 6 && !shootOk && !ob[i];
      h += '<label class="check' + (ob[i] ? " done" : "") + '"' + (gated ? ' title="' + esc(t("gate_shoot")) + '"' : "") + '><input type="checkbox" data-c="pj-ob" data-i="' + i + '"' + (ob[i] ? " checked" : "") + (ed && !gated ? "" : " disabled") + (gated ? ' title="' + esc(t("gate_shoot")) + '"' : "") + "><span>" + esc(t(k)) + "</span></label>";
      if (gated && ed) h += '<p class="small muted" style="margin:0;padding:0 0 6px 26px">' + esc(t("gate_shoot")) + "</p>";
      if (i === 4) {
        h += '<div class="row small muted" style="padding:0 0 6px 26px">' +
          esc(c && c.baseline && c.baseline.v ? t("pj_baseline", { v: c.baseline.v, d: u.fmtDate(c.baseline.date) }) : t("pj_no_baseline")) +
          (seesClients() ? ' <button type="button" class="link" data-a="pj-client" data-id="' + esc(p.clientId) + '">' + esc(t("pj_open_client")) + "</button>" : "") + "</div>";
      }
    });
    return h + "</div></section>";
  }
  function detailsPanel(p) {
    var ed = canEdit(), founder = m.isFounder() && canEdit();
    var issued = m.invoicesOf(p).some(function (i) { return !!i.no; });
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_details")) + "</h2></div>";
    if (ed) {
      h += '<div class="form">' +
        ui.field({ id: "pj-d-shoot", label: t("pj_shoot"), type: "date", value: p.shootDate || "", hint: m.canShoot(p) ? "" : t("gate_shoot"),
          attrs: ' data-c="pj-field" data-f="shootDate"' + (m.canShoot(p) ? "" : ' disabled title="' + esc(t("gate_shoot")) + '"') }) +
        ui.field({ id: "pj-d-format", label: t("pj_format"), type: "select", value: p.format || "9x16", options: m.FORMATS.map(function (f) { return [f, f]; }), attrs: ' data-c="pj-field" data-f="format"' }) +
        "</div>";
    } else {
      h += '<div class="list"><div class="li"><span class="lab sm muted">' + esc(t("pj_shoot")) + "</span><span>" + esc(u.fmtDate(p.shootDate)) + '</span></div><div class="li"><span class="lab sm muted">' + esc(t("pj_format")) + '</span><span class="code">' + esc(p.format || "9x16") + "</span></div></div>";
    }
    if (founder) h += '<p class="small muted" style="margin:0">' + esc(hasShare(p) ? t("pj_moh_yes", { p: u.pct(m.commission(p).pct) }) : t("pj_moh_no")) + "</p>";
    if (founder) h += '<div class="row">' + ui.btn(t("pj_delete"), "pj-del", opts({ cls: "ghost sm" }, dis(issued, t("pj_del_issued")))) + "</div>";
    return h + "</section>";
  }
  function planPanel(p) {
    var ed = canEdit(), pk = m.pack(p.pack), angles = p.angles || [], want = pk.angles || 0;
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_plan")) + "</h2>" +
      ui.pill(t("pj_angles_n", { a: angles.length, b: want }), angles.length > want ? "alert" : angles.length === want ? "done" : "") + "</div>";
    if (!angles.length) h += ui.empty(t("pj_no_angles"));
    else {
      h += '<div class="list">' + angles.map(function (a, i) {
        var used = (p.reels || []).some(function (r) { return r.angleId === a.id; }) || (p.carousels || []).some(function (c) { return c.angleId === a.id; });
        if (!ed) return '<div class="li"><div class="stack" style="gap:2px"><strong>A' + (i + 1) + " · " + esc(a.name) + '</strong><span class="m">' + esc(a.why || "") + "</span></div></div>";
        return '<div class="stack" style="gap:6px;padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between"><span class="code">A' + (i + 1) + '</span>' +
          ui.btn(t("pj_remove"), "pj-angle-del", opts({ cls: "ghost sm", data: { id: a.id } }, dis(used, t("pj_angle_used")))) + '</div><div class="form">' +
          '<div class="field"><label for="pj-an-' + esc(a.id) + '">' + esc(t("pj_angle")) + '</label><input id="pj-an-' + esc(a.id) + '" value="' + esc(a.name) + '" data-c="pj-angle" data-id="' + esc(a.id) + '" data-f="name"></div>' +
          '<div class="field"><label for="pj-aw-' + esc(a.id) + '">' + esc(t("pj_why")) + '</label><input id="pj-aw-' + esc(a.id) + '" value="' + esc(a.why || "") + '" data-c="pj-angle" data-id="' + esc(a.id) + '" data-f="why"></div></div></div>';
      }).join("") + "</div>";
    }
    if (ed) {
      h += '<div class="form">' + ui.field({ id: "pj-na-name", label: t("pj_angle"), placeholder: t("pj_angle_ph") }) +
        ui.field({ id: "pj-na-why", label: t("pj_why"), placeholder: t("pj_why_ph") }) + "</div>" +
        '<div class="row">' + ui.btn(t("pj_add_angle"), "pj-angle-add", { cls: "sm" }) + "</div>";
    }
    h += '<hr class="rule"><div class="row between">' +
      '<label class="check"><input type="checkbox" data-c="pj-plan"' + (p.planApproved ? " checked" : "") + (ed ? "" : " disabled") + "><span><strong>" + esc(t("pj_plan_ok")) + "</strong></span></label>" +
      (p.planApproved ? ui.pill(t("pj_plan_on", { d: u.fmtDate(p.planApprovedOn) }), "done") : "") + "</div>";
    return h + "</section>";
  }
  function scopeLine(label, have, want) {
    var over = have > want;
    return '<div class="li"><div class="stack" style="gap:2px"><span class="lab sm muted">' + esc(label) + '</span><span class="big num">' + have + ' <span class="faint">/ ' + want + "</span></span></div>" +
      (over ? ui.pill(t("pj_over"), "alert") : ui.pill(have === want ? t("pj_on_target") : t("pj_under", { n: want - have }), have === want ? "done" : "")) + "</div>";
  }
  function delivPanel(p) {
    var ed = canEdit(), sc = m.scope(p), angles = p.angles || [];
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_deliv")) + '</h2><div class="row">' +
      (ed ? ui.btn(t("pj_add_reel"), "pj-reel-new", opts({ cls: "sm" }, dis(!angles.length, t("pj_need_angle")))) +
        ui.btn(t("pj_add_car"), "pj-car-new", opts({ cls: "sm" }, dis(!angles.length, t("pj_need_angle")))) : "") +
      ui.btn(t("pj_to_prod"), "pj-prod", { cls: "ghost sm" }) + "</div></div>";
    h += '<div class="grid3"><div class="list">' + scopeLine(t("pj_reels"), sc.reels, sc.target.reels) + '</div><div class="list">' +
      scopeLine(t("pj_vars"), sc.variations, sc.target.variations) + '</div><div class="list">' + scopeLine(t("pj_cars"), sc.carousels, sc.target.carousels) + "</div></div>";
    h += '<p class="small muted" style="margin:0">' + esc(t("pj_status_note")) + "</p>";
    var groups = angles.slice();
    var orphans = (p.reels || []).filter(function (r) { return !angleOf(p, r.angleId); });
    if (orphans.length) groups.push({ id: "__none", name: t("pj_no_angle") });
    groups.forEach(function (a, ai) {
      var reels = a.id === "__none" ? orphans : (p.reels || []).filter(function (r) { return r.angleId === a.id; });
      h += '<div class="stack" style="gap:6px;border-top:1px solid var(--ink);padding-top:10px"><h3 class="sec">' + (a.id === "__none" ? "" : "A" + (ai + 1) + " · ") + esc(a.name) + "</h3>";
      if (!reels.length) h += ui.empty(t("pj_no_reels"));
      reels.forEach(function (r, ri) {
        h += '<div class="stack" style="gap:4px;padding:8px 0 4px;border-bottom:1px solid var(--line)"><div class="row between"><div class="row">' +
          "<strong>" + esc(t("pj_reel_n", { n: ri + 1 })) + "</strong>" + ui.pill(r.mode === "I" ? t("pj_mode_I") : t("pj_mode_D")) + '<span class="code">' + esc(r.format || p.format || "9x16") + "</span></div>" +
          (ed ? '<div class="row">' + ui.btn(t("edit"), "pj-reel-edit", { cls: "ghost sm", data: { id: r.id } }) + ui.btn(t("pj_remove"), "pj-reel-del", { cls: "ghost sm", data: { id: r.id } }) + "</div>" : "") + "</div>" +
          (r.script ? '<p class="small muted" style="margin:0">' + esc(r.script) + "</p>" : "");
        h += '<div class="list">' + (r.hooks || []).map(function (hk, hi) {
          var code = '<span class="code">' + esc(m.hookCode(p, r, hi)) + "</span>";
          var text = ed ? '<input class="in" aria-label="' + esc(t("pj_hook_text")) + " H" + (hi + 1) + '" value="' + esc(hk.text || "") + '" data-c="pj-hook" data-r="' + esc(r.id) + '" data-id="' + esc(hk.id) + '">' : "<span>" + esc(hk.text || "—") + "</span>";
          return '<div class="li" style="flex-wrap:wrap"><div class="stack" style="gap:4px;flex:1;min-width:200px"><div class="row">' + code + (hi === 0 ? ui.pill(t("pj_base")) : "") + "</div>" + text + "</div>" +
            '<div class="row">' + ui.filePill(hk.status) + (ed && hi > 0 ? ui.btn(t("pj_remove"), "pj-hook-del", { cls: "ghost sm", data: { id: hk.id, r: r.id } }) : "") + "</div></div>";
        }).join("") + "</div>";
        if (ed) h += '<div class="row"><input class="in" style="flex:1;width:auto;min-width:160px" id="pj-nh-' + esc(r.id) + '" placeholder="' + esc(t("pj_hook_ph")) + '" aria-label="' + esc(t("pj_hook_ph")) + '">' + ui.btn(t("pj_add_hook"), "pj-hook-add", { cls: "sm", data: { id: r.id } }) + "</div>";
        h += "</div>";
      });
      if (a.id !== "__none") {
        var cars = (p.carousels || []).filter(function (c) { return c.angleId === a.id; });
        if (cars.length) h += '<div class="list">' + cars.map(function (c) {
          return '<div class="li" style="flex-wrap:wrap"><div class="stack" style="gap:2px;min-width:0"><span class="code">' + esc(m.carouselCode(p, c)) + "</span><span>" + esc(c.title) + "</span></div>" +
            '<div class="row">' + ui.filePill(c.status) + (ed ? ui.btn(t("pj_remove"), "pj-car-del", { cls: "ghost sm", data: { id: c.id } }) : "") + "</div></div>";
        }).join("") + "</div>";
      }
      h += "</div>";
    });
    if (!angles.length && !orphans.length) h += ui.empty(t("pj_need_angle"));
    return h + "</section>";
  }
  function moneyPanel(p) {
    var ed = canCost(), pk = m.pack(p.pack), costs = p.costs || [], expenses = m.projectExpenses(p), com = m.commission(p);
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_money")) + "</h2></div>";
    var k = [
      { lab: t("pj_price"), v: u.money(m.toTND(m.projectPrice(p), pk.currency)), n: pk.monthly ? t("pj_per_month") : "" },
      { lab: t("pj_received"), v: u.money(m.received(p)), n: t("pj_net_note") },
      { lab: t("pj_cost_basis"), v: u.money(m.costOf(p)) },
      { lab: t("pj_profit"), v: u.money(m.profit(p)) }
    ];
    if (hasShare(p)) k.push({ lab: t("pj_comm", { p: u.pct(com.pct) }), v: u.money(com.amount), n: com.paidOn ? t("pj_comm_paid", { d: u.fmtDate(com.paidOn) }) : com.owed ? t("pj_comm_owed", { x: u.money(com.owed) }) : t("pj_comm_wait") });
    h += ui.kpis(k);
    // cost lines
    h += '<h3 class="sec">' + esc(t("pj_costs")) + "</h3>";
    h += '<p class="small muted" style="margin:0">' + esc(t("pj_cost_basis_h")) + "</p>";
    h += '<div class="row small muted"><span>' + esc(t("pj_estimated_total")) + ": " + esc(u.money(m.estimatedCostOf(p))) + "</span><span>" + esc(t("pj_actual_cost")) + ": " + esc(u.money(m.actualCostOf(p))) + "</span></div>";
    if (!costs.length && !expenses.length) h += ui.empty(t("pj_no_costs"));
    else {
      h += '<div class="tbl"><table><thead><tr><th>' + esc(t("pj_kind")) + "</th><th>" + esc(t("pj_label")) + '</th><th class="r">' + esc(t("pj_amount")) + "</th>" + (ed ? "<th></th>" : "") + "</tr></thead><tbody>" +
        costs.map(function (c) {
          var replaced = expenses.some(function (e) { return e.estimateId === c.id; });
          if (!ed) return "<tr><td>" + esc(t("pj_k_" + c.kind)) + "</td><td>" + esc(c.label) + ' <span class="small muted">· ' + esc(t(replaced ? "pj_estimate_replaced" : "pj_estimate")) + '</span></td><td class="r num">' + esc(u.money(c.amount)) + "</td></tr>";
          return '<tr><td><select class="in" style="min-width:104px" aria-label="' + esc(t("pj_kind")) + '" data-c="pj-cost" data-id="' + esc(c.id) + '" data-f="kind">' +
            KINDS.map(function (kd) { return '<option value="' + kd + '"' + (c.kind === kd ? " selected" : "") + ">" + esc(t("pj_k_" + kd)) + "</option>"; }).join("") + "</select></td>" +
            '<td><input class="in" style="min-width:160px" aria-label="' + esc(t("pj_label")) + '" value="' + esc(c.label) + '" data-c="pj-cost" data-id="' + esc(c.id) + '" data-f="label"></td>' +
            '<td class="r"><input class="in num" type="number" inputmode="decimal" aria-label="' + esc(t("pj_amount")) + '" value="' + esc(c.amount) + '" data-c="pj-cost" data-id="' + esc(c.id) + '" data-f="amount"></td>' +
            '<td class="r">' + ui.btn(t("pj_remove"), "pj-cost-del", { cls: "ghost sm", data: { id: c.id } }) + "</td></tr>";
        }).join("") +
        expenses.map(function (e) {
          return "<tr><td>" + esc(t("pj_actual_cost")) + "</td><td>" + esc(e.label || "—") + ' <span class="small muted">' + esc(u.fmtDate(e.date)) + "</span></td><td class=\"r num\">" + esc(u.money(e.amount)) + "</td>" + (ed ? "<td></td>" : "") + "</tr>";
        }).join("") +
        '</tbody><tfoot><tr><td colspan="2">' + esc(t("pj_total")) + '</td><td class="r num">' + esc(u.money(m.costOf(p))) + "</td>" + (ed ? "<td></td>" : "") + "</tr></tfoot></table></div>";
    }
    var cd = dis(!ed, t("pj_cost_founder"));
    h += '<div class="row">' + ui.btn(t("pj_add_cost"), "pj-cost-add", opts({ cls: "sm" }, cd)) + (!costs.length ? ui.btn(t("pj_fill_est"), "pj-cost-est", opts({ cls: "ghost sm" }, cd)) : "") + "</div>";
    if (!ed) h += '<p class="small muted" style="margin:0">' + esc(t("pj_cost_founder")) + "</p>";
    // invoices
    var invs = m.invoicesOf(p).sort(u.by(function (i) { return i.issued || "9999"; }));
    h += '<h3 class="sec">' + esc(t("pj_invoices")) + "</h3>";
    if (!invs.length) h += ui.empty(t("pj_no_inv"));
    else h += '<div class="list">' + invs.map(function (i) {
      return '<div class="li click" tabindex="0" role="button" data-a="pj-inv" data-id="' + esc(i.id) + '" title="' + esc(t("pj_open_fin")) + '"><div class="stack" style="gap:2px;min-width:0"><span>' + esc(i.label || t("k_" + i.kind)) + '</span><span class="m"><span class="code">' + esc(i.no || t("pj_draft_no")) + "</span> · " + esc(t("k_" + i.kind)) + "</span></div>" +
        '<div class="row" style="flex:none"><span class="num">' + esc(u.money(m.invTotal(i))) + "</span>" + ui.invPill(i) + "</div></div>";
    }).join("") + "</div>";
    // gates in words
    var shootOk = m.canShoot(p), filesOk = m.canFiles(p);
    h += '<h3 class="sec">' + esc(t("pj_gates")) + '</h3><div class="list">' +
      '<div class="li"><span class="small">' + esc(t("gate_shoot")) + "</span>" + ui.pill(shootOk ? t("pj_gate_ok") : t("pj_gate_no"), shootOk ? "done" : "alert") + "</div>" +
      '<div class="li"><span class="small">' + esc(pk.monthly ? t("pj_gate_files_m") : t("gate_files")) + "</span>" + ui.pill(filesOk ? t("pj_gate_ok") : t("pj_gate_no"), filesOk ? "done" : "alert") + "</div></div>";
    return h + "</section>";
  }
  function tasksPanel(p) {
    var canT = m.can("tasks");
    var ts = m.tasksOf(p).sort(function (a, b) { return (a.done - b.done) || String(a.due || "9999").localeCompare(String(b.due || "9999")); });
    var today = u.today();
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_tasks")) + "</h2></div>";
    if (!ts.length) h += ui.empty(t("pj_no_tasks"));
    else h += '<div class="stack" style="gap:0">' + ts.map(function (x) {
      var late = !x.done && x.due && x.due < today;
      return '<div class="row between" style="border-bottom:1px solid var(--line);flex-wrap:nowrap;align-items:flex-start"><label class="check' + (x.done ? " done" : "") + '" style="min-width:0"><input type="checkbox" data-c="pj-task" data-id="' + esc(x.id) + '"' + (x.done ? " checked" : "") + (canT ? "" : " disabled") + "><span>" + esc(x.title) + "</span></label>" +
        '<span class="small muted" style="flex:none;text-align:right;padding-top:7px">' + esc(m.member(x.who).name) + "<br>" + esc(u.fmtDate(x.due)) + (late ? " " + ui.pill(t("pj_late"), "alert") : "") + "</span></div>";
    }).join("") + "</div>";
    if (canT) {
      var team = S.all("team").sort(u.by("name")), me = GK.me();
      h += '<div class="form">' + ui.field({ id: "pj-nt-title", label: t("pj_new_task"), placeholder: t("pj_task_ph"), span: true }) +
        ui.field({ id: "pj-nt-who", label: t("pj_who"), type: "select", value: me ? me.id : "", options: team.map(function (x) { return [x.id, x.name]; }) }) +
        ui.field({ id: "pj-nt-due", label: t("pj_due"), type: "date", value: u.d(1) }) + "</div>" +
        '<div class="row">' + ui.btn(t("pj_add_task"), "pj-task-add", { cls: "sm" }) + "</div>";
    }
    // log
    var log = (p.log || []).slice(-10).reverse();
    h += '<h3 class="sec">' + esc(t("pj_log")) + "</h3>";
    if (!log.length) h += ui.empty(t("pj_no_log"));
    else h += '<div class="list">' + log.map(function (l) {
      return '<div class="li" style="align-items:flex-start"><span class="small">' + esc(l.text) + '</span><span class="m" style="flex:none;text-align:right">' + esc(l.who ? m.member(l.who).name : "") + "<br>" + esc(u.fmtDate(l.at)) + " " + esc(String(l.at || "").slice(11, 16)) + "</span></div>";
    }).join("") + "</div>";
    return h + "</section>";
  }
  // ---------- detail: one page per project, in tabs ----------
  var TABS = ["overview", "brief", "scripts", "board", "shoot", "edits", "money"];
  function ideasOf(p) { return S.all("ideas").filter(function (i) { return i.projectId === p.id && i.stage !== "parked"; }).sort(u.by(function (i) { return i.shootOrder != null ? i.shootOrder : 999; })); }
  function tabsFor() { return TABS.filter(function (k) { return k !== "money" || m.isFounder(); }).filter(function (k) { return k !== "scripts" && k !== "board" || m.can("ideas") || GK.ui.nav().indexOf("studio") > -1; }); }
  function scriptsTab(p) {
    var list = ideasOf(p), ok = m.can("ideas");
    var h = '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("pj_t_scripts")) + "</h2>" +
      (ok ? ui.btn(t("pj_new_script"), "pj-script-new", { cls: "primary sm", icon: "plus" }) : "") + "</div>";
    if (!list.length) return h + ui.empty(t("pj_no_scripts")) + "</section>";
    return h + '<div class="list">' + list.map(function (i) {
      var n = (i.scenes || []).length;
      return '<div class="li click" tabindex="0" role="button" data-a="pj-script" data-id="' + esc(i.id) + '"><div class="stack" style="gap:2px;min-width:0"><strong>' + esc(i.hook ? "“" + i.hook + "”" : i.title) + "</strong>" +
        '<span class="m">' + esc(i.title) + (n ? " · " + esc(t("pj_scenes_n", { n: n })) : "") + "</span></div>" + (function (es) { return ui.chip(GK.studio.h.stName(es), es); })(GK.studio.h.effStage(i)) + "</div>";
    }).join("") + "</div></section>";
  }
  function boardTab(p) {
    var list = ideasOf(p).filter(function (i) { return (i.scenes || []).length; });
    if (!list.length) return ui.empty(t("pj_no_board"));
    return list.map(function (i) {
      return '<div class="stack" style="gap:var(--sp-2)"><h3 class="sec" style="margin:0">' + esc(i.title) + "</h3>" + GK.studio.boardPanel(i) + "</div>";
    }).join("");
  }
  function shootTab(p) { return GK.shootday.panel(p) + detailsPanel(p); }
  function editsTab(p) {
    var links = [["pj_to_prod", "pj-prod"], ["pj_to_deliv", "pj-deliv"]];
    if (GK.ui.nav().indexOf("reports") > -1) links.push(["pj_to_results", "pj-results"]);
    if (GK.ui.nav().indexOf("boards") > -1) links.push(["pj_to_boards", "pj-boards"]);
    return '<div class="row">' + links.map(function (x) { return ui.btn(t(x[0]), x[1], { cls: "ghost sm" }); }).join("") + "</div>" + delivPanel(p);
  }
  function tabCount(p, k) {
    if (k === "scripts" || k === "shoot") { var n = ideasOf(p).length; return n || ""; }
    if (k === "overview") { var o = m.tasksOf(p).filter(function (x) { return !x.done; }).length; return o || ""; }
    if (k === "edits") { var pr = m.progress(p); return pr.total ? pr.done + "/" + pr.total : ""; }
    return "";
  }
  function nextPanel(p) {
    var si = m.STAGES.indexOf(p.stage), next = m.STAGES[si + 1], block = next ? m.stageBlock(p, next) : "", gates = m.gates(p);
    var what = gates[0] || block || (next ? t("pj_next_ready", { s: t("st_" + next) }) : t("pj_last_stage"));
    return '<section class="panel pj-next"><span class="lab">' + esc(t("pj_next_h")) + "</span><p class=\"pj-next-t\">" + esc(what) + "</p></section>";
  }
  function detail(p, params) {
    var pk = m.pack(p.pack), tabs = tabsFor(), tab = tabs.indexOf(params.tab) > -1 ? params.tab : "overview", f = facts(p);
    var h = '<header class="pj-hero"><div class="pj-crumbs"><button type="button" class="pj-crumb" data-a="pj-back">' + ui.icon("projects", "sm") + esc(t("nav_projects")) + "</button><span>/</span>" +
      (seesClients() ? '<button type="button" class="pj-crumb" data-a="pj-client" data-id="' + esc(p.clientId) + '">' + esc(m.brand(p.clientId)) + "</button>" : "<span>" + esc(m.brand(p.clientId)) + "</span>") + "</div>" +
      '<h1 class="pj-h1">' + esc(p.name) + "</h1>" +
      '<div class="pj-tags">' + ui.stagePill(p) + ui.chip(pk.name, p.pack) + (p.month ? '<span class="small">' + esc(monthLabel(p)) + "</span>" : "") + (m.isFounder() && hasShare(p) ? ui.pill(t("pj_f_moh")) : "") + "</div>" +
      '<div class="pj-stats">' +
      [[t("pj_shoot"), p.shootDate ? u.fmtDate(p.shootDate, { weekday: "short", day: "numeric", month: "short" }) : "—"],
       [t("pj_t_scripts"), String(f.videos)],
       [t("pj_tasks"), f.open + (f.late ? " · " + t("pj_late_n", { n: f.late }) : "")],
       [t("pj_files"), f.files.total ? f.files.done + " / " + f.files.total : "—"],
       [t("pj_col_progress"), stagePct(p) + "%"]].map(function (x) { return '<div><span class="lab">' + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("") +
      '</div><div class="pj-track" aria-hidden="true">' + m.STAGES.map(function (s, i) { var si = m.STAGES.indexOf(p.stage); return "<i" + (i < si ? ' class="done"' : i === si ? ' class="now"' : "") + "></i>"; }).join("") + "</div></header>";
    if (!canEdit()) h += '<p class="note">' + esc(t("pj_readonly")) + "</p>";
    h += '<div class="pj-tabbar"><div class="tabs pj-tabs" role="tablist">' + tabs.map(function (k) {
      var c = tabCount(p, k);
      return '<button type="button" role="tab" data-a="pj-tab" data-v="' + k + '" aria-selected="' + (tab === k) + '">' + esc(t("pj_t_" + k)) + (c !== "" ? '<span class="pj-tc">' + esc(String(c)) + "</span>" : "") + "</button>";
    }).join("") + "</div></div>";
    h += '<div class="pj-pane" data-tab="' + tab + '">';
    if (tab === "overview") h += '<div class="pj-ov">' + nextPanel(p) + stepperPanel(p) + "</div>" + '<div class="grid2">' + tasksPanel(p) + onboardingPanel(p) + "</div>";
    else if (tab === "brief") h += planPanel(p);
    else if (tab === "scripts") h += scriptsTab(p);
    else if (tab === "board") h += boardTab(p);
    else if (tab === "shoot") h += shootTab(p);
    else if (tab === "edits") h += editsTab(p);
    else if (tab === "money") h += moneyPanel(p);
    return h + "</div>";
  }

  GK.view("projects", {
    render: function (params) {
      var p = params.id ? m.project(params.id) : null;
      return p ? detail(p, params) : board(params);
    },
    count: function () { return S.all("projects").filter(function (p) { return p.stage !== "retention"; }).length || ""; }
  });

  // ---------- New project (also used by other modules) ----------
  var newCtx = {};
  function openNew(o) {
    o = o || {};
    if (!canCreate()) { ui.toast(t("pj_no_perm")); return; }
    newCtx = { contractId: o.contractId || "", month: o.month || 0, price: o.price, sourceLeadId: o.sourceLeadId || "", sourceQuoteId: o.sourceQuoteId || "" };
    var clients = S.all("clients").sort(u.by("brand"));
    var me = GK.me(), ctr = o.contractId ? S.get("contracts", o.contractId) : null;
    var pk = o.pack || (ctr && ctr.pack) || "test";
    if (!clients.length) {
      ui.modal({ title: t("pj_new_t"), accent: t("pj_new_acc"), label: t("nav_projects"), body: '<p style="margin:0">' + esc(t("pj_no_client")) + "</p>", foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("pj_add_client"), "pj-new-client", { cls: "primary" }) });
      return;
    }
    var monthly = m.pack(pk).monthly;
    var body = '<div class="form">' +
      ui.field({ id: "pj-n-client", label: t("pj_client"), type: "select", value: o.clientId || (ctr && ctr.clientId) || "", options: [["", "—"]].concat(clients.map(function (c) { return [c.id, c.brand]; })) }) +
      ui.field({ id: "pj-n-pack", label: t("pj_pack"), type: "select", value: pk, options: m.packKeys().map(function (k) { var x = m.pack(k); return [k, x.name + " · " + u.money(x.price) + (x.monthly ? " " + t("per_month") : "")]; }), attrs: ' data-c="pj-n-pack"' }) +
      ui.field({ id: "pj-n-name", label: t("pj_name"), value: o.month ? t("pj_month_n", { n: o.month }) : "", placeholder: t("pj_name_ph") }) +
      "</div>" +
      '<p class="note" id="pj-n-hint" style="margin:0">' + esc(t(monthly ? "pj_new_hint_month" : "pj_new_hint_once")) + "</p>" +
      '<div class="row"><button type="button" class="link small" data-a="pj-new-client">' + esc(t("pj_add_client")) + "</button></div>";
    ui.modal({ title: t("pj_new_t"), accent: t("pj_new_acc"), label: t("nav_projects"), body: body, foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("pj_create"), "pj-new-save", { cls: "primary" }) });
  }
  GK.pj = { openNew: openNew };

  GK.act("pj-new", function () { openNew({}); });
  GK.change("pj-n-pack", function (el) {
    var hint = document.getElementById("pj-n-hint");
    if (hint) hint.textContent = t(m.pack(el.value).monthly ? "pj_new_hint_month" : "pj_new_hint_once");
  });
  GK.act("pj-new-client", function () { ui.closeModal(true); ui.go("clients", { new: true }); });
  GK.act("pj-new-save", function () {
    if (!canCreate()) return ui.toast(t("pj_no_perm"));
    var clientId = u.val("pj-n-client"), pack = u.val("pj-n-pack"), name = u.val("pj-n-name").trim();
    if (!clientId) { u.focus("pj-n-client"); return ui.toast(t("required")); }
    var pk = m.pack(pack), contractId = newCtx.contractId, month = newCtx.month;
    if (newCtx.sourceQuoteId) {
      var sourceQuote = S.get("quotes", newCtx.sourceQuoteId);
      if (!sourceQuote || sourceQuote.clientId !== clientId || sourceQuote.pack !== pack) return ui.toast(t("pj_lead_link_error"));
      var quoteProject = S.all("projects").find(function (project) { return project.sourceQuoteId === newCtx.sourceQuoteId; });
      if (quoteProject) {
        if (quoteProject.clientId !== clientId) return ui.toast(t("pj_lead_link_error"));
        var recovered = GK.finQuotes && GK.finQuotes.completeHandoff(newCtx.sourceQuoteId, quoteProject.id);
        if (!recovered) return ui.toast(t("fi_q_handoff_error"));
        ui.closeModal(true);
        ui.go("projects", { id: quoteProject.id });
        ui.toast(t("pj_created"));
        return;
      }
    }
    if (newCtx.sourceLeadId) {
      var leadProject = S.get("leads", newCtx.sourceLeadId), existingProject = leadProject && leadProject.projectId ? m.project(leadProject.projectId) : null;
      existingProject = existingProject || S.all("projects").find(function (project) { return project.sourceLeadId === newCtx.sourceLeadId; });
      if (existingProject) {
        if (existingProject.clientId !== clientId) return ui.toast(t("pj_lead_link_error"));
        if (leadProject && leadProject.projectId !== existingProject.id && !S.patch("leads", leadProject.id, { projectId: existingProject.id })) return ui.toast(t("pj_lead_link_error"));
        ui.closeModal(true);
        ui.go("projects", { id: existingProject.id });
        return;
      }
    }
    if (pk.monthly) {
      // A monthly project belongs to a contract: reuse the client's active one for this pack, or open one.
      var c = contractId ? S.get("contracts", contractId) : null;
      if (c && (c.clientId !== clientId || c.pack !== pack)) { c = null; month = 0; }
      if (!c) c = S.all("contracts").find(function (x) { return x.clientId === clientId && x.pack === pack && x.status === "active"; });
      // One active monthly contract per client: a different monthly offer can't open a second one.
      if (!c && S.all("contracts").some(function (x) { return x.clientId === clientId && x.status === "active"; })) { u.focus("pj-n-pack"); return ui.toast(t("pj_skin_has")); }
      if (!c) {
        c = S.put("contracts", { clientId: clientId, pack: pack, monthlyPrice: newCtx.price != null ? +newCtx.price : m.priceFor(pack, clientId, 1).price, start: u.month(u.today()), minMonths: 3, status: "active" });
        if (!c) return;
      }
      contractId = c.id;
      if (!month) { var ms = m.contractMonths(c); month = (ms.length ? ms[ms.length - 1].month : 0) + 1; }
      if (!name) name = t("pj_month_n", { n: month });
    } else { contractId = ""; month = 0; }
    if (!name) { u.focus("pj-n-name"); return ui.toast(t("required")); }
    var price = pk.monthly
      ? m.contractPrice(c)
      : (newCtx.price != null ? newCtx.price : m.priceFor(pack, clientId, month).price);
    var p = createWithInvoices(baseProject({ clientId: clientId, sourceLeadId: newCtx.sourceLeadId, sourceQuoteId: newCtx.sourceQuoteId, contractId: contractId, month: month, name: name, pack: pack, price: price }), t("pj_created"), !!newCtx.sourceQuoteId);
    if (!p) return;
    var leadLinkFailed = false;
    if (newCtx.sourceLeadId) {
      var sourceLead = S.get("leads", newCtx.sourceLeadId);
      if (sourceLead && !S.patch("leads", sourceLead.id, { projectId: p.id })) leadLinkFailed = true;
    }
    var quoteHandoffFailed = false;
    if (newCtx.sourceQuoteId) {
      quoteHandoffFailed = !(GK.finQuotes && GK.finQuotes.completeHandoff(newCtx.sourceQuoteId, p.id));
    }
    ui.closeModal(true);
    ui.toast(t(leadLinkFailed ? "pj_lead_link_error" : quoteHandoffFailed ? "fi_q_handoff_error" : "pj_created"));
    ui.go("projects", { id: p.id });
  });
  GK.act("pj-month", function (el) {
    if (!canCreate()) return ui.toast(t("pj_no_perm"));
    var c = S.get("contracts", el.dataset.id); if (!c) return;
    var r = createMonth(c); if (!r) return;
    ui.toast(t("pj_month_made", { n: r.n }));
    ui.go("projects", { id: r.p.id });
  });

  // ---------- navigation ----------
  GK.act("pj-open", function (el) { ui.go("projects", { id: el.dataset.id }); });
  GK.act("pj-back", function () { ui.go("projects", { id: null }); });
  GK.act("pj-filter", function (el) { ui.go("projects", { filter: el.dataset.v }); });
  GK.act("pj-layout", function (el) { ui.go("projects", { layout: el.dataset.v }); });
  GK.act("pj-tab", function (el) { ui.go("projects", { tab: el.dataset.v }); });
  GK.act("pj-script", function (el) { ui.go("studio", { id: el.dataset.id }); });
  GK.act("pj-script-new", function () {
    var p = cur(); if (!p || !m.can("ideas")) return;
    var me = GK.me(), n = ideasOf(p).length + 1;
    var rec = S.put("ideas", {
      title: t("pj_script_n", { n: n }), stage: "script", clientId: p.clientId, projectId: p.id, angleId: "", angle: "", objective: "", audience: "", creativeType: "brand",
      offer: "", objection: "", proof: "", cta: "", hook: "", concept: "", script: "", scenes: [], mode: "D", format: p.format || "9x16",
      refs: [], boardId: "", owner: me ? me.id : "", tags: [], priority: 2, reelId: "", created: u.today(), shareOk: false, reviewAsked: false, notes: "", shootDate: p.shootDate || ""
    }, { log: "" });
    ui.go("studio", { id: rec.id });
  });
  GK.act("pj-deliv", function () { ui.go("deliveries"); });
  GK.act("pj-results", function () { var p = cur(); ui.go("reports", { projectId: p ? p.id : null }); });
  GK.act("pj-boards", function () { ui.go("boards"); });
  GK.act("pj-prod", function () { var p = cur(); ui.go("production", { projectId: p ? p.id : null }); });
  GK.act("pj-client", function (el) { ui.go("clients", { id: el.dataset.id, tab: "overview" }); });
  GK.act("pj-inv", function (el) { ui.go("finance", { invoiceId: el.dataset.id, tab: "invoices" }); });

  // ---------- stage ----------
  GK.act("pj-stage", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var to = el.dataset.v, why = m.stageBlock(p, to);
    if (why) return ui.toast(why);
    save({ stage: to }, t("pj_log_moved", { a: t("st_" + p.stage), b: t("st_" + to) }));
    ui.toast(t("st_" + to));
  });

  // ---------- onboarding, details ----------
  GK.change("pj-ob", function (el) {
    if (!guardEdit()) { el.checked = !el.checked; return; }
    var p = cur(); if (!p) return;
    var ob = (p.onboarding || []).slice(); while (ob.length < 7) ob.push(false);
    var i = +el.dataset.i;
    if (i === 6 && el.checked && !m.canShoot(p)) { el.checked = false; return ui.toast(t("gate_shoot")); }
    ob[i] = el.checked;
    save({ onboarding: ob }, (el.checked ? "✓ " : "✗ ") + t(OB[i]));
  });
  GK.change("pj-field", function (el) {
    if (!guardEdit()) return;
    var f = el.dataset.f, o = {}; o[f] = el.value;
    var p = cur(); if (!p) return;
    if (f === "shootDate" && !m.canShoot(p)) { el.value = p.shootDate || ""; return ui.toast(t("gate_shoot")); }
    save(o, (f === "shootDate" ? kv(t("pj_shoot"), u.fmtDate(el.value)) : kv(t("pj_format"), el.value)));
  });
  GK.act("pj-del", function () {
    if (!m.isFounder() || !canEdit()) return ui.toast(t("pj_founder_only"));
    var p = cur(); if (!p) return;
    if (m.invoicesOf(p).some(function (i) { return !!i.no; })) return ui.toast(t("pj_del_issued"));
    ui.confirm(t("pj_del_q"), t("pj_del_body"), function () {
      m.invoicesOf(p).forEach(function (i) { S.remove("invoices", i.id); });
      m.tasksOf(p).forEach(function (x) { S.remove("tasks", x.id); });
      S.remove("projects", p.id);
      ui.toast(t("pj_deleted"));
      ui.go("projects", { id: null });
    }, t("pj_delete"));
  });

  // ---------- creative plan ----------
  GK.act("pj-angle-add", function () {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var name = u.val("pj-na-name").trim(), why = u.val("pj-na-why").trim();
    if (!name) { u.focus("pj-na-name"); return ui.toast(t("required")); }
    save({ angles: (p.angles || []).concat([{ id: u.uid("a"), name: name, why: why }]) }, kv(t("pj_angle"), name));
  });
  GK.change("pj-angle", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var f = el.dataset.f, v = el.value.trim();
    if (f === "name" && !v) { ui.toast(t("required")); return ui.render(true); }
    save({ angles: (p.angles || []).map(function (a) { if (a.id !== el.dataset.id) return a; var b = u.clone(a); b[f] = v; return b; }) });
  });
  GK.act("pj-angle-del", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var a = angleOf(p, el.dataset.id); if (!a) return;
    save({ angles: p.angles.filter(function (x) { return x.id !== a.id; }) }, kv(t("pj_remove"), a.name));
  });
  GK.change("pj-plan", function (el) {
    if (!guardEdit()) { el.checked = !el.checked; return; }
    save({ planApproved: el.checked, planApprovedOn: el.checked ? u.today() : "" }, el.checked ? t("pj_log_plan") : t("pj_log_unplan"));
  });

  // ---------- reels & hooks ----------
  var editingReel = null;
  function reelModal(r) {
    var p = cur(); if (!p) return;
    editingReel = r ? r.id : null;
    var body = '<div class="form">' +
      ui.field({ id: "pj-r-angle", label: t("pj_angle"), type: "select", value: r ? r.angleId : (p.angles[0] || {}).id, options: p.angles.map(function (a, i) { return [a.id, "A" + (i + 1) + " · " + a.name]; }) }) +
      ui.field({ id: "pj-r-mode", label: t("pj_mode"), type: "select", value: r ? r.mode : "D", options: [["D", t("pj_mode_D")], ["I", t("pj_mode_I")]] }) +
      ui.field({ id: "pj-r-format", label: t("pj_format"), type: "select", value: r ? r.format : (p.format || "9x16"), options: m.FORMATS.map(function (f) { return [f, f]; }) }) +
      "</div>" +
      ui.field({ id: "pj-r-script", label: t("pj_script"), type: "textarea", value: r ? r.script : "", placeholder: t("pj_script_ph") }) +
      (r ? "" : ui.field({ id: "pj-r-hook", label: t("pj_h1"), value: "", placeholder: t("pj_hook_ph") }));
    ui.modal({ title: r ? t("pj_edit_reel_t") : t("pj_add_reel_t"), accent: t("pj_reel_acc"), label: m.projectLabel(p), body: body, foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "pj-reel-save", { cls: "primary" }) });
  }
  GK.act("pj-reel-new", function () {
    if (!guardEdit()) return;
    var p = cur(); if (!p || !(p.angles || []).length) return ui.toast(t("pj_need_angle"));
    reelModal(null);
  });
  GK.act("pj-reel-edit", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var r = (p.reels || []).find(function (x) { return x.id === el.dataset.id; }); if (r) reelModal(r);
  });
  GK.act("pj-reel-save", function () {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var angleId = u.val("pj-r-angle");
    if (!angleId) { u.focus("pj-r-angle"); return ui.toast(t("required")); }
    var vals = { angleId: angleId, mode: u.val("pj-r-mode") === "I" ? "I" : "D", format: u.val("pj-r-format") || "9x16", script: u.val("pj-r-script").trim() };
    var old = editingReel ? (p.reels || []).find(function (r) { return r.id === editingReel; }) : null;
    var h1 = old ? ((old.hooks || [])[0] || {}).text || "" : u.val("pj-r-hook").trim();
    if (!vals.script && !String(h1).trim()) { if (!old) u.focus("pj-r-hook"); u.focus("pj-r-script"); return ui.toast(t("pj_reel_need")); }
    var reels = (p.reels || []).slice(), log;
    if (editingReel) {
      reels = reels.map(function (r) { return r.id === editingReel ? Object.assign(u.clone(r), vals) : r; });
      log = t("pj_edit_reel");
    } else {
      reels.push(Object.assign({ id: u.uid("r"), drive: "", hooks: [newHook(u.val("pj-r-hook").trim())] }, vals));
      log = t("pj_add_reel") + " · " + (angleOf(p, angleId) || {}).name;
    }
    ui.closeModal(true);
    save({ reels: reels }, log);
    ui.toast(t("saved"));
  });
  GK.act("pj-reel-del", function (el) {
    if (!guardEdit()) return;
    var id = el.dataset.id;
    ui.confirm(t("pj_del_reel_q"), t("pj_del_reel_b"), function () {
      var p = cur(); if (!p) return;
      save({ reels: (p.reels || []).filter(function (r) { return r.id !== id; }) }, t("pj_remove") + " · " + t("pj_reels"));
    }, t("pj_remove"));
  });
  GK.act("pj-hook-add", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var rid = el.dataset.id, inp = "pj-nh-" + rid, text = u.val(inp).trim();
    if (!text) { u.focus(inp); return ui.toast(t("required")); }
    save({ reels: (p.reels || []).map(function (r) { if (r.id !== rid) return r; var c = u.clone(r); c.hooks = (c.hooks || []).concat([newHook(text)]); return c; }) }, kv(t("pj_add_hook"), text));
  });
  GK.change("pj-hook", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var rid = el.dataset.r, hid = el.dataset.id, v = el.value.trim();
    save({ reels: (p.reels || []).map(function (r) {
      if (r.id !== rid) return r;
      var c = u.clone(r); c.hooks = (c.hooks || []).map(function (h) { if (h.id === hid) h.text = v; return h; }); return c;
    }) });
  });
  GK.act("pj-hook-del", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var rid = el.dataset.r, hid = el.dataset.id;
    save({ reels: (p.reels || []).map(function (r) {
      if (r.id !== rid) return r;
      var c = u.clone(r); if (c.hooks.length && c.hooks[0].id === hid) return c; // H1 is the base reel, it stays
      c.hooks = c.hooks.filter(function (h) { return h.id !== hid; }); return c;
    }) }, t("pj_remove") + " · " + t("pj_vars"));
  });

  // ---------- carousels ----------
  GK.act("pj-car-new", function () {
    if (!guardEdit()) return;
    var p = cur(); if (!p || !(p.angles || []).length) return ui.toast(t("pj_need_angle"));
    ui.modal({
      title: t("pj_add_car_t"), accent: t("pj_car_acc"), label: m.projectLabel(p),
      body: ui.field({ id: "pj-c-angle", label: t("pj_angle"), type: "select", value: p.angles[0].id, options: p.angles.map(function (a, i) { return [a.id, "A" + (i + 1) + " · " + a.name]; }) }) +
        ui.field({ id: "pj-c-title", label: t("pj_car_title"), placeholder: t("pj_car_ph") }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "pj-car-save", { cls: "primary" })
    });
  });
  GK.act("pj-car-save", function () {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    var title = u.val("pj-c-title").trim(), angleId = u.val("pj-c-angle");
    if (!title) { u.focus("pj-c-title"); return ui.toast(t("required")); }
    ui.closeModal(true);
    save({ carousels: (p.carousels || []).concat([{ id: u.uid("k"), angleId: angleId, title: title, status: "todo", v: 1, clientOk: false, drive: "" }]) }, kv(t("pj_add_car"), title));
    ui.toast(t("saved"));
  });
  GK.act("pj-car-del", function (el) {
    if (!guardEdit()) return;
    var p = cur(); if (!p) return;
    save({ carousels: (p.carousels || []).filter(function (c) { return c.id !== el.dataset.id; }) }, t("pj_remove") + " · " + t("pj_cars"));
  });

  // ---------- costs ----------
  GK.change("pj-cost", function (el) {
    if (!guardCost()) return ui.render(true);
    var p = cur(); if (!p) return;
    var f = el.dataset.f, v = f === "amount" ? (parseFloat(String(el.value).replace(",", ".")) || 0) : el.value;
    save({ costs: (p.costs || []).map(function (c) { if (c.id !== el.dataset.id) return c; var d = u.clone(c); d[f] = v; return d; }) });
  });
  GK.act("pj-cost-add", function () {
    if (!guardCost()) return;
    var p = cur(); if (!p) return;
    save({ costs: (p.costs || []).concat([{ id: u.uid("c"), kind: "other", label: "", amount: 0 }]) });
  });
  GK.act("pj-cost-est", function () {
    if (!guardCost()) return;
    var p = cur(); if (!p) return;
    save({ costs: m.estimateCosts(p.pack) }, t("pj_fill_est"));
  });
  GK.act("pj-cost-del", function (el) {
    if (!guardCost()) return;
    var p = cur(); if (!p) return;
    var c = (p.costs || []).find(function (x) { return x.id === el.dataset.id; });
    save({ costs: (p.costs || []).filter(function (x) { return x.id !== el.dataset.id; }) }, c ? kv(t("pj_remove"), (c.label || t("pj_k_" + c.kind)) + " " + u.money(c.amount)) : "");
  });

  // ---------- tasks ----------
  GK.change("pj-task", function (el) {
    if (!m.can("tasks")) { el.checked = !el.checked; return ui.toast(t("pj_no_perm")); }
    S.patch("tasks", el.dataset.id, { done: el.checked });
  });
  GK.act("pj-task-add", function () {
    if (!m.can("tasks")) return ui.toast(t("pj_no_perm"));
    var p = cur(); if (!p) return;
    var title = u.val("pj-nt-title").trim();
    if (!title) { u.focus("pj-nt-title"); return ui.toast(t("required")); }
    S.put("tasks", { projectId: p.id, title: title, who: u.val("pj-nt-who"), due: u.val("pj-nt-due"), done: false });
    ui.toast(t("saved"));
  });
  if (typeof document === "undefined") return;
  var css = document.createElement("style"); css.id = "gk-projects-css";
  css.textContent =
    // board
    ".pj-bar{display:flex;gap:var(--sp-3);align-items:center;flex-wrap:wrap;margin-bottom:var(--sp-4)}" +
    ".pj-search{display:flex;align-items:center;gap:8px;flex:1;min-width:220px;border:1px solid var(--line);padding:0 10px;background:var(--bg)}.pj-search .in{border:0!important;background:transparent!important;padding-left:0}" +
    ".pj-search:focus-within{border-color:var(--tx)}" +
    ".pj-phases{display:grid;grid-template-columns:repeat(4,minmax(240px,1fr));gap:var(--sp-3);overflow-x:auto;padding-bottom:8px}" +
    ".pj-col{display:flex;flex-direction:column;gap:10px;min-width:0;border-top:3px solid var(--tx);padding-top:var(--sp-2)}" +
    ".pj-col:nth-child(1){border-color:var(--gel)}.pj-col:nth-child(2){border-color:var(--chroma)}.pj-col:nth-child(3){border-color:var(--tx)}.pj-col:nth-child(4){border-color:var(--line)}" +
    ".card.pj-card{display:flex;flex-direction:column;gap:6px;text-align:left;padding:14px;border:1px solid var(--line);background:var(--bg);cursor:pointer;transition:transform .18s ease,border-color .18s ease;animation:pjIn .35s cubic-bezier(.2,.7,.2,1) both}" +
    ".card.pj-card:hover,.card.pj-card:focus-visible{border-color:var(--tx);transform:translateY(-2px)}" +
    ".pj-c-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.pj-c-top .lab{font-size:11px;opacity:.7}" +
    ".pj-card .t{font-size:17px;font-weight:700;letter-spacing:-.01em}" +
    ".pj-c-bar{display:block;height:3px;background:var(--line);margin:4px 0}.pj-c-bar i{display:block;height:100%;background:var(--tx);transition:width .5s ease}" +
    ".pj-c-facts{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px}.pj-c-facts>span{display:inline-flex;align-items:center;gap:4px}.pj-c-facts .ic{width:14px;height:14px;opacity:.6}" +
    ".pj-c-facts .is-late,td.is-late{color:var(--tx);background:var(--gel);padding:0 4px}" +
    ".pj-c-ppl{margin-left:auto;display:inline-flex}.pj-c-ppl .av{width:22px;height:22px;font-size:10px;margin-left:-6px;border:2px solid var(--bg)}" +
    ".pj-table{overflow-x:auto;border:1px solid var(--line)}.pj-table table{width:100%;border-collapse:collapse;font-size:14px}" +
    ".pj-table th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--tx);font-size:11px}.pj-table td{padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}" +
    ".pj-table tbody tr{cursor:pointer;transition:background .15s}.pj-table tbody tr:hover{background:var(--chroma)}.pj-table td .pj-c-bar{width:90px}" +
    // detail
    ".pj-hero{display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-4);animation:pjIn .35s ease both}" +
    ".pj-crumbs{display:flex;align-items:center;gap:8px;font-family:var(--f-type);font-size:12px;letter-spacing:.06em;text-transform:uppercase}.pj-crumbs>span{opacity:.4}" +
    ".pj-crumb{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;opacity:.7}.pj-crumb:hover{opacity:1;text-decoration:underline}.pj-crumb .ic{width:14px;height:14px}" +
    ".pj-h1{margin:0;font-size:clamp(30px,4.4vw,52px);line-height:1;font-weight:700;letter-spacing:-.035em;text-wrap:balance}" +
    ".pj-tags{display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
    ".pj-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--line)}.pj-stats>div{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-left:1px solid var(--line);min-width:0}.pj-stats>div:first-child{border-left:0}" +
    ".pj-stats .lab{font-size:10.5px;opacity:.65}.pj-stats b{font-size:18px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".pj-track{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}.pj-track i{height:5px;background:var(--line);transition:background .4s ease}.pj-track i.done{background:var(--tx)}.pj-track i.now{background:var(--chroma);animation:pjPulse 2.4s ease-in-out infinite}" +
    ".pj-tabbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:6px 0;margin-bottom:var(--sp-4)}" +
    ".pj-tabs{overflow-x:auto;max-width:100%;flex-wrap:nowrap}.pj-tabs [role=tab]{white-space:nowrap;display:inline-flex;align-items:center;gap:6px}" +
    ".pj-tc{font-family:var(--f-type);font-size:10.5px;padding:0 5px;border:1px solid currentColor;line-height:16px;opacity:.75}" +
    ".pj-pane{animation:pjIn .3s cubic-bezier(.2,.7,.2,1) both}" +
    ".pj-ov{display:grid;grid-template-columns:minmax(220px,1fr) 3fr;gap:var(--sp-4);margin-bottom:var(--sp-4)}.pj-ov>.panel{margin:0}" +
    ".panel.pj-next{background:var(--chroma);color:var(--b-ink);border-color:var(--chroma);display:flex;flex-direction:column;gap:8px}.pj-next-t{margin:0;font-size:19px;font-weight:700;letter-spacing:-.01em;line-height:1.25}" +
    "@keyframes pjIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes pjPulse{0%,100%{opacity:1}50%{opacity:.45}}" +
    "@media (prefers-reduced-motion:reduce){.pj-card,.pj-hero,.pj-pane,.pj-track i.now{animation:none!important}.card.pj-card:hover{transform:none}}" +
    "@media (max-width:900px){.pj-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.pj-stats>div:nth-child(4){border-left:0}.pj-stats>div:nth-child(n+4){border-top:1px solid var(--line)}.pj-ov{grid-template-columns:1fr}}" +
    "@media (max-width:600px){.pj-phases{grid-template-columns:repeat(4,82vw)}.pj-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.pj-stats>div{border-left:0;border-top:1px solid var(--line)}.pj-stats>div:nth-child(-n+2){border-top:0}.pj-stats>div:nth-child(even){border-left:1px solid var(--line)}}";
  document.head.appendChild(css);
})(window.GK);
