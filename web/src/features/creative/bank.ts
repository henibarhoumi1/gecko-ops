// The creative bank (Heni, 24 Nov 2026: "a bigger concepts and formats bank, trendy, winning ideas, modern and
// built on how the platforms rank in 2027, offered in the client portal too"). One list for the team's Creative
// Lab, the idea composer, the script beats and the client's Inspiration.
//
// Each format says which ranking signal it feeds. What the platforms say they rank on: Instagram Reels on watch
// time, likes per reach and DM sends; TikTok on watch time, completion and re-watches, then shares and saves, and
// it reads speech and on-screen text for search; Meta ads on creative that is distinct in concept, person and
// look. Lengths and beats are working guides, not rules.

export type Family =
  | "story"
  | "proof"
  | "demo"
  | "versus"
  | "native"
  | "founder"
  | "offer"
  | "teach"
  | "skit"
  | "street";

export const FAMILY_LABEL: Record<Family, string> = {
  story: "Story",
  proof: "Proof",
  demo: "Demo",
  versus: "Comparison",
  native: "Platform-native",
  founder: "Founder & behind the scenes",
  offer: "Offer",
  teach: "Teach & save",
  skit: "Skit & humour",
  street: "Street & interview",
};

export type Signal = "watch" | "sends" | "saves" | "comments" | "search" | "rewatch" | "clicks";

export const SIGNAL_LABEL: Record<Signal, string> = {
  watch: "Watch time",
  sends: "DM sends",
  saves: "Saves",
  comments: "Comments",
  search: "Search",
  rewatch: "Re-watches",
  clicks: "Clicks & sales",
};

export type Stage = "seen" | "trusted" | "bought";
export const STAGE_LABEL: Record<Stage, string> = {
  seen: "Get seen",
  trusted: "Get trusted",
  bought: "Get bought",
};

export interface Beat {
  /** Where it sits in a 30-second cut, e.g. "0–2 s". */
  at: string;
  what: string;
}

export interface BankFormat {
  key: string;
  name: string;
  family: Family;
  /** One line: what it is. */
  line: string;
  /** Why it wins now. */
  why: string;
  signals: Signal[];
  stages: Stage[];
  length: string;
  beats: Beat[];
  hooks: string[];
  /** What it takes to shoot. */
  needs: { people: string; place: string; props?: string };
  effort: 1 | 2 | 3;
  /** "rising" = what's working now and into 2027; "evergreen" = always works. */
  trend: "rising" | "evergreen";
  /** Works best for. Empty = any brand. */
  bestFor: string[];
}

