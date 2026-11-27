import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Whether the viewer sees a members-only event from outside its group. Only
 * the superadmin can (#308): the API answers anyone else outside the group
 * 403 MEMBERS_ONLY before the detail. Its organizer is never outside, and an
 * unknown membership (the group still loading) counts as outside, so
 * „Přijdu“ never shows to be refused (review #380).
 */
export function isOutsideGroup(
  event: Pick<EventDetail, "visibility" | "canModerate" | "organizer">,
  viewerId: string | null | undefined,
  membership: { status: string } | null | undefined,
): boolean {
  return (
    event.visibility === "members" &&
    event.canModerate &&
    event.organizer.id !== viewerId &&
    membership?.status !== "active"
  )
}
