import { createFileRoute } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ChipTabs, ChipTabsItem } from "@/components/FilterChip/ChipTabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { MyPage } from "@/routes/_ProtectedPages/-moje/MyPage"

import { useSession } from "@/features/auth/hooks/useSession"
import { RATING_WINDOW_DAYS } from "@/features/events/api/ratingSchemas"
import {
  AttendingEvents,
  MyEventsLoading,
  OrganizingEvents,
  PastEvents,
} from "@/features/events/components/MyEvents"
import {
  useAttendingEvents,
  useMyEventsTab,
  useOrganizingEvents,
  usePastEvents,
} from "@/features/events/hooks/useMyEvents"
import {
  attendingLine,
  myEventsSearchSchema,
  organizingLine,
  type MyEventsTabName,
} from "@/features/events/lib/myEvents"

export const Route = createFileRoute("/_ProtectedPages/moje/akce")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

const TABS: readonly MyEventsTabName[] = ["prihlasen", "poradam", "probehle"]

/** The band's line on Proběhlé: what the tab holds and what to do there – for a participant
 * (the event) and an organizer (the participants, #436) alike. */
const PAST_LINE = `Akce, které už proběhly. Hodnotit můžeš do ${RATING_WINDOW_DAYS} dnů od konce.`

/**
 * Moje › Akce (Figma C-01, C-02, C-06 and their desktops; B-035, #44, #304, #367): the chips
 * Přihlášen, Pořádám and Proběhlé. Pořádám has the events of the groups I run too (#70);
 * Proběhlé is the history that used to be on the profile (#367: the profile is who I am and whom
 * I know, Moje what I do).
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
  // all of the history, cancelled events too: the chip counts what it lists (Figma C-06)
  const pastCount = usePastEvents(viewerId).events?.length
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
            : tab === "probehle"
              ? // PO 26. 11.: under „Moje“ there is always a line, Proběhlé too
                PAST_LINE
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
            search: { tab: TABS.find((name) => name === value) ?? "prihlasen" },
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
          <ChipTabsItem
            value="probehle"
            count={pastCount}
          >
            Proběhlé
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
            <TabsContent value="probehle">
              <PastEvents viewerId={user.id} />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </MyPage>
  )
}
