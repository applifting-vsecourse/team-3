import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Star } from "lucide-react"

import { ROUTES } from "@/app/routes"

import { profileOverviewQueryOptions } from "@/features/profile/api/profileQueryOptions"
import type {
  ProfileEvent,
  ProfileRating,
  RatingSummary,
} from "@/features/profile/api/profileSchemas"

import { ProfileError, ProfileLoading } from "./ProfileState"

const when = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Prague",
})

export function ProfileEvents({ viewerId, groups }: { viewerId: string; groups: ReactNode }) {
  const query = useQuery(profileOverviewQueryOptions(viewerId))
  if (query.error) return <ProfileError retry={() => void query.refetch()} />
  if (!query.data) return <ProfileLoading />
  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <EventSection
          title="Nadcházející akce"
          events={query.data.upcoming}
          empty="Zatím nemáš místo ani čekající žádost na žádné nadcházející akci."
        />
        <EventSection
          title="Pořádané akce"
          events={query.data.organizing}
          empty="Zatím žádnou akci nepořádáš."
        />
        <EventSection
          title="Historie účasti"
          events={query.data.past}
          empty="Tady uvidíš proběhlé akce, na kterých máš schválenou účast."
        />
      </div>
      {groups}
    </div>
  )
}

function EventSection({
  title,
  events,
  empty,
}: {
  title: string
  events: ProfileEvent[]
  empty: string
}) {
  return (
    <section
      className="space-y-4"
      aria-label={title}
    >
      <h2 className="type-feature">{title}</h2>
      {!events.length ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="space-y-1 py-3 first:pt-0"
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
                <time dateTime={event.startsAt.toISOString()}>{when.format(event.startsAt)}</time> ·{" "}
                {event.localityName}
              </p>
              {event.status === "cancelled" ? (
                <p className="text-sm">Zrušeno</p>
              ) : event.participation ? (
                <p className="text-sm">
                  {event.participation === "pending" ? "Čeká na schválení" : "Schválená účast"}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ProfileRatings({ viewerId }: { viewerId: string }) {
  const query = useQuery(profileOverviewQueryOptions(viewerId))
  if (query.error) return <ProfileError retry={() => void query.refetch()} />
  if (!query.data) return <ProfileLoading />
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <RatingSection
        title="Jako účastník"
        ratings={query.data.participantRatings}
        summary={query.data.participantSummary}
      />
      <RatingSection
        title="Jako organizátor"
        ratings={query.data.organizerRatings}
        summary={query.data.organizerSummary}
      />
    </div>
  )
}

function RatingSection({
  title,
  ratings,
  summary,
}: {
  title: string
  ratings: ProfileRating[]
  summary: RatingSummary
}) {
  return (
    <section
      className="space-y-4"
      aria-label={title}
    >
      <h2 className="type-feature">{title}</h2>
      {summary.average === null ? (
        <p className="text-sm text-muted-foreground">zatím bez hodnocení</p>
      ) : (
        <p className="flex items-center gap-2">
          <Star
            aria-hidden
            className="size-4"
          />
          <span>
            {summary.average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} ({summary.count}{" "}
            hodnocení)
          </span>
        </p>
      )}
      {ratings.length ? (
        <ul className="divide-y divide-border">
          {ratings.map((rating) => (
            <li
              key={rating.id}
              className="space-y-2 py-3 first:pt-0"
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
                className="text-sm underline underline-offset-4"
              >
                {rating.event.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
