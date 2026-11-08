import { createRouter } from "@tanstack/react-router"

import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { rememberHistoryEntry } from "@/components/BackLink/backTarget"
import { NotFound } from "@/components/Error/NotFound"
import { RootErrorBoundary } from "@/components/Error/RootErrorBoundary"
import { queryClient } from "@/config/react-query"
import { routeTree } from "@/routeTree.gen"

import { AppHeader } from "@/features/auth/components/AppHeader"

/**
 * A page of this app like any other, with the header (DESIGN.md › Layout:
 * „Every page keeps the app chrome“); the bottom navigation comes from the
 * root. Put together here: `components/` doesn't import from `features/`.
 */
function NotFoundPage() {
  return (
    <>
      <AppHeader />
      <NotFound />
    </>
  )
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // always at the root: inside the signed-in layout the 404 would get a second header
  notFoundMode: "root",
  defaultNotFoundComponent: NotFoundPage,
  // no header here: the error may come from the header (the session) itself
  defaultErrorComponent: ({ error }) => <RootErrorBoundary error={error} />,
  defaultPendingComponent: AppLoadingScreen,
})

// the back link names the page it returns to (BackLink, N9)
router.subscribe("onResolved", ({ toLocation }) =>
  rememberHistoryEntry(toLocation.state.__TSR_index, toLocation.pathname),
)

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}
