/**
 * The onboarding sheet: everything Gecko needs before pre-production. The client and the team fill
 * the same answers, stored in client_onboarding.
 * Text is [English, French]. Picked options are stored by their English label.
 *
 * How answers are stored, by field type:
 * - text, long: a string under the field id
 * - pick: one English label; picks: an array of English labels; "<id>.other" holds a typed extra answer
 * - scale: a string from "0" to "100"
 * - list: an array of rows, each an object keyed by column id
 * - assets: "<id>.<n>" is "have", "help" or "none", and "<id>.<n>.link" a link, for item n
 */

export type Words = readonly [string, string];

interface Base {
  id: string;
  label: Words | "";
  half?: number;
  ph?: Words;
}

export type Question =
  | (Base & { type: "text"; input?: "tel" | "email" | "url" | "date" })
  | (Base & { type: "long" })
  | (Base & { type: "pick" | "picks"; opts: readonly Words[]; other?: number })
  | (Base & { type: "scale"; left: Words; right: Words })
  | (Base & {
      type: "list";
      cols: readonly (readonly [string, Words] | readonly [string, Words, string])[];
    })
  | (Base & { type: "assets"; items: readonly Words[] });

export interface Section {
  id: string;
  name: Words;
  title: Words;
  why: Words;
  fields: readonly Question[];
}

