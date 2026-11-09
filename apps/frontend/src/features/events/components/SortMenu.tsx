import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
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
  /** A centre to measure from is known; without it soonest first is the only order. */
  isDistanceAvailable: boolean
  onChange: (sort: Sort) => void
}

/**
 * „Řadit: nejbližší termín ▾“ above the list (Figma A-02j, A-02jd; #57): soonest first, or
 * nearest to the chosen locality's centre. With only one order it is a plain label.
 * DESIGN.md › Menus: card surface, card-border, rounded-2xl, the picked option checked.
 */
export function SortMenu({ value, isDistanceAvailable, onChange }: SortMenuProps) {
  if (!isDistanceAvailable) {
    return <p className="text-xs font-medium text-muted-foreground">Řadit: {LABEL.termin}</p>
  }
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
            className="rounded-lg py-2"
          >
            <span className="flex flex-col">
              Nejmenší vzdálenost
              <span className="text-xs text-muted-foreground">od středu zvolené lokality</span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
