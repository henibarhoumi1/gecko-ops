/* GECKO Ops · metrics. Read-only numbers computed from the store, shared by the dashboard, finance and reports.
   Everything here is an ESTIMATE built from the records: say so wherever it is shown.
   Money out = actual expenses ledger (one-off + recurring) + Owner salary + commissions paid.
   Project cost-line estimates are used for planning and project profitability until explicitly reconciled to actual expenses. */
(function (GK) {
  "use strict";
  var u = GK.u, m = GK.m, S = GK.store;
  var X = {};

  // ---------- months ----------
  /** ["2026-05", ... "2026-10"] ending at endYm (default current month) */
  X.months = function (n, endYm) {
    var end = endYm || u.month(u.today()), y = +end.slice(0, 4), mo = +end.slice(5, 7) - 1, out = [];
    for (var i = n - 1; i >= 0; i--) { var t = mo - i, yy = y + Math.floor(t / 12), mm = ((t % 12) + 12) % 12; out.push(yy + "-" + String(mm + 1).padStart(2, "0")); }
    return out;
  };
  X.pipelineValue = function () { return X.pipelineAt(u.today()); };
  X.wonOpportunityValue = function () {
    return u.sum(S.all("leads").filter(function (l) { return l.stage === "won"; }), m.leadValue);
  };
  X.confirmedRevenue = function (year) {
    year = year || u.year(u.today());
    return u.sum(S.all("invoices").filter(function (i) { return u.year(i.issued) === year; }), m.invoiceTurnover);
  };
  X.monthLabel = function (ym) { return u.fmtDate(ym + "-15", { month: "short" }); };
  function recurringDate(ym, day) {
    var parts = ym.split("-"), last = new Date(+parts[0], +parts[1], 0).getDate();
    return ym + "-" + String(Math.min(+day || 1, last)).padStart(2, "0");
  }
  function isProjectExpense(e) { return !!(e.projectId && m.project(e.projectId)); }
  function firstMonth() {
    var ds = [];
    S.all("invoices").forEach(function (i) { if (i.issued) ds.push(i.issued); });
    S.all("projects").forEach(function (p) { if (p.shootDate) ds.push(p.shootDate); });
    S.all("expenses").forEach(function (e) { if (e.date) ds.push(e.date); });
    return ds.length ? u.month(ds.sort()[0]) : u.month(u.today());
  }

  // ---------- expenses ledger ----------
  /** Expense lines landing in month ym, recurring ones expanded: [{id, label, category, amount, date, recurring, vendor, projectId}] */
  X.expensesIn = function (ym) {
    var out = [];
    S.all("expenses").forEach(function (e) {
      if (!e.date || !(+e.amount)) return;
      var start = u.month(e.date);
      if (e.recurring === "monthly") {
        if (ym >= start && (!e.until || ym <= e.until)) out.push(Object.assign({}, e, { date: recurringDate(ym, e.date.slice(8, 10)) }));
      } else if (start === ym) out.push(e);
    });
    return out;
  };
  X.EXPENSE_CATS = ["software", "gear", "rent", "transport", "marketing", "tax", "freelance", "other"];

  // ---------- money by month ----------
  /** One row per month: invoiced (turnover, credit notes negative, pass-through extras excluded), cashIn (net), withheld,
      expenses, salary, projectCosts, commissions (paid out), out (total), net (cashIn - out). */
  X.monthly = function (n, endYm) {
    var months = X.months(n, endYm), r = m.rules(), fm = firstMonth();
    var rows = months.map(function (ym) {
      var invoiced = 0, cashIn = 0, withheld = 0;
      S.all("invoices").forEach(function (i) {
        if (u.month(i.issued) === ym) invoiced += m.invoiceTurnover(i);
        (i.payments || []).forEach(function (p) {
          if (u.month(p.date) === ym) {
            cashIn += m.toTND(+p.net || 0, i.currency || "TND");
            withheld += m.toTND(+p.withheld || 0, i.currency || "TND");
          }
        });
      });
      var expenseLines = X.expensesIn(ym);
      var exp = u.sum(expenseLines.filter(function (e) { return !isProjectExpense(e); }), function (e) { return e.amount; });
      var salary = ym >= fm ? +r.salary || 0 : 0;
      var linkedExpenses = u.sum(expenseLines.filter(isProjectExpense), function (e) { return e.amount; });
      var pc = linkedExpenses;
      var com = u.sum(S.all("projects"), function (p) { return p.payout && p.payout.paidOn && u.month(p.payout.paidOn) === ym ? +p.payout.amount || 0 : 0; });
      var out = exp + salary + pc + com;
      return { ym: ym, label: X.monthLabel(ym), invoiced: invoiced, cashIn: cashIn, withheld: withheld, expenses: exp, salary: salary, projectCosts: pc, commissions: com, out: out, net: cashIn - out };
    });
    return rows;
  };

  // ---------- receivables ----------
  /** Issued, unpaid, not credited invoices with days overdue and a bucket: current | d1_7 | d8_30 | d31 */
  X.receivables = function () {
    var today = u.today();
    return S.all("invoices").filter(function (i) { return i.no && i.kind !== "credit" && !i.credited && m.invBalance(i) > 0.001; }).map(function (i) {
      var late = i.due ? u.daysBetween(i.due, today) : 0;
      return { inv: i, balance: m.invBalance(i), late: late, bucket: late <= 0 ? "current" : late <= 7 ? "d1_7" : late <= 30 ? "d8_30" : "d31" };
    }).sort(u.by("late", "desc"));
  };
  X.aging = function () {
    var out = { current: 0, d1_7: 0, d8_30: 0, d31: 0, total: 0 };
    X.receivables().forEach(function (r) { out[r.bucket] += r.balance; out.total += r.balance; });
    return out;
  };
  /** Average days from issue to the last payment, over paid invoices (days sales outstanding, simplified). */
  X.dso = function () {
    var ds = S.all("invoices").filter(function (i) { return i.no && m.invIsPaid(i) && (i.payments || []).length; }).map(function (i) {
      var last = i.payments.map(function (p) { return p.date; }).sort().pop(); return u.daysBetween(i.issued, last);
    });
    return ds.length ? Math.round(u.sum(ds) / ds.length) : null;
  };

  // ---------- projects, people, creative ----------
  X.stageCounts = function () {
    return m.STAGES.map(function (s) { return { stage: s, n: S.all("projects").filter(function (p) { return p.stage === s; }).length }; });
  };
  /** Per client: invoiced, received, costs, profit, margin %, outstanding, projects. Sorted by profit. */
  X.clientStats = function () {
    return S.all("clients").map(function (c) {
      var ps = S.all("projects").filter(function (p) { return p.clientId === c.id; });
      var received = u.sum(ps, m.received), costs = u.sum(ps, m.costOf), com = u.sum(ps, function (p) { return m.commission(p).amount; });
      var invoiced = u.sum(S.all("invoices").filter(function (i) { return i.clientId === c.id; }), m.invoiceTurnover);
      var owed = u.sum(S.all("invoices").filter(function (i) { return i.clientId === c.id && i.no && !i.credited && i.kind !== "credit"; }), m.invBalance);
      var profit = received - costs;
      return { client: c, projects: ps.length, invoiced: invoiced, received: received, costs: costs, commission: com, profit: profit, margin: received ? profit / received * 100 : 0, owed: owed };
    }).sort(u.by("profit", "desc"));
  };
  /** Every hook with results: [{project, code, text, angle, hook, ctr, cpp}] */
  X.hooks = function () {
    var out = [];
    S.all("projects").forEach(function (p) { m.files(p).forEach(function (f) { var r = f.kind === "hook" && f.item.results; if (r && (r.cpp || r.ctr || r.hook)) out.push({ project: p, code: f.code, text: f.item.text, angle: f.angle.name, hook: +r.hook || 0, ctr: +r.ctr || 0, cpp: +r.cpp || 0 }); }); });
    return out;
  };
  /** Angles ranked by average cost per purchase (lowest first). */
  X.angles = function () {
    var by = {};
    X.hooks().forEach(function (h) { if (!h.cpp) return; var k = h.project.clientId + "|" + h.angle; (by[k] = by[k] || { angle: h.angle, brand: m.brand(h.project.clientId), cpps: [] }).cpps.push(h.cpp); });
    return Object.keys(by).map(function (k) { var a = by[k]; return { angle: a.angle, brand: a.brand, cpp: u.sum(a.cpps) / a.cpps.length, n: a.cpps.length }; }).sort(u.by("cpp"));
  };
  X.workload = function () {
    var files = [];
    S.all("projects").forEach(function (p) { if (p.stage !== "done") m.files(p).forEach(function (f) { files.push(f.item.status || "todo"); }); });
    return S.all("team").map(function (mem) {
      return { member: mem, tasks: S.all("tasks").filter(function (t) { return t.who === mem.id && !t.done; }).length, late: S.all("tasks").filter(function (t) { return t.who === mem.id && !t.done && t.due && t.due < u.today(); }).length };
    }).concat([{ filesOpen: files.filter(function (s) { return s !== "approved"; }).length, filesTotal: files.length }]);
  };
  X.winRate = function () {
    var won = S.all("leads").filter(function (l) { return l.stage === "won"; }).length, lost = S.all("leads").filter(function (l) { return l.stage === "lost"; }).length;
    return won + lost ? won / (won + lost) * 100 : null;
  };
  /** Monthly recurring revenue from active monthly contracts. */
  X.mrr = function () {
    return u.sum(S.all("contracts").filter(function (c) { return c.status === "active"; }), function (c) {
      return m.toTND(m.contractPrice(c), m.pack(c.pack).currency);
    });
  };
  X.avgMargin = function () {
    var done = S.all("projects").filter(function (p) { return m.received(p) > 0 && m.costOf(p) > 0; });
    var rec = u.sum(done, m.received), pr = u.sum(done, m.profit);
    return rec ? pr / rec * 100 : null;
  };

  // ---------- 13-week cash forecast ----------
  X.PIPE_W = {};
  m.OPEN_STAGES.forEach(function (stage) { X.PIPE_W[stage] = (+m.LEAD_ODDS[stage] || 0) / 100; });
  X.OPEN_LEAD = m.OPEN_STAGES.slice();
  /** [{wk: "2026-10-05", label, inBooked, inPipeline, out, balance (booked only), balanceWithPipeline}] for `weeks` weeks from this Monday.
      In: unpaid invoices on their due date (overdue lands in week 1) + 50% deposit of weighted leads (call 20%, proposal 45%) two weeks after the lead's next date.
      Out: recurring expenses and salary on their day of month, commissions owed in week 1, project costs in the shoot week of upcoming shoots. */
  X.forecast = function (weeks) {
    weeks = weeks || 13;
    var r = m.rules(), start = u.weekStart(u.today()), out = [], bal = +r.openingCash || 0, balP = bal;
    for (var w = 0; w < weeks; w++) {
      var from = u.addDays(start, w * 7), to = u.addDays(from, 7), row = { wk: from, label: u.fmtDate(from), inBooked: 0, inPipeline: 0, out: 0, items: [] };
      X.receivables().forEach(function (rc) { var due = rc.inv.due || u.today(); if (w === 0 ? due < to : due >= from && due < to) { row.inBooked += rc.balance; row.items.push({ k: "in", t: rc.inv.no, v: rc.balance }); } });
      S.all("leads").forEach(function (l) {
        var p = X.PIPE_W[m.leadStage(l)]; if (!p) return; var when = u.addDays(l.nextDate && l.nextDate > u.today() ? l.nextDate : u.today(), 14);
        if (w === 0 ? when < to : when >= from && when < to) { var value = Math.round(m.leadValue(l) * (m.pack(l.pack).monthly ? 1 : 0.5) * p); row.inPipeline += value; row.items.push({ k: "lead", t: l.brand, v: value }); }
      });
      // day-of-month items
      for (var d = 0; d < 7; d++) {
        var day = u.addDays(from, d); if (w === 0 && day < u.today()) continue; var dd = day.slice(8, 10), ym = day.slice(0, 7);
        if (dd === "01" && +r.salary) { row.out += +r.salary; row.items.push({ k: "out", t: "Salary", v: +r.salary }); }
        S.all("expenses").forEach(function (e) {
          if (e.recurring === "monthly" && e.date && recurringDate(ym, e.date.slice(8, 10)) === day && ym >= u.month(e.date) && (!e.until || ym <= e.until)) { row.out += +e.amount || 0; row.items.push({ k: "out", t: e.label, v: +e.amount || 0 }); }
          else if (e.recurring !== "monthly" && e.date === day) { row.out += +e.amount || 0; row.items.push({ k: "out", t: e.label, v: +e.amount || 0 }); }
        });
      }
      if (w === 0) S.all("projects").forEach(function (p) { var c = m.commission(p); if (c.owed > 0) { row.out += c.owed; row.items.push({ k: "out", t: "Commission", v: c.owed }); } });
      S.all("projects").forEach(function (p) {
        if (p.shootDate && p.shootDate >= from && p.shootDate < to && p.stage !== "done") {
          var projectExpenses = S.all("expenses").filter(function (e) { return e.projectId === p.id; });
          var c = m.unmatchedEstimateOf(p, projectExpenses);
          if (c) { row.out += c; row.items.push({ k: "out", t: m.projectLabel(p), v: c }); }
        }
      });
      bal += row.inBooked - row.out; balP += row.inBooked + row.inPipeline - row.out;
      row.balance = bal; row.balanceWithPipeline = balP; out.push(row);
    }
    return out;
  };
  /** Months of cash left at the average burn of the last 3 months (null when nothing is burnt or no opening balance). */
  X.runway = function () {
    var rows = X.monthly(3), burn = u.sum(rows, function (r) { return r.out; }) / 3, cash = +m.rules().openingCash || 0;
    var f = X.forecast(13); var last = f[0] ? f[0].balance : cash;
    return burn > 0 && cash > 0 ? { months: Math.max(0, last) / burn, burn: burn } : { months: null, burn: burn };
  };

  // ---------- V03 insight helpers (pure, read-only; the insight strips in modules/insights.js are built on these) ----------
  function histSorted(l) { return (l.history || []).filter(function (h) { return h && h.at; }).slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; }); }
  /** Stage a lead was in on `date` (from its history), "" when it did not exist yet. */
  X.leadStageAt = function (l, date) { var st = ""; histSorted(l).forEach(function (h) { if (h.at <= date) st = h.stage; }); return st; };
  /** Pipeline value as it stood on `date` (today = current stages): {total, weighted}. */
  X.pipelineAt = function (date) {
    var td = u.today(), total = 0, weighted = 0;
    S.all("leads").forEach(function (l) {
      var st = m.leadStage(date >= td ? l : X.leadStageAt(l, date)), w = X.PIPE_W[st];
      if (w == null) return;
      var v = m.leadValue(l); total += v; weighted += v * w;
    });
    return { total: total, weighted: Math.round(weighted) };
  };
  /** Date a won or lost lead was closed ("" when unknown). */
  X.leadClosedAt = function (l) { var h = histSorted(l).filter(function (x) { return x.stage === l.stage; }); return h.length ? h[h.length - 1].at : ""; };
  /** Win rate over the `days` before endDate: {won, lost, rate (null when nothing closed)}. */
  X.winRateIn = function (days, endDate) {
    var end = endDate || u.today(), from = u.addDays(end, -days), won = 0, lost = 0;
    S.all("leads").forEach(function (l) {
      if (l.stage !== "won" && l.stage !== "lost") return;
      var at = X.leadClosedAt(l); if (!at || at <= from || at > end) return;
      if (l.stage === "won") won++; else lost++;
    });
    return { won: won, lost: lost, rate: won + lost ? won / (won + lost) * 100 : null };
  };
  /** Average days from the first contact to "won" for leads won in the `days` before endDate (days 0 = all time): {days, n}. */
  X.leadCycle = function (days, endDate) {
    var end = endDate || u.today(), from = days ? u.addDays(end, -days) : "", ds = [];
    S.all("leads").forEach(function (l) {
      if (l.stage !== "won") return;
      var h = histSorted(l), at = X.leadClosedAt(l); if (!h.length || !at || at <= from || at > end) return;
      ds.push(Math.max(0, u.daysBetween(h[0].at, at)));
    });
    return { days: ds.length ? u.sum(ds) / ds.length : null, n: ds.length };
  };
  /** Open leads going cold: follow-up date passed, or no movement for `idleDays` with no future date. Most neglected first: [{lead, idle, late}]. */
  X.coldLeads = function (idleDays) {
    var td = u.today(), out = [];
    S.all("leads").forEach(function (l) {
      if (!m.isOpen(l)) return;
      var h = histSorted(l), last = h.length ? h[h.length - 1].at : td, idle = u.daysBetween(last, td);
      var late = l.nextDate && l.nextDate < td ? u.daysBetween(l.nextDate, td) : 0;
      if (late > 0 || (idle >= idleDays && !(l.nextDate && l.nextDate >= td))) out.push({ lead: l, idle: idle, late: late });
    });
    return out.sort(function (a, b) { return Math.max(b.idle, b.late) - Math.max(a.idle, a.late); });
  };

  /** Turnover by client for invoices issued in [from, to] (same basis as the cap): {by: {clientId: amount}, total}. */
  X.revenueBy = function (from, to) {
    var by = {}, total = 0;
    S.all("invoices").forEach(function (i) {
      if (!i.issued || i.issued < from || i.issued > to) return;
      var a = m.invoiceTurnover(i); by[i.clientId] = (by[i.clientId] || 0) + a; total += a;
    });
    return { by: by, total: total };
  };
  function topOf(r) {
    var best = null; Object.keys(r.by).forEach(function (id) { if (best == null || r.by[id] > r.by[best]) best = id; });
    return best != null && r.total > 0 ? { id: best, amount: r.by[best], share: r.by[best] / r.total * 100, n: Object.keys(r.by).length } : null;
  };
  /** Top client's share of the last 12 months' revenue, and the same for the 12 months before: {cur, prev, total} (cur/prev = {id, amount, share} or null). */
  X.concentration = function (endDate) {
    var end = endDate || u.today(), cur = X.revenueBy(u.addDays(end, -364), end), prev = X.revenueBy(u.addDays(end, -729), u.addDays(end, -365));
    return { cur: topOf(cur), prev: topOf(prev), total: cur.total };
  };
  /** Cash each client has paid up to `upTo` (gross of withholding, credit notes left out): {clientId: amount}. */
  X.clientCash = function (upTo) {
    var by = {}; upTo = upTo || u.today();
    S.all("invoices").forEach(function (i) {
      if (i.kind === "credit") return;
      (i.payments || []).forEach(function (p) {
        if (p.date && p.date <= upTo) by[i.clientId] = (by[i.clientId] || 0) + m.toTND((+p.net || 0) + (+p.withheld || 0), i.currency || "TND");
      });
    });
    return by;
  };
  /** Average lifetime value: cash paid so far per paying client (null when nobody paid yet). */
  X.avgLtv = function (upTo) {
    var by = X.clientCash(upTo), ids = Object.keys(by).filter(function (id) { return by[id] > 0; });
    return ids.length ? u.sum(ids, function (id) { return by[id]; }) / ids.length : null;
  };
  /** First dated trace of a client (earliest invoice or shoot), "" when none. */
  X.clientSince = function (c) {
    var ds = [];
    S.all("invoices").forEach(function (i) { if (i.clientId === c.id && i.no && i.issued) ds.push(i.issued); });
    S.all("projects").forEach(function (p) { if (p.clientId === c.id && p.shootDate) ds.push(p.shootDate); });
    return ds.sort()[0] || "";
  };
  /** Latest dated trace of a client up to today: invoice, payment, project log, past shoot, feedback. "" when none. */
  X.clientLastActivity = function (c) {
    var td = u.today(), best = "";
    function see(d) { d = String(d || "").slice(0, 10); if (d && d <= td && d > best) best = d; }
    S.all("invoices").forEach(function (i) { if (i.clientId !== c.id) return; see(i.issued); (i.payments || []).forEach(function (p) { see(p.date); }); });
    S.all("projects").forEach(function (p) { if (p.clientId !== c.id) return; see(p.shootDate); (p.log || []).forEach(function (l) { see(l.at); }); });
    S.all("feedback").forEach(function (f) { if (f.clientId === c.id) see(f.at); });
    return best;
  };
  X.clientHasOpenWork = function (c) {
    return S.all("projects").some(function (p) { return p.clientId === c.id && p.stage !== "done"; }) || S.all("contracts").some(function (k) { return k.clientId === c.id && k.status === "active"; });
  };
  /** Clients at risk: a late payer, or a past client with nothing open and no activity for `quietDays` (up to a year). [{client, kind: "late"|"quiet", amount, late, idle}] */
  X.clientRisks = function (quietDays) {
    var td = u.today(), rec = X.receivables(), out = [];
    S.all("clients").forEach(function (c) {
      var lates = rec.filter(function (r) { return r.inv.clientId === c.id && r.late > 0; });
      var last = X.clientLastActivity(c), idle = last ? u.daysBetween(last, td) : null;
      if (lates.length) out.push({ client: c, kind: "late", amount: u.sum(lates, function (r) { return r.balance; }), late: lates[0].late, inv: lates[0].inv, idle: idle });
      else if (idle != null && idle >= quietDays && idle <= 365 && !X.clientHasOpenWork(c)) out.push({ client: c, kind: "quiet", amount: 0, late: 0, idle: idle });
    });
    return out.sort(function (a, b) { return (a.kind === "late" ? 0 : 1) - (b.kind === "late" ? 0 : 1) || b.late - a.late || b.idle - a.idle; });
  };

  /** "shoot" when the shoot date passed and the project is still before editing, "delivery" when a delivery date passed before delivery, else "". */
  X.projectLate = function (p) {
    if (p.stage === "done") return "";
    var td = u.today(), si = m.STAGES.indexOf(p.stage);
    if (p.shootDate && p.shootDate < td && si <= m.STAGES.indexOf("shoot")) return "shoot";
    var dd = String(p.deliveryDate || p.deliverBy || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dd) && dd < td && si < m.STAGES.indexOf("delivered")) return "delivery";
    return "";
  };
  /** File counts by status across the given projects (default: not done): {todo, edit, review, revise, approved, total}. */
  X.fileCounts = function (projects) {
    var o = { todo: 0, edit: 0, review: 0, revise: 0, approved: 0, total: 0 };
    (projects || S.all("projects").filter(function (p) { return p.stage !== "done"; })).forEach(function (p) {
      m.files(p).forEach(function (f) { var s = f.item.status || "todo"; if (o[s] == null) s = "todo"; o[s]++; o.total++; });
    });
    return o;
  };
  /** Projects shot (or to shoot) with a shoot date in [from, to]. */
  X.shootsIn = function (from, to) { return S.all("projects").filter(function (p) { return p.shootDate && p.shootDate >= from && p.shootDate <= to; }); };
  /** Average days to approval over the `days` before endDate: the client's "approve" on a shared page after it was published; when there is none, the days a file took from its first move to approved. {days, n, src}. */
  X.approvalDays = function (days, endDate) {
    var end = endDate || u.today(), from = days ? u.addDays(end, -days) : "", ds = [], shares = {}, src = "client";
    S.all("shares").forEach(function (s) { shares[s.id] = s; });
    S.all("feedback").forEach(function (f) {
      if (f.kind !== "approve") return;
      var s = shares[f.shareId], a = String((s && (s.publishedAt || s.created)) || "").slice(0, 10), b = String(f.at || "").slice(0, 10);
      if (!a || !b || b <= from || b > end) return;
      ds.push(Math.max(0, u.daysBetween(a, b)));
    });
    if (!ds.length) {
      src = "internal";
      S.all("projects").forEach(function (p) {
        var ok = {}, by = {}; m.files(p).forEach(function (f) { if (f.item.status === "approved") ok[f.code] = 1; });
        (p.log || []).forEach(function (l) { var mm = /^(\S+) →/.exec(l.text || ""); if (mm && ok[mm[1]]) (by[mm[1]] = by[mm[1]] || []).push(String(l.at).slice(0, 10)); });
        Object.keys(by).forEach(function (code) {
          var a = by[code].sort(); if (a.length < 2) return;
          var last = a[a.length - 1]; if (last <= from || last > end) return;
          ds.push(u.daysBetween(a[0], last));
        });
      });
    }
    return { days: ds.length ? u.sum(ds) / ds.length : null, n: ds.length, src: src };
  };

  /** Per team member: open tasks, overdue, done in the last 7 days. */
  X.teamLoad = function () {
    var td = u.today(), from = u.addDays(td, -7), tasks = S.all("tasks");
    return S.all("team").map(function (p) {
      var mine = tasks.filter(function (x) { return x.who === p.id; }), open = mine.filter(function (x) { return !x.done; });
      return { member: p, open: open.length, late: open.filter(function (x) { return x.due && x.due < td; }).length, done7: mine.filter(function (x) { return x.done && x.doneOn && x.doneOn > from; }).length };
    });
  };
  /** Tasks marked done with doneOn in (from, to]. */
  X.tasksDoneIn = function (from, to) { return S.all("tasks").filter(function (x) { return x.done && x.doneOn && x.doneOn > from && x.doneOn <= to; }).length; };
  X.commissionOwed = function () { return u.sum(S.all("projects"), function (p) { return m.commission(p).owed; }); };
  X.commissionPaid = function () { return u.sum(S.all("projects"), function (p) { return m.commission(p).paid; }); };
  /** Last day an idea was touched: created or its latest activity line. */
  X.ideaTouched = function (i) {
    var best = String(i.created || "").slice(0, 10);
    (i.log || []).forEach(function (l) { var d = String(l.at || "").slice(0, 10); if (d > best) best = d; });
    if (i.updated && String(i.updated).slice(0, 10) > best) best = String(i.updated).slice(0, 10);
    return best;
  };

  GK.x = X;
})(window.GK);