export const BANK: BankFormat[] = [
  {
    key: "problem-fix",
    name: "Problem → fix",
    family: "demo",
    line: "Show the everyday pain, then the product ending it.",
    why: "The pain in frame one stops the right people; the fix is the payoff they stay for.",
    signals: ["watch", "clicks"],
    stages: ["seen", "bought"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "The pain, mid-action, no intro" },
      { at: "2–8 s", what: "Why it's annoying, one line" },
      { at: "8–20 s", what: "The product fixes it, in hands" },
      { at: "20–30 s", what: "Result + offer + where to buy" },
    ],
    hooks: ["Still doing [pain] like this?", "This is why your [thing] never [result]."],
    needs: { people: "1 person", place: "Where the problem happens", props: "The 'before' mess" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "result-first",
    name: "Result first, then how",
    family: "demo",
    line: "Open on the finished result, then rewind to how.",
    why: "Curiosity about 'how' carries completion; the open loop closes at the end.",
    signals: ["watch", "rewatch"],
    stages: ["seen", "bought"],
    length: "10–25 s",
    beats: [
      { at: "0–2 s", what: "The result, perfect, on screen" },
      { at: "2–4 s", what: "Text: 'Here's how' / rewind effect" },
      { at: "4–20 s", what: "3 fast steps" },
      { at: "20–25 s", what: "Back to the result, product name" },
    ],
    hooks: ["[Result] in [time]. Here's how.", "This took 4 minutes."],
    needs: { people: "Hands only is fine", place: "Clean surface or the real setting" },
    effort: 1,
    trend: "evergreen",
    bestFor: ["food", "beauty", "home"],
  },
  {
    key: "before-after",
    name: "Before / after",
    family: "proof",
    line: "The change, visible in seconds.",
    why: "A visible transformation is the fastest proof; split screens get re-watched.",
    signals: ["watch", "rewatch", "sends"],
    stages: ["seen", "bought"],
    length: "8–20 s",
    beats: [
      { at: "0–3 s", what: "Before, split or full screen" },
      { at: "3–12 s", what: "The switch: a cut, a wipe, a snap" },
      { at: "12–20 s", what: "After, held long enough to see" },
    ],
    hooks: ["Wait for it…", "Same [thing], 10 minutes apart."],
    needs: { people: "Optional", place: "The same spot twice", props: "The 'before' state" },
    effort: 1,
    trend: "evergreen",
    bestFor: ["home", "beauty", "services"],
  },
  {
    key: "ugc-review",
    name: "Honest review (UGC)",
    family: "proof",
    line: "A real person, phone in hand, saying what they think.",
    why: "Phone-shot talk to camera reads as a friend, not an ad; trust lifts clicks.",
    signals: ["clicks", "comments"],
    stages: ["trusted", "bought"],
    length: "20–45 s",
    beats: [
      { at: "0–3 s", what: "The verdict first" },
      { at: "3–15 s", what: "Who I am and my problem" },
      { at: "15–35 s", what: "What I noticed, with the product in shot" },
      { at: "35–45 s", what: "Who it's for / not for" },
    ],
    hooks: ["I didn't believe it until…", "3 weeks with [product], honestly:"],
    needs: { people: "1 UGC creator or customer", place: "Their home, car, bathroom" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "reply-comment",
    name: "Reply to a comment",
    family: "native",
    line: "A real comment on screen, answered on video.",
    why: "Looks native, answers the doubt people have, and pulls more comments.",
    signals: ["comments", "watch"],
    stages: ["trusted", "bought"],
    length: "15–40 s",
    beats: [
      { at: "0–2 s", what: "The comment bubble, read out loud" },
      { at: "2–25 s", what: "The answer, shown not told" },
      { at: "25–40 s", what: "Ask the next question in comments" },
    ],
    hooks: ["'Is it really worth [price]?' Let's see.", "You asked, so here it is."],
    needs: { people: "Founder or creator", place: "Anywhere real" },
    effort: 1,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "send-friend",
    name: "Send-this-to-a-friend moment",
    family: "native",
    line: "A situation so true people DM it to someone.",
    why: "DM sends weigh most for reaching people who don't follow you on Instagram.",
    signals: ["sends", "rewatch"],
    stages: ["seen"],
    length: "6–15 s",
    beats: [
      { at: "0–2 s", what: "Text: the relatable setup ('when your mum…')" },
      { at: "2–10 s", what: "The moment, acted with one face" },
      { at: "10–15 s", what: "The product as the quiet punchline" },
    ],
    hooks: ["Send this to the friend who [habit].", "POV: your mum when [situation]."],
    needs: { people: "1–2 actors", place: "A real Tunisian home or street" },
    effort: 1,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "pov",
    name: "POV",
    family: "native",
    line: "First-person scene: the viewer is in it.",
    why: "Puts the viewer inside the moment; short and loopable.",
    signals: ["watch", "rewatch", "sends"],
    stages: ["seen"],
    length: "7–15 s",
    beats: [
      { at: "0–1 s", what: "Text 'POV: …' over the first frame" },
      { at: "1–12 s", what: "The scene from the viewer's eyes" },
      { at: "12–15 s", what: "Ending that loops into the start" },
    ],
    hooks: ["POV: you finally found [product].", "POV: it's 8 am and [pain]."],
    needs: { people: "Hands or one actor", place: "Where the moment happens" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "green-screen",
    name: "Green-screen explainer",
    family: "teach",
    line: "Person in front of a screenshot, a post or a price list.",
    why: "Native look, cheap to make, great for 'the truth about…' and price breakdowns.",
    signals: ["saves", "comments", "search"],
    stages: ["trusted"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "Point at the thing behind you" },
      { at: "2–30 s", what: "Three points, each with a new background" },
      { at: "30–45 s", what: "What to do now" },
    ],
    hooks: ["The truth about [category] nobody says.", "Here's what [price] actually buys you."],
    needs: { people: "1 presenter", place: "None: green screen in the app" },
    effort: 1,
    trend: "rising",
    bestFor: ["services", "tech"],
  },
  {
    key: "list-3",
    name: "3 things list",
    family: "teach",
    line: "Three tips, mistakes or reasons, fast.",
    why: "Numbered lists get saved and finished; the count promises a short ride.",
    signals: ["saves", "watch", "search"],
    stages: ["seen", "trusted"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "'3 [things] I wish I knew'" },
      { at: "2–25 s", what: "One, two, three, each with a visual" },
      { at: "25–30 s", what: "The product as number three or the bonus" },
    ],
    hooks: ["3 mistakes everyone makes with [thing].", "Stop doing these 3 things."],
    needs: { people: "1 presenter or hands", place: "Anywhere" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "myth-fact",
    name: "Myth vs fact",
    family: "teach",
    line: "Say what the category gets wrong, then show the truth.",
    why: "Contrarian openings stop the scroll and start comments.",
    signals: ["comments", "watch"],
    stages: ["seen", "trusted"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "The myth, crossed out" },
      { at: "2–20 s", what: "The fact, demonstrated" },
      { at: "20–30 s", what: "What it changes for them" },
    ],
    hooks: ["Everyone says [myth]. It's wrong.", "Stop believing this about [thing]."],
    needs: { people: "1 presenter", place: "Anywhere" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "us-vs-them",
    name: "Us vs the usual way",
    family: "versus",
    line: "Side by side with what they use today.",
    why: "Makes the difference visible; good for ads that need a reason to switch.",
    signals: ["clicks", "watch"],
    stages: ["bought"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "Two of them in frame, labelled" },
      { at: "2–20 s", what: "Same test, both sides" },
      { at: "20–30 s", what: "The winner, the price, the link" },
    ],
    hooks: ["[Cheap one] vs [ours]: we tested.", "Same price. Not the same result."],
    needs: {
      people: "1 presenter",
      place: "Table or real setting",
      props: "The competitor product (no logo)",
    },
    effort: 2,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "price-breakdown",
    name: "Where the money goes",
    family: "versus",
    line: "Break the price down item by item.",
    why: "Answers 'why so expensive' before it's asked; saved and sent by people deciding.",
    signals: ["saves", "sends", "clicks"],
    stages: ["trusted", "bought"],
    length: "20–40 s",
    beats: [
      { at: "0–2 s", what: "The price, big" },
      { at: "2–30 s", what: "What's inside, piece by piece" },
      { at: "30–40 s", what: "What it costs per day / per use" },
    ],
    hooks: ["Why [product] costs [price].", "[Price]? Here's where every dinar goes."],
    needs: { people: "Founder or hands", place: "Workshop or table" },
    effort: 1,
    trend: "rising",
    bestFor: ["fashion", "beauty", "food"],
  },
  {
    key: "founder-why",
    name: "Founder story",
    family: "founder",
    line: "Why it exists, told by the person who made it.",
    why: "A face and a reason build trust; founders read as original, not ads.",
    signals: ["watch", "comments"],
    stages: ["trusted"],
    length: "30–60 s",
    beats: [
      { at: "0–3 s", what: "The moment it started, one sentence" },
      { at: "3–40 s", what: "The problem they couldn't fix, the first try" },
      { at: "40–60 s", what: "What it is today, and who it's for" },
    ],
    hooks: ["I started [brand] in my kitchen in [city].", "I quit [job] because of this."],
    needs: { people: "The founder", place: "Where it's made" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "how-its-made",
    name: "How it's made",
    family: "founder",
    line: "The craft: hands, machines, sounds, detail.",
    why: "Satisfying process footage holds attention without words; shows care.",
    signals: ["watch", "rewatch", "saves"],
    stages: ["seen", "trusted"],
    length: "15–40 s",
    beats: [
      { at: "0–2 s", what: "The most satisfying close-up" },
      { at: "2–30 s", what: "Steps, macro, real sound" },
      { at: "30–40 s", what: "The finished product in a hand" },
    ],
    hooks: ["Nobody sees this part.", "This is how [product] is made."],
    needs: { people: "The maker", place: "Workshop, kitchen, atelier", props: "Raw materials" },
    effort: 2,
    trend: "evergreen",
    bestFor: ["food", "fashion", "beauty"],
  },
  {
    key: "packing-orders",
    name: "Packing orders",
    family: "founder",
    line: "A day of orders going out, real names hidden.",
    why: "Social proof without saying it; ASMR packing is watched to the end.",
    signals: ["watch", "rewatch"],
    stages: ["trusted", "bought"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "A pile of parcels" },
      { at: "2–25 s", what: "One order packed, with the note" },
      { at: "25–30 s", what: "'Yours could be next' + offer" },
    ],
    hooks: ["Packing 50 orders for [city].", "Pack an order with me."],
    needs: { people: "Hands", place: "Packing table", props: "Boxes, tape, branded notes" },
    effort: 1,
    trend: "rising",
    bestFor: ["fashion", "beauty", "food"],
  },
  {
    key: "street-quiz",
    name: "Street quiz",
    family: "street",
    line: "Ask people in the street one question about the category.",
    why: "Real faces and reactions; the question is the hook, the answers carry watch time.",
    signals: ["watch", "comments", "sends"],
    stages: ["seen"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "The question, mic in frame" },
      { at: "2–35 s", what: "4–6 quick answers, best last" },
      { at: "35–45 s", what: "The product as the right answer" },
    ],
    hooks: ["We asked people in [Lac 2]: …", "How much would you pay for [thing]?"],
    needs: {
      people: "Host + passers-by (releases)",
      place: "Busy street, mall",
      props: "Mic, the product",
    },
    effort: 2,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "blind-test",
    name: "Blind test",
    family: "street",
    line: "People try it without knowing which is which.",
    why: "Honest reactions are proof; the reveal is a payoff people wait for.",
    signals: ["watch", "rewatch", "comments"],
    stages: ["trusted", "bought"],
    length: "20–40 s",
    beats: [
      { at: "0–2 s", what: "Two cups / two samples, labelled A and B" },
      { at: "2–30 s", what: "Reactions, close on faces" },
      { at: "30–40 s", what: "The reveal" },
    ],
    hooks: ["We made people guess which one is ours.", "A or B? They didn't know."],
    needs: { people: "3–5 testers", place: "Street, office, shop", props: "Two versions, labels" },
    effort: 2,
    trend: "evergreen",
    bestFor: ["food", "beauty"],
  },
  {
    key: "skit-family",
    name: "Family skit (Derja)",
    family: "skit",
    line: "A Tunisian family moment, acted, with the product in it.",
    why: "Local humour gets sent to family groups; Derja feels made here, not imported.",
    signals: ["sends", "comments", "rewatch"],
    stages: ["seen"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "The line everyone has heard at home" },
      { at: "2–35 s", what: "Escalation, one twist" },
      { at: "35–45 s", what: "The product saves the day (or the punchline)" },
    ],
    hooks: ["When your mum inspects the house…", "Every Tunisian dad when [situation]."],
    needs: { people: "2–3 actors", place: "A real home", props: "Everyday props" },
    effort: 2,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "two-characters",
    name: "Two-character dialogue",
    family: "skit",
    line: "One person, two roles, or two people with opposite views.",
    why: "Back-and-forth keeps eyes moving; the 'me vs me' format is native and cheap.",
    signals: ["watch", "sends"],
    stages: ["seen", "trusted"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "The sceptic's line" },
      { at: "2–25 s", what: "Back and forth, product shown" },
      { at: "25–30 s", what: "The sceptic convinced" },
    ],
    hooks: ["Me before vs me after [product].", "My wallet vs my skin:"],
    needs: { people: "1–2 actors", place: "Anywhere" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "trend-twist",
    name: "Trend, our way",
    family: "native",
    line: "A trending sound or format, adapted to the brand.",
    why: "Rides what people already watch; the twist makes it original, not a copy.",
    signals: ["watch", "rewatch"],
    stages: ["seen"],
    length: "7–20 s",
    beats: [
      { at: "0–1 s", what: "The trend's first beat, recognisable" },
      { at: "1–15 s", what: "Our twist" },
      { at: "15–20 s", what: "Product + brand in the last frame" },
    ],
    hooks: ["[Trend] but it's [brand].", "Doing the [trend] with [product]."],
    needs: { people: "1–2", place: "Depends on the trend" },
    effort: 1,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "asmr",
    name: "ASMR product",
    family: "native",
    line: "No talking: real sounds, close-ups, slow hands.",
    why: "Satisfying, loopable, watched with sound on; works across languages.",
    signals: ["watch", "rewatch"],
    stages: ["seen"],
    length: "8–20 s",
    beats: [
      { at: "0–1 s", what: "The crispest sound first" },
      { at: "1–17 s", what: "Unboxing, pouring, cutting, applying" },
      { at: "17–20 s", what: "The product name on the last frame" },
    ],
    hooks: ["[No words: the sound]", "Turn your sound on."],
    needs: {
      people: "Hands",
      place: "Quiet room, clean surface",
      props: "Mic close to the product",
    },
    effort: 1,
    trend: "evergreen",
    bestFor: ["food", "beauty", "home"],
  },
  {
    key: "unboxing",
    name: "Unboxing",
    family: "demo",
    line: "Open it, see what's inside, first reaction.",
    why: "Curiosity until the box is open; first reactions feel honest.",
    signals: ["watch", "clicks"],
    stages: ["trusted", "bought"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "The parcel, the knife, the first cut" },
      { at: "2–20 s", what: "Each item, held to camera" },
      { at: "20–30 s", what: "First use or verdict" },
    ],
    hooks: ["Unboxing the thing everyone in [city] is ordering.", "Was it worth it?"],
    needs: { people: "1 creator or hands", place: "Table, bed, car" },
    effort: 1,
    trend: "evergreen",
    bestFor: ["fashion", "beauty", "tech"],
  },
  {
    key: "day-in-life",
    name: "Day in the life",
    family: "story",
    line: "A real day, with the product where it fits.",
    why: "Aspirational and relatable at once; the product feels lived-in, not placed.",
    signals: ["watch", "saves"],
    stages: ["seen", "trusted"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "The morning shot, text 'a day as a [persona]'" },
      { at: "2–40 s", what: "6–8 moments, 3 s each" },
      { at: "40–45 s", what: "Night, the product one last time" },
    ],
    hooks: ["A day as a [job] in Tunis.", "My 6 am routine (honest)."],
    needs: { people: "1 creator", place: "Several real places" },
    effort: 2,
    trend: "evergreen",
    bestFor: ["beauty", "fashion", "food"],
  },
  {
    key: "storytime",
    name: "Storytime",
    family: "story",
    line: "A short true story told to camera, product in the twist.",
    why: "A story with a turn holds to the end; the twist gets comments.",
    signals: ["watch", "comments"],
    stages: ["seen", "trusted"],
    length: "30–60 s",
    beats: [
      { at: "0–3 s", what: "The end of the story first ('I almost lost the client…')" },
      { at: "3–45 s", what: "What happened, fast cuts" },
      { at: "45–60 s", what: "The turn, the product's part in it" },
    ],
    hooks: ["The day I almost [disaster].", "Storytime: my worst [situation]."],
    needs: { people: "1 storyteller", place: "Car, couch, kitchen" },
    effort: 1,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "challenge",
    name: "Challenge or test",
    family: "proof",
    line: "Push the product to the limit on camera.",
    why: "Stakes keep people watching; a pass is proof, a fail is honest content.",
    signals: ["watch", "rewatch", "sends"],
    stages: ["seen", "trusted"],
    length: "15–40 s",
    beats: [
      { at: "0–2 s", what: "The challenge stated ('24 hours in the rain')" },
      { at: "2–30 s", what: "The test, time stamps on screen" },
      { at: "30–40 s", what: "The result, honest" },
    ],
    hooks: ["I tested [product] for 24 hours.", "Will it survive this?"],
    needs: {
      people: "1 presenter",
      place: "Where the test makes sense",
      props: "Whatever the test needs",
    },
    effort: 2,
    trend: "evergreen",
    bestFor: ["home", "tech", "fashion"],
  },
  {
    key: "tutorial",
    name: "How-to tutorial",
    family: "teach",
    line: "Step by step: how to use it, or 3 ways to use it.",
    why: "Useful videos get saved and found in search; good for objections about use.",
    signals: ["saves", "search", "watch"],
    stages: ["trusted", "bought"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "The end result + 'here's how'" },
      { at: "2–40 s", what: "Steps, numbered on screen" },
      { at: "40–45 s", what: "Save this for later" },
    ],
    hooks: ["3 ways to use [product] you didn't know.", "How to [result] in 3 steps."],
    needs: { people: "1 presenter or hands", place: "Where it's used" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "search-answer",
    name: "Search answer",
    family: "teach",
    line: "Answer the exact phrase people type, word for word.",
    why: "Spoken words, on-screen text and the caption are read for search; it keeps getting found.",
    signals: ["search", "saves"],
    stages: ["trusted"],
    length: "20–45 s",
    beats: [
      { at: "0–2 s", what: "Say and show the search phrase" },
      { at: "2–35 s", what: "The answer, simply" },
      { at: "35–45 s", what: "Where to get it" },
    ],
    hooks: [
      "Best [product] in Tunisia? Here's the honest answer.",
      "How to [result] (Tunis edition)",
    ],
    needs: { people: "1 presenter", place: "Anywhere" },
    effort: 1,
    trend: "rising",
    bestFor: ["services", "food", "tech"],
  },
  {
    key: "offer-countdown",
    name: "Offer with a deadline",
    family: "offer",
    line: "The deal, the date, the reason to act now.",
    why: "For people who already know you: a clear reason to buy today.",
    signals: ["clicks"],
    stages: ["bought"],
    length: "6–15 s",
    beats: [
      { at: "0–2 s", what: "The number: -30%, 2 for 1" },
      { at: "2–10 s", what: "The product, in use" },
      { at: "10–15 s", what: "Until when, and how to order" },
    ],
    hooks: ["-30% until Sunday.", "Last 50 pieces."],
    needs: { people: "Optional", place: "Product setting" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "gift-guide",
    name: "Gift idea",
    family: "offer",
    line: "Who to give it to, for which moment.",
    why: "Seasonal search and sends to the person who'll buy the gift.",
    signals: ["sends", "saves", "clicks"],
    stages: ["bought"],
    length: "10–25 s",
    beats: [
      { at: "0–2 s", what: "'Gift for your [person] who has everything'" },
      { at: "2–20 s", what: "The product, wrapped, opened, loved" },
      { at: "20–25 s", what: "Order by [date]" },
    ],
    hooks: ["Gift for the [person] who has everything.", "Eid gift sorted."],
    needs: { people: "1–2", place: "Home", props: "Gift wrap" },
    effort: 1,
    trend: "evergreen",
    bestFor: ["fashion", "beauty", "food"],
  },
  {
    key: "lofi-selfie",
    name: "Lo-fi selfie talk",
    family: "native",
    line: "Front camera, one take, a real thought.",
    why: "Raw and human beats polished in the feed; fast to make, easy to test many.",
    signals: ["watch", "comments"],
    stages: ["seen", "trusted"],
    length: "10–30 s",
    beats: [
      { at: "0–2 s", what: "A bold first sentence" },
      { at: "2–25 s", what: "The thought, no cuts or a few jump cuts" },
      { at: "25–30 s", what: "A question to the viewer" },
    ],
    hooks: ["Okay I need to talk about [thing].", "Unpopular opinion:"],
    needs: { people: "1 creator", place: "Car, street, home" },
    effort: 1,
    trend: "rising",
    bestFor: [],
  },
  {
    key: "carousel-story",
    name: "Story carousel",
    family: "teach",
    line: "6–8 slides that tell one idea, last slide = the product.",
    why: "Swipes count as time spent; carousels are saved and sent.",
    signals: ["saves", "sends"],
    stages: ["trusted"],
    length: "6–8 slides",
    beats: [
      { at: "Slide 1", what: "The hook, big type" },
      { at: "Slides 2–6", what: "One point per slide" },
      { at: "Last", what: "The product + save this" },
    ],
    hooks: ["Read this before buying [category].", "The [thing] guide nobody gave you."],
    needs: { people: "None", place: "Design" },
    effort: 1,
    trend: "evergreen",
    bestFor: [],
  },
  {
    key: "event-recap",
    name: "Event recap",
    family: "story",
    line: "The best 20 seconds of an event, launch or pop-up.",
    why: "FOMO and faces; tags bring the attendees' friends.",
    signals: ["sends", "watch"],
    stages: ["seen"],
    length: "15–30 s",
    beats: [
      { at: "0–2 s", what: "The peak moment first" },
      { at: "2–25 s", what: "Fast cuts on the beat" },
      { at: "25–30 s", what: "Date of the next one" },
    ],
    hooks: ["You missed this.", "What happened at [event]."],
    needs: { people: "The crowd", place: "The event" },
    effort: 2,
    trend: "evergreen",
    bestFor: ["events", "food"],
  },
  {
    key: "mini-doc",
    name: "Mini documentary",
    family: "story",
    line: "A 60–90 s portrait of a customer, a maker or a place.",
    why: "Longer watch time when it's good; becomes the brand's anchor film, cut into reels.",
    signals: ["watch", "sends"],
    stages: ["trusted"],
    length: "60–90 s",
    beats: [
      { at: "0–3 s", what: "The strongest line of the interview" },
      { at: "3–70 s", what: "Their world, their words, b-roll" },
      { at: "70–90 s", what: "The quiet ending, the brand" },
    ],
    hooks: ["Meet [name]. She [surprising fact].", "This is [place] at 5 am."],
    needs: { people: "1 subject", place: "Their world", props: "Interview mics" },
    effort: 3,
    trend: "rising",
    bestFor: [],
  },
];

