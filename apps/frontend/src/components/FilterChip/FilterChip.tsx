import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

// Figma: Filter chip. Selected (has a value / is on) = dark fill; default = hairline outline.
const chip = "h-9 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap hover:text-foreground"
const chipDefault = "border-border bg-background font-medium text-foreground hover:bg-accent"
const chipSelected =
  "border-foreground bg-foreground font-semibold text-background hover:bg-foreground/90 hover:text-background"
// chipSelected behind data-[state=on], class for class. Tailwind only generates classes it finds
// written out, so this can't be built from chipSelected at runtime; FilterChip.test.tsx checks
// the two match.
const chipOn =
  "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90 data-[state=on]:hover:text-background"

type FilterChipProps = ComponentProps<typeof Button> & {
  /** The filter has a value; the chip then shows it on a dark fill. */
  isSelected?: boolean
  /**
   * Which filter this is, so a screen reader hears „Lokalita: Praha 8“, not just „Praha 8“ —
   * also on a light chip that shows a default value („Lokalita: Praha · podle polohy“).
   */
  filterName?: string
}

/** A chip that opens a filter's popover or bottom panel. */
export function FilterChip({
  isSelected,
  filterName,
  className,
  children,
  ...props
}: FilterChipProps) {
  return (
    <Button
      variant="outline"
      aria-label={
        filterName && typeof children === "string" && children !== filterName
          ? `${filterName}: ${children}`
          : undefined
      }
      className={cn(chip, isSelected ? chipSelected : chipDefault, "gap-1", className)}
      {...props}
    >
      {children}
      <ChevronDown aria-hidden />
    </Button>
  )
}

/** An on/off filter as a chip („Chybí lidé“). */
export function FilterToggleChip({ className, ...props }: ComponentProps<typeof Toggle>) {
  return (
    <Toggle
      className={cn(chip, chipDefault, chipOn, className)}
      {...props}
    />
  )
}
