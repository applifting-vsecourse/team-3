import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Navigate, Outlet, useLocation } from "@tanstack/react-router"

import "@/styles/global.css"

import { ROUTES } from "@/app/routes"
import { BottomNav } from "@/components/BottomNav/BottomNav"
import { Toaster } from "@/components/ui/sonner"

import { needsOnboarding } from "@/features/auth/api/authSessionQueryOptions"
import { AgeConfirmationDialog } from "@/features/auth/components/AgeConfirmationDialog"
import { EmailVerifiedDialog } from "@/features/auth/components/EmailVerifiedDialog"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const { user, isPending } = useSession()
  const location = useLocation()
  const pathname = location.pathname.replace(/\/$/, "")

  if (
    needsOnboarding(user) &&
    pathname !== ROUTES.onboarding &&
    pathname !== ROUTES.login &&
    pathname !== ROUTES.signup &&
    !location.state.emailVerification?.error
  ) {
    return (
      <Navigate
        to={ROUTES.onboarding}
        search={{ from: location.href }}
        replace
      />
    )
  }

  return (
    <>
      {/* Pages fill the viewport (main is flex-1); bottom padding keeps content
          clear of the fixed mobile navigation. */}
      <div className="flex min-h-svh flex-col pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav
        isSignedIn={Boolean(user)}
        isSessionPending={isPending}
      />
      {/* what the link in the verification e-mail did, over any page (#155) */}
      <EmailVerifiedDialog />
      <AgeConfirmationDialog />
      <Toaster
        richColors
        position="top-right"
      />
    </>
  )
}