export const familyOf = (k: Family) => FAMILY_LABEL[k];
export const bankFormat = (key: string) => BANK.find((f) => f.key === key);

export interface BankFilter {
  q?: string;
  family?: Family | "";
  stage?: Stage | "";
  signal?: Signal | "";
  trend?: "rising" | "evergreen" | "";
  maxEffort?: 1 | 2 | 3;
}

export function filterBank(f: BankFilter, list: readonly BankFormat[] = BANK): BankFormat[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return list.filter(
    (x) =>
      (!f.family || x.family === f.family) &&
      (!f.stage || x.stages.includes(f.stage)) &&
      (!f.signal || x.signals.includes(f.signal)) &&
      (!f.trend || x.trend === f.trend) &&
      (!f.maxEffort || x.effort <= f.maxEffort) &&
      (!q ||
        `${x.name} ${x.line} ${x.why} ${x.hooks.join(" ")} ${x.bestFor.join(" ")}`
          .toLowerCase()
          .includes(q)),
  );
}

/** Fills [brackets] in a line from a brief: [product], [brand], [pain], [result], [city], [price], [person]… */
export function fillIn(line: string, words: Record<string, string>): string {
  return line.replace(/\[([^\]]+)\]/g, (m, k: string) => {
    const key = k.toLowerCase().trim();
    const v = words[key] ?? words[key.replace(/s$/, "")];
    return v && v.trim() ? v.trim() : m;
  });
}

/** An idea's body from a format: the beats, ready to fill. */
export function ideaBody(f: BankFormat): string {
  return [
    `Format: ${f.name} (${f.length})`,
    ...f.beats.map((b) => `${b.at}: ${b.what}`),
    `Needs: ${f.needs.people} · ${f.needs.place}${f.needs.props ? ` · ${f.needs.props}` : ""}`,
  ].join("\n");
}
