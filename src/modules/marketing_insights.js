/* GECKO Ops · marketing: Insights tab. KPIs and charts from our posts, follower counts, leads and ads. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, K = GK.mk, C = GK.charts;

  GK.i18n.add({
    mk_i_hint: ["Numbers from the posts, ads and leads logged here. Log follower counts once a month.", "Chiffres tirés des posts, pubs et prospects notés ici. Notez les abonnés une fois par mois."],
    mk_i_log: ["Log followers", "Noter les abonnés"], mk_i_posts_m: ["Posts this month", "Posts ce mois"], mk_i_views: ["Views, last 3 months", "Vues, 3 derniers mois"],
    mk_i_eng: ["Engagement rate", "Taux d'engagement"], mk_i_fol: ["Followers now", "Abonnés aujourd'hui"], mk_i_social_leads: ["Leads from social and ads", "Prospects venus du social et des pubs"],
    mk_i_cpl: ["Ad cost per lead", "Coût pub par prospect"],
    mk_i_c_posts: ["Posts per month", "Posts par mois"], mk_i_c_posts_s: ["Posted, last 6 months", "Publiés, 6 derniers mois"], mk_i_c_views: ["Views per month", "Vues par mois"], mk_i_c_views_s: ["Posts marked posted, by post date", "Posts publiés, par date de post"],
    mk_i_c_eng: ["Likes, saves and shares per month", "J'aime, enregistrements et partages par mois"], mk_i_c_fol: ["Follower growth", "Croissance des abonnés"], mk_i_c_fol_s: ["One count a month for each channel", "Un relevé par mois et par canal"],
    mk_i_c_leads: ["Leads by source", "Prospects par source"], mk_i_c_leads_s: ["All leads in the pipeline", "Tous les prospects de la prospection"], mk_i_c_cpl: ["Cost per lead by campaign", "Coût par prospect et par campagne"],
    mk_i_c_none: ["Nothing to chart yet.", "Rien à tracer pour l'instant."], mk_i_c_posts_none: ["Mark posts as posted with a date to see this.", "Marquez des posts comme publiés avec une date pour voir ceci."],
    mk_i_c_fol_none: ["Log follower counts for at least two months.", "Notez les abonnés sur au moins deux mois."], mk_i_c_leads_none: ["No leads yet. Fill the source when you add a lead.", "Aucun prospect. Renseignez la source en ajoutant un prospect."],
    mk_i_c_cpl_none: ["Add spend and leads to a campaign.", "Ajoutez dépenses et prospects à une campagne."], mk_i_c_views_none: ["Add views to posted posts.", "Ajoutez les vues aux posts publiés."],
    mk_s_likes: ["Likes", "J'aime"], mk_s_saves: ["Saves", "Enregistrements"], mk_s_shares: ["Shares", "Partages"], mk_s_views: ["Views", "Vues"], mk_s_posts: ["Posts", "Posts"],
    mk_i_f_title: ["Log follower count", "Noter les abonnés"], mk_i_f_edit: ["Edit follower count", "Modifier le relevé"], mk_i_f_month: ["Month", "Mois"], mk_i_f_channel: ["Channel", "Canal"], mk_i_f_count: ["Followers", "Abonnés"],
    mk_i_f_list: ["Follower counts", "Relevés d'abonnés"],
    mk_src_ig_organic: ["Instagram organic", "Instagram organique"], mk_src_tiktok_organic: ["TikTok organic", "TikTok organique"], mk_src_ig_ads: ["Instagram ads", "Pubs Instagram"], mk_src_tiktok_ads: ["TikTok ads", "Pubs TikTok"],
    mk_src_website_form: ["Website form", "Formulaire du site"], mk_src_referral_client: ["Client referral", "Recommandation client"], mk_src_referral_personal: ["Personal network", "Réseau personnel"],
    mk_src_outbound_dm: ["Outbound DM", "DM sortant"], mk_src_outbound_visit: ["Outbound visit", "Visite"], mk_src_outbound_email: ["Outbound email", "E-mail sortant"], mk_src_event: ["Event", "Événement"],
    mk_src_international_platform: ["International platform", "Plateforme internationale"], mk_src_other: ["Other", "Autre"]
  });

  var SOCIAL = ["ig_organic", "tiktok_organic", "ig_ads", "tiktok_ads"];
  function monthTotals(posts, months, key) { return months.map(function (mo) { return u.sum(posts.filter(function (p) { return p.status === "posted" && p.date && u.month(p.date) === mo; }), function (p) { return key === "n" ? 1 : key === "int" ? K.interactions(p) : p[key]; }); }); }
  function followerSeries(fol, months) {
    return K.CHANNELS.map(function (ch, i) {
      var last = null, vals = months.map(function (mo) { var e = fol.find(function (f) { return f.channel === ch && f.month === mo; }); if (e) last = +e.count; return e ? +e.count : null; });
      return { name: K.chLabel(ch), values: vals, c: i + 1, has: vals.some(function (v) { return v != null; }) };
    }).filter(function (s) { return s.has; });
  }
  function latestFollowers(fol) {
    var tot = 0;
    K.CHANNELS.forEach(function (ch) { var l = fol.filter(function (f) { return f.channel === ch; }).sort(u.by("month", "desc"))[0]; if (l) tot += +l.count || 0; });
    return tot;
  }

  K.tabs.insights = function () {
    var d = K.data(), posts = d.posts, fol = d.followers, ads = d.ads, money = K.money();
    var months6 = K.lastMonths(6), labels6 = months6.map(K.mlabel), cur = months6[5];
    var leads = S.all("leads"), social = leads.filter(function (l) { return SOCIAL.indexOf(l.source || l.channel) > -1; }).length;
    var views3 = u.sum(monthTotals(posts, months6.slice(3), "views")), int3 = u.sum(monthTotals(posts, months6.slice(3), "int"));
    var tot = latestFollowers(fol), spend = u.sum(ads, function (a) { return a.spend; }), adLeads = u.sum(ads, function (a) { return a.leads; });
    var items = [
      { lab: t("mk_i_posts_m"), v: String(monthTotals(posts, [cur], "n")[0]), n: "" },
      { lab: t("mk_i_views"), v: views3 ? C.compact(views3) : t("mk_dash"), n: "" },
      { lab: t("mk_i_eng"), v: views3 ? u.dec(int3 / views3 * 100, 1) + (u.fr() ? " %" : "%") : t("mk_dash"), n: "" },
      { lab: t("mk_i_fol"), v: tot ? C.compact(tot) : t("mk_dash"), n: "" },
      { lab: t("mk_i_social_leads"), v: String(social), n: "" }
    ];
    if (money) items.push({ lab: t("mk_i_cpl"), v: spend && adLeads ? u.money(spend / adLeads, 1) : t("mk_dash"), n: "" });
    var h = '<div class="mk-bar"><p class="muted small" style="margin:0;flex:1;min-width:200px">' + esc(t("mk_i_hint")) + "</p>" + ui.btn(t("mk_i_log"), "mk-f-new", { cls: "primary", icon: "plus", disabled: !K.canEdit(), title: K.canEdit() ? "" : t("mk_no_perm") }) + "</div>" + ui.kpis(items);

    var byS = {}; leads.forEach(function (l) { var s = l.source || l.channel || "other"; byS[s] = (byS[s] || 0) + 1; });
    var srcItems = Object.keys(byS).sort(function (a, b) { return byS[b] - byS[a]; }).map(function (s) { return { label: t("mk_src_" + s) === "mk_src_" + s ? s : t("mk_src_" + s), value: byS[s], c: SOCIAL.indexOf(s) > -1 ? 1 : 2 }; });
    var fs = followerSeries(fol, K.lastMonths(12));
    var cplItems = ads.filter(function (a) { return K.cpl(a) != null; }).map(function (a) { return { label: a.name, value: Math.round(K.cpl(a) * 10) / 10 }; });
    var charts = [
      C.bars({ title: t("mk_i_c_posts"), sub: t("mk_i_c_posts_s"), labels: labels6, series: [{ name: t("mk_s_posts"), values: monthTotals(posts, months6, "n") }], fmt: function (v) { return String(v); }, empty: t("mk_i_c_posts_none") }),
      C.bars({ title: t("mk_i_c_views"), sub: t("mk_i_c_views_s"), labels: labels6, series: [{ name: t("mk_s_views"), values: monthTotals(posts, months6, "views") }], fmt: function (v) { return String(Math.round(v)); }, empty: t("mk_i_c_views_none") }),
      C.bars({ title: t("mk_i_c_eng"), labels: labels6, series: ["likes", "saves", "shares"].map(function (k, i) { return { name: t("mk_s_" + k), values: monthTotals(posts, months6, k), c: i + 1 }; }), fmt: function (v) { return String(Math.round(v)); }, empty: t("mk_i_c_views_none") }),
      C.line({ title: t("mk_i_c_fol"), sub: t("mk_i_c_fol_s"), labels: K.lastMonths(12).map(K.mlabel), series: fs, fmt: function (v) { return String(Math.round(v)); }, empty: t("mk_i_c_fol_none") }),
      C.hbars({ title: t("mk_i_c_leads"), sub: t("mk_i_c_leads_s"), items: srcItems, fmt: function (v) { return String(v); }, empty: t("mk_i_c_leads_none") })
    ];
    if (money) charts.push(C.hbars({ title: t("mk_i_c_cpl"), items: cplItems, fmt: function (v) { return u.money(v, 1); }, empty: t("mk_i_c_cpl_none") }));
    h += '<div class="mk-charts">' + charts.join("") + "</div>";

    if (fol.length) {
      h += '<h3 class="lab mk-month">' + esc(t("mk_i_f_list")) + '</h3><div class="mk-table"><table><thead><tr><th>' + esc(t("mk_i_f_month")) + "</th><th>" + esc(t("mk_i_f_channel")) + '</th><th class="r">' + esc(t("mk_i_f_count")) + "</th></tr></thead><tbody>" +
        fol.slice().sort(function (a, b) { return String(b.month).localeCompare(String(a.month)) || String(a.channel).localeCompare(b.channel); }).map(function (f) {
          return '<tr data-a="mk-f-edit" data-id="' + esc(f.id) + '"><td>' + esc(u.fmtMonth(f.month)) + "</td><td>" + esc(K.chLabel(f.channel)) + '</td><td class="r num">' + esc(f.count) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    return h;
  };

  function fForm(f) {
    return '<div class="form">' + ui.field({ id: "mk-f-month", label: t("mk_i_f_month"), type: "month", value: f.month }) +
      ui.field({ id: "mk-f-channel", label: t("mk_i_f_channel"), type: "select", value: f.channel, options: K.CHANNELS.map(function (c) { return [c, K.chLabel(c)]; }) }) +
      ui.field({ id: "mk-f-count", label: t("mk_i_f_count"), type: "number", value: f.count || "" }) + "</div>";
  }
  function fOpen(f, isNew) {
    if (!K.guard()) return;
    K.formModal({ title: t(isNew ? "mk_i_f_title" : "mk_i_f_edit"), body: fForm(f), save: "mk-f-save", del: isNew ? "" : "mk-f-del", data: { id: f.id || "" } });
  }
  GK.act("mk-f-new", function () { fOpen({ month: u.today().slice(0, 7), channel: "instagram" }, true); });
  GK.act("mk-f-edit", function (el) { var f = K.data().followers.find(function (x) { return x.id === el.dataset.id; }); if (f) fOpen(f, false); });
  GK.act("mk-f-save", function (el) {
    if (!K.guard()) return;
    var month = u.val("mk-f-month"), ch = u.val("mk-f-channel"), n = K.num("mk-f-count");
    if (!/^\d{4}-\d{2}$/.test(month)) { u.focus("mk-f-month"); return ui.toast(t("required")); }
    if (!n) { u.focus("mk-f-count"); return ui.toast(t("required")); }
    var id = el.dataset.id;
    if (K.save(function (d) {
      var old = id ? d.followers.find(function (x) { return x.id === id; }) : d.followers.find(function (x) { return x.month === month && x.channel === ch; });
      if (old) Object.assign(old, { month: month, channel: ch, count: n }); else d.followers.push({ id: K.id(), month: month, channel: ch, count: n });
    })) K.done();
  });
  GK.act("mk-f-del", function (el) {
    if (!K.guard()) return;
    if (K.save(function (d) { d.followers = d.followers.filter(function (x) { return x.id !== el.dataset.id; }); })) K.done();
  });
})(window.GK);
