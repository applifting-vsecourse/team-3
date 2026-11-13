import { createFileRoute, redirect } from "@tanstack/react-router"

import { initialMySection } from "@/routes/_ProtectedPages/-moje/initialMySection"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { myEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"

/**
 * „Moje“ from the navigation (#304): Akce, or Skupiny when the only requests to decide wait
 * there (`initialMySection`). The lists are the ones the page shows; fetchQuery (not
 * ensureQueryData) loads them again when stale or invalidated, so a request just decided in
 * the management doesn't send the user to a tab with nothing waiting (review #318). A
 * signed-out visitor is sent to the sign-in by the protected layout.
 */
export const Route = createFileRoute("/_ProtectedPages/moje/")({
  loader: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    const viewerId = session.user.id
    // a list that fails to load counts as unknown: the page then opens on Akce
    const [organizing, groups] = await Promise.all([
      queryClient.fetchQuery(myEventsQueryOptions("organizing", viewerId)).catch(() => undefined),
      queryClient.fetchQuery(myGroupsQueryOptions(viewerId)).catch(() => undefined),
    ])
    throw redirect({
      to: initialMySection(organizing, groups) === "skupiny" ? "/moje/skupiny" : "/moje/akce",
      replace: true,
    })
  },
})
