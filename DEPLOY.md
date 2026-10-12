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

## Storage (later)
On the website, data is saved in the browser (this device only) until a backend exists. Plan: Supabase (Postgres, auth, file storage, row-level security so each client sees only their own page).
