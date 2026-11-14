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
import { PAST_TERM, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

const captionFormat = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" })
const weekdayFormat = new Intl.DateTimeFormat("cs-CZ", { weekday: "short" })
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** A range from–to, or Proběhlé (#61), which replaces it. */
type Term = DayRange & { termin?: typeof PAST_TERM }

type DateFilterProps = {
  search: EventsSearch
  /** Proběhlé also drops the occupancy filter: a past event has no places to fill (Figma A-02h). */
  onChange: (patch: Partial<EventsSearch>) => void
}

/**
 * Chip „Termín“ › a range from–to (Figma: Popover – termín, Spodní panel – termín):
 * quick options and a calendar. Past days can't be picked; the past is the quick option
 * „Proběhlé“ (#61), the events that are over, newest first.
 */
export function DateFilter({ search, onChange }: DateFilterProps) {
  const current: Term = { od: search.od, do: search.do, termin: search.termin }
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<Term>(current)
  const [today, setToday] = useState(() => pragueToday())
  const isPastDraft = draft.termin === PAST_TERM
  // A start without an end is one day („klepnout dvakrát na stejné datum“ is optional).
  const chosen: Term = isPastDraft
    ? { termin: PAST_TERM }
    : draft.od
      ? { od: draft.od, do: draft.do ?? draft.od }
      : {}
  // all three explicitly: an emptied term must preview no date limit, not the URL's
  const preview = useEvents(
    {
      ...search,
      od: chosen.od,
      do: chosen.do,
      termin: chosen.termin,
      ...(chosen.termin ? { obsazenost: undefined } : {}),
    },
    { isEnabled: isOpen },
  )

  const apply = (term: Term) => {
    onChange({
      od: term.od,
      do: term.do,
      termin: term.termin,
      ...(term.termin ? { obsazenost: undefined } : {}),
    })
    setIsOpen(false)
  }
  const label = current.termin === PAST_TERM ? "Proběhlé" : formatDayRange(current)

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
      onReset={() => apply({})}
      applyLabel={showEventsLabel(preview.isPlaceholderData ? undefined : preview.events?.length)}
      onApply={() => apply(chosen)}
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
                pressed={!isPastDraft && chosen.od === range.od && chosen.do === range.do}
                onPressedChange={() => setDraft(range)}
              >
                {option}
              </FilterToggleChip>
            )
          })}
          <FilterToggleChip
            pressed={isPastDraft}
            onPressedChange={() => setDraft({ termin: PAST_TERM })}
          >
            Proběhlé
          </FilterToggleChip>
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
      {!isPastDraft && chosen.od && chosen.do ? (
        <p className="mt-4 text-sm text-muted-foreground md:hidden">
          {formatDayRange(chosen)} · {rangeLengthLabel({ od: chosen.od, do: chosen.do })}
        </p>
      ) : null}
    </FilterPanel>
  )
}
