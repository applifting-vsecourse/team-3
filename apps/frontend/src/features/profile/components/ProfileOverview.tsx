import { useId, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { StatusBadge, type BadgeStatus } from "@/components/StatusBadge/StatusBadge"
import { Button } from "@/components/ui/button"

import type {
  ProfileEvent,
  ProfileRating,
  RatingSummary,
} from "@/features/profile/api/profileSchemas"
import { formatRatingSummary } from "@/features/profile/lib/formatRating"

const when = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Prague",
})

/** A section of the overview on /profil (Figma B-05, B-05d): heading, content, the way to the rest. */
export function ProfileSection({
  title,
  children,
  more,
}: {
  title: string
  children: ReactNode
  more?: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {title}
      </h2>
      {children}
      {more}
    </section>
  )
}

/** Where the rest of a section lives: Moje akce, or — with no page for it yet — how much is left out. */
function More({
  shown,
  total,
  link,
}: {
  shown: number
  total: number
  link?: Pick<LinkProps, "to" | "search">
}) {
  if (!shown) return null
  if (link) {
    return (
      <Button
        asChild
        variant="outline"
        className="w-fit"
      >
        <Link {...link}>Všechny v Moje akce</Link>
      </Button>
    )
  }
  // past events get a page with #61, ratings have none yet
  return total > shown ? (
    <p className="text-sm text-muted-foreground">
      Zobrazeno {shown} z {total}
    </p>
  ) : null
}

const badgeOf = (event: ProfileEvent): BadgeStatus | null => {
  if (event.status === "cancelled") return { kind: "cancelled" }
  if (event.participation === "pending") return { kind: "pending" }
  if (event.participation === "approved") return { kind: "going" }
  return null
}

/**
 * Kam jdu, Pořádám, Proběhlé: the first few events (the API sends at most 3)
 * as rows. The row event card (Karta akce/Foto řádek, #253) and the past one
 * (Karta akce/Proběhlá řádek, #259) replace these rows once they are merged.
 */
export function EventSection({
  title,
  events,
  total,
  empty,
  hasBadge = true,
  link,
}: {
  title: string
  events: ProfileEvent[]
  total: number
  empty: ReactNode
  /** Past events are all approved places: „Jdu“ would say nothing there. */
  hasBadge?: boolean
  link?: Pick<LinkProps, "to" | "search">
}) {
  return (
    <ProfileSection
      title={title}
      more={
        <More
          shown={events.length}
          total={total}
          link={link}
        />
      }
    >
      {!events.length ? (
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => {
            const badge = hasBadge ? badgeOf(event) : null
            return (
              <li
                key={event.id}
                className="flex flex-col gap-1 py-3 first:pt-0"
              >
                <h3 className="type-row-title">
                  <Link
                    to={ROUTES.eventDetail}
                    params={{ eventId: event.id }}
                    className="underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={event.startsAt.toISOString()}>{when.format(event.startsAt)}</time>{" "}
                  · {event.localityName}
                </p>
                {badge ? (
                  <StatusBadge
                    status={badge}
                    className="w-fit"
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </ProfileSection>
  )
}

type RatingGroup = { ratings: ProfileRating[]; summary: RatingSummary }

/** Hodnocení: as a participant and as an organizer, each with its average and the latest few. */
export function RatingsSection({
  participant,
  organizer,
}: {
  participant: RatingGroup
  organizer: RatingGroup
}) {
  return (
    <ProfileSection title="Hodnocení">
      <div className="grid gap-8 md:grid-cols-2">
        <RatingList
          title="Jako účastník"
          {...participant}
        />
        <RatingList
          title="Jako organizátor"
          {...organizer}
        />
      </div>
    </ProfileSection>
  )
}

function RatingList({ title, ratings, summary }: RatingGroup & { title: string }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3
          id={headingId}
          className="text-body font-semibold"
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{formatRatingSummary(summary)}</p>
      </div>
      {ratings.length ? (
        <ul className="divide-y divide-border">
          {ratings.map((rating) => (
            <li
              key={rating.id}
              className="flex flex-col gap-1 py-3 first:pt-0"
            >
              <p className="text-sm">
                <strong>{rating.stars} z 5</strong> · {rating.author.name}
              </p>
              {rating.comment ? (
                <p className="text-sm whitespace-pre-wrap">{rating.comment}</p>
              ) : null}
              <Link
                to={ROUTES.eventDetail}
                params={{ eventId: rating.event.id }}
                className="w-fit text-sm underline underline-offset-4"
              >
                {rating.event.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <More
        shown={ratings.length}
        total={summary.count}
      />
    </section>
  )
}
