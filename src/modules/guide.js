/* GECKO Ops · first-run guide and contextual help. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, S = GK.store, esc = u.esc;
  var KEY = "gecko-ops-onboarding-v1";

  GK.i18n.add({
    guide_title: ["Start with the workflow,", "Commencer par le flux de travail,"],
    guide_accent: ["not a blank page", "pas une page vide"],
    guide_sub: ["A practical path through GECKO Ops. This guide never creates or changes business records.", "Un parcours pratique de GECKO Ops. Ce guide ne crée ni ne modifie aucune donnée métier."],
    guide_help: ["Screen help", "Aide de l'écran"], guide_restart: ["Restart guided tour", "Recommencer la visite guidée"],
    guide_start: ["Start the guided tour", "Démarrer la visite guidée"], guide_resume: ["Resume the guided tour", "Reprendre la visite guidée"],
    guide_welcome: ["Welcome to GECKO Ops", "Bienvenue dans GECKO Ops"],
    guide_welcome_body: ["GECKO Ops connects sales, clients, projects, creative development, production, delivery and financial tracking for a small creative team.", "GECKO Ops relie les ventes, les clients, les projets, la création, la production, la livraison et le suivi financier d'une petite équipe créative."],
    guide_welcome_flow: ["A lead becomes a client, the client gets a project, the creative is approved, then it is shot, edited, delivered and paid.", "Un prospect devient client, le client a un projet, la création est validée, puis on tourne, on monte, on livre et on encaisse."],
    guide_welcome_empty: ["This workspace is empty. Add your own records as you test the workflow.", "Cet espace est vide. Ajoutez vos propres données pour tester le flux."],
    guide_welcome_existing: ["This browser still has {n} saved records. They were left untouched; review or clear them in Settings → Data before starting fresh.", "Ce navigateur contient encore {n} éléments enregistrés. Ils n'ont pas été modifiés ; vérifiez ou effacez-les dans Réglages → Données avant de repartir de zéro."],
    guide_welcome_clean: ["Review workspace data", "Vérifier les données"],
    guide_skip: ["Skip for now", "Ignorer pour l'instant"], guide_exit: ["Exit tour", "Quitter la visite"],
    guide_previous: ["Previous", "Précédent"], guide_next: ["Next", "Suivant"], guide_done: ["Finish tour", "Terminer"],
    guide_open: ["Open this area", "Ouvrir cette section"], guide_area_help: ["Walk me through this area", "Me guider dans cette section"],
    guide_progress: ["Step {n} of {total}", "Étape {n} sur {total}"], guide_complete: ["Tour complete. Restart it any time from Start here or the help menu.", "Visite terminée. Recommencez à tout moment depuis Commencer ici ou le menu d'aide."],
    tr_why: ["Why it matters", "Pourquoi c'est important"], tr_try: ["Try it: ", "À vous : "], tr_nice: ["Done. Nice.", "Fait. Bien joué."],
    tr_check: ["Quick check", "Petite vérification"], tr_right: ["Right.", "Exact."], tr_wrong: ["Not quite.", "Pas tout à fait."],
    tr_finish: ["Finish lesson", "Terminer la leçon"], tr_learned: ["{x}: lesson done", "{x} : leçon terminée"],
    tr_lessons: ["Learn each section", "Apprendre chaque section"], tr_lessons_sub: ["Short hands-on lessons. Each one points at the real screen, has you try the key moves and ends with a quick check.", "Des leçons courtes et pratiques. Chacune montre l'écran réel, vous fait essayer l'essentiel et se termine par une petite vérification."],
    tr_start_lesson: ["Start lesson", "Commencer"], tr_redo: ["Do again", "Refaire"], tr_done_on: ["Done", "Terminée"], tr_steps: ["{n} steps", "{n} étapes"],
    tr_click: ["Click {x} in the menu", "Cliquez sur {x} dans le menu"], tr_skip_step: ["Skip this step", "Passer cette étape"], tr_menu: ["Tap More, then {x}", "Touchez Plus, puis {x}"],
    tr_home_t: ["Home", "Accueil"], tr_home_b: ["Your day starts here: what needs you, your tasks, cash coming in and the next shoot.", "Votre journée commence ici : ce qui vous attend, vos tâches, l'argent attendu et le prochain tournage."],
    tr_search_t: ["Search everything", "Tout rechercher"], tr_search_b: ["Find any client, project, idea or invoice. Ctrl K (or ⌘K) opens it from any screen.", "Trouvez un client, un projet, une idée ou une facture. Ctrl K (ou ⌘K) l'ouvre depuis n'importe quel écran."],
    tr_new_t: ["New", "Nouveau"], tr_new_b: ["Create a lead, client, project, task or invoice from wherever you are.", "Créez un prospect, un client, un projet, une tâche ou une facture où que vous soyez."],
    tr_leads_t: ["Leads", "Prospects"], tr_leads_b: ["Every opportunity lives here, from the first message to a yes. When a lead signs, convert it into a client instead of typing it twice.", "Chaque opportunité vit ici, du premier message au oui. Quand un prospect signe, convertissez-le en client au lieu de tout ressaisir."],
    tr_clients_t: ["Clients", "Clients"], tr_clients_b: ["Each client has a workspace: projects, files, approvals, invoices and their own portal link.", "Chaque client a son espace : projets, fichiers, validations, factures et son propre lien de portail."],
    tr_projects_t: ["Projects", "Projets"], tr_projects_b: ["This is where the team works. Each project moves from prep to shoot to post. Open one to see its shoot plan, run order, edit lines and files.", "C'est ici que l'équipe travaille. Chaque projet passe de la préparation au tournage puis à la post-production. Ouvrez-en un pour voir le plan de tournage, l'ordre, les répliques et les fichiers."],
    tr_studio_t: ["Ideas and scripts", "Idées et scripts"], tr_studio_b: ["Write hooks and scripts here. Once approved, a script flows into its project's shoot plan.", "Écrivez accroches et scripts ici. Une fois validé, le script rejoint le plan de tournage du projet."],
    tr_calendar_t: ["Calendar", "Calendrier"], tr_calendar_b: ["Shoots, deadlines and meetings in one place.", "Tournages, échéances et rendez-vous au même endroit."],
    tr_finance_t: ["Finance", "Finances"], tr_finance_b: ["Quotes, invoices, payments, expenses and the cash book. Record what really happened; the numbers follow.", "Devis, factures, paiements, dépenses et livre de caisse. Enregistrez ce qui s'est vraiment passé ; les chiffres suivent."],
    tr_dashboard_t: ["CEO dashboard", "Tableau de bord"], tr_dashboard_b: ["The company at a glance: revenue, margin, cash and what to fix first.", "L'entreprise en un coup d'œil : chiffre d'affaires, marge, trésorerie et priorités."],
    tr_marketing_t: ["Marketing", "Marketing"], tr_marketing_b: ["Gecko's own content plan, ads and what is working.", "Le plan de contenu de Gecko, ses publicités et ce qui marche."],
    tr_team_t: ["Team", "Équipe"], tr_team_b: ["Who does what and their tasks. The owner also sees pay, history and performance here.", "Qui fait quoi et leurs tâches. Le responsable y voit aussi la rémunération, l'historique et la performance."],
    tr_help_t: ["You're set", "C'est parti"], tr_help_b: ["Your account menu has the guide and can restart this tour any time. Each screen also has a help button at the top.", "Le menu de votre compte contient le guide et relance cette visite à tout moment. Chaque écran a aussi un bouton d'aide en haut."],
    guide_orient_title: ["Workspace orientation", "Repères dans l'espace"],
    guide_orient_body: ["Use the navigation to move between work areas. Search (⌘/Ctrl+K) finds records and actions; the top-right Create button starts common records. Home shows the work relevant to your role.", "Utilisez la navigation pour passer d'un espace à l'autre. La recherche (⌘/Ctrl+K) trouve les données et actions ; le bouton Créer lance les actions courantes. Accueil affiche le travail utile à votre rôle."],
    guide_orient_action: ["Open Home and explore navigation, search and Create. Nothing is created by this guide.", "Ouvrez Accueil et repérez la navigation, la recherche et Créer. Ce guide ne crée rien."],
    guide_sales_title: ["Leads and clients", "Prospects et clients"],
    guide_sales_body: ["Track an opportunity in Sales pipeline through qualification and follow-up. Convert a won lead to a client instead of making a duplicate. Clients hold the relationship and contract context; meetings are tracked through lead activity and Calendar, not a separate meeting database.", "Suivez une opportunité dans le pipeline jusqu'à sa qualification et ses relances. Convertissez un prospect gagné en client au lieu de créer un doublon. Les clients regroupent la relation et le contrat ; les rendez-vous passent par l'activité du prospect et le calendrier, pas par une base distincte."],
    guide_sales_action: ["Start with a lead; create or convert a client when the relationship is ready.", "Commencez par un prospect ; créez ou convertissez un client quand la relation est établie."],
    guide_projects_title: ["Projects and status", "Projets et statuts"],
    guide_projects_body: ["A project belongs to a client and owns its creative plan, deliverables, production files, approval state, costs and results. Move its status as work advances; gates explain when a stage or final file is blocked.", "Un projet appartient à un client et regroupe son plan créatif, ses livrables, fichiers de production, validations, coûts et résultats. Faites avancer son statut ; les blocages indiquent pourquoi une étape ou un fichier final est indisponible."],
    guide_projects_action: ["Create a project only after the client and agreed scope are clear.", "Créez un projet lorsque le client et le périmètre convenu sont clairs."],
    guide_studio_title: ["Creative Studio", "Studio créatif"],
    guide_studio_body: ["Ideas remain editable drafts. Add the client, angle, objective, audience, concept, hook, format and at least one usable scene. Offer, objection, proof and CTA fields are required for the matching creative type.", "Les idées restent des brouillons modifiables. Ajoutez le client, l'angle, l'objectif, l'audience, le concept, l'accroche, le format et au moins une scène exploitable. Offre, objection, preuve et appel à l'action dépendent du type créatif."],
    guide_studio_action: ["Review readiness gaps before approving a revision.", "Vérifiez les éléments manquants avant d'approuver une révision."],
    guide_handoff_title: ["Approved creative handoff", "Transfert de la création validée"],
    guide_handoff_body: ["Approval captures an immutable brief, hook, script and structured-scene snapshot. Send the selected approved revision to its project; the project reel records the source idea and revision so later draft edits cannot change production material.", "La validation fige un instantané du brief, de l'accroche, du script et des scènes structurées. Envoyez la révision validée choisie au projet ; le reel conserve l'idée et la révision d'origine."],
    guide_handoff_action: ["Use the Studio handoff on an approved revision; repeat sends do not duplicate its reel.", "Transférez une révision approuvée depuis le Studio ; un nouvel envoi ne duplique pas son reel."],
    guide_production_title: ["Production and review", "Production et validation"],
    guide_production_body: ["The per-scene checklist is production tracking, separate from the approved creative snapshot. Editors move files through edit and review; the authorized reviewer approves or sends them back for revisions.", "La checklist par scène suit la production sans modifier l'instantané créatif approuvé. Les monteurs font avancer les fichiers vers la relecture ; le responsable autorisé valide ou renvoie en retouche."],
    guide_production_action: ["Track shoot scenes, then follow each file's editing and review status.", "Suivez les scènes du tournage puis le statut de montage et de relecture de chaque fichier."],
    guide_boards_title: ["Boards and visual planning", "Tableaux et planification visuelle"],
    guide_boards_body: ["Reuse a project's storyboard, shot list or moodboard to organize references and visual decisions. Link boards to the relevant idea, client or project; they complement rather than replace structured scenes.", "Réutilisez le storyboard, la liste de plans ou le moodboard du projet pour organiser références et choix visuels. Reliez le tableau à l'idée, au client ou au projet ; il complète les scènes structurées sans les remplacer."],
    guide_boards_action: ["Keep visual references with the work they support.", "Gardez les références visuelles avec le travail concerné."],
    guide_delivery_title: ["Client delivery", "Livraison client"],
    guide_delivery_body: ["Use Deliveries for approved previews, client approval and written change requests. Payment gates control access to final files; WhatsApp remains an optional communication route, not the record of approval.", "Utilisez Livraisons pour les aperçus approuvés, l'accord client et les demandes de retouche écrites. Le paiement contrôle l'accès aux fichiers finaux ; WhatsApp reste un canal complémentaire."],
    guide_delivery_action: ["Keep preview approval, change requests and final delivery status up to date.", "Tenez à jour l'accord sur les aperçus, les retouches et le statut de livraison finale."],
    guide_finance_title: ["Finance", "Finances"],
    guide_finance_body: ["Finance contains quotes, invoices, recorded payments and expenses. Project-linked expenses affect profitability; collected cash comes from invoice payments. Confirm local tax and fee rules with your accountant.", "Finances regroupe devis, factures, paiements enregistrés et dépenses. Les dépenses liées au projet influencent sa rentabilité ; l'encaissement vient des paiements de factures. Confirmez les règles fiscales avec votre comptable."],
    guide_finance_action: ["Record the source transaction; do not infer revenue or cash from a project stage.", "Enregistrez la transaction réelle ; ne déduisez pas chiffre d'affaires ou encaissement du statut d'un projet."],
    guide_reports_title: ["Reports and insights", "Rapports et analyses"],
    guide_reports_body: ["Reports and the CEO dashboard summarize data already entered. Hook results stay attached to project hooks; creative performance is observational, not proof that one change caused an outcome. Empty or partial history means metrics are incomplete.", "Rapports et Tableau de bord résument les données saisies. Les résultats restent associés aux accroches du projet ; une performance observée ne prouve pas qu'un changement en est la cause. Un historique vide ou incomplet donne des métriques partielles."],
    guide_reports_action: ["Enter measured results on the relevant project hook before comparing creative performance.", "Saisissez les résultats mesurés sur l'accroche du projet avant de comparer les créations."]
  });

  var STEPS = [
    { title: "guide_orient_title", body: "guide_orient_body", action: "guide_orient_action", view: "today" },
    { title: "guide_sales_title", body: "guide_sales_body", action: "guide_sales_action", view: "pipeline" },
    { title: "guide_projects_title", body: "guide_projects_body", action: "guide_projects_action", view: "projects" },
    { title: "guide_studio_title", body: "guide_studio_body", action: "guide_studio_action", view: "studio" },
    { title: "guide_handoff_title", body: "guide_handoff_body", action: "guide_handoff_action", view: "projects" },
    { title: "guide_production_title", body: "guide_production_body", action: "guide_production_action", view: "production" },
    { title: "guide_boards_title", body: "guide_boards_body", action: "guide_boards_action", view: "boards" },
    { title: "guide_delivery_title", body: "guide_delivery_body", action: "guide_delivery_action", view: "deliveries" },
    { title: "guide_finance_title", body: "guide_finance_body", action: "guide_finance_action", view: "finance" },
    { title: "guide_reports_title", body: "guide_reports_body", action: "guide_reports_action", view: "reports" }
  ];
  var STEP_VIEWS = {};
  STEPS.forEach(function (step, index) { if (STEP_VIEWS[step.view] == null) STEP_VIEWS[step.view] = index; });

  function readState() {
    var state = u.lsGet(KEY, null);
    return state && state.version === 1 ? state : null;
  }
  function saveState(state) { u.lsSet(KEY, Object.assign({ version: 1 }, state)); }
  function emptyWorkspace() {
    return !S.localRecordCount || S.localRecordCount() === 0;
  }
  function welcome() {
    var count = S.localRecordCount ? S.localRecordCount() : 0;
    var text = count ? t("guide_welcome_existing", { n: count }) : t("guide_welcome_empty");
    var foot = ui.btn(t("guide_skip"), "guide-skip", { cls: "ghost" });
    if (count && S.backend === "local") foot += ui.btn(t("guide_welcome_clean"), "guide-welcome-clean", { cls: "ghost" });
    foot += ui.btn(t("guide_start"), "guide-start", { cls: "primary" });
    ui.modal({
      title: t("guide_welcome"),
      body: '<p class="muted">' + esc(t("guide_welcome_body")) + "</p>" +
        '<p class="note strong" style="margin:0">' + esc(t("guide_welcome_flow")) + "</p>" +
        '<p class="small muted" style="margin:0">' + esc(text) + "</p>",
      foot: foot
    });
  }
  // ---------- interactive tour: spotlights the real screen and waits for the real click ----------
  var TOUR = [
    { id: "home", spot: "nav:today", title: "tr_home_t", body: "tr_home_b" },
    { id: "search", spot: ".topbar .srch", title: "tr_search_t", body: "tr_search_b" },
    { id: "new", spot: ".side-new .btn", title: "tr_new_t", body: "tr_new_b" },
    { id: "leads", go: "pipeline", title: "tr_leads_t", body: "tr_leads_b" },
    { id: "clients", go: "clients", title: "tr_clients_t", body: "tr_clients_b" },
    { id: "projects", go: "projects", title: "tr_projects_t", body: "tr_projects_b" },
    { id: "studio", go: "studio", title: "tr_studio_t", body: "tr_studio_b" },
    { id: "calendar", go: "calendar", title: "tr_calendar_t", body: "tr_calendar_b" },
    { id: "finance", go: "finance", title: "tr_finance_t", body: "tr_finance_b" },
    { id: "dashboard", go: "dashboard", title: "tr_dashboard_t", body: "tr_dashboard_b" },
    { id: "marketing", go: "marketing", title: "tr_marketing_t", body: "tr_marketing_b" },
    { id: "team", go: "team", title: "tr_team_t", body: "tr_team_b" },
    { id: "help", spot: ".me-card", title: "tr_help_t", body: "tr_help_b" }
  ];
  var live = null, tick = null, lastKey = "";

  var LEARN_KEY = "gecko-ops-learned-v1";
  function track(view) { return GK.guideTracks && GK.guideTracks[view]; }
  function learned() { var o = u.lsGet(LEARN_KEY, {}); return o && typeof o === "object" ? o : {}; }
  function markLearned(view) { var o = learned(); o[view] = u.today(); u.lsSet(LEARN_KEY, o); }
  /** Steps of what is running: the main tour (areas this viewer can open) or one section's lesson. */
  function steps() {
    var nav = ui.nav();
    if (live && live.track) {
      var tr = track(live.track);
      return tr ? tr.steps.filter(function (s) { return (!s.go || nav.indexOf(s.go) > -1) && (!s.when || s.when()); }) : [];
    }
    return TOUR.filter(function (s) { return !s.go || nav.indexOf(s.go) > -1; });
  }
  function shown(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  }
  function pick(list) {
    for (var i = 0; i < list.length; i++) {
      var els;
      try { els = document.querySelectorAll(list[i]); } catch (e) { continue; }
      for (var j = 0; j < els.length; j++) if (shown(els[j])) return els[j];
      // present but scrolled away: bring the first one into view
      if (els.length && els[0].getBoundingClientRect().height > 0 && els[0].scrollIntoView) { els[0].scrollIntoView({ block: "center", behavior: "smooth" }); return els[0]; }
    }
    return null;
  }
  /** The menu item for a view: sidebar, phone bar, or the phone's More button that opens the menu. */
  function navTarget(v) {
    return pick(['.side [data-a="nav"][data-v="' + v + '"]', '.bnav [data-a="nav"][data-v="' + v + '"]', '.bnav [data-a="drawer"]']);
  }
  function list(x) { return Array.isArray(x) ? x : String(x || "").split("|"); }
  function target(step, waiting) {
    if (waiting) return navTarget(step.go);
    if (step.try && !live.done && step.try.click) { var c = pick(list(step.try.click)); if (c) return c; }
    if (!step.spot) return step.go ? pick(["#page .head", "#page"]) : null;
    if (step.spot.indexOf("nav:") === 0) return navTarget(step.spot.slice(4));
    return pick(list(step.spot));
  }
  function tryDone(step) {
    if (!step.try || live.done) return !!live.done;
    if (step.try.until) { try { if (typeof step.try.until === "function" ? step.try.until() : pick(list(step.try.until))) live.done = true; } catch (e) {} }
    return !!live.done;
  }
  function layer() {
    var el = document.getElementById("tour");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tour";
    el.innerHTML = '<div class="tour-spot"></div><div class="tour-pop" role="dialog" aria-modal="false" aria-live="polite"></div>';
    document.body.appendChild(el);
    return el;
  }
  function popHTML(steps, i, waiting, viaMenu) {
    var step = steps[i], last = i === steps.length - 1, tr = live.track && track(live.track);
    var pending = !!step.try && !live.done, q = step.quiz, answered = q && live.answer != null;
    var h = '<div class="tp-top"><span class="tp-n">' + (tr ? esc(t(tr.title)) + " · " : "") + esc(t("guide_progress", { n: i + 1, total: steps.length })) + "</span>" +
      '<button type="button" class="ib sm" data-a="tour-exit" aria-label="' + esc(t("guide_exit")) + '">' + ui.icon("x", "sm") + "</button></div>";
    h += '<div class="tp-bar"><i style="width:' + Math.round((i + (waiting || pending || (q && !answered) ? 0.5 : 1)) / steps.length * 100) + '%"></i></div>';
    h += "<h3>" + esc(t(step.title)) + "</h3>";
    if (waiting) h += '<p class="tp-ask">' + ui.icon("arrow", "sm") + esc(t(viaMenu ? "tr_menu" : "tr_click", { x: t("nav_" + step.go) })) + "</p>";
    else {
      if (step.body) h += "<p>" + esc(t(step.body)) + "</p>";
      if (step.why) h += '<div class="tp-why"><span class="tp-lab">' + esc(t("tr_why")) + "</span>" + esc(t(step.why)) + "</div>";
      if (step.try) h += pending
        ? '<p class="tp-ask">' + ui.icon("arrow", "sm") + '<span><span class="tp-lab">' + esc(t("tr_try")) + "</span>" + esc(t(step.try.text)) + "</span></p>"
        : '<p class="tp-ok">' + ui.icon("check", "sm") + esc(t(step.try.done || "tr_nice")) + "</p>";
      if (q) {
        h += '<div class="tp-quiz"><b>' + esc(t(q.q)) + "</b>" +
          q.options.map(function (o, k) {
            var cls = answered ? (k === q.answer ? " tp-r" : k === live.answer ? " tp-w" : "") : "";
            return '<button type="button" class="tp-opt' + cls + '" data-a="tour-quiz" data-k="' + k + '"' + (answered ? " disabled" : "") + ">" + esc(t(o)) + "</button>";
          }).join("") + "</div>";
        if (answered) h += '<p class="' + (live.answer === q.answer ? "tp-ok" : "tp-no") + '">' + esc(t(live.answer === q.answer ? "tr_right" : "tr_wrong")) + " " + esc(t(q.explain)) + "</p>";
      }
    }
    var hold = waiting || pending || (q && !answered);
    h += '<div class="tp-row">' + (i > 0 ? ui.btn(t("guide_previous"), "tour-back", { cls: "ghost sm" }) : "<span></span>") +
      (hold ? '<button type="button" class="tp-skip" data-a="tour-next">' + esc(t("tr_skip_step")) + "</button>"
        : ui.btn(t(last ? (tr ? "tr_finish" : "guide_done") : "guide_next"), "tour-next", { cls: "primary sm" })) + "</div>";
    return h;
  }
  function place() {
    if (!live) return;
    var all = steps(), step = all[live.i];
    if (!step) return finish();
    var waiting = !!step.go && ui.state.view !== step.go;
    live.waiting = waiting;
    if (!waiting) tryDone(step);
    var root = layer(), spot = root.firstChild, pop = root.lastChild;
    var el = target(step, waiting), viaMenu = !!el && el.getAttribute("data-a") === "drawer";
    var key = live.track + "|" + live.i + "|" + waiting + "|" + viaMenu + "|" + live.done + "|" + live.answer + "|" + GK.i18n.lang();
    if (key !== lastKey) { pop.innerHTML = popHTML(all, live.i, waiting, viaMenu); lastKey = key; pop.classList.remove("tp-in"); void pop.offsetWidth; pop.classList.add("tp-in"); }
    root.classList.toggle("ask", waiting || (!!step.try && !live.done));
    var pad = 6, W = innerWidth, H = innerHeight;
    var pw = Math.min(step.quiz ? 380 : 340, W - 32), ph = pop.offsetHeight || 180, x, y;
    if (!el) {
      spot.style.cssText = "opacity:0";
      x = (W - pw) / 2; y = (H - ph) / 2;
    } else {
      var r = el.getBoundingClientRect();
      if (r.height > H * 0.6) r = { left: r.left, top: r.top, right: r.right, bottom: r.top + Math.min(r.height, 160), width: r.width, height: Math.min(r.height, 160) };
      spot.style.cssText = "opacity:1;left:" + (r.left - pad) + "px;top:" + (r.top - pad) + "px;width:" + (r.width + pad * 2) + "px;height:" + (r.height + pad * 2) + "px";
      if (W < 640) {   // phone: the card sits on the opposite half of the screen
        x = 16; y = r.top + r.height / 2 > H / 2 ? Math.max(16, r.top - ph - 18) : Math.min(H - ph - 16, r.bottom + 18);
      } else if (r.right + 24 + pw < W && r.width < W / 2) {
        x = r.right + 20; y = r.top + r.height / 2 - ph / 2;
      } else if (r.bottom + 20 + ph < H) {
        x = r.left; y = r.bottom + 20;
      } else {
        x = r.left; y = r.top - ph - 20;
      }
    }
    x = Math.max(16, Math.min(W - pw - 16, x)); y = Math.max(16, Math.min(H - ph - 16, y));
    pop.style.cssText = "width:" + pw + "px;left:" + x + "px;top:" + y + "px";
  }
  function go(i, view) {
    var tr = view !== undefined ? view : live && live.track;
    live = { i: Math.max(0, i), track: tr || null };
    var all = steps();
    if (live.i >= all.length) return finish();
    lastKey = "";
    var step = all[live.i];
    if (!live.track) saveState({ status: "active", step: live.i });
    if (ui.modalOpen()) ui.closeModal(true);
    if (GK.shell && GK.shell.closeAll) GK.shell.closeAll();
    if (live.track && ui.state.view !== live.track && !step.go) ui.go(live.track);
    if (step.params) { ui.go(step.params.view || live.track, step.params.set); }
    if (!live.track && !step.go && ui.state.view !== "today" && step.id === "home") ui.go("today");
    if (ui.state.drawer && !(step.go && ui.state.view !== step.go)) { ui.state.drawer = false; ui.render(true); }
    if (!tick) tick = setInterval(place, 120);
    place();
  }
  function close(status) {
    if (live && !live.track) saveState({ status: status, step: live.i });
    live = null; lastKey = "";
    if (tick) { clearInterval(tick); tick = null; }
    var el = document.getElementById("tour");
    if (el) { el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }
  }
  function finish() {
    var tr = live && live.track;
    if (tr) { markLearned(tr); close("complete"); ui.toast(t("tr_learned", { x: t(track(tr).title) })); if (ui.state.view === "guide") ui.render(true); }
    else { close("complete"); ui.toast(t("guide_complete")); }
  }
  /** Start the lesson for a section, or the main tour at that section. */
  function startAt(view) {
    if (track(view)) return go(0, view);
    var all = TOUR.filter(function (s) { return !s.go || ui.nav().indexOf(s.go) > -1; }), i = 0;
    all.forEach(function (s, k) { if (!i && (s.go === view)) i = k; });
    go(i, null);
  }
  function start(index) { go(index == null ? 0 : index, null); }
  function stop(status) { ui.closeModal(true); close(status); }

  if (typeof document !== "undefined" && document.addEventListener) {
    window.addEventListener("resize", place);
    // a lesson step that asks for a click completes when that real control is clicked
    document.addEventListener("click", function (ev) {
      if (!live || live.done) return;
      var step = steps()[live.i];
      if (!step || !step.try || !step.try.click || step.try.until) return;
      var hit = list(step.try.click).some(function (sel) { try { return ev.target.closest && ev.target.closest(sel); } catch (e) { return false; } });
      if (hit) setTimeout(function () { if (live) { live.done = true; place(); } }, 60);
    }, true);
    document.addEventListener("keydown", function (ev) {
      if (!live) return;
      if (ev.key === "Escape") { ev.stopPropagation(); close("dismissed"); }
      else if (ev.key === "ArrowRight" && !live.waiting && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) { go(live.i + 1); }
    }, true);
    if (!document.getElementById("gk-tour-css")) {
      var css = document.createElement("style");
      css.id = "gk-tour-css";
      css.textContent =
        "#tour{position:fixed;inset:0;z-index:9000;pointer-events:none}" +
        "#tour .tour-spot{position:fixed;border:2px solid var(--b-yellow,#f3df9e);border-radius:12px;outline:200vmax solid rgba(0,0,0,.4);transition:left .32s var(--ease),top .32s var(--ease),width .32s var(--ease),height .32s var(--ease),opacity .2s;pointer-events:none}" +
        "#tour .tour-spot::after{content:\"\";position:absolute;inset:-2px;border:2px solid var(--b-yellow,#f3df9e);opacity:0}" +
        "#tour.ask .tour-spot::after{animation:tourPulse 1.4s var(--ease) infinite}" +
        "@keyframes tourPulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}" +
        "#tour .tour-pop{position:fixed;pointer-events:auto;background:var(--s-solid);color:var(--tx);border:1.5px solid var(--b-ink);border-radius:16px;box-shadow:6px 6px 0 var(--b-pink,#f4c1c4);padding:16px 18px 14px;display:flex;flex-direction:column;gap:10px;transition:left .32s var(--ease),top .32s var(--ease)}" +
        "#tour .tour-pop.tp-in{animation:tourIn .28s var(--ease)}" +
        "@keyframes tourIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
        "#tour.out{opacity:0;transition:opacity .2s}" +
        "#tour .tp-top{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
        "#tour .tp-n{font-family:var(--f-type);font-size:11px;letter-spacing:0;text-transform:none;color:var(--tx-3)}" +
        "#tour .tp-bar{height:4px;background:var(--s3);border-radius:4px;overflow:hidden}#tour .tp-bar i{display:block;height:100%;background:var(--tx);transition:width .32s var(--ease)}" +
        "#tour h3{margin:0;font-size:18px;line-height:1.2}#tour p{margin:0;color:var(--tx-2);line-height:1.5;font-size:14px}" +
        "#tour .tp-ask{display:flex;gap:8px;align-items:center;color:var(--tx);font-weight:600}" +
        "#tour .tp-lab{display:block;font-family:var(--f-type);font-size:10.5px;letter-spacing:0;text-transform:none;color:var(--tx-3);margin-bottom:3px}" +
        "#tour .tp-why{border-radius:10px;background:var(--c-yellow-soft,rgba(243,223,158,.35));padding:8px 10px;font-size:13px;line-height:1.45;color:var(--tx)}" +
        "#tour .tp-ok,#tour .tp-no{display:flex;gap:6px;align-items:flex-start;font-size:13.5px}#tour .tp-ok{color:var(--tx)}#tour .tp-no{color:var(--tx-2)}" +
        "#tour .tp-quiz{display:flex;flex-direction:column;gap:6px}#tour .tp-quiz b{font-size:14px;line-height:1.35;margin-bottom:2px}" +
        "#tour .tp-opt{text-align:left;border-radius:10px;background:var(--s2);border:1px solid var(--line);padding:8px 10px;font:inherit;font-size:13.5px;color:var(--tx);cursor:pointer;transition:background .15s,border-color .15s}" +
        "#tour .tp-opt:hover:not([disabled]){border-color:var(--line-2)}#tour .tp-opt.tp-r{background:var(--c-yellow-soft,rgba(243,223,158,.5));border-color:var(--line-2)}#tour .tp-opt.tp-w{background:var(--c-pink-soft,rgba(244,193,196,.4));text-decoration:line-through}" +
        "#tour .tp-ask .tp-lab{display:inline;margin-right:4px}" +
        "#tour .tp-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px}" +
        "#tour .tp-skip{background:none;border:0;padding:4px 0;color:var(--tx-3);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}" +
        "@media (prefers-reduced-motion:reduce){#tour .tour-spot,#tour .tour-pop{transition:none;animation:none}}";
      document.head.appendChild(css);
    }
  }

  GK.guide = {
    steps: STEPS,
    hasHelp: function (view) { return !!track(view) || STEP_VIEWS[view] != null; },
    learned: learned,
    maybeWelcome: function () {
      if (!S.ready || ui.modalOpen()) return;
      var state = readState();
      if (state && state.status === "active") start(state.step);
      else if (!state) welcome();
    },
    open: start,
    startAt: startAt,
    place: place,
    showHelp: function (view) {
      var index = STEP_VIEWS[view];
      if (index == null) return;
      var step = STEPS[index];
      ui.modal({
        label: t("nav_" + view),
        title: t(step.title),
        body: '<p class="muted">' + esc(t(step.body)) + "</p>" +
          '<p class="note strong" style="margin:0">' + esc(t(step.action)) + "</p>",
        foot: ui.btn(t("guide_area_help"), "guide-help-start", { cls: "primary", data: { i: index } })
      });
    },
    emptyWorkspace: emptyWorkspace
  };

  GK.view("guide", {
    render: function () {
      var state = readState(), h = ui.head({ label: t("nav_guide"), title: t("guide_title"), accent: t("guide_accent"), sub: esc(t("guide_sub")) });
      var action = state && state.status === "active" ? "guide-resume" : "guide-start";
      h += '<section class="panel"><div class="panel-h"><h2 class="sec">' + esc(t("guide_welcome_flow")) + "</h2>" +
        ui.btn(t(state && state.status === "active" ? "guide_resume" : "guide_start"), action, { cls: "primary" }) + "</div>" +
        '<p class="small muted">' + esc(emptyWorkspace() ? t("guide_welcome_empty") : t("guide_welcome_existing", { n: S.localRecordCount ? S.localRecordCount() : 0 })) + "</p></section>";
      var nav = ui.nav(), done = learned(), order = (GK.guideTracks && GK.guideTracks._order) || [];
      var lessons = order.filter(function (v) { return track(v) && nav.indexOf(v) > -1; });
      if (lessons.length) {
        h += '<section class="stack" style="gap:12px"><div><h2 class="sec" style="margin:0">' + esc(t("tr_lessons")) + "</h2>" +
          '<p class="small muted" style="margin:4px 0 0">' + esc(t("tr_lessons_sub")) + "</p></div>";
        h += '<div class="grid2">' + lessons.map(function (v, k) {
          var tr = track(v), ok = !!done[v];
          return '<section class="card"><div class="card-h"><span class="lead"><span class="pill">' + (ok ? ui.icon("check", "sm") : k + 1) + "</span><h2>" + esc(t(tr.title)) + "</h2></span>" +
            ui.btn(t(ok ? "tr_redo" : "tr_start_lesson"), "guide-learn", { cls: (ok ? "ghost" : "primary") + " sm", data: { v: v } }) + "</div>" +
            '<p class="small muted">' + esc(t(tr.intro)) + "</p>" +
            '<p class="small muted" style="margin:0">' + esc(t("tr_steps", { n: tr.steps.length })) + (ok ? " · " + esc(t("tr_done_on")) + " " + esc(u.fmtDate ? u.fmtDate(done[v]) : done[v]) : "") + "</p></section>";
        }).join("") + "</div></section>";
      }
      return h;
    }
  });

  GK.act("guide-start", function () { start(0); });
  GK.act("guide-resume", function () { var state = readState(); start(state && state.status === "active" ? state.step : 0); });
  GK.act("guide-restart", function () { start(0); });
  GK.act("tour-next", function () { if (live) go(live.i + 1); });
  GK.act("tour-back", function () { if (live) go(live.i - 1); });
  GK.act("tour-exit", function () { close("dismissed"); });
  GK.act("tour-quiz", function (el) { if (live && live.answer == null) { live.answer = +el.dataset.k; place(); } });
  GK.act("guide-skip", function () { stop("skipped"); });
  GK.act("guide-open-area", function (el) { ui.go(el.dataset.v); });
  GK.act("guide-step", function (el) { startAt(STEPS[+el.dataset.i].view); });
  GK.act("guide-help", function (el) { if (track(el.dataset.v)) startAt(el.dataset.v); else GK.guide.showHelp(el.dataset.v); });
  GK.act("guide-learn", function (el) { startAt(el.dataset.v); });
  GK.act("guide-help-start", function (el) { ui.closeModal(true); startAt(STEPS[+el.dataset.i].view); });
  GK.act("guide-welcome-clean", function () {
    ui.closeModal(true);
    ui.go("settings", { tab: "data" });
  });
})(window.GK);
