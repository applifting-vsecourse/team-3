import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Why the viewer can't edit (or cancel) the event, or null while they can
 * (#41, #52): only its organizer, and only until it's cancelled or starts.
 * The API refuses the same cases; this keeps the buttons and pages in line.
 */
export function editRefusal(
  event: Pick<EventDetail, "organizer" | "status" | "startsAt">,
  viewerId: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!viewerId || event.organizer.id !== viewerId) {
    return "Upravit akci může jen její organizátor."
  }
  if (event.status === "cancelled") return "Zrušenou akci nejde upravit."
  if (event.startsAt <= now) return "Akce už začala, upravit ji nejde."
  return null
}
