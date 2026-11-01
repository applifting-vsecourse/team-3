import { ParticipationStatus } from './participation';

/**
 * Who is looking at an event's detail, as the server knows it from the
 * session; a visitor is null.
 */
export type ParticipantsViewer = {
  isOrganizer: boolean;
  /** The viewer's own participation in the event, null when there's none. */
  participation: ParticipationStatus | null;
  /** An active member or admin of the event's group; false without a group. */
  isGroupMember: boolean;
} | null;

/**
 * Whether the viewer may see the names of who is coming (B-026, #174, PO
 * 28. 10.): the organizer, someone with an approved place and, for a group's
 * event, the group's members and admins. Everyone else, a waiting applicant
 * included, sees only the occupancy.
 */
export function canSeeParticipants(viewer: ParticipantsViewer): boolean {
  if (!viewer) return false;
  return (
    viewer.isOrganizer ||
    viewer.participation === 'approved' ||
    viewer.isGroupMember
  );
}
