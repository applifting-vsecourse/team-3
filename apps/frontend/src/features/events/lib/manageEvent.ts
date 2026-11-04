import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * Whether the organizer's management shows the requests (D-03, #53): only at
 * an event with approval that still happens. On a cancelled one nobody can
 * decide them any more, so they go (#183); who was coming stays, read-only.
 */
export function showsRequests(event: Pick<EventDetail, "approvalMode" | "status">): boolean {
  return event.approvalMode === "approval" && event.status !== "cancelled"
}
