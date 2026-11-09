import {
  canReadMessages,
  canSendMessages,
  decideMessage,
  MESSAGES_PER_DAY,
  remainingMessages,
} from './event-message';
import { EventViewer } from './event-viewer';

const viewer = (
  overrides: Partial<NonNullable<EventViewer>> = {},
): NonNullable<EventViewer> => ({
  isOrganizer: false,
  participation: null,
  isGroupMember: false,
  isGroupAdmin: false,
  ...overrides,
});

describe('event messages (#176)', () => {
  describe('canReadMessages: whoever sees „Kdo jde“ (#174)', () => {
    it('the organizer, an approved participant and a member of the group', () => {
      expect(canReadMessages(viewer({ isOrganizer: true }))).toBe(true);
      expect(canReadMessages(viewer({ participation: 'approved' }))).toBe(true);
      expect(canReadMessages(viewer({ isGroupMember: true }))).toBe(true);
    });

    it.each(['pending', 'rejected', 'removed', 'withdrawn'] as const)(
      'not someone %s',
      (participation) => {
        expect(canReadMessages(viewer({ participation }))).toBe(false);
      },
    );

    it('not a visitor or a stranger', () => {
      expect(canReadMessages(null)).toBe(false);
      expect(canReadMessages(viewer())).toBe(false);
    });
  });

  describe('canSendMessages: only the organizer of a published event', () => {
    const published = { status: 'published' as const };

    it('the organizer', () => {
      expect(canSendMessages(published, viewer({ isOrganizer: true }))).toBe(
        true,
      );
    });

    it("not a group's admin, a participant or a visitor", () => {
      expect(
        canSendMessages(
          published,
          viewer({ isGroupAdmin: true, isGroupMember: true }),
        ),
      ).toBe(false);
      expect(
        canSendMessages(published, viewer({ participation: 'approved' })),
      ).toBe(false);
      expect(canSendMessages(published, null)).toBe(false);
    });

    it('nobody at a cancelled event', () => {
      expect(
        canSendMessages({ status: 'cancelled' }, viewer({ isOrganizer: true })),
      ).toBe(false);
    });
  });

  describe('the daily limit', () => {
    it(`is ${MESSAGES_PER_DAY} a day and never goes below zero`, () => {
      expect(remainingMessages(0)).toBe(10);
      expect(remainingMessages(9)).toBe(1);
      expect(remainingMessages(10)).toBe(0);
      expect(remainingMessages(14)).toBe(0);
    });

    it('lets the last one of the day through and refuses the next', () => {
      expect(decideMessage({ eventStatus: 'published', sentToday: 9 })).toEqual(
        { ok: true },
      );
      expect(
        decideMessage({ eventStatus: 'published', sentToday: 10 }),
      ).toEqual({ ok: false, refusal: 'MESSAGE_LIMIT' });
    });

    it('a cancelled event refuses before the limit counts', () => {
      expect(decideMessage({ eventStatus: 'cancelled', sentToday: 0 })).toEqual(
        { ok: false, refusal: 'EVENT_CANCELLED' },
      );
    });
  });
});
