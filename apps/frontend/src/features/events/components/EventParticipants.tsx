import { PersonRow } from "@/components/PersonRow/PersonRow"
import { occupancyCount } from "@/lib/occupancy"

import type { EventDetail } from "@/features/events/api/eventSchemas"

type EventParticipantsProps = {
  approvedCount: number
  /** „Kdo jde · 4 z 5“ — approved of the maximum, as everywhere else (#189). */
  maxParticipants: number
  /** Who gets them is the backend's `canSeeParticipants`; without them the detail leaves this out. */
  participants: NonNullable<EventDetail["participants"]>
}

/** Who is coming, by name (B-026); see the backend's `canSeeParticipants` for who gets them. */
export function EventParticipants({
  approvedCount,
  maxParticipants,
  participants,
}: EventParticipantsProps) {
  return (
    <section className="flex flex-col gap-2">
      {/* Figma A-05 has „Přihlášení (4)“, which on a page with „Přihlásit se“
          reads as signing in; „Kdo jde“ matches the viewer's „Jdu“ */}
      <h2 className="text-lg font-semibold tracking-tight">
        Kdo jde · {occupancyCount({ approvedCount, maxParticipants })}
      </h2>
      {approvedCount === 0 ? (
        <p className="text-muted-foreground">Zatím se nikdo nepřihlásil.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {participants.map((participant) => (
            <li key={participant.id}>
              <PersonRow name={participant.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
