# GECKO Ops · V01

The studio's operating tool: pipeline and DM log, clients and SKIN contracts, projects (angles → reels → hook variations), production, deliveries, what won, money (compliant invoices, commission, month close, cap), the client view, team tasks and messages, settings.
It's built in the GECKO identity (Gel pink, Chroma blue, Slate, Bounce; Anton, Trovical, Archivo). English first, with French one click away.

## Layout

```
v01/
  build.py              bundles everything into one page
  CONTRACT.md           how a screen (module) is written: data, rules, components, brand
  src/
    order.txt           script order
    styles/tokens.css   the palette and type, the only place colours live
    styles/app.css      components
    assets/             logo (SVG from brand-identity/logo), Trovical italic (inlined at build)
    core/util.js        helpers (dates, DT money, clipboard)
    core/i18n.js        English / French words
    core/model.js       business rules: packs, gates, invoices, commission, cap, funnel, roles
    core/store.js       data store (sample / this browser / shared) — the only file that knows where data lives
    core/ui.js          shell, router, components, modal, toast
    core/seed.js        sample data (invented brands)
    modules/*.js        one file per screen
  dist/gecko-ops.html   the built page (claude.ai artifact)
  dist/site/index.html  the same page as a full HTML document, for any static host
  tests/smoke.js        opens every screen on desktop, a 400px phone and dark mode, fails on any error
```

## Build and test

```
python3 build.py
NODE_PATH=$(npm root -g) node tests/smoke.js
```

## Where the data lives

| Mode | When | Who sees it |
|---|---|---|
| Sample data | first open, or "View sample data" | only this browser; never written to the shared store |
| Live, shared | after "Start for real" on claude.ai | everyone the page is shared with. Contributors edit; Viewers read. Settings (packs, rules, company) are Editor-only |
| Live, this browser | "Start for real" where no shared store exists (e.g. the static site today) | only this browser |

## Turning it into a website (next step)

The page is already a static site: upload `dist/site/index.html` to any host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) and it runs. What a real website adds:

1. **Hosted data and logins.** Add one adapter in `src/core/store.js` next to the shared one, backed by Supabase (Postgres + auth + row-level security):
   one table per collection (`team, clients, leads, outreach, contracts, projects, invoices, tasks, msgs`), each row `id text primary key, data jsonb, updated_at`, plus `config`.
   The adapter implements the same five things the shared backend does today: load all rows, subscribe to changes (Supabase realtime), `set` a row, `delete` a row, and who the viewer is.
   Modules don't change.
2. **Client logins for the client view.** A `client` role whose row-level policy only returns their own client, projects (stage, approved files) and invoices, never costs, profit or commission. The Client view screen becomes their home page.
3. **Invoices as PDFs** generated server-side (numbering stays in the database, in a transaction, so two people can't take the same number).
4. **Domain.** e.g. `ops.gecko.tn` for the team and `client.gecko.tn` for clients.

## Rules that need the accountant's word

The auto-entrepreneur cap (75,000 DT), the 1 DT stamp per invoice and the 3% withholding are defaults in Settings and marked "accountant to confirm".

## V02 (what changed)
- **Dashboard** (founder only): cash, runway, 12-month charts, funnel, alerts.
- **Studio**: ideas to concept to script, with links, owners, review step and a detail page.
- **Whiteboards**: sticky notes, text, shapes, arrows, pen, tables, undo/redo, SVG export; link a board to an idea or project.
- **Client pages**: the team publishes a snapshot (plan, scripts, files, timeline, invoices). The client opens `#cl-<token>`. Feedback goes through a prefilled WhatsApp message. Whiteboards are off by default on a new page.
- **Finance**: 10 tabs (overview, invoices, quotes, expenses, forecast, month close, profit, cap, commission, export CSV).
- Sales no longer sees Finance (salary and profit). Pass-through extras are not revenue, profit or commission.

### Known limits
- Client pages are not private against a technical viewer: the artifact loads the shares collection. Real isolation needs the website backend (Supabase row-level security).
- Forecast leaves out draft invoices from accepted quotes and future SKIN months.
- Tax, stamp and cap numbers are for the accountant to confirm; money figures are estimates from the records.
- QA notes: `tests/QA_CLICK.md`, `tests/QA_REVIEW.md`.
