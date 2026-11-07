import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { BandTabs, BandTabsItem } from "@/components/PageBand/BandTabs"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupFilters } from "@/features/groups/components/GroupFilters"
import { GroupList } from "@/features/groups/components/GroupList"
import { MyGroups } from "@/features/groups/components/MyGroups"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { groupsSearchSchema, type GroupsSearch } from "@/features/groups/lib/groupsSearch"

export const Route = createFileRoute("/skupiny/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

/**
 * Figma A-07 (mobile) and A-07d (desktop): public and closed active groups,
 * filtered by activity and locality like /akce but without a map, so it is
 * clear this is another part. A signed-in user also has the tab „Moje“
 * (A-07m, A-07md; #118), kept in the URL as `?tab=moje`.
 */
function GroupsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  const { groups, catalog, isPending, error, retry } = useGroups(search)
  // for the count on the tab; the same query fills the tab itself
  const myGroupsQuery = useQuery({
    ...myGroupsQueryOptions(user?.id ?? ""),
    enabled: Boolean(user),
  })
  const myGroupsCount = myGroupsQuery.data?.length

  // replace: changing a filter shouldn't fill the back button with filter states
  const setSearch = (patch: Partial<GroupsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  const clearFilters = () => void navigate({ search: {}, replace: true })

  // „Všechny“, and the whole page for a visitor, who has no tabs
  const allGroups = (
    <>
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
    </>
  )

  // Any signed-in user founds a group; visitors don't get the button (A-07).
  const createGroup = user ? (
    <Button
      asChild
      // the page's primary, beside the title like „Založit akci“ in Moje akce (A-07d)
      size="lg"
      // mobile: floats above the bottom navigation (Figma A-07)
      className="fixed right-4 bottom-20 z-30 h-11 shadow-md md:static md:shadow-none"
    >
      <Link to="/skupiny/nova">
        <Plus />
        Založit skupinu
      </Link>
    </Button>
  ) : null

  const band = (tabs?: ReactNode) => (
    <PageBand
      variant="section"
      isMarkFull
      title="Skupiny"
      description="Party, které se scházejí pravidelně. Přidej se, nebo založ vlastní."
      action={createGroup}
    >
      {tabs}
    </PageBand>
  )

  // the floating „Založit skupinu“ must not cover the last card
  const content = cn(PAGE, "flex-1 gap-6", user && "pb-24")

  return (
    <>
      <Seo title="Skupiny" />
      <AppHeader />
      {user ? (
        <Tabs
          value={search.tab ?? "vsechny"}
          // replace: switching tabs shouldn't fill the back button; the filters stay for Všechny
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, tab: value === "moje" ? "moje" : undefined }),
              replace: true,
            })
          }
          className="flex-1 gap-0"
        >
          {band(
            <BandTabs>
              <BandTabsItem
                value="vsechny"
                count={groups?.length}
              >
                Všechny
              </BandTabsItem>
              <BandTabsItem
                value="moje"
                count={myGroupsCount}
              >
                Moje
              </BandTabsItem>
            </BandTabs>,
          )}
          <main className={content}>
            <TabsContent
              value="vsechny"
              className="flex flex-col gap-6"
            >
              {allGroups}
            </TabsContent>
            <TabsContent value="moje">
              <MyGroups viewerId={user.id} />
            </TabsContent>
          </main>
        </Tabs>
      ) : (
        <>
          {band()}
          <main className={content}>{allGroups}</main>
        </>
      )}
    </>
  )
}
