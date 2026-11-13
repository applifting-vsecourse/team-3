import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { localityDefault, useLocality } from "@/hooks/useLocality"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { EmptyGroups } from "@/features/groups/components/EmptyGroups"
import { GroupFilters } from "@/features/groups/components/GroupFilters"
import { GroupList } from "@/features/groups/components/GroupList"
import { useGroups } from "@/features/groups/hooks/useGroups"
import {
  groupsSearchSchema,
  hasActiveFilters,
  type GroupsSearch,
} from "@/features/groups/lib/groupsSearch"

export const Route = createFileRoute("/skupiny/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
  // the tab „Moje“ (#118) is Moje › Skupiny since #304; old links lead there
  beforeLoad: ({ search }) => {
    if (search.tab === "moje") throw redirect({ to: "/moje/skupiny", replace: true })
  },
})

/**
 * Figma A-07 (mobile) and A-07d (desktop): public and closed active groups,
 * filtered by activity and locality like /akce but without a map, so it is
 * clear this is another part. My own groups are in Moje › Skupiny (#304);
 * the old `?tab=moje` leads there.
 */
function GroupsPage() {
  const urlSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user, isPending: isSessionPending } = useSession()
  const shownLocality = useLocality(
    urlSearch.lokalita,
    isSessionPending ? undefined : (user?.id ?? null),
  )
  // the filters as shown: the visitor's default locality (#55) when the URL has none
  const search = { ...urlSearch, lokalita: shownLocality.slug }
  const { groups, catalog, isPending, error, retry } = useGroups(search, {
    // nothing for all of Czechia first while the default locality loads
    isEnabled: shownLocality.slug !== undefined,
  })
  // replace: changing a filter shouldn't fill the back button with filter states
  // a filter only, nothing remembered: e.g. „… v celém Česku“ from an empty list widens it
  // this once (review #274)
  const setSearch = (patch: Partial<GroupsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  // a pick in the locality chip: remembered in this browser (#55)
  const pickLocality = (lokalita: string) => {
    shownLocality.pick(lokalita)
    setSearch({ lokalita })
  }
  // also the remembered locality: back to the visitor's default (#55)
  const clearFilters = () => {
    shownLocality.forget()
    void navigate({ search: {}, replace: true })
  }
  const canClear = hasActiveFilters(urlSearch) || shownLocality.isPicked
  // „Zrušit výběr“ in the locality panel: back to the default, the other filters stay
  const clearLocality = () => {
    shownLocality.forget()
    void navigate({ search: (prev) => ({ ...prev, lokalita: undefined }), replace: true })
  }

  const allGroups = (
    <>
      <GroupFilters
        search={search}
        catalog={catalog}
        onChange={setSearch}
        onLocalityChange={pickLocality}
        onClearAll={canClear ? clearFilters : undefined}
        localityDefault={localityDefault(shownLocality, clearLocality)}
      />
      <GroupList
        groups={groups ?? []}
        isLoading={isPending}
        error={error}
        // Only the error state offers a retry; refocusing the tab refetches.
        onRetry={retry}
        empty={
          <EmptyGroups
            search={search}
            catalog={catalog}
            isVisitor={!user}
            onSearchChange={setSearch}
          />
        }
      />
    </>
  )

  // Any signed-in user founds a group; visitors don't get the button (A-07).
  const createGroup = user ? (
    <Button
      asChild
      // the page's primary, beside the title like „Založit akci“ in Moje (A-07d)
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

  const band = (
    <PageBand
      variant="section"
      isMarkFull
      title="Skupiny"
      description="Party, které se scházejí pravidelně. Přidej se, nebo založ vlastní."
      action={createGroup}
    />
  )

  // the floating „Založit skupinu“ must not cover the last card
  const content = cn(PAGE, "flex-1 gap-6", user && "pb-24")

  return (
    <>
      <Seo title="Skupiny" />
      <AppHeader />
      {/* the band and its H1 belong to main, as on every page */}
      <main className="flex flex-1 flex-col">
        {band}
        <div className={content}>{allGroups}</div>
      </main>
    </>
  )
}
