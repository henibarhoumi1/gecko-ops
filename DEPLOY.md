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

## Data and authentication
Without Supabase build configuration the static site opens sample data only; it does not provide a live team workspace. Phase 0 supports a local Supabase Auth/PostgreSQL backend with database-enforced workspace roles, assignments, secure client shares, and saved feedback.

The Phase 0 build intentionally refuses remote Supabase URLs. Do not deploy a build containing test credentials or connect this local setup to production. Production deployment requires a separately reviewed configuration, migrations, backup plan, and security test run.
