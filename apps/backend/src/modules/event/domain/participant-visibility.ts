import { EventViewer } from './event-viewer';

/**
 * Whether the viewer may see the names of who is coming (B-026, #174, PO
 * 28. 10.): the organizer, someone with an approved place and, for a group's
 * event, the group's members and admins. Everyone else, a waiting applicant
 * included, sees only the occupancy.
 */
export function canSeeParticipants(viewer: EventViewer): boolean {
  if (!viewer) return false;
  return (
    viewer.isOrganizer ||
    viewer.participation === 'approved' ||
    viewer.isGroupMember
  );
}
