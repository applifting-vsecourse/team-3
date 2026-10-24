import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"

import { CatalogState } from "@/features/groups/components/CatalogState"
import { GroupForm } from "@/features/groups/components/GroupForm"
import { useCreateGroup } from "@/features/groups/hooks/useGroupMutations"

export const Route = createFileRoute("/_ProtectedPages/skupiny/nova")({
  component: NewGroupPage,
})

/** Figma D-06. Any signed-in user; the founder becomes the group's admin. */
function NewGroupPage() {
  const navigate = useNavigate()
  const { catalog, queries } = useCatalog()
  const createGroup = useCreateGroup()

  return (
    <>
      <Seo title="Nová skupina" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Nová skupina</h1>
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
    </>
  )
}
