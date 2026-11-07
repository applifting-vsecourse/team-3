import { ParticipationStatus } from './participation';

/**
 * Who is looking at an event, as the server knows it from the session; a
 * visitor is null.
 */
export type EventViewer = {
  /** The founder of the event (`organizerUserId`). */
  isOrganizer: boolean;
  /** The viewer's own participation in the event, null when there's none. */
  participation: ParticipationStatus | null;
  /**
   * An active member or admin of the event's group. False without a group,
   * and for the organizer, for whom it isn't looked up (they see and manage
   * the event anyway).
   */
  isGroupMember: boolean;
  /** An active admin of the event's group; false like `isGroupMember`. */
  isGroupAdmin: boolean;
} | null;

/**
 * Whether the viewer manages the event (B-055): changes and cancels it,
 * decides requests and sees the participants' management. The organizer,
 * and for a group's event any active admin of the group. The one shared
 * check for all of that; rating the participants is the exception (B-060),
 * only the organizer does it.
 *
 * The organizer keeps it at a group's event even after leaving the group.
 * Today that can't happen (the founder is the only admin and LAST_ADMIN
 * keeps them in); with more admins (#62, #100) decide whether it should.
 */
export function canManageEvent(viewer: EventViewer): boolean {
  if (!viewer) return false;
  return viewer.isOrganizer || viewer.isGroupAdmin;
}
