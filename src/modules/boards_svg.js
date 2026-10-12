/* GECKO Ops · boards: read-only SVG of a board.
   GK.boardSVG(board, {width, light, posters, local, blobs}) -> self-contained <svg> string. Colours are CSS variables (--gel, --tx...), so it follows light and dark.
   light:true    no background rectangle (sits on the page or card), default adds a background.
   posters:false no remote pictures (list thumbnails); media cards then show their placeholder.
   local:true    images kept on this device show when already loaded (object urls; never for a client snapshot).
   blobs:{id: data url}  images kept on this device, for a saved file (B.exportSVG).
   Media cards render as a poster with a play mark and the provider name, never an iframe.
   GK.boards.standaloneSVG(board) -> same drawing with the variables resolved, for a saved .svg file. B.exportSVG(board) -> Promise of the same with device images inlined. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, esc = u.esc;
  var B = GK.boards, G = B.geo;
  var sid = 0;

  function num(n) { return Math.round((+n || 0) * 10) / 10; }
  function txt(lines, x, y, size, lh, fill, weight, anchor, extra) {
    var out = '<text x="' + num(x) + '" y="' + num(y) + '" style="font-family:var(--f-text,Archivo,system-ui,sans-serif);font-size:' + size + "px;font-weight:" + (weight || 500) + ";fill:" + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + (extra || "") + ">";
    lines.forEach(function (l, i) { out += '<tspan x="' + num(x) + '" dy="' + (i ? lh : 0) + '">' + esc(l || " ") + "</tspan>"; });
    return out + "</text>";
  }
  function fit(text, w, h, size, lh, padX, padY) {
    var perLine = Math.max(4, Math.floor((w - padX * 2) / (size * 0.52))), maxLines = Math.max(1, Math.floor((h - padY * 2) / lh));
    var lines = G.wrap(text, perLine);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, "") + "…"; }
    return lines;
  }

  function rrect(x, y, w, h, r, style, extra) { return '<rect x="' + num(x) + '" y="' + num(y) + '" width="' + num(Math.max(0, w)) + '" height="' + num(Math.max(0, h)) + '" rx="' + r + '" style="' + style + '"' + (extra || "") + "/>"; }
  function clipId(ctx, it) { return "bk" + String(ctx.key || "").replace(/[^\w-]/g, "") + "-" + (++ctx.n); }
  function oneLine(text, w, size) { return fit(text || "", w, size * 1.4, size, size * 1.3, 0, 0)[0] || ""; }

  function mediaSVG(it, ctx) {
    var M = B.media, inf = M.info(it), x = +it.x, y = +it.y, w = +it.w, h = +it.h, s = "";
    var view = M.hasView(it), vh = view ? Math.max(20, h - M.FOOT) : 0, foot = view ? M.FOOT : h;
    var poster = "";
    if (it.prov === "upload") poster = (ctx.blobs && ctx.blobs[it.blob]) || (ctx.local && GK.blobs ? GK.blobs.cachedUrl(it.blob) : "");
    else if (ctx.posters !== false) poster = G.safeUrl(inf.poster);
    var cid = clipId(ctx, it);
    s += '<g data-media="' + esc(it.prov || "link") + '">';
    s += '<clipPath id="' + cid + '">' + rrect(x, y, w, h, 12, "") + "</clipPath>";
    s += rrect(x, y, w, h, 12, "fill:var(--s1);stroke:var(--line-2);stroke-width:1");
    if (view) {
      s += '<g clip-path="url(#' + cid + ')">';
      s += '<rect x="' + num(x) + '" y="' + num(y) + '" width="' + num(w) + '" height="' + num(vh) + '" style="fill:var(--s2)"/>';
      var cap = it.prov === "upload" && !poster ? t("bd_missing_img") : inf.name;
      s += txt([cap], x + w / 2, y + vh / 2 + (inf.playable ? Math.min(46, vh * 0.28) : 4), 12, 14, "var(--tx-3)", 600, "middle");
      if (poster) s += '<image href="' + esc(poster) + '" x="' + num(x) + '" y="' + num(y) + '" width="' + num(w) + '" height="' + num(vh) + '" preserveAspectRatio="xMidYMid slice"/>';
      s += "</g>";
      if (inf.playable) {
        var r = Math.max(14, Math.min(34, Math.min(w, vh) * 0.12)), cx = x + w / 2, cy = y + vh / 2;
        s += '<circle cx="' + num(cx) + '" cy="' + num(cy) + '" r="' + num(r) + '" style="fill:var(--bg);fill-opacity:.72;stroke:var(--line-2);stroke-width:1"/>';
        s += '<polygon points="' + num(cx - r * 0.32) + "," + num(cy - r * 0.42) + " " + num(cx + r * 0.48) + "," + num(cy) + " " + num(cx - r * 0.32) + "," + num(cy + r * 0.42) + '" style="fill:var(--tx)"/>';
      }
      var bw = inf.name.length * 6.6 + 18;
      s += rrect(x + 8, y + 8, bw, 22, 11, "fill:var(--bg);fill-opacity:.78;stroke:var(--line-2);stroke-width:1");
      s += txt([inf.name], x + 8 + bw / 2, y + 23, 11, 13, "var(--tx)", 600, "middle");
      s += '<line x1="' + num(x) + '" y1="' + num(y + vh) + '" x2="' + num(x + w) + '" y2="' + num(y + vh) + '" style="stroke:var(--line);stroke-width:1"/>';
    }
    var fy = y + vh, sub = it.cap || (it.prov === "upload" ? "" : G.host(it.url));
    if (view) {
      s += txt([oneLine(M.title(it), w - 24, 13)], x + 12, fy + 21, 13, 16, "var(--tx)", 600);
      if (sub) s += txt([oneLine(sub, w - 24, 12)], x + 12, fy + 39, 12, 14, "var(--tx-2)", 500);
    } else {
      s += rrect(x + 12, y + 12, 32, 32, 8, "fill:var(--s2);stroke:var(--line);stroke-width:1");
      s += txt([(G.host(it.url) || "?").charAt(0).toUpperCase()], x + 28, y + 33, 14, 16, "var(--tx-2)", 600, "middle");
      var tl = fit(M.title(it), w - 68, Math.max(20, foot - 40), 15, 19, 0, 0).slice(0, 2);
      s += txt(tl, x + 56, y + 27, 15, 19, "var(--tx)", 600);
      if (sub && foot > 70) s += txt([oneLine(sub, w - 68, 12)], x + 56, y + 27 + tl.length * 19 + 4, 12, 14, "var(--tx-2)", 500);
    }
    return s + "</g>";
  }

  function itemSVG(it, byId, ctx) {
    var c = G.col(it.c), x = num(it.x), y = num(it.y), w = num(it.w), h = num(it.h), s = "";
    if (it.t === "link" && B.media) it = B.media.migrate(it);
    if (it.t === "note") {
      s += rrect(x, y, w, h, 6, "fill:" + G.FILL[c] + ";stroke:var(--line);stroke-width:1");
      var ls = fit(it.text, it.w, it.h, 17, 22, 14, 12);
      if (ls.length) s += txt(ls, it.x + 14, it.y + 12 + 16, 17, 22, G.INK[c], 500);
    } else if (it.t === "text") {
      var fs = it.fs || 26, fill = c === "chroma" ? "var(--chroma)" : c === "bounce" ? "var(--tx-2)" : c === "gel" ? "var(--slate)" : "var(--tx)";
      var tl = fit(it.text, it.w, Math.max(it.h, 400), fs, Math.round(fs * 1.25), 4, 2);
      if (c === "gel") s += rrect(x, y, w, num(Math.max(it.h, tl.length * fs * 1.25 + 6)), 4, "fill:var(--gel)");
      s += txt(tl, it.x + 4, it.y + fs, fs, Math.round(fs * 1.25), fill, 600);
    } else if (it.t === "frame") {
      s += rrect(x, y, w, h, 12, "fill:var(--s1);stroke:var(--tx-3);stroke-width:2");
      var label = String(it.n == null ? "" : it.n), lw = Math.max(24, label.length * 12 + 12);
      s += rrect(x, num(it.y - 28), lw, 22, 11, "fill:" + G.FILL[c] + ";stroke:var(--line-2);stroke-width:1");
      s += txt([label], it.x + lw / 2, it.y - 12, 14, 16, G.INK[c], 600, "middle");
      if (it.text) s += txt([fit(it.text, it.w - 40, 30, 14, 16, 0, 0)[0]], it.x + lw + 8, it.y - 12, 14, 16, "var(--tx)", 600);
    } else if (it.t === "section") {
      s += rrect(x, y, w, h, 16, "fill:var(--s1);stroke:var(--line-2);stroke-width:1");
      s += '<line x1="' + x + '" y1="' + num(it.y + 40) + '" x2="' + num(it.x + it.w) + '" y2="' + num(it.y + 40) + '" style="stroke:var(--line);stroke-width:1"/>';
      s += '<circle cx="' + num(it.x + 19) + '" cy="' + num(it.y + 20) + '" r="5" style="fill:' + G.FILL[c] + ';stroke:var(--line-2);stroke-width:1"/>';
      if (it.text) s += txt([oneLine(it.text, it.w - 50, 16)], it.x + 32, it.y + 26, 16, 18, "var(--tx)", 600);
    } else if (it.t === "swatch") {
      var hex = B.media ? B.media.validHex(it.hex) : "";
      s += rrect(x, y, w, h, 12, "fill:var(--s1);stroke:var(--line-2);stroke-width:1");
      if (hex) s += rrect(num(it.x + 6), num(it.y + 6), num(it.w - 12), num(Math.max(10, it.h - 40)), 8, "fill:" + hex + ";stroke:var(--line);stroke-width:1");
      s += txt([hex], it.x + 8, it.y + it.h - 20, 12, 14, "var(--tx)", 600);
      if (it.text) s += txt([oneLine(it.text, it.w - 16, 11)], it.x + 8, it.y + it.h - 7, 11, 13, "var(--tx-2)", 500);
    } else if (it.t === "media" && B.media) {
      s += mediaSVG(it, ctx);
    } else if (it.t === "shape" && it.shape !== "line") {
      var st = 'style="fill:' + G.FILL[c] + ";stroke:" + (c === "bounce" ? "var(--tx-3)" : G.FILL[c]) + ';stroke-width:2"';
      s += it.shape === "ellipse" ? '<ellipse cx="' + num(it.x + it.w / 2) + '" cy="' + num(it.y + it.h / 2) + '" rx="' + num(it.w / 2) + '" ry="' + num(it.h / 2) + '" ' + st + "/>" : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" ' + st + "/>";
      if (it.text) { var sl = fit(it.text, it.w, it.h, 16, 20, 14, 10); s += txt(sl, it.x + it.w / 2, it.y + it.h / 2 - (sl.length - 1) * 10 + 5, 16, 20, G.INK[c], 600, "middle"); }
    }
    return s;
  }
  function lineLayer(it, byId) {
    var c = G.col(it.c), st = G.STROKE[c];
    if (it.t === "shape" && it.shape === "line") return '<line x1="' + num(it.x) + '" y1="' + num(it.y) + '" x2="' + num(it.x + it.w) + '" y2="' + num(it.y + it.h) + '" style="stroke:' + st + ';stroke-width:4;stroke-linecap:round"/>';
    if (it.t === "pen" && it.pts && it.pts.length) return '<path d="' + G.penD(it.pts) + '" style="fill:none;stroke:' + st + ';stroke-width:4;stroke-linecap:round;stroke-linejoin:round"/>';
    if (it.t === "arrow") {
      var g = G.arrow(it, byId); if (!g) return "";
      return '<path d="' + G.arrowD(g) + '" style="fill:none;stroke:' + st + ';stroke-width:3;stroke-linecap:round"/><polygon points="' + G.headPts(g) + '" style="fill:' + st + '"/>';
    }
    return "";
  }

  /** Self-contained read-only SVG of a board. */
  GK.boardSVG = function (board, opts) {
    opts = opts || {};
    var items = (board && board.items) || [], byId = {};
    items.forEach(function (it) { byId[it.id] = it; });
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    items.forEach(function (it) {
      var b = G.bbox(it, byId); if (!b) return;
      var top = b.y - G.top(it);
      if (b.x < x0) x0 = b.x; if (top < y0) y0 = top; if (b.x + b.w > x1) x1 = b.x + b.w; if (b.y + b.h > y1) y1 = b.y + b.h;
    });
    var title = board && board.title ? board.title : "";
    var width = opts.width || 640;
    var ctx = { key: (board && board.id) || "b", n: 0, posters: opts.posters, local: !!opts.local, blobs: opts.blobs || null };
    if (x0 > x1) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="' + width + '" role="img" aria-label="' + esc(title) + '">' +
        (opts.light ? "" : '<rect width="320" height="200" style="fill:var(--bg)"/>') + txt([t("bd_svg_empty")], 160, 104, 14, 16, "var(--tx-3)", 600, "middle") + "</svg>";
    }
    var pad = 28, vx = x0 - pad, vy = y0 - pad, vw = x1 - x0 + pad * 2, vh = y1 - y0 + pad * 2;
    var height = Math.round(width * vh / vw);
    var id = "bdc" + (++sid);
    var flat = items.filter(function (it) { return ["note", "text", "frame", "link", "media", "section", "swatch"].indexOf(it.t) >= 0 || (it.t === "shape" && it.shape !== "line"); }).sort(u.by("z"));
    var vec = items.filter(function (it) { return it.t === "arrow" || it.t === "pen" || (it.t === "shape" && it.shape === "line"); }).sort(u.by("z"));
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + num(vx) + " " + num(vy) + " " + num(vw) + " " + num(vh) + '" width="' + width + '" height="' + height + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(title) + '" data-bd="' + id + '">';
    if (!opts.light) svg += '<rect x="' + num(vx) + '" y="' + num(vy) + '" width="' + num(vw) + '" height="' + num(vh) + '" style="fill:var(--bg)"/>';
    flat.forEach(function (it) { svg += itemSVG(it, byId, ctx); });
    vec.forEach(function (it) { svg += lineLayer(it, byId); });
    svg += "</svg>";
    return B.tok ? B.tok(svg) : svg;
  };

  /** The same drawing with every CSS variable resolved, so the file looks right outside the app. */
  function resolveVars(svg) {
    var cs = getComputedStyle(document.documentElement);
    var re = /var\((--[\w-]+)(?:,((?:[^()]|\([^()]*\))*))?\)/g, guard = 0;
    while (/var\(--/.test(svg) && guard++ < 4) {
      svg = svg.replace(re, function (all, name, fb) {
        var v = cs.getPropertyValue(name).trim();
        if (!v && fb) return fb.trim();
        return v ? v.replace(/"/g, "'") : "currentColor";
      });
    }
    return svg;
  }
  B.standaloneSVG = function (board, blobs) {
    return resolveVars(GK.boardSVG(board, { width: 1280, light: false, blobs: blobs || null }));
  };
  /** Promise of the standalone SVG with images kept on this device inlined (the saved file is the only place they travel) */
  B.exportSVG = function (board) {
    var ids = B.blobIds ? B.blobIds(board) : [], map = {};
    if (!ids.length || !GK.blobs) return Promise.resolve(B.standaloneSVG(board));
    return Promise.all(ids.map(function (id) { return GK.blobs.dataUrl(id).then(function (d) { if (d) map[id] = d; }); }))
      .then(function () { return B.standaloneSVG(board, map); }, function () { return B.standaloneSVG(board); });
  };

  /** Reading-order outline of a board: frames in number order with the notes that sit in or under them, then loose notes and links. */
  B.outline = function (board) {
    var items = (board.items || []).filter(function (i) { return i.t !== "arrow" && i.t !== "pen"; });
    var frames = items.filter(function (i) { return i.t === "frame"; }).sort(function (a, b) { return (a.n || 0) - (b.n || 0) || a.x - b.x; })
      .concat(items.filter(function (i) { return i.t === "section"; }).sort(function (a, b) { return Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x; }));
    var rest = items.filter(function (i) { return !G.isBox(i) && i.t !== "shape"; });
    var owner = {};
    rest.forEach(function (it) {
      var cx = it.x + it.w / 2, cy = it.y + it.h / 2, best = null, bd = 1e9;
      frames.forEach(function (f) {
        if (cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h) { if (-1 < bd) { best = f; bd = -1; } }
        else if (cx >= f.x - 10 && cx <= f.x + f.w + 10 && cy > f.y + f.h && cy < f.y + f.h + 240) { var d = cy - (f.y + f.h); if (d < bd) { best = f; bd = d; } }
      });
      if (best) owner[it.id] = best.id;
    });
    function order(a, b) { return (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x); }
    function line(it) {
      if (it.t === "link") return (it.text || "") + (it.url ? " (" + it.url + ")" : "");
      if (it.t === "media") return (B.media ? B.media.title(it) : it.text || "") + (it.cap ? ": " + it.cap : "") + (it.url ? " (" + it.url + ")" : "");
      if (it.t === "swatch") return (it.hex || "") + (it.text ? " " + it.text : "");
      return String(it.text || "").replace(/\s*\n\s*/g, " / ");
    }
    var out = [];
    out.push(board.title || t("bd_untitled"));
    var cn = B.clientName(board.clientId); if (cn) out.push(t("bd_out_client") + ": " + cn);
    if (frames.length) {
      out.push("", t("bd_out_frames"));
      frames.forEach(function (f) {
        out.push((f.n != null ? f.n + ". " : "- ") + (f.text || (f.t === "section" ? t("bd_sec_default") : t("bd_out_frame"))));
        rest.filter(function (it) { return owner[it.id] === f.id; }).sort(order).forEach(function (it) { var l = line(it); if (l) out.push("   - " + l); });
      });
    }
    var loose = rest.filter(function (it) { return !owner[it.id] && it.t !== "link" && it.t !== "media"; }).sort(order).map(line).filter(Boolean);
    if (loose.length) { out.push("", t("bd_out_loose")); loose.forEach(function (l) { out.push("- " + l); }); }
    var links = rest.filter(function (it) { return !owner[it.id] && (it.t === "link" || it.t === "media"); }).sort(order).map(line).filter(Boolean);
    if (links.length) { out.push("", t("bd_out_links")); links.forEach(function (l) { out.push("- " + l); }); }
    return out.join("\n");
  };
})(window.GK);
