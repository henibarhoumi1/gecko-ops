/* GECKO Ops · module: inbox
   Team chat: General plus one channel per active project. Unread counts per person (last read time per channel
   kept in this browser's localStorage), messages grouped by day, @mentions highlighted, link chips,
   Enter sends and Shift+Enter makes a new line. On a phone: the channel list, then the thread. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, TK = GK.tk;
  var SHOWN = 80;

  GK.i18n.add({
    ix_title: ["Inbox", "Messages"], ix_accent: ["", ""],
    ix_sub: ["{u} unread in {c} channels · {n} messages this week", "{u} non lus dans {c} canaux · {n} messages cette semaine"],
    ix_general: ["General", "Général"], ix_channels: ["Channels", "Canaux"], ix_find: ["Find a channel", "Trouver un canal"],
    ix_k_unread: ["Unread", "Non lus"], ix_k_unread_n: ["in {n} channels", "dans {n} canaux"], ix_k_unread_0: ["you're up to date", "vous êtes à jour"],
    ix_k_ment: ["Mentions of you, 7 days", "Mentions de vous, 7 jours"], ix_k_ment_n: ["latest {d}", "dernière : {d}"], ix_k_ment_0: ["no one called you", "personne ne vous a cité"],
    ix_k_week: ["Messages this week", "Messages cette semaine"], ix_k_week_n: ["{d} vs last week ({p})", "{d} par rapport à la semaine dernière ({p})"],
    ix_k_busy: ["Busiest channel, 7 days", "Canal le plus actif, 7 jours"], ix_k_busy_n: ["{n} messages", "{n} messages"],
    ix_unread_n: ["{n} unread", "{n} non lus"], ix_last: ["Last message {d}", "Dernier message {d}"], ix_no_msgs_yet: ["No messages yet", "Pas encore de message"],
    ix_jump: ["Open project", "Ouvrir le projet"], ix_back: ["Channels", "Canaux"],
    ix_write: ["Message {ch}", "Message à {ch}"], ix_send: ["Send", "Envoyer"],
    ix_hint: ["Enter sends · Shift+Enter for a new line · @name mentions someone", "Entrée envoie · Maj+Entrée pour aller à la ligne · @nom pour citer quelqu'un"],
    ix_empty: ["No messages here yet. Say hello.", "Pas encore de message ici. Lancez la discussion."],
    ix_older: ["Show older messages ({n} more)", "Voir les messages plus anciens ({n} de plus)"],
    ix_new: ["New", "Nouveau"], ix_you: ["you", "vous"], ix_yesterday: ["Yesterday", "Hier"],
    ix_no_right: ["You can read messages but not send them.", "Vous pouvez lire mais pas écrire."],
    ix_del: ["Delete message", "Supprimer le message"], ix_del_q: ["Delete this message?", "Supprimer ce message ?"], ix_del_b: ["It disappears for everyone.", "Il disparaît pour tout le monde."],
    ix_deleted: ["Message deleted", "Message supprimé"], ix_sent: ["Sent", "Envoyé"],
    ix_members: ["{n} people wrote here", "{n} personnes ont écrit ici"], ix_one_member: ["1 person wrote here", "1 personne a écrit ici"],
    ix_no_match: ["No channel matches.", "Aucun canal ne correspond."]
  });

  TK.css("gk-inbox-css", [
    ".ix-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}",
    ".ix-list{display:flex;flex-direction:column;gap:2px;padding:12px;max-height:min(72vh,760px);overflow-y:auto}",
    ".ix-list .field{margin-bottom:8px}",
    ".ix-ch{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:8px 10px;border-radius:12px;min-width:0}",
    ".ix-ch:hover{background:var(--s2,var(--line-2))}",
    ".ix-ch[aria-current=\"true\"]{background:var(--chroma-soft,var(--line))}",
    ".ix-ch:focus-visible,.ix-a:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}",
    ".ix-ch .nm{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx-2,var(--ink-2))}",
    ".ix-ch.unread .nm{color:var(--tx,var(--ink));font-weight:600}",
    ".ix-ch .lm{grid-column:1/-1;font-size:12px;color:var(--tx-3,var(--ink-3));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ix-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--chroma);color:var(--bounce,var(--bg));font-size:11px;font-weight:600;display:inline-grid;place-items:center;font-variant-numeric:tabular-nums}",
    ".ix-thread{display:flex;flex-direction:column;gap:0;padding:0;min-width:0;overflow:hidden}",
    ".ix-th-h{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line)}",
    ".ix-th-h h2{margin:0;font-size:16px;font-weight:600;overflow-wrap:anywhere}",
    ".ix-msgs{display:flex;flex-direction:column;padding:0 18px 12px;max-height:min(58vh,620px);min-height:240px;overflow-y:auto}",
    ".ix-msg{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:2px 10px;padding:6px 0;align-items:start}",
    ".ix-msg.cont{padding-top:0}",
    ".ix-msg .hd{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}",
    ".ix-msg .hd b{font-size:13px;font-weight:600}",
    ".ix-msg .hd span{font-size:11px;color:var(--tx-3,var(--ink-3));font-variant-numeric:tabular-nums}",
    ".ix-msg .bd{grid-column:2;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--tx,var(--ink))}",
    ".ix-msg.me .bd{color:var(--tx,var(--ink))}",
    ".ix-at{color:var(--chroma);font-weight:600}",
    ".ix-at.me{background:var(--gel-soft,var(--gel));color:var(--tx,var(--ink));border-radius:6px;padding:0 3px}",
    ".ix-msg.mentions-me{background:var(--gel-soft,transparent);border-radius:12px;margin:0 -8px;padding-left:8px;padding-right:8px}",
    ".ix-links{grid-column:2;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}",
    ".ix-a{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 10px;border-radius:999px;border:1px solid var(--line-2,var(--line));background:var(--s2,transparent);color:var(--tx,var(--ink));font-size:12px;text-decoration:none;min-width:0}",
    ".ix-a .ic{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;color:var(--chroma)}",
    ".ix-a b{font-weight:600}.ix-a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx-3,var(--ink-3))}",
    ".ix-x{all:unset;cursor:pointer;font-size:11px;color:var(--tx-3,var(--ink-3));padding:2px 6px;border-radius:6px;opacity:0}",
    ".ix-msg:hover .ix-x,.ix-x:focus-visible{opacity:1}.ix-x:focus-visible{outline:2px solid var(--chroma)}",
    ".ix-new{display:flex;align-items:center;gap:8px;color:var(--gel-deep,var(--ink));font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:8px 0}",
    ".ix-new::after{content:\"\";flex:1;border-top:1px solid var(--gel-deep,var(--gel))}",
    ".ix-comp{display:flex;flex-direction:column;gap:6px;padding:12px 18px 16px;border-top:1px solid var(--line)}",
    ".ix-comp-r{display:flex;gap:8px;align-items:flex-end}",
    ".ix-comp textarea{flex:1;min-width:0;resize:vertical;min-height:44px;max-height:200px}",
    ".ix-more{all:unset;cursor:pointer;align-self:center;font-size:12px;color:var(--chroma);padding:10px}",
    ".ix-more:focus-visible{outline:2px solid var(--chroma)}",
    ".ix-backb{display:none}",
    "@media (max-width:860px){.ix-wrap{grid-template-columns:minmax(0,1fr)}.ix-wrap.has-ch .ix-list{display:none}.ix-wrap:not(.has-ch) .ix-thread{display:none}.ix-backb{display:inline-flex}.ix-list{max-height:none}.ix-msgs{max-height:62vh;padding:0 12px 12px}.ix-th-h,.ix-comp{padding-left:12px;padding-right:12px}}"
  ].join("\n"));

  function P() { return ui.p("inbox"); }
  function me() { return TK.me(); }
  function narrow() { try { return !!(window.matchMedia && window.matchMedia("(max-width: 860px)").matches); } catch (e) { return false; } }
  function readKey() { return "gecko-ops-ix-read-" + S.mode + "-" + (me().id || "x"); }
  function readMap() { var o = u.lsGet(readKey(), null); return o && typeof o === "object" ? o : {}; }
  function baseline() { return u.addDays(u.today(), -2) + "T00:00"; }
  function lastRead(map, ch) { return map[ch] || baseline(); }
  function chLabel(id) { if (id === "general") return t("ix_general"); var p = m.project(id); return p ? m.projectLabel(p) : id; }

  function channels() {
    var msgs = S.all("msgs"), last = {};
    msgs.forEach(function (x) { if (!last[x.ch] || x.at > last[x.ch].at) last[x.ch] = x; });
    var list = [{ id: "general", label: t("ix_general"), proj: null }].concat(TK.activeProjects().map(function (p) { return { id: p.id, label: m.projectLabel(p), proj: p }; }));
    list.forEach(function (c) { c.last = last[c.id] || null; });
    var gen = list.shift();
    list.sort(function (a, b) { var A = a.last ? a.last.at : "", B = b.last ? b.last.at : ""; return A < B ? 1 : A > B ? -1 : a.label.localeCompare(b.label); });
    return [gen].concat(list);
  }
  function unreadIn(ch, map, msgs) {
    var my = me().id, lr = lastRead(map, ch);
    return (msgs || S.all("msgs")).filter(function (x) { return x.ch === ch && x.who !== my && x.at > lr; }).length;
  }
  function mentionNames() {
    var o = {}; S.all("team").forEach(function (x) { var f = String(x.name || "").trim().split(/\s+/)[0]; if (f) o[f.toLowerCase()] = x.id; });
    o.all = "*"; o.everyone = "*"; o.tous = "*";
    return o;
  }
  function mentionsMe(text, names) {
    var my = me().id, re = /@([A-Za-zÀ-ÖØ-öø-ÿ0-9_-]+)/g, mm;
    while ((mm = re.exec(text || ""))) { var id = names[mm[1].toLowerCase()]; if (id && (id === my || id === "*")) return true; }
    return false;
  }
  /** Escaped message text with @mentions wrapped, plus the list of links found. */
  function format(text, names) {
    var my = me().id, out = "", links = [], re = /(https?:\/\/[^\s<>"']+)|@([A-Za-zÀ-ÖØ-öø-ÿ0-9_-]+)/g, last = 0, mm;
    text = String(text || "");
    while ((mm = re.exec(text))) {
      out += esc(text.slice(last, mm.index));
      if (mm[1]) {
        var url = mm[1].replace(/[.,!?;:)\]]+$/, "");
        out += esc(url) + esc(mm[1].slice(url.length));
        if (links.indexOf(url) < 0) links.push(url);
      } else {
        var id = names[mm[2].toLowerCase()];
        out += id ? '<span class="ix-at' + (id === my || id === "*" ? " me" : "") + '">' + esc(mm[0]) + "</span>" : esc(mm[0]);
      }
      last = mm.index + mm[0].length;
    }
    return { html: out + esc(text.slice(last)), links: links };
  }
  function chip(url) {
    var host = url, path = "";
    try { var x = new URL(url); host = x.hostname.replace(/^www\./, ""); path = (x.pathname + x.search).replace(/\/$/, ""); } catch (e) {}
    return '<a class="ix-a" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + ui.icon("link") + "<b>" + esc(host) + "</b>" + (path ? "<span>" + esc(path.length > 32 ? path.slice(0, 31) + "…" : path) + "</span>" : "") + "</a>";
  }
  function time(at) { return String(at || "").slice(11, 16); }
  function rel(at) {
    var d = String(at || "").slice(0, 10), td = u.today();
    if (d === td) return time(at);
    if (d === u.addDays(td, -1)) return t("ix_yesterday");
    return u.fmtDate(d);
  }

  // ---------- pieces ----------
  function insight() {
    var msgs = S.all("msgs"), my = me(), names = mentionNames(), map = readMap(), td = u.today();
    var chs = channels(), un = 0, unCh = 0;
    chs.forEach(function (c) { var n = unreadIn(c.id, map, msgs); un += n; if (n) unCh++; });
    var w0 = u.addDays(td, -6), p0 = u.addDays(td, -13);
    var week = msgs.filter(function (x) { return x.at.slice(0, 10) >= w0; }), prev = msgs.filter(function (x) { return x.at.slice(0, 10) >= p0 && x.at.slice(0, 10) < w0; });
    var ment = week.filter(function (x) { return x.who !== my.id && mentionsMe(x.text, names); }).sort(u.by("at", "desc"));
    var per = {}; week.forEach(function (x) { per[x.ch] = (per[x.ch] || 0) + 1; });
    var busy = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; })[0];
    var diff = week.length - prev.length;
    var spark = []; for (var i = 6; i >= 0; i--) { var d = u.addDays(td, -i); spark.push(msgs.filter(function (x) { return x.at.slice(0, 10) === d; }).length); }
    return TK.kpis([
      { label: t("ix_k_unread"), value: un, note: un ? t("ix_k_unread_n", { n: unCh }) : t("ix_k_unread_0") },
      { label: t("ix_k_ment"), value: ment.length, note: ment.length ? t("ix_k_ment_n", { d: rel(ment[0].at) + " · " + chLabel(ment[0].ch) }) : t("ix_k_ment_0") },
      { label: t("ix_k_week"), value: week.length, delta: prev.length ? Math.round(diff / prev.length * 100) : null, deltaLabel: t("ix_k_week_n", { d: (diff > 0 ? "+" : diff < 0 ? "−" : "±") + Math.abs(diff), p: prev.length }), spark: spark },
      { label: t("ix_k_busy"), value: busy ? chLabel(busy) : "—", note: busy ? t("ix_k_busy_n", { n: per[busy] }) : "" }
    ]);
  }
  function listHTML(chs, sel, open, map, msgs) {
    return '<nav class="panel ix-list" aria-label="' + esc(t("ix_channels")) + '">' +
      '<div class="field"><label for="ix-find">' + esc(t("ix_find")) + '</label><input id="ix-find" type="search" data-i="ix-find" autocomplete="off" value="' + esc(P().find || "") + '"></div>' +
      chs.map(function (c) {
        var n = c.id === sel && open ? 0 : unreadIn(c.id, map, msgs);
        var lm = c.last ? m.member(c.last.who).name + ": " + String(c.last.text).replace(/\s+/g, " ").slice(0, 70) : t("ix_no_msgs_yet");
        var hide = P().find && c.label.toLowerCase().indexOf(String(P().find).toLowerCase()) < 0;
        return '<button type="button" class="ix-ch' + (n ? " unread" : "") + '" data-a="ix-ch" data-id="' + esc(c.id) + '" data-label="' + esc(c.label.toLowerCase()) + '"' + (c.id === sel ? ' aria-current="true"' : "") + (hide ? " hidden" : "") +
          ' aria-label="' + esc(c.label + (n ? " · " + t("ix_unread_n", { n: n }) : "")) + '">' +
          '<span class="nm">' + (c.id === "general" ? "# " : "") + esc(c.label) + "</span>" + (n ? '<span class="ix-badge" aria-hidden="true">' + n + "</span>" : "<span></span>") +
          '<span class="lm">' + esc(lm) + (c.last ? " · " + esc(rel(c.last.at)) : "") + "</span></button>";
      }).join("") + '<p class="small muted ix-nomatch" hidden>' + esc(t("ix_no_match")) + "</p></nav>";
  }
  function threadHTML(sel, map, msgs) {
    var st = P(), my = me(), names = mentionNames(), can = m.can("msgs"), founder = m.isFounder();
    var all = msgs.filter(function (x) { return x.ch === sel; }).sort(u.by("at"));
    var limit = Math.max(SHOWN, +st.limit || 0), list = all.slice(-limit);
    var lr = st.readAt && st.readAt[sel] != null ? st.readAt[sel] : lastRead(map, sel);
    var proj = sel !== "general" ? m.project(sel) : null;
    var people = {}; all.forEach(function (x) { people[x.who] = 1; });
    var np = Object.keys(people).length;
    var h = '<section class="panel ix-thread" aria-label="' + esc(chLabel(sel)) + '"><div class="ix-th-h"><div class="row" style="min-width:0;flex-wrap:nowrap">' +
      '<button type="button" class="btn ghost sm ix-backb" data-a="ix-back">← ' + esc(t("ix_back")) + "</button>" +
      '<div class="stack" style="gap:2px;min-width:0"><h2>' + (sel === "general" ? "# " : "") + esc(chLabel(sel)) + '</h2><span class="small muted">' + esc(np === 1 ? t("ix_one_member") : t("ix_members", { n: np })) + "</span></div></div>" +
      (proj ? ui.btn(t("ix_jump"), "ix-proj", { cls: "sm", data: { id: proj.id } }) : "") + "</div>";
    h += '<div class="ix-msgs" id="ix-msgs" role="log" aria-live="polite" tabindex="0" aria-label="' + esc(chLabel(sel)) + '">';
    if (all.length > list.length) h += '<button type="button" class="ix-more" data-a="ix-older">' + esc(t("ix_older", { n: all.length - list.length })) + "</button>";
    if (!list.length) h += ui.empty(t("ix_empty"));
    var day = "", prev = null, newShown = false;
    list.forEach(function (x) {
      var d = x.at.slice(0, 10);
      if (d !== day) { day = d; prev = null; h += '<div class="gk-daylab"><span>' + esc(TK.dayLabel(d)) + "</span></div>"; }
      if (!newShown && x.at > lr && x.who !== my.id) { newShown = true; h += '<div class="ix-new" role="separator">' + esc(t("ix_new")) + "</div>"; prev = null; }
      var w = m.member(x.who), cont = prev && prev.who === x.who && minutes(prev.at, x.at) <= 10;
      var f = format(x.text, names), mine = x.who === my.id, hit = !mine && mentionsMe(x.text, names);
      var del = can && (founder || mine);
      h += '<div class="ix-msg' + (cont ? " cont" : "") + (mine ? " me" : "") + (hit ? " mentions-me" : "") + '">' +
        (cont ? "<span></span>" : ui.av(w.name, mine ? "gel" : "")) +
        '<div class="hd"' + (cont ? " hidden" : "") + "><b>" + esc(w.name) + (mine ? ' <span class="muted">· ' + esc(t("ix_you")) + "</span>" : "") + "</b><span>" + esc(time(x.at)) + "</span></div>" +
        (del ? '<button type="button" class="ix-x" data-a="ix-del" data-id="' + esc(x.id) + '" aria-label="' + esc(t("ix_del")) + '">' + esc(t("del")) + "</button>" : "<span></span>") +
        '<div class="bd"' + (cont ? ' title="' + esc(time(x.at)) + '"' : "") + ">" + f.html + "</div>" +
        (f.links.length ? '<div class="ix-links">' + f.links.slice(0, 4).map(chip).join("") + "</div>" : "") + "</div>";
      prev = x;
    });
    h += "</div>";
    if (can) {
      h += '<div class="ix-comp"><label class="lab sm muted" for="ix-text">' + esc(t("ix_write", { ch: chLabel(sel) })) + '</label><div class="ix-comp-r">' +
        '<textarea id="ix-text" rows="2" maxlength="2000" aria-describedby="ix-hint"></textarea>' + ui.btn(t("ix_send"), "ix-send", { cls: "primary" }) + "</div>" +
        '<span class="small muted" id="ix-hint">' + esc(t("ix_hint")) + "</span></div>";
    } else h += '<p class="small muted" style="padding:12px 18px">' + esc(t("ix_no_right")) + "</p>";
    return h + "</section>";
  }
  function minutes(a, b) {
    var A = new Date(String(a).replace(" ", "T")), B = new Date(String(b).replace(" ", "T"));
    return isNaN(A) || isNaN(B) ? 999 : Math.abs(B - A) / 6e4;
  }

  GK.view("inbox", {
    render: function () {
      var st = P(), chs = channels();
      if (st.ch && !chs.some(function (c) { return c.id === st.ch; })) st.ch = "";
      var open = !!st.ch, sel = st.ch || "general";
      var map = readMap(), msgs = S.all("msgs");
      // remember where "new" starts for this channel while it stays open
      st.readAt = st.readAt || {};
      if (st.readAt[sel] == null) st.readAt[sel] = lastRead(map, sel);
      var un = 0, unCh = 0; chs.forEach(function (c) { var n = unreadIn(c.id, map, msgs); un += n; if (n) unCh++; });
      var wk = msgs.filter(function (x) { return x.at.slice(0, 10) >= u.addDays(u.today(), -6); }).length;
      var h = ui.head({ label: t("nav_inbox"), title: t("ix_title"), accent: t("ix_accent"), sub: esc(t("ix_sub", { u: un, c: unCh, n: wk })), actions: ui.sample() });
      if (!(open && narrow())) h += insight();
      var visibleOpen = open || !narrow();
      h += '<div class="ix-wrap' + (open ? " has-ch" : "") + '">' + listHTML(chs, sel, visibleOpen, map, msgs) + threadHTML(sel, map, msgs) + "</div>";
      return h;
    },
    count: function () {
      if (!GK.me()) return "";
      var map = readMap(), msgs = S.all("msgs"), n = 0;
      channels().forEach(function (c) { n += unreadIn(c.id, map, msgs); });
      return n || "";
    },
    after: function (main) {
      var st = P(), sel = st.ch || "general";
      var box = main.querySelector("#ix-msgs");
      if (box) {
        if (st.keepTop) { st.keepTop = false; box.scrollTop = 0; } else box.scrollTop = box.scrollHeight;
      }
      // mark the visible channel read (no re-render: the badge clears on the next one)
      if (st.ch || !narrow()) {
        var last = "";
        S.all("msgs").forEach(function (x) { if (x.ch === sel && x.at > last) last = x.at; });
        var map = readMap();
        if (last && (map[sel] || "") < last) { map[sel] = last; u.lsSet(readKey(), map); }
      }
      var ta = main.querySelector("#ix-text");
      if (ta) {
        ta.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); send(); }
        });
        if (st.refocus) { st.refocus = false; ta.focus(); }
      }
      var find = main.querySelector("#ix-find");
      if (find && st.findFocus) { st.findFocus = false; find.focus(); var v = find.value; find.value = ""; find.value = v; }
    }
  });

  function send() {
    var el = document.getElementById("ix-text"), text = el ? el.value.trim() : "";
    if (!text) { u.focus("ix-text"); return; }
    if (!m.can("msgs")) return ui.toast(t("ix_no_right"));
    var my = GK.me(), ch = P().ch || "general";
    var saved = S.put("msgs", { id: u.uid("g"), ch: ch, who: my ? my.id : "", text: text.slice(0, 2000), at: u.nowStamp() });
    if (!saved) return;
    el.value = ""; el.defaultValue = "";
    var map = readMap(); map[ch] = saved.at; u.lsSet(readKey(), map);
    P().refocus = true;
    ui.render(true);
  }

  GK.act("ix-send", send);
  GK.act("ix-ch", function (el) {
    var id = el.getAttribute("data-id"), st = P();
    st.readAt = {}; // recompute the "new" divider for the channel being opened
    ui.go("inbox", { ch: id, limit: SHOWN, refocus: !narrow() });
  });
  GK.act("ix-back", function () { P().readAt = {}; ui.go("inbox", { ch: "" }); });
  GK.act("ix-older", function () { var st = P(); st.limit = Math.max(SHOWN, +st.limit || 0) + SHOWN; st.keepTop = true; ui.render(true); });
  GK.act("ix-proj", function (el) { ui.go("projects", { id: el.getAttribute("data-id") }); });
  GK.act("ix-del", function (el) {
    var id = el.getAttribute("data-id"), x = S.get("msgs", id);
    if (!x) return;
    ui.confirm(t("ix_del_q"), t("ix_del_b"), function () {
      var copy = u.clone(x);
      S.remove("msgs", id);
      ui.toast(t("ix_deleted"), { label: t("undo"), fn: function () { S.put("msgs", copy); } });
    }, t("del"));
  });
  GK.input("ix-find", function (el) {
    var q = el.value.trim().toLowerCase(), n = 0;
    P().find = el.value;
    var nav = el.closest(".ix-list");
    if (!nav) return;
    nav.querySelectorAll(".ix-ch").forEach(function (b) { var hit = !q || (b.getAttribute("data-label") || "").indexOf(q) > -1; b.hidden = !hit; if (hit) n++; });
    var nm = nav.querySelector(".ix-nomatch"); if (nm) nm.hidden = n > 0;
  });
})(window.GK);
