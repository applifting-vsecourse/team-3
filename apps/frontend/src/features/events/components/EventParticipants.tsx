import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"
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
  /** The signed-in viewer: first, as „Ty“, with the avatar-self fill (Figma A-05c). */
  viewerId?: string | null
}

/**
 * Who is coming (B-026). Someone taking part sees the group (Figma A-05c › Parta): the
 * avatars, the viewer first as „Ty“, and the names in one line under them. Otherwise the
 * count and when the names show (A-05, A-05d; the backend's `canSeeParticipants`).
 */
export function EventParticipants({
  approvedCount,
  maxParticipants,
  participants,
  isWaitingForApproval = false,
  viewerId,
}: EventParticipantsProps) {
  const people = participants
    ? [
        ...participants.filter((person) => person.id === viewerId),
        ...participants.filter((person) => person.id !== viewerId),
      ]
    : null
  const nameOf = (person: { id: string; name: string }) =>
    person.id === viewerId ? "Ty" : person.name

  return (
    <section className="flex flex-col gap-2">
      {/* Figma A-05 has „Přihlášení (4)“, which on a page with „Přihlásit se“
          reads as signing in; „Kdo jde“ matches the viewer's „Jdu“ */}
      <h2 className="type-card-heading">
        Kdo jde · {occupancyCount({ approvedCount, maxParticipants })}
      </h2>
      {/* nobody yet, whoever looks: no names to promise (review #269) */}
      {approvedCount === 0 ? (
        <p className="text-sm text-muted-foreground">Zatím se nikdo nepřihlásil.</p>
      ) : !people ? (
        // Figma A-05d adds „Do minima chybí jeden.“; the bar and the band already say it
        <p className="text-sm text-muted-foreground">
          {isWaitingForApproval
            ? "Jména uvidíš, až tě organizátor schválí."
            : "Jména uvidíš, až budeš na akci."}
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {people.map((person) => (
              <li key={person.id}>
                <PersonAvatar
                  name={person.name}
                  isSelf={person.id === viewerId}
                />
                <span className="sr-only">{nameOf(person)}</span>
              </li>
            ))}
          </ul>
          {/* the list above already reads the names out */}
          <p
            aria-hidden
            className="text-sm text-muted-foreground"
          >
            {people.map(nameOf).join(", ")}
          </p>
        </>
      )}
    </section>
  )
}
