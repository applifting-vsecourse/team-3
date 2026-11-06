import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Button } from "@/components/ui/button"

import type { PublicProfile, PublicSummary } from "@/features/users/api/publicProfile"

const date = (value: Date) =>
  value.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })

export function PublicProfileView({
  profile,
  isLoading,
  isNotFound,
  error,
  onRetry,
}: {
  profile?: PublicProfile
  isLoading?: boolean
  isNotFound?: boolean
  error?: Error
  onRetry: () => void
}) {
  if (isNotFound) {
    return (
      <section className="flex flex-col gap-3 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Profil nenalezen</h1>
        <p className="text-muted-foreground">
          Profil není dostupný. Zkus se vrátit na přehled akcí.
        </p>
      </section>
    )
  }
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        className="flex flex-col gap-3 py-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Profil uživatele</h1>
        <p
          role="status"
          className="text-muted-foreground"
        >
          Načítání profilu…
        </p>
      </section>
    )
  }
  // A failed refresh must not keep moderated ratings or a removed account on screen.
  if (error || !profile) {
    return (
      <section className="flex flex-col items-start gap-3 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Profil uživatele</h1>
        <p
          role="alert"
          className="text-destructive"
        >
          Profil se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
        </p>
        <Button
          variant="outline"
          onClick={onRetry}
        >
          Zkusit znovu
        </Button>
      </section>
    )
  }

  return (
    <>
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{profile.name}</h1>
        <section
          aria-label="Zájmy"
          className="flex flex-wrap gap-2"
        >
          {profile.interests.length ? (
            profile.interests.map((interest) => (
              <ActivityTag
                key={interest.id}
                name={interest.name}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Zájmy zatím nejsou vyplněné.</p>
          )}
        </section>
      </header>
      <div className="grid gap-8 md:grid-cols-2">
        <section
          className="flex flex-col gap-4"
          aria-labelledby="participant-ratings"
        >
          <h2
            id="participant-ratings"
            className="text-xl font-semibold tracking-tight"
          >
            Jako účastník
          </h2>
          <Summary value={profile.participantSummary} />
          {profile.participantRatings.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {profile.participantRatings.map((rating) => (
                <li
                  key={rating.id}
                  className="flex flex-col gap-2 py-4 first:pt-0"
                >
                  {rating.author ? (
                    <PersonRow
                      name={rating.author.name}
                      userId={rating.author.id}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Organizátor</p>
                  )}
                  <p
                    className="text-sm"
                    aria-label={`${rating.stars} z 5 hvězdiček`}
                  >
                    <span aria-hidden="true">
                      {"★".repeat(rating.stars)}
                      {"☆".repeat(5 - rating.stars)}
                    </span>
                    <span className="ml-2 text-muted-foreground">{date(rating.createdAt)}</span>
                  </p>
                  {rating.comment ? (
                    <p className="break-words whitespace-pre-line">{rating.comment}</p>
                  ) : null}
                  {rating.event ? (
                    <Link
                      className="w-fit text-sm underline underline-offset-4"
                      to={ROUTES.eventDetail}
                      params={{ eventId: rating.event.id }}
                    >
                      {rating.event.title}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Neveřejná akce</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Zatím žádné hodnocení od organizátorů.</p>
          )}
        </section>
        <section
          className="flex flex-col gap-4"
          aria-labelledby="organizer-ratings"
        >
          <h2
            id="organizer-ratings"
            className="text-xl font-semibold tracking-tight"
          >
            Jako organizátor
          </h2>
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">Hodnocení organizátora</dt>
              <dd>
                <Summary value={profile.organizerSummary} />
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">Hodnocení pořádaných akcí</dt>
              <dd>
                <Summary value={profile.eventSummary} />
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Hodnocení se vztahuje k osobně pořádaným akcím.
          </p>
        </section>
      </div>
      {profile.organizedEvents.length ? (
        <section
          className="flex flex-col gap-4"
          aria-labelledby="organized-events"
        >
          <h2
            id="organized-events"
            className="text-xl font-semibold tracking-tight"
          >
            Pořádané akce
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profile.organizedEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                <ActivityTag name={event.activityName} />
                <h3 className="text-lg font-semibold tracking-tight">
                  <Link
                    className="underline underline-offset-4"
                    to={ROUTES.eventDetail}
                    params={{ eventId: event.id }}
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {date(event.startsAt)} · {event.localityName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Počet účastníků: {event.approvedCount}
                </p>
                <Summary value={event.rating} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function Summary({ value }: { value: PublicSummary }) {
  return (
    <p>
      {value.count > 0 && value.average !== null ? (
        <>
          <strong>{value.average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} / 5</strong>
          <span className="ml-2 text-sm text-muted-foreground">Počet hodnocení: {value.count}</span>
        </>
      ) : (
        <span className="text-muted-foreground">Zatím bez hodnocení.</span>
      )}
    </p>
  )
}
