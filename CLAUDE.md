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

### One change, one PR

Before changing something for a PR or issue, check whether another open PR already changes the same thing: the same files, the same behaviour, the same DESIGN.md rule (`gh pr list --state open`, then `gh pr view <n> --json files`, or `git merge-tree` against its branch). If one does, build on it or leave the change to it, and say which PR covers it. Changing the same thing in two PRs means doing it twice and resolving it again in the merge conflict.

Before deciding something doesn't exist yet (a route, a component, another issue's work), `git fetch` and look at `origin/main` and the open PRs: the team merges fast.

### Parallel agents

Several agents may work at once. If a branch or the main checkout is in use by another agent, work in your own git worktree (`git worktree add ../team-3-<task> <branch>`). Never check out, stash, rebase or edit files in a tree someone else is using, not even for a review: read through `git show` and `git diff` against fetched refs instead.

### Issues: check against the sources

Implement and review an issue against all its sources, not only its text: the acceptance criteria, `BACKLOG.md` (B-xxx), `docs/` (user stories, `design-rozhodnuti.md`, sprint planning notes) and the Figma design with its „Popis obrazovky“ frames. Where they disagree, ask before choosing.

When a change meets an acceptance criterion, tick it in the issue and in the PR. Tick only what is really met; leave a criterion that needs another PR or a check in the running app unticked and say why. On Windows, write PR and issue bodies to a file as UTF-8 (`--body-file`); text piped through the console arrives as cp1250 and GitHub shows `�`.

A question for the PO is never posted by an agent on its own: draft it, a person approves the wording, then it goes to GitHub.

### Reviews

Before reviewing a PR, read the other reviewers' reviews and comments and leave out what they already raised.

A design PR may change DESIGN.md and Figma before the code: the code follows in its own issue once the PO approves the design. In such a PR a mismatch between DESIGN.md and the code is expected, not a finding.

A review finding is a claim, not an order:

- **Reviewer:** a finding that something is out of scope, wrong or missing names its source (acceptance criterion, BACKLOG.md, a PO decision, DESIGN.md, Figma) and says what goes wrong for the user. Check it in the context of the app as it is now, not only against the issue text: the issue may have been written by someone else, the behaviour may have changed since, and the text is not always current in every detail. "Not in the issue" alone is not a finding.
- **Assignee:** before applying a finding, check it against the same sources and the app. If it would remove or change something the issue, the PO, DESIGN.md or the current app relies on, don't apply it: answer in the PR with the source and let the reviewer reply. Applying a wrong finding blindly is a bug too.
- After applying a finding, re-check the acceptance criteria it touches, not only the tests.

Answer a review with a PR comment, not only by editing the PR description: a comment notifies the reviewer and stays in the timeline. Keep it short, one line per point with the commit that fixes it, and re-request the review.
