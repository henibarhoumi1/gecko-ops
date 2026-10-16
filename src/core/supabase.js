/* GECKO Ops · small Supabase Auth/PostgREST client. Only the public anon key belongs in this page. */
(function (GK) {
  "use strict";
  var cfg = window.GK_BACKEND_CONFIG || {};
  var url = String(cfg.url || "").replace(/\/+$/, "");
  var anonKey = String(cfg.anonKey || "");
  var SESSION_KEY = "gecko-ops-supabase-session";
  var refreshing = null;

  function configured() { return !!(url && anonKey); }
  function readSession() {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) { sessionStorage.removeItem(SESSION_KEY); throw new Error("Saved sign-in session is invalid. Please sign in again."); }
  }
  function saveSession(session) {
    if (session && session.access_token) {
      session.expires_at = session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else sessionStorage.removeItem(SESSION_KEY);
  }
  function responseBody(response) {
    return response.text().then(function (text) {
      var body = null;
      if (text) {
        try { body = JSON.parse(text); }
        catch (e) { throw new Error("The backend returned an invalid response."); }
      }
      if (!response.ok) {
        var message = body && (body.msg || body.message || body.error_description || body.error);
        throw new Error(message || ("Backend request failed (" + response.status + ")."));
      }
      return body;
    });
  }
  function refresh() {
    var session = readSession();
    if (!session || !session.refresh_token) return Promise.reject(new Error("Sign-in required."));
    if (refreshing) return refreshing;
    refreshing = fetch(url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(responseBody).then(function (next) {
      saveSession(next);
      return next;
    }).catch(function (error) {
      saveSession(null);
      throw error;
    }).then(function (next) {
      refreshing = null;
      return next;
    }, function (error) {
      refreshing = null;
      throw error;
    });
    return refreshing;
  }
  function currentSession() {
    var session = readSession();
    if (!session) return Promise.resolve(null);
    if (!session.access_token || !session.refresh_token) {
      saveSession(null);
      return Promise.reject(new Error("Saved sign-in session is incomplete. Please sign in again."));
    }
    return session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 60 ? refresh() : Promise.resolve(session);
  }
  function request(path, method, body, publicCall) {
    if (!configured()) return Promise.reject(new Error("Supabase is not configured. Set GK_SUPABASE_URL and GK_SUPABASE_ANON_KEY when building."));
    var auth = publicCall ? Promise.resolve(null) : currentSession();
    return auth.then(function (session) {
      var headers = { apikey: anonKey, Authorization: "Bearer " + (session ? session.access_token : anonKey) };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      return fetch(url + path, {
        method: method || "GET", headers: headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      }).then(responseBody);
    });
  }
  var client = {
    configured: configured,
    session: currentSession,
    rpc: function (name, args, publicCall) {
      return request("/rest/v1/rpc/" + encodeURIComponent(name), "POST", args || {}, !!publicCall);
    },
    signIn: function (email, password) {
      if (!configured()) return Promise.reject(new Error("Supabase is not configured."));
      return fetch(url + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ email: email, password: password })
      }).then(responseBody).then(function (session) { saveSession(session); return session; });
    },
    signUp: function (email, password, name) {
      if (!configured()) return Promise.reject(new Error("Supabase is not configured."));
      return fetch(url + "/auth/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ email: email, password: password, data: { name: name } })
      }).then(responseBody).then(function (result) {
        if (result && result.access_token) saveSession(result);
        return result;
      });
    },
    signOut: function () {
      if (!readSession()) { saveSession(null); return Promise.resolve(); }
      return currentSession().then(function (session) {
        if (!session) return null;
        return request("/auth/v1/logout", "POST", {}, false);
      }).then(function () { saveSession(null); }, function (error) {
        saveSession(null);
        throw error;
      });
    },
    clearSession: function () { saveSession(null); }
  };
  GK.supabase = client;
})(window.GK);
