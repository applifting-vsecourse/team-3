import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { useLocality } from "@/hooks/useLocality"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { LandingView } from "@/features/events/components/LandingView"
import { RecruitingGroups } from "@/features/groups/components/RecruitingGroups"

/**
 * `?lokalita=praha-3`: the sections for that locality (#182). Without it the visitor's default
 * (#55): a locality picked earlier in this browser, else the profile's home locality, else a
 * guess from the IP, else all of Czechia. A malformed value is dropped (`.catch`).
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
  const locality = useLocality(lokalita, isPending ? undefined : (user?.id ?? null))

  return (
    <>
      <Seo />
      <AppHeader />
      {/* Wait for the session and the default locality, so a signed-in user never sees the
          invitation flash and the sections never swap from one locality to another. */}
      <LandingView
        isSignedIn={isPending || locality.slug === undefined ? undefined : Boolean(user)}
        viewerId={user?.id ?? null}
        // Celé Česko is no locality: the API decides (the home locality, else all of Czechia)
        localitySlug={locality.slug === ALL_LOCALITIES_SLUG ? undefined : locality.slug}
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
