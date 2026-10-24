import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { StatusBadge, type BadgeStatus } from "@/components/StatusBadge/StatusBadge"
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
  /** Instead of the occupancy, e.g. the user's place in „Moje akce“. */
  status?: BadgeStatus
  /** Instead of „4/12 · Praha 8“. */
  facts?: string
  /** The organizer goes to the event's management (C-02), everyone else to its detail. */
  linkTo?: "detail" | "manage"
  /** h3 under a section heading. */
  titleAs?: "h2" | "h3"
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
  status,
  facts,
  linkTo = "detail",
  titleAs: Title = "h2",
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
        <Title className="line-clamp-2 text-base font-semibold tracking-tight">
          <Link
            to={linkTo === "manage" ? ROUTES.manageEvent : ROUTES.eventDetail}
            params={{ eventId: event.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-lg"
          >
            {event.title}
          </Link>
        </Title>
        <p className="truncate text-sm text-muted-foreground">
          <time dateTime={event.startsAt.toISOString()}>{formatEventStart(event.startsAt)}</time>
          {" · "}
          {placeName(event.address)}
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge status={status ?? capacityStatus(event)} />
          <span className="truncate text-xs font-medium text-muted-foreground">
            {facts ?? eventFacts(event)}
          </span>
        </div>
      </div>
    </article>
  )
}
