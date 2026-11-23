import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

/**
 * Where a saved edit of an event goes (#37), so the saved form isn't left
 * behind „Zpět“. With history in the app: back to the previous entry — usually
 * Správa akce or the detail the edit was opened from, but whatever the user
 * visited last. Opened from a link, with nothing to go back to: Správa akce
 * replaces the form, where the form's „Správa akce“ back link leads too; for
 * the superadmin, who doesn't manage the event (#308), its detail.
 */
export function useLeaveEditForm(eventId: string, { canManage = true } = {}) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return () => {
    if (canGoBack) {
      router.history.back()
    } else {
      void navigate({
        to: canManage ? ROUTES.manageEvent : ROUTES.eventDetail,
        params: { eventId },
        replace: true,
      })
    }
  }
}
