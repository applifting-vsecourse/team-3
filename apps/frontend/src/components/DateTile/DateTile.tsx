import { cn } from "@/lib/utils"

type DateTileProps = {
  /** „Pá“ */
  weekday: string
  /** „23“ */
  day: string
  /** „18:30“ — the grid card's tile has it; the row card says it in its line instead. */
  time?: string
  /** `l` on the detail's photo, `m` on a grid card's, `s` on a row card's (Figma Date/L, Date/M, Date/S). */
  size?: "l" | "m" | "s"
  /** A past event: neutral, as its photo is desaturated (Karta akce/Proběhlá řádek). */
  isPast?: boolean
  className?: string
}

const label = "text-xs leading-4 font-semibold"

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
        { l: "rounded-xl px-3.5 py-2.5", m: "rounded-xl px-2.5 py-2", s: "rounded-lg px-2 py-1" }[
          size
        ],
        className,
      )}
    >
      <span className={cn(label, size === "l" && "text-caption")}>{weekday}</span>
      <span className={{ l: "type-date-l", m: "type-date-m", s: "type-date-s" }[size]}>{day}</span>
      {time ? <span className={cn(label, size === "l" && "text-caption")}>{time}</span> : null}
    </div>
  )
}
