import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BandTabs, BandTabsItem } from "@/components/PageBand/BandTabs"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { AttendingEvents, OrganizingEvents } from "@/features/events/components/MyEvents"
import { useAttendingEvents, useOrganizingEvents } from "@/features/events/hooks/useMyEvents"
import { attendingLine, myEventsSearchSchema, organizingLine } from "@/features/events/lib/myEvents"

export const Route = createFileRoute("/_ProtectedPages/moje-akce")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

/**
 * Figma C-01, C-02, C-01d, C-02d (B-035, #44): the events I go to and the ones I organize,
 * soonest first; Pořádám has the events of the groups I run too (#70). Proběhlé comes with #61.
 */
function MyEventsPage() {
  const { tab = "prihlasen" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  // the protected layout lets only a signed-in user in; the session is cached by then
  const viewerId = user?.id ?? ""
  // for the counts on the tabs; the same queries fill the tabs themselves
  const attending = useAttendingEvents(viewerId)
  const organizing = useOrganizingEvents(viewerId)
  // the events I go to, without the cancelled ones (the count in Figma C-01)
  const attendingCount =
    attending.sections && attending.sections.pending.length + attending.sections.approved.length
  // the upcoming ones, as in Přihlášen (Figma C-02: Nadcházející)
  const organizingCount = organizing.sections?.upcoming.length

  return (
    <>
      <Seo title="Moje akce" />
      <Tabs
        value={tab}
        // replace: switching tabs shouldn't fill the back button
        onValueChange={(value) =>
          void navigate({
            search: value === "poradam" ? { tab: "poradam" } : {},
            replace: true,
          })
        }
        className="gap-0"
      >
        <PageBand
          variant="section"
          isMarkFull
          title="Moje akce"
          // Figma C-01d, C-02d: the nearest event, or the requests waiting
          description={
            tab === "poradam"
              ? organizingLine(organizing.events)
              : attendingLine(attending.events, new Date())
          }
          action={
            // the page's primary in both tabs, like „Založit skupinu“ on Skupiny (C-01, C-01d)
            <Button
              asChild
              size="lg"
              // mobile: floats above the bottom navigation
              className="fixed right-4 bottom-20 z-30 h-11 shadow-md md:static md:shadow-none"
            >
              <Link to={ROUTES.newEvent}>
                <Plus />
                Založit akci
              </Link>
            </Button>
          }
        >
          <BandTabs>
            <BandTabsItem
              value="prihlasen"
              count={attendingCount}
            >
              Přihlášen
            </BandTabsItem>
            <BandTabsItem
              value="poradam"
              count={organizingCount}
            >
              Pořádám
            </BandTabsItem>
          </BandTabs>
        </PageBand>
        <div
          className={cn(
            PAGE,
            // the floating „Založit akci“ must not cover the last card
            "pb-24",
          )}
        >
          {user ? (
            <>
              <TabsContent value="prihlasen">
                <AttendingEvents viewerId={user.id} />
              </TabsContent>
              <TabsContent value="poradam">
                <OrganizingEvents viewerId={user.id} />
              </TabsContent>
            </>
          ) : null}
        </div>
      </Tabs>
    </>
  )
}
