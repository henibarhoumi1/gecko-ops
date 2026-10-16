/* GECKO Ops · module: studio (ideas -> concepts -> scripts -> ready). Board + hook bank here; idea detail in studio_detail.js */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    st_title: ["Ideas and", "Idées et"], st_accent: ["scripts", "scripts"],
    st_sub: ["Capture an idea in five seconds, shape it, get the owner's go, send it to the project.", "Notez une idée en cinq secondes, travaillez-la, obtenez le feu vert du fondateur, envoyez-la au projet."],
    st_board: ["Board", "Tableau"], st_bank: ["Hook bank", "Banque d'accroches"], st_scripts: ["Script bank", "Banque de scripts"],
    st_sb_sub: ["Every written script, ready to copy or reuse for a new client.", "Tous les scripts écrits, prêts à copier ou réutiliser pour un nouveau client."],
    st_sb_none: ["No written scripts yet. Scripts appear here once they have lines.", "Aucun script écrit. Ils apparaissent ici dès qu'ils ont des lignes."],
    st_sb_copy: ["Copy script", "Copier le script"], st_sb_reuse: ["Reuse", "Réutiliser"], st_sb_won: ["Winning hook", "Accroche gagnante"],
    st_sb_copied: ["Script copied", "Script copié"], st_sb_reused: ["Copy made. Edit it for the new brand.", "Copie créée. Adaptez-la à la nouvelle marque."], st_sb_copy_of: ["{t} (copy)", "{t} (copie)"], st_new: ["New idea", "Nouvelle idée"],
    st_stage_idea: ["Idea", "Idée"], st_stage_concept: ["Concept", "Concept"], st_stage_script: ["Script", "Script"],
    st_stage_ready: ["Ready", "Prêt"], st_stage_shot: ["Shot", "Tourné"], st_stage_parked: ["Parked", "En pause"],
    st_k_play: ["In play", "En cours"], st_k_review: ["Waiting for the owner", "Attend le fondateur"], st_k_ready: ["Ready to send", "Prêtes à envoyer"], st_k_shot: ["Shot", "Tournées"],
    st_k_play_n: ["ideas not parked or shot", "idées ni en pause ni tournées"],
    st_f_client: ["Client", "Client"], st_f_owner: ["Owner", "Responsable"], st_f_angle: ["Angle", "Angle"], st_f_search: ["Search", "Recherche"],
    st_f_all_clients: ["All clients", "Tous les clients"], st_f_all_owners: ["Everyone", "Tout le monde"], st_f_all_angles: ["All angles", "Tous les angles"],
    st_f_ph: ["Title, hook or tag", "Titre, accroche ou tag"], st_f_clear: ["Clear filters", "Effacer les filtres"],
    st_q_title: ["Quick idea", "Idée rapide"], st_q_ph: ["What if we…", "Et si on…"], st_q_client: ["Client (optional)", "Client (facultatif)"], st_q_add: ["Capture", "Noter"],
    st_no_client: ["No client yet", "Pas encore de client"], st_no_hook: ["No hook yet", "Pas encore d'accroche"],
    st_col_empty: ["Nothing here.", "Rien ici."], st_nothing: ["No ideas match.", "Aucune idée ne correspond."],
    st_parked_show: ["Show parked ({n})", "Voir les idées en pause ({n})"], st_parked_hide: ["Hide parked ({n})", "Masquer les idées en pause ({n})"],
    st_p1: ["High", "Haute"], st_p2: ["Medium", "Moyenne"], st_p3: ["Low", "Basse"], st_priority: ["Priority", "Priorité"],
    st_links_n: ["{n} links", "{n} liens"], st_link_1: ["1 link", "1 lien"], st_board_pill: ["Whiteboard", "Tableau blanc"],
    st_review_wait: ["Waiting for the owner", "En attente du fondateur"], st_shared_pill: ["Shown to client", "Visible client"],
    st_direct: ["Direct", "Direct"], st_indirect: ["Indirect", "Indirect"],
    st_back: ["Back", "Retour"], st_next_to: ["To {s}", "Vers {s}"], st_mark_ready: ["Mark ready", "Marquer prêt"], st_mark_shot: ["Mark shot", "Marquer tourné"],
    st_request: ["Request review", "Demander la relecture"], st_cancel_request: ["Withdraw request", "Retirer la demande"],
    st_park: ["Park", "Mettre en pause"], st_unpark: ["Bring back", "Reprendre"],
    st_g_hook: ["Add the hook line first.", "Ajoutez d'abord l'accroche."], st_g_script: ["Add a script first (scenes or text).", "Ajoutez d'abord un script (scènes ou texte)."],
    st_g_client: ["Pick a client first.", "Choisissez d'abord un client."],
    st_g_angle: ["Add a creative angle.", "Ajoutez un angle créatif."],
    st_g_objective: ["Add the objective.", "Ajoutez l'objectif."], st_g_audience: ["Describe the audience.", "Décrivez l'audience."],
    st_g_concept: ["Explain the concept.", "Expliquez le concept."], st_g_format: ["Choose a valid format.", "Choisissez un format valide."],
    st_g_scene: ["Add a scene with a visual and voice/text, or mark it silent / B-roll.", "Ajoutez une scène avec un visuel et une voix/texte, ou indiquez qu'elle est silencieuse / en plans de coupe."],
    st_g_offer: ["Add the offer for this offer-led idea.", "Ajoutez l'offre pour cette idée promotionnelle."],
    st_g_objection: ["Describe the objection this idea answers.", "Décrivez l'objection à laquelle répond cette idée."],
    st_g_proof: ["Add the proof used by this idea.", "Ajoutez la preuve utilisée par cette idée."],
    st_g_cta: ["Add a call to action for this idea.", "Ajoutez un appel à l'action pour cette idée."],
    st_brief: ["Creative brief", "Brief créatif"], st_objective: ["Objective", "Objectif"], st_audience: ["Audience", "Audience"],
    st_creative_type: ["Creative type", "Type de création"], st_type_offer: ["Offer-led", "Offre"], st_type_objection: ["Objection-led", "Objection"],
    st_type_proof: ["Proof-led", "Preuve"], st_type_brand: ["Brand / story", "Marque / histoire"],
    st_offer: ["Offer", "Offre"], st_objection: ["Objection", "Objection"], st_proof: ["Proof points", "Preuves"], st_cta: ["Call to action", "Appel à l'action"],
    st_silent: ["Silent / B-roll (no dialogue or on-screen text)", "Silencieux / plans de coupe (sans dialogue ni texte à l'écran)"],
    st_approve_revision: ["Approve new revision", "Valider la nouvelle version"], st_approved_revision: ["Approved revision", "Version validée"],
    st_revision_n: ["Revision {n} · {d}", "Version {n} · {d}"], st_no_revision: ["Approve a complete idea before sending it to production.", "Validez une idée complète avant de l'envoyer en production."],
    st_revision_ready: ["Approved material is ready to send. Draft edits do not change it.", "Le contenu validé est prêt à envoyer. Les modifications du brouillon ne le changent pas."],
    st_founder_only: ["Only the owner marks an idea ready. Request review instead.", "Seul le fondateur marque une idée prête. Demandez plutôt la relecture."],
    st_no_rights: ["You can't change ideas here.", "Vous ne pouvez pas modifier les idées ici."],
    st_shot_auto: ["Shot happens by itself once every hook of the reel is approved.", "Tourné se met à jour tout seul quand toutes les accroches du reel sont validées."],
    st_log_add: ["Idea added", "Idée ajoutée"], st_log_move: ["Moved to {s}", "Passée en {s}"], st_log_review: ["Review requested", "Relecture demandée"],
    st_log_park: ["Parked", "Mise en pause"], st_log_unpark: ["Brought back", "Reprise"],
    st_moved: ["Moved to {s}", "Passée en {s}"], st_added: ["Idea captured", "Idée notée"], st_review_sent: ["The owner will see it", "Le fondateur la verra"],
    st_col_hook: ["Hook", "Accroche"], st_col_client: ["Client", "Client"], st_col_angle: ["Angle", "Angle"], st_col_stage: ["Stage", "Étape"],
    st_col_prio: ["Priority", "Priorité"], st_col_won: ["Won before", "Déjà gagné"],
    st_copy_hook: ["Copy hook", "Copier l'accroche"], st_won_n: ["{n} won", "{n} gagnées"], st_won_none: ["None yet", "Aucune"],
    st_won_title: ["Hooks that already won", "Accroches déjà gagnantes"], st_won_note: ["Inspiration from past results. Not a rule: write a new one.", "De l'inspiration tirée des résultats. Pas une règle : écrivez-en une nouvelle."],
    st_won_for: ["for {brand}", "pour {brand}"], st_cpp: ["cost per purchase", "coût par achat"], st_won_empty: ["No results logged yet.", "Aucun résultat enregistré pour l'instant."],
    st_sort: ["Sort by {c}", "Trier par {c}"],
    st_nodata: ["No ideas yet.", "Pas encore d'idées."],
    st_new_title: ["New", "Nouvelle"], st_new_accent: ["idea", "idée"], st_hook: ["Hook line", "Accroche"]
  });

  var STAGES = ["idea", "concept", "script", "ready", "shot"];
  var IDEA_DOT = { idea: "", concept: "dot-blue", script: "dot-pink", ready: "dot-yellow", shot: "dot-green" };
  var ORDER = { idea: 0, concept: 1, script: 2, ready: 3, shot: 4, parked: 5 };
  function can() { return m.can("ideas"); }
  function isUrl(s) { return /^https?:\/\/\S+$/i.test(String(s || "").trim()); }
  function stName(s) { return t("st_stage_" + s); }

  // ---------- helpers shared with studio_detail.js ----------
  function linkedReel(i) {
    if (!i.reelId) return null;
    var ps = i.projectId && m.project(i.projectId) ? [m.project(i.projectId)] : [];
    ps = ps.concat(S.all("projects"));
    for (var k = 0; k < ps.length; k++) {
      var r = (ps[k].reels || []).find(function (x) { return x.id === i.reelId; });
      if (r) return { p: ps[k], r: r };
    }
    return null;
  }
  /** Stage as shown: a ready idea whose reel has every hook approved counts as shot (computed, never written). */
  function effStage(i) {
    if (i.stage === "parked") return "parked";
    if (i.stage === "ready") {
      var lr = linkedReel(i);
      if (lr && (lr.r.hooks || []).length && lr.r.hooks.every(function (h) { return h.status === "approved"; })) return "shot";
    }
    return STAGES.indexOf(i.stage) > -1 ? i.stage : "idea";
  }
  function hasScript(i) {
    return !!(String(i.script || "").trim() || (i.scenes || []).some(function (s) { return String(s.v || "").trim() || String(s.x || "").trim(); }));
  }
  function angleText(i) {
    if (String(i.angle || "").trim()) return String(i.angle).trim();
    var p = i.projectId && m.project(i.projectId);
    var a = p && (p.angles || []).find(function (x) { return x.id === i.angleId; });
    return a ? String(a.name || "").trim() : "";
  }
  function creativeType(i) {
    return ["offer", "objection", "proof", "brand"].indexOf(i.creativeType) > -1 ? i.creativeType : "brand";
  }
  function usableScene(s) {
    return !!(s && typeof s === "object" && String(s.v || "").trim() &&
      (String(s.x || "").trim() || s.silent === true));
  }
  function readyGaps(i) {
    var g = [];
    if (!i.clientId || !m.client(i.clientId)) g.push(t("st_g_client"));
    if (!angleText(i)) g.push(t("st_g_angle"));
    if (!String(i.objective || "").trim()) g.push(t("st_g_objective"));
    if (!String(i.audience || "").trim()) g.push(t("st_g_audience"));
    if (!String(i.concept || "").trim()) g.push(t("st_g_concept"));
    if (!String(i.hook || "").trim()) g.push(t("st_g_hook"));
    if (m.FORMATS.indexOf(i.format) < 0) g.push(t("st_g_format"));
    if (!(Array.isArray(i.scenes) && i.scenes.some(usableScene))) g.push(t("st_g_scene"));
    var kind = creativeType(i);
    if (kind === "offer" && !String(i.offer || "").trim()) g.push(t("st_g_offer"));
    if (kind === "objection" && !String(i.objection || "").trim()) g.push(t("st_g_objection"));
    if ((kind === "proof" || kind === "objection") && !String(i.proof || "").trim()) g.push(t("st_g_proof"));
    if (kind !== "brand" && !String(i.cta || "").trim()) g.push(t("st_g_cta"));
    return g;
  }
  function approvedRevisions(i) {
    return (Array.isArray(i && i.revisions) ? i.revisions : []).filter(function (r) {
      return r && typeof r.id === "string" && r.snapshot && typeof r.snapshot === "object";
    });
  }
  function selectedRevision(i, id) {
    var list = approvedRevisions(i), key = id || i && (i.selectedRevisionId || i.approvedRevisionId);
    return list.find(function (r) { return r.id === key; }) || list[list.length - 1] || null;
  }
  function snapshotIdea(i, revisionId) {
    var scenes = (Array.isArray(i.scenes) ? i.scenes : []).filter(function (s) { return s && typeof s === "object"; }).map(function (s) {
      return { id: String(s.id || u.uid("sc")), v: String(s.v || ""), x: String(s.x || ""), s: Math.max(0, +s.s || 0), silent: s.silent === true };
    });
    return {
      id: revisionId, approvedOn: u.today(), title: String(i.title || ""),
      clientId: String(i.clientId || ""), angle: angleText(i), angleId: String(i.angleId || ""),
      creativeType: creativeType(i),
      brief: {
        objective: String(i.objective || ""), audience: String(i.audience || ""),
        offer: String(i.offer || ""), objection: String(i.objection || ""),
        proof: String(i.proof || ""), cta: String(i.cta || "")
      },
      concept: String(i.concept || ""), hook: String(i.hook || ""), script: String(i.script || ""),
      scenes: scenes, mode: i.mode === "I" ? "I" : "D", format: String(i.format || ""),
      refs: (Array.isArray(i.refs) ? i.refs : []).filter(function (r) { return r && typeof r === "object"; }).map(function (r) {
        return { label: String(r.label || ""), url: String(r.url || "") };
      })
    };
  }
  function approveCurrent(id) {
    var i = S.get("ideas", id); if (!i || !can() || !m.isFounder()) return null;
    var gaps = readyGaps(i); if (gaps.length) { ui.toast(gaps[0]); return null; }
    var revisionId = u.uid("cr"), snapshot = snapshotIdea(i, revisionId);
    var revisions = approvedRevisions(i).slice();
    revisions.push({ id: revisionId, approvedOn: snapshot.approvedOn, snapshot: snapshot });
    var scenes = snapshot.scenes.map(function (s) { return { id: s.id, v: s.v, x: s.x, s: s.s, silent: s.silent }; });
    return S.patch("ideas", id, {
      stage: "ready", reviewAsked: false, scenes: scenes,
      revisions: revisions, approvedRevisionId: revisionId, selectedRevisionId: revisionId
    }, { log: t("st_log_move", { s: stName("ready") }) });
  }
  function words(s) { return (String(s || "").trim().match(/\S+/g) || []).length; }
  /** Spoken time: words of voice lines and free script, 2.5 words a second. */
  function speakSeconds(i) {
    var w = words(i.script) + u.sum(i.scenes || [], function (s) { return words(s.x); });
    return Math.round(w / 2.5);
  }
  function sceneSeconds(i) { return u.sum(i.scenes || [], function (s) { return +s.s || 0; }); }
  function angleOf(i) { return String(i.angle || "").trim(); }
  function modeName(md) { return md === "I" ? t("st_indirect") : t("st_direct"); }
  /** Past results for hooks, best first (cost per purchase low, else click rate). */
  function winners(clientId, n) {
    var all = [];
    try { all = GK.x && GK.x.hooks ? GK.x.hooks() : []; } catch (e) { all = []; }
    all = all.filter(function (h) { return !clientId || h.project.clientId === clientId; });
    all.sort(function (a, b) { return (a.cpp && b.cpp) ? a.cpp - b.cpp : (a.cpp ? -1 : b.cpp ? 1 : b.ctr - a.ctr); });
    return n ? all.slice(0, n) : all;
  }
  function prioPill(i) { var p = +i.priority || 2; return ui.pill(t("st_p" + p), p === 1 ? "alert" : p === 2 ? "wip" : ""); }
  function ownerName(i) { return i.owner ? m.member(i.owner).name : "—"; }
  function waitingOn(i) { return i.stage === "script" && !!i.reviewAsked; }

  function patchIdea(id, ch, log) { return S.patch("ideas", id, ch, log ? { log: log } : undefined); }

  function moveTo(id, to) {
    var i = S.get("ideas", id); if (!i) return false;
    if (!can()) { ui.toast(t("st_no_rights")); return false; }
    var from = effStage(i);
    if (!m.isFounder()) {
      if (to === "ready" || to === "shot" || from === "ready" || from === "shot") { ui.toast(t("st_founder_only")); return false; }
    }
    if (to === "ready") {
      if (!approveCurrent(id)) return false;
      ui.toast(t("st_moved", { s: stName(to) }));
      return true;
    }
    var ch = { stage: to, reviewAsked: false };
    patchIdea(id, ch, t("st_log_move", { s: stName(to) }));
    ui.toast(t("st_moved", { s: stName(to) }));
    return true;
  }
  function requestReview(id) {
    var i = S.get("ideas", id); if (!i || !can()) return;
    if (!i.reviewAsked) { var g = readyGaps(i); if (g.length) return ui.toast(g[0]); }
    patchIdea(id, { reviewAsked: !i.reviewAsked }, i.reviewAsked ? "" : t("st_log_review"));
    if (!i.reviewAsked) ui.toast(t("st_review_sent"));
  }
  function park(id) {
    var i = S.get("ideas", id); if (!i || !can()) return ui.toast(t("st_no_rights"));
    if (i.stage === "parked") patchIdea(id, { stage: ["idea", "concept", "script"].indexOf(i.parkedFrom) > -1 ? i.parkedFrom : "idea", reviewAsked: false }, t("st_log_unpark"));
    else {
      if (!m.isFounder() && (i.stage === "ready" || i.stage === "shot")) return ui.toast(t("st_founder_only"));
      patchIdea(id, { stage: "parked", parkedFrom: i.stage, reviewAsked: false }, t("st_log_park"));
    }
  }

  /** Buttons that move an idea one step. Same rules on card and in detail. */
  function stepBtns(i, size) {
    if (!can()) return "";
    var es = effStage(i), h = "", cls = size || "sm";
    if (es === "parked") return ui.btn(t("st_unpark"), "st-park", { cls: cls, data: { id: i.id } });
    var idx = STAGES.indexOf(es), f = m.isFounder();
    var lockedBack = !f && (es === "ready" || es === "shot");
    if (idx > 0 && !lockedBack) {
      if (es === "shot" && i.stage === "ready") h += ui.btn(t("st_back"), "st-nop", { cls: "ghost " + cls, disabled: true, title: t("st_shot_auto") });
      else h += ui.btn(t("st_back"), "st-move", { cls: "ghost " + cls, data: { id: i.id, to: STAGES[idx - 1] } });
    }
    if (idx < STAGES.length - 1) {
      var nx = STAGES[idx + 1];
      if (nx === "ready") {
        if (f) { var g = readyGaps(i); h += ui.btn(t("st_mark_ready"), "st-move", { cls: "primary " + cls, data: { id: i.id, to: "ready" }, disabled: !!g.length, title: g[0] || "" }); }
        else if (i.reviewAsked) h += ui.btn(t("st_cancel_request"), "st-review", { cls: "ghost " + cls, data: { id: i.id } });
        else h += ui.btn(t("st_request"), "st-review", { cls: "primary " + cls, data: { id: i.id } });
      } else if (nx === "shot") {
        if (f) h += ui.btn(t("st_mark_shot"), "st-move", { cls: "ghost " + cls, data: { id: i.id, to: "shot" } });
      } else h += ui.btn(t("st_next_to", { s: stName(nx) }), "st-move", { cls: "primary " + cls, data: { id: i.id, to: nx } });
    }
    return h;
  }

  // ---------- filters ----------
  function filters(params) { return { c: params.fc || "", o: params.fo || "", a: params.fa || "", q: String(params.fq || "").trim().toLowerCase() }; }
  function anyFilter(f) { return !!(f.c || f.o || f.a || f.q); }
  function pass(i, f) {
    if (f.c && i.clientId !== f.c) return false;
    if (f.o && i.owner !== f.o) return false;
    if (f.a && angleOf(i).toLowerCase() !== f.a.toLowerCase()) return false;
    if (f.q) {
      var hay = [i.title, i.hook, i.concept, angleOf(i), (i.tags || []).join(" "), m.brand(i.clientId)].join(" ").toLowerCase();
      if (hay.indexOf(f.q) < 0) return false;
    }
    return true;
  }
  function filterRow(params, f) {
    var clients = S.all("clients").sort(u.by("brand"));
    var owners = S.all("team").sort(u.by("name"));
    var angles = {}; S.all("ideas").forEach(function (i) { var a = angleOf(i); if (a) angles[a.toLowerCase()] = a; });
    var aOpts = Object.keys(angles).sort().map(function (k) { return [angles[k], angles[k]]; });
    return '<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));align-items:end">' +
      ui.field({ id: "st-fc", label: t("st_f_client"), type: "select", value: f.c, options: [["", t("st_f_all_clients")]].concat(clients.map(function (c) { return [c.id, c.brand]; })), attrs: ' data-c="st-filter" data-k="fc"' }) +
      ui.field({ id: "st-fo", label: t("st_f_owner"), type: "select", value: f.o, options: [["", t("st_f_all_owners")]].concat(owners.map(function (o) { return [o.id, o.name]; })), attrs: ' data-c="st-filter" data-k="fo"' }) +
      ui.field({ id: "st-fa", label: t("st_f_angle"), type: "select", value: f.a, options: [["", t("st_f_all_angles")]].concat(aOpts), attrs: ' data-c="st-filter" data-k="fa"' }) +
      ui.field({ id: "st-fq", label: t("st_f_search"), value: params.fq || "", placeholder: t("st_f_ph"), attrs: ' data-c="st-filter" data-k="fq"' }) +
      "</div>" + (anyFilter(f) ? "<div>" + ui.btn(t("st_f_clear"), "st-clear", { cls: "ghost sm" }) + "</div>" : "");
  }

  // ---------- board ----------
  function cardHTML(i) {
    var nl = (i.refs || []).length, bd = i.boardId && S.get("boards", i.boardId);
    var own = i.owner ? m.member(i.owner) : null;
    var h = '<div class="card" tabindex="0" data-a="st-open"' + ui.attrs({ id: i.id }) + ">" +
      '<span class="lab sm muted">' + esc(i.clientId && m.client(i.clientId) ? m.brand(i.clientId) : t("st_no_client")) + "</span>" +
      '<span class="t">' + esc(i.title || "—") + "</span>" +
      (angleOf(i) ? '<span class="m">' + esc(angleOf(i)) + " · " + esc(i.mode === "I" ? "I" : "D") + "</span>" : "") +
      (i.hook ? '<span class="m">“' + esc(i.hook) + "”</span>" : '<span class="m faint">' + esc(t("st_no_hook")) + "</span>") +
      '<div class="row" style="gap:6px">' + (own ? ui.av(own.name, "gel") : "") + prioPill(i) +
      (nl ? ui.pill(nl === 1 ? t("st_link_1") : t("st_links_n", { n: nl })) : "") +
      (bd ? ui.pill(t("st_board_pill"), "wip") : "") +
      (waitingOn(i) ? ui.pill(t("st_review_wait"), "alert") : "") +
      (i.shareOk ? ui.pill(t("st_shared_pill")) : "") + "</div>";
    var b = stepBtns(i, "sm");
    if (b) h += '<div class="row" style="gap:6px">' + b + "</div>";
    return h + "</div>";
  }
  function quickAdd(f) {
    var clients = S.all("clients").sort(u.by("brand"));
    return '<div class="stack" style="gap:6px;border:1px solid var(--line);padding:10px">' +
      '<label class="lab sm" for="st-q-title">' + esc(t("st_q_title")) + "</label>" +
      '<input class="in" id="st-q-title" autocomplete="off" placeholder="' + esc(t("st_q_ph")) + '">' +
      '<select class="in" id="st-q-client" aria-label="' + esc(t("st_q_client")) + '"><option value="">' + esc(t("st_q_client")) + "</option>" +
      clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f.c === c.id ? " selected" : "") + ">" + esc(c.brand) + "</option>"; }).join("") + "</select>" +
      ui.btn(t("st_q_add"), "st-quick", { cls: "primary sm" }) + "</div>";
  }
  function boardHTML(ideas, f, params) {
    var parked = ideas.filter(function (i) { return i.stage === "parked"; });
    var h = '<div class="board" style="grid-auto-columns:minmax(232px,1fr)">' + STAGES.map(function (s) {
      var items = ideas.filter(function (i) { return effStage(i) === s; })
        .sort(function (a, b) { return ((+a.priority || 2) - (+b.priority || 2)) || String(b.created || "").localeCompare(String(a.created || "")); });
      return '<section class="col" aria-label="' + esc(stName(s)) + '"><div class="col-h"><h3 class="sec">' + ui.dot(IDEA_DOT[s]) + esc(stName(s)) + '</h3><span class="small muted num">' + items.length + "</span></div>" +
        (s === "idea" && can() ? quickAdd(f) : "") +
        (items.length ? items.map(cardHTML).join("") : '<p class="empty">' + esc(t("st_col_empty")) + "</p>") + "</section>";
    }).join("") + "</div>";
    if (parked.length) {
      var open = !!params.parkedOpen;
      h += '<div class="stack" style="gap:8px"><div>' + ui.btn(t(open ? "st_parked_hide" : "st_parked_show", { n: parked.length }), "st-parked", { cls: "ghost sm" }) + "</div>" +
        (open ? '<div class="list">' + parked.map(function (i) {
          return '<div class="li click" tabindex="0" data-a="st-open"' + ui.attrs({ id: i.id }) + ' style="flex-wrap:wrap"><div class="stack" style="gap:2px;flex:1 1 220px"><span>' + esc(i.title) + '</span><span class="m">' +
            esc(m.brand(i.clientId)) + (i.hook ? " · “" + esc(i.hook) + "”" : "") + "</span></div>" + stepBtns(i, "sm") + "</div>";
        }).join("") + "</div>" : "") + "</div>";
    }
    return h;
  }

  // ---------- hook bank ----------
  function winnersPanel(clientId) {
    var list = winners(clientId, 5);
    var brand = clientId ? m.brand(clientId) : "";
    return '<section class="panel"><div class="stack" style="gap:2px"><h3 class="sec" style="margin:0">' + esc(t("st_won_title")) + (brand ? " " + esc(t("st_won_for", { brand: brand })) : "") + '</h3><span class="small muted">' + esc(t("st_won_note")) + "</span></div>" +
      (list.length ? '<div class="list">' + list.map(function (h) {
        return '<div class="li" style="flex-wrap:wrap"><div class="stack" style="gap:2px;flex:1 1 220px"><span>“' + esc(h.text) + '”</span><span class="m">' +
          esc(m.brand(h.project.clientId)) + " · " + esc(h.angle) + (h.cpp ? " · " + esc(u.dec(h.cpp)) + " TND " + esc(t("st_cpp")) : "") + "</span></div>" +
          ui.btn(t("copy"), "st-copy-text", { cls: "ghost sm", data: { text: h.text } }) + "</div>";
      }).join("") + "</div>" : ui.empty(t("st_won_empty"))) + "</section>";
  }
  function bankHTML(ideas, f, params) {
    var key = params.sort || "prio", dir = params.dir === "desc" ? "desc" : "asc";
    var K = {
      hook: function (i) { return String(i.hook || "").toLowerCase() || "￿"; },
      client: function (i) { return m.brand(i.clientId).toLowerCase(); },
      angle: function (i) { return angleOf(i).toLowerCase() || "￿"; },
      stage: function (i) { return ORDER[effStage(i)]; },
      prio: function (i) { return +i.priority || 2; }
    };
    var rows = ideas.slice().sort(u.by(K[key] || K.prio, dir));
    var wonCache = {};
    function won(cid) { return wonCache[cid] || (wonCache[cid] = winners(cid, 0)); }
    function th(k, lab) {
      var on = key === k;
      return '<th scope="col" aria-sort="' + (on ? (dir === "asc" ? "ascending" : "descending") : "none") + '"><button type="button" class="link" data-a="st-sort" data-k="' + k + '" title="' + esc(t("st_sort", { c: lab })) + '">' + esc(lab) + (on ? (dir === "asc" ? " ↑" : " ↓") : "") + "</button></th>";
    }
    return winnersPanel(f.c) + '<div class="panel"><div class="tbl"><table><thead><tr>' + th("hook", t("st_col_hook")) + th("client", t("st_col_client")) + th("angle", t("st_col_angle")) + th("stage", t("st_col_stage")) + th("prio", t("st_col_prio")) +
      "<th>" + esc(t("st_col_won")) + "</th><th></th></tr></thead><tbody>" +
      rows.map(function (i) {
        var w = i.clientId ? won(i.clientId) : [], es = effStage(i);
        return '<tr class="click" tabindex="0" data-a="st-open"' + ui.attrs({ id: i.id }) + '><td style="min-width:220px">' +
          (i.hook ? "“" + esc(i.hook) + "”" : '<span class="faint">' + esc(t("st_no_hook")) + "</span>") + '<br><span class="small muted">' + esc(i.title) + "</span></td>" +
          "<td>" + esc(i.clientId ? m.brand(i.clientId) : "—") + "</td><td>" + esc(angleOf(i) || "—") + "</td>" +
          "<td>" + ui.chip(stName(es), es) + "</td><td>" + prioPill(i) + "</td>" +
          "<td style=\"min-width:160px\">" + (w.length ? ui.pill(t("st_won_n", { n: w.length }), "wip") + '<br><span class="small muted">“' + esc(w[0].text) + "”</span>" : '<span class="small faint">' + esc(t("st_won_none")) + "</span>") + "</td>" +
          "<td>" + (i.hook ? ui.btn(t("st_copy_hook"), "st-copy-hook", { cls: "ghost sm", data: { id: i.id } }) : "") + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  }

  // ---------- script bank ----------
  function scriptText(i) {
    var out = [];
    if (i.hook) out.push(i.hook);
    (i.scenes || []).forEach(function (s, k) {
      out.push((k + 1) + ". " + (s.v || "") + (s.x && !s.silent ? "\n   " + s.x : "") + (s.xd ? "\n   " + s.xd : ""));
    });
    if (String(i.script || "").trim()) out.push(String(i.script).trim());
    if (String(i.scriptDarija || "").trim()) out.push(String(i.scriptDarija).trim());
    return out.join("\n\n");
  }
  function scriptsHTML(ideas) {
    var rows = ideas.filter(hasScript).sort(u.by(function (i) { return ORDER[effStage(i)]; }, "desc"));
    if (!rows.length) return ui.empty(t("st_sb_none"));
    var wonCache = {};
    function isWon(i) {
      var w = wonCache[i.clientId || ""] || (wonCache[i.clientId || ""] = winners(i.clientId, 0));
      var hk = String(i.hook || "").trim().toLowerCase();
      return !!hk && w.slice(0, 5).some(function (h) { return String(h.text || "").trim().toLowerCase() === hk; });
    }
    return '<p class="small muted" style="margin:0">' + esc(t("st_sb_sub")) + '</p><div class="st-sbank">' + rows.map(function (i) {
      var first = (i.scenes || []).map(function (s) { return s.x || s.v; }).filter(Boolean).slice(0, 2);
      if (!first.length) first = String(i.script || "").split("\n").filter(function (l) { return l.trim(); }).slice(0, 2);
      return '<article class="panel st-sb-card"><div class="row between" style="gap:var(--sp-2);flex-wrap:wrap"><b>' + esc(i.hook ? "“" + i.hook + "”" : i.title) + "</b>" +
        (isWon(i) ? ui.pill(t("st_sb_won"), "wip") : "") + "</div>" +
        '<span class="small muted">' + esc([i.clientId ? m.brand(i.clientId) : "", angleOf(i), stName(effStage(i))].filter(Boolean).join(" · ")) + "</span>" +
        '<div class="st-sb-lines small">' + first.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div>" +
        '<div class="row" style="gap:var(--sp-2);flex-wrap:wrap">' + ui.btn(t("open"), "st-open", { cls: "ghost sm", data: { id: i.id } }) +
        ui.btn(t("st_sb_copy"), "st-sb-copy", { cls: "ghost sm", data: { id: i.id } }) +
        (can() ? ui.btn(t("st_sb_reuse"), "st-sb-reuse", { cls: "ghost sm", data: { id: i.id } }) : "") + "</div></article>";
    }).join("") + "</div>";
  }

  function myWaiting() {
    var me = GK.me();
    return S.all("ideas").filter(function (i) {
      if (i.stage === "parked") return false;
      if (m.isFounder()) return (i.stage === "ready" && !i.reelId) || waitingOn(i);
      return !!me && i.owner === me.id && ["idea", "concept", "script"].indexOf(i.stage) > -1 && !i.reviewAsked;
    }).length;
  }

  GK.view("studio", {
    render: function (params) {
      if (params.id && S.get("ideas", params.id)) return GK.studio.detail(S.get("ideas", params.id), params);
      var mode = ["bank", "scripts"].indexOf(params.mode) > -1 ? params.mode : "board";
      var all = S.all("ideas"), f = filters(params);
      var ideas = all.filter(function (i) { return pass(i, f); });
      var live = all.filter(function (i) { return i.stage !== "parked" && effStage(i) !== "shot"; });
      var h = ui.head({
        label: t("nav_studio"), title: t("st_title"), accent: t("st_accent"), sub: esc(t("st_sub")),
        actions: can() ? ui.btn(t("st_new"), "st-new", { cls: "primary" }) : ""
      });
      h += GK.insight.studio();
      h += '<div class="row between"><div class="tabs" role="tablist">' + ["board", "scripts", "bank"].map(function (v) {
        return '<button type="button" role="tab" data-a="st-mode" data-v="' + v + '" aria-selected="' + (mode === v) + '">' + esc(t("st_" + v)) + "</button>";
      }).join("") + "</div>" + ui.sample() + "</div>";
      h += filterRow(params, f);
      if (!all.length && !can()) return h + ui.empty(t("st_nodata"));
      h += mode === "scripts" ? scriptsHTML(ideas) : mode === "bank" ? (ideas.length ? bankHTML(ideas, f, params) : winnersPanel(f.c) + ui.empty(t("st_nothing"))) : boardHTML(ideas, f, params);
      return h;
    },
    count: function () { return myWaiting() || ""; }
  });

  // ---------- actions ----------
  function newIdea(title, clientId, hook) {
    var me = GK.me(), c = clientId && m.client(clientId) ? clientId : "";
    return S.put("ideas", {
      title: title, stage: "idea", clientId: c, projectId: "", angleId: "", angle: "", objective: "", audience: "", creativeType: "brand",
      offer: "", objection: "", proof: "", cta: "", hook: hook || "", concept: "", script: "", scenes: [], mode: "D", format: "9x16",
      refs: [], boardId: "", owner: me ? me.id : "", tags: [], priority: 2, reelId: "", created: u.today(), shareOk: false, reviewAsked: false, notes: ""
    }, { log: t("st_log_add") });
  }
  GK.act("st-quick", function () {
    if (!can()) return ui.toast(t("st_no_rights"));
    var title = u.val("st-q-title").trim();
    if (!title) { u.focus("st-q-title"); return ui.toast(t("required")); }
    document.getElementById("st-q-title").value = "";
    newIdea(title, u.val("st-q-client"));
    ui.toast(t("st_added"));
    setTimeout(function () { var e = document.getElementById("st-q-title"); if (e) e.focus(); }, 0);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target && ev.target.id === "st-q-title") { ev.preventDefault(); var b = document.querySelector('[data-a="st-quick"]'); if (b) { b.focus(); b.click(); } }
  });
  GK.act("st-new", function () {
    var clients = S.all("clients").sort(u.by("brand")), f = filters(ui.p("studio"));
    ui.modal({
      title: t("st_new_title"), accent: t("st_new_accent"), label: t("nav_studio"),
      body: ui.field({ id: "st-n-title", label: t("st_q_title"), placeholder: t("st_q_ph") }) +
        '<div class="form">' + ui.field({ id: "st-n-client", label: t("st_f_client"), type: "select", value: f.c, options: [["", "—"]].concat(clients.map(function (c) { return [c.id, c.brand]; })) }) + "</div>" +
        ui.field({ id: "st-n-hook", label: t("st_hook") }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("st_q_add"), "st-do-new", { cls: "primary" })
    });
  });
  GK.act("st-do-new", function () {
    var title = u.val("st-n-title").trim();
    if (!title) { u.focus("st-n-title"); return ui.toast(t("required")); }
    var rec = newIdea(title, u.val("st-n-client"), u.val("st-n-hook").trim());
    ui.closeModal(true); ui.toast(t("st_added"));
    ui.go("studio", { id: rec.id });
  });
  function saveFirst(id) { if (GK.studio.collect && ui.p("studio").id === id) GK.studio.collect(id); }
  GK.act("st-open", function (el) { ui.go("studio", { id: el.dataset.id }); });
  GK.act("st-nop", function () {});
  GK.act("st-move", function (el) { saveFirst(el.dataset.id); moveTo(el.dataset.id, el.dataset.to); });
  GK.act("st-review", function (el) { saveFirst(el.dataset.id); requestReview(el.dataset.id); });
  GK.act("st-park", function (el) { saveFirst(el.dataset.id); park(el.dataset.id); });
  GK.act("st-sb-copy", function (el) { var i = S.get("ideas", el.dataset.id); if (i) { u.copy(scriptText(i)); ui.toast(t("st_sb_copied")); } });
  GK.act("st-sb-reuse", function (el) {
    var i = S.get("ideas", el.dataset.id); if (!i || !can()) return;
    var rec = newIdea(t("st_sb_copy_of", { t: i.title }), "", i.hook);
    var sc = u.clone(i.scenes || []).map(function (s) { delete s.img; (s.shots || []).forEach(function (x) { x.done = false; x.id = u.uid("sh"); }); return s; });
    S.patch("ideas", rec.id, { stage: "script", scenes: sc, script: i.script || "", scriptDarija: i.scriptDarija || "", concept: i.concept || "", angle: angleOf(i), mode: i.mode, format: i.format || "9x16", cta: i.cta || "" }, { log: "" });
    ui.toast(t("st_sb_reused")); ui.go("studio", { id: rec.id });
  });
  GK.act("st-mode", function (el) { ui.go("studio", { mode: el.dataset.v, id: "" }); });
  GK.act("st-parked", function () { ui.go("studio", { parkedOpen: !ui.p("studio").parkedOpen }); });
  GK.act("st-clear", function () { ui.go("studio", { fc: "", fo: "", fa: "", fq: "" }); });
  GK.act("st-sort", function (el) {
    var p = ui.p("studio"), k = el.dataset.k;
    ui.go("studio", { sort: k, dir: (p.sort || "prio") === k && p.dir !== "desc" ? "desc" : "asc" });
  });
  GK.change("st-filter", function (el) { var o = {}; o[el.dataset.k] = el.value; ui.go("studio", o); });
  GK.act("st-copy-hook", function (el) {
    var i = S.get("ideas", el.dataset.id); if (!i || !i.hook) return;
    u.copy(i.hook).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
  GK.act("st-copy-text", function (el) { u.copy(el.dataset.text || "").then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); }); });

  GK.studio = {
    readyCount: function () { return S.all("ideas").filter(function (i) { return i.stage === "ready" && !i.reelId; }).length; },
    openIdea: function (id) { ui.go("studio", { id: id }); },
    h: {
      STAGES: STAGES, can: can, isUrl: isUrl, stName: stName, effStage: effStage, linkedReel: linkedReel, hasScript: hasScript,
      readyGaps: readyGaps, approvedRevisions: approvedRevisions, selectedRevision: selectedRevision,
      snapshotIdea: snapshotIdea, approveCurrent: approveCurrent, creativeType: creativeType, angleText: angleText, words: words,
      speakSeconds: speakSeconds, sceneSeconds: sceneSeconds, modeName: modeName, winners: winners, prioPill: prioPill, ownerName: ownerName, patchIdea: patchIdea,
      stepBtns: stepBtns, moveTo: moveTo, waitingOn: waitingOn, angleOf: angleOf, winnersPanel: winnersPanel
    }
  };
  var css = document.createElement("style"); css.id = "gk-studio-bank-css";
  css.textContent = ".st-sbank{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-3)}" +
    ".st-sb-card{display:flex;flex-direction:column;gap:var(--sp-2);min-width:0}.st-sb-lines p{margin:0 0 4px;color:var(--soft,inherit)}";
  document.head.appendChild(css);
})(window.GK);
