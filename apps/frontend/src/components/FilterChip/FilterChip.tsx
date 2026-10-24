import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

// Figma: Filter chip. Selected (has a value / is on) = dark fill; default = hairline outline.
// The dark: repeats override the kit's see-through outline background (dark:bg-input/30),
// which would let the map show through floating chips.
const chip = "h-9 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap hover:text-foreground"
const chipDefault =
  "border-border bg-background font-medium text-foreground hover:bg-accent dark:border-border dark:bg-background dark:hover:bg-accent"
const chipSelected =
  "border-foreground bg-foreground font-semibold text-background hover:bg-foreground/90 hover:text-background dark:border-foreground dark:bg-foreground dark:hover:bg-foreground/90"
// chipSelected behind data-[state=on], class for class. Tailwind only generates classes it finds
// written out, so this can't be built from chipSelected at runtime; FilterChip.test.tsx checks
// the two match. The dark: ones are needed: chipDefault's dark: classes would otherwise win.
const chipOn =
  "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90 data-[state=on]:hover:text-background dark:data-[state=on]:border-foreground dark:data-[state=on]:bg-foreground dark:data-[state=on]:hover:bg-foreground/90"

type FilterChipProps = ComponentProps<typeof Button> & {
  /** The filter has a value; the chip then shows it on a dark fill. */
  isSelected?: boolean
  /** Which filter this is, so a screen reader hears „Lokalita: Praha 8“, not just „Praha 8“. */
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
        isSelected && filterName && typeof children === "string"
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
