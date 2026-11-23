import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useCatalog } from "@/hooks/useCatalog"
import { imageUrl } from "@/lib/image"
import { FORM, PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { EventForm } from "@/features/events/components/EventForm"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useLeaveEditForm } from "@/features/events/hooks/useLeaveEditForm"
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
  const session = useSession()
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  const { event, isPending, isNotFound, membersOnlyGroupId, error } = useEventDetail(
    eventId,
    viewerId,
  )
  const { catalog, queries } = useCatalog()
  const updateEvent = useUpdateEvent(eventId, session.user?.id ?? "")
  // the superadmin edits without managing the event (#308): back to its detail, not Správa akce
  const isManager = event?.canManage !== false
  const leaveForm = useLeaveEditForm(eventId, { canManage: isManager })

  const refusal = event ? editRefusal(event) : null

  return (
    <>
      <Seo title="Upravit akci" />
      <PageBand
        title="Upravit akci"
        description={event?.title}
        back={
          isManager
            ? {
                to: ROUTES.manageEvent,
                params: { eventId },
                fallbackLabel: "Správa akce",
                label: "Správa akce",
              }
            : {
                to: ROUTES.eventDetail,
                params: { eventId },
                fallbackLabel: "Detail akce",
                label: "Detail akce",
              }
        }
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-4")}>
        <div className={FORM}>
          {isNotFound ? (
            <Alert>
              <AlertTitle>Akce není dostupná</AlertTitle>
            </Alert>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
              <AlertDescription>Zkontroluj připojení a zkus to znovu.</AlertDescription>
            </Alert>
          ) : membersOnlyGroupId ? (
            // a members-only event of a group the user isn't in
            <Alert>
              <AlertTitle>Upravit akci může jen její organizátor nebo správce skupiny.</AlertTitle>
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
                endsAt: event.endsAt?.toISOString() ?? null,
                minParticipants: event.minParticipants,
                maxParticipants: event.maxParticipants,
                approvalMode: event.approvalMode,
                // only the organizer has it (#86): a fellow group admin's form leaves it out
                emailOnJoin: event.emailOnJoin ?? undefined,
              }}
              initialImageSrc={event.imageKey ? imageUrl(event.imageKey) : null}
              isSubmitting={updateEvent.isPending}
              errorMessage={updateEvent.error?.message}
              onSubmit={({ activityId: _activity, approvalMode: _approval, ...changes }, image) =>
                updateEvent.mutate(
                  { changes, image },
                  {
                    onSuccess: ({ imageError }) => {
                      if (imageError) {
                        // the rest is saved; the picked image stays in the form to try again
                        toast.error(`Změny jsou uložené, obrázek ale ne. ${imageError}`, {
                          duration: 10_000,
                        })
                        return
                      }
                      toast.success("Změny jsou uložené.")
                      // the detail and Správa akce read the saved event from the cache
                      leaveForm()
                    },
                  },
                )
              }
            />
          ) : (
            <CatalogState queries={queries} />
          )}
        </div>
      </div>
    </>
  )
}
