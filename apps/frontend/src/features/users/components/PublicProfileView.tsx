import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { PageBand } from "@/components/PageBand/PageBand"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Button } from "@/components/ui/button"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import {
  summaryLabel,
  type PublicOrganizedEvent,
  type PublicProfile,
  type PublicSummary,
} from "@/features/users/api/publicProfile"

const date = (value: Date) =>
  value.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })

// a shared link has no history: back to the events, as before
const BACK = { to: ROUTES.events, fallbackLabel: "Všechny akce" } as const

/**
 * /uzivatele/:userId (#179): who someone is in the band — name, ratings, interests — and
 * below in two columns on desktop (DESIGN.md › Layout) the ratings as a participant, and as
 * an organizer with the past events they organised.
 */
export function PublicProfileView({
  profile,
  isLoading,
  isNotFound,
  error,
  onRetry,
  renderOrganizedEvent,
}: {
  profile?: PublicProfile
  isLoading?: boolean
  isNotFound?: boolean
  error?: Error
  onRetry: () => void
  /** A past organised event as its card, from the events feature (the route puts it in). */
  renderOrganizedEvent: (event: PublicOrganizedEvent) => ReactNode
}) {
  if (isNotFound) {
    return (
      <State title="Profil nenalezen">
        <p className="text-muted-foreground">
          Profil není dostupný. Zkus se vrátit na přehled akcí.
        </p>
      </State>
    )
  }
  if (isLoading) {
    return (
      <State title="Profil uživatele">
        <p
          role="status"
          aria-busy="true"
          className="text-muted-foreground"
        >
          Načítání profilu…
        </p>
      </State>
    )
  }
  // A failed refresh must not keep moderated ratings or a removed account on screen.
  if (error || !profile) {
    return (
      <State title="Profil uživatele">
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
      </State>
    )
  }

  return (
    <>
      <PageBand
        title={<span className="break-words">{profile.name}</span>}
        back={BACK}
        description={`Jako účastník ${summaryLabel(profile.participantSummary)} · Jako organizátor ${summaryLabel(profile.organizerSummary)}`}
      >
        <section
          aria-label="Zájmy"
          className="flex flex-wrap gap-2"
        >
          {profile.interests.length ? (
            profile.interests.map((interest) => (
              <ActivityTag
                key={interest.id}
                name={interest.name}
                className="border border-tile-border"
              />
            ))
          ) : (
            <p className="text-sm text-on-hero-muted">Zájmy zatím nejsou vyplněné.</p>
          )}
        </section>
      </PageBand>
      {/* two columns on desktop, so no half of the screen stays empty (DESIGN.md › Layout) */}
      <div className={cn(PAGE, "grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16")}>
        <section
          className="flex min-w-0 flex-col gap-4"
          aria-labelledby="participant-ratings"
        >
          <h2
            id="participant-ratings"
            className="type-feature"
          >
            Jako <span className="highlight-keyword">účastník</span>
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
                  <Link
                    className="w-fit text-sm underline underline-offset-4"
                    to={ROUTES.eventDetail}
                    params={{ eventId: rating.event.id }}
                  >
                    {rating.event.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : profile.participantSummary.count === 0 ? (
            <p className="text-muted-foreground">Zatím žádné hodnocení od organizátorů.</p>
          ) : null}
          {profile.participantSummary.count > profile.participantRatings.length ? (
            <p className="text-sm text-muted-foreground">
              Další hodnocení jsou z neveřejných akcí, počítají se jen do průměru.
            </p>
          ) : null}
        </section>
        <div className="flex min-w-0 flex-col gap-12">
          <section
            className="flex flex-col gap-4"
            aria-labelledby="organizer-ratings"
          >
            <h2
              id="organizer-ratings"
              className="type-feature"
            >
              Jako <span className="highlight-keyword">organizátor</span>
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
          {profile.organizedEvents.length ? (
            <section
              className="flex flex-col gap-4"
              aria-labelledby="organized-events"
            >
              <h2
                id="organized-events"
                className="type-feature"
              >
                <span className="highlight-keyword">Pořádané</span> akce
              </h2>
              {/* grid-cols-1 = minmax(0, 1fr): a long title truncates instead of widening the column */}
              <ul className="grid grid-cols-1 gap-3">
                {profile.organizedEvents.map((event) => (
                  <li key={event.id}>{renderOrganizedEvent(event)}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}

/** Loading, unavailable or failed: the band with a plain title, the message under it. */
function State({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageBand
        title={title}
        back={BACK}
      />
      <div className={cn(PAGE, "items-start gap-3")}>{children}</div>
    </>
  )
}

function Summary({ value }: { value: PublicSummary }) {
  return (
    <p>
      {value.count > 0 && value.average !== null ? (
        // DESIGN.md › Copy: an average always shows its count
        <>
          <strong>★ {value.average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</strong>{" "}
          <span className="text-muted-foreground">({value.count} hodnocení)</span>
        </>
      ) : (
        <span className="text-muted-foreground">zatím bez hodnocení</span>
      )}
    </p>
  )
}
