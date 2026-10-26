import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { AppHeader } from "@/features/auth/components/AppHeader"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

export const Route = createFileRoute("/_ProtectedPages")({
  loader: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (session) return
    context.queryClient.clear()
    throw redirect({
      to: ROUTES.login,
      search: { from: encodeRedirectUri(location) },
      // what the page came with goes along, e.g. the result of verifying the
      // e-mail (#155): its dialog then shows over the sign-in
      state: true,
    })
  },
  component: Layout,
})

function Layout() {
  return (
    <>
      <Seo />
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </>
  )
}
