/* GECKO Ops · first-run guide and contextual help. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, S = GK.store, esc = u.esc;
  var KEY = "gecko-ops-onboarding-v1", stepIndex = 0;

  GK.i18n.add({
    guide_title: ["Start with the workflow", "Commencer par le flux de travail"],
    guide_accent: ["not a blank page", "pas une page vide"],
    guide_sub: ["A practical path through GECKO Ops. This guide never creates or changes business records.", "Un parcours pratique de GECKO Ops. Ce guide ne crée ni ne modifie aucune donnée métier."],
    guide_help: ["Screen help", "Aide de l'écran"], guide_restart: ["Restart guided tour", "Recommencer la visite guidée"],
    guide_start: ["Start the guided tour", "Démarrer la visite guidée"], guide_resume: ["Resume the guided tour", "Reprendre la visite guidée"],
    guide_welcome: ["Welcome to GECKO Ops", "Bienvenue dans GECKO Ops"],
    guide_welcome_body: ["GECKO Ops connects sales, clients, projects, creative development, production, delivery and financial tracking for a small creative team.", "GECKO Ops relie les ventes, les clients, les projets, la création, la production, la livraison et le suivi financier d'une petite équipe créative."],
    guide_welcome_flow: ["Opportunity → client → project → approved creative → production → delivery → finance and results.", "Opportunité → client → projet → création validée → production → livraison → finances et résultats."],
    guide_welcome_empty: ["This workspace is empty. Add your own records as you test the workflow.", "Cet espace est vide. Ajoutez vos propres données pour tester le flux."],
    guide_welcome_existing: ["This browser still has {n} saved records. They were left untouched; review or clear them in Settings → Data before starting fresh.", "Ce navigateur contient encore {n} éléments enregistrés. Ils n'ont pas été modifiés ; vérifiez ou effacez-les dans Réglages → Données avant de repartir de zéro."],
    guide_welcome_clean: ["Review workspace data", "Vérifier les données"],
    guide_skip: ["Skip for now", "Ignorer pour l'instant"], guide_exit: ["Exit tour", "Quitter la visite"],
    guide_previous: ["Previous", "Précédent"], guide_next: ["Next", "Suivant"], guide_done: ["Finish tour", "Terminer"],
    guide_open: ["Open this area", "Ouvrir cette section"], guide_area_help: ["Walk me through this area", "Me guider dans cette section"],
    guide_progress: ["Step {n} of {total}", "Étape {n} sur {total}"], guide_complete: ["Tour complete. Restart it any time from Start here or the help menu.", "Visite terminée. Recommencez à tout moment depuis Commencer ici ou le menu d'aide."],
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
    guide_reports_body: ["Reports and Numbers summarize data already entered. Hook results stay attached to project hooks; creative performance is observational, not proof that one change caused an outcome. Empty or partial history means metrics are incomplete.", "Rapports et Chiffres résument les données saisies. Les résultats restent associés aux accroches du projet ; une performance observée ne prouve pas qu'un changement en est la cause. Un historique vide ou incomplet donne des métriques partielles."],
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
  function tour(index) {
    stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    var step = STEPS[stepIndex];
    saveState({ status: "active", step: stepIndex });
    if (ui.state.view !== step.view) ui.go(step.view);
    var foot = "";
    if (stepIndex > 0) foot += ui.btn(t("guide_previous"), "guide-previous", { cls: "ghost" });
    foot += ui.btn(t("guide_skip"), "guide-skip", { cls: "ghost" });
    foot += ui.btn(t("guide_exit"), "guide-exit", { cls: "ghost" });
    foot += ui.btn(t(stepIndex === STEPS.length - 1 ? "guide_done" : "guide_next"), "guide-next", { cls: "primary" });
    ui.modal({
      label: t("guide_progress", { n: stepIndex + 1, total: STEPS.length }),
      title: t(step.title),
      body: '<p class="muted">' + esc(t(step.body)) + "</p>" +
        '<p class="note strong" style="margin:0">' + esc(t(step.action)) + "</p>" +
        '<div class="row">' + ui.btn(t("guide_open"), "guide-open-area", { cls: "ghost", data: { v: step.view } }) +
        (step.view === "reports" ? ui.btn(t("nav_dashboard"), "guide-open-area", { cls: "ghost", data: { v: "dashboard" } }) : "") + "</div>",
      foot: foot
    });
  }
  function start(index) {
    tour(index == null ? 0 : index);
  }
  function stop(status) {
    saveState({ status: status, step: stepIndex });
    ui.closeModal(true);
  }

  GK.guide = {
    steps: STEPS,
    hasHelp: function (view) { return STEP_VIEWS[view] != null; },
    maybeWelcome: function () {
      if (!S.ready || ui.modalOpen()) return;
      if (S.backend !== "local") return;
      var state = readState();
      if (state && state.status === "active") start(state.step);
      else if (!state) welcome();
    },
    open: start,
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
      h += '<div class="grid2">' + STEPS.map(function (step, index) {
        return '<section class="card"><div class="card-h"><span class="lead"><span class="pill">' + (index + 1) + "</span><h2>" + esc(t(step.title)) + "</h2></span>" +
          ui.btn(t("guide_open"), "guide-step", { cls: "ghost sm", data: { i: index } }) + "</div><p class=\"small muted\">" + esc(t(step.action)) + "</p></section>";
      }).join("") + "</div>";
      return h;
    }
  });

  GK.act("guide-start", function () { start(0); });
  GK.act("guide-resume", function () { var state = readState(); start(state && state.status === "active" ? state.step : 0); });
  GK.act("guide-restart", function () { start(0); });
  GK.act("guide-next", function () {
    if (stepIndex >= STEPS.length - 1) {
      saveState({ status: "complete", step: STEPS.length - 1 });
      ui.closeModal(true); ui.toast(t("guide_complete"));
      return;
    }
    tour(stepIndex + 1);
  });
  GK.act("guide-previous", function () { if (stepIndex > 0) tour(stepIndex - 1); });
  GK.act("guide-skip", function () { stop("skipped"); });
  GK.act("guide-exit", function () { stop("dismissed"); });
  GK.act("guide-open-area", function (el) { ui.go(el.dataset.v); });
  GK.act("guide-step", function (el) { start(+el.dataset.i); });
  GK.act("guide-help", function (el) { GK.guide.showHelp(el.dataset.v); });
  GK.act("guide-help-start", function (el) { start(+el.dataset.i); });
  GK.act("guide-welcome-clean", function () {
    ui.closeModal(true);
    ui.go("settings", { tab: "data" });
  });
})(window.GK);
