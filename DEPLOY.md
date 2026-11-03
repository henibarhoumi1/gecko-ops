# Putting Gecko online

One Supabase project holds the data and the logins. One Cloudflare account holds the domain, the public website (`gecko-site` repo) and this app. The app answers on two addresses, `app.gecko-creative.com` for the team and `client.gecko-creative.com` for clients. It is the same app: each account only ever sees its own part.

## 1. Supabase (about 10 minutes)
1. supabase.com > New project, name `gecko`, region Frankfurt (closest to Tunis). Save the database password in a password manager. Don't connect a GitHub repository: the database is set up by hand, once.
2. SQL Editor > paste all of `supabase/setup.sql` > Run, once.
3. Authentication > URL Configuration: Site URL `https://app.gecko-creative.com`. Redirect URLs: `https://app.gecko-creative.com/**`, `https://client.gecko-creative.com/**` and, while the domain isn't connected yet, `https://gecko-app.<your-subdomain>.workers.dev/**`.
4. Authentication > Emails > SMTP Settings: turn on custom SMTP. Supabase's built-in sender only emails the project's own team, so clients would never get their confirmation email without it. Use Resend (free tier) or Google Workspace:
   - Resend: add `gecko-creative.com` in Resend, paste its DNS records into Cloudflare, then host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key, sender `contact@gecko-creative.com`.
   - Google Workspace: host `smtp.gmail.com`, port 587, user `heni@gecko-creative.com`, password = an app password (needs 2-step verification on).
   - Until the domain and Workspace exist: the same Gmail settings with your personal Gmail address and an app password for it. Switch the sender to `contact@gecko-creative.com` later.
5. Authentication > Emails > Templates: paste the two files from `supabase/email-templates/` (Confirm signup, Reset password) so emails look like Gecko.
6. Connect (top bar) or Project Settings > API Keys: copy the Project URL and the **anon** key (or the **publishable** key). Never the service_role or secret key.

## 2. The app on Cloudflare (about 10 minutes)
1. Cloudflare > Workers & Pages > Create > Import a repository > `gecko-ops`.
2. Root directory `web`, build command `npm run build`, deploy command `npx wrangler deploy` (it reads `web/wrangler.jsonc`, worker name `gecko-app`).
3. Build variables: `VITE_SUPABASE_URL` = the Project URL, `VITE_SUPABASE_ANON_KEY` = the anon or publishable key. Deploy.
4. Once the domain is in the account: the worker's Settings > Domains & Routes > add the custom domains `app.gecko-creative.com` and `client.gecko-creative.com`.
5. Open the app, sign up with your own email, confirm it, then "Create the Gecko workspace". You are the founder. Only one workspace can exist, so nobody else can make their own.

## 3. The website on the same Cloudflare account
Import `gecko-site` the same way (root directory `/`, build `npm run build`, deploy `npx wrangler deploy`), then add the custom domains `gecko-creative.com` and `www.gecko-creative.com`.

## 4. People
- **Team:** Team > Create invite link, with their email and role (editor or client lead). They open the link, create an account with that email and land in the app. Editors only see the clients you tick for them on the Team screen.
- **Clients:** Clients > Add client > Overview (fill and save) > Client logins > Create invite link > Send on WhatsApp. The client opens the link (it points at `client.gecko-creative.com`), creates an account with that same email, confirms it, and lands in their portal: the campaign overview, the onboarding sheet, and the concepts to approve, ask changes on or comment. They never see drafts, other clients or anything of the team's.

## 5. Videos (later: switched off until Stream and R2 are paid for)
The code is in the app but switched off: nobody sees a Videos tab, and the deploy needs nothing paid. Previews play from Cloudflare Stream with a Gecko watermark burned in, through links that expire after two hours. Finals sit in a private R2 bucket and download through ten-minute links, and only once the client's balance is marked paid on their Overview. To switch it on:
1. Cloudflare > R2 Object Storage > Create bucket, name `gecko-finals`, location Automatic. Leave public access off.
2. Cloudflare > Stream > subscribe (from $5 a month for 1,000 stored minutes).
3. My Profile > API Tokens > Create Token > Custom token: permission Account > Stream > Edit, on your account only. Copy the token.
4. Workers & Pages > `gecko-app` > Settings > Variables and Secrets > Add, type **Secret**:
   - `STREAM_TOKEN` = the token from step 3.
   - `LINK_SECRET` = any long random string (40 characters or more, e.g. from a password manager). It signs the download links; changing it only cancels links already handed out.
5. Same worker > Settings > Build > Variables: add `VITE_VIDEOS` = `on`.
6. Supabase > SQL Editor > new tab > paste `supabase/migrations/202611010001_videos.sql` > Run, once. (A brand-new project gets it from `setup.sql`.)
7. In `web/wrangler.jsonc`, add the `r2_buckets` line from the comment at the top, and merge that change. The deploy that follows switches videos on. The first preview upload creates the watermark in Stream from `web/public/watermark.png`.

The team then opens a client > Videos > New video, uploads the cut (up to 200 MB, a 1080p export is plenty), shares it, and uploads the clean final whenever it's ready, at any size. Replacing a cut or a final deletes the old file; deleting a video deletes both.

## Backups and staying awake (free plan)
Free Supabase pauses a project after a week with no use and keeps no backups we can restore. Two things cover that:

