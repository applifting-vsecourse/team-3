import { createFileRoute } from "@tanstack/react-router"

import { ChipTabs, ChipTabsItem } from "@/components/FilterChip/ChipTabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { MyPage } from "@/routes/_ProtectedPages/-moje/MyPage"

import { useSession } from "@/features/auth/hooks/useSession"
import { MemberGroups, MyGroupsLoading, RunningGroups } from "@/features/groups/components/MyGroups"
import { useMyGroups, useMyGroupsTab } from "@/features/groups/hooks/useMyGroups"
import { memberLine, myGroupsSearchSchema, runningLine } from "@/features/groups/lib/myGroups"

export const Route = createFileRoute("/_ProtectedPages/moje/skupiny")({
  component: MyGroupsPage,
  validateSearch: myGroupsSearchSchema,
})

/**
 * Moje › Skupiny (Figma C-04, C-05, C-04d, C-05d; B-056, #304): the chips Jsem členem and
 * Spravuju, the same pattern as Přihlášen and Pořádám in Moje › Akce. It used to be the tab
 * „Moje“ on /skupiny (#118), which now leads here.
 */
function MyGroupsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  // loaded and split once here, for the chips, the band's line and the chips' content
  const myGroups = useMyGroups(user?.id ?? "")
  const { sections } = myGroups
  // ?tab, else Spravuju when requests wait there or there is only something to run (as #188)
  const tab = useMyGroupsTab(search.tab, myGroups)

  return (
    <MyPage
      section="skupiny"
      // Figma C-04d, C-05d: my requests waiting, or those waiting for me
      description={
        tab === "spravuju"
          ? runningLine(sections?.running)
          : tab === "clen"
            ? memberLine(sections)
            : // keeps the line's height while the chip is picked
              " "
      }
      create={{ label: "Založit skupinu", to: "/skupiny/nova" }}
    >
      <Tabs
        value={tab ?? ""}
        // replace, as in Moje › Akce; the chip chosen goes to the URL
        onValueChange={(value) =>
          void navigate({
            search: { tab: value === "spravuju" ? "spravuju" : "clen" },
            replace: true,
          })
        }
        className="gap-5"
      >
        <ChipTabs aria-label="Moje skupiny">
          <ChipTabsItem
            value="clen"
            count={sections && sections.pending.length + sections.joined.length}
          >
            Jsem členem
          </ChipTabsItem>
          <ChipTabsItem
            value="spravuju"
            count={sections?.running.length}
          >
            Spravuju
          </ChipTabsItem>
        </ChipTabs>
        {user && tab === undefined ? (
          <MyGroupsLoading />
        ) : user ? (
          <>
            <TabsContent value="clen">
              <MemberGroups groups={myGroups} />
            </TabsContent>
            <TabsContent value="spravuju">
              <RunningGroups groups={myGroups} />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </MyPage>
  )
}
