/* GECKO Ops · module: marketing. GECKO's own marketing: strategy, content, ads, showcase, insights.
   Data lives in config.marketing = {strategy:{}, posts:[], ads:[], showcase:[], followers:[]} (no new collection needed).
   This file: shared helpers, the Strategy tab and the view. marketing_content.js, marketing_ads.js and marketing_insights.js add the other tabs. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    nav_marketing: ["Marketing", "Marketing"], grp_mkt: ["Marketing", "Marketing"],
    mk_title: ["Marketing", "Marketing"], mk_accent: ["for GECKO", "pour GECKO"],
    mk_sub: ["Our own brand: what we say, what we post, what we spend and what it brings in.", "Notre propre marque : ce qu'on dit, ce qu'on publie, ce qu'on dépense et ce que ça rapporte."],
    mk_t_strategy: ["Strategy", "Stratégie"], mk_t_content: ["Content", "Contenu"], mk_t_ads: ["Ads", "Pubs"], mk_t_showcase: ["Showcase", "Vitrine"], mk_t_insights: ["Insights", "Chiffres"],
    mk_edit: ["Edit", "Modifier"], mk_cancel: ["Cancel", "Annuler"], mk_del: ["Delete", "Supprimer"], mk_keep: ["Keep it", "Garder"],
    mk_del_q: ["Delete this for good?", "Supprimer pour de bon ?"], mk_del_yes: ["Yes, delete", "Oui, supprimer"],
    mk_no_perm: ["You can read this but not change it.", "Vous pouvez le lire mais pas le modifier."],
    mk_dash: ["-", "-"],
    // strategy
    mk_s_positioning: ["Positioning", "Positionnement"], mk_s_targets: ["Who we target", "Qui on vise"], mk_s_offers: ["Offers we push", "Offres qu'on pousse"],
    mk_s_goals: ["Goals for this quarter", "Objectifs du trimestre"], mk_s_channels: ["Channels", "Canaux"], mk_s_messages: ["Key messages", "Messages clés"],
    mk_s_hint: ["One point per line.", "Un point par ligne."],
    mk_s_edit_t: ["Edit {n}", "Modifier : {n}"],
    mk_s_def_positioning: [
      "Ads built to be tested.\nGecko is an ad creative studio that makes tested video ads for Tunisian brands that already advertise.\nWe are the creative partner of the brand, not only a production house.\nOne shoot day gives many ads, and the numbers show which one wins.",
      "Ads built to be tested.\nGecko est un studio de création publicitaire qui fait des pubs vidéo testées pour les marques tunisiennes qui font déjà de la pub.\nNous sommes le partenaire créatif de la marque, pas seulement une maison de production.\nUn jour de tournage donne plusieurs pubs, et les chiffres montrent laquelle gagne."],
    mk_s_def_targets: [
      "E-commerce brands that already run ads: cosmetics, fashion, food, health and beauty, accessories, home.\nPersonal brands with money: founders, doctors and clinic owners, coaches, creators.\nHigh-end fashion campaigns and upscale restaurant branding, sold as a Campaign or a custom quote.\nThey already spend on ads, their videos are weak, and the decider can pay at least 2,500 TND a month.\nGulf and Europe: a quiet outreach in the background, a few touches a week.",
      "Marques e-commerce qui font déjà de la pub : cosmétique, mode, alimentaire, santé et beauté, accessoires, maison.\nMarques personnelles qui ont les moyens : fondateurs, médecins et cliniques, coachs, créateurs.\nCampagnes mode haut de gamme et branding de restaurants haut de gamme, vendus en Campagne ou sur devis.\nIls dépensent déjà en pub, leurs vidéos sont faibles, et le décideur peut payer au moins 2 500 TND par mois.\nGolfe et Europe : une prospection discrète en arrière-plan, quelques contacts par semaine."],
    mk_s_def_offers: [
      "Ad Audit, 150 TND: a 20-minute video review plus 5 hook ideas. Credited if they book a Test Campaign within 30 days.\nTest Campaign: the first step. 3 angles, 3 reels, 6 hook variations.\nMonthly plans (Regular, Pro, Creative Partner) once the test shows what works.\nCampaign for launches and big moments.\nEvery offer above 1,000 TND goes through a call.",
      "Ad Audit, 150 TND : une revue vidéo de 20 minutes et 5 idées d'accroches. Déduit si la marque réserve un Test Campaign sous 30 jours.\nTest Campaign : la première étape. 3 angles, 3 reels, 6 variations d'accroche.\nPlans mensuels (Regular, Pro, Creative Partner) quand le test montre ce qui marche.\nCampagne pour les lancements et les grands moments.\nToute offre au-dessus de 1 000 TND passe par un appel."],
    mk_s_def_goals: [
      "Publish 3 reels a week, the same reel on Instagram and TikTok.\nRun our own campaign: 15 TND a day for 14 days, then 450 to 900 TND a month.\nCost per conversation under 6 TND. One in 5 conversations qualifies. One in 3 qualified books a call.\nShow 4 to 5 case studies with real ad results by the end of November.\nOutbound: 4 meetings booked per 50 first touches.",
      "Publier 3 reels par semaine, le même reel sur Instagram et TikTok.\nLancer notre propre campagne : 15 TND par jour pendant 14 jours, puis 450 à 900 TND par mois.\nCoût par conversation sous 6 TND. Une conversation sur 5 est qualifiée. Une sur 3 qualifiées réserve un appel.\nMontrer 4 à 5 études de cas avec de vrais résultats pub d'ici fin novembre.\nProspection directe : 4 rendez-vous pour 50 premiers contacts."],
    mk_s_def_channels: [
      "Instagram: the main channel. Reels, DM the word TEST to start.\nTikTok: the same reels without the watermark. Check if ads are open to Tunisia.\nMeta ads: messages as the goal (Instagram DM and WhatsApp).\nLinkedIn and email: Gulf and Europe, a few touches a week.\nReferral partners and delivered clients: ask for 2 names after every project.",
      "Instagram : le canal principal. Des reels, écrire TEST en DM pour commencer.\nTikTok : les mêmes reels sans le filigrane. Vérifier si les pubs sont ouvertes à la Tunisie.\nPubs Meta : objectif messages (DM Instagram et WhatsApp).\nLinkedIn et e-mail : Golfe et Europe, quelques contacts par semaine.\nPartenaires et clients livrés : demander 2 noms après chaque projet."],
    mk_s_def_messages: [
      "Stop guessing. Test.\nTunisian brands pay for ads but guess the creative. We test it.\nProof over claims: real numbers from real ad accounts, or no numbers.\nHook in the first 2 seconds. One call to action: DM TEST.\nContent mix: 40% proof, 30% method, 20% behind the scenes, 10% founder.",
      "Stop guessing. Test.\nLes marques tunisiennes paient la pub mais devinent la création. Nous la testons.\nLa preuve avant les promesses : de vrais chiffres de vrais comptes pub, ou pas de chiffres.\nAccroche dans les 2 premières secondes. Un seul appel à l'action : DM TEST.\nMix de contenu : 40 % preuve, 30 % méthode, 20 % coulisses, 10 % fondateur."],
    // shared labels
    mk_ch_instagram: ["Instagram", "Instagram"], mk_ch_tiktok: ["TikTok", "TikTok"], mk_ch_linkedin: ["LinkedIn", "LinkedIn"], mk_ch_meta: ["Meta ads", "Pubs Meta"], mk_ch_other: ["Other", "Autre"],
    mk_month_n: ["{m}", "{m}"]
  });

  var CHANNELS = ["instagram", "tiktok", "linkedin"];
  var STRATEGY = ["positioning", "targets", "offers", "goals", "channels", "messages"];
  var TABS = ["strategy", "content", "ads", "showcase", "insights"];
  var K = { TABS: TABS, CHANNELS: CHANNELS, tabs: {}, STRATEGY: STRATEGY };

  // ---------- data ----------
  function raw() { var c = S.config() || {}; return c.marketing || {}; }
  /** A copy of config.marketing with every list present. */
  K.data = function () {
    var d = u.clone(raw()) || {};
    d.strategy = d.strategy || {};
    ["posts", "ads", "showcase", "followers"].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    return d;
  };
  /** save(fn): fn changes a copy of the data; the copy goes back into config. */
  K.save = function (fn) {
    var d = K.data(); fn(d);
    var r = S.setConfig({ marketing: d });
    return r !== null;
  };
  K.canEdit = function () { return m.can("ideas"); };
  K.money = function () { return m.isFounder(); };
  K.id = function () { return u.uid("mk"); };
  K.num = function (id) { var v = parseFloat(String(u.val(id)).replace(",", ".")); return isFinite(v) && v > 0 ? v : 0; };
  K.chLabel = function (c) { return t("mk_ch_" + c); };
  K.opts = function (list, prefix) { return list.map(function (k) { return [k, t(prefix + k)]; }); };
  K.mlabel = function (ym) {
    var dt = new Date(ym + "-15T12:00:00");
    return dt.toLocaleDateString(u.fr() ? "fr-FR" : "en-GB", { month: "short" });
  };
  K.lastMonths = function (n) {
    var out = [], d = new Date(); d.setDate(15);
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 15, 12); out.push(u.iso(x).slice(0, 7)); }
    return out;
  };
  K.link = function (url) {
    var s = String(url || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
  };
  K.linkHTML = function (url) {
    var h = K.link(url);
    return h ? '<a class="mk-link" href="' + esc(h) + '" target="_blank" rel="noopener noreferrer">' + ui.icon("globe", "sm") + "<span>" + esc(h.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32)) + "</span></a>" : "";
  };
  /** Modal with a save button and, when editing, a delete button that asks first (no browser dialog). */
  K.formModal = function (o) {
    var foot = '<div class="mk-foot-main">' + ui.btn(t("mk_cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), o.save, { cls: "primary", data: o.data }) + "</div>";
    if (o.del) {
      foot = '<div class="mk-foot-main" id="mk-foot-main">' + ui.btn(t("mk_del"), "mk-del-ask", { cls: "ghost" }) + '<span class="mk-sp"></span>' + ui.btn(t("mk_cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), o.save, { cls: "primary", data: o.data }) + "</div>" +
        '<div class="mk-foot-ask" id="mk-foot-ask" hidden><span class="mk-q">' + esc(t("mk_del_q")) + '</span><span class="mk-sp"></span>' + ui.btn(t("mk_keep"), "mk-del-no", { cls: "ghost" }) + ui.btn(t("mk_del_yes"), o.del, { cls: "primary", data: o.data }) + "</div>";
    }
    ui.modal({ label: t("nav_marketing"), title: o.title, body: o.body, foot: foot });
  };
  GK.act("mk-del-ask", function () { var a = document.getElementById("mk-foot-main"), b = document.getElementById("mk-foot-ask"); if (a && b) { a.hidden = true; b.hidden = false; } });
  GK.act("mk-del-no", function () { var a = document.getElementById("mk-foot-main"), b = document.getElementById("mk-foot-ask"); if (a && b) { a.hidden = false; b.hidden = true; } });
  /** True when the click was on a real link inside a clickable card (let the link work, do not open the editor). */
  K.onLink = function (ev) { return !!(ev && ev.target && ev.target.closest && ev.target.closest("a")); };
  K.done = function () { ui.closeModal(true); ui.toast(t("saved")); };
  K.guard = function () { if (!K.canEdit()) { ui.toast(t("mk_no_perm")); return false; } return true; };
  K.btnEdit = function (label, a, data) { return ui.btn(label, a, { cls: "ghost sm", icon: "edit", data: data, disabled: !K.canEdit() }); };

  // ---------- Strategy tab ----------
  function stratText(k) {
    var s = raw().strategy || {};
    if (typeof s[k] === "string" && s[k].trim() !== "") return { text: s[k], own: true };
    return { text: t("mk_s_def_" + k), own: false };
  }
  function lines(txt) { return String(txt || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  K.tabs.strategy = function () {
    var h = '<div class="mk-strat">';
    STRATEGY.forEach(function (k, i) {
      var s = stratText(k);
      h += '<section class="mk-block' + (k === "positioning" ? " wide" : "") + '" style="--i:' + i + '"><div class="mk-block-h"><h3 class="lab">' + esc(t("mk_s_" + k)) + "</h3>" + K.btnEdit(t("mk_edit"), "mk-s-edit", { k: k }) + "</div>" +
        "<ul>" + lines(s.text).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" +
        "</section>";
    });
    return h + "</div>";
  };
  GK.act("mk-s-edit", function (el) {
    if (!K.guard()) return;
    var k = el.dataset.k;
    K.formModal({ title: t("mk_s_edit_t", { n: t("mk_s_" + k) }), save: "mk-s-save", data: { k: k },
      body: ui.field({ id: "mk-s-text", label: t("mk_s_" + k), type: "textarea", rows: 9, value: stratText(k).text, hint: t("mk_s_hint") }) });
  });
  GK.act("mk-s-save", function (el) {
    if (!K.guard()) return;
    var k = el.dataset.k, v = u.val("mk-s-text").trim();
    if (K.save(function (d) { if (v) d.strategy[k] = v; else delete d.strategy[k]; })) K.done();
  });

  // ---------- view ----------
  GK.view("marketing", {
    render: function (params) {
      var tab = TABS.indexOf(params.tab) > -1 ? params.tab : "strategy";
      var h = ui.head({ label: t("nav_marketing"), title: t("mk_title"), accent: t("mk_accent"), sub: esc(t("mk_sub")) });
      h += '<div class="mk-tabbar"><div class="tabs mk-tabs" role="tablist">' + TABS.map(function (k) {
        return '<button type="button" role="tab" data-a="mk-tab" data-v="' + k + '" aria-selected="' + (tab === k) + '">' + esc(t("mk_t_" + k)) + "</button>";
      }).join("") + "</div></div>";
      var body = "";
      try { body = K.tabs[tab] ? K.tabs[tab](params) : ""; } catch (e) { body = '<p class="err">' + esc(e && e.message) + "</p>"; }
      return h + '<div class="mk-pane" data-tab="' + tab + '">' + body + "</div>";
    }
  });
  GK.act("mk-tab", function (el) { ui.go("marketing", { tab: el.dataset.v }); });

  GK.mk = K;

  if (typeof document === "undefined") return;
  var css = document.createElement("style"); css.id = "gk-marketing-css";
  css.textContent =
    ".mk-tabbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:6px 0;margin-bottom:var(--sp-4)}.mk-tabs{overflow-x:auto;max-width:100%;flex-wrap:nowrap}.mk-tabs [role=tab]{white-space:nowrap}" +
    ".mk-pane{animation:mkIn .3s cubic-bezier(.2,.7,.2,1) both;min-width:0}" +
    ".mk-strat{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-4)}.mk-block{border:1px solid var(--line);border-top:3px solid var(--tx);padding:var(--sp-4);min-width:0;animation:mkIn .35s ease both;animation-delay:calc(var(--i) * 40ms)}" +
    ".mk-block.wide{grid-column:1/-1;background:var(--chroma);color:var(--b-ink);border-color:var(--chroma)}.mk-block:nth-child(3n+2):not(.wide){border-top-color:var(--gel)}" +
    ".mk-block-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.mk-block-h h3{margin:0}" +
    ".mk-block ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px}.mk-block li{line-height:1.4;overflow-wrap:anywhere}.mk-sug{margin:10px 0 0}" +
    ".mk-bar{display:flex;gap:var(--sp-3);align-items:center;flex-wrap:wrap;margin-bottom:var(--sp-4)}.mk-bar .mk-sp{flex:1}" +
    ".mk-sp{flex:1}.mk-foot-main,.mk-foot-ask{display:flex;gap:8px;align-items:center;width:100%;flex-wrap:wrap}.mk-foot-ask[hidden],.mk-foot-main[hidden]{display:none}.mk-q{font-weight:700}" +
    ".mk-cols{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:var(--sp-3);overflow-x:auto;padding-bottom:8px}" +
    ".mk-col{display:flex;flex-direction:column;gap:10px;min-width:0;border-top:3px solid var(--tx);padding-top:var(--sp-2)}.mk-col:nth-child(1){border-color:var(--gel)}.mk-col:nth-child(2){border-color:var(--chroma)}.mk-col:nth-child(5){border-color:var(--line)}" +
    ".mk-col-h{display:flex;justify-content:space-between;align-items:center}.mk-card{display:flex;flex-direction:column;gap:6px;text-align:left;padding:12px;border:1px solid var(--line);background:var(--bg);cursor:pointer;transition:border-color .18s,transform .18s;animation:mkIn .35s both}" +
    ".mk-card:hover,.mk-card:focus-visible{border-color:var(--tx);transform:translateY(-2px)}.mk-card .t{font-weight:700;font-size:15px;overflow-wrap:anywhere}.mk-card .row{gap:6px;flex-wrap:wrap}.mk-meta{font-size:12.5px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
    ".mk-link{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;text-decoration:underline;overflow-wrap:anywhere}.mk-link .ic{width:13px;height:13px}" +
    ".mk-table{overflow-x:auto;border:1px solid var(--line);margin-bottom:var(--sp-4)}.mk-table table{width:100%;border-collapse:collapse;font-size:14px}.mk-table th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--tx);font-size:11px;white-space:nowrap}" +
    ".mk-table td{padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}.mk-table tbody tr[data-a]{cursor:pointer}.mk-table tbody tr[data-a]:hover{background:var(--chroma)}.mk-table td.r,.mk-table th.r{text-align:right}.mk-table td.w{white-space:normal;min-width:180px}" +
    ".mk-month{margin:var(--sp-4) 0 8px}.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-3)}" +
    ".mk-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mk-note-m{border-left:3px solid var(--chroma);padding-left:10px;margin:0}" +
    ".mk-show{background:var(--chroma);color:var(--b-ink);padding:2px 6px;font-family:var(--f-type);font-size:11px;letter-spacing:0;text-transform:none}.mk-quote{font-weight:700;font-size:16px;margin:0}" +
    ".mk-charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-4);margin-top:var(--sp-4)}.mk-charts>*{min-width:0;margin:0}" +
    "@keyframes mkIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.mk-pane,.mk-block,.mk-card{animation:none!important}.mk-card:hover{transform:none}}" +
    "@media (max-width:900px){.mk-charts{grid-template-columns:1fr}}" +
    "@media (max-width:700px){.mk-strat{grid-template-columns:1fr}.mk-cols{grid-template-columns:repeat(5,78vw)}.mk-res{grid-template-columns:repeat(2,minmax(0,1fr))}}";
  document.head.appendChild(css);
})(window.GK);
