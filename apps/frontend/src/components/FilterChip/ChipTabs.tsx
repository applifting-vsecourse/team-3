import type { ComponentProps } from "react"

import { chip, chipDefault } from "@/components/FilterChip/FilterChip"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// chipSelected behind data-[state=active], class for class (Tailwind generates only classes it
// finds written out); ChipTabs.test.tsx checks the two match.
const chipActive =
  "data-[state=active]:border-foreground data-[state=active]:bg-foreground data-[state=active]:font-semibold data-[state=active]:text-background data-[state=active]:hover:bg-foreground/90 data-[state=active]:hover:text-background"

/**
 * Tabs inside a tab, drawn as filter chips (Figma Moje C-01, C-04: „Přihlášen · 4“ /
 * „Pořádám · 5“ under the band's Akce / Skupiny, #304). Built on the kit's Tabs, so the page
 * wraps the chips and their content in one `<Tabs>`; a phone scrolls them sideways.
 */
export function ChipTabs({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        // the kit's grey track is not there: the chips stand on the page, as the filter chips
        "group-data-[orientation=horizontal]/tabs:h-auto w-full max-w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  )
}

type ChipTabsItemProps = ComponentProps<typeof TabsTrigger> & {
  /** „Přihlášen · 4“; left out while it is not known. */
  count?: number
}

export function ChipTabsItem({ count, className, children, ...props }: ChipTabsItemProps) {
  return (
    <TabsTrigger
      className={cn(
        chip,
        chipDefault,
        chipActive,
        // the kit stretches its triggers to share the track and lifts the active one with a
        // shadow; DESIGN.md keeps shadows for what floats
        "flex-none group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
      {count === undefined ? null : ` · ${count}`}
    </TabsTrigger>
  )
}
