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

## Layout

- `src/lib`: the Supabase client, config checks and error messages.
- `src/features/auth`: sign in, sign up, invites and who the signed-in person is.
- `src/features/shell`: the agency app frame and its role-based navigation.
- `src/features/portal`: the client portal. Clients are routed here and never load agency screens.
- `src/components`: shared buttons, fields and notices.
