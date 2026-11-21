import { useRouterState } from "@tanstack/react-router"

import { authLinkFrom } from "@/features/auth/lib/redirect"

/**
 * `from` for „Přihlásit se“ and „Registrovat“ in the header and the bottom navigation (#370):
 * this page, so signing in comes back to it — but not a page that doesn't exist, which would
 * greet the user with „Stránka nenalezena“ again after signing in (review #395). A match is
 * not found the way the router itself tells it: its status, or `_notFound` on the match that
 * shows the 404 (`notFoundMode: "root"`).
 */
export function useAuthLinkFrom(): string | undefined {
  return useRouterState({
    select: (state) =>
      state.matches.some((match) => match.status === "notFound" || match._notFound)
        ? undefined
        : authLinkFrom(state.location),
  })
}
