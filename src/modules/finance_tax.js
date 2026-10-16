/* GECKO Ops · finance: Tax and cap. Keeps the cap tab and adds the pace chart, the month you would cross the cap, and a stamp / withholding summary for the accountant. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_tx_pace: ["Yearly pace against the cap", "Rythme annuel face au plafond"], fi_tx_pace_sub: ["Invoiced so far this year, and the same pace carried to December. Estimate.", "Facturé depuis janvier, et le même rythme poursuivi jusqu'en décembre. Estimation."],
    fi_tx_actual: ["Invoiced so far", "Facturé à ce jour"], fi_tx_proj: ["At the current pace", "Au rythme actuel"], fi_tx_cap: ["Cap {c}", "Plafond {c}"],
    fi_tx_crossed: ["You passed the cap in {m}. Talk to the accountant now.", "Vous avez dépassé le plafond en {m}. Parlez-en au comptable maintenant."],
    fi_tx_cross_at: ["At the current pace ({a} a month) you would pass the cap in {m}.", "Au rythme actuel ({a} par mois), vous dépasseriez le plafond en {m}."],
    fi_tx_cross_none: ["At the current pace you stay under the cap this year, ending around {p} of it.", "Au rythme actuel, vous restez sous le plafond cette année, autour de {p} de celui-ci."],
    fi_tx_not_crossed: ["The cap was not passed that year.", "Le plafond n'a pas été dépassé cette année-là."],
    fi_tx_sum: ["Stamps and tax withheld, {y}", "Timbres et retenues à la source, {y}"], fi_tx_sum_h: ["Accountant to confirm. Figures from your invoices and payments, to hand over with the yearly export.", "À confirmer par le comptable. Chiffres tirés de vos factures et paiements, à remettre avec l'export annuel."],
    fi_tx_c_month: ["Month", "Mois"], fi_tx_c_inv: ["Invoiced (cap)", "Facturé (plafond)"], fi_tx_c_stamp: ["Stamp duty on invoices issued", "Timbres sur factures émises"], fi_tx_c_wh: ["Tax withheld by clients (credit)", "Retenues des clients (crédit)"],
    fi_tx_wh_note: ["Tax withheld is money your clients paid to the tax office on your behalf. Ask each company client for its withholding certificate and keep it: it is a credit against your tax.", "La retenue à la source est de l'argent que vos clients ont versé au fisc pour vous. Demandez à chaque société son certificat de retenue et gardez-le : c'est un crédit sur votre impôt."],
    fi_tx_stamp_note: ["Stamp duty is added to each invoice (credit notes carry none) and paid over by you. It is not part of the cap.", "Le droit de timbre s'ajoute à chaque facture (les avoirs n'en ont pas) et c'est vous qui le reversez. Il ne compte pas dans le plafond."],
    fi_tx_vat_note: ["VAT is not tracked here. Ask the accountant whether it applies to your activity.", "La TVA n'est pas suivie ici. Demandez au comptable si elle s'applique à votre activité."]
  });

  function P() { return F.P(); }
  function mname(year, n, opts) { return u.fmtDate(year + "-" + String(n).padStart(2, "0") + "-15", opts || { month: "long" }); }

  function paceHTML(year) {
    var r = m.rules(), cap = +r.cap || 0, now = u.today(), thisYear = u.year(now);
    var issued = F.invoices().filter(function (i) { return i.no && u.year(i.issued) === year; });
    var curM = year === thisYear ? +now.slice(5, 7) : 12, per = [], cum = [], run = 0;
    for (var k = 1; k <= 12; k++) { var mk = year + "-" + String(k).padStart(2, "0"); var a = u.sum(issued.filter(function (i) { return u.month(i.issued) === mk; }), m.invoiceTurnover); per.push(a); run += a; cum.push(run); }
    var used = cum[curM - 1], firstM = issued.length ? Math.min.apply(null, issued.map(function (i) { return +i.issued.slice(5, 7); })) : curM;
    var avg = used / Math.max(1, curM - firstM + 1);
    var crossedAt = 0; for (var j = 0; j < 12; j++) if (cap && cum[j] >= cap && j < curM) { crossedAt = j + 1; break; }
    var sentence, projCum = [];
    if (crossedAt) sentence = t("fi_tx_crossed", { m: mname(year, crossedAt) });
    else if (year !== thisYear) sentence = t("fi_tx_not_crossed");
    else {
      for (var q = 1; q <= 12; q++) projCum.push(q < curM ? null : Math.round(used + avg * (q - curM)));
      var yearEnd = used + avg * (12 - curM), cross = 0;
      if (cap && avg > 0) { var need = Math.ceil((cap - used) / avg); if (curM + need <= 12) cross = curM + need; }
      sentence = cross ? t("fi_tx_cross_at", { a: F.fm(avg), m: mname(year, cross) }) : t("fi_tx_cross_none", { p: u.pct(cap ? yearEnd / cap * 100 : 0) });
    }
    var series = [{ name: t("fi_tx_actual"), values: cum.map(function (v, i) { return i < curM ? Math.round(v) : null; }) }];
    if (projCum.length && curM < 12) series.push({ name: t("fi_tx_proj"), values: projCum, dash: true, c: 2 });
    return '<section class="panel"><p class="note strong" style="margin:0">' + esc(sentence) + "</p>" + GK.charts.line({ title: t("fi_tx_pace") + " · " + year, sub: t("fi_tx_pace_sub"),
      labels: per.map(function (_, i) { return mname(year, i + 1, { month: "short" }); }), series: series, fmt: F.fm, goal: cap ? { value: cap, label: t("fi_tx_cap", { c: F.fm(cap) }) } : null }) + "</section>";
  }

  function summaryHTML(year) {
    var inv = F.invoices(), rows = [], tot = { a: 0, s: 0, w: 0 };
    for (var k = 1; k <= 12; k++) {
      var mk = year + "-" + String(k).padStart(2, "0");
      var mine = inv.filter(function (i) { return i.no && u.month(i.issued) === mk; });
      var a = u.sum(mine, m.invoiceTurnover);
      var s = u.sum(mine.filter(function (i) { return i.kind !== "credit"; }), function (i) { return +i.stamp || 0; });
      var w = u.sum(inv, function (i) { return u.sum((i.payments || []).filter(function (p) { return u.month(p.date) === mk; }), function (p) { return +p.withheld || 0; }); });
      if (!a && !s && !w) continue;
      rows.push({ mk: mk, a: a, s: s, w: w }); tot.a += a; tot.s += s; tot.w += w;
    }
    var h = '<section class="stack"><div class="row between"><h3 class="sec">' + esc(t("fi_tx_sum", { y: year })) + "</h3>" + ui.pill(t("fi_acct")) + '</div><p class="small muted" style="margin:0">' + esc(t("fi_tx_sum_h")) + "</p>";
    if (!rows.length) return h + ui.empty(t("none")) + "</section>";
    h += '<div class="tbl"><table><thead><tr><th>' + esc(t("fi_tx_c_month")) + '</th><th class="r">' + esc(t("fi_tx_c_inv")) + '</th><th class="r">' + esc(t("fi_tx_c_stamp")) + '</th><th class="r">' + esc(t("fi_tx_c_wh")) + "</th></tr></thead><tbody>";
    rows.forEach(function (r) { h += "<tr><td>" + esc(u.fmtMonth(r.mk)) + '</td><td class="r num">' + F.fm(r.a) + '</td><td class="r num">' + F.fm(r.s) + '</td><td class="r num">' + F.fm(r.w) + "</td></tr>"; });
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_total_row")) + '</td><td class="r num">' + F.fm(tot.a) + '</td><td class="r num">' + F.fm(tot.s) + '</td><td class="r num">' + F.fm(tot.w) + "</td></tr></tfoot></table></div>";
    h += '<p class="small" style="margin:0">' + esc(t("fi_tx_stamp_note")) + '</p><p class="small" style="margin:0">' + esc(t("fi_tx_wh_note")) + '</p><p class="small muted" style="margin:0">' + esc(t("fi_tx_vat_note")) + "</p></section>";
    return h;
  }

  FIN.tabs.cap = { render: function () {
    var year = FIN.capYearSel().year;
    return FIN.capHTML() + paceHTML(year) + summaryHTML(year);
  } };
})(window.GK);
