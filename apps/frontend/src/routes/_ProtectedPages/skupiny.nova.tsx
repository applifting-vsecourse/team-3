import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { cn } from "@/lib/utils"

import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupForm } from "@/features/groups/components/GroupForm"
import { useCreateGroup } from "@/features/groups/hooks/useGroupMutations"
import { GROUPS_FORM, GROUPS_PAGE } from "@/features/groups/lib/pageLayout"

export const Route = createFileRoute("/_ProtectedPages/skupiny/nova")({
  component: NewGroupPage,
})

/** Figma D-06, D-06d. Any signed-in user; the founder becomes the group's admin. */
function NewGroupPage() {
  const navigate = useNavigate()
  const { catalog, queries } = useCatalog()
  const createGroup = useCreateGroup()

  return (
    <>
      <Seo title="Nová skupina" />
      <div className={cn(GROUPS_PAGE, "gap-4")}>
        <BackLink
          to={ROUTES.groups}
          fallbackLabel="Skupiny"
          label="Skupiny"
        />
        <div className={GROUPS_FORM}>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nová skupina</h1>
          {catalog ? (
            <GroupForm
              catalog={catalog}
              submitLabel="Založit skupinu"
              note="Zakladatel se stane správcem skupiny."
              isSubmitting={createGroup.isPending}
              errorMessage={createGroup.error?.message}
              onSubmit={(input) =>
                createGroup.mutate(input, {
                  onSuccess: (group) => {
                    toast.success("Skupina je založená")
                    void navigate({ to: "/skupiny/$groupId", params: { groupId: group.id } })
                  },
                })
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
