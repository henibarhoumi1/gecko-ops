/* sample data for studio: ten ideas across the sample clients, in every stage */
(function (GK) {
  "use strict";
  GK.seedExtra.push(function (data, ctx) {
    var d = ctx.d, projects = data.colls.projects || [];
    function proj(id) { return projects.find(function (p) { return p.id === id; }) || null; }
    function angle(pid, name) { var p = proj(pid); var a = p && (p.angles || []).find(function (x) { return x.name === name; }); return a ? a.id : ""; }
    function reelByHook(pid, text) {
      var p = proj(pid), r = p && (p.reels || []).find(function (x) { return (x.hooks || []).some(function (h) { return h.text === text; }); });
      return r ? r.id : "";
    }
    function L(label, url) { return { label: label, url: url }; }
    function sc(v, x, s) { return { v: v, x: x, s: s }; }
    function log(n, who, text) { return [{ at: d(-n) + "T10:00", who: who, text: text }]; }
    function idea(o) {
      return Object.assign({ stage: "idea", clientId: "", projectId: "", angleId: "", angle: "", hook: "", concept: "", script: "", scenes: [], mode: "D", format: "9x16", refs: [], boardId: "",
        owner: "mheni", tags: [], priority: 2, reelId: "", created: d(-3), shareOk: false, reviewAsked: false, notes: "", log: [] }, o);
    }

    data.colls.ideas = [
      idea({
        id: "idea1", title: "Three generations, one jar", stage: "idea", clientId: "cjas", projectId: "pjas", angle: "Smells like home", angleId: angle("pjas", "Smells like home"),
        hook: "Ask your grandmother what this smells like.", concept: "", mode: "D", owner: "medit", priority: 2, tags: ["family", "eid"], created: d(-2),
        refs: [L("Reference reel, scent memory", "https://example.com/reels/scent-memory")], log: log(2, "medit", "Idea added")
      }),
      idea({
        id: "idea2", title: "Coffee at 6:40, before the school run", stage: "idea", clientId: "ckah", projectId: "pkah", angle: "Morning ritual", angleId: angle("pkah", "Morning ritual"),
        hook: "", mode: "I", owner: "mmoh", priority: 3, tags: ["morning"], created: d(-1), log: log(1, "mmoh", "Idea added")
      }),
      idea({
        id: "idea3", title: "Guess the price on Avenue Habib Bourguiba", stage: "concept", clientId: "catl", angle: "Under 200 DT",
        hook: "We asked strangers to guess the price. Nobody got it.", concept: "Street interviews, three guesses, then the reveal on the box. Price is the first DM question, so we answer it up front and make it a game.",
        mode: "D", owner: "mheni", priority: 1, tags: ["street", "price"], created: d(-6),
        refs: [L("Street interview style", "https://example.com/inspo/street-interview"), L("Drive folder, Atlas references", "https://drive.google.com/drive/folders/atlas-refs")], log: log(6, "mheni", "Idea added")
      }),
      idea({
        id: "idea4", title: "The pharmacist reacts to your routine", stage: "concept", clientId: "cnour", projectId: "pnour2", angle: "Pharmacist says", angleId: angle("pnour2", "Pharmacist says"),
        hook: "Ma tsadakch... 9 products? The pharmacist's face says it all.", concept: "A pharmacist reads a customer's routine out loud and trims it to three steps. Trust objection first, product second.",
        mode: "D", owner: "masst", priority: 2, tags: ["trust", "derja"], created: d(-5), refs: [L("Pharmacy location photos", "https://drive.google.com/drive/folders/nour-pharmacy")], log: log(5, "masst", "Idea added")
      }),
      idea({
        id: "idea5", title: "Eid gift wrapped in ten seconds", stage: "script", clientId: "cjas", projectId: "pjas", angle: "Gift without thinking", angleId: angle("pjas", "Gift without thinking"),
        hook: "Wrapped in 10 seconds. Her face took longer.", concept: "Time-lapse wrap on a market table, then the recipient opens it. Gifting searches peak the week before Eid.",
        scenes: [sc("Hands tie the ribbon, timer in the corner", "Ten seconds. Go.", 4), sc("Box slides across the market table", "No card needed, the jar says it.", 3), sc("Recipient opens the lid, smiles", "", 4), sc("Jar and price tag, Jasmin logo", "39 DT. Delivered in 48h.", 3)],
        script: "Voiceover is light and fast. End card: order by DM.", mode: "D", owner: "medit", priority: 1, tags: ["eid", "gift"], created: d(-9), reviewAsked: true,
        refs: [L("Gift unboxing reference", "https://example.com/reels/gift-unboxing")], log: log(1, "medit", "Review requested")
      }),
      idea({
        id: "idea6", title: "Brew it like my father", stage: "script", clientId: "ckah", projectId: "pkah", angle: "Morning ritual", angleId: angle("pkah", "Morning ritual"),
        hook: "Qahwa mta3 baba, ama b 40 seconde.", concept: "Warm, nostalgic start, then the modern shortcut. Most orders land before 9am, so the morning kitchen is the set.",
        scenes: [sc("Old copper pot on the stove, steam", "Baba used to take 20 minutes.", 4), sc("Kahwa Lab pouch opened, scoop", "Same taste, 40 seconds.", 4), sc("Cup on a balcony, Tunis rooftops", "", 3)],
        script: "", mode: "I", owner: "mmoh", priority: 2, tags: ["morning", "derja"], created: d(-7), refs: [L("Kitchen light reference", "https://example.com/inspo/morning-kitchen")], log: log(7, "mmoh", "Idea added")
      }),
      idea({
        id: "idea7", title: "Jar opening, close and slow", stage: "ready", clientId: "cjas", projectId: "pjas", angle: "Smells like home", angleId: angle("pjas", "Smells like home"),
        hook: "This is the sound of a Sunday in Sidi Bou Said.", concept: "Macro shots and sound only: lid, wax seal, fingertip. The smell is carried by the voice and the slow pace.",
        scenes: [sc("Macro: wax seal cracks", "", 3), sc("Fingertip on the jar rim", "Close your eyes.", 4), sc("Window light, jasmine on the sill", "Maison Jasmin. Smells like home.", 4)],
        script: "Whisper voiceover. Keep the ambient street sound under it.", mode: "I", owner: "mheni", priority: 2, tags: ["asmr", "sound"], created: d(-12),
        refs: [L("ASMR reference", "https://example.com/reels/asmr-jar"), L("Drive folder, Jasmin raw", "https://drive.google.com/drive/folders/jasmin-raw")], shareOk: true, log: log(3, "mheni", "Moved to Ready")
      }),
      idea({
        id: "idea8", title: "7 days, no filter", stage: "ready", clientId: "cnour", projectId: "pnour2", angle: "Derja voiceover", angleId: angle("pnour2", "Derja voiceover"),
        hook: "Ma tsadakch", concept: "Rania talks to camera in Derja, day 1 to day 7, same window, same light. Month 1 winner angle, new proof.",
        scenes: [sc("Rania, bare face, window light", "Nhar lawel, ma7ata7t chay.", 4), sc("Day 4, same frame, side by side", "", 3), sc("Day 7, same frame", "Hakka. Bla filter.", 4)],
        script: "Keep it unpolished. One take per day, same chair.", mode: "D", owner: "mheni", priority: 1, tags: ["derja", "proof"], created: d(-14),
        reelId: reelByHook("pnour2", "Ma tsadakch"), refs: [L("Day-by-day reference", "https://example.com/reels/7-day-skin")], shareOk: true, log: log(4, "mheni", "Sent to project as a reel")
      }),
      idea({
        id: "idea9", title: "Guess the price", stage: "ready", clientId: "catl", projectId: "patl", angle: "Under 200 DT", angleId: angle("patl", "Under 200 DT"),
        hook: "Guess the price", concept: "Price reveal on the box. Won last drop: lowest cost per purchase of the batch.",
        scenes: [sc("Pair on a table, hand covers the tag", "Guess the price.", 3), sc("Tag flips over", "", 2)], script: "", mode: "D", owner: "mheni", priority: 3, tags: ["price"], created: d(-40),
        reelId: reelByHook("patl", "Guess the price"), log: log(20, "mheni", "Sent to project as a reel")
      }),
      idea({
        id: "idea10", title: "Latte art battle", stage: "parked", parkedFrom: "idea", clientId: "ckah", angle: "", hook: "Two baristas, one cup, one winner.",
        concept: "", mode: "D", owner: "mmoh", priority: 3, tags: ["fun"], created: d(-20), log: log(18, "mmoh", "Parked")
      })
    ];
  });
})(window.GK);
