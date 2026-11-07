import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Why the viewer can't edit (or cancel) the event, or null while they can
 * (#41, #52): only who manages it — its organizer or, for a group's event,
 * any of the group's admins (`canManage`, B-055) — and only until it's
 * cancelled or starts. The API refuses the same cases; this keeps the
 * buttons and pages in line.
 */
export function editRefusal(
  event: Pick<EventDetail, "canManage" | "group" | "status" | "startsAt">,
  now: Date = new Date(),
): string | null {
  if (!event.canManage) {
    return event.group
      ? "Upravit akci může jen její organizátor nebo správce skupiny."
      : "Upravit akci může jen její organizátor."
  }
  if (event.status === "cancelled") return "Zrušenou akci nejde upravit."
  if (event.startsAt <= now) return "Akce už začala, upravit ji nejde."
  return null
}
