/* Sample history: closed projects earlier this year, so the 12-month charts have a real shape.
   Invoice numbers are renumbered sequentially by issue date after all seeds ran (see core/seed.js). */
(function (GK) {
  "use strict";
  GK.seedExtra.push(function (data, ctx) {
    var C = data.colls, m = ctx.m, y = ctx.today.slice(0, 4);
    function pay(date, net, wh) { return { date: date, net: net, withheld: wh || 0, method: "transfer", ref: "" }; }
    function closed(id, clientId, name, shoot, mohamed, payout) {
      return { id: id, clientId: clientId, contractId: "", month: 0, name: name, pack: "GRIP", stage: "done", planApproved: true, planApprovedOn: ctx.u.addDays(shoot, -10), shootDate: shoot, format: "9x16", mohamed: mohamed,
        onboarding: [true, true, true, true, true, true, true], angles: [], reels: [], carousels: [], costs: m.estimateCosts("GRIP"),
        report: { metric: "cpp", now: "", why: {}, more: "", kill: "", next: "" }, payout: payout, log: [] };
    }
    function inv(id, pid, cid, kind, label, issued, due, payments, amount) {
      return { id: id, no: "GK-" + y + "-900", clientId: cid, projectId: pid, kind: kind, label: label, amount: amount || 750, stamp: 1, issued: issued, due: due, payments: payments, credited: false, log: [] };
    }
    C.projects = (C.projects || []).concat([
      closed("phs1", "cdz", "Spring catalogue", y + "-02-18", true, { amount: 237, paidOn: y + "-04-08" }),
      closed("phs2", "catl", "Drop 01", y + "-05-12", false, null),
      closed("phs3", "cjas", "Summer capsule", y + "-06-20", true, { amount: 237, paidOn: y + "-07-30" })
    ]);
    C.invoices = (C.invoices || []).concat([
      inv("hi1", "phs1", "cdz", "deposit", "GRIP · Spring catalogue · deposit", y + "-02-10", y + "-02-17", [pay(y + "-02-14", 728.5, 22.5)]),
      inv("hi2", "phs1", "cdz", "balance", "GRIP · Spring catalogue · balance", y + "-03-14", y + "-03-21", [pay(y + "-03-20", 728.5, 22.5)]),
      inv("hi3", "phs2", "catl", "deposit", "GRIP · Drop 01 · deposit", y + "-05-02", y + "-05-09", [pay(y + "-05-06", 728.5, 22.5)]),
      inv("hi4", "phs2", "catl", "balance", "GRIP · Drop 01 · balance", y + "-05-27", y + "-06-03", [pay(y + "-06-01", 728.5, 22.5)]),
      inv("hi5", "phs3", "cjas", "deposit", "GRIP · Summer capsule · deposit", y + "-06-08", y + "-06-15", [pay(y + "-06-12", 751, 0)]),
      inv("hi6", "phs3", "cjas", "balance", "GRIP · Summer capsule · balance", y + "-07-02", y + "-07-09", [pay(y + "-07-08", 751, 0)])
    ]);
  });
})(window.GK);
