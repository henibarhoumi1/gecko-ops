/* GECKO Ops · business rules. Pure functions over store data.
   Rules come from gecko/01-business-model-v2.md. Modules read through GK.m, never re-implement these. */
(function (GK) {
  "use strict";
  var u = GK.u;
  var M = {};

  M.STAGES = ["onboard", "plan", "shoot", "edit", "delivered", "testing", "report", "done"];
  M.LEAD_STAGES = ["dm", "replied", "call", "proposal", "won", "lost"];
  M.FILE_STATUS = ["todo", "edit", "review", "approved"]; // "revise" is set by a client's change request
  M.FORMATS = ["9x16", "4x5", "1x1"];
  M.ROLES = ["founder", "sales", "editor", "assistant"];
  M.LOST_REASONS = ["no_budget", "no_product", "not_now", "went_elsewhere", "no_reply", "other"];
  M.CHANNELS = ["teardown_dm", "media_buyer", "referral", "warm", "inbound"];
  M.ONBOARDING_STEPS = 7; // ob1..ob7 words live in the projects module

  M.PACKS_DEFAULT = {
    GRIP:   { name: "GRIP",    price: 1500, monthly: false, shoot: "half", angles: 2, reels: 4,  variations: 8,  carousels: 0, cost: 711 },
    SEASON: { name: "SEASON",  price: 4800, monthly: false, shoot: "long", angles: 4, reels: 16, variations: 32, carousels: 4, cost: 1794 },
    SKIN10: { name: "SKIN 10", price: 3500, monthly: true,  shoot: "day",  angles: 3, reels: 10, variations: 20, carousels: 3, cost: 1540 },
    SKIN20: { name: "SKIN 20", price: 5000, monthly: true,  shoot: "long", angles: 4, reels: 20, variations: 40, carousels: 6, cost: 2100 }
  };
  M.RATES_DEFAULT = { heniDay: 350, reel: 28, gear: 400, assistant: 120, transport: 60, recut: 8, carousel: 40, report: 50 };
  M.RULES_DEFAULT = {
    cap: 75000,          // auto-entrepreneur yearly cap (DT invoiced). Accountant to confirm.
    reserve: 10,         // % of revenue
    commission: 30,      // Mohamed, % of project profit
    salary: 1500,        // Heni, DT / month
    stamp: 1,            // droit de timbre per invoice, DT. Accountant to confirm.
    withholding: 3,      // default % a company client withholds on service fees. Accountant to confirm.
    dueDays: 7,
    extrasDirect: true,  // studio/talent invoice the client directly by default (protects the cap)
    openingCash: 0       // cash in the bank when you start tracking (for the 13-week forecast), DT
  };
  M.COMPANY_DEFAULT = {
    name: "GECKO", legal: "", mf: "", address: "",
    phone: "+216 26 191 555", email: "reachoutgecko@gmail.com", instagram: "@geckoagency_",
    appUrl: "https://claude.ai/artifact/FaYCvv65YDNYfUCk66r8uo",
    invoiceNote: ""
  };
  M.defaultConfig = function () {
    return { live: true, version: 1, company: u.clone(M.COMPANY_DEFAULT), packs: u.clone(M.PACKS_DEFAULT), rates: u.clone(M.RATES_DEFAULT), rules: u.clone(M.RULES_DEFAULT) };
  };

  // ---------- lookups ----------
  function S() { return GK.store; }
  M.cfg = function () { return S().config() || M.defaultConfig(); };
  M.pack = function (k) { var p = (M.cfg().packs || {})[k]; return p || M.PACKS_DEFAULT[k] || { name: k || "—", price: 0, monthly: false, reels: 0, variations: 0, carousels: 0, angles: 0, cost: 0 }; };
  M.packKeys = function () { return Object.keys(M.cfg().packs || M.PACKS_DEFAULT); };
  M.rules = function () { var r = M.cfg().rules || {}; var d = M.RULES_DEFAULT; var o = {}; for (var k in d) o[k] = r[k] != null ? r[k] : d[k]; return o; };
  M.rates = function () { var r = M.cfg().rates || {}; var d = M.RATES_DEFAULT; var o = {}; for (var k in d) o[k] = r[k] != null ? r[k] : d[k]; return o; };
  M.company = function () { var c = M.cfg().company || {}; var d = M.COMPANY_DEFAULT; var o = {}; for (var k in d) o[k] = c[k] != null && c[k] !== "" ? c[k] : d[k]; o.appUrl = c.appUrl != null ? c.appUrl : d.appUrl; o.mf = c.mf || ""; o.legal = c.legal || ""; o.invoiceNote = c.invoiceNote || ""; o.address = c.address || (u.fr() ? "Tunis, Tunisie" : "Tunis, Tunisia"); return o; };
  M.client = function (id) { return S().get("clients", id); };
  M.project = function (id) { return S().get("projects", id); };
  M.member = function (id) { return S().get("team", id) || { id: id, name: id === "client" ? "Client" : (id || "—"), role: "" }; };
  M.brand = function (clientId) { var c = M.client(clientId); return c ? c.brand : "—"; };
  M.projectLabel = function (p) { return p ? M.brand(p.clientId) + " · " + p.name : "—"; };
  M.invoicesOf = function (p) { return S().all("invoices").filter(function (i) { return i.projectId === p.id; }); };
  M.tasksOf = function (p) { return S().all("tasks").filter(function (x) { return x.projectId === p.id; }); };

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
    // pass-through extras (débours re-invoiced at cost) stay out of turnover
    return u.sum(S().all("invoices").filter(function (i) { return i.no && u.year(i.issued) === year && !(i.kind === "extra" && i.passThrough); }), function (i) { return +i.amount || 0; });
  };

  // ---------- gates ----------
  M.upfrontPaid = function (p) {
    var kinds = M.pack(p.pack).monthly ? ["month"] : ["deposit"];
    return M.invoicesOf(p).some(function (i) { return kinds.indexOf(i.kind) > -1 && M.invIsPaid(i); });
  };
  /** One-off packs: deposit + balance paid for the full pack price (a credited invoice doesn't count). SKIN: the month is paid. */
  M.fullyPaid = function (p) {
    var inv = M.invoicesOf(p).filter(function (i) { return !i.credited && i.kind !== "credit"; });
    if (M.pack(p.pack).monthly) return inv.some(function (i) { return i.kind === "month" && M.invIsPaid(i); });
    var main = inv.filter(function (i) { return i.kind === "deposit" || i.kind === "balance"; });
    var paid = u.sum(main, function (i) { return M.invIsPaid(i) ? +i.amount || 0 : 0; });
    return main.length > 0 && paid >= M.pack(p.pack).price - 0.001;
  };
  M.canShoot = function (p) { return !!p.planApproved && M.upfrontPaid(p); };
  M.canFiles = function (p) { return M.pack(p.pack).monthly ? M.upfrontPaid(p) : M.fullyPaid(p); };
  /** Reasons a project is blocked at its current stage. */
  M.gates = function (p) {
    var g = [], si = M.STAGES.indexOf(p.stage);
    if (si <= M.STAGES.indexOf("shoot") && !M.canShoot(p)) g.push(GK.t("gate_shoot"));
    if (si >= M.STAGES.indexOf("edit") && si <= M.STAGES.indexOf("delivered") && !M.canFiles(p)) g.push(GK.t("gate_files"));
    return g;
  };
  /** Can the project move to stage s? Returns "" if yes, else the reason. Moving backwards is always allowed. */
  M.stageBlock = function (p, s) {
    var from = M.STAGES.indexOf(p.stage), to = M.STAGES.indexOf(s);
    if (to <= from) return "";
    if (to >= M.STAGES.indexOf("shoot") && !M.canShoot(p)) return GK.t("gate_shoot");
    if (to >= M.STAGES.indexOf("delivered") && !M.canFiles(p)) return GK.t("gate_files");
    return "";
  };

  // ---------- money per project ----------
  /** Revenue received for a project: what the client paid, withheld tax included (it counts as paid), stamps excluded. */
  M.received = function (p) { return u.sum(M.invoicesOf(p).filter(function (i) { return i.kind !== "credit" && !(i.kind === "extra" && i.passThrough); }), function (i) { return Math.min(M.invPaidGross(i), +i.amount || 0); }); };
  /** Cash that actually landed (net of withholding, stamps included). */
  M.cashIn = function (p) { return u.sum(M.invoicesOf(p), M.invPaidNet); };
  M.withheld = function (p) { return u.sum(M.invoicesOf(p), M.invWithheld); };
  M.costOf = function (p) { return u.sum(p.costs || [], function (c) { return c.amount; }); };
  M.profit = function (p) { return M.received(p) - M.costOf(p); };
  /** Mohamed's share: commission % of profit when he worked the project; 0 on a loss.
      Payable once the client paid in full AND the work is delivered (before that, costs are only estimates). */
  M.commission = function (p) {
    var pr = M.profit(p), r = M.rules();
    var amount = p.mohamed && pr > 0 ? Math.round(pr * r.commission / 100) : 0;
    var paid = p.payout && p.payout.paidOn ? (+p.payout.amount || 0) : 0;
    var ready = M.fullyPaid(p) && M.STAGES.indexOf(p.stage) >= M.STAGES.indexOf("delivered");
    return { amount: amount, payable: amount > 0 && ready, paid: paid, paidOn: p.payout ? p.payout.paidOn : "", owed: Math.max(0, (ready ? amount : 0) - paid) };
  };
  /** Estimated direct cost lines for a pack, from the rates (section 8 of the business model). */
  M.estimateCosts = function (packKey) {
    var pk = M.pack(packKey), r = M.rates(), half = pk.shoot === "half";
    var t = GK.t;
    var lines = [
      ["heni", t(half ? "est_shoot_half" : "est_shoot_day"), half ? r.heniDay / 2 : r.heniDay],
      ["gear", t("est_gear"), half ? Math.round(r.gear * 0.625) : r.gear],
      ["freelance", t("est_assistant"), half ? Math.round(r.assistant * 0.58) : r.assistant],
      ["other", t("est_transport"), half ? Math.round(r.transport * 0.67) : r.transport],
      ["heni", t("est_edits", { n: pk.reels, r: r.reel }), pk.reels * r.reel],
      ["freelance", t("est_recuts", { n: pk.variations, r: r.recut }), pk.variations * r.recut],
      ["freelance", t("est_carousels", { n: pk.carousels, r: r.carousel }), pk.carousels * r.carousel]
    ];
    if (pk.monthly) lines.push(["other", t("est_report"), r.report]);
    return lines.filter(function (l) { return l[2] > 0; }).map(function (l) { return { id: u.uid("c"), kind: l[0], label: l[1], amount: Math.round(l[2]) }; });
  };

  // ---------- contracts (SKIN) ----------
  M.contractOf = function (p) { return p.contractId ? S().get("contracts", p.contractId) : null; };
  M.contractMonths = function (c) { return S().all("projects").filter(function (p) { return p.contractId === c.id; }).sort(u.by("month")); };
  /** SKIN contracts whose next month should be created (current month passed its first week or the month is not there yet). */
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

  // ---------- outreach funnel ----------
  /** Weekly funnel from the outreach log and lead stages. */
  M.funnel = function (weekStart, owner) {
    var end = u.addDays(weekStart, 7);
    var logs = S().all("outreach").filter(function (o) { return o.date >= weekStart && o.date < end && (!owner || o.owner === owner); });
    var leads = S().all("leads").filter(function (l) { return (!owner || l.owner === owner); });
    function movedIn(stage) { return leads.filter(function (l) { return (l.history || []).some(function (h) { return h.stage === stage && h.at >= weekStart && h.at < end; }); }).length; }
    return {
      dms: u.sum(logs, function (o) { return o.dms; }),
      replies: u.sum(logs, function (o) { return o.replies; }),
      calls: Math.max(u.sum(logs, function (o) { return o.calls; }), movedIn("call")),
      proposals: movedIn("proposal"),
      won: movedIn("won")
    };
  };
  M.qualified = function (l) { return (l.q || []).filter(Boolean).length === 4; };

  // ---------- roles ----------
  M.ROLE_NAV = {
    founder: ["today", "tasks", "calendar", "inbox", "activity", "dashboard", "pipeline", "clients", "projects", "production", "studio", "boards", "deliveries", "reports", "finance", "portal", "team", "settings"],
    sales: ["today", "tasks", "calendar", "inbox", "pipeline", "clients", "projects", "production", "studio", "boards", "deliveries", "reports", "portal", "team", "settings"],
    editor: ["today", "tasks", "calendar", "inbox", "projects", "production", "studio", "boards", "deliveries", "team"],
    assistant: ["today", "tasks", "calendar", "inbox", "projects", "production", "studio", "boards", "team"]
  };
  /** Permission check for the current viewer. */
  M.can = function (what) {
    var me = GK.me(), role = me ? me.role : (GK.store.backend === "shared" ? "" : "founder");
    if (GK.store.readOnly) return what === "view";
    var P = {
      founder: ["*"],
      sales: ["leads", "clients", "projects.create", "projects.edit", "tasks", "msgs", "portal", "outreach", "reports.edit", "ideas", "boards"],
      editor: ["tasks", "msgs", "files.status", "files.edit", "ideas", "boards"],
      assistant: ["tasks", "msgs", "ideas", "boards"]
    }[role] || [];
    return P.indexOf("*") > -1 || P.indexOf(what) > -1 || what === "view";
  };
  M.isFounder = function () { var me = GK.me(); return me ? me.role === "founder" : GK.store.backend !== "shared"; };

  GK.m = M;
})(window.GK);
