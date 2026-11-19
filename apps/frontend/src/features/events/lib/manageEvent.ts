import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Whether the organizer's management shows the requests (D-03, #53): only at
 * an event with approval that still happens. On a cancelled one nobody can
 * decide them any more, so they go (#183); who was coming stays, read-only.
 */
export function showsRequests(event: Pick<EventDetail, "approvalMode" | "status">): boolean {
  return event.approvalMode === "approval" && event.status !== "cancelled"
}

/** The one thing the management offers first (Figma D-03, D-03d, #371): a sentence and its button. */
export type EventNextStep = { action: "share" | "write"; text: string }

/**
 * What the organizer should do next, by the event's state (#371): while people are missing,
 * share the link; once it happens and someone is coming, write to them; while there is room,
 * share it on. A cancelled or started event has none — nothing is shared or written (#183).
 * `recipientCount` is who would get a message (undefined while the participants load, so the
 * step doesn't flip from sharing to writing once they arrive); `canWrite` whether the viewer
 * may write to them (the organizer, not a group's admin, #176).
 */
export function eventNextStep(
  event: Pick<EventDetail, "status" | "startsAt" | "missingToMin" | "isFull">,
  recipientCount: number | undefined,
  canWrite: boolean,
  now: Date = new Date(),
): EventNextStep | null {
  if (event.status !== "published" || event.startsAt <= now) return null
  if (event.missingToMin > 0) {
    return { action: "share", text: `Do minima chybí ${event.missingToMin}. Pošli odkaz partě.` }
  }
  if (recipientCount === undefined) return null
  if (canWrite && recipientCount > 0) {
    return {
      action: "write",
      text: "Akce se koná. Napiš účastníkům, co si vzít a kde se sejdete.",
    }
  }
  if (!event.isFull) {
    return { action: "share", text: "Akce se koná a místa ještě jsou. Pošli odkaz dál." }
  }
  return null
}

/** „1 člověk“, „3 lidé“, „5 lidí“. */
export function peopleLabel(count: number): string {
  if (count === 1) return "1 člověk"
  return count >= 2 && count <= 4 ? `${count} lidé` : `${count} lidí`
}

/**
 * „Jak to půjde dál“ under an empty list of participants (Figma D-03d – nikdo nejde, #371):
 * the steps of this event, from its own rules — how people join, its minimum, the rating after.
 */
export function eventEmptySteps(
  event: Pick<EventDetail, "approvalMode" | "minParticipants">,
): string[] {
  return [
    "Sdílej odkaz – v chatu party, ve skupině nebo na sítích.",
    event.approvalMode === "approval"
      ? "Kdo se přihlásí, objeví se v Žádostech. Schválíš ho, nebo zamítneš."
      : "Kdo se přihlásí, objeví se tady. Akce bez schválení ho počítá hned.",
    `Jakmile se přihlásí ${peopleLabel(event.minParticipants)}, akce se koná – u akce se ukáže „Koná se“.`,
    "Po akci si navzájem dáte hodnocení.",
  ]
}
