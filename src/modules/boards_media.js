/* GECKO Ops · boards: media.
   B.media      link parsing (YouTube, Vimeo, Instagram, TikTok, Pinterest, Drive, direct images and videos, any other link),
                card geometry, legacy link migration, image intake (downscale), palette extraction.
   GK.blobs     tiny IndexedDB store for files added from this device: put/get/del/url by id. Board items keep only the id.
   GK.linkPreview(url) -> Promise<{title, image, desc} | null>. Pluggable: a hosted backend can replace it.
   Nothing here touches the editor; boards_edit.js and boards_svg.js call into it at run time. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t;
  var B = GK.boards, G = B.geo;
  var M = B.media = {};

  GK.i18n.add({
    bd_p_youtube: ["YouTube", "YouTube"], bd_p_vimeo: ["Vimeo", "Vimeo"], bd_p_instagram: ["Instagram", "Instagram"], bd_p_tiktok: ["TikTok", "TikTok"],
    bd_p_pinterest: ["Pinterest", "Pinterest"], bd_p_image: ["Image", "Image"], bd_p_video: ["Video", "Vidéo"], bd_p_drive: ["Drive", "Drive"],
    bd_p_figma: ["Figma", "Figma"], bd_p_behance: ["Behance", "Behance"], bd_p_dribbble: ["Dribbble", "Dribbble"], bd_p_link: ["Link", "Lien"], bd_p_upload: ["Image", "Image"]
  });

  var FOOT = M.FOOT = 52;          // footer strip under the poster: title + caption
  var LINK_H = 112;                // compact link card (no preview image)

  function clean(s) { return String(s || "").trim().replace(/[​\s]+$/g, ""); }
  /** a pasted string -> a safe http(s) url, or "" ("www.x.com" and "youtu.be/…" get https://) */
  M.normUrl = function (s) {
    s = clean(s);
    if (!s || /\s/.test(s)) return "";
    if (/^\/\//.test(s)) s = "https:" + s;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s) && /^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(s)) s = "https://" + s;
    return G.safeUrl(s);
  };
  /** every url in a pasted text when the text is only urls (one per line or space separated), else [] */
  M.urlsIn = function (text) {
    var parts = String(text || "").split(/\s+/).filter(Boolean);
    if (!parts.length || parts.length > 24) return [];
    var out = parts.map(M.normUrl);
    return out.every(Boolean) ? out : [];
  };

  var IMG_EXT = /\.(jpe?g|png|webp|gif|avif|bmp)$/i, VID_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;
  var IMG_HOSTS = /^(images\.unsplash\.com|i\.imgur\.com|i\.pinimg\.com|images\.pexels\.com|cdn\.dribbble\.com|mir-s3-cdn-cf\.behance\.net)$/;

  /** url -> {url, prov, kind: video|embed|image|link, mid, ratio, site} or null when it is not a safe link */
  M.parse = function (raw) {
    var url = M.normUrl(raw); if (!url) return null;
    var U; try { U = new URL(url); } catch (e) { return null; }
    var host = U.hostname.toLowerCase().replace(/^(www|m|mobile)\./, ""), path = U.pathname, mm;
    var o = { url: url, prov: "link", kind: "link", mid: "", ratio: 0, site: host };
    function set(prov, kind, mid, ratio) { o.prov = prov; o.kind = kind; o.mid = mid || ""; o.ratio = ratio || 0; return o; }
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      var v = U.searchParams.get("v"), short = false;
      if ((mm = path.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/))) { v = mm[2]; short = mm[1] === "shorts"; }
      if (v && /^[\w-]{11}$/.test(v)) return set("youtube", "video", v, short ? 9 / 16 : 16 / 9);
      return set("youtube", "link");
    }
    if (host === "youtu.be") { mm = path.match(/^\/([\w-]{11})/); return mm ? set("youtube", "video", mm[1], 16 / 9) : set("youtube", "link"); }
    if (/(^|\.)vimeo\.com$/.test(host)) {
      mm = path.match(/\/(?:video\/)?(\d{5,12})(?:\/|$)/);
      return mm ? set("vimeo", "video", mm[1], 16 / 9) : set("vimeo", "link");
    }
    if (/(^|\.)instagram\.com$/.test(host) || host === "instagr.am") {
      mm = path.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]{5,40})/);
      if (mm) { var reel = mm[1] !== "p" && mm[1] !== "tv"; return set("instagram", "embed", (reel ? "reel/" : "p/") + mm[2], reel ? 9 / 16 : 4 / 5); }
      return set("instagram", "link");
    }
    if (/(^|\.)tiktok\.com$/.test(host)) {
      mm = path.match(/\/video\/(\d{8,25})/);
      return mm ? set("tiktok", "embed", mm[1], 9 / 16) : set("tiktok", "link");
    }
    if (/(^|\.)pinterest\.[a-z.]+$/.test(host)) {
      mm = path.match(/\/pin\/(?:[\w-]*--)?(\d{6,25})/);
      return mm ? set("pinterest", "embed", mm[1], 2 / 3) : set("pinterest", "link");
    }
    if (host === "pin.it") return set("pinterest", "link");
    if (host === "drive.google.com") {
      mm = path.match(/\/file\/d\/([\w-]{10,})/) || (path === "/open" && U.searchParams.get("id") ? [0, U.searchParams.get("id")] : null);
      return mm ? set("drive", "embed", mm[1], 16 / 9) : set("drive", "link");
    }
    if (host === "docs.google.com") return set("drive", "link");
    if (/(^|\.)figma\.com$/.test(host)) return set("figma", "link");
    if (/(^|\.)behance\.net$/.test(host)) return set("behance", "link");
    if (/(^|\.)dribbble\.com$/.test(host) && host !== "cdn.dribbble.com") return set("dribbble", "link");
    if (VID_EXT.test(path)) return set("video", "video", "", 16 / 9);
    if (IMG_EXT.test(path) || IMG_HOSTS.test(host)) return set("image", "image", "", 0);
    return o;
  };

  /** What a card shows: {name, poster, embed, playable, video (direct file), image (zoomable), favicon, ratio} */
  M.info = function (it) {
    var p = it.prov || "link", id = String(it.mid || ""), safe = G.safeUrl(it.url);
    var r = { name: t("bd_p_" + (["youtube", "vimeo", "instagram", "tiktok", "pinterest", "image", "video", "drive", "figma", "behance", "dribbble", "upload"].indexOf(p) >= 0 ? p : "link")), poster: G.safeUrl(it.poster), embed: "", playable: false, video: false, image: false, favicon: "", ratio: +it.ratio || 0 };
    if (p === "youtube" && /^[\w-]{11}$/.test(id)) {
      r.poster = r.poster || "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
      r.embed = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1&modestbranding=1";
    } else if (p === "vimeo" && /^\d+$/.test(id)) r.embed = "https://player.vimeo.com/video/" + id + "?autoplay=1&dnt=1";
    else if (p === "instagram" && /^(p|reel)\/[\w-]+$/.test(id)) r.embed = "https://www.instagram.com/" + id + "/embed";
    else if (p === "tiktok" && /^\d+$/.test(id)) r.embed = "https://www.tiktok.com/embed/v2/" + id;
    else if (p === "pinterest" && /^\d+$/.test(id)) r.embed = "https://assets.pinterest.com/ext/embed.html?id=" + id;
    else if (p === "drive" && /^[\w-]+$/.test(id)) { r.embed = "https://drive.google.com/file/d/" + id + "/preview"; r.poster = r.poster || "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000"; }
    else if (p === "video" && safe) { r.video = true; r.embed = safe; }
    else if (p === "image" && safe) { r.poster = safe; r.image = true; }
    else if (p === "upload") r.image = true;
    r.playable = !!r.embed;
    var host = G.host(safe);
    if (host) r.favicon = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=64";
    if (!r.ratio) r.ratio = it.kind === "link" ? (r.poster ? 1.91 : 0) : 4 / 5;
    return r;
  };
  /** true when the card has a picture area (everything but a link card without preview image) */
  M.hasView = function (it) { return it.kind !== "link" || !!G.safeUrl(it.poster); };
  M.ratioOf = function (it) { var r = +it.ratio || 0; if (r > 0.2 && r < 5) return r; return it.kind === "link" ? 1.91 : 4 / 5; };
  /** card height for a width: picture keeps its aspect ratio, footer is fixed */
  M.heightFor = function (it, w) { return M.hasView(it) ? Math.round(w / M.ratioOf(it)) + FOOT : Math.max(84, +it.h || LINK_H); };
  M.defaultWidth = function (it) {
    if (!M.hasView(it)) return 280;
    var r = M.ratioOf(it);
    return r < 0.7 ? 220 : r < 1.05 ? 260 : r < 1.5 ? 300 : 360;
  };
  /** a new media item (no id/z) for a url, centred on x,y; null when the url is not usable */
  M.make = function (url, x, y, extra) {
    var p = M.parse(url); if (!p) return null;
    var it = { t: "media", x: 0, y: 0, w: 0, h: 0, url: p.url, prov: p.prov, kind: p.kind, mid: p.mid, ratio: Math.round(p.ratio * 10000) / 10000, text: "", cap: "", c: "bounce" };
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k] != null && extra[k] !== "") it[k] = extra[k]; });
    it.w = M.defaultWidth(it); it.h = M.heightFor(it, it.w);
    it.x = Math.round(x - it.w / 2); it.y = Math.round(y - it.h / 2);
    return it;
  };
  /** V02 link card -> V03 media item (same id, place and z). Other items pass through. */
  M.migrate = function (it) {
    if (!it || it.t !== "link") return it;
    var p = M.parse(it.url) || { url: G.safeUrl(it.url), prov: "link", kind: "link", mid: "", ratio: 0, site: G.host(it.url) };
    var o = { id: it.id, t: "media", x: +it.x || 0, y: +it.y || 0, w: +it.w || 240, h: +it.h || 76, z: it.z, c: it.c || "bounce", url: p.url || "", prov: p.prov, kind: p.kind, mid: p.mid, ratio: Math.round((p.ratio || 0) * 10000) / 10000, text: it.text || p.site || "", cap: "" };
    ["tags", "likes", "lock", "g"].forEach(function (k) { if (it[k] != null) o[k] = it[k]; });
    if (M.hasView(o)) { o.w = Math.max(o.w, M.defaultWidth(o)); o.h = M.heightFor(o, o.w); }
    else o.h = Math.max(o.h, 84);
    return o;
  };

  // ---------- link previews (optional, silent when offline or blocked) ----------
  var PV_KEY = "gecko-bd-previews", pvMem = null;
  function pvCache() { if (!pvMem) pvMem = u.lsGet(PV_KEY, {}) || {}; return pvMem; }
  function pvStore(url, v) {
    var c = pvCache(); c[url] = v;
    var keys = Object.keys(c); if (keys.length > 150) keys.slice(0, keys.length - 150).forEach(function (k) { delete c[k]; });
    try { u.lsSet(PV_KEY, c); } catch (e) {}
  }
  GK.linkPreview = GK.linkPreview || function (url) {
    url = G.safeUrl(url);
    if (!url || typeof fetch !== "function" || (navigator && navigator.onLine === false)) return Promise.resolve(null);
    var hit = pvCache()[url]; if (hit !== undefined) return Promise.resolve(hit);
    var ctl = typeof AbortController === "function" ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch("https://api.microlink.io/?url=" + encodeURIComponent(url), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(timer);
        var d = j && j.status === "success" && j.data; if (!d) return null;
        var v = { title: String(d.title || "").slice(0, 140), image: G.safeUrl(d.image && d.image.url) || "", desc: String(d.description || "").slice(0, 200) };
        pvStore(url, v); return v;
      })
      .catch(function () { clearTimeout(timer); return null; });
  };
  /** does this card gain from a preview lookup (title or picture)? */
  M.wantsPreview = function (it) { return !!(it && it.t === "media" && G.safeUrl(it.url) && it.kind !== "image" && it.prov !== "video" && it.prov !== "upload" && (!it.text || (!it.poster && it.prov !== "youtube" && it.prov !== "drive"))); };
  /** the title a card shows when nobody typed one */
  M.title = function (it) { return it.text || (it.prov === "upload" ? t("bd_p_upload") : it.kind === "link" ? (G.host(it.url) || t("bd_p_link")) : M.info(it).name + " · " + (G.host(it.url) || "")); };

  // ---------- blobs: files from this device, kept in IndexedDB ----------
  var mem = {}, urls = {}, dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      try {
        if (!window.indexedDB) return rej(new Error("no indexedDB"));
        var r = indexedDB.open("gecko-ops-blobs", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("b"); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    dbp.catch(function () {});
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tr = d.transaction("b", mode), req = fn(tr.objectStore("b"));
        tr.oncomplete = function () { res(req ? req.result : undefined); };
        tr.onerror = tr.onabort = function () { rej(tr.error); };
      });
    });
  }
  GK.blobs = {
    /** -> Promise<true> when stored on this device (false: only for this session) */
    put: function (id, blob) { mem[id] = blob; return tx("readwrite", function (s) { return s.put(blob, id); }).then(function () { return true; }, function () { return false; }); },
    get: function (id) { if (mem[id]) return Promise.resolve(mem[id]); return tx("readonly", function (s) { return s.get(id); }).then(function (b) { if (b) mem[id] = b; return b || null; }, function () { return null; }); },
    del: function (id) { delete mem[id]; if (urls[id]) { try { URL.revokeObjectURL(urls[id]); } catch (e) {} delete urls[id]; } return tx("readwrite", function (s) { return s.delete(id); }).then(function () { return true; }, function () { return false; }); },
    /** -> Promise<object url | null> (cached) */
    url: function (id) {
      if (urls[id]) return Promise.resolve(urls[id]);
      return GK.blobs.get(id).then(function (b) { if (!b) return null; if (!urls[id]) urls[id] = URL.createObjectURL(b); return urls[id]; });
    },
    cachedUrl: function (id) { return urls[id] || ""; },
    /** -> Promise<data: url | null>, for a saved SVG file */
    dataUrl: function (id) {
      return GK.blobs.get(id).then(function (b) {
        if (!b) return null;
        return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result || "")); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(b); });
      });
    }
  };

  // ---------- images from this device ----------
  function loadImage(src, cors) {
    return new Promise(function (res, rej) {
      var im = new Image();
      if (cors) im.crossOrigin = "anonymous";
      im.decoding = "async";
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error("image")); };
      im.src = src;
    });
  }
  function toBlob(cv, type, q) { return new Promise(function (res) { try { cv.toBlob(function (b) { res(b); }, type, q); } catch (e) { res(null); } }); }
  /** File -> Promise<{id, w, h, name, stored}>: downscaled to 1600px max (webp, else jpeg, ~0.82), kept in GK.blobs */
  M.ingest = function (file) {
    if (!file || !/^image\//.test(file.type || "")) return Promise.reject(new Error("type"));
    var src = URL.createObjectURL(file);
    return loadImage(src).then(function (im) {
      var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      if (!w || !h) throw new Error("size");
      var keep = (file.type === "image/gif" && file.size < 2.5e6) || (Math.max(w, h) <= 1600 && file.size < 350000 && /webp|jpeg/.test(file.type));
      var done = function (blob, ow, oh) {
        URL.revokeObjectURL(src);
        var id = u.uid("img");
        return GK.blobs.put(id, blob).then(function (stored) { return { id: id, w: ow, h: oh, name: String(file.name || "").replace(/\.[a-z0-9]+$/i, "").slice(0, 80), stored: stored }; });
      };
      if (keep) return done(file, w, h);
      var s = Math.min(1, 1600 / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
      var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
      var cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(im, 0, 0, cw, ch);
      return toBlob(cv, "image/webp", 0.82).then(function (b) {
        if (b && b.type === "image/webp") return b;
        var c2 = document.createElement("canvas"); c2.width = cw; c2.height = ch;
        var x2 = c2.getContext("2d"); x2.fillStyle = "white"; x2.fillRect(0, 0, cw, ch); x2.drawImage(cv, 0, 0);
        return toBlob(c2, "image/jpeg", 0.82);
      }).then(function (b) { if (!b) throw new Error("encode"); return done(b, cw, ch); });
    }, function (e) { URL.revokeObjectURL(src); throw e; });
  };

  // ---------- palette: 5 colours from a picture (k-means on a 48px sample) ----------
  function hex(c) { return "#" + c.map(function (v) { var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? "0" + s : s; }).join("").toUpperCase(); }
  M.paletteFromPixels = function (data, k) {
    k = k || 5;
    var px = [];
    for (var i = 0; i < data.length; i += 4) if (data[i + 3] > 127) px.push([data[i], data[i + 1], data[i + 2]]);
    if (!px.length) return [];
    function lum(p) { return p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114; }
    var sorted = px.slice().sort(function (a, b) { return lum(a) - lum(b); });
    var cent = [];
    for (i = 0; i < k; i++) cent.push(sorted[Math.min(sorted.length - 1, Math.floor((i + 0.5) * sorted.length / k))].slice());
    var assign = new Array(px.length), count = [];
    for (var it = 0; it < 10; it++) {
      var sum = cent.map(function () { return [0, 0, 0]; }); count = cent.map(function () { return 0; });
      px.forEach(function (p, j) {
        var best = 0, bd = 1e12;
        cent.forEach(function (c, ci) { var d = (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]) + (p[2] - c[2]) * (p[2] - c[2]); if (d < bd) { bd = d; best = ci; } });
        assign[j] = best; count[best]++; sum[best][0] += p[0]; sum[best][1] += p[1]; sum[best][2] += p[2];
      });
      cent = cent.map(function (c, ci) { return count[ci] ? [sum[ci][0] / count[ci], sum[ci][1] / count[ci], sum[ci][2] / count[ci]] : c; });
    }
    return cent.map(function (c, ci) { return { hex: hex(c), n: count[ci] }; }).filter(function (c) { return c.n > 0; })
      .sort(function (a, b) { return b.n - a.n; }).map(function (c) { return c.hex; })
      .filter(function (h, j, arr) { return arr.indexOf(h) === j; });
  };
  /** src (object url or remote url) -> Promise<["#RRGGBB" x5]>; rejects when the picture cannot be read (remote without CORS) */
  M.palette = function (src) {
    var remote = /^https?:/i.test(src || "");
    return loadImage(src, remote).then(function (im) {
      var cv = document.createElement("canvas"), n = 48; cv.width = n; cv.height = n;
      var cx = cv.getContext("2d"); cx.drawImage(im, 0, 0, n, n);
      return M.paletteFromPixels(cx.getImageData(0, 0, n, n).data, 5);
    });
  };
  M.validHex = function (s) { s = String(s || "").trim(); if (/^#?[0-9a-f]{3}$/i.test(s)) s = "#" + s.replace("#", "").split("").map(function (c) { return c + c; }).join(""); if (/^[0-9a-f]{6}$/i.test(s)) s = "#" + s; return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : ""; };
})(window.GK);
