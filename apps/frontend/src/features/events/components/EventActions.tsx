import { Link } from "@tanstack/react-router"
import { Eye, Loader2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { HideEventDialog } from "@/features/events/components/HideEventDialog"
import { editRefusal } from "@/features/events/lib/editRefusal"

type EventActionsProps = {
  event: EventDetail
  isCancelling: boolean
  onCancel: (reason: string) => Promise<unknown>
  isModerating: boolean
  onHide: (reason: string) => Promise<unknown>
  onUnhide: () => void
  /** For tests. */
  now?: Date
}

/**
 * What the viewer may do with the event on its detail, under the panel's
 * buttons: „Upravit“ for whoever may edit it (#41, the superadmin too, #308),
 * „Zrušit akci“ for who manages it (#52), and for the superadmin
 * „Deaktivovat“, or „Obnovit“ on a deactivated event (#308). Nothing for
 * anyone else.
 */
export function EventActions({
  event,
  isCancelling,
  onCancel,
  isModerating,
  onHide,
  onUnhide,
  now = new Date(),
}: EventActionsProps) {
  const canEditNow = editRefusal(event, now) === null
  const canCancelNow = event.canManage && canEditNow
  const canHide = event.canModerate && event.status === "published"
  const canUnhide = event.canModerate && event.status === "hidden"
  if (!canEditNow && !canCancelNow && !canHide && !canUnhide) return null

  return (
    <div className="flex flex-wrap gap-3">
      {canEditNow ? (
        <Button
          asChild
          variant="outline"
        >
          <Link
            to={ROUTES.editEvent}
            params={{ eventId: event.id }}
          >
            Upravit
          </Link>
        </Button>
      ) : null}
      {canCancelNow ? (
        <CancelEventDialog
          isPending={isCancelling}
          onCancel={onCancel}
        />
      ) : null}
      {canHide ? (
        <HideEventDialog
          isPending={isModerating}
          onHide={onHide}
        />
      ) : null}
      {canUnhide ? (
        <Button
          variant="outline"
          disabled={isModerating}
          onClick={onUnhide}
        >
          {isModerating ? <Loader2 className="size-4 animate-spin" /> : <Eye />}
          Obnovit
        </Button>
      ) : null}
    </div>
  )
}
