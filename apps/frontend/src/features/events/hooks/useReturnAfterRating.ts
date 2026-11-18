import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

/**
 * Where a saved rating leads (#367): back where the user came from — Moje › Proběhlé, where the
 * card now says „tvoje ★ N“, or the event's detail. From the e-mail asking for a rating (#65) or
 * after a reload there is nothing in the app to go back to: Proběhlé then, in place of the form,
 * so going back doesn't open it again.
 */
export function useReturnAfterRating(): () => void {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: ROUTES.myEvents, search: { tab: "probehle" }, replace: true })
  }
}
