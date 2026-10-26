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

The database enforces every role (founder, sales, editor, assistant): what a role can't see is never sent to its browser. `sh supabase/tests/local/run.sh` runs the 31 security tests on a throwaway PostgreSQL.

Free Supabase projects pause after a week with no use; opening the dashboard wakes them.
