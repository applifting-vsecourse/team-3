# HobbyHub

**Projektová dokumentace – rozcestník (user stories, zápis z planningu, design atd.): [docs/](docs/README.md)**

**Staging:** https://team-3.vsepractical.applifting.dev (nasazuje se automaticky z `main`, demo účty viz [Seeded users](#seeded-users))

#full-stack starter template

Starter template for [4IT580](https://4it580.vse.cz) team projects: a minimal, working full-stack app you fork and grow into your own product.

**Stack:** React + Vite + TanStack Router/Query + Tailwind/shadcn (frontend) · NestJS + Prisma + PostgreSQL + BetterAuth (backend) · pnpm workspaces.

What's included: working login/signup (BetterAuth — you use it, you don't build it), one worked-example feature (the event list on `/akce` with filters and a map — copy its pattern), seeded demo data, example tests, CI. The full demo app this template was trimmed from lives on the `reference/full-app` branch.

## Prerequisites

- Node.js 24 — the version in [`.nvmrc`](.nvmrc). With nvm or fnm, `nvm use` picks it up from anywhere in the repo (they search parent directories), and every `package.json` declares it too, so pnpm warns if you are on an older one.
- pnpm — `corepack enable` picks the version from `package.json`
- Docker (for the database)

## Quick start

```shell
pnpm install
pnpm dev
```

`pnpm dev` does everything: creates `.env` files from examples, starts Postgres in Docker, applies migrations, seeds demo data, and runs both dev servers.

| What               | Where                                                |
| ------------------ | ---------------------------------------------------- |
| Frontend           | http://localhost:3050                                |
| API                | http://localhost:4050/api                            |
| API docs (Swagger) | http://localhost:4050/api/docs                       |
| Auth API docs      | http://localhost:4050/api/auth/reference             |
| DB browser         | `pnpm backend prisma:studio` → http://localhost:5555 |

The ports are deliberately odd — 3050, 4050, and Postgres on 5433 rather than the usual 3000, 4000 and 5432 — so the stack doesn't fight whatever else you have running. They're pinned rather than auto-incremented: the API only accepts requests from the frontend's exact origin, so a port that silently moved would surface as an unexplained CORS error.

### Seeded users

The seed loads the HobbyHub test data from issue #47 ([`demo-data.ts`](apps/backend/src/scripts/seed/data/demo-data.ts)): the activity and locality catalog, 41 users, 10 groups and 59 upcoming events in Prague. Event dates are relative to the moment of seeding. The same data is seeded on staging.

Demo accounts for walking through the app (all demo accounts share one password):

| Role                        | Name           | Email                        | Password                       |
| --------------------------- | -------------- | ---------------------------- | ------------------------------ |
| Seeker (looking for events) | Jakub Král     | `jakub.kral@example.com`     | `hobbyhub-demo-2026`           |
| Organizer                   | Petra Nováková | `petra.novakova@example.com` | `hobbyhub-demo-2026`           |
| Group admin                 | Tomáš Dvořák   | `tomas.dvorak@example.com`   | `hobbyhub-demo-2026`           |
| Unverified email            | Eva Malá       | `eva.mala@example.com`       | `hobbyhub-demo-2026`           |
| Superadmin (`role = admin`) | –              | `SUPERADMIN_EMAIL` from env  | `SUPERADMIN_PASSWORD` from env |

Locally the superadmin is `admin@example.com` / `adminpassword` (from `apps/backend/.env.example`). On staging it uses the values set in the deployment environment. The prepared demo cases (an approval event with one free spot, events missing one person, pending group requests) are described in the header of `demo-data.ts`.

Verification/reset emails are printed to the backend terminal (console mailer) unless you configure Resend or SMTP in `apps/backend/.env`.

## Everyday commands

```shell
pnpm check-all                     # lint + type-check + tests + builds (what CI runs)
pnpm backend test                  # backend unit tests (jest)
pnpm frontend test:ci              # frontend component tests (vitest)
pnpm backend prisma:migrations:run # create + apply a migration after schema changes
pnpm backend prisma:studio         # browse/edit the database
pnpm backend seed                  # re-seed the database
pnpm dev:down                      # stop the database container
```

## Deployment

The whole app ships as one Docker Compose stack — Postgres, the backend, and the frontend (built to static files, served by nginx). See [`docker-compose.yml`](docker-compose.yml).

```shell
cp .env.example .env     # then edit: secrets, and the public URLs
docker compose up --build
```

On **Coolify** (Hetzner): create a Docker Compose resource pointing at this repo, set the variables from `.env.example` in the resource's environment, and assign domains to the `frontend` and `backend` services. Coolify's proxy handles TLS, so the published host ports only matter for local runs.

Two things worth knowing:

- **You set exactly two URLs**, `BACKEND_URL` and `FRONTEND_URL`. The backend uses them for CORS, BetterAuth trusted origins and password-reset links; the frontend's API URL is derived from `BACKEND_URL`. Point them at the real domains or the backend rejects the browser.
- **The frontend bakes its API URL in at build time** (`VITE_*` are build args, not runtime env), so changing `BACKEND_URL` needs a rebuild, not just a restart.
- **The container migrates and seeds on every start** — it runs `prisma migrate deploy`, then the seed, then the app. The seed is repeatable: it syncs the activity/locality catalog, creates the superadmin and demo accounts only if they are missing, and inserts the demo groups and events only into a database with no events and no groups, so a redeploy never duplicates or moves them. Set `SEED_DEMO_DATA=false` to skip the demo data (the catalog is always seeded). If the superadmin can't be created (check `SUPERADMIN_EMAIL` and a `SUPERADMIN_PASSWORD` of at least 8 characters), the seed logs why and carries on with the demo data. Any other failed seed is logged and the app starts anyway.

## When something goes wrong

| Symptom                                                  | Cause / fix                                                                                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` fails immediately, Docker errors              | Docker Desktop isn't running. Start it and retry.                                                                                                                                |
| `Port 3050 is already in use`                            | Another app has it. Stop it — the port is pinned on purpose, because the API only accepts requests from `http://localhost:3050`.                                                 |
| Page loads but login fails, console shows a CORS error   | The frontend is on a different port than the API expects. See above.                                                                                                             |
| `EADDRINUSE :::4050`                                     | An old backend is still running: `lsof -i :4050` then kill the process.                                                                                                          |
| Prisma: "column does not exist" after editing the schema | You changed `schema.prisma` without migrating: `pnpm backend prisma:migrations:run`.                                                                                             |
| Want the demo data back / a clean database               | `pnpm backend db:reset` — it replays the migrations and re-runs the seed with fresh dates. (Plain `pnpm backend seed` does **not** wipe anything; it only adds what is missing.) |
| A commit is blocked by lint or formatting                | The pre-commit hook auto-fixes what it can; fix the rest, or `git commit --no-verify` to bypass it once.                                                                         |
| Browser shows a red error overlay while typing           | That's the type/lint checker, not a crash. Read the message — the app is still running.                                                                                          |

## Layout

```
apps/backend/   NestJS — src/modules (features), src/core, src/shared; prisma/ (schema, migrations)
apps/frontend/  React — src/routes (pages), src/features (feature folders), src/components (UI kit)
```

Working conventions for AI-assisted development: [`CLAUDE.md`](CLAUDE.md). UI rules every screen must follow: [`DESIGN.md`](DESIGN.md).
