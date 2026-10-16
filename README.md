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
    core/seed.js        retired sample-data generator (not included in builds)
    modules/*.js        one file per screen
  dist/gecko-ops.html   the built page (claude.ai artifact)
  dist/site/index.html  the same page as a full HTML document, for any static host
  tests/smoke.js        opens every screen on desktop, a 400px phone and dark mode, fails on any error
```

## Build and test

```
python3 build.py
node --test tests/*.test.js
NODE_PATH=$(npm root -g) node tests/smoke.js
```

## Where the data lives

| Mode | When | Who sees it |
|---|---|---|
| Local prototype | first open | starts empty; records and configuration live in this browser |
| Live, Supabase | after sign-in to a configured local Supabase workspace | authenticated workspace members; database RPCs enforce role and assignment scope |
| Live, shared | after "Start for real" on claude.ai | everyone the page is shared with. Contributors edit; Viewers read. Settings (packs, rules, company) are Editor-only |

Static hosting without Supabase configuration opens an empty local prototype workspace. It does not load or regenerate demo records. Existing browser records are preserved until explicitly cleared from Settings → Data; clearing removes business collections but preserves configuration and UI preferences. Export a JSON backup first if the records may be needed.

## Local Supabase development (Phase 0)

Requires the Supabase CLI and Docker. Use the local stack and synthetic fixtures only:

```sh
supabase start
supabase db reset
supabase test db
```

Set `GK_SUPABASE_URL` to `http://127.0.0.1:54321` and `GK_SUPABASE_ANON_KEY` to the local **anon/publishable** key printed by the CLI, then build outside the source tree:

```sh
GK_OUT=/tmp/gecko-local python3 build.py
python3 -m http.server 8000 --directory /tmp/gecko-local/site
```

Open `http://127.0.0.1:8000`. Build-time validation refuses remote Supabase URLs and service-role/secret keys in this phase. Never copy a service-role key into the browser build. Do not point this local setup at production.

The migration in `supabase/migrations` defines the workspace, memberships, relational client/project ownership and assignments, secure client shares, feedback, and the temporary constrained JSONB compatibility collection. SQL tests use synthetic identities and records. They must pass in a local Supabase stack before claiming the authorization guarantees are validated.

## Later work

- Private object storage and a scoped upload workflow.
- More relational operational/finance tables and migration of compatibility records.
- Client accounts, if needed; current client access is by revocable share link.
- Production deployment configuration and a separately reviewed production migration process.

## Rules that need the accountant's word

The auto-entrepreneur cap (75,000 DT), the 1 DT stamp per invoice and the 3% withholding are defaults in Settings and marked "accountant to confirm".

## V02 (what changed)
- **Dashboard** (founder only): cash, runway, 12-month charts, funnel, alerts.
- **Studio**: ideas to concept to script, with links, owners, review step and a detail page.
- **Whiteboards**: sticky notes, text, shapes, arrows, pen, tables, undo/redo, SVG export; link a board to an idea or project.
- **Client pages**: the team publishes a snapshot (plan, scripts, files, timeline, invoices). With Supabase configured, a revocable high-entropy share token retrieves only its approved snapshot, and feedback is saved before WhatsApp opens as an optional route.
- **Finance**: 10 tabs (overview, invoices, quotes, expenses, forecast, month close, profit, cap, commission, export CSV).
- Sales no longer sees Finance (salary and profit). Pass-through extras are not revenue, profit or commission.

### Known limits
- The legacy claude.ai artifact mode still loads browser-shared records and must not be used for confidential client shares. Isolated client links require the Supabase backend.
- Forecast leaves out draft invoices from accepted quotes and future SKIN months.
- Local-prototype invoice issuance uses Web Locks and a persistent per-year counter to avoid duplicate numbers across tabs. It requires a browser that supports Web Locks. Remote workspace issuance still needs a server-side atomic sequence before it can claim cross-user collision safety.
- Existing contracts are not rewritten: MRR uses their latest saved project/month-invoice price when available, then falls back to the current catalogue if no historical price was recorded.
- Tax, stamp and cap numbers are for the accountant to confirm; money figures are estimates from the records.
- QA notes: `tests/QA_CLICK.md`, `tests/QA_REVIEW.md`.
