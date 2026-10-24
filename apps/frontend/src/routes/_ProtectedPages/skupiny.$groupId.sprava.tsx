import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { AdminOnlyNotice } from "@/features/groups/components/AdminOnlyNotice"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupCard } from "@/features/groups/components/GroupCard"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/sprava")({
  component: ManageGroupPage,
})

/**
 * Figma D-07, the admin's entry from the group page. In #45 it only leads to
 * editing; the Žádosti / Členové tabs come with #46, deactivation with #54.
 */
function ManageGroupPage() {
  const { groupId } = Route.useParams()
  const { user } = useSession()
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const group = groupQuery.data
  const isAdmin = Boolean(user && group?.admins.some((admin) => admin.id === user.id))

  return (
    <>
      <Seo title="Správa skupiny" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <BackLink
          to="/skupiny/$groupId"
          params={{ groupId }}
          fallbackLabel="Na skupinu"
        />
        <h1 className="text-3xl font-semibold tracking-tight">Správa skupiny</h1>
        {group && !isAdmin ? (
          <AdminOnlyNotice groupId={groupId} />
        ) : group ? (
          <>
            <GroupCard group={group} />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link
                to="/skupiny/$groupId/upravit"
                params={{ groupId }}
              >
                <Pencil />
                Upravit skupinu
              </Link>
            </Button>
          </>
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
