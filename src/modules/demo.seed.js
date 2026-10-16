/* GECKO Ops · demo data: a full, living studio year so every screen has something real to show.
   Runs after every other seed. Adds to the collections (never replaces). Invented brands and people only;
   client contacts are fake (+216 20 000 0xx, @example.com). Every date is relative to today.
   Business rules kept: no shoot before the plan is approved and the upfront invoice is paid, no files before
   full payment, commission only once fully paid and delivered, yearly turnover well under the cap,
   pass-through extras flagged, 1 DT stamp, 3% withholding for company clients.
   Existing records changed in place: the four sample team members get a job title; opening cash is set to a realistic balance. */
(function (GK) {
  "use strict";
  GK.seedExtra = GK.seedExtra || [];
  GK.seedExtra.push(function (data, ctx) {
    var u = ctx.u, m = ctx.m, d = ctx.d, C = data.colls;
    ["team", "clients", "leads", "outreach", "contracts", "projects", "invoices", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "expenses", "quotes"].forEach(function (k) { C[k] = C[k] || []; });

    // deterministic pseudo-random numbers, so the demo looks the same on every reload
    var seed = 20261011;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function between(a, b, dec) { var f = Math.pow(10, dec || 0); return Math.round((a + rnd() * (b - a)) * f) / f; }
    function r2(n) { return Math.round(n * 100) / 100; }
    function at(n, hhmm) { return d(n) + "T" + hhmm; }
    /** a log line n days ago */
    function L(text, n, who, hhmm) { return { at: at(-n, hhmm || "10:00"), who: who || "mheni", text: text }; }
    var uidN = 0;
    function id(p) { uidN++; return p + "x" + uidN.toString(36); }

    // ================= team =================
    var titles = { mheni: "Founder, creative director", mmoh: "Sales and outreach", medit: "Freelance editor", masst: "Production assistant" };
    C.team.forEach(function (t) { if (titles[t.id] && !t.title) t.title = titles[t.id]; });
    var newTeam = [
      { id: "mamira", name: "Amira", role: "editor", title: "Freelance editor" },
      { id: "mouss", name: "Oussama", role: "editor", title: "Freelance editor" },
      { id: "mwalid", name: "Walid", role: "editor", title: "Videographer" },
      { id: "mnes", name: "Nesrine", role: "editor", title: "Motion designer" },
      { id: "mskan", name: "Skander", role: "assistant", title: "Media buyer" },
      { id: "mrim", name: "Rim", role: "assistant", title: "Voice-over artist" }
    ];
    C.team = C.team.concat(newTeam.filter(function (t) { return !C.team.some(function (x) { return x.id === t.id; }); }));

    // ================= clients =================
    function cl(o, k) {
      var ph = "+216 20 000 0" + String(10 + k).padStart(2, "0");
      return Object.assign({ phone: ph, whatsapp: ph, email: o.contact.toLowerCase() + "@example.com", taxId: "", buyer: "In-house", log: [] }, o);
    }
    var CL = [
      { id: "cmed", brand: "Medina Threads", code: "THREADS", contact: "Yasmine", sector: "Fashion", taxId: "1100001/A/M/000", buyer: "In-house", baseline: { v: 26, date: d(-170) },
        notes: "Loyal. Three GRIPs, now moving to SKIN 10. Pays within two days. Loves the styling angle.", noun: "jacket",
        log: [L("SKIN 10 contract signed", 8, "mmoh"), L("Winter coats plan approved", 5)] },
      { id: "csid", brand: "Sidi Denim", code: "SIDI", contact: "Fares", sector: "Fashion", taxId: "1100002/B/M/000", buyer: "Freelance media buyer", baseline: { v: 18, date: d(-350) },
        notes: "Churn risk. Three SKIN months last winter, quiet since. Renewal quote expired. Their media buyer changed.", noun: "jeans",
        log: [L("Renewal quote expired", 20, "mmoh"), L("Called Fares, no answer", 6, "mmoh")] },
      { id: "cfid", brand: "Fidda Studio", code: "FIDDA", contact: "Leila", sector: "Jewelry", taxId: "1100003/C/M/000", buyer: "In-house", baseline: { v: 11, date: d(-255) },
        notes: "Paused after three SKIN months. Wants to come back for the gifting season. Warm.", noun: "necklace",
        log: [L("Check-in: back for gifting season?", 9, "mheni")] },
      { id: "ckel", brand: "Kelibia Fit", code: "KFIT", contact: "Hamza", sector: "Fitness", taxId: "1100004/A/M/000", buyer: "GECKO (Skander)", baseline: { v: 15, date: d(-95) },
        notes: "Started with a GRIP, upgraded to SKIN 10. Best results in the book on the squat-proof angle.", noun: "leggings",
        log: [L("Month 2 shoot done", 2, "mwalid"), L("Month 1 report sent", 7)] },
      { id: "char", brand: "Harissa House", code: "HARISSA", contact: "Mourad", sector: "Food", taxId: "1100005/B/M/000", buyer: "In-house", baseline: { v: 40, date: d(-10) },
        notes: "New. SKIN 20 from this month. Ships to France too, wants a diaspora angle.", noun: "jar",
        log: [L("Month 1 paid", 4, "mmoh"), L("Plan approved", 3)] },
      { id: "cbyr", brand: "Byrsa Grill", code: "BYRSA", contact: "Sonia", sector: "Restaurant", taxId: "1100006/C/M/000", buyer: "In-house", baseline: { v: 120, date: d(-140) },
        notes: "Restaurant in La Marsa. Baseline is covers per week. One GRIP, iftar menu quote out now.", noun: "brunch",
        log: [L("Iftar menu quote sent", 4, "mmoh")] },
      { id: "ccab", brand: "Cable Corner", code: "CABLE", contact: "Anis", sector: "Tech accessories", taxId: "1100007/A/M/000", buyer: "Agency", baseline: { v: 33, date: d(-215) },
        notes: "Late payer: deposit came 8 days late, balance overdue now. Files stay locked until paid. Always polite, always late.", noun: "power bank",
        log: [L("Balance reminder sent on WhatsApp", 3, "mmoh"), L("Deposit received, 8 days late", 15, "mmoh")] },
      { id: "carg", brand: "Argan Bloom", code: "ARGAN", contact: "Meriem", sector: "Cosmetics", taxId: "", buyer: "In-house", baseline: { v: 9, date: d(-295) },
        notes: "Lost. One GRIP in winter, declined the second batch and went to another studio. Keep in touch, no push.", noun: "oil",
        log: [L("Marked lost: went elsewhere", 200, "mmoh")] },
      { id: "cnab", brand: "Nabeul Ceramics", code: "NABEUL", contact: "Tarek", sector: "Home", taxId: "1100009/C/M/000", buyer: "In-house", baseline: { v: 14, date: d(-128) },
        notes: "SEASON in summer, great results on the hand-painted angle. Balance invoice reissued once (wrong amount).", noun: "plate",
        log: [L("Client page published", 5)] },
      { id: "czin", brand: "Zina Hair", code: "ZINA", contact: "Asma", sector: "Haircare", taxId: "", buyer: "In-house", baseline: { v: 7, date: d(-6) },
        notes: "New. Small brand, sells by DM only. Deposit invoice sent, plan in review.", noun: "hair mask",
        log: [L("Deposit invoice sent", 3, "mmoh")] },
      { id: "cdje", brand: "Djerba Dates", code: "DJERBA", contact: "Bilel", sector: "Food", taxId: "1100011/B/M/000", buyer: "Freelance media buyer", baseline: { v: 22, date: d(-9) },
        notes: "New. Gift boxes for the diaspora. Deposit paid, shoot in Houmt Souk.", noun: "gift box",
        log: [L("Deposit paid", 6, "mmoh")] },
      { id: "cbam", brand: "Bambino Tunis", code: "BAMBINO", contact: "Houda", sector: "Kids", taxId: "", buyer: "In-house", baseline: { v: 0, date: "" },
        notes: "New. Kids clothing, first ads ever. Onboarding call booked.", noun: "set",
        log: [L("Won from a referral", 2, "mmoh")] }
    ];
    CL.forEach(function (c) { delete c.noun; });
    C.clients = C.clients.concat(CL.map(cl));
    function client(cid) { return C.clients.find(function (c) { return c.id === cid; }) || {}; }

    // ================= creative banks =================
    var BANK = {
      cmed: { angles: [["Made in the medina", "Buyers ask where it is sewn before they ask the price"], ["One piece, three looks", "Styling videos get twice the saves"], ["Fits real bodies", "Size questions fill the DMs"], ["Under 150 DT", "Price is the first thing people ask"]],
        hooks: ["Sewn 400 metres from Bab Souika", "One jacket, three outfits, zero effort", "Real sizes, real people, no edits", "Guess where this was made", "Your winter jacket called. It's tired.", "We styled it for work, dinner and the souk", "Stop buying jackets that only fit the mannequin", "Under 150 DT and it looks like 400"],
        script: ["Tailor's hands, then the street at golden hour.", "Three outfits, one jacket, quick cuts on the beat.", "Five friends, five sizes, same jacket.", "Price tag reveal on the hanger."] },
      csid: { angles: [["Breaks in, not down", "Returns mention stiff denim"], ["Tunis street fit", "Their buyers live in the city"], ["Raw denim care", "Care questions in every comment"]],
        hooks: ["Wear them 30 days. Then look.", "These jeans walked the whole medina", "Never wash your jeans like this", "The fit that survives the louage", "Raw denim, explained in 10 seconds", "Same jeans, day 1 and day 60"],
        script: ["Day 1 vs day 60, same jeans, same street.", "Folding, cuffing, walking.", "Washing tip on the balcony."] },
      cfid: { angles: [["Gift she keeps", "Most orders are gifts"], ["Handmade in the souk", "The silver workshop is the story"], ["Stack it daily", "Repeat buyers stack pieces"]],
        hooks: ["She'll wear this every single day", "Made by hand, 200 metres from the Zitouna", "Three rings, one stack, all week", "The gift that never goes in a drawer", "Hammered silver, filmed up close", "Her reaction says it all"],
        script: ["Silversmith's hammer, sparks, the finished piece.", "Gift box opened at a cafe table.", "Stacking rings on one hand, slow."] },
      ckel: { angles: [["Squat-proof", "Sheer leggings are the top worry"], ["Beach workout in Kelibia", "Sunrise training content performs"], ["Coach approved", "Trust from local coaches"], ["30-day challenge", "Their community loves challenges"]],
        hooks: ["The squat test nobody else will film", "Sunrise in Kelibia, workout done", "Our coach tried to break them", "Day 1 of 30. Join us.", "Sweat test: 45 minutes, no marks", "Not see-through. We checked.", "The leggings coaches actually wear", "Your gym bag needs one thing"],
        script: ["Squat in front of the window light, slow motion.", "Beach at sunrise, three exercises, quick cuts.", "Coach talks to camera, then trains.", "Challenge calendar on screen, day by day."] },
      char: { angles: [["Grandma's recipe", "Customers mention their grandmother's harissa"], ["Heat levels", "People ask how spicy before ordering"], ["On everything", "Usage ideas drive repeat orders"], ["Taste of home abroad", "A third of orders ship to France"]],
        hooks: ["My grandmother would approve. Barely.", "Level 1 to level 5. How far can you go?", "Harissa on pizza? Yes.", "When you live in Lyon and miss home", "We made our editor taste level 5", "The jar that goes in every suitcase", "Breakfast, lunch, dinner. Same jar.", "Sun-dried, hand-pounded, no shortcuts"],
        script: ["Mortar and pestle, close, the sound first.", "Spice ladder: five spoons, five reactions.", "Three dishes in 15 seconds.", "Suitcase opens in Paris, the jar comes out."] },
      cbyr: { angles: [["Weekend ritual", "Most covers are Saturday and Sunday"], ["Sea view tables", "Guests post the view"]],
        hooks: ["Your Saturday starts at this table", "Brunch with the sea in frame", "We counted: 14 plates, one table", "The terrace before anyone arrives"],
        script: ["Plates landing on the table, top shot.", "Terrace at 9am, waves behind."] },
      ccab: { angles: [["Survives the louage", "Buyers travel between cities"], ["Fast charge test", "Speed is the main question"], ["Under 60 DT", "Price-sensitive audience"]],
        hooks: ["Tunis to Sousse on one charge", "0 to 50% before your coffee", "We dropped it. Twice.", "Your phone dies at 4pm. Not anymore.", "Under 60 DT, honestly tested", "Fits in the smallest pocket"],
        script: ["Louage window, phone plugged in, timer.", "Coffee cup, timer, battery icon.", "Drop test on tiles."] },
      carg: { angles: [["Real argan, real results", "Customers fear fake oils"], ["Ten-second routine", "Busy mornings"]],
        hooks: ["How to spot fake argan oil", "Ten seconds, every morning", "Three drops. That's it.", "We tested it on dry winter hands"],
        script: ["Two oils side by side, the cold test.", "Morning routine, timer on screen."] },
      cnab: { angles: [["Painted by hand", "The painter is the story"], ["Table for the holidays", "Gifting and family meals"], ["Ships without a crack", "Breakage is the top fear"], ["From the kiln", "Process content performs"]],
        hooks: ["Every line is painted by Am Salah", "The table your family will talk about", "We shipped it to Tozeur and back", "Opening the kiln at 6am", "No two plates are the same", "Packed like it's going to space"],
        script: ["Brush on clay, one long stroke.", "Family table, hands reaching.", "Drop test in the box, then unboxing.", "Kiln door opens, steam."] },
      czin: { angles: [["Curls without frizz", "Humidity questions"], ["Salon at home", "Salon results without the salon visit"]],
        hooks: ["Humidity 80%. Curls still holding.", "The salon result, in your bathroom", "Asma tried it on her own hair", "Wash day, but easier"],
        script: ["Before and after in the same light.", "Bathroom routine, 4 steps."] },
      cdje: { angles: [["From the palm to your door", "Freshness questions"], ["Gift for the diaspora", "Orders spike before holidays"]],
        hooks: ["Picked in Djerba on Monday", "The box your aunt in Paris wants", "Deglet nour, opened on camera", "Gift box, 3 sizes, one minute"],
        script: ["Palm, harvest, packing table.", "Box opened at a family table abroad."] },
      cbam: { angles: [["Survives the playground", "Parents want sturdy clothes"], ["Soft for sensitive skin", "Skin questions in DMs"]],
        hooks: ["Washed 30 times. Still soft.", "Playground test, filmed by a 6-year-old", "Mum's verdict after one month", "Zero labels that scratch"],
        script: ["Kids running, slow motion.", "Fabric close-up, hand stroking."] }
    };
    var VAR = ["Wait for the end", "POV: you finally found it", "Nobody tells you this", "Is it worth it? Honest answer", "Watch this before you order", "The DM we get every day", "Three reasons it sells out", "We almost didn't post this", "Day 1 vs day 30", "Made in Tunisia, and it shows"];
    var CAR = ["How to wear it", "Care guide in 5 slides", "What's in the box", "Reviews from Sfax to Bizerte", "Sizes, explained", "Gift guide"];

    // ================= projects =================
    var P = [], projIdx = {};
    function angleList(cid, n) { return BANK[cid].angles.slice(0, n).map(function (a) { return { id: id("a"), name: a[0], why: a[1] }; }); }
    function hookStatus(stage, ri, hi) {
      if (["delivered", "testing", "report", "done"].indexOf(stage) > -1) return "approved";
      if (stage === "edit") return ["approved", "approved", "review", "edit", "revise", "review", "edit", "todo", "approved"][(ri * 3 + hi) % 9];
      return "todo";
    }
    function buildReels(p, nReels, hooksPer, nCar, withResults) {
      var b = BANK[p.clientId], off = P.length * 3;
      p.reels = []; p.carousels = [];
      for (var ri = 0; ri < nReels; ri++) {
        var a = p.angles[ri % p.angles.length], hooks = [];
        for (var hi = 0; hi < hooksPer; hi++) {
          var text = hi === 0 ? b.hooks[(ri + off) % b.hooks.length] : hi === 1 ? VAR[(ri + off) % VAR.length] : b.hooks[(ri + off + 3) % b.hooks.length];
          var st = hookStatus(p.stage, ri, hi);
          var h = { id: id("h"), text: text, status: st, v: st === "revise" ? 2 : 1, clientOk: st === "approved", drive: st === "approved" ? "https://drive.google.com/drive/folders/gk-demo-" + p.id + "-r" + ri : "" };
          if (st === "revise") h.note = "Client asked for a shorter first second";
          if (withResults && hi < 2 && (withResults === "all" || ri < nReels / 2)) {
            var good = a === p.angles[0];
            h.results = { hook: between(good ? 28 : 16, good ? 44 : 30), ctr: between(good ? 1.2 : 0.6, good ? 2.6 : 1.4, 1), cpp: between(good ? 3.5 : 7, good ? 7 : 14, 1) };
          }
          hooks.push(h);
        }
        p.reels.push({ id: id("r"), angleId: a.id, mode: ri % 2 ? "I" : "D", format: ri % 5 === 4 ? "4x5" : "9x16", script: b.script[ri % b.script.length], drive: "", hooks: hooks });
      }
      for (var ci = 0; ci < nCar; ci++) {
        var cst = hookStatus(p.stage, ci, 0);
        p.carousels.push({ id: id("k"), angleId: p.angles[ci % p.angles.length].id, title: CAR[ci % CAR.length], status: cst, v: 1, clientOk: cst === "approved", drive: cst === "approved" ? "https://drive.google.com/drive/folders/gk-demo-" + p.id + "-c" + ci : "" });
      }
    }
    // reels, hooks per reel, carousels, angles
    var PACKSIZE = { GRIP: [4, 3, 0, 2], SEASON: [16, 3, 4, 4], SKIN10: [10, 3, 3, 3], SKIN20: [20, 3, 6, 4] };
    function proj(o) {
      var si = ["onboard", "plan", "shoot", "edit", "delivered", "testing", "report", "done"].indexOf(o.stage) /* written against the first stages; migrated after */, ps = PACKSIZE[o.pack];
      var p = { id: o.id, clientId: o.clientId, contractId: o.contractId || "", month: o.month || 0, name: o.name, pack: o.pack, stage: o.stage,
        planApproved: o.plan != null, planApprovedOn: o.plan != null ? d(o.plan) : "", shootDate: o.shoot != null ? d(o.shoot) : "", format: "9x16", mohamed: !!o.mohamed,
        onboarding: [0, 1, 2, 3, 4, 5, 6].map(function (k) { return si >= 2 ? true : si === 1 ? k < 5 : k < (o.ob || 2); }),
        angles: si >= 1 ? angleList(o.clientId, ps[3]) : [], reels: [], carousels: [], costs: si >= 1 ? m.estimateCosts(o.pack) : [],
        report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: null, log: o.log || [] };
      (o.extraCosts || []).forEach(function (c) { p.costs.push({ id: id("c"), kind: c[0], label: c[1], amount: c[2] }); });
      if (si >= 2) buildReels(p, o.stage === "shoot" ? Math.ceil(ps[0] * 0.6) : ps[0], ps[1], o.stage === "shoot" ? 0 : ps[2], si >= 6 ? "all" : o.stage === "testing" ? "half" : null);
      if (o.report) {
        p.report = { metric: "cpp", now: o.report[0], why: {}, more: o.report[1], kill: o.report[2], next: o.report[3] };
        p.report.why[p.angles[0].id] = o.report[4] || "Lowest price per purchase of the batch";
      }
      P.push(p); projIdx[p.id] = p; return p;
    }
    var FL = "freelance";
    // Sidi Denim · SKIN 10 · ended last winter (churn risk)
    proj({ id: "psid1", clientId: "csid", contractId: "ksid", month: 1, name: "Month 1", pack: "monthly8", stage: "done", shoot: -335, plan: -339, mohamed: true, report: ["9.4", "Day 1 vs day 60", "Studio packshots", "More street walking", "Proof beats polish"] });
    proj({ id: "psid2", clientId: "csid", contractId: "ksid", month: 2, name: "Month 2", pack: "monthly8", stage: "done", shoot: -305, plan: -309, mohamed: true, report: ["8.1", "Street fit", "Care tips", "Louage test"] });
    proj({ id: "psid3", clientId: "csid", contractId: "ksid", month: 3, name: "Month 3", pack: "monthly8", stage: "done", shoot: -275, plan: -279, mohamed: true, report: ["8.8", "Street fit", "Washing tip", "Renewal: new angle on fit"] });
    // Argan Bloom · GRIP · lost after this one
    proj({ id: "parg", clientId: "carg", name: "Glow kit", pack: "test", stage: "done", shoot: -280, plan: -290, mohamed: true, report: ["11.2", "Spot the fake", "Routine timer", "Second batch (declined)"] });
    // Fidda Studio · SKIN 10 · three months, paused
    proj({ id: "pfid1", clientId: "cfid", contractId: "kfid", month: 1, name: "Month 1", pack: "monthly8", stage: "done", shoot: -240, plan: -244, mohamed: false, report: ["7.6", "Gift reactions", "Flat lays", "Workshop sparks"] });
    proj({ id: "pfid2", clientId: "cfid", contractId: "kfid", month: 2, name: "Month 2", pack: "monthly8", stage: "done", shoot: -210, plan: -214, mohamed: false, report: ["6.2", "Workshop sparks", "Stacking", "Gift box"] });
    proj({ id: "pfid3", clientId: "cfid", contractId: "kfid", month: 3, name: "Month 3", pack: "monthly8", stage: "done", shoot: -180, plan: -184, mohamed: false, report: ["5.9", "Gift she keeps", "Price reveal", "Come back for gifting season"] });
    proj({ id: "pcab1", clientId: "ccab", name: "Earbuds launch", pack: "test", stage: "done", shoot: -200, plan: -208, mohamed: true, report: ["6.8", "Drop test", "Unboxing", "Power bank next"] });
    proj({ id: "pmed1", clientId: "cmed", name: "Summer drop", pack: "test", stage: "done", shoot: -150, plan: -158, mohamed: true, report: ["5.1", "Three looks", "Mannequin shots", "Real sizes"] });
    proj({ id: "pbyr", clientId: "cbyr", name: "Weekend brunch", pack: "test", stage: "done", shoot: -125, plan: -131, mohamed: false, extraCosts: [["other", "Food for the shoot", 85]], report: ["2.4", "Sea view", "Menu board", "Iftar menu"] });
    proj({ id: "pnab", clientId: "cnab", name: "Summer season", pack: "campaign", stage: "done", shoot: -110, plan: -120, mohamed: true, extraCosts: [[FL, "Second camera (Walid)", 250], [FL, "Motion titles (Nesrine)", 160]], report: ["4.7", "Painter close-ups", "Lifestyle table", "Holiday table set"] });
    proj({ id: "pkel0", clientId: "ckel", name: "Squat test", pack: "test", stage: "done", shoot: -85, plan: -92, mohamed: true, report: ["4.2", "Squat-proof", "Gym b-roll", "Upgrade to SKIN 10"] });
    proj({ id: "pkel1", clientId: "ckel", contractId: "kkel", month: 1, name: "Month 1", pack: "monthly8", stage: "report", shoot: -30, plan: -33, mohamed: true, extraCosts: [[FL, "Voice-over (Rim)", 90]],
      report: ["5.2", "Squat-proof, sunrise beach", "Coach talking head", "30-day challenge series", "The squat test answers the first worry in 3 seconds"], log: [L("Report sent to Hamza", 7)] });
    proj({ id: "pmed2", clientId: "cmed", name: "Back to school", pack: "test", stage: "delivered", shoot: -24, plan: -32, mohamed: true,
      log: [L("Files delivered", 6, "medit"), L("Balance paid, files unlocked", 12, "mmoh")] });
    proj({ id: "pcab2", clientId: "ccab", name: "Power bank drop", pack: "test", stage: "edit", shoot: -13, plan: -24, mohamed: true,
      log: [L("Editing started", 11, "mamira"), L("Balance overdue: files stay locked", 4, "mmoh")] });
    proj({ id: "pkel2", clientId: "ckel", contractId: "kkel", month: 2, name: "Month 2", pack: "monthly8", stage: "edit", shoot: -2, plan: -5, mohamed: true, extraCosts: [[FL, "Voice-over (Rim)", 90]],
      log: [L("Plan approved", 5), L("Shoot done at the beach, 31 clips", 2, "mwalid")] });
    proj({ id: "phar1", clientId: "char", contractId: "khar", month: 1, name: "Month 1", pack: "monthly12", stage: "shoot", shoot: 4, plan: -3, mohamed: true, extraCosts: [[FL, "Motion titles (Nesrine)", 160]],
      log: [L("Month 1 paid", 4, "mmoh"), L("Plan approved by Mourad", 3)] });
    proj({ id: "pmed3", clientId: "cmed", name: "Winter coats", pack: "test", stage: "shoot", shoot: 3, plan: -5, mohamed: true, log: [L("Deposit paid", 7, "mmoh"), L("Plan approved", 5)] });
    proj({ id: "pdje", clientId: "cdje", name: "Gift boxes", pack: "test", stage: "plan", shoot: 18, plan: -4, mohamed: true, extraCosts: [["other", "Ferry and hotel, Djerba", 140]], log: [L("Deposit paid", 6, "mmoh"), L("Plan approved", 4)] });
    proj({ id: "pzina", clientId: "czin", name: "Launch", pack: "test", stage: "plan", shoot: null, plan: null, mohamed: true, log: [L("Deposit invoice sent", 3, "mmoh"), L("Creative plan sent for review", 2)] });
    proj({ id: "pbam", clientId: "cbam", name: "First campaign", pack: "test", stage: "onboard", shoot: null, plan: null, mohamed: true, ob: 2, log: [L("Project created", 2, "mmoh")] });
    proj({ id: "pmedk1", clientId: "cmed", contractId: "kmed", month: 1, name: "Month 1", pack: "monthly8", stage: "onboard", shoot: 26, plan: null, mohamed: true, ob: 3, log: [L("Contract signed", 8, "mmoh")] });
    C.projects = C.projects.concat(P);

    // ================= contracts =================
    C.contracts = C.contracts.concat([
      { id: "ksid", clientId: "csid", pack: "monthly8", start: u.month(d(-342)), minMonths: 3, status: "ended", log: [L("Ended after 3 months", 262, "mheni")] },
      { id: "kfid", clientId: "cfid", pack: "monthly8", start: u.month(d(-247)), minMonths: 3, status: "ended", log: [L("Paused after 3 months", 170, "mheni")] },
      { id: "kkel", clientId: "ckel", pack: "monthly8", start: u.month(d(-36)), minMonths: 3, status: "active", log: [L("Signed", 40, "mmoh")] },
      { id: "khar", clientId: "char", pack: "monthly12", start: u.month(d(-6)), minMonths: 3, status: "active", log: [L("Signed", 9, "mmoh")] },
      { id: "kmed", clientId: "cmed", pack: "monthly8", start: u.month(d(26)), minMonths: 3, status: "active", log: [L("Signed, starts next month", 8, "mmoh")] }
    ]);

    // ================= invoices =================
    var INV = [];
    function wh(cid, amount) { return client(cid).taxId ? r2(amount * 0.03) : 0; }
    /** issued: days from today (null = draft); pays: [[days, 1 (in full) or a net amount, method]] */
    function inv(pid, kind, label, amount, issued, dueIn, pays, extra) {
      var p = projIdx[pid] || C.projects.find(function (x) { return x.id === pid; }), cid = p.clientId;
      var o = { id: id("inv"), no: issued == null ? "" : "GK-0000-000", clientId: cid, projectId: pid, kind: kind, label: label, amount: amount, stamp: 1,
        issued: issued == null ? "" : d(issued), due: issued == null ? "" : d(issued + (dueIn == null ? 7 : dueIn)), payments: [], credited: false, passThrough: false, log: [] };
      var tot = amount + 1, w = wh(cid, amount);
      (pays || []).forEach(function (x) {
        if (x[1] === 1) o.payments.push({ date: d(x[0]), net: r2(tot - w), withheld: w, method: x[2] || "transfer", ref: "" });
        else o.payments.push({ date: d(x[0]), net: x[1], withheld: 0, method: x[2] || "transfer", ref: "" });
      });
      if (o.issued) o.log.push({ at: o.issued + "T09:30", who: "mheni", text: "Issued" });
      o.payments.forEach(function (x) { o.log.push({ at: x.date + "T15:10", who: "mmoh", text: "Payment received: " + x.net + " DT" }); });
      Object.assign(o, extra || {});
      INV.push(o); return o;
    }
    function lab(pid, what) { var p = projIdx[pid]; return m.pack(p.pack).name + " · " + p.name + " · " + what; }
    function grip(pid, dep, depPaid, bal, balPaid) {
      inv(pid, "deposit", lab(pid, "deposit"), 750, dep, 7, depPaid != null ? [[depPaid, 1]] : []);
      inv(pid, "balance", lab(pid, "balance"), 750, bal, 7, balPaid != null ? [[balPaid, 1]] : []);
    }
    function month(pid, issued, paid) { var p = projIdx[pid]; return inv(pid, "month", m.pack(p.pack).name + " · month " + p.month, m.pack(p.pack).price, issued, 7, paid != null ? [[paid, 1]] : []); }
    function pass(pid, label, amount, issued, paid) { return inv(pid, "extra", label, amount, issued, 7, paid != null ? [[paid, 1]] : [], { passThrough: true }); }
    function extra(pid, label, amount, issued, paid) { return inv(pid, "extra", label, amount, issued, 7, paid != null ? [[paid, 1]] : []); }

    month("psid1", -342, -339); month("psid2", -312, -308); month("psid3", -282, -279);
    pass("psid2", "Studio day (pass-through)", 280, -303, -298); pass("psid3", "Studio day (pass-through)", 280, -273, -268);
    grip("parg", -294, -291, -272, -268); pass("parg", "Make-up artist (pass-through)", 150, -279, -270);
    month("pfid1", -247, -245); month("pfid2", -217, -214); month("pfid3", -187, -185);
    pass("pfid2", "Hand model fee (pass-through)", 200, -209, -205); pass("pfid3", "Hand model fee (pass-through)", 200, -179, -176);
    extra("pfid3", "Two extra reels for the gift guide", 300, -176, -172);
    grip("pcab1", -214, -207, -190, -150);
    grip("pmed1", -164, -162, -142, -140); pass("pmed1", "Model fee (pass-through)", 220, -149, -146);
    grip("pbyr", -139, -137, -117, -115); extra("pbyr", "Menu carousel, 6 slides", 240, -117, -115); pass("pbyr", "Food styling (pass-through)", 120, -124, -118);
    // Nabeul Ceramics SEASON: balance first issued with the wrong amount, credited, reissued
    inv("pnab", "deposit", lab("pnab", "deposit"), 2400, -125, 7, [[-122, 1]]);
    var wrong = inv("pnab", "balance", lab("pnab", "balance"), 2600, -100, 7, [], { credited: true });
    wrong.log.push({ at: d(-99) + "T10:05", who: "mheni", text: "Wrong amount: credited" });
    var cn = inv("pnab", "credit", "Credit note", -2600, -99, 0, [], { stamp: 0, creditFor: wrong.id });
    inv("pnab", "balance", lab("pnab", "balance"), 2400, -99, 7, [[-94, 1]]);
    pass("pnab", "Studio day (pass-through)", 280, -109, -101);
    grip("pkel0", -99, -97, -77, -75); pass("pkel0", "Gym rental (pass-through)", 150, -84, -80);
    month("pkel1", -36, -34); pass("pkel1", "Gym rental (pass-through)", 150, -29, -25); extra("pkel1", "Rush delivery, 48 hours", 200, -27, -22);
    month("pkel2", -6, -4); pass("pkel2", "Beach permit and boat (pass-through)", 180, -2, null);
    grip("pmed2", -36, -34, -15, -12); extra("pmed2", "Four extra hook variations", 160, -15, -12);
    // Cable Corner: deposit 8 days late (shoot only after it landed), balance overdue
    grip("pcab2", -30, -15, -12, null);
    month("phar1", -6, -4); pass("phar1", "Talent fee for the tasting reel (pass-through)", 350, -2, null);
    month("pmedk1", null, null);
    // Medina winter coats: deposit paid, balance issued early and part-paid (not due yet)
    inv("pmed3", "deposit", lab("pmed3", "deposit"), 750, -9, 7, [[-7, 1]]);
    inv("pmed3", "balance", lab("pmed3", "balance"), 750, -1, 7, [[0, 300, "cash"]]);
    inv("pdje", "deposit", lab("pdje", "deposit"), 750, -8, 7, [[-6, 1]]); inv("pdje", "balance", lab("pdje", "balance"), 750, null);
    inv("pzina", "deposit", lab("pzina", "deposit"), 750, -3, 7, []); inv("pzina", "balance", lab("pzina", "balance"), 750, null);
    inv("pbam", "deposit", lab("pbam", "deposit"), 750, null);
    // two extras on existing sample projects
    if (C.projects.some(function (p) { return p.id === "pnour2"; })) pass("pnour2", "Pharmacy location fee (pass-through)", 120, -3, null);
    if (C.projects.some(function (p) { return p.id === "patl"; })) extra("patl", "Two extra hook variations", 64, -19, -16);
    C.invoices = C.invoices.concat(INV);

    // commission: paid out for closed projects with a partner share; still owed on the newest delivered ones
    function received(pid) {
      return u.sum(C.invoices.filter(function (i) { return i.projectId === pid && i.kind !== "credit" && !i.credited && !(i.kind === "extra" && i.passThrough); }), function (i) {
        return Math.min(u.sum(i.payments || [], function (x) { return (+x.net || 0) + (+x.withheld || 0); }), +i.amount || 0);
      });
    }
    P.forEach(function (p) {
      if (p.stage !== "done" || !p.mohamed) return;
      var pr = received(p.id) - m.costOf(p); if (pr <= 0) return;
      var last = C.invoices.filter(function (i) { return i.projectId === p.id; }).reduce(function (a, i) { return (i.payments || []).reduce(function (b, x) { return x.date > b ? x.date : b; }, a); }, "");
      var paidOn = u.addDays(last, 12); if (paidOn > ctx.today) paidOn = ctx.today;
      p.payout = { amount: Math.round(pr * m.rules().commission / 100), paidOn: paidOn };
    });

    // ================= leads and outreach =================
    function hist(stages) { return stages.map(function (s) { return { stage: s[0], at: d(s[1]) }; }); }
    var LD = [
      ["Sfax Sneaker Lab", "Ayoub", "@sfax.sneakerlab", "teardown_dm", "dm", [1, 0, 0, 0], "test", "Send the teardown video", 0, [["dm", -1]]],
      ["Olive Grove Soap", "Nadia", "@olivegrove.soap", "teardown_dm", "dm", [1, 1, 0, 0], "test", "Follow up on the DM", 1, [["dm", -3]]],
      ["Mahdia Linen", "Lotfi", "@mahdia.linen", "teardown_dm", "dm", [1, 0, 0, 0], "test", "Second DM with a hook idea", 2, [["dm", -4]]],
      ["Tozeur Leather", "Khalil", "@tozeur.leather", "inbound", "dm", [1, 1, 0, 0], "campaign", "Reply to their question on prices", 0, [["dm", 0]]],
      ["Bizerte Bakes", "Dorra", "@bizerte.bakes", "teardown_dm", "replied", [1, 1, 1, 0], "test", "Book a 15-minute call", 1, [["dm", -7], ["replied", -2]]],
      ["Pixel Case TN", "Youssef", "@pixelcase.tn", "media_buyer", "replied", [1, 1, 0, 0], "test", "Send two case studies", -1, [["dm", -9], ["replied", -4]]],
      ["Gabes Henna Co", "Salwa", "@gabes.henna", "teardown_dm", "replied", [1, 0, 0, 0], "test", "Ask for orders per week", 3, [["dm", -6], ["replied", -1]]],
      ["Carthage Kids", "Aymen", "@carthage.kids", "referral", "call", [1, 1, 1, 0], "monthly8", "Call Tuesday 15:00", 2, [["dm", -12], ["replied", -9], ["call", -1]]],
      ["Hammam Glow", "Emna", "@hammam.glow", "warm", "call", [1, 1, 1, 1], "monthly8", "Discovery call, bring the Kelibia results", 0, [["dm", -10], ["replied", -6], ["call", -3]]],
      ["Sousse Surf Shop", "Firas", "@soussesurf", "media_buyer", "call", [1, 1, 0, 0], "test", "Call after their stock arrives", 6, [["dm", -15], ["replied", -11], ["call", -5]]],
      ["Bled Coffee Roasters", "Nizar", "@bled.roasters", "warm", "proposal", [1, 1, 1, 1], "campaign", "Proposal follow-up", -2, [["dm", -21], ["replied", -18], ["call", -12], ["proposal", -6]]],
      ["Lumiere Lingerie", "Sarra", "@lumiere.lingerie", "referral", "proposal", [1, 1, 1, 1], "monthly12", "Answer questions on the 3-month minimum", 1, [["dm", -18], ["replied", -15], ["call", -9], ["proposal", -3]]],
      ["Harissa House", "Mourad", "@harissa.house", "teardown_dm", "won", [1, 1, 1, 1], "monthly12", "", null, [["dm", -40], ["replied", -35], ["call", -25], ["proposal", -18], ["won", -9]]],
      ["Zina Hair", "Asma", "@zina.hair", "inbound", "won", [1, 1, 0, 1], "test", "", null, [["dm", -20], ["call", -12], ["proposal", -8], ["won", -4]]],
      ["Djerba Dates", "Bilel", "@djerba.dates", "media_buyer", "won", [1, 1, 1, 1], "test", "", null, [["dm", -30], ["replied", -26], ["call", -19], ["proposal", -14], ["won", -10]]],
      ["Bambino Tunis", "Houda", "@bambino.tunis", "referral", "won", [1, 0, 0, 1], "test", "", null, [["dm", -11], ["call", -6], ["proposal", -4], ["won", -2]]],
      ["Kairouan Rugs", "Habib", "@kairouan.rugs", "teardown_dm", "lost", [1, 0, 0, 0], "test", "", null, [["dm", -40], ["replied", -36], ["lost", -30]], "no_budget"],
      ["Monastir Swim", "Hiba", "@monastir.swim", "teardown_dm", "lost", [1, 1, 0, 0], "test", "", null, [["dm", -50], ["lost", -35]], "no_reply"],
      ["Argan Bloom", "Meriem", "@argan.bloom", "warm", "lost", [1, 1, 1, 0], "test", "", null, [["dm", -215], ["call", -208], ["proposal", -204], ["lost", -200]], "went_elsewhere"]
    ];
    LD.forEach(function (x, k) {
      var owner = k % 5 === 3 ? "mheni" : "mmoh", last = x[9][x[9].length - 1];
      C.leads.push({ id: id("lead"), brand: x[0], contact: x[1], handle: x[2], channel: x[3], stage: x[4], q: x[5].map(Boolean), pack: x[6], next: x[7], nextDate: x[8] == null ? "" : d(x[8]),
        owner: owner, lostReason: x[10] || "", history: hist(x[9]), log: [L(x[4] === "dm" ? "DM sent" : "Moved to " + x[4], -last[1], owner, "11:" + String(10 + k).padStart(2, "0"))] });
    });
    var have = {}; C.outreach.forEach(function (o) { have[o.id] = 1; });
    for (var dd = 1; dd <= 60; dd++) {
      var day = d(-dd), wd = new Date(day + "T12:00:00").getDay();
      if (wd === 0) continue;
      var rowM = { id: day + "_mmoh", date: day, owner: "mmoh", dms: between(7, 13), replies: between(0, 3), calls: rnd() < 0.2 ? 1 : 0 };
      if (!have[rowM.id]) C.outreach.push(rowM);
      if (dd % 3 === 0 && wd !== 6) { var rowH = { id: day + "_mheni", date: day, owner: "mheni", dms: between(2, 5), replies: between(0, 1), calls: 0 }; if (!have[rowH.id]) C.outreach.push(rowH); }
    }

    // ================= quotes =================
    function invOf(pid) { return C.invoices.filter(function (i) { return i.projectId === pid && i.kind !== "extra"; }).map(function (i) { return i.id; }); }
    var QS = [
      { clientId: "cmed", projectId: "pmedk1", pack: "monthly8", title: "SKIN 10 · monthly creative", lines: [{ label: "SKIN 10: one shoot a month, 10 reels, 20 hook variations, 3 carousels", qty: 1, price: 3500 }], amount: 3500, status: "accepted", validUntil: d(4), sentOn: d(-14), acceptedOn: d(-8), note: "3-month minimum, paid at the start of each month.", invoiceIds: invOf("pmedk1") },
      { clientId: "char", projectId: "phar1", pack: "monthly12", title: "SKIN 20 · monthly creative", lines: [{ label: "SKIN 20: one long shoot a month, 20 reels, 40 hook variations, 6 carousels", qty: 1, price: 5000 }], amount: 5000, status: "accepted", validUntil: d(-2), sentOn: d(-16), acceptedOn: d(-9), note: "", invoiceIds: invOf("phar1") },
      { clientId: "cbam", projectId: "pbam", pack: "test", title: "GRIP · First campaign", lines: [{ label: "GRIP pack: 2 angles, 4 reels, 8 hook variations", qty: 1, price: 1500 }], amount: 1500, status: "accepted", validUntil: d(10), sentOn: d(-4), acceptedOn: d(-2), note: "", invoiceIds: invOf("pbam") },
      { clientId: "cbyr", projectId: "", pack: "test", title: "GRIP · Iftar menu", lines: [{ label: "GRIP pack: 2 angles, 4 reels, 8 hook variations", qty: 1, price: 1500 }, { label: "Menu carousel, 6 slides", qty: 1, price: 240 }], amount: 1740, status: "sent", validUntil: d(9), sentOn: d(-4), acceptedOn: "", note: "Shoot before the menu goes live.", invoiceIds: [] },
      { clientId: "csid", projectId: "", pack: "monthly8", title: "SKIN 10 · renewal", lines: [{ label: "SKIN 10: 3 more months", qty: 3, price: 3500 }], amount: 10500, status: "expired", validUntil: d(-20), sentOn: d(-34), acceptedOn: "", note: "New media buyer on their side.", invoiceIds: [] },
      { clientId: "carg", projectId: "", pack: "test", title: "GRIP · Second batch", lines: [{ label: "GRIP pack: 2 angles, 4 reels, 8 hook variations", qty: 1, price: 1500 }], amount: 1500, status: "declined", validUntil: d(-196), sentOn: d(-210), acceptedOn: "", note: "Went with another studio.", invoiceIds: [] }
    ];
    var qMax = {};
    C.quotes.forEach(function (q) { var mm = /^Q-(\d{4})-(\d+)$/.exec(q.no || ""); if (mm) qMax[mm[1]] = Math.max(qMax[mm[1]] || 0, +mm[2]); });
    QS.sort(function (a, b) { return a.sentOn < b.sentOn ? -1 : 1; }).forEach(function (q) {
      var yy = q.sentOn.slice(0, 4); qMax[yy] = (qMax[yy] || 0) + 1;
      q.id = id("q"); q.no = "Q-" + yy + "-" + String(qMax[yy]).padStart(3, "0"); q.log = [{ at: q.sentOn + "T11:00", who: "mmoh", text: "Sent" }];
      if (q.acceptedOn) q.log.push({ at: q.acceptedOn + "T16:00", who: "mmoh", text: "Accepted" });
      C.quotes.push(q);
    });
    C.quotes.push({ id: id("q"), no: "", clientId: "cfid", projectId: "", pack: "campaign", title: "SEASON · Gifting season", lines: [{ label: "SEASON pack: 4 angles, 16 reels, 32 hook variations, 4 carousels", qty: 1, price: 4800 }], amount: 4800,
      status: "draft", validUntil: d(21), sentOn: "", acceptedOn: "", note: "Leila wants to come back before the holidays.", invoiceIds: [], log: [L("Draft started", 1)] });

    // ================= expenses =================
    function mo(n, day) { var t = new Date(ctx.today + "T12:00:00"); t.setDate(1); t.setMonth(t.getMonth() - n); return u.iso(t).slice(0, 8) + String(day).padStart(2, "0"); }
    function ymo(n) { return mo(n, 1).slice(0, 7); }
    var EX = [
      // label, category, amount, recurring, months ago, day, until, vendor
      ["Coworking desk", "rent", 180, "monthly", 11, 2, ymo(6), "Coworking, Lac 1"],
      ["Mobile data plan", "other", 40, "monthly", 11, 6, ymo(6), ""],
      ["Stock music licence", "software", 35, "monthly", 11, 7, "", ""],
      ["Design tool", "software", 30, "monthly", 8, 9, "", ""],
      ["Accountant retainer", "tax", 80, "monthly", 6, 25, "", ""],
      ["Ads for GECKO's own page", "marketing", 120, "monthly", 3, 15, "", "Meta ads"],
      ["Second-hand camera body", "gear", 1650, "none", 11, 20, "", ""],
      ["35mm lens", "gear", 420, "none", 10, 12, "", ""],
      ["LED panel kit", "gear", 260, "none", 9, 8, "", ""],
      ["Wireless mics", "gear", 380, "none", 8, 3, "", ""],
      ["Gimbal", "gear", 340, "none", 7, 22, "", ""],
      ["Hard drives, 2 x 4 TB", "gear", 320, "none", 6, 10, "", ""],
      ["Spare batteries", "gear", 140, "none", 1, 16, "", ""],
      ["Tax registration fee", "tax", 150, "none", 10, 4, "", ""],
      ["Accountant: annual filing", "tax", 250, "none", 6, 28, "", ""],
      ["Business cards and printed lookbook", "marketing", 135, "none", 9, 14, "", ""],
      ["Boost: teardown reel", "marketing", 60, "none", 7, 19, "", ""],
      ["Boost: Kelibia case study", "marketing", 80, "none", 0, 3, "", ""],
      ["Domain and email, one year", "software", 45, "none", 11, 15, "", ""],
      ["Freelance editor, overflow week (Amira)", "freelance", 300, "none", 8, 26, "", ""],
      ["Freelance editor, overflow week (Oussama)", "freelance", 300, "none", 4, 21, "", ""],
      ["Voice-over for GECKO's reel (Rim)", "freelance", 90, "none", 2, 11, "", ""],
      ["Motion pack for end cards (Nesrine)", "freelance", 180, "none", 3, 8, "", ""],
      ["Props for shoots", "other", 70, "none", 5, 17, "", ""],
      ["Louage and taxi, Sidi Denim shoot", "transport", 45, "none", 11, 24, "", ""],
      ["Fuel, Nabeul shoot", "transport", 40, "none", 4, 2, "", ""],
      ["Fuel and parking, Kelibia beach shoot", "transport", 55, "none", 0, 1, "", ""],
      ["Train to Sousse, Cable Corner meeting", "transport", 28, "none", 1, 22, "", ""],
      ["Client lunch, Harissa House kick-off", "other", 65, "none", 0, 2, "", ""],
      ["White cards, gaffer tape, wipes", "gear", 35, "none", 2, 27, "", ""],
      ["Bank fees, quarter", "other", 24, "none", 9, 28, "", ""],
      ["Bank fees, quarter", "other", 24, "none", 6, 28, "", ""],
      ["Bank fees, quarter", "other", 24, "none", 3, 28, "", ""],
      ["Course: ads creative strategy", "other", 120, "none", 5, 9, "", ""],
      ["Phone tripod and clamps", "gear", 65, "none", 3, 13, "", ""],
      ["Backdrop paper rolls", "gear", 110, "none", 2, 6, "", ""],
      ["Taxi, Zina Hair meeting", "transport", 18, "none", 0, 4, "", ""],
      ["Coworking meeting room", "rent", 40, "none", 1, 18, "", ""]
    ];
    EX.forEach(function (e) {
      var date = mo(e[4], e[5]); if (date > ctx.today) date = ctx.today;
      C.expenses.push({ id: id("ex"), date: date, label: e[0], category: e[1], amount: e[2], recurring: e[3], until: e[6], vendor: e[7], projectId: "", link: "", note: "", log: [{ at: date + "T12:00", who: "mheni", text: "Added" }] });
    });

    // ================= tasks =================
    var TK = [
      // project, title, who, due (days), done on (days) or null
      ["pcab2", "Chase the Cable Corner balance (second reminder)", "mmoh", 0, null],
      ["pcab2", "Finish rough cut, power bank reels 1 to 4", "mamira", -2, -3],
      ["pcab2", "Fix the revise note on reel 2 hook 2", "mamira", 1, null],
      ["pcab2", "Colour pass on the drop test shots", "mouss", 2, null],
      ["pkel2", "Select best takes from the beach shoot", "medit", -1, -1],
      ["pkel2", "Edit reels 1 to 5", "medit", 3, null],
      ["pkel2", "Edit reels 6 to 10", "mamira", 5, null],
      ["pkel2", "Record voice-over for the challenge reels", "mrim", 2, null],
      ["pkel2", "Motion titles: day counter", "mnes", 4, null],
      ["pkel2", "Send review link to Hamza", "mheni", 6, null],
      ["pkel1", "Write month 1 report", "mheni", -6, -7],
      ["pkel1", "Pull results from Ads Manager", "mskan", -8, -8],
      ["pkel1", "Plan budget split for month 2 ads", "mskan", 1, null],
      ["phar1", "Book the kitchen studio", "masst", -4, -5],
      ["phar1", "Confirm talent for the tasting reel", "masst", 0, null],
      ["phar1", "Shot list for month 1", "mheni", 1, null],
      ["phar1", "Buy props: mortar, bread, olive oil", "masst", 3, null],
      ["phar1", "Camera and light check before the shoot", "mwalid", 3, null],
      ["phar1", "Write the spice ladder script", "mheni", -1, -2],
      ["phar1", "Moodboard review with Mourad", "mheni", -3, -3],
      ["pmed3", "Location scout, Bab Souika", "mwalid", 1, null],
      ["pmed3", "Call Yasmine about sizes for the models", "mmoh", 0, null],
      ["pmed3", "Shot list, winter coats", "mheni", 2, null],
      ["pmed3", "Book two models", "masst", -1, -2],
      ["pmed2", "Upload finals to Drive", "medit", -6, -6],
      ["pmed2", "Ask for Ads Manager access", "mskan", 2, null],
      ["pmed2", "Pay the partner share for Back to school", "mheni", 4, null],
      ["pdje", "Book ferry and hotel for Djerba", "masst", 5, null],
      ["pdje", "Confirm product samples arrive a week before", "mmoh", 10, null],
      ["pdje", "Storyboard the palm harvest reel", "mheni", 8, null],
      ["pzina", "Follow up on the deposit", "mmoh", 2, null],
      ["pzina", "Finish the creative plan", "mheni", -1, null],
      ["pzina", "Collect five customer DMs as proof", "masst", 3, null],
      ["pbam", "Onboarding call with Houda", "mmoh", 1, null],
      ["pbam", "Send the onboarding form", "mmoh", -1, -1],
      ["pbam", "Ask for orders per week as baseline", "mmoh", 4, null],
      ["pmedk1", "Plan month 1 angles", "mheni", 14, null],
      ["pmedk1", "Issue month 1 invoice on the 1st", "mheni", 20, null],
      ["pkah", "Rewrite angle 2 after Amine's feedback", "mheni", 2, null],
      ["pjas", "Export Eid hooks for review", "medit", -3, -3],
      ["pjas", "Second balance reminder to Ines", "mmoh", -1, null],
      ["patl", "Weekly results check", "mskan", 0, null],
      ["pnour2", "Pharmacist release form", "masst", 1, null],
      ["pnour2", "Carousel design: 5 things your pharmacist knows", "mnes", 6, null],
      ["pnab", "Ask Tarek for a testimonial", "mmoh", 3, null],
      ["pnab", "Publish the case study reel", "mheni", -10, -9],
      ["psid3", "Call Fares about the renewal", "mmoh", -5, null],
      ["pfid3", "Send Leila the gifting season idea", "mheni", 2, null],
      ["", "Plan next month's outreach list (50 brands)", "mmoh", 7, null],
      ["", "Update the price sheet in French", "mmoh", -4, -4],
      ["", "Back up last month's raw footage", "masst", -2, null],
      ["", "Renew the coworking contract", "mheni", 12, null],
      ["", "Quarterly withholding check with the accountant", "mheni", 18, null],
      ["", "Teardown reel for GECKO's page", "mouss", 5, null],
      ["", "New end card template", "mnes", -9, -8],
      ["", "Clean the lens kit", "mwalid", -7, -7],
      ["", "Write 10 hooks for our own page", "mheni", 9, null],
      ["", "Collect this month's invoices for the accountant", "masst", 21, null],
      ["", "Test the new LED panel settings", "mwalid", -12, -11],
      ["", "Voice-over demo reel in Derja and French", "mrim", 15, null],
      ["pkel2", "Export 4x5 versions", "mouss", 7, null],
      ["phar1", "Plan the diaspora reel with Paris footage", "mnes", 10, null],
      ["pcab2", "Prepare files to unlock once paid", "mamira", 4, null],
      ["pmed3", "Steam the coats before the shoot", "masst", 2, null],
      ["pkel1", "Report call with Hamza", "mheni", -5, -5],
      ["pmed2", "Thank-you note to Yasmine", "mmoh", -9, -9],
      ["pcab2", "Send the gate note: files after the balance", "mmoh", -4, -4],
      ["phar1", "Spice level cards for the shoot", "mnes", 2, null],
      ["pdje", "Packing table props", "masst", 15, null],
      ["", "Review freelancer rates for next year", "mheni", 19, null],
      ["", "Archive closed Sidi Denim projects", "masst", -13, -12],
      ["", "Weekly team call", "mheni", 0, null],
      ["pkel2", "Colour grade the beach clips", "mouss", 1, null],
      ["pzina", "Pick two hair types for the shoot", "mheni", 6, null],
      ["phar1", "Send the plan to Mourad", "mheni", -5, -6],
      ["pkel2", "Confirm sunrise time and tide", "mwalid", -3, -3],
      ["pmed3", "Send the plan to Yasmine", "mheni", -6, -6],
      ["pdje", "Send the plan to Bilel", "mheni", -5, -5],
      ["pcab2", "Upload raw clips to Drive", "mwalid", -12, -12],
      ["pkel1", "Deliver month 1 finals", "medit", -14, -13],
      ["", "Pay freelancers for last month", "mheni", -8, -9],
      ["", "Send the Kelibia case study to five leads", "mmoh", -3, -2]
    ];
    TK.forEach(function (x, k) {
      var who = x[2], created = Math.max(-14, Math.min(-1, (x[4] == null ? x[3] : Math.min(x[3], x[4])) - 4 - (k % 5)));
      var t = { id: id("t"), projectId: x[0], title: x[1], who: who, due: d(x[3]), done: x[4] != null, doneOn: x[4] != null ? d(x[4]) : "",
        log: [{ at: at(created, "09:" + String(10 + k % 50).padStart(2, "0")), who: k % 3 ? "mheni" : "mmoh", text: "Task added" }] };
      if (t.done) t.log.push({ at: at(x[4], String(11 + k % 7) + ":" + String(10 + k % 40)), who: who, text: "Marked done" });
      C.tasks.push(t);
    });

    // ================= messages =================
    var MS = [
      [13, "09:02", "general", "mheni", "Morning team. Big two weeks: Kelibia Fit month 2, Harissa House kick-off, Medina winter shoot. Yalla."],
      [13, "09:10", "general", "mmoh", "Yalla! I'll push Zina Hair and Djerba Dates to sign this week."],
      [13, "10:40", "pkel1", "mskan", "Month 1 numbers are in: squat-proof angle at 5.2 DT per purchase. Best so far for them."],
      [13, "10:52", "pkel1", "mheni", "Barcha good. @Skander send me the screenshots for the report."],
      [13, "15:20", "general", "masst", "Kitchen studio booked for the Harissa shoot."],
      [12, "11:05", "general", "mwalid", "One of the B camera batteries is dead. Ordering two spares."],
      [12, "16:45", "general", "mnes", "New end card template is in the shared folder. Pink and blue only, merci."],
      [11, "09:20", "pcab2", "mamira", "Rough cut of reels 1 and 2 done. The drop test shot is gold."],
      [11, "09:41", "pcab2", "mheni", "Nice. Keep the first second on the phone hitting the tiles."],
      [11, "14:03", "general", "mmoh", "Djerba Dates said yes. Deposit invoice going out today."],
      [11, "14:05", "general", "mheni", "Mabrouk! @Salma can you look at ferry times for the shoot?"],
      [11, "14:30", "general", "masst", "On it."],
      [10, "10:15", "pmed2", "medit", "Back to school finals exported. 12 files, all named."],
      [10, "10:22", "pmed2", "mmoh", "Yasmine confirmed she got everything. Merci Yassine."],
      [10, "18:02", "general", "mouss", "I can take two extra reels this week if anyone is drowning."],
      [9, "09:30", "phar1", "mheni", "Harissa House: first draft of the plan is up. Four angles, the spice ladder is my favourite."],
      [9, "09:48", "phar1", "mmoh", "Mourad loves the diaspora angle. His cousin in Lyon orders 6 jars a month."],
      [9, "12:10", "general", "mrim", "Voice-over for the Kelibia extras done. Sent to @Yassine."],
      [9, "12:14", "general", "medit", "Got it, merci Rim."],
      [8, "10:00", "general", "mheni", "Medina Threads signed SKIN 10 from next month. Third client on monthly."],
      [8, "10:03", "general", "mmoh", "Yesss. That's the one I wanted."],
      [8, "10:05", "general", "mskan", "Barcha mabrouk."],
      [8, "16:20", "pzina", "mmoh", "Asma wants to see the plan before paying. I told her: plan review is fine, shoot after the deposit."],
      [7, "09:12", "pkel1", "mheni", "Report sent to Hamza. Next: the 30-day challenge series."],
      [7, "11:45", "pcab2", "mamira", "Reel 2 hook 2 came back with a revise: shorter first second."],
      [7, "11:50", "pcab2", "mheni", "Fine. But no files go out until the balance lands."],
      [7, "17:30", "general", "mnes", "Day counter animation for Kelibia ready for review."],
      [6, "08:55", "pdje", "masst", "Ferry at 7:00, back the next evening. Hotel in Houmt Souk is booked."],
      [6, "10:30", "pdje", "mmoh", "Deposit paid by Bilel. We're good to plan the shoot."],
      [6, "15:00", "general", "mheni", "Reminder: no shoot without an approved plan and a paid deposit. Even for friends."],
      [5, "09:40", "pmed3", "mheni", "Winter coats plan approved by Yasmine. Shoot in Bab Souika."],
      [5, "09:58", "pmed3", "mwalid", "I'll scout the street tomorrow morning, the light is best before 10."],
      [5, "13:15", "pkel2", "mheni", "Kelibia month 2 plan approved. Beach at sunrise, three angles."],
      [5, "18:40", "general", "mouss", "Colour preset for the beach clips is in the folder."],
      [4, "09:05", "phar1", "mmoh", "Month 1 paid. Mourad is excited, yalla."],
      [4, "09:30", "pcab2", "mmoh", "Cable Corner balance is now overdue. Reminder sent on WhatsApp."],
      [4, "09:31", "pcab2", "mheni", "Merci. Keep it friendly, they always pay in the end."],
      [4, "14:22", "general", "mskan", "Ads Manager access for Medina still missing. Can you ask Yasmine?"],
      [4, "14:40", "general", "mmoh", "Asked. She'll add you tonight."],
      [3, "08:30", "phar1", "mheni", "Plan approved by Mourad. Shoot in a week, kitchen studio."],
      [3, "10:12", "general", "mmoh", "Zina Hair deposit invoice sent. Bambino onboarding call tomorrow."],
      [3, "16:05", "pnour2", "masst", "The pharmacy wants their location fee invoiced. Sent as pass-through."],
      [3, "16:30", "general", "mamira", "Can someone check my export settings? 4x5 looks soft."],
      [3, "16:44", "general", "mouss", "Bitrate was low, use the GECKO 4x5 preset. Fixed for you."],
      [2, "07:10", "pkel2", "mwalid", "Beach shoot done. 31 clips, the sunrise was perfect."],
      [2, "07:25", "pkel2", "mheni", "Barcha! Send the selects to @Yassine."],
      [2, "11:00", "general", "mmoh", "Bambino Tunis won. First ads ever, so we start slow."],
      [2, "11:20", "pzina", "mheni", "Creative plan sent to Asma. Two angles: curls without frizz, salon at home."],
      [2, "15:45", "pkel2", "medit", "Selects done. Starting reels 1 to 5."],
      [2, "19:30", "general", "mrim", "I'm free Thursday for the challenge voice-overs."],
      [1, "09:00", "general", "mheni", "This week: Medina and Harissa shoots, Kelibia edit. Cable Corner balance still open."],
      [1, "09:20", "pmed3", "masst", "Two models booked. Sizes S and L, like Yasmine wanted."],
      [1, "10:45", "pmed3", "mmoh", "Yasmine sent the balance invoice to her accountant, she'll pay part of it in cash."],
      [1, "12:30", "phar1", "masst", "Talent for the tasting reel confirmed. Invoice for the fee went out."],
      [1, "15:10", "pkel2", "medit", "Reels 1 to 3 rough. The hook on reel 2 is strong."],
      [1, "17:55", "general", "mnes", "Spice level cards drafted for Harissa. 5 levels, pink to blue."],
      [0, "08:40", "general", "mheni", "Good morning. Today: Medina shot list, Bambino call, Cable Corner follow-up."],
      [0, "09:05", "pcab2", "mmoh", "Called Anis. He says the transfer goes out Friday. Inchallah."],
      [0, "09:30", "pkel2", "mamira", "Taking reels 6 to 10. Will share by Thursday."],
      [0, "10:10", "general", "mskan", "Medina access works now. Merci."],
      [0, "10:30", "phar1", "mwalid", "Lights tested in the kitchen studio. Bringing the slider."],
      [0, "11:02", "general", "mmoh", "Hammam Glow call at 15:00. Bringing the Kelibia results."],
      [0, "11:20", "pmed3", "mmoh", "300 DT in cash from Yasmine for the balance. Rest after the shoot."]
    ];
    MS.forEach(function (x) { C.msgs.push({ id: id("msg"), ch: x[2], who: x[3], text: x[4], at: at(-x[0], x[1]) }); });

    // ================= ideas =================
    function ang(pid, k) { var p = projIdx[pid] || C.projects.find(function (x) { return x.id === pid; }); var a = p && p.angles[k || 0]; return a ? { angleId: a.id, angle: a.name } : { angleId: "", angle: "" }; }
    function bestReel(pid) {
      var p = projIdx[pid]; if (!p) return null; var best = null;
      p.reels.forEach(function (r) { var c = r.hooks[0] && r.hooks[0].results && r.hooks[0].results.cpp; if (c && (!best || c < best.c)) best = { r: r, c: c }; });
      return best;
    }
    function sc(v, x, s) { return { v: v, x: x, s: s }; }
    var YT = "https://www.youtube.com/watch?v=GKdemo", IG = "https://www.instagram.com/reel/GKdemo", TT = "https://www.tiktok.com/@gecko.demo/video/70000000000000000", PN = "https://www.pinterest.com/pin/10000000000000", GD = "https://drive.google.com/drive/folders/gk-demo-";
    var ID = [
      // title, stage, client, project, angle index, hook, concept, mode, owner, tags, priority, refs, created (days ago), scenes, shareOk
      ["Spice ladder, five spoons", "script", "char", "phar1", 1, "Level 1 to level 5. How far can you go?", "Five spoons, five faces. The heat question is the first DM, so we answer it as a game.", "D", "mheni", ["food", "game"], 1, [["Spice challenge format", YT + "Spice01"], ["Reaction reel ref", IG + "Spice02/"]], 6,
        [sc("Five spoons on a wooden board", "Level 1 to 5.", 3), sc("Our editor tries level 3", "Still fine.", 3), sc("Level 5, long pause", "", 4), sc("Jar and order link", "Pick your level.", 3)], true],
      ["Suitcase to Lyon", "concept", "char", "phar1", 3, "The jar that goes in every suitcase", "A third of orders ship to France. Show the jar coming out of a suitcase in a Lyon kitchen.", "I", "mnes", ["diaspora"], 1, [["Diaspora mood", PN + "001/"], ["Airport b-roll ref", TT + "11"]], 8],
      ["Grandma tastes it", "idea", "char", "phar1", 0, "My grandmother would approve. Barely.", "", "D", "mmoh", ["family"], 2, [], 3],
      ["Harissa on pizza", "idea", "char", "", 2, "Harissa on pizza? Yes.", "", "D", "mouss", ["usage"], 3, [["Food hack format", TT + "12"]], 2],
      ["Breakfast to dinner, one jar", "concept", "char", "phar1", 2, "Breakfast, lunch, dinner. Same jar.", "Three meals in 15 seconds. Usage ideas drive repeat orders.", "I", "mheni", ["usage"], 2, [["Three meals cut", IG + "Meals03/"]], 5],
      ["Sunrise squat test", "ready", "ckel", "pkel2", 0, "The squat test nobody else will film", "Month 1 winner, new location. Same proof, sunrise light.", "D", "mheni", ["winner", "proof"], 1, [["Month 1 winner", GD + "kfit-m1-winner"]], 10,
        [sc("Window light, squat in slow motion", "Not see-through. We checked.", 4), sc("Close on the fabric", "", 2), sc("Beach at sunrise", "Kelibia Fit.", 3)], true],
      ["Day 1 of 30", "script", "ckel", "pkel2", 3, "Day 1 of 30. Join us.", "A challenge series: same frame, one exercise a day. Their community loves challenges.", "D", "medit", ["series"], 1, [["Challenge series ref", YT + "Chall04"]], 7,
        [sc("Calendar on screen", "Day 1.", 2), sc("Hamza does 10 squats", "", 4), sc("Day counter animation", "See you tomorrow.", 3)], true],
      ["Coach tries to break them", "concept", "ckel", "pkel2", 2, "Our coach tried to break them", "A local coach pulls, stretches, sweats. Trust from coaches is their best angle after proof.", "D", "mskan", ["trust"], 2, [], 9],
      ["Gym bag essentials", "parked", "ckel", "", 0, "Your gym bag needs one thing", "Too generic for now.", "I", "mamira", [], 3, [], 30],
      ["Bab Souika walk", "ready", "cmed", "pmed3", 0, "Sewn 400 metres from Bab Souika", "Tailor's hands, then the coat on the street where it was made.", "D", "mheni", ["local"], 1, [["Street walk ref", IG + "Walk05/"], ["Location photos", GD + "medina-babsouika"]], 6,
        [sc("Tailor's hands, close", "Sewn here.", 3), sc("Model walks out the door", "", 3), sc("Street, golden hour", "Medina Threads.", 3)], true],
      ["One coat, three outfits", "script", "cmed", "pmed3", 1, "One jacket, three outfits, zero effort", "Styling videos get twice the saves. Work, dinner, souk.", "I", "medit", ["styling"], 2, [["Outfit change transition", TT + "13"]], 5,
        [sc("Office look", "Work.", 3), sc("Spin transition", "Dinner.", 3), sc("Spin again", "Souk.", 3)], true],
      ["Real sizes, no edits", "concept", "cmed", "pmedk1", 2, "Real sizes, real people, no edits", "Five friends, five sizes, same piece. Size questions fill the DMs.", "D", "mheni", ["sizes"], 1, [["Size inclusive ref", PN + "002/"]], 4],
      ["Mannequin vs real", "idea", "cmed", "pmedk1", 2, "Stop buying jackets that only fit the mannequin", "", "D", "mmoh", [], 2, [], 1],
      ["Mannequin shots", "parked", "cmed", "", 0, "", "Killed in the Summer drop report.", "I", "mheni", [], 3, [], 140],
      ["Drop it twice", "shot", "ccab", "pcab1", 1, "We dropped it. Twice.", "Drop test on tiles, then it still charges. Proof beats specs.", "D", "mamira", ["winner", "proof"], 1, [["Drop test ref", YT + "Drop06"]], 190],
      ["Tunis to Sousse on one charge", "script", "ccab", "pcab2", 0, "Tunis to Sousse on one charge", "Louage ride, phone plugged in, timer on screen.", "I", "mouss", ["travel"], 2, [["Louage b-roll", GD + "cable-louage"]], 18,
        [sc("Louage window", "Tunis, 8:00.", 3), sc("Battery at 12%", "", 2), sc("Sousse station, 100%", "Still going.", 3)]],
      ["Painter close-ups", "shot", "cnab", "pnab", 0, "Every line is painted by Am Salah", "The painter is the story. Won the summer season.", "D", "mheni", ["winner", "craft"], 1, [["Craft close-up ref", IG + "Craft07/"]], 120],
      ["Holiday table", "concept", "cnab", "", 1, "The table your family will talk about", "Next season: family table set, hands reaching.", "I", "mheni", ["season"], 2, [["Table styling", PN + "003/"]], 12],
      ["Kiln at 6am", "idea", "cnab", "", 3, "Opening the kiln at 6am", "", "I", "mwalid", ["process"], 2, [], 15],
      ["Workshop sparks", "shot", "cfid", "pfid2", 1, "Made by hand, 200 metres from the Zitouna", "Silversmith's hammer and sparks. Best month of the contract.", "D", "mheni", ["winner", "craft"], 1, [["Workshop ref", YT + "Spark08"]], 215],
      ["Gift guide for the holidays", "concept", "cfid", "", 0, "The gift that never goes in a drawer", "Pitch for Leila's comeback: gifting season, three price points.", "I", "mheni", ["comeback"], 1, [["Gift guide format", PN + "004/"], ["Drive refs", GD + "fidda-gifts"]], 3],
      ["Stack it all week", "idea", "cfid", "", 2, "Three rings, one stack, all week", "", "I", "mnes", [], 3, [], 40],
      ["Day 1 vs day 60 denim", "shot", "csid", "psid1", 0, "Same jeans, day 1 and day 60", "Proof beats polish. Their best reel.", "D", "mheni", ["winner"], 1, [], 330],
      ["Renewal pitch: the fit test", "idea", "csid", "", 1, "The fit that survives the louage", "Use as the hook in the renewal call with Fares.", "D", "mmoh", ["renewal"], 1, [], 6],
      ["Curls in 80% humidity", "concept", "czin", "pzina", 0, "Humidity 80%. Curls still holding.", "Shoot on a humid day by the sea, before and after in the same light.", "D", "mheni", ["proof"], 1, [["Hair before and after ref", TT + "14"], ["Mood", PN + "005/"]], 3],
      ["Salon at home", "idea", "czin", "pzina", 1, "The salon result, in your bathroom", "", "I", "masst", [], 2, [["Bathroom routine ref", IG + "Hair09/"]], 2],
      ["Palm to door", "concept", "cdje", "pdje", 0, "Picked in Djerba on Monday", "Harvest, packing table, delivery in Tunis by Thursday. Freshness is the worry.", "I", "mheni", ["origin"], 1, [["Harvest b-roll", YT + "Palm10"], ["Houmt Souk spots", GD + "djerba-spots"]], 5],
      ["The aunt in Paris", "script", "cdje", "pdje", 1, "The box your aunt in Paris wants", "Gift box opened at a family table abroad.", "D", "mnes", ["diaspora"], 2, [], 4,
        [sc("Doorbell, Paris flat", "", 2), sc("Box opens, aunt smiles", "Min Djerba.", 4), sc("Three sizes on a table", "Order before the holidays.", 3)]],
      ["Playground test", "idea", "cbam", "pbam", 0, "Playground test, filmed by a 6-year-old", "", "I", "mmoh", ["kids"], 2, [["Kid POV ref", TT + "15"]], 1],
      ["Washed 30 times", "idea", "cbam", "pbam", 1, "Washed 30 times. Still soft.", "", "D", "mheni", ["proof"], 2, [], 1],
      ["Brunch top shot", "shot", "cbyr", "pbyr", 0, "Your Saturday starts at this table", "Plates landing, top shot. Covers up 18% in the test month.", "D", "mheni", ["winner"], 1, [["Top shot food ref", IG + "Food11/"]], 130],
      ["Iftar menu reveal", "concept", "cbyr", "", 0, "The table is set. 18:42.", "For the iftar quote: countdown to sunset, then the table fills.", "I", "mmoh", ["season"], 2, [["Countdown format", YT + "Iftar12"]], 4],
      ["Spot the fake oil", "shot", "carg", "parg", 0, "How to spot fake argan oil", "Cold test, side by side.", "D", "mheni", [], 2, [], 285],
      ["Teardown: why your reels don't sell", "script", "", "", 0, "Your reel is pretty. That's the problem.", "GECKO's own page: tear down a pretty reel and show the fix in 30 seconds.", "D", "mheni", ["gecko", "teardown"], 1, [["Teardown format", YT + "Tear13"]], 9,
        [sc("Pretty reel plays, muted", "Pretty.", 3), sc("Freeze frame, three pink circles", "No hook. No price. No proof.", 4), sc("The fixed version", "Now it sells.", 4)]],
      ["Behind the scenes, Kelibia sunrise", "ready", "", "", 0, "5:40am. Kelibia. Worth it.", "Behind-the-scenes reel for our page from the month 2 shoot.", "I", "mwalid", ["gecko", "bts"], 2, [["BTS footage", GD + "kfit-bts"]], 2,
        [sc("Alarm at 5:10", "", 2), sc("Van on the beach road", "", 3), sc("Sunrise, first take", "Worth it.", 3)]],
      ["Hook of the week series", "idea", "", "", 0, "This hook sold at 4.1 DT per purchase", "", "D", "mskan", ["gecko"], 2, [], 4],
      ["Client says no to the plan", "idea", "", "", 0, "What we do when a client hates the plan", "", "D", "mmoh", ["gecko"], 3, [], 11],
      ["Derja voiceover for Kelibia", "concept", "ckel", "pkel2", 1, "Sbah el khir, Kelibia", "Rim's voice in Derja over sunrise footage. Month 1 showed Derja lifts the hook rate.", "I", "mrim", ["derja", "voice"], 2, [["Voice reference", IG + "Voice14/"]], 6],
      ["Late payer reminder template", "parked", "", "", 0, "", "Internal, not a reel. Moved to settings.", "D", "mmoh", [], 3, [], 25],
      ["Packed like it's going to space", "idea", "cnab", "", 2, "Packed like it's going to space", "", "I", "mamira", ["shipping"], 3, [], 9],
      ["Price tag on the hanger", "concept", "cmed", "pmedk1", 3, "Under 150 DT and it looks like 400", "Price reveal on the hanger, then the street.", "D", "mmoh", ["price"], 2, [["Price reveal ref", TT + "16"]], 3],
      ["Unboxing in the rain, power bank", "parked", "ccab", "", 0, "It's pouring. Charge anyway.", "Weather didn't cooperate.", "I", "mouss", [], 3, [], 35]
    ];
    ID.forEach(function (x, k) {
      var a = x[3] ? ang(x[3], x[4]) : { angleId: "", angle: x[2] && BANK[x[2]] ? BANK[x[2]].angles[x[4]][0] : "" };
      var idea = { id: id("idea"), title: x[0], stage: x[1], clientId: x[2], projectId: x[3], angleId: a.angleId, angle: a.angle, hook: x[5], concept: x[6], script: "", scenes: x[13] || [], mode: x[7], format: "9x16",
        refs: x[11].map(function (r) { return { label: r[0], url: r[1] }; }), boardId: "", owner: x[8], tags: x[9], priority: x[10], reelId: "", created: d(-x[12]),
        shareOk: !!x[14], reviewAsked: x[1] === "script" && k % 2 === 0, notes: "", winner: x[9].indexOf("winner") > -1,
        log: [{ at: at(-Math.min(x[12], 14), "10:" + String(10 + k).padStart(2, "0")), who: x[8], text: x[1] === "idea" ? "Idea added" : "Moved to " + x[1] }] };
      if (x[1] === "parked") idea.parkedFrom = "idea";
      if (x[1] === "shot" && x[3]) {
        // a shot idea is a ready idea whose reel is fully approved; point it at the reel that won
        var br = bestReel(x[3]);
        idea.stage = "ready";
        if (br) { idea.reelId = br.r.id; idea.hook = br.r.hooks[0].text; idea.angleId = br.r.angleId; idea.angle = (projIdx[x[3]].angles.find(function (q) { return q.id === br.r.angleId; }) || {}).name || idea.angle; }
      }
      if (x[1] === "ready" && x[3] && projIdx[x[3]] && projIdx[x[3]].reels.length) idea.reelId = projIdx[x[3]].reels[0].id;
      C.ideas.push(idea);
    });

    // ================= boards =================
    var BM = GK.boards && GK.boards.maker ? GK.boards : null;
    function maker() {
      if (BM) return BM.maker();
      var items = [], z = 1, api = { items: items, add: function (o) { o.id = id("i"); o.z = z++; items.push(o); return o; } };
      api.note = function (t, x, y, c, w, h) { return api.add({ t: "note", x: x, y: y, w: w || 180, h: h || 150, text: t, c: c || "gel" }); };
      api.text = function (t, x, y, c, w, fs) { return api.add({ t: "text", x: x, y: y, w: w || 300, h: Math.round((fs || 28) * 1.4), text: t, c: c || "slate", fs: fs || 28 }); };
      api.frame = function (n, t, x, y) { return api.add({ t: "frame", x: x, y: y, w: 180, h: 320, text: t || "", n: n, c: "slate" }); };
      api.link = function (t, url, x, y, c) { return api.add({ t: "link", x: x, y: y, w: 240, h: 76, text: t, url: url, c: c || "bounce" }); };
      api.arrow = function (a, b, c) { return api.add({ t: "arrow", from: { id: a.id, side: "auto" }, to: { id: b.id, side: "auto" }, c: c || "slate" }); };
      return api;
    }
    var BD = [];
    function board(o, q, who, upd, created) {
      BD.push(Object.assign({ id: id("b"), ideaId: "", items: q.items, view: { x: 0, y: 0, z: 0 }, rev: 1, updated: at(upd, "17:10"), by: who,
        log: [{ at: at(created, "10:20"), who: who, text: "created" }, { at: at(upd, "17:10"), who: who, text: "edited" }] }, o));
    }
    // 1 moodboard · Harissa House
    var q = maker();
    q.text("Harissa House · month 1 mood", 0, -90, "slate", 640, 30);
    q.link("Spice challenge, YouTube", YT + "Spice01", 0, 0); q.link("Reaction reel, Instagram", IG + "Spice02/", 260, 0); q.link("Food hack, TikTok", TT + "12", 520, 0);
    q.link("Kitchen light, Pinterest", PN + "006/", 0, 100); q.link("Rustic table, Pinterest", PN + "007/", 260, 100); q.link("Raw footage, Drive", GD + "harissa-m1", 520, 100);
    q.note("Palette: deep red paste, clay, white linen, black pot. Nothing glossy.", 0, 210, "gel", 240, 120);
    q.note("Sound first: the mortar, the lid, the bread tearing.", 260, 210, "chroma", 240, 120);
    q.note("Faces react, product stays still.", 520, 210, "bounce", 240, 120);
    board({ title: "Harissa month 1 moodboard", kind: "free", clientId: "char", projectId: "phar1" }, q, "mheni", -1, -8);
    // 2 storyboard · Kelibia month 2
    q = maker();
    q.text("Month 2: sunrise squat test", 0, -90, "slate", 700, 30);
    [["Hook", "Squat in window light, slow. On screen: not see-through."], ["Proof", "Close on the fabric stretching. No cut."], ["Place", "Beach at sunrise, Kelibia fort behind."], ["Coach", "Coach nods. One line: I train in these."], ["Offer", "Day counter: join the 30-day challenge."]].forEach(function (f, k) {
      q.frame(k + 1, f[0], k * 220, 0); q.note(f[1], k * 220, 340, k % 2 ? "bounce" : "gel", 180, 150);
    });
    q.link("Month 1 winner, Drive", GD + "kfit-m1-winner", 0, 520, "bounce"); q.link("Sunrise ref, Instagram", IG + "Sun15/", 260, 520, "bounce");
    board({ title: "Kelibia month 2 storyboard", kind: "storyboard", clientId: "ckel", projectId: "pkel2" }, q, "medit", -2, -6);
    // 3 shot list · Medina winter coats
    q = maker();
    var xs = [0, 310, 540, 800], wd = [300, 220, 250, 110];
    ["Shot", "Where", "Gear", "Time"].forEach(function (h, k) { q.note(h, xs[k], 0, "slate", wd[k], 52); });
    [["1. Tailor's hands, needle close", "Workshop, Bab Souika", "Camera, 85mm", "20 min"], ["2. Model walks out the door", "Workshop door", "Gimbal, 35mm", "15 min"], ["3. Outfit 1: work", "Street corner", "Gimbal", "20 min"], ["4. Outfit 2: dinner", "Cafe terrace", "Tripod, LED panel", "20 min"], ["5. Outfit 3: souk", "Souk alley", "Gimbal", "20 min"], ["6. Price tag on the hanger", "Workshop", "Tripod, macro", "10 min"]].forEach(function (r, j) {
      for (var k = 0; k < 4; k++) q.note(r[k], xs[k], 62 + j * 72, "bounce", wd[k], 64);
    });
    q.note("Bring: steamer, clips, two sizes per coat, release forms.", 0, 62 + 6 * 72 + 20, "gel", 420, 76);
    board({ title: "Winter coats shot list", kind: "shotlist", clientId: "cmed", projectId: "pmed3" }, q, "mwalid", -1, -4);
    // 4 campaign map · Medina SKIN
    q = maker();
    var hub = q.note("Medina Threads · SKIN 10\nnext 3 months", 0, 0, "chroma", 240, 120);
    [["Month 1: real sizes", "Five friends, five sizes", "gel", 0, -260], ["Month 2: styling", "One piece, three looks", "bounce", 380, 0], ["Month 3: price", "Under 150 DT", "gel", 0, 260], ["Always on: made here", "Tailor and street", "bounce", -380, 0]].forEach(function (a) {
      var n = q.note(a[0] + "\n" + a[1], a[3], a[4], a[2], 230, 120); q.arrow(hub, n, "slate");
    });
    q.text("Campaign map", -380, -330, "slate", 400, 28);
    board({ title: "Medina SKIN campaign map", kind: "angles", clientId: "cmed", projectId: "pmedk1" }, q, "mheni", -3, -8);
    // 5 hooks · Cable Corner
    q = maker();
    q.text("Power bank drop: hooks to test", 0, -80, "slate", 600, 28);
    BANK.ccab.hooks.forEach(function (h, k) { q.note(h, (k % 3) * 220, Math.floor(k / 3) * 170, k < 3 ? "gel" : "bounce", 200, 150); });
    q.link("Drop test ref, YouTube", YT + "Drop06", 0, 360);
    board({ title: "Power bank hooks", kind: "hooks", clientId: "ccab", projectId: "pcab2" }, q, "mamira", -5, -12);
    // 6 storyboard · Nabeul (closed project, kept for the client page)
    q = maker();
    q.text("Summer season: painted by hand", 0, -90, "slate", 700, 30);
    [["Hook", "Brush on clay, one long stroke."], ["Maker", "Am Salah looks up, smiles."], ["Kiln", "Door opens, steam."], ["Table", "Family hands reach for the plates."]].forEach(function (f, k) {
      q.frame(k + 1, f[0], k * 220, 0); q.note(f[1], k * 220, 340, k % 2 ? "bounce" : "gel", 180, 130);
    });
    board({ title: "Summer season storyboard", kind: "storyboard", clientId: "cnab", projectId: "pnab" }, q, "mheni", -95, -118);
    // 7 GECKO's own content
    q = maker();
    q.text("GECKO's own page · next 4 weeks", 0, -90, "slate", 700, 30);
    ["Teardown: pretty reel, no hook", "Behind the scenes: Kelibia sunrise", "Hook of the week", "Client win: Nabeul case study"].forEach(function (s, k) { q.note(s, k * 200, 0, k % 2 ? "bounce" : "chroma", 180, 120); });
    q.link("Teardown format, YouTube", YT + "Tear13", 0, 150); q.link("Behind the scenes, Instagram", IG + "Bts16/", 260, 150); q.link("Carousel idea, Pinterest", PN + "008/", 520, 150);
    board({ title: "GECKO content plan", kind: "free", clientId: "", projectId: "" }, q, "mheni", 0, -9);
    C.boards = C.boards.concat(BD);
    function linkBoard(title, ideaTitle) {
      var b = BD.find(function (x) { return x.title === title; }), i = C.ideas.find(function (x) { return x.title === ideaTitle; });
      if (b && i) { b.ideaId = i.id; i.boardId = b.id; }
    }
    linkBoard("Harissa month 1 moodboard", "Spice ladder, five spoons"); linkBoard("Kelibia month 2 storyboard", "Sunrise squat test");
    linkBoard("Winter coats shot list", "Bab Souika walk"); linkBoard("GECKO content plan", "Teardown: why your reels don't sell");

    // ================= activity on existing records =================
    function addLog(coll, rid, entries) { var r = (C[coll] || []).find(function (x) { return x.id === rid; }); if (r) r.log = (r.log || []).concat(entries); }
    addLog("projects", "pjas", [L("Hook 4 sent back for the Eid music", 4, "medit"), L("Balance reminder sent", 1, "mmoh")]);
    addLog("projects", "pnour2", [L("Pharmacy location confirmed", 1, "masst")]);
    addLog("projects", "patl", [L("Results week 2 logged", 3, "mskan")]);
    addLog("projects", "pkah", [L("Amine asked to rework angle 2", 2, "mmoh")]);
    C.tasks.forEach(function (t, k) {
      if ((t.log || []).length) return;
      t.log = [L("Task added", 3 + k % 6, k % 2 ? "mmoh" : "mheni", "09:4" + (k % 10))];
      if (t.done) { if (!t.doneOn) t.doneOn = t.due; t.log.push({ at: (t.doneOn < t.due ? t.doneOn : t.due) + "T16:20", who: t.who, text: "Marked done" }); }
    });

    // ================= invoice numbers (same rule as core/seed.js, so client pages carry the final numbers) =================
    var seqY = {};
    C.invoices.filter(function (i) { return i.no; }).sort(function (a, b) { return a.issued < b.issued ? -1 : a.issued > b.issued ? 1 : String(a.id) < String(b.id) ? -1 : 1; }).forEach(function (i) {
      var yy = i.issued.slice(0, 4); seqY[yy] = (seqY[yy] || 0) + 1; i.no = "GK-" + yy + "-" + String(seqY[yy]).padStart(3, "0");
    });
    cn.label = "Credit note for " + wrong.no;

    // ================= opening cash: a realistic bank balance today =================
    data.config.rules = Object.assign({}, data.config.rules, { openingCash: 15000 });

    // ================= client pages =================
    var shares = [
      { id: "demomedina1", clientId: "cmed", projectId: "pmed3", title: "Winter coats · campaign page" },
      { id: "demokelfit1", clientId: "ckel", projectId: "pkel2", title: "Month 2 · your reels" },
      { id: "demoharissa1", clientId: "char", projectId: "phar1", title: "Month 1 · plan and shoot" },
      { id: "demonabeul1", clientId: "cnab", projectId: "pnab", title: "Summer season · results" }
    ];
    var portal = GK.portal, S = GK.store;
    if (portal && portal.buildSnapshot && S) {
      // build each snapshot with the real builder, reading this seed data instead of the (still empty) store
      var keep = { all: S.all, get: S.get, config: S.config };
      S.all = function (c) { return (C[c] || []).slice(); };
      S.get = function (c, rid) { return rid ? (C[c] || []).find(function (x) { return x.id === rid; }) || null : null; };
      S.config = function () { return data.config; };
      try {
        shares.forEach(function (sh, k) {
          if (C.shares.some(function (x) { return x.id === sh.id; })) return;
          var full = Object.assign({ enabled: true, sections: { plan: true, scripts: true, files: true, timeline: true, invoices: true, boards: true },
            boardIds: C.boards.filter(function (b) { return b.clientId === sh.clientId; }).map(function (b) { return b.id; }), publishedBy: "mheni", note: "" }, sh);
          var snap = null; try { snap = portal.buildSnapshot(full); } catch (e) { snap = null; }
          if (!snap || (portal.check && portal.check(snap).length)) return;
          var when = at(-(k + 1), "10:30");
          full.snapshot = snap; full.publishedAt = when; full.created = when; full.editedAt = "";
          C.shares.push(full);
        });
      } finally { S.all = keep.all; S.get = keep.get; S.config = keep.config; }
    }
    function fileKey(pid, ri, hi) { var p = projIdx[pid], r = p && p.reels[ri]; return r && r.hooks[hi] ? r.id + ":" + r.hooks[hi].id : "plan"; }
    var FB = [
      ["demomedina1", "cmed", "pmed3", "approve", "plan", "Plan is perfect. Go for Bab Souika.", 5, "11:40"],
      ["demomedina1", "cmed", "pmed3", "comment", "plan", "Can the models wear the camel coat first?", 2, "19:05"],
      ["demokelfit1", "ckel", "pkel2", "comment", "plan", "The sunrise shots look amazing. Can we add the fort?", 1, "08:30"],
      ["demokelfit1", "ckel", "pkel2", "changes", fileKey("pkel2", 1, 1), "Hook 2 is too slow, start on the squat.", 0, "09:15"],
      ["demoharissa1", "char", "phar1", "approve", "plan", "Approved. Level 5 is my uncle's favourite.", 3, "13:20"],
      ["demoharissa1", "char", "phar1", "comment", "plan", "Please use the small jars on the table too.", 1, "21:10"],
      ["demonabeul1", "cnab", "pnab", "approve", fileKey("pnab", 0, 0), "Best video we ever had. Orders doubled that week.", 4, "10:05"],
      ["demonabeul1", "cnab", "pnab", "comment", "plan", "Ready for the holiday table season when you are.", 2, "17:45"]
    ];
    FB.forEach(function (f) {
      if (!C.shares.some(function (s) { return s.id === f[0]; })) return;
      C.feedback.push({ id: id("fb"), shareId: f[0], clientId: f[1], projectId: f[2], kind: f[3], target: f[4], text: f[5], who: "client", at: at(-f[6], f[7]) });
    });
  });
})(window.GK);
