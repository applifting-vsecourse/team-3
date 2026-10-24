import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
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
  /** Its pin is highlighted on the map (Figma: Event card/List – najetí myší). */
  isHighlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  className?: string
}

/**
 * An event in the list (Figma: Event card/List). The title links to the
 * detail; its ::after stretches over the card, so the whole card is clickable
 * while the link is still named by the title. The focus ring moves to the card.
 */
export function EventCard({
  event,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  className,
}: EventCardProps) {
  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:border-foreground",
        "has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50",
        isHighlighted && "border-foreground",
        className,
      )}
    >
      <ActivityTile icon={event.activity.category.icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="line-clamp-2 text-base font-semibold tracking-tight">
          <Link
            to={ROUTES.eventDetail}
            params={{ eventId: event.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-lg"
          >
            {event.title}
          </Link>
        </h2>
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
