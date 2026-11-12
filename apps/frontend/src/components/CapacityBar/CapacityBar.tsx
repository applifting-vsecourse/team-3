import { occupancyCount, occupancyState, occupancyStatus, type Occupancy } from "@/lib/occupancy"
import { cn } from "@/lib/utils"

/** The counts for the bar's geometry; `missingToMin`, `freeSpots` and `isFull` as the API sends them. */
type CapacityBarProps = Occupancy & {
  /**
   * `detail` – the event detail (Figma Capacity bar): the status and „X z Y“ above an 8 px
   * track, „min. N“ in a pill under the marker. `compact` – in a card (Karta akce/Foto): only
   * the 6 px track and the marker; the badge and the numbers beside it say the rest.
   */
  variant?: "detail" | "compact"
  /**
   * What the bar lies on, for the gap around the marker (Figma Tick): a card or the desktop
   * panel, or the page — the detail on a phone has no panel (DESIGN.md › Layout).
   */
  surface?: "card" | "background"
  className?: string
}

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0

/**
 * The main brand element of an event (Figma: Capacity bar, DESIGN.md › Capacity bar): approved
 * of maximum as the fill, hatched until the minimum is reached; the minimum as a marker.
 */
export function CapacityBar({
  variant = "detail",
  surface = "card",
  className,
  ...occupancy
}: CapacityBarProps) {
  const { approvedCount, minParticipants, maxParticipants } = occupancy
  const state = occupancyState(occupancy)
  const isFull = state === "full"
  const isCompact = variant === "compact"
  const minPct = percent(minParticipants, maxParticipants)

  const track = (
    // the 1 px outline sits outside the track (a ring), so it never covers the hatch
    <div
      aria-hidden
      data-slot="capacity-track"
      className={cn(
        "absolute inset-x-0 rounded-full bg-capacity-track ring-1 ring-control-border",
        isCompact ? "top-1 h-1.5" : "top-0 h-2",
      )}
    >
      <div
        data-slot="capacity-fill"
        className={cn(
          "h-full rounded-full",
          // not confirmed yet: below the minimum hatched, from exactly the minimum solid
          isFull ? "bg-full" : state === "missing" ? "capacity-hatch" : "bg-capacity-fill",
        )}
        style={{ width: `${isFull ? 100 : percent(approvedCount, maxParticipants)}%` }}
      />
    </div>
  )

  // after the fill, so it is drawn above it; the ring in the surface's colour is a gap that
  // keeps it visible on the track, the hatch and lime (tokens.test.ts)
  const marker = isFull ? null : (
    <div
      aria-hidden
      data-slot="capacity-tick"
      className={cn(
        "absolute -translate-x-1/2 rounded-xs bg-foreground ring-2",
        surface === "card" ? "ring-card" : "ring-background",
        isCompact ? "top-0 h-3.5 w-0.5" : "-top-1 h-5.5 w-0.75",
      )}
      style={{ left: `${minPct}%` }}
    />
  )

  if (isCompact) {
    return (
      <div className={cn("relative h-3.5", className)}>
        {track}
        {marker}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            state === "missing" && "font-semibold",
            isFull && "text-muted-foreground",
          )}
        >
          {occupancyStatus(occupancy)}
        </p>
        <p className="text-caption font-medium text-muted-foreground">
          {occupancyCount(occupancy)}
        </p>
      </div>
      {/* the texts around it say it all; the bar is the picture of them */}
      <div className={cn("relative", isFull ? "h-2" : "h-9.5")}>
        {track}
        {marker}
        {isFull ? null : (
          // the marker runs down into it (Figma: Min = Tick over Pill)
          <span
            data-slot="capacity-min"
            className={cn(
              "absolute top-5 rounded-full bg-foreground px-1.5 py-px text-caption leading-4 font-medium whitespace-nowrap text-background",
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
        )}
      </div>
    </div>
  )
}
