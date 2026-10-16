/* Gecko Ops · sample data. Lives in this browser only (demo mode); never written to the shared store.
   Brands and people are invented. Dates are relative to today so the sample always looks current. */
(function (GK) {
  "use strict";
  var u = GK.u, d = u.d;
  GK.seedExtra = GK.seedExtra || [];
  GK.seed = function () {
    var M = GK.m, conf = M.defaultConfig(), today = u.today(), ym = u.month(today);
    function hook(text, status, v, extra) { return Object.assign({ id: u.uid("h"), text: text, status: status, v: v || 1, clientOk: status === "approved", drive: "" }, extra || {}); }
    function reel(angleId, mode, script, hooks) { return { id: u.uid("r"), angleId: angleId, mode: mode, format: "9x16", script: script, drive: "", hooks: hooks }; }
    function hist(pairs) { return pairs.map(function (p) { return { stage: p[0], at: d(p[1]) }; }); }
    function pay(date, net, wh, method) { return { date: date, net: net, withheld: wh || 0, method: method || "transfer", ref: "" }; }

    var team = [
      { id: "mheni", name: "Heni", role: "founder" },
      { id: "mmoh", name: "Mohamed", role: "sales" },
      { id: "medit", name: "Yassine", role: "editor" },
      { id: "masst", name: "Salma", role: "assistant" }
    ];
    var clients = [
      { id: "cjas", brand: "Maison Jasmin", code: "JASMIN", contact: "Ines", phone: "+216 20 000 101", whatsapp: "+216 20 000 101", email: "", sector: "Cosmetics", taxId: "1234567/A/M/000", buyer: "In-house", baseline: { v: 14, date: d(-40) }, notes: "Sells mostly on Instagram. Ships nationwide." },
      { id: "ckah", brand: "Kahwa Lab", code: "KAHWA", contact: "Amine", phone: "+216 22 000 202", whatsapp: "+216 22 000 202", email: "", sector: "Coffee", taxId: "", buyer: "Freelance media buyer", baseline: { v: 9, date: d(-6) }, notes: "" },
      { id: "catl", brand: "Atlas Sneakers", code: "ATLAS", contact: "Sami", phone: "+216 98 000 303", whatsapp: "+216 98 000 303", email: "", sector: "Footwear", taxId: "7654321/B/A/000", buyer: "Agency", baseline: { v: 21, date: d(-75) }, notes: "" },
      { id: "cnour", brand: "Nour Skin", code: "NOUR", contact: "Rania", phone: "+216 55 000 404", whatsapp: "+216 55 000 404", email: "", sector: "Skincare", taxId: "1112223/C/M/000", buyer: "In-house", baseline: { v: 30, date: d(-70) }, notes: "SKIN 10 since two months." }
    ];

    // ---- Maison Jasmin · GRIP · editing, deposit paid, balance issued
    var aJ1 = u.uid("a"), aJ2 = u.uid("a");
    var pJas = { id: "pjas", clientId: "cjas", contractId: "", month: 0, name: "Eid launch", pack: "test", stage: "edit", planApproved: true, planApprovedOn: d(-18),
      shootDate: d(-8), format: "9x16", mohamed: true, onboarding: [true, true, true, true, true, true, true],
      angles: [{ id: aJ1, name: "Smells like home", why: "Buyers mention their grandmother's jasmine" }, { id: aJ2, name: "Gift without thinking", why: "Eid gifting searches" }],
      reels: [
        reel(aJ1, "D", "Open on the jar, cut to the street at dusk.", [hook("This smells like Sidi Bou Said", "approved", 2), hook("Your grandmother had this", "review", 1)]),
        reel(aJ1, "I", "Hands, steam, the lid comes off.", [hook("POV: the hammam is home", "edit", 1), hook("No one guesses it's 39 DT", "todo", 1)]),
        reel(aJ2, "D", "Unboxing on a market table.", [hook("The Eid gift nobody returns", "approved", 1), hook("Wrapped in 10 seconds", "revise", 2)]),
        reel(aJ2, "I", "Three reactions, one jar.", [hook("We filmed their faces", "todo", 1), hook("Mum cried a little", "todo", 1)])
      ],
      carousels: [], costs: M.estimateCosts("test"), report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: null, log: [] };

    // ---- Kahwa Lab · SEASON · plan not approved, deposit not issued
    var aK1 = u.uid("a");
    var pKah = { id: "pkah", clientId: "ckah", contractId: "", month: 0, name: "Winter season", pack: "campaign", stage: "plan", planApproved: false, planApprovedOn: "",
      shootDate: "", format: "9x16", mohamed: true, onboarding: [true, true, true, false, false, false, false],
      angles: [{ id: aK1, name: "Morning ritual", why: "Most orders land before 9am" }], reels: [], carousels: [], costs: [], report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: null, log: [] };

    // ---- Atlas Sneakers · GRIP · testing, fully paid, results coming in
    var aA1 = u.uid("a"), aA2 = u.uid("a");
    var pAtl = { id: "patl", clientId: "catl", contractId: "", month: 0, name: "Drop 03", pack: "test", stage: "testing", planApproved: true, planApprovedOn: d(-40),
      shootDate: d(-30), format: "9x16", mohamed: false, onboarding: [true, true, true, true, true, true, true],
      angles: [{ id: aA1, name: "Built for Tunis streets", why: "Returns mention sizing on cobbles" }, { id: aA2, name: "Under 200 DT", why: "Price is the first DM question" }],
      reels: [
        reel(aA1, "D", "Walk test from Bab Bhar.", [hook("We walked 12 km in these", "approved", 1, { results: { hook: 31, ctr: 1.4, cpp: 6.2 } }), hook("Cobbles don't care", "approved", 1, { results: { hook: 24, ctr: 0.9, cpp: 9.8 } })]),
        reel(aA2, "D", "Price reveal on the box.", [hook("Guess the price", "approved", 1, { results: { hook: 38, ctr: 1.9, cpp: 4.1 } }), hook("Less than your last dinner out", "approved", 1, { results: { hook: 27, ctr: 1.1, cpp: 7.0 } })]),
        reel(aA2, "I", "Three outfits, one pair.", [hook("One pair, three looks", "approved", 1, {}), hook("Your feed needs this", "approved", 1, {})]),
        reel(aA1, "I", "Rain test.", [hook("We poured water on them", "approved", 1, {}), hook("Still dry", "approved", 1, {})])
      ],
      carousels: [], costs: M.estimateCosts("test"), report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: null, log: [] };

    // ---- Atlas Sneakers · earlier GRIP · closed, commission paid
    var pAtlOld = { id: "patl0", clientId: "catl", contractId: "", month: 0, name: "Drop 02", pack: "test", stage: "done", planApproved: true, planApprovedOn: d(-95),
      shootDate: d(-88), format: "9x16", mohamed: true, onboarding: [true, true, true, true, true, true, true], angles: [], reels: [], carousels: [],
      costs: M.estimateCosts("test"), report: { metric: "cpp", now: "5.4", why: { a1: "Price angle won" }, more: "Price reveal", kill: "Lifestyle b-roll", next: "Walk test" }, payout: { amount: 237, paidOn: d(-60) }, log: [] };

    // ---- Nour Skin · SKIN 10 contract, month 1 closed, month 2 at shoot
    var contract = { id: "knour", clientId: "cnour", pack: "monthly8", start: ym, minMonths: 3, status: "active" };
    var aN1 = u.uid("a"), aN2 = u.uid("a"), aN3 = u.uid("a");
    var pNour1 = { id: "pnour1", clientId: "cnour", contractId: "knour", month: 1, name: "Month 1", pack: "monthly8", stage: "done", planApproved: true, planApprovedOn: d(-50),
      shootDate: d(-45), format: "9x16", mohamed: true, onboarding: [true, true, true, true, true, true, true], angles: [{ id: aN1, name: "Glow in 7 days", why: "Reviews" }], reels: [], carousels: [],
      costs: M.estimateCosts("monthly8"), report: { metric: "cpp", now: "8.5", why: {}, more: "Before / after", kill: "Studio shots", next: "Derja voiceover" }, payout: { amount: 0, paidOn: "" }, log: [] };
    var pNour2 = { id: "pnour2", clientId: "cnour", contractId: "knour", month: 2, name: "Month 2", pack: "monthly8", stage: "shoot", planApproved: true, planApprovedOn: d(-3),
      shootDate: d(2), format: "9x16", mohamed: true, onboarding: [true, true, true, true, true, true, true],
      angles: [{ id: aN2, name: "Derja voiceover", why: "Month 1 winner" }, { id: aN3, name: "Pharmacist says", why: "Trust objection" }],
      reels: [reel(aN2, "D", "Rania talks to camera.", [hook("Ma tsadakch", "todo", 1), hook("7 days, no filter", "todo", 1)])],
      carousels: [{ id: u.uid("k"), angleId: aN3, title: "5 things your pharmacist knows", status: "todo", v: 1, clientOk: false, drive: "" }],
      costs: M.estimateCosts("monthly8"), report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: null, log: [] };
    // contract start is the month before this one
    var prev = new Date(today + "T12:00:00"); prev.setMonth(prev.getMonth() - 1); contract.start = u.month(u.iso(prev));

    var y = u.year(today);
    conf.seedV = 4;
    var invoices = [
      { id: "i1", no: "GK-" + y + "-001", clientId: "catl", projectId: "patl0", kind: "deposit", label: "GRIP · Drop 02 · deposit", amount: 750, stamp: 1, issued: d(-96), due: d(-89), payments: [pay(d(-94), 728.5, 22.5)], credited: false, log: [] },
      { id: "i2", no: "GK-" + y + "-002", clientId: "catl", projectId: "patl0", kind: "balance", label: "GRIP · Drop 02 · balance", amount: 750, stamp: 1, issued: d(-80), due: d(-73), payments: [pay(d(-75), 728.5, 22.5)], credited: false, log: [] },
      { id: "i3", no: "GK-" + y + "-003", clientId: "cnour", projectId: "pnour1", kind: "month", label: "SKIN 10 · month 1", amount: 3500, stamp: 1, issued: d(-52), due: d(-45), payments: [pay(d(-47), 3396, 105)], credited: false, log: [] },
      { id: "i4", no: "GK-" + y + "-004", clientId: "catl", projectId: "patl", kind: "deposit", label: "GRIP · Drop 03 · deposit", amount: 750, stamp: 1, issued: d(-42), due: d(-35), payments: [pay(d(-41), 728.5, 22.5)], credited: false, log: [] },
      { id: "i5", no: "GK-" + y + "-005", clientId: "cjas", projectId: "pjas", kind: "deposit", label: "GRIP · Eid launch · deposit", amount: 750, stamp: 1, issued: d(-19), due: d(-12), payments: [pay(d(-17), 751, 0, "cash")], credited: false, log: [] },
      { id: "i6", no: "GK-" + y + "-006", clientId: "catl", projectId: "patl", kind: "balance", label: "GRIP · Drop 03 · balance", amount: 750, stamp: 1, issued: d(-24), due: d(-17), payments: [pay(d(-20), 728.5, 22.5)], credited: false, log: [] },
      { id: "i7", no: "GK-" + y + "-007", clientId: "cnour", projectId: "pnour2", kind: "month", label: "SKIN 10 · month 2", amount: 3500, stamp: 1, issued: d(-5), due: d(2), payments: [pay(d(-4), 3396, 105)], credited: false, log: [] },
      { id: "i8", no: "GK-" + y + "-008", clientId: "cjas", projectId: "pjas", kind: "balance", label: "GRIP · Eid launch · balance", amount: 750, stamp: 1, issued: d(-9), due: d(-2), payments: [], credited: false, log: [] },
      { id: "i9", no: "", clientId: "ckah", projectId: "pkah", kind: "deposit", label: "SEASON · Winter season · deposit", amount: 2400, stamp: 1, issued: "", due: "", payments: [], credited: false, log: [] },
      { id: "i10", no: "", clientId: "ckah", projectId: "pkah", kind: "balance", label: "SEASON · Winter season · balance", amount: 2400, stamp: 1, issued: "", due: "", payments: [], credited: false, log: [] }
    ];

    var leads = [
      { id: "l1", brand: "Zitouna Oils", contact: "Karim", handle: "@zitouna.oils", channel: "teardown_dm", stage: "dm", q: [true, false, false, false], pack: "test", next: "Follow up with the teardown", nextDate: d(1), owner: "mmoh", lostReason: "", history: hist([["dm", -2]]), log: [] },
      { id: "l2", brand: "Bled Bags", contact: "Hela", handle: "@bledbags", channel: "teardown_dm", stage: "replied", q: [true, true, false, false], pack: "test", next: "Book the call", nextDate: d(0), owner: "mmoh", lostReason: "", history: hist([["dm", -6], ["replied", -3]]), log: [] },
      { id: "l3", brand: "Carthage Candles", contact: "Mehdi", handle: "@carthage.candles", channel: "media_buyer", stage: "call", q: [true, true, true, false], pack: "campaign", next: "Call Thursday 11:00", nextDate: d(2), owner: "mmoh", lostReason: "", history: hist([["dm", -9], ["replied", -7], ["call", -2]]), log: [] },
      { id: "l4", brand: "Dar Henna", contact: "Olfa", handle: "@darhenna", channel: "referral", stage: "proposal", q: [true, true, true, true], pack: "monthly8", next: "Proposal follow-up", nextDate: d(-1), owner: "mmoh", lostReason: "", history: hist([["dm", -14], ["replied", -12], ["call", -8], ["proposal", -4]]), log: [] },
      { id: "l5", brand: "Sahel Swim", contact: "Nidhal", handle: "@sahelswim", channel: "teardown_dm", stage: "lost", q: [true, false, false, false], pack: "test", next: "", nextDate: "", owner: "mmoh", lostReason: "not_now", history: hist([["dm", -20], ["replied", -18], ["lost", -15]]), log: [] },
      { id: "l6", brand: "Kahwa Lab", contact: "Amine", handle: "@kahwalab", channel: "warm", stage: "won", q: [true, true, true, true], pack: "campaign", next: "", nextDate: "", owner: "mmoh", lostReason: "", history: hist([["dm", -25], ["call", -16], ["proposal", -12], ["won", -7]]), log: [] }
    ];
    var outreach = [];
    for (var i = 1; i <= 6; i++) outreach.push({ id: d(-i) + "_mmoh", date: d(-i), owner: "mmoh", dms: [11, 10, 8, 12, 10, 9][i - 1], replies: [2, 1, 1, 3, 1, 0][i - 1], calls: i === 2 ? 1 : 0 });

    var tasks = [
      { id: "t1", projectId: "pjas", title: "Re-cut hook 4 with the Eid music", who: "medit", due: d(1), done: false },
      { id: "t2", projectId: "pjas", title: "Chase the balance on WhatsApp", who: "mmoh", due: d(0), done: false },
      { id: "t3", projectId: "pnour2", title: "Book the pharmacist location", who: "masst", due: d(1), done: false },
      { id: "t4", projectId: "pkah", title: "Send the creative plan", who: "mheni", due: d(-1), done: false },
      { id: "t5", projectId: "patl", title: "Pull hook rates from Ads Manager", who: "mheni", due: d(3), done: false },
      { id: "t6", projectId: "patl", title: "Export finals to Drive", who: "medit", due: d(-10), done: true }
    ];
    var msgs = [
      { id: "g1", ch: "general", who: "mheni", text: "Shoot for Nour Skin moved to " + u.fmtDate(d(2)) + ". Salma, can you confirm the location?", at: d(-1) + "T10:12" },
      { id: "g2", ch: "general", who: "masst", text: "Confirmed, 9:30 at the pharmacy.", at: d(-1) + "T10:40" },
      { id: "g3", ch: "pjas", who: "medit", text: "Hook 4 needs the Eid track, the client asked for it.", at: d(0) + "T09:05" },
      { id: "g4", ch: "general", who: "mmoh", text: "Dar Henna wants the proposal in French.", at: d(0) + "T12:30" }
    ];

    var data = { config: conf, colls: { team: team, clients: clients, leads: leads, outreach: outreach, contracts: [contract], projects: [pJas, pKah, pAtl, pAtlOld, pNour1, pNour2], invoices: invoices, tasks: tasks, msgs: msgs } };
    // other modules add their own sample data: GK.seedExtra.push(function (data, ctx) { data.colls.ideas = [...]; })
    var ctx = { u: u, m: M, today: today, d: d, ym: ym };
    (GK.seedExtra || []).forEach(function (fn) { fn(data, ctx); });
    // bring the sample (written against the first offers and stages) to this version
    M.migrateAll(data.colls);
    data.colls = JSON.parse(M.renamePacks(JSON.stringify(data.colls)).replace(/(\d)(\s|\u00a0)?DT\b/g, "$1 TND"));
    // sequential numbers per year, by issue date (sample history is added after the base invoices)
    var seqByYear = {};
    data.colls.invoices.filter(function (i) { return i.no; }).sort(function (a, b) { return a.issued < b.issued ? -1 : a.issued > b.issued ? 1 : String(a.id) < String(b.id) ? -1 : 1; }).forEach(function (i) {
      var yy = i.issued.slice(0, 4); seqByYear[yy] = (seqByYear[yy] || 0) + 1; i.no = "GK-" + yy + "-" + String(seqByYear[yy]).padStart(3, "0");
    });
    return data;
  };
})(window.GK);
