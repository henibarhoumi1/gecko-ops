// Captures the real client portal for the product film: every screen at phone size and 3x pixel density, before
// and after the client approves a script and leaves a note, plus where the key elements sit (for the film's taps).
// Same approach as e2e/phone-check.mjs: the built app, a fake session, backend answers from film/fixtures.
// Usage (after `npm run build` with VITE_SUPABASE_URL=http://localhost:54321): node e2e/film/capture.mjs <out dir>
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "film-capture";
mkdirSync(out, { recursive: true });
const BACKEND = "http://localhost:54321";
const APP = "http://localhost:4173";
const read = (name) => {
  const f = join(here, "fixtures", `${name}.json`);
  return existsSync(f) ? readFileSync(f, "utf8") : "null";
};
const clip = readFileSync(join(here, "clip.mp4"));

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 86400;
const sub = "00000000-0000-4000-8000-0000000009a2";
const email = "owner@phone.test";
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", aud: "authenticated", exp })}.e2e`;
const user = { id: sub, aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {} };
const session = { access_token: token, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "e2e", user };

const PAGES = ["/", "/concepts", "/scripts", "/talent", "/review", "/delivery", "/money", "/team"];

const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "inherit" });
await new Promise((r) => setTimeout(r, 4000));
const browser = await chromium.launch();
const boxes = {};
try {
  for (const state of ["before", "after"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-GB",
    });
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("gecko.lang", "en"); } catch { /* */ } },
      ["sb-localhost-auth-token", JSON.stringify(session)]);
    await context.route(`${BACKEND}/**`, (route) => {
      const url = new URL(route.request().url());
      const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body });
      if (url.pathname === "/auth/v1/user") return json(JSON.stringify(user));
      if (url.pathname.startsWith("/auth/v1/token")) return json(JSON.stringify(session));
      if (url.pathname.endsWith("/e2e/clip.mp4")) return route.fulfill({ status: 200, contentType: "video/mp4", body: clip });
      if (url.pathname.startsWith("/storage/v1/object/sign")) return json(JSON.stringify({ signedURL: "/e2e/clip.mp4" }));
      const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
      if (rpc) {
        const name = rpc[1];
        if (state === "after" && existsSync(join(here, "fixtures", `after_${name}.json`))) return json(read(`after_${name}`));
        return json(read(name));
      }
      if (url.pathname.startsWith("/rest/v1/")) return json("[]");
      return json("{}");
    });
    const page = await context.newPage();
    // The first screen as the phone shows it (with the tab bar), then the whole page with fixed bars hidden, so the
    // film can scroll the page under one tab bar.
    const shoot = async (name) => {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: join(out, `${name}-view.png`) });
      await page.addStyleTag({ content: "[data-film-hide]{visibility:hidden !important}" });
      await page.evaluate(() => document.querySelectorAll("body *").forEach((el) => {
        const cs = getComputedStyle(el);
        if ((cs.position === "fixed" || cs.position === "sticky") && el.getBoundingClientRect().top > innerHeight / 2) el.setAttribute("data-film-hide", "");
      }));
      await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
      await page.evaluate(() => document.querySelectorAll("[data-film-hide]").forEach((el) => el.removeAttribute("data-film-hide")));
    };
    for (const path of PAGES) {
      await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await page.evaluate(() => document.querySelectorAll("video").forEach((v) => { v.muted = true; v.currentTime = 1.5; v.pause(); }));
      await page.waitForTimeout(400);
      const name = `${state}${path === "/" ? "-home" : path.replace(/\//g, "-")}`;
      await shoot(name);
      boxes[name] = await page.evaluate(() => {
        const pick = [];
        const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
        for (const el of document.querySelectorAll("button, a, video, h1, h2, h3, img, [class*=card], li")) {
          const b = el.getBoundingClientRect();
          if (b.width < 4 || b.height < 4) continue;
          pick.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === "string" ? el.className.slice(0, 60) : "", text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70), box: r(el) });
        }
        return { height: document.documentElement.scrollHeight, items: pick };
      });
      console.log(name, boxes[name].height);
      // Open the first reel in Review: the player, the timeline and the notes.
      if (path === "/review") {
        const item = page.getByText("Morning routine, cut 1").first();
        if (await item.count()) {
          await item.click();
          await page.waitForTimeout(1200);
          await page.evaluate(() => document.querySelectorAll("video").forEach((v) => { v.muted = true; v.currentTime = 1.5; v.pause(); }));
          await page.waitForTimeout(500);
          await shoot(`${state}-review-open`);
          console.log(`${state}-review-open`);
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(join(out, "boxes.json"), JSON.stringify(boxes, null, 1));
