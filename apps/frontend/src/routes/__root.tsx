import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import "@/styles/global.css"

import { BottomNav } from "@/components/BottomNav/BottomNav"
import { Toaster } from "@/components/ui/sonner"

import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const { user } = useSession()

  return (
    <>
      {/* Bottom padding keeps page content clear of the fixed mobile navigation. */}
      <div className="pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav isSignedIn={Boolean(user)} />
      <Toaster
        richColors
        position="top-right"
      />
    </>
  )
}
