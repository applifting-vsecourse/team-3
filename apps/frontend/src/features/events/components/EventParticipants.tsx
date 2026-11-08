import { PersonRow } from "@/components/PersonRow/PersonRow"
import { occupancyCount } from "@/lib/occupancy"

import type { EventDetail } from "@/features/events/api/eventSchemas"

type EventParticipantsProps = {
  approvedCount: number
  /** „Kdo jde · 4 z 5“ — approved of the maximum, as everywhere else (#189). */
  maxParticipants: number
  /** Who gets them is the backend's `canSeeParticipants`; without them only the count shows. */
  participants: EventDetail["participants"]
  /** The viewer's request waits: the names come once the organizer approves it (Figma A-05). */
  isWaitingForApproval?: boolean
}

/**
 * Who is coming (B-026): by name for someone taking part, otherwise the count
 * and when the names show (Figma A-05, A-05d; see the backend's
 * `canSeeParticipants`).
 */
export function EventParticipants({
  approvedCount,
  maxParticipants,
  participants,
  isWaitingForApproval = false,
}: EventParticipantsProps) {
  return (
    <section className="flex flex-col gap-2">
      {/* Figma A-05 has „Přihlášení (4)“, which on a page with „Přihlásit se“
          reads as signing in; „Kdo jde“ matches the viewer's „Jdu“ */}
      <h2 className="type-card-heading">
        Kdo jde · {occupancyCount({ approvedCount, maxParticipants })}
      </h2>
      {!participants ? (
        // Figma A-05d adds „Do minima chybí jeden.“; the bar and the band already say it
        <p className="text-sm text-muted-foreground">
          {isWaitingForApproval
            ? "Jména uvidíš, až tě organizátor schválí."
            : "Jména uvidíš, až budeš na akci."}
        </p>
      ) : approvedCount === 0 ? (
        <p className="text-sm text-muted-foreground">Zatím se nikdo nepřihlásil.</p>
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
