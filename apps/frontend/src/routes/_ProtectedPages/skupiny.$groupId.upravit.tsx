import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { AdminOnlyNotice } from "@/features/groups/components/AdminOnlyNotice"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupForm } from "@/features/groups/components/GroupForm"
import { InactiveGroupNotice } from "@/features/groups/components/InactiveGroupNotice"
import { useUpdateGroup } from "@/features/groups/hooks/useGroupMutations"
import { GROUPS_FORM, GROUPS_PAGE } from "@/features/groups/lib/pageLayout"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/upravit")({
  component: EditGroupPage,
})

/**
 * D-07 › Upravit skupinu: the same form as founding (D-06, D-06d), every field can
 * change. Only an admin; the API answers 403 to anyone else as well.
 */
function EditGroupPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const session = useSession()
  const user = session.user
  // undefined while the session loads; a failed check counts as a visitor
  const viewerId = session.isPending ? undefined : (user?.id ?? null)
  const { catalog, queries } = useCatalog()
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const updateGroup = useUpdateGroup(groupId)
  const group = groupQuery.data
  const isAdmin =
    group?.viewerMembership?.role === "admin" && group.viewerMembership.status === "active"

  return (
    <>
      <Seo title="Upravit skupinu" />
      <div className={cn(GROUPS_PAGE, "gap-4")}>
        <BackLink
          to="/skupiny/$groupId/sprava"
          params={{ groupId }}
          fallbackLabel="Správa skupiny"
        />
        <div className={GROUPS_FORM}>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Upravit skupinu</h1>
          {group?.status === "inactive" ? (
            <InactiveGroupNotice />
          ) : catalog && group && !isAdmin ? (
            <AdminOnlyNotice groupId={groupId} />
          ) : catalog && group ? (
            <GroupForm
              catalog={catalog}
              initialValues={{
                name: group.name,
                description: group.description,
                activityId: group.activity.id,
                localityId: group.locality.id,
                type: group.type,
              }}
              submitLabel="Uložit změny"
              isSubmitting={updateGroup.isPending}
              errorMessage={updateGroup.error?.message}
              onSubmit={(input) =>
                updateGroup.mutate(input, {
                  onSuccess: () => {
                    toast.success("Změny jsou uložené")
                    void navigate({ to: "/skupiny/$groupId", params: { groupId } })
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