export const SECTIONS: readonly Section[] = [
  {
    id: "basics",
    name: ["Basics", "Bases"],
    title: ["Who we are working with", "Avec qui on travaille"],
    why: [
      "Names, links and the person we talk to day to day.",
      "Noms, liens et la personne avec qui on échange au quotidien.",
    ],
    fields: [
      { id: "brand", type: "text", label: ["Brand name", "Nom de la marque"], half: 1 },
      {
        id: "company",
        type: "text",
        label: ["Company name on invoices", "Raison sociale pour les factures"],
        half: 1,
        ph: ["If different from the brand", "Si différente de la marque"],
      },
      { id: "contact", type: "text", label: ["Your name", "Votre nom"], half: 1 },
      {
        id: "role",
        type: "text",
        label: ["Your role", "Votre rôle"],
        half: 1,
        ph: ["Founder, marketing manager…", "Fondateur, responsable marketing…"],
      },
      { id: "phone", type: "text", label: ["WhatsApp", "WhatsApp"], half: 1, input: "tel" },
      { id: "email", type: "text", label: ["Email", "E-mail"], half: 1, input: "email" },
      {
        id: "site",
        type: "text",
        label: ["Website or online store", "Site ou boutique en ligne"],
        half: 1,
        input: "url",
      },
      {
        id: "insta",
        type: "text",
        label: ["Instagram", "Instagram"],
        half: 1,
        ph: ["@yourbrand", "@votremarque"],
      },
      {
        id: "tiktok",
        type: "text",
        label: ["TikTok", "TikTok"],
        half: 1,
        ph: ["@yourbrand", "@votremarque"],
      },
      {
        id: "where",
        type: "picks",
        label: ["Where you sell", "Où vous vendez"],
        other: 1,
        opts: [
          ["Online store", "Boutique en ligne"],
          ["Instagram DMs", "DM Instagram"],
          ["Own shop", "Votre boutique"],
          ["Retailers", "Revendeurs"],
          ["Marketplaces", "Marketplaces"],
          ["Abroad", "À l'étranger"],
        ],
      },
      {
        id: "since",
        type: "pick",
        label: ["How long the brand has been running", "Depuis quand la marque existe"],
        opts: [
          ["Not launched yet", "Pas encore lancée"],
          ["Under 1 year", "Moins d'un an"],
          ["1 to 3 years", "1 à 3 ans"],
          ["3 to 10 years", "3 à 10 ans"],
          ["Over 10 years", "Plus de 10 ans"],
        ],
      },
    ],
  },
  {
    id: "brand",
    name: ["Brand", "Marque"],
    title: ["Your brand, in your words", "Votre marque, avec vos mots"],
    why: [
      "So every video sounds and looks like you, not like a template.",
      "Pour que chaque vidéo vous ressemble, pas à un modèle.",
    ],
    fields: [
      {
        id: "oneline",
        type: "text",
        label: ["Describe the brand in one sentence", "Décrivez la marque en une phrase"],
        ph: ["We make … for … who want …", "On fait … pour … qui veulent …"],
      },
      {
        id: "story",
        type: "long",
        label: ["How it started, and why", "Comment tout a commencé, et pourquoi"],
        ph: [
          "The real story. It often becomes the best ad.",
          "La vraie histoire. Elle fait souvent la meilleure pub.",
        ],
      },
      {
        id: "words",
        type: "picks",
        label: [
          "Three words people should feel about you",
          "Trois mots que les gens doivent ressentir",
        ],
        other: 1,
        opts: [
          ["Premium", "Premium"],
          ["Fun", "Fun"],
          ["Bold", "Audacieux"],
          ["Trusted", "Fiable"],
          ["Natural", "Naturel"],
          ["Modern", "Moderne"],
          ["Local pride", "Fierté locale"],
          ["Warm", "Chaleureux"],
          ["Expert", "Expert"],
          ["Edgy", "Décalé"],
          ["Elegant", "Élégant"],
          ["Affordable", "Accessible"],
        ],
      },
      {
        id: "tone1",
        type: "scale",
        label: "",
        left: ["Playful", "Joueur"],
        right: ["Serious", "Sérieux"],
      },
      { id: "tone2", type: "scale", label: "", left: ["Loud", "Fort"], right: ["Calm", "Calme"] },
      {
        id: "tone3",
        type: "scale",
        label: "",
        left: ["Everyday", "Quotidien"],
        right: ["Luxury", "Luxe"],
      },
      {
        id: "tone4",
        type: "scale",
        label: "",
        left: ["Tunisian", "Tunisien"],
        right: ["International", "International"],
      },
      {
        id: "lang",
        type: "picks",
        label: ["Languages for the videos", "Langues des vidéos"],
        other: 1,
        opts: [
          ["Tunisian", "Tunisien"],
          ["French", "Français"],
          ["English", "Anglais"],
          ["Arabic", "Arabe"],
          ["No voice, text only", "Sans voix, texte seul"],
        ],
      },
      {
        id: "never",
        type: "long",
        label: ["Anything we should never say or show", "Ce qu'on ne doit jamais dire ou montrer"],
        ph: [
          "Words, topics, colours, competitors, claims…",
          "Mots, sujets, couleurs, concurrents, promesses…",
        ],
      },
    ],
  },
  {
    id: "products",
    name: ["Products", "Produits"],
    title: ["What we are selling", "Ce qu'on vend"],
    why: [
      "The products to feature first, and what makes each one sell.",
      "Les produits à mettre en avant, et ce qui fait vendre chacun.",
    ],
    fields: [
      {
        id: "hero",
        type: "list",
        label: ["Products to feature", "Produits à mettre en avant"],
        cols: [
          ["name", ["Product", "Produit"]],
          ["price", ["Price", "Prix"]],
          ["why", ["Why people buy it", "Pourquoi on l'achète"]],
          ["link", ["Link", "Lien"], "url"],
        ],
      },
      {
        id: "best",
        type: "long",
        label: [
          "Your best seller, and why you think it sells",
          "Votre meilleure vente, et pourquoi elle marche",
        ],
      },
      {
        id: "priority",
        type: "long",
        label: [
          "What you need to sell more of right now",
          "Ce que vous devez vendre davantage maintenant",
        ],
        ph: [
          "New stock, a slow product, a high margin item…",
          "Nouveau stock, produit lent, forte marge…",
        ],
      },
      {
        id: "launches",
        type: "long",
        label: ["Launches, promos or seasons coming up", "Lancements, promos ou saisons à venir"],
        ph: [
          "New collection in March, Ramadan, summer sale…",
          "Collection en mars, Ramadan, soldes d'été…",
        ],
      },
      {
        id: "offer",
        type: "picks",
        label: ["Offers you can use in ads", "Offres utilisables dans les pubs"],
        other: 1,
        opts: [
          ["Free delivery", "Livraison gratuite"],
          ["Discount code", "Code promo"],
          ["Bundle", "Pack"],
          ["Gift with order", "Cadeau offert"],
          ["Cash on delivery", "Paiement à la livraison"],
          ["Exchange or refund", "Échange ou remboursement"],
        ],
      },
    ],
  },
  {
    id: "audience",
    name: ["Audience", "Clientèle"],
    title: ["Who buys from you", "Qui achète chez vous"],
    why: [
      "Who we are talking to, what they want and what stops them.",
      "À qui on parle, ce qu'ils veulent et ce qui les freine.",
    ],
    fields: [
      {
        id: "who",
        type: "long",
        label: ["Describe your typical customer", "Décrivez votre client type"],
        ph: ["A 28 year old in Tunis who…", "Une personne de 28 ans à Tunis qui…"],
      },
      {
        id: "age",
        type: "picks",
        label: ["Age", "Âge"],
        opts: [
          ["Under 18", "Moins de 18"],
          ["18 to 24", "18 à 24"],
          ["25 to 34", "25 à 34"],
          ["35 to 44", "35 à 44"],
          ["45 to 54", "45 à 54"],
          ["55+", "55+"],
        ],
      },
      {
        id: "gender",
        type: "pick",
        label: ["Mostly", "Surtout"],
        opts: [
          ["Women", "Femmes"],
          ["Men", "Hommes"],
          ["Both", "Les deux"],
        ],
      },
      {
        id: "loc",
        type: "picks",
        label: ["Where they are", "Où ils sont"],
        other: 1,
        opts: [
          ["Grand Tunis", "Grand Tunis"],
          ["Sahel", "Sahel"],
          ["Sfax", "Sfax"],
          ["All of Tunisia", "Toute la Tunisie"],
          ["Maghreb", "Maghreb"],
          ["Europe", "Europe"],
          ["Gulf", "Golfe"],
        ],
      },
      {
        id: "want",
        type: "long",
        label: [
          "What they want when they buy from you",
          "Ce qu'ils cherchent en achetant chez vous",
        ],
        ph: [
          "The feeling or result, not the product.",
          "Le ressenti ou le résultat, pas le produit.",
        ],
      },
      {
        id: "stop",
        type: "picks",
        label: ["What makes people hesitate", "Ce qui fait hésiter"],
        other: 1,
        opts: [
          ["Price", "Le prix"],
          ["Trust", "La confiance"],
          ["Quality doubts", "Doutes sur la qualité"],
          ["Delivery time", "Délai de livraison"],
          ["Sizing", "Les tailles"],
          ["Don't know the brand", "Ne connaissent pas la marque"],
          ["Cheaper copies", "Copies moins chères"],
        ],
      },
      {
        id: "quotes",
        type: "long",
        label: ["Things customers actually say about you", "Ce que vos clients disent vraiment"],
        ph: ["Paste reviews, DMs or comments.", "Collez des avis, DM ou commentaires."],
      },
    ],
  },
  {
    id: "selling",
    name: ["Selling points", "Arguments"],
    title: ["Why you, and not someone else", "Pourquoi vous, et pas un autre"],
    why: [
      "The promise and the proof every ad is built on.",
      "La promesse et les preuves sur lesquelles repose chaque pub.",
    ],
    fields: [
      {
        id: "promise",
        type: "text",
        label: ["The main promise of the brand", "La promesse principale de la marque"],
        ph: ["If they remember one thing, it is…", "S'ils retiennent une chose, c'est…"],
      },
      {
        id: "reasons",
        type: "list",
        label: ["Top reasons to buy", "Les meilleures raisons d'acheter"],
        cols: [["reason", ["Reason", "Raison"]]],
      },
      {
        id: "proof",
        type: "picks",
        label: ["Proof you can show", "Preuves à montrer"],
        other: 1,
        opts: [
          ["Reviews", "Avis"],
          ["Sales numbers", "Chiffres de vente"],
          ["Before and after", "Avant / après"],
          ["Press", "Presse"],
          ["Awards", "Prix"],
          ["Certifications", "Certifications"],
          ["Famous customers", "Clients connus"],
        ],
      },
      {
        id: "proofNote",
        type: "long",
        label: ["Numbers or facts we can quote", "Chiffres ou faits à citer"],
        ph: [
          "10,000 orders, 4.9 stars, 3 years of warranty…",
          "10 000 commandes, 4,9 étoiles, 3 ans de garantie…",
        ],
      },
    ],
  },
  {
    id: "market",
    name: ["Market", "Marché"],
    title: ["Competitors and references", "Concurrents et références"],
    why: [
      "What is out there, and the content you love or never want.",
      "Ce qui existe, et le contenu que vous aimez ou refusez.",
    ],
    fields: [
      {
        id: "rivals",
        type: "list",
        label: ["Main competitors", "Principaux concurrents"],
        cols: [
          ["name", ["Name", "Nom"]],
          ["link", ["Instagram or site", "Instagram ou site"], "url"],
          ["note", ["What they do well or badly", "Ce qu'ils font bien ou mal"]],
        ],
      },
      {
        id: "admire",
        type: "long",
        label: ["Brands you admire, from any industry", "Marques que vous admirez, tous secteurs"],
      },
      {
        id: "refs",
        type: "list",
        label: ["Ads or videos you love", "Pubs ou vidéos que vous aimez"],
        cols: [
          ["link", ["Link", "Lien"], "url"],
          ["note", ["What you like about it", "Ce qui vous plaît"]],
        ],
      },
      {
        id: "avoid",
        type: "long",
        label: [
          "Content you don't want to look like",
          "Le contenu auquel vous ne voulez pas ressembler",
        ],
      },
    ],
  },
  {
    id: "goals",
    name: ["Goals", "Objectifs"],
    title: ["What this project has to do", "Ce que ce projet doit accomplir"],
    why: [
      "One clear goal decides the hooks, the length and the call to action.",
      "Un objectif clair décide des accroches, de la durée et de l'appel à l'action.",
    ],
    fields: [
      {
        id: "goal",
        type: "pick",
        label: ["Main goal", "Objectif principal"],
        other: 1,
        opts: [
          ["More sales", "Plus de ventes"],
          ["Launch a product", "Lancer un produit"],
          ["Get known", "Se faire connaître"],
          ["More messages and leads", "Plus de messages et de prospects"],
          ["Visits to the shop", "Visites en boutique"],
          ["Grow the account", "Faire grandir le compte"],
        ],
      },
      {
        id: "success",
        type: "long",
        label: ["What would make this a success for you", "Ce qui ferait de ce projet un succès"],
        ph: [
          "Cost per sale under…, 50 orders a week, sold out…",
          "Coût par vente sous…, 50 commandes par semaine, rupture de stock…",
        ],
      },
      {
        id: "channels",
        type: "picks",
        label: ["Where the videos will run", "Où les vidéos seront diffusées"],
        other: 1,
        opts: [
          ["Instagram ads", "Pubs Instagram"],
          ["TikTok ads", "Pubs TikTok"],
          ["Instagram posts", "Posts Instagram"],
          ["TikTok posts", "Posts TikTok"],
          ["Facebook", "Facebook"],
          ["YouTube", "YouTube"],
          ["Website", "Site web"],
          ["In store screens", "Écrans en boutique"],
        ],
      },
      {
        id: "ads",
        type: "pick",
        label: ["Do you run paid ads today?", "Faites-vous de la pub payante aujourd'hui ?"],
        opts: [
          ["Yes, we manage them", "Oui, on les gère"],
          ["Yes, an agency or freelancer does", "Oui, une agence ou un freelance"],
          ["Not yet", "Pas encore"],
        ],
      },
      {
        id: "results",
        type: "long",
        label: ["What has worked or flopped before", "Ce qui a marché ou échoué avant"],
        ph: [
          "Share screenshots of results if you can.",
          "Partagez des captures de résultats si possible.",
        ],
      },
    ],
  },
  {
    id: "concepts",
    name: ["Ideas", "Idées"],
    title: ["Concepts and formats", "Concepts et formats"],
    why: [
      "Bring every idea you have. We shape them into scripts for your approval.",
      "Apportez toutes vos idées. On en fait des scripts à valider.",
    ],
    fields: [
      {
        id: "ideas",
        type: "long",
        label: ["Ideas you already have", "Les idées que vous avez déjà"],
        ph: [
          "Rough is fine: a scene, a joke, a line, a trend.",
          "Brut, c'est bien : une scène, une blague, une phrase, une tendance.",
        ],
      },
      {
        id: "formats",
        type: "picks",
        label: ["Formats you like", "Formats que vous aimez"],
        other: 1,
        opts: [
          ["Founder talking", "Le fondateur parle"],
          ["Customer style (UGC)", "Style client (UGC)"],
          ["Product demo", "Démo produit"],
          ["Before and after", "Avant / après"],
          ["Street interview", "Micro-trottoir"],
          ["Sketch or skit", "Sketch"],
          ["Unboxing", "Unboxing"],
          ["Tutorial", "Tutoriel"],
          ["Testimonial", "Témoignage"],
          ["Trend", "Tendance"],
          ["Cinematic", "Cinématique"],
        ],
      },
      {
        id: "face",
        type: "picks",
        label: ["Who appears on camera", "Qui apparaît à l'écran"],
        opts: [
          ["The founder", "Le fondateur"],
          ["Your team", "Votre équipe"],
          ["Actors or models", "Acteurs ou modèles"],
          ["Creators or influencers", "Créateurs ou influenceurs"],
          ["Hands and product only", "Mains et produit seulement"],
          ["Open to ideas", "Ouvert aux idées"],
        ],
      },
      {
        id: "must",
        type: "picks",
        label: ["Must appear in every video", "Doit apparaître dans chaque vidéo"],
        other: 1,
        opts: [
          ["Logo", "Logo"],
          ["Price", "Prix"],
          ["Promo code", "Code promo"],
          ["Website", "Site web"],
          ["Phone number", "Numéro de téléphone"],
          ["Delivery info", "Infos livraison"],
          ["Legal mention", "Mention légale"],
        ],
      },
      {
        id: "music",
        type: "pick",
        label: ["Music and sound", "Musique et son"],
        opts: [
          ["Trending sounds", "Sons tendance"],
          ["Calm and premium", "Calme et premium"],
          ["Energetic", "Énergique"],
          ["Local music", "Musique locale"],
          ["Voice over first", "Voix off d'abord"],
          ["Up to Gecko", "Au choix de Gecko"],
        ],
      },
    ],
  },
  {
    id: "assets",
    name: ["Assets", "Fichiers"],
    title: ["Files we need from you", "Les fichiers qu'il nous faut"],
    why: [
      "Paste a Google Drive or WeTransfer link next to each one, or tell us you need help.",
      "Collez un lien Google Drive ou WeTransfer à côté de chacun, ou dites-nous si vous avez besoin d'aide.",
    ],
    fields: [
      {
        id: "files",
        type: "assets",
        label: ["Brand files", "Fichiers de marque"],
        items: [
          ["Logo (vector or PNG)", "Logo (vectoriel ou PNG)"],
          ["Brand guidelines", "Charte graphique"],
          ["Fonts", "Polices"],
          ["Product photos", "Photos produits"],
          ["Past videos and ads", "Anciennes vidéos et pubs"],
          ["Packaging", "Packaging"],
          ["Reviews and screenshots", "Avis et captures"],
        ],
      },
      {
        id: "colors",
        type: "list",
        label: ["Brand colours", "Couleurs de la marque"],
        cols: [
          ["hex", ["Colour", "Couleur"], "color"],
          ["name", ["Where it is used", "Où elle est utilisée"]],
        ],
      },
      {
        id: "drive",
        type: "text",
        label: ["One folder with everything", "Un dossier avec tout"],
        input: "url",
        ph: [
          "Google Drive, Dropbox or WeTransfer link",
          "Lien Google Drive, Dropbox ou WeTransfer",
        ],
      },
    ],
  },
  {
    id: "shoot",
    name: ["Shoot", "Tournage"],
    title: ["Shoot day", "Jour de tournage"],
    why: ["Where, when and what we need on set.", "Où, quand et ce qu'il faut sur le plateau."],
    fields: [
      {
        id: "place",
        type: "picks",
        label: ["Where we can shoot", "Où on peut tourner"],
        other: 1,
        opts: [
          ["Studio", "Studio"],
          ["Your shop", "Votre boutique"],
          ["Your office or workshop", "Votre bureau ou atelier"],
          ["A home", "Une maison"],
          ["Outdoors", "En extérieur"],
          ["Up to Gecko", "Au choix de Gecko"],
        ],
      },
      {
        id: "address",
        type: "text",
        label: ["Address, if at your place", "Adresse, si c'est chez vous"],
      },
      {
        id: "dates",
        type: "long",
        label: ["Dates that work, and dates to avoid", "Dates possibles, et dates à éviter"],
      },
      {
        id: "stock",
        type: "long",
        label: ["Products available for the shoot", "Produits disponibles pour le tournage"],
        ph: [
          "Which ones, how many units, colours and sizes.",
          "Lesquels, combien, couleurs et tailles.",
        ],
      },
      {
        id: "onset",
        type: "text",
        label: ["Who from your side comes on shoot day", "Qui vient de votre côté le jour J"],
      },
      {
        id: "rules",
        type: "long",
        label: ["Anything we should know about the place", "Ce qu'il faut savoir sur le lieu"],
        ph: ["Opening hours, parking, permits, noise…", "Horaires, parking, autorisations, bruit…"],
      },
    ],
  },
  {
    id: "approvals",
    name: ["Approvals", "Validation"],
    title: ["Feedback and sign off", "Retours et validation"],
    why: [
      "Who decides, how we reach them and the dates that matter.",
      "Qui décide, comment le joindre et les dates importantes.",
    ],
    fields: [
      {
        id: "approver",
        type: "list",
        label: ["Who gives final approval", "Qui donne la validation finale"],
        cols: [
          ["name", ["Name", "Nom"]],
          ["role", ["Role", "Rôle"]],
          ["phone", ["WhatsApp or email", "WhatsApp ou e-mail"]],
        ],
      },
      {
        id: "others",
        type: "text",
        label: ["Anyone else who gives feedback", "Autres personnes qui donnent leur avis"],
      },
      {
        id: "channel",
        type: "pick",
        label: ["Best way to reach you", "Le meilleur moyen de vous joindre"],
        opts: [
          ["WhatsApp", "WhatsApp"],
          ["Email", "E-mail"],
          ["Phone call", "Appel"],
          ["Client portal", "Portail client"],
        ],
      },
      {
        id: "deadline",
        type: "text",
        label: ["Date the first videos must be live", "Date de mise en ligne des premières vidéos"],
        half: 1,
        input: "date",
      },
      { id: "notes", type: "long", label: ["Anything else", "Autre chose"] },
    ],
  },
];

export const QUESTIONS: readonly Question[] = SECTIONS.flatMap((s) => s.fields);
