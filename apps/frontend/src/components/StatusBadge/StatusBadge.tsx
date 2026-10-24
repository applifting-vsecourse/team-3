import { cn } from "@/lib/utils"

export type CapacityStatus =
  { kind: "missing"; missing: number } | { kind: "free" } | { kind: "full" } | { kind: "cancelled" }

/** The user's own place, in „Moje akce“ (C-01): „Jdu“, „Čeká na schválení“. */
export type ParticipationBadge = { kind: "going" } | { kind: "pending" }

export type BadgeStatus = CapacityStatus | ParticipationBadge

const STYLES: Record<BadgeStatus["kind"], string> = {
  // the only highlighted state: the event can't happen without more people
  missing: "bg-primary text-primary-foreground",
  free: "bg-secondary text-secondary-foreground",
  full: "bg-muted text-muted-foreground",
  cancelled: "bg-foreground text-background",
  // Figma draws these as the Volná and Plno variants with their own label
  going: "bg-secondary text-secondary-foreground",
  pending: "bg-muted text-muted-foreground",
}

const label = (status: BadgeStatus): string => {
  switch (status.kind) {
    case "missing":
      return `Chybí ${status.missing}`
    case "free":
      return "Volná místa"
    case "full":
      return "Plno"
    case "cancelled":
      return "Zrušeno"
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
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
        STYLES[status.kind],
        className,
      )}
    >
      {label(status)}
    </span>
  )
}
