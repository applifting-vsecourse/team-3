import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"
import { gatheredLabel, missedMinimumLabel, wasHeld } from "@/lib/occupancy"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventPhoto } from "@/features/events/components/EventPhoto"
import {
  formatEventDay,
  formatEventStart,
  isEventOver,
  placeName,
} from "@/features/events/lib/formatEvent"

/**
 * Where the user's rating of a past event stands (Figma Karta akce/Proběhlá řádek): given
 * or still to give (#66). A cancelled event has nothing to rate — its `status` says so.
 */
export type PastRating = { kind: "given"; stars: number } | { kind: "open" }

type PastEventCardProps = {
  /** Only what the card shows, so a profile can send less than a whole event (#179). */
  event: Pick<
    PublicEvent,
    | "id"
    | "title"
    | "startsAt"
    | "endsAt"
    | "address"
    | "activity"
    | "locality"
    | "approvedCount"
    // required, so no caller forgets it: above 0 it didn't take place, „Nekonalo se“ (#61,
    // review #323 — the public profile once sent none and said „Proběhlo“)
    | "missingToMin"
  > & { status?: "published" | "cancelled" }
  /** Ignored for a cancelled event or one that didn't take place. */
  rating?: PastRating
  /** After how many came, e.g. the event's rating on a public profile: „★ 4,5 (3 hodnocení)“ (#179). */
  detail?: string
  /** „Ohodnotit →“ for an open rating; the page builds the link (C-03, #66). */
  rateAction?: ReactNode
  titleAs?: "h2" | "h3"
  /**
   * The card opens the event's detail, unless false: the rating page shows the event without
   * it, because a former member of a members-only event's group gets a 403 there (review #315).
   */
  isLinked?: boolean
  now?: Date
}

/**
 * A past event in the profile (#178) and under „Proběhlé“ (#61): the row card with the photo
 * desaturated and the date tile neutral; instead of the bar, how many came and the rating.
 */
export function PastEventCard({
  event,
  rating,
  rateAction,
  detail,
  titleAs: Title = "h3",
  isLinked = true,
  now = new Date(),
}: PastEventCardProps) {
  // from the event, not the rating: a cancelled event never offers „Ohodnotit“
  const isCancelled = event.status === "cancelled"
  // over and below its minimum: „Nekonalo se“ and why, as its detail says (#61); nothing to
  // rate either. Before it ends it may still fill up (review #322)
  const isNotHeld = !isCancelled && !wasHeld(event) && isEventOver(event, now)
  const line = [formatEventDay(event.startsAt), placeName(event.address), event.locality.name].join(
    " · ",
  )
  const attendance = [
    isCancelled
      ? "Akce se nekonala"
      : isNotHeld
        ? missedMinimumLabel({
            approvedCount: event.approvedCount,
            missingToMin: event.missingToMin,
          })
        : rating?.kind === "given"
          ? `${gatheredLabel(event.approvedCount)} · tvoje ★ ${rating.stars}`
          : gatheredLabel(event.approvedCount),
    detail,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <article className="relative flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3 text-card-foreground has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring">
      <EventPhoto
        event={event}
        variant="past"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title className="line-clamp-2 type-row-title">
          {isLinked ? (
            <Link
              to={ROUTES.eventDetail}
              params={{ eventId: event.id }}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {event.title}
            </Link>
          ) : (
            event.title
          )}
        </Title>
        <time
          dateTime={event.startsAt.toISOString()}
          className="sr-only"
        >
          {formatEventStart(event.startsAt)}
        </time>
        <p className="truncate text-caption text-muted-foreground">{line}</p>
        <div className="flex items-center gap-2 pt-1">
          <StatusBadge
            status={{ kind: isCancelled ? "cancelled" : isNotHeld ? "not-held" : "past" }}
          />
          {/* up to two lines: „Do minima chyběli 2 lidé“ and the rating don't fit one on a phone */}
          <span className="line-clamp-2 min-w-0 text-caption text-muted-foreground">
            {attendance}
          </span>
          {!isCancelled && !isNotHeld && rating?.kind === "open" && rateAction ? (
            // above the card's stretched link, so it stays its own target
            <span className="relative ml-auto shrink-0 text-sm font-semibold">{rateAction}</span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
