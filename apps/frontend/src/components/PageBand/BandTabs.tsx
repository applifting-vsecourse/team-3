import type { ComponentProps } from "react"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * Tabs on the band's bottom edge (Figma Tab/Rychlý výběr, Pozadí=Tmavé — Moje akce, Skupiny,
 * later the quick picks on /akce): a phone scrolls them sideways. Built on the kit's Tabs, so
 * the page wraps the band and the content in one `<Tabs>`.
 */
export function BandTabs({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      variant="line"
      className={cn(
        // the scroll strip reaches the screen edge on a phone (-mx-4 px-4), like Figma A-02
        "-mx-4 h-auto w-auto max-w-none justify-start gap-6 overflow-x-auto rounded-none p-0 px-4 md:mx-0 md:gap-7 md:px-0",
        className,
      )}
      {...props}
    />
  )
}

type BandTabsItemProps = ComponentProps<typeof TabsTrigger> & {
  /** The number in the pill; left out while it is not known. */
  count?: number
}

export function BandTabsItem({ count, children, className, ...props }: BandTabsItemProps) {
  return (
    <TabsTrigger
      className={cn(
        "h-auto flex-none gap-1.5 rounded-none border-0 border-b-3 border-transparent px-0 pt-3 pb-2.5 text-body font-semibold text-on-hero-muted hover:text-on-hero",
        // the active one: cream with the lime underline; the kit's line indicator and shadow are not used
        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-on-hero",
        "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-0",
        className,
      )}
      {...props}
    >
      {children}
      {/* the space keeps „Moje 3“ apart for a screen reader; flex layout ignores it */}
      {count === undefined ? null : " "}
      {count === undefined ? null : (
        <span className="rounded-full border border-on-hero-muted bg-hero-pattern px-1.5 py-px text-xs font-semibold text-on-hero">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
