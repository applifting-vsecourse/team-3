import { freeSpotsLabel } from "@/lib/occupancy"
import { cn } from "@/lib/utils"

export type CapacityStatus =
  | { kind: "missing"; missing: number }
  | { kind: "free"; freeSpots: number }
  | { kind: "full" }
  | { kind: "cancelled" }
  // a past event on its group's page (Figma A-08e)
  | { kind: "past" }
  // a past event that never reached its minimum (#61, Figma Status badge › Nekonalo se)
  | { kind: "not-held" }
  // started and not over yet (#272): nobody joins or leaves any more, so no occupancy
  | { kind: "in-progress" }

/** The user's own place, in „Moje akce“ (C-01): „Jdu“, „Čeká na schválení“. */
export type ParticipationBadge = { kind: "going" } | { kind: "pending" }

export type BadgeStatus = CapacityStatus | ParticipationBadge

// Figma Status badge: every fill carries its own edge, so the badge keeps 3:1 against
// the card (DESIGN.md › Colour)
const STYLES: Record<BadgeStatus["kind"], string> = {
  // the only highlighted state: the event can't happen without more people
  missing: "border-primary-edge bg-primary text-primary-foreground",
  free: "border-tile-border bg-secondary text-secondary-foreground",
  full: "border-control-border bg-badge-neutral text-badge-neutral-foreground",
  cancelled: "border-control-border bg-foreground text-background",
  past: "border-control-border text-muted-foreground",
  "not-held": "border-control-border text-muted-foreground",
  "in-progress": "border-control-border text-foreground",
  // Figma draws these as the Volná and Plno variants with their own label
  going: "border-tile-border bg-secondary text-secondary-foreground",
  pending: "border-control-border bg-badge-neutral text-badge-neutral-foreground",
}

const label = (status: BadgeStatus): string => {
  switch (status.kind) {
    case "missing":
      return `Chybí ${status.missing}`
    case "free":
      return freeSpotsLabel(status.freeSpots)
    case "full":
      return "Plno"
    case "cancelled":
      return "Zrušeno"
    case "past":
      return "Proběhlo"
    case "not-held":
      return "Nekonalo se"
    case "in-progress":
      return "Probíhá"
    case "going":
      return "Jdu"
    case "pending":
      return "Čeká na schválení"
  }
}

/** Occupancy of an event, or the user's place in it (Figma: Status badge, DESIGN.md › HobbyHub components). */
export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-semibold whitespace-nowrap",
        STYLES[status.kind],
        className,
      )}
    >
      {label(status)}
    </span>
  )
}
