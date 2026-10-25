import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { ManagedParticipants } from "@/features/events/components/ManagedParticipants"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useEventParticipants } from "@/features/events/hooks/useEventParticipants"
import { editRefusal } from "@/features/events/lib/editRefusal"
import { formatEventTime } from "@/features/events/lib/formatEvent"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/sprava")({
  component: ManageEventPage,
})

/**
 * Figma D-03, D-03d (#43): the organizer's page of their event — who is coming,
 * against the minimum and the maximum, and the way to edit or cancel it.
 * Anyone else gets an explanation; the API answers them 403. Pending
 * requests come with #53, removing people with #60.
 */
function ManageEventPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  const { event, isPending, isNotFound, error, retry } = useEventDetail(eventId, viewerId)
  const isOrganizer = event !== undefined && event.organizer.id === session.user?.id
  const participants = useEventParticipants(eventId, viewerId, isOrganizer)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  const canEdit = event !== undefined && editRefusal(event, session.user?.id) === null

  return (
    <>
      <Seo title="Správa akce" />
      <div className={cn(PAGE, "gap-6")}>
        <BackLink
          to={ROUTES.eventDetail}
          params={{ eventId }}
          fallbackLabel="Na akci"
        />
        {/* once the event is here, its title is the page's heading (D-03d) */}
        {!isOrganizer || !event ? (
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Správa akce</h1>
        ) : null}
        {isNotFound ? (
          <Alert>
            <AlertTitle>Akce nenalezena</AlertTitle>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Zkontroluj připojení a zkus to znovu.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
              >
                <RefreshCw className="size-4" />
                Zkusit znovu
              </Button>
            </AlertDescription>
          </Alert>
        ) : isPending || !event ? (
          <Skeleton className="h-40 w-full" />
        ) : !isOrganizer ? (
          <Alert>
            <AlertTitle>Akci spravuje jen její organizátor.</AlertTitle>
          </Alert>
        ) : (
          // D-03d: the event's summary on the left, who is coming on the right
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] md:gap-12">
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{event.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatEventTime(event.startsAt, event.endsAt)}
                </p>
              </div>
              {event.status === "cancelled" ? (
                // instead of the capacity: „Chybí ještě 2“ would read as if it still happens
                <Alert>
                  <AlertTitle>Akce je zrušená</AlertTitle>
                  {event.cancelReason ? (
                    <AlertDescription className="whitespace-pre-line">
                      {event.cancelReason}
                    </AlertDescription>
                  ) : null}
                </Alert>
              ) : (
                <CapacityBar
                  approvedCount={event.approvedCount}
                  minParticipants={event.minParticipants}
                  maxParticipants={event.maxParticipants}
                />
              )}
              {canEdit ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="outline"
                  >
                    <Link
                      to={ROUTES.editEvent}
                      params={{ eventId }}
                    >
                      <Pencil />
                      Upravit akci
                    </Link>
                  </Button>
                  <CancelEventDialog
                    isPending={cancelEvent.isPending}
                    onCancel={(reason) =>
                      cancelEvent.mutateAsync(reason).then(
                        () => toast.success("Akce je zrušená."),
                        (cancelError: Error) => {
                          toast.error(cancelError.message)
                          throw cancelError
                        },
                      )
                    }
                  />
                </div>
              ) : null}
            </section>
            <ManagedParticipants
              participants={participants.participants}
              error={participants.error}
              onRetry={participants.retry}
            />
          </div>
        )}
      </div>
    </>
  )
}
