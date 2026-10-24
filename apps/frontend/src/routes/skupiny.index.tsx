import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { GroupFilters } from "@/features/groups/components/GroupFilters"
import { GroupList } from "@/features/groups/components/GroupList"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { groupsSearchSchema, type GroupsSearch } from "@/features/groups/lib/groupsSearch"

export const Route = createFileRoute("/skupiny/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

/**
 * Figma A-07: public and closed active groups, filtered by activity and
 * locality like /akce but without a map, so it is clear this is another part.
 */
function GroupsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  const { groups, catalog, isPending, error, retry } = useGroups(search)

  // replace: changing a filter shouldn't fill the back button with filter states
  const setSearch = (patch: Partial<GroupsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  const clearFilters = () => void navigate({ search: {}, replace: true })

  return (
    <>
      <Seo title="Skupiny" />
      <Header userMenu={<HeaderMenu />} />
      <main
        className={cn(
          "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 md:py-8",
          // the floating „Založit skupinu“ must not cover the last card
          user && "pb-24",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Skupiny</h1>
          {/* Any signed-in user founds a group; visitors don't get the button (A-07). */}
          {user ? (
            <Button
              asChild
              size="lg"
              // mobile: floats above the bottom navigation (Figma A-07)
              className="fixed right-4 bottom-20 z-30 shadow-md md:static md:shadow-none"
            >
              <Link to="/skupiny/nova">
                <Plus />
                Založit skupinu
              </Link>
            </Button>
          ) : null}
        </div>

        <GroupFilters
          search={search}
          catalog={catalog}
          onChange={setSearch}
          onClearAll={clearFilters}
        />

        <GroupList
          groups={groups ?? []}
          isLoading={isPending}
          error={error}
          // Only the error state offers a retry; refocusing the tab refetches.
          onRetry={retry}
          hasActivityFilter={search.kategorie !== undefined || search.aktivita !== undefined}
        />
      </main>
    </>
  )
}
