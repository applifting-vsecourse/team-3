import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { LandingView } from "@/features/events/components/LandingView"
import { RecruitingGroups } from "@/features/groups/components/RecruitingGroups"

/**
 * `?lokalita=praha-3`: the sections for that locality (#182). Without it the API takes the
 * profile's home locality, else all of Czechia. A malformed value is dropped (`.catch`).
 */
const landingSearchSchema = z.object({
  lokalita: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute("/")({
  component: LandingPage,
  validateSearch: landingSearchSchema,
})

function LandingPage() {
  const { user, isPending } = useSession()
  const { lokalita } = Route.useSearch()

  return (
    <>
      <Seo />
      <AppHeader />
      {/* Wait for the session, so a signed-in user never sees the invitation flash. */}
      <LandingView
        isSignedIn={isPending ? undefined : Boolean(user)}
        viewerId={user?.id ?? null}
        localitySlug={lokalita}
        renderGroups={(groups, groupsLokalita) => (
          <RecruitingGroups
            groups={groups}
            lokalita={groupsLokalita}
          />
        )}
      />
    </>
  )
}
