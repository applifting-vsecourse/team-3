import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { FORM, PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { AdminOnlyNotice } from "@/features/groups/components/AdminOnlyNotice"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { InactiveGroupNotice } from "@/features/groups/components/InactiveGroupNotice"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/akce/nova")({
  component: NewGroupEventPage,
})

/**
 * Figma D-01g, D-01gd (B-055): the event form for a group, opened from the
 * group's page by one of its admins. The activity and the locality start as
 * the group's; the API refuses anyone but an admin as well.
 */
function NewGroupEventPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const session = useSession()
  const user = session.user
  // undefined while the session loads; a failed check counts as a visitor
  const viewerId = session.isPending ? undefined : (user?.id ?? null)
  const { catalog, queries } = useCatalog()
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const createEvent = useCreateEvent()
  const group = groupQuery.data
  const isAdmin =
    group?.viewerMembership?.role === "admin" && group.viewerMembership.status === "active"

  return (
    <>
      <Seo title="Nová akce skupiny" />
      <div className={cn(PAGE, "gap-4")}>
        <BackLink
          to="/skupiny/$groupId"
          params={{ groupId }}
          fallbackLabel="Skupina"
          label="Skupina"
        />
        <div className={FORM}>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nová akce skupiny</h1>
          {group?.status === "inactive" ? (
            <InactiveGroupNotice />
          ) : catalog && group && !isAdmin ? (
            <AdminOnlyNotice groupId={groupId} />
          ) : catalog && group ? (
            <EventForm
              catalog={catalog}
              group={{ id: group.id, name: group.name }}
              initialValues={{ activityId: group.activity.id, localityId: group.locality.id }}
              isSubmitting={createEvent.isPending}
              errorMessage={createEvent.error?.message}
              onSubmit={(input) =>
                createEvent.mutate(input, {
                  onSuccess: (event) => {
                    toast.success("Akce je zveřejněná.")
                    // replace: „Zpět“ from the new event goes back to the group, not to an empty form
                    void navigate({
                      to: ROUTES.eventDetail,
                      params: { eventId: event.id },
                      replace: true,
                    })
                  },
                })
              }
            />
          ) : (
            <CatalogState queries={[...queries, groupQuery]} />
          )}
        </div>
      </div>
    </>
  )
}
