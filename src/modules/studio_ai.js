/* GECKO Ops · module: studio_ai. "Write with AI" on a script, free for now:
   1. Ideas: Gemini (free API tier) brainstorms hooks and concepts from the brief.
   2. Script: Claude has no free API, so the app builds the prompt to paste into a Claude subscription, and the script is pasted back.
   3. Darija: Gemini rewrites every line in Tunisian Darija, line for line.
   The Gemini key is kept in this browser only (never synced to the team data). Free-tier text may be used by Google, so no confidential client details. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, SH = GK.studio;
  var K = { key: "gecko-ai-gemini-key", model: "gecko-ai-gemini-model", letters: "gecko-ai-darija-letters" };
  var DEFAULT_MODEL = "gemini-flash-latest";

  GK.i18n.add({
    ai_title: ["Write with AI", "Écrire avec l'IA"],
    ai_sub: ["Free: ideas and Darija come from Gemini, the script from your Claude subscription.", "Gratuit : les idées et la darija viennent de Gemini, le script de votre abonnement Claude."],
    ai_s1: ["1. Ideas", "1. Idées"], ai_s2: ["2. Script", "2. Script"], ai_s3: ["3. Darija", "3. Darija"],
    ai_note: ["Anything to steer the ideas (optional)", "Une indication pour les idées (facultatif)"],
    ai_note_ph: ["e.g. mums of 3 to 8 year olds, funny, no price", "ex. mamans d'enfants de 3 à 8 ans, drôle, sans prix"],
    ai_brainstorm: ["Get 5 ideas", "Obtenir 5 idées"], ai_use: ["Use", "Utiliser"], ai_used: ["Hook and concept filled in", "Accroche et concept remplis"],
    ai_copy: ["Copy prompt for Claude", "Copier le prompt pour Claude"], ai_copied: ["Copied. Paste it in Claude, then paste the script back here.", "Copié. Collez-le dans Claude, puis recollez le script ici."],
    ai_paste: ["Script from Claude", "Script de Claude"], ai_paste_ph: ["Paste Claude's answer here", "Collez la réponse de Claude ici"],
    ai_apply: ["Use this script", "Utiliser ce script"], ai_applied: ["Script filled in: {n} scenes, {l} lines", "Script rempli : {n} scènes, {l} lignes"],
    ai_apply_none: ["Paste the script first.", "Collez d'abord le script."],
    ai_darija: ["Write the Darija version", "Écrire la version darija"], ai_darija_done: ["Darija added to {n} lines", "Darija ajoutée à {n} lignes"],
    ai_letters: ["Darija written in", "Darija écrite en"], ai_l_ar: ["Arabic letters", "Lettres arabes"], ai_l_lat: ["Latin letters (3arbi)", "Lettres latines (3arbi)"],
    ai_no_lines: ["The script has no lines yet.", "Le script n'a pas encore de lignes."],
    ai_settings: ["AI settings on this device", "Réglages IA sur cet appareil"],
    ai_key: ["Gemini API key", "Clé API Gemini"], ai_key_hint: ["Free from aistudio.google.com (Get API key). Saved in this browser only.", "Gratuite sur aistudio.google.com (Get API key). Enregistrée dans ce navigateur uniquement."],
    ai_model: ["Gemini model", "Modèle Gemini"], ai_save: ["Save", "Enregistrer"], ai_saved: ["Saved on this device", "Enregistré sur cet appareil"],
    ai_need_key: ["Add a free Gemini key in AI settings first.", "Ajoutez d'abord une clé Gemini gratuite dans les réglages IA."],
    ai_privacy: ["Google may use what you send on the free tier. Leave out private client details and numbers.", "Google peut utiliser ce que vous envoyez en version gratuite. N'y mettez pas d'informations privées du client ni de chiffres."],
    ai_working: ["Asking Gemini…", "Demande à Gemini…"],
    ai_err: ["Gemini didn't answer: {e}", "Gemini n'a pas répondu : {e}"],
    ai_no_rights: ["You can read this script but not change it.", "Vous pouvez lire ce script mais pas le modifier."]
  });

  // ---------- settings (this browser only) ----------
  function get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

  // ---------- Gemini ----------
  function gemini(prompt) {
    var key = get(K.key, ""), model = get(K.model, DEFAULT_MODEL);
    if (!key) return Promise.reject(new Error(t("ai_need_key")));
    return fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.9 } })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
        var txt = j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).map(function (p) { return p.text || ""; }).join("");
        if (!txt) throw new Error("empty answer");
        return JSON.parse(txt.replace(/^```(json)?|```$/g, "").trim());
      });
    });
  }

  // ---------- prompts ----------
  function brief(i) {
    var p = i.projectId && m.project(i.projectId), pk = p ? m.pack(p.pack) : null;
    var rows = [
      ["Brand", i.clientId ? m.brand(i.clientId) : ""], ["Video title", i.title], ["Angle", SH.h && SH.h.angleOf ? SH.h.angleOf(i) : i.angle],
      ["Audience", i.audience], ["Objective", i.objective], ["Offer", i.offer], ["Objection to answer", i.objection], ["Proof", i.proof],
      ["Call to action", i.cta], ["Current hook", i.hook], ["Current concept", i.concept], ["Format", i.format || "9x16"],
      ["Campaign", pk ? pk.name : ""]
    ];
    return rows.filter(function (r) { return r[1] && String(r[1]).trim(); }).map(function (r) { return "- " + r[0] + ": " + String(r[1]).trim(); }).join("\n");
  }
  function ideasPrompt(i, note) {
    return "You help Gecko, an ad creative studio in Tunisia, plan short vertical video ads (reels) that run as paid ads and get tested against each other.\n" +
      "Brief:\n" + brief(i) + (note ? "\nDirection from the director: " + note : "") + "\n\n" +
      "Give 5 different ideas. Each has a hook (the first line or first second that stops the scroll, under 12 words) and a concept (2 sentences: what happens on screen and why it sells). " +
      "Make them concrete and shootable in one day with one actor in Tunis. No slogans, no emojis.\n" +
      'Answer only JSON: {"ideas":[{"hook":"...","concept":"..."}]}';
  }
  function claudePrompt(i) {
    return "You are writing a short vertical video ad (a reel, 20 to 40 seconds) for Gecko, an ad creative studio in Tunisia. It will run as a paid ad on Instagram and TikTok and be tested against other versions.\n\n" +
      "Brief:\n" + brief(i) + "\n\n" +
      "Write the script in plain spoken English or French (it will be adapted to Tunisian Darija after). Short lines an actor can say in one breath. Open with the hook in the first second. End with one clear call to action. No slogans, no emojis, no stage directions inside the spoken lines.\n\n" +
      "Format: one scene per line, exactly like this, nothing else before or after:\n" +
      "SHOT: what the camera sees || SAY: what the actor says\n" +
      "For a scene with no dialogue, write SAY: -";
  }
  function darijaPrompt(lines, letters) {
    return "Rewrite each line below in Tunisian Darija (the dialect spoken in Tunis, not Modern Standard Arabic and not Moroccan), " +
      (letters === "latin" ? "written in Latin letters the way Tunisians text (3arbi, with numbers like 3, 7, 9 for Arabic sounds)" : "written in Arabic letters") +
      ". Keep the meaning, the energy and the length, so an actor can say it naturally in an ad. Keep brand names and prices as they are. " +
      "Return exactly one line for each input line, in the same order.\n" +
      'Input: ' + JSON.stringify({ lines: lines }) + '\nAnswer only JSON: {"lines":["..."]}';
  }

  // ---------- panel ----------
  var state = {}; // per idea: { ideas: [], busy: "" }
  function st(id) { return state[id] || (state[id] = { ideas: [], busy: "" }); }
  SH.aiPanel = function (i) {
    var can = SH.h && SH.h.can ? SH.h.can() : m.can("ideas"), s = st(i.id), D = can ? "" : " disabled";
    var letters = get(K.letters, "arabic"), hasKey = !!get(K.key, "");
    var h = '<section class="panel ai-panel"><div class="panel-h"><h2 class="sec" style="margin:0">' + esc(t("ai_title")) + "</h2></div>" +
      '<p class="small muted" style="margin:0">' + esc(t("ai_sub")) + "</p>";
    // 1. ideas
    h += '<div class="ai-step"><h3 class="sec">' + esc(t("ai_s1")) + "</h3>" +
      ui.field({ id: "ai-note-" + i.id, label: t("ai_note"), placeholder: t("ai_note_ph"), value: s.note || "", attrs: D }) +
      '<div class="row">' + ui.btn(s.busy === "ideas" ? t("ai_working") : t("ai_brainstorm"), "ai-ideas", { cls: "sm", data: { id: i.id }, disabled: !can || !!s.busy }) + "</div>" +
      (s.ideas.length ? '<div class="list">' + s.ideas.map(function (x, k) {
        return '<div class="li" style="align-items:flex-start;gap:12px"><div class="stack" style="gap:2px;flex:1;min-width:0"><b>' + esc(x.hook || "") + '</b><span class="small muted">' + esc(x.concept || "") + "</span></div>" +
          ui.btn(t("ai_use"), "ai-use", { cls: "ghost sm", data: { id: i.id, k: k }, disabled: !can }) + "</div>";
      }).join("") + "</div>" : "") + "</div>";
    // 2. script via Claude
    h += '<div class="ai-step"><h3 class="sec">' + esc(t("ai_s2")) + "</h3>" +
      '<div class="row">' + ui.btn(t("ai_copy"), "ai-copy", { cls: "sm", data: { id: i.id } }) + "</div>" +
      ui.field({ id: "ai-paste-" + i.id, label: t("ai_paste"), type: "textarea", rows: 4, placeholder: t("ai_paste_ph"), value: s.paste || "", attrs: D }) +
      '<div class="row">' + ui.btn(t("ai_apply"), "ai-apply", { cls: "sm", data: { id: i.id }, disabled: !can }) + "</div></div>";
    // 3. Darija
    h += '<div class="ai-step"><h3 class="sec">' + esc(t("ai_s3")) + "</h3>" +
      ui.field({ id: "ai-letters", label: t("ai_letters"), type: "select", value: letters, options: [["arabic", t("ai_l_ar")], ["latin", t("ai_l_lat")]], attrs: ' data-c="ai-letters"' }) +
      '<div class="row">' + ui.btn(s.busy === "darija" ? t("ai_working") : t("ai_darija"), "ai-darija", { cls: "sm", data: { id: i.id }, disabled: !can || !!s.busy }) + "</div></div>";
    // settings
    h += '<details class="ai-set"' + (hasKey ? "" : " open") + "><summary class=\"small\">" + esc(t("ai_settings")) + "</summary>" +
      '<div class="form">' + ui.field({ id: "ai-key", label: t("ai_key"), type: "password", value: get(K.key, ""), hint: t("ai_key_hint"), attrs: ' autocomplete="off"' }) +
      ui.field({ id: "ai-model", label: t("ai_model"), value: get(K.model, DEFAULT_MODEL) }) + "</div>" +
      '<div class="row">' + ui.btn(t("ai_save"), "ai-save", { cls: "sm" }) + "</div></details>" +
      '<p class="small muted" style="margin:0">' + esc(t("ai_privacy")) + "</p></section>";
    return h;
  };

  // ---------- actions ----------
  function idea(id) { return S.get("ideas", id); }
  function saveForm(id) { if (SH.collect && ui.p("studio").id === id) SH.collect(id); return idea(id); }
  function keepInputs(id) { var s = st(id), n = document.getElementById("ai-note-" + id), p = document.getElementById("ai-paste-" + id); if (n) s.note = n.value; if (p) s.paste = p.value; }
  function canEdit() { return SH.h && SH.h.can ? SH.h.can() : m.can("ideas"); }

  GK.act("ai-save", function () {
    set(K.key, u.val("ai-key").trim()); set(K.model, u.val("ai-model").trim() || DEFAULT_MODEL);
    ui.toast(t("ai_saved")); ui.render(true);
  });
  GK.change("ai-letters", function (el) { set(K.letters, el.value); });

  GK.act("ai-ideas", function (el) {
    var id = el.dataset.id; if (!canEdit()) return ui.toast(t("ai_no_rights"));
    keepInputs(id); var i = saveForm(id), s = st(id); if (!i) return;
    s.busy = "ideas"; ui.render(true);
    gemini(ideasPrompt(i, s.note || "")).then(function (j) {
      s.ideas = (j.ideas || []).filter(function (x) { return x && (x.hook || x.concept); }).slice(0, 5);
    }).catch(function (e) { ui.toast(t("ai_err", { e: e.message })); }).then(function () { s.busy = ""; ui.render(true); });
  });
  GK.act("ai-use", function (el) {
    var id = el.dataset.id, x = st(id).ideas[+el.dataset.k]; if (!x || !canEdit()) return;
    keepInputs(id); saveForm(id);
    S.patch("ideas", id, { hook: x.hook || "", concept: x.concept || "" }, { log: "" });
    ui.toast(t("ai_used")); ui.render(true);
  });
  GK.act("ai-copy", function (el) {
    var id = el.dataset.id; keepInputs(id); var i = saveForm(id); if (!i) return;
    u.copy(claudePrompt(i)).then(function () { ui.toast(t("ai_copied")); });
  });
  /** Parse "SHOT: ... || SAY: ..." lines into scenes; anything else becomes free script text. */
  function parseScript(txt) {
    var scenes = [], free = [];
    String(txt || "").split(/\n+/).forEach(function (line) {
      var l = line.replace(/^\s*[-*\d.)]+\s*/, "").trim(); if (!l) return;
      var mm = l.match(/^SHOT\s*:\s*(.*?)\s*\|\|\s*SAY\s*:\s*(.*)$/i);
      if (mm) { var say = mm[2].trim(), silent = !say || say === "-"; scenes.push({ id: u.uid("sc"), v: mm[1].trim(), x: silent ? "" : say, s: 3, silent: silent }); }
      else free.push(l);
    });
    return { scenes: scenes, script: free.join("\n") };
  }
  GK.act("ai-apply", function (el) {
    var id = el.dataset.id; if (!canEdit()) return ui.toast(t("ai_no_rights"));
    keepInputs(id); var s = st(id), txt = (s.paste || "").trim();
    if (!txt) return ui.toast(t("ai_apply_none"));
    saveForm(id);
    var r = parseScript(txt);
    S.patch("ideas", id, r.scenes.length ? { scenes: r.scenes, script: r.script, scriptDarija: "" } : { script: r.script, scriptDarija: "" }, { log: "" });
    s.paste = "";
    ui.toast(t("ai_applied", { n: r.scenes.length, l: r.script ? r.script.split("\n").length : 0 })); ui.render(true);
  });
  GK.act("ai-darija", function (el) {
    var id = el.dataset.id; if (!canEdit()) return ui.toast(t("ai_no_rights"));
    keepInputs(id); var i = saveForm(id), s = st(id); if (!i) return;
    var sc = (i.scenes || []).map(function (x) { return x.silent ? "" : String(x.x || "").trim(); });
    var free = String(i.script || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var all = sc.filter(Boolean).concat(free);
    if (!all.length) return ui.toast(t("ai_no_lines"));
    s.busy = "darija"; ui.render(true);
    gemini(darijaPrompt(all, get(K.letters, "arabic"))).then(function (j) {
      var out = (j.lines || []).map(function (x) { return String(x || "").trim(); }), k = 0;
      var cur = idea(id); if (!cur) return;
      var scenes = (cur.scenes || []).map(function (x) {
        if (x.silent || !String(x.x || "").trim()) return x;
        return Object.assign({}, x, { xd: out[k++] || x.xd || "" });
      });
      var dj = free.map(function () { return out[k++] || ""; }).join("\n");
      S.patch("ideas", id, { scenes: scenes, scriptDarija: dj }, { log: "" });
      ui.toast(t("ai_darija_done", { n: Math.min(out.length, all.length) }));
    }).catch(function (e) { ui.toast(t("ai_err", { e: e.message })); }).then(function () { s.busy = ""; ui.render(true); });
  });

  GK.ai = { gemini: gemini, parseScript: parseScript, prompts: { ideas: ideasPrompt, claude: claudePrompt, darija: darijaPrompt } };

  var css = document.createElement("style"); css.id = "gk-studio-ai-css";
  css.textContent = ".ai-panel{display:flex;flex-direction:column;gap:var(--sp-4)}.ai-step{display:flex;flex-direction:column;gap:var(--sp-2);padding-top:var(--sp-3);border-top:1px solid var(--line)}" +
    ".ai-step .sec{margin:0}.ai-set summary{cursor:pointer;color:var(--tx-2)}.ai-set[open]{display:flex;flex-direction:column;gap:var(--sp-2)}";
  document.head.appendChild(css);
})(window.GK);
