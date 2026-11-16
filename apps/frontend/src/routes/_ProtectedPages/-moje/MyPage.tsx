import type { ReactNode } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { BandTabs, BandTabsItem } from "@/components/PageBand/BandTabs"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { useAttendingEvents, useOrganizingEvents } from "@/features/events/hooks/useMyEvents"
import { useMyGroups } from "@/features/groups/hooks/useMyGroups"

export type MySection = "akce" | "skupiny"

type MyPageProps = {
  section: MySection
  /** The band's line for the chip shown (Figma C-01d…C-05d). */
  description: string
  /** The page's primary: „Založit akci“ / „Založit skupinu“. */
  create: { label: string; to: "/akce/nova" | "/skupiny/nova" }
  /** The chips and their content. */
  children: ReactNode
}

/**
 * „Moje“ (Figma C-01…C-05, #304): the events and the groups of the signed-in user in one
 * place. The band has the tabs Akce / Skupiny, each its own address (/moje/akce,
 * /moje/skupiny); the page under them has the chips. Both tabs count what they hold, so the
 * events and the groups are loaded on either.
 */
export function MyPage({ section, description, create, children }: MyPageProps) {
  const navigate = useNavigate()
  const { user } = useSession()
  // the protected layout lets only a signed-in user in; the session is cached by then
  const viewerId = user?.id ?? ""
  const eventsCount = useMyEventsCount(viewerId)
  const groups = useMyGroups(viewerId)

  return (
    <>
      <Seo title={section === "akce" ? "Moje akce" : "Moje skupiny"} />
      <Tabs
        value={section}
        // replace, as the chips: switching tabs shouldn't fill the back button
        onValueChange={(value) =>
          void navigate({ to: value === "skupiny" ? "/moje/skupiny" : "/moje/akce", replace: true })
        }
        className="gap-0"
      >
        <PageBand
          variant="section"
          isMarkFull
          title="Moje"
          description={description}
          action={
            <Button
              asChild
              size="lg"
              // mobile: floats above the bottom navigation
              className="fixed right-4 bottom-20 z-30 h-11 shadow-md md:static md:shadow-none"
            >
              <Link to={create.to}>
                <Plus />
                {create.label}
              </Link>
            </Button>
          }
        >
          <BandTabs>
            <BandTabsItem
              value="akce"
              count={eventsCount}
            >
              Akce
            </BandTabsItem>
            <BandTabsItem
              value="skupiny"
              count={groups.groups?.length}
            >
              Skupiny
            </BandTabsItem>
          </BandTabs>
        </PageBand>
        <TabsContent
          value={section}
          className={cn(
            PAGE,
            // the floating primary must not cover the last card
            "gap-5 pb-24",
          )}
        >
          {children}
        </TabsContent>
      </Tabs>
    </>
  )
}

/**
 * The events on the tab Akce: those I go to or wait for and those I run, without the
 * cancelled ones — what Přihlášen and Pořádám count. An event in both counts once.
 */
function useMyEventsCount(viewerId: string): number | undefined {
  const attending = useAttendingEvents(viewerId)
  const organizing = useOrganizingEvents(viewerId)
  if (!attending.sections || !organizing.sections) return undefined
  const { pending, approved } = attending.sections
  return new Set(
    [...pending, ...approved, ...organizing.sections.upcoming].map((event) => event.id),
  ).size
}
