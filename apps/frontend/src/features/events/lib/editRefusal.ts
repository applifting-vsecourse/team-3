import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Why the viewer can't edit the event, or null while they can (#41, #52):
 * only who manages it — its organizer or, for a group's event, any of the
 * group's admins (B-055) — and the superadmin (`canEdit`, #308), and only
 * until it's cancelled or starts; a deactivated one is restored first.
 * Cancelling needs `canManage` on top. The API refuses the same cases; this
 * keeps the buttons and pages in line.
 */
export function editRefusal(
  event: Pick<EventDetail, "canEdit" | "group" | "status" | "startsAt">,
  now: Date = new Date(),
): string | null {
  // who manages it, and the superadmin (#308)
  if (!event.canEdit) {
    return event.group
      ? "Upravit akci může jen její organizátor nebo správce skupiny."
      : "Upravit akci může jen její organizátor."
  }
  if (event.status === "cancelled") return "Zrušenou akci nejde upravit."
  if (event.status === "hidden") return "Deaktivovanou akci nejde upravit. Nejdřív ji obnov."
  if (event.startsAt <= now) return "Akce už začala, upravit ji nejde."
  return null
}
