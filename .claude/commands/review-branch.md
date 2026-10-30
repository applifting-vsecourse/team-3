---
description: Review the current branch against main before a PR is merged — blocking / suggestion / nit, read-only
argument-hint: '[PR number or branch, default: current branch]'
---

Review the changes on this branch against `main`. Target: $ARGUMENTS (if empty, the current branch and its open PR).

**Don't change any code.** Read, run read-only commands, and report. No edits, commits, pushes or PR comments.

## What to check against

1. The diff: `git fetch` first, then `git diff origin/main...HEAD` (or the PR's head branch). Review only what this branch changes.
2. [`CLAUDE.md`](../../CLAUDE.md): its conventions and the worked-example pattern for new features.
3. [`DESIGN.md`](../../DESIGN.md), if the branch touches any UI.
4. The story: the PR description (`gh pr view --json title,body`) and the issue it links (`Refs #n` → `gh issue view n`). Check every acceptance criterion: is it met, partly met, or missing? Flag anything the branch does beyond the story's scope.
5. [`docs/definition-of-ready-a-done.md`](../../docs/definition-of-ready-a-done.md): the pre-PR checklist and the Definition of Done.
6. Docs that the change makes wrong: README, `docs/`, comments, Swagger descriptions.

## Output

List the problems in three groups:

- **Blocking**: must be fixed before merge. Bugs, unmet acceptance criteria, broken CLAUDE.md/DESIGN.md rules, missing tests the DoD asks for, docs left wrong by this change, anything untrue.
- **Suggestion**: worth doing, but the PR can merge without it.
- **Nit**: cosmetic or wording.

Each item gets the file and line as a link (`[file.ts:42](path/file.ts#L42)`), what is wrong, and **why it matters**: who or what it affects and how. If a group is empty, say so. Finish with a one-line verdict: ready to merge, or not until the blocking items are fixed. If you didn't check something (tests not run, no linked issue found), say so instead of assuming it is fine.
