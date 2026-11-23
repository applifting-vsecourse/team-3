import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import {
  authSessionQueryOptions,
  needsOnboarding,
} from "@/features/auth/api/authSessionQueryOptions"
import { inviterQueryOptions } from "@/features/invites/api/invitesQueryOptions"
import { invitePath, isInviteCode, rememberInvite } from "@/features/invites/lib/invite"

/**
 * A friend's invite link (#406, brief §4). No page of its own: it remembers the code and sends
 * a visitor to the sign-up, which shows who invites (`from` keeps the link, so the
 * verification e-mail and Google bring it back, also in another browser). A new account still
 * in the onboarding gets its invite step; anyone else signed in lands on the inviter's profile,
 * with „Přidat do přátel“ there. An invalid code leads on as if there were none.
 */
export const Route = createFileRoute("/pozvanka/$code")({
  beforeLoad: async ({ context, params }) => {
    const { code } = params
    rememberInvite(code)
    const from = isInviteCode(code) ? invitePath(code) : undefined
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) throw redirect({ to: ROUTES.signup, search: { from }, replace: true })
    if (needsOnboarding(session.user)) {
      throw redirect({ to: ROUTES.onboarding, search: { from }, replace: true })
    }
    const inviter = from
      ? await context.queryClient.ensureQueryData(inviterQueryOptions(code)).catch(() => null)
      : null
    if (!inviter) throw redirect({ to: ROUTES.events, replace: true })
    if (inviter.id === session.user.id) throw redirect({ to: ROUTES.profile, replace: true })
    throw redirect({ to: ROUTES.userProfile, params: { userId: inviter.id }, replace: true })
  },
})
