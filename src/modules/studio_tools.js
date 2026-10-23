/* GECKO Ops · studio toolkit: hook builder, script timer, angle finder, B-roll ideas, reference library, caption helper.
   Rendered by studio.js in mode "tools". Pure templates, no AI call. Reference links live in config.creativeRefs. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    ct_tools: ["Toolkit", "Boîte à outils"],
    ct_t_hooks: ["Hook builder", "Accroches"], ct_t_timer: ["Script timer", "Chrono du script"], ct_t_angles: ["Angle finder", "Angles"],
    ct_t_broll: ["B-roll and hero shots", "Plans de coupe"], ct_t_refs: ["Reference library", "Références"], ct_t_caps: ["Caption helper", "Légendes"],
    ct_copy_all: ["Copy all", "Tout copier"], ct_save_idea: ["Save to an idea", "Ajouter à une idée"],
    ct_p_product: ["product", "produit"], ct_p_pain: ["problem", "problème"], ct_p_benefit: ["benefit", "bénéfice"], ct_p_audience: ["audience", "audience"],
    ct_f_product: ["Product", "Produit"], ct_f_pain: ["Pain or problem", "Problème"], ct_f_benefit: ["Benefit", "Bénéfice"], ct_f_audience: ["Audience", "Audience"],
    ct_ph_product: ["Vitamin C serum", "Sérum vitamine C"], ct_ph_pain: ["dull skin", "un teint terne"], ct_ph_benefit: ["glow in a week", "retrouver l'éclat en une semaine"],
    ct_ph_audience: ["women over 25", "femmes de plus de 25 ans"],
    ct_lang: ["Language", "Langue"], ct_l_en: ["English", "Anglais"], ct_l_fr: ["French", "Français"], ct_l_both: ["Both", "Les deux"],
    ct_h_note: ["Fill the fields, the hooks write themselves. Words in brackets are still empty.", "Remplissez les champs, les accroches s'écrivent. Les mots entre crochets sont encore vides."],
    ct_hook_n: ["{n} hooks", "{n} accroches"], ct_copied: ["Copied", "Copié"], ct_no_rights: ["You can't change this here.", "Vous ne pouvez pas modifier ceci ici."],
    ct_hs_title: ["Save hook", "Enregistrer l'accroche"], ct_hs_accent: ["to an idea", "dans une idée"], ct_hs_new: ["New idea", "Nouvelle idée"],
    ct_hs_idea: ["Idea", "Idée"], ct_hs_title_f: ["Title of the new idea", "Titre de la nouvelle idée"], ct_hs_do: ["Save", "Enregistrer"],
    ct_hs_set: ["Hook set on the idea", "Accroche ajoutée à l'idée"], ct_hs_note: ["Added to the notes of the idea", "Ajoutée aux notes de l'idée"],
    ct_hs_created: ["New idea created", "Idée créée"], ct_hs_opt: ["Hook option: {h}", "Option d'accroche : {h}"],
    ct_hs_log: ["Hook added from the toolkit", "Accroche ajoutée depuis la boîte à outils"],
    // timer
    ct_tm_pick: ["Load a script from an idea", "Charger le script d'une idée"], ct_tm_none: ["Paste a script below", "Collez un script ci-dessous"],
    ct_tm_text: ["Script, one line per beat", "Script, une ligne par temps fort"], ct_tm_ph: ["Type or paste lines. Darija works too.", "Tapez ou collez les lignes. Le darija marche aussi."],
    ct_tm_pace: ["Speaking pace", "Rythme de parole"], ct_tm_slow: ["Slow, 2.2 words a second", "Lent, 2,2 mots par seconde"],
    ct_tm_normal: ["Normal, 2.6 words a second", "Normal, 2,6 mots par seconde"], ct_tm_fast: ["Fast, 3.0 words a second", "Rapide, 3,0 mots par seconde"],
    ct_tm_words: ["words", "mots"], ct_tm_secs: ["seconds", "secondes"], ct_tm_lines: ["lines", "lignes"],
    ct_tm_ok: ["Fits a 30 second reel", "Tient dans un reel de 30 secondes"],
    ct_tm_w30: ["Over 30 seconds. Cut it for a short reel.", "Plus de 30 secondes. Coupez pour un reel court."],
    ct_tm_w45: ["Over 45 seconds. Watch the drop-off.", "Plus de 45 secondes. Attention à l'abandon."],
    ct_tm_w60: ["Over 60 seconds. Too long for most Meta placements.", "Plus de 60 secondes. Trop long pour la plupart des placements Meta."],
    ct_tm_empty: ["Nothing to time yet.", "Rien à chronométrer pour l'instant."], ct_tm_at: ["at {s}s", "à {s}s"],
    // angles
    ct_an_note: ["Tick the angles worth testing. Each one is a different reason to watch.", "Cochez les angles à tester. Chacun est une raison différente de regarder."],
    ct_an_sel: ["{n} selected", "{n} choisis"], ct_an_copy: ["Copy as a plan", "Copier comme plan"], ct_an_project: ["Project", "Projet"],
    ct_an_add: ["Add to project angles", "Ajouter aux angles du projet"], ct_an_added: ["{n} angles added", "{n} angles ajoutés"], ct_an_dup: ["Already in the project", "Déjà dans le projet"],
    ct_an_no_pj: ["No project yet", "Pas encore de projet"], ct_an_pick: ["Choose a project", "Choisissez un projet"],
    ct_an_plan: ["Angle plan for {p}", "Plan d'angles pour {p}"], ct_an_the_product: ["the product", "le produit"],
    // broll
    ct_br_type: ["Product type", "Type de produit"], ct_br_hero: ["Hero shots", "Plans héros"], ct_br_broll: ["B-roll", "Plans de coupe"],
    ct_br_sel: ["{n} ticked", "{n} cochés"], ct_br_video: ["Video (idea)", "Vidéo (idée)"], ct_br_add: ["Add to a video", "Ajouter à une vidéo"],
    ct_br_added: ["{n} shots added to the shoot list", "{n} plans ajoutés à la liste de tournage"], ct_br_none: ["No ideas yet. Capture one first.", "Pas encore d'idées. Notez-en une d'abord."],
    ct_br_pick: ["Choose a video", "Choisissez une vidéo"], ct_br_dup: ["Those shots are already on the video", "Ces plans sont déjà sur la vidéo"],
    ct_ty_food: ["Food", "Alimentaire"], ct_ty_beauty: ["Cosmetics and skincare", "Cosmétique et soin"], ct_ty_fashion: ["Fashion", "Mode"],
    ct_ty_tech: ["Tech and gadgets", "Tech et gadgets"], ct_ty_home: ["Home", "Maison"], ct_ty_resto: ["Restaurant and café", "Restaurant et café"],
    ct_ty_service: ["Services and personal brand", "Services et marque personnelle"],
    // refs
    ct_rf_add: ["Add a reference", "Ajouter une référence"], ct_rf_empty: ["No references yet. Save ads and reels worth learning from.", "Aucune référence. Gardez les pubs et reels dont s'inspirer."],
    ct_rf_url: ["Link", "Lien"], ct_rf_url_ph: ["https://www.tiktok.com/…", "https://www.tiktok.com/…"], ct_rf_note: ["Why it works", "Pourquoi ça marche"],
    ct_rf_tags: ["Tags, separated by commas", "Tags, séparés par des virgules"], ct_rf_format: ["Format", "Format"], ct_rf_angle: ["Angle it shows", "Angle illustré"],
    ct_rf_all: ["All", "Tous"], ct_rf_open: ["Open link", "Ouvrir le lien"], ct_rf_del: ["Delete", "Supprimer"],
    ct_rf_bad: ["Add a link that starts with http.", "Ajoutez un lien qui commence par http."], ct_rf_saved: ["Reference saved", "Référence enregistrée"],
    ct_rf_deleted: ["Reference deleted", "Référence supprimée"], ct_rf_del_t: ["Delete this reference?", "Supprimer cette référence ?"],
    ct_rf_del_b: ["The link is removed from the library for everyone.", "Le lien est retiré de la bibliothèque pour tout le monde."],
    ct_rf_n: ["{n} saved", "{n} gardées"], ct_rf_new_t: ["New", "Nouvelle"], ct_rf_new_a: ["reference", "référence"],
    ct_fm_reel: ["Reel or TikTok", "Reel ou TikTok"], ct_fm_ad: ["Meta ad", "Pub Meta"], ct_fm_story: ["Story", "Story"], ct_fm_yt: ["YouTube", "YouTube"], ct_fm_other: ["Other", "Autre"],
    // captions
    ct_cp_idea: ["Idea", "Idée"], ct_cp_manual: ["Write by hand", "Écrire à la main"], ct_cp_hook: ["Hook", "Accroche"], ct_cp_body: ["Main point", "Message principal"],
    ct_cp_cta: ["Call to action", "Appel à l'action"], ct_cp_cta_d: ["Order now, link in bio", "Commandez maintenant, lien en bio"],
    ct_cp_emoji: ["Use emojis", "Utiliser des emojis"], ct_cp_tags: ["Hashtags", "Hashtags"], ct_cp_tags_hint: ["Edit freely. Keep 3 to 8.", "Modifiez librement. Gardez 3 à 8."],
    ct_cp_short: ["Short", "Court"], ct_cp_mid: ["With a main point", "Avec un message"], ct_cp_list: ["Line by line", "Ligne par ligne"],
    ct_cp_copy: ["Copy caption", "Copier la légende"], ct_cp_copy_t: ["Copy with hashtags", "Copier avec hashtags"], ct_cp_empty: ["Add a hook to get drafts.", "Ajoutez une accroche pour obtenir des brouillons."]
  });

  // ---------- content ----------
  // Hook formulas: [id, English, French]. Tokens: {product} {pain} {benefit} {audience}
  var HOOKS = [
    ["tried", "I tried {product} so you don't have to", "J'ai testé {product} pour que vous n'ayez pas à le faire"],
    ["stop", "Stop putting up with {pain}", "Arrêtez de subir {pain}"],
    ["three", "3 reasons {audience} love {product}", "3 raisons pour lesquelles {audience} adorent {product}"],
    ["pov", "POV: you finally found a fix for {pain}", "POV : vous avez enfin trouvé la solution contre {pain}"],
    ["sign", "This is your sign to try {product}", "C'est le signe qu'il faut essayer {product}"],
    ["nobody", "Nobody tells {audience} this about {pain}", "Personne ne dit ça à {audience} sur {pain}"],
    ["qpain", "Still dealing with {pain}?", "Encore confronté à {pain} ?"],
    ["qben", "What if you could get {benefit}?", "Et si vous pouviez obtenir {benefit} ?"],
    ["ba", "Before {product}: {pain}. After: {benefit}.", "Avant {product} : {pain}. Après : {benefit}."],
    ["price", "{product} costs less than your daily coffee", "{product} coûte moins cher que votre café quotidien"],
    ["over", "You are overpaying for {benefit}. Here is why.", "Vous payez trop cher pour {benefit}. Voici pourquoi."],
    ["secret", "The secret {audience} use to get {benefit}", "Le secret de {audience} pour obtenir {benefit}"],
    ["mistake", "The number one mistake {audience} make with {pain}", "L'erreur numéro un de {audience} face à {pain}"],
    ["wait", "Wait for it. {product} changes everything.", "Attendez la fin. {product} change tout."],
    ["honest", "Honest review: {product} after 30 days", "Avis honnête : {product} après 30 jours"],
    ["dont", "Don't buy {product} before you watch this", "N'achetez pas {product} avant d'avoir vu ça"],
    ["myth", "Myth: {pain} is normal. It is not.", "Mythe : {pain}, c'est normal. Faux."],
    ["asked", "You asked, so here it is: how to get {benefit}", "Vous l'avez demandé : comment obtenir {benefit}"],
    ["three_s", "In 3 seconds I'll show you how to get {benefit}", "En 3 secondes, je vous montre comment obtenir {benefit}"],
    ["call", "If you are {audience}, stop scrolling", "Si vous êtes {audience}, arrêtez de scroller"],
    ["hack", "The {pain} hack nobody talks about", "L'astuce contre {pain} dont personne ne parle"],
    ["tell", "Tell me you need {product} without telling me", "Dites que vous avez besoin de {product} sans le dire"],
    ["rank", "I tested every option for {pain}. {product} won.", "J'ai testé toutes les options contre {pain}. {product} a gagné."],
    ["almost", "I almost gave up on {pain}, then I found {product}", "J'allais abandonner à cause de {pain}, puis j'ai trouvé {product}"],
    ["days", "{benefit} in 7 days? I tested it.", "{benefit} en 7 jours ? Je l'ai testé."],
    ["only", "Made for {audience} only: {product}", "Fait uniquement pour {audience} : {product}"]
  ];
  var ANGLES = [
    ["problem", "Problem and solution", "Problème et solution", "Open on the pain of {p}, then show {p} solving it.", "Ouvrez sur la douleur, puis montrez {p} qui la résout."],
    ["proof", "Social proof", "Preuve sociale", "Stack reviews, numbers and real messages about {p}.", "Empilez avis, chiffres et vrais messages sur {p}."],
    ["demo", "Demo", "Démonstration", "Show {p} working in one unbroken take.", "Montrez {p} en action en un seul plan continu."],
    ["compare", "Comparison", "Comparaison", "Put {p} next to the usual option and let the difference show.", "Mettez {p} à côté de l'option habituelle et laissez la différence parler."],
    ["objection", "Objection handling", "Réponse aux objections", "Name the doubt people have about {p} and answer it in one scene.", "Nommez le doute sur {p} et répondez-y en une scène."],
    ["ugc", "UGC testimonial", "Témoignage UGC", "A real customer talks to camera about {p}, no script feel.", "Un vrai client parle à la caméra de {p}, sans effet de script."],
    ["unbox", "Unboxing", "Déballage", "First touch, first reaction, first use of {p}.", "Premier contact, première réaction, première utilisation de {p}."],
    ["bts", "Behind the scenes", "Coulisses", "Show how {p} is made, packed or prepared.", "Montrez comment {p} est fabriqué, emballé ou préparé."],
    ["founder", "Founder story", "Histoire du fondateur", "The founder says why {p} exists, in their own words.", "Le fondateur explique pourquoi {p} existe, avec ses mots."],
    ["price", "Price and value", "Prix et valeur", "Break down what you get for the price of {p}.", "Détaillez ce que l'on obtient pour le prix de {p}."],
    ["routine", "Routine", "Routine", "Fit {p} into a real morning or evening routine.", "Intégrez {p} dans une vraie routine du matin ou du soir."],
    ["myth", "Myth busting", "Idées reçues", "Take a common belief about {p} and prove it wrong.", "Prenez une idée reçue sur {p} et prouvez qu'elle est fausse."]
  ];
  // Shot ideas by product type: [broll[], hero[]] in [en, fr]
  var SHOTS = {
    food: {
      b: [["Steam rising from the dish", "Vapeur qui monte du plat"], ["Hands tearing or breaking the food", "Mains qui déchirent ou cassent le plat"], ["Slow pour of sauce or syrup", "Sauce ou sirop versé au ralenti"], ["Chopping and prep close-up", "Gros plan sur la découpe"], ["Packaging being opened", "Ouverture de l'emballage"], ["Sizzle in the pan", "Grésillement dans la poêle"], ["Table full of shared plates", "Table remplie de plats à partager"], ["First bite reaction", "Réaction à la première bouchée"]],
      h: [["Hero plate on a clean surface, top-down", "Plat héros sur surface propre, vue du dessus"], ["Cross-section showing the inside", "Coupe montrant l'intérieur"], ["Pack shot with ingredients around it", "Packshot entouré des ingrédients"], ["Hand lifting the product toward camera", "Main qui tend le produit vers la caméra"], ["Cheese pull or crunch close-up", "Gros plan sur le fromage qui s'étire ou le croustillant"]]
    },
    beauty: {
      b: [["Texture swipe on the back of the hand", "Texture étalée sur le dos de la main"], ["Drop falling from the dropper", "Goutte qui tombe de la pipette"], ["Applying in the mirror", "Application devant le miroir"], ["Shelf or bathroom counter flat lay", "Flat lay étagère ou salle de bain"], ["Skin close-up in natural light", "Gros plan de la peau en lumière naturelle"], ["Cap twist and pump sound", "Bouchon et pompe en son direct"], ["Hair or face being touched after use", "Visage ou cheveux touchés après usage"], ["Morning routine montage", "Montage de routine du matin"]],
      h: [["Bottle on a clean colored backdrop", "Flacon sur fond uni coloré"], ["Before and after side by side", "Avant et après côte à côte"], ["Product held up next to the face", "Produit tenu à côté du visage"], ["Texture macro with light glint", "Macro de la texture avec reflet de lumière"], ["Full range lined up", "Toute la gamme alignée"]]
    },
    fashion: {
      b: [["Fabric detail and stitching close-up", "Gros plan sur le tissu et les coutures"], ["Walking shot, feet to head", "Plan en marchant, des pieds à la tête"], ["Getting dressed, mirror check", "Habillage et coup d'oeil au miroir"], ["Tag and label detail", "Détail de l'étiquette"], ["Folding or hanging the piece", "Pièce pliée ou accrochée"], ["Twirl or movement shot", "Plan en mouvement"], ["Accessories laid out", "Accessoires disposés"], ["Packing an order", "Préparation d'une commande"]],
      h: [["Full outfit on a plain wall", "Tenue complète sur mur uni"], ["Three ways to style one piece", "Trois façons de porter une même pièce"], ["Fit check from the front, side and back", "Essayage de face, de côté et de dos"], ["Close-up of the key detail", "Gros plan sur le détail clé"], ["Model holding the piece to camera", "Modèle qui présente la pièce"]]
    },
    tech: {
      b: [["Hand pressing the button or switch", "Main qui appuie sur le bouton"], ["Plugging in and powering on", "Branchement et allumage"], ["Screen close-up while in use", "Gros plan de l'écran en usage"], ["Unboxing and cable reveal", "Déballage et câbles"], ["Product next to a coin or hand for scale", "Produit à côté d'une pièce ou d'une main pour l'échelle"], ["Desk setup flat lay", "Flat lay du bureau"], ["Using it on the go", "Utilisation en déplacement"], ["Before: the old clumsy way", "Avant : l'ancienne façon compliquée"]],
      h: [["Product floating on a dark backdrop", "Produit sur fond sombre"], ["The one feature shown in 5 seconds", "La fonction clé montrée en 5 secondes"], ["Side by side with a competitor", "Côte à côte avec un concurrent"], ["Exploded view or parts laid out", "Vue éclatée ou pièces alignées"], ["Result shot: the problem solved", "Plan résultat : le problème résolu"]]
    },
    home: {
      b: [["Room before and after tidy", "Pièce avant et après rangement"], ["Hand wiping or placing the item", "Main qui essuie ou pose l'objet"], ["Morning light across the room", "Lumière du matin dans la pièce"], ["Item in daily use by family", "Objet utilisé au quotidien en famille"], ["Texture and material close-up", "Gros plan matière et texture"], ["Setting the table or arranging shelves", "Mise de table ou rangement d'étagères"], ["Pet or child reacting", "Réaction d'un animal ou d'un enfant"], ["Assembly in time-lapse", "Montage en accéléré"]],
      h: [["Item styled in a real living room", "Objet mis en scène dans un vrai salon"], ["Dimensions shown with a hand or tape", "Dimensions montrées avec une main ou un mètre"], ["Problem versus fixed side by side", "Problème et solution côte à côte"], ["Top-down flat lay of the set", "Flat lay du lot vu du dessus"], ["Product in its best spot at golden hour", "Produit à sa meilleure place à l'heure dorée"]]
    },
    resto: {
      b: [["Chef at work in the kitchen", "Le chef au travail en cuisine"], ["Coffee pour or latte art", "Café versé ou latte art"], ["Door opening, first guests in", "Porte qui s'ouvre, premiers clients"], ["Menu board and counter details", "Ardoise et détails du comptoir"], ["Plates leaving the pass", "Plats qui sortent du passe"], ["Friends laughing at the table", "Amis qui rient à table"], ["Terrace and street atmosphere", "Ambiance de la terrasse et de la rue"], ["Staff greeting a guest", "Accueil d'un client par l'équipe"]],
      h: [["Signature dish, top-down and side", "Plat signature, vue du dessus et de côté"], ["The place at its busiest hour", "Le lieu à l'heure de pointe"], ["Order to table in 15 seconds", "De la commande à la table en 15 secondes"], ["Owner presenting the best seller", "Le patron qui présente le best-seller"], ["Wide shot of the room with warm light", "Plan large de la salle en lumière chaude"]]
    },
    service: {
      b: [["Typing, notes or sketching at the desk", "Écriture, notes ou croquis au bureau"], ["Client meeting handshake", "Poignée de main avec un client"], ["Phone ringing or message notifications", "Appels ou notifications de messages"], ["Walking into the workplace", "Entrée dans le lieu de travail"], ["Whiteboard or screen with the process", "Tableau ou écran avec le process"], ["Tools of the trade laid out", "Outils du métier disposés"], ["Result delivered to a happy client", "Résultat livré à un client satisfait"], ["Coffee and early morning prep", "Café et préparation tôt le matin"]],
      h: [["Talking head: who you help and how", "Face caméra : qui vous aidez et comment"], ["Before and after of a client result", "Avant et après d'un résultat client"], ["Three steps of the process on screen", "Les trois étapes du process à l'écran"], ["Client quote over a real photo", "Citation client sur une vraie photo"], ["You in action doing the work", "Vous en pleine action"]]
    }
  };
  var TYPE_ORDER = ["food", "beauty", "fashion", "tech", "home", "resto", "service"];
  var PACES = { slow: 2.2, normal: 2.6, fast: 3.0 };
  var FORMATS = ["reel", "ad", "story", "yt", "other"];

  // ---------- state (kept while the page re-renders) ----------
  var T = {
    hk: { product: "", pain: "", benefit: "", audience: "", lang: "" },
    tm: { idea: "", text: "", pace: "normal" },
    an: { product: "", sel: {}, project: "" },
    br: { type: "food", sel: {}, idea: "" },
    rf: { tag: "" },
    cp: { idea: "", hook: "", body: "", cta: "", emoji: false, tags: "", seeded: "" }
  };
  var pending = { hook: "", del: "" };
  var TOOLS = ["hooks", "timer", "angles", "broll", "refs", "caps"];

  function can() { return m.can("ideas"); }
  function lang() { return GK.i18n && GK.i18n.lang ? GK.i18n.lang() : "en"; }
  function li() { return lang() === "fr" ? 1 : 0; }
  function words(s) { return (String(s || "").trim().match(/\S+/g) || []).length; }
  function ideasSorted() { return S.all("ideas").slice().sort(function (a, b) { return String(a.title || "").localeCompare(String(b.title || "")); }); }
  function ideaLabel(i) { return (i.clientId && m.client(i.clientId) ? m.brand(i.clientId) + " · " : "") + (i.title || "—"); }
  function ideaOptions(first) { return [["", first]].concat(ideasSorted().map(function (i) { return [i.id, ideaLabel(i)]; })); }
  function copy(text) { u.copy(text).then(function (ok) { ui.toast(ok ? t("ct_copied") : t("write_failed")); }); }
  function curTool() { var k = ui.p("studio").tool; return TOOLS.indexOf(k) > -1 ? k : "hooks"; }
  function sec(title, note) { return '<div class="stack" style="gap:2px"><h3 class="sec" style="margin:0">' + esc(title) + "</h3>" + (note ? '<span class="small muted">' + esc(note) + "</span>" : "") + "</div>"; }
  function fld(tool, k, label, o) {
    o = o || {};
    var isSel = o.type === "select";
    return ui.field({ id: "ct-" + tool + "-" + k, label: label, type: o.type, rows: o.rows, value: T[tool][k], options: o.options, placeholder: o.ph, span: o.span, hint: o.hint,
      attrs: (isSel ? ' data-c="ct-f"' : ' data-i="ct-f"') + ' data-t="' + tool + '" data-k="' + k + '"' + (o.full ? ' data-full="1"' : "") + (o.dir ? ' dir="auto"' : "") });
  }

  // ---------- 1. hook builder ----------
  function hookVals() {
    var h = T.hk, i = li();
    return { product: h.product.trim(), pain: h.pain.trim(), benefit: h.benefit.trim(), audience: h.audience.trim(), ph: ["product", "pain", "benefit", "audience"].reduce(function (o, k) { o[k] = "[" + t("ct_p_" + k) + "]"; return o; }, {}), i: i };
  }
  function fill(tpl, v, html) {
    return tpl.replace(/\{(product|pain|benefit|audience)\}/g, function (_, k) {
      var val = v[k];
      if (val) return html ? esc(val) : val;
      return html ? '<i class="ct-ph">' + esc(v.ph[k]) + "</i>" : v.ph[k];
    });
  }
  function hookRows() {
    var l = T.hk.lang || lang(), rows = [];
    HOOKS.forEach(function (h) {
      if (l !== "fr") rows.push({ id: h[0], l: "en", tpl: h[1] });
      if (l !== "en") rows.push({ id: h[0], l: "fr", tpl: h[2] });
    });
    return rows;
  }
  function hooksOut() {
    var v = hookVals(), rows = hookRows();
    return '<div class="row between" style="flex-wrap:wrap;gap:var(--sp-2)"><span class="lab sm muted">' + esc(t("ct_hook_n", { n: rows.length })) + "</span>" +
      ui.btn(t("ct_copy_all"), "ct-h-copyall", { cls: "ghost sm", icon: "copy" }) + '</div><div class="list">' +
      rows.map(function (r, n) {
        return '<div class="li ct-li"><div class="stack" style="gap:2px;flex:1 1 220px;min-width:0"><span class="ct-txt">' + fill(r.tpl, v, true) + '</span><span class="lab sm faint">' + r.l.toUpperCase() + "</span></div>" +
          '<div class="row" style="gap:6px;flex:none">' + ui.btn(t("copy"), "ct-h-copy", { cls: "ghost sm", data: { n: n } }) +
          (can() ? ui.btn(t("ct_save_idea"), "ct-h-save", { cls: "sm", data: { n: n } }) : "") + "</div></div>";
      }).join("") + "</div>";
  }
  function hooksTool() {
    var h = T.hk;
    return sec(t("ct_t_hooks"), t("ct_h_note")) +
      '<div class="form ct-form">' + fld("hk", "product", t("ct_f_product"), { ph: t("ct_ph_product") }) + fld("hk", "pain", t("ct_f_pain"), { ph: t("ct_ph_pain") }) +
      fld("hk", "benefit", t("ct_f_benefit"), { ph: t("ct_ph_benefit") }) + fld("hk", "audience", t("ct_f_audience"), { ph: t("ct_ph_audience") }) +
      fld("hk", "lang", t("ct_lang"), { type: "select", full: true, options: [["en", t("ct_l_en")], ["fr", t("ct_l_fr")], ["both", t("ct_l_both")]] }) + "</div>" +
      '<div id="ct-out" class="stack">' + hooksOut() + "</div>";
  }
  GK.act("ct-h-copyall", function () { var v = hookVals(); copy(hookRows().map(function (r) { return fill(r.tpl, v, false); }).join("\n")); });
  GK.act("ct-h-copy", function (el) { var r = hookRows()[+el.dataset.n]; if (r) copy(fill(r.tpl, hookVals(), false)); });
  GK.act("ct-h-save", function (el) {
    if (!can()) return ui.toast(t("ct_no_rights"));
    var r = hookRows()[+el.dataset.n]; if (!r) return;
    pending.hook = fill(r.tpl, hookVals(), false);
    ui.modal({
      title: t("ct_hs_title"), accent: t("ct_hs_accent"), label: t("ct_t_hooks"),
      body: '<p style="margin:0">“' + esc(pending.hook) + "”</p>" +
        ui.field({ id: "ct-hs-idea", label: t("ct_hs_idea"), type: "select", value: "", options: ideaOptions(t("ct_hs_new")), attrs: ' data-c="ct-hs-sel"' }) +
        '<div id="ct-hs-newbox">' + ui.field({ id: "ct-hs-title", label: t("ct_hs_title_f"), value: T.hk.product.trim() }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("ct_hs_do"), "ct-h-save-do", { cls: "primary" })
    });
  });
  GK.change("ct-hs-sel", function (el) { var b = document.getElementById("ct-hs-newbox"); if (b) b.hidden = !!el.value; });
  GK.act("ct-h-save-do", function () {
    if (!can()) return ui.toast(t("ct_no_rights"));
    var id = u.val("ct-hs-idea"), hook = pending.hook;
    if (id && S.get("ideas", id)) {
      var i = S.get("ideas", id);
      if (!String(i.hook || "").trim()) { S.patch("ideas", id, { hook: hook }, { log: t("ct_hs_log") }); ui.toast(t("ct_hs_set")); }
      else {
        var note = t("ct_hs_opt", { h: hook }), cur = String(i.notes || "").trim();
        S.patch("ideas", id, { notes: cur ? cur + "\n" + note : note }, { log: t("ct_hs_log") }); ui.toast(t("ct_hs_note"));
      }
    } else {
      var title = u.val("ct-hs-title").trim();
      if (!title) { u.focus("ct-hs-title"); return ui.toast(t("required")); }
      var me = GK.me();
      S.put("ideas", {
        title: title, stage: "idea", clientId: "", projectId: "", angleId: "", angle: "", objective: "", audience: T.hk.audience.trim(), creativeType: "brand",
        offer: "", objection: "", proof: "", cta: "", hook: hook, concept: "", script: "", scenes: [], mode: "D", format: "9x16",
        refs: [], boardId: "", owner: me ? me.id : "", tags: [], priority: 2, reelId: "", created: u.today(), shareOk: false, reviewAsked: false, notes: ""
      }, { log: t("ct_hs_log") });
      ui.toast(t("ct_hs_created"));
    }
    ui.closeModal(true);
  });

  // ---------- 2. script timer ----------
  function ideaLines(i) {
    var out = [];
    (i.scenes || []).forEach(function (s) { if (!s.silent && String(s.x || "").trim()) out.push(String(s.x).trim()); if (String(s.xd || "").trim()) out.push(String(s.xd).trim()); });
    String(i.script || "").split("\n").forEach(function (l) { if (l.trim()) out.push(l.trim()); });
    String(i.scriptDarija || "").split("\n").forEach(function (l) { if (l.trim()) out.push(l.trim()); });
    return out;
  }
  function timerOut() {
    var rate = PACES[T.tm.pace] || 2.6, lines = T.tm.text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return ui.empty(t("ct_tm_empty"));
    var total = 0, rows = lines.map(function (l) { var w = words(l), s = w / rate, at = total; total += s; return { l: l, w: w, s: s, at: at }; });
    var secs = Math.round(total), w = u.sum(rows, function (r) { return r.w; });
    var lvl = secs > 60 ? "60" : secs > 45 ? "45" : secs > 30 ? "30" : "ok";
    var pct = Math.min(100, Math.round(total / 60 * 100));
    return '<div class="ct-stats"><div><span class="lab sm muted">' + esc(t("ct_tm_secs")) + '</span><b class="big num">' + secs + '</b></div><div><span class="lab sm muted">' + esc(t("ct_tm_words")) +
      '</span><b class="big num">' + w + '</b></div><div><span class="lab sm muted">' + esc(t("ct_tm_lines")) + '</span><b class="big num">' + rows.length + "</b></div></div>" +
      '<div class="ct-meter" role="img" aria-label="' + secs + 's"><i class="' + (lvl === "ok" ? "" : "warn") + '" style="width:' + pct + '%"></i><s style="left:50%"></s><s style="left:75%"></s></div>' +
      '<div class="ct-scale small faint"><span>0</span><span style="left:50%">30s</span><span style="left:75%">45s</span><span style="left:100%">60s</span></div>' +
      '<p class="ct-warn ' + (lvl === "ok" ? "ok" : "bad") + '">' + esc(t(lvl === "ok" ? "ct_tm_ok" : "ct_tm_w" + lvl)) + "</p>" +
      '<div class="list">' + rows.map(function (r) {
        return '<div class="li ct-li"><span class="ct-txt" dir="auto" style="flex:1 1 200px;min-width:0">' + esc(r.l) + '</span><span class="small muted num" style="flex:none">' +
          esc(t("ct_tm_at", { s: Math.round(r.at) })) + " · " + r.w + " · " + (Math.round(r.s * 10) / 10) + "s</span></div>";
      }).join("") + "</div>";
  }
  function timerTool() {
    return sec(t("ct_t_timer")) +
      '<div class="form ct-form">' + ui.field({ id: "ct-tm-idea", label: t("ct_tm_pick"), type: "select", value: T.tm.idea, options: ideaOptions(t("ct_tm_none")), attrs: ' data-c="ct-tm-pick"' }) +
      fld("tm", "pace", t("ct_tm_pace"), { type: "select", options: [["slow", t("ct_tm_slow")], ["normal", t("ct_tm_normal")], ["fast", t("ct_tm_fast")]] }) + "</div>" +
      fld("tm", "text", t("ct_tm_text"), { type: "textarea", rows: 7, ph: t("ct_tm_ph"), dir: true }) +
      '<div id="ct-out" class="stack">' + timerOut() + "</div>";
  }
  GK.change("ct-tm-pick", function (el) {
    T.tm.idea = el.value;
    var i = el.value && S.get("ideas", el.value);
    if (i) T.tm.text = ideaLines(i).join("\n");
    paint();
  });

  // ---------- 3. angle finder ----------
  function angProduct() { return T.an.product.trim() || t("ct_an_the_product"); }
  function angSelected() { return ANGLES.filter(function (a) { return T.an.sel[a[0]]; }); }
  function angleOut() {
    var sel = angSelected(), pj = S.all("projects").slice().sort(function (a, b) { return m.projectLabel(a).localeCompare(m.projectLabel(b)); });
    return '<div class="row between" style="flex-wrap:wrap;gap:var(--sp-2)"><span class="lab sm muted">' + esc(t("ct_an_sel", { n: sel.length })) + "</span>" +
      ui.btn(t("ct_an_copy"), "ct-an-copy", { cls: "ghost sm", icon: "copy", disabled: !sel.length }) + "</div>" +
      (m.can("projects.edit") ? (pj.length ? '<div class="form ct-form" style="align-items:end">' +
        ui.field({ id: "ct-an-project", label: t("ct_an_project"), type: "select", value: T.an.project, options: [["", t("ct_an_pick")]].concat(pj.map(function (p) { return [p.id, m.projectLabel(p)]; })), attrs: ' data-c="ct-f" data-t="an" data-k="project" data-nopaint="1"' }) +
        '<div class="field">' + ui.btn(t("ct_an_add"), "ct-an-add", { cls: "sm", disabled: !sel.length }) + "</div></div>" : '<p class="small muted" style="margin:0">' + esc(t("ct_an_no_pj")) + "</p>") : "");
  }
  function angleChecks() {
    var p = angProduct(), i = li();
    return '<div class="ct-grid">' + ANGLES.map(function (a) {
      return '<label class="check ct-opt"><input type="checkbox" data-c="ct-chk" data-t="an" data-k="' + a[0] + '"' + (T.an.sel[a[0]] ? " checked" : "") + '><span><strong>' + esc(a[1 + i]) +
        '</strong><br><span class="small muted" id="ct-an-p-' + a[0] + '">' + esc(a[3 + i].replace(/\{p\}/g, p)) + "</span></span></label>";
    }).join("") + "</div>";
  }
  function anglePlan() {
    var p = angProduct();
    return t("ct_an_plan", { p: p }) + "\n\n" + angSelected().map(function (a, n) { return (n + 1) + ". " + a[1 + li()] + ": " + a[3 + li()].replace(/\{p\}/g, p); }).join("\n");
  }
  function anglesTool() {
    return sec(t("ct_t_angles"), t("ct_an_note")) + '<div class="form ct-form">' + fld("an", "product", t("ct_f_product"), { ph: t("ct_ph_product") }) + "</div>" +
      '<div id="ct-an-list">' + angleChecks() + '</div><div id="ct-out" class="stack">' + angleOut() + "</div>";
  }
  GK.act("ct-an-copy", function () { if (angSelected().length) copy(anglePlan()); });
  GK.act("ct-an-add", function () {
    if (!m.can("projects.edit")) return ui.toast(t("ct_no_rights"));
    var p = T.an.project && S.get("projects", T.an.project);
    if (!p) return ui.toast(t("ct_an_pick"));
    var have = (p.angles || []).map(function (a) { return String(a.name || "").toLowerCase(); }), add = [];
    angSelected().forEach(function (a) {
      var name = a[1 + li()];
      if (have.indexOf(name.toLowerCase()) < 0) add.push({ id: u.uid("a"), name: name, why: a[3 + li()].replace(/\{p\}/g, angProduct()) });
    });
    if (!add.length) return ui.toast(t("ct_an_dup"));
    S.patch("projects", p.id, { angles: (p.angles || []).concat(add) }, { log: t("ct_an_added", { n: add.length }) });
    ui.toast(t("ct_an_added", { n: add.length }));
  });

  // ---------- 4. B-roll and hero shots ----------
  function brKey(kind, n) { return kind + n; }
  function brPicked() {
    var s = SHOTS[T.br.type] || SHOTS.food, out = [];
    s.h.forEach(function (x, n) { if (T.br.sel[brKey("hero", n)]) out.push({ kind: "hero", text: x[li()] }); });
    s.b.forEach(function (x, n) { if (T.br.sel[brKey("broll", n)]) out.push({ kind: "broll", text: x[li()] }); });
    return out;
  }
  function brollOut() {
    var n = brPicked().length;
    if (!can()) return '<span class="lab sm muted">' + esc(t("ct_br_sel", { n: n })) + "</span>";
    if (!S.all("ideas").length) return '<p class="small muted" style="margin:0">' + esc(t("ct_br_none")) + "</p>";
    return '<span class="lab sm muted">' + esc(t("ct_br_sel", { n: n })) + '</span><div class="form ct-form" style="align-items:end">' +
      ui.field({ id: "ct-br-idea", label: t("ct_br_video"), type: "select", value: T.br.idea, options: ideaOptions(t("ct_br_pick")), attrs: ' data-c="ct-f" data-t="br" data-k="idea" data-nopaint="1"' }) +
      '<div class="field">' + ui.btn(t("ct_br_add"), "ct-br-add", { cls: "primary sm", disabled: !n }) + "</div></div>";
  }
  function brollList() {
    var s = SHOTS[T.br.type] || SHOTS.food, i = li();
    function group(label, kind, arr) {
      return '<div class="stack" style="gap:2px"><span class="lab sm muted">' + esc(label) + "</span>" + arr.map(function (x, n) {
        return '<label class="check ct-opt"><input type="checkbox" data-c="ct-chk" data-t="br" data-k="' + brKey(kind, n) + '"' + (T.br.sel[brKey(kind, n)] ? " checked" : "") + "><span>" + esc(x[i]) + "</span></label>";
      }).join("") + "</div>";
    }
    return '<div class="ct-cols">' + group(t("ct_br_hero"), "hero", s.h) + group(t("ct_br_broll"), "broll", s.b) + "</div>";
  }
  function brollTool() {
    return sec(t("ct_t_broll")) +
      '<div class="form ct-form">' + ui.field({ id: "ct-br-type", label: t("ct_br_type"), type: "select", value: T.br.type, options: TYPE_ORDER.map(function (k) { return [k, t("ct_ty_" + k)]; }), attrs: ' data-c="ct-f" data-t="br" data-k="type" data-full="1" data-reset="1"' }) + "</div>" +
      '<div id="ct-br-list">' + brollList() + '</div><div id="ct-out" class="stack">' + brollOut() + "</div>";
  }
  GK.act("ct-br-add", function () {
    if (!can()) return ui.toast(t("ct_no_rights"));
    var i = T.br.idea && S.get("ideas", T.br.idea);
    if (!i) return ui.toast(t("ct_br_pick"));
    var picked = brPicked(), needs = (i.needs || []).slice(), have = needs.map(function (x) { return x.kind + "|" + String(x.text).toLowerCase(); }), n = 0;
    picked.forEach(function (p) {
      if (have.indexOf(p.kind + "|" + p.text.toLowerCase()) > -1) return;
      needs.push({ id: u.uid("nd"), kind: p.kind, text: p.text, done: false }); n++;
    });
    if (!n) return ui.toast(t("ct_br_dup"));
    S.patch("ideas", i.id, { needs: needs }, { log: "" });
    T.br.sel = {}; paint();
    ui.toast(t("ct_br_added", { n: n }));
  });

  // ---------- 5. reference library ----------
  function refs() { var c = S.config() || {}; return Array.isArray(c.creativeRefs) ? c.creativeRefs.filter(function (r) { return r && r.id; }) : []; }
  function saveRefs(list) { return S.setConfig({ creativeRefs: list }); }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url; } }
  function fmtName(k) { return t("ct_fm_" + (FORMATS.indexOf(k) > -1 ? k : "other")); }
  function refsOut() {
    var all = refs(), tags = {};
    all.forEach(function (r) { (r.tags || []).forEach(function (g) { tags[g] = (tags[g] || 0) + 1; }); });
    var tag = T.rf.tag && tags[T.rf.tag] ? T.rf.tag : "";
    var rows = all.filter(function (r) { return !tag || (r.tags || []).indexOf(tag) > -1; });
    var h = '<div class="ct-chips">' + ['<button type="button" class="ct-chip" data-a="ct-rf-tag" data-v="" aria-pressed="' + !tag + '">' + esc(t("ct_rf_all")) + " " + all.length + "</button>"]
      .concat(Object.keys(tags).sort().map(function (g) { return '<button type="button" class="ct-chip" data-a="ct-rf-tag" data-v="' + esc(g) + '" aria-pressed="' + (tag === g) + '">#' + esc(g) + " " + tags[g] + "</button>"; })).join("") + "</div>";
    if (!all.length) return h + ui.empty({ icon: "boards", text: t("ct_rf_empty") });
    return h + '<div class="list">' + rows.map(function (r) {
      var ok = /^https?:\/\/\S+$/i.test(r.url || "");
      return '<div class="li ct-li"><div class="stack" style="gap:3px;flex:1 1 220px;min-width:0"><span class="ct-txt" style="overflow-wrap:anywhere">' + esc(r.note || hostOf(r.url)) + '</span>' +
        '<span class="small muted" style="overflow-wrap:anywhere">' + esc([hostOf(r.url), fmtName(r.format), r.angle].filter(Boolean).join(" · ")) + "</span>" +
        ((r.tags || []).length ? '<span class="small">' + r.tags.map(function (g) { return "#" + esc(g); }).join(" ") + "</span>" : "") + "</div>" +
        '<div class="row" style="gap:6px;flex:none">' + (ok ? '<a class="btn ghost sm" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t("ct_rf_open")) + "</a>" : "") +
        (can() ? ui.btn(t("ct_rf_del"), "ct-rf-del", { cls: "ghost sm", data: { id: r.id } }) : "") + "</div></div>";
    }).join("") + "</div>";
  }
  function refsTool() {
    return '<div class="row between" style="flex-wrap:wrap;gap:var(--sp-2)">' + sec(t("ct_t_refs"), t("ct_rf_n", { n: refs().length })) +
      (can() ? ui.btn(t("ct_rf_add"), "ct-rf-add", { cls: "primary sm", icon: "plus" }) : "") + '</div><div id="ct-out" class="stack">' + refsOut() + "</div>";
  }
  GK.act("ct-rf-tag", function (el) { T.rf.tag = el.dataset.v || ""; outRepaint(); });
  GK.act("ct-rf-add", function () {
    if (!can()) return ui.toast(t("ct_no_rights"));
    ui.modal({
      title: t("ct_rf_new_t"), accent: t("ct_rf_new_a"), label: t("ct_t_refs"),
      body: ui.field({ id: "ct-rf-url", label: t("ct_rf_url"), type: "url", placeholder: t("ct_rf_url_ph") }) +
        ui.field({ id: "ct-rf-note", label: t("ct_rf_note"), type: "textarea", rows: 2 }) +
        '<div class="form">' + ui.field({ id: "ct-rf-format", label: t("ct_rf_format"), type: "select", value: "reel", options: FORMATS.map(function (k) { return [k, fmtName(k)]; }) }) +
        ui.field({ id: "ct-rf-angle", label: t("ct_rf_angle"), type: "select", value: "", options: [["", "—"]].concat(ANGLES.map(function (a) { return [a[1 + li()], a[1 + li()]]; })) }) + "</div>" +
        ui.field({ id: "ct-rf-tags", label: t("ct_rf_tags"), placeholder: "ramadan, ugc, hook" }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "ct-rf-save", { cls: "primary" })
    });
  });
  GK.act("ct-rf-save", function () {
    if (!can()) return ui.toast(t("ct_no_rights"));
    var url = u.val("ct-rf-url").trim();
    if (!/^https?:\/\/\S+$/i.test(url)) { u.focus("ct-rf-url"); return ui.toast(t("ct_rf_bad")); }
    var tags = u.val("ct-rf-tags").split(",").map(function (s) { return s.trim().replace(/^#/, "").toLowerCase(); }).filter(Boolean).slice(0, 8);
    var rec = { id: u.uid("rf"), url: url, note: u.val("ct-rf-note").trim(), tags: tags, format: u.val("ct-rf-format"), angle: u.val("ct-rf-angle"), added: u.today() };
    if (!saveRefs([rec].concat(refs()))) return ui.toast(t("ct_no_rights"));
    ui.closeModal(true); ui.toast(t("ct_rf_saved"));
  });
  GK.act("ct-rf-del", function (el) {
    if (!can()) return ui.toast(t("ct_no_rights"));
    pending.del = el.dataset.id;
    ui.modal({
      title: t("ct_rf_del_t"), label: t("ct_t_refs"), body: '<p class="muted" style="margin:0">' + esc(t("ct_rf_del_b")) + "</p>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("ct_rf_del"), "ct-rf-del-yes", { cls: "primary" })
    });
  });
  GK.act("ct-rf-del-yes", function () {
    if (!can()) return ui.toast(t("ct_no_rights"));
    if (!saveRefs(refs().filter(function (r) { return r.id !== pending.del; }))) return ui.toast(t("ct_no_rights"));
    pending.del = ""; ui.closeModal(true); ui.toast(t("ct_rf_deleted"));
  });

  // ---------- 6. caption helper ----------
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ""); }
  function seedTags(i) {
    var out = (i.tags || []).map(slug);
    if (i.clientId && m.client(i.clientId)) out.push(slug(m.brand(i.clientId)));
    out = out.concat(["tunisie", "reels"]);
    return out.filter(function (x, n) { return x && out.indexOf(x) === n; }).slice(0, 6).map(function (x) { return "#" + x; }).join(" ");
  }
  function seedCaption(id) {
    var i = id && S.get("ideas", id), c = T.cp;
    c.idea = id; c.seeded = id;
    if (i) {
      c.hook = String(i.hook || i.title || "");
      c.body = String(i.concept || (ideaLines(i)[0] || ""));
      c.cta = String(i.cta || "") || c.cta;
      c.tags = seedTags(i);
    }
  }
  function captionDrafts() {
    var c = T.cp, hook = c.hook.trim(), body = c.body.trim(), cta = c.cta.trim() || t("ct_cp_cta_d"), em = !!c.emoji;
    if (!hook) return [];
    var pre = em ? "✨ " : "", arrow = em ? "👇 " : "";
    var i = c.idea && S.get("ideas", c.idea), lines = i ? ideaLines(i).slice(0, 3) : body.split("\n").filter(Boolean).slice(0, 3);
    var out = [{ k: "ct_cp_short", text: pre + hook + "\n\n" + arrow + cta }];
    if (body) out.push({ k: "ct_cp_mid", text: pre + hook + "\n\n" + body + "\n\n" + arrow + cta });
    if (lines.length > 1) out.push({ k: "ct_cp_list", text: pre + hook + "\n\n" + lines.map(function (l) { return (em ? "• " : "- ") + l; }).join("\n") + "\n\n" + arrow + cta });
    return out;
  }
  function captionsOut() {
    var d = captionDrafts(), tags = T.cp.tags.trim();
    if (!d.length) return ui.empty(t("ct_cp_empty"));
    return d.map(function (x, n) {
      return '<article class="panel ct-cap"><div class="row between" style="flex-wrap:wrap;gap:var(--sp-2)"><span class="lab sm muted">' + esc(t(x.k)) + '</span><span class="row" style="gap:6px">' +
        ui.btn(t("ct_cp_copy"), "ct-cp-copy", { cls: "ghost sm", data: { n: n } }) + (tags ? ui.btn(t("ct_cp_copy_t"), "ct-cp-copy", { cls: "sm", data: { n: n, tags: 1 } }) : "") + '</span></div>' +
        '<p class="ct-txt" dir="auto" style="white-space:pre-line;margin:0">' + esc(x.text) + (tags ? "\n\n" + esc(tags) : "") + "</p></article>";
    }).join("");
  }
  function capsTool() {
    var c = T.cp;
    if (!c.seeded && !c.hook) seedCaption("");
    return sec(t("ct_t_caps")) +
      '<div class="form ct-form">' + ui.field({ id: "ct-cp-idea", label: t("ct_cp_idea"), type: "select", value: c.idea, options: ideaOptions(t("ct_cp_manual")), attrs: ' data-c="ct-cp-pick"' }) +
      fld("cp", "cta", t("ct_cp_cta"), { ph: t("ct_cp_cta_d") }) + "</div>" +
      fld("cp", "hook", t("ct_cp_hook"), { dir: true }) + fld("cp", "body", t("ct_cp_body"), { type: "textarea", rows: 2, dir: true }) +
      ui.field({ id: "ct-cp-emoji", label: t("ct_cp_emoji"), type: "checkbox", value: c.emoji, attrs: ' data-c="ct-cp-emoji"' }) +
      fld("cp", "tags", t("ct_cp_tags"), { type: "textarea", rows: 2, hint: t("ct_cp_tags_hint"), dir: true }) +
      '<div id="ct-out" class="stack">' + captionsOut() + "</div>";
  }
  GK.change("ct-cp-pick", function (el) { seedCaption(el.value); paint(); });
  GK.change("ct-cp-emoji", function (el) { T.cp.emoji = el.checked; outRepaint(); });
  GK.act("ct-cp-copy", function (el) {
    var d = captionDrafts()[+el.dataset.n]; if (!d) return;
    copy(d.text + (el.dataset.tags && T.cp.tags.trim() ? "\n\n" + T.cp.tags.trim() : ""));
  });

  // ---------- shared plumbing ----------
  var BODY = { hooks: hooksTool, timer: timerTool, angles: anglesTool, broll: brollTool, refs: refsTool, caps: capsTool };
  var OUT = { hooks: hooksOut, timer: timerOut, angles: angleOut, broll: brollOut, refs: refsOut, caps: captionsOut };
  function paint() { var r = document.getElementById("ct-root"); if (r) r.innerHTML = BODY[curTool()](); }
  function outRepaint() { var o = document.getElementById("ct-out"); if (o) o.innerHTML = OUT[curTool()](); }
  if (GK.input) GK.input("ct-f", function (el) {
    var tl = el.dataset.t; if (!T[tl]) return;
    T[tl][el.dataset.k] = el.value;
    if (tl === "an" && el.dataset.k === "product") { var l = document.getElementById("ct-an-list"); if (l) l.innerHTML = angleChecks(); }
    outRepaint();
  });
  GK.change("ct-f", function (el) {
    var tl = el.dataset.t; if (!T[tl]) return;
    T[tl][el.dataset.k] = el.value;
    if (el.dataset.reset) T.br.sel = {};
    if (el.dataset.nopaint) return;
    if (el.dataset.full) paint(); else outRepaint();
  });
  GK.change("ct-chk", function (el) {
    var tl = el.dataset.t; if (!T[tl]) return;
    if (el.checked) T[tl].sel[el.dataset.k] = true; else delete T[tl].sel[el.dataset.k];
    outRepaint();
  });
  GK.act("ct-tool", function (el) { ui.go("studio", { mode: "tools", tool: el.dataset.v, id: "" }); });

  GK.studioTools = {
    html: function () {
      var tool = curTool();
      return '<div class="ct-pick" role="tablist">' + TOOLS.map(function (k) {
        return '<button type="button" role="tab" class="ct-tab" data-a="ct-tool" data-v="' + k + '" aria-selected="' + (tool === k) + '">' + esc(t("ct_t_" + k)) + "</button>";
      }).join("") + '</div><section class="panel ct-root" id="ct-root">' + BODY[tool]() + "</section>";
    },
    HOOKS: HOOKS, ANGLES: ANGLES, SHOTS: SHOTS
  };

  if (typeof document === "undefined") return;
  var css = document.createElement("style"); css.id = "gk-studio-tools-css";
  css.textContent =
    ".ct-pick{display:flex;flex-wrap:wrap;gap:6px}" +
    ".ct-tab{font-family:var(--f-type);font-weight:700;letter-spacing:0;text-transform:none;font-size:12px;min-height:40px;padding:0 12px;border:1px solid var(--line);background:transparent;color:var(--tx);cursor:pointer;border-radius:0}" +
    ".ct-tab[aria-selected=true]{background:var(--chroma);color:var(--b-ink);border-color:var(--tx)}" +
    ".ct-root{display:flex;flex-direction:column;gap:var(--sp-3);min-width:0;animation:rise .28s ease both}" +
    ".ct-form{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}" +
    ".ct-li{flex-wrap:wrap;gap:var(--sp-2);align-items:center}.ct-txt{overflow-wrap:anywhere}" +
    ".ct-ph{font-style:normal;color:var(--tx-2);border-bottom:1px dashed var(--line)}" +
    ".ct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:0 var(--sp-3)}" +
    ".ct-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:var(--sp-3)}" +
    ".ct-opt{border-bottom:1px solid var(--line);min-width:0;overflow-wrap:anywhere}" +
    ".ct-stats{display:flex;gap:var(--sp-5);flex-wrap:wrap}.ct-stats div{display:flex;flex-direction:column}" +
    ".ct-meter{position:relative;height:12px;border:1px solid var(--tx);background:transparent}.ct-meter i{display:block;height:100%;background:var(--chroma);transition:width .25s ease}.ct-meter i.warn{background:var(--gel)}" +
    ".ct-meter s{position:absolute;top:0;bottom:0;width:1px;background:var(--tx);text-decoration:none}" +
    ".ct-scale{position:relative;height:16px}.ct-scale span{position:absolute;transform:translateX(-50%);top:0}.ct-scale span:first-child{left:0;transform:none}.ct-scale span:last-child{transform:translateX(-100%)}" +
    ".ct-warn{margin:0;padding:8px 10px;border:1px solid var(--line);border-left:4px solid var(--chroma)}.ct-warn.bad{border-left-color:var(--gel)}" +
    ".ct-chips{display:flex;flex-wrap:wrap;gap:6px}.ct-chip{min-height:32px;padding:0 10px;border:1px solid var(--line);background:transparent;color:var(--tx);font-size:12px;cursor:pointer;border-radius:0}" +
    ".ct-chip[aria-pressed=true]{background:var(--chroma);color:var(--b-ink);border-color:var(--tx)}" +
    ".ct-cap{gap:var(--sp-2);min-width:0}" +
    ".ct-root,.ct-root .field,.ct-root .in,.ct-root input,.ct-root select,.ct-root textarea{max-width:100%;min-width:0}";
  document.head.appendChild(css);
})(window.GK);