- **Staying awake.** The app's worker pings the database once a day (03:17 UTC). Nothing to set up: it starts with the next deploy. To check it: Workers & Pages > `gecko-app` > Settings > Trigger events shows the daily schedule, and Logs shows each run.
- **Weekly backup.** A GitHub Action copies the database every Monday, encrypts it and keeps it for 90 days. It skips until you add two repository secrets (GitHub > `gecko-ops` > Settings > Secrets and variables > Actions > New repository secret):
  1. `SUPABASE_DB_URL`: Supabase > Connect (top bar) > Session pooler > copy the URI and put your database password in place of `[YOUR-PASSWORD]`. Use the Session pooler, not the Direct connection: GitHub's machines can't reach the direct one.
  2. `BACKUP_PASSPHRASE`: a long random passphrase (40 characters or more). Save it in your password manager first: without it the backups can't be opened, and the repository is public, so it is what keeps them private.

  Then Actions > backup > Run workflow, once, to check it goes green. Each run's file is under the run's Artifacts.

  To restore a backup into a project: download the artifact, then `gpg --decrypt gecko-db-DATE.dump.gpg > gecko-db.dump` (it asks for the passphrase) and `pg_restore --no-owner --no-privileges --dbname "<connection string>" gecko-db.dump`. Try it on a throwaway project first, never straight onto the live one.

## Schema snapshot (compare the live database with the repository)
Before database changes go through the Supabase CLI, we check that the live database is built exactly as the files in `supabase/migrations/` say. The `schema-snapshot` workflow does that. It reads only the database's structure (tables, functions, security rules, grants, storage bucket settings), never client rows, inside a read-only transaction that is rolled back.

- **Once, before the first run:** GitHub > `gecko-ops` > Settings > Environments > New environment, name it `production`, tick **Required reviewers** and add yourself, then save. The live job refuses to start without this rule.
- **To run it:** Actions > schema-snapshot > Run workflow, branch `main`, target `production`. Then approve the waiting run (Review deployments > production > Approve).
- **What you get:** the run's summary lists differences by name only. The full report is the run's artifact, encrypted with `BACKUP_PASSPHRASE`: `gpg --decrypt schema-snapshot-DATE.tgz.gpg > report.tgz` and `tar xzf report.tgz`.

## Testing environment (fake data only)
A second Supabase project, `gecko-testing`, where changes are tried before they reach real clients. It only ever holds fake brands and fake people from `supabase/seed.sql`; no production data is copied into it.

1. **Create the project.** Supabase > New project, name `gecko-testing`, same organisation and region as the live one. Use "Generate a password" and save it in your password manager. (The free plan allows two active projects.)
2. **Add two repository secrets** (GitHub > `gecko-ops` > Settings > Secrets and variables > Actions):
   - `TESTING_DB_URL`: in the `gecko-testing` project, Connect > Session pooler, with its password in place of `[YOUR-PASSWORD]`.
   - `TESTING_LOGIN_EMAIL`: an inbox you read. Each fake login is an alias of it, for example `you+gk-founder@gmail.com`.
3. **Fill it.** Actions > reset-testing > Run workflow, and tick "First run" the first time only. The run refuses any database that isn't a brand-new project, and it checks it isn't production. Run it again whenever you want a clean copy; it ends by checking the testing database is built exactly as the repository says.
4. **Sign in** on the testing app with the email link (no passwords) at your alias for each role: `+gk-founder`, `+gk-producer`, `+gk-editor`, and for the client portal `+gk-owner`, `+gk-approver`, `+gk-finance`, `+gk-viewer` (Fresh Test Co) and `+gk-cinema` (Cinema Test Studio).

**The testing app** is a second Cloudflare worker, `gecko-app-testing` (gecko-app-testing.henibarhoumi1.workers.dev): the same code built from `main`, talking to the testing project. Its Cloudflare build settings: root directory `/web`, build command `GECKO_BACKEND=testing npm run build`, deploy command `npx wrangler deploy --env testing`. Pull-request previews use the testing project too (`web/vite.config.ts` picks it for any branch but `main`), so a preview never sees real client data.

In the `gecko-testing` Supabase project, Authentication > URL Configuration has the testing app as Site URL, and redirect URLs for the testing app and the previews (`https://*-gecko-app.henibarhoumi1.workers.dev/**`), so email sign-in links land back on them.

The testing worker pings its database daily, so the free testing project doesn't pause.

## Changing the database later
Every change is a new file in `supabase/migrations/`; files that are already there are never edited. **Nothing is pasted into the live project's SQL Editor any more**: changes reach production through the migration pipeline, once it is switched on (technical specification, A1–A3).

Every pull request that touches `supabase/` runs the `db` checks on throwaway databases: all migrations apply and all pgTAP security tests pass; the previous version's tests still pass against the new schema; no existing migration is edited and no new one drops tables, columns or data unless the pull request has the `contract-step` label; and `supabase/setup.sql` is up to date. Regenerate it with `sh supabase/tools/gen-setup.sh` (a reference copy of the whole schema, not something to paste). `sh supabase/tests/local/run.sh` runs the tests locally.

## Good to know
- Free Supabase projects pause after a week with no use and have no backups; the daily ping and the weekly backup above cover both. Supabase Pro ($25 a month) removes the pause and adds daily backups, and makes the weekly copy a spare.
- Video costs at Gecko's size: R2 is free up to 10 GB, then about $0.015 per GB a month (200 GB is about $3). Stream is $5 per 1,000 stored minutes and $1 per 1,000 minutes watched; a month of 15 reels for 10 clients, two cuts each, stays inside the first $5.
- Each press of Watch asks Cloudflare for one signed link (kept for an hour). Cloudflare limits that to about 1,000 a day, far above what 10 clients use.
- The database enforces every role (founder, client lead, editor, production, client): what a role can't see is never sent to its browser.
