import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Whether the viewer may write to the participants (#176): only the organizer
 * (not a group's admin who manages the event) and only while it is published.
 * The API decides the same; this only hides the button.
 */
export function canWriteToParticipants(
  event: Pick<EventDetail, "status" | "organizer">,
  viewerId: string | null | undefined,
): boolean {
  return event.status === "published" && Boolean(viewerId) && event.organizer.id === viewerId
}

/**
 * Who gets the message (Figma D-04): every approved participant but the
 * organizer, who may have a place at their own event too.
 */
export function messageRecipientCount(
  participants: { id: string }[] | undefined,
  organizerId: string,
): number | undefined {
  return participants?.filter((participant) => participant.id !== organizerId).length
}

/** Under the dialog's title (Figma D-04): „všem 4 schváleným účastníkům“. */
export function messageRecipientsLabel(count: number): string {
  if (count === 0) {
    return "Akce zatím nemá žádné schválené účastníky. Zpráva zůstane na detailu akce a uvidí ji ti, kdo se přihlásí."
  }
  if (count === 1) {
    return "Zpráva přijde e-mailem 1 schválenému účastníkovi a uvidí ji na detailu akce."
  }
  return `Zpráva přijde e-mailem všem ${count} schváleným účastníkům a uvidí ji na detailu akce.`
}

/** Under the text (Figma D-04): what is left of today's limit, in Czech plural. */
export function remainingMessagesLabel(remaining: number): string {
  if (remaining <= 0) return "Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra."
  const noun = remaining === 1 ? "zprávu" : remaining <= 4 ? "zprávy" : "zpráv"
  return `Dnes můžeš k akci poslat ještě ${remaining} ${noun}.`
}
