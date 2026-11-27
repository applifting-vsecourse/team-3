import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Navigate, Outlet, useLocation } from "@tanstack/react-router"

import "@/styles/global.css"

import { ROUTES } from "@/app/routes"
import { BottomNav } from "@/components/BottomNav/BottomNav"
import { useToastClearance } from "@/components/Toast/useToastClearance"
import { Toaster } from "@/components/ui/sonner"

import { needsOnboarding } from "@/features/auth/api/authSessionQueryOptions"
import { AgeConfirmationDialog } from "@/features/auth/components/AgeConfirmationDialog"
import { EmailVerifiedDialog } from "@/features/auth/components/EmailVerifiedDialog"
import { useAuthLinkFrom } from "@/features/auth/hooks/useAuthLinkFrom"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  // a phone's toasts stay above the page's own bottom action, measured (review #443)
  useToastClearance()
  const { user, isPending } = useSession()
  const signInFrom = useAuthLinkFrom()
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
        signInFrom={signInFrom}
      />
      {/* what the link in the verification e-mail did, over any page (#155) */}
      <EmailVerifiedDialog />
      <AgeConfirmationDialog />
      {/* PO 26. 11. („Pohrajte si s toast notifikacemi, obsahují butony a jsou ve zvláštních
          místech“): one calm place for every toast, as most apps keep them — bottom right on
          desktop, bottom on a phone just above the bottom navigation (64 px + a gap), never
          over the header; app colours, not the bright fills of richColors; no buttons in them.
          A phone page with its own action at the bottom lifts them over it (--toast-bottom) */}
      <Toaster
        position="bottom-right"
        // Sonner's mobileOffset holds only up to 600 px, the bottom navigation up to 767 px:
        // the bottom comes from CSS for both (--toast-offset, global.css), review #443
        offset={{ bottom: "var(--toast-offset)", right: 24 }}
        mobileOffset={{ bottom: "var(--toast-bottom)", left: 16, right: 16 }}
      />
    </>
  )
}
