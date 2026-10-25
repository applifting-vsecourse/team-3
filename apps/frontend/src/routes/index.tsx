import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { LandingView } from "@/features/events/components/LandingView"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const { user, isPending } = useSession()

  return (
    <>
      <Seo />
      <AppHeader />
      {/* Wait for the session, so a signed-in user never sees the invitation flash. */}
      <LandingView shouldInviteToSignUp={!user && !isPending} />
    </>
  )
}
