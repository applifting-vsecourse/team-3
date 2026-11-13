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

import type { Sort } from "@/features/events/lib/eventsSearch"

const LABEL: Record<Sort, string> = {
  termin: "nejbližší termín",
  vzdalenost: "nejmenší vzdálenost",
}

type SortMenuProps = {
  value: Sort
  /** A centre to measure from is known; without it the distance order is offered but off. */
  isDistanceAvailable: boolean
  onChange: (sort: Sort) => void
}

/**
 * „Řadit: nejbližší termín ▾“ above the list (Figma A-02j, A-02jd; #57): soonest first, or
 * nearest to the chosen locality's centre. Always a menu: a plain label looked like the button
 * and a tap did nothing (Celé Česko, a searched map area). Without a centre the distance order
 * is there but off, with why under it — readable, not dimmed like the disabled item.
 * DESIGN.md › Menus: card surface, card-border, rounded-2xl, the picked option checked.
 */
export function SortMenu({ value, isDistanceAvailable, onChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="-my-1 h-8 gap-1 px-2 text-xs font-medium text-muted-foreground"
        >
          Řadit: {LABEL[value]}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-2xl border-card-border p-1.5"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next === "vzdalenost" ? "vzdalenost" : "termin")}
        >
          <DropdownMenuRadioItem
            value="termin"
            className="rounded-lg py-2"
          >
            Nejbližší termín
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="vzdalenost"
            disabled={!isDistanceAvailable}
            className="rounded-lg py-2"
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
          <DropdownMenuLabel className="max-w-56 pt-1 text-xs font-normal text-muted-foreground">
            Pro řazení podle vzdálenosti vyber lokalitu.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
