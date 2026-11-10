// Phone check: opens every client portal screen (and the team's Today) at phone sizes against fake data, and
// reports anything wider than the screen, plus console errors. No real database and no real login: the app's
// requests to its backend are answered from e2e/fixtures (see make-fixtures.sh), and the session is a fake one.
// Usage (after `npm run build` with VITE_SUPABASE_URL=http://localhost:54321):
//   node e2e/phone-check.mjs <out dir>
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "phone-check";
mkdirSync(out, { recursive: true });
const BACKEND = "http://localhost:54321";
const APP = "http://localhost:4173";

const fixture = (name) => {
  const f = join(here, "fixtures", `${name}.json`);
  return existsSync(f) ? readFileSync(f, "utf8") : "null";
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = (sub, email) => {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", aud: "authenticated", exp })}.e2e`;
  const user = {
    id: sub,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: {},
    user_metadata: {},
  };
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    refresh_token: "e2e",
    user,
  };
};

const PEOPLE = {
  client: session("00000000-0000-4000-8000-0000000009a2", "owner@phone.test"),
  team: session("00000000-0000-4000-8000-0000000009a1", "founder@phone.test"),
};

const PAGES = {
  client: [
    "/",
    "/room",
    "/brand",
    "/tasks",
    "/history",
    "/concepts",
    "/scripts",
    "/talent",
    "/locations",
    "/budget",
    "/shared",
    "/review",
    "/delivery",
    "/money",
    "/results",
    "/library",
    "/team",
    "/onboarding",
  ],
  team: [
    "/today",
    "/clients",
    "/clients/maison",
    "/clients/maison/room",
    "/clients/maison/concepts",
    "/clients/maison/money",
    "/pipeline",
    "/shoots",
  ],
};

const SIZES = [
  { name: "390", width: 390, height: 844 },
  { name: "360", width: 360, height: 740 },
  // A laptop, to see the desktop layout too (the rail, the sidebar, the wide grids).
  { name: "1280", width: 1280, height: 800, desktop: true },
];

const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], {
  stdio: "inherit",
});
await new Promise((r) => setTimeout(r, 4000));

const browser = await chromium.launch();
const report = [];
try {
  for (const who of ["client", "team"]) {
    for (const size of SIZES) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.desktop ? 1 : 2,
        isMobile: !size.desktop,
        hasTouch: !size.desktop,
      });
      await context.addInitScript(
        ([key, value]) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            /* ignore */
          }
        },
        ["sb-localhost-auth-token", JSON.stringify(PEOPLE[who])],
      );
      await context.route(`${BACKEND}/**`, (route) => {
        const url = new URL(route.request().url());
        const json = (body) =>
          route.fulfill({ status: 200, contentType: "application/json", body });
        if (url.pathname === "/auth/v1/user") return json(JSON.stringify(PEOPLE[who].user));
        if (url.pathname.startsWith("/auth/v1/token")) return json(JSON.stringify(PEOPLE[who]));
        const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
        if (rpc) {
          const name = rpc[1];
          if (name === "get_my_workspaces")
            return json(who === "team" ? fixture("team_get_my_workspaces") : fixture(name));
          return json(fixture(name));
        }
        if (url.pathname.startsWith("/storage/v1/object/sign"))
          return json(JSON.stringify({ signedURL: "/e2e-missing.jpg" }));
        // Tables the team reads directly: rest_<table>.json when there is one.
        const table = /^\/rest\/v1\/([a-z0-9_]+)$/.exec(url.pathname);
        if (table) {
          const f = fixture(`rest_${table[1]}`);
          return json(f === "null" ? "[]" : f);
        }
        if (url.pathname.startsWith("/rest/v1/")) return json("[]");
        return json("{}");
      });

      const page = await context.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      for (const path of PAGES[who]) {
        errors.length = 0;
        await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(600);
        const found = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const scroll = document.documentElement.scrollWidth;
          const inScroller = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const s = getComputedStyle(p);
              if (
                /(auto|scroll|hidden|clip)/.test(s.overflowX) &&
                p !== document.body &&
                p !== document.documentElement
              )
                return true;
            }
            return false;
          };
          const name = (el) =>
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : "") +
            (typeof el.className === "string" && el.className
              ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
              : "");
          const wide = [];
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) {
              wide.push({
                el: name(el),
                left: Math.round(r.left),
                right: Math.round(r.right),
                text: (el.textContent ?? "").trim().slice(0, 60),
              });
            }
          }
          // Keep the outermost offenders only.
          const tiny = [];
          for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
            const r = el.getBoundingClientRect();
            if (
              r.width > 0 &&
              r.height > 0 &&
              (r.height < 32 || r.width < 32) &&
              getComputedStyle(el).display !== "inline"
            )
              tiny.push({
                el: name(el),
                w: Math.round(r.width),
                h: Math.round(r.height),
                text: (el.textContent ?? "").trim().slice(0, 40),
              });
          }
          return {
            vw,
            scroll,
            wide: wide.slice(0, 25),
            tiny: tiny.slice(0, 25),
            title: document.title,
          };
        });
        const file = `${who}-${size.name}${path === "/" ? "-home" : path.replace(/\//g, "-")}.png`;
        await page.screenshot({ path: join(out, file), fullPage: true });
        report.push({
          who,
          size: size.name,
          path,
          overflow: found.scroll > found.vw,
          ...found,
          errors: [...errors],
          file,
        });
        console.log(
          `${who} ${size.name} ${path}: scroll ${found.scroll}/${found.vw}, wide ${found.wide.length}, errors ${errors.length}`,
        );
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.overflow || r.wide.length);
console.log(
  bad.length ? `${bad.length} screens wider than the phone` : "every screen fits the phone",
);
