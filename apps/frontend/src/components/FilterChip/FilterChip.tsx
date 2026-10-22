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

type FilterChipProps = ComponentProps<typeof Button> & {
  /** The filter has a value; the chip then shows it on a dark fill. */
  isSelected?: boolean
}

/** A chip that opens a filter's popover or bottom panel. */
export function FilterChip({ isSelected, className, children, ...props }: FilterChipProps) {
  return (
    <Button
      variant="outline"
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
      className={cn(
        chip,
        chipDefault,
        "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background",
        className,
      )}
      {...props}
    />
  )
}
