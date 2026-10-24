import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PersonRow } from "@/components/PersonRow/PersonRow"

import type { EventDetail } from "@/features/events/api/eventSchemas"

type EventParticipantsProps = {
  approvedCount: number
  /** null for a visitor: the API sends only the count. */
  participants: EventDetail["participants"]
  /** Login's `from`, so signing in comes back to this event. */
  signInFrom: string
}

/** Who is coming: names for a signed-in user, the count for a visitor (B-026). */
export function EventParticipants({
  approvedCount,
  participants,
  signInFrom,
}: EventParticipantsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">
        Přihlášení <span className="font-normal text-muted-foreground">{approvedCount}</span>
      </h2>
      {approvedCount === 0 ? (
        <p className="text-muted-foreground">Zatím se nikdo nepřihlásil.</p>
      ) : participants ? (
        <ul className="flex flex-col gap-3">
          {participants.map((participant) => (
            <li key={participant.id}>
              <PersonRow name={participant.name} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Jména přihlášených uvidíte po{" "}
          <Link
            to={ROUTES.login}
            search={{ from: signInFrom }}
            className="font-medium text-foreground underline underline-offset-4"
          >
            přihlášení k účtu
          </Link>
          .
        </p>
      )}
    </section>
  )
}
