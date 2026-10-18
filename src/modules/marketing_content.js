/* GECKO Ops · marketing: Content tab. Our own posts, idea to posted, with results after posting. Stored in config.marketing.posts. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, S = GK.store, esc = u.esc, K = GK.mk;

  GK.i18n.add({
    mk_c_new: ["New post", "Nouveau post"], mk_c_board: ["Board", "Tableau"], mk_c_list: ["By month", "Par mois"],
    mk_c_hint: ["Our own posts on Instagram, TikTok and LinkedIn. Move each one from idea to posted, then add the numbers.", "Nos propres posts sur Instagram, TikTok et LinkedIn. Faites avancer chacun de l'idée à publié, puis ajoutez les chiffres."],
    mk_st_idea: ["Idea", "Idée"], mk_st_scripted: ["Scripted", "Scénarisé"], mk_st_shot: ["Shot", "Tourné"], mk_st_edited: ["Edited", "Monté"], mk_st_posted: ["Posted", "Publié"],
    mk_fm_reel: ["Reel", "Reel"], mk_fm_carousel: ["Carousel", "Carrousel"], mk_fm_static: ["Static", "Image"], mk_fm_story: ["Story", "Story"],
    mk_c_title: ["Title", "Titre"], mk_c_title_ph: ["Hook or working title", "Accroche ou titre de travail"], mk_c_channel: ["Channel", "Canal"], mk_c_format: ["Format", "Format"],
    mk_c_date: ["Post date", "Date de publication"], mk_c_status: ["Status", "Statut"], mk_c_link: ["Link to the post", "Lien du post"], mk_c_notes: ["Notes", "Notes"],
    mk_c_pillar: ["Pillar", "Pilier"], mk_pl_none: ["None", "Aucun"], mk_pl_proof: ["Proof", "Preuve"], mk_pl_method: ["Method", "Méthode"], mk_pl_bts: ["Behind the scenes", "Coulisses"], mk_pl_founder: ["Founder", "Fondateur"],
    mk_c_results: ["Results after posting", "Résultats après publication"],
    mk_r_views: ["Views", "Vues"], mk_r_likes: ["Likes", "J'aime"], mk_r_saves: ["Saves", "Enregistrements"], mk_r_shares: ["Shares", "Partages"], mk_r_follows: ["New follows", "Nouveaux abonnés"], mk_r_dms: ["DMs", "DM"],
    mk_c_edit_t: ["Edit post", "Modifier le post"], mk_c_new_t: ["New post", "Nouveau post"],
    mk_c_empty_t: ["No posts yet", "Aucun post pour l'instant"], mk_c_empty_b: ["Add the first idea. Three reels a week is the plan.", "Ajoutez la première idée. Le plan : trois reels par semaine."],
    mk_c_nodate: ["No date yet", "Pas encore de date"], mk_c_next: ["Move to {s}", "Passer à {s}"], mk_c_untitled: ["Untitled post", "Post sans titre"],
    mk_c_th_date: ["Date", "Date"]
  });

  var STATUS = ["idea", "scripted", "shot", "edited", "posted"];
  var FORMATS = ["reel", "carousel", "static", "story"];
  var PILLARS = ["", "proof", "method", "bts", "founder"];
  var RES = ["views", "likes", "saves", "shares", "follows", "dms"];

  K.posts = function () { return K.data().posts; };
  K.interactions = function (p) { return (+p.likes || 0) + (+p.saves || 0) + (+p.shares || 0); };

  function card(p, i) {
    var si = STATUS.indexOf(p.status), nxt = STATUS[si + 1];
    return '<div class="mk-card" role="button" tabindex="0" data-a="mk-post-edit" data-id="' + esc(p.id) + '" style="animation-delay:' + Math.min(i, 8) * 30 + 'ms">' +
      '<span class="t">' + esc(p.title || t("mk_c_untitled")) + "</span>" +
      '<span class="mk-meta">' + ui.chip(K.chLabel(p.channel), p.channel) + '<span class="muted">' + esc(t("mk_fm_" + p.format)) + "</span>" + (p.date ? "<span>" + esc(u.fmtDate(p.date)) + "</span>" : "") + "</span>" +
      (p.status === "posted" && p.views ? '<span class="mk-meta"><b class="num">' + esc(GK.charts.compact(p.views)) + "</b> " + esc(t("mk_r_views").toLowerCase()) + " · <b class=\"num\">" + esc(K.interactions(p)) + "</b></span>" : "") +
      K.linkHTML(p.link) +
      (nxt && K.canEdit() ? '<span class="row"><button type="button" class="btn ghost sm" data-a="mk-post-move" data-id="' + esc(p.id) + '" title="' + esc(t("mk_c_next", { s: t("mk_st_" + nxt) })) + '">' + esc(t("mk_c_next", { s: t("mk_st_" + nxt) })) + "</button></span>" : "") + "</div>";
  }
  function board(posts) {
    return '<div class="mk-cols">' + STATUS.map(function (s) {
      var list = posts.filter(function (p) { return p.status === s; }).sort(function (a, b) { return String(a.date || "9999").localeCompare(String(b.date || "9999")); });
      return '<section class="mk-col" aria-label="' + esc(t("mk_st_" + s)) + '"><div class="mk-col-h"><h3 class="lab">' + esc(t("mk_st_" + s)) + '</h3><span class="pill">' + list.length + "</span></div>" + list.map(card).join("") + "</section>";
    }).join("") + "</div>";
  }
  function list(posts) {
    var groups = {}, keys = [];
    posts.slice().sort(function (a, b) { return String(b.date || "0000").localeCompare(String(a.date || "0000")); }).forEach(function (p) {
      var k = p.date ? u.month(p.date) : "none"; if (!groups[k]) { groups[k] = []; keys.push(k); } groups[k].push(p);
    });
    return keys.map(function (k) {
      var g = groups[k], posted = g.filter(function (p) { return p.status === "posted"; }).length;
      return '<h3 class="lab mk-month">' + esc(k === "none" ? t("mk_c_nodate") : u.fmtMonth(k)) + " · " + g.length + "</h3>" +
        '<div class="mk-table"><table><thead><tr><th>' + esc(t("mk_c_th_date")) + "</th><th>" + esc(t("mk_c_title")) + "</th><th>" + esc(t("mk_c_channel")) + "</th><th>" + esc(t("mk_c_format")) + "</th><th>" + esc(t("mk_c_status")) + "</th>" +
        RES.map(function (r) { return '<th class="r">' + esc(t("mk_r_" + r)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        g.map(function (p) {
          return '<tr data-a="mk-post-edit" data-id="' + esc(p.id) + '"><td>' + esc(u.fmtDate(p.date)) + '</td><td class="w">' + esc(p.title || t("mk_c_untitled")) + "</td><td>" + esc(K.chLabel(p.channel)) + "</td><td>" + esc(t("mk_fm_" + p.format)) + "</td><td>" + ui.pill(t("mk_st_" + p.status), p.status === "posted" ? "done" : "") + "</td>" +
            RES.map(function (r) { return '<td class="r num">' + (p.status === "posted" && p[r] ? esc(p[r]) : esc(t("mk_dash"))) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }).join("");
  }

  K.tabs.content = function (params) {
    var layout = params.clayout === "list" ? "list" : "board", posts = K.posts();
    var h = '<div class="mk-bar"><p class="muted small" style="margin:0;flex:1;min-width:200px">' + esc(t("mk_c_hint")) + "</p>" +
      '<div class="tabs" role="tablist">' + [["board", "mk_c_board"], ["list", "mk_c_list"]].map(function (x) {
        return '<button type="button" role="tab" data-a="mk-c-layout" data-v="' + x[0] + '" aria-selected="' + (layout === x[0]) + '">' + esc(t(x[1])) + "</button>";
      }).join("") + "</div>" + ui.btn(t("mk_c_new"), "mk-post-new", { cls: "primary", icon: "plus", disabled: !K.canEdit(), title: K.canEdit() ? "" : t("mk_no_perm") }) + "</div>";
    if (!posts.length) return h + ui.empty({ title: t("mk_c_empty_t"), text: t("mk_c_empty_b"), action: K.canEdit() ? { label: t("mk_c_new"), a: "mk-post-new" } : null });
    return h + (layout === "list" ? list(posts) : board(posts));
  };
  GK.act("mk-c-layout", function (el) { ui.go("marketing", { tab: "content", clayout: el.dataset.v }); });

  function form(p) {
    return '<div class="form">' +
      ui.field({ id: "mk-p-title", label: t("mk_c_title"), value: p.title, placeholder: t("mk_c_title_ph"), span: true }) +
      ui.field({ id: "mk-p-channel", label: t("mk_c_channel"), type: "select", value: p.channel, options: K.CHANNELS.map(function (c) { return [c, K.chLabel(c)]; }) }) +
      ui.field({ id: "mk-p-format", label: t("mk_c_format"), type: "select", value: p.format, options: K.opts(FORMATS, "mk_fm_") }) +
      ui.field({ id: "mk-p-status", label: t("mk_c_status"), type: "select", value: p.status, options: K.opts(STATUS, "mk_st_") }) +
      ui.field({ id: "mk-p-date", label: t("mk_c_date"), type: "date", value: p.date }) +
      ui.field({ id: "mk-p-pillar", label: t("mk_c_pillar"), type: "select", value: p.pillar || "", options: PILLARS.map(function (x) { return [x, x ? t("mk_pl_" + x) : t("mk_pl_none")]; }) }) +
      ui.field({ id: "mk-p-link", label: t("mk_c_link"), value: p.link, placeholder: "https://" }) +
      ui.field({ id: "mk-p-notes", label: t("mk_c_notes"), type: "textarea", rows: 3, value: p.notes, span: true }) +
      '<h3 class="lab" style="grid-column:1/-1;margin:6px 0 0">' + esc(t("mk_c_results")) + "</h3>" +
      RES.map(function (r) { return ui.field({ id: "mk-p-" + r, label: t("mk_r_" + r), type: "number", value: p[r] || "" }); }).join("") + "</div>";
  }
  function open(p, isNew) {
    if (!K.guard()) return;
    K.formModal({ title: t(isNew ? "mk_c_new_t" : "mk_c_edit_t"), body: form(p), save: "mk-post-save", del: isNew ? "" : "mk-post-del", data: { id: p.id || "" } });
  }
  GK.act("mk-post-new", function () { open({ channel: "instagram", format: "reel", status: "idea", date: "" }, true); });
  GK.act("mk-post-edit", function (el, ev) {
    if (K.onLink(ev)) return;
    var p = K.posts().find(function (x) { return x.id === el.dataset.id; }); if (p) open(p, false);
  });
  GK.act("mk-post-move", function (el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (!K.guard()) return;
    K.save(function (d) { var p = d.posts.find(function (x) { return x.id === el.dataset.id; }); if (p) { var i = STATUS.indexOf(p.status); if (i < STATUS.length - 1) p.status = STATUS[i + 1]; if (p.status === "posted" && !p.date) p.date = u.today(); } });
  });
  GK.act("mk-post-save", function (el) {
    if (!K.guard()) return;
    var title = u.val("mk-p-title").trim();
    if (!title) { u.focus("mk-p-title"); return ui.toast(t("required")); }
    var rec = { title: title, channel: u.val("mk-p-channel"), format: u.val("mk-p-format"), status: u.val("mk-p-status"), date: u.val("mk-p-date"), pillar: u.val("mk-p-pillar"), link: u.val("mk-p-link").trim(), notes: u.val("mk-p-notes").trim() };
    RES.forEach(function (r) { rec[r] = K.num("mk-p-" + r); });
    var id = el.dataset.id;
    if (K.save(function (d) {
      var old = id ? d.posts.find(function (x) { return x.id === id; }) : null;
      if (old) Object.assign(old, rec); else d.posts.push(Object.assign({ id: K.id() }, rec));
    })) K.done();
  });
  GK.act("mk-post-del", function (el) {
    if (!K.guard()) return;
    if (K.save(function (d) { d.posts = d.posts.filter(function (x) { return x.id !== el.dataset.id; }); })) K.done();
  });
})(window.GK);
