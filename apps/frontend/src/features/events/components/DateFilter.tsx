import { useState } from "react"
import { cs } from "react-day-picker/locale"

import { FilterChip, FilterToggleChip } from "@/components/FilterChip/FilterChip"
import { FilterPanel } from "@/components/FilterPanel/FilterPanel"
import { Calendar } from "@/components/ui/calendar"

import { useEvents } from "@/features/events/hooks/useEvents"
import {
  dateToDay,
  dayToDate,
  formatDayRange,
  pragueToday,
  QUICK_RANGES,
  quickRange,
  rangeLengthLabel,
  type DayRange,
} from "@/features/events/lib/dateRange"
import type { EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

const captionFormat = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" })
const weekdayFormat = new Intl.DateTimeFormat("cs-CZ", { weekday: "short" })
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

type DateFilterProps = {
  search: EventsSearch
  onChange: (range: DayRange) => void
}

/**
 * Chip „Termín“ › a range from–to (Figma: Popover – termín, Spodní panel – termín):
 * quick options and a calendar. Past days can't be picked.
 */
export function DateFilter({ search, onChange }: DateFilterProps) {
  const current: DayRange = { od: search.od, do: search.do }
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<DayRange>(current)
  const [today, setToday] = useState(() => pragueToday())
  // A start without an end is one day („klepnout dvakrát na stejné datum“ is optional).
  const chosen: DayRange = draft.od ? { od: draft.od, do: draft.do ?? draft.od } : {}
  // od/do explicitly: an emptied range must preview no date limit, not the URL's
  const preview = useEvents({ ...search, od: chosen.od, do: chosen.do }, { isEnabled: isOpen })

  const apply = (range: DayRange) => {
    onChange(range)
    setIsOpen(false)
  }
  const label = formatDayRange(current)

  return (
    <FilterPanel
      title="Termín"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) {
          setDraft(current)
          setToday(pragueToday())
        }
        setIsOpen(isOpening)
      }}
      trigger={
        <FilterChip
          isSelected={Boolean(label)}
          filterName="Termín"
        >
          {label ?? "Termín"}
        </FilterChip>
      }
      resetLabel="Zrušit termín"
      onReset={() => apply({ od: undefined, do: undefined })}
      applyLabel={showEventsLabel(preview.isPlaceholderData ? undefined : preview.events?.length)}
      onApply={() => apply({ od: chosen.od, do: chosen.do })}
      popoverClassName="w-auto"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div
          role="group"
          aria-label="Rychlé volby"
          className="flex flex-wrap gap-2 md:w-36 md:flex-col md:items-start"
        >
          {QUICK_RANGES.map((option) => {
            const range = quickRange(option, today)
            return (
              <FilterToggleChip
                key={option}
                pressed={chosen.od === range.od && chosen.do === range.do}
                onPressedChange={() => setDraft(range)}
              >
                {option}
              </FilterToggleChip>
            )
          })}
        </div>
        <Calendar
          mode="range"
          locale={cs}
          // Figma: „Říjen 2026“, „Po Út St…“ — the Czech locale writes them lower-case
          formatters={{
            formatCaption: (month) => capitalize(captionFormat.format(month)),
            formatWeekdayName: (day) => capitalize(weekdayFormat.format(day)),
          }}
          weekStartsOn={1}
          showOutsideDays={false}
          defaultMonth={dayToDate(draft.od ?? today)}
          disabled={{ before: dayToDate(today) }}
          selected={
            draft.od
              ? { from: dayToDate(draft.od), to: draft.do ? dayToDate(draft.do) : undefined }
              : undefined
          }
          onSelect={(range) =>
            setDraft({
              od: range?.from ? dateToDay(range.from) : undefined,
              do: range?.to ? dateToDay(range.to) : undefined,
            })
          }
          className="p-0"
        />
      </div>
      {chosen.od && chosen.do ? (
        <p className="mt-4 text-sm text-muted-foreground md:hidden">
          {formatDayRange(chosen)} · {rangeLengthLabel({ od: chosen.od, do: chosen.do })}
        </p>
      ) : null}
    </FilterPanel>
  )
}
