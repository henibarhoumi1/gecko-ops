# Gecko web

The rebuild of the Gecko app in React and TypeScript. It talks to the same Supabase project as the current app, so the database rules and their tests in `../supabase` still decide who can see what.

## Run it

```sh
cp .env.example .env.local   # fill in the project URL and anon key
npm install
npm run dev
```

## Checks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all run on every pull request (see `.github/workflows/web.yml`).

## Hosting

Cloudflare Workers serves `dist/` (see `wrangler.jsonc`), on `app.gecko-creative.com` and `client.gecko-creative.com`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build variables. Full steps in `../DEPLOY.md`.

## Layout

- `src/lib`: the Supabase client, config checks and error messages.
- `src/features/auth`: sign in, sign up, invites and who the signed-in person is.
- `src/features/shell`: the agency app frame and its role-based navigation.
- `src/features/portal`: the client portal (overview, onboarding, concepts). Clients are routed here and never load agency screens.
- `src/features/clients`: the team's side of each client: the overview they see, concepts, onboarding answers and logins.
- `src/features/concepts`: concepts and their conversation, shared by both sides.
- `src/features/onboarding`: the onboarding sheet, the same questions and answers as the current app.
- `src/components`: shared buttons, fields and notices.
