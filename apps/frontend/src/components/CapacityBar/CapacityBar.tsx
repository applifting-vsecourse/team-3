import { cn } from "@/lib/utils"

type CapacityBarProps = {
  approvedCount: number
  minParticipants: number
  maxParticipants: number
  className?: string
}

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0

/**
 * The main brand element of an event (Figma: Capacity bar, DESIGN.md › HobbyHub
 * components): approved of maximum as the fill, hatched until the minimum is
 * reached; the minimum as a marker with its „min. N“ label under it.
 */
export function CapacityBar({
  approvedCount,
  minParticipants,
  maxParticipants,
  className,
}: CapacityBarProps) {
  const missing = Math.max(0, minParticipants - approvedCount)
  const freeSpots = Math.max(0, maxParticipants - approvedCount)
  const isFull = freeSpots === 0
  // not confirmed yet: below the minimum the fill is hatched, from exactly the minimum solid
  const isBelowMin = missing > 0 && !isFull
  const minPct = percent(minParticipants, maxParticipants)

  const status = isFull
    ? "Plno"
    : isBelowMin
      ? `Chybí ještě ${missing}`
      : `Volná místa: ${freeSpots}`

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={cn(
            "text-sm",
            isBelowMin && "font-semibold",
            isFull && "text-muted-foreground",
          )}
        >
          {status}
        </p>
        <p className="text-xs text-muted-foreground">
          {approvedCount} z {maxParticipants}
        </p>
      </div>
      {/* the texts around it say it all; the bar is the picture of them */}
      <div
        aria-hidden
        data-slot="capacity-track"
        className="relative h-2 rounded-full bg-muted"
      >
        <div
          data-slot="capacity-fill"
          className={cn(
            "h-full rounded-full",
            isFull ? "bg-muted-foreground" : isBelowMin ? "capacity-hatch" : "bg-primary",
          )}
          style={{ width: `${isFull ? 100 : percent(approvedCount, maxParticipants)}%` }}
        />
        {isFull ? null : (
          // after the fill, so it is drawn above it; the background-coloured ring is a gap
          // that keeps it visible on the track, the hatch and lime in both modes
          <div
            data-slot="capacity-tick"
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-background"
            style={{ left: `${minPct}%` }}
          />
        )}
      </div>
      {isFull ? null : (
        <div className="relative h-4">
          <span
            data-slot="capacity-min"
            className={cn(
              "absolute top-0 text-xs leading-4 whitespace-nowrap text-muted-foreground",
              // near an end it aligns to the marker, so it never leaves the bar
              minPct < 10
                ? "translate-x-0"
                : minPct > 90
                  ? "-translate-x-full"
                  : "-translate-x-1/2",
            )}
            style={{ left: `${minPct}%` }}
          >
            min. {minParticipants}
          </span>
        </div>
      )}
    </div>
  )
}
