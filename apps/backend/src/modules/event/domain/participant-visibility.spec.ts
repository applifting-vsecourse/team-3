import { EventViewer } from './event-viewer';
import { canSeeParticipants } from './participant-visibility';

const viewer = (
  overrides: Partial<NonNullable<EventViewer>> = {},
): EventViewer => ({
  isOrganizer: false,
  participation: null,
  isGroupMember: false,
  isGroupAdmin: false,
  ...overrides,
});

describe('canSeeParticipants (#174)', () => {
  it('a visitor does not', () => {
    expect(canSeeParticipants(null)).toBe(false);
  });

  it('a signed-in user without a place does not', () => {
    expect(canSeeParticipants(viewer())).toBe(false);
  });

  it('the organizer does, with or without a place', () => {
    expect(canSeeParticipants(viewer({ isOrganizer: true }))).toBe(true);
  });

  it('an approved participant does', () => {
    expect(canSeeParticipants(viewer({ participation: 'approved' }))).toBe(
      true,
    );
  });

  it.each(['pending', 'rejected', 'withdrawn', 'removed'] as const)(
    'a %s participant does not',
    (participation) => {
      expect(canSeeParticipants(viewer({ participation }))).toBe(false);
    },
  );

  it("a member or admin of the event's group does, without a place", () => {
    expect(canSeeParticipants(viewer({ isGroupMember: true }))).toBe(true);
  });
});
