import type { ProfileVisibility } from '@/modules/profile/domain/profile';
import {
  canSee,
  needsOrganizerCheck,
  STRANGER,
  type ProfileViewer,
} from './profile-visibility';

const self: ProfileViewer = { ...STRANGER, isSelf: true };
const friend: ProfileViewer = { ...STRANGER, isFriend: true };
const organizer: ProfileViewer = { ...STRANGER, isOrganizer: true };

describe('who sees a profile field (B-014, #64)', () => {
  it.each<[ProfileVisibility, boolean, boolean, boolean, boolean]>([
    // visibility, stranger, friend, organizer, self
    ['everyone', true, true, true, true],
    ['friends', false, true, true, true],
    ['organizers', false, false, true, true],
    ['nobody', false, false, false, true],
  ])(
    '%s: stranger %s, friend %s, organizer %s, the person %s',
    (visibility, stranger, isFriend, isOrganizer, isSelf) => {
      expect(canSee(visibility, STRANGER)).toBe(stranger);
      expect(canSee(visibility, friend)).toBe(isFriend);
      expect(canSee(visibility, organizer)).toBe(isOrganizer);
      expect(canSee(visibility, self)).toBe(isSelf);
    },
  );

  it('asks whether the viewer organizes only when the answer can change something', () => {
    const stranger = { isSelf: false, isFriend: false };
    expect(needsOrganizerCheck(['everyone', 'nobody'], stranger)).toBe(false);
    expect(needsOrganizerCheck(['organizers'], stranger)).toBe(true);
    expect(needsOrganizerCheck(['friends'], stranger)).toBe(true);
    // a friend already sees „friends“
    expect(
      needsOrganizerCheck(['friends'], { isSelf: false, isFriend: true }),
    ).toBe(false);
    expect(
      needsOrganizerCheck(['organizers'], { isSelf: true, isFriend: false }),
    ).toBe(false);
  });
});
