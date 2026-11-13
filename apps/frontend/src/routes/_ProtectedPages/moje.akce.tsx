import { createFileRoute } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ChipTabs, ChipTabsItem } from "@/components/FilterChip/ChipTabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import {
  AttendingEvents,
  MyEventsLoading,
  OrganizingEvents,
} from "@/features/events/components/MyEvents"
import {
  useAttendingEvents,
  useMyEventsTab,
  useOrganizingEvents,
} from "@/features/events/hooks/useMyEvents"
import { attendingLine, myEventsSearchSchema, organizingLine } from "@/features/events/lib/myEvents"
import { MyPage } from "@/routes/_ProtectedPages/-moje/MyPage"

export const Route = createFileRoute("/_ProtectedPages/moje/akce")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

/**
 * Moje › Akce (Figma C-01, C-02, C-01d, C-02d; B-035, #44, #304): the chips Přihlášen and
 * Pořádám, as the tabs of Moje akce were. Pořádám has the events of the groups I run too
 * (#70).
 */
function MyEventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  const viewerId = user?.id ?? ""
  // for the counts on the chips; the same queries fill the chips themselves
  const attending = useAttendingEvents(viewerId)
  const organizing = useOrganizingEvents(viewerId)
  // the events I go to, without the cancelled ones (the count in Figma C-01)
  const attendingCount =
    attending.sections && attending.sections.pending.length + attending.sections.approved.length
  // the upcoming ones, as in Přihlášen (Figma C-02: Nadcházející)
  const organizingCount = organizing.sections?.upcoming.length
  // ?tab, else Pořádám when requests wait or there is only something to run (#188)
  const tab = useMyEventsTab(search.tab, attending, organizing)

  return (
    <MyPage
      section="akce"
      // Figma C-01d, C-02d: the nearest event, or the requests waiting
      description={
        tab === "poradam"
          ? organizingLine(organizing.events)
          : tab === "prihlasen"
            ? attendingLine(attending.events, new Date())
            : // keeps the line's height while the chip is picked
              " "
      }
      create={{ label: "Založit akci", to: ROUTES.newEvent }}
    >
      <Tabs
        // none selected while the chip is being picked
        value={tab ?? ""}
        // replace: switching chips shouldn't fill the back button. The chip chosen goes to the
        // URL, so it stays whatever the requests do and a reload keeps it.
        onValueChange={(value) =>
          void navigate({
            search: { tab: value === "poradam" ? "poradam" : "prihlasen" },
            replace: true,
          })
        }
        className="gap-5"
      >
        <ChipTabs aria-label="Moje akce">
          <ChipTabsItem
            value="prihlasen"
            count={attendingCount}
          >
            Přihlášen
          </ChipTabsItem>
          <ChipTabsItem
            value="poradam"
            count={organizingCount}
          >
            Pořádám
          </ChipTabsItem>
        </ChipTabs>
        {user && tab === undefined ? (
          <MyEventsLoading />
        ) : user ? (
          <>
            <TabsContent value="prihlasen">
              <AttendingEvents viewerId={user.id} />
            </TabsContent>
            <TabsContent value="poradam">
              <OrganizingEvents viewerId={user.id} />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </MyPage>
  )
}
