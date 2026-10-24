import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/useCatalog"

import { useSession } from "@/features/auth/hooks/useSession"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupForm } from "@/features/groups/components/GroupForm"
import { useUpdateGroup } from "@/features/groups/hooks/useGroupMutations"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/upravit")({
  component: EditGroupPage,
})

/**
 * D-07 › Upravit skupinu: the same form as founding (D-06), every field can
 * change. Only an admin; the API answers 403 to anyone else as well.
 */
function EditGroupPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { catalog, queries } = useCatalog()
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const updateGroup = useUpdateGroup(groupId)
  const group = groupQuery.data
  const isAdmin = Boolean(user && group?.admins.some((admin) => admin.id === user.id))

  return (
    <>
      <Seo title="Upravit skupinu" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Upravit skupinu</h1>
        {catalog && group && !isAdmin ? (
          <Alert>
            <AlertTitle>Skupinu může upravit jen její správce</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link
                  to="/skupiny/$groupId"
                  params={{ groupId }}
                >
                  Zpět na skupinu
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
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
    </>
  )
}
