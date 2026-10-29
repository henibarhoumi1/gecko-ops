/* GECKO Ops · module: clients_onboarding. The onboarding sheet: everything Gecko needs before pre-production.
   The client fills it in their portal (signed in, or through their live page link); the team sees and edits the same sheet in the
   client workspace, live. Answers are saved field by field to the database (client_onboarding), never to this browser.
   Exposes GK.onboarding for clientmode.js. Words are prefixed ob_. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, S = GK.store, esc = u.esc, HUB = GK.clientHub;

  GK.i18n.add({
    ob_tab: ["Onboarding", "Onboarding"],
    ob_head: ["Let's get to know {brand}", "Faisons connaissance avec {brand}"],
    ob_lede: ["Everything we need to start pre-production. Skip anything you are not sure about.", "Tout ce qu'il nous faut pour lancer la préproduction. Passez ce dont vous n'êtes pas sûr."],
    ob_team_lede: ["The client fills this in their portal. Fill it together on a call: both screens update live.", "Le client remplit ceci dans son portail. Remplissez-le ensemble pendant un appel : les deux écrans se mettent à jour en direct."],
    ob_loading: ["Loading the sheet…", "Chargement de la fiche…"],
    ob_load_err: ["The sheet could not load. Check the connection and try again.", "La fiche n'a pas pu se charger. Vérifiez la connexion et réessayez."],
    ob_retry: ["Try again", "Réessayer"],
    ob_live: ["Live", "En direct"], ob_off: ["Reconnecting…", "Reconnexion…"], ob_saving: ["Saving…", "Enregistrement…"],
    ob_local: ["Saved in this workspace", "Enregistré dans cet espace"],
    ob_pct: ["{n}% filled", "{n} % rempli"], ob_count: ["{a} of {b}", "{a} sur {b}"],
    ob_next: ["Next", "Suivant"], ob_back: ["Back", "Retour"], ob_review: ["Review and send", "Relire et envoyer"], ob_summary: ["Summary", "Résumé"],
    ob_send_h: ["Ready to send?", "Prêt à envoyer ?"],
    ob_send_b: ["Gaps are fine: we cover them together. Press send and Gecko gets everything.", "Les trous ne posent pas de problème : on les complète ensemble. Envoyez et Gecko reçoit tout."],
    ob_send: ["Send to Gecko", "Envoyer à Gecko"], ob_resend: ["Send the update", "Envoyer la mise à jour"],
    ob_sent_ok: ["Sent. Gecko has your answers.", "Envoyé. Gecko a vos réponses."],
    ob_sent_on: ["Sent to Gecko on {date}", "Envoyé à Gecko le {date}"],
    ob_sent_team: ["The client sent it on {date}", "Le client l'a envoyé le {date}"], ob_not_sent: ["Not sent by the client yet", "Pas encore envoyé par le client"],
    ob_open_n: ["{n} still open", "{n} encore à remplir"], ob_all_done: ["Every question has an answer.", "Toutes les questions ont une réponse."],
    ob_wa: ["Hello GECKO, the {brand} onboarding is filled in.", "Bonjour GECKO, l'onboarding de {brand} est rempli."],
    ob_save_err: ["Not saved: {e}", "Non enregistré : {e}"],
    ob_copy: ["Copy answers", "Copier les réponses"], ob_copied: ["Answers copied.", "Réponses copiées."],
    ob_other: ["Other…", "Autre…"], ob_add_row: ["Add", "Ajouter"], ob_remove: ["Remove", "Retirer"],
    ob_have: ["We have it", "On l'a"], ob_help: ["Need help", "Besoin d'aide"], ob_none: ["Not needed", "Pas nécessaire"], ob_pick: ["Choose", "Choisir"],
    ob_link: ["Link", "Lien"], ob_not_set: ["Not set", "Non défini"], ob_tone: ["Tone", "Ton"],
    ob_need: ["Fill in your onboarding so we can start pre-production.", "Remplissez votre onboarding pour qu'on lance la préproduction."],
    ob_preview: ["Preview: the client sees this sheet and fills it in.", "Aperçu : le client voit cette fiche et la remplit."]
  });

  // ---------- the questions ([English, French]; picked options are stored in English) ----------
  function F(id, type, label, o) { return Object.assign({ id: id, type: type, label: label }, o || {}); }
  var Q = [
    { id: "basics", name: ["Basics", "Bases"], title: ["Who we are working with", "Avec qui on travaille"], why: ["Names, links and the person we talk to day to day.", "Noms, liens et la personne avec qui on échange au quotidien."], fields: [
      F("brand", "text", ["Brand name", "Nom de la marque"], { half: 1 }),
      F("company", "text", ["Company name on invoices", "Raison sociale pour les factures"], { half: 1, ph: ["If different from the brand", "Si différente de la marque"] }),
      F("contact", "text", ["Your name", "Votre nom"], { half: 1 }),
      F("role", "text", ["Your role", "Votre rôle"], { half: 1, ph: ["Founder, marketing manager…", "Fondateur, responsable marketing…"] }),
      F("phone", "text", ["WhatsApp", "WhatsApp"], { half: 1, input: "tel" }),
      F("email", "text", ["Email", "E-mail"], { half: 1, input: "email" }),
      F("site", "text", ["Website or online store", "Site ou boutique en ligne"], { half: 1, input: "url" }),
      F("insta", "text", ["Instagram", "Instagram"], { half: 1, ph: ["@yourbrand", "@votremarque"] }),
      F("tiktok", "text", ["TikTok", "TikTok"], { half: 1, ph: ["@yourbrand", "@votremarque"] }),
      F("where", "picks", ["Where you sell", "Où vous vendez"], { other: 1, opts: [["Online store", "Boutique en ligne"], ["Instagram DMs", "DM Instagram"], ["Own shop", "Votre boutique"], ["Retailers", "Revendeurs"], ["Marketplaces", "Marketplaces"], ["Abroad", "À l'étranger"]] }),
      F("since", "pick", ["How long the brand has been running", "Depuis quand la marque existe"], { opts: [["Not launched yet", "Pas encore lancée"], ["Under 1 year", "Moins d'un an"], ["1 to 3 years", "1 à 3 ans"], ["3 to 10 years", "3 à 10 ans"], ["Over 10 years", "Plus de 10 ans"]] })
    ] },
    { id: "brand", name: ["Brand", "Marque"], title: ["Your brand, in your words", "Votre marque, avec vos mots"], why: ["So every video sounds and looks like you, not like a template.", "Pour que chaque vidéo vous ressemble, pas à un modèle."], fields: [
      F("oneline", "text", ["Describe the brand in one sentence", "Décrivez la marque en une phrase"], { ph: ["We make … for … who want …", "On fait … pour … qui veulent …"] }),
      F("story", "long", ["How it started, and why", "Comment tout a commencé, et pourquoi"], { ph: ["The real story. It often becomes the best ad.", "La vraie histoire. Elle fait souvent la meilleure pub."] }),
      F("words", "picks", ["Three words people should feel about you", "Trois mots que les gens doivent ressentir"], { other: 1, opts: [["Premium", "Premium"], ["Fun", "Fun"], ["Bold", "Audacieux"], ["Trusted", "Fiable"], ["Natural", "Naturel"], ["Modern", "Moderne"], ["Local pride", "Fierté locale"], ["Warm", "Chaleureux"], ["Expert", "Expert"], ["Edgy", "Décalé"], ["Elegant", "Élégant"], ["Affordable", "Accessible"]] }),
      F("tone1", "scale", "", { left: ["Playful", "Joueur"], right: ["Serious", "Sérieux"] }),
      F("tone2", "scale", "", { left: ["Loud", "Fort"], right: ["Calm", "Calme"] }),
      F("tone3", "scale", "", { left: ["Everyday", "Quotidien"], right: ["Luxury", "Luxe"] }),
      F("tone4", "scale", "", { left: ["Tunisian", "Tunisien"], right: ["International", "International"] }),
      F("lang", "picks", ["Languages for the videos", "Langues des vidéos"], { other: 1, opts: [["Tunisian", "Tunisien"], ["French", "Français"], ["English", "Anglais"], ["Arabic", "Arabe"], ["No voice, text only", "Sans voix, texte seul"]] }),
      F("never", "long", ["Anything we should never say or show", "Ce qu'on ne doit jamais dire ou montrer"], { ph: ["Words, topics, colours, competitors, claims…", "Mots, sujets, couleurs, concurrents, promesses…"] })
    ] },
    { id: "products", name: ["Products", "Produits"], title: ["What we are selling", "Ce qu'on vend"], why: ["The products to feature first, and what makes each one sell.", "Les produits à mettre en avant, et ce qui fait vendre chacun."], fields: [
      F("hero", "list", ["Products to feature", "Produits à mettre en avant"], { cols: [["name", ["Product", "Produit"]], ["price", ["Price", "Prix"]], ["why", ["Why people buy it", "Pourquoi on l'achète"]], ["link", ["Link", "Lien"], "url"]] }),
      F("best", "long", ["Your best seller, and why you think it sells", "Votre meilleure vente, et pourquoi elle marche"]),
      F("priority", "long", ["What you need to sell more of right now", "Ce que vous devez vendre davantage maintenant"], { ph: ["New stock, a slow product, a high margin item…", "Nouveau stock, produit lent, forte marge…"] }),
      F("launches", "long", ["Launches, promos or seasons coming up", "Lancements, promos ou saisons à venir"], { ph: ["New collection in March, Ramadan, summer sale…", "Collection en mars, Ramadan, soldes d'été…"] }),
      F("offer", "picks", ["Offers you can use in ads", "Offres utilisables dans les pubs"], { other: 1, opts: [["Free delivery", "Livraison gratuite"], ["Discount code", "Code promo"], ["Bundle", "Pack"], ["Gift with order", "Cadeau offert"], ["Cash on delivery", "Paiement à la livraison"], ["Exchange or refund", "Échange ou remboursement"]] })
    ] },
    { id: "audience", name: ["Audience", "Clientèle"], title: ["Who buys from you", "Qui achète chez vous"], why: ["Who we are talking to, what they want and what stops them.", "À qui on parle, ce qu'ils veulent et ce qui les freine."], fields: [
      F("who", "long", ["Describe your typical customer", "Décrivez votre client type"], { ph: ["A 28 year old in Tunis who…", "Une personne de 28 ans à Tunis qui…"] }),
      F("age", "picks", ["Age", "Âge"], { opts: [["Under 18", "Moins de 18"], ["18 to 24", "18 à 24"], ["25 to 34", "25 à 34"], ["35 to 44", "35 à 44"], ["45 to 54", "45 à 54"], ["55+", "55+"]] }),
      F("gender", "pick", ["Mostly", "Surtout"], { opts: [["Women", "Femmes"], ["Men", "Hommes"], ["Both", "Les deux"]] }),
      F("loc", "picks", ["Where they are", "Où ils sont"], { other: 1, opts: [["Grand Tunis", "Grand Tunis"], ["Sahel", "Sahel"], ["Sfax", "Sfax"], ["All of Tunisia", "Toute la Tunisie"], ["Maghreb", "Maghreb"], ["Europe", "Europe"], ["Gulf", "Golfe"]] }),
      F("want", "long", ["What they want when they buy from you", "Ce qu'ils cherchent en achetant chez vous"], { ph: ["The feeling or result, not the product.", "Le ressenti ou le résultat, pas le produit."] }),
      F("stop", "picks", ["What makes people hesitate", "Ce qui fait hésiter"], { other: 1, opts: [["Price", "Le prix"], ["Trust", "La confiance"], ["Quality doubts", "Doutes sur la qualité"], ["Delivery time", "Délai de livraison"], ["Sizing", "Les tailles"], ["Don't know the brand", "Ne connaissent pas la marque"], ["Cheaper copies", "Copies moins chères"]] }),
      F("quotes", "long", ["Things customers actually say about you", "Ce que vos clients disent vraiment"], { ph: ["Paste reviews, DMs or comments.", "Collez des avis, DM ou commentaires."] })
    ] },
    { id: "selling", name: ["Selling points", "Arguments"], title: ["Why you, and not someone else", "Pourquoi vous, et pas un autre"], why: ["The promise and the proof every ad is built on.", "La promesse et les preuves sur lesquelles repose chaque pub."], fields: [
      F("promise", "text", ["The main promise of the brand", "La promesse principale de la marque"], { ph: ["If they remember one thing, it is…", "S'ils retiennent une chose, c'est…"] }),
      F("reasons", "list", ["Top reasons to buy", "Les meilleures raisons d'acheter"], { cols: [["reason", ["Reason", "Raison"]]] }),
      F("proof", "picks", ["Proof you can show", "Preuves à montrer"], { other: 1, opts: [["Reviews", "Avis"], ["Sales numbers", "Chiffres de vente"], ["Before and after", "Avant / après"], ["Press", "Presse"], ["Awards", "Prix"], ["Certifications", "Certifications"], ["Famous customers", "Clients connus"]] }),
      F("proofNote", "long", ["Numbers or facts we can quote", "Chiffres ou faits à citer"], { ph: ["10,000 orders, 4.9 stars, 3 years of warranty…", "10 000 commandes, 4,9 étoiles, 3 ans de garantie…"] })
    ] },
    { id: "market", name: ["Market", "Marché"], title: ["Competitors and references", "Concurrents et références"], why: ["What is out there, and the content you love or never want.", "Ce qui existe, et le contenu que vous aimez ou refusez."], fields: [
      F("rivals", "list", ["Main competitors", "Principaux concurrents"], { cols: [["name", ["Name", "Nom"]], ["link", ["Instagram or site", "Instagram ou site"], "url"], ["note", ["What they do well or badly", "Ce qu'ils font bien ou mal"]]] }),
      F("admire", "long", ["Brands you admire, from any industry", "Marques que vous admirez, tous secteurs"]),
      F("refs", "list", ["Ads or videos you love", "Pubs ou vidéos que vous aimez"], { cols: [["link", ["Link", "Lien"], "url"], ["note", ["What you like about it", "Ce qui vous plaît"]]] }),
      F("avoid", "long", ["Content you don't want to look like", "Le contenu auquel vous ne voulez pas ressembler"])
    ] },
    { id: "goals", name: ["Goals", "Objectifs"], title: ["What this project has to do", "Ce que ce projet doit accomplir"], why: ["One clear goal decides the hooks, the length and the call to action.", "Un objectif clair décide des accroches, de la durée et de l'appel à l'action."], fields: [
      F("goal", "pick", ["Main goal", "Objectif principal"], { other: 1, opts: [["More sales", "Plus de ventes"], ["Launch a product", "Lancer un produit"], ["Get known", "Se faire connaître"], ["More messages and leads", "Plus de messages et de prospects"], ["Visits to the shop", "Visites en boutique"], ["Grow the account", "Faire grandir le compte"]] }),
      F("success", "long", ["What would make this a success for you", "Ce qui ferait de ce projet un succès"], { ph: ["Cost per sale under…, 50 orders a week, sold out…", "Coût par vente sous…, 50 commandes par semaine, rupture de stock…"] }),
      F("channels", "picks", ["Where the videos will run", "Où les vidéos seront diffusées"], { other: 1, opts: [["Instagram ads", "Pubs Instagram"], ["TikTok ads", "Pubs TikTok"], ["Instagram posts", "Posts Instagram"], ["TikTok posts", "Posts TikTok"], ["Facebook", "Facebook"], ["YouTube", "YouTube"], ["Website", "Site web"], ["In store screens", "Écrans en boutique"]] }),
      F("ads", "pick", ["Do you run paid ads today?", "Faites-vous de la pub payante aujourd'hui ?"], { opts: [["Yes, we manage them", "Oui, on les gère"], ["Yes, an agency or freelancer does", "Oui, une agence ou un freelance"], ["Not yet", "Pas encore"]] }),
      F("results", "long", ["What has worked or flopped before", "Ce qui a marché ou échoué avant"], { ph: ["Share screenshots of results if you can.", "Partagez des captures de résultats si possible."] })
    ] },
    { id: "concepts", name: ["Ideas", "Idées"], title: ["Concepts and formats", "Concepts et formats"], why: ["Bring every idea you have. We shape them into scripts for your approval.", "Apportez toutes vos idées. On en fait des scripts à valider."], fields: [
      F("ideas", "long", ["Ideas you already have", "Les idées que vous avez déjà"], { ph: ["Rough is fine: a scene, a joke, a line, a trend.", "Brut, c'est bien : une scène, une blague, une phrase, une tendance."] }),
      F("formats", "picks", ["Formats you like", "Formats que vous aimez"], { other: 1, opts: [["Founder talking", "Le fondateur parle"], ["Customer style (UGC)", "Style client (UGC)"], ["Product demo", "Démo produit"], ["Before and after", "Avant / après"], ["Street interview", "Micro-trottoir"], ["Sketch or skit", "Sketch"], ["Unboxing", "Unboxing"], ["Tutorial", "Tutoriel"], ["Testimonial", "Témoignage"], ["Trend", "Tendance"], ["Cinematic", "Cinématique"]] }),
      F("face", "picks", ["Who appears on camera", "Qui apparaît à l'écran"], { opts: [["The founder", "Le fondateur"], ["Your team", "Votre équipe"], ["Actors or models", "Acteurs ou modèles"], ["Creators or influencers", "Créateurs ou influenceurs"], ["Hands and product only", "Mains et produit seulement"], ["Open to ideas", "Ouvert aux idées"]] }),
      F("must", "picks", ["Must appear in every video", "Doit apparaître dans chaque vidéo"], { other: 1, opts: [["Logo", "Logo"], ["Price", "Prix"], ["Promo code", "Code promo"], ["Website", "Site web"], ["Phone number", "Numéro de téléphone"], ["Delivery info", "Infos livraison"], ["Legal mention", "Mention légale"]] }),
      F("music", "pick", ["Music and sound", "Musique et son"], { opts: [["Trending sounds", "Sons tendance"], ["Calm and premium", "Calme et premium"], ["Energetic", "Énergique"], ["Local music", "Musique locale"], ["Voice over first", "Voix off d'abord"], ["Up to Gecko", "Au choix de Gecko"]] })
    ] },
    { id: "assets", name: ["Assets", "Fichiers"], title: ["Files we need from you", "Les fichiers qu'il nous faut"], why: ["Paste a Google Drive or WeTransfer link next to each one, or tell us you need help.", "Collez un lien Google Drive ou WeTransfer à côté de chacun, ou dites-nous si vous avez besoin d'aide."], fields: [
      F("files", "assets", ["Brand files", "Fichiers de marque"], { items: [["Logo (vector or PNG)", "Logo (vectoriel ou PNG)"], ["Brand guidelines", "Charte graphique"], ["Fonts", "Polices"], ["Product photos", "Photos produits"], ["Past videos and ads", "Anciennes vidéos et pubs"], ["Packaging", "Packaging"], ["Reviews and screenshots", "Avis et captures"]] }),
      F("colors", "list", ["Brand colours", "Couleurs de la marque"], { cols: [["hex", ["Colour", "Couleur"], "color"], ["name", ["Where it is used", "Où elle est utilisée"]]] }),
      F("drive", "text", ["One folder with everything", "Un dossier avec tout"], { input: "url", ph: ["Google Drive, Dropbox or WeTransfer link", "Lien Google Drive, Dropbox ou WeTransfer"] })
    ] },
    { id: "shoot", name: ["Shoot", "Tournage"], title: ["Shoot day", "Jour de tournage"], why: ["Where, when and what we need on set.", "Où, quand et ce qu'il faut sur le plateau."], fields: [
      F("place", "picks", ["Where we can shoot", "Où on peut tourner"], { other: 1, opts: [["Studio", "Studio"], ["Your shop", "Votre boutique"], ["Your office or workshop", "Votre bureau ou atelier"], ["A home", "Une maison"], ["Outdoors", "En extérieur"], ["Up to Gecko", "Au choix de Gecko"]] }),
      F("address", "text", ["Address, if at your place", "Adresse, si c'est chez vous"]),
      F("dates", "long", ["Dates that work, and dates to avoid", "Dates possibles, et dates à éviter"]),
      F("stock", "long", ["Products available for the shoot", "Produits disponibles pour le tournage"], { ph: ["Which ones, how many units, colours and sizes.", "Lesquels, combien, couleurs et tailles."] }),
      F("onset", "text", ["Who from your side comes on shoot day", "Qui vient de votre côté le jour J"]),
      F("rules", "long", ["Anything we should know about the place", "Ce qu'il faut savoir sur le lieu"], { ph: ["Opening hours, parking, permits, noise…", "Horaires, parking, autorisations, bruit…"] })
    ] },
    { id: "approvals", name: ["Approvals", "Validation"], title: ["Feedback and sign off", "Retours et validation"], why: ["Who decides, how we reach them and the dates that matter.", "Qui décide, comment le joindre et les dates importantes."], fields: [
      F("approver", "list", ["Who gives final approval", "Qui donne la validation finale"], { cols: [["name", ["Name", "Nom"]], ["role", ["Role", "Rôle"]], ["phone", ["WhatsApp or email", "WhatsApp ou e-mail"]]] }),
      F("others", "text", ["Anyone else who gives feedback", "Autres personnes qui donnent leur avis"]),
      F("channel", "pick", ["Best way to reach you", "Le meilleur moyen de vous joindre"], { opts: [["WhatsApp", "WhatsApp"], ["Email", "E-mail"], ["Phone call", "Appel"], ["Client portal", "Portail client"]] }),
      F("deadline", "text", ["Date the first videos must be live", "Date de mise en ligne des premières vidéos"], { half: 1, input: "date" }),
      F("notes", "long", ["Anything else", "Autre chose"])
    ] }
  ];
  var FIELDS = []; Q.forEach(function (s) { s.fields.forEach(function (f) { FIELDS.push(f); }); });

  function L(x) { return Array.isArray(x) ? (u.fr() && x[1] ? x[1] : x[0]) : (x || ""); }
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function same(a, b) { return JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b); }
  function filled(v) { return Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== ""; }
  function has(s, f) {
    if (f.type === "assets") return f.items.some(function (_, k) { return filled(s[f.id + "." + k]) || filled(s[f.id + "." + k + ".link"]); });
    return filled(s[f.id]) || filled(s[f.id + ".other"]);
  }
  function countOf(s, sec) { return sec.fields.filter(function (f) { return has(s, f); }).length; }
  function pctOf(s) { return Math.round(FIELDS.filter(function (f) { return has(s, f); }).length / FIELDS.length * 100); }

  // ---------- where a sheet lives: "c:<clientId>" (team), "me" (signed-in client), "t:<token>" (live page link) ----------
  function local() { return S.backend !== "supabase"; }
  function call(key, saveArgs) {
    var sb = GK.supabase, acc = S.publicShare && S.publicShare.account;
    if (key.indexOf("t:") === 0) {
      return saveArgs ? sb.rpc("save_shared_onboarding", { p_token: key.slice(2), p_patch: saveArgs.patch, p_sent: saveArgs.sent }, true)
        : sb.rpc("get_shared_onboarding", { p_token: key.slice(2) }, true);
    }
    var ws = key === "me" ? acc && acc.workspaceId : S.workspaceId, cid = key === "me" ? acc && acc.clientId : key.slice(2);
    if (!ws || !cid) return Promise.reject(new Error("No client access."));
    return saveArgs ? sb.rpc("save_client_onboarding", { p_workspace_id: ws, p_client_id: cid, p_patch: saveArgs.patch, p_sent: saveArgs.sent })
      : sb.rpc("get_client_onboarding", { p_workspace_id: ws, p_client_id: cid });
  }
  function localRow(key) {
    var c = S.get("clients", key.slice(2)), o = c && c.onboarding || {};
    return { data: o.data || {}, sentAt: o.sentAt || null };
  }
  function load(key) {
    if (local() && key.indexOf("c:") === 0) return Promise.resolve(localRow(key));
    return call(key);
  }
  function store(key, patch, sent) {
    if (local() && key.indexOf("c:") === 0) {
      var row = localRow(key), data = Object.assign({}, row.data);
      Object.keys(patch).forEach(function (k) { if (patch[k] == null) delete data[k]; else data[k] = patch[k]; });
      var next = { data: data, sentAt: sent ? new Date().toISOString() : row.sentAt };
      S.patch("clients", key.slice(2), { onboarding: next });
      return Promise.resolve(next);
    }
    return call(key, { patch: patch, sent: !!sent });
  }

  var SHEETS = {};
  function sheet(key) { return SHEETS[key] || (SHEETS[key] = { key: key, state: {}, synced: {}, loaded: false, failed: false, live: true, at: Q[0].id, sentAt: null }); }
  function rootOf(key) { return document.querySelector('.ob[data-ob="' + key.replace(/"/g, "") + '"]'); }

  // ---------- HTML ----------
  function nm(key, f) { return "ob-" + key.replace(/[^\w-]/g, "") + "-" + f; }
  function fieldHTML(key, f, s) {
    var lab = f.label ? '<span class="ob-l">' + esc(L(f.label)) + "</span>" : "", h = "";
    var ph = f.ph ? ' placeholder="' + esc(L(f.ph)) + '"' : "";
    if (f.type === "text") h = lab + '<input class="in" data-k="' + f.id + '" type="' + (f.input || "text") + '" value="' + esc(s[f.id] || "") + '"' + ph + ' autocomplete="off">';
    else if (f.type === "long") h = lab + '<textarea class="in" data-k="' + f.id + '" rows="2"' + ph + ">" + esc(s[f.id] || "") + "</textarea>";
    else if (f.type === "pick" || f.type === "picks") {
      var v = s[f.id], on = function (o) { return f.type === "pick" ? v === o : Array.isArray(v) && v.indexOf(o) > -1; };
      h = lab + '<div class="ob-chips">' + f.opts.map(function (o) {
        return '<label class="ob-chip"><input type="' + (f.type === "pick" ? "radio" : "checkbox") + '" name="' + nm(key, f.id) + '" data-k="' + f.id + '" value="' + esc(o[0]) + '"' + (on(o[0]) ? " checked" : "") + "><span>" + esc(L(o)) + "</span></label>";
      }).join("") + (f.other ? '<input class="in ob-other" data-k="' + f.id + '.other" value="' + esc(s[f.id + ".other"] || "") + '" placeholder="' + esc(t("ob_other")) + '">' : "") + "</div>";
    } else if (f.type === "scale") {
      var set = filled(s[f.id]);
      h = '<div class="ob-scale' + (set ? " set" : "") + '"><span>' + esc(L(f.left)) + '</span><input type="range" min="0" max="100" step="5" data-k="' + f.id + '" value="' + esc(set ? s[f.id] : "50") + '"' + (set ? ' data-set="1"' : "") + ' aria-label="' + esc(L(f.left) + " / " + L(f.right)) + '"><span>' + esc(L(f.right)) + "</span></div>";
    } else if (f.type === "list") {
      var rows = (Array.isArray(s[f.id]) ? s[f.id] : []).concat([{}]);
      h = lab + '<div class="ob-list" data-list="' + f.id + '" style="--cols:' + f.cols.length + '">' + rows.map(function (r, i) {
        return '<div class="ob-row">' + f.cols.map(function (c) {
          return '<input class="in" data-col="' + c[0] + '" type="' + (c[2] === "color" ? "text" : c[2] || "text") + '" value="' + esc(r[c[0]] || "") + '" placeholder="' + esc(L(c[1]) + (c[2] === "color" ? " #" : "")) + '" aria-label="' + esc(L(c[1])) + '">';
        }).join("") + (i < rows.length - 1 ? '<button type="button" class="btn ghost sm icon ob-x" data-a="ob-rm" data-i="' + i + '" aria-label="' + esc(t("ob_remove")) + '" title="' + esc(t("ob_remove")) + '">×</button>' : '<span class="ob-x"></span>') + "</div>";
      }).join("") + "</div>";
    } else if (f.type === "assets") {
      h = lab + '<div class="ob-assets">' + f.items.map(function (it, k) {
        var a = s[f.id + "." + k] || "";
        return '<div class="ob-asset"><span>' + esc(L(it)) + '</span><select class="in" data-k="' + f.id + "." + k + '"><option value="">' + esc(t("ob_pick")) + "</option>" +
          [["have", "ob_have"], ["help", "ob_help"], ["none", "ob_none"]].map(function (o) { return '<option value="' + o[0] + '"' + (a === o[0] ? " selected" : "") + ">" + esc(t(o[1])) + "</option>"; }).join("") +
          '</select><input class="in" type="url" data-k="' + f.id + "." + k + '.link" value="' + esc(s[f.id + "." + k + ".link"] || "") + '" placeholder="' + esc(t("ob_link")) + '"></div>';
      }).join("") + "</div>";
    }
    var wide = f.type === "list" || f.type === "assets" || ((f.type === "pick" || f.type === "picks") && f.opts.length > 6) || f.type === "long";
    return '<div class="ob-f' + (f.half ? " half" : "") + (wide ? " wide" : "") + (f.type === "scale" ? " sc" : "") + '" data-f="' + f.id + '">' + h + "</div>";
  }
  function toneHead(sec) { return sec.id === "brand" ? '<p class="ob-l ob-tone-h">' + esc(t("ob_tone")) + "</p>" : ""; }
  function partHTML(key, sec, i, sh) {
    var s = sh.state, body = "", toneDone = false;
    sec.fields.forEach(function (f) { if (f.type === "scale" && !toneDone) { body += toneHead(sec); toneDone = true; } body += fieldHTML(key, f, s); });
    var prev = Q[i - 1], next = Q[i + 1];
    return '<section class="ob-part" data-part="' + sec.id + '"' + (sh.at === sec.id ? "" : " hidden") + '><header><span class="ob-no">' + String(i + 1).padStart(2, "0") + '</span><div><h3>' + esc(L(sec.title)) + '</h3><p>' + esc(L(sec.why)) + "</p></div></header>" +
      '<div class="ob-grid">' + body + "</div>" +
      '<div class="ob-foot">' + (prev ? '<button type="button" class="btn ghost" data-a="ob-go" data-t="' + prev.id + '">← ' + esc(L(prev.name)) + "</button>" : "<span></span>") +
      '<button type="button" class="btn primary" data-a="ob-go" data-t="' + (next ? next.id : "send") + '">' + esc(next ? t("ob_next") + " · " + L(next.name) : (sh.team ? t("ob_summary") : t("ob_review"))) + " →</button></div></section>";
  }
  function sendHTML(sh) {
    var s = sh.state, open = 0;
    var rows = Q.map(function (sec, i) {
      var miss = sec.fields.filter(function (f) { return !has(s, f); }); open += miss.length;
      return miss.length ? '<button type="button" class="ob-gap" data-a="ob-go" data-t="' + sec.id + '"><span class="ob-no">' + String(i + 1).padStart(2, "0") + "</span><b>" + esc(L(sec.name)) + "</b><span>" + esc(miss.slice(0, 3).map(function (f) { return L(f.label) || L(f.left) + " / " + L(f.right); }).join(", ") + (miss.length > 3 ? "…" : "")) + '</span><span class="num">' + countOf(s, sec) + "/" + sec.fields.length + "</span></button>" : "";
    }).join("");
    var when = sh.sentAt ? u.fmtDate(sh.sentAt, { day: "numeric", month: "long" }) : "";
    var status = sh.team ? (when ? t("ob_sent_team", { date: when }) : t("ob_not_sent")) : (when ? t("ob_sent_on", { date: when }) : "");
    return '<section class="ob-part ob-send" data-part="send"' + (sh.at === "send" ? "" : " hidden") + "><header><span class=\"ob-no\">✓</span><div><h3>" + esc(sh.team ? t("ob_summary") : t("ob_send_h")) + "</h3>" +
      (sh.team ? "" : "<p>" + esc(t("ob_send_b")) + "</p>") + "</div></header>" +
      (status ? '<p class="ob-status' + (when ? " ok" : "") + '">' + esc(status) + "</p>" : "") +
      '<p class="ob-l">' + esc(open ? t("ob_open_n", { n: open }) : t("ob_all_done")) + "</p>" + (rows ? '<div class="ob-gaps">' + rows + "</div>" : "") +
      '<div class="ob-foot"><button type="button" class="btn ghost" data-a="ob-go" data-t="' + Q[Q.length - 1].id + '">← ' + esc(L(Q[Q.length - 1].name)) + "</button>" +
      (sh.team ? ui.btn(t("ob_copy"), "ob-copy", { data: { k: sh.key } }) : '<button type="button" class="btn primary" data-a="ob-send">' + esc(sh.sentAt ? t("ob_resend") : t("ob_send")) + "</button>") + "</div></section>";
  }
  function railHTML(sh) {
    return '<nav class="ob-rail" aria-label="' + esc(t("ob_tab")) + '">' + Q.map(function (sec, i) {
      var n = countOf(sh.state, sec), full = n === sec.fields.length;
      return '<button type="button" data-a="ob-go" data-t="' + sec.id + '"' + (sh.at === sec.id ? ' aria-current="true"' : "") + (full ? ' class="full"' : "") + '><span class="ob-no">' + String(i + 1).padStart(2, "0") + "</span>" + esc(L(sec.name)) + '<i style="--p:' + (n / sec.fields.length) + '"></i></button>';
    }).join("") + '<button type="button" data-a="ob-go" data-t="send"' + (sh.at === "send" ? ' aria-current="true"' : "") + '><span class="ob-no">✓</span>' + esc(sh.team ? t("ob_summary") : t("ob_send")) + "</button></nav>";
  }
  function statusText(sh) { return local() && sh.key.indexOf("c:") === 0 ? t("ob_local") : sh.live ? t("ob_live") : t("ob_off"); }
  function innerHTML(sh) {
    if (sh.failed && !sh.loaded) return '<p class="ob-l">' + esc(t("ob_load_err")) + "</p>" + ui.btn(t("ob_retry"), "ob-retry", { data: { k: sh.key } });
    if (!sh.loaded) return '<p class="ob-l ob-wait">' + esc(t("ob_loading")) + "</p>";
    var p = pctOf(sh.state);
    return '<div class="ob-top"><div class="ob-meter" aria-hidden="true"><i style="--p:' + p / 100 + '"></i></div><span class="ob-pct">' + esc(t("ob_pct", { n: p })) + '</span><span class="ob-live' + (sh.live ? " on" : "") + '" aria-live="polite"><i aria-hidden="true"></i>' + esc(statusText(sh)) + "</span></div>" +
      railHTML(sh) + Q.map(function (sec, i) { return partHTML(sh.key, sec, i, sh); }).join("") + sendHTML(sh);
  }

  // ---------- reading and writing the form ----------
  function read(root) {
    var s = {};
    root.querySelectorAll("[data-k]").forEach(function (el) {
      var k = el.getAttribute("data-k");
      if (el.type === "radio") { if (el.checked) s[k] = el.value; }
      else if (el.type === "checkbox") { if (el.checked) (s[k] = s[k] || []).push(el.value); }
      else if (el.type === "range") { if (el.getAttribute("data-set")) s[k] = el.value; }
      else if (el.value.trim()) s[k] = el.value;
    });
    root.querySelectorAll("[data-list]").forEach(function (box) {
      var rows = [];
      box.querySelectorAll(".ob-row").forEach(function (row) {
        var r = {}; row.querySelectorAll("[data-col]").forEach(function (el) { if (el.value.trim()) r[el.getAttribute("data-col")] = el.value; });
        if (Object.keys(r).length) rows.push(r);
      });
      if (rows.length) s[box.getAttribute("data-list")] = rows;
    });
    return s;
  }
  /** Repaint every field that changed, except the one being typed in. */
  function paint(sh, prev) {
    var root = rootOf(sh.key); if (!root) return;
    var ae = document.activeElement;
    FIELDS.forEach(function (f) {
      var keys = f.type === "assets" ? f.items.reduce(function (a, _, k) { return a.concat([f.id + "." + k, f.id + "." + k + ".link"]); }, []) : [f.id, f.id + ".other"];
      if (keys.every(function (k) { return same(prev[k], sh.state[k]); })) return;
      var box = root.querySelector('[data-f="' + f.id + '"]');
      if (!box || (ae && box.contains(ae) && f.type !== "pick" && f.type !== "picks" && f.type !== "scale" && f.type !== "assets")) return;
      var tmp = document.createElement("div"); tmp.innerHTML = fieldHTML(sh.key, f, sh.state);
      box.replaceWith(tmp.firstChild);
    });
    meters(sh);
  }
  function meters(sh) {
    var root = rootOf(sh.key); if (!root) return;
    var p = pctOf(sh.state), m = root.querySelector(".ob-meter i"), pc = root.querySelector(".ob-pct");
    if (m) m.style.setProperty("--p", p / 100);
    if (pc) pc.textContent = t("ob_pct", { n: p });
    Q.forEach(function (sec) {
      var b = root.querySelector('.ob-rail [data-t="' + sec.id + '"]'); if (!b) return;
      var n = countOf(sh.state, sec); b.classList.toggle("full", n === sec.fields.length);
      var i = b.querySelector("i"); if (i) i.style.setProperty("--p", n / sec.fields.length);
    });
    var live = root.querySelector(".ob-live"); if (live) { live.classList.toggle("on", sh.live); live.lastChild.textContent = statusText(sh); }
  }
  function repaintAll(sh) { var root = rootOf(sh.key); if (root) root.innerHTML = innerHTML(sh); }

  // ---------- sync: changes go up a moment after typing stops; every 2 s the page takes what others changed ----------
  function push(sh, sent) {
    if (sh.pushing) { sh.again = true; if (sent) sh.sendAfter = true; return Promise.resolve(); }
    var patch = {}, snap = clone(sh.state);
    Object.keys(Object.assign({}, snap, sh.synced)).forEach(function (k) { if (!same(snap[k], sh.synced[k])) patch[k] = snap[k] == null ? null : snap[k]; });
    if (!Object.keys(patch).length && !sent) return Promise.resolve();
    sh.pushing = true;
    return store(sh.key, patch, sent).then(function (row) {
      sh.synced = snap; sh.live = true; if (row && row.sentAt) sh.sentAt = row.sentAt;
    }, function (e) { sh.live = false; sh.err = e; if (sent) throw e; }).then(function () {
      sh.pushing = false; meters(sh);
      if (sh.again) { var s2 = sh.sendAfter; sh.again = sh.sendAfter = false; return push(sh, s2); }
    }, function (e) { sh.pushing = false; meters(sh); throw e; });
  }
  function pull(sh) {
    if (sh.pushing || !sh.loaded || (local() && sh.key.indexOf("c:") === 0)) return;
    if (!sh.live) { push(sh); }
    load(sh.key).then(function (row) {
      sh.live = true;
      var remote = row && row.data || {}; sh.sentAt = row && row.sentAt || sh.sentAt;
      if (same(remote, sh.synced)) { meters(sh); return; }
      var prev = clone(sh.state), next = clone(sh.state);
      Object.keys(Object.assign({}, remote, sh.synced)).forEach(function (k) {
        if (same(remote[k], sh.synced[k]) || !same(sh.state[k], sh.synced[k])) return;   // unchanged remotely, or changed here and not sent yet
        if (remote[k] === undefined) delete next[k]; else next[k] = remote[k];
      });
      sh.synced = clone(remote); sh.state = next; paint(sh, prev);
    }, function () { sh.live = false; meters(sh); });
  }
  function ensure(sh) {
    if (sh.loaded || sh.loading) return;
    sh.loading = true; sh.failed = false;
    load(sh.key).then(function (row) {
      sh.state = clone(row && row.data); sh.synced = clone(row && row.data); sh.sentAt = row && row.sentAt || null;
      sh.loaded = true; sh.live = true; sh.loading = false;
      if (sh.seed) Object.keys(sh.seed).forEach(function (k) { if (!filled(sh.state[k]) && filled(sh.seed[k])) sh.state[k] = sh.seed[k]; });
      repaintAll(sh); push(sh);
    }, function () { sh.loading = false; sh.failed = true; repaintAll(sh); });
  }
  setInterval(function () {
    if (document.hidden) return;
    Object.keys(SHEETS).forEach(function (k) { if (rootOf(k)) pull(SHEETS[k]); });
  }, 2000);

  function onEdit(ev) {
    var el = ev.target, root = el && el.closest && el.closest(".ob[data-ob]"); if (!root) return;
    var sh = SHEETS[root.getAttribute("data-ob")]; if (!sh || !sh.loaded) return;
    if (el.type === "range") { el.setAttribute("data-set", "1"); el.closest(".ob-scale").classList.add("set"); }
    if (el.tagName === "TEXTAREA") grow(el);
    if (el.closest("[data-list]") && ev.type === "input") {   // keep one empty row at the end of a list
      var box = el.closest("[data-list]"), rows = box.querySelectorAll(".ob-row"), last = rows[rows.length - 1];
      if (last.contains(el) && el.value.trim()) {
        sh.state = read(root);
        var f = FIELDS.find(function (x) { return x.id === box.getAttribute("data-list"); });
        var tmp = document.createElement("div"); tmp.innerHTML = fieldHTML(sh.key, f, sh.state);
        var row = tmp.querySelectorAll(".ob-row"); box.appendChild(row[row.length - 1]);
        var x = last.querySelector(".ob-x"); if (x) x.outerHTML = '<button type="button" class="btn ghost sm icon ob-x" data-a="ob-rm" data-i="' + (rows.length - 1) + '" aria-label="' + esc(t("ob_remove")) + '" title="' + esc(t("ob_remove")) + '">×</button>';
      }
    }
    sh.state = read(root); meters(sh);
    clearTimeout(sh.timer); sh.timer = setTimeout(function () { push(sh); }, 400);
  }
  document.addEventListener("input", onEdit);
  document.addEventListener("change", onEdit);
  function grow(ta) { ta.style.height = "auto"; ta.style.height = Math.max(44, ta.scrollHeight + 2) + "px"; }
  function growAll(root) { root.querySelectorAll("textarea").forEach(grow); }

  function sheetOf(el) { var root = el.closest(".ob[data-ob]"); return root && SHEETS[root.getAttribute("data-ob")]; }
  GK.act("ob-go", function (el) {
    var sh = sheetOf(el); if (!sh) return;
    sh.at = el.getAttribute("data-t"); var root = rootOf(sh.key);
    root.querySelectorAll(".ob-part").forEach(function (p) { p.hidden = p.getAttribute("data-part") !== sh.at; });
    root.querySelectorAll(".ob-rail button").forEach(function (b) { if (b.getAttribute("data-t") === sh.at) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    if (sh.at === "send") { var s = root.querySelector('[data-part="send"]'), tmp = document.createElement("div"); tmp.innerHTML = sendHTML(sh); s.replaceWith(tmp.firstChild); }
    var cur = root.querySelector('.ob-rail [aria-current="true"]'); if (cur && cur.scrollIntoView) try { cur.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    growAll(root);
    var top = root.getBoundingClientRect().top; if (top < 0) root.scrollIntoView({ block: "start" });
  });
  GK.act("ob-rm", function (el) {
    var sh = sheetOf(el); if (!sh) return;
    var box = el.closest("[data-list]"), id = box.getAttribute("data-list"), i = +el.getAttribute("data-i");
    sh.state = read(rootOf(sh.key));
    var rows = (sh.state[id] || []).slice(); rows.splice(i, 1);
    if (rows.length) sh.state[id] = rows; else delete sh.state[id];
    var f = FIELDS.find(function (x) { return x.id === id; }), tmp = document.createElement("div"); tmp.innerHTML = fieldHTML(sh.key, f, sh.state);
    box.closest(".ob-f").replaceWith(tmp.firstChild);
    meters(sh); push(sh);
  });
  GK.act("ob-retry", function (el) { var sh = SHEETS[el.getAttribute("data-k")]; if (sh) { sh.failed = false; repaintAll(sh); ensure(sh); } });
  GK.act("ob-send", function (el) {
    var sh = sheetOf(el); if (!sh || sh.team) return;
    if (el.closest("[data-preview]")) return ui.toast(t("cm_prev_nothing"));
    el.setAttribute("aria-disabled", "true");
    clearTimeout(sh.timer); sh.state = read(rootOf(sh.key));
    push(sh, true).then(function () {
      ui.toast(t("ob_sent_ok"));
      var brand = sh.state.brand || (S.publicShare && S.publicShare.snapshot && S.publicShare.snapshot.brand && S.publicShare.snapshot.brand.name) || "";
      if (GK.clientMode && GK.clientMode._waUrl) {
        var a = document.createElement("a"); a.href = GK.clientMode._waUrl(t("ob_wa", { brand: brand })); a.target = "_blank"; a.rel = "noopener noreferrer";
        a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove();
      }
      var s = rootOf(sh.key).querySelector('[data-part="send"]'), tmp = document.createElement("div"); tmp.innerHTML = sendHTML(sh); s.replaceWith(tmp.firstChild);
    }, function (e) { el.removeAttribute("aria-disabled"); ui.toast(t("ob_save_err", { e: e && e.message || "" })); });
  });
  function asText(sh) {
    var s = sh.state, out = [t("ob_tab").toUpperCase() + " · " + (s.brand || ""), ""];
    Q.forEach(function (sec, i) {
      var lines = [];
      sec.fields.forEach(function (f) {
        var v;
        if (f.type === "list") v = (s[f.id] || []).map(function (r) { return f.cols.map(function (c) { return r[c[0]]; }).filter(Boolean).join(" · "); });
        else if (f.type === "assets") v = f.items.map(function (it, k) { var a = s[f.id + "." + k], l = s[f.id + "." + k + ".link"]; return a || l ? L(it) + ": " + [a ? t("ob_" + a) : "", l || ""].filter(Boolean).join(" · ") : ""; }).filter(Boolean);
        else if (f.type === "scale") v = filled(s[f.id]) ? [L(f.left) + " " + (100 - s[f.id]) + " / " + L(f.right) + " " + s[f.id]] : [];
        else v = [].concat(s[f.id] || [], s[f.id + ".other"] || []).filter(Boolean);
        if (v.length) lines.push((L(f.label) || t("ob_tone")) + ": " + v.join(f.type === "list" || f.type === "assets" ? "\n  - " : ", "));
      });
      if (lines.length) out.push(String(i + 1).padStart(2, "0") + " " + L(sec.name).toUpperCase(), lines.join("\n"), "");
    });
    return out.join("\n").trim();
  }
  GK.act("ob-copy", function (el) {
    var sh = SHEETS[el.getAttribute("data-k")]; if (!sh) return;
    u.copy(asText(sh)).then(function (ok) { ui.toast(ok ? t("ob_copied") : t("write_failed")); });
  });

  function css() {
    if (document.getElementById("ob-css")) return;
    var st = document.createElement("style"); st.id = "ob-css";
    st.textContent = [
      ".ob{display:flex;flex-direction:column;gap:18px;color:var(--tx)}",
      ".ob .in{width:100%;border:1px solid var(--line);background:var(--s1,transparent);color:var(--tx);border-radius:10px;padding:10px 12px;font:inherit;font-size:15px;min-height:44px}",
      ".ob textarea.in{resize:none;overflow:hidden;line-height:1.45}",
      ".ob .in:focus{outline:none;border-color:var(--tx);box-shadow:0 0 0 3px color-mix(in srgb,var(--chroma) 60%,transparent)}",
      ".ob .in::placeholder{color:var(--tx-3)}",
      ".ob-top{display:flex;align-items:center;gap:14px}",
      ".ob-meter{flex:1;height:6px;background:var(--s2);border-radius:99px;overflow:hidden}.ob-meter i{display:block;height:100%;background:var(--b-mat,var(--tx));transform-origin:left;transform:scaleX(var(--p,0));transition:transform .4s var(--ease)}",
      ".ob-pct{font-weight:700;font-size:13px;white-space:nowrap}",
      ".ob-live{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--tx-2);white-space:nowrap}",
      ".ob-live i{width:8px;height:8px;border-radius:50%;background:#D9534F}.ob-live.on i{background:#2BB673;animation:ob-pulse 1.8s infinite}",
      "@keyframes ob-pulse{0%{box-shadow:0 0 0 0 rgba(43,182,115,.55)}70%{box-shadow:0 0 0 7px rgba(43,182,115,0)}100%{box-shadow:0 0 0 0 rgba(43,182,115,0)}}",
      ".ob-rail{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.ob-rail::-webkit-scrollbar{display:none}",
      ".ob-rail button{all:unset;box-sizing:border-box;cursor:pointer;flex:none;position:relative;display:inline-flex;align-items:center;gap:7px;padding:9px 13px 11px;border:1.5px solid var(--line);border-radius:999px;font-size:13px;font-weight:600;overflow:hidden}",
      ".ob-rail button i{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--b-mat,var(--tx));transform-origin:left;transform:scaleX(var(--p,0));transition:transform .3s var(--ease)}",
      ".ob-rail button.full{background:var(--b-mat-soft,var(--s2))}",
      ".ob-rail button[aria-current=true]{background:var(--b-ink,var(--tx));color:#fff;border-color:var(--b-ink,var(--tx))}",
      ".ob-rail button:focus-visible{outline:2px solid var(--tx);outline-offset:2px}",
      ".ob-no{font-size:11px;font-weight:700;opacity:.55;font-variant-numeric:tabular-nums}",
      ".ob-part{display:flex;flex-direction:column;gap:18px}.ob-part[hidden]{display:none}",
      ".ob-part>header{display:flex;gap:16px;align-items:flex-start;padding:22px;border-radius:14px;background:var(--b-pink-soft,var(--gel))}",
      ".ob-part:nth-of-type(3n+2)>header{background:var(--b-yellow-soft,var(--chroma))}.ob-part:nth-of-type(3n)>header,.ob-send>header{background:var(--b-mat,#2E6B4E);color:#fff}",
      ".ob-part>header .ob-no{font-size:clamp(34px,6vw,52px);line-height:.9;opacity:1;font-weight:700}",
      ".ob-part>header h3{margin:0 0 4px;font-size:clamp(22px,3.4vw,30px);line-height:1.1}.ob-part>header p{margin:0;opacity:.8;max-width:60ch}",
      ".ob-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 18px}",
      ".ob-f{grid-column:1/-1;display:flex;flex-direction:column;gap:8px;align-content:start}.ob-f.half{grid-column:auto}",
      ".ob-f.sc{grid-column:auto}",
      ".ob-l{margin:0;font-size:14px;font-weight:600;color:var(--tx)}.ob-tone-h{grid-column:1/-1;margin-bottom:-8px}",
      ".ob-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}",
      ".ob-chip{position:relative;cursor:pointer}.ob-chip input{position:absolute;opacity:0;pointer-events:none}",
      ".ob-chip span{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border:1.5px solid var(--line);border-radius:999px;font-size:14px;transition:background .15s,border-color .15s}",
      ".ob-chip:hover span{border-color:var(--tx)}.ob-chip input:checked+span{background:var(--b-ink,var(--tx));color:#fff;border-color:var(--b-ink,var(--tx))}",
      ".ob-chip input:focus-visible+span{outline:2px solid var(--tx);outline-offset:2px}",
      ".ob-other{width:auto;flex:1 1 160px;min-height:38px!important;border-radius:999px!important;padding:6px 14px!important}",
      ".ob-scale{display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;gap:10px;font-size:13px;padding:10px 14px;border:1.5px dashed var(--line);border-radius:12px}",
      ".ob-scale span:last-child{text-align:right}.ob-scale.set{border-style:solid;border-color:var(--tx)}",
      ".ob-scale input{width:100%;accent-color:var(--b-mat,var(--tx))}.ob-scale:not(.set) input{opacity:.45}",
      ".ob-list{display:flex;flex-direction:column;gap:8px}",
      ".ob-row{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr)) 36px;gap:8px;align-items:center}",
      ".ob-x{width:36px;height:36px;justify-content:center;padding:0}",
      ".ob-assets{display:flex;flex-direction:column;gap:8px}",
      ".ob-asset{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1.4fr);gap:8px;align-items:center;font-size:14px}",
      ".ob-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--line)}",
      ".ob-gaps{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden}",
      ".ob-gap{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:auto auto 1fr auto;gap:12px;align-items:baseline;padding:12px 14px;border-bottom:1px solid var(--line);font-size:14px}",
      ".ob-gap:last-child{border-bottom:0}.ob-gap:hover{background:var(--s2)}.ob-gap span:nth-child(3){color:var(--tx-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".ob-status{margin:0;padding:12px 14px;border-radius:12px;background:var(--s2);font-weight:600}.ob-status.ok{background:var(--b-mat-soft,var(--s2))}",
      ".ob-wait{opacity:.7}",
      "@media (max-width:640px){.ob-grid{grid-template-columns:1fr}.ob-f.half,.ob-f.sc{grid-column:1/-1}.ob-part>header{padding:16px;gap:12px}",
      ".ob-row{grid-template-columns:repeat(min(var(--cols),2),minmax(0,1fr)) 36px}.ob-row .ob-x{grid-row:1;grid-column:-2}.ob-row .in:nth-child(n+3){grid-column:span 1}",
      ".ob-asset{grid-template-columns:1fr 1fr}.ob-asset span{grid-column:1/-1}.ob-gap{grid-template-columns:auto 1fr auto}.ob-gap span:nth-child(3){display:none}.ob-top{flex-wrap:wrap}.ob-meter{flex-basis:100%;order:3}}"
    ].join("\n");
    document.head.appendChild(st);
  }

  // ---------- public ----------
  /** The sheet for a key ("c:<clientId>", "me", "t:<token>"). opts: {team, seed: {brand: …}}. */
  function formHTML(key, opts) {
    css(); opts = opts || {};
    var sh = sheet(key); sh.team = !!opts.team; if (opts.seed) sh.seed = opts.seed;
    if (local() && key.indexOf("c:") === 0) { var row = localRow(key); if (!sh.pushing && !sh.timer) { sh.state = clone(row.data); sh.synced = clone(row.data); } sh.sentAt = row.sentAt; sh.loaded = true; }
    else ensure(sh);
    setTimeout(function () { var r = rootOf(key); if (r) growAll(r); }, 0);
    return '<div class="ob" data-ob="' + esc(key) + '">' + innerHTML(sh) + "</div>";
  }
  GK.onboarding = {
    formHTML: formHTML,
    /** True once the sheet is known to have been sent to Gecko. */
    sent: function (key) { var sh = SHEETS[key]; return !!sh && !!sh.sentAt; }
  };

  // ---------- team side: a tab in the client workspace ----------
  if (!HUB) return;
  HUB.tab({ key: "onboarding", order: 15, label: function () { return t("ob_tab"); },
    render: function (c) {
      return '<section class="panel"><div class="panel-h"><div class="stack" style="gap:2px"><h2 class="sec">' + esc(t("ob_head", { brand: c.brand })) + '</h2><span class="small muted">' + esc(t("ob_team_lede")) + "</span></div></div>" +
        formHTML("c:" + c.id, { team: true, seed: { brand: c.brand } }) + "</section>";
    } });
})(window.GK);
