/* GECKO Ops · small helpers. Global namespace: window.GK */
window.GK = window.GK || {};
(function (GK) {
  "use strict";
  var DAY = 864e5;
  var U = {};
  U.DAY = DAY;
  U.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  U.uid = function (prefix) { return (prefix || "") + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  U.iso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
  U.today = function () { return U.iso(new Date()); };
  /** date string n days from today */
  U.d = function (n) { return U.iso(new Date(Date.now() + n * DAY)); };
  U.addDays = function (isoDate, n) { var x = new Date(isoDate + "T12:00:00"); x.setDate(x.getDate() + n); return U.iso(x); };
  U.daysBetween = function (a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / DAY); };
  U.nowStamp = function () { var n = new Date(); return U.iso(n) + "T" + n.toTimeString().slice(0, 5); };
  U.month = function (isoDate) { return (isoDate || "").slice(0, 7); };
  U.year = function (isoDate) { return (isoDate || "").slice(0, 4); };
  /** Monday of the week containing isoDate */
  U.weekStart = function (isoDate) { var x = new Date((isoDate || U.today()) + "T12:00:00"); var wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return U.iso(x); };
  U.fr = function () { return GK.i18n && GK.i18n.lang() === "fr"; };
  U.fmtDate = function (s, opts) {
    if (!s) return "—";
    var dt = new Date(String(s).slice(0, 10) + "T12:00:00");
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString(U.fr() ? "fr-FR" : "en-GB", opts || { day: "numeric", month: "short" });
  };
  U.fmtMonth = function (ym) {
    if (!ym) return "—";
    var dt = new Date(ym + "-15T12:00:00");
    return dt.toLocaleDateString(U.fr() ? "fr-FR" : "en-GB", { month: "long", year: "numeric" });
  };
  /** 1500 -> "1,500 DT" (EN) / "1 500 DT" (FR). Tunisian dinar, no decimals unless asked. */
  U.money = function (n, decimals) {
    var v = +n || 0, neg = v < 0; v = Math.abs(v);
    var dec = decimals || 0;
    var parts = v.toFixed(dec).split(".");
    var sep = U.fr() ? " " : ",";
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    var s = parts.join(U.fr() ? "," : ".");
    return (neg ? "−" : "") + s + " DT";
  };
  U.num = function (n, decimals) { var v = +n || 0; return decimals ? v.toFixed(decimals) : String(Math.round(v)); };
  U.pct = function (n) { return (isFinite(n) ? Math.round(n) : 0) + (U.fr() ? "\u00a0%" : "%"); };
  /** 15.3 -> "15.3" (EN) / "15,3" (FR) */
  U.dec = function (n, d) { var s = (+n || 0).toFixed(d == null ? 1 : d); return U.fr() ? s.replace(".", ",") : s; };
  U.sum = function (arr, fn) { return (arr || []).reduce(function (s, x) { return s + (+(fn ? fn(x) : x) || 0); }, 0); };
  U.by = function (key, dir) { var k = typeof key === "function" ? key : function (x) { return x[key]; }; var m = dir === "desc" ? -1 : 1; return function (a, b) { var A = k(a), B = k(b); return (A > B ? 1 : A < B ? -1 : 0) * m; }; };
  U.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  U.initials = function (n) { return String(n || "?").trim().slice(0, 1).toUpperCase() || "?"; };
  U.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 200); }; };
  U.val = function (id) { var e = document.getElementById(id); return e ? e.value : ""; };
  U.numVal = function (id) { var v = parseFloat(String(U.val(id)).replace(",", ".")); return isFinite(v) ? v : 0; };
  U.checked = function (id) { var e = document.getElementById(id); return !!(e && e.checked); };
  U.focus = function (id) { var e = document.getElementById(id); if (e) { e.focus(); e.setAttribute("aria-invalid", "true"); } };
  /** Copy text: clipboard API inside the click, fallback = select a temp textarea. Returns a promise<boolean>. */
  U.copy = function (text) {
    function fallback() {
      try {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand && document.execCommand("copy"); ta.remove(); return !!ok;
      } catch (e) { return false; }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    } catch (e) {}
    return Promise.resolve(fallback());
  };
  U.lsGet = function (k, dflt) { try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } };
  U.lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  U.lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  GK.u = U;
})(window.GK);
