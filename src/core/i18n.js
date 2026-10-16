/* Gecko Ops · words. English first, French toggle.
   Modules add their own words with GK.i18n.add({key:["English","Français"]}). */
(function (GK) {
  "use strict";
  var dict = {};
  var LANG_KEY = "gecko-ops-lang";
  var lang = GK.u.lsGet(LANG_KEY, "en") === "fr" ? "fr" : "en";
  var I = {
    add: function (obj) { for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) dict[k] = obj[k]; } },
    has: function (k) { return Object.prototype.hasOwnProperty.call(dict, k); },
    lang: function () { return lang; },
    setLang: function (l) { lang = l === "fr" ? "fr" : "en"; GK.u.lsSet(LANG_KEY, lang); },
    /** t("key", {n:3}) -> replaces {n}. Missing keys render the key itself so they are easy to spot. */
    t: function (k, vars) {
      var e = dict[k];
      var s = e ? (e[lang === "fr" ? 1 : 0] != null ? e[lang === "fr" ? 1 : 0] : e[0]) : k;
      if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, v) { return vars[v] != null ? vars[v] : m; });
      return s;
    },
    missing: function (keys) { return keys.filter(function (k) { return !dict[k]; }); }
  };
  GK.i18n = I;
  GK.t = I.t;

  /* core words used by the shell, model and shared components */
  I.add({
    app_name: ["Gecko Ops", "Gecko Ops"],
    nav_today: ["Home", "Accueil"], nav_pipeline: ["Sales pipeline", "Ventes"], nav_clients: ["Clients", "Clients"],
    nav_projects: ["Projects", "Projets"], nav_production: ["Shoots and edits", "Tournages et montage"], nav_deliveries: ["Deliveries", "Livraisons"],
    nav_reports: ["Ad results", "Résultats pubs"], nav_finance: ["Money", "Argent"], nav_portal: ["Client pages", "Pages client"],
    nav_dashboard: ["Numbers", "Chiffres"], nav_studio: ["Ideas and scripts", "Idées et scripts"], nav_boards: ["Whiteboards", "Tableaux"], nav_team: ["Team", "Équipe"], nav_settings: ["Settings", "Réglages"],
    nav_tasks: ["Tasks", "Tâches"], nav_calendar: ["Calendar", "Calendrier"], nav_inbox: ["Inbox", "Messages"], nav_activity: ["Activity", "Activité"], nav_guide: ["Start here", "Commencer ici"], nav_docs: ["Docs", "Docs"],
    grp_main: ["Main", "Principal"], grp_sell: ["Sell", "Vendre"], grp_make: ["Make", "Produire"], grp_work: ["Work", "Travail"], grp_studio: ["Studio", "Studio"], grp_money: ["Money", "Argent"], grp_clients: ["Clients", "Clients"], grp_team: ["Team", "Équipe"],
    sh_menu: ["Menu", "Menu"], sh_more: ["More", "Plus"], sh_expand: ["Expand the menu", "Déplier le menu"], sh_collapse: ["Collapse the menu", "Replier le menu"],
    undo: ["Undo", "Annuler"],
    working_as: ["Working as", "Connecté en tant que"], theme: ["Theme", "Thème"], language: ["Language", "Langue"],
    save: ["Save", "Enregistrer"], cancel: ["Cancel", "Annuler"], del: ["Delete", "Supprimer"], add: ["Add", "Ajouter"], edit: ["Edit", "Modifier"],
    close: ["Close", "Fermer"], open: ["Open", "Ouvrir"], back: ["Back", "Retour"], yes_do_it: ["Yes, do it", "Oui, valider"], copy: ["Copy", "Copier"],
    copied: ["Copied", "Copié"], saved: ["Saved", "Enregistré"], none: ["Nothing here yet.", "Rien pour l'instant."], all: ["All", "Tous"],
    required: ["Fill this in first.", "Remplissez ce champ d'abord."], search: ["Search", "Rechercher"],
    // modes
    mode_demo: ["Local workspace", "Espace de travail local"], mode_live: ["Live", "En direct"],
    demo_banner: ["Workspace records are stored in this browser only. No sample records are loaded.", "Les données de l'espace sont enregistrées dans ce navigateur. Aucune donnée d'exemple n'est chargée."],
    start_live: ["Start for real", "Démarrer pour de vrai"], back_live: ["Back to live data", "Revenir aux vraies données"],
    view_demo: ["Use local workspace", "Utiliser l'espace local"],
    start_live_q: ["Start using GECKO Ops for real?", "Utiliser GECKO Ops pour de vrai ?"],
    start_live_shared: ["You'll get an empty workspace shared with everyone you give access to this page. Existing local records remain in this browser.", "Vous obtenez un espace vide, partagé avec toutes les personnes qui ont accès à cette page. Les données locales existantes restent dans ce navigateur."],
    start_live_local: ["You'll get an empty workspace saved in this browser only. Sharing with the team comes when this page is shared or hosted.", "Vous obtenez un espace vide, enregistré dans ce navigateur seulement. Le partage avec l'équipe vient quand la page est partagée ou hébergée."],
    shared_note: ["Shared with the team", "Partagé avec l'équipe"], local_note: ["Saved in this browser", "Enregistré dans ce navigateur"],
    read_only: ["You can view this page but not change it. Ask Heni for Contributor access.", "Vous pouvez consulter cette page mais pas la modifier. Demandez à Heni un accès Contributeur."],
    write_failed: ["That change wasn't saved. Check your connection and try again.", "Cette modification n'a pas été enregistrée. Vérifiez la connexion et réessayez."],
    quota_full: ["The shared database is full. Delete old messages or tasks, then try again.", "La base partagée est pleine. Supprimez d'anciens messages ou tâches, puis réessayez."],
    join_title: ["Who are you on the team?", "Qui êtes-vous dans l'équipe ?"],
    join_body: ["Pick your role once. It decides what you see first.", "Choisissez votre rôle une fois. Il décide de ce que vous voyez en premier."],
    your_name: ["Your name", "Votre nom"], your_role: ["Your role", "Votre rôle"], join: ["Join", "Rejoindre"],
    // roles
    role_founder: ["Founder · creative director", "Fondateur · directeur créatif"], role_sales: ["Client Lead", "Responsable clients"],
    role_editor: ["Freelance editor", "Monteur freelance"], role_assistant: ["Freelance assistant", "Assistant freelance"],
    // project stages (crm-pipeline.md, after won)
    st_onboarding: ["Onboarding", "Démarrage"], st_scripting: ["Scripting", "Scripts"], st_pre_production: ["Pre-production", "Préproduction"], st_shoot: ["Shoot", "Tournage"],
    st_editing: ["Editing", "Montage"], st_client_review: ["Client review", "Revue client"], st_revisions: ["Revisions", "Retouches"], st_delivered: ["Delivered", "Livré"],
    st_paid: ["Paid", "Payé"], st_retention: ["Next offer", "Offre suivante"],
    // lead stages (crm-pipeline.md)
    ls_prospect: ["Prospect", "Prospect"], ls_contacted: ["Contacted", "Contacté"], ls_conversation: ["In conversation", "En discussion"], ls_meeting_booked: ["Meeting booked", "Rendez-vous fixé"],
    ls_qualified: ["Qualified", "Qualifié"], ls_proposal_sent: ["Proposal sent", "Proposition envoyée"], ls_negotiation: ["Negotiation", "Négociation"], ls_accepted: ["Offer accepted", "Offre acceptée"],
    ls_signed: ["Signed", "Signé"], ls_won: ["Won: deposit paid", "Gagné : acompte payé"], ls_lost: ["Lost", "Perdu"], ls_nurture: ["Later", "Plus tard"],
    // default next action when a lead enters a stage
    nx_prospect: ["Send the first message", "Envoyer le premier message"], nx_contacted: ["Follow up", "Relancer"], nx_conversation: ["Book a call or meeting", "Fixer un appel ou un rendez-vous"],
    nx_meeting_booked: ["Hold the meeting, ask the 4 questions", "Faire le rendez-vous, poser les 4 questions"], nx_qualified: ["Send the proposal", "Envoyer la proposition"],
    nx_proposal_sent: ["Check they received the proposal", "Vérifier qu'ils ont reçu la proposition"], nx_negotiation: ["Answer the objection with a revised offer", "Répondre à l'objection avec une offre revue"],
    nx_accepted: ["Get the quote signed", "Faire signer le devis"], nx_signed: ["Collect the deposit", "Encaisser l'acompte"], nx_won: ["", ""], nx_lost: ["Recontact", "Recontacter"], nx_nurture: ["Recontact", "Recontacter"],
    // qualifier and ideal client score
    q_need: ["Need: posts weekly (or wants to) and unhappy with results", "Besoin : publie chaque semaine (ou veut) et n'est pas satisfait"],
    q_budget: ["Budget: 1,000 TND test, 2,500 TND a month after", "Budget : test à 1 000 TND, puis 2 500 TND par mois"],
    q_decision: ["Decision: the person on the call decides and pays", "Décision : la personne au rendez-vous décide et paie"],
    q_timing: ["Timing: can shoot within 30 days", "Délai : peut tourner sous 30 jours"],
    fit_active: ["Posted on Instagram or TikTok in the last 30 days", "A publié sur Instagram ou TikTok ces 30 derniers jours"],
    fit_weak_content: ["Content looks weak or inconsistent", "Contenu faible ou irrégulier"],
    fit_spending_power: ["Spending power: runs Meta ads, good location or 5,000+ followers", "Moyens : pubs Meta, bon emplacement ou 5 000+ abonnés"],
    fit_priority_sector: ["Sector on the priority list", "Secteur prioritaire"],
    fit_decision_maker: ["Decision maker reachable", "Décideur joignable"],
    // file statuses
    s_todo: ["To do", "À faire"], s_edit: ["Editing", "Montage"], s_review: ["Internal review", "Relecture"], s_approved: ["Approved", "Validé"], s_revise: ["Changes asked", "Retouches"],
    // invoice statuses
    inv_draft: ["Draft", "Brouillon"], inv_issued: ["Issued", "Émise"], inv_partial: ["Part paid", "Payée en partie"], inv_paid: ["Paid", "Payée"],
    inv_overdue: ["Overdue", "En retard"], inv_credited: ["Credited", "Annulée par avoir"], inv_credit: ["Credit note", "Avoir"],
    k_deposit: ["Deposit 50%", "Acompte 50 %"], k_balance: ["Balance 50%", "Solde 50 %"], k_month: ["Monthly", "Mensuel"], k_extra: ["Extra", "Extra"], k_credit: ["Credit note", "Avoir"],
    // gates
    gate_shoot: ["No shoot until the scripts are approved and the deposit is paid.", "Pas de tournage avant validation des scripts et paiement de l'acompte."],
    gate_files: ["No final files until the balance is paid.", "Pas de fichiers finaux avant le paiement du solde."],
    gate_paid: ["Not paid in full yet.", "Pas encore payé en entier."],
    gate_mf: ["No matricule fiscal (tax ID) yet: invoices can't be issued.", "Pas encore de matricule fiscal : impossible d'émettre une facture."],
    blocked: ["Blocked", "Bloqué"], no_discount: ["Discounts are extra pieces or the test credit, never a lower price.", "Les remises sont des pièces en plus ou le crédit du test, jamais un prix plus bas."],
    launch_price: ["Launch price", "Prix de lancement"], standard_price: ["Standard price", "Prix standard"],
    per_month: ["/ month", "/ mois"], sample_tag: ["Local", "Local"],
    orders_week: ["orders / week", "commandes / semaine"],
    est_owner_days: ["Heni, director and camera ({n} day × {r})", "Heni, réalisation et image ({n} j × {r})"],
    est_owner_project: ["Heni, director and camera (project)", "Heni, réalisation et image (projet)"],
    est_owner_edit: ["Heni, editing ({n} reels)", "Heni, montage ({n} reels)"],
    est_camera: ["Camera rental ({n} day × {r})", "Location caméra ({n} j × {r})"], est_transport: ["Transport ({n} day × {r})", "Transport ({n} j × {r})"],
    est_food: ["Food and water on set ({n} day × {r})", "Repas sur le tournage ({n} j × {r})"], est_assistant: ["Assistant ({n} day × {r})", "Assistant ({n} j × {r})"]
  });
})(window.GK);
