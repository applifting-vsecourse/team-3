import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { safeRedirect } from "@/features/auth/lib/redirect"

/**
 * Where the link in the verification e-mail leads once BetterAuth has checked
 * it (old links too). No page of its own any more (#155: a small block on an
 * empty page): it sends the user on to the page the sign-up started from, with
 * the result in the history state, and `EmailVerifiedDialog` shows it there.
 */
export const Route = createFileRoute("/email-overen")({
  // BetterAuth adds `error` (e.g. TOKEN_EXPIRED) when the link didn't work;
  // `from` is the page the sign-up started from (B-012)
  validateSearch: z.object({
    error: z.string().optional().catch(undefined),
    from: z.string().optional().catch(undefined),
  }),
  beforeLoad: async ({ context, search }) => {
    // BetterAuth sets the cookie before this callback. Refresh before a protected
    // destination reads the session: a valid link may have switched accounts.
    await context.queryClient
      .fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      .catch(() => {
        // A failed refresh must not keep showing a different cached account.
        context.queryClient.setQueryData(authKeys.session(), null)
      })
    throw redirect({
      href: safeRedirect(search.from, ROUTES.events),
      // „Zpět“ then leads where the link was opened from, not here again
      replace: true,
      state: { emailVerification: { error: search.error } },
    })
  },
})
