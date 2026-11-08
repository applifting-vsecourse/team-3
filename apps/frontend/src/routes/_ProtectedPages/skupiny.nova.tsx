import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { FORM, PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupForm } from "@/features/groups/components/GroupForm"
import { useCreateGroup } from "@/features/groups/hooks/useGroupMutations"
import { useOpenSavedGroup } from "@/features/groups/hooks/useOpenSavedGroup"
import { newGroupPrefill, newGroupSearchSchema } from "@/features/groups/lib/newGroupSearch"

export const Route = createFileRoute("/_ProtectedPages/skupiny/nova")({
  component: NewGroupPage,
  validateSearch: newGroupSearchSchema,
})

/**
 * Figma D-06, D-06d. Any signed-in user; the founder becomes the group's admin. An empty
 * list's „Založit skupinu“ fills in its activity and locality (A-07e).
 */
function NewGroupPage() {
  const search = Route.useSearch()
  const openSavedGroup = useOpenSavedGroup()
  const { catalog, queries } = useCatalog()
  const createGroup = useCreateGroup()

  return (
    <>
      <Seo title="Nová skupina" />
      <PageBand
        title="Nová skupina"
        description={"Parta, která se schází pravidelně. Stačí název, aktivita a lokalita."}
        back={{ to: ROUTES.groups, fallbackLabel: "Skupiny", label: "Skupiny" }}
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-4")}>
        <div className={FORM}>
          {catalog ? (
            <GroupForm
              catalog={catalog}
              initialValues={newGroupPrefill(search, catalog)}
              submitLabel="Založit skupinu"
              note="Zakladatel se stane správcem skupiny."
              isSubmitting={createGroup.isPending}
              errorMessage={createGroup.error?.message}
              onSubmit={(input) =>
                createGroup.mutate(input, {
                  onSuccess: (group) => {
                    toast.success("Skupina je založená")
                    openSavedGroup(group.id)
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
