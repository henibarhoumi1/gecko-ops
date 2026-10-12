/* GECKO Ops · words. English first, French toggle.
   Modules add their own words with GK.i18n.add({key:["English","Français"]}).
   Trovical (the italic accent face) breaks ç and œ: keep French accent words free of them. */
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
    app_name: ["GECKO Ops", "GECKO Ops"],
    nav_today: ["Home", "Accueil"], nav_pipeline: ["Pipeline", "Prospection"], nav_clients: ["Clients", "Clients"],
    nav_projects: ["Projects", "Projets"], nav_production: ["Production", "Production"], nav_deliveries: ["Deliveries", "Livraisons"],
    nav_reports: ["What won", "Ce qui gagne"], nav_finance: ["Money", "Argent"], nav_portal: ["Client pages", "Pages client"],
    nav_dashboard: ["Dashboard", "Tableau de bord"], nav_studio: ["Ideas", "Idées"], nav_boards: ["Whiteboards", "Tableaux"], nav_team: ["Team", "Équipe"], nav_settings: ["Settings", "Réglages"],
    nav_tasks: ["Tasks", "Tâches"], nav_calendar: ["Calendar", "Calendrier"], nav_inbox: ["Inbox", "Messages"], nav_activity: ["Activity", "Activité"],
    grp_main: ["Main", "Principal"], grp_work: ["Work", "Travail"], grp_studio: ["Studio", "Studio"], grp_money: ["Money", "Argent"], grp_clients: ["Clients", "Clients"], grp_team: ["Team", "Équipe"],
    sh_menu: ["Menu", "Menu"], sh_more: ["More", "Plus"], sh_expand: ["Expand the menu", "Déplier le menu"], sh_collapse: ["Collapse the menu", "Replier le menu"],
    undo: ["Undo", "Annuler"],
    working_as: ["Working as", "Connecté en tant que"], theme: ["Theme", "Thème"], language: ["Language", "Langue"],
    save: ["Save", "Enregistrer"], cancel: ["Cancel", "Annuler"], del: ["Delete", "Supprimer"], add: ["Add", "Ajouter"], edit: ["Edit", "Modifier"],
    close: ["Close", "Fermer"], open: ["Open", "Ouvrir"], back: ["Back", "Retour"], yes_do_it: ["Yes, do it", "Oui, valider"], copy: ["Copy", "Copier"],
    copied: ["Copied", "Copié"], saved: ["Saved", "Enregistré"], none: ["Nothing here yet.", "Rien pour l'instant."], all: ["All", "Tous"],
    required: ["Fill this in first.", "Remplissez ce champ d'abord."], search: ["Search", "Rechercher"],
    // modes
    mode_demo: ["Sample data", "Données d'exemple"], mode_live: ["Live", "En direct"],
    demo_banner: ["You're looking at sample data. Nothing here is a real client.", "Ce sont des données d'exemple. Aucun client réel ici."],
    start_live: ["Start for real", "Démarrer pour de vrai"], back_live: ["Back to live data", "Revenir aux vraies données"],
    view_demo: ["View sample data", "Voir les données d'exemple"],
    start_live_q: ["Start using GECKO Ops for real?", "Utiliser GECKO Ops pour de vrai ?"],
    start_live_shared: ["You'll get an empty workspace shared with everyone you give access to this page. The sample data stays available from Settings.", "Vous obtenez un espace vide, partagé avec toutes les personnes qui ont accès à cette page. Les données d'exemple restent disponibles dans Réglages."],
    start_live_local: ["You'll get an empty workspace saved in this browser only. Sharing with the team comes when this page is shared or hosted.", "Vous obtenez un espace vide, enregistré dans ce navigateur seulement. Le partage avec l'équipe vient quand la page est partagée ou hébergée."],
    shared_note: ["Shared with the team", "Partagé avec l'équipe"], local_note: ["Saved in this browser", "Enregistré dans ce navigateur"],
    read_only: ["You can view this page but not change it. Ask Heni for Contributor access.", "Vous pouvez consulter cette page mais pas la modifier. Demandez à Heni un accès Contributeur."],
    write_failed: ["That change wasn't saved. Check your connection and try again.", "Cette modification n'a pas été enregistrée. Vérifiez la connexion et réessayez."],
    quota_full: ["The shared database is full. Delete old messages or tasks, then try again.", "La base partagée est pleine. Supprimez d'anciens messages ou tâches, puis réessayez."],
    join_title: ["Who are you on the team?", "Qui êtes-vous dans l'équipe ?"],
    join_body: ["Pick your role once. It decides what you see first.", "Choisissez votre rôle une fois. Il décide de ce que vous voyez en premier."],
    your_name: ["Your name", "Votre nom"], your_role: ["Your role", "Votre rôle"], join: ["Join", "Rejoindre"],
    // roles
    role_founder: ["Founder · creative director", "Fondateur · directeur créatif"], role_sales: ["Sales & outreach", "Ventes & prospection"],
    role_editor: ["Freelance editor", "Monteur freelance"], role_assistant: ["Freelance assistant", "Assistant freelance"],
    // project stages
    st_onboard: ["Onboarding", "Démarrage"], st_plan: ["Creative plan", "Plan créatif"], st_shoot: ["Shoot", "Tournage"], st_edit: ["Editing", "Montage"],
    st_delivered: ["Delivered", "Livré"], st_testing: ["Testing", "En test"], st_report: ["Report", "Rapport"], st_done: ["Closed", "Clôturé"],
    // lead stages
    ls_dm: ["DM sent", "DM envoyé"], ls_replied: ["Replied", "A répondu"], ls_call: ["Call booked", "Appel prévu"], ls_proposal: ["Proposal sent", "Proposition envoyée"],
    ls_won: ["Won", "Gagné"], ls_lost: ["Lost", "Perdu"],
    // file statuses
    s_todo: ["To do", "À faire"], s_edit: ["Editing", "Montage"], s_review: ["Internal review", "Relecture"], s_approved: ["Approved", "Validé"], s_revise: ["Changes asked", "Retouches"],
    // invoice statuses
    inv_draft: ["Draft", "Brouillon"], inv_issued: ["Issued", "Émise"], inv_partial: ["Part paid", "Payée en partie"], inv_paid: ["Paid", "Payée"],
    inv_overdue: ["Overdue", "En retard"], inv_credited: ["Credited", "Annulée par avoir"], inv_credit: ["Credit note", "Avoir"],
    k_deposit: ["Deposit 50%", "Acompte 50 %"], k_balance: ["Balance 50%", "Solde 50 %"], k_month: ["Monthly", "Mensuel"], k_extra: ["Extra", "Extra"], k_credit: ["Credit note", "Avoir"],
    // gates
    gate_shoot: ["No shoot until the plan is approved and paid.", "Pas de tournage avant validation du plan et paiement."],
    gate_files: ["No files until the balance is paid.", "Pas de fichiers avant le paiement du solde."],
    gate_mf: ["No matricule fiscal (tax ID) yet: invoices can't be issued.", "Pas encore de matricule fiscal : impossible d'émettre une facture."],
    blocked: ["Blocked", "Bloqué"], no_discount: ["Discounts become extra reels, never a lower price.", "Les remises deviennent des reels en plus, jamais un prix plus bas."],
    per_month: ["/ month", "/ mois"], sample_tag: ["Sample", "Exemple"],
    orders_week: ["orders / week", "commandes / semaine"],
    est_shoot_half: ["Heni shoot (half day)", "Tournage Heni (demi-journée)"], est_shoot_day: ["Heni shoot day", "Journée de tournage Heni"],
    est_gear: ["Gear rental", "Location de matériel"], est_assistant: ["Assistant", "Assistant"], est_transport: ["Transport and small buys", "Transport et petits achats"],
    est_edits: ["Reel edits ({n} × {r})", "Montage des reels ({n} × {r})"], est_recuts: ["Hook re-cuts ({n} × {r})", "Variantes d'accroche ({n} × {r})"],
    est_carousels: ["Carousels ({n} × {r})", "Carrousels ({n} × {r})"], est_report: ["Monthly report", "Rapport mensuel"]
  });
})(window.GK);
