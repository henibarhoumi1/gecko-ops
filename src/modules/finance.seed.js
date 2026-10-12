/* GECKO Ops · finance sample data: overheads, three quotes, and older history (a closed client in the previous year) so the 12-month charts have shape.
   Invoice numbers stay sequential per year: the older invoices carry GK-<last year>-001..004 and are dated in that year. Existing sample records are untouched. */
(function (GK) {
  "use strict";
  GK.seedExtra = GK.seedExtra || [];
  GK.seedExtra.push(function (data, ctx) {
    var u = ctx.u, m = ctx.m, d = ctx.d, today = ctx.today, y = u.year(today), y1 = String(+y - 1), C = data.colls;
    function pay(date, net, wh, method) { return { date: date, net: net, withheld: wh || 0, method: method || "transfer", ref: "" }; }
    /** a date n months before this month, on the given day (<= 28) */
    function mo(n, day) {
      var t = new Date(today + "T12:00:00"); t.setDate(1); t.setMonth(t.getMonth() - n);
      return u.iso(t).slice(0, 8) + String(day).padStart(2, "0");
    }
    function ymOf(n) { return mo(n, 1).slice(0, 7); }

    // ---- config: opening cash for the forecast and a monthly goal (only if nobody set them yet)
    data.config.rules = Object.assign({}, data.config.rules, { openingCash: data.config.rules && data.config.rules.openingCash ? data.config.rules.openingCash : 4000 });
    data.config.goals = Object.assign({ monthlyRevenue: 6000 }, data.config.goals || {});

    // ---- an older closed client: two GRIP projects last year, paid in full (numbers GK-<y-1>-001..004)
    C.clients = (C.clients || []).concat([{ id: "cdz", brand: "Dar Zaghouan", code: "ZAGHOUAN", contact: "Wided", phone: "+216 71 000 505", whatsapp: "+216 71 000 505", email: "", sector: "Home decor",
      taxId: "9988776/D/M/000", buyer: "In-house", baseline: { v: 12, date: y1 + "-08-20" }, notes: "Two projects last year, paid on time." }]);
    function closed(id, name, plan, shoot, mohamed, payout) {
      return { id: id, clientId: "cdz", contractId: "", month: 0, name: name, pack: "GRIP", stage: "done", planApproved: true, planApprovedOn: plan, shootDate: shoot, format: "9x16", mohamed: mohamed,
        onboarding: [true, true, true, true, true, true, true], angles: [], reels: [], carousels: [], costs: m.estimateCosts("GRIP"),
        report: { metric: "cpp", now: "5.8", why: {}, more: "", kill: "", next: "" }, payout: payout, log: [] };
    }
    C.projects = (C.projects || []).concat([
      closed("pdz0", "Autumn catalogue", y1 + "-08-24", y1 + "-09-06", true, { amount: 237, paidOn: y1 + "-10-12" }),
      closed("pdz", "Winter collection", y1 + "-11-18", y1 + "-12-03", false, null)
    ]);
    var jan = y + "-01-20"; if (jan >= today) jan = d(-1);
    function inv(id, no, pid, kind, label, issued, due, payments) {
      return { id: id, no: "GK-" + y1 + "-" + no, clientId: "cdz", projectId: pid, kind: kind, label: label, amount: 750, stamp: 1, issued: issued, due: due, payments: payments, credited: false, log: [] };
    }
    C.invoices = (C.invoices || []).concat([
      inv("fi_h1", "001", "pdz0", "deposit", "GRIP · Autumn catalogue · deposit", y1 + "-08-28", y1 + "-09-04", [pay(y1 + "-09-01", 728.5, 22.5)]),
      inv("fi_h2", "002", "pdz0", "balance", "GRIP · Autumn catalogue · balance", y1 + "-09-20", y1 + "-09-27", [pay(y1 + "-09-24", 728.5, 22.5)]),
      inv("fi_h3", "003", "pdz", "deposit", "GRIP · Winter collection · deposit", y1 + "-11-22", y1 + "-11-29", [pay(y1 + "-11-27", 728.5, 22.5)]),
      inv("fi_h4", "004", "pdz", "balance", "GRIP · Winter collection · balance", y1 + "-12-14", y1 + "-12-21", [pay(y1 + "-12-19", 400, 0), pay(jan, 328.5, 22.5)])
    ]);

    // ---- overheads: four monthly commitments over the last five months, plus a few one-offs
    var ex = [
      { id: "fe1", date: mo(5, 3), label: "Editing software", category: "software", amount: 62, recurring: "monthly", until: "", vendor: "Editing software", projectId: "", link: "", note: "Annual plan paid monthly" },
      { id: "fe2", date: mo(5, 3), label: "Cloud storage", category: "software", amount: 28, recurring: "monthly", until: "", vendor: "Cloud storage", projectId: "", link: "", note: "For raw footage" },
      { id: "fe3", date: mo(5, 5), label: "Phone and internet", category: "other", amount: 65, recurring: "monthly", until: "", vendor: "", projectId: "", link: "", note: "" },
      { id: "fe4", date: mo(5, 1), label: "Studio rental (monthly share)", category: "rent", amount: 250, recurring: "monthly", until: "", vendor: "", projectId: "", link: "", note: "Shared space, our part" },
      { id: "fe5", date: mo(4, 14), label: "Tripod and fluid head", category: "gear", amount: 360, recurring: "none", until: "", vendor: "", projectId: "", link: "https://example.com/receipt-tripod", note: "" },
      { id: "fe6", date: mo(3, 9), label: "Memory cards and cables", category: "gear", amount: 185, recurring: "none", until: "", vendor: "", projectId: "", link: "", note: "" },
      { id: "fe7", date: mo(2, 18), label: "Accountant: quarterly visit", category: "tax", amount: 120, recurring: "none", until: "", vendor: "", projectId: "", link: "", note: "" },
      { id: "fe8", date: mo(1, 11), label: "Boost on GECKO's own page", category: "marketing", amount: 75, recurring: "none", until: "", vendor: "", projectId: "", link: "", note: "Teardown reel" },
      { id: "fe9", date: d(-30), label: "Fuel for the Drop 03 shoot", category: "transport", amount: 38, recurring: "none", until: "", vendor: "", projectId: "patl", link: "", note: "" },
      { id: "fe10", date: d(-8), label: "Taxi and parking, Eid launch shoot", category: "transport", amount: 24, recurring: "none", until: "", vendor: "", projectId: "pjas", link: "", note: "" }
    ];
    ex.forEach(function (e) { e.log = []; });
    C.expenses = (C.expenses || []).concat(ex);

    // ---- quotes: one draft, one sent, one accepted and already converted to the Kahwa Lab project's draft invoices
    C.quotes = (C.quotes || []).concat([
      { id: "fq1", no: "Q-" + y + "-001", clientId: "ckah", projectId: "pkah", pack: "SEASON", title: "SEASON · Winter season", lines: [{ label: "SEASON pack: 4 angles, 16 reels, 32 hook variations, 4 carousels", qty: 1, price: 4800 }], amount: 4800,
        status: "accepted", validUntil: d(2), sentOn: d(-12), acceptedOn: d(-6), note: "", invoiceIds: ["i9", "i10"], log: [] },
      { id: "fq2", no: "Q-" + y + "-002", clientId: "catl", projectId: "", pack: "GRIP", title: "GRIP · Drop 04", lines: [{ label: "GRIP pack: 2 angles, 4 reels, 8 hook variations", qty: 1, price: 1500 }, { label: "Extra: 2 more hook variations", qty: 1, price: 0 }], amount: 1500,
        status: "sent", validUntil: d(10), sentOn: d(-4), acceptedOn: "", note: "", invoiceIds: [], log: [] },
      { id: "fq3", no: "", clientId: "cjas", projectId: "", pack: "", title: "Ramadan teaser", lines: [{ label: "Teaser reel, 15 seconds", qty: 2, price: 300 }, { label: "Captions in French and Arabic", qty: 1, price: 120 }], amount: 720,
        status: "draft", validUntil: d(14), sentOn: "", acceptedOn: "", note: "Shoot on the same day as the Eid launch re-cuts.", invoiceIds: [], log: [] }
    ]);
  });
})(window.GK);
