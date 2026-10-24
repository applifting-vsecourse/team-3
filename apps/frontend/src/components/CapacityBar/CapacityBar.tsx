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
 * components): approved of maximum as the fill, the minimum as the tick.
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

  const status = isFull
    ? "Plno"
    : missing > 0
      ? `Chybí ještě ${missing}`
      : `Volná místa: ${freeSpots}`

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={cn(
            "text-sm",
            missing > 0 && !isFull && "font-semibold",
            isFull && "text-muted-foreground",
          )}
        >
          {status}
        </p>
        <p className="text-xs text-muted-foreground">
          {approvedCount} z {maxParticipants} · min. {minParticipants}
        </p>
      </div>
      {/* the texts above say it all; the bar is the picture of them */}
      <div
        aria-hidden
        data-slot="capacity-track"
        className="relative h-2 rounded-full bg-muted"
      >
        <div
          data-slot="capacity-fill"
          className={cn("h-full rounded-full", isFull ? "bg-muted-foreground" : "bg-primary")}
          style={{ width: `${isFull ? 100 : percent(approvedCount, maxParticipants)}%` }}
        />
        {isFull ? null : (
          <div
            data-slot="capacity-tick"
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
            style={{ left: `${percent(minParticipants, maxParticipants)}%` }}
          />
        )}
      </div>
    </div>
  )
}
