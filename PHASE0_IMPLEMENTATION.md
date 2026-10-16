# Phase 0 implementation plan

## Implementation status

- Added a local-only Supabase Auth/PostgREST client and store adapter seam. A configured backend gates private screens behind authentication and never falls back to local live storage.
- Added founder-created workspaces, email invitations, membership revocation, client/project assignment controls, and authenticated role-scoped reads/writes.
- Added high-entropy share tokens (hash-only in PostgreSQL), allow-listed snapshot retrieval, share revoke/rotate/expiry behavior, validated saved feedback, and retained WhatsApp as an additional route.
- Added 26 pgTAP assertions in `supabase/tests/phase0.test.sql` for table/function privileges, roles, assignment isolation, tenant boundaries, share expiry/revocation, snapshot filtering, and feedback validation.
- Five focused Node tests pass, JavaScript syntax checks pass, and the static build succeeds. The browser smoke test passes.
- The migration and all 26 pgTAP assertions pass on PostgreSQL 16 with a minimal Supabase stand-in (`sh supabase/tests/local/run.sh`). Running them found a missing `declare` in `publish_client_share` (the migration would not apply) and a test that read its own insert in the same statement; both are fixed. Re-run against a real Supabase stack before going live.
- The only embedded browser credentials are build-provided local URL and anon key. `build.py` blocks remote backend URLs and service-role/secret keys.

## Safety and baseline

- This source folder is not a Git checkout. Before code changes, keep the sibling
  `gecko-ops-main.phase0-backup-20261014` copy as the recovery point; do not
  initialize Git or overwrite that copy.
- The baseline build was written outside the project to
  `/tmp/gecko-phase0-baseline`. No production URL, credentials, or user data
  were used.
- Supabase CLI, Docker, PostgreSQL, and Playwright are not installed in the
  current environment. SQL/RLS acceptance tests must run against a local
  Supabase stack before any security claim or deployment.

## Architecture

Keep the static HTML build and existing `GK.store` surface. Add a Supabase
adapter behind that surface, using only the project URL and publishable/anon
key in the browser. Authentication and workspace membership are required
before private data is loaded. Never fall back from a configured backend to
browser-local live data after an authentication or network failure.

PostgreSQL is authoritative for team records. Clients, projects, memberships,
assignments, shares, feedback, and finance-sensitive data get relational
tables/foreign keys. A temporary `workspace_records` JSONB compatibility table
may hold non-core collections, but collection names, ownership, client/project
scope, role, assignment, and record relationships are explicit columns checked
by the database. Browser-provided JSON is never the authorization source.

Public share pages use an opaque 256-bit token. PostgreSQL stores only its
SHA-256 hash. An anonymous, narrow RPC returns an allow-listed published
snapshot for an enabled, unexpired share. A separate RPC validates and saves
feedback, deriving workspace/client/project identity from the token-bound
share. The client page never queries team tables or a list of shares.

## Proposed migration sequence

1. `202610140001_phase0_foundation.sql`: workspace membership, clients,
   projects, assignments, temporary compatibility records, shares, feedback,
   constraints, RLS, team RPCs, and narrow public share/feedback RPCs.
2. Add local-only Supabase configuration and synthetic fixtures. Do not add a
   real `.env` or service-role key to the repository.
3. Add direct database/API tests for anonymous access, workspace boundaries,
   role matrix, assignments, share scoping/revocation/expiry, and feedback
   validation.
4. Add the store adapter and authenticated boot seam. Keep current module APIs
   stable; make backend failures explicit and block local-live fallback.
5. Route the client page through the public share RPC and feedback RPC; keep
   WhatsApp as an optional second route.
6. Run local SQL/API security tests, build tests, and existing screen smoke
   tests. Do not migrate existing browser storage or production data in Phase 0.

## Initial role policy

- `founder`: workspace administration and all records.
- `sales`: leads, clients, projects, quote drafts, outreach, tasks, messages,
  reports, ideas, boards, portal publication; no finance or settings.
- `editor`: assigned clients/projects only; assigned project creative/file
  updates plus tasks/messages/boards; no finance, leads, membership, or
  settings.
- `assistant`: assigned clients/projects only; assigned tasks/messages and
  explicitly permitted boards; no finance, leads, membership, or settings.

All role checks must be enforced in PostgreSQL, not only in `m.can()`, routes,
or hidden UI controls. Assignment changes are founder-only. Public feedback
may only target an explicit target included in the published share snapshot.

## Acceptance gates

- Anonymous direct API reads and writes of every private table fail.
- Every role’s forbidden direct REST/RPC operations fail.
- Editors/assistants cannot read or mutate unassigned clients/projects.
- A token returns only its own published snapshot; unknown, expired, and
  revoked tokens return no snapshot.
- Feedback writes bind to the token’s share and reject forged IDs, kinds, and
  targets.
- Existing authenticated workflows continue to use the same store API and
  pass smoke tests.
- The build contains no service-role key, database password, or other secret.
- No real/localStorage data is automatically imported.

## Local test setup

Use the Supabase CLI local stack with Docker and synthetic records only. Keep
`.env.local` ignored. The browser build may receive only `GK_SUPABASE_URL` and
`GK_SUPABASE_ANON_KEY`; service-role credentials are confined to the local
Supabase environment and server-side functions. Reset the local database from
migrations before each security test run.

The current machine does not have the CLI, Docker, PostgreSQL, or Playwright.
Do not claim the RLS tests pass until they have run in a local Supabase
environment.
