# Brief for every builder (read fully before writing code)

You are extending GECKO Ops (V02) for GECKO, a two-person Tunisian studio (Heni: founder and creative director; Mohamed: sales and outreach on commission; freelance editors and an assistant) that makes short ad videos (reels) for e-commerce brands. Money is in Tunisian dinars (DT). Heni wants a CEO dashboard with charts, a full ideas-to-scripts studio, whiteboards, interactive client-facing pages, and a deeper finance side.

Project root: /mnt/project-files/gecko/saas/v01
1. Read CONTRACT.md fully (V01 module API and the V02 additions at the bottom). It is the law.
2. Skim src/core/model.js, src/core/ui.js, src/core/store.js, src/core/charts.js, src/core/metrics.js, src/core/seed.js and the existing module closest to yours; copy its conventions (prefixes, i18n, escaping, role checks).
3. Business background: /mnt/project-files/gecko/01-business-model-v2.md (read only). Brand: /mnt/project-files/gecko/brand-identity/README.md (read only): palette Gel pink #F6CBDA, Chroma blue #3946EC, Slate, Bounce, tokens only.

Rules:
- Write ONLY your own files (listed in your task). Do not edit src/core, src/styles, build.py, tests/smoke.js, CONTRACT.md, other owners' modules, or anything in /mnt/project-files/gecko/brand-identity/. If you need a core or CSS change, put your CSS in a `<style>`-free way: use existing classes, or add a small block of CSS by injecting a <style id="..."> element once from your module's JS (allowed; tokens only, no hex values). If you need something else in core, say so in your final answer.
- Do not call any mcp__hearthbot__ tool, do not publish artifacts, do not message anyone, do not install packages (never run "playwright install").
- Other agents are working at the same time on other modules. Build into your own folder:
    cd /mnt/project-files/gecko/saas/v01 && GK_OUT=/tmp/gk-<yourname> python3 build.py
    GK_PAGE=/tmp/gk-<yourname>/site/index.html NODE_PATH=$(npm root -g) node tests/smoke.js /tmp/gk-<yourname>/shots
  The smoke test must print "OK no errors" (errors from other agents' half-written modules are theirs). Look at your screenshots (desktop, 400px phone, dark) with the Read tool and fix what looks wrong. Write your own playwright script in /tmp/gk-<yourname>/ that clicks through your main actions and checks no pageerror fires and that GK.store changed as expected (via page.evaluate). Test in English and French, as the founder and at least one other role (GK.store.workAs("mmoh") sales, "medit" editor, "masst" assistant).
- Quality bar: genuinely useful to a real studio with the sample data, readable at 400px (no horizontal page scroll), works in dark mode, every string in English and French, short direct human copy, no emoji, no jargon. Keep render() fast; no timers or subscriptions in render.
- Final answer: what you built (one line per feature), what you could not finish, any core change you need. No code dumps.
