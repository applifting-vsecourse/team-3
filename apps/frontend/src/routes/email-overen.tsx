import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"

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
    // The cached session may still say „unverified“: fetch it anew first, so
    // the dialog trusts a fresh one (success never flashes up as a failure)
    // and the banner is already gone. Unreachable: the dialog still says
    // what the link did.
    await context.queryClient
      .fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      .catch(() => undefined)
    throw redirect({
      href: safeRedirect(search.from, ROUTES.events),
      // „Zpět“ then leads where the link was opened from, not here again
      replace: true,
      state: { emailVerification: { error: search.error } },
    })
  },
})
