import { cn } from "@/lib/utils"

type DateTileProps = {
  /** „Pá“ */
  weekday: string
  /** „23“ */
  day: string
  /** „18:30“ — the grid card's tile has it; the row card says it in its line instead. */
  time?: string
  /** `m` on a grid card's photo, `s` on a row card's (Figma Date/M, Date/S). */
  size?: "m" | "s"
  /** A past event: neutral, as its photo is desaturated (Karta akce/Proběhlá řádek). */
  isPast?: boolean
  className?: string
}

/**
 * The date over an event's photo (Figma: Karta akce › Datum, DESIGN.md › Event card):
 * `secondary` with its `tile-border`, the weekday, the day and the time.
 */
export function DateTile({
  weekday,
  day,
  time,
  size = "m",
  isPast = false,
  className,
}: DateTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center border border-tile-border",
        isPast ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground",
        size === "m" ? "rounded-xl px-2.5 py-2" : "rounded-lg px-2 py-1",
        className,
      )}
    >
      <span className="text-xs leading-4 font-semibold">{weekday}</span>
      <span className={size === "m" ? "type-date-m" : "type-date-s"}>{day}</span>
      {time ? <span className="text-xs leading-4 font-semibold">{time}</span> : null}
    </div>
  )
}
