/* sample data for dashboard: goals and opening cash */
(function (GK) {
  "use strict";
  GK.seedExtra.push(function (data) {
    var c = data.config = data.config || {};
    c.goals = Object.assign({ monthlyRevenue: 6000, dmsPerDay: 10, margin: 45 }, c.goals || {});
    if (c.rules) { if (!(+c.rules.openingCash > 0)) c.rules = Object.assign({}, c.rules, { openingCash: 4000 }); }
  });
})(window.GK);
