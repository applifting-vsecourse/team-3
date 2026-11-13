import { createFileRoute, redirect } from "@tanstack/react-router"

/** „Moje“ opens on its first tab, Akce (#304). */
export const Route = createFileRoute("/_ProtectedPages/moje/")({
  beforeLoad: () => {
    throw redirect({ to: "/moje/akce", replace: true })
  },
})
