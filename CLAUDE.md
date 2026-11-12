# HobbyHub

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the event list (#38): `Event` model → seed → repository (Prisma `where` built by a pure, tested function) → service → `GET /api/events` (DTO-validated query) → zod schema → TanStack Query → the `/akce` page with filters in the URL. Copy its pattern for new features.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

It also adds its own `dark:` shades (`dark:bg-input/30`, `dark:aria-invalid:ring-destructive/40`…). Strip those too: `dark:` does not belong in `components/ui`, because the app has a light mode only ([`DESIGN.md`](DESIGN.md)), and `tokens.test.ts` fails on any `dark:` there.

Its focus rings are translucent (`ring-ring/50`, `ring-destructive/20`, `outline-ring/50`): 2.45 : 1 and less, under the 3 : 1 a focus indicator needs. Make them full colour (`ring-ring`, `ring-destructive`, `outline-ring`); `tokens.test.ts` fails on the translucent ones anywhere in `src`.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
