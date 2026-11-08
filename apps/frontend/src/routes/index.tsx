import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { useLocality } from "@/hooks/useLocality"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { LandingView } from "@/features/events/components/LandingView"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const { user, isPending } = useSession()
  const locality = useLocality(undefined, isPending ? undefined : (user?.id ?? null))

  return (
    <>
      <Seo />
      <AppHeader />
      {/* Wait for the session, so a signed-in user never sees the invitation flash. */}
      <LandingView
        isSignedIn={isPending ? undefined : Boolean(user)}
        locality={locality}
      />
    </>
  )
}
