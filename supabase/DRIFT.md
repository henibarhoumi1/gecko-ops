# Live schema drift report

The live database was built by pasting migration files into the Supabase SQL editor, so nobody knew for certain that it matched `supabase/migrations/`. This report records what the read-only schema snapshot found, the decision for each difference, and Heni's sign-off. The migration history is baselined only after this sign-off (technical specification, A1–A3, PR 6).

## Snapshot

- Run: `schema-snapshot` #2 on `main` (a555cc4), 3 Nov 2026, approved in the `production` environment. Read-only: system catalogs only, inside a read-only transaction that was rolled back.
- Compared: tables, columns, constraints, indexes, functions (signature, security, search_path, body hash), triggers, row-level security, policies (public and storage), grants to public, anon, authenticated and service_role, storage bucket settings.

## Facts about production

| Fact | Value |
|---|---|
| PostgreSQL | 17 |
| Migration history table | None (as expected: files were pasted by hand) |
| Extensions | pg_stat_statements, pgcrypto, supabase_vault, uuid-ossp |
| Default grants in public | postgres and supabase_admin, for tables, functions and sequences (Supabase's standard setup) |

## Result

**97 differences, all from one file: `202611010001_videos.sql` was never applied live.** There are no hand-made objects, nothing edited by hand, and no differences in any security rule, grant, policy or storage setting.

| Section | In the repository | Live | Missing live |
|---|---|---|---|
| Tables | 40 | 38 | `videos`, `video_notes` |
| Columns | 469 | 439 | their 30 columns |
| Constraints | 376 | 348 | their 28 constraints |
| Indexes | 78 | 74 | their 4 indexes |
| Functions | 177 | 170 | `balance_paid`, `client_video_note`, `get_my_videos`, `video_media_access`, `video_notes_guard`, `video_to_json`, `videos_guard` |
| Function grants | 357 | 345 | the grants on those 7 functions |
| Table grants | 51 | 47 | the grants on the 2 tables |
| Policies | 63 | 56 | the 7 policies on the 2 tables |
| Triggers | 15 | 12 | `videos_guard`, `video_notes_guard`, `video_notes_role_guard` |
| Storage buckets | 5 | 5 | none |

This was deliberate at the time: videos need Cloudflare Stream and R2, which are paid, so the feature is switched off in the app (`VITE_VIDEOS`), and `202611050001` says videos "are switched off live". The app calls the video functions only when the feature is on, so nothing live depends on them today.

## A dependency found while checking

`202611050001_portal_templates_and_team.sql` adds `video_notes_role_guard` (only client owners and approvers may approve or request changes) **only if `video_notes` already exists**. Production skipped the videos file, so applying it now, after `202611050001`, would create `video_notes` without that guard, and a viewer or finance login could approve a video.

Reproduced on a throwaway database: every file except videos (97 differences, the same as live), then the videos file (1 difference left: `video_notes_role_guard` missing), then the reconciliation file below (0 differences).

## Decision

| # | Difference | Class | Decision |
|---|---|---|---|
| 1 | `202611010001_videos.sql` never applied live | Migration never applied live | **Apply it at the baseline.** It only adds new, empty tables and new functions; it changes nothing that exists. The feature stays switched off in the app until Stream and R2 are paid for. |
| 2 | `video_notes_role_guard` would be missing once videos are applied | Ordering dependency | **New file `202611110001_reconcile_video_notes_guard.sql`** adds the guard wherever it is missing. It is idempotent: on a database built from all files in order it changes nothing (checked). |

The alternative, leaving the videos file unapplied, isn't workable: the Supabase CLI refuses to push while a local file older than the newest recorded one is pending, and recording it as applied without its objects would make the history false.

## Plan for the baseline (PR 6, rehearsed on testing first)

1. Fresh encrypted backup, and an export of the history table (none exists today).
2. `supabase migration repair --status applied` for the **21 files that are live** (every file except `202611010001`). This writes history rows only and runs no SQL.
3. Apply `202611010001_videos.sql` and `202611110001_reconcile_video_notes_guard.sql` through the pipeline (`supabase db push --include-all`, needed because `202611010001` is older than the newest recorded version). Each file runs in its own transaction and is recorded on success.
4. Re-run the snapshot: it must show **0 differences**.
5. Smoke test: sign-in, the team's Clients and a client page, the portal through Heni's test login, one script.

Rollback, if step 3 fails: the failing file's transaction rolls back and nothing of it stays; production is exactly as today. Videos are off, so no screen depends on the new objects either way.

## Notes (not drift, kept for later phases)

- `supabase/setup.sql` (the old paste-everything file) is hand-maintained: the invoices and results files are in it but without their section headers. From PR 4 it is generated from the migrations by script; it is no longer used for production.
- `validate_workspace_record()` has no explicit grants, so anyone may execute it. It is a trigger function, so calling it directly does nothing useful, but Phase A's grant review should revoke it.

## Sign-off

- [ ] Heni: the differences above are understood, and decisions 1 and 2 are approved.
