import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { AttendingEvents, OrganizingEvents } from "@/features/events/components/MyEvents"
import { myEventsSearchSchema } from "@/features/events/lib/myEvents"

export const Route = createFileRoute("/_ProtectedPages/moje-akce")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

/**
 * Figma C-01, C-02, C-01d, C-02d (B-035, #44): the events I go to and the ones I organize,
 * soonest first. Proběhlé comes with #61, my groups' events with #70.
 */
function MyEventsPage() {
  const { tab = "prihlasen" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()

  return (
    <>
      <Seo title="Moje akce" />
      <div className={cn(PAGE, "gap-6")}>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Moje akce</h1>
          {/* desktop: with the title, like „Založit skupinu“ (C-01d, A-07md);
              mobile: it floats in Pořádám */}
          <Button
            asChild
            className="hidden h-11 shrink-0 md:inline-flex"
          >
            <Link to={ROUTES.newEvent}>
              <Plus />
              Založit akci
            </Link>
          </Button>
        </div>
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
          {/* desktop: as wide as two tabs, like Moje skupiny (Figma C-01d, A-07md) */}
          <TabBar className="md:w-89">
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
