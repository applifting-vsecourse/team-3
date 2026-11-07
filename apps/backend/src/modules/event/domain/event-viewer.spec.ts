import { canManageEvent, EventViewer } from './event-viewer';

const viewer = (
  overrides: Partial<NonNullable<EventViewer>> = {},
): EventViewer => ({
  isOrganizer: false,
  participation: null,
  isGroupMember: false,
  isGroupAdmin: false,
  ...overrides,
});

describe('canManageEvent (B-055)', () => {
  it('a visitor does not', () => {
    expect(canManageEvent(null)).toBe(false);
  });

  it('the organizer does', () => {
    expect(canManageEvent(viewer({ isOrganizer: true }))).toBe(true);
  });

  it("an admin of the event's group does, though someone else created it", () => {
    expect(
      canManageEvent(viewer({ isGroupMember: true, isGroupAdmin: true })),
    ).toBe(true);
  });

  it('a regular member of the group does not', () => {
    expect(canManageEvent(viewer({ isGroupMember: true }))).toBe(false);
  });

  it('an approved participant does not', () => {
    expect(canManageEvent(viewer({ participation: 'approved' }))).toBe(false);
  });
});
