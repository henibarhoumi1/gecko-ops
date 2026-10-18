/* GECKO Ops · section lessons: daily work and sales (Home, Tasks, Calendar, Leads, Clients, Team).
   Each lesson walks the real screen: it points at real controls, asks for safe clicks only (tabs, filters, view toggles)
   and ends with one question. Text is written as [English, French] pairs and registered as ln_<view>_* i18n keys. */
(function (GK) {
  "use strict";
  var S = GK.store, m = GK.m, ui = GK.ui, u = GK.u;
  var T = GK.guideTracks = GK.guideTracks || {};
  T._order = T._order || [];

  /** Register a lesson: pairs become i18n keys ln_<view>_<n>_<field>; steps keep their selectors and guards. */
  function lesson(view, title, intro, defs) {
    var dict = {}, steps = [];
    dict["ln_" + view + "_t"] = title;
    dict["ln_" + view + "_i"] = intro;
    defs.forEach(function (d, n) {
      var p = "ln_" + view + "_" + (n + 1) + "_", s = {};
      function key(f, v) { dict[p + f] = v; return p + f; }
      Object.keys(d).forEach(function (k) {
        if (k === "title" || k === "body" || k === "why") s[k] = key(k, d[k]);
        else if (k === "try") {
          s.try = { text: key("try", d.try.text), click: d.try.click };
          if (d.try.until) s.try.until = d.try.until;
          if (d.try.done) s.try.done = key("done", d.try.done);
        } else if (k === "quiz") {
          s.quiz = { q: key("q", d.quiz.q), options: d.quiz.options.map(function (o, i) { return key("o" + i, o); }), answer: d.quiz.answer, explain: key("x", d.quiz.explain) };
        } else s[k] = d[k];
      });
      steps.push(s);
    });
    GK.i18n.add(dict);
    T[view] = { title: "ln_" + view + "_t", intro: "ln_" + view + "_i", steps: steps };
  }

  function founder() { return m.isFounder(); }
  function hasLeads() { return S.all("leads").some(m.isOpen); }
  function canLeads() { return hasLeads() && m.can("leads"); }
  function hasTeam() { return S.all("team").length > 0; }
  function hasClients() { return S.all("clients").length > 0; }
  function hasShoots() {
    var td = u.today();
    return S.all("projects").some(function (p) { return p.stage !== "retention" && p.shootDate && p.shootDate >= td; });
  }

  // ---------------------------------------------------------------- Home
  lesson("today", ["Home", "Accueil"], ["Your day on one screen: what needs you, what is due, what is shooting.", "Votre journée sur un seul écran : ce qui vous attend, ce qui est dû, ce qui se tourne."], [
    { title: ["Home is your morning screen", "L'accueil, c'est votre écran du matin"],
      body: ["Open it first, every day. It shows only what concerns you, so you do not have to hunt through the menu.", "Ouvrez-le en premier chaque jour. Il n'affiche que ce qui vous concerne, sans fouiller le menu."],
      why: ["Each role sees a different Home. Founder, sales, editor and production each get their own list.", "Chaque rôle a son accueil. Fondateur, commercial, monteur et production ont chacun leur liste."],
      spot: "#page .head" },
    { title: ["The list that needs you", "La liste qui vous attend"],
      body: ["This is the most important block. Each line says what is waiting and gives one button to deal with it.", "C'est le bloc le plus important. Chaque ligne dit ce qui attend et donne un bouton pour s'en occuper."],
      why: ["If this list is empty, nothing is blocked on you. Clear it before you start new work.", "Si cette liste est vide, rien n'est bloqué par vous. Videz-la avant de lancer du nouveau travail."],
      spot: "[data-tour=\"td-need\"]" },
    { title: ["Money at a glance", "L'argent en un coup d'œil"], when: founder,
      body: ["Cash in is what clients actually paid this month, after withholding. Below it you see what clients still owe and the weighted pipeline.", "L'encaissé est ce que les clients ont réellement payé ce mois-ci, après retenue. En dessous : le reste dû et la prospection pondérée."],
      why: ["Weighted means each lead counts by its chance of signing, so the number is honest, not hopeful.", "Pondéré veut dire que chaque prospect compte selon sa chance de signer. Le chiffre est honnête, pas optimiste."],
      spot: "[data-tour=\"td-money\"]" },
    { title: ["Your own tasks", "Vos tâches"],
      body: ["Only the tasks assigned to you, oldest date first. A red Late tag means the date has passed. Tick the box when it is really done.", "Seulement vos tâches, la date la plus proche en premier. Une étiquette En retard veut dire que la date est passée. Cochez quand c'est vraiment fait."],
      spot: "[data-tour=\"td-tasks\"]" },
    { title: ["Open the full task list", "Ouvrir toute la liste de tâches"],
      body: ["Home only shows your next few tasks. The full list lives in its own section.", "L'accueil ne montre que vos prochaines tâches. La liste complète vit dans sa propre section."],
      try: { text: ["Click All tasks. You can come back to Home right after.", "Cliquez sur Toutes les tâches. Vous reviendrez à l'accueil juste après."], click: "[data-tour=\"td-tasks\"] [data-a=\"td-go\"]", done: ["That is how Home links to the rest of the app.", "Voilà comment l'accueil renvoie vers le reste de l'app."] },
      spot: "[data-tour=\"td-tasks\"]" },
    { title: ["Shoots coming up", "Les tournages à venir"], go: "today",
      body: ["Each line is a shoot with its date and a status. Ready means scripts and deposit are in. Blocked means something must be fixed first.", "Chaque ligne est un tournage avec sa date et un statut. Prêt veut dire scripts et acompte reçus. Bloqué veut dire qu'il y a un point à régler d'abord."],
      why: ["A blocked shoot a day before is expensive. Spot it here early and fix it.", "Un tournage bloqué la veille coûte cher. Repérez-le ici tôt et réglez-le."],
      spot: "[data-tour=\"td-shoots\"]" },
    { title: ["Open a shoot", "Ouvrir un tournage"], when: hasShoots,
      body: ["A line on Home is a shortcut. Clicking it takes you straight to that project.", "Une ligne de l'accueil est un raccourci. Un clic vous mène directement à ce projet."],
      try: { text: ["Click one shoot to jump to its project.", "Cliquez sur un tournage pour aller à son projet."], click: "[data-tour=\"td-shoots\"] [data-a=\"td-go\"]", done: ["Good. Nothing was changed, you only looked.", "Bien. Rien n'a été modifié, vous avez seulement regardé."] },
      spot: "[data-tour=\"td-shoots\"]" },
    { title: ["Check yourself", "Vérifiez"],
      quiz: { q: ["Why can two teammates see different things on Home?", "Pourquoi deux collègues voient-ils des choses différentes sur l'accueil ?"],
        options: [["Someone changed the settings by mistake", "Quelqu'un a modifié les réglages par erreur"], ["Home is built for each role, so you see what needs you", "L'accueil est conçu pour chaque rôle : vous voyez ce qui vous concerne"], ["Home only shows the newest records", "L'accueil n'affiche que les derniers enregistrements"]],
        answer: 1,
        explain: ["Home is shaped by role. Money is for the founder, follow-ups for sales, files for editors.", "L'accueil dépend du rôle. L'argent pour le fondateur, les relances pour le commercial, les fichiers pour les monteurs."] } }
  ]);

  // ---------------------------------------------------------------- Tasks
  lesson("tasks", ["Tasks", "Tâches"], ["One list for everything the team has to do, with a person and a date on each task.", "Une seule liste pour tout ce que l'équipe doit faire, avec une personne et une date sur chaque tâche."], [
    { title: ["One place for all tasks", "Un seul endroit pour toutes les tâches"],
      body: ["Every task has a title, a person, a date and sometimes a project. If it is not here, nobody is on it.", "Chaque tâche a un titre, une personne, une date et parfois un projet. Si elle n'est pas ici, personne ne s'en occupe."],
      spot: "#page .head" },
    { title: ["Read the four numbers", "Lire les quatre chiffres"],
      body: ["Open, late, due this week and done in the last 7 days. Late is the one to keep at zero.", "En cours, en retard, à faire cette semaine et faites sur 7 jours. En retard est celui à garder à zéro."],
      why: ["The done count shows the real pace of the team, not the plan.", "Le nombre de tâches faites montre le vrai rythme de l'équipe, pas le plan."],
      spot: "#page .kpis" },
    { title: ["Filters narrow the list", "Les filtres réduisent la liste"],
      body: ["Choose Everyone or only your tasks. Then filter by person, project or client to find what you need.", "Choisissez Tout le monde ou seulement vos tâches. Filtrez ensuite par personne, projet ou client."],
      spot: "#page .gk-bar" },
    { title: ["Show only your tasks", "Voir seulement vos tâches"],
      body: ["This chip is the quickest way to answer: what do I have to do today?", "Cette pastille répond vite à : qu'ai-je à faire aujourd'hui ?"],
      try: { text: ["Click My tasks.", "Cliquez sur Mes tâches."], click: "[data-a=\"tk-mine\"][data-v=\"1\"]", done: ["Now the list is only yours. Click Everyone to go back.", "La liste est maintenant la vôtre. Cliquez sur Tout le monde pour revenir."] },
      spot: "[data-a=\"tk-mine\"][data-v=\"1\"]" },
    { title: ["Switch to the board", "Passer au tableau"],
      body: ["List groups tasks by date. Board groups them by progress, like a small kanban.", "La liste groupe par date. Le tableau groupe par avancement, comme un petit kanban."],
      try: { text: ["Click Board.", "Cliquez sur Tableau."], click: "[data-a=\"tk-mode\"][data-v=\"board\"]", done: ["Same tasks, different view. Nothing changed.", "Mêmes tâches, autre vue. Rien n'a changé."] },
      spot: "[data-a=\"tk-mode\"][data-v=\"board\"]" },
    { title: ["To do, started, done", "À faire, commencée, faite"],
      body: ["A task moves from To do to Started when someone begins it, then to Done. Click a task title to open its details.", "Une tâche passe de À faire à Commencée quand quelqu'un s'y met, puis à Faite. Cliquez sur un titre pour ouvrir le détail."],
      why: ["Started tells the team who is already on it, so two people do not do the same work.", "Commencée dit à l'équipe qui s'en occupe déjà, pour éviter de faire le travail en double."],
      spot: ".tk-board|#page .tk-grp" },
    { title: ["Add a task in seconds", "Ajouter une tâche en quelques secondes"],
      body: ["Type a title, choose who, the project and the date, then press Enter. Always give a date: a task without one never shows as late.", "Écrivez un titre, choisissez qui, le projet et la date, puis Entrée. Mettez toujours une date : sans date, une tâche n'est jamais en retard."],
      spot: ".tk-add|#page .head" },
    { title: ["Check yourself", "Vérifiez"],
      quiz: { q: ["You give a task a date and a person. Where else does it appear?", "Vous donnez une date et une personne à une tâche. Où apparaît-elle aussi ?"],
        options: [["Nowhere, tasks stay in this list", "Nulle part, elle reste dans cette liste"], ["On that person's Home and in the Calendar", "Sur l'accueil de cette personne et dans le Calendrier"], ["On the client's invoice", "Sur la facture du client"]],
        answer: 1,
        explain: ["Tasks feed Home and the Calendar. That is why the date and the person matter.", "Les tâches alimentent l'accueil et le Calendrier. C'est pour cela que la date et la personne comptent."] } }
  ]);

  // ---------------------------------------------------------------- Calendar
  lesson("calendar", ["Calendar", "Calendrier"], ["Every date in the agency, shoots, tasks, invoices and follow-ups, on one calendar.", "Toutes les dates de l'agence, tournages, tâches, factures et relances, sur un seul calendrier."], [
    { title: ["The calendar reads your other sections", "Le calendrier lit vos autres sections"],
      body: ["You do not type dates here. Shoots, task dates, invoice due dates and lead follow-ups appear on their own.", "Vous ne saisissez pas de dates ici. Tournages, dates de tâches, échéances de factures et relances apparaissent seuls."],
      why: ["One date, one place. Change it where it lives and the calendar follows.", "Une date, un seul endroit. Modifiez-la là où elle vit et le calendrier suit."],
      spot: "#page .head" },
    { title: ["Move through time", "Se déplacer dans le temps"],
      body: ["The arrows go to the previous or next period. Today brings you back to now.", "Les flèches vont à la période précédente ou suivante. Aujourd'hui vous ramène à maintenant."],
      spot: ".ca-nav" },
    { title: ["Try the week view", "Essayer la vue semaine"],
      body: ["Month shows the big picture. Week shows each day in detail. Agenda is a simple list, handy on a phone.", "Mois donne la vue d'ensemble. Semaine détaille chaque jour. Agenda est une simple liste, pratique sur téléphone."],
      try: { text: ["Click Week.", "Cliquez sur Semaine."], click: "[data-a=\"ca-mode\"][data-v=\"week\"]", done: ["That is the same data, zoomed in.", "Ce sont les mêmes données, en plus près."] },
      spot: "[data-a=\"ca-mode\"][data-v=\"week\"]" },
    { title: ["Filter by type", "Filtrer par type"],
      body: ["Each type has its own colour and icon: shoots, tasks, invoices due, deliveries, follow-ups. Switch a type off when the calendar gets crowded.", "Chaque type a sa couleur et son icône : tournages, tâches, factures, livraisons, relances. Désactivez un type quand le calendrier est chargé."],
      try: { text: ["Click Tasks to hide them, then click it again to bring them back.", "Cliquez sur Tâches pour les masquer, puis encore pour les réafficher."], click: "[data-a=\"ca-type\"][data-v=\"task\"]", done: ["Hiding only changes your view. No task was touched.", "Masquer ne change que votre vue. Aucune tâche n'a été touchée."] },
      spot: ".gk-chips" },
    { title: ["Back to the month", "Retour au mois"],
      body: ["Use Month to plan. You can see at a glance which days are heavy and which are free.", "Utilisez Mois pour planifier. On voit d'un coup d'œil les jours chargés et les jours libres."],
      try: { text: ["Click Month.", "Cliquez sur Mois."], click: "[data-a=\"ca-mode\"][data-v=\"month\"]" },
      spot: "[data-a=\"ca-mode\"][data-v=\"month\"]" },
    { title: ["Click an item to open it", "Cliquer sur un élément pour l'ouvrir"],
      body: ["Click any item to open its task, project, lead or invoice. You can also drag an item to another day to move its date.", "Cliquez sur un élément pour ouvrir sa tâche, son projet, son prospect ou sa facture. Vous pouvez aussi le glisser vers un autre jour pour changer sa date."],
      why: ["Invoices due and follow-ups only show for the founder and sales. Editors and production see shoots and tasks.", "Les factures à échéance et les relances ne s'affichent que pour le fondateur et le commercial. Monteurs et production voient tournages et tâches."],
      spot: "#c2|.c2-d|#page .ca-top" },
    { title: ["Check yourself", "Vérifiez"],
      quiz: { q: ["A shoot date is wrong on the calendar. Where is the right place to fix it?", "La date d'un tournage est fausse dans le calendrier. Où la corriger ?"],
        options: [["Nowhere, the calendar is fixed", "Nulle part, le calendrier est figé"], ["On the project or item itself, or by dragging it to the right day", "Sur le projet lui-même, ou en le glissant sur le bon jour"], ["In the invoice", "Dans la facture"]],
        answer: 1,
        explain: ["The calendar shows dates that live elsewhere. Fix the source, or drag the item, and every screen stays in sync.", "Le calendrier montre des dates qui vivent ailleurs. Corrigez la source, ou glissez l'élément, et tous les écrans restent à jour."] } }
  ]);

  // ---------------------------------------------------------------- Leads
  lesson("pipeline", ["Leads", "Prospects"], ["Follow each possible client from first message to signed deal, so no one is forgotten.", "Suivez chaque client potentiel du premier message à la signature, pour n'oublier personne."], [
    { title: ["A lead is a possible client", "Un prospect est un client potentiel"],
      body: ["A lead is a brand we want to work with but have not signed yet. This screen shows where each one stands.", "Un prospect est une marque avec qui nous voulons travailler mais qui n'a pas encore signé. Cet écran montre où en est chacun."],
      why: ["The goal is simple: nobody sits waiting. Every open lead has a next step and a date.", "Le but est simple : personne ne reste dans l'attente. Chaque prospect ouvert a une prochaine étape et une date."],
      spot: "#page .head" },
    { title: ["Columns are stages", "Les colonnes sont des étapes"],
      body: ["Read left to right: Prospect, Contacted, In conversation, Meeting booked, Qualified, Proposal sent, Negotiation, Offer accepted, Signed. The further right, the closer to a deal.", "Lisez de gauche à droite : Prospect, Contacté, En discussion, Rendez-vous fixé, Qualifié, Proposition envoyée, Négociation, Offre acceptée, Signé. Plus on va à droite, plus on se rapproche du contrat."],
      why: ["A stage is a promise about what happened, not a hope. Move a lead only when the step is really done.", "Une étape décrit ce qui s'est passé, pas un espoir. Ne déplacez un prospect que lorsque l'étape est vraiment faite."],
      spot: ".board" },
    { title: ["Read a lead card", "Lire une carte de prospect"], when: hasLeads,
      body: ["The brand, the pack in mind, the next step with its date, and the owner. The 3/4 badge counts qualification answers: four yes means the lead is worth a call.", "La marque, le pack visé, la prochaine étape avec sa date, et le responsable. Le badge 3/4 compte les réponses de qualification : quatre oui, ça vaut un appel."],
      why: ["A red Late tag means the follow-up date passed. Those leads go cold fastest.", "Une étiquette rouge En retard veut dire que la date de relance est dépassée. Ces prospects refroidissent le plus vite."],
      spot: ".board .card" },
    { title: ["Moving a lead forward", "Faire avancer un prospect"], when: canLeads,
      body: ["The small menu on each card moves it to another stage. Moving to Lost asks for the real reason, so we learn why we lose.", "Le petit menu de chaque carte la déplace vers une autre étape. Passer à Perdu demande la vraie raison, pour apprendre pourquoi on perd."],
      why: ["Look but do not change it now. This lesson never edits your leads.", "Regardez sans modifier maintenant. Cette leçon ne change jamais vos prospects."],
      spot: ".board .card select[data-c=\"pl-move\"]" },
    { title: ["See the results", "Voir les résultats"],
      body: ["Results turns the board into numbers: what we won, what we lost, and how many messages it took.", "Résultats transforme le tableau en chiffres : ce qu'on a gagné, perdu, et combien de messages il a fallu."],
      try: { text: ["Click the Results tab.", "Cliquez sur l'onglet Résultats."], click: "[data-a=\"pl-mode\"][data-v=\"results\"]" },
      spot: "[data-a=\"pl-mode\"][data-v=\"results\"]" },
    { title: ["The numbers that matter", "Les chiffres qui comptent"],
      body: ["Weighted pipeline counts each lead by its chance of signing. Win rate is signed against lost. Leads going cold is the list to keep at zero.", "La prospection pondérée compte chaque prospect selon sa chance de signer. Le taux de signature compare signés et perdus. Les prospects qui refroidissent sont à garder à zéro."],
      why: ["The Why we lose list shows what to fix: pricing, timing, or simply no reply.", "La liste Pourquoi on perd montre quoi corriger : le prix, le moment, ou l'absence de réponse."],
      spot: "#page .kpis|#page .grid3" },
    { title: ["Compare by person", "Comparer par personne"],
      body: ["The weekly funnel counts DMs, replies, calls, proposals and wins week by week. The Owner menu narrows it to one person.", "L'entonnoir hebdomadaire compte DM, réponses, appels, propositions et signatures semaine par semaine. Le menu Responsable le limite à une personne."],
      try: { text: ["Open the Owner menu above the funnel table. You can close it without choosing.", "Ouvrez le menu Responsable au-dessus du tableau. Vous pouvez le fermer sans rien choisir."], click: "[data-c=\"pl-owner\"]" },
      spot: "[data-c=\"pl-owner\"]" },
    { title: ["Check yourself", "Vérifiez"],
      quiz: { q: ["A lead has signed the contract. When does it count as Won?", "Un prospect a signé le contrat. Quand compte-t-il comme Gagné ?"],
        options: [["As soon as it is signed", "Dès la signature"], ["When the required upfront payment is recorded", "Quand le paiement initial requis est enregistré"], ["When the proposal is sent", "Quand la proposition est envoyée"]],
        answer: 1,
        explain: ["Signed creates or links the client, but the lead stays Signed until the deposit is recorded. Won means money has moved.", "Signé crée ou relie le client, mais le prospect reste Signé jusqu'à l'enregistrement de l'acompte. Gagné veut dire que l'argent est arrivé."] } }
  ]);

  // ---------------------------------------------------------------- Clients
  lesson("clients", ["Clients", "Clients"], ["Every brand we work with, and one workspace for each of them.", "Toutes les marques avec qui nous travaillons, et un espace de travail pour chacune."], [
    { title: ["Clients are signed brands", "Les clients sont des marques signées"],
      body: ["A lead becomes a client when the deal is signed. From then on everything about that brand lives in one file.", "Un prospect devient client quand le contrat est signé. Ensuite, tout ce qui concerne cette marque vit dans une seule fiche."],
      why: ["One file per brand means projects, files, invoices and notes are never scattered.", "Une fiche par marque évite que projets, fichiers, factures et notes soient éparpillés."],
      spot: "#page .head" },
    { title: ["Read the health of your clients", "Lire la santé de vos clients"],
      body: ["These tiles show active clients, how much one client weighs in your revenue, and who is at risk: a late payer, or a brand that went quiet.", "Ces tuiles montrent les clients actifs, le poids d'un client dans votre chiffre d'affaires, et qui est à risque : un mauvais payeur ou une marque silencieuse."],
      why: ["If one client is most of your revenue, losing them hurts. The share tile warns you early.", "Si un seul client fait l'essentiel du chiffre d'affaires, le perdre fait mal. La tuile de part vous prévient tôt."],
      spot: "#page .kpis|#page .head" },
    { title: ["One card per brand", "Une carte par marque"], when: hasClients,
      body: ["Each card shows active projects, what the client still owes and the last activity. A tag appears when the client is waiting on us.", "Chaque carte montre les projets actifs, ce que le client doit encore et la dernière activité. Une étiquette apparaît quand le client nous attend."],
      spot: ".clh-card|.clh-cards" },
    { title: ["Where clients come from", "D'où viennent les clients"],
      body: ["Most clients are created from a signed lead in Leads. The Add client button is for the rare brand that did not come through a lead.", "La plupart des clients sont créés depuis un prospect signé dans Prospects. Le bouton Ajouter un client sert pour la marque qui n'est pas passée par un prospect."],
      spot: "[data-a=\"cl-new\"]|#page .head" },
    { title: ["Open a client", "Ouvrir un client"], when: hasClients,
      body: ["Opening a client takes you into its workspace. Opening only reads, it changes nothing.", "Ouvrir un client vous mène à son espace de travail. Ouvrir ne fait que lire, rien ne change."],
      try: { text: ["Click any client card.", "Cliquez sur une carte de client."], click: ".clh-card", until: ".clh-tabs" },
      spot: ".clh-card|.clh-cards" },
    { title: ["Tabs organise the file", "Les onglets organisent la fiche"], when: hasClients,
      body: ["Overview gives the summary. Projects, Assets, Approvals, Performance, Invoices and Notes each hold one kind of information. Which tabs you see depends on your role.", "Vue d'ensemble donne le résumé. Projets, Fichiers, Validations, Résultats, Factures et Notes contiennent chacun un type d'information. Les onglets visibles dépendent de votre rôle."],
      spot: ".clh-tabs|#page .head" },
    { title: ["Try a tab", "Essayer un onglet"], when: hasClients,
      body: ["Projects lists every job we did or are doing for this brand.", "Projets liste chaque travail fait ou en cours pour cette marque."],
      try: { text: ["Click the Projects tab.", "Cliquez sur l'onglet Projets."], click: "[data-a=\"cl-tab\"][data-v=\"projects\"]" },
      spot: "[data-a=\"cl-tab\"][data-v=\"projects\"]|.clh-tabs|#page .head" },
    { title: ["Check yourself", "Vérifiez"],
      quiz: { q: ["When does a lead become a client?", "Quand un prospect devient-il client ?"],
        options: [["When we send the first message", "Quand nous envoyons le premier message"], ["When the deal is signed", "Quand le contrat est signé"], ["When they follow us on Instagram", "Quand ils nous suivent sur Instagram"]],
        answer: 1,
        explain: ["Signing is the line. Before it you have a lead to follow up. After it you have a client to serve and invoice.", "La signature est la frontière. Avant, c'est un prospect à relancer. Après, c'est un client à servir et à facturer."] } }
  ]);

  // ---------------------------------------------------------------- Team
  lesson("team", ["Team", "Équipe"], ["Who does what, and how each person is doing.", "Qui fait quoi, et comment chacun avance."], [
    { title: ["Team is about people and workload", "L'équipe, c'est les personnes et la charge"],
      body: ["Here you see who is busy, who is late and who has room for more. Use it before you hand out new work.", "Ici, vous voyez qui est occupé, qui est en retard et qui a de la place. Regardez-le avant de donner du travail."],
      spot: "#page .head" },
    { title: ["The load in numbers", "La charge en chiffres"],
      body: ["The tiles count open tasks and late ones, show who is busiest and lightest, and how many tasks were done in 7 days.", "Les tuiles comptent les tâches ouvertes et en retard, montrent le plus et le moins chargé, et les tâches faites sur 7 jours."],
      why: ["One person with ten late tasks is a signal to rebalance, not to blame.", "Une personne avec dix tâches en retard est un signal pour rééquilibrer, pas pour blâmer."],
      spot: "#page .kpis|#page .tabs" },
    { title: ["Filter to your own work", "Filtrer sur votre travail"],
      body: ["Everyone shows each person's open tasks side by side. Mine keeps only yours.", "Tout le monde montre côte à côte les tâches ouvertes de chacun. Les miennes ne garde que les vôtres."],
      try: { text: ["Click Mine.", "Cliquez sur Les miennes."], click: "[data-a=\"tm-mine\"][data-v=\"1\"]", done: ["Click Everyone to see the whole team again.", "Cliquez sur Tout le monde pour revoir toute l'équipe."] },
      spot: "[data-a=\"tm-mine\"][data-v=\"1\"]" },
    { title: ["Open the People tab", "Ouvrir l'onglet Personnes"],
      body: ["Tasks shows open work grouped by person. People shows the team, with a card for each person: role, active projects and open tasks.", "Tâches montre le travail ouvert groupé par personne. Personnes montre l'équipe, avec une carte par personne : rôle, projets actifs et tâches ouvertes."],
      try: { text: ["Click People.", "Cliquez sur Personnes."], click: "[data-a=\"tm-tab\"][data-v=\"people\"]" },
      spot: "[data-a=\"tm-tab\"][data-v=\"people\"]" },
    { title: ["Default pay by role", "Paie par défaut selon le rôle"], when: founder,
      body: ["Under the cards you set a default pay for each role. A new person takes it unless you set theirs. Only you, as founder, see this block.", "Sous les cartes, vous fixez une paie par défaut pour chaque rôle. Une nouvelle personne la reçoit sauf si vous en fixez une autre. Vous seul, fondateur, voyez ce bloc."],
      why: ["Pay and rates stay out of chat and shared screens. These screens are the only place for them.", "La paie et les tarifs restent hors des discussions et des écrans partagés. Ces écrans sont le seul endroit prévu."],
      spot: "[data-tour=\"tp-rolepay\"]|#page .tabs" },
    { title: ["Open a profile", "Ouvrir un profil"], when: hasTeam,
      body: ["A profile holds contact details, history and performance. You see the full profile for yourself. Other people are private.", "Un profil contient les coordonnées, l'historique et les résultats. Vous voyez votre profil complet. Les autres sont privés."],
      try: { text: ["Click any person card.", "Cliquez sur une carte de personne."], click: ".tp-main", until: "[data-a=\"tp-back\"]" },
      spot: ".tp-main|#page .tabs" },
    { title: ["Pay tab on a profile", "Onglet Paie d'un profil"], when: function () { return founder() && hasTeam(); },
      body: ["Inside a profile, the Pay tab holds amounts, rate type and payment history. Nobody except the founder can open it.", "Dans un profil, l'onglet Paie contient les montants, le type de tarif et l'historique de paiement. Personne d'autre que le fondateur ne peut l'ouvrir."],
      spot: "[data-a=\"tp-sub\"][data-v=\"pay\"]|#page .tabs" },
    { title: ["Check yourself", "Vérifiez"], when: founder,
      quiz: { q: ["Who can open the Pay tab of a profile?", "Qui peut ouvrir l'onglet Paie d'un profil ?"],
        options: [["Everyone on the team", "Toute l'équipe"], ["Only the founder", "Seulement le fondateur"], ["The person's own manager", "Le responsable direct de la personne"]],
        answer: 1,
        explain: ["Pay is founder-only by design. Others never see rates, not even their own colleagues' profiles.", "La paie est réservée au fondateur. Les autres ne voient jamais les tarifs, même sur les profils de leurs collègues."] } },
    { title: ["Check yourself", "Vérifiez"], when: function () { return !founder(); },
      quiz: { q: ["Where do you see the open tasks of the whole team?", "Où voit-on les tâches ouvertes de toute l'équipe ?"],
        options: [["Team, Tasks tab, with Everyone selected", "Équipe, onglet Tâches, avec Tout le monde"], ["Only on Home", "Seulement sur l'accueil"], ["In the Calendar settings", "Dans les réglages du calendrier"]],
        answer: 0,
        explain: ["Everyone lists every open task grouped by person. Mine narrows it to yours.", "Tout le monde liste chaque tâche ouverte groupée par personne. Les miennes la limite aux vôtres."] } }
  ]);

  T._order.push("today", "tasks", "calendar", "pipeline", "clients", "team");
})(window.GK);
