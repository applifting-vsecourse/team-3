import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import { AttendingEvents, OrganizingEvents } from "@/features/events/components/MyEvents"
import { myEventsSearchSchema } from "@/features/events/lib/myEvents"

export const Route = createFileRoute("/_ProtectedPages/moje-akce")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

/**
 * Figma C-01, C-02 (B-035, #44): the events I go to and the ones I organize,
 * soonest first. Proběhlé comes with #61, my groups' events with #70.
 */
function MyEventsPage() {
  const { tab = "prihlasen" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()

  return (
    <>
      <Seo title="Moje akce" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Moje akce</h1>
        <Tabs
          value={tab}
          // replace: switching tabs shouldn't fill the back button
          onValueChange={(value) =>
            void navigate({
              search: value === "poradam" ? { tab: "poradam" } : {},
              replace: true,
            })
          }
          className="gap-6"
        >
          <TabBar>
            <TabBarItem value="prihlasen">Přihlášen</TabBarItem>
            <TabBarItem value="poradam">Pořádám</TabBarItem>
          </TabBar>
          {/* the protected layout lets only a signed-in user in; the session is cached by then */}
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
        </Tabs>
      </div>
    </>
  )
}
