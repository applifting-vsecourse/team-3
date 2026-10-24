import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { AdminOnlyNotice } from "@/features/groups/components/AdminOnlyNotice"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { DeactivateGroupButton } from "@/features/groups/components/DeactivateGroupButton"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GroupManagement } from "@/features/groups/components/GroupManagement"
import { GroupFacts, GroupHeading } from "@/features/groups/components/GroupSummary"
import { InactiveGroupNotice } from "@/features/groups/components/InactiveGroupNotice"
import { GROUP_TYPE_FOR_ADMIN } from "@/features/groups/lib/formatGroup"
import { GROUPS_PAGE } from "@/features/groups/lib/pageLayout"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/sprava")({
  component: ManageGroupPage,
})

/**
 * Figma D-07 (mobile) and D-07d (desktop), the admin's entry from the group
 * page: requests and members (#46), editing and deactivation (#54). A
 * deactivated group is read-only, so its management is closed.
 */
function ManageGroupPage() {
  const { groupId } = Route.useParams()
  const session = useSession()
  const user = session.user
  // undefined while the session loads; a failed check counts as a visitor
  const viewerId = session.isPending ? undefined : (user?.id ?? null)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const group = groupQuery.data
  const isAdmin =
    group?.viewerMembership?.role === "admin" && group.viewerMembership.status === "active"
  const navigate = useNavigate()
  const onDeactivated = () => {
    toast.success("Skupina je deaktivovaná")
    void navigate({ to: "/skupiny/$groupId", params: { groupId } })
  }

  return (
    <>
      <Seo title="Správa skupiny" />
      <div className={cn(GROUPS_PAGE, "gap-4")}>
        <BackLink
          to="/skupiny/$groupId"
          params={{ groupId }}
          fallbackLabel="Skupina"
          label="Skupina"
        />
        {group?.status === "inactive" ? (
          <InactiveGroupNotice />
        ) : group && !isAdmin ? (
          <AdminOnlyNotice groupId={groupId} />
        ) : group && isDesktop ? (
          // D-07d: the group's summary on the left, requests and members on the right
          <div className="grid grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] items-start gap-12">
            <section className="flex flex-col gap-5">
              <GroupHeading group={group} />
              <GroupFacts
                group={group}
                typeLabels={GROUP_TYPE_FOR_ADMIN}
              />
              <div className="flex flex-wrap gap-2">
                <EditButton groupId={groupId} />
                <DeactivateGroupButton
                  groupId={groupId}
                  groupName={group.name}
                  onDeactivated={onDeactivated}
                />
              </div>
            </section>
            <GroupManagement
              groupId={groupId}
              isDesktop
            />
          </div>
        ) : group ? (
          <ManageMobile
            group={group}
            onDeactivated={onDeactivated}
          />
        ) : (
          <CatalogState
            queries={[groupQuery]}
            errorTitle="Skupinu se nepodařilo načíst"
          />
        )}
      </div>
    </>
  )
}

/** D-07: the group's card, requests and members, then the group's actions. */
function ManageMobile({ group, onDeactivated }: { group: GroupDetail; onDeactivated: () => void }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Správa skupiny</h1>
      <GroupCard group={group} />
      <GroupManagement
        groupId={group.id}
        isDesktop={false}
      />
      <div className="flex flex-col gap-2 py-4">
        <EditButton
          groupId={group.id}
          className="w-full"
        />
        <DeactivateGroupButton
          groupId={group.id}
          groupName={group.name}
          onDeactivated={onDeactivated}
          className="w-full"
        />
      </div>
    </>
  )
}

function EditButton({ groupId, className }: { groupId: string; className?: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn("h-11", className)}
    >
      <Link
        to="/skupiny/$groupId/upravit"
        params={{ groupId }}
      >
        <Pencil />
        Upravit skupinu
      </Link>
    </Button>
  )
}
