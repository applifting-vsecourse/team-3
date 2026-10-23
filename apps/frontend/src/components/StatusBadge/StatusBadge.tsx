import { cn } from "@/lib/utils"

export type CapacityStatus =
  { kind: "missing"; missing: number } | { kind: "free" } | { kind: "full" } | { kind: "cancelled" }

const STYLES: Record<CapacityStatus["kind"], string> = {
  // the only highlighted state: the event can't happen without more people
  missing: "bg-primary text-primary-foreground",
  free: "bg-secondary text-secondary-foreground",
  full: "bg-muted text-muted-foreground",
  cancelled: "bg-foreground text-background",
}

const label = (status: CapacityStatus): string => {
  switch (status.kind) {
    case "missing":
      return `Chybí ${status.missing}`
    case "free":
      return "Volná místa"
    case "full":
      return "Plno"
    case "cancelled":
      return "Zrušeno"
  }
}

/** Occupancy of an event (Figma: Status badge, DESIGN.md › HobbyHub components). */
export function StatusBadge({ status, className }: { status: CapacityStatus; className?: string }) {
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
