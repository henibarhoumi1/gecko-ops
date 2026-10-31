# Putting GECKO Ops online

The app is one static page (`dist/site/index.html`), built by `python3 build.py`. Any static host works.

## GitHub Pages (free, live in about two minutes)
1. Push this folder to a GitHub repository (main branch).
2. Repository Settings > Pages > Source: **GitHub Actions**.
3. Every push to main runs `.github/workflows/pages.yml`, which builds and publishes `dist/site`.
4. The address is `https://<owner>.github.io/<repo>/`.

## Vercel (optional, nicer previews per branch)
1. vercel.com > Add New > Project > import the GitHub repository.
2. Vercel reads `vercel.json` (build `python3 build.py`, output `dist/site`). Deploy.

## Custom domain (later)
Point the domain (e.g. ops.gecko.tn) at Vercel or GitHub Pages from the host's Domains settings.

## Going live with Supabase (shared data and sign-in)
1. supabase.com > New project, region Frankfurt. Keep the database password safe.
2. SQL Editor > paste all of `supabase/setup.sql` > Run, once. It creates the tables, the role rules and the client-link functions.
3. Authentication > URL Configuration > Site URL: the Vercel address (later the real domain).
4. Vercel > Settings > Environment Variables: `GK_SUPABASE_URL` = Project URL (`https://<ref>.supabase.co`), `GK_SUPABASE_ANON_KEY` = the anon public key. Never the service_role key: the build refuses it.
5. Redeploy. Open the site, sign up, create the workspace. You are its founder.
6. Team > Settings > Data > Restore a backup, to bring records over from the claude.ai app. Then invite people from Team.

Already ran an older `setup.sql`? Run `supabase/update-2026-10-26-client-logins.sql` once as well, then `supabase/update-2026-10-29-onboarding.sql`, then `supabase/update-2026-10-30-leads.sql`, then `supabase/update-2026-10-31-client-portal.sql`.

## Who signs in
- Founder: the first account creates the Gecko workspace. Only one workspace can exist, so nobody else can make their own.
- Team: Team > Add person makes a one-time invite link for their email and role (sales, editor, assistant).
- Clients: in the new app, Clients > a client > Client logins makes a one-time invite link for their email (in the current app: the client's Portal tab > Client logins). They sign in to their portal: the campaign overview, the onboarding sheet, and the concepts to approve, ask changes on or comment. They never see drafts, other clients or anything of the team's.

The database enforces every role (founder, sales, editor, assistant): what a role can't see is never sent to its browser. `sh supabase/tests/local/run.sh` runs the database security tests (98 today) on a throwaway PostgreSQL.

Free Supabase projects pause after a week with no use; opening the dashboard wakes them.

## Fresh start: new Supabase and Cloudflare, one domain (Nov 2026)

Everything moves to accounts owned by the founder's own email: one Supabase project for the data, one Cloudflare account for the domain, the public website and the app. The app (`web/`) answers on two addresses: `app.gecko-creative.com` for the team and `client.gecko-creative.com` for clients. It is the same app; each account only ever sees its own part.

**Before deleting anything old:** open the current app, Settings > Data > Export a backup. Delete the old projects only after the new ones work.

### 1. Supabase (about 10 minutes)
1. supabase.com > New project, region Frankfurt (closest to Tunis). Save the database password in a password manager.
2. SQL Editor > paste all of `supabase/setup.sql` > Run, once.
3. Authentication > URL Configuration: Site URL `https://app.gecko-creative.com`. Redirect URLs: add `https://app.gecko-creative.com/**` and `https://client.gecko-creative.com/**`.
4. Authentication > Emails > SMTP Settings: turn on custom SMTP. Supabase's built-in sender only emails the project's own team, so clients would never get their confirmation email without this. Use Resend (free tier) or Google Workspace:
   - Resend: add `gecko-creative.com` in Resend, paste its DNS records into Cloudflare, then host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key, sender `contact@gecko-creative.com`.
   - Google Workspace: host `smtp.gmail.com`, port 587, user `heni@gecko-creative.com`, password = an app password (needs 2-step verification on).
5. Project Settings > API: copy the Project URL and the **anon public** key. Never the service_role key.

### 2. The app on Cloudflare (about 10 minutes)
1. Cloudflare > Workers & Pages > Create > Import a repository > `gecko-ops`.
2. Root directory `web`, build command `npm run build`, deploy command `npx wrangler deploy` (reads `web/wrangler.jsonc`).
3. Build variables: `VITE_SUPABASE_URL` = the Project URL, `VITE_SUPABASE_ANON_KEY` = the anon key. Deploy.
4. The worker's Settings > Domains & Routes > add custom domains `app.gecko-creative.com` and `client.gecko-creative.com`.
5. Open `https://app.gecko-creative.com`, sign up with your own email, confirm it, then "Create the Gecko workspace". You are the founder.
6. Bring the old records back: in the current app, point it at the new project (its own Vercel or Pages variables) and Settings > Data > Restore the backup. Leads, clients and projects land in the new database.

### 3. The website on the same Cloudflare account
Import `gecko-site` the same way (root directory `/`, build `npm run build`, deploy `npx wrangler deploy`), then add the custom domains `gecko-creative.com` and `www.gecko-creative.com`.

### 4. First client
Clients > Add client > Overview (fill and save) > Client logins > Create invite link > Send on WhatsApp. The client opens the link, creates an account with that same email, confirms it, and lands in their portal.
