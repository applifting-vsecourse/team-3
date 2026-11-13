import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { useLocality } from "@/hooks/useLocality"

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
  const navigate = Route.useNavigate()
  // the chip's pick and reset replace `?lokalita=` of a shared link: it would win over them
  const dropUrlLocality = () =>
    void navigate({ search: (prev) => ({ ...prev, lokalita: undefined }), replace: true })

  return (
    <>
      <Seo />
      <AppHeader isSignInOnMobile />
      {/* Wait for the session and the default locality, so a signed-in user never sees the
          invitation flash and the sections never swap from one locality to another. */}
      <LandingView
        isSignedIn={isPending || locality.slug === undefined ? undefined : Boolean(user)}
        viewerId={user?.id ?? null}
        // Celé Česko too: the API must not put the home locality in its place, or the chip
        // would say „Celé Česko“ over the sections of Praha 3 (#299)
        localitySlug={locality.slug}
        localityControl={{
          state: locality,
          onChange: (slug) => {
            locality.pick(slug)
            dropUrlLocality()
          },
          onReset: () => {
            locality.forget()
            dropUrlLocality()
          },
        }}
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
