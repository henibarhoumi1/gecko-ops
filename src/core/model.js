/* Gecko Ops · business rules. Pure functions over store data.
   Rules come from gecko/plan/ (offers-and-pricing.md, crm-pipeline.md, roles-and-team.md, costs.md). Modules read through GK.m, never re-implement these. */
(function (GK) {
  "use strict";
  var u = GK.u;
  var M = {};

  // ---------- delivery (projects): gecko/plan/crm-pipeline.md "After won" ----------
  M.STAGES = ["onboarding", "scripting", "pre_production", "shoot", "editing", "client_review", "revisions", "delivered", "paid", "retention"];
  M.FILE_STATUS = ["todo", "edit", "review", "approved"]; // "revise" is set by a client's change request
  M.FORMATS = ["9x16", "4x5", "1x1"];
  M.ONBOARDING_STEPS = 7; // ob1..ob7 words live in the projects module
  M.REVIEW_SILENCE_DAYS = 3; // client silence in review counts as approved

  // ---------- sales (leads): gecko/plan/crm-pipeline.md ----------
  /** Open stages in order, then the two exits. Won = the required upfront payment is received. */
  M.LEAD_STAGES = ["prospect", "contacted", "conversation", "meeting_booked", "qualified", "proposal_sent", "negotiation", "accepted", "signed", "won", "lost", "nurture"];
  M.OPEN_STAGES = M.LEAD_STAGES.slice(0, 9);
  M.LEAD_ODDS = { prospect: 2, contacted: 5, conversation: 15, meeting_booked: 25, qualified: 40, proposal_sent: 50, negotiation: 60, accepted: 80, signed: 90, won: 100, lost: 0, nurture: 0 };
  M.STAGE_MAX_DAYS = { prospect: 7, contacted: 14, conversation: 7, meeting_booked: 1, qualified: 2, proposal_sent: 10, negotiation: 7, accepted: 3, signed: 5 };
  /** Follow-up days after entering a stage; after the last one the lead moves to `after` with that reason. */
  M.CADENCE = {
    contacted: { days: [0, 2, 5, 10], after: "nurture", reason: "no_response" },
    proposal_sent: { days: [1, 3, 6, 10], after: "lost", reason: "no_response" },
    accepted: { days: [1, 3, 5], after: "negotiation", reason: "" },
    signed: { days: [1, 3, 5], after: "negotiation", reason: "" }
  };
  M.RECONTACT_DAYS = 60;
  M.PROPOSAL_DAYS = 10;
  M.SOURCES = ["ig_organic", "tiktok_organic", "ig_ads", "tiktok_ads", "website_form", "referral_client", "referral_personal", "outbound_dm", "outbound_visit", "outbound_email", "event", "international_platform", "other"];
  M.CHANNELS = M.SOURCES; // old name
  M.LOST_REASONS = ["price", "no_budget_now", "no_response", "chose_competitor", "doing_it_in_house", "bad_fit", "timing", "decision_maker_said_no", "other"];
  M.OBJECTIONS = ["too_expensive", "want_to_see_results_first", "already_have_someone", "need_to_ask_partner", "not_the_right_time", "want_monthly_without_test", "want_more_pieces", "other"];
  M.ACTIVITY_TYPES = ["dm_sent", "whatsapp_sent", "call", "visit", "email", "meeting", "proposal_sent", "follow_up", "note"];
  M.MARKETS = ["tunisia", "international"];
  M.LANGS = ["derja", "french", "arabic", "english"];
  M.LEAD_KINDS = ["ecommerce", "personal_brand", "clinic", "food", "real_estate", "hospitality", "other"];
  /** Qualifier (stage meeting_booked -> qualified): need, budget, decision, timing. Ideal client score: 5 points, prospect at 3+. */
  M.QUALIFIER = ["need", "budget", "decision", "timing"];
  M.FIT = ["active", "weak_content", "spending_power", "priority_sector", "decision_maker"];
  M.FIT_MIN = 3;

  M.ROLES = ["founder", "sales", "editor", "assistant"]; // "sales" is shown as Client Lead
  M.CURRENCIES = ["TND", "EUR", "USD"];

  /** Offers: gecko/plan/offers-and-pricing.md. price = standard, launch = launch price (null when none).
      upfront: deposit (50% to book) | month (monthly, paid in advance) | full (paid upfront). */
  M.PACKS_DEFAULT = {
    audit:      { name: "Ad Audit",        market: "tunisia", currency: "TND", price: 150,  launch: null, monthly: false, upfront: "full",    shootDays: 0, angles: 0, reels: 0,  variations: 0,  carousels: 0, cost: 0 },
    test:       { name: "Test Campaign",   market: "tunisia", currency: "TND", price: 1500, launch: 1000, monthly: false, upfront: "deposit", shootDays: 1, angles: 3, reels: 3,  variations: 6,  carousels: 1, statics: 0,  mashups: 0, cost: 380 },
    regular:    { name: "Regular",         market: "tunisia", currency: "TND", price: 2300, launch: 1800, monthly: true,  upfront: "month",   shootDays: 1, angles: 3, reels: 8,  variations: 16, carousels: 1, statics: 4,  mashups: 0, cost: 380, minMonths: 3 },
    premier:    { name: "Premier",         market: "tunisia", currency: "TND", price: 3600, launch: 2800, monthly: true,  upfront: "month",   shootDays: 1, angles: 4, reels: 12, variations: 24, carousels: 2, statics: 6,  mashups: 2, cost: 380, minMonths: 3 },
    premium:    { name: "Premium",         market: "tunisia", currency: "TND", price: 5800, launch: 4500, monthly: true,  upfront: "month",   shootDays: 1, angles: 4, reels: 20, variations: 60, carousels: 2, statics: 10, mashups: 4, cost: 500, minMonths: 3, ads: true },
    campaign:   { name: "Campaign",        market: "tunisia", currency: "TND", price: 4800, launch: 3600, monthly: false, upfront: "deposit", shootDays: 2, angles: 4, reels: 10, variations: 10, carousels: 2, cost: 760 },
    remote_edit:{ name: "Remote Ad Edit Pack", market: "international", currency: "USD", price: 700, launch: null, monthly: true, upfront: "month", shootDays: 0, angles: 0, reels: 8, variations: 16, carousels: 0, cost: 240 },
    gulf_trip:  { name: "Gulf Shoot Trip", market: "international", currency: "USD", price: 3500, launch: null, monthly: false, upfront: "deposit", shootDays: 2, angles: 4, reels: 8, variations: 16, carousels: 0, cost: 0 },
    tn_day:     { name: "Tunisia Shoot Day", market: "international", currency: "EUR", price: 950, launch: null, monthly: false, upfront: "deposit", shootDays: 1, angles: 2, reels: 4, variations: 4, carousels: 0, cost: 350 },
    support:    { name: "Production support", market: "international", currency: "EUR", price: 250, launch: null, monthly: false, upfront: "deposit", shootDays: 1, angles: 0, reels: 0, variations: 0, carousels: 0, cost: 0, unit: "day" },
    custom:     { name: "Custom",          market: "tunisia", currency: "TND", price: 0,    launch: null, monthly: false, upfront: "deposit", shootDays: 1, angles: 0, reels: 0,  variations: 0,  carousels: 0, cost: 0 }
  };
  /** Add-ons, as quote lines. at: price, or pct of the offer (express). */
  M.ADDONS_DEFAULT = [
    { key: "reel_existing", name: "Extra reel from existing footage", price: 150 },
    { key: "reel_shoot", name: "Extra reel with a new half-day shoot", price: 400 },
    { key: "carousel", name: "Extra carousel", price: 120 },
    { key: "community", name: "Posting and community management (month)", price: 600 },
    { key: "ads", name: "Meta ads management (month)", price: 700 },
    { key: "raw", name: "Raw footage", price: 300 },
    { key: "express", name: "Express delivery (72 hours)", pct: 25 },
    { key: "revision", name: "Extra revision round (per piece)", price: 80 },
    { key: "talent", name: "Actors, models, locations, props (at cost + 15%)", price: 0 },
    { key: "travel", name: "Shoot over 150 km from Tunis (per day, plus travel at cost)", price: 200 }
  ];
  /** Cost rates (TND). Owner pay is what Heni is paid on a project before the partner share is worked out. */
  M.RATES_DEFAULT = {
    camera: 300, transport: 50, food: 30, editReel: 30, assistant: 120, lights: 80,
    ownerDirect: 350, ownerPer: "day", // Heni as director and DOP: per shoot day (confirmed by Heni)
    editSmall: 300, editMid: 500, editLarge: 700 // Heni's editing pay: 6 reels or fewer, 7 to 14 (confirmed), 15 or more
  };
  /** Client Lead fixed pay levels: recurring monthly clients -> TND a month (internal/team-pay.md). */
  M.LEVELS_DEFAULT = [{ clients: 5, pay: 1500 }, { clients: 8, pay: 2000 }, { clients: 12, pay: 2600 }];
  M.RULES_DEFAULT = {
    cap: 60000,          // revenue in a year that triggers the switch to a SUARL (legal-and-admin.md)
    reserve: 10,         // % of revenue
    commission: 30,      // partner share, % of project profit after all costs and the owner's pay
    shareClients: 5,     // the partner share applies to the first N won clients
    finderPct: 30,       // after that: % on a client the Client Lead found and closed alone
    finderMonths: 0,     // 0 = for as long as the Client Lead handles that client himself
    retainerFrom: "",    // date the fixed pay started; the first-5 share stops on projects after it
    sharePayee: "",      // team id of the Client Lead
    retainer: 0,         // Client Lead fixed monthly pay once set
    salary: 0,           // Heni, TND / month taken out (owner draw), once set
    stamp: 1,            // fiscal stamp per invoice, TND. Accountant to confirm.
    withholding: 3,      // % a Tunisian company client withholds. Accountant to confirm.
    vat: 0,              // % VAT on Tunisian invoices (19 under a SUARL). Accountant to confirm.
    dueDays: 7,
    extrasDirect: true,  // actors, locations: client pays them directly by default
    openingCash: 0,      // cash when you start tracking, TND
    launchClients: 5,    // launch prices for the first N won clients...
    launchUntil: "2026-12-31", // ...or until this date, whichever comes first
    launchMonths: 3,     // monthly offers: launch price for the client's first N months
    creditDays: 14,      // a monthly offer signed within N days of a Test Campaign delivery...
    creditPct: 50,       // ...gets this % of the Test Campaign price off the first month
    eur: 3.40, usd: 2.95, // TND per EUR / USD, for totals. Check before every quote.
    floor: 10000,        // Heni's monthly floor, Heni and Gecko together (TND)
    adBudget: 2000,      // Gecko's own monthly marketing budget (TND)
    spendApproval: 200   // expenses above this need the founder
  };
  M.COMPANY_DEFAULT = {
    name: "Gecko", legal: "", mf: "", address: "",
    phone: "+216 26 191 555", email: "reachoutgecko@gmail.com", instagram: "@geckoagency_",
    appUrl: "https://claude.ai/artifact/FaYCvv65YDNYfUCk66r8uo",
    invoiceNote: ""
  };
  M.defaultConfig = function () {
    return { live: true, version: 2, company: u.clone(M.COMPANY_DEFAULT), packs: u.clone(M.PACKS_DEFAULT), addons: u.clone(M.ADDONS_DEFAULT), levels: u.clone(M.LEVELS_DEFAULT), rates: u.clone(M.RATES_DEFAULT), rules: u.clone(M.RULES_DEFAULT) };
  };

  // ---------- lookups ----------
  function S() { return GK.store; }
  M.cfg = function () { return S().config() || M.defaultConfig(); };
  /** Saved offers from before Regular, Premier and Premium (Oct 2026) fall back to the defaults. */
  function packsCfg() { var c = M.cfg(); return c.version >= 2 && c.packs && c.packs.regular ? c.packs : M.PACKS_DEFAULT; }
  M.pack = function (k) { if (M.OLD && M.OLD.pack[k]) k = M.OLD.pack[k]; var p = packsCfg()[k] || M.PACKS_DEFAULT[k]; return p ? Object.assign({ currency: "TND", launch: null, upfront: p && p.monthly ? "month" : "deposit", market: "tunisia" }, p) : { name: k || "—", currency: "TND", price: 0, launch: null, monthly: false, upfront: "deposit", reels: 0, variations: 0, carousels: 0, angles: 0, shootDays: 0, cost: 0 }; };
  M.packKeys = function (market) { var ps = packsCfg(); return Object.keys(ps).filter(function (k) { return !market || (ps[k].market || "tunisia") === market; }); };
  M.addons = function () { var c = M.cfg(); return c.version >= 2 && c.addons ? c.addons : M.ADDONS_DEFAULT; };
  /** Stored rules and rates from the first version (old packs, 75,000 cap) are ignored, except the opening cash. */
  M.rules = function () { var c = M.cfg(), r = c.version >= 2 ? (c.rules || {}) : { openingCash: (c.rules || {}).openingCash }; var d = M.RULES_DEFAULT; var o = {}; for (var k in d) o[k] = r[k] != null ? r[k] : d[k]; if (typeof M.cashTotal === "function") { var ct = M.cashTotal(); if (ct != null) o.openingCash = ct; } return o; };
  M.rates = function () { var c = M.cfg(), r = c.version >= 2 ? (c.rates || {}) : {}; var d = M.RATES_DEFAULT; var o = {}; for (var k in d) o[k] = r[k] != null ? r[k] : d[k]; return o; };
  M.company = function () { var c = M.cfg().company || {}; var d = M.COMPANY_DEFAULT; var o = {}; for (var k in d) o[k] = c[k] != null && c[k] !== "" ? c[k] : d[k]; o.appUrl = c.appUrl != null ? c.appUrl : d.appUrl; o.mf = c.mf || ""; o.legal = c.legal || ""; o.invoiceNote = c.invoiceNote || ""; o.address = c.address || (u.fr() ? "Tunis, Tunisie" : "Tunis, Tunisia"); return o; };
  M.client = function (id) { return S().get("clients", id); };
  M.project = function (id) { return S().get("projects", id); };
  M.member = function (id) { return S().get("team", id) || { id: id, name: id === "client" ? "Client" : (id || "—"), role: "" }; };
  M.brand = function (clientId) { var c = M.client(clientId); return c ? c.brand : "—"; };
  M.projectLabel = function (p) { return p ? M.brand(p.clientId) + " · " + p.name : "—"; };
  M.invoicesOf = function (p) { return S().all("invoices").filter(function (i) { return i.projectId === p.id; }); };
  M.tasksOf = function (p) { return S().all("tasks").filter(function (x) { return x.projectId === p.id; }); };

  // ---------- currency ----------
  /** TND value of an amount in a currency, at the rates in Settings. */
  M.toTND = function (n, cur) { var r = M.rules(); n = +n || 0; return cur === "EUR" ? n * r.eur : cur === "USD" ? n * r.usd : n; };
  M.curOf = function (x) { return (x && x.currency) || "TND"; };
  /** Money in its own currency: u.money with the currency. */
  M.fmt = function (n, cur) { return u.money(n, 0, cur || "TND"); };

  // ---------- launch pricing ----------
  /** Clients in the order they were won (first deposit or first monthly payment received). */
  M.wonClients = function () {
    return S().all("clients").filter(function (c) { return !!c.wonOn; }).sort(function (a, b) { return a.wonOn < b.wonOn ? -1 : a.wonOn > b.wonOn ? 1 : String(a.id) < String(b.id) ? -1 : 1; });
  };
  /** 1-based rank of a client among won clients (0 when not won yet). */
  M.clientRank = function (clientId) { var w = M.wonClients(); for (var i = 0; i < w.length; i++) if (w[i].id === clientId) return i + 1; return 0; };
  /** Launch prices are open for a new client while fewer than N clients are won and the date is before the end date. */
  M.launchOpen = function (date) { var r = M.rules(); return M.wonClients().length < r.launchClients && (date || u.today()) <= r.launchUntil; };
  /** Price for an offer for a client: {price, launch, standard, currency}.
      A client won during the launch keeps launch prices: one-offs for their first project, monthly offers for their first N months. */
  M.priceFor = function (packKey, clientId, monthN, date) {
    var pk = M.pack(packKey), r = M.rules(), rank = clientId ? M.clientRank(clientId) : 0;
    var eligible = pk.launch != null && (rank ? rank <= r.launchClients : M.launchOpen(date));
    if (eligible && pk.monthly && monthN && monthN > r.launchMonths) eligible = false;
    return { price: eligible ? pk.launch : pk.price, launch: eligible, standard: pk.price, currency: pk.currency || "TND" };
  };

  // ---------- leads ----------
  M.leadStage = function (l) {
    var stage = typeof l === "string" ? l : l && l.stage;
    return M.OLD && M.OLD.lead[stage] || stage || "";
  };
  M.isOpen = function (l) { return M.OPEN_STAGES.indexOf(M.leadStage(l)) > -1; };
  M.stageIndex = function (l) { return M.LEAD_STAGES.indexOf(M.leadStage(l)); };
  /** When the lead entered its current stage. */
  M.stageSince = function (l) { var stage = M.leadStage(l), h = (l.history || []).filter(function (x) { return M.leadStage(x.stage) === stage; }); return h.length ? h[h.length - 1].at : (l.created || ""); };
  M.fitScore = function (l) { return (l.fit || []).filter(Boolean).length; };
  M.qualified = function (l) { return (l.q || []).filter(Boolean).length === 4; };
  M.overdue = function (l) { return M.isOpen(l) && !!l.nextDate && l.nextDate < u.today(); };
  M.noNext = function (l) { return M.isOpen(l) && (!l.next || !l.nextDate); };
  /** Days in the current stage, and whether that is past the plan's max. */
  M.stageAge = function (l) { var since = M.stageSince(l), stage = M.leadStage(l); var n = since ? u.daysBetween(since.slice(0, 10), u.today()) : 0; var max = M.STAGE_MAX_DAYS[stage]; return { days: n, max: max || 0, stale: !!max && n > max }; };
  /** Weighted value of an open lead, in TND. */
  M.leadValue = function (l) { var v = +l.price || (l.pack ? M.priceFor(l.pack).price : 0); return M.toTND(v, l.currency || M.pack(l.pack).currency); };
  /** The cadence step a lead is on: {step, of, due, last, after} or null when the stage has no cadence. */
  M.cadence = function (l) {
    var c = M.CADENCE[M.leadStage(l)]; if (!c) return null;
    var since = (M.stageSince(l) || u.today()).slice(0, 10);
    var done = (l.touches || []).filter(function (t) { return t.stage === l.stage; }).length;
    var step = Math.min(done, c.days.length);
    return { step: step, of: c.days.length, due: step < c.days.length ? u.addDays(since, c.days[step]) : "", last: step >= c.days.length, after: c.after, reason: c.reason };
  };
  /** Default next action for a lead entering a stage: {next, nextDate}. Words come from i18n (nx_<stage>). */
  M.nextFor = function (stage, fromDate) {
    var d0 = fromDate || u.today(), c = M.CADENCE[stage];
    var days = c ? c.days[0] : { prospect: 1, conversation: 1, meeting_booked: 0, qualified: 2, negotiation: 2, nurture: M.RECONTACT_DAYS, lost: M.RECONTACT_DAYS }[stage];
    return { next: GK.t("nx_" + stage), nextDate: days == null ? "" : u.addDays(d0, days) };
  };

  // ---------- deliverables: Angle -> Reel (one body, D or I) -> Hook variants; carousels apart ----------
  M.angleIndex = function (p, angleId) { return (p.angles || []).findIndex(function (a) { return a.id === angleId; }); };
  /** BRAND_A2-R1-H3_D_9x16_v1 : angle 2, reel 1 of that angle, hook 3, direct, vertical, version 1. H1 is the base reel.
      The reel number keeps two reels on the same angle from sharing a file name. */
  M.hookCode = function (p, reel, hookIdx) {
    var c = M.client(p.clientId); var h = (reel.hooks || [])[hookIdx] || {};
    var sameAngle = (p.reels || []).filter(function (r) { return r.angleId === reel.angleId; });
    var rn = Math.max(0, sameAngle.findIndex(function (r) { return r.id === reel.id; })) + 1;
    return (c && c.code ? c.code : "BRAND") + "_A" + (M.angleIndex(p, reel.angleId) + 1) + "-R" + rn + "-H" + (hookIdx + 1) + "_" + (reel.mode || "D") + "_" + (reel.format || p.format || "9x16") + "_v" + (h.v || 1);
  };
  /** BRAND_A2-C1_4x5_v1 : angle 2, carousel 1. */
  M.carouselCode = function (p, car) {
    var c = M.client(p.clientId);
    var same = (p.carousels || []).filter(function (x) { return x.angleId === car.angleId; });
    return (c && c.code ? c.code : "BRAND") + "_A" + (M.angleIndex(p, car.angleId) + 1) + "-C" + (same.indexOf(car) + 1) + "_4x5_v" + (car.v || 1);
  };
  /** Flat list of every file in a project: {kind, key, code, angle, reel, hook, item, isBase} */
  M.files = function (p) {
    var out = [];
    (p.reels || []).forEach(function (r) {
      var a = (p.angles || []).find(function (x) { return x.id === r.angleId; }) || { name: "—" };
      (r.hooks || []).forEach(function (h, hi) {
        out.push({ kind: "hook", key: r.id + ":" + h.id, code: M.hookCode(p, r, hi), angle: a, reel: r, item: h, hookIndex: hi, isBase: hi === 0 });
      });
    });
    (p.carousels || []).forEach(function (cr) {
      var a = (p.angles || []).find(function (x) { return x.id === cr.angleId; }) || { name: "—" };
      out.push({ kind: "carousel", key: "car:" + cr.id, code: M.carouselCode(p, cr), angle: a, reel: null, item: cr, isBase: false });
    });
    return out;
  };
  M.findFile = function (p, key) { return M.files(p).find(function (f) { return f.key === key; }) || null; };
  /** Scope vs pack: reels = bodies, variations = extra hooks (H2+), carousels. */
  M.scope = function (p) {
    var pk = M.pack(p.pack);
    var reels = (p.reels || []).length;
    var variations = u.sum(p.reels || [], function (r) { return Math.max(0, (r.hooks || []).length - 1); });
    var carousels = (p.carousels || []).length;
    return { reels: reels, variations: variations, carousels: carousels, target: { reels: pk.reels, variations: pk.variations, carousels: pk.carousels, angles: pk.angles } };
  };
  M.progress = function (p) { var f = M.files(p); var a = f.filter(function (x) { return x.item.status === "approved"; }).length; return { done: a, total: f.length }; };

  // ---------- invoices ----------
  M.invTotal = function (i) { return (+i.amount || 0) + (i.kind === "credit" ? 0 : (+i.stamp || 0)); };
  M.invPaidGross = function (i) { return u.sum(i.payments || [], function (x) { return (+x.net || 0) + (+x.withheld || 0); }); };
  M.invPaidNet = function (i) { return u.sum(i.payments || [], function (x) { return +x.net || 0; }); };
  M.invWithheld = function (i) { return u.sum(i.payments || [], function (x) { return +x.withheld || 0; }); };
  M.invBalance = function (i) { return Math.max(0, M.invTotal(i) - M.invPaidGross(i)); };
  /** Issued turnover in TND; credit notes stay negative and pass-through extras are excluded. */
  M.invoiceTurnover = function (i) {
    if (!i || !i.no || (i.kind === "extra" && i.passThrough)) return 0;
    return M.toTND(+i.amount || 0, i.currency || "TND");
  };
  /** draft | issued | partial | paid | overdue | credited | credit */
  M.invStatus = function (i) {
    if (i.kind === "credit") return "credit";
    if (i.credited) return "credited";
    if (!i.no) return "draft";
    var paid = M.invPaidGross(i), tot = M.invTotal(i);
    if (paid >= tot - 0.001) return "paid";
    if (i.due && i.due < u.today()) return "overdue";
    if (paid > 0) return "partial";
    return "issued";
  };
  M.invIsPaid = function (i) { return M.invStatus(i) === "paid"; };
  M.nextInvoiceNo = function (year) {
    year = year || u.year(u.today());
    var max = 0;
    S().all("invoices").forEach(function (i) { var m = /^GK-(\d{4})-(\d+)$/.exec(i.no || ""); if (m && m[1] === year) max = Math.max(max, +m[2]); });
    return "GK-" + year + "-" + String(max + 1).padStart(3, "0");
  };
  /** Yearly turnover against the auto-entrepreneur cap: issued invoices minus credit notes, by issue date. */
  M.capUsed = function (year) {
    year = year || u.year(u.today());
    return u.sum(S().all("invoices").filter(function (i) { return u.year(i.issued) === year; }), M.invoiceTurnover);
  };

  // ---------- gates ----------
  /** The agreed price of a project (one-off: the whole offer; monthly: one month), in its currency. */
  M.projectPrice = function (p) {
    if (p.price != null && p.price !== "") return +p.price;
    var invoices = M.invoicesOf(p).filter(function (i) {
      return i.kind === "deposit" || i.kind === "balance" || i.kind === "month";
    });
    if (invoices.length) {
      return ["deposit", "balance", "month"].reduce(function (total, kind) {
        var sameKind = invoices.filter(function (i) { return i.kind === kind; });
        var current = sameKind.filter(function (i) { return !i.credited; });
        return total + u.sum(current.length ? current : sameKind, function (i) { return +i.amount || 0; });
      }, 0);
    }
    return M.priceFor(p.pack, p.clientId, p.month).price;
  };
  M.upfrontPaid = function (p) {
    var up = M.pack(p.pack).upfront;
    if (up === "full") return M.fullyPaid(p);
    var kinds = up === "month" ? ["month"] : ["deposit"];
    return M.invoicesOf(p).some(function (i) { return kinds.indexOf(i.kind) > -1 && M.invIsPaid(i); });
  };
  /** One-off offers: deposit + balance paid for the full price (a credited invoice doesn't count). Monthly: the month is paid. */
  M.fullyPaid = function (p) {
    var inv = M.invoicesOf(p).filter(function (i) { return !i.credited && i.kind !== "credit"; });
    if (M.pack(p.pack).monthly) return inv.some(function (i) { return i.kind === "month" && M.invIsPaid(i); });
    var main = inv.filter(function (i) { return i.kind === "deposit" || i.kind === "balance"; });
    var paid = u.sum(main, function (i) { return M.invIsPaid(i) ? +i.amount || 0 : 0; });
    return main.length > 0 && paid >= M.projectPrice(p) - 0.001;
  };
  function invoicePaidOn(i) {
    var paid = 0;
    var payments = (i.payments || []).filter(function (x) { return x && x.date; }).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    for (var n = 0; n < payments.length; n++) {
      paid += (+payments[n].net || 0) + (+payments[n].withheld || 0);
      if (paid >= M.invTotal(i) - 0.001) return payments[n].date;
    }
    return "";
  }
  /** Date the project's required upfront payment became complete, or "" when it is still outstanding. */
  M.upfrontPaidOn = function (p) {
    if (!M.upfrontPaid(p)) return "";
    var up = M.pack(p.pack).upfront;
    var kinds = up === "month" ? ["month"] : up === "full" ? ["deposit", "balance"] : ["deposit"];
    var paid = M.invoicesOf(p).filter(function (i) {
      return kinds.indexOf(i.kind) > -1 && !i.credited && i.kind !== "credit" && M.invIsPaid(i);
    }).map(invoicePaidOn).filter(Boolean).sort();
    return paid.length ? paid[paid.length - 1] : "";
  };
  /**
   * Reconcile a linked signed lead with the project's required upfront payment.
   * Legacy projects/leads without a source relationship are intentionally left alone.
   */
  M.syncLeadPayment = function (projectId) {
    var p = M.project(projectId);
    if (!p) return { ok: true, linked: false };
    var client = M.client(p.clientId);
    var leadId = p.sourceLeadId || (client && client.sourceLeadId) || "";
    var lead = leadId ? S().get("leads", leadId) : S().all("leads").find(function (x) { return x.clientId === p.clientId; });
    if (!lead || !client || (lead.clientId && lead.clientId !== client.id)) return { ok: true, linked: false };
    var stage = M.leadStage(lead);
    if (stage !== "signed" && stage !== "won") return { ok: true, linked: true };

    var paidOn = M.upfrontPaidOn(p);
    var nextStage = paidOn ? "won" : stage === "won" ? "signed" : stage;
    if (nextStage !== stage) {
      var history = (lead.history || []).slice();
      history.push({ stage: nextStage, at: u.today() });
      if (!S().patch("leads", lead.id, { stage: nextStage, history: history }, { log: GK.t("pl_log_moved", { s: GK.t("ls_" + nextStage) }) })) {
        return { ok: false, linked: true };
      }
    }

    if (paidOn && (!client.wonOn || client.wonOnLeadId === lead.id)) {
      if (!S().patch("clients", client.id, { wonOn: paidOn, wonOnLeadId: lead.id })) return { ok: false, linked: true };
    } else if (!paidOn && client.wonOnLeadId === lead.id) {
      if (!S().patch("clients", client.id, { wonOn: "", wonOnLeadId: "" })) return { ok: false, linked: true };
    }
    return { ok: true, linked: true, stage: nextStage };
  };
  /** No shoot before the scripts are approved in writing and the deposit (or the month) is paid. */
  M.canShoot = function (p) { return !!p.planApproved && M.upfrontPaid(p); };
  /** Final files go out only once the balance (or the month) is paid. */
  M.canFiles = function (p) { return M.pack(p.pack).monthly ? M.upfrontPaid(p) : M.fullyPaid(p); };
  /** Reasons a project is blocked at its current stage. */
  M.gates = function (p) {
    var g = [], si = M.STAGES.indexOf(p.stage);
    if (si <= M.STAGES.indexOf("shoot") && !M.canShoot(p)) g.push(GK.t("gate_shoot"));
    if (si >= M.STAGES.indexOf("client_review") && si <= M.STAGES.indexOf("delivered") && !M.canFiles(p)) g.push(GK.t("gate_files"));
    return g;
  };
  /** Can the project move to stage s? Returns "" if yes, else the reason. Moving backwards is always allowed. */
  M.stageBlock = function (p, s) {
    var from = M.STAGES.indexOf(p.stage), to = M.STAGES.indexOf(s);
    if (to <= from) return "";
    if (to >= M.STAGES.indexOf("shoot") && !M.canShoot(p)) return GK.t("gate_shoot");
    if (to >= M.STAGES.indexOf("delivered") && !M.canFiles(p)) return GK.t("gate_files");
    if (to >= M.STAGES.indexOf("paid") && !M.fullyPaid(p)) return GK.t("gate_paid");
    return "";
  };
  /** Files in client review longer than the silence rule count as approved. */
  M.reviewSilent = function (p) { return p.stage === "client_review" && !!p.reviewSince && u.daysBetween(p.reviewSince, u.today()) >= M.REVIEW_SILENCE_DAYS; };

  // ---------- money per project (TND) ----------
  function invTND(i, n) { return M.toTND(n, i.currency || "TND"); }
  /** Revenue received for a project: what the client paid, withheld tax included (it counts as paid), stamps excluded. */
  M.received = function (p) { return u.sum(M.invoicesOf(p).filter(function (i) { return i.kind !== "credit" && !i.credited && !(i.kind === "extra" && i.passThrough); }), function (i) { return invTND(i, Math.min(M.invPaidGross(i), +i.amount || 0)); }); };
  /** Cash that actually landed (net of withholding, stamps included). */
  M.cashIn = function (p) { return u.sum(M.invoicesOf(p), function (i) { return invTND(i, M.invPaidNet(i)); }); };
  M.withheld = function (p) { return u.sum(M.invoicesOf(p), function (i) { return invTND(i, M.invWithheld(i)); }); };
  /** Legacy cost lines remain intact and are treated as estimates; only an explicit estimateId reconciles actual spend. */
  M.estimatedCostOf = function (p) { return u.sum(p.costs || [], function (c) { return c.amount; }); };
  function monthDate(ym, day) {
    var parts = ym.split("-"), year = +parts[0], month = +parts[1];
    var last = new Date(year, month, 0).getDate();
    return ym + "-" + String(Math.min(+day || 1, last)).padStart(2, "0");
  }
  /** Project-tagged ledger expenses, expanded by occurrence month through the current date. */
  M.projectExpenses = function (p, onlyMonth) {
    var today = u.today(), endMonth = onlyMonth || u.month(today), out = [];
    S().all("expenses").forEach(function (e) {
      if (e.projectId !== p.id || !e.date) return;
      var startMonth = u.month(e.date);
      if (e.recurring !== "monthly") {
        if (onlyMonth ? startMonth === onlyMonth : e.date <= today) out.push(e);
        return;
      }
      var until = e.until && e.until < endMonth ? e.until : endMonth;
      if (onlyMonth) {
        if (startMonth <= onlyMonth && onlyMonth <= until) {
          out.push(Object.assign({}, e, { date: monthDate(onlyMonth, e.date.slice(8, 10)), sourceExpenseId: e.id }));
        }
        return;
      }
      for (var ym = startMonth; ym <= until; ym = M.monthKey(ym, 2)) {
        var date = monthDate(ym, e.date.slice(8, 10));
        if (date <= today) out.push(Object.assign({}, e, { date: date, sourceExpenseId: e.id }));
      }
    });
    return out;
  };
  M.actualCostOf = function (p) { return u.sum(M.projectExpenses(p), function (e) { return e.amount; }); };
  M.unmatchedEstimateOf = function (p, actuals) {
    var estimates = p.costs || [], replaced = {};
    actuals = actuals || M.projectExpenses(p);
    actuals.forEach(function (e) {
      if (e.estimateId && estimates.some(function (c) { return c.id === e.estimateId; })) replaced[e.estimateId] = true;
    });
    return u.sum(estimates.filter(function (c) { return !replaced[c.id]; }), function (c) { return c.amount; });
  };
  M.costOf = function (p) {
    var actuals = M.projectExpenses(p);
    return M.unmatchedEstimateOf(p, actuals) +
      u.sum(actuals, function (e) { return e.amount; });
  };
  /** Owner pay estimate inside a project's cost lines (kind "heni"). */
  M.ownerPayOf = function (p) { return u.sum((p.costs || []).filter(function (c) { return c.kind === "heni"; }), function (c) { return c.amount; }); };
  /** Profit basis: gross cash receipts less unmatched estimates and all recorded project expenses. */
  M.profit = function (p) { return M.received(p) - M.costOf(p); };
  /** Which partner-share rule a project falls under: "first" (one of the first N won clients), "finder" (a client the payee found and closed alone, within the period) or "". */
  M.shareBasis = function (p) {
    var r = M.rules(), c = M.client(p.clientId); if (!c) return "";
    var rank = M.clientRank(c.id);
    var when = p.created || p.shootDate || u.today();
    if (rank && rank <= r.shareClients && (!r.retainerFrom || when < r.retainerFrom)) return "first";
    if (c.sourcedAlone && (!r.sharePayee || c.sourcedBy === r.sharePayee) && c.wonOn && c.handledBy !== "other") {
      if (!r.finderMonths || when <= u.addDays(c.wonOn, Math.round(r.finderMonths * 30.44))) return "finder";
    }
    return "";
  };
  /** Partner share on a project: {basis, pct, amount, payable, paid, paidOn, owed}. Payable once the client paid in full and the work is delivered. */
  M.commission = function (p) {
    var r = M.rules(), basis = M.shareBasis(p), pct = basis === "first" ? r.commission : basis === "finder" ? r.finderPct : 0;
    var pr = M.profit(p);
    var amount = pct && pr > 0 ? Math.round(pr * pct / 100) : 0;
    var paid = p.payout && p.payout.paidOn ? (+p.payout.amount || 0) : 0;
    var ready = M.fullyPaid(p) && M.STAGES.indexOf(p.stage) >= M.STAGES.indexOf("delivered");
    return { basis: basis, pct: pct, amount: amount, payable: amount > 0 && ready, paid: paid, paidOn: p.payout ? p.payout.paidOn : "", owed: Math.max(0, (ready ? amount : 0) - paid) };
  };
  M.share = M.commission;
  M.levels = function () { var c = M.cfg(); return (c.version >= 2 && c.levels) || M.LEVELS_DEFAULT; };
  /** Recurring monthly clients right now (active monthly contracts). */
  M.recurringClients = function () { var ids = {}; S().all("contracts").forEach(function (k) { if (k.status === "active") ids[k.clientId] = 1; }); return Object.keys(ids).length; };
  /** The fixed-pay level the Client Lead has reached by client count: {level, pay, next} (level 0 = not yet). */
  M.levelNow = function () { var n = M.recurringClients(), L = M.levels(), lv = 0; L.forEach(function (x, i) { if (n >= x.clients) lv = i + 1; }); return { level: lv, pay: lv ? L[lv - 1].pay : 0, next: L[lv] || null, clients: n }; };
  /** Estimated direct cost lines for an offer (costs.md), owner pay included so the partner share is worked out after it. */
  M.estimateCosts = function (packKey) {
    var pk = M.pack(packKey), r = M.rates(), t = GK.t, days = pk.shootDays || 0, reels = pk.reels || 0;
    var direct = r.ownerPer === "day" ? days * r.ownerDirect : (days ? r.ownerDirect : 0);
    var edit = !reels ? 0 : reels <= 6 ? r.editSmall : reels < 15 ? r.editMid : r.editLarge;
    var lines = [
      ["heni", t(r.ownerPer === "day" ? "est_owner_days" : "est_owner_project", { n: days, r: r.ownerDirect }), direct],
      ["heni", t("est_owner_edit", { n: reels }), edit],
      ["gear", t("est_camera", { n: days, r: r.camera }), days * r.camera],
      ["other", t("est_transport", { n: days, r: r.transport }), days * r.transport],
      ["other", t("est_food", { n: days, r: r.food }), days * r.food]
    ];
    if (pk.ads) lines.push(["freelance", t("est_assistant", { n: days, r: r.assistant }), days * r.assistant]);
    return lines.filter(function (l) { return l[2] > 0; }).map(function (l) { return { id: u.uid("c"), kind: l[0], label: l[1], amount: Math.round(l[2]) }; });
  };

  // ---------- contracts (monthly offers) ----------
  M.contractOf = function (p) { return p.contractId ? S().get("contracts", p.contractId) : null; };
  M.contractMonths = function (c) { return S().all("projects").filter(function (p) { return p.contractId === c.id; }).sort(u.by("month")); };
  /** Snapshot price for MRR and future months; legacy contracts infer it from their newest saved project/invoice before catalog fallback. */
  M.contractPrice = function (c) {
    if (c.monthlyPrice != null && c.monthlyPrice !== "") return +c.monthlyPrice || 0;
    var projects = M.contractMonths(c).slice().sort(function (a, b) { return (+b.month || 0) - (+a.month || 0); });
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      if (p.price != null && p.price !== "") return +p.price || 0;
      var invoices = M.invoicesOf(p).filter(function (inv) { return inv.kind === "month"; });
      var current = invoices.filter(function (inv) { return !inv.credited; });
      if (invoices.length) return u.sum(current.length ? current : invoices, function (inv) { return +inv.amount || 0; });
    }
    return M.pack(c.pack).price;
  };
  /** Monthly contracts whose next month should be created (current month passed its first week or the month is not there yet). */
  M.monthsDue = function () {
    var ym = u.month(u.today());
    return S().all("contracts").filter(function (c) {
      if (c.status !== "active") return false;
      var ms = M.contractMonths(c);
      var last = ms[ms.length - 1];
      if (!last) return true;
      var lastYm = M.monthKey(c.start, last.month);
      return lastYm < ym;
    });
  };
  /** "2026-10" + month 3 -> "2026-12" */
  M.monthKey = function (startYm, n) { var y = +startYm.slice(0, 4), m = +startYm.slice(5, 7) - 1 + (n - 1); y += Math.floor(m / 12); m = m % 12; return y + "-" + String(m + 1).padStart(2, "0"); };

  // ---------- weekly sales numbers (crm-pipeline.md) ----------
  /** Leads that entered a stage during [from, to). */
  M.movedIn = function (stage, from, to, owner) {
    stage = M.leadStage(stage);
    return S().all("leads").filter(function (l) { return (!owner || l.owner === owner) && (l.history || []).some(function (h) { return M.leadStage(h.stage) === stage && h.at >= from && h.at < to; }); });
  };
  /** The week's numbers: first touches, replies, meetings booked, proposals (count, value), won (count, value), plus touches from the daily log. */
  M.funnel = function (weekStart, owner) {
    var end = u.addDays(weekStart, 7);
    var logs = S().all("outreach").filter(function (o) { return o.date >= weekStart && o.date < end && (!owner || o.owner === owner); });
    var props = M.movedIn("proposal_sent", weekStart, end, owner), won = M.movedIn("won", weekStart, end, owner);
    var touches = Math.max(u.sum(logs, function (o) { return o.dms; }), M.movedIn("contacted", weekStart, end, owner).length);
    var replies = Math.max(u.sum(logs, function (o) { return o.replies; }), M.movedIn("conversation", weekStart, end, owner).length);
    return {
      touches: touches, dms: touches, replies: replies,
      meetings: Math.max(u.sum(logs, function (o) { return o.calls; }), M.movedIn("meeting_booked", weekStart, end, owner).length),
      calls: Math.max(u.sum(logs, function (o) { return o.calls; }), M.movedIn("meeting_booked", weekStart, end, owner).length),
      proposals: props.length, proposalValue: u.sum(props, M.leadValue),
      won: won.length, wonValue: u.sum(won, M.leadValue)
    };
  };

  // ---------- roles ----------
  M.ROLE_NAV = {
    founder: ["guide", "today", "tasks", "calendar", "activity", "dashboard", "pipeline", "clients", "projects", "production", "studio", "boards", "deliveries", "reports", "finance", "docs", "team", "settings"],
    // Client Lead: selling and client follow-up; no money screens
    sales: ["guide", "today", "tasks", "calendar", "pipeline", "clients", "projects", "studio", "boards", "deliveries", "reports", "docs", "team"],
    // Editors: only what they edit
    editor: ["guide", "today", "tasks", "calendar", "projects", "studio", "deliveries", "docs"],
    // Production (manager or assistant): shoots, scripts, boards
    assistant: ["guide", "today", "tasks", "calendar", "projects", "production", "studio", "boards", "docs", "team"]
  };
  /** Permission check for the current viewer. */
  M.can = function (what) {
    var me = GK.me(), role = me ? me.role : (GK.store.backend === "shared" ? "" : "founder");
    if (GK.store.readOnly) return what === "view";
    var P = {
      founder: ["*"],
      // Client Lead: opens and moves deals; drafts proposals (sending one needs the founder's approval); no money, costs or pay
      sales: ["leads", "leads.import", "clients", "projects.create", "projects.edit", "quotes.draft", "tasks", "msgs", "portal", "outreach", "reports.edit", "ideas", "boards", "docs", "docs.edit", "shoot"],
      editor: ["tasks", "msgs", "files.status", "files.edit", "ideas", "boards", "docs"],
      assistant: ["tasks", "msgs", "ideas", "boards", "docs", "shoot"]
    }[role] || [];
    return P.indexOf("*") > -1 || P.indexOf(what) > -1 || what === "view";
  };
  M.isFounder = function () { var me = GK.me(); return me ? me.role === "founder" : GK.store.backend !== "shared"; };

  // ---------- migration from the first version (old packs, stages and channels) ----------
  M.OLD = {
    pack: { GRIP: "test", SEASON: "campaign", SKIN10: "premier", SKIN20: "premium", monthly8: "premier", monthly12: "premium" },
    packName: [[/SKIN 20/g, "Premium"], [/SKIN 10/g, "Premier"], [/Monthly 12/g, "Premium"], [/Monthly 8/g, "Premier"], [/\bSKIN\b/g, "Monthly"], [/\bGRIP\b/g, "Test Campaign"], [/\bSEASON\b/g, "Campaign"]],
    stage: { onboard: "onboarding", plan: "scripting", edit: "editing", testing: "delivered", report: "paid", done: "retention" },
    lead: { dm: "contacted", replied: "conversation", call: "meeting_booked", proposal: "proposal_sent" },
    source: { teardown_dm: "outbound_dm", media_buyer: "referral_personal", referral: "referral_client", warm: "referral_personal", inbound: "ig_organic" },
    lost: { no_budget: "no_budget_now", no_product: "bad_fit", not_now: "timing", went_elsewhere: "chose_competitor", no_reply: "no_response" }
  };
  function renamePacks(text) { var t = String(text || ""); M.OLD.packName.forEach(function (r) { t = t.replace(r[0], r[1]); }); return t; }
  M.renamePacks = renamePacks;
  /** Bring one record from the first version to this one. Returns a new object when something changed, else null. */
  M.migrateRecord = function (coll, rec) {
    if (!rec) return null;
    var o = u.clone(rec), ch = false, O = M.OLD;
    function set(k, v) { if (o[k] !== v) { o[k] = v; ch = true; } }
    if (o.pack && O.pack[o.pack]) set("pack", O.pack[o.pack]);
    if (coll === "projects") {
      if (O.stage[o.stage]) set("stage", o.stage === "plan" && o.planApproved ? "pre_production" : O.stage[o.stage]);
      if (o.mohamed != null) { delete o.mohamed; ch = true; }
      if (/SKIN|GRIP|SEASON/.test(o.name || "")) set("name", renamePacks(o.name));
    }
    if (coll === "leads") {
      if (O.lead[o.stage]) set("stage", O.lead[o.stage]);
      if (o.history && o.history.some(function (h) { return O.lead[h.stage]; })) { o.history = o.history.map(function (h) { return { stage: O.lead[h.stage] || h.stage, at: h.at }; }); ch = true; }
      if (o.channel && !o.source) set("source", O.source[o.channel] || (M.SOURCES.indexOf(o.channel) > -1 ? o.channel : "other"));
      if (o.lostReason && O.lost[o.lostReason]) set("lostReason", O.lost[o.lostReason]);
      if (!o.market) set("market", "tunisia");
      if (!o.sourcedBy && o.owner) set("sourcedBy", o.owner);
    }
    if (coll === "invoices" || coll === "quotes") {
      if (/SKIN|GRIP|SEASON/.test(o.label || o.title || "")) { if (o.label) o.label = renamePacks(o.label); if (o.title) o.title = renamePacks(o.title); ch = true; }
      if (o.lines && o.lines.some(function (l) { return /SKIN|GRIP|SEASON/.test(l.label || ""); })) { o.lines = o.lines.map(function (l) { return Object.assign({}, l, { label: renamePacks(l.label) }); }); ch = true; }
    }
    if (coll === "team" && o.role === "sales" && o.title == null) { o.title = ""; ch = true; }
    return ch ? o : null;
  };
  /** Migrate whole collections in place (sample data, or a live workspace loaded from the first version). Returns how many records changed. */
  M.migrateAll = function (colls) {
    var n = 0;
    Object.keys(colls || {}).forEach(function (c) { (colls[c] || []).forEach(function (r, i) { var x = M.migrateRecord(c, r); if (x) { colls[c][i] = x; n++; } }); });
    // a client counts as won from its first paid deposit or first paid month
    (colls.clients || []).forEach(function (c, i) {
      if (c.wonOn) return;
      var paid = (colls.invoices || []).filter(function (v) { return v.clientId === c.id && v.kind !== "credit" && (v.payments || []).length; })
        .map(function (v) { return v.payments.map(function (p) { return p.date; }).sort()[0]; }).sort();
      if (paid.length) { colls.clients[i] = Object.assign({}, c, { wonOn: paid[0] }); n++; }
    });
    return n;
  };

  GK.m = M;
})(window.GK);
