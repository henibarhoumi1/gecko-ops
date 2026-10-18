/* GECKO Ops · finance: Offers tab. The price list with what each offer costs us and what is left. Read-only: prices and rates are edited in Settings. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, esc = u.esc, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_tab_offers: ["Offers", "Offres"],
    fi_of_sub: ["What we sell, what it costs us to make, what is left for the agency.", "Ce que nous vendons, ce que ça nous coûte, ce qui reste pour l'agence."],
    fi_of_tn: ["Tunisia", "Tunisie"], fi_of_intl: ["International", "International"],
    fi_of_c_offer: ["Offer", "Offre"], fi_of_c_launch: ["Launch price", "Prix de lancement"], fi_of_c_std: ["Standard price", "Prix standard"], fi_of_c_incl: ["Included", "Inclus"],
    fi_of_c_direct: ["Direct cost", "Coût direct"], fi_of_c_owner: ["Owner pay", "Paie du fondateur"], fi_of_c_net_l: ["Net at launch", "Net au lancement"], fi_of_c_net_s: ["Net at standard", "Net au standard"], fi_of_c_margin: ["Margin", "Marge"],
    fi_of_month: ["/ month", "/ mois"], fi_of_none: ["no launch price", "pas de prix de lancement"], fi_of_min: ["min. {n} months", "min. {n} mois"],
    fi_of_reels: ["Reels: {n}", "Reels : {n}"], fi_of_hooks: ["Hooks and variations: {n}", "Hooks et variations : {n}"], fi_of_statics: ["Statics: {n}", "Visuels fixes : {n}"], fi_of_mashups: ["Mashups: {n}", "Mashups : {n}"],
    fi_of_carousels: ["Carousels: {n}", "Carrousels : {n}"], fi_of_days: ["Shoot days: {n}", "Jours de tournage : {n}"], fi_of_day1: ["Shoot days: 1", "Jours de tournage : 1"],
    fi_of_ads: ["Ads management", "Gestion des pubs"], fi_of_nothing: ["The report only", "Le rapport seulement"],
    fi_of_rates: ["Cost rates used", "Tarifs de coûts utilisés"],
    fi_of_rates_l: ["Camera {c} per shoot day. Transport {tr} and food {fd} per shoot day. Assistant {as} per shoot day when the offer includes ads. Owner {ow} per shoot day. Owner editing {es} for up to 6 reels, {em} for 7 to 14, {el} for 15 or more. TND.", "Caméra {c} par jour de tournage. Transport {tr} et repas {fd} par jour de tournage. Assistant {as} par jour de tournage si l'offre inclut les pubs. Fondateur {ow} par jour de tournage. Montage du fondateur {es} jusqu'à 6 reels, {em} de 7 à 14, {el} à partir de 15. TND."],
    fi_of_note: ["Net = price in TND minus direct cost minus owner pay, before the partner share, overheads and tax. Foreign prices are converted at the rates in Settings. Estimate.", "Net = prix en TND moins coût direct moins paie du fondateur, avant la part du partenaire, les charges et les impôts. Les prix en devise sont convertis aux taux des Réglages. Estimation."],
    fi_of_edit: ["Edit prices in Settings", "Modifier les prix dans les Réglages"],
    fi_of_addons: ["Add-ons", "Options"], fi_of_from: ["from", "à partir de"], fi_of_c_addon: ["Add-on", "Option"], fi_of_c_price: ["Price", "Prix"], fi_of_pct: ["{p}% of the offer", "{p} % de l'offre"], fi_of_atcost: ["at cost", "au coût"]
  });

  function cost(key) {
    var lines = m.estimateCosts(key), owner = 0, direct = 0;
    lines.forEach(function (l) { if (l.kind === "heni") owner += l.amount; else direct += l.amount; });
    return { owner: owner, direct: direct };
  }
  function price(n, cur) { return u.money(Math.round(+n || 0), 0, cur && cur !== "TND" ? cur : undefined); }
  function incl(pk) {
    var o = [];
    if (pk.reels) o.push(t("fi_of_reels", { n: pk.reels }));
    if (pk.variations) o.push(t("fi_of_hooks", { n: pk.variations }));
    if (pk.statics) o.push(t("fi_of_statics", { n: pk.statics }));
    if (pk.mashups) o.push(t("fi_of_mashups", { n: pk.mashups }));
    if (pk.carousels) o.push(t("fi_of_carousels", { n: pk.carousels }));
    if (pk.shootDays) o.push(pk.shootDays === 1 ? t("fi_of_day1") : t("fi_of_days", { n: pk.shootDays }));
    if (pk.ads) o.push(t("fi_of_ads"));
    if (pk.note) o.push(pk.note);
    return o.length ? o : [t("fi_of_nothing")];
  }
  function netCell(net, base) {
    var neg = net < 0;
    return '<td class="r num"' + (neg ? ' style="color:var(--gel-deep)"' : "") + ">" + (neg ? "−" : "") + F.fm(Math.abs(net)) + '<br><span class="small muted">' + (base > 0 ? u.pct(net / base * 100) : "—") + "</span></td>";
  }
  function market(mk) {
    var keys = m.packKeys(mk).filter(function (k) { return +m.pack(k).price > 0; });
    if (!keys.length) return "";
    var h = '<section class="stack"><h3 class="sec">' + esc(t(mk === "international" ? "fi_of_intl" : "fi_of_tn")) + '</h3><div class="tbl"><table style="min-width:980px"><thead><tr><th>' + esc(t("fi_of_c_offer")) + '</th><th class="r">' + esc(t("fi_of_c_launch")) + '</th><th class="r">' + esc(t("fi_of_c_std")) +
      "</th><th>" + esc(t("fi_of_c_incl")) + '</th><th class="r">' + esc(t("fi_of_c_direct")) + '</th><th class="r">' + esc(t("fi_of_c_owner")) + '</th><th class="r">' + esc(t("fi_of_c_net_l")) + '</th><th class="r">' + esc(t("fi_of_c_net_s")) + "</th></tr></thead><tbody>";
    keys.forEach(function (k) {
      var pk = m.pack(k), c = cost(k), cur = pk.currency || "TND", per = pk.monthly ? " " + t("fi_of_month") : "";
      var std = m.toTND(pk.price, cur), lau = pk.launch ? m.toTND(pk.launch, cur) : null;
      h += "<tr><td><strong>" + esc(pk.name) + "</strong>" + (pk.minMonths ? '<br><span class="small muted">' + esc(t("fi_of_min", { n: pk.minMonths })) + "</span>" : "") + '</td><td class="r num">' +
        (pk.launch ? price(pk.launch, cur) + '<span class="small muted">' + esc(per) + "</span>" : '<span class="small muted">—</span>') + '</td><td class="r num">' + (pk.from ? '<span class="small muted">' + esc(t("fi_of_from")) + "</span> " : "") + price(pk.price, cur) + '<span class="small muted">' + esc(per) + '</span></td><td class="small">' + incl(pk).map(esc).join("<br>") +
        '</td><td class="r num">' + F.fm(c.direct) + '</td><td class="r num">' + F.fm(c.owner) + "</td>" + (lau != null ? netCell(lau - c.direct - c.owner, lau) : '<td class="r small muted">—</td>') + netCell(std - c.direct - c.owner, std) + "</tr>";
    });
    return h + "</tbody></table></div></section>";
  }

  function render() {
    var r = m.rates();
    var h = '<div class="row between"><p class="small muted" style="margin:0">' + esc(t("fi_of_sub")) + "</p>" + ui.btn(t("fi_of_edit"), "fi-of-settings", { cls: "ghost sm" }) + "</div>";
    h += market("tunisia") + market("international");
    var ad = m.addons();
    if (ad.length) {
    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_of_addons")) + '</h3><div class="tbl"><table style="min-width:480px"><thead><tr><th>' + esc(t("fi_of_c_addon")) + '</th><th class="r">' + esc(t("fi_of_c_price")) + "</th></tr></thead><tbody>";
    ad.forEach(function (a) {
      h += "<tr><td>" + esc(a.name) + '</td><td class="r num">' + (a.pct ? esc(t("fi_of_pct", { p: a.pct })) : a.price ? price(a.price) : esc(t("fi_of_atcost"))) + "</td></tr>";
    });
    h += "</tbody></table></div></section>";
    }
    h += '<section class="panel"><h3 class="sec">' + esc(t("fi_of_rates")) + '</h3><p class="small" style="margin:0">' + esc(t("fi_of_rates_l", { c: r.camera, tr: r.transport, fd: r.food, as: r.assistant, ow: r.ownerDirect, es: r.editSmall, em: r.editMid, el: r.editLarge })) +
      '</p><p class="small muted" style="margin:0">' + esc(t("fi_of_note")) + "</p></section>";
    return h;
  }
  GK.act("fi-of-settings", function () { ui.go("settings", { tab: "packs" }); });

  FIN.tabs.offers = { render: render };
})(window.GK);
