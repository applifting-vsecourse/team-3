import type { ProfileVisibility } from '@/modules/profile/domain/profile';

/**
 * How the viewer of a public profile stands to its person (B-014, #64):
 * the person themself, a friend (B-017), the organizer of an event the person
 * has applied to (a pending or approved application), or anyone else.
 */
export type ProfileViewer = {
  isSelf: boolean;
  isFriend: boolean;
  isOrganizer: boolean;
};

export const STRANGER: ProfileViewer = {
  isSelf: false,
  isFriend: false,
  isOrganizer: false,
};

/**
 * Whether the viewer may see a field set to `visibility`. The circles are
 * nested: everyone ⊃ friends (friends and organizers) ⊃ organizers ⊃ nobody;
 * the person always sees their own.
 */
export function canSee(
  visibility: ProfileVisibility,
  viewer: ProfileViewer,
): boolean {
  if (viewer.isSelf) return true;
  switch (visibility) {
    case 'everyone':
      return true;
    case 'friends':
      return viewer.isFriend || viewer.isOrganizer;
    case 'organizers':
      return viewer.isOrganizer;
    case 'nobody':
      return false;
  }
}

/** Whether knowing that the viewer organizes an event of the person's can change anything. */
export function needsOrganizerCheck(
  visibilities: ProfileVisibility[],
  viewer: Omit<ProfileViewer, 'isOrganizer'>,
): boolean {
  if (viewer.isSelf) return false;
  return visibilities.some(
    (visibility) =>
      visibility === 'organizers' ||
      (visibility === 'friends' && !viewer.isFriend),
  );
}
