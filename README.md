# HobbyHub

HobbyHub helps people find others for their hobbies: organizers post an event (a match, a hike, a board-game night) with how many people are still missing, and anyone nearby can find it on a list or map and sign up.

**Live (staging):** https://team-3.vsepractical.applifting.dev — deployed automatically from `main`; demo accounts are under [Seeded users](#seeded-users).

**Project docs** (user stories, planning notes, design decisions): [docs/](docs/README.md)

**Stack:** React + Vite + TanStack Router/Query + Tailwind/shadcn (frontend) · NestJS + Prisma + PostgreSQL + BetterAuth (backend) · pnpm workspaces. Built on the [4IT580](https://4it580.vse.cz) full-stack starter template.

## Team

| Name                 | GitHub                                           |
| -------------------- | ------------------------------------------------ |
| Veronika Seyfriedová | [@seyvv](https://github.com/seyvv)               |
| Martin Bartoň        | [@BarrySagBrig](https://github.com/BarrySagBrig) |
| Eliška Hřebíčková    | [@hree01](https://github.com/hree01)             |
| Adéla Mitrová        | [@adela111](https://github.com/adela111)         |

## How we work

- **Every change goes through a branch and a pull request** — nobody pushes to `main`. Branch from `main` and name the branch `<type>/<issue>-<slug>`, where the type is `feat`, `fix`, `polish` or `docs` and the issue number is there when the change has an issue (`feat/39-detail-akce`, `fix/address-czech-only`). `main` is protected by a ruleset: no direct pushes or force pushes.
- **Every PR needs an approval from a teammate** before it is merged, and CI (`pnpm check-all`) has to pass. The author doesn't approve their own PR.
- Before merging, run the agent review in Claude Code: `/review-branch` (or `/review-branch <PR number>`). It checks the branch against `main`, [CLAUDE.md](CLAUDE.md) and the story, and doesn't change code. The prompt is in [.claude/commands/review-branch.md](.claude/commands/review-branch.md).
- The PR description follows the [template](.github/pull_request_template.md) and links the story or issue with `Refs #<number>`, not `Closes` — the PO closes the issue after accepting it on staging. A PR without an issue says in one sentence why it is needed. (Applies to every PR after #171.)
- Merged to `main` = deployed to staging.
- What "ready" and "done" mean: [Definition of Ready & Done](docs/definition-of-ready-a-done.md).

## Prerequisites

- Node.js 24.22.1 or newer on the 24 line — [`.nvmrc`](.nvmrc) pins 24.22.2. Older versions have the Brotli decoder hole CVE-2026-111497, so check `node -v` and update if needed. With nvm or fnm, `nvm install` picks the version up from anywhere in the repo (they search parent directories), and every `package.json` declares the range too, so pnpm warns if you are outside it.
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

Locally the superadmin is `admin@example.com` / `adminpassword26` (from `apps/backend/.env.example`; passwords need 10 characters with a letter and a digit, B-010). A database seeded before that keeps `adminpassword`. On staging it uses the values set in the deployment environment. The prepared demo cases (an approval event with one free spot, events missing one person, pending group requests) are described in the header of `demo-data.ts`.

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
- **The container migrates and seeds on every start** — it runs `prisma migrate deploy`, then the seed, then the app. The seed is repeatable: it syncs the activity/locality catalog, creates the superadmin and demo accounts only if they are missing (and finishes one an earlier seed left half-created, recognised by having no username and the seed's password), and inserts the demo groups and events only into a database with no events and no groups, so a redeploy never duplicates or moves them. Set `SEED_DEMO_DATA=false` to skip the demo data (the catalog is always seeded). If the superadmin can't be created (check `SUPERADMIN_EMAIL` and a `SUPERADMIN_PASSWORD` of at least 10 characters with a letter and a digit), the seed logs why and carries on with the demo data. Any other failed seed is logged and the app starts anyway.

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
