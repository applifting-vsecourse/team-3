import type { ReactNode } from "react"

import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"

type ManagementTab = {
  value: string
  /** The tab's label on a phone, with its count: „Žádosti (2)“. */
  label: string
  content: ReactNode
}

/**
 * The two lists of a management page (Figma D-03, D-07; #371): tabs on a phone, one under the
 * other on desktop. One tree for both — only CSS hides the tabs and the inactive panel — so
 * nothing mounts again when the window crosses 768 px and an open dialog (rejecting a
 * request…) stays open (#316). The lists keep their own headings, hidden on a phone, where the
 * tab names them.
 */
export function ManagementTabs({ tabs }: { tabs: ManagementTab[] }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  return (
    <Tabs
      defaultValue={tabs[0]?.value}
      className="md:gap-8"
    >
      <TabBar className="md:hidden">
        {tabs.map((tab) => (
          <TabBarItem
            key={tab.value}
            value={tab.value}
          >
            {tab.label}
          </TabBarItem>
        ))}
      </TabBar>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          // mounted while inactive: switching the layout or the tab loses no state (#316)
          forceMount
          className="pt-4 data-[state=inactive]:max-md:hidden md:pt-0"
          // with no tabs to show on desktop, a panel is no Tab stop of its own
          {...(isDesktop ? { tabIndex: -1 } : {})}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
