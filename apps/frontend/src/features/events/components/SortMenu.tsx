import { useId } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import type { Sort } from "@/features/events/lib/eventsSearch"

const LABEL: Record<Sort, string> = {
  termin: "nejbližší termín",
  vzdalenost: "nejmenší vzdálenost",
}

// a phone shows just the value (Figma A-02h: „Termín ▾“), so the count, „Zrušit filtry“ and
// the order fit one line (#324); „Řadit:“ stays for a screen reader
const SHORT_LABEL: Record<Sort, string> = {
  termin: "Termín",
  vzdalenost: "Vzdálenost",
}

type SortMenuProps = {
  value: Sort
  /** A centre to measure from is known; without it the distance order is offered but off. */
  isDistanceAvailable: boolean
  onChange: (sort: Sort) => void
  /** Proběhlé (#61): by date means the newest first. */
  isPast?: boolean
}

/**
 * „Řadit: nejbližší termín ▾“ above the list, „Termín ▾“ on a phone (Figma A-02j, A-02jd; #57,
 * #324): soonest first, or nearest to the chosen locality's centre. Always a menu: a plain label
 * looked like the button and a tap did nothing (Celé Česko, a searched map area). Without a
 * centre the distance order is there but off, with why under it — readable, not dimmed.
 * Off with `aria-disabled`, not the kit's `disabled`: that one drops the item from the arrow
 * keys, and a screen reader would never reach it nor hear why (WAI-ARIA APG: a disabled menu
 * item stays focusable).
 * DESIGN.md › Menus: card surface, card-border, rounded-2xl, the picked option checked.
 */
export function SortMenu({ value, isDistanceAvailable, onChange, isPast = false }: SortMenuProps) {
  const whyOffId = useId()
  // Proběhlé (#61): by date is the newest first
  const label = (sort: Sort) => (isPast && sort === "termin" ? "nejnovější" : LABEL[sort])
  const shortLabel = (sort: Sort) =>
    isPast && sort === "termin" ? "Nejnovější" : SHORT_LABEL[sort]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="-my-1 h-8 gap-1 px-2 text-xs font-medium text-muted-foreground"
        >
          <span className="max-md:sr-only">Řadit: </span>
          <span className="md:hidden">{shortLabel(value)}</span>
          <span className="max-md:hidden">{label(value)}</span>
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-2xl border-card-border p-1.5"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            // Radix changes the value even when the off item's onSelect prevents the default
            if (next === "vzdalenost" && !isDistanceAvailable) return
            onChange(next === "vzdalenost" ? "vzdalenost" : "termin")
          }}
        >
          <DropdownMenuRadioItem
            value="termin"
            className="rounded-lg py-2"
          >
            {isPast ? "Nejnovější" : "Nejbližší termín"}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="vzdalenost"
            aria-disabled={isDistanceAvailable ? undefined : true}
            aria-describedby={isDistanceAvailable ? undefined : whyOffId}
            // off: a tap or Enter leaves the menu open, with the why in view
            onSelect={isDistanceAvailable ? undefined : (event) => event.preventDefault()}
            className={cn("rounded-lg py-2", !isDistanceAvailable && "text-muted-foreground")}
          >
            <span className="flex flex-col">
              Nejmenší vzdálenost
              {isDistanceAvailable ? (
                <span className="text-xs text-muted-foreground">od středu zvolené lokality</span>
              ) : null}
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {isDistanceAvailable ? null : (
          <DropdownMenuLabel
            id={whyOffId}
            className="max-w-56 pt-1 text-xs font-normal text-muted-foreground"
          >
            Pro řazení podle vzdálenosti vyber lokalitu.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
