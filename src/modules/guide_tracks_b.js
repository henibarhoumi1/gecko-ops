/* GECKO Ops · section lessons: production, money and the company.
   Lessons for Projects, Studio, Finance, Dashboard and Marketing. The engine lives in guide.js (GK.guideTracks).
   Each lesson is written once as [English, French] pairs; lesson() turns them into i18n keys ln_<view>_<n><x>. */
(function (GK) {
  "use strict";
  var S = GK.store, m = GK.m, ui = GK.ui;

  var T = GK.guideTracks = GK.guideTracks || {};
  T._order = T._order || [];

  /** Build one lesson and register its texts. Step fields: t title, b body, w why, x try text, d try done, q quiz, spot, when, click, until. */
  function lesson(view, title, intro, defs) {
    var words = {}, p = "ln_" + view + "_";
    words[p + "t"] = title;
    words[p + "i"] = intro;
    var steps = defs.map(function (d, n) {
      var k = p + (n + 1), s = {};
      function word(suffix, pair) { words[k + suffix] = pair; return k + suffix; }
      s.title = word("t", d.t);
      if (d.b) s.body = word("b", d.b);
      if (d.w) s.why = word("w", d.w);
      if (d.spot) s.spot = d.spot;
      if (d.when) s.when = d.when;
      if (d.x) {
        s.try = { text: word("x", d.x), click: d.click };
        if (d.until) s.try.until = d.until;
        if (d.d) s.try.done = word("d", d.d);
      }
      if (d.q) {
        s.quiz = {
          q: word("q", d.q.q), answer: d.q.a, explain: word("e", d.q.e),
          options: d.q.o.map(function (o, j) { return word("o" + j, o); })
        };
      }
      return s;
    });
    GK.i18n.add(words);
    T[view] = { title: p + "t", intro: p + "i", steps: steps };
  }

  function has(coll) { return function () { return S.all(coll).length > 0; }; }
  var hasProjects = has("projects"), hasIdeas = has("ideas"), hasInvoices = has("invoices");
  function param(view, key) { return function () { return !!ui.p(view)[key]; }; }
  function tabIs(view, tab) { return function () { return ui.p(view).tab === tab; }; }

  // ---------------------------------------------------------------- Projects
  lesson("projects", ["Projects", "Projets"],
    ["Follow a job from the signed deal to the delivered files, and see what blocks it.", "Suivez un travail du contrat signé aux fichiers livrés, et voyez ce qui le bloque."], [
    {
      t: ["What this screen is for", "À quoi sert cet écran"],
      b: ["Every video job lives here as one project. You see where each one is, what it is waiting for and who has tasks on it.", "Chaque travail vidéo vit ici sous forme de projet. Vous voyez où en est chacun, ce qu'il attend et qui a des tâches dessus."],
      w: ["One shared view means nobody has to ask where a job stands.", "Une vue commune évite de demander où en est un travail."],
      spot: "#page .head"
    },
    {
      t: ["The board, in four phases", "Le tableau, en quatre phases"],
      b: ["Cards sit in four columns: getting ready, shooting, editing and review, delivered. Behind them are ten stages, from onboarding to retention. Board and List show the same projects, and the search box finds a brand or a name.", "Les cartes sont rangées en quatre colonnes : préparation, tournage, montage et retours, livrés. Derrière, il y a dix étapes, du démarrage à la fidélisation. Tableau et Liste montrent les mêmes projets, et la recherche trouve une marque ou un nom."],
      w: ["A line under a card, such as a missing payment or approval, means the project is blocked there. The team is not late.", "Une ligne sous une carte, comme un paiement ou une validation manquants, veut dire que le projet est bloqué là. L'équipe n'est pas en retard."],
      spot: ".pj-phases"
    },
    {
      t: ["Open a project", "Ouvrir un projet"],
      b: ["A card shows the brand, the stage, the shoot date, the number of videos, open tasks and approved files. Click one to open its page.", "Une carte montre la marque, l'étape, la date de tournage, le nombre de vidéos, les tâches ouvertes et les fichiers validés. Cliquez sur l'une d'elles pour ouvrir sa page."],
      spot: ".pj-phases|#page .head",
      x: ["Click a project to open it.", "Cliquez sur un projet pour l'ouvrir."],
      click: "[data-a=\"pj-open\"]", until: param("projects", "id"),
      d: ["Opened. Everything about this job is on this one page.", "Ouvert. Tout ce qui concerne ce travail est sur cette page."],
      when: hasProjects
    },
    {
      t: ["Next step and the two gates", "Prochaine étape et les deux verrous"],
      b: ["The Next step box says what blocks the project now, or what you can do next. The row of ten stages shows how far along it is.", "La boîte Prochaine étape dit ce qui bloque le projet maintenant, ou ce que vous pouvez faire ensuite. La ligne des dix étapes montre où il en est."],
      w: ["Two gates protect the studio. No shoot until the scripts are approved and the deposit (or the month) is paid. No final files until the balance is paid.", "Deux verrous protègent le studio. Pas de tournage avant la validation des scripts et le paiement de l'acompte (ou du mois). Pas de fichiers finaux avant le paiement du solde."],
      spot: ".pj-ov|.pj-hero",
      when: hasProjects
    },
    {
      t: ["The tabs follow the job", "Les onglets suivent le travail"],
      b: ["Brief holds the angles and the client's approval of the plan. Scripts and Storyboard list the videos, Shoot is for the day itself and Edits holds the deliverables. Finance is for the owner.", "Brief contient les angles et la validation du plan par le client. Scripts et Storyboard listent les vidéos, Tournage sert pour le jour J et Montage regroupe les livrables. Finance est réservé au fondateur."],
      spot: ".pj-tabs",
      x: ["Open the Shoot tab.", "Ouvrez l'onglet Tournage."],
      click: "[data-a=\"pj-tab\"][data-v=\"shoot\"]",
      d: ["That is the shoot-day screen.", "Voici l'écran du jour de tournage."],
      when: hasProjects
    },
    {
      t: ["Run order and what each video needs", "Ordre de passage et besoins de chaque vidéo"],
      b: ["The top numbers show the shoot date, videos, lines done and extra shots. Videos are listed in the order you will shoot them, with arrows to move them. Under each one, add the B-roll and hero shots it still needs and tick them off.", "Les chiffres du haut montrent la date, les vidéos, les lignes faites et les plans en plus. Les vidéos sont listées dans l'ordre de tournage, avec des flèches pour les déplacer. Sous chacune, ajoutez le B-roll et les plans héros qu'il lui faut encore et cochez-les."],
      w: ["Shooting in a planned order and ticking off the extras means nothing is forgotten once the crew has gone home.", "Tourner dans un ordre prévu et cocher les plans en plus évite d'oublier quelque chose une fois l'équipe partie."],
      spot: ".sd-list|.sd-panel|.pj-pane",
      when: hasProjects
    },
    {
      t: ["Shot list and changes on set", "Liste des plans et changements sur le plateau"],
      b: ["Shot list groups every planned shot by location, so you can work place by place. When the actor changes a line, edit it from Read with the actor: the old and the new wording are both kept.", "La liste des plans regroupe chaque plan prévu par lieu, pour travailler endroit par endroit. Quand l'acteur change une phrase, modifiez-la depuis Lire avec l'acteur : l'ancienne et la nouvelle version sont gardées."],
      w: ["A line changed on set is never lost or argued about later. You can see what changed and put it back.", "Une phrase changée sur le plateau n'est jamais perdue ni contestée plus tard. On voit ce qui a changé et on peut la rétablir."],
      spot: ".sd-tabs|.sd-panel",
      x: ["Click Changes on set.", "Cliquez sur Changements sur le plateau."],
      click: "[data-a=\"sd-mode\"][data-v=\"log\"]",
      d: ["Every on-set edit lands here, with the old line crossed out.", "Chaque modification sur le plateau arrive ici, avec l'ancienne phrase barrée."],
      when: hasProjects
    },
    {
      t: ["Files and delivery", "Fichiers et livraison"],
      b: ["Edits counts reels, hook variations and carousels against the pack and flags anything over scope, so an extra can be invoiced. Edit files and Delivery lead to the editing board and the hand-over.", "Montage compte les reels, variations d'accroche et carrousels par rapport au pack et signale ce qui dépasse, pour facturer un extra. Fichiers de montage et Livraison mènent au suivi du montage et à la remise."],
      w: ["Final files go out only once the balance (or the month) is paid. Until then the project shows the gate.", "Les fichiers finaux ne sortent qu'une fois le solde (ou le mois) payé. Jusque-là, le projet affiche le verrou."],
      spot: ".pj-pane .panel|.pj-pane",
      x: ["Open the Edits tab.", "Ouvrez l'onglet Montage."],
      click: "[data-a=\"pj-tab\"][data-v=\"edits\"]",
      when: hasProjects
    },
    {
      t: ["Quick check", "Petite vérification"],
      q: {
        q: ["The scripts are approved but the deposit has not arrived. What can the team do?", "Les scripts sont validés mais l'acompte n'est pas arrivé. Que peut faire l'équipe ?"],
        o: [["Shoot as planned and invoice later", "Tourner comme prévu et facturer plus tard"], ["Keep preparing, but the project cannot move to Shoot yet", "Continuer la préparation, mais le projet ne peut pas passer à Tournage"], ["Skip to editing and ask for the deposit at delivery", "Passer au montage et réclamer l'acompte à la livraison"]],
        a: 1,
        e: ["The shoot gate needs both the approved scripts and the paid deposit (or month). Preparation goes on, and the Move to button stays off and says why.", "Le verrou du tournage demande les scripts validés et l'acompte (ou le mois) payé. La préparation continue, et le bouton Passer à reste grisé en disant pourquoi."]
      }
    }
  ]);

  // ---------------------------------------------------------------- Studio
  lesson("studio", ["Ideas and scripts", "Idées et scripts"],
    ["Capture ideas, shape them into scripts, get them approved, then send them to a project.", "Notez des idées, transformez-les en scripts, faites-les valider, puis envoyez-les à un projet."], [
    {
      t: ["Where every video starts", "Là où commence chaque vidéo"],
      b: ["Studio is the idea factory. A video begins here as a quick idea and grows into a script the owner approves.", "Studio est la fabrique d'idées. Une vidéo naît ici comme une idée rapide et devient un script que le fondateur valide."],
      w: ["Production only receives approved work, so what you shoot is what was agreed.", "La production ne reçoit que du travail validé : ce qu'on tourne est ce qui a été convenu."],
      spot: "#page .head"
    },
    {
      t: ["The board is the pipeline", "Le tableau est le pipeline"],
      b: ["Ideas move left to right: Idea, Concept, Script, Ready, Shot. Ready means the owner approved it, and Shot updates by itself once every hook of the reel is approved. Type a title in the Idea column to capture one in seconds.", "Les idées avancent de gauche à droite : Idée, Concept, Script, Prêt, Tourné. Prêt veut dire que le fondateur l'a validée, et Tourné se met à jour tout seul quand toutes les accroches du reel sont validées. Tapez un titre dans la colonne Idée pour en noter une en quelques secondes."],
      w: ["A column that keeps piling up shows where the work is stuck. Capture first, polish later.", "Une colonne qui s'entasse montre où le travail est bloqué. Notez d'abord, peaufinez ensuite."],
      spot: ".board"
    },
    {
      t: ["Narrow the board", "Réduire le tableau"],
      b: ["Filters cut the board by client, owner or angle, and the search finds a title, hook or tag. Use them when you only need one client's ideas.", "Les filtres réduisent le tableau par client, responsable ou angle, et la recherche trouve un titre, une accroche ou un tag. Servez-vous-en quand il ne vous faut que les idées d'un client."],
      spot: "#st-fc|#page .form",
      x: ["Open the Client filter.", "Ouvrez le filtre Client."],
      click: "#st-fc",
      d: ["Pick a client and the board shows only theirs. Clear filters brings everything back.", "Choisissez un client et le tableau n'affiche que les siennes. Effacer les filtres remet tout."]
    },
    {
      t: ["Script bank and hook bank", "Banque de scripts et banque d'accroches"],
      b: ["Script bank lists every written script, ready to copy or reuse for a new client. Hook bank lists every opening line, with the ones that already won on ads.", "La banque de scripts liste tous les scripts écrits, prêts à copier ou réutiliser pour un nouveau client. La banque d'accroches liste toutes les phrases d'ouverture, avec celles qui ont déjà gagné en pub."],
      w: ["Good scripts and winning hooks are the studio's memory. Reuse them instead of starting from a blank page.", "Les bons scripts et les accroches gagnantes sont la mémoire du studio. Réutilisez-les plutôt que de repartir d'une page blanche."],
      spot: "#page .tabs",
      x: ["Click Script bank.", "Cliquez sur Banque de scripts."],
      click: "[data-a=\"st-mode\"][data-v=\"scripts\"]"
    },
    {
      t: ["Open an idea", "Ouvrir une idée"],
      b: ["Everything about one video sits on its page: client, angle, hook, concept, scenes with shots, links and notes. Click an idea to open it.", "Tout ce qui concerne une vidéo est sur sa page : client, angle, accroche, concept, scènes avec plans, liens et notes. Cliquez sur une idée pour l'ouvrir."],
      spot: "#page .tabs",
      x: ["Click an idea to open it.", "Cliquez sur une idée pour l'ouvrir."],
      click: "[data-a=\"st-open\"]", until: param("studio", "id"),
      d: ["This is the idea page.", "Voici la page de l'idée."],
      when: hasIdeas
    },
    {
      t: ["Stage, gaps and approval", "Étape, manques et validation"],
      b: ["The stage bar shows where the idea is. If something is missing, like a hook or a scene, a Missing list says what to add. A team member asks for review, and the owner approves with Mark ready.", "La barre d'étapes montre où en est l'idée. S'il manque quelque chose, comme une accroche ou une scène, une liste Manque dit quoi ajouter. Un membre de l'équipe demande la relecture, et le fondateur valide avec Marquer prêt."],
      w: ["Ready is a promise. Approval saves that version, so later edits to the draft do not change what production receives.", "Prêt est une promesse. La validation enregistre cette version : les modifications ultérieures du brouillon ne changent pas ce que reçoit la production."],
      spot: ".st-detail .stepper|.st-detail",
      when: hasIdeas
    },
    {
      t: ["Send it to a project", "L'envoyer à un projet"],
      b: ["Only an approved idea can be sent. Send to a project creates the angle if it is missing, then a reel with this hook and script.", "Seule une idée validée peut être envoyée. Envoyer à un projet crée l'angle s'il manque, puis un reel avec cette accroche et ce script."],
      w: ["The reel gets a file code and appears in production, so the video you approved is the one that gets edited.", "Le reel reçoit un code de fichier et apparaît en production : la vidéo validée est celle qui sera montée."],
      spot: "[data-tour=\"st-send\"]|.st-detail",
      when: hasIdeas
    },
    {
      t: ["Quick check", "Petite vérification"],
      q: {
        q: ["The owner approved an idea, then a teammate edits the draft script. What does production receive?", "Le fondateur a validé une idée, puis un collègue modifie le brouillon du script. Que reçoit la production ?"],
        o: [["The latest draft", "Le dernier brouillon"], ["The approved version, until a new revision is approved", "La version validée, jusqu'à la validation d'une nouvelle révision"], ["Nothing, the idea goes back to Script", "Rien, l'idée retourne à Script"]],
        a: 1,
        e: ["Approval saves a revision. Draft edits do not change it, so what was agreed is what gets shot. To use the new wording, the owner approves a new revision.", "La validation enregistre une révision. Les modifications du brouillon ne la changent pas : ce qui a été convenu est ce qui est tourné. Pour utiliser la nouvelle version, le fondateur valide une nouvelle révision."]
      }
    }
  ]);

  // ---------------------------------------------------------------- Finance
  lesson("finance", ["Finance", "Finance"],
    ["Invoices, cash, margins and the forecast, and how they differ.", "Factures, trésorerie, marges et prévision, et ce qui les distingue."], [
    {
      t: ["What this screen is for", "À quoi sert cet écran"],
      b: ["Finance is where money is invoiced, collected and planned. Everyday tabs sit on top, and the planning and year-end screens sit behind More.", "Finance est l'endroit où l'argent est facturé, encaissé et prévu. Les onglets du quotidien sont en haut, et les écrans de planification et de fin d'année sont derrière Plus."],
      w: ["Only the owner sees this screen, because it holds costs, margins and pay.", "Seul le fondateur voit cet écran, car il contient coûts, marges et paie."],
      spot: "#page .head"
    },
    {
      t: ["Retainers and runway", "Récurrent et autonomie"],
      b: ["Monthly retainers is the repeating income of active monthly plans. Runway is how many months your cash lasts at the last three months' spending.", "Récurrent mensuel est le revenu qui revient des plans mensuels actifs. L'autonomie est le nombre de mois que dure la trésorerie au rythme des dépenses des trois derniers mois."],
      w: ["Retainers tell you what is likely to come in. Runway tells you how long you can keep going if it stops.", "Le récurrent dit ce qui devrait rentrer. L'autonomie dit combien de temps on tient si cela s'arrête."],
      spot: ".kpis|#page .panel"
    },
    {
      t: ["Cash is not revenue", "Encaissé n'est pas facturé"],
      b: ["On Invoices, the top numbers are what is left to collect, what is overdue, what was received this month and how much of the yearly cap is used. Received counts money that arrived, plus the tax clients withheld.", "Sur Factures, les chiffres du haut sont ce qu'il reste à encaisser, ce qui est en retard, ce qui a été reçu ce mois-ci et la part du plafond annuel utilisée. Reçu compte l'argent arrivé, plus la retenue des clients."],
      w: ["Revenue is what you invoiced. Cash is what reached the bank. Rent and salaries are paid with cash.", "Le chiffre d'affaires est ce que vous avez facturé. La trésorerie est ce qui est arrivé en banque. Le loyer et les salaires se paient avec la trésorerie."],
      spot: ".kpis",
      x: ["Open the Invoices tab.", "Ouvrez l'onglet Factures."],
      click: "[data-a=\"fi-tab\"][data-tab=\"invoices\"]"
    },
    {
      t: ["Draft, issued, paid", "Brouillon, émise, payée"],
      b: ["A draft has no number and can still be edited. Once issued, an invoice is numbered and locked, and a mistake is fixed with a credit note. The buttons filter by Open, All, Drafts and Overdue.", "Un brouillon n'a pas de numéro et peut encore être modifié. Une fois émise, une facture est numérotée et verrouillée, et une erreur se corrige par un avoir. Les boutons filtrent par Ouvertes, Toutes, Brouillons et En retard."],
      w: ["Locked numbers keep the books clean for the accountant. Totals leave out drafts because a draft is not an invoice yet.", "Des numéros verrouillés gardent la comptabilité propre pour le comptable. Les totaux ignorent les brouillons, car un brouillon n'est pas encore une facture."],
      spot: "[data-a=\"fi-filter\"]|.tbl",
      x: ["Click All.", "Cliquez sur Toutes."],
      click: "[data-a=\"fi-filter\"][data-f=\"all\"]",
      when: hasInvoices
    },
    {
      t: ["One invoice", "Une facture"],
      b: ["Click a row to see the invoice: the amount, the stamp duty, the total, what you received net, what the client withheld and the balance left. Withheld is tax the client pays the tax office on your behalf.", "Cliquez sur une ligne pour voir la facture : le montant, le droit de timbre, le total, ce que vous avez reçu net, ce que le client a retenu et le reste à payer. La retenue est l'impôt que le client verse au fisc à votre place."],
      spot: "[data-a=\"fi-open\"]|.tbl",
      x: ["Click an invoice to open it.", "Cliquez sur une facture pour l'ouvrir."],
      click: "[data-a=\"fi-open\"]", until: param("finance", "invoiceId"),
      d: ["Opened. Paid counts money received plus tax withheld.", "Ouverte. Payé compte l'argent reçu plus la retenue."],
      when: hasInvoices
    },
    {
      t: ["Profit and margin", "Bénéfice et marge"],
      b: ["Profitability shows each client and project: received, costs, profit and margin. Margin is profit as a share of what you received, so received minus costs, divided by received.", "Rentabilité montre chaque client et projet : reçu, coûts, bénéfice et marge. La marge est le bénéfice en pourcentage de ce que vous avez reçu, donc reçu moins coûts, divisé par reçu."],
      w: ["A big client with a thin margin can earn you less than a small client with a fat one. Sort by margin or by still owed to see the difference.", "Un gros client à marge fine peut rapporter moins qu'un petit client à grosse marge. Triez par marge ou par reste dû pour voir la différence."],
      spot: "#page .panel",
      x: ["Click More, then Profitability.", "Cliquez sur Plus, puis sur Rentabilité."],
      click: "[data-a=\"fi-tab\"][data-tab=\"profit\"]|[data-a=\"fi-more\"]", until: tabIs("finance", "profit")
    },
    {
      t: ["The 13-week forecast", "La prévision à 13 semaines"],
      b: ["The forecast starts from the cash you really have, then adds invoices due and known costs week by week. Booked uses only what is certain, and With pipeline adds open leads weighted by their odds.", "La prévision part de la trésorerie réelle, puis ajoute semaine après semaine les factures dues et les coûts connus. Acquis ne garde que le certain, et Avec pipeline ajoute les prospects ouverts pondérés par leurs chances."],
      w: ["Fixing a cash dip six weeks early is cheap. The week it lands, it is not.", "Corriger un trou de trésorerie six semaines avant coûte peu. La semaine où il arrive, c'est trop tard."],
      spot: "#page .panel",
      x: ["Open Cash forecast.", "Ouvrez Prévision."],
      click: "[data-a=\"fi-tab\"][data-tab=\"forecast\"]", until: tabIs("finance", "forecast")
    },
    {
      t: ["Quick check", "Petite vérification"],
      q: {
        q: ["You issue a 3,200 TND invoice on 28 October and the client pays on 12 November. How much cash did you receive in October?", "Vous émettez une facture de 3 200 TND le 28 octobre et le client paie le 12 novembre. Combien avez-vous encaissé en octobre ?"],
        o: [["3,200 TND, because it was invoiced", "3 200 TND, car elle est facturée"], ["Nothing yet, the cash arrives in November", "Rien encore, l'argent arrive en novembre"], ["Half, as a deposit", "La moitié, en acompte"]],
        a: 1,
        e: ["Invoiced money is revenue, and cash is what actually arrives. October shows 3,200 TND as to collect, and November shows it as received.", "L'argent facturé est du chiffre d'affaires, et la trésorerie est ce qui arrive vraiment. Octobre montre 3 200 TND à encaisser, et novembre les montre comme reçus."]
      }
    }
  ]);

  // ---------------------------------------------------------------- Dashboard
  lesson("dashboard", ["Dashboard", "Tableau de bord"],
    ["Read the company at a glance: how this month is going, what is slipping, and where the next money comes from.", "Lisez l'entreprise d'un coup d'œil : comment va le mois, ce qui glisse, et d'où vient le prochain argent."], [
    {
      t: ["Three questions", "Trois questions"],
      b: ["The dashboard answers three things: are we okay this month, what is slipping, and where does the next money come from. Only the owner sees it.", "Le tableau de bord répond à trois choses : va-t-on bien ce mois-ci, qu'est-ce qui glisse, et d'où vient le prochain argent. Seul le fondateur le voit."],
      w: ["Every number comes from the records of the other screens, so nothing here is typed twice.", "Chaque chiffre vient des données des autres écrans, donc rien n'est saisi deux fois."],
      spot: "#page .head"
    },
    {
      t: ["Look at this", "À regarder"],
      b: ["This list is ranked by urgency: late invoices, the yearly cap nearly used, cash going below zero, quiet leads, projects blocked by a gate, commission owed. Each line has a button that takes you to the fix.", "Cette liste est classée par urgence : factures en retard, plafond annuel presque atteint, trésorerie sous zéro, prospects silencieux, projets bloqués par un verrou, commission due. Chaque ligne a un bouton qui mène à la solution."],
      w: ["Start here each morning. If the list is empty, nothing is slipping.", "Commencez par ici chaque matin. Si la liste est vide, rien ne glisse."],
      spot: ".db-look"
    },
    {
      t: ["The tiles", "Les tuiles"],
      b: ["Cash in is money received this month, net of tax withheld. Monthly retainers is repeating income, and Clients owe is invoiced but unpaid. Runway is how many months the cash lasts at current spending.", "Encaissé est l'argent reçu ce mois-ci, net de la retenue. Récurrent mensuel est le revenu qui revient, et Reste à encaisser est facturé mais non payé. L'autonomie est le nombre de mois que dure la trésorerie au rythme actuel des dépenses."],
      w: ["Cash in and Clients owe are different numbers. Invoiced money is not yours to spend until it arrives.", "Encaissé et Reste à encaisser sont deux chiffres différents. L'argent facturé ne se dépense pas tant qu'il n'est pas arrivé."],
      spot: ".db-tiles"
    },
    {
      t: ["Money in and money out", "Argent entré et sorti"],
      b: ["Bars compare money in with money out for each month, and a line marks your monthly goal. Money out is an estimate: expenses, salary, project costs and commissions.", "Les barres comparent l'argent entré et sorti de chaque mois, et une ligne marque votre objectif mensuel. Les sorties sont une estimation : dépenses, salaire, coûts projets et commissions."],
      w: ["Longer periods show the trend. Short ones show where you stand now.", "Les périodes longues montrent la tendance. Les courtes montrent où vous en êtes maintenant."],
      spot: "[data-tour=\"db-money\"]|.db-grid .panel",
      x: ["Switch the period to 12 months.", "Passez la période à 12 mois."],
      click: "[data-a=\"db-range\"][data-n=\"12\"]",
      d: ["The charts now cover twelve months.", "Les graphiques couvrent maintenant douze mois."]
    },
    {
      t: ["The next 13 weeks of cash", "Les 13 prochaines semaines de trésorerie"],
      b: ["Booked uses invoices that are due and costs that are known. With pipeline adds open leads, weighted by how likely they are to close.", "Acquis utilise les factures dues et les coûts connus. Avec pipeline ajoute les prospects ouverts, pondérés par leur chance de se conclure."],
      w: ["If a line dips below zero, that week is the one to plan for. Nothing here is a promise: it is an estimate.", "Si une ligne passe sous zéro, c'est cette semaine qu'il faut préparer. Rien ici n'est une promesse : c'est une estimation."],
      spot: "[data-tour=\"db-fc\"]|.db-grid .panel"
    },
    {
      t: ["Who owes you, and by how long", "Qui vous doit, et depuis combien de temps"],
      b: ["This chart groups unpaid invoices by how late they are, and the line below says how many days clients take to pay on average. The profit by client chart further down shows margin against your target.", "Ce graphique regroupe les factures impayées selon leur retard, et la ligne dessous donne le nombre moyen de jours que mettent les clients à payer. Le graphique de bénéfice par client, plus bas, montre la marge face à votre objectif."],
      w: ["Old unpaid invoices rarely pay themselves. The older the bar, the sooner you should call.", "Les vieilles factures impayées se paient rarement toutes seules. Plus la barre est ancienne, plus tôt il faut appeler."],
      spot: "[data-tour=\"db-age\"]|.db-grid.w3 .panel"
    },
    {
      t: ["Goals", "Objectifs"],
      b: ["Goals feed the goal line on the chart and the tiles: a monthly revenue goal, DMs per day and a margin target. Changing them is up to you, and they are only saved when you press Save goals.", "Les objectifs alimentent la ligne d'objectif du graphique et les tuiles : un chiffre mensuel, des DM par jour et une marge visée. Les modifier vous revient, et ils ne sont enregistrés que si vous appuyez sur Enregistrer les objectifs."],
      spot: "[data-tour=\"db-goals\"]|.db-grid.w3 .panel",
      x: ["Click the revenue goal box. Nothing changes yet.", "Cliquez sur la case de l'objectif de chiffre. Rien ne change encore."],
      click: "#db-g-rev"
    },
    {
      t: ["Quick check", "Petite vérification"],
      q: {
        q: ["Cash in shows 6,200 TND and Clients owe shows 14,000 TND. What does that mean?", "Encaissé affiche 6 200 TND et Reste à encaisser affiche 14 000 TND. Que cela veut-il dire ?"],
        o: [["We earned 6,200 TND this month and lost 14,000", "Nous avons gagné 6 200 TND ce mois-ci et perdu 14 000"], ["6,200 TND reached us this month, and 14,000 TND is invoiced but not paid yet", "6 200 TND nous sont arrivés ce mois-ci, et 14 000 TND sont facturés mais pas encore payés"], ["Both numbers are the same money counted twice", "Les deux chiffres sont le même argent compté deux fois"]],
        a: 1,
        e: ["Cash in is money that arrived. Clients owe is money that is invoiced and still on its way. It is worth chasing, but it cannot pay a bill yet.", "Encaissé est l'argent arrivé. Reste à encaisser est l'argent facturé qui est encore en route. Cela vaut la peine de relancer, mais cela ne peut pas encore payer une facture."]
      }
    }
  ]);

  // ---------------------------------------------------------------- Marketing
  lesson("marketing", ["Marketing", "Marketing"],
    ["The studio's own marketing: what we say, what we post, what we spend and what it brings back.", "Le marketing du studio : ce qu'on dit, ce qu'on publie, ce qu'on dépense et ce que cela rapporte."], [
    {
      t: ["Our own brand", "Notre propre marque"],
      b: ["This is GECKO's own marketing, not a client's. Strategy says what we stand for, then Content, Ads, Showcase and Insights show the work and its results.", "Voici le marketing de GECKO lui-même, pas celui d'un client. La stratégie dit ce qu'on défend, puis Contenu, Pubs, Vitrine et Chiffres montrent le travail et ses résultats."],
      w: ["A studio that sells ads that get tested should test its own.", "Un studio qui vend des pubs testées doit tester les siennes."],
      spot: "#page .head"
    },
    {
      t: ["Strategy: one page to write from", "Stratégie : une page pour écrire"],
      b: ["Strategy holds who we target, the offers we push, this quarter's goals, the channels and the key messages. A grey note means the text is a suggestion from the plan until someone edits it.", "La stratégie contient qui on vise, les offres qu'on pousse, les objectifs du trimestre, les canaux et les messages clés. Une note grise veut dire que le texte est une suggestion du plan tant que personne ne l'a modifié."],
      w: ["When everyone writes from the same page, posts, ads and DMs all say the same thing.", "Quand tout le monde écrit depuis la même page, les posts, les pubs et les DM disent la même chose."],
      spot: ".mk-strat"
    },
    {
      t: ["Content: the posting plan", "Contenu : le plan de publication"],
      b: ["Content plans our posts on Instagram, TikTok and LinkedIn. Each post moves from idea to scripted, shot, edited and posted.", "Contenu planifie nos posts sur Instagram, TikTok et LinkedIn. Chaque post passe d'idée à scripté, tourné, monté puis publié."],
      w: ["A column that keeps filling up is the first sign of a bottleneck. The plan is three reels a week.", "Une colonne qui se remplit sans cesse est le premier signe d'un goulot. Le plan est de trois reels par semaine."],
      spot: ".mk-tabs",
      x: ["Open the Content tab.", "Ouvrez l'onglet Contenu."],
      click: "[data-a=\"mk-tab\"][data-v=\"content\"]"
    },
    {
      t: ["Board or by month", "Tableau ou par mois"],
      b: ["Board groups posts by status. By month lists them by date, which suits checking the calendar. Once a post is live, open it and add views, likes, saves, shares and DMs.", "Tableau groupe les posts par statut. Par mois les liste par date, ce qui convient pour vérifier le calendrier. Une fois le post en ligne, ouvrez-le et ajoutez vues, likes, enregistrements, partages et DM."],
      w: ["Results turn posting into learning. You see which kind of post, such as proof, method or behind the scenes, really works.", "Les résultats transforment la publication en apprentissage. On voit quel type de post, preuve, méthode ou coulisses, marche vraiment."],
      spot: ".mk-bar",
      x: ["Click By month.", "Cliquez sur Par mois."],
      click: "[data-a=\"mk-c-layout\"][data-v=\"list\"]"
    },
    {
      t: ["Ads: what we spend", "Pubs : ce que nous dépensons"],
      b: ["Ads logs our own campaigns: the objective, the channel, what each spent and how many leads or DMs it brought. Cost per lead is the amount spent divided by the leads. Budget and spend are shown to the owner only.", "Pubs enregistre nos propres campagnes : l'objectif, le canal, ce que chacune a dépensé et le nombre de prospects ou de DM obtenus. Le coût par prospect est le montant dépensé divisé par le nombre de prospects. Budget et dépenses ne sont visibles que par le fondateur."],
      w: ["Spending only makes sense if it brings conversations. Cost per lead is the fair way to compare campaigns.", "Dépenser n'a de sens que si cela amène des conversations. Le coût par prospect est la façon juste de comparer les campagnes."],
      spot: ".mk-tabs",
      x: ["Open the Ads tab.", "Ouvrez l'onglet Pubs."],
      click: "[data-a=\"mk-tab\"][data-v=\"ads\"]"
    },
    {
      t: ["Showcase: proof we can show", "Vitrine : les preuves à montrer"],
      b: ["Showcase lists delivered projects we could present as case studies. Tick that the client allows it only when they have said yes, and write a result line with real numbers.", "Vitrine liste les projets livrés que nous pourrions présenter comme études de cas. Cochez que le client l'autorise seulement quand il a dit oui, et écrivez une ligne de résultat avec de vrais chiffres."],
      w: ["Showing a client's work without their yes is a risk. Real numbers are what make a case study believable. Costs are never shown here.", "Montrer le travail d'un client sans son accord est un risque. De vrais chiffres rendent une étude de cas crédible. Les coûts ne sont jamais affichés ici."],
      spot: ".mk-tabs",
      x: ["Open the Showcase tab.", "Ouvrez l'onglet Vitrine."],
      click: "[data-a=\"mk-tab\"][data-v=\"showcase\"]"
    },
    {
      t: ["Insights: what it brought", "Chiffres : ce que cela a rapporté"],
      b: ["Insights turns what you logged into numbers: posts this month, views, engagement rate, followers and leads from social and ads. Log follower counts once a month so the growth line works.", "Chiffres transforme ce que vous avez saisi en indicateurs : posts du mois, vues, taux d'engagement, abonnés et prospects venus des réseaux et des pubs. Notez le nombre d'abonnés une fois par mois pour que la courbe de croissance fonctionne."],
      w: ["Engagement rate is likes, saves and shares divided by views. It tells you if people cared, not only if they saw it.", "Le taux d'engagement est likes, enregistrements et partages divisés par les vues. Il dit si les gens se sont intéressés, pas seulement s'ils ont vu."],
      spot: ".kpis|.mk-pane",
      x: ["Open the Insights tab.", "Ouvrez l'onglet Chiffres."],
      click: "[data-a=\"mk-tab\"][data-v=\"insights\"]"
    },
    {
      t: ["Quick check", "Petite vérification"],
      q: {
        q: ["A campaign spent 240 TND and brought 30 DMs. What is its cost per lead?", "Une campagne a dépensé 240 TND et amené 30 DM. Quel est son coût par prospect ?"],
        o: [["6 TND", "6 TND"], ["8 TND", "8 TND"], ["270 TND", "270 TND"]],
        a: 1,
        e: ["Cost per lead is spent divided by leads: 240 divided by 30 is 8 TND. A campaign with a lower number brings conversations more cheaply.", "Le coût par prospect est la dépense divisée par les prospects : 240 divisé par 30 fait 8 TND. Une campagne avec un chiffre plus bas amène des conversations à moindre coût."]
      }
    }
  ]);

  T._order.push("projects", "studio", "finance", "dashboard", "marketing");
})(window.GK);
