import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useCatalog } from "@/hooks/useCatalog"

import { useSession } from "@/features/auth/hooks/useSession"
import { EventForm } from "@/features/events/components/EventForm"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useUpdateEvent } from "@/features/events/hooks/useUpdateEvent"
import { editRefusal } from "@/features/events/lib/editRefusal"
import { CatalogState } from "@/features/groups/components/CatalogState"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/upravit")({
  component: EditEventPage,
})

/**
 * Figma D-02 (#41): the organizer edits the event with the creation form,
 * until it starts. Anyone else gets an explanation; the API answers them 403.
 */
function EditEventPage() {
  const { eventId } = Route.useParams()
  const navigate = useNavigate()
  const session = useSession()
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  const { event, isPending, isNotFound, error } = useEventDetail(eventId, viewerId)
  const { catalog, queries } = useCatalog()
  const updateEvent = useUpdateEvent(eventId, session.user?.id ?? "")

  const refusal = event ? editRefusal(event, session.user?.id) : null

  return (
    <>
      <Seo title="Upravit akci" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Upravit akci</h1>
        {isNotFound ? (
          <Alert>
            <AlertTitle>Akce nenalezena</AlertTitle>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
            <AlertDescription>Zkontroluj připojení a zkus to znovu.</AlertDescription>
          </Alert>
        ) : isPending || !event ? (
          <Skeleton className="h-96 w-full" />
        ) : refusal ? (
          <Alert>
            <AlertTitle>{refusal}</AlertTitle>
          </Alert>
        ) : catalog ? (
          <EventForm
            mode="edit"
            catalog={catalog}
            approvedCount={event.approvedCount}
            initialValues={{
              title: event.title,
              description: event.description,
              activityId: event.activity.id,
              localityId: event.locality.id,
              lat: event.lat,
              lng: event.lng,
              address: event.address,
              startsAt: event.startsAt.toISOString(),
              minParticipants: event.minParticipants,
              maxParticipants: event.maxParticipants,
              approvalMode: event.approvalMode,
            }}
            isSubmitting={updateEvent.isPending}
            errorMessage={updateEvent.error?.message}
            onSubmit={({ activityId: _activity, approvalMode: _approval, ...changes }) =>
              updateEvent.mutate(changes, {
                onSuccess: () => {
                  toast.success("Změny jsou uložené")
                  void navigate({ to: ROUTES.eventDetail, params: { eventId } })
                },
              })
            }
          />
        ) : (
          <CatalogState queries={queries} />
        )}
      </div>
    </>
  )
}
