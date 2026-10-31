# Gecko app

Gecko's working tool and client portal, in one app.

- **Team** (`app.gecko-creative.com`): the pipeline of leads, each client's portal (the overview they see, onboarding answers, concepts and approvals, who can sign in), and the team.
- **Clients** (`client.gecko-creative.com`): their campaign overview, the onboarding sheet, and the concepts to approve, ask changes on or comment.

## Layout

```
web/        the app: React, TypeScript, Vite. Served by Cloudflare Workers (web/wrangler.jsonc)
supabase/   the database: migrations/, setup.sql (all migrations in one file), tests/
DEPLOY.md   putting it online: Supabase, Cloudflare, domains, first people
```

## Work on it

```sh
cd web
cp .env.example .env.local   # the project URL and anon key
npm install
npm run dev
```

Every pull request runs format, lint, typecheck, tests and build (`.github/workflows/web.yml`). Database rules and their tests: `sh supabase/tests/local/run.sh` (needs `postgresql-16` and `postgresql-16-pgtap`).

## Security in one paragraph

Sign-in is Supabase Auth with confirmed emails. Every table has row-level security, and every write a client can make goes through a database function that checks who they are. Only the founder invites people. Invite links are random, stored only as a hash, work once, for one email, and expire. Only the client can approve a concept, and editing a concept after approval makes a new version that needs approving again. The browser only ever holds the public anon key.
