import type { ReactNode } from "react"

import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

type ManagementTab = {
  value: string
  /** The tab's label on a phone, with its count: „Žádosti (2)“. */
  label: string
  content: ReactNode
  /**
   * Left out of the page, but still mounted — e.g. the group's requests while the admin is
   * alone (#371), so a request arriving later shows without anything mounting again.
   */
  isHidden?: boolean
}

type ManagementTabsProps = {
  tabs: ManagementTab[]
  /** The tab a phone opens on; the first one that isn't hidden by default. */
  defaultValue?: string
}

/**
 * The two lists of a management page (Figma D-03, D-07; #371): tabs on a phone, one under the
 * other on desktop. One tree for both — only CSS hides the tabs and the inactive panel — so
 * nothing mounts again when the window crosses 768 px and an open dialog (rejecting a
 * request…) stays open (#316). The lists keep their own headings, hidden on a phone, where the
 * tab names them. On desktop, with no tabs to show, the panels drop the tab semantics: a
 * screen reader hears two lists with their headings, not panels of tabs that aren't there.
 */
export function ManagementTabs({ tabs, defaultValue }: ManagementTabsProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const shown = tabs.filter((tab) => !tab.isHidden)
  return (
    <Tabs
      defaultValue={defaultValue ?? shown[0]?.value}
      className="md:gap-8"
    >
      {/* one list left: its own heading names it, a single tab would only repeat it */}
      <TabBar
        className="md:hidden"
        hidden={shown.length < 2}
      >
        {tabs.map((tab) => (
          <TabBarItem
            key={tab.value}
            value={tab.value}
            hidden={tab.isHidden}
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
          className={cn(
            "pt-4 data-[state=inactive]:max-md:hidden md:pt-0",
            shown.length < 2 && "pt-0",
            tab.isHidden && "hidden",
          )}
          {...(isDesktop || shown.length < 2
            ? // no tabs on the page: no Tab stop of its own, no panel of a tab
              { tabIndex: -1, role: undefined, "aria-labelledby": undefined }
            : {})}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
