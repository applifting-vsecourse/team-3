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
        // the scroll strip reaches the screen edge on a phone (-mx-4 px-4), like Figma A-02; it
        // scrolls sideways only, without a visible scrollbar (like the filter chips)
        "-mx-4 h-auto w-auto max-w-none [scrollbar-width:none] justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none p-0 px-4 md:mx-0 md:gap-7 md:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  )
}

type BandTabsItemProps = ComponentProps<typeof TabsTrigger> & {
  /** The number in the pill, or „200+“ at the API's limit; left out while it is not known. */
  count?: number | string
  /**
   * `page`: the same tabs on the page's background (Figma Tab/Rychlý výběr, Pozadí=Světlé —
   * „Pro tebe“ on the landing page, A-01p): the active one with a `foreground` underline.
   */
  surface?: "band" | "page"
}

export function BandTabsItem({
  count,
  surface = "band",
  children,
  className,
  ...props
}: BandTabsItemProps) {
  const isOnPage = surface === "page"
  return (
    <TabsTrigger
      className={cn(
        // the kit's line indicator and shadow are not used; it sits 5 px below the tab and made
        // the strip scroll, so it is hidden too
        "group/tab h-auto flex-none gap-1.5 rounded-none border-0 border-b-3 border-transparent px-0 pt-3 pb-2.5 text-body after:hidden",
        isOnPage
          ? // like the band: inactive medium, the pill follows the state
            "font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground"
          : // the active one: cream with the lime underline. Inactive: muted and medium, so the
            // active one differs by weight and pill, not only by the underline (on-hero vs
            // on-hero-muted is 1.5:1); group/tab lets the count pill follow the state
            "font-medium text-on-hero-muted hover:text-on-hero data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-on-hero",
        "data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-0",
        className,
      )}
      {...props}
    >
      {children}
      {/* the space keeps „Moje 3“ apart for a screen reader; flex layout ignores it */}
      {count === undefined ? null : " "}
      {count === undefined ? null : (
        <span
          className={cn(
            "rounded-full border px-1.5 py-px text-xs font-semibold",
            isOnPage
              ? "border-control-border bg-muted text-muted-foreground group-data-[state=active]/tab:border-foreground group-data-[state=active]/tab:text-foreground"
              : "border-on-hero-muted bg-hero-pattern text-on-hero-muted group-data-[state=active]/tab:border-on-hero group-data-[state=active]/tab:text-on-hero",
          )}
        >
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
