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
        // The kit's height is h-9 behind a variant, which a plain h-auto doesn't replace
        // (tailwind-merge sees no conflict, the variant wins): the 36 px strip clipped the
        // tabs and their lime underline. So the height is replaced with the same variant.
        "group-data-[orientation=horizontal]/tabs:h-auto",
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
        // group/tab: the count pill follows the state. Inactive: muted and medium, so the active one
        // differs by weight and pill, not only by the underline (on-hero vs on-hero-muted is 1.5:1)
        "group/tab h-auto flex-none gap-1.5 rounded-none border-0 border-b-3 border-transparent px-0 pt-3 pb-2.5 text-body font-medium text-on-hero-muted hover:text-on-hero data-[state=active]:font-semibold",
        // the active one: cream with the lime underline; the kit's dark: classes are restated
        // (DESIGN.md › Colour), its line indicator and shadow are not used
        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-on-hero",
        "dark:text-on-hero-muted dark:hover:text-on-hero dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-on-hero",
        "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-0 dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-primary",
        className,
      )}
      {...props}
    >
      {children}
      {/* the space keeps „Moje 3“ apart for a screen reader; flex layout ignores it */}
      {count === undefined ? null : " "}
      {count === undefined ? null : (
        <span className="rounded-full border border-on-hero-muted bg-hero-pattern px-1.5 py-px text-xs font-semibold text-on-hero-muted group-data-[state=active]/tab:border-on-hero group-data-[state=active]/tab:text-on-hero">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
