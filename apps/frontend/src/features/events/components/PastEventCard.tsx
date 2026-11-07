import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"
import { gatheredLabel } from "@/lib/occupancy"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventPhoto } from "@/features/events/components/EventPhoto"
import { formatEventDay, formatEventStart, placeName } from "@/features/events/lib/formatEvent"

/**
 * Where the user's rating of a past event stands (Figma Karta akce/Proběhlá řádek):
 * given, still to give (#66), or nothing to rate — the event didn't take place.
 */
export type PastRating = { kind: "given"; stars: number } | { kind: "open" } | { kind: "cancelled" }

type PastEventCardProps = {
  event: PublicEvent & { status?: "published" | "cancelled" }
  rating: PastRating
  /** „Ohodnotit →“ for an open rating; the page builds the link (C-03, #66). */
  rateAction?: ReactNode
  titleAs?: "h2" | "h3"
}

/**
 * A past event in the profile (#178) and under „Proběhlé“ (#61): the row card with the photo
 * desaturated and the date tile neutral; instead of the bar, how many came and the rating.
 */
export function PastEventCard({
  event,
  rating,
  rateAction,
  titleAs: Title = "h3",
}: PastEventCardProps) {
  const isCancelled = rating.kind === "cancelled"
  const line = [formatEventDay(event.startsAt), placeName(event.address), event.locality.name].join(
    " · ",
  )
  const attendance = isCancelled
    ? "Akce se nekonala"
    : rating.kind === "given"
      ? `${gatheredLabel(event.approvedCount)} · tvoje ★ ${rating.stars}`
      : gatheredLabel(event.approvedCount)

  return (
    <article className="relative flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3 text-card-foreground has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <EventPhoto
        event={event}
        variant="past"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title className="line-clamp-2 type-row-title">
          <Link
            to={ROUTES.eventDetail}
            params={{ eventId: event.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {event.title}
          </Link>
        </Title>
        <time
          dateTime={event.startsAt.toISOString()}
          className="sr-only"
        >
          {formatEventStart(event.startsAt)}
        </time>
        <p className="truncate text-caption text-muted-foreground">{line}</p>
        <div className="flex items-center gap-2 pt-1">
          <StatusBadge status={{ kind: isCancelled ? "cancelled" : "past" }} />
          <span className="truncate text-caption text-muted-foreground">{attendance}</span>
          {rating.kind === "open" && rateAction ? (
            // above the card's stretched link, so it stays its own target
            <span className="relative ml-auto shrink-0 text-sm font-semibold">{rateAction}</span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
