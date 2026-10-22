import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import {
  capacityStatus,
  eventFacts,
  formatEventStart,
  placeName,
} from "@/features/events/lib/formatEvent"

type EventCardProps = {
  event: PublicEvent
  className?: string
}

/** An event in the list (Figma: Event card/List). */
export function EventCard({ event, className }: EventCardProps) {
  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:border-foreground",
        className,
      )}
    >
      <ActivityTile icon={event.activity.category.icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="line-clamp-2 text-base font-semibold tracking-tight">{event.title}</h2>
        <p className="truncate text-sm text-muted-foreground">
          <time dateTime={event.startsAt.toISOString()}>{formatEventStart(event.startsAt)}</time>
          {" · "}
          {placeName(event.address)}
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge status={capacityStatus(event)} />
          <span className="truncate text-xs font-medium text-muted-foreground">
            {eventFacts(event)}
          </span>
        </div>
      </div>
    </article>
  )
}
